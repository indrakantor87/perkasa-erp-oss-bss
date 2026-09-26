import {
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
} from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

async function ensureHrLeaveTypesTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_leave_types (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(40) NOT NULL,
        name VARCHAR(120) NOT NULL,
        description TEXT NULL,
        needs_docs TINYINT(1) NOT NULL DEFAULT 0,
        deduct_balance TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_hr_leave_types_code (code)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_leave_types')
}

async function ensureHrLeaveBalancesTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_leave_balances (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        leave_type_id BIGINT UNSIGNED NOT NULL,
        fiscal_year INT NOT NULL COMMENT 'Tahun anggaran cuti eg 2025',
        balance_initial DECIMAL(10,2) NOT NULL DEFAULT 12 COMMENT 'Hak cuti awal tahun',
        balance_used DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Terpakai',
        balance_remaining DECIMAL(10,2) GENERATED ALWAYS AS (balance_initial - balance_used) STORED COMMENT 'Sisa = initial - used',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_leave_bal_emp_type_year (employee_id, leave_type_id, fiscal_year),
        CONSTRAINT fk_hr_leave_bal_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE,
        CONSTRAINT fk_hr_leave_bal_type FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id) ON DELETE CASCADE
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_leave_balances')
}

async function ensureHrLeaveRequestsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_leave_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        leave_type_id BIGINT UNSIGNED NOT NULL,
        status ENUM('DRAFT','PENDING_SUPERVISOR','APPROVED_SUPERVISOR','PENDING_HR','APPROVED_HR','COMPLETED','REJECTED_SUPERVISOR','REJECTED_HR','CANCELLED_EMPLOYEE','CANCELLED_HR_ADMIN','PARTIAL') NOT NULL DEFAULT 'DRAFT',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days DECIMAL(10,2) NOT NULL DEFAULT 1,
        reason VARCHAR(500) NOT NULL DEFAULT '',
        supervisor_id BIGINT UNSIGNED NULL,
        supervisor_reason VARCHAR(500) NULL,
        hr_reason VARCHAR(500) NULL,
        cancel_reason VARCHAR(500) NULL,
        balance_applied TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=balance deduction sudah dilakukan atomic pada HR approve to prevent double deduct',
        attendance_snapshot_before JSON NULL COMMENT 'Snapshot attendance values per date YYYY-MM-DD key for V4 safe conditional revert exact NOT PRESENT assume + after state reference to detect leave applied later correction intervened conflict. {date: {id, before_status, before_notes, after_applied_expected_status, after_applied_expected_notes, overtime_before}}',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_hr_leave_emp_date (employee_id, start_date, end_date),
        KEY idx_hr_leave_status (status),
        CONSTRAINT fk_hr_leave_req_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
        CONSTRAINT fk_hr_leave_req_type FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id),
        CONSTRAINT fk_hr_leave_req_supervisor FOREIGN KEY (supervisor_id) REFERENCES hr_employees(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_leave_requests')
}

async function ensureHrLeaveRequestDocumentsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_leave_request_documents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        leave_request_id BIGINT UNSIGNED NOT NULL,
        file_name VARCHAR(200) NOT NULL,
        file_path_storage VARCHAR(400) NOT NULL,
        file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
        uploaded_by_employee_id BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_hr_leave_doc_request FOREIGN KEY (leave_request_id) REFERENCES hr_leave_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_hr_leave_doc_uploader FOREIGN KEY (uploaded_by_employee_id) REFERENCES hr_employees(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_leave_request_documents')
}

async function ensureHrOvertimeRequestsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_overtime_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        overtime_date DATE NOT NULL,
        planned_start_time TIME NOT NULL,
        planned_end_time TIME NOT NULL,
        planned_minutes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'DATEDIFF server calc initial planned never client',
        approved_minutes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'final approved value Supervisor/HR set, server only never client',
        status ENUM('DRAFT','PENDING_SUPERVISOR','APPROVED_SUPERVISOR','PENDING_HR','APPROVED_HR','COMPLETED','REJECTED_SUPERVISOR','REJECTED_HR','CANCELLED_EMPLOYEE','CANCELLED_HR_ADMIN') NOT NULL DEFAULT 'DRAFT',
        reason VARCHAR(500) NOT NULL DEFAULT '',
        supervisor_id BIGINT UNSIGNED NULL,
        supervisor_reason VARCHAR(500) NULL,
        hr_reason VARCHAR(500) NULL,
        cancel_reason VARCHAR(500) NULL,
        attendance_snapshot_before JSON NULL COMMENT '{date: {attendance_id, overtime_before_value, after_approved_expected_overtime, status_before, notes_before}} V4 conditional revert compare safe',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_overtime_emp_date (employee_id, overtime_date),
        KEY idx_overtime_status (status),
        CONSTRAINT fk_hr_ot_req_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
        CONSTRAINT fk_hr_ot_req_supervisor FOREIGN KEY (supervisor_id) REFERENCES hr_employees(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_overtime_requests')
}

async function ensureHrOvertimeRequestEvidencesTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_overtime_request_evidences (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        overtime_request_id BIGINT UNSIGNED NOT NULL,
        file_name VARCHAR(200) NOT NULL,
        file_path_storage VARCHAR(400) NOT NULL,
        file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
        uploaded_by_employee_id BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_hr_ot_evi_request FOREIGN KEY (overtime_request_id) REFERENCES hr_overtime_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_hr_ot_evi_uploader FOREIGN KEY (uploaded_by_employee_id) REFERENCES hr_employees(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_overtime_request_evidences')
}

export async function ensureHrBatch02b() {
  await ensureHrLeaveTypesTable()
  await ensureHrLeaveBalancesTable()
  await ensureHrLeaveRequestsTable()
  await ensureHrLeaveRequestDocumentsTable()
  await ensureHrOvertimeRequestsTable()
  await ensureHrOvertimeRequestEvidencesTable()

  invalidateReviewDbColumnCache('hr_leave_types')
  invalidateReviewDbColumnCache('hr_leave_balances')
  invalidateReviewDbColumnCache('hr_leave_requests')
  invalidateReviewDbColumnCache('hr_leave_request_documents')
  invalidateReviewDbColumnCache('hr_overtime_requests')
  invalidateReviewDbColumnCache('hr_overtime_request_evidences')

  console.log(
    'HR_VERSION=2.0.0-leave-overtime-batch02b provision schema ensure complete',
  )
}
