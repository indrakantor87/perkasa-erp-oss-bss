import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type AuditRow = {
  id: number
  actionType: string
  actorName: string | null
  targetCode: string | null
  detailText: string | null
  createdAt: string
}

let auditTableEnsured = false

export async function ensureAuthPermissionAuditTable() {
  if (auditTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS auth_permission_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      action_type ENUM('BOOTSTRAP','CREATE','UPDATE','DELETE') NOT NULL,
      actor_name VARCHAR(150) NOT NULL,
      target_code VARCHAR(150) NULL,
      detail_text TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `)

  auditTableEnsured = true
}

export async function recordAuthPermissionAudit(params: {
  actionType: 'BOOTSTRAP' | 'CREATE' | 'UPDATE' | 'DELETE'
  actor: string
  targetCode: string
  detail: string
}) {
  await ensureAuthPermissionAuditTable()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO auth_permission_audit_logs (
        action_type,
        actor_name,
        target_code,
        detail_text
      )
      VALUES (?, ?, ?, ?)
    `,
    [params.actionType, params.actor, params.targetCode || null, params.detail || null]
  )
}

function normalizeActionType(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'BOOTSTRAP' || normalized === 'CREATE' || normalized === 'UPDATE') {
    return normalized
  }
  return 'DELETE'
}

export async function getRecentAuthPermissionAudits(limit = 16) {
  await ensureAuthPermissionAuditTable()

  const rows = await runReviewDbQuery<AuditRow>(
    `
      SELECT
        id,
        action_type AS actionType,
        actor_name AS actorName,
        target_code AS targetCode,
        detail_text AS detailText,
        created_at AS createdAt
      FROM auth_permission_audit_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => ({
    id: `perm-audit-${row.id}`,
    actionType: normalizeActionType(row.actionType),
    actor: row.actorName?.trim() || 'System Review',
    target: row.targetCode?.trim() || '-',
    detail: row.detailText?.trim() || 'Perubahan permission tercatat.',
    happenedAt: String(row.createdAt),
  }))
}

