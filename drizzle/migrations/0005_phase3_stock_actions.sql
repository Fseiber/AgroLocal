CREATE FUNCTION public.operation_action(_id uuid,_action text,_data jsonb DEFAULT '{}') RETURNS public.commercial_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.commercial_operations; s boolean; b boolean; a boolean; q numeric; d public.operation_deliveries; r public.operation_events; n text:=trim(coalesce(_data->>'note','')); days integer; pending numeric;
BEGIN
 SELECT * INTO o FROM public.commercial_operations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Operación inexistente'; END IF;
 s:=public.is_company_member(o.seller_company_id,'operator'); b:=public.is_company_member(o.buyer_company_id,'operator'); a:=public.has_role(auth.uid(),'admin');
 IF NOT s AND NOT b AND NOT a THEN RAISE EXCEPTION 'Sin permiso comercial'; END IF;
 CASE _action
 WHEN 'confirm' THEN
  IF NOT b OR o.dispute_open OR o.status<>'agreement_declared' OR (_data->>'version')::integer IS DISTINCT FROM o.version THEN RAISE EXCEPTION 'Solo comprador confirma versión pendiente'; END IF;
  q:=(o.terms->>'quantity_kg')::numeric;
  PERFORM public.apply_stock_movement(o.listing_id,'reserve',q,'Acuerdo bilateral '||o.code);
  SELECT reservation_days INTO days FROM public.commercial_settings WHERE id=true;
  UPDATE public.commercial_operations SET status='reserved',reserved_kg=q,buyer_accepted_by=auth.uid(),buyer_accepted_at=now(),confirmed_at=now(),reservation_expires_at=now()+make_interval(days=>coalesce(days,30)) WHERE id=o.id;
  UPDATE public.operation_versions SET buyer_by=auth.uid(),buyer_at=now() WHERE operation_id=o.id AND version=o.version;
 WHEN 'discrepancy' THEN
  IF NOT b OR o.status<>'agreement_declared' OR n='' THEN RAISE EXCEPTION 'Indicá discrepancia del acuerdo pendiente'; END IF;
 WHEN 'start' THEN
  IF NOT s OR o.confirmed_at IS NULL OR o.status<>'reserved' OR o.dispute_open THEN RAISE EXCEPTION 'No se puede iniciar'; END IF;
  UPDATE public.commercial_operations SET status='executing',reservation_expires_at=NULL WHERE id=o.id;
 WHEN 'register_delivery' THEN
  IF NOT s OR o.confirmed_at IS NULL OR o.dispute_open OR o.status NOT IN ('reserved','executing','partial_delivery') THEN RAISE EXCEPTION 'No se puede registrar entrega'; END IF;
  SELECT * INTO d FROM public.operation_deliveries WHERE id=(_data->>'delivery_id')::uuid;
  IF FOUND THEN IF d.operation_id=o.id AND d.quantity_kg=(_data->>'quantity_kg')::numeric THEN RETURN o; ELSE RAISE EXCEPTION 'Identificador utilizado'; END IF; END IF;
  q:=(_data->>'quantity_kg')::numeric;
  SELECT coalesce(sum(quantity_kg),0) INTO pending FROM public.operation_deliveries WHERE operation_id=o.id AND accepted_at IS NULL;
  IF q IS NULL OR q<=0 OR q>o.reserved_kg-pending THEN RAISE EXCEPTION 'Cantidad supera reserva pendiente'; END IF;
  INSERT INTO public.operation_deliveries(id,operation_id,quantity_kg,note,registered_by) VALUES((_data->>'delivery_id')::uuid,o.id,q,n,auth.uid());
  UPDATE public.commercial_operations SET status='executing',reservation_expires_at=NULL WHERE id=o.id;
 WHEN 'accept_delivery' THEN
  IF NOT b OR o.dispute_open OR o.status IN ('cancelled','finalized') THEN RAISE EXCEPTION 'Solo comprador acepta entrega vigente'; END IF;
  SELECT * INTO d FROM public.operation_deliveries WHERE id=(_data->>'delivery_id')::uuid AND operation_id=o.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrega inexistente'; END IF; IF d.accepted_at IS NOT NULL THEN RETURN o; END IF;
  IF d.quantity_kg>o.reserved_kg THEN RAISE EXCEPTION 'Reserva insuficiente'; END IF;
  UPDATE public.operation_deliveries SET accepted_by=auth.uid(),accepted_at=now() WHERE id=d.id;
  UPDATE public.commercial_operations SET reserved_kg=reserved_kg-d.quantity_kg,delivered_kg=delivered_kg+d.quantity_kg,status=CASE WHEN reserved_kg=d.quantity_kg THEN 'complete_delivery' ELSE 'partial_delivery' END,commission_amount=CASE WHEN commission_enabled THEN round(public.operation_net_value(delivered_kg+d.quantity_kg,terms)*commission_rate,2) ELSE 0 END,commission_status='calculated' WHERE id=o.id;
  PERFORM public.apply_stock_movement(o.listing_id,'sell',d.quantity_kg,'Entrega aceptada '||o.code);
 WHEN 'cancel','release_remaining','expire' THEN
  IF NOT s AND NOT b THEN RAISE EXCEPTION 'Solo partes solicitan liberación'; END IF;
  IF n='' OR o.status IN ('cancelled','finalized') OR o.dispute_open THEN RAISE EXCEPTION 'Motivo obligatorio y operación vigente sin disputa'; END IF;
  IF _action='expire' AND (o.status<>'reserved' OR o.reservation_expires_at IS NULL OR o.reservation_expires_at>now()) THEN RAISE EXCEPTION 'No vencida o en ejecución'; END IF;
  IF EXISTS(SELECT 1 FROM public.operation_deliveries WHERE operation_id=o.id AND accepted_at IS NULL) THEN RAISE EXCEPTION 'Hay entregas pendientes'; END IF;
  _data:=_data||jsonb_build_object('side',CASE WHEN s THEN 'seller' ELSE 'buyer' END);
 WHEN 'approve_release' THEN
  SELECT * INTO r FROM public.operation_events WHERE id=(_data->>'request_id')::uuid AND operation_id=o.id AND event IN ('cancel','release_remaining','expire');
  IF NOT FOUND OR NOT ((s AND r.data->>'side'='buyer') OR (b AND r.data->>'side'='seller')) OR EXISTS(SELECT 1 FROM public.operation_events WHERE operation_id=o.id AND event='approve_release' AND data->>'request_id'=r.id::text) OR o.dispute_open OR o.status IN ('cancelled','finalized') OR EXISTS(SELECT 1 FROM public.operation_deliveries WHERE operation_id=o.id AND accepted_at IS NULL) THEN RAISE EXCEPTION 'La otra parte debe aprobar solicitud vigente'; END IF;
  UPDATE public.commercial_operations SET reserved_kg=0,released_kg=released_kg+o.reserved_kg,status=CASE WHEN o.delivered_kg>0 AND r.event<>'cancel' THEN 'complete_delivery' ELSE 'cancelled' END WHERE id=o.id;
  IF o.reserved_kg>0 THEN PERFORM public.apply_stock_movement(o.listing_id,'release',o.reserved_kg,'Liberación bilateral '||o.code); END IF;
 WHEN 'dispute' THEN
  IF (NOT s AND NOT b) OR n='' OR o.status IN ('finalized','cancelled') THEN RAISE EXCEPTION 'Indicá motivo de disputa'; END IF;
  UPDATE public.commercial_operations SET dispute_open=true WHERE id=o.id;
 WHEN 'resolve_dispute' THEN
  IF NOT a OR n='' OR NOT o.dispute_open THEN RAISE EXCEPTION 'Solo administración resuelve con motivo'; END IF;
  UPDATE public.commercial_operations SET dispute_open=false WHERE id=o.id;
 WHEN 'declare_payment' THEN
  IF NOT b OR n='' OR o.status='cancelled' THEN RAISE EXCEPTION 'Comprador debe indicar evidencia'; END IF;
  UPDATE public.commercial_operations SET payment_status='declared',payment_evidence=n WHERE id=o.id;
 WHEN 'confirm_payment' THEN
  IF NOT s OR n='' OR o.payment_status<>'declared' THEN RAISE EXCEPTION 'Solo vendedor receptor confirma con evidencia'; END IF;
  UPDATE public.commercial_operations SET payment_status='recipient_confirmed',payment_evidence=n WHERE id=o.id;
 WHEN 'finalize' THEN
  IF NOT s AND NOT b THEN RAISE EXCEPTION 'Solo participantes finalizan'; END IF;
  IF o.confirmed_at IS NULL OR o.delivered_kg<=0 OR o.reserved_kg>0 OR o.dispute_open OR o.status<>'complete_delivery' OR EXISTS(SELECT 1 FROM public.operation_deliveries WHERE operation_id=o.id AND accepted_at IS NULL) OR EXISTS(SELECT 1 FROM unnest(o.required_documents) k WHERE NOT EXISTS(SELECT 1 FROM public.operation_documents d WHERE d.operation_id=o.id AND d.kind=k AND (d.path IS NOT NULL OR d.waiver_approved_by IS NOT NULL))) THEN RAISE EXCEPTION 'Faltan confirmaciones, recepción, liberación o documentación'; END IF;
  UPDATE public.commercial_operations SET status='finalized',commission_status=CASE WHEN commission_enabled THEN 'pending_review' ELSE 'cancelled' END WHERE id=o.id;
 WHEN 'commission' THEN
  IF NOT a OR n='' THEN RAISE EXCEPTION 'Solo administración decide con evidencia'; END IF;
  IF NOT o.commission_enabled OR NOT ((_data->>'status'='approved' AND o.commission_status='pending_review') OR (_data->>'status'='invoiced' AND o.commission_status='approved') OR (_data->>'status'='collected' AND o.commission_status='invoiced') OR (_data->>'status'='cancelled' AND o.commission_status<>'collected')) THEN RAISE EXCEPTION 'Transición inválida'; END IF;
  UPDATE public.commercial_operations SET commission_status=_data->>'status',commission_evidence=n WHERE id=o.id;
 ELSE RAISE EXCEPTION 'Acción inválida'; END CASE;
 INSERT INTO public.operation_events(operation_id,event,actor,data) VALUES(o.id,_action,auth.uid(),_data);
 INSERT INTO public.audit_log(actor,action,entity,entity_id,data) VALUES(auth.uid(),'operation.'||_action,'operation',o.id,_data);
 INSERT INTO public.operation_notifications(operation_id,company_id,event) VALUES(o.id,o.seller_company_id,_action),(o.id,o.buyer_company_id,_action);
 UPDATE public.commercial_operations SET updated_at=now() WHERE id=o.id RETURNING * INTO o;
 RETURN o;
END $$;
REVOKE ALL ON FUNCTION public.operation_action(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.operation_action(uuid,text,jsonb) TO authenticated;