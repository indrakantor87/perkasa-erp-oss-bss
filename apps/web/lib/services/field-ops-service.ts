import {
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
  type ReviewDbConnection,
} from '@/lib/review-db'
import type { AppRole } from '@/lib/types'
import { canPerformAction } from '@/lib/access-control'
import {
  Q3_ASSIGNMENT_ACTIVE_STATUSES,
  Q3_ASSIGNMENT_ROLE_CANONICAL,
} from '@/lib/q3-field-tech-ownership'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'
import { ensureInventoryRequestTable } from '@/lib/services/inventory-request-service'

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
        accepted_by_user_id BIGINT UNSIGNED NULL,
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
    'accepted_by_user_id',
    'accepted_by_user_id BIGINT UNSIGNED NULL',
    'assigned_by_user_id',
  )
  await ensureServiceWorkOrderAssignmentColumn(
    'released_by_user_id',
    'released_by_user_id BIGINT UNSIGNED NULL',
    'accepted_by_user_id',
  )
  await ensureServiceWorkOrderAssignmentColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'released_by_user_id',
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

export async function insertServiceWorkOrder(
  params: ServiceWorkOrderInsertParams,
  opts?: { connection?: ReviewDbConnection },
): Promise<{ insertId: number; workOrderNo: string; affectedRows: number }> {
  await ensureServiceWorkOrderStatusLogTable()
  const payload = await buildServiceWorkOrderInsertPayload(params)
  const sql = `INSERT INTO service_work_orders (${payload.columns.join(', ')}) VALUES (${payload.placeholders.join(', ')})`

  let result: ExecuteResult
  if (opts?.connection) {
    const [res] = await opts.connection.query(sql, payload.values)
    result = res as unknown as ExecuteResult
  } else {
    result = await runReviewDbExecute<ExecuteResult>(sql, payload.values)
  }

  const insertId = Number(result.insertId ?? 0)
  const affectedRows = Number(result.affectedRows ?? 0)
  if (!Number.isInteger(insertId) || insertId <= 0) {
    throw new Error('Work order insert result tidak memuat insertId yang valid.')
  }
  return { insertId, workOrderNo: params.workOrderNo, affectedRows }
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
  releasedByUserId?: number | undefined | null
  connection?: ReviewDbConnection
}): Promise<{ affectedRows: number }> {
  await ensureServiceWorkOrderAssignmentTable()
  const userIdRaw = params.sessionUserId
  const userIdNum = Number(userIdRaw ?? 0)
  const hasValidUserId = Number.isInteger(userIdNum) && userIdNum > 0
  const releasedByRaw = params.releasedByUserId
  const releasedByNum = Number(releasedByRaw ?? 0)
  const hasValidReleasedBy = Number.isInteger(releasedByNum) && releasedByNum > 0
  const activeStatuses = [...Q3_ASSIGNMENT_ACTIVE_STATUSES]
  const scope = params.authorizationScope ?? 'SELF_ONLY'
  if (!Number.isInteger(params.assignmentId) || params.assignmentId <= 0) {
    return { affectedRows: 0 }
  }
  if (scope === 'SELF_ONLY' && !hasValidUserId) {
    return { affectedRows: 0 }
  }
  if (!hasValidReleasedBy) {
    return { affectedRows: 0 }
  }
  const activePlaceholders = activeStatuses.map(() => '?').join(', ')
  const bindValues: unknown[] = [
    releasedByNum,
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
        released_at = CURRENT_TIMESTAMP,
        released_by_user_id = ?
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

export type AcceptFieldTechSession = {
  userId: number | undefined | null
  role: AppRole
}

export type AcceptServiceWorkOrderAssignmentResult = {
  affectedRows: number
  accepted: boolean
  alreadyAccepted: boolean
  workOrderId: number | null
}

type AcceptAssignmentLockRow = {
  id: number
  work_order_id: number
  assigned_user_id: number
  assignment_role: string
  assignment_status: string
  released_at: Date | string | null
}

function resolveAcceptAuthorizationScope(
  sessionRole: AppRole | undefined | null,
  sessionUserId: number | undefined | null,
): 'SELF_ONLY' | 'DENY' {
  const userIdNum = Number(sessionUserId ?? 0)
  if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
    return 'DENY'
  }
  const role = (sessionRole ?? '').toString().trim().toUpperCase() as AppRole
  if (role === 'FIELD_TECHNICIAN') {
    return 'SELF_ONLY'
  }
  return 'DENY'
}

export async function acceptServiceWorkOrderAssignment(params: {
  assignmentId: number
  session: AcceptFieldTechSession
  connection?: ReviewDbConnection
}): Promise<AcceptServiceWorkOrderAssignmentResult> {
  const assignmentIdNum = Number(params.assignmentId ?? 0)
  if (!Number.isInteger(assignmentIdNum) || assignmentIdNum <= 0) {
    return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId: null }
  }
  const actorUserIdRaw = params.session?.userId
  const actorUserIdNum = Number(actorUserIdRaw ?? 0)
  if (!Number.isInteger(actorUserIdNum) || actorUserIdNum <= 0) {
    return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId: null }
  }
  const scope = resolveAcceptAuthorizationScope(params.session.role, actorUserIdNum)
  if (scope === 'DENY') {
    return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId: null }
  }

  await ensureServiceWorkOrderAssignmentTable()

  async function doAccept(
    conn: ReviewDbConnection,
  ): Promise<AcceptServiceWorkOrderAssignmentResult> {
    const lockSql = `
      SELECT id, work_order_id, assigned_user_id, assignment_role, assignment_status, released_at
      FROM service_work_order_assignments
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [lockRows] = await conn.query(lockSql, [assignmentIdNum])
    const assignment = (lockRows as AcceptAssignmentLockRow[])[0]
    if (!assignment) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId: null }
    }
    const workOrderId = Number(assignment.work_order_id ?? 0)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId: null }
    }

    const roleUp = String(assignment.assignment_role ?? '').trim().toUpperCase()
    if (roleUp !== String(Q3_ASSIGNMENT_ROLE_CANONICAL).trim().toUpperCase()) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId }
    }
    if (scope === 'SELF_ONLY' && Number(assignment.assigned_user_id ?? 0) !== actorUserIdNum) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId }
    }

    const statusUp = String(assignment.assignment_status ?? '').trim().toUpperCase()
    const isReleased = assignment.released_at != null || statusUp === 'RELEASED'

    if (statusUp === 'ACCEPTED' && !isReleased) {
      return { affectedRows: 1, accepted: true, alreadyAccepted: true, workOrderId }
    }
    if (isReleased) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId }
    }
    if (statusUp !== 'ASSIGNED') {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId }
    }

    const updateSql = `
      UPDATE service_work_order_assignments
      SET
        assignment_status = 'ACCEPTED',
        accepted_at = CURRENT_TIMESTAMP,
        accepted_by_user_id = ?
      WHERE
        id = ?
        AND assignment_role = ?
        AND assignment_status = 'ASSIGNED'
        AND released_at IS NULL
        AND assigned_user_id = ?
      LIMIT 1
    `
    const updateBind: unknown[] = [
      actorUserIdNum,
      assignmentIdNum,
      Q3_ASSIGNMENT_ROLE_CANONICAL,
      actorUserIdNum,
    ]
    const [updateResult] = await conn.query(updateSql, updateBind)
    const affectedRows = Number((updateResult as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affectedRows <= 0) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, workOrderId }
    }

    const [woStatusRowsRaw] = await conn.query(
      `
        SELECT id, status, started_at, notes, updated_at
        FROM service_work_orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [workOrderId],
    )
    const woStatusRow = (woStatusRowsRaw as Array<Record<string, unknown>> | undefined)?.[0]
    if (woStatusRow) {
      const woFromStatus = String(woStatusRow.status ?? 'OPEN').trim().toUpperCase()
      const [hasStatusCol, hasStartedAtCol, hasUpdatedAtCol, hasNotesCol] = await Promise.all([
        hasReviewDbColumn('service_work_orders', 'status'),
        hasReviewDbColumn('service_work_orders', 'started_at'),
        hasReviewDbColumn('service_work_orders', 'updated_at'),
        hasReviewDbColumn('service_work_orders', 'notes'),
      ])
      const setParts: string[] = []
      const setValues: unknown[] = []
      if (hasStatusCol) {
        setParts.push('status = ?')
        setValues.push('ACCEPTED')
      }
      if (hasStartedAtCol) {
        setParts.push('started_at = COALESCE(started_at, CURRENT_TIMESTAMP)')
      }
      if (hasUpdatedAtCol) {
        setParts.push('updated_at = CURRENT_TIMESTAMP')
      }
      if (hasNotesCol && !String(woStatusRow.notes ?? '').trim()) {
        setParts.push("notes = CONCAT(COALESCE(notes, ''), ?)")
        setValues.push(`[TECH_ACCEPT] user#${actorUserIdNum} on ${new Date().toISOString().slice(0, 10)}\n`)
      }
      if (setParts.length) {
        setValues.push(workOrderId)
        const woUpdSql = `UPDATE service_work_orders SET ${setParts.join(', ')} WHERE id = ? LIMIT 1`
        await conn.query(woUpdSql, setValues).catch(() => null)
      }
      await insertServiceWorkOrderStatusLog(
        {
          workOrderId,
          fromStatus: woFromStatus,
          toStatus: 'ACCEPTED',
          changedByUserId: actorUserIdNum,
          reasonCode: 'TECH_ACCEPT',
          reasonNotes: `Assignment diterima oleh user#${actorUserIdNum}`,
        },
        { connection: conn },
      )
    }

    return { affectedRows: 1, accepted: true, alreadyAccepted: false, workOrderId }
  }

  if (params.connection) {
    return doAccept(params.connection)
  }

  return runReviewDbTransaction<AcceptServiceWorkOrderAssignmentResult>(async (conn) => doAccept(conn))
}

export async function insertServiceWorkOrderStatusLog(
  params: {
    workOrderId: number
    fromStatus?: string | null
    toStatus: string
    changedByUserId?: number | null
    reasonCode?: string | null
    reasonNotes?: string | null
  },
  opts?: {
    connection?: ReviewDbConnection
  },
) {
  await ensureServiceWorkOrderStatusLogTable()
  const sql = `
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
    `
  const bind: unknown[] = [
    params.workOrderId,
    params.fromStatus ?? null,
    params.toStatus,
    params.reasonCode ?? null,
    params.reasonNotes ?? null,
    params.changedByUserId ?? null,
  ]
  if (opts?.connection) {
    await opts.connection.query(sql, bind)
    return
  }
  await runReviewDbExecute<ExecuteResult>(sql, bind)
}

export const WO_COMPLETION_ERROR_CODES = {
  WO_NOT_FOUND: 'WO_NOT_FOUND',
  WO_STATUS_INVALID: 'WO_STATUS_INVALID',
  WO_ALREADY_COMPLETED: 'WO_ALREADY_COMPLETED',
  WO_ALREADY_CANCELLED: 'WO_ALREADY_CANCELLED',
  INVENTORY_ITEM_INSUFFICIENT: 'INVENTORY_ITEM_INSUFFICIENT',
  INVENTORY_ITEM_NOT_FOUND: 'INVENTORY_ITEM_NOT_FOUND',
  MATERIAL_DEBIT_FAILED: 'MATERIAL_DEBIT_FAILED',
  WO_UPDATE_FAILED: 'WO_UPDATE_FAILED',
  REQUEST_UPDATE_FAILED: 'REQUEST_UPDATE_FAILED',
  DB_UNAVAILABLE: 'DB_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const

export type WorkOrderCompletionErrorCode =
  (typeof WO_COMPLETION_ERROR_CODES)[keyof typeof WO_COMPLETION_ERROR_CODES]

export class WorkOrderCompletionError extends Error {
  readonly code: WorkOrderCompletionErrorCode
  readonly details?: unknown
  constructor(code: WorkOrderCompletionErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'WorkOrderCompletionError'
    this.code = code
    this.details = details
  }
}

type WorkOrderFullRow = {
  id: number
  work_order_no: string
  status: string
  completed_at: Date | string | null
  closed_by_user_id: number | null
  trouble_ticket_id: number | null
}

type MaterialRequestRow = {
  id: number
  request_code: string
  inventory_item_id: number
  request_qty: number
  request_status: string
  item_code?: string
  item_name?: string
  current_stock?: number
}

export type MaterialDebitResult = {
  requestId: number
  requestCode: string
  inventoryItemId: number
  itemCode: string | null
  qty: number
  beforeStock: number
  afterStock: number
  movementId: number | null
}

export type CompleteWorkOrderResult = {
  success: boolean
  idempotent: boolean
  workOrderId: number
  workOrderNo: string
  status: string
  closedByUserId: number | null
  closedAt: string | null
  materials: MaterialDebitResult[]
  movementIds: number[]
  ttProgressInserted?: boolean
  ttCascadeClose?: {
    attempted: boolean
    success: boolean
    idempotent: boolean
    troubleTicketCode: string | null
    warning?: string | null
  }
}

const NON_TERMINAL_WO_STATUSES = new Set(['OPEN', 'SCHEDULED', 'ASSIGNED', 'ACCEPTED', 'ON_PROGRESS', 'PENDING'])

async function ensureInventoryStockMovementsWorkOrderColumn() {
  const hasWoId = await hasReviewDbColumn('inventory_stock_movements', 'work_order_id')
  if (hasWoId) return
  try {
    await runReviewDbExecute(`
      ALTER TABLE inventory_stock_movements
      ADD COLUMN work_order_id BIGINT UNSIGNED NULL,
      ADD KEY idx_inventory_stock_movements_wo (work_order_id)
    `)
  } catch {
  }
  void invalidateReviewDbColumnCache
}

export async function completeWorkOrderWithMaterials(params: {
  workOrderId: number
  actorUserId: number | null
  actorUsername: string | null
  reasonNotes?: string | null
  opts?: {
    connection?: ReviewDbConnection
  }
}): Promise<CompleteWorkOrderResult> {
  await ensureInventoryStockMovementsWorkOrderColumn()
  const actorUserIdNum = Number(params.actorUserId ?? 0) || null
  const actorLabel = params.actorUsername ? `user:${params.actorUsername}` : 'system'

  const doComplete = async (conn: ReviewDbConnection): Promise<CompleteWorkOrderResult> => {
    const [woRowsRaw] = await conn.query(
      `
        SELECT id, work_order_no, status, completed_at, closed_by_user_id, trouble_ticket_id
        FROM service_work_orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [params.workOrderId],
    )
    const woRows = woRowsRaw as unknown as WorkOrderFullRow[]
    const wo = woRows[0]
    if (!wo) {
      throw new WorkOrderCompletionError(
        WO_COMPLETION_ERROR_CODES.WO_NOT_FOUND,
        'Work order tidak ditemukan.',
        { workOrderId: params.workOrderId },
      )
    }
    const fromStatus = String(wo.status ?? 'OPEN').trim().toUpperCase()

    if (fromStatus === 'COMPLETED') {
      return {
        success: true,
        idempotent: true,
        workOrderId: wo.id,
        workOrderNo: wo.work_order_no,
        status: 'COMPLETED',
        closedByUserId: wo.closed_by_user_id,
        closedAt: wo.completed_at ? String(wo.completed_at) : null,
        materials: [],
        movementIds: [],
      }
    }
    if (fromStatus === 'CANCELLED') {
      throw new WorkOrderCompletionError(
        WO_COMPLETION_ERROR_CODES.WO_ALREADY_CANCELLED,
        'Work order sudah dibatalkan, tidak bisa diselesaikan.',
        { workOrderId: wo.id, status: fromStatus },
      )
    }
    if (!NON_TERMINAL_WO_STATUSES.has(fromStatus)) {
      throw new WorkOrderCompletionError(
        WO_COMPLETION_ERROR_CODES.WO_STATUS_INVALID,
        `Status work order ${fromStatus} tidak dapat diubah ke COMPLETED.`,
        { workOrderId: wo.id, status: fromStatus },
      )
    }

    const [reqRowsRaw] = await conn.query(
      `
        SELECT
          r.id,
          r.request_code,
          r.inventory_item_id,
          r.request_qty,
          r.request_status,
          i.item_code AS item_code,
          i.item_name AS item_name,
          i.current_stock AS current_stock
        FROM inventory_item_requests r
        LEFT JOIN inventory_items i ON i.id = r.inventory_item_id
        WHERE r.work_order_id = ?
          AND r.request_status IN ('REQUEST', 'ON_PROGRESS', 'PENDING')
        ORDER BY r.id ASC
      `,
      [wo.id],
    )
    const reqRows = reqRowsRaw as unknown as MaterialRequestRow[]
    const requests = reqRows ?? []
    const materials: MaterialDebitResult[] = []
    const movementIds: number[] = []

    for (const req of requests) {
      const qty = Number(req.request_qty ?? 0)
      if (!Number.isFinite(qty) || qty <= 0) continue
      if (!Number.isFinite(Number(req.inventory_item_id ?? 0))) continue
      if (req.current_stock === undefined || req.current_stock === null) {
        throw new WorkOrderCompletionError(
          WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_NOT_FOUND,
          `Item persediaan untuk permintaan ${req.request_code} tidak ditemukan.`,
          { requestId: req.id, inventoryItemId: req.inventory_item_id },
        )
      }
      const beforeStock = Number(req.current_stock ?? 0)
      if (beforeStock < qty) {
        throw new WorkOrderCompletionError(
          WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_INSUFFICIENT,
          `Stok tidak cukup untuk item ${req.item_code ?? '#' + req.inventory_item_id}: butuh ${qty}, tersedia ${beforeStock}.`,
          {
            requestId: req.id,
            inventoryItemId: req.inventory_item_id,
            itemCode: req.item_code,
            required: qty,
            available: beforeStock,
          },
        )
      }

      const movementNotes = [
        `WO ${wo.work_order_no}`,
        `req ${req.request_code}`,
        `debit qty ${qty}`,
        actorLabel,
      ]
        .filter(Boolean)
        .join(' | ')
        .slice(0, 255)
      const [mvResRaw] = await conn.query(
        `
          INSERT INTO inventory_stock_movements
            (item_id, work_order_id, movement_type, reference_type, reference_no, qty, unit_price, notes, movement_at, actor_user_id, created_at)
          VALUES (?, ?, 'OUT', 'WORK_ORDER', ?, ?, 0, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
        `,
        [
          req.inventory_item_id,
          wo.id,
          wo.work_order_no,
          qty,
          movementNotes,
          actorUserIdNum,
        ],
      )
      const mvRes = mvResRaw as unknown as ExecuteResult
      const mvInsertId = Number(mvRes?.insertId ?? 0) || null
      if (mvInsertId) movementIds.push(mvInsertId)

      const [stockUpdRaw] = await conn.query(
        `
          UPDATE inventory_items
          SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND current_stock >= ?
        `,
        [qty, req.inventory_item_id, qty],
      )
      const stockUpd = stockUpdRaw as unknown as ExecuteResult
      const affected = Number(stockUpd?.affectedRows ?? 0)
      if (affected <= 0) {
        throw new WorkOrderCompletionError(
          WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_INSUFFICIENT,
          `Race condition stok tidak cukup untuk item ${req.item_code ?? '#' + req.inventory_item_id} ketika update.`,
          {
            requestId: req.id,
            inventoryItemId: req.inventory_item_id,
            itemCode: req.item_code,
            required: qty,
            availableBefore: beforeStock,
          },
        )
      }

      const [reqUpdRaw] = await conn.query(
        `
          UPDATE inventory_item_requests
          SET request_status = 'COMPLETED',
              completed_at = CURRENT_TIMESTAMP,
              processed_by = ?
          WHERE id = ? AND request_status IN ('REQUEST', 'ON_PROGRESS', 'PENDING')
        `,
        [actorLabel.slice(0, 120), req.id],
      )
      const reqUpd = reqUpdRaw as unknown as ExecuteResult
      const reqAffected = Number(reqUpd?.affectedRows ?? 0)
      if (reqAffected <= 0) {
        throw new WorkOrderCompletionError(
          WO_COMPLETION_ERROR_CODES.REQUEST_UPDATE_FAILED,
          `Gagal menandai permintaan material ${req.request_code} sebagai COMPLETED.`,
          { requestId: req.id },
        )
      }

      const afterStock = beforeStock - qty
      materials.push({
        requestId: req.id,
        requestCode: req.request_code,
        inventoryItemId: req.inventory_item_id,
        itemCode: req.item_code ?? null,
        qty,
        beforeStock,
        afterStock,
        movementId: mvInsertId,
      })
    }

    const [woUpdRaw] = await conn.query(
      `
        UPDATE service_work_orders
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            closed_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status <> 'COMPLETED' AND status <> 'CANCELLED'
      `,
      [actorUserIdNum, wo.id],
    )
    const woUpd = woUpdRaw as unknown as ExecuteResult
    const woAffected = Number(woUpd?.affectedRows ?? 0)
    if (woAffected <= 0) {
      throw new WorkOrderCompletionError(
        WO_COMPLETION_ERROR_CODES.WO_UPDATE_FAILED,
        'Gagal mengupdate status work order ke COMPLETED.',
        { workOrderId: wo.id, expectedStatus: fromStatus },
      )
    }

    const reasonNotesFinal =
      params.reasonNotes && String(params.reasonNotes).trim()
        ? String(params.reasonNotes).trim().slice(0, 255)
        : `Work order diselesaikan secara formal dengan material debit (${materials.length} line items). Actor: ${actorLabel}`
    await insertServiceWorkOrderStatusLog(
      {
        workOrderId: wo.id,
        fromStatus,
        toStatus: 'COMPLETED',
        changedByUserId: actorUserIdNum,
        reasonCode: 'WO_COMPLETION',
        reasonNotes: reasonNotesFinal,
      },
      { connection: conn },
    )

    let ttProgressInserted = false
    let ttCascadeClose: CompleteWorkOrderResult['ttCascadeClose'] = {
      attempted: false,
      success: false,
      idempotent: false,
      troubleTicketCode: null,
      warning: null,
    }

    const linkedTtId = Number(wo.trouble_ticket_id ?? 0)
    if (Number.isInteger(linkedTtId) && linkedTtId > 0) {
      try {
        const [ttRowsRaw] = await conn.query(
          `SELECT id, ticket_code, status FROM support_trouble_tickets WHERE id = ? LIMIT 1`,
          [linkedTtId],
        )
        const ttRow = (ttRowsRaw as Array<Record<string, unknown>> | undefined)?.[0]
        const ttCode = ttRow ? String(ttRow.ticket_code ?? '').trim() : ''
        if (ttCode) {
          ttCascadeClose.troubleTicketCode = ttCode
        }

        const ttProgressNotes = [
          `Work Order ${wo.work_order_no} (id#${wo.id}) SELASAI`,
          `Status: COMPLETED`,
          `Materials: ${materials.length} line items`,
          reasonNotesFinal,
        ].filter(Boolean).join(' | ').slice(0, 1000)

        try {
          await insertSupportTroubleTicketProgressLog(
            {
              troubleTicketId: linkedTtId,
              progressStatus: 'COMPLETED',
              ownerName: actorLabel,
              progressNotes: ttProgressNotes,
              updatedBy: params.actorUsername ? String(params.actorUsername).slice(0, 150) : 'system',
            },
            { connection: conn },
          )
          ttProgressInserted = true
        } catch {
          ttCascadeClose.warning = 'TT progress log insert gagal (non-fatal)'
        }

        try {
          const [woSiblingRaw] = await conn.query(
            `SELECT COUNT(id) AS n FROM service_work_orders WHERE trouble_ticket_id = ? AND UPPER(TRIM(COALESCE(status,''))) NOT IN ('COMPLETED','CANCELLED','CLOSED')`,
            [linkedTtId],
          )
          const siblingRow = (woSiblingRaw as Array<Record<string, unknown>> | undefined)?.[0]
          const openSiblingCount = Number(siblingRow?.n ?? 0)
          if (openSiblingCount <= 0 && ttCode) {
            ttCascadeClose.attempted = true
            try {
              const closeRes = await closeTroubleTicketWithMaterials({
                ticketCode: ttCode,
                resolutionAction: 'RESOLVED_BY_WO',
                closeNotes: reasonNotesFinal,
                actor: {
                  userId: actorUserIdNum,
                  username: params.actorUsername ?? 'system',
                  displayName: actorLabel,
                  role: 'TT_OPERATOR',
                  branchId: null,
                },
              })
              ttCascadeClose.success = true
              ttCascadeClose.idempotent = Boolean(closeRes?.idempotent ?? false)
            } catch (closeErr) {
              const errMsg = closeErr instanceof Error ? closeErr.message : String(closeErr ?? 'Unknown error').slice(0, 200)
              ttCascadeClose.warning = ttCascadeClose.warning
                ? `${ttCascadeClose.warning}; TT close cascade: ${errMsg}`
                : `TT close cascade not applied: ${errMsg}`
            }
          }
        } catch {
          ttCascadeClose.warning = ttCascadeClose.warning
            ? `${ttCascadeClose.warning}; sibling WO count check skipped`
            : 'Sibling WO count check skipped (non-fatal)'
        }
      } catch {
        ttCascadeClose.warning = 'Linked TT lookup error (non-fatal)'
      }
    }

    return {
      success: true,
      idempotent: false,
      workOrderId: wo.id,
      workOrderNo: wo.work_order_no,
      status: 'COMPLETED',
      closedByUserId: actorUserIdNum,
      closedAt: new Date().toISOString(),
      materials,
      movementIds,
      ttProgressInserted,
      ttCascadeClose,
    }
  }

  if (params.opts?.connection) {
    return doComplete(params.opts.connection)
  }
  return runReviewDbTransaction<CompleteWorkOrderResult>(async (conn) => doComplete(conn))
}

export const WO_CANCEL_ERROR_CODES = {
  WO_NOT_FOUND: 'WO_NOT_FOUND',
  WO_STATUS_INVALID: 'WO_STATUS_INVALID',
  WO_ALREADY_COMPLETED: 'WO_ALREADY_COMPLETED',
  WO_ALREADY_CANCELLED: 'WO_ALREADY_CANCELLED',
  WO_UPDATE_FAILED: 'WO_UPDATE_FAILED',
} as const

export type WorkOrderCancelErrorCode =
  (typeof WO_CANCEL_ERROR_CODES)[keyof typeof WO_CANCEL_ERROR_CODES]

export class WorkOrderCancelError extends Error {
  readonly code: WorkOrderCancelErrorCode
  readonly details?: unknown
  constructor(code: WorkOrderCancelErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'WorkOrderCancelError'
    this.code = code
    this.details = details
  }
}

export type CancelWorkOrderResult = {
  success: boolean
  idempotent: boolean
  workOrderId: number
  workOrderNo: string
  status: string
  cancelledByUserId: number | null
  cancelledAt: string | null
}

export async function cancelWorkOrder(params: {
  workOrderId: number
  actorUserId: number | null
  actorUsername: string | null
  reasonNotes?: string | null
  opts?: {
    connection?: ReviewDbConnection
  }
}): Promise<CancelWorkOrderResult> {
  const actorUserIdNum = Number(params.actorUserId ?? 0) || null
  const actorLabel = params.actorUsername ? `user:${params.actorUsername}` : 'system'

  const doCancel = async (conn: ReviewDbConnection): Promise<CancelWorkOrderResult> => {
    const [woRowsRaw] = await conn.query(
      `
        SELECT id, work_order_no, status, completed_at, closed_by_user_id
        FROM service_work_orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [params.workOrderId],
    )
    const woRows = woRowsRaw as unknown as WorkOrderFullRow[]
    const wo = woRows[0]
    if (!wo) {
      throw new WorkOrderCancelError(WO_CANCEL_ERROR_CODES.WO_NOT_FOUND, 'Work order tidak ditemukan.', {
        workOrderId: params.workOrderId,
      })
    }
    const fromStatus = String(wo.status ?? 'OPEN').trim().toUpperCase()
    if (fromStatus === 'CANCELLED') {
      return {
        success: true,
        idempotent: true,
        workOrderId: wo.id,
        workOrderNo: wo.work_order_no,
        status: 'CANCELLED',
        cancelledByUserId: wo.closed_by_user_id,
        cancelledAt: wo.completed_at ? String(wo.completed_at) : null,
      }
    }
    if (fromStatus === 'COMPLETED') {
      throw new WorkOrderCancelError(
        WO_CANCEL_ERROR_CODES.WO_ALREADY_COMPLETED,
        'Work order sudah COMPLETED, tidak dapat dibatalkan.',
        { workOrderId: wo.id, status: fromStatus },
      )
    }
    if (!NON_TERMINAL_WO_STATUSES.has(fromStatus)) {
      throw new WorkOrderCancelError(
        WO_CANCEL_ERROR_CODES.WO_STATUS_INVALID,
        `Status work order ${fromStatus} tidak dapat diubah ke CANCELLED.`,
        { workOrderId: wo.id, status: fromStatus },
      )
    }

    const [woUpdRaw] = await conn.query(
      `
        UPDATE service_work_orders
        SET status = 'CANCELLED',
            completed_at = CURRENT_TIMESTAMP,
            closed_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status <> 'COMPLETED' AND status <> 'CANCELLED'
      `,
      [actorUserIdNum, wo.id],
    )
    const woUpd = woUpdRaw as unknown as ExecuteResult
    const affected = Number(woUpd?.affectedRows ?? 0)
    if (affected <= 0) {
      throw new WorkOrderCancelError(
        WO_CANCEL_ERROR_CODES.WO_UPDATE_FAILED,
        'Gagal mengupdate status work order ke CANCELLED.',
        { workOrderId: wo.id, expectedStatus: fromStatus },
      )
    }

    const reasonNotesFinal =
      params.reasonNotes && String(params.reasonNotes).trim()
        ? String(params.reasonNotes).trim().slice(0, 255)
        : `Work order dibatalkan. Actor: ${actorLabel}`
    await insertServiceWorkOrderStatusLog(
      {
        workOrderId: wo.id,
        fromStatus,
        toStatus: 'CANCELLED',
        changedByUserId: actorUserIdNum,
        reasonCode: 'WO_CANCELLATION',
        reasonNotes: reasonNotesFinal,
      },
      { connection: conn },
    )

    return {
      success: true,
      idempotent: false,
      workOrderId: wo.id,
      workOrderNo: wo.work_order_no,
      status: 'CANCELLED',
      cancelledByUserId: actorUserIdNum,
      cancelledAt: new Date().toISOString(),
    }
  }

  if (params.opts?.connection) {
    return doCancel(params.opts.connection)
  }
  return runReviewDbTransaction<CancelWorkOrderResult>(async (conn) => doCancel(conn))
}

export const WO_TRANSITION_ERROR_CODES = {
  WO_NOT_FOUND: 'WO_NOT_FOUND',
  WO_STATUS_INVALID: 'WO_STATUS_INVALID',
  WO_ALREADY_COMPLETED: 'WO_ALREADY_COMPLETED',
  WO_ALREADY_CANCELLED: 'WO_ALREADY_CANCELLED',
  WO_TRANSITION_ILLEGAL: 'WO_TRANSITION_ILLEGAL',
  WO_UPDATE_FAILED: 'WO_UPDATE_FAILED',
} as const

export type WorkOrderTransitionErrorCode =
  (typeof WO_TRANSITION_ERROR_CODES)[keyof typeof WO_TRANSITION_ERROR_CODES]

export class WorkOrderTransitionError extends Error {
  readonly code: WorkOrderTransitionErrorCode
  readonly details?: unknown
  constructor(code: WorkOrderTransitionErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'WorkOrderTransitionError'
    this.code = code
    this.details = details
  }
}

export type WorkOrderTransitionResult = {
  success: boolean
  idempotent: boolean
  workOrderId: number
  workOrderNo: string
  fromStatus: string
  toStatus: string
  transitionedByUserId: number | null
  transitionedAt: string | null
}

const VALID_WO_TRANSITIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['OPEN', new Set(['SCHEDULED', 'ON_PROGRESS', 'CANCELLED', 'COMPLETED'])],
  ['SCHEDULED', new Set(['OPEN', 'ON_PROGRESS', 'CANCELLED', 'COMPLETED'])],
  ['ON_PROGRESS', new Set(['SCHEDULED', 'COMPLETED', 'CANCELLED'])],
  ['PENDING', new Set(['OPEN', 'SCHEDULED', 'ON_PROGRESS', 'COMPLETED', 'CANCELLED'])],
])

export async function transitionWorkOrderStatus(params: {
  workOrderId: number
  toStatus: 'OPEN' | 'SCHEDULED' | 'ON_PROGRESS'
  actorUserId: number | null
  actorUsername: string | null
  reasonNotes?: string | null
  scheduledByUserId?: number | null
  startedAt?: Date | string | null
  scheduledAt?: Date | string | null
  opts?: {
    connection?: ReviewDbConnection
  }
}): Promise<WorkOrderTransitionResult> {
  const actorUserIdNum = Number(params.actorUserId ?? 0) || null
  const actorLabel = params.actorUsername ? `user:${params.actorUsername}` : 'system'
  const toStatusUp = String(params.toStatus).trim().toUpperCase() as
    | 'OPEN'
    | 'SCHEDULED'
    | 'ON_PROGRESS'

  const doTransition = async (conn: ReviewDbConnection): Promise<WorkOrderTransitionResult> => {
    const [woRowsRaw] = await conn.query(
      `
        SELECT id, work_order_no, status, completed_at, closed_by_user_id
        FROM service_work_orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [params.workOrderId],
    )
    const woRows = woRowsRaw as unknown as WorkOrderFullRow[]
    const wo = woRows[0]
    if (!wo) {
      throw new WorkOrderTransitionError(
        WO_TRANSITION_ERROR_CODES.WO_NOT_FOUND,
        'Work order tidak ditemukan.',
        { workOrderId: params.workOrderId },
      )
    }
    const fromStatus = String(wo.status ?? 'OPEN').trim().toUpperCase()
    if (fromStatus === toStatusUp) {
      return {
        success: true,
        idempotent: true,
        workOrderId: wo.id,
        workOrderNo: wo.work_order_no,
        fromStatus,
        toStatus: toStatusUp,
        transitionedByUserId: actorUserIdNum,
        transitionedAt: new Date().toISOString(),
      }
    }
    if (fromStatus === 'COMPLETED') {
      throw new WorkOrderTransitionError(
        WO_TRANSITION_ERROR_CODES.WO_ALREADY_COMPLETED,
        'Work order sudah COMPLETED, tidak dapat diubah statusnya.',
        { workOrderId: wo.id, status: fromStatus },
      )
    }
    if (fromStatus === 'CANCELLED') {
      throw new WorkOrderTransitionError(
        WO_TRANSITION_ERROR_CODES.WO_ALREADY_CANCELLED,
        'Work order sudah CANCELLED, tidak dapat diubah statusnya.',
        { workOrderId: wo.id, status: fromStatus },
      )
    }
    const allowed = VALID_WO_TRANSITIONS.get(fromStatus)
    if (!allowed || !allowed.has(toStatusUp)) {
      throw new WorkOrderTransitionError(
        WO_TRANSITION_ERROR_CODES.WO_TRANSITION_ILLEGAL,
        `Transisi status work order ${fromStatus} → ${toStatusUp} tidak diijinkan.`,
        { workOrderId: wo.id, fromStatus, toStatus: toStatusUp },
      )
    }

    const sets: string[] = [`status = ?`, `updated_at = CURRENT_TIMESTAMP`]
    const bind: unknown[] = [toStatusUp]
    if (toStatusUp === 'SCHEDULED') {
      sets.push('scheduled_by_user_id = COALESCE(?, scheduled_by_user_id)')
      bind.push(params.scheduledByUserId ?? actorUserIdNum)
      if (params.scheduledAt) {
        sets.push('scheduled_at = ?')
        bind.push(params.scheduledAt)
      }
    }
    if (toStatusUp === 'ON_PROGRESS') {
      if (params.startedAt) {
        sets.push('started_at = ?')
        bind.push(params.startedAt)
      }
    }
    sets.push(`current_pic_user_id = COALESCE(?, current_pic_user_id)`)
    bind.push(actorUserIdNum)
    bind.push(wo.id)
    bind.push(fromStatus)

    const sql = `
      UPDATE service_work_orders
      SET ${sets.join(', ')}
      WHERE id = ? AND status = ?
    `
    const [updRaw] = await conn.query(sql, bind)
    const upd = updRaw as unknown as ExecuteResult
    const affected = Number(upd?.affectedRows ?? 0)
    if (affected <= 0) {
      throw new WorkOrderTransitionError(
        WO_TRANSITION_ERROR_CODES.WO_UPDATE_FAILED,
        `Gagal mengupdate status work order dari ${fromStatus} ke ${toStatusUp}.`,
        { workOrderId: wo.id, fromStatus, toStatus: toStatusUp },
      )
    }

    const reasonNotesFinal =
      params.reasonNotes && String(params.reasonNotes).trim()
        ? String(params.reasonNotes).trim().slice(0, 255)
        : `Transisi ${fromStatus} → ${toStatusUp}. Actor: ${actorLabel}`
    await insertServiceWorkOrderStatusLog(
      {
        workOrderId: wo.id,
        fromStatus,
        toStatus: toStatusUp,
        changedByUserId: actorUserIdNum,
        reasonCode: 'WO_TRANSITION',
        reasonNotes: reasonNotesFinal,
      },
      { connection: conn },
    )

    return {
      success: true,
      idempotent: false,
      workOrderId: wo.id,
      workOrderNo: wo.work_order_no,
      fromStatus,
      toStatus: toStatusUp,
      transitionedByUserId: actorUserIdNum,
      transitionedAt: new Date().toISOString(),
    }
  }

  if (params.opts?.connection) {
    return doTransition(params.opts.connection)
  }
  return runReviewDbTransaction<WorkOrderTransitionResult>(async (conn) => doTransition(conn))
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

export const REASSIGN_FULL_ACCESS_ROLES_SET: ReadonlySet<AppRole> = new Set(REASSIGN_FULL_ACCESS_ROLES)

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
        releasedByUserId: actorUserIdNum,
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

export async function insertSupportTroubleTicketProgressLog(
  params: {
    troubleTicketId: number
    progressStatus: string
    ownerName?: string | null
    progressNotes?: string | null
    followUpAt?: Date | string | null
    updatedBy: string
  },
  opts?: {
    connection?: ReviewDbConnection
  },
) {
  await ensureSupportTroubleTicketProgressTable()
  const troubleTicketIdNum = Number(params.troubleTicketId ?? 0)
  if (!Number.isInteger(troubleTicketIdNum) || troubleTicketIdNum <= 0) {
    return
  }
  const progressStatusUp = String(params.progressStatus ?? '').trim().toUpperCase() || 'ON_PROGRESS'
  const updatedBy = String(params.updatedBy ?? 'system').trim() || 'system'
  const columns = ['trouble_ticket_id', 'progress_status', 'updated_by']
  const placeholders = ['?', '?', '?']
  const values: unknown[] = [troubleTicketIdNum, progressStatusUp, updatedBy]
  if (params.ownerName != null && String(params.ownerName ?? '').trim()) {
    columns.push('owner_name')
    placeholders.push('?')
    values.push(String(params.ownerName ?? '').trim())
  }
  if (params.progressNotes != null && String(params.progressNotes ?? '').trim()) {
    columns.push('progress_notes')
    placeholders.push('?')
    values.push(String(params.progressNotes ?? '').trim())
  }
  if (params.followUpAt != null) {
    columns.push('follow_up_at')
    placeholders.push('?')
    values.push(params.followUpAt)
  }
  const sql = `INSERT INTO support_trouble_ticket_progress_logs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
  if (opts?.connection) {
    await opts.connection.query(sql, values)
    return
  }
  await runReviewDbExecute<ExecuteResult>(sql, values)
}

export const TT_CLOSE_ERROR_CODES = {
  TT_NOT_FOUND: 'TT_NOT_FOUND',
  TT_ALREADY_CLOSED: 'TT_ALREADY_CLOSED',
  TT_STATUS_INVALID: 'TT_STATUS_INVALID',
  TT_NOT_AUTHORIZED: 'TT_NOT_AUTHORIZED',
  TT_MATERIAL_INVALID: 'TT_MATERIAL_INVALID',
  TT_INVENTORY_INSUFFICIENT: 'TT_INVENTORY_INSUFFICIENT',
  TT_REQUEST_UPDATE_FAILED: 'TT_REQUEST_UPDATE_FAILED',
  TT_MOVEMENT_INSERT_FAILED: 'TT_MOVEMENT_INSERT_FAILED',
  TT_STOCK_UPDATE_FAILED: 'TT_STOCK_UPDATE_FAILED',
  TT_PROGRESS_INSERT_FAILED: 'TT_PROGRESS_INSERT_FAILED',
  TT_UPDATE_FAILED: 'TT_UPDATE_FAILED',
  DB_UNAVAILABLE: 'DB_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const
export type TtCloseErrorCode = (typeof TT_CLOSE_ERROR_CODES)[keyof typeof TT_CLOSE_ERROR_CODES]

export class TroubleTicketCloseError extends Error {
  public readonly code: TtCloseErrorCode
  constructor(code: TtCloseErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    Error.captureStackTrace?.(this, TroubleTicketCloseError)
  }
}

export const TT_ASSIGNMENT_ERROR_CODES = {
  TT_NOT_FOUND: 'TT_NOT_FOUND',
  TT_ALREADY_CLOSED: 'TT_ALREADY_CLOSED',
  TT_STATUS_INVALID: 'TT_STATUS_INVALID',
  TT_ASSIGNMENT_NOT_FOUND: 'TT_ASSIGNMENT_NOT_FOUND',
  TT_ASSIGNMENT_NOT_ACTIVE: 'TT_ASSIGNMENT_NOT_ACTIVE',
  TT_ASSIGNMENT_ALREADY_RELEASED: 'TT_ASSIGNMENT_ALREADY_RELEASED',
  TT_ASSIGNMENT_ALREADY_ACCEPTED: 'TT_ASSIGNMENT_ALREADY_ACCEPTED',
  TT_ASSIGNMENT_SELF_ONLY: 'TT_ASSIGNMENT_SELF_ONLY',
  TT_ASSIGNMENT_INVALID_STATUS: 'TT_ASSIGNMENT_INVALID_STATUS',
  TT_ASSIGNMENT_NOT_AUTHORIZED: 'TT_ASSIGNMENT_NOT_AUTHORIZED',
  TT_TECHNICIAN_INVALID: 'TT_TECHNICIAN_INVALID',
  TT_ASSIGNMENT_DUPLICATE_TECH: 'TT_ASSIGNMENT_DUPLICATE_TECH',
  TT_ASSIGNMENT_DUPLICATE_PRIMARY: 'TT_ASSIGNMENT_DUPLICATE_PRIMARY',
  TT_ASSIGNMENT_SAME_USER_NOP: 'TT_ASSIGNMENT_SAME_USER_NOP',
  TT_ASSIGNMENT_RELEASE_GUARD_ACTIVE: 'TT_ASSIGNMENT_RELEASE_GUARD_ACTIVE',
  TT_ASSIGNMENT_RELEASE_GUARD_PRIMARY: 'TT_ASSIGNMENT_RELEASE_GUARD_PRIMARY',
  TT_ASSIGNMENT_INVALID_REASON: 'TT_ASSIGNMENT_INVALID_REASON',
  TT_ASSIGNMENT_PROGRESS_FAILED: 'TT_ASSIGNMENT_PROGRESS_FAILED',
  TT_ASSIGNMENT_TABLE_NOT_PROVISIONED: 'TT_ASSIGNMENT_TABLE_NOT_PROVISIONED',
  INTERNAL: 'INTERNAL',
} as const

export const TT_ASSIGNMENT_TABLE_CANONICAL_NAME = 'service_trouble_ticket_assignments'

async function probeAssignmentTableExists(conn: ReviewDbConnection): Promise<boolean> {
  try {
    const probeSql = `
      SELECT COUNT(*) AS cnt FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?
      LIMIT 1
    `
    const [rows] = await conn.query(probeSql, [TT_ASSIGNMENT_TABLE_CANONICAL_NAME])
    const row = (rows as { cnt: number | bigint }[])[0]
    return Number(row?.cnt ?? 0) > 0
  } catch {
    return false
  }
}

function throwAssignmentTableNotProvisioned(): never {
  throw new TroubleTicketAssignmentError(
    TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_TABLE_NOT_PROVISIONED,
    'Fitur penugasan teknisi TT belum diaktifkan (schema not provisioned). Harap hubungi admin untuk menjalankan provisioning terlebih dahulu.',
  )
}
export type TtAssignmentErrorCode = (typeof TT_ASSIGNMENT_ERROR_CODES)[keyof typeof TT_ASSIGNMENT_ERROR_CODES]

export class TroubleTicketAssignmentError extends Error {
  public readonly code: TtAssignmentErrorCode
  constructor(code: TtAssignmentErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    Error.captureStackTrace?.(this, TroubleTicketAssignmentError)
  }
}

const TT_RELEASE_REASON_VOCABULARY = new Set(['CANCELLED', 'REASSIGNED', 'CLOSED', 'TRANSFERRED'])

type TTAssignmentLockRow = {
  id: number
  trouble_ticket_id: number
  assigned_user_id: number
  assignment_role: string
  assignment_status: string
  is_primary: number
  released_at: Date | string | null
}

type TTAuthUserRow = {
  id: number
  status: string
  role_code: string
  display_name: string | null
  username: string
}

type TTCountRow = { total: number }

async function fetchTtTechDisplayName(userId: number, conn: ReviewDbConnection): Promise<string> {
  const sql = `
    SELECT COALESCE(NULLIF(au.display_name,''), au.username, CONCAT('user:', au.id)) AS label
    FROM auth_users au
    WHERE au.id = ?
    LIMIT 1
  `
  const [rows] = await conn.query(sql, [userId])
  const row = (rows as { label: string }[])[0]
  return row?.label ? String(row.label) : `user:${userId}`
}

type TTCloseActor = {
  userId: number | null
  username: string
  displayName: string
  role: AppRole
  branchId: number | null
}

export type TroubleTicketCloseMaterialResult = {
  requestId: number
  requestCode: string | null
  inventoryItemId: number
  itemCode: string | null
  itemName: string | null
  qty: number
  beforeStock: number
  afterStock: number
  movementId: number | null
}

export type CloseTroubleTicketWithMaterialsResult = {
  idempotent: boolean
  troubleTicketId: number
  troubleTicketCode: string
  status: string
  closedBy: { userId: number | null; username: string; displayName: string }
  closedAt: string
  resolutionAction: string
  closeNotes: string
  materials: TroubleTicketCloseMaterialResult[]
  movementIds: number[]
  progressLogInserted: boolean
}

type TTLockRow = {
  id: number
  ticketCode: string
  status: string
  closedAt: Date | string | null
  customerName: string | null
  subscriptionId: number | null
}

type TTRequestRow = {
  id: number
  requestCode: string | null
  inventoryItemId: number
  itemCode: string | null
  itemName: string | null
  requestQty: number
  requestStatus: string
  currentStock: number
}

async function ensureTroubleTicketTables() {
  await Promise.all([
    ensureInventoryRequestTable(),
    ensureSupportTroubleTicketProgressTable(),
    ensureInventoryStockMovementsWorkOrderColumn(),
  ])
}

export async function closeTroubleTicketWithMaterials(params: {
  ticketCode: string
  resolutionAction: string
  closeNotes: string
  actor: TTCloseActor
}): Promise<CloseTroubleTicketWithMaterialsResult> {
  if (!params?.ticketCode || !params?.resolutionAction || !params?.closeNotes) {
    throw new TroubleTicketCloseError('TT_MATERIAL_INVALID', 'Parameter close ticket tidak lengkap.')
  }
  if (!params.actor?.username) {
    throw new TroubleTicketCloseError('TT_NOT_AUTHORIZED', 'Identity actor tidak ditemukan.')
  }
  const actorUserId = Number(params.actor.userId ?? 0)
  const actorUserIdSafe = Number.isInteger(actorUserId) && actorUserId > 0 ? actorUserId : null
  const resolutionActionUp = String(params.resolutionAction).trim().toUpperCase()
  const ticketCodeUp = String(params.ticketCode).trim().toUpperCase()
  const closeNotesRaw = String(params.closeNotes ?? '').trim()
  const actorLabel = `${params.actor.displayName || ''} (${params.actor.username})`.trim()
  const closeNoteText = `[Closed via TT lifecycle] ${actorLabel} - ${closeNotesRaw}`

  await ensureTroubleTicketTables()

  return runReviewDbTransaction<CloseTroubleTicketWithMaterialsResult>(async (conn) => {
    const lockSql = `
      SELECT
        id,
        ticket_code AS ticketCode,
        status,
        closed_at AS closedAt,
        customer_name AS customerName,
        subscription_id AS subscriptionId
      FROM support_trouble_tickets
      WHERE UPPER(TRIM(ticket_code)) = ?
      LIMIT 1
      FOR UPDATE
    `
    const [lockRows] = await conn.query(lockSql, [ticketCodeUp])
    const ttRow = ((lockRows as TTLockRow[] | undefined)?.[0] ?? null) as TTLockRow | null
    if (!ttRow) {
      throw new TroubleTicketCloseError('TT_NOT_FOUND', 'Trouble ticket tidak ditemukan.')
    }

    const statusUp = String(ttRow.status ?? '').trim().toUpperCase()
    const isClosed = statusUp === 'CLOSED' || statusUp === 'CLOSE' || ttRow.closedAt != null
    if (isClosed) {
      return {
        idempotent: true,
        troubleTicketId: ttRow.id,
        troubleTicketCode: ttRow.ticketCode,
        status: 'CLOSED',
        closedBy: {
          userId: actorUserIdSafe,
          username: String(params.actor.username ?? 'unknown'),
          displayName: String(params.actor.displayName ?? params.actor.username ?? 'Unknown'),
        },
        closedAt: new Date().toISOString(),
        resolutionAction: resolutionActionUp,
        closeNotes: closeNoteText,
        materials: [],
        movementIds: [],
        progressLogInserted: false,
      }
    }

    const validStart = new Set(['OPEN', 'ON_PROGRESS', 'FOLLOW_UP', 'PENDING'])
    if (!validStart.has(statusUp)) {
      throw new TroubleTicketCloseError(
        'TT_STATUS_INVALID',
        `Status trouble ticket saat ini ${statusUp} tidak valid untuk close (harus OPEN/ON_PROGRESS/FOLLOW_UP/PENDING).`,
      )
    }

    await releaseAllActiveTroubleTicketAssignments({
      troubleTicketId: ttRow.id,
      releasedByUserId: actorUserIdSafe,
      actorLabel,
      connection: conn,
    })

    const reqSql = `
      SELECT
        r.id,
        r.request_code AS requestCode,
        r.inventory_item_id AS inventoryItemId,
        i.item_code AS itemCode,
        i.item_name AS itemName,
        r.request_qty AS requestQty,
        r.request_status AS requestStatus,
        i.current_stock AS currentStock
      FROM inventory_item_requests r
      LEFT JOIN inventory_items i ON i.id = r.inventory_item_id
      WHERE r.trouble_ticket_id = ?
        AND UPPER(TRIM(r.request_status)) IN ('REQUEST','PENDING','ON_PROGRESS')
      FOR UPDATE OF i, r
    `
    const [reqRowsRaw] = await conn.query(reqSql, [ttRow.id])
    const requestRows = ((reqRowsRaw as TTRequestRow[] | undefined) ?? []) as TTRequestRow[]

    const materials: TroubleTicketCloseMaterialResult[] = []
    const movementIds: number[] = []

    for (const row of requestRows) {
      const qty = Number(row.requestQty ?? 0)
      if (!Number.isInteger(qty) || qty <= 0) continue
      const beforeStock = Number(row.currentStock ?? 0)
      if (beforeStock < qty) {
        throw new TroubleTicketCloseError(
          TT_CLOSE_ERROR_CODES.TT_INVENTORY_INSUFFICIENT,
          `Stok tidak cukup untuk ${row.itemCode ?? row.inventoryItemId}: butuh ${qty}, tersedia ${beforeStock}.`,
        )
      }

      const movementNote = `[TT CLOSE] ${ttRow.ticketCode} | ${actorLabel} | ${row.requestCode ?? ''}`
      const movementInsertSql = `
        INSERT INTO inventory_stock_movements (
          item_id, movement_type, qty, movement_note, movement_at,
          reference_type, reference_no, work_order_id, trouble_ticket_id, actor_user_id, created_by
        ) VALUES (?, 'OUT', ?, ?, CURRENT_TIMESTAMP, 'TROUBLE_TICKET', ?, NULL, ?, ?, ?)
      `
      const [mvResultRaw] = await conn.query(movementInsertSql, [
        row.inventoryItemId,
        qty,
        movementNote,
        ttRow.ticketCode,
        ttRow.id,
        actorUserIdSafe,
        actorLabel,
      ])
      const mvResult = (mvResultRaw as unknown as ExecuteResult | undefined) ?? undefined
      const movementId = Number((mvResult as { insertId?: number } | undefined)?.insertId ?? 0) || null
      if (!movementId) {
        throw new TroubleTicketCloseError(TT_CLOSE_ERROR_CODES.TT_MOVEMENT_INSERT_FAILED)
      }
      movementIds.push(movementId)

      const stockUpdateSql = `
        UPDATE inventory_items
        SET current_stock = current_stock - ?
        WHERE id = ? AND current_stock >= ?
        LIMIT 1
      `
      const [stockUpRaw] = await conn.query(stockUpdateSql, [qty, row.inventoryItemId, qty])
      const stockAffected = Number((stockUpRaw as unknown as ExecuteResult | undefined)?.affectedRows ?? 0)
      if (stockAffected <= 0) {
        throw new TroubleTicketCloseError(
          TT_CLOSE_ERROR_CODES.TT_INVENTORY_INSUFFICIENT,
          `Race condition stok habis untuk item ${row.itemCode ?? row.inventoryItemId}.`,
        )
      }
      const afterStock = beforeStock - qty

      const requestUpdateSql = `
        UPDATE inventory_item_requests
        SET request_status = 'COMPLETED',
            processed_by = ?,
            processed_by_user_id = ?,
            processed_at = CURRENT_TIMESTAMP,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ? AND UPPER(TRIM(request_status)) IN ('REQUEST','PENDING','ON_PROGRESS')
        LIMIT 1
      `
      const [reqUpRaw] = await conn.query(requestUpdateSql, [
        actorLabel,
        actorUserIdSafe,
        row.id,
      ])
      const reqAffected = Number((reqUpRaw as unknown as ExecuteResult | undefined)?.affectedRows ?? 0)
      if (reqAffected <= 0) {
        throw new TroubleTicketCloseError(TT_CLOSE_ERROR_CODES.TT_REQUEST_UPDATE_FAILED)
      }

      materials.push({
        requestId: row.id,
        requestCode: row.requestCode,
        inventoryItemId: row.inventoryItemId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        qty,
        beforeStock,
        afterStock,
        movementId,
      })
    }

    const updateParts = ['status = ?', 'resolution_action = ?', 'close_notes = ?', 'closed_at = CURRENT_TIMESTAMP']
    const updateValues: unknown[] = ['CLOSED', resolutionActionUp, closeNoteText]
    if (actorUserIdSafe != null) {
      updateParts.push('closed_by_user_id = ?')
      updateValues.push(actorUserIdSafe)
    }
    updateValues.push(ttRow.id)
    const ttUpdateSql = `UPDATE support_trouble_tickets SET ${updateParts.join(', ')} WHERE id = ? LIMIT 1`
    const [ttUpRaw] = await conn.query(ttUpdateSql, updateValues)
    const ttAffected = Number((ttUpRaw as unknown as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (ttAffected <= 0) {
      throw new TroubleTicketCloseError(TT_CLOSE_ERROR_CODES.TT_UPDATE_FAILED)
    }

    try {
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttRow.id,
          progressStatus: 'CLOSED',
          ownerName: actorLabel,
          progressNotes: closeNoteText,
          followUpAt: null,
          updatedBy: actorLabel,
        },
        { connection: conn },
      )
    } catch (err) {
      throw new TroubleTicketCloseError(TT_CLOSE_ERROR_CODES.TT_PROGRESS_INSERT_FAILED)
    }

    return {
      idempotent: false,
      troubleTicketId: ttRow.id,
      troubleTicketCode: ttRow.ticketCode,
      status: 'CLOSED',
      closedBy: {
        userId: actorUserIdSafe,
        username: String(params.actor.username ?? 'unknown'),
        displayName: String(params.actor.displayName ?? params.actor.username ?? 'Unknown'),
      },
      closedAt: new Date().toISOString(),
      resolutionAction: resolutionActionUp,
      closeNotes: closeNoteText,
      materials,
      movementIds,
      progressLogInserted: true,
    }
  })
}

async function ensureServiceTroubleTicketAssignmentColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('service_trouble_ticket_assignments', columnName)) {
    return
  }
  await runReviewDbExecute<ExecuteResult>(
    `ALTER TABLE service_trouble_ticket_assignments ADD COLUMN ${definitionSql} AFTER ${afterColumn}`,
  )
  invalidateReviewDbColumnCache('service_trouble_ticket_assignments', columnName)
}

export async function ensureServiceTroubleTicketAssignmentTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS service_trouble_ticket_assignments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        trouble_ticket_id BIGINT UNSIGNED NOT NULL,
        assigned_user_id BIGINT UNSIGNED NOT NULL,
        assignment_role VARCHAR(50) NOT NULL DEFAULT 'FIELD_TECHNICIAN',
        assignment_status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME NULL,
        released_at DATETIME NULL,
        released_reason VARCHAR(64) NULL,
        notes TEXT NULL,
        assigned_by_user_id BIGINT UNSIGNED NULL,
        accepted_by_user_id BIGINT UNSIGNED NULL,
        released_by_user_id BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_stta_ticket (trouble_ticket_id),
        KEY idx_stta_user (assigned_user_id),
        KEY idx_stta_status (assignment_status),
        KEY idx_stta_ticket_primary (trouble_ticket_id, is_primary),
        CONSTRAINT fk_stta_ticket FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id) ON DELETE CASCADE,
        CONSTRAINT fk_stta_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES auth_users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_stta_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
        CONSTRAINT fk_stta_accepted_by FOREIGN KEY (accepted_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL,
        CONSTRAINT fk_stta_released_by FOREIGN KEY (released_by_user_id) REFERENCES auth_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  )
  await ensureServiceTroubleTicketAssignmentColumn(
    'assignment_role',
    "assignment_role VARCHAR(50) NOT NULL DEFAULT 'FIELD_TECHNICIAN'",
    'assigned_user_id',
  )
  await ensureServiceTroubleTicketAssignmentColumn(
    'assignment_status',
    "assignment_status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED'",
    'assignment_role',
  )
  await ensureServiceTroubleTicketAssignmentColumn('is_primary', 'is_primary TINYINT(1) NOT NULL DEFAULT 0', 'assignment_status')
  await ensureServiceTroubleTicketAssignmentColumn(
    'assigned_at',
    'assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'is_primary',
  )
  await ensureServiceTroubleTicketAssignmentColumn('accepted_at', 'accepted_at DATETIME NULL', 'assigned_at')
  await ensureServiceTroubleTicketAssignmentColumn('released_at', 'released_at DATETIME NULL', 'accepted_at')
  await ensureServiceTroubleTicketAssignmentColumn('released_reason', 'released_reason VARCHAR(64) NULL', 'released_at')
  await ensureServiceTroubleTicketAssignmentColumn('notes', 'notes TEXT NULL', 'released_reason')
  await ensureServiceTroubleTicketAssignmentColumn('assigned_by_user_id', 'assigned_by_user_id BIGINT UNSIGNED NULL', 'notes')
  await ensureServiceTroubleTicketAssignmentColumn(
    'accepted_by_user_id',
    'accepted_by_user_id BIGINT UNSIGNED NULL',
    'assigned_by_user_id',
  )
  await ensureServiceTroubleTicketAssignmentColumn(
    'released_by_user_id',
    'released_by_user_id BIGINT UNSIGNED NULL',
    'accepted_by_user_id',
  )
  await ensureServiceTroubleTicketAssignmentColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'released_by_user_id',
  )
  await ensureServiceTroubleTicketAssignmentColumn(
    'updated_at',
    'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'created_at',
  )
}

export async function insertServiceTroubleTicketAssignment(params: {
  troubleTicketId: number
  assignedUserId: number
  assignmentRole?: string | null
  assignmentStatus?: string | null
  isPrimary?: boolean | number | null
  notes?: string | null
  assignedByUserId?: number | null
  connection?: ReviewDbConnection
}): Promise<void> {
  const troubleTicketIdNum = Number(params.troubleTicketId ?? 0)
  const assignedUserIdNum = Number(params.assignedUserId ?? 0)
  if (!Number.isInteger(troubleTicketIdNum) || troubleTicketIdNum <= 0) return
  if (!Number.isInteger(assignedUserIdNum) || assignedUserIdNum <= 0) return
  const values: unknown[] = [
    troubleTicketIdNum,
    assignedUserIdNum,
    params.assignmentRole ?? Q3_ASSIGNMENT_ROLE_CANONICAL,
    params.assignmentStatus ?? 'ASSIGNED',
    params.isPrimary ? 1 : 0,
    params.notes ?? null,
    params.assignedByUserId ?? null,
  ]
  const sql = `
    INSERT INTO service_trouble_ticket_assignments (
      trouble_ticket_id, assigned_user_id, assignment_role, assignment_status,
      is_primary, assigned_at, notes, assigned_by_user_id
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
  `
  if (params.connection) {
    await params.connection.query(sql, values)
    return
  }
  await runReviewDbExecute<ExecuteResult>(sql, values)
}

export type CreateServiceTroubleTicketAssignmentResult = {
  affectedRows: number
  newAssignmentId: number | null
  troubleTicketId: number | null
  alreadyDone: boolean
  errorCode?: TtAssignmentErrorCode | null
  errorMessage?: string | null
}

export type CreateServiceTroubleTicketAssignmentSession = {
  userId: number | undefined | null
  role: AppRole
}

export async function createServiceTroubleTicketAssignment(params: {
  ticketCode: string
  targetTechUserId: number
  isPrimary?: boolean
  notes?: string | null
  assignmentRole?: string
  session: CreateServiceTroubleTicketAssignmentSession
}): Promise<CreateServiceTroubleTicketAssignmentResult> {
  const ticketCodeUp = String(params.ticketCode ?? '').trim().toUpperCase()
  const targetTechNum = Number(params.targetTechUserId ?? 0)
  const actorUserIdRaw = params.session?.userId
  const actorUserIdNum = Number(actorUserIdRaw ?? 0)
  const hasValidActor = Number.isInteger(actorUserIdNum) && actorUserIdNum > 0
  const role = (params.session?.role ?? '').toString().trim().toUpperCase() as AppRole
  const hasFull = REASSIGN_FULL_ACCESS_ROLES_SET.has(role)
  const hasSupportUpdate = canPerformAction(role, 'support', 'update')
  const invalidSession = !hasValidActor || !(hasFull || hasSupportUpdate)
  if (!ticketCodeUp || !Number.isInteger(targetTechNum) || targetTechNum <= 0) {
    return { affectedRows: 0, newAssignmentId: null, troubleTicketId: null, alreadyDone: false }
  }
  if (invalidSession) {
    return {
      affectedRows: 0,
      newAssignmentId: null,
      troubleTicketId: null,
      alreadyDone: false,
      errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_NOT_AUTHORIZED,
      errorMessage: 'Memerlukan akses operator untuk create assignment.',
    }
  }
  return runReviewDbTransaction<CreateServiceTroubleTicketAssignmentResult>(async (conn) => {
    const tableExists = await probeAssignmentTableExists(conn)
    if (!tableExists) throwAssignmentTableNotProvisioned()
    const ttLockSql = `
      SELECT id, ticket_code AS ticketCode, status, closed_at AS closedAt
      FROM support_trouble_tickets
      WHERE UPPER(TRIM(ticket_code)) = ?
      LIMIT 1
      FOR UPDATE
    `
    const [ttRows] = await conn.query(ttLockSql, [ticketCodeUp])
    const ttRow = (ttRows as { id: number; ticketCode: string; status: string; closedAt: Date | string | null }[])[0]
    if (!ttRow) {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: null,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_NOT_FOUND,
      }
    }
    const statusUp = String(ttRow.status ?? '').trim().toUpperCase()
    const isClosed = statusUp === 'CLOSED' || statusUp === 'CLOSE' || ttRow.closedAt != null
    if (isClosed) {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: ttRow.id,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_ALREADY_CLOSED,
      }
    }
    const validStart = new Set(['OPEN', 'ON_PROGRESS', 'FOLLOW_UP', 'PENDING'])
    if (!validStart.has(statusUp)) {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: ttRow.id,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_STATUS_INVALID,
      }
    }
    const actParts = buildActiveWhereParts('')
    const scopeLockSql = `
      SELECT id FROM service_trouble_ticket_assignments WHERE trouble_ticket_id = ? AND ${actParts.sql} FOR UPDATE
    `
    await conn.query(scopeLockSql, [ttRow.id, ...actParts.values])
    const techBSql = `
      SELECT au.id, au.status, ar.code AS role_code,
             COALESCE(NULLIF(au.display_name,''), au.username, CONCAT('user:', au.id)) AS display_name,
             au.username
      FROM auth_users au
      JOIN auth_roles ar ON ar.id = au.role_id
      WHERE au.id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [techBRows] = await conn.query(techBSql, [targetTechNum])
    const techB = (techBRows as TTAuthUserRow[])[0]
    if (!techB) {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: ttRow.id,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID,
      }
    }
    const statusTechB = String(techB.status ?? '').trim().toUpperCase()
    if (statusTechB !== 'ACTIVE') {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: ttRow.id,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID,
      }
    }
    const roleUp = String(techB.role_code ?? '').trim().toUpperCase()
    if (roleUp !== 'TEKNISI' && roleUp !== 'TEKNISI_PSB' && roleUp !== 'FIELD_TECHNICIAN') {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: ttRow.id,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID,
      }
    }
    const dupParts = buildActiveWhereParts('d')
    const dupCheckSql = `SELECT COUNT(*) AS total FROM service_trouble_ticket_assignments d WHERE d.trouble_ticket_id = ? AND d.assigned_user_id = ? AND ${dupParts.sql}`
    const [dupRows] = await conn.query(dupCheckSql, [ttRow.id, targetTechNum, ...dupParts.values])
    const dupTotal = Number((dupRows as TTCountRow[])[0]?.total ?? 0)
    if (dupTotal > 0) {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: ttRow.id,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_DUPLICATE_TECH,
      }
    }
    const isPrimaryFlag = params.isPrimary !== false
    if (isPrimaryFlag) {
      const primParts = buildActiveWhereParts('q')
      const primSql = `SELECT COUNT(*) AS total FROM service_trouble_ticket_assignments q WHERE q.trouble_ticket_id = ? AND q.is_primary = 1 AND ${primParts.sql}`
      const [primRows] = await conn.query(primSql, [ttRow.id, ...primParts.values])
      const primTotal = Number((primRows as TTCountRow[])[0]?.total ?? 0)
      if (primTotal > 0) {
        return {
          affectedRows: 0,
          newAssignmentId: null,
          troubleTicketId: ttRow.id,
          alreadyDone: false,
          errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_DUPLICATE_PRIMARY,
        }
      }
    }
    await insertServiceTroubleTicketAssignment({
      troubleTicketId: ttRow.id,
      assignedUserId: targetTechNum,
      assignmentRole: params.assignmentRole ?? Q3_ASSIGNMENT_ROLE_CANONICAL,
      assignmentStatus: 'ASSIGNED',
      isPrimary: isPrimaryFlag ? 1 : 0,
      notes: params.notes ?? null,
      assignedByUserId: actorUserIdNum,
      connection: conn,
    })
    const lastSql = 'SELECT LAST_INSERT_ID() AS insert_id'
    const [lastRows] = await conn.query(lastSql, [])
    const newAssignmentId = Number((lastRows as { insert_id: number }[])[0]?.insert_id ?? 0) || null
    const ownerName = techB.display_name ? String(techB.display_name) : String(techB.username) || `user:${targetTechNum}`
    try {
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttRow.id,
          progressStatus: 'ASSIGN',
          ownerName,
          progressNotes: `[ASSIGN] Teknisi ${ownerName} di-assign ke TT ${ttRow.ticketCode}.${params.notes ? ` Catatan: ${params.notes}` : ''}`,
          followUpAt: null,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch (e) {
      throw new TroubleTicketAssignmentError(
        TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_PROGRESS_FAILED,
        'Gagal insert ASSIGN progress log.',
      )
    }
    return {
      affectedRows: 1,
      newAssignmentId,
      troubleTicketId: ttRow.id,
      alreadyDone: false,
    }
  })
}

export type AcceptServiceTroubleTicketAssignmentResult = {
  affectedRows: number
  accepted: boolean
  alreadyAccepted: boolean
  troubleTicketId: number | null
}

export async function acceptServiceTroubleTicketAssignment(params: {
  assignmentId: number
  session: AcceptFieldTechSession
  connection?: ReviewDbConnection
}): Promise<AcceptServiceTroubleTicketAssignmentResult> {
  const assignmentIdNum = Number(params.assignmentId ?? 0)
  if (!Number.isInteger(assignmentIdNum) || assignmentIdNum <= 0) {
    return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: null }
  }
  const actorUserIdRaw = params.session?.userId
  const actorUserIdNum = Number(actorUserIdRaw ?? 0)
  if (!Number.isInteger(actorUserIdNum) || actorUserIdNum <= 0) {
    return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: null }
  }
  const scope = resolveAcceptAuthorizationScope(params.session.role, actorUserIdNum)
  if (scope === 'DENY') {
    return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: null }
  }
  async function doAccept(conn: ReviewDbConnection): Promise<AcceptServiceTroubleTicketAssignmentResult> {
    const tableExists = await probeAssignmentTableExists(conn)
    if (!tableExists) throwAssignmentTableNotProvisioned()
    const probeSql = `
      SELECT id, trouble_ticket_id
      FROM service_trouble_ticket_assignments
      WHERE id = ?
      LIMIT 1
    `
    const [probeRows] = await conn.query(probeSql, [assignmentIdNum])
    const probeRow = (probeRows as { id: number; trouble_ticket_id: number }[])[0]
    if (!probeRow) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: null }
    }
    const ttId = Number(probeRow.trouble_ticket_id ?? 0)
    if (!Number.isInteger(ttId) || ttId <= 0) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: null }
    }
    const ttLockSql = `SELECT id FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`
    await conn.query(ttLockSql, [ttId])
    const lockSql = `
      SELECT id, trouble_ticket_id, assigned_user_id, assignment_role, assignment_status, released_at
      FROM service_trouble_ticket_assignments
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [lockRows] = await conn.query(lockSql, [assignmentIdNum])
    const assignment = (lockRows as { id: number; trouble_ticket_id: number; assigned_user_id: number; assignment_role: string; assignment_status: string; released_at: Date | string | null }[])[0]
    if (!assignment) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: ttId }
    }
    const roleUp = String(assignment.assignment_role ?? '').trim().toUpperCase()
    if (roleUp !== String(Q3_ASSIGNMENT_ROLE_CANONICAL).trim().toUpperCase()) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: ttId }
    }
    if (scope === 'SELF_ONLY' && Number(assignment.assigned_user_id ?? 0) !== actorUserIdNum) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: ttId }
    }
    const statusUp = String(assignment.assignment_status ?? '').trim().toUpperCase()
    const isReleased = assignment.released_at != null || statusUp === 'RELEASED'
    if (statusUp === 'ACCEPTED' && !isReleased) {
      return { affectedRows: 1, accepted: true, alreadyAccepted: true, troubleTicketId: ttId }
    }
    if (isReleased) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: ttId }
    }
    if (statusUp !== 'ASSIGNED') {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: ttId }
    }
    const updateSql = `
      UPDATE service_trouble_ticket_assignments
      SET assignment_status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP, accepted_by_user_id = ?
      WHERE id = ? AND assignment_role = ? AND assignment_status = 'ASSIGNED' AND released_at IS NULL AND assigned_user_id = ?
      LIMIT 1
    `
    const [updateResult] = await conn.query(updateSql, [
      actorUserIdNum,
      assignmentIdNum,
      Q3_ASSIGNMENT_ROLE_CANONICAL,
      actorUserIdNum,
    ])
    const affectedRows = Number((updateResult as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affectedRows <= 0) {
      return { affectedRows: 0, accepted: false, alreadyAccepted: false, troubleTicketId: ttId }
    }
    const ownerName = await fetchTtTechDisplayName(actorUserIdNum, conn)
    try {
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'ACCEPT',
          ownerName,
          progressNotes: `[ACCEPT] Teknisi ${ownerName} menerima assignment ini.`,
          followUpAt: null,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch (e) {
      throw new TroubleTicketAssignmentError(
        TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_PROGRESS_FAILED,
        'Gagal insert ACCEPT progress log.',
      )
    }
    return { affectedRows: 1, accepted: true, alreadyAccepted: false, troubleTicketId: ttId }
  }
  if (params.connection) {
    return doAccept(params.connection)
  }
  return runReviewDbTransaction<AcceptServiceTroubleTicketAssignmentResult>(async (conn) => doAccept(conn))
}

export type ReleaseServiceTroubleTicketAssignmentResult = {
  affectedRows: number
  idempotent: boolean
  troubleTicketId: number | null
}

export async function releaseServiceTroubleTicketAssignment(params: {
  assignmentId: number
  sessionUserId: number | undefined | null
  authorizationScope?: 'SELF_ONLY' | 'FULL_ACCESS'
  releasedReason: string
  releasedByUserId?: number | undefined | null
  connection?: ReviewDbConnection
}): Promise<ReleaseServiceTroubleTicketAssignmentResult> {
  const assignmentIdNum = Number(params.assignmentId ?? 0)
  if (!Number.isInteger(assignmentIdNum) || assignmentIdNum <= 0) {
    return { affectedRows: 0, idempotent: false, troubleTicketId: null }
  }
  const userIdNum = Number(params.sessionUserId ?? 0)
  const hasUserId = Number.isInteger(userIdNum) && userIdNum > 0
  const releasedByNum = Number(params.releasedByUserId ?? 0)
  const hasReleasedBy = Number.isInteger(releasedByNum) && releasedByNum > 0
  const scope = params.authorizationScope ?? 'SELF_ONLY'
  if (scope === 'SELF_ONLY' && !hasUserId) {
    return { affectedRows: 0, idempotent: false, troubleTicketId: null }
  }
  if (!hasReleasedBy) {
    return { affectedRows: 0, idempotent: false, troubleTicketId: null }
  }
  const reasonUp = String(params.releasedReason ?? '').trim().toUpperCase()
  if (!TT_RELEASE_REASON_VOCABULARY.has(reasonUp)) {
    return { affectedRows: 0, idempotent: false, troubleTicketId: null }
  }
  async function doRelease(conn: ReviewDbConnection): Promise<ReleaseServiceTroubleTicketAssignmentResult> {
    const tableExists = await probeAssignmentTableExists(conn)
    if (!tableExists) throwAssignmentTableNotProvisioned()
    const probeSql = `
      SELECT id, trouble_ticket_id
      FROM service_trouble_ticket_assignments
      WHERE id = ?
      LIMIT 1
    `
    const [probeRows] = await conn.query(probeSql, [assignmentIdNum])
    const probeRow = (probeRows as { id: number; trouble_ticket_id: number }[])[0]
    if (!probeRow) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: null }
    }
    const ttId = Number(probeRow.trouble_ticket_id ?? 0)
    if (!Number.isInteger(ttId) || ttId <= 0) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: null }
    }
    const ttLockSql = `SELECT id FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`
    await conn.query(ttLockSql, [ttId])
    const lockSql = `
      SELECT id, trouble_ticket_id, assigned_user_id, assignment_role, assignment_status, released_at
      FROM service_trouble_ticket_assignments
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [lockRows] = await conn.query(lockSql, [assignmentIdNum])
    const row = (lockRows as { id: number; trouble_ticket_id: number; assigned_user_id: number; assignment_role: string; assignment_status: string; released_at: Date | string | null }[])[0]
    if (!row) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: ttId }
    }
    const roleUp = String(row.assignment_role ?? '').trim().toUpperCase()
    if (roleUp !== String(Q3_ASSIGNMENT_ROLE_CANONICAL).trim().toUpperCase()) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: ttId }
    }
    const statusUp = String(row.assignment_status ?? '').trim().toUpperCase()
    const isReleased = row.released_at != null || statusUp === 'RELEASED'
    if (isReleased) {
      return { affectedRows: 0, idempotent: true, troubleTicketId: ttId }
    }
    const activeStatuses = [...Q3_ASSIGNMENT_ACTIVE_STATUSES]
    if (!activeStatuses.includes(statusUp as (typeof activeStatuses)[number])) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: ttId }
    }
    if (scope === 'SELF_ONLY' && Number(row.assigned_user_id ?? 0) !== userIdNum) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: ttId }
    }
    const actParts = buildActiveWhereParts('')
    const selfClause = scope === 'SELF_ONLY' ? 'AND assigned_user_id = ?' : ''
    const bind: unknown[] = [
      releasedByNum,
      reasonUp,
      Q3_ASSIGNMENT_ROLE_CANONICAL,
      ...activeStatuses,
    ]
    if (scope === 'SELF_ONLY') bind.push(userIdNum)
    bind.push(assignmentIdNum)
    const updSql = `
      UPDATE service_trouble_ticket_assignments
      SET assignment_status = 'RELEASED', released_at = CURRENT_TIMESTAMP, released_reason = ?, released_by_user_id = ?
      WHERE
        assignment_role = ?
        AND assignment_status IN (${activeStatuses.map(() => '?').join(', ')})
        AND released_at IS NULL
        ${selfClause}
        AND id = ?
      LIMIT 1
    `
    const updFinalSql = `
      UPDATE service_trouble_ticket_assignments
      SET assignment_status = 'RELEASED', released_at = CURRENT_TIMESTAMP, released_reason = ?, released_by_user_id = ?
      WHERE
        assignment_role = ?
        AND assignment_status IN (${activeStatuses.map(() => '?').join(', ')})
        AND released_at IS NULL
        ${selfClause}
        AND id = ?
      LIMIT 1
    `
    void updSql
    const [updateRes] = await conn.query(updFinalSql, bind)
    const affectedRows = Number((updateRes as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affectedRows <= 0) {
      return { affectedRows: 0, idempotent: false, troubleTicketId: ttId }
    }
    const ownerName = await fetchTtTechDisplayName(Number(row.assigned_user_id ?? 0), conn)
    try {
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'RELEASE',
          ownerName,
          progressNotes: `[RELEASE] Teknisi ${ownerName} dilepas dari assignment ini (${reasonUp}).`,
          followUpAt: null,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch (e) {
      throw new TroubleTicketAssignmentError(
        TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_PROGRESS_FAILED,
        'Gagal insert RELEASE progress log.',
      )
    }
    return { affectedRows: 1, idempotent: false, troubleTicketId: ttId }
  }
  if (params.connection) {
    return doRelease(params.connection)
  }
  return runReviewDbTransaction<ReleaseServiceTroubleTicketAssignmentResult>(async (conn) => doRelease(conn))
}

export type ReassignServiceTroubleTicketAssignmentResult = {
  affectedRows: number
  newAssignmentId: number | null
  alreadyDone: boolean
  troubleTicketId: number | null
  errorCode?: TtAssignmentErrorCode | null
}

export async function reassignServiceTroubleTicketAssignment(params: {
  assignmentAId: number
  targetTechBId: number
  session: ReassignFieldTechSession
}): Promise<ReassignServiceTroubleTicketAssignmentResult> {
  const assignmentAIdNum = Number(params.assignmentAId ?? 0)
  const targetTechBNum = Number(params.targetTechBId ?? 0)
  const validA = Number.isInteger(assignmentAIdNum) && assignmentAIdNum > 0
  const validB = Number.isInteger(targetTechBNum) && targetTechBNum > 0
  if (!validA || !validB) {
    return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: null }
  }
  const actorUserIdRaw = params.session?.userId
  const actorUserIdNum = Number(actorUserIdRaw ?? 0)
  if (!Number.isInteger(actorUserIdNum) || actorUserIdNum <= 0) {
    return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: null }
  }
  const scope = resolveReassignAuthorizationScope(params.session.role, actorUserIdNum)
  if (scope === 'DENY') {
    return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: null }
  }
  return runReviewDbTransaction<ReassignServiceTroubleTicketAssignmentResult>(async (conn) => {
    const tableExists = await probeAssignmentTableExists(conn)
    if (!tableExists) throwAssignmentTableNotProvisioned()
    const probeSql = `
      SELECT id, trouble_ticket_id
      FROM service_trouble_ticket_assignments
      WHERE id = ?
      LIMIT 1
    `
    const [probeRows] = await conn.query(probeSql, [assignmentAIdNum])
    const probeRow = (probeRows as { id: number; trouble_ticket_id: number }[])[0]
    if (!probeRow) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: null }
    }
    const ttId = Number(probeRow.trouble_ticket_id ?? 0)
    if (!Number.isInteger(ttId) || ttId <= 0) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: null }
    }
    const ttLockSql = `SELECT id FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`
    await conn.query(ttLockSql, [ttId])
    const actParts = buildActiveWhereParts('')
    const scopeLockSql = `SELECT id FROM service_trouble_ticket_assignments WHERE trouble_ticket_id = ? AND ${actParts.sql} FOR UPDATE`
    await conn.query(scopeLockSql, [ttId, ...actParts.values])
    const techALockSql = `
      SELECT id, trouble_ticket_id, assigned_user_id, assignment_role, assignment_status, is_primary, released_at
      FROM service_trouble_ticket_assignments
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [techARows] = await conn.query(techALockSql, [assignmentAIdNum])
    const techA = (techARows as TTAssignmentLockRow[])[0]
    if (!techA) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: ttId }
    }
    const techAReleased =
      techA.released_at != null || String(techA.assignment_status ?? '').trim().toUpperCase() === 'RELEASED'
    const idemParts = buildActiveWhereParts('a')
    const idemSql = `
      SELECT a.id AS existing_tech_b_id
      FROM service_trouble_ticket_assignments a
      WHERE a.trouble_ticket_id = ? AND a.assigned_user_id = ? AND ${idemParts.sql}
      LIMIT 1
    `
    const [idemRows] = await conn.query(idemSql, [ttId, targetTechBNum, ...idemParts.values])
    const techBAlready = (idemRows as { existing_tech_b_id: number }[])[0] ?? null
    if (techAReleased && techBAlready) {
      return {
        affectedRows: 1,
        newAssignmentId: Number(techBAlready.existing_tech_b_id ?? 0) || null,
        alreadyDone: true,
        troubleTicketId: ttId,
      }
    }
    if (targetTechBNum === Number(techA.assigned_user_id ?? 0) && !techAReleased) {
      return {
        affectedRows: 0,
        newAssignmentId: null,
        alreadyDone: false,
        troubleTicketId: ttId,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_SAME_USER_NOP,
      }
    }
    const techBSql = `
      SELECT au.id, au.status, ar.code AS role_code,
             COALESCE(NULLIF(au.display_name,''), au.username, CONCAT('user:', au.id)) AS display_name,
             au.username
      FROM auth_users au
      JOIN auth_roles ar ON ar.id = au.role_id
      WHERE au.id = ?
      LIMIT 1
      FOR UPDATE
    `
    const [techBRows] = await conn.query(techBSql, [targetTechBNum])
    const techB = (techBRows as TTAuthUserRow[])[0]
    if (!techB) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: ttId, errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID }
    }
    const statusTechBUp = String(techB.status ?? '').trim().toUpperCase()
    if (statusTechBUp !== 'ACTIVE') {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: ttId, errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID }
    }
    const roleTechBUp = String(techB.role_code ?? '').trim().toUpperCase()
    if (roleTechBUp !== 'TEKNISI' && roleTechBUp !== 'TEKNISI_PSB' && roleTechBUp !== 'FIELD_TECHNICIAN') {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: ttId, errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID }
    }
    const dupParts = buildActiveWhereParts('d')
    const dupSql = `SELECT COUNT(*) AS total FROM service_trouble_ticket_assignments d WHERE d.trouble_ticket_id = ? AND d.assigned_user_id = ? AND ${dupParts.sql}`
    const [dupRows] = await conn.query(dupSql, [ttId, targetTechBNum, ...dupParts.values])
    const dupTotal = Number((dupRows as TTCountRow[])[0]?.total ?? 0)
    if (dupTotal > 0) {
      return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: ttId, errorCode: TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_DUPLICATE_TECH }
    }
    if (!techAReleased) {
      const releaseRes = await releaseServiceTroubleTicketAssignment({
        assignmentId: assignmentAIdNum,
        sessionUserId: scope === 'SELF_ONLY' ? actorUserIdNum : null,
        authorizationScope: scope,
        releasedReason: 'REASSIGNED',
        releasedByUserId: actorUserIdNum,
        connection: conn,
      })
      if (releaseRes.affectedRows < 1 && !releaseRes.idempotent) {
        return { affectedRows: 0, newAssignmentId: null, alreadyDone: false, troubleTicketId: ttId }
      }
    }
    const postActParts = buildActiveWhereParts('p')
    const postActSql = `SELECT COUNT(*) AS total FROM service_trouble_ticket_assignments p WHERE p.trouble_ticket_id = ? AND ${postActParts.sql}`
    const [postActRows] = await conn.query(postActSql, [ttId, ...postActParts.values])
    const postTotal = Number((postActRows as TTCountRow[])[0]?.total ?? 0)
    if (postTotal > 0) {
      throw new TroubleTicketAssignmentError(
        TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_RELEASE_GUARD_ACTIVE,
        'Masih ada field technician aktif lain pada TT setelah release.',
      )
    }
    const postPrimParts = buildActiveWhereParts('q')
    const postPrimSql = `SELECT COUNT(*) AS total FROM service_trouble_ticket_assignments q WHERE q.trouble_ticket_id = ? AND q.is_primary = 1 AND ${postPrimParts.sql}`
    const [postPrimRows] = await conn.query(postPrimSql, [ttId, ...postPrimParts.values])
    const primTotal = Number((postPrimRows as TTCountRow[])[0]?.total ?? 0)
    if (primTotal > 0) {
      throw new TroubleTicketAssignmentError(
        TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_RELEASE_GUARD_PRIMARY,
        'Masih ada assignment aktif dengan primary flag setelah release.',
      )
    }
    const isPrimaryFlag = Number(techA.is_primary ?? 0) > 0 ? 1 : 1
    await insertServiceTroubleTicketAssignment({
      troubleTicketId: ttId,
      assignedUserId: targetTechBNum,
      assignmentRole: Q3_ASSIGNMENT_ROLE_CANONICAL,
      assignmentStatus: 'ASSIGNED',
      isPrimary: isPrimaryFlag,
      notes: `Reassign dari teknisi lama`,
      assignedByUserId: actorUserIdNum,
      connection: conn,
    })
    const lastSql = 'SELECT LAST_INSERT_ID() AS insert_id'
    const [lastRows] = await conn.query(lastSql, [])
    const newAssignmentId = Number((lastRows as { insert_id: number }[])[0]?.insert_id ?? 0) || null
    const newOwnerName = techB.display_name ? String(techB.display_name) : String(techB.username) || `user:${targetTechBNum}`
    try {
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'REASSIGN',
          ownerName: newOwnerName,
          progressNotes: `[REASSIGN] Teknisi lama → ${newOwnerName}.`,
          followUpAt: null,
          updatedBy: newOwnerName,
        },
        { connection: conn },
      )
    } catch (e) {
      throw new TroubleTicketAssignmentError(
        TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_PROGRESS_FAILED,
        'Gagal insert REASSIGN progress log.',
      )
    }
    return {
      affectedRows: 1,
      newAssignmentId,
      alreadyDone: false,
      troubleTicketId: ttId,
    }
  })
}

export async function releaseAllActiveTroubleTicketAssignments(params: {
  troubleTicketId: number
  releasedByUserId?: number | null
  actorLabel?: string | null
  connection: ReviewDbConnection
}): Promise<{ releasedCount: number; progressInserted: number }> {
  const ttId = Number(params.troubleTicketId ?? 0)
  if (!Number.isInteger(ttId) || ttId <= 0) return { releasedCount: 0, progressInserted: 0 }
  const actorNum = Number(params.releasedByUserId ?? 0)
  const hasActor = Number.isInteger(actorNum) && actorNum > 0
  if (!hasActor) return { releasedCount: 0, progressInserted: 0 }
  const conn = params.connection
  const tableExists = await probeAssignmentTableExists(conn)
  if (!tableExists) {
    return { releasedCount: 0, progressInserted: 0 }
  }
  const activeParts = buildActiveWhereParts('')
  const scopeLockSql = `
    SELECT id, trouble_ticket_id, assigned_user_id, assignment_role, assignment_status, released_at
    FROM service_trouble_ticket_assignments
    WHERE trouble_ticket_id = ? AND ${activeParts.sql}
    FOR UPDATE
  `
  const [lockRows] = await params.connection.query(scopeLockSql, [ttId, ...activeParts.values])
  const rows = (lockRows as TTAssignmentLockRow[]) ?? []
  if (rows.length <= 0) return { releasedCount: 0, progressInserted: 0 }
  let releasedCount = 0
  let progressInserted = 0
  const actorLabel = String(params.actorLabel ?? '').trim() || `user:${actorNum}`
  for (const row of rows) {
    const res = await releaseServiceTroubleTicketAssignment({
      assignmentId: Number(row.id ?? 0),
      sessionUserId: null,
      authorizationScope: 'FULL_ACCESS',
      releasedReason: 'CLOSED',
      releasedByUserId: actorNum,
      connection: params.connection,
    })
    if (res.affectedRows > 0 || res.idempotent) {
      releasedCount += res.affectedRows > 0 ? 1 : 0
      progressInserted += 1
    }
    void actorLabel
  }
  return { releasedCount, progressInserted }
}
