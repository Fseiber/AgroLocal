CREATE FUNCTION public.propose_operation(_opportunity uuid,_listing uuid,_terms jsonb,_expected_version integer DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.opportunities; l public.listings; o public.commercial_operations; cfg public.commercial_settings; qty numeric; kinds text[];
BEGIN
 SELECT * INTO p FROM public.opportunities WHERE id=_opportunity FOR UPDATE;
 IF NOT FOUND OR NOT public.is_company_member(p.seller_company_id,'operator') THEN RAISE EXCEPTION 'Solo el vendedor autorizado puede proponer'; END IF;
 IF p.status='cancelled' THEN RAISE EXCEPTION 'Oportunidad cancelada'; END IF;
 SELECT * INTO l FROM public.listings WHERE id=coalesce(p.listing_id,_listing) FOR UPDATE;
 IF NOT FOUND OR l.company_id<>p.seller_company_id OR l.is_demo OR l.status<>'active' THEN RAISE EXCEPTION 'Seleccioná una publicación activa del vendedor'; END IF;
 IF NOT public.company_is_verified(p.seller_company_id) OR NOT public.company_is_verified(p.buyer_company_id) THEN RAISE EXCEPTION 'Ambas empresas deben estar verificadas'; END IF;
 qty := (_terms->>'quantity_kg')::numeric;
 IF qty IS NULL OR qty<=0 OR (_terms->>'price')::numeric IS NULL OR (_terms->>'price')::numeric<=0 OR coalesce(_terms->>'currency','') NOT IN ('ARS','USD') OR coalesce(trim(_terms->>'delivery_terms'),'')='' OR coalesce(trim(_terms->>'quality_terms'),'')='' OR coalesce(_terms->>'estimated_date','')='' OR coalesce(_terms->>'modality','')='' THEN RAISE EXCEPTION 'Completá cantidad, precio neto, moneda, calidad, entrega, modalidad y fecha'; END IF;
 PERFORM public.operation_net_value(qty,_terms); PERFORM (_terms->>'estimated_date')::date;
 SELECT * INTO o FROM public.commercial_operations WHERE opportunity_id=p.id FOR UPDATE;
 IF FOUND THEN
  IF _expected_version IS DISTINCT FROM o.version THEN RAISE EXCEPTION 'El acuerdo cambió: recargá'; END IF;
  IF o.status IN ('finalized','cancelled') OR o.dispute_open OR o.delivered_kg>0 OR EXISTS(SELECT 1 FROM public.operation_deliveries WHERE operation_id=o.id) THEN RAISE EXCEPTION 'No se cambian términos con entregas, disputa o cierre'; END IF;
  IF o.listing_id<>l.id THEN RAISE EXCEPTION 'No se puede cambiar publicación'; END IF;
  IF o.reserved_kg>0 THEN UPDATE public.commercial_operations SET reserved_kg=0,released_kg=released_kg+o.reserved_kg WHERE id=o.id; PERFORM public.apply_stock_movement(l.id,'release',o.reserved_kg,'Reconfirmación'); END IF;
  UPDATE public.commercial_operations SET terms=_terms,version=version+1,status='agreement_declared',seller_accepted_by=auth.uid(),seller_accepted_at=now(),buyer_accepted_by=NULL,buyer_accepted_at=NULL,confirmed_at=NULL,reservation_expires_at=NULL,updated_at=now() WHERE id=o.id RETURNING * INTO o;
 ELSE
  SELECT * INTO cfg FROM public.commercial_settings WHERE id=true;
  SELECT required_kinds INTO kinds FROM public.operation_document_rules WHERE product_type=l.product_type AND modality=_terms->>'modality';
  INSERT INTO public.commercial_operations(opportunity_id,listing_id,seller_company_id,buyer_company_id,code,terms,seller_accepted_by,seller_accepted_at,commission_rate,commission_enabled,commission_payer,required_documents) VALUES(p.id,l.id,p.seller_company_id,p.buyer_company_id,p.code,_terms,auth.uid(),now(),coalesce(cfg.commission_rate,0.005),coalesce(cfg.commission_enabled,true),coalesce(cfg.commission_payer,'seller'),coalesce(kinds,'{}')) RETURNING * INTO o;
 END IF;
 INSERT INTO public.operation_versions(operation_id,version,terms,seller_by) VALUES(o.id,o.version,_terms,auth.uid());
 INSERT INTO public.operation_events(operation_id,event,actor,data) VALUES(o.id,'agreement_declared',auth.uid(),jsonb_build_object('version',o.version,'terms',_terms));
 INSERT INTO public.operation_notifications(operation_id,company_id,event) VALUES(o.id,o.buyer_company_id,'confirmation_pending');
 INSERT INTO public.audit_log(actor,action,entity,entity_id,data) VALUES(auth.uid(),'operation.propose','operation',o.id,jsonb_build_object('version',o.version));
 RETURN o.id;
END $$;
CREATE FUNCTION public.configure_commercial(_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') OR coalesce(trim(_data->>'note'),'')='' THEN RAISE EXCEPTION 'Solo administración; motivo obligatorio'; END IF;
 IF _data ? 'required_kinds' THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(_data->'required_kinds') k WHERE k NOT IN ('lpg','invoice','transport','delivery','payment','other')) OR coalesce(_data->>'modality','')='' THEN RAISE EXCEPTION 'Regla inválida'; END IF;
  INSERT INTO public.operation_document_rules(product_type,modality,required_kinds) VALUES((_data->>'product_type')::public.product_type,_data->>'modality',ARRAY(SELECT jsonb_array_elements_text(_data->'required_kinds'))) ON CONFLICT(product_type,modality) DO UPDATE SET required_kinds=excluded.required_kinds;
 ELSE
  INSERT INTO public.commercial_settings(id,commission_enabled,commission_rate,commission_payer,reservation_days) VALUES(true,(_data->>'commission_enabled')::boolean,(_data->>'commission_rate')::numeric,_data->>'commission_payer',(_data->>'reservation_days')::integer) ON CONFLICT(id) DO UPDATE SET commission_enabled=excluded.commission_enabled,commission_rate=excluded.commission_rate,commission_payer=excluded.commission_payer,reservation_days=excluded.reservation_days;
 END IF;
 INSERT INTO public.audit_log(actor,action,entity,data) VALUES(auth.uid(),'commercial.configure','settings',_data);
END $$;
REVOKE ALL ON FUNCTION public.propose_operation(uuid,uuid,jsonb,integer),public.configure_commercial(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_operation(uuid,uuid,jsonb,integer),public.configure_commercial(jsonb) TO authenticated;