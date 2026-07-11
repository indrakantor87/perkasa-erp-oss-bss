-- Jalankan file ini setelah patch schema `Wave 1C` tersedia.
-- Sample ini memvalidasi jalur coverage dan marketing activity PSB pada review DB.

USE erp_isp_review;

INSERT INTO staging_import_batches (
  batch_code,
  source_system,
  import_scope,
  source_file_name,
  import_status,
  total_rows,
  valid_rows,
  invalid_rows,
  duplicate_rows,
  notes
)
VALUES (
  'SAMPLE-WEBPSB-COVERAGE-001',
  'WEB_PSB',
  'PSB_COVERAGE',
  'sample-web-psb-covered-area.json',
  'UPLOADED',
  2,
  0,
  0,
  0,
  'sample kecil untuk CoveredArea legacy -> sales_covered_areas'
)
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO staging_import_batches (
  batch_code,
  source_system,
  import_scope,
  source_file_name,
  import_status,
  total_rows,
  valid_rows,
  invalid_rows,
  duplicate_rows,
  notes
)
VALUES (
  'SAMPLE-WEBPSB-MARKETING-001',
  'WEB_PSB',
  'PSB_MARKETING_ACTIVITY',
  'sample-web-psb-marketing-activity.json',
  'UPLOADED',
  3,
  0,
  0,
  0,
  'sample kecil untuk MarketingActivity legacy -> sales_marketing_activities'
)
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO staging_legacy_sales_coverage_records (
  batch_id,
  source_system,
  legacy_id,
  branch_code,
  area_code,
  area_name,
  coverage_status,
  village,
  district,
  city,
  province,
  latitude,
  longitude,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'AREA-001',
  NULL,
  'PSB-AREA-000001',
  'Trangkil',
  'AVAILABLE',
  NULL,
  'Trangkil',
  'Pati',
  'Jawa Tengah',
  -6.6767640,
  111.0879242,
  'sample area coverage utama dari PSB',
  '{"id":"AREA-001","name":"Trangkil","description":"sample area coverage utama dari PSB"}',
  'psb-area-000001',
  'MAPPED',
  'sample coverage utama'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-COVERAGE-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_sales_coverage_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'AREA-001'
  );

INSERT INTO staging_legacy_sales_coverage_records (
  batch_id,
  source_system,
  legacy_id,
  branch_code,
  area_code,
  area_name,
  coverage_status,
  village,
  district,
  city,
  province,
  latitude,
  longitude,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'AREA-002',
  NULL,
  'PSB-AREA-000002',
  'Margorejo',
  'AVAILABLE',
  NULL,
  'Margorejo',
  'Pati',
  'Jawa Tengah',
  -6.7421000,
  111.0411000,
  'sample area coverage kedua dari PSB',
  '{"id":"AREA-002","name":"Margorejo","description":"sample area coverage kedua dari PSB"}',
  'psb-area-000002',
  'MAPPED',
  'sample coverage kedua'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-COVERAGE-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_sales_coverage_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'AREA-002'
  );

INSERT INTO staging_legacy_marketing_activity_records (
  batch_id,
  source_system,
  legacy_id,
  branch_code,
  activity_date,
  marketing_name,
  activity_type,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'MA-001',
  NULL,
  '2026-07-11 08:00:00',
  'Anne',
  'Door to Door',
  'Aktivitas marketing sample yang menjangkau dua area coverage',
  '{"id":"MA-001","date":"2026-07-11","marketingName":"Anne","activity":"Door to Door","notes":"Aktivitas marketing sample yang menjangkau dua area coverage","areaId":"AREA-001","areaId2":"AREA-002"}',
  'ma-001|anne|2026-07-11',
  'MAPPED',
  'sample marketing activity dua area'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_marketing_activity_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'MA-001'
  );

INSERT INTO staging_legacy_marketing_activity_area_records (
  batch_id,
  source_system,
  legacy_activity_id,
  legacy_area_id,
  sort_order,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'MA-001',
  'AREA-001',
  1,
  '{"legacyActivityId":"MA-001","legacyAreaId":"AREA-001","sortOrder":1}',
  'ma-001|area-001|1',
  'MAPPED',
  'sample relasi area pertama'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_marketing_activity_area_records s
    WHERE s.batch_id = b.id
      AND s.legacy_activity_id = 'MA-001'
      AND s.legacy_area_id = 'AREA-001'
  );

INSERT INTO staging_legacy_marketing_activity_area_records (
  batch_id,
  source_system,
  legacy_activity_id,
  legacy_area_id,
  sort_order,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'MA-001',
  'AREA-002',
  2,
  '{"legacyActivityId":"MA-001","legacyAreaId":"AREA-002","sortOrder":2}',
  'ma-001|area-002|2',
  'MAPPED',
  'sample relasi area kedua'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_marketing_activity_area_records s
    WHERE s.batch_id = b.id
      AND s.legacy_activity_id = 'MA-001'
      AND s.legacy_area_id = 'AREA-002'
  );

UPDATE staging_import_batches
SET valid_rows = 2,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-COVERAGE-001';

UPDATE staging_import_batches
SET valid_rows = 3,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001';
