-- Jalankan file ini setelah schema review, staging import, dan master mapping.
-- File ini hanya contoh sample batch kecil untuk menguji alur staging dan mapping, bukan data produksi.

USE erp_isp_review;

INSERT INTO staging_import_batches (
  batch_code,
  source_system,
  import_scope,
  source_file_name,
  import_status,
  total_rows,
  valid_rows,
  invalid_rows,
  duplicate_rows,
  notes
)
VALUES
  (
    'SAMPLE-WEBPSB-USER-001',
    'WEB_PSB',
    'USER_AND_ORDER_SAMPLE',
    'sample-web-psb-user-order.csv',
    'UPLOADED',
    6,
    0,
    0,
    0,
    'sample kecil untuk uji mapping role/division/package, order, dan support staging'
  )
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes);

INSERT INTO staging_legacy_user_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_role,
  legacy_division,
  full_name,
  username,
  email,
  phone,
  employee_legacy_id,
  raw_payload,
  normalized_key,
  mapped_role_code,
  mapped_division_code,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'USR-001',
  'admin_cs',
  'ADM CS',
  'Admin CS Sample',
  'admincs.sample',
  'admincs.sample@perkasa.local',
  '081200000001',
  NULL,
  '{"id":"USR-001","role":"admin_cs","division":"ADM CS","name":"Admin CS Sample"}',
  'admincs.sample',
  'ADMIN_CS',
  'CS',
  'MAPPED',
  'sample role dan division sudah dinormalisasi'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-USER-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_user_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'USR-001'
  );

INSERT INTO staging_legacy_customer_records (
  batch_id,
  source_system,
  legacy_id,
  customer_name,
  customer_type,
  phone,
  email,
  identity_no,
  address_text,
  maps_url,
  latitude,
  longitude,
  marketing_name,
  branch_code,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'CUST-001',
  'Budi Sample',
  'HOME',
  '081300000001',
  'budi.sample@perkasa.local',
  '3318XXXXXXXXXXXX',
  'Jl. Contoh No. 1, Pati',
  'https://maps.google.com/?q=-6.75,111.03',
  -6.7500000,
  111.0300000,
  'Rina Marketing',
  'PATI',
  '{"id":"CUST-001","name":"Budi Sample","phone":"081300000001","branch":"PATI"}',
  'budi sample|081300000001',
  'MAPPED',
  'sample customer home untuk uji customer dan address staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-USER-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_customer_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'CUST-001'
  );

INSERT INTO staging_legacy_order_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_customer_id,
  legacy_package_name,
  order_no,
  order_type,
  order_status,
  request_date,
  scheduled_installation_at,
  installed_date,
  marketing_name,
  teknisi_name,
  location_map,
  notes,
  raw_payload,
  normalized_key,
  mapped_package_code,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'ORD-001',
  'CUST-001',
  'Home 20 Mbps',
  'SO-SAMPLE-001',
  'NEW_INSTALL',
  'REGISTERED',
  '2026-07-01 09:00:00',
  '2026-07-02 13:00:00',
  NULL,
  'Rina Marketing',
  'Teknisi A',
  'https://maps.google.com/?q=-6.75,111.03',
  'sample order baru untuk uji package mapping',
  '{"id":"ORD-001","customerId":"CUST-001","package":"Home 20 Mbps","status":"REGISTERED"}',
  'so-sample-001',
  'HOME-20M',
  'MAPPED',
  'sample order sudah diarahkan ke package master'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-USER-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_order_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'ORD-001'
  );

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  legacy_customer_id,
  ticket_code,
  customer_name,
  customer_user,
  category,
  trouble_type,
  support_status,
  opened_at,
  closed_at,
  reason_text,
  problem_category,
  resolution_action,
  photo_list_text,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'TROUBLE_TICKET',
  'TT-001',
  'CUST-001',
  'TT-SAMPLE-001',
  'Budi Sample',
  'budi.sample',
  'TT',
  'KONEKSI',
  'OPEN',
  '2026-07-03 10:15:00',
  NULL,
  NULL,
  'NO INTERNET',
  NULL,
  '[]',
  '{"id":"TT-001","customerId":"CUST-001","status":"OPEN","type":"KONEKSI"}',
  'tt-sample-001',
  'MAPPED',
  'sample trouble ticket open untuk uji support staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-USER-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'TT-001'
  );

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  legacy_customer_id,
  ticket_code,
  customer_name,
  customer_user,
  category,
  trouble_type,
  support_status,
  opened_at,
  closed_at,
  reason_text,
  problem_category,
  resolution_action,
  photo_list_text,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'ISOLATION',
  'ISO-001',
  'CUST-001',
  NULL,
  'Budi Sample',
  'budi.sample',
  NULL,
  NULL,
  'OPEN',
  '2026-07-04 09:00:00',
  NULL,
  'Tunggakan 1 bulan',
  NULL,
  NULL,
  '[]',
  '{"id":"ISO-001","customerId":"CUST-001","status":"OPEN","reason":"Tunggakan 1 bulan"}',
  'iso-sample-001',
  'MAPPED',
  'sample isolation open untuk uji support staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-USER-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'ISO-001'
  );

INSERT INTO staging_legacy_support_records (
  batch_id,
  source_system,
  support_type,
  legacy_id,
  legacy_customer_id,
  ticket_code,
  customer_name,
  customer_user,
  category,
  trouble_type,
  support_status,
  opened_at,
  closed_at,
  reason_text,
  problem_category,
  resolution_action,
  photo_list_text,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'DISMANTLE_HISTORY',
  'DH-001',
  'CUST-001',
  NULL,
  'Budi Sample',
  'budi.sample',
  NULL,
  NULL,
  'CLOSED',
  '2026-06-20 08:00:00',
  '2026-06-20 16:30:00',
  'Pelanggan berhenti berlangganan',
  NULL,
  NULL,
  '[]',
  '{"id":"DH-001","customerId":"CUST-001","status":"CLOSED","reason":"Pelanggan berhenti berlangganan"}',
  'dh-sample-001',
  'MAPPED',
  'sample dismantle history untuk uji histori support staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-USER-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_support_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'DH-001'
  );

UPDATE staging_import_batches
SET valid_rows = 6,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-USER-001';

INSERT INTO staging_import_batches (
  batch_code,
  source_system,
  import_scope,
  source_file_name,
  import_status,
  total_rows,
  valid_rows,
  invalid_rows,
  duplicate_rows,
  notes
)
VALUES
  (
    'SAMPLE-WEBPSB-BILLING-001',
    'WEB_PSB',
    'BILLING_SAMPLE',
    'sample-web-psb-billing.csv',
    'UPLOADED',
    4,
    0,
    0,
    0,
    'sample kecil untuk uji invoice, item, payment, dan collection staging'
  )
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes);

INSERT INTO staging_legacy_billing_invoice_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_customer_id,
  legacy_subscription_ref,
  invoice_no,
  invoice_type,
  billing_month,
  billing_year,
  period_start,
  period_end,
  issue_date,
  due_date,
  subtotal,
  penalty_amount,
  discount_amount,
  total_amount,
  paid_amount,
  invoice_status,
  collection_status,
  suspend_candidate,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'INV-001',
  'CUST-001',
  'ORD-001',
  'INV-SAMPLE-001',
  'RECURRING',
  7,
  2026,
  '2026-07-01',
  '2026-07-31',
  '2026-07-01',
  '2026-07-10',
  350000,
  0,
  0,
  350000,
  250000,
  'PARTIAL',
  'REMINDER',
  0,
  'sample invoice recurring untuk uji billing staging',
  '{"id":"INV-001","customerId":"CUST-001","invoiceNo":"INV-SAMPLE-001","status":"PARTIAL"}',
  'inv-sample-001',
  'MAPPED',
  'sample invoice diarahkan ke subscription hasil transform order'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-BILLING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_billing_invoice_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'INV-001'
  );

INSERT INTO staging_legacy_billing_item_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_invoice_id,
  item_type,
  description,
  qty,
  unit_price,
  line_total,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'INVITEM-001',
  'INV-001',
  'SUBSCRIPTION',
  'Langganan Home 20 Mbps Juli 2026',
  1,
  350000,
  350000,
  '{"id":"INVITEM-001","invoiceId":"INV-001","type":"SUBSCRIPTION","total":350000}',
  'invitem-sample-001',
  'MAPPED',
  'sample invoice item recurring'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-BILLING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_billing_item_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'INVITEM-001'
  );

INSERT INTO staging_legacy_billing_payment_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_invoice_id,
  payment_no,
  payment_date,
  amount,
  payment_method,
  reference_no,
  received_by_legacy_user,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'PAY-001',
  'INV-001',
  'PAY-SAMPLE-001',
  '2026-07-08 10:30:00',
  250000,
  'TRANSFER',
  'TRX-SAMPLE-001',
  'USR-001',
  'sample pembayaran sebagian',
  '{"id":"PAY-001","invoiceId":"INV-001","amount":250000,"method":"TRANSFER"}',
  'pay-sample-001',
  'MAPPED',
  'sample payment partial untuk invoice sample'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-BILLING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_billing_payment_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'PAY-001'
  );

INSERT INTO staging_legacy_billing_collection_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_invoice_id,
  action_type,
  action_status,
  action_at,
  due_follow_up_at,
  handled_by_legacy_user,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'WEB_PSB',
  'COL-001',
  'INV-001',
  'REMINDER',
  'DONE',
  '2026-07-09 09:00:00',
  '2026-07-10 16:00:00',
  'USR-001',
  'sample reminder tagihan',
  '{"id":"COL-001","invoiceId":"INV-001","action":"REMINDER","status":"DONE"}',
  'col-sample-001',
  'MAPPED',
  'sample collection action untuk invoice sample'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-WEBPSB-BILLING-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_billing_collection_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'COL-001'
  );

UPDATE staging_import_batches
SET valid_rows = 4,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-WEBPSB-BILLING-001';

INSERT INTO staging_import_batches (
  batch_code,
  source_system,
  import_scope,
  source_file_name,
  import_status,
  total_rows,
  valid_rows,
  invalid_rows,
  duplicate_rows,
  notes
)
VALUES
  (
    'SAMPLE-GA-INVENTORY-001',
    'GA',
    'INVENTORY_SAMPLE',
    'sample-ga-inventory.csv',
    'UPLOADED',
    2,
    0,
    0,
    0,
    'sample kecil untuk uji inventory item dan movement staging'
  )
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes);

INSERT INTO staging_legacy_inventory_item_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_category_id,
  legacy_unit_id,
  item_code,
  item_name,
  barcode,
  default_price,
  minimum_stock,
  current_stock,
  status_text,
  photo_path,
  raw_payload,
  normalized_key,
  mapped_category_code,
  mapped_unit_code,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'GA',
  'ITEM-001',
  'CAT-ROUTER',
  'UNIT-PCS',
  'RTR-SAMPLE-001',
  'Router Sample',
  '899000000001',
  350000,
  2,
  8,
  'aktif',
  NULL,
  '{"id":"ITEM-001","category":"Router","unit":"pcs","name":"Router Sample"}',
  'rtr-sample-001',
  'ROUTER',
  'PCS',
  'MAPPED',
  'sample inventory item sudah diarahkan ke category dan unit master'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-GA-INVENTORY-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_inventory_item_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'ITEM-001'
  );

INSERT INTO staging_legacy_inventory_movement_records (
  batch_id,
  source_system,
  movement_source,
  legacy_id,
  legacy_item_id,
  reference_no,
  movement_type,
  qty,
  unit_price,
  movement_at,
  assignee_name,
  notes,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'GA',
  'BARANG_MASUK',
  'MOV-001',
  'ITEM-001',
  'IN-SAMPLE-001',
  'IN',
  5,
  350000,
  '2026-07-04 08:30:00',
  NULL,
  'sample barang masuk inventory',
  '{"id":"MOV-001","itemId":"ITEM-001","type":"IN","qty":5}',
  'in-sample-001',
  'MAPPED',
  'sample inventory movement masuk untuk uji staging GA'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-GA-INVENTORY-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_inventory_movement_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'MOV-001'
  );

UPDATE staging_import_batches
SET valid_rows = 2,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-GA-INVENTORY-001';

INSERT INTO staging_import_batches (
  batch_code,
  source_system,
  import_scope,
  source_file_name,
  import_status,
  total_rows,
  valid_rows,
  invalid_rows,
  duplicate_rows,
  notes
)
VALUES
  (
    'SAMPLE-FINANCE-HR-001',
    'FINANCE',
    'HR_SAMPLE',
    'sample-finance-hr.csv',
    'UPLOADED',
    4,
    0,
    0,
    0,
    'sample kecil untuk uji employee, attendance, salary, dan loan staging'
  )
ON DUPLICATE KEY UPDATE
  source_file_name = VALUES(source_file_name),
  import_status = VALUES(import_status),
  total_rows = VALUES(total_rows),
  notes = VALUES(notes);

INSERT INTO staging_legacy_employee_records (
  batch_id,
  source_system,
  legacy_id,
  employee_code,
  full_name,
  department_text,
  position_name,
  employment_status,
  join_date,
  base_salary,
  phone,
  whatsapp,
  raw_payload,
  normalized_key,
  mapped_division_code,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'FINANCE',
  'EMP-001',
  'EMP-SAMPLE-001',
  'Siti HR Sample',
  'HR & GA',
  'Staff HR',
  'ACTIVE',
  '2025-01-10',
  3500000,
  '081400000001',
  '081400000001',
  '{"id":"EMP-001","name":"Siti HR Sample","department":"HR & GA"}',
  'siti hr sample',
  'HR_GA',
  'MAPPED',
  'sample employee diarahkan ke division master'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-FINANCE-HR-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_employee_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'EMP-001'
  );

INSERT INTO staging_legacy_attendance_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_employee_id,
  attendance_date,
  check_in,
  check_out,
  attendance_status,
  overtime_hours,
  locked_by_admin,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'FINANCE',
  'ATT-001',
  'EMP-001',
  '2026-07-01',
  '2026-07-01 08:01:00',
  '2026-07-01 17:05:00',
  'PRESENT',
  1.50,
  0,
  '{"id":"ATT-001","employeeId":"EMP-001","status":"PRESENT"}',
  'emp-001|2026-07-01',
  'MAPPED',
  'sample attendance untuk employee sample'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-FINANCE-HR-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_attendance_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'ATT-001'
  );

INSERT INTO staging_legacy_salary_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_employee_id,
  payroll_month,
  payroll_year,
  base_salary,
  attendance_allowance,
  overtime_amount,
  performance_bonus,
  position_allowance,
  loan_deduction,
  total_income,
  total_deduction,
  net_salary,
  released_at,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'FINANCE',
  'SAL-001',
  'EMP-001',
  7,
  2026,
  3500000,
  150000,
  75000,
  0,
  100000,
  0,
  3825000,
  0,
  3825000,
  '2026-07-02 09:00:00',
  '{"id":"SAL-001","employeeId":"EMP-001","month":7,"year":2026}',
  'emp-001|7|2026',
  'MAPPED',
  'sample salary slip untuk uji payroll staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-FINANCE-HR-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_salary_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'SAL-001'
  );

INSERT INTO staging_legacy_loan_records (
  batch_id,
  source_system,
  legacy_id,
  legacy_employee_id,
  loan_type,
  amount,
  monthly_installment,
  loan_date,
  loan_status,
  description,
  raw_payload,
  normalized_key,
  import_status,
  validation_notes
)
SELECT
  b.id,
  'FINANCE',
  'LOAN-001',
  'EMP-001',
  'KASBON',
  1000000,
  250000,
  '2026-06-25',
  'ACTIVE',
  'sample kasbon karyawan',
  '{"id":"LOAN-001","employeeId":"EMP-001","type":"KASBON","amount":1000000}',
  'loan-001',
  'MAPPED',
  'sample loan untuk uji HR staging'
FROM staging_import_batches b
WHERE b.batch_code = 'SAMPLE-FINANCE-HR-001'
  AND NOT EXISTS (
    SELECT 1
    FROM staging_legacy_loan_records s
    WHERE s.batch_id = b.id
      AND s.legacy_id = 'LOAN-001'
  );

UPDATE staging_import_batches
SET valid_rows = 4,
    import_status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
WHERE batch_code = 'SAMPLE-FINANCE-HR-001';
