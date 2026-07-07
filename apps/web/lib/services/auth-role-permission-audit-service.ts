import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type AuditRow = {
  id: number
  actionType: string
  actorName: string | null
  roleCode: string | null
  detailText: string | null
  createdAt: string
}

let auditTableEnsured = false

export async function ensureAuthRolePermissionAuditTable() {
  if (auditTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS auth_role_permission_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      action_type ENUM('BOOTSTRAP','SET') NOT NULL,
      actor_name VARCHAR(150) NOT NULL,
      role_code VARCHAR(80) NOT NULL,
      detail_text TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `)

  auditTableEnsured = true
}

export async function recordAuthRolePermissionAudit(params: {
  actionType: 'BOOTSTRAP' | 'SET'
  actor: string
  roleCode: string
  detail: string
}) {
  await ensureAuthRolePermissionAuditTable()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO auth_role_permission_audit_logs (
        action_type,
        actor_name,
        role_code,
        detail_text
      )
      VALUES (?, ?, ?, ?)
    `,
    [params.actionType, params.actor, params.roleCode, params.detail || null]
  )
}

function normalizeActionType(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'BOOTSTRAP') {
    return 'BOOTSTRAP'
  }
  return 'SET'
}

export async function getRecentAuthRolePermissionAudits(limit = 16) {
  await ensureAuthRolePermissionAuditTable()

  const rows = await runReviewDbQuery<AuditRow>(
    `
      SELECT
        id,
        action_type AS actionType,
        actor_name AS actorName,
        role_code AS roleCode,
        detail_text AS detailText,
        created_at AS createdAt
      FROM auth_role_permission_audit_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => ({
    id: `role-perm-audit-${row.id}`,
    actionType: normalizeActionType(row.actionType),
    actor: row.actorName?.trim() || 'System Review',
    target: row.roleCode?.trim() || '-',
    detail: row.detailText?.trim() || 'Perubahan role permission tercatat.',
    happenedAt: String(row.createdAt),
  }))
}

