import {
  hasReviewDbColumn,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
  type ReviewDbConnection,
} from '@/lib/review-db'
import {
  Q3_ASSIGNMENT_ACTIVE_STATUSES,
  Q3_ASSIGNMENT_ROLE_CANONICAL,
} from '@/lib/q3-field-tech-ownership'
import {
  getActiveTechnicianAssignmentByTicketId,
  ensureTicketsUnifiedTable,
} from '@/lib/services/unified-ticket-service'
import {
  insertServiceWorkOrderStatusLog,
  insertSupportTroubleTicketProgressLog,
  transitionWorkOrderStatus,
} from '@/lib/services/field-ops-service'
import {
  ensureTechnicianSchemaFoundation,
} from '@/lib/services/technician-schema-ensure'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'
import type { AppRole } from '@/lib/types'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

export type FieldTechSession = {
  userId: number
  role: AppRole
  branchId: number | null
  branchIds: number[]
}

export type TransitionResult = {
  success: boolean
  idempotent: boolean
  affectedRows: number
  fromStatus: string | null
  toStatus: string | null
  ticketId: number | null
  workOrderId: number | null
  troubleTicketId: number | null
}

const NON_TERMINAL_WO_FROM = new Set([
  'OPEN',
  'SCHEDULED',
  'ASSIGNED',
  'ACCEPTED',
  'ON_PROGRESS',
  'PENDING',
  'TEMPORARY',
])

const NON_TERMINAL_TT_FROM = new Set([
  'OPEN',
  'NEW',
  'SCHEDULED',
  'ASSIGNED',
  'ACCEPTED',
  'ON_PROGRESS',
  'IN_PROGRESS',
  'PENDING',
  'TEMPORARY',
  'ON_HOLD',
])

async function isWorkOrderOwnedByTech(
  conn: ReviewDbConnection,
  workOrderId: number,
  sessionUserId: number,
): Promise<boolean> {
  const idNum = Number(workOrderId ?? 0)
  const uid = Number(sessionUserId ?? 0)
  if (!Number.isInteger(idNum) || idNum <= 0 || !Number.isInteger(uid) || uid <= 0) return false

  const hasPic = await hasReviewDbColumn('service_work_orders', 'current_pic_user_id')
  const activePlaceholders = Q3_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')

  const picClause = hasPic ? 'wo.current_pic_user_id = ?' : 'FALSE'
  const bindBase: unknown[] = [
    idNum,
    uid,
    Q3_ASSIGNMENT_ROLE_CANONICAL,
    ...Q3_ASSIGNMENT_ACTIVE_STATUSES,
    uid,
  ]

  const rowsQ = await conn.query(
    `
      SELECT 1 AS matched
      FROM service_work_orders wo
      WHERE wo.id = ?
        AND (
          (EXISTS (
            SELECT 1
            FROM service_work_order_assignments a
            WHERE a.work_order_id = wo.id
              AND a.assigned_user_id = ?
              AND a.assignment_role = ?
              AND a.assignment_status IN (${activePlaceholders})
              AND a.released_at IS NULL
          ))
          OR (
            ${picClause}
            AND NOT EXISTS (
              SELECT 1
              FROM service_work_order_assignments a_other
              WHERE a_other.work_order_id = wo.id
                AND a_other.assigned_user_id <> wo.current_pic_user_id
                AND a_other.released_at IS NULL
            )
          )
        )
      LIMIT 1
    `,
    bindBase,
  ).catch(() => [[], []] as unknown as [Record<string, unknown>[], unknown[]])
  const rows = (Array.isArray(rowsQ) && Array.isArray(rowsQ[0]) ? rowsQ[0] : (Array.isArray(rowsQ) ? rowsQ : [])) as Record<string, unknown>[]

  return Number(rows[0]?.matched ?? 0) === 1
}

async function isTroubleTicketOwnedByTech(
  conn: ReviewDbConnection,
  ticketCodeOrId: string | number,
  sessionUserId: number,
): Promise<{ owned: boolean; troubleTicketId: number }> {
  const uid = Number(sessionUserId ?? 0)
  if (!Number.isInteger(uid) || uid <= 0) return { owned: false, troubleTicketId: 0 }

  const hasAssigned = await hasReviewDbColumn('support_trouble_tickets', 'assigned_user_id')
  const activePlaceholders = Q3_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')
  const hasAssignmentsTable = await hasReviewDbColumn('service_trouble_ticket_assignments', 'trouble_ticket_id')

  let byCode: unknown[] = []
  let byId: unknown[] = []
  if (typeof ticketCodeOrId === 'number') {
    byId = [ticketCodeOrId]
  } else {
    byCode = [String(ticketCodeOrId ?? '').trim().toUpperCase()]
  }

  const wherePk = byCode.length > 0 ? 'UPPER(tt.ticket_code) = ?' : 'tt.id = ?'
  const pkVals = byCode.length > 0 ? byCode : byId

  const directClause = hasAssigned ? 'tt.assigned_user_id = ?' : 'FALSE'
  const existsClause = hasAssignmentsTable
    ? `(EXISTS (
        SELECT 1
        FROM service_trouble_ticket_assignments ta
        WHERE ta.trouble_ticket_id = tt.id
          AND ta.assigned_user_id = ?
          AND ta.assignment_role = ?
          AND ta.assignment_status IN (${activePlaceholders})
          AND ta.released_at IS NULL
      ))`
    : 'FALSE'
  const fallbackClause = hasAssignmentsTable
    ? hasAssigned
      ? `(${directClause}
          AND NOT EXISTS (
            SELECT 1
            FROM service_trouble_ticket_assignments ta_other
            WHERE ta_other.trouble_ticket_id = tt.id
              AND ta_other.assigned_user_id <> tt.assigned_user_id
              AND ta_other.released_at IS NULL
          ))`
      : directClause
    : directClause

  const bind: unknown[] = hasAssignmentsTable
    ? [
        ...pkVals,
        uid,
        Q3_ASSIGNMENT_ROLE_CANONICAL,
        ...Q3_ASSIGNMENT_ACTIVE_STATUSES,
        uid,
      ]
    : [...pkVals, uid]

  const rowsQ = await conn.query(
    `
      SELECT tt.id AS ttId, 1 AS matched
      FROM support_trouble_tickets tt
      WHERE ${wherePk}
        AND (${existsClause} OR ${fallbackClause})
      LIMIT 1
    `,
    bind,
  ).catch(() => [[], []] as unknown as [Record<string, unknown>[], unknown[]])
  const rows = (Array.isArray(rowsQ) && Array.isArray(rowsQ[0]) ? rowsQ[0] : (Array.isArray(rowsQ) ? rowsQ : [])) as Record<string, unknown>[]

  const matched = Number(rows[0]?.matched ?? 0) === 1
  const ttId = Number(rows[0]?.ttId ?? 0)
  return { owned: matched, troubleTicketId: ttId }
}

export async function startOnProgressWorkOrder(params: {
  workOrderId: number
  session: FieldTechSession
  notes?: string | null
}): Promise<TransitionResult> {
  await ensureTechnicianSchemaFoundation()
  const woId = Number(params.workOrderId ?? 0)
  const uid = Number(params.session?.userId ?? 0)
  if (!Number.isInteger(woId) || woId <= 0 || !Number.isInteger(uid) || uid <= 0) {
    return {
      success: false,
      idempotent: false,
      affectedRows: 0,
      fromStatus: null,
      toStatus: null,
      ticketId: null,
      workOrderId: woId || null,
      troubleTicketId: null,
    }
  }

  return runReviewDbTransaction<TransitionResult>(async (conn) => {
    const owned = await isWorkOrderOwnedByTech(conn, woId, uid)
    if (!owned) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }

    const [rowsRaw] = await conn.query(
      `SELECT id, status, work_order_no AS workOrderNo FROM service_work_orders WHERE id = ? LIMIT 1 FOR UPDATE`,
      [woId],
    )
    const rows = (rowsRaw as Array<Record<string, unknown>>) || []
    const row = rows[0]
    if (!row) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }
    const fromStatus = String(row.status ?? '').trim().toUpperCase()

    if (fromStatus === 'ON_PROGRESS' || fromStatus === 'IN_PROGRESS') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'ON_PROGRESS',
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }

    if (!NON_TERMINAL_WO_FROM.has(fromStatus)) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }

    try {
      const res = await transitionWorkOrderStatus({
        workOrderId: woId,
        toStatus: 'ON_PROGRESS',
        actorUserId: uid,
        actorUsername: null,
        reasonNotes: params.notes ?? null,
        startedAt: new Date(),
        opts: { connection: conn },
      })
      return {
        success: res.success,
        idempotent: res.idempotent,
        affectedRows: res.success ? 1 : 0,
        fromStatus: res.fromStatus,
        toStatus: res.toStatus,
        ticketId: null,
        workOrderId: res.workOrderId,
        troubleTicketId: null,
      }
    } catch {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }
  })
}

export async function submitWorkOrder(params: {
  workOrderId: number
  session: FieldTechSession
  notes?: string | null
}): Promise<TransitionResult> {
  await ensureTechnicianSchemaFoundation()
  await ensureTicketsUnifiedTable()
  const woId = Number(params.workOrderId ?? 0)
  const uid = Number(params.session?.userId ?? 0)
  if (!Number.isInteger(woId) || woId <= 0 || !Number.isInteger(uid) || uid <= 0) {
    return {
      success: false,
      idempotent: false,
      affectedRows: 0,
      fromStatus: null,
      toStatus: null,
      ticketId: null,
      workOrderId: woId || null,
      troubleTicketId: null,
    }
  }

  const hasSubmittedAt = await hasReviewDbColumn('service_work_orders', 'submitted_at')
  const hasSubmittedBy = await hasReviewDbColumn('service_work_orders', 'submitted_by_user_id')
  const hasWoUnifiedId = await hasReviewDbColumn('service_work_orders', 'unified_ticket_id')

  return runReviewDbTransaction<TransitionResult>(async (conn) => {
    const owned = await isWorkOrderOwnedByTech(conn, woId, uid)
    if (!owned) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }

    const [rowsRaw] = await conn.query(
      `SELECT id, status, work_order_no AS workOrderNo, trouble_ticket_id AS ttId FROM service_work_orders WHERE id = ? LIMIT 1 FOR UPDATE`,
      [woId],
    )
    const rows = (rowsRaw as Array<Record<string, unknown>>) || []
    const row = rows[0]
    if (!row) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: null,
      }
    }
    const fromStatus = String(row.status ?? '').trim().toUpperCase()
    const linkedTtId = Number(row.ttId ?? 0)

    if (fromStatus === 'COMPLETED') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'COMPLETED',
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: linkedTtId || null,
      }
    }

    const sets: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']
    const bind: unknown[] = ['COMPLETED']
    if (hasSubmittedAt) {
      sets.push('submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)')
    }
    if (hasSubmittedBy) {
      sets.push('submitted_by_user_id = COALESCE(submitted_by_user_id, ?)')
      bind.push(uid)
    }
    bind.push(woId)
    bind.push(fromStatus)

    const [updRaw] = await conn.query(
      `UPDATE service_work_orders SET ${sets.join(', ')} WHERE id = ? AND status = ? LIMIT 1`,
      bind,
    )
    const affected = Number((updRaw as ExecuteResult | undefined)?.affectedRows ?? 0)

    if (affected <= 0 && fromStatus === 'COMPLETED') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'COMPLETED',
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: linkedTtId || null,
      }
    }
    if (affected <= 0) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: woId,
        troubleTicketId: linkedTtId || null,
      }
    }

    await insertServiceWorkOrderStatusLog(
      {
        workOrderId: woId,
        fromStatus,
        toStatus: 'COMPLETED',
        changedByUserId: uid,
        reasonCode: 'WO_SUBMIT',
        reasonNotes: params.notes && String(params.notes).trim()
          ? String(params.notes).trim().slice(0, 255)
          : `Work order disubmit oleh user#${uid}`,
      },
      { connection: conn },
    )

    let unifiedTicketId: number | null = null
    try {
      const hasUnifiedWorkOrderId = await hasReviewDbColumn('tickets', 'work_order_id')
      const hasUnifiedStatus = await hasReviewDbColumn('tickets', 'status')
      const hasUnifiedSubmittedAt = await hasReviewDbColumn('tickets', 'submitted_at')
      const hasUnifiedSubmittedBy = await hasReviewDbColumn('tickets', 'submitted_by_user_id')
      const hasUnifiedCompletedAt = await hasReviewDbColumn('tickets', 'completed_at')
      if (hasUnifiedWorkOrderId) {
        const [unifiedRows] = await conn.query(
          `SELECT id FROM tickets WHERE work_order_id = ? LIMIT 1`,
          [woId],
        )
        const unifiedArr = (unifiedRows as Array<Record<string, unknown>>) || []
        const unifiedRow = unifiedArr[0]
        if (unifiedRow) {
          unifiedTicketId = Number(unifiedRow.id ?? 0) || null
          if (unifiedTicketId) {
            const usets: string[] = []
            const ubind: unknown[] = []
            if (hasUnifiedStatus) {
              usets.push('status = ?')
              ubind.push('COMPLETED')
            }
            if (hasUnifiedSubmittedAt) {
              usets.push('submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)')
            }
            if (hasUnifiedSubmittedBy) {
              usets.push('submitted_by_user_id = COALESCE(submitted_by_user_id, ?)')
              ubind.push(uid)
            }
            if (hasUnifiedCompletedAt) {
              usets.push('completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)')
            }
            usets.push('updated_at = CURRENT_TIMESTAMP')
            ubind.push(unifiedTicketId)
            await conn.query(
              `UPDATE tickets SET ${usets.join(', ')} WHERE id = ? LIMIT 1`,
              ubind,
            ).catch(() => null)
          }
        }
      }
      if (hasWoUnifiedId && unifiedTicketId) {
        await conn.query(
          `UPDATE service_work_orders SET unified_ticket_id = COALESCE(unified_ticket_id, ?) WHERE id = ? LIMIT 1`,
          [unifiedTicketId, woId],
        ).catch(() => null)
      }
    } catch {
    }

    return {
      success: true,
      idempotent: false,
      affectedRows: affected,
      fromStatus,
      toStatus: 'COMPLETED',
      ticketId: unifiedTicketId,
      workOrderId: woId,
      troubleTicketId: linkedTtId || null,
    }
  })
}

export async function startOnProgressTroubleTicket(params: {
  ticketCode: string
  session: FieldTechSession
  notes?: string | null
}): Promise<TransitionResult> {
  await ensureTechnicianSchemaFoundation()
  await ensureSupportTroubleTicketProgressTable()
  const code = String(params.ticketCode ?? '').trim().toUpperCase()
  const uid = Number(params.session?.userId ?? 0)
  if (!code || !Number.isInteger(uid) || uid <= 0) {
    return {
      success: false,
      idempotent: false,
      affectedRows: 0,
      fromStatus: null,
      toStatus: null,
      ticketId: null,
      workOrderId: null,
      troubleTicketId: null,
    }
  }

  return runReviewDbTransaction<TransitionResult>(async (conn) => {
    const ownership = await isTroubleTicketOwnedByTech(conn, code, uid)
    if (!ownership.owned || !ownership.troubleTicketId) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ownership.troubleTicketId || null,
      }
    }
    const ttId = ownership.troubleTicketId

    const [rowsRaw] = await conn.query(
      `SELECT id, status FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`,
      [ttId],
    )
    const rows = (rowsRaw as Array<Record<string, unknown>>) || []
    const row = rows[0]
    if (!row) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }
    const fromStatus = String(row.status ?? '').trim().toUpperCase()

    if (fromStatus === 'ON_PROGRESS' || fromStatus === 'IN_PROGRESS') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'ON_PROGRESS',
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    if (!NON_TERMINAL_TT_FROM.has(fromStatus)) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const hasTtStatus = await hasReviewDbColumn('support_trouble_tickets', 'status')
    const hasTtAssigned = await hasReviewDbColumn('support_trouble_tickets', 'assigned_user_id')
    if (!hasTtStatus) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }
    const sets: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']
    const bind: unknown[] = ['ON_PROGRESS']
    if (hasTtAssigned) {
      sets.push('assigned_user_id = COALESCE(assigned_user_id, ?)')
      bind.push(uid)
    }
    bind.push(ttId)
    bind.push(fromStatus)

    const [updRaw] = await conn.query(
      `UPDATE support_trouble_tickets SET ${sets.join(', ')} WHERE id = ? AND status = ? LIMIT 1`,
      bind,
    )
    const affected = Number((updRaw as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affected <= 0) {
      const currentCheck = await conn.query(
        `SELECT status FROM support_trouble_tickets WHERE id = ? LIMIT 1`,
        [ttId],
      ).catch(() => [[{ status: '' }]])
      const st = String(((currentCheck as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]?.status) ?? '').trim().toUpperCase()
      if (st === 'ON_PROGRESS' || st === 'IN_PROGRESS') {
        return {
          success: true,
          idempotent: true,
          affectedRows: 1,
          fromStatus,
          toStatus: 'ON_PROGRESS',
          ticketId: null,
          workOrderId: null,
          troubleTicketId: ttId,
        }
      }
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    try {
      const ownerRows = await conn.query(
        `SELECT display_name AS dn, username AS un FROM auth_users WHERE id = ? LIMIT 1`,
        [uid],
      ).catch(() => [[{ dn: null, un: null }]])
      const ownerRow = (ownerRows as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]
      const ownerName = String(ownerRow?.dn ?? ownerRow?.un ?? `user:${uid}`).trim() || `user:${uid}`
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'ON_PROGRESS',
          ownerName,
          progressNotes: params.notes && String(params.notes).trim()
            ? String(params.notes).trim().slice(0, 1000)
            : `[START] Trouble ticket dimulai oleh ${ownerName}.`,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch {
    }

    try {
      const hasUnifiedTtId = await hasReviewDbColumn('tickets', 'trouble_ticket_id')
      const hasUnifiedStatus = await hasReviewDbColumn('tickets', 'status')
      if (hasUnifiedTtId) {
        const usets: string[] = []
        const ubind: unknown[] = []
        if (hasUnifiedStatus) {
          usets.push('status = ?')
          ubind.push('ON_PROGRESS')
        }
        usets.push('updated_at = CURRENT_TIMESTAMP')
        ubind.push(ttId)
        if (usets.length >= 2) {
          await conn.query(
            `UPDATE tickets SET ${usets.join(', ')} WHERE trouble_ticket_id = ? LIMIT 1`,
            ubind,
          ).catch(() => null)
        }
      }
    } catch {
    }

    return {
      success: true,
      idempotent: false,
      affectedRows: affected,
      fromStatus,
      toStatus: 'ON_PROGRESS',
      ticketId: null,
      workOrderId: null,
      troubleTicketId: ttId,
    }
  })
}

export async function submitTroubleTicket(params: {
  ticketCode: string
  session: FieldTechSession
  notes?: string | null
}): Promise<TransitionResult> {
  await ensureTechnicianSchemaFoundation()
  await ensureSupportTroubleTicketProgressTable()
  await ensureTicketsUnifiedTable()
  const code = String(params.ticketCode ?? '').trim().toUpperCase()
  const uid = Number(params.session?.userId ?? 0)
  if (!code || !Number.isInteger(uid) || uid <= 0) {
    return {
      success: false,
      idempotent: false,
      affectedRows: 0,
      fromStatus: null,
      toStatus: null,
      ticketId: null,
      workOrderId: null,
      troubleTicketId: null,
    }
  }

  const hasTtSubmittedAt = await hasReviewDbColumn('support_trouble_tickets', 'submitted_at')
  const hasTtSubmittedBy = await hasReviewDbColumn('support_trouble_tickets', 'submitted_by_user_id')
  const hasTtUnifiedId = await hasReviewDbColumn('support_trouble_tickets', 'unified_ticket_id')

  return runReviewDbTransaction<TransitionResult>(async (conn) => {
    const ownership = await isTroubleTicketOwnedByTech(conn, code, uid)
    if (!ownership.owned || !ownership.troubleTicketId) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ownership.troubleTicketId || null,
      }
    }
    const ttId = ownership.troubleTicketId

    const [rowsRaw] = await conn.query(
      `SELECT id, status FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`,
      [ttId],
    )
    const rows = (rowsRaw as Array<Record<string, unknown>>) || []
    const row = rows[0]
    if (!row) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }
    const fromStatus = String(row.status ?? '').trim().toUpperCase()

    if (fromStatus === 'COMPLETED') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'COMPLETED',
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const sets: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']
    const bind: unknown[] = ['COMPLETED']
    if (hasTtSubmittedAt) {
      sets.push('submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)')
    }
    if (hasTtSubmittedBy) {
      sets.push('submitted_by_user_id = COALESCE(submitted_by_user_id, ?)')
      bind.push(uid)
    }
    bind.push(ttId)
    bind.push(fromStatus)

    const [updRaw] = await conn.query(
      `UPDATE support_trouble_tickets SET ${sets.join(', ')} WHERE id = ? AND status = ? LIMIT 1`,
      bind,
    )
    const affected = Number((updRaw as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affected <= 0) {
      const currentCheck = await conn.query(
        `SELECT status FROM support_trouble_tickets WHERE id = ? LIMIT 1`,
        [ttId],
      ).catch(() => [[{ status: '' }]])
      const st = String(((currentCheck as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]?.status) ?? '').trim().toUpperCase()
      if (st === 'COMPLETED') {
        return {
          success: true,
          idempotent: true,
          affectedRows: 1,
          fromStatus,
          toStatus: 'COMPLETED',
          ticketId: null,
          workOrderId: null,
          troubleTicketId: ttId,
        }
      }
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    try {
      const ownerRows = await conn.query(
        `SELECT display_name AS dn, username AS un FROM auth_users WHERE id = ? LIMIT 1`,
        [uid],
      ).catch(() => [[{ dn: null, un: null }]])
      const ownerRow = (ownerRows as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]
      const ownerName = String(ownerRow?.dn ?? ownerRow?.un ?? `user:${uid}`).trim() || `user:${uid}`
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'COMPLETED',
          ownerName,
          progressNotes: params.notes && String(params.notes).trim()
            ? String(params.notes).trim().slice(0, 1000)
            : `[SUBMIT] Trouble ticket disubmit oleh ${ownerName}.`,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch {
    }

    let unifiedTicketId: number | null = null
    try {
      const hasUnifiedTtId = await hasReviewDbColumn('tickets', 'trouble_ticket_id')
      const hasUnifiedStatus = await hasReviewDbColumn('tickets', 'status')
      const hasUnifiedSubmittedAt = await hasReviewDbColumn('tickets', 'submitted_at')
      const hasUnifiedSubmittedBy = await hasReviewDbColumn('tickets', 'submitted_by_user_id')
      const hasUnifiedCompletedAt = await hasReviewDbColumn('tickets', 'completed_at')
      if (hasUnifiedTtId) {
        const [unifiedRows] = await conn.query(
          `SELECT id FROM tickets WHERE trouble_ticket_id = ? LIMIT 1`,
          [ttId],
        )
        const unifiedArr = (unifiedRows as Array<Record<string, unknown>>) || []
        const unifiedRow = unifiedArr[0]
        if (unifiedRow) {
          unifiedTicketId = Number(unifiedRow.id ?? 0) || null
          if (unifiedTicketId) {
            const usets: string[] = []
            const ubind: unknown[] = []
            if (hasUnifiedStatus) {
              usets.push('status = ?')
              ubind.push('COMPLETED')
            }
            if (hasUnifiedSubmittedAt) {
              usets.push('submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP)')
            }
            if (hasUnifiedSubmittedBy) {
              usets.push('submitted_by_user_id = COALESCE(submitted_by_user_id, ?)')
              ubind.push(uid)
            }
            if (hasUnifiedCompletedAt) {
              usets.push('completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)')
            }
            usets.push('updated_at = CURRENT_TIMESTAMP')
            ubind.push(unifiedTicketId)
            await conn.query(
              `UPDATE tickets SET ${usets.join(', ')} WHERE id = ? LIMIT 1`,
              ubind,
            ).catch(() => null)
          }
        }
      }
      if (hasTtUnifiedId && unifiedTicketId) {
        await conn.query(
          `UPDATE support_trouble_tickets SET unified_ticket_id = COALESCE(unified_ticket_id, ?) WHERE id = ? LIMIT 1`,
          [unifiedTicketId, ttId],
        ).catch(() => null)
      }
    } catch {
    }

    return {
      success: true,
      idempotent: false,
      affectedRows: affected,
      fromStatus,
      toStatus: 'COMPLETED',
      ticketId: unifiedTicketId,
      workOrderId: null,
      troubleTicketId: ttId,
    }
  })
}

export async function markTroubleTicketTemporary(params: {
  ticketCode: string
  session: FieldTechSession
  reason: string
}): Promise<TransitionResult> {
  await ensureTechnicianSchemaFoundation()
  await ensureSupportTroubleTicketProgressTable()
  const code = String(params.ticketCode ?? '').trim().toUpperCase()
  const uid = Number(params.session?.userId ?? 0)
  const reason = String(params.reason ?? '').trim()
  if (!code || !Number.isInteger(uid) || uid <= 0 || !reason) {
    return {
      success: false,
      idempotent: false,
      affectedRows: 0,
      fromStatus: null,
      toStatus: null,
      ticketId: null,
      workOrderId: null,
      troubleTicketId: null,
    }
  }

  return runReviewDbTransaction<TransitionResult>(async (conn) => {
    const ownership = await isTroubleTicketOwnedByTech(conn, code, uid)
    if (!ownership.owned || !ownership.troubleTicketId) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ownership.troubleTicketId || null,
      }
    }
    const ttId = ownership.troubleTicketId

    const [rowsRaw] = await conn.query(
      `SELECT id, status FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`,
      [ttId],
    )
    const rows = (rowsRaw as Array<Record<string, unknown>>) || []
    const row = rows[0]
    if (!row) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }
    const fromStatus = String(row.status ?? '').trim().toUpperCase()

    if (fromStatus === 'TEMPORARY') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'TEMPORARY',
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    if (fromStatus !== 'ON_PROGRESS') {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const hasTtStatus = await hasReviewDbColumn('support_trouble_tickets', 'status')
    if (!hasTtStatus) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const [updRaw] = await conn.query(
      `UPDATE support_trouble_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ? LIMIT 1`,
      ['TEMPORARY', ttId, fromStatus],
    )
    const affected = Number((updRaw as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affected <= 0) {
      const currentCheck = await conn.query(
        `SELECT status FROM support_trouble_tickets WHERE id = ? LIMIT 1`,
        [ttId],
      ).catch(() => [[{ status: '' }]])
      const st = String(((currentCheck as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]?.status) ?? '').trim().toUpperCase()
      if (st === 'TEMPORARY') {
        return {
          success: true,
          idempotent: true,
          affectedRows: 1,
          fromStatus,
          toStatus: 'TEMPORARY',
          ticketId: null,
          workOrderId: null,
          troubleTicketId: ttId,
        }
      }
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const hasTtWorkOrderId = await hasReviewDbColumn('support_trouble_tickets', 'work_order_id')
    try {
      const periodJoinClause = hasTtWorkOrderId
        ? `(t.trouble_ticket_id = tt.id OR t.work_order_id = tt.work_order_id)`
        : `t.trouble_ticket_id = tt.id`
      await conn.query(
        `
          INSERT INTO tickets_temporary_periods
            (ticket_id, status, started_at, actor_user_id, reason)
          SELECT t.id, 'TEMPORARY', CURRENT_TIMESTAMP, ?, ?
          FROM tickets t
          INNER JOIN support_trouble_tickets tt ON tt.id = ? AND ${periodJoinClause}
          LIMIT 1
        `,
        [uid, reason.slice(0, 1000), ttId],
      ).catch(() => null)
    } catch {
    }

    try {
      const ownerRows = await conn.query(
        `SELECT display_name AS dn, username AS un FROM auth_users WHERE id = ? LIMIT 1`,
        [uid],
      ).catch(() => [[{ dn: null, un: null }]])
      const ownerRow = (ownerRows as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]
      const ownerName = String(ownerRow?.dn ?? ownerRow?.un ?? `user:${uid}`).trim() || `user:${uid}`
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'TEMPORARY',
          ownerName,
          progressNotes: `[TEMP] Ditandai temporary oleh ${ownerName}. Alasan: ${reason.slice(0, 900)}`,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch {
    }

    try {
      const hasUnifiedTtId = await hasReviewDbColumn('tickets', 'trouble_ticket_id')
      const hasUnifiedStatus = await hasReviewDbColumn('tickets', 'status')
      if (hasUnifiedTtId && hasUnifiedStatus) {
        await conn.query(
          `UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE trouble_ticket_id = ? LIMIT 1`,
          ['PENDING', ttId],
        ).catch(() => null)
      }
    } catch {
    }

    return {
      success: true,
      idempotent: false,
      affectedRows: affected,
      fromStatus,
      toStatus: 'TEMPORARY',
      ticketId: null,
      workOrderId: null,
      troubleTicketId: ttId,
    }
  })
}

export async function resumeFromTemporary(params: {
  ticketCode: string
  session: FieldTechSession
  notes?: string | null
}): Promise<TransitionResult> {
  await ensureTechnicianSchemaFoundation()
  await ensureSupportTroubleTicketProgressTable()
  const code = String(params.ticketCode ?? '').trim().toUpperCase()
  const uid = Number(params.session?.userId ?? 0)
  if (!code || !Number.isInteger(uid) || uid <= 0) {
    return {
      success: false,
      idempotent: false,
      affectedRows: 0,
      fromStatus: null,
      toStatus: null,
      ticketId: null,
      workOrderId: null,
      troubleTicketId: null,
    }
  }

  return runReviewDbTransaction<TransitionResult>(async (conn) => {
    const ownership = await isTroubleTicketOwnedByTech(conn, code, uid)
    if (!ownership.owned || !ownership.troubleTicketId) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ownership.troubleTicketId || null,
      }
    }
    const ttId = ownership.troubleTicketId

    const [rowsRaw] = await conn.query(
      `SELECT id, status FROM support_trouble_tickets WHERE id = ? LIMIT 1 FOR UPDATE`,
      [ttId],
    )
    const rows = (rowsRaw as Array<Record<string, unknown>>) || []
    const row = rows[0]
    if (!row) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus: null,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }
    const fromStatus = String(row.status ?? '').trim().toUpperCase()

    if (fromStatus === 'ON_PROGRESS' || fromStatus === 'IN_PROGRESS') {
      return {
        success: true,
        idempotent: true,
        affectedRows: 1,
        fromStatus,
        toStatus: 'ON_PROGRESS',
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    if (fromStatus !== 'TEMPORARY') {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const hasTtStatus = await hasReviewDbColumn('support_trouble_tickets', 'status')
    if (!hasTtStatus) {
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const [updRaw] = await conn.query(
      `UPDATE support_trouble_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ? LIMIT 1`,
      ['ON_PROGRESS', ttId, fromStatus],
    )
    const affected = Number((updRaw as ExecuteResult | undefined)?.affectedRows ?? 0)
    if (affected <= 0) {
      const currentCheck = await conn.query(
        `SELECT status FROM support_trouble_tickets WHERE id = ? LIMIT 1`,
        [ttId],
      ).catch(() => [[{ status: '' }]])
      const st = String(((currentCheck as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]?.status) ?? '').trim().toUpperCase()
      if (st === 'ON_PROGRESS' || st === 'IN_PROGRESS') {
        return {
          success: true,
          idempotent: true,
          affectedRows: 1,
          fromStatus,
          toStatus: 'ON_PROGRESS',
          ticketId: null,
          workOrderId: null,
          troubleTicketId: ttId,
        }
      }
      return {
        success: false,
        idempotent: false,
        affectedRows: 0,
        fromStatus,
        toStatus: null,
        ticketId: null,
        workOrderId: null,
        troubleTicketId: ttId,
      }
    }

    const hasTtWorkOrderId2 = await hasReviewDbColumn('support_trouble_tickets', 'work_order_id')
    try {
      const resumeJoinClause = hasTtWorkOrderId2
        ? `(t.trouble_ticket_id = tt.id OR t.work_order_id = tt.work_order_id)`
        : `t.trouble_ticket_id = tt.id`
      await conn.query(
        `
          UPDATE tickets_temporary_periods
          SET ended_at = CURRENT_TIMESTAMP,
              status = 'RESUMED'
          WHERE status = 'TEMPORARY'
            AND ended_at IS NULL
            AND ticket_id IN (
              SELECT t.id FROM tickets t
              INNER JOIN support_trouble_tickets tt ON tt.id = ?
                AND ${resumeJoinClause}
            )
          ORDER BY id DESC
          LIMIT 1
        `,
        [ttId],
      ).catch(() => null)
    } catch {
    }

    try {
      const ownerRows = await conn.query(
        `SELECT display_name AS dn, username AS un FROM auth_users WHERE id = ? LIMIT 1`,
        [uid],
      ).catch(() => [[{ dn: null, un: null }]])
      const ownerRow = (ownerRows as unknown as Array<Array<Record<string, unknown>>>)[0]?.[0]
      const ownerName = String(ownerRow?.dn ?? ownerRow?.un ?? `user:${uid}`).trim() || `user:${uid}`
      await insertSupportTroubleTicketProgressLog(
        {
          troubleTicketId: ttId,
          progressStatus: 'ON_PROGRESS',
          ownerName,
          progressNotes: params.notes && String(params.notes).trim()
            ? String(params.notes).trim().slice(0, 1000)
            : `[RESUME] Trouble ticket di-resume oleh ${ownerName} dari temporary.`,
          updatedBy: ownerName,
        },
        { connection: conn },
      )
    } catch {
    }

    try {
      const hasUnifiedTtId = await hasReviewDbColumn('tickets', 'trouble_ticket_id')
      const hasUnifiedStatus = await hasReviewDbColumn('tickets', 'status')
      if (hasUnifiedTtId && hasUnifiedStatus) {
        await conn.query(
          `UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE trouble_ticket_id = ? LIMIT 1`,
          ['ON_PROGRESS', ttId],
        ).catch(() => null)
      }
    } catch {
    }

    return {
      success: true,
      idempotent: false,
      affectedRows: affected,
      fromStatus,
      toStatus: 'ON_PROGRESS',
      ticketId: null,
      workOrderId: null,
      troubleTicketId: ttId,
    }
  })
}

export async function resolveWorkOrderUnifiedTicketId(workOrderId: number): Promise<number | null> {
  try {
    const rows = await runReviewDbQuery<Record<string, unknown>>(
      `SELECT id FROM tickets WHERE work_order_id = ? LIMIT 1`,
      [Number(workOrderId ?? 0)],
    )
    return Number(rows[0]?.id ?? 0) || null
  } catch {
    return null
  }
}

export async function resolveTroubleTicketUnifiedTicketId(troubleTicketId: number): Promise<number | null> {
  try {
    const rows = await runReviewDbQuery<Record<string, unknown>>(
      `SELECT id FROM tickets WHERE trouble_ticket_id = ? LIMIT 1`,
      [Number(troubleTicketId ?? 0)],
    )
    return Number(rows[0]?.id ?? 0) || null
  } catch {
    return null
  }
}

export function isValidTransition(
  current: string,
  action: string,
  ticketType: string,
): boolean {
  const cur = String(current ?? '').trim().toUpperCase()
  const act = String(action ?? '').trim().toUpperCase()
  const type = String(ticketType ?? '').trim().toUpperCase()

  type TransitionTuple = [string, string, string?]
  const matrix: TransitionTuple[] = [
    ['ASSIGNED', 'ACCEPT'],
    ['ACCEPTED', 'START'],
    ['ON_PROGRESS', 'SUBMIT'],
    ['TEMPORARY', 'RESUME'],
    ['ON_PROGRESS', 'TEMPORARY', 'TROUBLE'],
  ]

  for (const [fromState, actionName, onlyType] of matrix) {
    if (cur !== fromState) continue
    if (act !== actionName) continue
    if (onlyType && type !== onlyType) continue
    return true
  }
  return false
}

export { resumeFromTemporary as resumeTroubleTicketFromTemporary }
export { resolveWorkOrderUnifiedTicketId as resolveTicketIdByWorkOrderId }
export { resolveTroubleTicketUnifiedTicketId as resolveTicketIdByTroubleTicketCode }

void getActiveTechnicianAssignmentByTicketId
void runReviewDbExecute
