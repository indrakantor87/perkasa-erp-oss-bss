USE erp_isp_review;

SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001';

SELECT legacy_id, customer_name, target_customer_id, target_address_id, import_status
FROM staging_legacy_customer_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;

SELECT legacy_id, legacy_customer_id, order_no, mapped_package_code, target_customer_id, target_order_id, target_subscription_id, target_work_order_id, import_status
FROM staging_legacy_order_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;

SELECT c.id, c.customer_code, c.full_name, c.phone
FROM crm_customers c
JOIN staging_legacy_customer_records sc
  ON sc.target_customer_id = c.id
WHERE sc.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY c.id;

SELECT a.id, a.customer_id, a.label, a.address, a.latitude, a.longitude
FROM crm_customer_addresses a
JOIN staging_legacy_customer_records sc
  ON sc.target_address_id = a.id
WHERE sc.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY a.id;

SELECT o.id, o.customer_id, o.order_no, o.order_type, o.status, o.request_date, o.scheduled_installation_at, o.marketing_name, o.teknisi_name
FROM sales_orders o
JOIN staging_legacy_order_records so
  ON so.target_order_id = o.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY o.id;

SELECT ss.id, ss.customer_id, ss.order_id, ss.service_no, ss.status, ss.activated_at, ss.terminated_at
FROM service_subscriptions ss
JOIN staging_legacy_order_records so
  ON so.target_subscription_id = ss.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY ss.id;

SELECT wo.id, wo.sales_order_id, wo.subscription_id, wo.work_order_no, wo.work_type, wo.status, wo.technician_name, wo.scheduled_at, wo.completed_at
FROM service_work_orders wo
JOIN staging_legacy_order_records so
  ON so.target_work_order_id = wo.id
WHERE so.batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY wo.id;
