import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

type HrAuditActionType =
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_ARCHIVE'
  | 'EMPLOYEE_REACTIVATE'
  | 'EMPLOYEE_FACE_REFERENCE_UPSERT'
  | 'ATTENDANCE_CREATE'
  | 'ATTENDANCE_UPDATE'
  | 'ATTENDANCE_GEOFENCE_CONFIG'
  | 'ATTENDANCE_FACE_CONFIG'
  | 'ATTENDANCE_FACE_REVIEW'
  | 'ATTENDANCE_FACE_RETAKE_QUEUE'
  | 'LOAN_CREATE'
  | 'SALARY_SLIP_CREATE'
  | 'LOAN_UPDATE'
  | 'LOAN_VOID'
  | 'SALARY_SLIP_RELEASE'
  | 'SALARY_SLIP_VOID'

type HrAuditRow = {
  id: number
  actionType: string
  actorName: string | null
  targetRef: string | null
  detailText: string | null
  createdAt: string
}

export type HrAuditItem = {
  id: string
  actionType: HrAuditActionType
  actor: string
  targetRef: string
  detail: string
  happenedAt: string
}

let auditTableEnsured = false

export async function ensureHrAuditTable() {
  if (auditTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      action_type ENUM('EMPLOYEE_CREATE','EMPLOYEE_ARCHIVE','EMPLOYEE_REACTIVATE','EMPLOYEE_FACE_REFERENCE_UPSERT','ATTENDANCE_CREATE','ATTENDANCE_UPDATE','ATTENDANCE_GEOFENCE_CONFIG','ATTENDANCE_FACE_CONFIG','ATTENDANCE_FACE_REVIEW','ATTENDANCE_FACE_RETAKE_QUEUE','LOAN_CREATE','SALARY_SLIP_CREATE','LOAN_UPDATE','LOAN_VOID','SALARY_SLIP_RELEASE','SALARY_SLIP_VOID') NOT NULL,
      actor_name VARCHAR(150) NOT NULL,
      target_ref VARCHAR(180) NOT NULL,
      detail_text TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_hr_audit_logs_created (created_at),
      KEY idx_hr_audit_logs_target (target_ref)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    ALTER TABLE hr_audit_logs
    MODIFY COLUMN action_type ENUM('EMPLOYEE_CREATE','EMPLOYEE_ARCHIVE','EMPLOYEE_REACTIVATE','EMPLOYEE_FACE_REFERENCE_UPSERT','ATTENDANCE_CREATE','ATTENDANCE_UPDATE','ATTENDANCE_GEOFENCE_CONFIG','ATTENDANCE_FACE_CONFIG','ATTENDANCE_FACE_REVIEW','ATTENDANCE_FACE_RETAKE_QUEUE','LOAN_CREATE','SALARY_SLIP_CREATE','LOAN_UPDATE','LOAN_VOID','SALARY_SLIP_RELEASE','SALARY_SLIP_VOID') NOT NULL
  `)

  auditTableEnsured = true
}

function normalizeActionType(value: string): HrAuditActionType {
  const normalized = value.trim().toUpperCase()
  if (
    normalized === 'EMPLOYEE_CREATE' ||
    normalized === 'EMPLOYEE_ARCHIVE' ||
    normalized === 'EMPLOYEE_REACTIVATE' ||
    normalized === 'EMPLOYEE_FACE_REFERENCE_UPSERT' ||
    normalized === 'ATTENDANCE_CREATE' ||
    normalized === 'ATTENDANCE_UPDATE' ||
    normalized === 'ATTENDANCE_GEOFENCE_CONFIG' ||
    normalized === 'ATTENDANCE_FACE_CONFIG' ||
    normalized === 'ATTENDANCE_FACE_REVIEW' ||
    normalized === 'ATTENDANCE_FACE_RETAKE_QUEUE' ||
    normalized === 'LOAN_CREATE' ||
    normalized === 'SALARY_SLIP_CREATE' ||
    normalized === 'LOAN_UPDATE' ||
    normalized === 'LOAN_VOID' ||
    normalized === 'SALARY_SLIP_RELEASE' ||
    normalized === 'SALARY_SLIP_VOID'
  ) {
    return normalized
  }

  return 'EMPLOYEE_CREATE'
}

export async function recordHrAudit(params: {
  actionType: HrAuditActionType
  actor: string
  targetRef: string
  detail: string
}) {
  await ensureHrAuditTable()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_audit_logs (
        action_type,
        actor_name,
        target_ref,
        detail_text
      )
      VALUES (?, ?, ?, ?)
    `,
    [params.actionType, params.actor, params.targetRef, params.detail]
  )
}

export async function getRecentHrAudits(limit = 12): Promise<HrAuditItem[]> {
  await ensureHrAuditTable()

  const rows = await runReviewDbQuery<HrAuditRow>(
    `
      SELECT
        id,
        action_type AS actionType,
        actor_name AS actorName,
        target_ref AS targetRef,
        detail_text AS detailText,
        created_at AS createdAt
      FROM hr_audit_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => ({
    id: `hr-audit-${row.id}`,
    actionType: normalizeActionType(row.actionType),
    actor: row.actorName?.trim() || 'System Review',
    targetRef: row.targetRef?.trim() || '-',
    detail: row.detailText?.trim() || 'Aktivitas HR tercatat.',
    happenedAt: String(row.createdAt),
  }))
}
