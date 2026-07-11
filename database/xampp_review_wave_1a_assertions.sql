-- Jalankan file ini setelah sample dan transform Wave 1A selesai dieksekusi.
-- File ini bersifat read-only dan merangkum status PASS / BLOCKED untuk check utama.

USE erp_isp_review;

SELECT
  'batch_support_ext_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch support extension harus terbentuk' AS detail_text;

SELECT
  'support_ext_total_rows_4' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
        AND total_rows = 4
        AND valid_rows = 4
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch support extension harus memiliki total_rows=4 dan valid_rows=4' AS detail_text;

SELECT
  'dismantle_queue_target_linked' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_support_records
      WHERE batch_id = (
        SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
      )
        AND support_type = 'DISMANTLE_QUEUE'
        AND target_isolation_id IS NOT NULL
        AND target_dismantle_queue_id IS NOT NULL
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Row DISMANTLE_QUEUE harus terhubung ke isolation dan queue final' AS detail_text;

SELECT
  'tt_photo_target_linked' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_support_records
      WHERE batch_id = (
        SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
      )
        AND support_type = 'TROUBLE_TICKET_PHOTO'
        AND target_trouble_ticket_id IS NOT NULL
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Row TROUBLE_TICKET_PHOTO harus terhubung ke trouble ticket final' AS detail_text;

SELECT
  'tt_sla_target_linked' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_support_records
      WHERE batch_id = (
        SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
      )
        AND support_type = 'TROUBLE_TICKET_SLA'
        AND target_trouble_ticket_sla_id IS NOT NULL
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Row TROUBLE_TICKET_SLA harus terhubung ke SLA final' AS detail_text;

SELECT
  'tt_master_remains_pending' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_support_records
      WHERE batch_id = (
        SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
      )
        AND support_type = 'TROUBLE_TICKET_MASTER'
        AND validation_notes LIKE '%Menunggu tabel final master support config%'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Row TROUBLE_TICKET_MASTER tetap pending dengan catatan yang benar' AS detail_text;

SELECT
  'final_dismantle_queue_row_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM support_dismantle_queue dq
      WHERE dq.transferred_by_username IN ('Customer Service', 'legacy-import')
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Tabel final support_dismantle_queue harus berisi row sample atau hasil import terkait' AS detail_text;

SELECT
  'final_tt_photo_row_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM support_trouble_ticket_photos
      WHERE photo_path = '/uploads/sample-tt-001-before.jpg'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Tabel final support_trouble_ticket_photos harus berisi path sample foto TT' AS detail_text;

SELECT
  'final_tt_sla_row_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM support_trouble_ticket_sla
      WHERE trouble_type = 'KONEKSI'
        AND duration_days = 3
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Tabel final support_trouble_ticket_sla harus berisi SLA sample KONEKSI 3 hari' AS detail_text;

SELECT
  'batch_odp_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch ODP header harus terbentuk' AS detail_text;

SELECT
  'odp_target_linked' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_network_odp_records
      WHERE batch_id = (
        SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001'
      )
        AND target_odp_id IS NOT NULL
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Row staging ODP harus terhubung ke network_odp final' AS detail_text;

SELECT
  'final_network_odp_row_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM network_odp
      WHERE code = 'TRKL/07 - 16'
        AND total_ports = 8
        AND active_ports = 0
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Tabel final network_odp harus berisi header ODP sample TRKL/07 - 16' AS detail_text;
