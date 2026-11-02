-- Demo preparation ONLY: read-only queries for an authorized technical operator.
-- Does not execute business RPCs, accept invitations, apply migrations or change grants/RLS.
-- NOT executed in this review. Do not use an anon/RLS-limited sample as a complete diagnosis.
WITH objects(name) AS (VALUES
  ('public.profiles'),('public.user_roles'),('public.companies'),('public.company_members'),
  ('public.company_invitations'),('public.companies_public'),('public.verification_events'),
  ('public.audit_log'),('public.listings'),('public.demands'),('public.listing_documents'),
  ('public.stock_movements'),('public.opportunities'),('public.opportunity_events'),
  ('public.commercial_operations'),('public.operation_versions'),('public.operation_events'),
  ('public.operation_deliveries'),('public.operation_documents'),('public.operation_notifications'),
  ('public.commercial_settings'),('public.operation_document_rules')
)
SELECT o.name,to_regclass(o.name) IS NOT NULL AS present,
  CASE WHEN c.relkind IN ('r','p') THEN c.relrowsecurity END AS rls_enabled
FROM objects o LEFT JOIN pg_class c ON c.oid=to_regclass(o.name) ORDER BY o.name;

WITH functions(name,signature) AS (VALUES
  ('register_company','public.register_company(text,text,text,text,text,public.company_intent,text,text)'),
  ('has_role','public.has_role(uuid,public.app_role)'),
  ('is_company_member','public.is_company_member(uuid,public.company_role)'),
  ('company_is_verified','public.company_is_verified(uuid)'),
  ('accept_pending_invitations','public.accept_pending_invitations()'),
  ('request_quote','public.request_quote(uuid,uuid,uuid,numeric)'),
  ('opportunity_parties','public.opportunity_parties(uuid)'),
  ('propose_operation','public.propose_operation(uuid,uuid,jsonb,integer)'),
  ('operation_action','public.operation_action(uuid,text,jsonb)'),
  ('apply_stock_movement','public.apply_stock_movement(uuid,text,numeric,text)'),
  ('set_company_verification','public.set_company_verification(uuid,public.verification_status,text)')
)
SELECT name, to_regprocedure(signature) IS NOT NULL AS present,
  CASE WHEN to_regprocedure(signature) IS NOT NULL AND to_regrole('authenticated') IS NOT NULL
    THEN has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') END AS authenticated_can_execute
FROM functions ORDER BY name;

-- 0007 is essential for buyer acceptance: markers are indications, not a substitute for code review.
WITH definitions AS (
  SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p
  WHERE p.oid IN (
    to_regprocedure('public.operation_action(uuid,text,jsonb)'),
    to_regprocedure('public.apply_stock_movement(uuid,text,numeric,text)')
  )
)
SELECT proname,
  position('agrolocal.operation_id' IN definition)>0 AS has_operation_context,
  CASE WHEN proname='apply_stock_movement' THEN position('buyer_company_id' IN definition)>0 END AS has_buyer_scope_marker,
  definition
FROM definitions ORDER BY proname;

-- Informational only: 0011 is NOT a prerequisite and must NOT be applied for this demo.
SELECT to_regprocedure('public.agrolocal_quantity_consistent(text,numeric,numeric,numeric,numeric,numeric)') IS NOT NULL
  AS quantity_0011_helper_present;

-- Fill controlled trial emails BEFORE creating/confirming accounts or opening authenticated panels.
-- Output only counts, not addresses. A missing value is UNKNOWN, not zero invitations.
WITH planned(actor,email) AS (VALUES
  ('seller',NULL::text),('buyer',NULL::text)
)
SELECT actor,email IS NOT NULL AS configured,
  CASE WHEN email IS NOT NULL THEN (
    SELECT count(*) FROM public.company_invitations i
    WHERE lower(trim(i.email))=lower(trim(planned.email)) AND accepted_at IS NULL
  ) END AS pending_invitations
FROM planned;

-- Fill IDs only after a separately authorized preparation; no email/token/password is selected.
WITH planned(actor,user_id,company_id) AS (VALUES
  ('seller',NULL::uuid,NULL::uuid),('buyer',NULL::uuid,NULL::uuid)
)
SELECT p.actor,p.user_id IS NOT NULL AND p.company_id IS NOT NULL AS configured,
  u.id IS NOT NULL AS user_exists,u.email_confirmed_at IS NOT NULL AS email_confirmed,
  c.id IS NOT NULL AS company_exists,c.verification_status,c.is_demo,m.role AS company_role,
  (SELECT count(*) FROM public.company_members all_members WHERE all_members.user_id=p.user_id) AS membership_count,
  EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id AND r.role='admin') AS platform_admin
FROM planned p LEFT JOIN auth.users u ON u.id=p.user_id
LEFT JOIN public.companies c ON c.id=p.company_id
LEFT JOIN public.company_members m ON m.user_id=p.user_id AND m.company_id=p.company_id;

-- For an authorized read after reservation, fill the listing and operation IDs. NULL returns no rows.
WITH planned(listing_id,operation_id) AS (VALUES (NULL::uuid,NULL::uuid))
SELECT l.id AS listing_id,l.code AS listing_code,l.quantity_kg,l.reserved_kg,l.sold_kg,
  l.quantity_kg-l.reserved_kg-l.sold_kg AS available_kg,
  o.id AS operation_id,o.code AS operation_code,o.version,o.status,o.reserved_kg AS operation_reserved_kg,
  o.buyer_accepted_at IS NOT NULL AS buyer_accepted,o.confirmed_at IS NOT NULL AS confirmed
FROM planned p JOIN public.listings l ON l.id=p.listing_id
JOIN public.commercial_operations o ON o.id=p.operation_id AND o.listing_id=l.id;
