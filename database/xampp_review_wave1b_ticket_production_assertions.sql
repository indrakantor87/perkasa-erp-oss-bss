-- Jalankan file ini setelah loader dan transform Wave 1B Ticket production selesai dieksekusi.
-- File ini bersifat read-only dan merangkum status PASS / BLOCKED untuk check utama.

USE erp_isp_review;

SELECT
  'ticket_production_batch_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch Ticket production harus terbentuk' AS detail_text;

SELECT
  'ticket_customer_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_customer_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND import_status = 'IMPORTED'
        AND target_customer_id IS NOT NULL
        AND target_address_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_customer_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row customer Ticket production harus linked ke customer dan address final' AS detail_text;

SELECT
  'ticket_order_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_order_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND import_status = 'IMPORTED'
        AND target_customer_id IS NOT NULL
        AND target_order_id IS NOT NULL
        AND target_subscription_id IS NOT NULL
        AND target_work_order_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_order_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND import_status <> 'INVALID'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row order Ticket production yang valid harus linked ke order, subscription, dan work order final' AS detail_text;

SELECT
  'ticket_invalid_orders_known_exceptions' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_order_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND import_status = 'INVALID'
    ) = 6
    AND (
      SELECT COUNT(*)
      FROM staging_legacy_order_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND import_status = 'INVALID'
        AND COALESCE(NULLIF(TRIM(legacy_package_name), ''), '#') NOT IN ('PAKET CAFÉ', 'PAKET KBB', '-')
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch Ticket production boleh menyisakan tepat 6 row INVALID selama hanya berasal dari paket exception `PAKET CAFÉ`, `PAKET KBB`, dan `-`' AS detail_text;

SELECT
  'ticket_final_order_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_orders o
      JOIN staging_legacy_order_records so
        ON so.target_order_id = o.id
      WHERE so.batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_order_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah sales_orders final harus sama dengan jumlah row order production yang berhasil diimpor' AS detail_text;
