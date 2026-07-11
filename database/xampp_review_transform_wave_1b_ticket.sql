-- Jalankan file ini setelah `xampp_review_sample_import_wave_1b_ticket.sql`.
-- Transform ini khusus untuk batch sample `Ticket split` agar tidak bergantung pada @batch_id manual.

USE erp_isp_review;

SET @ticket_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Transform customer dari staging ke crm_customers
INSERT INTO crm_customers (
  customer_code,
  customer_type,
  full_name,
  identity_no,
  phone,
  email,
  branch_id
)
SELECT
  CONCAT('CUST-', LPAD(s.id, 6, '0')),
  CASE
    WHEN UPPER(TRIM(s.customer_type)) = 'CORPORATE' THEN 'CORPORATE'
    WHEN UPPER(TRIM(s.customer_type)) = 'RESELLER' THEN 'RESELLER'
    ELSE 'HOME'
  END,
  COALESCE(NULLIF(TRIM(s.customer_name), ''), CONCAT('Legacy Customer ', s.id)),
  NULLIF(TRIM(s.identity_no), ''),
  NULLIF(TRIM(s.phone), ''),
  NULLIF(TRIM(s.email), ''),
  ob.id
FROM staging_legacy_customer_records s
LEFT JOIN org_branches ob
  ON ob.code = s.branch_code
WHERE s.import_status IN ('MAPPED', 'VALID')
  AND s.batch_id = @ticket_batch_id
  AND s.target_customer_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM crm_customers c
    WHERE c.customer_code = CONCAT('CUST-', LPAD(s.id, 6, '0'))
  );

UPDATE staging_legacy_customer_records s
JOIN crm_customers c
  ON c.customer_code = CONCAT('CUST-', LPAD(s.id, 6, '0'))
SET s.target_customer_id = c.id,
    s.import_status = 'IMPORTED',
    s.imported_at = COALESCE(s.imported_at, CURRENT_TIMESTAMP),
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.import_status IN ('MAPPED', 'VALID')
  AND s.batch_id = @ticket_batch_id
  AND s.target_customer_id IS NULL;

-- 2) Transform alamat utama
INSERT INTO crm_customer_addresses (
  customer_id,
  label,
  address,
  latitude,
  longitude,
  maps_url,
  is_primary
)
SELECT
  s.target_customer_id,
  'Alamat Utama',
  COALESCE(NULLIF(TRIM(s.address_text), ''), 'Alamat belum tersedia'),
  s.latitude,
  s.longitude,
  NULLIF(TRIM(s.maps_url), ''),
  1
FROM staging_legacy_customer_records s
WHERE s.import_status = 'IMPORTED'
  AND s.batch_id = @ticket_batch_id
  AND s.target_customer_id IS NOT NULL
  AND s.target_address_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM crm_customer_addresses a
    WHERE a.customer_id = s.target_customer_id
      AND a.is_primary = 1
  );

UPDATE staging_legacy_customer_records s
JOIN crm_customer_addresses a
  ON a.customer_id = s.target_customer_id
  AND a.is_primary = 1
SET s.target_address_id = a.id,
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.import_status = 'IMPORTED'
  AND s.batch_id = @ticket_batch_id
  AND s.target_customer_id IS NOT NULL
  AND s.target_address_id IS NULL;

-- 3) Hubungkan order staging ke customer final
UPDATE staging_legacy_order_records so
JOIN staging_legacy_customer_records sc
  ON sc.source_system = so.source_system
  AND sc.legacy_id = so.legacy_customer_id
  AND sc.batch_id = so.batch_id
SET so.target_customer_id = sc.target_customer_id,
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.target_customer_id IS NULL
  AND so.batch_id = @ticket_batch_id
  AND sc.target_customer_id IS NOT NULL;

-- 4) Transform sales order
INSERT INTO sales_orders (
  lead_id,
  customer_id,
  package_id,
  order_no,
  order_type,
  status,
  request_date,
  scheduled_installation_at,
  marketing_name,
  teknisi_name,
  notes
)
SELECT
  NULL,
  so.target_customer_id,
  sp.id,
  COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('SO-LEGACY-', so.id)),
  CASE
    WHEN UPPER(TRIM(so.order_type)) = 'UPGRADE' THEN 'UPGRADE'
    WHEN UPPER(TRIM(so.order_type)) = 'DOWNGRADE' THEN 'DOWNGRADE'
    WHEN UPPER(TRIM(so.order_type)) = 'RELOCATION' THEN 'RELOCATION'
    WHEN UPPER(TRIM(so.order_type)) = 'TERMINATION' THEN 'TERMINATION'
    ELSE 'NEW_INSTALL'
  END,
  COALESCE(NULLIF(TRIM(so.order_status), ''), 'REGISTERED'),
  COALESCE(so.request_date, CURRENT_TIMESTAMP),
  so.scheduled_installation_at,
  NULLIF(TRIM(so.marketing_name), ''),
  NULLIF(TRIM(so.teknisi_name), ''),
  so.notes
FROM staging_legacy_order_records so
LEFT JOIN sales_packages sp
  ON sp.code = so.mapped_package_code
WHERE so.import_status IN ('MAPPED', 'VALID')
  AND so.batch_id = @ticket_batch_id
  AND so.target_order_id IS NULL
  AND so.target_customer_id IS NOT NULL
  AND sp.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sales_orders o
    WHERE o.order_no = COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('SO-LEGACY-', so.id))
  );

UPDATE staging_legacy_order_records so
JOIN sales_orders o
  ON o.order_no = COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('SO-LEGACY-', so.id))
SET so.target_order_id = o.id,
    so.import_status = 'IMPORTED',
    so.imported_at = COALESCE(so.imported_at, CURRENT_TIMESTAMP),
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.import_status IN ('MAPPED', 'VALID')
  AND so.batch_id = @ticket_batch_id
  AND so.target_order_id IS NULL;

-- 5) Transform subscription
INSERT INTO service_subscriptions (
  customer_id,
  order_id,
  package_id,
  service_no,
  status,
  activated_at,
  terminated_at,
  monthly_price
)
SELECT
  so.target_customer_id,
  so.target_order_id,
  sp.id,
  CONCAT('SVC-', LPAD(so.id, 6, '0')),
  CASE
    WHEN UPPER(TRIM(so.order_status)) = 'ACTIVE' THEN 'ACTIVE'
    WHEN UPPER(TRIM(so.order_status)) = 'TERMINATED' THEN 'TERMINATED'
    WHEN UPPER(TRIM(so.order_status)) = 'SUSPENDED' THEN 'SUSPENDED'
    ELSE 'PENDING'
  END,
  CASE
    WHEN UPPER(TRIM(so.order_status)) = 'ACTIVE' THEN COALESCE(so.installed_date, so.scheduled_installation_at, so.request_date)
    ELSE NULL
  END,
  CASE
    WHEN UPPER(TRIM(so.order_status)) = 'TERMINATED' THEN COALESCE(so.installed_date, so.request_date)
    ELSE NULL
  END,
  sp.price
FROM staging_legacy_order_records so
LEFT JOIN sales_packages sp
  ON sp.code = so.mapped_package_code
WHERE so.import_status = 'IMPORTED'
  AND so.batch_id = @ticket_batch_id
  AND so.target_subscription_id IS NULL
  AND so.target_customer_id IS NOT NULL
  AND so.target_order_id IS NOT NULL
  AND sp.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM service_subscriptions ss
    WHERE ss.service_no = CONCAT('SVC-', LPAD(so.id, 6, '0'))
  );

UPDATE staging_legacy_order_records so
JOIN service_subscriptions ss
  ON ss.service_no = CONCAT('SVC-', LPAD(so.id, 6, '0'))
SET so.target_subscription_id = ss.id,
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.import_status = 'IMPORTED'
  AND so.batch_id = @ticket_batch_id
  AND so.target_subscription_id IS NULL;

-- 6) Transform work order
INSERT INTO service_work_orders (
  sales_order_id,
  subscription_id,
  work_order_no,
  work_type,
  status,
  technician_name,
  scheduled_at,
  started_at,
  completed_at,
  notes
)
SELECT
  so.target_order_id,
  so.target_subscription_id,
  CONCAT('WO-', LPAD(so.id, 6, '0')),
  CASE
    WHEN UPPER(TRIM(so.order_type)) = 'RELOCATION' THEN 'RELOCATION'
    WHEN UPPER(TRIM(so.order_type)) = 'TERMINATION' THEN 'DISMANTLE'
    ELSE 'INSTALLATION'
  END,
  CASE
    WHEN so.installed_date IS NOT NULL THEN 'DONE'
    WHEN so.scheduled_installation_at IS NOT NULL THEN 'OPEN'
    ELSE 'OPEN'
  END,
  NULLIF(TRIM(so.teknisi_name), ''),
  so.scheduled_installation_at,
  so.scheduled_installation_at,
  so.installed_date,
  so.notes
FROM staging_legacy_order_records so
WHERE so.import_status = 'IMPORTED'
  AND so.batch_id = @ticket_batch_id
  AND so.target_order_id IS NOT NULL
  AND so.target_work_order_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM service_work_orders wo
    WHERE wo.work_order_no = CONCAT('WO-', LPAD(so.id, 6, '0'))
  );

UPDATE staging_legacy_order_records so
JOIN service_work_orders wo
  ON wo.work_order_no = CONCAT('WO-', LPAD(so.id, 6, '0'))
SET so.target_work_order_id = wo.id,
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.import_status = 'IMPORTED'
  AND so.batch_id = @ticket_batch_id
  AND so.target_work_order_id IS NULL;
