DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.operation_action(uuid,text,jsonb)'::regprocedure) INTO def;
 def:=replace(def, 'PERFORM public.apply_stock_movement', 'PERFORM set_config(''agrolocal.operation_id'',o.id::text,true); PERFORM public.apply_stock_movement');
 EXECUTE def;
 SELECT pg_get_functiondef('public.apply_stock_movement(uuid,text,numeric,text)'::regprocedure) INTO def;
 def:=replace(def, 'if not public.is_company_member(l.company_id,''operator'') then', 'if not public.is_company_member(l.company_id,''operator'') AND NOT EXISTS (SELECT 1 FROM public.commercial_operations o WHERE o.id::text=current_setting(''agrolocal.operation_id'',true) AND o.listing_id=l.id AND public.is_company_member(o.buyer_company_id,''operator'') AND _kind IN (''reserve'',''sell'',''release'')) then');
 EXECUTE def;
END $$;