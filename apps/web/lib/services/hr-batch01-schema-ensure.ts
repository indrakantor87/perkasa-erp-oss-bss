import {
  addColumnIfMissing,
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
} from '@/lib/review-db'
import { ensureHrAuditTable } from '@/lib/services/hr-audit-service'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

async function ensureOrgTeamsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS org_teams (
        id BIGINT NOT NULL AUTO_INCREMENT,
        team_code VARCHAR(32) NOT NULL,
        name VARCHAR(100) NOT NULL,
        division_id BIGINT UNSIGNED NOT NULL,
        description TEXT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_org_teams_code_per_div (division_id, team_code),
        CONSTRAINT fk_org_teams_division FOREIGN KEY (division_id) REFERENCES org_divisions(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('org_teams')
}

async function ensureOrgPositionsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS org_positions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        position_code VARCHAR(32) NOT NULL,
        position_name VARCHAR(120) NOT NULL,
        position_level VARCHAR(40) NULL,
        description TEXT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_org_positions_code (position_code)
      )
    `,
  )
  invalidateReviewDbColumnCache('org_positions')
}

async function ensureHrEmployeesExpandColumns() {
  const tableName = 'hr_employees'

  await addColumnIfMissing(
    tableName,
    'email_corporate',
    'email_corporate VARCHAR(180) NULL',
    'whatsapp',
  )
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD UNIQUE INDEX IF NOT EXISTS uq_hr_employees_email_corporate (email_corporate)`,
    )
  } catch {}

  await addColumnIfMissing(
    tableName,
    'team_id',
    'team_id BIGINT UNSIGNED NULL',
    'division_id',
  )

  await addColumnIfMissing(
    tableName,
    'position_id',
    'position_id BIGINT UNSIGNED NULL',
    'team_id',
  )

  await addColumnIfMissing(
    tableName,
    'supervisor_id',
    'supervisor_id BIGINT UNSIGNED NULL',
    'position_id',
  )

  await addColumnIfMissing(
    tableName,
    'contract_doc_id',
    'contract_doc_id BIGINT UNSIGNED NULL',
    'supervisor_id',
  )

  await addColumnIfMissing(
    tableName,
    'contract_start_date',
    'contract_start_date DATE NULL',
    'contract_doc_id',
  )

  await addColumnIfMissing(
    tableName,
    'contract_end_date',
    'contract_end_date DATE NULL',
    'contract_start_date',
  )

  await addColumnIfMissing(
    tableName,
    'exit_date',
    'exit_date DATE NULL',
    'contract_end_date',
  )

  await addColumnIfMissing(
    tableName,
    'exit_reason',
    'exit_reason TEXT NULL',
    'exit_date',
  )

  await addColumnIfMissing(
    tableName,
    'user_id',
    'user_id BIGINT UNSIGNED NULL',
    'exit_reason',
  )
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD UNIQUE INDEX IF NOT EXISTS uq_hr_employees_user_id (user_id)`,
    )
  } catch {}

  invalidateReviewDbColumnCache(tableName)
}

async function ensureHrEmployeesForeignKeys() {
  const tableName = 'hr_employees'

  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD CONSTRAINT IF NOT EXISTS fk_hr_employees_team FOREIGN KEY (team_id) REFERENCES org_teams(id)`,
    )
  } catch {}

  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD CONSTRAINT IF NOT EXISTS fk_hr_employees_position FOREIGN KEY (position_id) REFERENCES org_positions(id)`,
    )
  } catch {}

  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD CONSTRAINT IF NOT EXISTS fk_hr_employees_supervisor FOREIGN KEY (supervisor_id) REFERENCES hr_employees(id)`,
    )
  } catch {}

  try {
    const authUsersExists = await runReviewDbExecute<ExecuteResult>(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'auth_users'`,
    )
    if (authUsersExists && Array.isArray(authUsersExists) && authUsersExists[0]?.cnt > 0) {
      await runReviewDbExecute<ExecuteResult>(
        `ALTER TABLE ${tableName} ADD CONSTRAINT IF NOT EXISTS fk_hr_employees_user FOREIGN KEY (user_id) REFERENCES auth_users(id)`,
      )
    }
  } catch {}
}

async function ensureHrEmployeeHistoryTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_employee_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        history_event ENUM('HIRED','MUTATION_BRANCH_DIV','TEAM_CHANGE','POSITION_CHANGE','SUPERVISOR_CHANGE','CONTRACT_CHANGE','STATUS_CHANGE','RESIGN_TERMINATE','SALARY_CHANGE','REHIRE','AUTH_USER_MAPPING','CORRECTION') NOT NULL,
        effective_date DATE NOT NULL,
        prev_value_json TEXT NULL,
        new_value_json TEXT NULL,
        reason TEXT NULL,
        actor_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        detail_json TEXT NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_histor_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
        KEY idx_hist_employee_date (employee_id, effective_date, created_at)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_employee_history')
}

async function ensureHrDocumentsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_documents (
        id BIGINT NOT NULL AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        doc_category ENUM('KTP','KK','IJAZAH_TERAKHIR','KONTRAK_KERJA','LAINNYA') NOT NULL,
        original_filename VARCHAR(200) NOT NULL,
        storage_ref_internal VARCHAR(500) NOT NULL,
        file_size_bytes BIGINT NULL,
        mime_type VARCHAR(80) NOT NULL,
        uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at DATETIME NULL,
        checksum_sha256 CHAR(64) NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        CONSTRAINT fk_doc_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
        KEY idx_doc_employee_cat (employee_id, doc_category, active)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_documents')
}

async function ensureHrDocumentAccessLogsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_document_access_logs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        document_id BIGINT UNSIGNED NOT NULL,
        action_type ENUM('UPLOAD','VIEW_METADATA','DOWNLOAD','REPLACE_NEW_VERSION','MARK_INACTIVE','ACCESS_DENIED') NOT NULL,
        actor_user_id BIGINT UNSIGNED NOT NULL,
        actor_ip VARCHAR(45) NULL,
        client_user_agent VARCHAR(255) NULL,
        accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        detail_text TEXT NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_doc_access_doc FOREIGN KEY (document_id) REFERENCES hr_documents(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_document_access_logs')
}

async function ensureHrFpMachinesTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_fp_machines (
        id BIGINT NOT NULL AUTO_INCREMENT,
        machine_name VARCHAR(120) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        port INTEGER UNSIGNED NULL,
        machine_model VARCHAR(100) NOT NULL,
        location TEXT NULL,
        branch_id BIGINT UNSIGNED NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        last_sync_at DATETIME NULL,
        last_connection_status ENUM('UNKNOWN','ONLINE','OFFLINE','SYNC_ERROR','AUTH_FAILED') NOT NULL DEFAULT 'UNKNOWN',
        sync_method VARCHAR(60) NULL,
        device_timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Jakarta',
        auth_config_encrypted TEXT NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by_user_id BIGINT UNSIGNED NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_fp_machines_ip_port (ip_address, port)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_fp_machines')
}

async function ensureHrFpEmployeeMappingsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_fp_employee_mappings (
        id BIGINT NOT NULL AUTO_INCREMENT,
        machine_id BIGINT UNSIGNED NOT NULL,
        employee_id BIGINT UNSIGNED NOT NULL,
        machine_user_id VARCHAR(40) NOT NULL,
        enrollment_status ENUM('ENROLLED','REVOKED','PENDING') NOT NULL DEFAULT 'ENROLLED',
        enrolled_at DATETIME NULL,
        revoked_at DATETIME NULL,
        notes TEXT NULL,
        created_by_user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_fp_map_machine_user (machine_id, machine_user_id),
        CONSTRAINT fk_fp_map_machine FOREIGN KEY (machine_id) REFERENCES hr_fp_machines(id),
        CONSTRAINT fk_fp_map_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_fp_employee_mappings')
}

async function ensureHrFpSyncRunsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_fp_sync_runs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        machine_id BIGINT UNSIGNED NOT NULL,
        started_at DATETIME NOT NULL,
        finished_at DATETIME NULL,
        sync_mode ENUM('MANUAL','SCHEDULED') NOT NULL,
        actor_user_id BIGINT UNSIGNED NULL,
        total_records_fetched INT UNSIGNED NOT NULL DEFAULT 0,
        total_new_valid INT UNSIGNED NOT NULL DEFAULT 0,
        total_duplicates_skipped INT UNSIGNED NOT NULL DEFAULT 0,
        total_unmapped INT UNSIGNED NOT NULL DEFAULT 0,
        total_failed_parse INT UNSIGNED NOT NULL DEFAULT 0,
        final_status ENUM('SUCCESS','PARTIAL','FAILED') NULL,
        error_summary TEXT NULL,
        duration_ms BIGINT UNSIGNED NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_sync_run_machine FOREIGN KEY (machine_id) REFERENCES hr_fp_machines(id),
        KEY idx_sync_run_machine_time (machine_id, started_at DESC)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_fp_sync_runs')
}

async function ensureHrFpRawEventsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS hr_fp_raw_events (
        id BIGINT NOT NULL AUTO_INCREMENT,
        sync_run_id BIGINT UNSIGNED NULL,
        machine_id BIGINT UNSIGNED NOT NULL,
        machine_user_id VARCHAR(40) NOT NULL,
        employee_id BIGINT UNSIGNED NULL,
        event_timestamp_original DATETIME NOT NULL,
        event_timestamp_normalized DATETIME NOT NULL,
        event_type_raw VARCHAR(40) NULL,
        event_mode ENUM('IN','OUT','UNDEFINED') NOT NULL DEFAULT 'UNDEFINED',
        verify_score INT NULL,
        raw_payload_json TEXT NULL,
        received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deduplication_hash CHAR(64) NOT NULL,
        is_processed TINYINT(1) NOT NULL DEFAULT 0,
        is_unmapped TINYINT(1) NOT NULL DEFAULT 0,
        processing_notes TEXT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_fp_raw_dedup_hash (deduplication_hash),
        CONSTRAINT fk_raw_machine FOREIGN KEY (machine_id) REFERENCES hr_fp_machines(id),
        CONSTRAINT fk_raw_sync FOREIGN KEY (sync_run_id) REFERENCES hr_fp_sync_runs(id),
        CONSTRAINT fk_raw_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
        KEY idx_raw_time_norm (event_timestamp_normalized)
      )
    `,
  )
  invalidateReviewDbColumnCache('hr_fp_raw_events')
}

async function ensureHrAttendanceExpandColumns() {
  const tableName = 'hr_attendance'

  await addColumnIfMissing(
    tableName,
    'source_type',
    "source_type ENUM('SOURCE_BROWSER','SOURCE_FINGERPRINT_MACHINE','SOURCE_MANUAL_CORRECTION') NOT NULL DEFAULT 'SOURCE_BROWSER'",
    'status',
  )

  await addColumnIfMissing(
    tableName,
    'fingerprint_device_id',
    'fingerprint_device_id BIGINT UNSIGNED NULL',
    'source_type',
  )

  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD CONSTRAINT IF NOT EXISTS fk_hr_attendance_fp_device FOREIGN KEY (fingerprint_device_id) REFERENCES hr_fp_machines(id)`,
    )
  } catch {}

  invalidateReviewDbColumnCache(tableName)
}

export async function ensureHrBatch01Schema() {
  await ensureHrAuditTable()

  await ensureOrgTeamsTable()
  await ensureOrgPositionsTable()

  await ensureHrEmployeesExpandColumns()
  await ensureHrEmployeesForeignKeys()

  await ensureHrEmployeeHistoryTable()

  await ensureHrDocumentsTable()
  await ensureHrDocumentAccessLogsTable()

  await ensureHrFpMachinesTable()
  await ensureHrFpEmployeeMappingsTable()
  await ensureHrFpSyncRunsTable()

  await ensureHrFpRawEventsTable()
  await ensureHrAttendanceExpandColumns()

  invalidateReviewDbColumnCache('org_teams')
  invalidateReviewDbColumnCache('org_positions')
  invalidateReviewDbColumnCache('hr_employees')
  invalidateReviewDbColumnCache('hr_employee_history')
  invalidateReviewDbColumnCache('hr_documents')
  invalidateReviewDbColumnCache('hr_document_access_logs')
  invalidateReviewDbColumnCache('hr_fp_machines')
  invalidateReviewDbColumnCache('hr_fp_employee_mappings')
  invalidateReviewDbColumnCache('hr_fp_sync_runs')
  invalidateReviewDbColumnCache('hr_fp_raw_events')
  invalidateReviewDbColumnCache('hr_attendance')

  console.log(
    'HR_VERSION=1.1.0-fingerprint-employee-master-batch01 provision schema ensure complete',
  )
}
