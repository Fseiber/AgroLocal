-- Local preparation only. Apply separately after an authorized full-data preflight.
-- No UPDATE/DELETE, no rewriting agreements, no replacing stock/RPC functions.
-- ADD CHECK validates existing rows: any incompatibility aborts the migration.
-- Keep this migration atomic in the migration runner. Do not execute statements piecemeal.
CREATE FUNCTION public.agrolocal_quantity_finite(_value numeric)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT _value IS NOT NULL AND _value::text NOT IN ('NaN', 'Infinity', '-Infinity')
$$;

CREATE FUNCTION public.agrolocal_quantity_expected_kg(_unit text, _quantity numeric, _weight numeric)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
DECLARE factor numeric;
BEGIN
  IF NOT public.agrolocal_quantity_finite(_quantity) OR _quantity <= 0 THEN RETURN NULL; END IF;
  CASE _unit
    WHEN 'kg' THEN factor := 1;
    WHEN 'qq' THEN factor := 100;
    WHEN 't' THEN factor := 1000;
    WHEN 'bolsa', 'big_bag' THEN
      IF NOT public.agrolocal_quantity_finite(_weight) OR _weight <= 0 THEN RETURN NULL; END IF;
      factor := _weight;
    ELSE RETURN NULL;
  END CASE;
  RETURN round(_quantity * factor, 3);
EXCEPTION WHEN numeric_value_out_of_range THEN RETURN NULL;
END $$;

CREATE FUNCTION public.agrolocal_quantity_consistent(
  _unit text, _quantity numeric, _weight numeric, _kg numeric,
  _count numeric DEFAULT NULL, _minimum numeric DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
DECLARE expected numeric;
BEGIN
  expected := public.agrolocal_quantity_expected_kg(_unit, _quantity, _weight);
  IF expected IS NULL OR expected <= 0 OR NOT public.agrolocal_quantity_finite(_kg) OR _kg <> expected THEN RETURN false; END IF;
  IF _weight IS NOT NULL AND (NOT public.agrolocal_quantity_finite(_weight) OR _weight <= 0) THEN RETURN false; END IF;
  IF _minimum IS NOT NULL AND (NOT public.agrolocal_quantity_finite(_minimum) OR _minimum <= 0 OR _minimum > _kg) THEN RETURN false; END IF;
  IF _count IS NOT NULL THEN
    -- count is the number of packages, not tonnes/kg. 2.5 t may also be 100 x 25 kg.
    IF NOT public.agrolocal_quantity_finite(_count) OR _count <= 0
       OR NOT public.agrolocal_quantity_finite(_weight) OR _weight <= 0 THEN RETURN false; END IF;
    IF _unit IN ('bolsa', 'big_bag') AND _count <> _quantity THEN RETURN false; END IF;
    IF round(_count * _weight, 3) <> _kg THEN RETURN false; END IF;
  END IF;
  RETURN true;
EXCEPTION WHEN numeric_value_out_of_range THEN RETURN false;
END $$;

CREATE FUNCTION public.agrolocal_terms_quantity_valid(_terms jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
DECLARE quantity numeric;
BEGIN
  IF jsonb_typeof(_terms) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  -- Preserve numeric strings accepted by the existing RPC casts, and historical kg precision.
  quantity := (_terms->>'quantity_kg')::numeric;
  RETURN public.agrolocal_quantity_finite(quantity) AND quantity > 0;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END $$;

REVOKE ALL ON FUNCTION public.agrolocal_quantity_finite(numeric),
  public.agrolocal_quantity_expected_kg(text,numeric,numeric),
  public.agrolocal_quantity_consistent(text,numeric,numeric,numeric,numeric,numeric),
  public.agrolocal_terms_quantity_valid(jsonb) FROM PUBLIC;
-- Pure invoker functions only; these permissions also allow CHECK evaluation by API writers.
GRANT EXECUTE ON FUNCTION public.agrolocal_quantity_finite(numeric),
  public.agrolocal_quantity_expected_kg(text,numeric,numeric),
  public.agrolocal_quantity_consistent(text,numeric,numeric,numeric,numeric,numeric),
  public.agrolocal_terms_quantity_valid(jsonb) TO anon, authenticated, service_role;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_quantity_consistency CHECK (
    public.agrolocal_quantity_consistent(original_unit,original_quantity,unit_weight_kg,quantity_kg,unit_count,min_sale_kg) IS TRUE),
  ADD CONSTRAINT listings_stock_finite CHECK (
    (public.agrolocal_quantity_finite(reserved_kg) AND public.agrolocal_quantity_finite(sold_kg)
     AND public.agrolocal_quantity_finite(released_kg)) IS TRUE);
ALTER TABLE public.demands
  ADD CONSTRAINT demands_quantity_consistency CHECK (
    public.agrolocal_quantity_consistent(original_unit,original_quantity,unit_weight_kg,quantity_kg,NULL,min_quantity_kg) IS TRUE);
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_quantity_finite CHECK ((public.agrolocal_quantity_finite(quantity_kg) AND quantity_kg > 0) IS TRUE);
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_quantity_finite CHECK ((public.agrolocal_quantity_finite(quantity_kg) AND quantity_kg > 0) IS TRUE);
ALTER TABLE public.operation_deliveries
  ADD CONSTRAINT operation_deliveries_quantity_finite CHECK ((public.agrolocal_quantity_finite(quantity_kg) AND quantity_kg > 0) IS TRUE);
ALTER TABLE public.commercial_operations
  ADD CONSTRAINT commercial_operations_quantity_valid CHECK (
    (public.agrolocal_terms_quantity_valid(terms) AND public.agrolocal_quantity_finite(reserved_kg)
     AND public.agrolocal_quantity_finite(delivered_kg) AND public.agrolocal_quantity_finite(released_kg)
     AND reserved_kg >= 0 AND delivered_kg >= 0 AND released_kg >= 0) IS TRUE);
ALTER TABLE public.operation_versions
  ADD CONSTRAINT operation_versions_quantity_valid CHECK (public.agrolocal_terms_quantity_valid(terms) IS TRUE);
