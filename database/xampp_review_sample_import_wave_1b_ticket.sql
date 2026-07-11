-- Jalankan file ini setelah master mapping dan core master seed tersedia.
-- Sample ini khusus untuk menguji adapter `Ticket` legacy ke staging customer dan order.

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
  'SAMPLE-WEBPSB-TICKET-001',
  'WEB_PSB',
  'PSB_TICKET_SPLIT',
  'sample-web-psb-ticket-split.json',
  'UPLOADED',
  4,
  0,
  0,
  0,
  'sample kecil untuk menguji split Ticket production ke customer, address, order, subscription, dan work order'
)
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO staging_legacy_customer_records (
  batch_id,
  source_system,
  legacy_id,
  customer_name,
  customer_type,
  phone,
  email,
  identity_no,
  address_text,
  maps_url,
  latitude,
  longitude,
  marketing_name,
  branch_code,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TICKET-001',
  'Siti Aminah',
  'HOME',
  '081390000001',
  'siti.aminah@perkasa.local',
  NULL,
  'Ds. Margorejo RT 02 RW 01, Pati',
  'https://maps.google.com/?q=-6.7421000,111.0411000',
  -6.7421000,
  111.0411000,
  'Anne',
  'PATI',
  '{"id":"TICKET-001","customerName":"Siti Aminah","phoneNumber":"081390000001","package":"Home 20 Mbps","requestDate":"2026-07-09T08:30:00","installedDate":"2026-07-10T15:10:00","marketingName":"Anne","teknisi":"Teknisi PSB 1","locationMap":"https://maps.google.com/?q=-6.7421000,111.0411000","status":"ACTIVE","statusOrder":"ACTIVE"}',
  'siti aminah|081390000001',
  'MAPPED',
  'sample ticket installed untuk menguji split customer aktif'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_customer_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TICKET-001'
  );

INSERT INTO staging_legacy_customer_records (
  batch_id,
  source_system,
  legacy_id,
  customer_name,
  customer_type,
  phone,
  email,
  identity_no,
  address_text,
  maps_url,
  latitude,
  longitude,
  marketing_name,
  branch_code,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TICKET-002',
  'Ahmad Fauzi',
  'HOME',
  '081390000002',
  NULL,
  NULL,
  'Jl. Raya Trangkil KM 4, Pati',
  'https://maps.google.com/?q=-6.6767640,111.0879242',
  -6.6767640,
  111.0879242,
  'Anne',
  'PATI',
  '{"id":"TICKET-002","customerName":"Ahmad Fauzi","phoneNumber":"081390000002","package":"Home 30 Mbps","requestDate":"2026-07-11T09:15:00","installedDate":null,"marketingName":"Anne","teknisi":"Teknisi PSB 2","locationMap":"https://maps.google.com/?q=-6.6767640,111.0879242","status":"PENDING","statusOrder":"REGISTERED"}',
  'ahmad fauzi|081390000002',
  'MAPPED',
  'sample ticket scheduled untuk menguji split customer pending'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_customer_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TICKET-002'
  );

INSERT INTO staging_legacy_order_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_customer_id,
  legacy_package_name,
  order_no,
  order_type,
  order_status,
  request_date,
  scheduled_installation_at,
  installed_date,
  marketing_name,
  teknisi_name,
  location_map,
  notes,
  raw_payload,
  normalized_key,
  mapped_package_code,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TICKET-001',
  'TICKET-001',
  'Home 20 Mbps',
  'SO-TICKET-001',
  'NEW_INSTALL',
  'ACTIVE',
  '2026-07-09 08:30:00',
  '2026-07-10 10:00:00',
  '2026-07-10 15:10:00',
  'Anne',
  'Teknisi PSB 1',
  'https://maps.google.com/?q=-6.7421000,111.0411000',
  'sample order aktif hasil split Ticket installed',
  '{"id":"TICKET-001","customerName":"Siti Aminah","package":"Home 20 Mbps","requestDate":"2026-07-09T08:30:00","installedDate":"2026-07-10T15:10:00","status":"ACTIVE","statusOrder":"ACTIVE"}',
  'so-ticket-001',
  'HOME-20M',
  'MAPPED',
  'sample ticket aktif diarahkan ke package HOME-20M'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_order_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TICKET-001'
  );

INSERT INTO staging_legacy_order_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_customer_id,
  legacy_package_name,
  order_no,
  order_type,
  order_status,
  request_date,
  scheduled_installation_at,
  installed_date,
  marketing_name,
  teknisi_name,
  location_map,
  notes,
  raw_payload,
  normalized_key,
  mapped_package_code,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TICKET-002',
  'TICKET-002',
  'Home 30 Mbps',
  'SO-TICKET-002',
  'NEW_INSTALL',
  'REGISTERED',
  '2026-07-11 09:15:00',
  '2026-07-12 13:30:00',
  NULL,
  'Anne',
  'Teknisi PSB 2',
  'https://maps.google.com/?q=-6.6767640,111.0879242',
  'sample order pending hasil split Ticket scheduled',
  '{"id":"TICKET-002","customerName":"Ahmad Fauzi","package":"Home 30 Mbps","requestDate":"2026-07-11T09:15:00","installedDate":null,"status":"PENDING","statusOrder":"REGISTERED"}',
  'so-ticket-002',
  'HOME-30M',
  'MAPPED',
  'sample ticket pending diarahkan ke package HOME-30M'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_order_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TICKET-002'
  );

UPDATE staging_import_batches
SET valid_rows = 4,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001';
