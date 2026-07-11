USE erp_isp_review;

SELECT 'Batch Wave 1B Ticket Production' AS review_section;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows, invalid_rows
FROM staging_import_batches
WHERE batch_code = 'PROD-WEBPSB-TICKET-001';

SELECT 'Staging Customer Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(target_customer_id IS NOT NULL) AS linked_customer_rows,
       SUM(target_address_id IS NOT NULL) AS linked_address_rows
FROM staging_legacy_customer_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Staging Order Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(import_status = 'INVALID') AS invalid_rows,
       SUM(target_order_id IS NOT NULL) AS linked_order_rows,
       SUM(target_subscription_id IS NOT NULL) AS linked_subscription_rows,
       SUM(target_work_order_id IS NOT NULL) AS linked_work_order_rows
FROM staging_legacy_order_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Final Customers Production Sample' AS review_section;
SELECT c.id, c.customer_code, c.full_name, c.phone
FROM crm_customers c
JOIN staging_legacy_customer_records sc
  ON sc.target_customer_id = c.id
WHERE sc.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY c.id
LIMIT 15;

SELECT 'Final Orders Production Sample' AS review_section;
SELECT o.id, o.customer_id, o.order_no, o.status, o.request_date, o.scheduled_installation_at, o.marketing_name, o.teknisi_name
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
ORDER BY o.id
LIMIT 15;

SELECT 'Final Subscription Status Summary' AS review_section;
SELECT ss.status, COUNT(*) AS total_rows
FROM service_subscriptions ss
JOIN staging_legacy_order_records so
  ON so.target_subscription_id = ss.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
GROUP BY ss.status
ORDER BY ss.status;

SELECT 'Final Work Order Status Summary' AS review_section;
SELECT wo.status, COUNT(*) AS total_rows
FROM service_work_orders wo
JOIN staging_legacy_order_records so
  ON so.target_work_order_id = wo.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
GROUP BY wo.status
ORDER BY wo.status;
