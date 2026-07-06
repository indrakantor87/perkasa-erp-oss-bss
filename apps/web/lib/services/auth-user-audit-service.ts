import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import type { AuthUserAuditItem } from '@/lib/types'

type ExecuteResult = {
  affectedRows?: number
}

type AuthUserAuditRow = {
  id: number
  actionType: string
  actorName: string | null
  targetUsername: string | null
  detailText: string | null
  createdAt: string
}

let auditTableEnsured = false

export async function ensureAuthUserAuditTable() {
  if (auditTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS auth_user_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      auth_user_id BIGINT UNSIGNED NOT NULL,
      action_type ENUM('CREATE','UPDATE','RESET_PASSWORD') NOT NULL,
      actor_name VARCHAR(150) NOT NULL,
      target_username VARCHAR(80) NOT NULL,
      detail_text TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_auth_user_audit_logs_user (auth_user_id),
      CONSTRAINT fk_auth_user_audit_logs_user FOREIGN KEY (auth_user_id) REFERENCES auth_users(id)
    )
  `)

  auditTableEnsured = true
}

export async function recordAuthUserAudit(params: {
  authUserId: number
  actionType: AuthUserAuditItem['actionType']
  actor: string
  targetUsername: string
  detail: string
}) {
  await ensureAuthUserAuditTable()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO auth_user_audit_logs (
        auth_user_id,
        action_type,
        actor_name,
        target_username,
        detail_text
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [params.authUserId, params.actionType, params.actor, params.targetUsername, params.detail]
  )
}

function normalizeActionType(value: string): AuthUserAuditItem['actionType'] {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'CREATE' || normalized === 'RESET_PASSWORD') {
    return normalized
  }

  return 'UPDATE'
}

export async function getRecentAuthUserAudits(limit = 12): Promise<AuthUserAuditItem[]> {
  await ensureAuthUserAuditTable()

  const rows = await runReviewDbQuery<AuthUserAuditRow>(
    `
      SELECT
        id,
        action_type AS actionType,
        actor_name AS actorName,
        target_username AS targetUsername,
        detail_text AS detailText,
        created_at AS createdAt
      FROM auth_user_audit_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => ({
    id: `audit-${row.id}`,
    actionType: normalizeActionType(row.actionType),
    actor: row.actorName?.trim() || 'System Review',
    targetUser: row.targetUsername?.trim() || '-',
    detail: row.detailText?.trim() || 'Perubahan user internal tercatat.',
    happenedAt: String(row.createdAt),
  }))
}
