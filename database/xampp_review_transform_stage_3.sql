-- Jalankan file ini setelah transform tahap 2.
-- Transform tahap 3 ini fokus pada area operasional lapangan dan support:
-- 1. service work orders
-- 2. support trouble tickets
-- 3. support isolations
-- 4. support dismantle history
--
-- Catatan:
-- billing belum ditransform di tahap ini karena tabel staging khusus billing belum tersedia.

USE erp_isp_review;

-- 1) Transform service work order dari staging order ke service_work_orders
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
  AND so.target_work_order_id IS NULL;

-- 2) Samakan target subscription pada staging support berdasarkan legacy customer
UPDATE staging_legacy_support_records ss
JOIN staging_legacy_order_records so
  ON so.source_system = ss.source_system
  AND so.legacy_customer_id = ss.legacy_customer_id
  AND so.target_subscription_id IS NOT NULL
SET ss.target_subscription_id = so.target_subscription_id,
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.target_subscription_id IS NULL
  AND ss.support_type IN ('TROUBLE_TICKET', 'ISOLATION')
  AND (
    ss.opened_at IS NULL
    OR so.request_date IS NULL
    OR so.request_date <= ss.opened_at
  );

-- 3) Transform trouble ticket ke support_trouble_tickets
INSERT INTO support_trouble_tickets (
  subscription_id,
  ticket_code,
  customer_name,
  customer_user,
  category,
  type,
  status,
  problem_category,
  resolution_action,
  opened_at,
  closed_at,
  notes,
  close_notes
)
SELECT
  ss.target_subscription_id,
  COALESCE(NULLIF(TRIM(ss.ticket_code), ''), CONCAT('TT-', LPAD(ss.id, 6, '0'))),
  COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer'),
  NULLIF(TRIM(ss.customer_user), ''),
  COALESCE(NULLIF(TRIM(ss.category), ''), 'TT'),
  COALESCE(NULLIF(TRIM(ss.trouble_type), ''), 'GENERAL'),
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL THEN 'CLOSED'
    ELSE 'OPEN'
  END,
  NULLIF(TRIM(ss.problem_category), ''),
  NULLIF(TRIM(ss.resolution_action), ''),
  COALESCE(ss.opened_at, CURRENT_TIMESTAMP),
  ss.closed_at,
  ss.reason_text,
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL THEN ss.reason_text
    ELSE NULL
  END
FROM staging_legacy_support_records ss
WHERE ss.support_type = 'TROUBLE_TICKET'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_tickets tt
    WHERE tt.ticket_code = COALESCE(NULLIF(TRIM(ss.ticket_code), ''), CONCAT('TT-', LPAD(ss.id, 6, '0')))
  );

UPDATE staging_legacy_support_records ss
JOIN support_trouble_tickets tt
  ON tt.ticket_code = COALESCE(NULLIF(TRIM(ss.ticket_code), ''), CONCAT('TT-', LPAD(ss.id, 6, '0')))
SET ss.target_trouble_ticket_id = tt.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'TROUBLE_TICKET'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_id IS NULL;

-- 4) Transform photo ticket dari JSON array sederhana ["a","b"] di photo_list_text
INSERT INTO support_trouble_ticket_photos (
  trouble_ticket_id,
  photo_path
)
SELECT
  ss.target_trouble_ticket_id,
  jt.photo_path
FROM staging_legacy_support_records ss
JOIN JSON_TABLE(
  COALESCE(NULLIF(ss.photo_list_text, ''), '[]'),
  '$[*]' COLUMNS (
    photo_path VARCHAR(255) PATH '$'
  )
) jt
WHERE ss.support_type = 'TROUBLE_TICKET'
  AND ss.target_trouble_ticket_id IS NOT NULL
  AND jt.photo_path IS NOT NULL
  AND jt.photo_path <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_ticket_photos p
    WHERE p.trouble_ticket_id = ss.target_trouble_ticket_id
      AND p.photo_path = jt.photo_path
  );

-- 5) Transform isolation ke support_isolations
INSERT INTO support_isolations (
  subscription_id,
  customer_name,
  customer_address,
  customer_phone,
  marketing_name,
  radbox_name,
  package_price,
  isolation_date,
  reason,
  status,
  restoration_date,
  close_note,
  is_archived,
  archived_at
)
SELECT
  ss.target_subscription_id,
  COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer'),
  sc.address_text,
  sc.phone,
  sc.marketing_name,
  NULL,
  NULL,
  COALESCE(ss.opened_at, CURRENT_TIMESTAMP),
  ss.reason_text,
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL THEN 'CLOSED'
    ELSE 'OPEN'
  END,
  ss.closed_at,
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL THEN ss.reason_text
    ELSE NULL
  END,
  0,
  NULL
FROM staging_legacy_support_records ss
LEFT JOIN staging_legacy_customer_records sc
  ON sc.source_system = ss.source_system
  AND sc.legacy_id = ss.legacy_customer_id
WHERE ss.support_type = 'ISOLATION'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_isolation_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_isolations si
    WHERE si.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
      AND si.isolation_date = COALESCE(ss.opened_at, CURRENT_TIMESTAMP)
  );

UPDATE staging_legacy_support_records ss
JOIN support_isolations si
  ON si.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
  AND si.isolation_date = COALESCE(ss.opened_at, CURRENT_TIMESTAMP)
SET ss.target_isolation_id = si.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'ISOLATION'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_isolation_id IS NULL;

-- 6) Transform dismantle history ke support_dismantle_history
INSERT INTO support_dismantle_history (
  isolation_id,
  customer_name,
  customer_address,
  customer_phone,
  marketing_name,
  radbox_name,
  closed_at,
  close_note
)
SELECT
  iso.id,
  COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer'),
  sc.address_text,
  sc.phone,
  sc.marketing_name,
  NULL,
  COALESCE(ss.closed_at, ss.opened_at, CURRENT_TIMESTAMP),
  ss.reason_text
FROM staging_legacy_support_records ss
LEFT JOIN staging_legacy_customer_records sc
  ON sc.source_system = ss.source_system
  AND sc.legacy_id = ss.legacy_customer_id
LEFT JOIN support_isolations iso
  ON iso.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
  AND (
    iso.restoration_date = ss.closed_at
    OR iso.isolation_date = ss.opened_at
  )
WHERE ss.support_type = 'DISMANTLE_HISTORY'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_dismantle_history_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_dismantle_history dh
    WHERE dh.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
      AND dh.closed_at = COALESCE(ss.closed_at, ss.opened_at, CURRENT_TIMESTAMP)
  );

UPDATE staging_legacy_support_records ss
JOIN support_dismantle_history dh
  ON dh.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
  AND dh.closed_at = COALESCE(ss.closed_at, ss.opened_at, CURRENT_TIMESTAMP)
SET ss.target_dismantle_history_id = dh.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'DISMANTLE_HISTORY'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_dismantle_history_id IS NULL;
