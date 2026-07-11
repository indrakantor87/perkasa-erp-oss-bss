-- Jalankan file ini setelah sample dan transform Wave 1A selesai dieksekusi.
-- Tujuan file ini adalah menampilkan hasil review staging dan final table tanpa mengubah data.

USE erp_isp_review;

SELECT 'BATCH_SUPPORT_EXT' AS section_name;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001';

SELECT 'STAGING_SUPPORT_EXT' AS section_name;
SELECT
  id,
  support_type,
  legacy_id,
  legacy_parent_id,
  legacy_reference_code,
  target_isolation_id,
  target_trouble_ticket_id,
  target_dismantle_queue_id,
  target_trouble_ticket_sla_id,
  import_status,
  validation_notes
FROM staging_legacy_support_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
)
ORDER BY id;

SELECT 'FINAL_DISMANTLE_QUEUE' AS section_name;
SELECT
  dq.id,
  dq.isolation_id,
  si.customer_name,
  dq.transfer_note,
  dq.transferred_by_username,
  dq.transferred_at
FROM support_dismantle_queue dq
LEFT JOIN support_isolations si ON si.id = dq.isolation_id
ORDER BY dq.id DESC
LIMIT 10;

SELECT 'FINAL_TROUBLE_TICKET_PHOTOS' AS section_name;
SELECT
  p.id,
  p.trouble_ticket_id,
  tt.ticket_code,
  p.photo_path
FROM support_trouble_ticket_photos p
LEFT JOIN support_trouble_tickets tt ON tt.id = p.trouble_ticket_id
ORDER BY p.id DESC
LIMIT 10;

SELECT 'FINAL_TROUBLE_TICKET_SLA' AS section_name;
SELECT
  id,
  trouble_type,
  duration_days
FROM support_trouble_ticket_sla
ORDER BY id DESC
LIMIT 10;

SELECT 'PENDING_SUPPORT_MASTER_ROWS' AS section_name;
SELECT
  id,
  support_type,
  legacy_id,
  trouble_type,
  note_text,
  import_status,
  validation_notes
FROM staging_legacy_support_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
)
  AND support_type = 'TROUBLE_TICKET_MASTER'
ORDER BY id;

SELECT 'BATCH_ODP_HEADER' AS section_name;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001';

SELECT 'STAGING_ODP_HEADER' AS section_name;
SELECT
  id,
  legacy_id,
  odp_code,
  odp_name,
  region_name,
  total_ports,
  active_ports,
  target_odp_id,
  import_status,
  validation_notes
FROM staging_legacy_network_odp_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001'
)
ORDER BY id;

SELECT 'FINAL_NETWORK_ODP' AS section_name;
SELECT
  id,
  code,
  name,
  total_ports,
  active_ports,
  latitude,
  longitude
FROM network_odp
ORDER BY id DESC
LIMIT 10;
