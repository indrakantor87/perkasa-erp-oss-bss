import {
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
} from '@/lib/review-db'

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
        assignment_role VARCHAR(50) NOT NULL DEFAULT 'TECHNICIAN',
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
    "assignment_role VARCHAR(50) NOT NULL DEFAULT 'TECHNICIAN'",
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
}) {
  await ensureServiceWorkOrderAssignmentTable()
  await runReviewDbExecute<ExecuteResult>(
    `
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
    `,
    [
      params.workOrderId,
      params.assignedUserId,
      params.assignmentRole ?? 'TECHNICIAN',
      params.assignmentStatus ?? 'ASSIGNED',
      params.isPrimary ? 1 : 0,
      params.notes ?? null,
      params.assignedByUserId ?? null,
    ],
  )
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
