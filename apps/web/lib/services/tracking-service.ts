import { getDataSourceSnapshot } from '@/lib/data-source'
import type { AppSession } from '@/lib/auth-session'
import {
  mockTrackingInventoryRequests,
  mockTrackingStockMovements,
  mockTrackingTroubleTickets,
  mockTrackingWorkOrderAssignments,
  mockTrackingWorkOrderStatusLogs,
  mockTrackingWorkOrders,
} from '@/lib/mock-tracking'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { ensureInventoryLocationsTable } from '@/lib/services/inventory-location-service'
import type { DataSourceSnapshot } from '@/lib/types'

type WorkOrderRow = {
  id: number
  workOrderNo: string | null
  workType: string | null
  jobCategory: string | null
  status: string | null
  priority: string | null
  scheduledAt: string | null
  technicianName: string | null
  troubleTicketId: number | null
  salesOrderId: number | null
  subscriptionId: number | null
  picUserId: number | null
  picUsername: string | null
  picFullName: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

type WorkOrderAssignmentRow = {
  id: number
  workOrderId: number
  assignedUserId: number
  assignmentRole: string | null
  assignmentStatus: string | null
  isPrimary: number
  assignedAt: string | null
  acceptedAt: string | null
  releasedAt: string | null
  notes: string | null
  assignedUsername: string | null
  assignedFullName: string | null
}

type WorkOrderStatusLogRow = {
  id: number
  workOrderId: number
  fromStatus: string | null
  toStatus: string | null
  reasonCode: string | null
  reasonNotes: string | null
  changedByUserId: number | null
  changedAt: string | null
}

type StockMovementRow = {
  id: number
  itemId: number
  itemCode: string | null
  itemName: string | null
  movementType: string | null
  referenceType: string | null
  referenceNo: string | null
  qty: number | null
  unitPrice: number | null
  movementStatus: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  requestId: number | null
  fromLocationId: number | null
  toLocationId: number | null
  technicianUserId: number | null
  technicianUsername: string | null
  technicianFullName: string | null
  fromLocationCode: string | null
  fromLocationName: string | null
  toLocationCode: string | null
  toLocationName: string | null
  notes: string | null
  movementAt: string | null
}

type TroubleTicketRow = {
  id: number
  branchId: number | null
  subscriptionId: number | null
  ticketCode: string | null
  customerName: string | null
  customerUser: string | null
  category: string | null
  type: string | null
  status: string | null
  problemCategory: string | null
  resolutionAction: string | null
  notes: string | null
  closeNotes: string | null
  openedAt: string | null
  closedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

type InventoryRequestRow = {
  id: number
  requestCode: string | null
  inventoryItemId: number
  itemCode: string | null
  itemName: string | null
  requestQty: number | null
  requestType: string | null
  requestStatus: string | null
  requestedDivision: string | null
  requestedSubdivision: string | null
  requestedFor: string | null
  requestNotes: string | null
  pendingReason: string | null
  requestedByUserId?: number | null
  requestedBy: string | null
  processedByUserId?: number | null
  processedBy: string | null
  requestedAt: string | null
  processedAt: string | null
  completedAt: string | null
  workOrderId: number | null
  troubleTicketId: number | null
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeLike(value: string) {
  return `%${value.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

function resolveOptionalInt(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function matchesMockSearch(values: Array<string | number | null | undefined>, query: string | null | undefined) {
  const needle = String(query ?? '')
    .trim()
    .toUpperCase()
  if (!needle) {
    return true
  }

  return values.some((value) => String(value ?? '').toUpperCase().includes(needle))
}

export type WorkOrderTrackingQuery = {
  q?: string | string[]
  status?: string | string[]
  jobCategory?: string | string[]
  priority?: string | string[]
  mine?: string | string[]
  limit?: string | string[]
}

export type StockMovementTrackingQuery = {
  q?: string | string[]
  movementType?: string | string[]
  referenceType?: string | string[]
  workOrderId?: string | string[]
  troubleTicketId?: string | string[]
  technicianUserId?: string | string[]
  mine?: string | string[]
  limit?: string | string[]
}

export type TroubleTicketTrackingQuery = {
  q?: string | string[]
  status?: string | string[]
  type?: string | string[]
  category?: string | string[]
  limit?: string | string[]
}

export type InventoryRequestTrackingQuery = {
  q?: string | string[]
  status?: string | string[]
  requestType?: string | string[]
  workOrderId?: string | string[]
  troubleTicketId?: string | string[]
  mine?: string | string[]
  limit?: string | string[]
}

export async function getWorkOrderTrackingList(query: WorkOrderTrackingQuery, options?: { session?: AppSession }) {
  const source = getDataSourceSnapshot()
  const state = resolveWorkOrderTrackingState(query)
  const session = options?.session
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const items = mockTrackingWorkOrders
      .filter((row) => matchesMockSearch([row.workOrderNo, row.technicianName, row.picFullName, row.picUsername], state.q))
      .filter((row) =>
        state.mine && session?.username
          ? String(row.picUsername ?? '').trim().toLowerCase() === session.username.trim().toLowerCase()
          : true,
      )
      .filter((row) => !state.status || String(row.status ?? '').toUpperCase() === state.status)
      .filter((row) => !state.jobCategory || String(row.jobCategory ?? '').toUpperCase() === state.jobCategory)
      .filter((row) => !state.priority || String(row.priority ?? '').toUpperCase() === state.priority)
      .slice(0, state.limit)

    return { source, items, error: null as string | null, state }
  }

  try {
    const hasPicUserId = await hasReviewDbColumn('service_work_orders', 'current_pic_user_id')
    const hasJobCategory = await hasReviewDbColumn('service_work_orders', 'job_category')
    const hasPriority = await hasReviewDbColumn('service_work_orders', 'priority')
    const hasScheduledAt = await hasReviewDbColumn('service_work_orders', 'scheduled_at')
    const hasTroubleTicketId = await hasReviewDbColumn('service_work_orders', 'trouble_ticket_id')
    const hasSalesOrderId = await hasReviewDbColumn('service_work_orders', 'sales_order_id')
    const hasSubscriptionId = await hasReviewDbColumn('service_work_orders', 'subscription_id')
    const hasUpdatedAt = await hasReviewDbColumn('service_work_orders', 'updated_at')
    const hasCreatedAt = await hasReviewDbColumn('service_work_orders', 'created_at')
    const hasNotes = await hasReviewDbColumn('service_work_orders', 'notes')

    const columns = [
      'wo.id AS id',
      'wo.work_order_no AS workOrderNo',
      'wo.work_type AS workType',
      'wo.status AS status',
    ]

    if (hasJobCategory) {
      columns.push('wo.job_category AS jobCategory')
    } else {
      columns.push('NULL AS jobCategory')
    }
    if (hasPriority) {
      columns.push('wo.priority AS priority')
    } else {
      columns.push('NULL AS priority')
    }
    if (hasScheduledAt) {
      columns.push('wo.scheduled_at AS scheduledAt')
    } else {
      columns.push('NULL AS scheduledAt')
    }
    if (hasTroubleTicketId) {
      columns.push('wo.trouble_ticket_id AS troubleTicketId')
    } else {
      columns.push('NULL AS troubleTicketId')
    }
    if (hasSalesOrderId) {
      columns.push('wo.sales_order_id AS salesOrderId')
    } else {
      columns.push('NULL AS salesOrderId')
    }
    if (hasSubscriptionId) {
      columns.push('wo.subscription_id AS subscriptionId')
    } else {
      columns.push('NULL AS subscriptionId')
    }
    if (hasPicUserId) {
      columns.push('wo.current_pic_user_id AS picUserId', 'au.username AS picUsername', 'au.full_name AS picFullName')
    } else {
      columns.push('NULL AS picUserId', 'NULL AS picUsername', 'NULL AS picFullName')
    }
    columns.push('wo.technician_name AS technicianName')
    if (hasNotes) {
      columns.push('wo.notes AS notes')
    } else {
      columns.push('NULL AS notes')
    }
    if (hasCreatedAt) {
      columns.push('wo.created_at AS createdAt')
    } else {
      columns.push('NULL AS createdAt')
    }
    if (hasUpdatedAt) {
      columns.push('wo.updated_at AS updatedAt')
    } else {
      columns.push('NULL AS updatedAt')
    }

    const where: string[] = []
    const values: unknown[] = []

    if (state.mine && session?.userId && hasPicUserId) {
      where.push('wo.current_pic_user_id = ?')
      values.push(session.userId)
    }
    if (state.q) {
      where.push('(wo.work_order_no LIKE ? OR wo.technician_name LIKE ?)')
      values.push(normalizeLike(state.q), normalizeLike(state.q))
    }
    if (state.status) {
      where.push('wo.status = ?')
      values.push(state.status)
    }
    if (state.jobCategory && hasJobCategory) {
      where.push('wo.job_category = ?')
      values.push(state.jobCategory)
    }
    if (state.priority && hasPriority) {
      where.push('wo.priority = ?')
      values.push(state.priority)
    }

    const limit = state.limit
    values.push(limit)

    const rows = await runReviewDbQuery<WorkOrderRow>(
      `
        SELECT
          ${columns.join(',\n          ')}
        FROM service_work_orders wo
        LEFT JOIN auth_users au
          ON au.id = wo.current_pic_user_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY wo.id DESC
        LIMIT ?
      `,
      values,
    )

    return { source, items: rows, error: null as string | null, state }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      items: [],
      error: getReviewDbErrorDetail(error),
      state,
    }
  }
}

export async function getWorkOrderTrackingDetail(workOrderId: number) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const workOrder = mockTrackingWorkOrders.find((row) => row.id === workOrderId) ?? null
    return {
      source,
      workOrder,
      assignments: mockTrackingWorkOrderAssignments.filter((row) => row.workOrderId === workOrderId),
      statusLogs: mockTrackingWorkOrderStatusLogs.filter((row) => row.workOrderId === workOrderId),
      movements: mockTrackingStockMovements.filter((row) => row.workOrderId === workOrderId),
      error: null as string | null,
    }
  }

  try {
    await ensureInventoryLocationsTable()
    const hasAssignments = await hasReviewDbColumn('service_work_order_assignments', 'work_order_id')
    const hasStatusLogs = await hasReviewDbColumn('service_work_order_status_logs', 'work_order_id')
    const hasMovementWorkOrderId = await hasReviewDbColumn('inventory_stock_movements', 'work_order_id')
    const hasMovementRefType = await hasReviewDbColumn('inventory_stock_movements', 'reference_type')
    const hasMovementStatus = await hasReviewDbColumn('inventory_stock_movements', 'movement_status')
    const hasMovementTroubleTicketId = await hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id')
    const hasMovementRequestId = await hasReviewDbColumn('inventory_stock_movements', 'request_id')
    const hasMovementLocations = (await hasReviewDbColumn('inventory_stock_movements', 'from_location_id')) &&
      (await hasReviewDbColumn('inventory_stock_movements', 'to_location_id')) &&
      (await hasReviewDbColumn('inventory_locations', 'id'))
    const hasMovementTechnician = await hasReviewDbColumn('inventory_stock_movements', 'technician_user_id')

    const [workOrder] = await runReviewDbQuery<WorkOrderRow>(
      `
        SELECT
          wo.id AS id,
          wo.work_order_no AS workOrderNo,
          wo.work_type AS workType,
          ${await hasReviewDbColumn('service_work_orders', 'job_category') ? 'wo.job_category' : 'NULL'} AS jobCategory,
          wo.status AS status,
          ${await hasReviewDbColumn('service_work_orders', 'priority') ? 'wo.priority' : 'NULL'} AS priority,
          ${await hasReviewDbColumn('service_work_orders', 'scheduled_at') ? 'wo.scheduled_at' : 'NULL'} AS scheduledAt,
          wo.technician_name AS technicianName,
          ${await hasReviewDbColumn('service_work_orders', 'trouble_ticket_id') ? 'wo.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
          ${await hasReviewDbColumn('service_work_orders', 'sales_order_id') ? 'wo.sales_order_id' : 'NULL'} AS salesOrderId,
          ${await hasReviewDbColumn('service_work_orders', 'subscription_id') ? 'wo.subscription_id' : 'NULL'} AS subscriptionId,
          ${await hasReviewDbColumn('service_work_orders', 'current_pic_user_id') ? 'wo.current_pic_user_id' : 'NULL'} AS picUserId,
          au.username AS picUsername,
          au.full_name AS picFullName,
          ${await hasReviewDbColumn('service_work_orders', 'notes') ? 'wo.notes' : 'NULL'} AS notes,
          ${await hasReviewDbColumn('service_work_orders', 'created_at') ? 'wo.created_at' : 'NULL'} AS createdAt,
          ${await hasReviewDbColumn('service_work_orders', 'updated_at') ? 'wo.updated_at' : 'NULL'} AS updatedAt
        FROM service_work_orders wo
        LEFT JOIN auth_users au
          ON au.id = wo.current_pic_user_id
        WHERE wo.id = ?
        LIMIT 1
      `,
      [workOrderId],
    )

    if (!workOrder) {
      return { source, workOrder: null as WorkOrderRow | null, assignments: [], statusLogs: [], movements: [], error: null as string | null }
    }

    const assignments = hasAssignments
      ? await runReviewDbQuery<WorkOrderAssignmentRow>(
          `
            SELECT
              a.id AS id,
              a.work_order_id AS workOrderId,
              a.assigned_user_id AS assignedUserId,
              a.assignment_role AS assignmentRole,
              a.assignment_status AS assignmentStatus,
              a.is_primary AS isPrimary,
              a.assigned_at AS assignedAt,
              a.accepted_at AS acceptedAt,
              a.released_at AS releasedAt,
              a.notes AS notes,
              au.username AS assignedUsername,
              au.full_name AS assignedFullName
            FROM service_work_order_assignments a
            LEFT JOIN auth_users au
              ON au.id = a.assigned_user_id
            WHERE a.work_order_id = ?
            ORDER BY a.id DESC
            LIMIT 200
          `,
          [workOrderId],
        )
      : []

    const statusLogs = hasStatusLogs
      ? await runReviewDbQuery<WorkOrderStatusLogRow>(
          `
            SELECT
              l.id AS id,
              l.work_order_id AS workOrderId,
              l.from_status AS fromStatus,
              l.to_status AS toStatus,
              l.reason_code AS reasonCode,
              l.reason_notes AS reasonNotes,
              l.changed_by_user_id AS changedByUserId,
              l.changed_at AS changedAt
            FROM service_work_order_status_logs l
            WHERE l.work_order_id = ?
            ORDER BY l.id DESC
            LIMIT 200
          `,
          [workOrderId],
        )
      : []

    const movements = hasMovementWorkOrderId
      ? await runReviewDbQuery<StockMovementRow>(
          `
            SELECT
              m.id AS id,
              m.item_id AS itemId,
              i.item_code AS itemCode,
              i.item_name AS itemName,
              m.movement_type AS movementType,
              ${hasMovementRefType ? 'm.reference_type' : 'NULL'} AS referenceType,
              m.reference_no AS referenceNo,
              m.qty AS qty,
              m.unit_price AS unitPrice,
              ${hasMovementStatus ? 'm.movement_status' : 'NULL'} AS movementStatus,
              m.work_order_id AS workOrderId,
              ${hasMovementTroubleTicketId ? 'm.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
              ${hasMovementRequestId ? 'm.request_id' : 'NULL'} AS requestId,
              ${hasMovementLocations ? 'm.from_location_id' : 'NULL'} AS fromLocationId,
              ${hasMovementLocations ? 'm.to_location_id' : 'NULL'} AS toLocationId,
              ${hasMovementTechnician ? 'm.technician_user_id' : 'NULL'} AS technicianUserId,
              tu.username AS technicianUsername,
              tu.full_name AS technicianFullName,
              fl.location_code AS fromLocationCode,
              fl.location_name AS fromLocationName,
              tl.location_code AS toLocationCode,
              tl.location_name AS toLocationName,
              m.notes AS notes,
              m.movement_at AS movementAt
            FROM inventory_stock_movements m
            INNER JOIN inventory_items i
              ON i.id = m.item_id
            LEFT JOIN auth_users tu
              ON tu.id = m.technician_user_id
            LEFT JOIN inventory_locations fl
              ON fl.id = m.from_location_id
            LEFT JOIN inventory_locations tl
              ON tl.id = m.to_location_id
            WHERE m.work_order_id = ?
            ORDER BY m.id DESC
            LIMIT 200
          `,
          [workOrderId],
        )
      : []

    return { source, workOrder, assignments, statusLogs, movements, error: null as string | null }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      workOrder: null,
      assignments: [],
      statusLogs: [],
      movements: [],
      error: getReviewDbErrorDetail(error),
    }
  }
}

export async function getStockMovementTrackingList(query: StockMovementTrackingQuery, options?: { session?: AppSession }) {
  const source = getDataSourceSnapshot()
  const state = resolveStockMovementTrackingState(query)
  const session = options?.session
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const items = mockTrackingStockMovements
      .filter((row) => matchesMockSearch([row.itemCode, row.itemName, row.referenceNo], state.q))
      .filter((row) => !state.movementType || String(row.movementType ?? '').toUpperCase() === state.movementType)
      .filter((row) => !state.referenceType || String(row.referenceType ?? '').toUpperCase() === state.referenceType)
      .filter((row) => !state.workOrderId || row.workOrderId === state.workOrderId)
      .filter((row) => !state.troubleTicketId || row.troubleTicketId === state.troubleTicketId)
      .filter((row) => !state.technicianUserId || row.technicianUserId === state.technicianUserId)
      .filter((row) =>
        state.mine
          ? session?.userId
            ? row.technicianUserId === session.userId
            : matchesMockSearch([row.technicianUsername, row.technicianFullName], session?.displayName || session?.username || null)
          : true,
      )
      .slice(0, state.limit)

    return { source, items, error: null as string | null, state }
  }

  try {
    const hasWorkOrderId = await hasReviewDbColumn('inventory_stock_movements', 'work_order_id')
    const hasTroubleTicketId = await hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id')
    const hasRequestId = await hasReviewDbColumn('inventory_stock_movements', 'request_id')
    const hasReferenceType = await hasReviewDbColumn('inventory_stock_movements', 'reference_type')
    const hasMovementStatus = await hasReviewDbColumn('inventory_stock_movements', 'movement_status')
    const hasTechnician = await hasReviewDbColumn('inventory_stock_movements', 'technician_user_id')
    const hasLocations = (await hasReviewDbColumn('inventory_stock_movements', 'from_location_id')) &&
      (await hasReviewDbColumn('inventory_stock_movements', 'to_location_id')) &&
      (await hasReviewDbColumn('inventory_locations', 'id'))

    const where: string[] = []
    const values: unknown[] = []

    if (state.q) {
      where.push('(i.item_code LIKE ? OR i.item_name LIKE ? OR m.reference_no LIKE ?)')
      values.push(normalizeLike(state.q), normalizeLike(state.q), normalizeLike(state.q))
    }
    if (state.movementType) {
      where.push('m.movement_type = ?')
      values.push(state.movementType)
    }
    if (state.referenceType && hasReferenceType) {
      where.push('m.reference_type = ?')
      values.push(state.referenceType)
    }
    if (state.workOrderId && hasWorkOrderId) {
      where.push('m.work_order_id = ?')
      values.push(state.workOrderId)
    }
    if (state.troubleTicketId && hasTroubleTicketId) {
      where.push('m.trouble_ticket_id = ?')
      values.push(state.troubleTicketId)
    }
    if (state.technicianUserId && hasTechnician) {
      where.push('m.technician_user_id = ?')
      values.push(state.technicianUserId)
    }
    if (state.mine) {
      if (session?.userId && hasTechnician) {
        where.push('m.technician_user_id = ?')
        values.push(session.userId)
      } else if (session?.username || session?.displayName) {
        where.push('(LOWER(tu.username) = ? OR LOWER(tu.full_name) = ?)')
        values.push(String(session?.username ?? '').trim().toLowerCase(), String(session?.displayName ?? '').trim().toLowerCase())
      }
    }

    values.push(state.limit)

    const rows = await runReviewDbQuery<StockMovementRow>(
      `
        SELECT
          m.id AS id,
          m.item_id AS itemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          m.movement_type AS movementType,
          ${hasReferenceType ? 'm.reference_type' : 'NULL'} AS referenceType,
          m.reference_no AS referenceNo,
          m.qty AS qty,
          m.unit_price AS unitPrice,
          ${hasMovementStatus ? 'm.movement_status' : 'NULL'} AS movementStatus,
          ${hasWorkOrderId ? 'm.work_order_id' : 'NULL'} AS workOrderId,
          ${hasTroubleTicketId ? 'm.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
          ${hasRequestId ? 'm.request_id' : 'NULL'} AS requestId,
          ${hasLocations ? 'm.from_location_id' : 'NULL'} AS fromLocationId,
          ${hasLocations ? 'm.to_location_id' : 'NULL'} AS toLocationId,
          ${hasTechnician ? 'm.technician_user_id' : 'NULL'} AS technicianUserId,
          tu.username AS technicianUsername,
          tu.full_name AS technicianFullName,
          fl.location_code AS fromLocationCode,
          fl.location_name AS fromLocationName,
          tl.location_code AS toLocationCode,
          tl.location_name AS toLocationName,
          m.notes AS notes,
          m.movement_at AS movementAt
        FROM inventory_stock_movements m
        INNER JOIN inventory_items i
          ON i.id = m.item_id
        LEFT JOIN auth_users tu
          ON tu.id = m.technician_user_id
        LEFT JOIN inventory_locations fl
          ON fl.id = m.from_location_id
        LEFT JOIN inventory_locations tl
          ON tl.id = m.to_location_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY m.id DESC
        LIMIT ?
      `,
      values,
    )

    return { source, items: rows, error: null as string | null, state }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      items: [],
      error: getReviewDbErrorDetail(error),
      state,
    }
  }
}

export async function getStockMovementTrackingDetail(movementId: number) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      source,
      movement: mockTrackingStockMovements.find((row) => row.id === movementId) ?? null,
      error: null as string | null,
    }
  }

  try {
    const hasWorkOrderId = await hasReviewDbColumn('inventory_stock_movements', 'work_order_id')
    const hasTroubleTicketId = await hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id')
    const hasRequestId = await hasReviewDbColumn('inventory_stock_movements', 'request_id')
    const hasReferenceType = await hasReviewDbColumn('inventory_stock_movements', 'reference_type')
    const hasMovementStatus = await hasReviewDbColumn('inventory_stock_movements', 'movement_status')
    const hasTechnician = await hasReviewDbColumn('inventory_stock_movements', 'technician_user_id')
    const hasLocations = (await hasReviewDbColumn('inventory_stock_movements', 'from_location_id')) &&
      (await hasReviewDbColumn('inventory_stock_movements', 'to_location_id')) &&
      (await hasReviewDbColumn('inventory_locations', 'id'))

    const [movement] = await runReviewDbQuery<StockMovementRow>(
      `
        SELECT
          m.id AS id,
          m.item_id AS itemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          m.movement_type AS movementType,
          ${hasReferenceType ? 'm.reference_type' : 'NULL'} AS referenceType,
          m.reference_no AS referenceNo,
          m.qty AS qty,
          m.unit_price AS unitPrice,
          ${hasMovementStatus ? 'm.movement_status' : 'NULL'} AS movementStatus,
          ${hasWorkOrderId ? 'm.work_order_id' : 'NULL'} AS workOrderId,
          ${hasTroubleTicketId ? 'm.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
          ${hasRequestId ? 'm.request_id' : 'NULL'} AS requestId,
          ${hasLocations ? 'm.from_location_id' : 'NULL'} AS fromLocationId,
          ${hasLocations ? 'm.to_location_id' : 'NULL'} AS toLocationId,
          ${hasTechnician ? 'm.technician_user_id' : 'NULL'} AS technicianUserId,
          tu.username AS technicianUsername,
          tu.full_name AS technicianFullName,
          fl.location_code AS fromLocationCode,
          fl.location_name AS fromLocationName,
          tl.location_code AS toLocationCode,
          tl.location_name AS toLocationName,
          m.notes AS notes,
          m.movement_at AS movementAt
        FROM inventory_stock_movements m
        INNER JOIN inventory_items i
          ON i.id = m.item_id
        LEFT JOIN auth_users tu
          ON tu.id = m.technician_user_id
        LEFT JOIN inventory_locations fl
          ON fl.id = m.from_location_id
        LEFT JOIN inventory_locations tl
          ON tl.id = m.to_location_id
        WHERE m.id = ?
        LIMIT 1
      `,
      [movementId],
    )

    return { source, movement: movement ?? null, error: null as string | null }
  } catch (error) {
    return { source: getFallbackDataSource(source, error), movement: null, error: getReviewDbErrorDetail(error) }
  }
}

export async function getTroubleTicketTrackingList(query: TroubleTicketTrackingQuery) {
  const source = getDataSourceSnapshot()
  const state = resolveTroubleTicketTrackingState(query)
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const items = mockTrackingTroubleTickets
      .filter((row) => matchesMockSearch([row.ticketCode, row.customerName, row.customerUser], state.q))
      .filter((row) => !state.status || String(row.status ?? '').toUpperCase() === state.status)
      .filter((row) => !state.type || String(row.type ?? '').toUpperCase() === state.type)
      .filter((row) => !state.category || String(row.category ?? '').toUpperCase() === state.category)
      .slice(0, state.limit)

    return { source, items, error: null as string | null, state }
  }

  try {
    const where: string[] = []
    const values: unknown[] = []

    if (state.q) {
      where.push('(tt.ticket_code LIKE ? OR tt.customer_name LIKE ? OR tt.customer_user LIKE ?)')
      values.push(normalizeLike(state.q), normalizeLike(state.q), normalizeLike(state.q))
    }
    if (state.status) {
      where.push('tt.status = ?')
      values.push(state.status)
    }
    if (state.type) {
      where.push('tt.type = ?')
      values.push(state.type)
    }
    if (state.category) {
      where.push('tt.category = ?')
      values.push(state.category)
    }

    values.push(state.limit)

    const rows = await runReviewDbQuery<TroubleTicketRow>(
      `
        SELECT
          tt.id AS id,
          tt.branch_id AS branchId,
          tt.subscription_id AS subscriptionId,
          tt.ticket_code AS ticketCode,
          tt.customer_name AS customerName,
          tt.customer_user AS customerUser,
          tt.category AS category,
          tt.type AS type,
          tt.status AS status,
          tt.problem_category AS problemCategory,
          tt.resolution_action AS resolutionAction,
          tt.notes AS notes,
          tt.close_notes AS closeNotes,
          tt.opened_at AS openedAt,
          tt.closed_at AS closedAt,
          tt.created_at AS createdAt,
          tt.updated_at AS updatedAt
        FROM support_trouble_tickets tt
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY tt.id DESC
        LIMIT ?
      `,
      values,
    )

    return { source, items: rows, error: null as string | null, state }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      items: [],
      error: getReviewDbErrorDetail(error),
      state,
    }
  }
}

export async function getInventoryRequestTrackingList(query: InventoryRequestTrackingQuery, options?: { session?: AppSession }) {
  const source = getDataSourceSnapshot()
  const state = resolveInventoryRequestTrackingState(query)
  const session = options?.session
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const items = mockTrackingInventoryRequests
      .filter((row) =>
        matchesMockSearch(
          [row.requestCode, row.itemCode, row.itemName, row.requestedBy, row.requestedFor, row.requestedSubdivision],
          state.q,
        ),
      )
      .filter((row) => !state.status || String(row.requestStatus ?? '').toUpperCase() === state.status)
      .filter((row) => !state.requestType || String(row.requestType ?? '').toUpperCase() === state.requestType)
      .filter((row) => !state.workOrderId || row.workOrderId === state.workOrderId)
      .filter((row) => !state.troubleTicketId || row.troubleTicketId === state.troubleTicketId)
      .filter((row) =>
        state.mine
          ? matchesMockSearch([row.requestedBy, row.requestedFor], session?.displayName || session?.username || null)
          : true,
      )
      .slice(0, state.limit)

    return { source, items, error: null as string | null, state }
  }

  try {
    const hasWorkOrderId = await hasReviewDbColumn('inventory_item_requests', 'work_order_id')
    const hasTroubleTicketId = await hasReviewDbColumn('inventory_item_requests', 'trouble_ticket_id')
    const hasRequestType = await hasReviewDbColumn('inventory_item_requests', 'request_type')
    const hasRequestedByUserId = await hasReviewDbColumn('inventory_item_requests', 'requested_by_user_id')

    const where: string[] = []
    const values: unknown[] = []

    if (state.q) {
      where.push('(r.request_code LIKE ? OR i.item_code LIKE ? OR i.item_name LIKE ? OR r.requested_by LIKE ?)')
      values.push(normalizeLike(state.q), normalizeLike(state.q), normalizeLike(state.q), normalizeLike(state.q))
    }
    if (state.status) {
      where.push('r.request_status = ?')
      values.push(state.status)
    }
    if (state.requestType && hasRequestType) {
      where.push('r.request_type = ?')
      values.push(state.requestType)
    }
    if (state.workOrderId && hasWorkOrderId) {
      where.push('r.work_order_id = ?')
      values.push(state.workOrderId)
    }
    if (state.troubleTicketId && hasTroubleTicketId) {
      where.push('r.trouble_ticket_id = ?')
      values.push(state.troubleTicketId)
    }
    if (state.mine) {
      if (session?.userId && hasRequestedByUserId) {
        where.push('r.requested_by_user_id = ?')
        values.push(session.userId)
      } else if (session?.username || session?.displayName) {
        where.push('(LOWER(r.requested_by) = ? OR LOWER(r.requested_by) = ?)')
        values.push(String(session?.username ?? '').trim().toLowerCase(), String(session?.displayName ?? '').trim().toLowerCase())
      }
    }

    values.push(state.limit)

    const rows = await runReviewDbQuery<InventoryRequestRow>(
      `
        SELECT
          r.id AS id,
          r.request_code AS requestCode,
          r.inventory_item_id AS inventoryItemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          r.request_qty AS requestQty,
          ${hasRequestType ? 'r.request_type' : 'NULL'} AS requestType,
          r.request_status AS requestStatus,
          r.requested_division AS requestedDivision,
          r.requested_subdivision AS requestedSubdivision,
          r.requested_for AS requestedFor,
          r.request_notes AS requestNotes,
          r.pending_reason AS pendingReason,
          ${hasRequestedByUserId ? 'r.requested_by_user_id' : 'NULL'} AS requestedByUserId,
          r.requested_by AS requestedBy,
          ${await hasReviewDbColumn('inventory_item_requests', 'processed_by_user_id') ? 'r.processed_by_user_id' : 'NULL'} AS processedByUserId,
          r.processed_by AS processedBy,
          r.requested_at AS requestedAt,
          r.processed_at AS processedAt,
          r.completed_at AS completedAt,
          ${hasWorkOrderId ? 'r.work_order_id' : 'NULL'} AS workOrderId,
          ${hasTroubleTicketId ? 'r.trouble_ticket_id' : 'NULL'} AS troubleTicketId
        FROM inventory_item_requests r
        INNER JOIN inventory_items i
          ON i.id = r.inventory_item_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY r.id DESC
        LIMIT ?
      `,
      values,
    )

    return { source, items: rows, error: null as string | null, state }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      items: [],
      error: getReviewDbErrorDetail(error),
      state,
    }
  }
}

export async function getTroubleTicketTrackingDetail(troubleTicketId: number) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      source,
      troubleTicket: mockTrackingTroubleTickets.find((row) => row.id === troubleTicketId) ?? null,
      workOrders: mockTrackingWorkOrders.filter((row) => row.troubleTicketId === troubleTicketId),
      movements: mockTrackingStockMovements.filter((row) => row.troubleTicketId === troubleTicketId),
      error: null as string | null,
    }
  }

  try {
    await ensureInventoryLocationsTable()
    const hasWorkOrderTicketId = await hasReviewDbColumn('service_work_orders', 'trouble_ticket_id')
    const hasMovementTicketId = await hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id')
    const hasMovementRefType = await hasReviewDbColumn('inventory_stock_movements', 'reference_type')
    const hasMovementStatus = await hasReviewDbColumn('inventory_stock_movements', 'movement_status')
    const hasMovementRequestId = await hasReviewDbColumn('inventory_stock_movements', 'request_id')
    const hasMovementLocations =
      (await hasReviewDbColumn('inventory_stock_movements', 'from_location_id')) &&
      (await hasReviewDbColumn('inventory_stock_movements', 'to_location_id')) &&
      (await hasReviewDbColumn('inventory_locations', 'id'))
    const hasMovementTechnician = await hasReviewDbColumn('inventory_stock_movements', 'technician_user_id')

    const [troubleTicket] = await runReviewDbQuery<TroubleTicketRow>(
      `
        SELECT
          id AS id,
          branch_id AS branchId,
          subscription_id AS subscriptionId,
          ticket_code AS ticketCode,
          customer_name AS customerName,
          customer_user AS customerUser,
          category AS category,
          type AS type,
          status AS status,
          problem_category AS problemCategory,
          resolution_action AS resolutionAction,
          notes AS notes,
          close_notes AS closeNotes,
          opened_at AS openedAt,
          closed_at AS closedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM support_trouble_tickets
        WHERE id = ?
        LIMIT 1
      `,
      [troubleTicketId],
    )

    if (!troubleTicket) {
      return {
        source,
        troubleTicket: null as TroubleTicketRow | null,
        workOrders: [] as WorkOrderRow[],
        movements: [] as StockMovementRow[],
        error: null as string | null,
      }
    }

    const workOrders = hasWorkOrderTicketId
      ? await runReviewDbQuery<WorkOrderRow>(
          `
            SELECT
              wo.id AS id,
              wo.work_order_no AS workOrderNo,
              wo.work_type AS workType,
              ${await hasReviewDbColumn('service_work_orders', 'job_category') ? 'wo.job_category' : 'NULL'} AS jobCategory,
              wo.status AS status,
              ${await hasReviewDbColumn('service_work_orders', 'priority') ? 'wo.priority' : 'NULL'} AS priority,
              ${await hasReviewDbColumn('service_work_orders', 'scheduled_at') ? 'wo.scheduled_at' : 'NULL'} AS scheduledAt,
              wo.technician_name AS technicianName,
              wo.trouble_ticket_id AS troubleTicketId,
              ${await hasReviewDbColumn('service_work_orders', 'sales_order_id') ? 'wo.sales_order_id' : 'NULL'} AS salesOrderId,
              ${await hasReviewDbColumn('service_work_orders', 'subscription_id') ? 'wo.subscription_id' : 'NULL'} AS subscriptionId,
              ${await hasReviewDbColumn('service_work_orders', 'current_pic_user_id') ? 'wo.current_pic_user_id' : 'NULL'} AS picUserId,
              au.username AS picUsername,
              au.full_name AS picFullName,
              ${await hasReviewDbColumn('service_work_orders', 'notes') ? 'wo.notes' : 'NULL'} AS notes,
              ${await hasReviewDbColumn('service_work_orders', 'created_at') ? 'wo.created_at' : 'NULL'} AS createdAt,
              ${await hasReviewDbColumn('service_work_orders', 'updated_at') ? 'wo.updated_at' : 'NULL'} AS updatedAt
            FROM service_work_orders wo
            LEFT JOIN auth_users au
              ON au.id = wo.current_pic_user_id
            WHERE wo.trouble_ticket_id = ?
            ORDER BY wo.id DESC
            LIMIT 200
          `,
          [troubleTicketId],
        )
      : []

    const movements = hasMovementTicketId
      ? await runReviewDbQuery<StockMovementRow>(
          `
            SELECT
              m.id AS id,
              m.item_id AS itemId,
              i.item_code AS itemCode,
              i.item_name AS itemName,
              m.movement_type AS movementType,
              ${hasMovementRefType ? 'm.reference_type' : 'NULL'} AS referenceType,
              m.reference_no AS referenceNo,
              m.qty AS qty,
              m.unit_price AS unitPrice,
              ${hasMovementStatus ? 'm.movement_status' : 'NULL'} AS movementStatus,
              ${await hasReviewDbColumn('inventory_stock_movements', 'work_order_id') ? 'm.work_order_id' : 'NULL'} AS workOrderId,
              m.trouble_ticket_id AS troubleTicketId,
              ${hasMovementRequestId ? 'm.request_id' : 'NULL'} AS requestId,
              ${hasMovementLocations ? 'm.from_location_id' : 'NULL'} AS fromLocationId,
              ${hasMovementLocations ? 'm.to_location_id' : 'NULL'} AS toLocationId,
              ${hasMovementTechnician ? 'm.technician_user_id' : 'NULL'} AS technicianUserId,
              tu.username AS technicianUsername,
              tu.full_name AS technicianFullName,
              fl.location_code AS fromLocationCode,
              fl.location_name AS fromLocationName,
              tl.location_code AS toLocationCode,
              tl.location_name AS toLocationName,
              m.notes AS notes,
              m.movement_at AS movementAt
            FROM inventory_stock_movements m
            INNER JOIN inventory_items i
              ON i.id = m.item_id
            LEFT JOIN auth_users tu
              ON tu.id = m.technician_user_id
            LEFT JOIN inventory_locations fl
              ON fl.id = m.from_location_id
            LEFT JOIN inventory_locations tl
              ON tl.id = m.to_location_id
            WHERE m.trouble_ticket_id = ?
            ORDER BY m.id DESC
            LIMIT 200
          `,
          [troubleTicketId],
        )
      : []

    return { source, troubleTicket, workOrders, movements, error: null as string | null }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      troubleTicket: null,
      workOrders: [],
      movements: [],
      error: getReviewDbErrorDetail(error),
    }
  }
}

export async function getInventoryRequestTrackingDetail(requestId: number) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const request = mockTrackingInventoryRequests.find((row) => row.id === requestId) ?? null
    return {
      source,
      request,
      linkedWorkOrder: request?.workOrderId ? (mockTrackingWorkOrders.find((row) => row.id === request.workOrderId) ?? null) : null,
      linkedTroubleTicket:
        request?.troubleTicketId ? (mockTrackingTroubleTickets.find((row) => row.id === request.troubleTicketId) ?? null) : null,
      movements: mockTrackingStockMovements.filter(
        (row) =>
          row.requestId === requestId ||
          (request ? row.itemId === request.inventoryItemId && (!request.workOrderId || row.workOrderId === request.workOrderId) : false) ||
          (request ? row.itemId === request.inventoryItemId && (!request.troubleTicketId || row.troubleTicketId === request.troubleTicketId) : false),
      ),
      error: null as string | null,
    }
  }

  try {
    await ensureInventoryLocationsTable()
    const hasRequestWorkOrderId = await hasReviewDbColumn('inventory_item_requests', 'work_order_id')
    const hasRequestTroubleTicketId = await hasReviewDbColumn('inventory_item_requests', 'trouble_ticket_id')
    const hasRequestType = await hasReviewDbColumn('inventory_item_requests', 'request_type')
    const hasRequestedByUserId = await hasReviewDbColumn('inventory_item_requests', 'requested_by_user_id')
    const hasProcessedByUserId = await hasReviewDbColumn('inventory_item_requests', 'processed_by_user_id')
    const hasMovementRequestId = await hasReviewDbColumn('inventory_stock_movements', 'request_id')
    const hasMovementTroubleTicketId = await hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id')
    const hasMovementRefType = await hasReviewDbColumn('inventory_stock_movements', 'reference_type')
    const hasMovementStatus = await hasReviewDbColumn('inventory_stock_movements', 'movement_status')
    const hasMovementLocations =
      (await hasReviewDbColumn('inventory_stock_movements', 'from_location_id')) &&
      (await hasReviewDbColumn('inventory_stock_movements', 'to_location_id')) &&
      (await hasReviewDbColumn('inventory_locations', 'id'))
    const hasMovementTechnician = await hasReviewDbColumn('inventory_stock_movements', 'technician_user_id')

    const [request] = await runReviewDbQuery<InventoryRequestRow>(
      `
        SELECT
          r.id AS id,
          r.request_code AS requestCode,
          r.inventory_item_id AS inventoryItemId,
          i.item_code AS itemCode,
          i.item_name AS itemName,
          r.request_qty AS requestQty,
          ${hasRequestType ? 'r.request_type' : 'NULL'} AS requestType,
          r.request_status AS requestStatus,
          r.requested_division AS requestedDivision,
          r.requested_subdivision AS requestedSubdivision,
          r.requested_for AS requestedFor,
          r.request_notes AS requestNotes,
          r.pending_reason AS pendingReason,
          ${hasRequestedByUserId ? 'r.requested_by_user_id' : 'NULL'} AS requestedByUserId,
          r.requested_by AS requestedBy,
          ${hasProcessedByUserId ? 'r.processed_by_user_id' : 'NULL'} AS processedByUserId,
          r.processed_by AS processedBy,
          r.requested_at AS requestedAt,
          r.processed_at AS processedAt,
          r.completed_at AS completedAt,
          ${hasRequestWorkOrderId ? 'r.work_order_id' : 'NULL'} AS workOrderId,
          ${hasRequestTroubleTicketId ? 'r.trouble_ticket_id' : 'NULL'} AS troubleTicketId
        FROM inventory_item_requests r
        INNER JOIN inventory_items i
          ON i.id = r.inventory_item_id
        WHERE r.id = ?
        LIMIT 1
      `,
      [requestId],
    )

    if (!request) {
      return {
        source,
        request: null as InventoryRequestRow | null,
        linkedWorkOrder: null as WorkOrderRow | null,
        linkedTroubleTicket: null as TroubleTicketRow | null,
        movements: [] as StockMovementRow[],
        error: null as string | null,
      }
    }

    const linkedWorkOrder = request.workOrderId
      ? (
          await runReviewDbQuery<WorkOrderRow>(
            `
              SELECT
                wo.id AS id,
                wo.work_order_no AS workOrderNo,
                wo.work_type AS workType,
                ${await hasReviewDbColumn('service_work_orders', 'job_category') ? 'wo.job_category' : 'NULL'} AS jobCategory,
                wo.status AS status,
                ${await hasReviewDbColumn('service_work_orders', 'priority') ? 'wo.priority' : 'NULL'} AS priority,
                ${await hasReviewDbColumn('service_work_orders', 'scheduled_at') ? 'wo.scheduled_at' : 'NULL'} AS scheduledAt,
                wo.technician_name AS technicianName,
                ${await hasReviewDbColumn('service_work_orders', 'trouble_ticket_id') ? 'wo.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
                ${await hasReviewDbColumn('service_work_orders', 'sales_order_id') ? 'wo.sales_order_id' : 'NULL'} AS salesOrderId,
                ${await hasReviewDbColumn('service_work_orders', 'subscription_id') ? 'wo.subscription_id' : 'NULL'} AS subscriptionId,
                ${await hasReviewDbColumn('service_work_orders', 'current_pic_user_id') ? 'wo.current_pic_user_id' : 'NULL'} AS picUserId,
                au.username AS picUsername,
                au.full_name AS picFullName,
                ${await hasReviewDbColumn('service_work_orders', 'notes') ? 'wo.notes' : 'NULL'} AS notes,
                ${await hasReviewDbColumn('service_work_orders', 'created_at') ? 'wo.created_at' : 'NULL'} AS createdAt,
                ${await hasReviewDbColumn('service_work_orders', 'updated_at') ? 'wo.updated_at' : 'NULL'} AS updatedAt
              FROM service_work_orders wo
              LEFT JOIN auth_users au
                ON au.id = wo.current_pic_user_id
              WHERE wo.id = ?
              LIMIT 1
            `,
            [request.workOrderId],
          )
        )[0] ?? null
      : null

    const linkedTroubleTicket = request.troubleTicketId
      ? (
          await runReviewDbQuery<TroubleTicketRow>(
            `
              SELECT
                id AS id,
                branch_id AS branchId,
                subscription_id AS subscriptionId,
                ticket_code AS ticketCode,
                customer_name AS customerName,
                customer_user AS customerUser,
                category AS category,
                type AS type,
                status AS status,
                problem_category AS problemCategory,
                resolution_action AS resolutionAction,
                notes AS notes,
                close_notes AS closeNotes,
                opened_at AS openedAt,
                closed_at AS closedAt,
                created_at AS createdAt,
                updated_at AS updatedAt
              FROM support_trouble_tickets
              WHERE id = ?
              LIMIT 1
            `,
            [request.troubleTicketId],
          )
        )[0] ?? null
      : null

    const movements = hasMovementRequestId
      ? await runReviewDbQuery<StockMovementRow>(
          `
            SELECT
              m.id AS id,
              m.item_id AS itemId,
              i.item_code AS itemCode,
              i.item_name AS itemName,
              m.movement_type AS movementType,
              ${hasMovementRefType ? 'm.reference_type' : 'NULL'} AS referenceType,
              m.reference_no AS referenceNo,
              m.qty AS qty,
              m.unit_price AS unitPrice,
              ${hasMovementStatus ? 'm.movement_status' : 'NULL'} AS movementStatus,
              ${await hasReviewDbColumn('inventory_stock_movements', 'work_order_id') ? 'm.work_order_id' : 'NULL'} AS workOrderId,
              ${hasMovementTroubleTicketId ? 'm.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
              m.request_id AS requestId,
              ${hasMovementLocations ? 'm.from_location_id' : 'NULL'} AS fromLocationId,
              ${hasMovementLocations ? 'm.to_location_id' : 'NULL'} AS toLocationId,
              ${hasMovementTechnician ? 'm.technician_user_id' : 'NULL'} AS technicianUserId,
              tu.username AS technicianUsername,
              tu.full_name AS technicianFullName,
              fl.location_code AS fromLocationCode,
              fl.location_name AS fromLocationName,
              tl.location_code AS toLocationCode,
              tl.location_name AS toLocationName,
              m.notes AS notes,
              m.movement_at AS movementAt
            FROM inventory_stock_movements m
            INNER JOIN inventory_items i
              ON i.id = m.item_id
            LEFT JOIN auth_users tu
              ON tu.id = m.technician_user_id
            LEFT JOIN inventory_locations fl
              ON fl.id = m.from_location_id
            LEFT JOIN inventory_locations tl
              ON tl.id = m.to_location_id
            WHERE m.request_id = ?
            ORDER BY m.id DESC
            LIMIT 200
          `,
          [requestId],
        )
      : []

    return { source, request, linkedWorkOrder, linkedTroubleTicket, movements, error: null as string | null }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      request: null,
      linkedWorkOrder: null,
      linkedTroubleTicket: null,
      movements: [],
      error: getReviewDbErrorDetail(error),
    }
  }
}

function resolveWorkOrderTrackingState(query: WorkOrderTrackingQuery) {
  const q = resolveSearchParam(query.q)?.trim() ?? ''
  const status = resolveSearchParam(query.status)?.trim().toUpperCase() ?? ''
  const jobCategory = resolveSearchParam(query.jobCategory)?.trim().toUpperCase() ?? ''
  const priority = resolveSearchParam(query.priority)?.trim().toUpperCase() ?? ''
  const mineRaw = resolveSearchParam(query.mine)?.trim().toLowerCase() ?? ''
  const mine = ['1', 'true', 'yes', 'on'].includes(mineRaw)
  const limitRaw = resolveSearchParam(query.limit)?.trim() ?? ''
  const limit = Math.min(Math.max(resolveOptionalInt(limitRaw) ?? 100, 20), 300)

  return {
    q: q || null,
    status: status || null,
    jobCategory: jobCategory || null,
    priority: priority || null,
    mine,
    limit,
  }
}

function resolveStockMovementTrackingState(query: StockMovementTrackingQuery) {
  const q = resolveSearchParam(query.q)?.trim() ?? ''
  const movementType = resolveSearchParam(query.movementType)?.trim().toUpperCase() ?? ''
  const referenceType = resolveSearchParam(query.referenceType)?.trim().toUpperCase() ?? ''
  const workOrderId = resolveOptionalInt(resolveSearchParam(query.workOrderId)) ?? null
  const troubleTicketId = resolveOptionalInt(resolveSearchParam(query.troubleTicketId)) ?? null
  const technicianUserId = resolveOptionalInt(resolveSearchParam(query.technicianUserId)) ?? null
  const mineRaw = resolveSearchParam(query.mine)?.trim().toLowerCase() ?? ''
  const limitRaw = resolveSearchParam(query.limit)?.trim() ?? ''
  const limit = Math.min(Math.max(resolveOptionalInt(limitRaw) ?? 100, 20), 300)

  return {
    q: q || null,
    movementType: movementType || null,
    referenceType: referenceType || null,
    workOrderId,
    troubleTicketId,
    technicianUserId,
    mine: ['1', 'true', 'yes', 'on'].includes(mineRaw),
    limit,
  }
}

function resolveTroubleTicketTrackingState(query: TroubleTicketTrackingQuery) {
  const q = resolveSearchParam(query.q)?.trim() ?? ''
  const status = resolveSearchParam(query.status)?.trim().toUpperCase() ?? ''
  const type = resolveSearchParam(query.type)?.trim().toUpperCase() ?? ''
  const category = resolveSearchParam(query.category)?.trim().toUpperCase() ?? ''
  const limitRaw = resolveSearchParam(query.limit)?.trim() ?? ''
  const limit = Math.min(Math.max(resolveOptionalInt(limitRaw) ?? 100, 20), 300)

  return {
    q: q || null,
    status: status || null,
    type: type || null,
    category: category || null,
    limit,
  }
}

function resolveInventoryRequestTrackingState(query: InventoryRequestTrackingQuery) {
  const q = resolveSearchParam(query.q)?.trim() ?? ''
  const status = resolveSearchParam(query.status)?.trim().toUpperCase() ?? ''
  const requestType = resolveSearchParam(query.requestType)?.trim().toUpperCase() ?? ''
  const workOrderId = resolveOptionalInt(resolveSearchParam(query.workOrderId)) ?? null
  const troubleTicketId = resolveOptionalInt(resolveSearchParam(query.troubleTicketId)) ?? null
  const mineRaw = resolveSearchParam(query.mine)?.trim().toLowerCase() ?? ''
  const limitRaw = resolveSearchParam(query.limit)?.trim() ?? ''
  const limit = Math.min(Math.max(resolveOptionalInt(limitRaw) ?? 100, 20), 300)

  return {
    q: q || null,
    status: status || null,
    requestType: requestType || null,
    workOrderId,
    troubleTicketId,
    mine: ['1', 'true', 'yes', 'on'].includes(mineRaw),
    limit,
  }
}

function getFallbackDataSource(source: DataSourceSnapshot, error: unknown): DataSourceSnapshot {
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return source
  }

  return {
    configuredMode: source.configuredMode,
    effectiveMode: 'mock',
    isFallback: true,
    label: 'Mock Fallback',
    detail: getReviewDbErrorDetail(error),
  }
}
