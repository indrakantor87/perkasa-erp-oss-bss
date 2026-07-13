-- Audit read-only untuk rerun tahap 2 batch Wave 1B Ticket production.
-- File ini aman dipakai langsung di phpMyAdmin tab SQL atau client MySQL.
-- Jalankan saat database aktif sudah mengarah ke `erp_isp_review`.

SET @ticket_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'latest_batch' AS audit_section;
SELECT id, batch_code, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows, updated_at
FROM staging_import_batches
WHERE id = @ticket_batch_id;

SELECT 'batch_invalid_rows' AS audit_section;
SELECT
  'order' AS source_table,
  id,
  legacy_id,
  legacy_customer_id,
  legacy_package_name,
  mapped_package_code,
  order_no,
  normalized_key,
  import_status,
  validation_notes
FROM staging_legacy_order_records
WHERE batch_id = @ticket_batch_id
  AND import_status = 'INVALID'
ORDER BY id ASC;

SELECT 'same_batch_code_history' AS audit_section;
SELECT id, batch_code, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows, created_at, updated_at
FROM staging_import_batches
WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
ORDER BY id DESC;

SELECT 'customer_target_collisions_in_batch' AS audit_section;
SELECT
  COALESCE(NULLIF(TRIM(normalized_key), ''), CONCAT('cust:', COALESCE(NULLIF(TRIM(legacy_id), ''), id))) AS business_key,
  COUNT(*) AS staging_rows,
  COUNT(DISTINCT target_customer_id) AS distinct_target_customers,
  GROUP_CONCAT(DISTINCT target_customer_id ORDER BY target_customer_id SEPARATOR ', ') AS target_customer_ids,
  GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(customer_name), ''), '-') ORDER BY customer_name SEPARATOR ' | ') AS customer_names,
  GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(phone), ''), '-') ORDER BY phone SEPARATOR ' | ') AS phones
FROM staging_legacy_customer_records
WHERE batch_id = @ticket_batch_id
  AND target_customer_id IS NOT NULL
GROUP BY COALESCE(NULLIF(TRIM(normalized_key), ''), CONCAT('cust:', COALESCE(NULLIF(TRIM(legacy_id), ''), id)))
HAVING COUNT(DISTINCT target_customer_id) > 1
ORDER BY staging_rows DESC, business_key ASC;

SELECT 'order_target_collisions_in_batch' AS audit_section;
SELECT
  COALESCE(NULLIF(TRIM(legacy_id), ''), COALESCE(NULLIF(TRIM(order_no), ''), CONCAT('order-staging:', id))) AS business_key,
  COUNT(*) AS staging_rows,
  COUNT(DISTINCT target_order_id) AS distinct_target_orders,
  COUNT(DISTINCT target_subscription_id) AS distinct_target_subscriptions,
  COUNT(DISTINCT target_work_order_id) AS distinct_target_work_orders,
  GROUP_CONCAT(DISTINCT target_order_id ORDER BY target_order_id SEPARATOR ', ') AS target_order_ids,
  GROUP_CONCAT(DISTINCT target_subscription_id ORDER BY target_subscription_id SEPARATOR ', ') AS target_subscription_ids,
  GROUP_CONCAT(DISTINCT target_work_order_id ORDER BY target_work_order_id SEPARATOR ', ') AS target_work_order_ids,
  GROUP_CONCAT(DISTINCT COALESCE(NULLIF(TRIM(order_no), ''), '-') ORDER BY order_no SEPARATOR ' | ') AS order_nos
FROM staging_legacy_order_records
WHERE batch_id = @ticket_batch_id
  AND (
    target_order_id IS NOT NULL
    OR target_subscription_id IS NOT NULL
    OR target_work_order_id IS NOT NULL
  )
GROUP BY COALESCE(NULLIF(TRIM(legacy_id), ''), COALESCE(NULLIF(TRIM(order_no), ''), CONCAT('order-staging:', id)))
HAVING COUNT(DISTINCT target_order_id) > 1
  OR COUNT(DISTINCT target_subscription_id) > 1
  OR COUNT(DISTINCT target_work_order_id) > 1
ORDER BY staging_rows DESC, business_key ASC;

SELECT 'duplicate_final_customers_linked_to_batch' AS audit_section;
SELECT
  UPPER(TRIM(COALESCE(NULLIF(sc.customer_name, ''), c.full_name))) AS normalized_name,
  COALESCE(NULLIF(TRIM(sc.phone), ''), '#') AS normalized_phone,
  COUNT(DISTINCT c.id) AS final_customer_count,
  GROUP_CONCAT(DISTINCT c.id ORDER BY c.id SEPARATOR ', ') AS final_customer_ids,
  GROUP_CONCAT(DISTINCT c.customer_code ORDER BY c.customer_code SEPARATOR ', ') AS customer_codes
FROM staging_legacy_customer_records sc
JOIN crm_customers c
  ON c.id = sc.target_customer_id
WHERE sc.batch_id = @ticket_batch_id
  AND sc.target_customer_id IS NOT NULL
GROUP BY UPPER(TRIM(COALESCE(NULLIF(sc.customer_name, ''), c.full_name))), COALESCE(NULLIF(TRIM(sc.phone), ''), '#')
HAVING COUNT(DISTINCT c.id) > 1
ORDER BY final_customer_count DESC, normalized_name ASC;

SELECT 'duplicate_final_orders_linked_to_batch' AS audit_section;
SELECT
  COALESCE(NULLIF(TRIM(so.legacy_id), ''), COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('order-staging:', so.id))) AS business_key,
  COUNT(DISTINCT o.id) AS final_order_count,
  GROUP_CONCAT(DISTINCT o.id ORDER BY o.id SEPARATOR ', ') AS final_order_ids,
  GROUP_CONCAT(DISTINCT o.order_no ORDER BY o.order_no SEPARATOR ', ') AS order_nos
FROM staging_legacy_order_records so
JOIN sales_orders o
  ON o.id = so.target_order_id
WHERE so.batch_id = @ticket_batch_id
  AND so.target_order_id IS NOT NULL
GROUP BY COALESCE(NULLIF(TRIM(so.legacy_id), ''), COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('order-staging:', so.id)))
HAVING COUNT(DISTINCT o.id) > 1
ORDER BY final_order_count DESC, business_key ASC;

SELECT 'duplicate_final_subscriptions_linked_to_batch' AS audit_section;
SELECT
  COALESCE(NULLIF(TRIM(so.legacy_id), ''), CONCAT('sub-staging:', so.id)) AS business_key,
  COUNT(DISTINCT ss.id) AS final_subscription_count,
  GROUP_CONCAT(DISTINCT ss.id ORDER BY ss.id SEPARATOR ', ') AS final_subscription_ids,
  GROUP_CONCAT(DISTINCT ss.service_no ORDER BY ss.service_no SEPARATOR ', ') AS service_nos
FROM staging_legacy_order_records so
JOIN service_subscriptions ss
  ON ss.id = so.target_subscription_id
WHERE so.batch_id = @ticket_batch_id
  AND so.target_subscription_id IS NOT NULL
GROUP BY COALESCE(NULLIF(TRIM(so.legacy_id), ''), CONCAT('sub-staging:', so.id))
HAVING COUNT(DISTINCT ss.id) > 1
ORDER BY final_subscription_count DESC, business_key ASC;

SELECT 'duplicate_final_work_orders_linked_to_batch' AS audit_section;
SELECT
  COALESCE(NULLIF(TRIM(so.legacy_id), ''), CONCAT('wo-staging:', so.id)) AS business_key,
  COUNT(DISTINCT wo.id) AS final_work_order_count,
  GROUP_CONCAT(DISTINCT wo.id ORDER BY wo.id SEPARATOR ', ') AS final_work_order_ids,
  GROUP_CONCAT(DISTINCT wo.work_order_no ORDER BY wo.work_order_no SEPARATOR ', ') AS work_order_nos
FROM staging_legacy_order_records so
JOIN service_work_orders wo
  ON wo.id = so.target_work_order_id
WHERE so.batch_id = @ticket_batch_id
  AND so.target_work_order_id IS NOT NULL
GROUP BY COALESCE(NULLIF(TRIM(so.legacy_id), ''), CONCAT('wo-staging:', so.id))
HAVING COUNT(DISTINCT wo.id) > 1
ORDER BY final_work_order_count DESC, business_key ASC;

SELECT 'known_invalid_package_exceptions' AS audit_section;
SELECT
  COALESCE(NULLIF(TRIM(legacy_package_name), ''), '#') AS legacy_package_name,
  COUNT(*) AS invalid_rows,
  GROUP_CONCAT(legacy_id ORDER BY legacy_id SEPARATOR ', ') AS legacy_ids
FROM staging_legacy_order_records
WHERE batch_id = @ticket_batch_id
  AND import_status = 'INVALID'
GROUP BY COALESCE(NULLIF(TRIM(legacy_package_name), ''), '#')
ORDER BY invalid_rows DESC, legacy_package_name ASC;

SELECT 'downstream_reference_counts_for_batch_targets' AS audit_section;
SELECT
  (SELECT COUNT(*)
   FROM support_trouble_tickets tt
   WHERE tt.subscription_id IN (
     SELECT DISTINCT target_subscription_id
     FROM staging_legacy_order_records
     WHERE batch_id = @ticket_batch_id
       AND target_subscription_id IS NOT NULL
   )) AS support_trouble_ticket_refs,
  (SELECT COUNT(*)
   FROM support_isolations si
   WHERE si.subscription_id IN (
     SELECT DISTINCT target_subscription_id
     FROM staging_legacy_order_records
     WHERE batch_id = @ticket_batch_id
       AND target_subscription_id IS NOT NULL
   )) AS support_isolation_refs,
  (SELECT COUNT(*)
   FROM support_dismantle_history dh
   JOIN support_isolations si
     ON si.id = dh.isolation_id
   WHERE si.subscription_id IN (
     SELECT DISTINCT target_subscription_id
     FROM staging_legacy_order_records
     WHERE batch_id = @ticket_batch_id
       AND target_subscription_id IS NOT NULL
   )) AS support_dismantle_refs,
  (SELECT COUNT(*)
   FROM billing_invoices bi
   WHERE bi.subscription_id IN (
     SELECT DISTINCT target_subscription_id
     FROM staging_legacy_order_records
     WHERE batch_id = @ticket_batch_id
       AND target_subscription_id IS NOT NULL
   )) AS billing_invoice_refs,
  (SELECT COUNT(*)
   FROM network_odp_ports nop
   WHERE nop.subscription_id IN (
     SELECT DISTINCT target_subscription_id
     FROM staging_legacy_order_records
     WHERE batch_id = @ticket_batch_id
       AND target_subscription_id IS NOT NULL
   )) AS odp_port_refs,
  (SELECT COUNT(*)
   FROM service_device_assignments sda
   WHERE sda.subscription_id IN (
     SELECT DISTINCT target_subscription_id
     FROM staging_legacy_order_records
     WHERE batch_id = @ticket_batch_id
       AND target_subscription_id IS NOT NULL
   )) AS device_assignment_refs;

SELECT 'audit_summary' AS audit_section;
SELECT
  CASE
    WHEN @ticket_batch_id IS NULL THEN 'batch_not_found'
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_order_records so
      WHERE so.batch_id = @ticket_batch_id
        AND so.import_status = 'INVALID'
        AND COALESCE(NULLIF(TRIM(so.legacy_package_name), ''), '#') NOT IN ('PAKET CAFÉ', 'PAKET CAF??', 'PAKET KBB', '-', '#')
    ) THEN 'needs_manual_review'
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_order_records so
      WHERE so.batch_id = @ticket_batch_id
        AND (
          so.target_order_id IS NOT NULL
          OR so.target_subscription_id IS NOT NULL
          OR so.target_work_order_id IS NOT NULL
        )
      GROUP BY COALESCE(NULLIF(TRIM(so.legacy_id), ''), COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('order-staging:', so.id)))
      HAVING COUNT(DISTINCT so.target_order_id) > 1
        OR COUNT(DISTINCT so.target_subscription_id) > 1
        OR COUNT(DISTINCT so.target_work_order_id) > 1
    ) THEN 'possible_collision'
    ELSE 'audit_ok'
  END AS audit_status,
  CASE
    WHEN @ticket_batch_id IS NULL THEN 'Batch PROD-WEBPSB-TICKET-001 tidak ditemukan pada staging_import_batches.'
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_order_records so
      WHERE so.batch_id = @ticket_batch_id
        AND so.import_status = 'INVALID'
        AND COALESCE(NULLIF(TRIM(so.legacy_package_name), ''), '#') NOT IN ('PAKET CAFÉ', 'PAKET CAF??', 'PAKET KBB', '-', '#')
    ) THEN 'Ada row INVALID di luar daftar exception paket yang sudah diketahui. Perlu review manual sebelum menyimpulkan batch aman.'
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_order_records so
      WHERE so.batch_id = @ticket_batch_id
        AND (
          so.target_order_id IS NOT NULL
          OR so.target_subscription_id IS NOT NULL
          OR so.target_work_order_id IS NOT NULL
        )
      GROUP BY COALESCE(NULLIF(TRIM(so.legacy_id), ''), COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('order-staging:', so.id)))
      HAVING COUNT(DISTINCT so.target_order_id) > 1
        OR COUNT(DISTINCT so.target_subscription_id) > 1
        OR COUNT(DISTINCT so.target_work_order_id) > 1
    ) THEN 'Ada indikasi collision target pada staging order. Lanjutkan baca section collision dan downstream reference sebelum cleanup.'
    ELSE 'Tidak ada collision target yang terlihat dan invalid tersisa hanya exception paket yang sudah diketahui. Batch cenderung aman tanpa cleanup final.'
  END AS audit_message;
