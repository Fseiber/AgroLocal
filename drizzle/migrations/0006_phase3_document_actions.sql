CREATE FUNCTION public.operation_document_action(_id uuid,_action text,_data jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE o public.commercial_operations; s boolean; b boolean; a boolean; prefix text; BEGIN
 SELECT * INTO o FROM public.commercial_operations WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_read_operation(o.id) THEN RAISE EXCEPTION 'Sin acceso'; END IF;
 s:=public.is_company_member(o.seller_company_id,'operator'); b:=public.is_company_member(o.buyer_company_id,'operator'); a:=public.has_role(auth.uid(),'admin');
 CASE _action
 WHEN 'read_notification' THEN UPDATE public.operation_notifications SET read_at=now() WHERE operation_id=o.id AND public.is_company_member(company_id);
 WHEN 'document_access' THEN
  IF NOT EXISTS(SELECT 1 FROM public.operation_documents WHERE id=(_data->>'document_id')::uuid AND operation_id=o.id AND path IS NOT NULL) THEN RAISE EXCEPTION 'Documento inexistente'; END IF;
 WHEN 'add_document' THEN
  IF NOT s AND NOT b THEN RAISE EXCEPTION 'Solo operadores adjuntan'; END IF;
  IF coalesce(_data->>'kind','') NOT IN ('lpg','invoice','transport','delivery','payment','other') OR coalesce(_data->>'file_name','')='' THEN RAISE EXCEPTION 'Categoría o nombre inválido'; END IF;
  IF coalesce(trim(_data->>'absence_reason'),'')='' THEN
   prefix:=CASE WHEN s THEN o.seller_company_id::text ELSE o.buyer_company_id::text END;
   IF split_part(_data->>'path','/',1) IS DISTINCT FROM prefix OR split_part(_data->>'path','/',2) IS DISTINCT FROM o.id::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='operation-docs' AND name=_data->>'path') THEN RAISE EXCEPTION 'Archivo no autorizado'; END IF;
  END IF;
  INSERT INTO public.operation_documents(operation_id,kind,path,file_name,uploaded_by,absence_reason) VALUES(o.id,_data->>'kind',CASE WHEN coalesce(trim(_data->>'absence_reason'),'')='' THEN _data->>'path' ELSE NULL END,_data->>'file_name',auth.uid(),nullif(trim(_data->>'absence_reason'),''));
 WHEN 'approve_waiver' THEN
  IF NOT a OR coalesce(trim(_data->>'note'),'')='' THEN RAISE EXCEPTION 'Administración debe justificar aprobación'; END IF;
  UPDATE public.operation_documents SET waiver_approved_by=auth.uid() WHERE id=(_data->>'document_id')::uuid AND operation_id=o.id AND absence_reason IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Justificación inexistente'; END IF;
 ELSE RAISE EXCEPTION 'Acción inválida'; END CASE;
 INSERT INTO public.operation_events(operation_id,event,actor,data) VALUES(o.id,_action,auth.uid(),_data);
 INSERT INTO public.audit_log(actor,action,entity,entity_id,data) VALUES(auth.uid(),'operation.'||_action,'operation',o.id,_data);
 IF _action='add_document' THEN INSERT INTO public.operation_notifications(operation_id,company_id,event) VALUES(o.id,o.seller_company_id,_action),(o.id,o.buyer_company_id,_action); END IF;
END $$;
REVOKE ALL ON FUNCTION public.operation_document_action(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.operation_document_action(uuid,text,jsonb) TO authenticated;