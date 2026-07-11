-- Jalankan file ini setelah sample dan transform Wave 1B Ticket selesai dieksekusi.
-- File ini bersifat read-only dan merangkum status PASS / BLOCKED untuk check utama.

USE erp_isp_review;

SELECT
  'batch_ticket_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch Ticket split harus terbentuk' AS detail_text;

SELECT
  'ticket_batch_total_rows_4' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
        AND total_rows = 4
        AND valid_rows = 4
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch Ticket split harus memiliki total_rows=4 dan valid_rows=4' AS detail_text;

SELECT
  'customer_rows_imported' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_customer_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_customer_id IS NOT NULL
        AND target_address_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Dua row staging customer harus terhubung ke customer dan address final' AS detail_text;

SELECT
  'order_rows_imported' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_order_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_customer_id IS NOT NULL
        AND target_order_id IS NOT NULL
        AND target_subscription_id IS NOT NULL
        AND target_work_order_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Dua row staging order harus terhubung ke order, subscription, dan work order final' AS detail_text;

SELECT
  'final_customer_count_2' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM crm_customers c
      WHERE c.customer_code IN ('CUST-000001', 'CUST-000002')
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Tabel final crm_customers harus berisi dua customer hasil split Ticket' AS detail_text;

SELECT
  'final_order_count_2' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_orders o
      WHERE o.order_no IN ('SO-TICKET-001', 'SO-TICKET-002')
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Tabel final sales_orders harus berisi dua order hasil split Ticket' AS detail_text;

SELECT
  'final_subscription_active_pending' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM service_subscriptions ss
      WHERE ss.service_no = 'SVC-000001'
        AND ss.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1
      FROM service_subscriptions ss
      WHERE ss.service_no = 'SVC-000002'
        AND ss.status = 'PENDING'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Subscription sample harus menghasilkan satu ACTIVE dan satu PENDING' AS detail_text;

SELECT
  'final_work_order_done_open' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM service_work_orders wo
      WHERE wo.work_order_no = 'WO-000001'
        AND wo.status = 'DONE'
    )
    AND EXISTS (
      SELECT 1
      FROM service_work_orders wo
      WHERE wo.work_order_no = 'WO-000002'
        AND wo.status = 'OPEN'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Work order sample harus menghasilkan satu DONE dan satu OPEN' AS detail_text;
