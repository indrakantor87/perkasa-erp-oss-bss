import {
  addColumnIfMissing,
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
  type ReviewDbConnection,
} from '@/lib/review-db'
import {
  Q3_ASSIGNMENT_ACTIVE_STATUSES,
  Q3_ASSIGNMENT_ROLE_CANONICAL,
} from '@/lib/q3-field-tech-ownership'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

export type UnifiedTicketType = 'PSB' | 'TROUBLE' | 'DISMANTLE' | 'JALUR'

export type UnifiedTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_PROGRESS'
  | 'PENDING'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'

export type UnifiedTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type UnifiedTicketRow = {
  id: number
  ticketCode: string
  ticketType: UnifiedTicketType
  title?: string | null
  description?: string | null
  customerName?: string | null
  customerUser?: string | null
  customerId?: number | null
  branchId?: number | null
  subscriptionId?: number | null
  status: UnifiedTicketStatus
  priority: UnifiedTicketPriority
  openedAt: Date | string
  assignedUserId?: number | null
  slaDueAt?: Date | string | null
  submittedAt?: Date | string | null
  submittedByUserId?: number | null
  completedAt?: Date | string | null
  closedAt?: Date | string | null
  troubleTicketId?: number | null
  workOrderId?: number | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

export type CreateUnifiedTicketLegacyWorkOrder = {
  source: 'WORK_ORDER'
  workOrderId?: number | null
  workOrderNo?: string | null
  workType?: string | null
  troubleTicketId?: number | null
  subscriptionId?: number | null
  branchId?: number | null
  salesOrderId?: number | null
  technicianName?: string | null
  scheduledAt?: Date | string | null
  startedAt?: Date | string | null
  completedAt?: Date | string | null
  closedAt?: Date | string | null
  status?: string | null
  priority?: string | null
  notes?: string | null
  currentPicUserId?: number | null
  slaDueAt?: Date | string | null
  customerName?: string | null
  address?: string | null
}

export type CreateUnifiedTicketLegacyTroubleTicket = {
  source: 'TROUBLE_TICKET'
  troubleTicketId?: number | null
  ticketCode?: string | null
  subscriptionId?: number | null
  branchId?: number | null
  customerName?: string | null
  customerId?: number | null
  title?: string | null
  description?: string | null
  status?: string | null
  priority?: string | null
  openedAt?: Date | string | null
  closedAt?: Date | string | null
  assignedTo?: string | null
  assignedUserId?: number | null
  slaDueAt?: Date | string | null
}

export type CreateUnifiedTicketParams = {
  ticketCode: string
  ticketType: UnifiedTicketType
  title?: string | null
  description?: string | null
  customerName?: string | null
  customerUser?: string | null
  customerId?: number | null
  branchId?: number | null
  subscriptionId?: number | null
  status?: UnifiedTicketStatus
  priority?: UnifiedTicketPriority
  openedAt?: Date | string
  assignedUserId?: number | null
  slaDueAt?: Date | string | null
  submittedAt?: Date | string | null
  submittedByUserId?: number | null
  completedAt?: Date | string | null
  closedAt?: Date | string | null
  troubleTicketId?: number | null
  workOrderId?: number | null
  legacy?: CreateUnifiedTicketLegacyWorkOrder | CreateUnifiedTicketLegacyTroubleTicket | null
}

async function ensureTicketColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  await addColumnIfMissing('tickets', columnName, definitionSql, afterColumn)
}

export async function ensureTicketsUnifiedTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS tickets (
        id BIGINT NOT NULL AUTO_INCREMENT,
        ticket_code VARCHAR(64) NOT NULL,
        ticket_type VARCHAR(32) NOT NULL,
        title VARCHAR(255) NULL,
        description TEXT NULL,
        customer_name VARCHAR(255) NULL,
        customer_user VARCHAR(128) NULL,
        customer_id BIGINT UNSIGNED NULL,
        branch_id BIGINT UNSIGNED NULL,
        subscription_id BIGINT UNSIGNED NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
        opened_at DATETIME NOT NULL,
        assigned_user_id BIGINT UNSIGNED NULL,
        sla_due_at DATETIME NULL,
        submitted_at DATETIME NULL,
        submitted_by_user_id BIGINT NULL,
        completed_at DATETIME NULL,
        closed_at DATETIME NULL,
        trouble_ticket_id BIGINT UNSIGNED NULL,
        work_order_id BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_tickets_code (ticket_code),
        KEY idx_tickets_type (ticket_type),
        KEY idx_tickets_status (status),
        KEY idx_tickets_branch (branch_id),
        KEY idx_tickets_subscription (subscription_id),
        KEY idx_tickets_assigned_user (assigned_user_id),
        KEY idx_tickets_tt (trouble_ticket_id),
        KEY idx_tickets_wo (work_order_id)
      )
    `,
  )

  await ensureTicketColumn('ticket_code', "ticket_code VARCHAR(64) NOT NULL", 'id')
  await ensureTicketColumn('ticket_type', "ticket_type VARCHAR(32) NOT NULL", 'ticket_code')
  await ensureTicketColumn('title', 'title VARCHAR(255) NULL', 'ticket_type')
  await ensureTicketColumn('description', 'description TEXT NULL', 'title')
  await ensureTicketColumn('customer_name', 'customer_name VARCHAR(255) NULL', 'description')
  await ensureTicketColumn('customer_user', 'customer_user VARCHAR(128) NULL', 'customer_name')
  await ensureTicketColumn('customer_id', 'customer_id BIGINT UNSIGNED NULL', 'customer_user')
  await ensureTicketColumn('branch_id', 'branch_id BIGINT UNSIGNED NULL', 'customer_id')
  await ensureTicketColumn('subscription_id', 'subscription_id BIGINT UNSIGNED NULL', 'branch_id')
  await ensureTicketColumn("status", "status VARCHAR(32) NOT NULL DEFAULT 'OPEN'", 'subscription_id')
  await ensureTicketColumn("priority", "priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM'", 'status')
  await ensureTicketColumn('opened_at', 'opened_at DATETIME NOT NULL', 'priority')
  await ensureTicketColumn('assigned_user_id', 'assigned_user_id BIGINT UNSIGNED NULL', 'opened_at')
  await ensureTicketColumn('sla_due_at', 'sla_due_at DATETIME NULL', 'assigned_user_id')
  await ensureTicketColumn('submitted_at', 'submitted_at DATETIME NULL', 'sla_due_at')
  await ensureTicketColumn('submitted_by_user_id', 'submitted_by_user_id BIGINT NULL', 'submitted_at')
  await ensureTicketColumn('completed_at', 'completed_at DATETIME NULL', 'submitted_by_user_id')
  await ensureTicketColumn('closed_at', 'closed_at DATETIME NULL', 'completed_at')
  await ensureTicketColumn('trouble_ticket_id', 'trouble_ticket_id BIGINT UNSIGNED NULL', 'closed_at')
  await ensureTicketColumn('work_order_id', 'work_order_id BIGINT UNSIGNED NULL', 'trouble_ticket_id')
  await ensureTicketColumn('created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', 'work_order_id')
  await ensureTicketColumn(
    'updated_at',
    'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'created_at',
  )

  invalidateReviewDbColumnCache('tickets')
}

async function buildUnifiedTicketInsertPayload(params: CreateUnifiedTicketParams) {
  const [
    hasTicketCode,
    hasTicketType,
    hasTitle,
    hasDescription,
    hasCustomerName,
    hasCustomerUser,
    hasCustomerId,
    hasBranchId,
    hasSubscriptionId,
    hasStatus,
    hasPriority,
    hasOpenedAt,
    hasAssignedUserId,
    hasSlaDueAt,
    hasSubmittedAt,
    hasSubmittedByUserId,
    hasCompletedAt,
    hasClosedAt,
    hasTroubleTicketId,
    hasWorkOrderId,
  ] = await Promise.all([
    hasReviewDbColumn('tickets', 'ticket_code'),
    hasReviewDbColumn('tickets', 'ticket_type'),
    hasReviewDbColumn('tickets', 'title'),
    hasReviewDbColumn('tickets', 'description'),
    hasReviewDbColumn('tickets', 'customer_name'),
    hasReviewDbColumn('tickets', 'customer_user'),
    hasReviewDbColumn('tickets', 'customer_id'),
    hasReviewDbColumn('tickets', 'branch_id'),
    hasReviewDbColumn('tickets', 'subscription_id'),
    hasReviewDbColumn('tickets', 'status'),
    hasReviewDbColumn('tickets', 'priority'),
    hasReviewDbColumn('tickets', 'opened_at'),
    hasReviewDbColumn('tickets', 'assigned_user_id'),
    hasReviewDbColumn('tickets', 'sla_due_at'),
    hasReviewDbColumn('tickets', 'submitted_at'),
    hasReviewDbColumn('tickets', 'submitted_by_user_id'),
    hasReviewDbColumn('tickets', 'completed_at'),
    hasReviewDbColumn('tickets', 'closed_at'),
    hasReviewDbColumn('tickets', 'trouble_ticket_id'),
    hasReviewDbColumn('tickets', 'work_order_id'),
  ])

  if (!hasTicketCode || !hasTicketType || !hasOpenedAt) {
    throw new Error('Schema inti tickets belum siap. Kolom ticket_code, ticket_type, dan opened_at wajib tersedia.')
  }

  const columns = ['ticket_code', 'ticket_type', 'opened_at']
  const values: unknown[] = [params.ticketCode, params.ticketType, params.openedAt ?? new Date()]

  if (hasTitle) {
    columns.push('title')
    values.push(params.title ?? null)
  }
  if (hasDescription) {
    columns.push('description')
    values.push(params.description ?? null)
  }
  if (hasCustomerName) {
    columns.push('customer_name')
    values.push(params.customerName ?? null)
  }
  if (hasCustomerUser) {
    columns.push('customer_user')
    values.push(params.customerUser ?? null)
  }
  if (hasCustomerId) {
    columns.push('customer_id')
    values.push(params.customerId ?? null)
  }
  if (hasBranchId) {
    columns.push('branch_id')
    values.push(params.branchId ?? null)
  }
  if (hasSubscriptionId) {
    columns.push('subscription_id')
    values.push(params.subscriptionId ?? null)
  }
  if (hasStatus) {
    columns.push('status')
    values.push(params.status ?? 'OPEN')
  }
  if (hasPriority) {
    columns.push('priority')
    values.push(params.priority ?? 'MEDIUM')
  }
  if (hasAssignedUserId) {
    columns.push('assigned_user_id')
    values.push(params.assignedUserId ?? null)
  }
  if (hasSlaDueAt) {
    columns.push('sla_due_at')
    values.push(params.slaDueAt ?? null)
  }
  if (hasSubmittedAt) {
    columns.push('submitted_at')
    values.push(params.submittedAt ?? null)
  }
  if (hasSubmittedByUserId) {
    columns.push('submitted_by_user_id')
    values.push(params.submittedByUserId ?? null)
  }
  if (hasCompletedAt) {
    columns.push('completed_at')
    values.push(params.completedAt ?? null)
  }
  if (hasClosedAt) {
    columns.push('closed_at')
    values.push(params.closedAt ?? null)
  }
  if (hasTroubleTicketId) {
    columns.push('trouble_ticket_id')
    values.push(params.troubleTicketId ?? null)
  }
  if (hasWorkOrderId) {
    columns.push('work_order_id')
    values.push(params.workOrderId ?? null)
  }

  return { columns, values }
}

async function syncLegacyWorkOrder(
  conn: ReviewDbConnection,
  params: CreateUnifiedTicketParams,
  unifiedTicketId: number,
) {
  if (!params.legacy || params.legacy.source !== 'WORK_ORDER') return

  const legacy = params.legacy as CreateUnifiedTicketLegacyWorkOrder
  const workOrderId = Number(legacy.workOrderId ?? 0)

  if (workOrderId > 0) {
    const [hasWoSubmittedAt, hasWoSubmittedBy, hasWoUnifiedId] = await Promise.all([
      hasReviewDbColumn('service_work_orders', 'submitted_at'),
      hasReviewDbColumn('service_work_orders', 'submitted_by_user_id'),
      hasReviewDbColumn('service_work_orders', 'unified_ticket_id'),
    ])

    const setParts: string[] = []
    const setValues: unknown[] = []

    if (hasWoSubmittedAt) {
      setParts.push('submitted_at = COALESCE(submitted_at, ?)')
      setValues.push(params.submittedAt ?? null)
    }
    if (hasWoSubmittedBy) {
      setParts.push('submitted_by_user_id = COALESCE(submitted_by_user_id, ?)')
      setValues.push(params.submittedByUserId ?? null)
    }
    if (hasWoUnifiedId) {
      setParts.push('unified_ticket_id = ?')
      setValues.push(unifiedTicketId)
    }

    if (setParts.length > 0) {
      setValues.push(workOrderId)
      await conn.query(
        `UPDATE service_work_orders SET ${setParts.join(', ')} WHERE id = ? LIMIT 1`,
        setValues,
      )
    }
  }
}

async function syncLegacyTroubleTicket(
  conn: ReviewDbConnection,
  params: CreateUnifiedTicketParams,
  unifiedTicketId: number,
) {
  if (!params.legacy || params.legacy.source !== 'TROUBLE_TICKET') return

  const legacy = params.legacy as CreateUnifiedTicketLegacyTroubleTicket
  const ttId = Number(legacy.troubleTicketId ?? 0)

  if (ttId > 0) {
    const [hasTtSubmittedAt, hasTtSubmittedBy, hasTtUnifiedId] = await Promise.all([
      hasReviewDbColumn('support_trouble_tickets', 'submitted_at'),
      hasReviewDbColumn('support_trouble_tickets', 'submitted_by_user_id'),
      hasReviewDbColumn('support_trouble_tickets', 'unified_ticket_id'),
    ])

    const setParts: string[] = []
    const setValues: unknown[] = []

    if (hasTtSubmittedAt) {
      setParts.push('submitted_at = COALESCE(submitted_at, ?)')
      setValues.push(params.submittedAt ?? null)
    }
    if (hasTtSubmittedBy) {
      setParts.push('submitted_by_user_id = COALESCE(submitted_by_user_id, ?)')
      setValues.push(params.submittedByUserId ?? null)
    }
    if (hasTtUnifiedId) {
      setParts.push('unified_ticket_id = ?')
      setValues.push(unifiedTicketId)
    }

    if (setParts.length > 0) {
      setValues.push(ttId)
      await conn.query(
        `UPDATE support_trouble_tickets SET ${setParts.join(', ')} WHERE id = ? LIMIT 1`,
        setValues,
      )
    }
  }
}

export async function createUnifiedTicketAndSyncLegacy(params: CreateUnifiedTicketParams) {
  await ensureTicketsUnifiedTable()

  const payload = await buildUnifiedTicketInsertPayload(params)
  const insertSql = `INSERT INTO tickets (${payload.columns.join(', ')}) VALUES (${payload.columns.map(() => '?').join(', ')})`

  return runReviewDbTransaction(async (conn) => {
    const [insertRes] = await conn.query(insertSql, payload.values)
    const result = insertRes as unknown as ExecuteResult
    const insertId = Number(result.insertId ?? 0)
    if (!Number.isInteger(insertId) || insertId <= 0) {
      throw new Error('Unified ticket insert tidak menghasilkan ID yang valid.')
    }

    if (params.legacy?.source === 'WORK_ORDER') {
      await syncLegacyWorkOrder(conn, params, insertId)
    } else if (params.legacy?.source === 'TROUBLE_TICKET') {
      await syncLegacyTroubleTicket(conn, params, insertId)
    }

    return {
      unifiedTicketId: insertId,
      ticketCode: params.ticketCode,
      ticketType: params.ticketType,
      affectedRows: Number(result.affectedRows ?? 1),
    }
  })
}

export type ActiveTechnicianAssignmentResult = {
  found: boolean
  assignedUserId: number | null
  source: 'UNIFIED_ASSIGNED' | 'WO_ASSIGNMENT' | 'TT_DIRECT' | 'WO_DIRECT' | null
  assignmentId: number | null
}

export async function getActiveTechnicianAssignmentByTicketId(
  ticketId: number,
  sessionUserId: number,
): Promise<ActiveTechnicianAssignmentResult> {
  const ticketIdNum = Number(ticketId ?? 0)
  const sessionUserIdNum = Number(sessionUserId ?? 0)
  if (!Number.isInteger(ticketIdNum) || ticketIdNum <= 0) {
    return { found: false, assignedUserId: null, source: null, assignmentId: null }
  }

  await ensureTicketsUnifiedTable()

  const [
    hasAssignedUserId,
    hasSubmittedAt,
    hasCompletedAt,
    hasClosedAt,
    hasWorkOrderId,
    hasTroubleTicketId,
  ] = await Promise.all([
    hasReviewDbColumn('tickets', 'assigned_user_id'),
    hasReviewDbColumn('tickets', 'submitted_at'),
    hasReviewDbColumn('tickets', 'completed_at'),
    hasReviewDbColumn('tickets', 'closed_at'),
    hasReviewDbColumn('tickets', 'work_order_id'),
    hasReviewDbColumn('tickets', 'trouble_ticket_id'),
  ])

  const selectCols = ['t.id']
  if (hasAssignedUserId) selectCols.push('t.assigned_user_id AS unifiedAssignedUserId')
  if (hasWorkOrderId) selectCols.push('t.work_order_id AS unifiedWorkOrderId')
  if (hasTroubleTicketId) selectCols.push('t.trouble_ticket_id AS unifiedTroubleTicketId')

  const terminalParts: string[] = []
  if (hasSubmittedAt) terminalParts.push('t.submitted_at IS NULL')
  if (hasCompletedAt) terminalParts.push('t.completed_at IS NULL')
  if (hasClosedAt) terminalParts.push('t.closed_at IS NULL')
  const terminalClause = terminalParts.length > 0 ? `AND ${terminalParts.join(' AND ')}` : ''

  const ticketRows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT ${selectCols.join(', ')}
      FROM tickets t
      WHERE t.id = ?
      ${terminalClause}
      LIMIT 1
    `,
    [ticketIdNum],
  )

  const ticketRow = ticketRows[0]
  if (!ticketRow) {
    return { found: false, assignedUserId: null, source: null, assignmentId: null }
  }

  if (hasAssignedUserId) {
    const unifiedUserId = Number(ticketRow.unifiedAssignedUserId ?? 0)
    if (Number.isInteger(unifiedUserId) && unifiedUserId > 0 && unifiedUserId === sessionUserIdNum) {
      return {
        found: true,
        assignedUserId: unifiedUserId,
        source: 'UNIFIED_ASSIGNED',
        assignmentId: null,
      }
    }
  }

  const activePlaceholders = Q3_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')
  const bindBase: unknown[] = [
    sessionUserIdNum,
    Q3_ASSIGNMENT_ROLE_CANONICAL,
    ...Q3_ASSIGNMENT_ACTIVE_STATUSES,
  ]

  if (hasWorkOrderId) {
    const woId = Number(ticketRow.unifiedWorkOrderId ?? 0)
    if (Number.isInteger(woId) && woId > 0) {
      const assignmentRows = await runReviewDbQuery<Record<string, unknown>>(
        `
          SELECT a.id AS assignmentId, a.assigned_user_id AS assignedUserId
          FROM service_work_order_assignments a
          WHERE a.work_order_id = ?
            AND a.assigned_user_id = ?
            AND a.assignment_role = ?
            AND a.assignment_status IN (${activePlaceholders})
            AND a.released_at IS NULL
          LIMIT 1
        `,
        [woId, ...bindBase],
      )
      if (assignmentRows[0]) {
        return {
          found: true,
          assignedUserId: Number(assignmentRows[0].assignedUserId ?? 0) || null,
          source: 'WO_ASSIGNMENT',
          assignmentId: Number(assignmentRows[0].assignmentId ?? 0) || null,
        }
      }

      const hasWoPic = await hasReviewDbColumn('service_work_orders', 'current_pic_user_id')
      if (hasWoPic) {
        const woRows = await runReviewDbQuery<Record<string, unknown>>(
          `
            SELECT current_pic_user_id AS picUserId
            FROM service_work_orders
            WHERE id = ?
              AND current_pic_user_id = ?
            LIMIT 1
          `,
          [woId, sessionUserIdNum],
        )
        if (woRows[0]) {
          return {
            found: true,
            assignedUserId: Number(woRows[0].picUserId ?? 0) || null,
            source: 'WO_DIRECT',
            assignmentId: null,
          }
        }
      }
    }
  }

  if (hasTroubleTicketId) {
    const ttId = Number(ticketRow.unifiedTroubleTicketId ?? 0)
    if (Number.isInteger(ttId) && ttId > 0) {
      const hasTtAssignedUserId = await hasReviewDbColumn('support_trouble_tickets', 'assigned_user_id')
      if (hasTtAssignedUserId) {
        const ttRows = await runReviewDbQuery<Record<string, unknown>>(
          `
            SELECT assigned_user_id AS assignedUserId
            FROM support_trouble_tickets
            WHERE id = ?
              AND assigned_user_id = ?
            LIMIT 1
          `,
          [ttId, sessionUserIdNum],
        )
        if (ttRows[0]) {
          return {
            found: true,
            assignedUserId: Number(ttRows[0].assignedUserId ?? 0) || null,
            source: 'TT_DIRECT',
            assignmentId: null,
          }
        }
      }
    }
  }

  return { found: false, assignedUserId: null, source: null, assignmentId: null }
}
