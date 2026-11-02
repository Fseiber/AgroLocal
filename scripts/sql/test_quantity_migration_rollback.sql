-- psql-only regression. NEVER use on the demo/production backend.
-- Requires an explicitly confirmed isolated database with 0000-0010, BEFORE 0011.
-- No automatic connection or migration runner: execute only after independent isolation confirmation.
-- Example, with connection configured securely outside this file:
-- psql -v AGROLOCAL_QUANTITY_ISOLATED=true -f scripts/sql/test_quantity_migration_rollback.sql
\set ON_ERROR_STOP on
\if :{?AGROLOCAL_QUANTITY_ISOLATED}
\else
  \echo 'BLOCKED: isolated database confirmation is required.'
  \quit 1
\endif
\if :AGROLOCAL_QUANTITY_ISOLATED
\else
  \echo 'BLOCKED: isolated database confirmation must be true.'
  \quit 1
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
DO $guard$
BEGIN
  IF to_regprocedure('public.agrolocal_quantity_finite(numeric)') IS NOT NULL THEN
    RAISE EXCEPTION 'Requires an isolated copy BEFORE migration 0011';
  END IF;
END $guard$;

-- A NEW disposable fixture only; does not alter any existing listing/company/agreement.
INSERT INTO public.listings(
  company_id, product_type, commercial_type, original_unit, original_quantity,
  quantity_kg, province, locality, is_demo
) VALUES (
  '00000000-0000-0000-0000-0000000000d1', 'cascara', 'Largo fino', 't', 1,
  1, 'Corrientes', 'Quantity rollback regression', true
);

SAVEPOINT before_quantity_migration;
-- Expected CHECK failure. The transaction must not leave helpers/constraints half applied.
-- Test harness only: per-statement savepoints retain the original CHECK SQLSTATE,
-- rather than masking it with subsequent transaction-aborted errors.
\set LAST_ERROR_SQLSTATE 00000
\set ON_ERROR_ROLLBACK on
\set ON_ERROR_STOP off
\ir ../../drizzle/migrations/0011_quantity_consistency.sql
\set observed_quantity_sqlstate :LAST_ERROR_SQLSTATE
\set ON_ERROR_STOP on
\set ON_ERROR_ROLLBACK off
SELECT :'observed_quantity_sqlstate' = '23514'
  AND public.agrolocal_quantity_consistent('t',1,NULL,1) IS FALSE
  AND NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='listings_quantity_consistency')
  AS expected_quantity_failure \gset
ROLLBACK TO SAVEPOINT before_quantity_migration;

\if :expected_quantity_failure
  DO $assert$
  BEGIN
    IF to_regprocedure('public.agrolocal_quantity_finite(numeric)') IS NOT NULL
      OR EXISTS(SELECT 1 FROM pg_constraint WHERE conname='listings_quantity_consistency') THEN
      RAISE EXCEPTION 'Migration rollback did not restore the previous schema';
    END IF;
  END $assert$;
  \echo 'PASS: contradictory historical quantity rejects migration; schema rolled back.'
\else
  ROLLBACK;
  \echo 'FAIL: migration accepted contradictory historical quantities.'
  \quit 1
\endif
ROLLBACK;
