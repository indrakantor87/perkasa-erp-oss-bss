-- Jalankan file ini setelah schema review, staging import, master mapping, core seed, mapping seed, dan sample import.
-- Transform tahap 1 ini fokus pada domain yang paling sederhana untuk divalidasi:
-- 1. inventory item
-- 2. inventory movement
-- 3. employee
-- 4. attendance
-- 5. salary slip
-- 6. loan

USE erp_isp_review;

-- 1) Transform inventory item dari staging ke inventory_items
INSERT INTO inventory_items (
  category_id,
  unit_id,
  item_code,
  item_name,
  barcode,
  default_price,
  minimum_stock,
  current_stock,
  photo_path,
  status
)
SELECT
  ic.id,
  iu.id,
  COALESCE(NULLIF(TRIM(s.item_code), ''), CONCAT('ITEM-LEGACY-', s.id)),
  COALESCE(NULLIF(TRIM(s.item_name), ''), CONCAT('Legacy Item ', s.id)),
  NULLIF(TRIM(s.barcode), ''),
  COALESCE(s.default_price, 0),
  COALESCE(s.minimum_stock, 0),
  COALESCE(s.current_stock, 0),
  NULLIF(TRIM(s.photo_path), ''),
  CASE
    WHEN COALESCE(msv.target_status_value, UPPER(TRIM(s.status_text))) = 'INACTIVE' THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END
FROM staging_legacy_inventory_item_records s
LEFT JOIN inventory_categories ic
  ON ic.code = s.mapped_category_code
LEFT JOIN inventory_units iu
  ON iu.code = s.mapped_unit_code
LEFT JOIN mapping_legacy_status_values msv
  ON msv.source_system = s.source_system
  AND msv.domain_name = 'INVENTORY'
  AND msv.legacy_status_value = s.status_text
  AND msv.is_active = 1
WHERE s.import_status IN ('MAPPED', 'VALID')
  AND s.target_item_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_items i
    WHERE i.item_code = COALESCE(NULLIF(TRIM(s.item_code), ''), CONCAT('ITEM-LEGACY-', s.id))
  );

UPDATE staging_legacy_inventory_item_records s
JOIN inventory_items i
  ON i.item_code = COALESCE(NULLIF(TRIM(s.item_code), ''), CONCAT('ITEM-LEGACY-', s.id))
SET s.target_item_id = i.id,
    s.import_status = 'IMPORTED',
    s.imported_at = COALESCE(s.imported_at, CURRENT_TIMESTAMP),
    s.updated_at = CURRENT_TIMESTAMP
WHERE s.import_status IN ('MAPPED', 'VALID')
  AND s.target_item_id IS NULL;

-- 2) Transform inventory movement dari staging ke inventory_stock_movements
INSERT INTO inventory_stock_movements (
  item_id,
  work_order_id,
  movement_type,
  reference_no,
  qty,
  unit_price,
  notes,
  movement_at
)
SELECT
  COALESCE(sm.target_item_id, si.target_item_id),
  sm.target_work_order_id,
  CASE
    WHEN UPPER(TRIM(sm.movement_type)) = 'OUT' THEN 'OUT'
    WHEN UPPER(TRIM(sm.movement_type)) = 'ADJUSTMENT' THEN 'ADJUSTMENT'
    ELSE 'IN'
  END,
  NULLIF(TRIM(sm.reference_no), ''),
  COALESCE(sm.qty, 0),
  COALESCE(sm.unit_price, 0),
  sm.notes,
  COALESCE(sm.movement_at, CURRENT_TIMESTAMP)
FROM staging_legacy_inventory_movement_records sm
LEFT JOIN staging_legacy_inventory_item_records si
  ON si.source_system = sm.source_system
  AND si.legacy_id = sm.legacy_item_id
WHERE sm.import_status IN ('MAPPED', 'VALID')
  AND sm.target_movement_id IS NULL
  AND COALESCE(sm.target_item_id, si.target_item_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_stock_movements ism
    WHERE ism.item_id = COALESCE(sm.target_item_id, si.target_item_id)
      AND COALESCE(ism.reference_no, '') = COALESCE(NULLIF(TRIM(sm.reference_no), ''), '')
      AND ism.movement_type = CASE
        WHEN UPPER(TRIM(sm.movement_type)) = 'OUT' THEN 'OUT'
        WHEN UPPER(TRIM(sm.movement_type)) = 'ADJUSTMENT' THEN 'ADJUSTMENT'
        ELSE 'IN'
      END
      AND ism.qty = COALESCE(sm.qty, 0)
  );

UPDATE staging_legacy_inventory_movement_records sm
LEFT JOIN staging_legacy_inventory_item_records si
  ON si.source_system = sm.source_system
  AND si.legacy_id = sm.legacy_item_id
JOIN inventory_stock_movements ism
  ON ism.item_id = COALESCE(sm.target_item_id, si.target_item_id)
  AND COALESCE(ism.reference_no, '') = COALESCE(NULLIF(TRIM(sm.reference_no), ''), '')
  AND ism.movement_type = CASE
    WHEN UPPER(TRIM(sm.movement_type)) = 'OUT' THEN 'OUT'
    WHEN UPPER(TRIM(sm.movement_type)) = 'ADJUSTMENT' THEN 'ADJUSTMENT'
    ELSE 'IN'
  END
  AND ism.qty = COALESCE(sm.qty, 0)
SET sm.target_item_id = COALESCE(sm.target_item_id, si.target_item_id),
    sm.target_movement_id = ism.id,
    sm.import_status = 'IMPORTED',
    sm.imported_at = COALESCE(sm.imported_at, CURRENT_TIMESTAMP),
    sm.updated_at = CURRENT_TIMESTAMP
WHERE sm.import_status IN ('MAPPED', 'VALID')
  AND sm.target_movement_id IS NULL;

-- 3) Transform employee dari staging ke hr_employees
INSERT INTO hr_employees (
  branch_id,
  division_id,
  employee_code,
  full_name,
  position_name,
  employment_status,
  join_date,
  base_salary,
  phone,
  whatsapp
)
SELECT
  ob.id,
  od.id,
  COALESCE(NULLIF(TRIM(se.employee_code), ''), CONCAT('EMP-LEGACY-', se.id)),
  COALESCE(NULLIF(TRIM(se.full_name), ''), CONCAT('Legacy Employee ', se.id)),
  NULLIF(TRIM(se.position_name), ''),
  COALESCE(NULLIF(TRIM(se.employment_status), ''), 'KARYAWAN'),
  se.join_date,
  COALESCE(se.base_salary, 0),
  NULLIF(TRIM(se.phone), ''),
  NULLIF(TRIM(se.whatsapp), '')
FROM staging_legacy_employee_records se
LEFT JOIN org_divisions od
  ON od.code = se.mapped_division_code
LEFT JOIN org_branches ob
  ON ob.code = 'PATI'
WHERE se.import_status IN ('MAPPED', 'VALID')
  AND se.target_employee_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hr_employees he
    WHERE he.employee_code = COALESCE(NULLIF(TRIM(se.employee_code), ''), CONCAT('EMP-LEGACY-', se.id))
  );

UPDATE staging_legacy_employee_records se
JOIN hr_employees he
  ON he.employee_code = COALESCE(NULLIF(TRIM(se.employee_code), ''), CONCAT('EMP-LEGACY-', se.id))
SET se.target_employee_id = he.id,
    se.import_status = 'IMPORTED',
    se.imported_at = COALESCE(se.imported_at, CURRENT_TIMESTAMP),
    se.updated_at = CURRENT_TIMESTAMP
WHERE se.import_status IN ('MAPPED', 'VALID')
  AND se.target_employee_id IS NULL;

-- 4) Transform attendance dari staging ke hr_attendance
INSERT INTO hr_attendance (
  employee_id,
  attendance_date,
  check_in,
  check_out,
  status,
  overtime_hours,
  locked_by_admin
)
SELECT
  COALESCE(sa.target_employee_id, se.target_employee_id),
  sa.attendance_date,
  sa.check_in,
  sa.check_out,
  CASE
    WHEN COALESCE(msv.target_status_value, UPPER(TRIM(sa.attendance_status))) = 'SICK' THEN 'SICK'
    WHEN COALESCE(msv.target_status_value, UPPER(TRIM(sa.attendance_status))) = 'PERMIT' THEN 'PERMIT'
    WHEN COALESCE(msv.target_status_value, UPPER(TRIM(sa.attendance_status))) = 'ALPHA' THEN 'ALPHA'
    ELSE 'PRESENT'
  END,
  COALESCE(sa.overtime_hours, 0),
  COALESCE(sa.locked_by_admin, 0)
FROM staging_legacy_attendance_records sa
LEFT JOIN staging_legacy_employee_records se
  ON se.source_system = sa.source_system
  AND se.legacy_id = sa.legacy_employee_id
LEFT JOIN mapping_legacy_status_values msv
  ON msv.source_system = sa.source_system
  AND msv.domain_name = 'ATTENDANCE'
  AND msv.legacy_status_value = sa.attendance_status
  AND msv.is_active = 1
WHERE sa.import_status IN ('MAPPED', 'VALID')
  AND sa.target_attendance_id IS NULL
  AND COALESCE(sa.target_employee_id, se.target_employee_id) IS NOT NULL
  AND sa.attendance_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hr_attendance ha
    WHERE ha.employee_id = COALESCE(sa.target_employee_id, se.target_employee_id)
      AND ha.attendance_date = sa.attendance_date
  );

UPDATE staging_legacy_attendance_records sa
LEFT JOIN staging_legacy_employee_records se
  ON se.source_system = sa.source_system
  AND se.legacy_id = sa.legacy_employee_id
JOIN hr_attendance ha
  ON ha.employee_id = COALESCE(sa.target_employee_id, se.target_employee_id)
  AND ha.attendance_date = sa.attendance_date
SET sa.target_employee_id = COALESCE(sa.target_employee_id, se.target_employee_id),
    sa.target_attendance_id = ha.id,
    sa.import_status = 'IMPORTED',
    sa.imported_at = COALESCE(sa.imported_at, CURRENT_TIMESTAMP),
    sa.updated_at = CURRENT_TIMESTAMP
WHERE sa.import_status IN ('MAPPED', 'VALID')
  AND sa.target_attendance_id IS NULL;

-- 5) Transform salary dari staging ke hr_salary_slips
INSERT INTO hr_salary_slips (
  employee_id,
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
  released_at
)
SELECT
  COALESCE(ss.target_employee_id, se.target_employee_id),
  ss.payroll_month,
  ss.payroll_year,
  COALESCE(ss.base_salary, 0),
  COALESCE(ss.attendance_allowance, 0),
  COALESCE(ss.overtime_amount, 0),
  COALESCE(ss.performance_bonus, 0),
  COALESCE(ss.position_allowance, 0),
  COALESCE(ss.loan_deduction, 0),
  COALESCE(ss.total_income, 0),
  COALESCE(ss.total_deduction, 0),
  COALESCE(ss.net_salary, 0),
  ss.released_at
FROM staging_legacy_salary_records ss
LEFT JOIN staging_legacy_employee_records se
  ON se.source_system = ss.source_system
  AND se.legacy_id = ss.legacy_employee_id
WHERE ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_salary_slip_id IS NULL
  AND COALESCE(ss.target_employee_id, se.target_employee_id) IS NOT NULL
  AND ss.payroll_month IS NOT NULL
  AND ss.payroll_year IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hr_salary_slips hs
    WHERE hs.employee_id = COALESCE(ss.target_employee_id, se.target_employee_id)
      AND hs.payroll_month = ss.payroll_month
      AND hs.payroll_year = ss.payroll_year
  );

UPDATE staging_legacy_salary_records ss
LEFT JOIN staging_legacy_employee_records se
  ON se.source_system = ss.source_system
  AND se.legacy_id = ss.legacy_employee_id
JOIN hr_salary_slips hs
  ON hs.employee_id = COALESCE(ss.target_employee_id, se.target_employee_id)
  AND hs.payroll_month = ss.payroll_month
  AND hs.payroll_year = ss.payroll_year
SET ss.target_employee_id = COALESCE(ss.target_employee_id, se.target_employee_id),
    ss.target_salary_slip_id = hs.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_salary_slip_id IS NULL;

-- 6) Transform loan dari staging ke hr_loans
INSERT INTO hr_loans (
  employee_id,
  loan_type,
  amount,
  monthly_installment,
  description,
  loan_date,
  status
)
SELECT
  COALESCE(sl.target_employee_id, se.target_employee_id),
  COALESCE(NULLIF(TRIM(sl.loan_type), ''), 'KASBON'),
  COALESCE(sl.amount, 0),
  COALESCE(sl.monthly_installment, 0),
  sl.description,
  COALESCE(sl.loan_date, CURRENT_DATE),
  CASE
    WHEN UPPER(TRIM(sl.loan_status)) = 'REJECTED' THEN 'REJECTED'
    WHEN UPPER(TRIM(sl.loan_status)) = 'PAID' THEN 'PAID'
    WHEN UPPER(TRIM(sl.loan_status)) = 'ACTIVE' THEN 'ACTIVE'
    ELSE 'PENDING'
  END
FROM staging_legacy_loan_records sl
LEFT JOIN staging_legacy_employee_records se
  ON se.source_system = sl.source_system
  AND se.legacy_id = sl.legacy_employee_id
WHERE sl.import_status IN ('MAPPED', 'VALID')
  AND sl.target_loan_id IS NULL
  AND COALESCE(sl.target_employee_id, se.target_employee_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hr_loans hl
    WHERE hl.employee_id = COALESCE(sl.target_employee_id, se.target_employee_id)
      AND hl.loan_date = COALESCE(sl.loan_date, CURRENT_DATE)
      AND hl.amount = COALESCE(sl.amount, 0)
      AND hl.loan_type = COALESCE(NULLIF(TRIM(sl.loan_type), ''), 'KASBON')
  );

UPDATE staging_legacy_loan_records sl
LEFT JOIN staging_legacy_employee_records se
  ON se.source_system = sl.source_system
  AND se.legacy_id = sl.legacy_employee_id
JOIN hr_loans hl
  ON hl.employee_id = COALESCE(sl.target_employee_id, se.target_employee_id)
  AND hl.loan_date = COALESCE(sl.loan_date, CURRENT_DATE)
  AND hl.amount = COALESCE(sl.amount, 0)
  AND hl.loan_type = COALESCE(NULLIF(TRIM(sl.loan_type), ''), 'KASBON')
SET sl.target_employee_id = COALESCE(sl.target_employee_id, se.target_employee_id),
    sl.target_loan_id = hl.id,
    sl.import_status = 'IMPORTED',
    sl.imported_at = COALESCE(sl.imported_at, CURRENT_TIMESTAMP),
    sl.updated_at = CURRENT_TIMESTAMP
WHERE sl.import_status IN ('MAPPED', 'VALID')
  AND sl.target_loan_id IS NULL;
