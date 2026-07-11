-- Jalankan file ini setelah loader JSON production `Wave 2` dimuat ke staging review DB.
-- Transform ini khusus untuk batch production `CoveredArea` dan `MarketingActivity` dari `Web PSB`.

USE erp_isp_review;

SET @coverage_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-COVERAGE-001'
  ORDER BY id DESC
  LIMIT 1
);

SET @marketing_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
);

INSERT INTO sales_covered_areas (
  branch_id,
  area_code,
  area_name,
  village,
  district,
  city,
  province,
  latitude,
  longitude,
  coverage_status,
  notes
)
SELECT
  ob.id,
  COALESCE(NULLIF(TRIM(s.area_code), ''), CONCAT('PSB-PROD-AREA-', LPAD(s.id, 6, '0'))),
  COALESCE(NULLIF(TRIM(s.area_name), ''), CONCAT('Legacy Area ', s.id)),
  NULLIF(TRIM(s.village), ''),
  NULLIF(TRIM(s.district), ''),
  NULLIF(TRIM(s.city), ''),
  NULLIF(TRIM(s.province), ''),
  s.latitude,
  s.longitude,
  CASE
    WHEN UPPER(TRIM(s.coverage_status)) = 'AVAILABLE' THEN 'AVAILABLE'
    WHEN UPPER(TRIM(s.coverage_status)) = 'LIMITED' THEN 'LIMITED'
    WHEN UPPER(TRIM(s.coverage_status)) = 'UNAVAILABLE' THEN 'UNAVAILABLE'
    ELSE 'PLANNED'
  END,
  s.notes
FROM staging_legacy_sales_coverage_records s
LEFT JOIN org_branches ob
  ON ob.code = s.branch_code
WHERE s.batch_id = @coverage_batch_id
  AND s.import_status IN ('MAPPED', 'VALID')
  AND s.target_covered_area_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sales_covered_areas a
    WHERE a.area_code = COALESCE(NULLIF(TRIM(s.area_code), ''), CONCAT('PSB-PROD-AREA-', LPAD(s.id, 6, '0')))
  );

UPDATE staging_legacy_sales_coverage_records s
JOIN sales_covered_areas a
  ON a.area_code = COALESCE(NULLIF(TRIM(s.area_code), ''), CONCAT('PSB-PROD-AREA-', LPAD(s.id, 6, '0')))
SET s.target_covered_area_id = a.id,
    s.import_status = 'IMPORTED',
    s.imported_at = COALESCE(s.imported_at, CURRENT_TIMESTAMP),
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.batch_id = @coverage_batch_id
  AND s.import_status IN ('MAPPED', 'VALID')
  AND s.target_covered_area_id IS NULL;

INSERT INTO sales_marketing_activities (
  branch_id,
  activity_date,
  marketing_name,
  activity_type,
  notes,
  source_system,
  legacy_id
)
SELECT
  ob.id,
  COALESCE(s.activity_date, CURRENT_TIMESTAMP),
  COALESCE(NULLIF(TRIM(s.marketing_name), ''), 'Legacy Marketing'),
  COALESCE(NULLIF(TRIM(s.activity_type), ''), 'UNKNOWN'),
  s.notes,
  s.source_system,
  s.legacy_id
FROM staging_legacy_marketing_activity_records s
LEFT JOIN org_branches ob
  ON ob.code = s.branch_code
WHERE s.batch_id = @marketing_batch_id
  AND s.import_status IN ('MAPPED', 'VALID')
  AND s.target_activity_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sales_marketing_activities a
    WHERE a.source_system = s.source_system
      AND ((a.legacy_id = s.legacy_id) OR (a.legacy_id IS NULL AND s.legacy_id IS NULL))
  );

UPDATE staging_legacy_marketing_activity_records s
JOIN sales_marketing_activities a
  ON a.source_system = s.source_system
  AND ((a.legacy_id = s.legacy_id) OR (a.legacy_id IS NULL AND s.legacy_id IS NULL))
SET s.target_activity_id = a.id,
    s.import_status = 'IMPORTED',
    s.imported_at = COALESCE(s.imported_at, CURRENT_TIMESTAMP),
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.batch_id = @marketing_batch_id
  AND s.import_status IN ('MAPPED', 'VALID')
  AND s.target_activity_id IS NULL;

UPDATE staging_legacy_marketing_activity_area_records rel
JOIN staging_legacy_marketing_activity_records act
  ON act.batch_id = rel.batch_id
  AND act.source_system = rel.source_system
  AND act.legacy_id = rel.legacy_activity_id
JOIN staging_legacy_sales_coverage_records area
  ON area.source_system = rel.source_system
  AND area.legacy_id = rel.legacy_area_id
SET rel.target_activity_id = act.target_activity_id,
    rel.target_covered_area_id = area.target_covered_area_id,
    rel.updated_at = CURRENT_TIMESTAMP
WHERE rel.batch_id = @marketing_batch_id
  AND (rel.target_activity_id IS NULL OR rel.target_covered_area_id IS NULL);

INSERT INTO sales_marketing_activity_areas (
  activity_id,
  covered_area_id,
  sort_order
)
SELECT
  rel.target_activity_id,
  rel.target_covered_area_id,
  rel.sort_order
FROM staging_legacy_marketing_activity_area_records rel
WHERE rel.batch_id = @marketing_batch_id
  AND rel.import_status IN ('MAPPED', 'VALID')
  AND rel.target_activity_id IS NOT NULL
  AND rel.target_covered_area_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sales_marketing_activity_areas a
    WHERE a.activity_id = rel.target_activity_id
      AND a.covered_area_id = rel.target_covered_area_id
  );

UPDATE staging_legacy_marketing_activity_area_records rel
SET rel.import_status = 'IMPORTED',
    rel.imported_at = COALESCE(rel.imported_at, CURRENT_TIMESTAMP),
    rel.updated_at = CURRENT_TIMESTAMP
WHERE rel.batch_id = @marketing_batch_id
  AND rel.import_status IN ('MAPPED', 'VALID')
  AND rel.target_activity_id IS NOT NULL
  AND rel.target_covered_area_id IS NOT NULL;
