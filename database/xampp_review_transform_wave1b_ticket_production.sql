-- Jalankan file ini setelah loader JSON production Ticket dimuat ke staging review DB.
-- Transform ini khusus untuk batch production `Ticket split` dari `Web PSB`.

USE erp_isp_review;

SET @ticket_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TICKET-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Dedup customer production berdasarkan normalized_key nama + phone.
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
  CONCAT('PSB-CUST-', LPAD(d.seed_id, 8, '0')),
  d.customer_type,
  d.customer_name,
  d.identity_no,
  d.phone,
  d.email,
  ob.id
FROM (
  SELECT
    MIN(s.id) AS seed_id,
    COALESCE(NULLIF(MAX(TRIM(s.customer_type)), ''), 'HOME') AS customer_type,
    COALESCE(NULLIF(MAX(TRIM(s.customer_name)), ''), CONCAT('Legacy Customer ', MIN(s.id))) AS customer_name,
    NULLIF(MAX(TRIM(s.identity_no)), '') AS identity_no,
    NULLIF(MAX(TRIM(s.phone)), '') AS phone,
    NULLIF(MAX(TRIM(s.email)), '') AS email,
    NULLIF(MAX(TRIM(s.branch_code)), '') AS branch_code,
    COALESCE(NULLIF(MAX(TRIM(s.normalized_key)), ''), CONCAT('LEGACY-TICKET-CUSTOMER-', MIN(s.id))) AS normalized_key
  FROM staging_legacy_customer_records s
  WHERE s.batch_id = @ticket_batch_id
    AND s.import_status IN ('MAPPED', 'VALID')
  GROUP BY COALESCE(NULLIF(TRIM(s.normalized_key), ''), CONCAT('LEGACY-TICKET-CUSTOMER-', s.id))
) d
LEFT JOIN org_branches ob
  ON ob.code = d.branch_code
WHERE NOT EXISTS (
  SELECT 1
  FROM crm_customers c
  WHERE UPPER(TRIM(c.full_name)) = UPPER(TRIM(d.customer_name))
    AND COALESCE(NULLIF(TRIM(c.phone), ''), '#') = COALESCE(NULLIF(TRIM(d.phone), ''), '#')
);

UPDATE staging_legacy_customer_records s
JOIN crm_customers c
  ON UPPER(TRIM(c.full_name)) = UPPER(TRIM(COALESCE(NULLIF(TRIM(s.customer_name), ''), CONCAT('Legacy Customer ', s.id))))
  AND COALESCE(NULLIF(TRIM(c.phone), ''), '#') = COALESCE(NULLIF(TRIM(s.phone), ''), '#')
SET s.target_customer_id = c.id,
    s.import_status = 'IMPORTED',
    s.imported_at = COALESCE(s.imported_at, CURRENT_TIMESTAMP),
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.batch_id = @ticket_batch_id
  AND s.import_status IN ('MAPPED', 'VALID')
  AND s.target_customer_id IS NULL;

-- 2) Buat satu alamat utama per customer bila belum ada.
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
  d.customer_id,
  'Alamat Utama',
  d.address_text,
  d.latitude,
  d.longitude,
  d.maps_url,
  1
FROM (
  SELECT
    MIN(s.id) AS seed_id,
    s.target_customer_id AS customer_id,
    COALESCE(NULLIF(MAX(TRIM(s.address_text)), ''), 'Alamat belum tersedia') AS address_text,
    MAX(s.latitude) AS latitude,
    MAX(s.longitude) AS longitude,
    NULLIF(MAX(TRIM(s.maps_url)), '') AS maps_url
  FROM staging_legacy_customer_records s
  WHERE s.batch_id = @ticket_batch_id
    AND s.import_status = 'IMPORTED'
    AND s.target_customer_id IS NOT NULL
  GROUP BY s.target_customer_id
) d
WHERE NOT EXISTS (
  SELECT 1
  FROM crm_customer_addresses a
  WHERE a.customer_id = d.customer_id
    AND a.is_primary = 1
);

UPDATE staging_legacy_customer_records s
JOIN crm_customer_addresses a
  ON a.customer_id = s.target_customer_id
  AND a.is_primary = 1
SET s.target_address_id = a.id,
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.batch_id = @ticket_batch_id
  AND s.import_status = 'IMPORTED'
  AND s.target_customer_id IS NOT NULL
  AND s.target_address_id IS NULL;

-- 3) Hubungkan order staging ke customer final.
UPDATE staging_legacy_order_records so
JOIN staging_legacy_customer_records sc
  ON sc.batch_id = so.batch_id
  AND sc.source_system = so.source_system
  AND sc.legacy_id = so.legacy_customer_id
SET so.target_customer_id = sc.target_customer_id,
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_customer_id IS NULL
  AND sc.target_customer_id IS NOT NULL;

-- 4) Buat sales order production.
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
  COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('PSB-TICKET-', so.id)),
  'NEW_INSTALL',
  CASE
    WHEN UPPER(TRIM(so.order_status)) IN ('ACTIVE', 'INSTALLED', 'DONE', 'COMPLETED') THEN 'ACTIVE'
    WHEN UPPER(TRIM(so.order_status)) IN ('CANCELLED', 'CANCELED', 'REJECTED') THEN 'CANCELLED'
    ELSE 'REGISTERED'
  END,
  COALESCE(so.request_date, CURRENT_TIMESTAMP),
  COALESCE(so.scheduled_installation_at, so.request_date),
  NULLIF(TRIM(so.marketing_name), ''),
  NULLIF(TRIM(so.teknisi_name), ''),
  so.notes
FROM staging_legacy_order_records so
LEFT JOIN sales_packages sp
  ON sp.code = so.mapped_package_code
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_customer_id IS NOT NULL
  AND so.target_order_id IS NULL
  AND sp.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sales_orders o
    WHERE o.order_no = COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('PSB-TICKET-', so.id))
  );

UPDATE staging_legacy_order_records so
JOIN sales_orders o
  ON o.order_no = COALESCE(NULLIF(TRIM(so.order_no), ''), CONCAT('PSB-TICKET-', so.id))
SET so.target_order_id = o.id,
    so.import_status = 'IMPORTED',
    so.imported_at = COALESCE(so.imported_at, CURRENT_TIMESTAMP),
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_order_id IS NULL;

-- 5) Buat subscription production.
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
  CONCAT('PSB-SVC-', LPAD(so.id, 8, '0')),
  CASE
    WHEN UPPER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(so.raw_payload, '$.status')))) IN ('ACTIVE', 'INSTALLED') THEN 'ACTIVE'
    WHEN UPPER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(so.raw_payload, '$.status')))) IN ('SUSPENDED', 'ISOLIR') THEN 'SUSPENDED'
    WHEN UPPER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(so.raw_payload, '$.status')))) IN ('TERMINATED', 'CANCELLED', 'CANCELED') THEN 'TERMINATED'
    WHEN so.installed_date IS NOT NULL THEN 'ACTIVE'
    ELSE 'PENDING'
  END,
  CASE
    WHEN so.installed_date IS NOT NULL THEN COALESCE(so.installed_date, so.scheduled_installation_at, so.request_date)
    ELSE NULL
  END,
  CASE
    WHEN UPPER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(so.raw_payload, '$.status')))) IN ('TERMINATED', 'CANCELLED', 'CANCELED') THEN COALESCE(so.installed_date, so.request_date)
    ELSE NULL
  END,
  sp.price
FROM staging_legacy_order_records so
LEFT JOIN sales_packages sp
  ON sp.code = so.mapped_package_code
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status = 'IMPORTED'
  AND so.target_customer_id IS NOT NULL
  AND so.target_order_id IS NOT NULL
  AND so.target_subscription_id IS NULL
  AND sp.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM service_subscriptions ss
    WHERE ss.service_no = CONCAT('PSB-SVC-', LPAD(so.id, 8, '0'))
  );

UPDATE staging_legacy_order_records so
JOIN service_subscriptions ss
  ON ss.service_no = CONCAT('PSB-SVC-', LPAD(so.id, 8, '0'))
SET so.target_subscription_id = ss.id,
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status = 'IMPORTED'
  AND so.target_subscription_id IS NULL;

-- 6) Buat work order production.
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
  CONCAT('PSB-WO-', LPAD(so.id, 8, '0')),
  'INSTALLATION',
  CASE
    WHEN so.installed_date IS NOT NULL THEN 'DONE'
    ELSE 'OPEN'
  END,
  NULLIF(TRIM(so.teknisi_name), ''),
  COALESCE(so.scheduled_installation_at, so.request_date),
  COALESCE(so.scheduled_installation_at, so.request_date),
  so.installed_date,
  so.notes
FROM staging_legacy_order_records so
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status = 'IMPORTED'
  AND so.target_order_id IS NOT NULL
  AND so.target_subscription_id IS NOT NULL
  AND so.target_work_order_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM service_work_orders wo
    WHERE wo.work_order_no = CONCAT('PSB-WO-', LPAD(so.id, 8, '0'))
  );

UPDATE staging_legacy_order_records so
JOIN service_work_orders wo
  ON wo.work_order_no = CONCAT('PSB-WO-', LPAD(so.id, 8, '0'))
SET so.target_work_order_id = wo.id,
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.batch_id = @ticket_batch_id
  AND so.import_status = 'IMPORTED'
  AND so.target_work_order_id IS NULL;
