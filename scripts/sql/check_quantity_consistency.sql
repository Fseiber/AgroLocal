-- READ ONLY. Run against an authorized complete copy, not an anon/RLS-filtered sample.
-- Does not require migration 0011 and does not create functions or modify records.
-- Empty results in BOTH queries mean no detected incompatibilities.
-- Extreme numeric representations are reported for manual review to avoid arithmetic overflow.
WITH source AS (
  SELECT 'listings'::text AS source_table, id, code, is_demo, original_unit, original_quantity,
    unit_weight_kg, quantity_kg, unit_count, min_sale_kg AS minimum_kg,
    reserved_kg, sold_kg, released_kg
  FROM public.listings
  UNION ALL
  SELECT 'demands', id, code, is_demo, original_unit, original_quantity,
    unit_weight_kg, quantity_kg, NULL, min_quantity_kg, 0, 0, 0 FROM public.demands
), factors AS (
  SELECT *, CASE original_unit WHEN 'kg' THEN 1 WHEN 'qq' THEN 100 WHEN 't' THEN 1000
    WHEN 'bolsa' THEN unit_weight_kg WHEN 'big_bag' THEN unit_weight_kg END AS factor
  FROM source
), calculated AS (
  SELECT *,
    CASE WHEN original_quantity > 0 AND original_quantity::text NOT IN ('NaN','Infinity','-Infinity')
      AND factor > 0 AND factor::text NOT IN ('NaN','Infinity','-Infinity')
      AND length(original_quantity::text) <= 1000 AND length(factor::text) <= 1000
      THEN round(original_quantity * factor, 3) END AS expected_kg,
    CASE WHEN unit_count > 0 AND unit_count::text NOT IN ('NaN','Infinity','-Infinity')
      AND unit_weight_kg > 0 AND unit_weight_kg::text NOT IN ('NaN','Infinity','-Infinity')
      AND length(unit_count::text) <= 1000 AND length(unit_weight_kg::text) <= 1000
      THEN round(unit_count * unit_weight_kg, 3) END AS counted_kg
  FROM factors
), diagnosed AS (
  SELECT *, array_remove(ARRAY[
    CASE WHEN original_unit IS NULL OR original_unit NOT IN ('kg','qq','t','bolsa','big_bag') THEN 'unknown_unit' END,
    CASE WHEN original_quantity IS NULL OR original_quantity <= 0 OR original_quantity::text IN ('NaN','Infinity','-Infinity') THEN 'invalid_original_quantity' END,
    CASE WHEN quantity_kg IS NULL OR quantity_kg <= 0 OR quantity_kg::text IN ('NaN','Infinity','-Infinity') THEN 'invalid_total_kg' END,
    CASE WHEN (original_unit IN ('bolsa','big_bag') OR unit_weight_kg IS NOT NULL)
      AND (unit_weight_kg IS NULL OR unit_weight_kg <= 0 OR unit_weight_kg::text IN ('NaN','Infinity','-Infinity')) THEN 'invalid_package_weight' END,
    CASE WHEN expected_kg IS NOT NULL AND quantity_kg IS DISTINCT FROM expected_kg THEN 'contradictory_total_kg' END,
    CASE WHEN expected_kg <= 0 THEN 'rounds_to_zero' END,
    CASE WHEN length(original_quantity::text) > 1000 OR length(factor::text) > 1000 THEN 'extreme_number_requires_review' END,
    CASE WHEN unit_count IS NOT NULL AND (unit_count <= 0 OR unit_count::text IN ('NaN','Infinity','-Infinity')
      OR unit_weight_kg IS NULL OR unit_weight_kg <= 0 OR unit_weight_kg::text IN ('NaN','Infinity','-Infinity')) THEN 'invalid_package_count_or_weight' END,
    CASE WHEN unit_count IS NOT NULL AND original_unit IN ('bolsa','big_bag') AND unit_count <> original_quantity THEN 'package_count_disagrees_with_original' END,
    CASE WHEN unit_count IS NOT NULL AND counted_kg IS NOT NULL AND counted_kg <> quantity_kg THEN 'package_count_disagrees_with_total' END,
    CASE WHEN length(unit_count::text) > 1000 THEN 'extreme_count_requires_review' END,
    CASE WHEN minimum_kg IS NOT NULL AND (minimum_kg <= 0 OR minimum_kg > quantity_kg
      OR minimum_kg::text IN ('NaN','Infinity','-Infinity')) THEN 'invalid_minimum_kg' END,
    CASE WHEN reserved_kg::text IN ('NaN','Infinity','-Infinity') OR sold_kg::text IN ('NaN','Infinity','-Infinity')
      OR released_kg::text IN ('NaN','Infinity','-Infinity') OR reserved_kg < 0 OR sold_kg < 0 OR released_kg < 0 THEN 'invalid_stock_counter' END,
    CASE WHEN reserved_kg + sold_kg > quantity_kg THEN 'stock_exceeds_total' END
  ], NULL) AS reasons FROM calculated
)
SELECT source_table, id, code, is_demo, original_unit, original_quantity, unit_weight_kg,
  unit_count, quantity_kg, expected_kg, minimum_kg, reserved_kg, sold_kg, reasons,
  CASE WHEN source_table = 'listings' THEN (
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'status',o.status)), '[]'::jsonb)
    FROM public.commercial_operations o WHERE o.listing_id = diagnosed.id
  ) ELSE '[]'::jsonb END AS linked_operations
FROM diagnosed WHERE cardinality(reasons) > 0 ORDER BY source_table, id;

-- KG-only records: do not reinterpret their amounts as package counts or round historical terms.
WITH source AS (
  SELECT 'opportunities'::text AS source_table,id,quantity_kg AS kg,NULL::text AS raw_quantity,
    false AS requires_review,0::numeric AS reserved,0::numeric AS delivered,0::numeric AS released FROM public.opportunities
  UNION ALL SELECT 'stock_movements',id,quantity_kg,NULL,false,0,0,0 FROM public.stock_movements
  UNION ALL SELECT 'operation_deliveries',id,quantity_kg,NULL,false,0,0,0 FROM public.operation_deliveries
  UNION ALL
  SELECT 'commercial_operations',id,NULL,terms->>'quantity_kg',false,reserved_kg,delivered_kg,released_kg FROM public.commercial_operations
  UNION ALL SELECT 'operation_versions',id,NULL,terms->>'quantity_kg',false,0,0,0 FROM public.operation_versions
), parsed AS (
  SELECT *, CASE WHEN raw_quantity IS NULL THEN kg
    -- Bounded text parsing avoids overflow in malformed/extreme JSON strings.
    WHEN length(trim(raw_quantity)) <= 1000
      AND trim(raw_quantity) ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]{1,4})?$'
      THEN trim(raw_quantity)::numeric END AS checked_kg
  FROM source
), diagnosed AS (
  SELECT *, array_remove(ARRAY[
    CASE WHEN checked_kg IS NULL THEN 'missing_invalid_or_extreme_quantity_requires_review' END,
    CASE WHEN checked_kg <= 0 OR checked_kg::text IN ('NaN','Infinity','-Infinity') THEN 'non_positive_or_non_finite_kg' END,
    CASE WHEN reserved < 0 OR delivered < 0 OR released < 0
      OR reserved::text IN ('NaN','Infinity','-Infinity') OR delivered::text IN ('NaN','Infinity','-Infinity')
      OR released::text IN ('NaN','Infinity','-Infinity') THEN 'invalid_operation_counter' END
  ], NULL) AS reasons FROM parsed
)
SELECT source_table,id,coalesce(raw_quantity,kg::text) AS stored_quantity,reasons
FROM diagnosed WHERE cardinality(reasons) > 0 ORDER BY source_table,id;
