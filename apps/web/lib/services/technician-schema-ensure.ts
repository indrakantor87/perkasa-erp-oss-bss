import {
  addColumnIfMissing,
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
} from '@/lib/review-db'
import { ensureTicketsUnifiedTable } from '@/lib/services/unified-ticket-service'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

async function ensureTempPeriodsColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  await addColumnIfMissing('tickets_temporary_periods', columnName, definitionSql, afterColumn)
}

async function ensureTicketsTemporaryPeriodsTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS tickets_temporary_periods (
        id BIGINT NOT NULL AUTO_INCREMENT,
        ticket_id BIGINT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'TEMPORARY',
        started_at DATETIME NOT NULL,
        ended_at DATETIME NULL,
        actor_user_id BIGINT UNSIGNED NULL,
        reason TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_ttp_ticket (ticket_id),
        KEY idx_ttp_status (status),
        KEY idx_ttp_started (started_at),
        CONSTRAINT fk_ttp_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id)
      )
    `,
  )

  await ensureTempPeriodsColumn('ticket_id', 'ticket_id BIGINT NOT NULL', 'id')
  await ensureTempPeriodsColumn("status", "status VARCHAR(32) NOT NULL DEFAULT 'TEMPORARY'", 'ticket_id')
  await ensureTempPeriodsColumn('started_at', 'started_at DATETIME NOT NULL', 'status')
  await ensureTempPeriodsColumn('ended_at', 'ended_at DATETIME NULL', 'started_at')
  await ensureTempPeriodsColumn('actor_user_id', 'actor_user_id BIGINT UNSIGNED NULL', 'ended_at')
  await ensureTempPeriodsColumn('reason', 'reason TEXT NULL', 'actor_user_id')
  await ensureTempPeriodsColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'reason',
  )

  invalidateReviewDbColumnCache('tickets_temporary_periods')
}

async function ensureEvidenceColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  await addColumnIfMissing('ticket_work_evidences', columnName, definitionSql, afterColumn)
}

async function ensureTicketWorkEvidencesTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS ticket_work_evidences (
        id BIGINT NOT NULL AUTO_INCREMENT,
        ticket_id BIGINT NOT NULL,
        uploaded_by_user_id BIGINT UNSIGNED NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        evidence_type VARCHAR(64) NULL,
        storage_reference VARCHAR(512) NULL,
        notes TEXT NULL,
        branch_id BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_twe_ticket (ticket_id),
        KEY idx_twe_uploader (uploaded_by_user_id),
        KEY idx_twe_branch (branch_id),
        KEY idx_twe_evidence_type (evidence_type),
        CONSTRAINT fk_twe_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id)
      )
    `,
  )

  await ensureEvidenceColumn('ticket_id', 'ticket_id BIGINT NOT NULL', 'id')
  await ensureEvidenceColumn('uploaded_by_user_id', 'uploaded_by_user_id BIGINT UNSIGNED NULL', 'ticket_id')
  await ensureEvidenceColumn(
    'uploaded_at',
    'uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'uploaded_by_user_id',
  )
  await ensureEvidenceColumn('evidence_type', 'evidence_type VARCHAR(64) NULL', 'uploaded_at')
  await ensureEvidenceColumn('storage_reference', 'storage_reference VARCHAR(512) NULL', 'evidence_type')
  await ensureEvidenceColumn('notes', 'notes TEXT NULL', 'storage_reference')
  await ensureEvidenceColumn('branch_id', 'branch_id BIGINT UNSIGNED NULL', 'notes')
  await ensureEvidenceColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'branch_id',
  )
  await ensureEvidenceColumn(
    'updated_at',
    'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'created_at',
  )

  invalidateReviewDbColumnCache('ticket_work_evidences')
}

async function ensureWorkOrderSubmittedColumns() {
  const tableName = 'service_work_orders'

  if (!(await hasReviewDbColumn(tableName, 'submitted_at'))) {
    try {
      await runReviewDbExecute<ExecuteResult>(
        `ALTER TABLE ${tableName} ADD COLUMN submitted_at DATETIME NULL AFTER completed_at`,
      )
    } catch {
    }
    invalidateReviewDbColumnCache(tableName, 'submitted_at')
  }

  if (!(await hasReviewDbColumn(tableName, 'submitted_by_user_id'))) {
    try {
      await runReviewDbExecute<ExecuteResult>(
        `ALTER TABLE ${tableName} ADD COLUMN submitted_by_user_id BIGINT NULL AFTER submitted_at`,
      )
    } catch {
    }
    invalidateReviewDbColumnCache(tableName, 'submitted_by_user_id')
  }
}

async function ensureTroubleTicketSubmittedColumns() {
  const tableName = 'support_trouble_tickets'

  if (!(await hasReviewDbColumn(tableName, 'submitted_at'))) {
    try {
      await runReviewDbExecute<ExecuteResult>(
        `ALTER TABLE ${tableName} ADD COLUMN submitted_at DATETIME NULL AFTER closed_at`,
      )
    } catch {
    }
    invalidateReviewDbColumnCache(tableName, 'submitted_at')
  }

  if (!(await hasReviewDbColumn(tableName, 'submitted_by_user_id'))) {
    try {
      await runReviewDbExecute<ExecuteResult>(
        `ALTER TABLE ${tableName} ADD COLUMN submitted_by_user_id BIGINT NULL AFTER submitted_at`,
      )
    } catch {
    }
    invalidateReviewDbColumnCache(tableName, 'submitted_by_user_id')
  }
}

export async function ensureTechnicianSchemaFoundation() {
  await ensureTicketsUnifiedTable()
  await ensureTicketsTemporaryPeriodsTable()
  await ensureTicketWorkEvidencesTable()
  await ensureWorkOrderSubmittedColumns()
  await ensureTroubleTicketSubmittedColumns()
}
