-- Jalankan file ini setelah:
-- 1. `xampp_review_sample_import.sql`
-- 2. `xampp_review_transform_stage_2.sql`
-- 3. `xampp_review_transform_stage_3.sql`
-- File ini membuat sample batch tambahan untuk menguji extension wave 1A Web PSB.

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
VALUES
  (
    'SAMPLE-WEBPSB-SUPPORT-EXT-001',
    'WEB_PSB',
    'PSB_SUPPORT_EXT',
    'sample-web-psb-support-ext.json',
    'UPLOADED',
    4,
    0,
    0,
    0,
    'sample extension support Web PSB untuk queue dismantle, photo TT, SLA, dan master config'
  )
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes);

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  legacy_customer_id,
  legacy_parent_id,
  legacy_reference_code,
  customer_name,
  customer_address,
  customer_phone,
  marketing_name,
  radbox_name,
  support_status,
  opened_at,
  reason_text,
  note_text,
  actor_name,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'DISMANTLE_QUEUE',
  'DQ-001',
  'CUST-001',
  'ISO-001',
  'DT-SAMPLE-001',
  'Budi Sample',
  'Jl. Contoh No. 1, Pati',
  '081300000001',
  'Rina Marketing',
  'RBX-01',
  'OPEN',
  '2026-07-04 09:00:00',
  'Tunggakan 1 bulan',
  'Pelanggan masuk antrean terminate lapangan',
  'Customer Service',
  '{"id":"DQ-001","sourceIsolationId":"ISO-001","ticketNumber":"DT-SAMPLE-001","fieldNote":"Pelanggan masuk antrean terminate lapangan"}',
  'dq-sample-001',
  'MAPPED',
  'sample dismantle queue untuk uji transform wave 1A'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'DQ-001'
  );

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  legacy_parent_id,
  photo_list_text,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TROUBLE_TICKET_PHOTO',
  'TTP-001',
  'TT-001',
  '["/uploads/sample-tt-001-before.jpg"]',
  '{"id":"TTP-001","ticketId":"TT-001","filePath":"/uploads/sample-tt-001-before.jpg","mimeType":"image/jpeg","sizeBytes":24567}',
  'ttp-sample-001',
  'MAPPED',
  'sample photo detail trouble ticket untuk uji transform wave 1A'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TTP-001'
  );

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  trouble_type,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TROUBLE_TICKET_SLA',
  'SLA-001',
  'KONEKSI',
  '{"id":"SLA-001","type":"KONEKSI","durationDays":3}',
  'sla-sample-001',
  'MAPPED',
  'sample SLA trouble ticket untuk uji transform wave 1A'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'SLA-001'
  );

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  trouble_type,
  note_text,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TROUBLE_TICKET_MASTER',
  'TTM-001',
  'PROBLEM_CATEGORY',
  'MODEM / ADAPTOR',
  '{"id":"TTM-001","kind":"PROBLEM_CATEGORY","value":"MODEM / ADAPTOR"}',
  'ttm-sample-001',
  'MAPPED',
  'sample master support config untuk membuktikan row tetap tertahan di staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TTM-001'
  );

UPDATE staging_import_batches
SET valid_rows = 4,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001';

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
VALUES
  (
    'SAMPLE-WEBPSB-ODP-001',
    'WEB_PSB',
    'PSB_ODP_HEADER',
    'sample-web-psb-odp.json',
    'UPLOADED',
    1,
    0,
    0,
    0,
    'sample header ODP Web PSB untuk uji transform network wave 1A'
  )
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes);

INSERT INTO staging_legacy_network_odp_records (
  batch_id,
  source_system,
  legacy_id,
  odp_code,
  odp_name,
  region_name,
  location_text,
  latitude,
  longitude,
  total_ports,
  active_ports,
  pole_status,
  is_active,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'ODP-001',
  'TRKL/07 - 16',
  'TRKL/07 - 16',
  'Trangkil',
  '-6.6767640, 111.0879242',
  -6.6767640,
  111.0879242,
  8,
  0,
  'n/a',
  1,
  '{"id":"ODP-001","nama_odp":"TRKL/07 - 16","wilayah":"Trangkil","kapasitas":8,"terpakai":0}',
  'odp-sample-001',
  'MAPPED',
  'sample header ODP untuk uji transform network wave 1A'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-ODP-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_network_odp_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'ODP-001'
  );

UPDATE staging_import_batches
SET valid_rows = 1,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001';
