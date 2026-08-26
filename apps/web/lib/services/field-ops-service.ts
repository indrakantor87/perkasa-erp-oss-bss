import {
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
  type ReviewDbConnection,
} from '@/lib/review-db'
import type { AppRole } from '@/lib/types'
import {
  Q3_ASSIGNMENT_ACTIVE_STATUSES,
  Q3_ASSIGNMENT_ROLE_CANONICAL,
} from '@/lib/q3-field-tech-ownership'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type WorkOrderNoRow = {
  workOrderNo: string | null
}

type ReviewAuthUserRow = {
  id: number
}

export type ServiceWorkOrderInsertParams = {
  salesOrderId?: number | null
  subscriptionId?: number | null
  troubleTicketId?: number | null
  workOrderNo: string
  workType: string
  status: string
  technicianName?: string | null
  scheduledAt?: Date | null
  startedAt?: Date | null
  completedAt?: Date | null
  notes?: string | null
  branchId?: number | null
  jobCategory?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null
  sourceType?: 'SALES_ORDER' | 'TROUBLE_TICKET' | 'MANUAL' | null
  currentPicUserId?: number | null
  scheduledByUserId?: number | null
  closedByUserId?: number | null
  slaDueAt?: Date | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function ensureServiceWorkOrderAssignmentColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('service_work_order_assignments', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE service_work_order_assignments
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('service_work_order_assignments', columnName)
}

async function ensureServiceWorkOrderStatusLogColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('service_work_order_status_logs', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE service_work_order_status_logs
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('service_work_order_status_logs', columnName)
}

export async function ensureServiceWorkOrderAssignmentTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS service_work_order_assignments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        work_order_id BIGINT UNSIGNED NOT NULL,
        assigned_user_id BIGINT UNSIGNED NOT NULL,
        assignment_role VARCHAR(50) NOT NULL DEFAULT 'FIELD_TECHNICIAN',
        assignment_status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME NULL,
        released_at DATETIME NULL,
        notes TEXT NULL,
        assigned_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_swo_assignments_wo (work_order_id),
        KEY idx_swo_assignments_user (assigned_user_id),
        KEY idx_swo_assignments_status (assignment_status),
        CONSTRAINT fk_swo_assignments_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id),
        CONSTRAINT fk_swo_assignments_user FOREIGN KEY (assigned_user_id) REFERENCES auth_users(id)
      )
    `,
  )

  await ensureServiceWorkOrderAssignmentColumn(
    'assignment_role',
    "assignment_role VARCHAR(50) NOT NULL DEFAULT 'FIELD_TECHNICIAN'",
    'assigned_user_id',
  )
  await ensureServiceWorkOrderAssignmentColumn(
    'assignment_status',
    "assignment_status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED'",
    'assignment_role',
  )
  await ensureServiceWorkOrderAssignmentColumn('is_primary', 'is_primary TINYINT(1) NOT NULL DEFAULT 0', 'assignment_status')
  await ensureServiceWorkOrderAssignmentColumn(
    'assigned_at',
    'assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'is_primary',
  )
  await ensureServiceWorkOrderAssignmentColumn('accepted_at', 'accepted_at DATETIME NULL', 'assigned_at')
  await ensureServiceWorkOrderAssignmentColumn('released_at', 'released_at DATETIME NULL', 'accepted_at')
  await ensureServiceWorkOrderAssignmentColumn('notes', 'notes TEXT NULL', 'released_at')
  await ensureServiceWorkOrderAssignmentColumn('assigned_by_user_id', 'assigned_by_user_id BIGINT UNSIGNED NULL', 'notes')
  await ensureServiceWorkOrderAssignmentColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'assigned_by_user_id',
  )
  await ensureServiceWorkOrderAssignmentColumn(
    'updated_at',
    'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'created_at',
  )
  try {
    await runReviewDbTransaction(async (conn) => {
      const legacyRole = 'TECHNICIAN'
      const canonicalRole = 'FIELD_TECHNICIAN'
      const unknownQ = await conn.query(
        `SELECT COUNT(*) AS cnt FROM service_work_order_assignments WHERE TRIM(UPPER(COALESCE(assignment_role,''))) NOT IN (?, ?)`,
        [legacyRole, canonicalRole],
      )
      const unknownRows = unknownQ as unknown as Array<{ cnt: number }> | undefined
      const unknownCount = Number(unknownRows?.[0]?.cnt ?? 0)
      if (unknownCount > 0) {
        throw new Error(
          `Backfill aborted: ${unknownCount} assignment rows have unsupported assignment_role values. Refusing to proceed without PO/QA decision.`,
        )
      }
      const beforeQ = await conn.query(
        `SELECT COUNT(*) AS cnt FROM service_work_order_assignments WHERE TRIM(UPPER(COALESCE(assignment_role,''))) = ?`,
        [legacyRole],
      )
      const beforeRows = beforeQ as unknown as Array<{ cnt: number }> | undefined
      const legacyCount = Number(beforeRows?.[0]?.cnt ?? 0)
      if (legacyCount <= 0) return
      const updateQ = await conn.query(
        `UPDATE service_work_order_assignments SET assignment_role = ? WHERE TRIM(UPPER(COALESCE(assignment_role,''))) = ?`,
        [canonicalRole, legacyRole],
      )
      const updateResult = updateQ as unknown as { affectedRows?: number } | undefined
      const updatedCount = Number(updateResult?.affectedRows ?? 0)
      if (updatedCount !== legacyCount) {
        throw new Error(
          `Backfill mismatch: expected ${legacyCount} legacy TECHNICIAN rows, but UPDATE affected ${updatedCount}. Rollback.`,
        )
      }
      const afterQ = await conn.query(
        `SELECT COUNT(*) AS cnt FROM service_work_order_assignments WHERE TRIM(UPPER(COALESCE(assignment_role,''))) = ?`,
        [legacyRole],
      )
      const afterRows = afterQ as unknown as Array<{ cnt: number }> | undefined
      const remainingLegacy = Number(afterRows?.[0]?.cnt ?? 0)
      if (remainingLegacy !== 0) {
        throw new Error(
          `Backfill failed: ${remainingLegacy} legacy TECHNICIAN rows remaining after UPDATE. Rollback.`,
        )
      }
    })
  } catch (err) {
    if (String(err instanceof Error ? err.message : String(err)).includes('belum tersedia')) {
      // review-db pool disabled on environments without DB access; skip silently until DB is reachable.
    } else {
      throw err
    }
  }
}

export async function ensureServiceWorkOrderStatusLogTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS service_work_order_status_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        work_order_id BIGINT UNSIGNED NOT NULL,
        from_status VARCHAR(50) NULL,
        to_status VARCHAR(50) NOT NULL,
        reason_code VARCHAR(50) NULL,
        reason_notes TEXT NULL,
        changed_by_user_id BIGINT UNSIGNED NULL,
        changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_swo_status_logs_wo (work_order_id),
        KEY idx_swo_status_logs_status (to_status),
        CONSTRAINT fk_swo_status_logs_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id)
      )
    `,
  )

  await ensureServiceWorkOrderStatusLogColumn('from_status', 'from_status VARCHAR(50) NULL', 'work_order_id')
  await ensureServiceWorkOrderStatusLogColumn('to_status', 'to_status VARCHAR(50) NOT NULL', 'from_status')
  await ensureServiceWorkOrderStatusLogColumn('reason_code', 'reason_code VARCHAR(50) NULL', 'to_status')
  await ensureServiceWorkOrderStatusLogColumn('reason_notes', 'reason_notes TEXT NULL', 'reason_code')
  await ensureServiceWorkOrderStatusLogColumn('changed_by_user_id', 'changed_by_user_id BIGINT UNSIGNED NULL', 'reason_notes')
  await ensureServiceWorkOrderStatusLogColumn(
    'changed_at',
    'changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'changed_by_user_id',
  )
  await ensureServiceWorkOrderStatusLogColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'changed_at',
  )
}

export async function resolveReviewAuthUserIdByUsername(username: string) {
  const normalizedUsername = username.trim().toLowerCase()
  if (!normalizedUsername) {
    return null
  }

  const rows = await runReviewDbQuery<ReviewAuthUserRow>(
    `
      SELECT id
      FROM auth_users
      WHERE LOWER(username) = ?
      LIMIT 1
    `,
    [normalizedUsername],
  ).catch(() => [])

  const resolvedId = Number(rows[0]?.id)
  return Number.isInteger(resolvedId) && resolvedId > 0 ? resolvedId : null
}

export async function generateServiceWorkOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `WO-${year}${month}-%`
  const rows = await runReviewDbQuery<WorkOrderNoRow>(
    `
      SELECT work_order_no AS workOrderNo
      FROM service_work_orders
      WHERE work_order_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.workOrderNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `WO-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

export async function buildServiceWorkOrderInsertPayload(params: ServiceWorkOrderInsertParams) {
  const [
    hasSalesOrderId,
    hasSubscriptionId,
    hasTroubleTicketId,
    hasWorkOrderNo,
    hasWorkType,
    hasStatus,
    hasTechnicianName,
    hasScheduledAt,
    hasStartedAt,
    hasCompletedAt,
    hasNotes,
    hasBranchId,
    hasJobCategory,
    hasPriority,
    hasSourceType,
    hasCurrentPicUserId,
    hasScheduledByUserId,
    hasClosedByUserId,
    hasSlaDueAt,
    hasAddress,
    hasLatitude,
    hasLongitude,
  ] = await Promise.all([
    hasReviewDbColumn('service_work_orders', 'sales_order_id'),
    hasReviewDbColumn('service_work_orders', 'subscription_id'),
    hasReviewDbColumn('service_work_orders', 'trouble_ticket_id'),
    hasReviewDbColumn('service_work_orders', 'work_order_no'),
    hasReviewDbColumn('service_work_orders', 'work_type'),
    hasReviewDbColumn('service_work_orders', 'status'),
    hasReviewDbColumn('service_work_orders', 'technician_name'),
    hasReviewDbColumn('service_work_orders', 'scheduled_at'),
    hasReviewDbColumn('service_work_orders', 'started_at'),
    hasReviewDbColumn('service_work_orders', 'completed_at'),
    hasReviewDbColumn('service_work_orders', 'notes'),
    hasReviewDbColumn('service_work_orders', 'branch_id'),
    hasReviewDbColumn('service_work_orders', 'job_category'),
    hasReviewDbColumn('service_work_orders', 'priority'),
    hasReviewDbColumn('service_work_orders', 'source_type'),
    hasReviewDbColumn('service_work_orders', 'current_pic_user_id'),
    hasReviewDbColumn('service_work_orders', 'scheduled_by_user_id'),
    hasReviewDbColumn('service_work_orders', 'closed_by_user_id'),
    hasReviewDbColumn('service_work_orders', 'sla_due_at'),
    hasReviewDbColumn('service_work_orders', 'address'),
    hasReviewDbColumn('service_work_orders', 'latitude'),
    hasReviewDbColumn('service_work_orders', 'longitude'),
  ])

  if (!hasWorkOrderNo || !hasStatus) {
    throw new Error('Schema inti service_work_orders belum siap. Kolom work_order_no dan status wajib tersedia.')
  }

  const columns = ['work_order_no', 'status']
  const values: unknown[] = [params.workOrderNo, params.status]

  if (hasSalesOrderId) {
    columns.push('sales_order_id')
    values.push(params.salesOrderId ?? null)
  }
  if (hasSubscriptionId) {
    columns.push('subscription_id')
    values.push(params.subscriptionId ?? null)
  }
  if (hasTroubleTicketId) {
    columns.push('trouble_ticket_id')
    values.push(params.troubleTicketId ?? null)
  }
  if (hasWorkType) {
    columns.push('work_type')
    values.push(params.workType)
  }
  if (hasTechnicianName) {
    columns.push('technician_name')
    values.push(params.technicianName ?? null)
  }
  if (hasScheduledAt) {
    columns.push('scheduled_at')
    values.push(params.scheduledAt ?? null)
  }
  if (hasStartedAt) {
    columns.push('started_at')
    values.push(params.startedAt ?? null)
  }
  if (hasCompletedAt) {
    columns.push('completed_at')
    values.push(params.completedAt ?? null)
  }
  if (hasNotes) {
    columns.push('notes')
    values.push(params.notes ?? null)
  }
  if (hasBranchId) {
    columns.push('branch_id')
    values.push(params.branchId ?? null)
  }
  if (hasJobCategory) {
    columns.push('job_category')
    values.push(params.jobCategory ?? null)
  }
  if (hasPriority) {
    columns.push('priority')
    values.push(params.priority ?? 'MEDIUM')
  }
  if (hasSourceType) {
    columns.push('source_type')
    values.push(params.sourceType ?? null)
  }
  if (hasCurrentPicUserId) {
    columns.push('current_pic_user_id')
    values.push(params.currentPicUserId ?? null)
  }
  if (hasScheduledByUserId) {
    columns.push('scheduled_by_user_id')
    values.push(params.scheduledByUserId ?? null)
  }
  if (hasClosedByUserId) {
    columns.push('closed_by_user_id')
    values.push(params.closedByUserId ?? null)
  }
  if (hasSlaDueAt) {
    columns.push('sla_due_at')
    values.push(params.slaDueAt ?? null)
  }
  if (hasAddress) {
    columns.push('address')
    values.push(params.address ?? null)
  }
  if (hasLatitude) {
    columns.push('latitude')
    values.push(params.latitude ?? null)
  }
  if (hasLongitude) {
    columns.push('longitude')
    values.push(params.longitude ?? null)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

export async function insertServiceWorkOrderAssignment(params: {
  workOrderId: number
  assignedUserId: number
  assignedByUserId?: number | null
  assignmentRole?: string
  assignmentStatus?: string
  isPrimary?: boolean
  notes?: string | null
  connection?: ReviewDbConnection
}) {
  await ensureServiceWorkOrderAssignmentTable()
  const values = [
    params.workOrderId,
    params.assignedUserId,
    params.assignmentRole ?? 'FIELD_TECHNICIAN',
    params.assignmentStatus ?? 'ASSIGNED',
    params.isPrimary ? 1 : 0,
    params.notes ?? null,
    params.assignedByUserId ?? null,
  ]
  const sql = `
      INSERT INTO service_work_order_assignments (
        work_order_id,
        assigned_user_id,
        assignment_role,
        assignment_status,
        is_primary,
        assigned_at,
        notes,
        assigned_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `
  if (params.connection) {
    await params.connection.query(sql, values)
    return
  }
  await runReviewDbExecute<ExecuteResult>(sql, values)
}

export async function releaseServiceWorkOrderAssignment(params: {
  assignmentId: number
  sessionUserId: number | undefined | null
  authorizationScope?: 'SELF_ONLY' | 'FULL_ACCESS'
  connection?: ReviewDbConnection
}): Promise<{ affectedRows: number }> {
  await ensureServiceWorkOrderAssignmentTable()
  const userIdRaw = params.sessionUserId
  const userIdNum = Number(userIdRaw ?? 0)
  const hasValidUserId = Number.isInteger(userIdNum) && userIdNum > 0
  const activeStatuses = [...Q3_ASSIGNMENT_ACTIVE_STATUSES]
  const scope = params.authorizationScope ?? 'SELF_ONLY'
  if (!Number.isInteger(params.assignmentId) || params.assignmentId <= 0) {
    return { affectedRows: 0 }
  }
  if (scope === 'SELF_ONLY' && !hasValidUserId) {
    return { affectedRows: 0 }
  }
  const activePlaceholders = activeStatuses.map(() => '?').join(', ')
  const bindValues: unknown[] = [
    Q3_ASSIGNMENT_ROLE_CANONICAL,
    ...activeStatuses,
  ]
  if (scope === 'SELF_ONLY') {
    bindValues.push(userIdNum)
  }
  bindValues.push(params.assignmentId)
  const selfClause = scope === 'SELF_ONLY' ? 'AND assigned_user_id = ?' : ''
  const sql = `
      UPDATE service_work_order_assignments
      SET
        assignment_status = 'RELEASED',
        released_at = CURRENT_TIMESTAMP
      WHERE
        assignment_role = ?
        AND assignment_status IN (${activePlaceholders})
        AND released_at IS NULL
        ${selfClause}
        AND id = ?
      LIMIT 1
    `
  let affectedRows = 0
  if (params.connection) {
    const [result] = await params.connection.query(sql, bindValues)
    affectedRows = Number((result as ExecuteResult | undefined)?.affectedRows ?? 0)
  } else {
    const execResult = await runReviewDbExecute<ExecuteResult>(sql, bindValues)
    affectedRows = Number(execResult?.affectedRows ?? 0)
  }
  return { affectedRows }
}

export async function insertServiceWorkOrderStatusLog(params: {
  workOrderId: number
  fromStatus?: string | null
  toStatus: string
  changedByUserId?: number | null
  reasonCode?: string | null
  reasonNotes?: string | null
}) {
  await ensureServiceWorkOrderStatusLogTable()
  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO service_work_order_status_logs (
        work_order_id,
        from_status,
        to_status,
        reason_code,
        reason_notes,
        changed_by_user_id,
        changed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      params.workOrderId,
      params.fromStatus ?? null,
      params.toStatus,
      params.reasonCode ?? null,
      params.reasonNotes ?? null,
      params.changedByUserId ?? null,
    ],
  )
}

export type ReassignFieldTechAuthorizationScope = 'SELF_ONLY' | 'FULL_ACCESS'

export type ReassignFieldTechSession = {
  userId: number | undefined | null
  role: AppRole
}

const REASSIGN_FULL_ACCESS_ROLES: readonly AppRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'NOC_OPERATOR',
  'TT_OPERATOR',
] as const

export type ReassignServiceWorkOrderAssignmentResult = {
  affectedRows: number
  newAssignmentId: number | null
  alreadyDone: boolean
  workOrderId: number | null
}

type AssignmentARow = {
  id: number
  work_order_id: number
  assigned_user_id: number
  assignment_role: string
  assignment_status: string
  is_primary: number
  released_at: Date | string | null
}

type CountRow = { total: number }

type TechBValidationRow = {
  id: number
  status: string
  role_code: string
}

function resolveReassignAuthorizationScope(
  sessionRole: AppRole | undefined | null,
  sessionUserId: number | undefined | null,
): ReassignFieldTechAuthorizationScope | 'DENY' {
  const userIdNum = Number(sessionUserId ?? 0)
  if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
    return 'DENY'
  }
  const role = (sessionRole ?? '').toString().trim().toUpperCase() as AppRole
  if (role === 'FIELD_TECHNICIAN') {
    return 'SELF_ONLY'
  }
  if (REASSIGN_FULL_ACCESS_ROLES.includes(role as (typeof REASSIGN_FULL_ACCESS_ROLES)[number])) {
    return 'FULL_ACCESS'
  }
  return 'DENY'
}

function buildActiveWhereParts(prefix: string) {
  const activePlaceholders = Q3_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')
  const statuses = [...Q3_ASSIGNMENT_ACTIVE_STATUSES]
  return {
    sql: `${prefix}assignment_role = ? AND ${prefix}assignment_status IN (${activePlaceholders}) AND ${prefix}released_at IS NULL`,
    values: [Q3_ASSIGNMENT_ROLE_CANONICAL, ...statuses],
  }
}

export async function reassignServiceWorkOrderAssignment(params: {
  assignmentAId: number
  targetTechBId: number
  session: ReassignFieldTechSession
}): Promise<ReassignServiceWorkOrderAssignmentResult> {
  const assignmentAIdNum = Number(params.assignmentAId ?? 0)
  const targetTechBNum = Number(params.targetTechBId ?? 0)
  const validA = Number.isInteger(assignmentAIdNum) && assignmentAIdNum > 0
  const validB = Number.isInteger(targetTechBNum) && targetTechBNum > 0
  if (!validA || !validB) {
    return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId: null }
  }

  const actorUserIdRaw = params.session?.userId
  const actorUserIdNum = Number(actorUserIdRaw ?? 0)
  if (!Number.isInteger(actorUserIdNum) || actorUserIdNum <= 0) {
    return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId: null }
  }
  const scope = resolveReassignAuthorizationScope(params.session.role, actorUserIdNum)
  if (scope === 'DENY') {
    return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId: null }
  }

  await ensureServiceWorkOrderAssignmentTable()

  return runReviewDbTransaction<ReassignServiceWorkOrderAssignmentResult>(async (connection) => {
    const lockTechASql = `
      SELECT id, work_order_id, assigned_user_id, assignment_role, assignment_status, is_primary, released_at
      FROM service_work_order_assignments
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [lockTechARows] = await connection.query(lockTechASql, [assignmentAIdNum])
    const techA = (lockTechARows as AssignmentARow[])[0]
    if (!techA) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId: null }
    }
    const workOrderId = Number(techA.work_order_id ?? 0)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId: null }
    }

    const lockWoActiveParts = buildActiveWhereParts('')
    const lockWoScopeSql = `
      SELECT id
      FROM service_work_order_assignments
      WHERE work_order_id = ? AND ${lockWoActiveParts.sql}
      FOR UPDATE
    `
    await connection.query(lockWoScopeSql, [workOrderId, ...lockWoActiveParts.values])

    const techAReleased =
      techA.released_at != null || String(techA.assignment_status ?? '').trim().toUpperCase() === 'RELEASED'

    const idemActiveParts = buildActiveWhereParts('a')
    const idemCheckSql = `
      SELECT a.id AS existing_tech_b_id
      FROM service_work_order_assignments a
      WHERE
        a.work_order_id = ?
        AND a.assigned_user_id = ?
        AND ${idemActiveParts.sql}
      LIMIT 1
    `
    const idemValues: unknown[] = [workOrderId, targetTechBNum, ...idemActiveParts.values]
    const [idemRows] = await connection.query(idemCheckSql, idemValues)
    const techBAlreadyActive = (idemRows as { existing_tech_b_id: number }[])[0] ?? null
    if (techAReleased && techBAlreadyActive) {
      return {
        affectedRows: 1,
        newAssignmentId: Number(techBAlreadyActive.existing_tech_b_id ?? 0) || null,
        alreadyDone: true,
        workOrderId,
      }
    }

    if (targetTechBNum === Number(techA.assigned_user_id ?? 0) && !techAReleased) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId }
    }

    const techBValidationSql = `
      SELECT au.id AS id,
             au.status AS status,
             ar.code AS role_code
      FROM auth_users au
      JOIN auth_roles ar
        ON ar.id = au.role_id
      WHERE au.id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [techBRows] = await connection.query(techBValidationSql, [targetTechBNum])
    const techB = (techBRows as TechBValidationRow[])[0]
    if (!techB) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId }
    }
    const statusUp = String(techB.status ?? '').trim().toUpperCase()
    if (statusUp !== 'ACTIVE') {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId }
    }
    const roleUp = String(techB.role_code ?? '').trim().toUpperCase()
    if (roleUp !== 'TEKNISI' && roleUp !== 'TEKNISI_PSB') {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId }
    }

    const dupParts = buildActiveWhereParts('d')
    const dupCheckSql = `
      SELECT COUNT(*) AS total
      FROM service_work_order_assignments d
      WHERE
        d.work_order_id = ?
        AND d.assigned_user_id = ?
        AND ${dupParts.sql}
    `
    const dupValues: unknown[] = [workOrderId, targetTechBNum, ...dupParts.values]
    const [dupRows] = await connection.query(dupCheckSql, dupValues)
    const dupTotal = Number((dupRows as CountRow[])[0]?.total ?? 0)
    if (dupTotal > 0) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId }
    }

    if (!techAReleased) {
      const releaseRes = await releaseServiceWorkOrderAssignment({
        assignmentId: assignmentAIdNum,
        sessionUserId: scope === 'SELF_ONLY' ? actorUserIdNum : null,
        authorizationScope: scope,
        connection,
      })
      if (releaseRes.affectedRows < 1) {
        return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, workOrderId }
      }
    }

    const postReleaseParts = buildActiveWhereParts('p')
    const postReleaseCountSql = `
      SELECT COUNT(*) AS total
      FROM service_work_order_assignments p
      WHERE
        p.work_order_id = ?
        AND ${postReleaseParts.sql}
    `
    const [postCountRows] = await connection.query(postReleaseCountSql, [
      workOrderId,
      ...postReleaseParts.values,
    ])
    const postTotal = Number((postCountRows as CountRow[])[0]?.total ?? 0)
    if (postTotal > 0) {
      throw new Error('Masih ada field technician aktif lain pada work order ini.')
    }

    const postPrimParts = buildActiveWhereParts('q')
    const postPrimSql = `
      SELECT COUNT(*) AS total
      FROM service_work_order_assignments q
      WHERE
        q.work_order_id = ?
        AND q.is_primary = 1
        AND ${postPrimParts.sql}
    `
    const [primCountRows] = await connection.query(postPrimSql, [
      workOrderId,
      ...postPrimParts.values,
    ])
    const primTotal = Number((primCountRows as CountRow[])[0]?.total ?? 0)
    if (primTotal > 0) {
      throw new Error('Masih ada assignment aktif dengan primary flag pada work order ini.')
    }

    await insertServiceWorkOrderAssignment({
      workOrderId,
      assignedUserId: targetTechBNum,
      assignedByUserId: actorUserIdNum,
      assignmentRole: Q3_ASSIGNMENT_ROLE_CANONICAL,
      assignmentStatus: 'ASSIGNED',
      isPrimary: true,
      notes: null,
      connection,
    })

    const lastInsertSql = 'SELECT LAST_INSERT_ID() AS insert_id'
    const [lastRows] = await connection.query(lastInsertSql, [])
    const newAssignmentId = Number((lastRows as { insert_id: number }[])[0]?.insert_id ?? 0) || null

    return {
      affectedRows: 1,
      newAssignmentId,
      alreadyDone: false,
      workOrderId,
    }
  })
}
