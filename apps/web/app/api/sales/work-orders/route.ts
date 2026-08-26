import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import {
  buildServiceWorkOrderInsertPayload,
  generateServiceWorkOrderNo,
  insertServiceWorkOrderAssignment,
  insertServiceWorkOrderStatusLog,
  resolveReviewAuthUserIdByUsername,
} from '@/lib/services/field-ops-service'

const allowedWorkTypes = new Set(['INSTALLATION', 'REPAIR', 'DISMANTLE', 'RELOCATION'])
const allowedStatuses = new Set(['OPEN', 'SCHEDULED', 'ON_PROGRESS'])
const allowedJobCategories = new Set(['PSB', 'TROUBLE', 'JALUR', 'EXPAN', 'JOINTER'])
const allowedPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

type ReviewSalesOrderRow = {
  id: number
  orderNo: string
  orderStatus: string
  customerName: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function resolveOptionalPositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveOptionalCoordinate(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return null
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveNextOrderStatus(workOrderStatus: string) {
  if (workOrderStatus === 'ON_PROGRESS') {
    return 'ON_PROCESS'
  }
  return 'READY_INSTALL'
}

async function getSalesOrderQueryParts() {
  const [
    hasSalesOrderId,
    hasSalesOrderOrderNo,
    hasSalesOrderStatus,
    hasSalesOrderLeadId,
    hasSalesOrderCustomerId,
    hasSalesLeadId,
    hasSalesLeadCustomerName,
    hasCustomerId,
    hasCustomerFullName,
  ] = await Promise.all([
    hasReviewDbColumn('sales_orders', 'id'),
    hasReviewDbColumn('sales_orders', 'order_no'),
    hasReviewDbColumn('sales_orders', 'status'),
    hasReviewDbColumn('sales_orders', 'lead_id'),
    hasReviewDbColumn('sales_orders', 'customer_id'),
    hasReviewDbColumn('sales_leads', 'id'),
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
  ])

  if (!hasSalesOrderId || !hasSalesOrderOrderNo || !hasSalesOrderStatus) {
    throw new Error('Schema inti sales_orders belum siap. Kolom id, order_no, dan status wajib tersedia.')
  }

  const canJoinLead = hasSalesOrderLeadId && hasSalesLeadId
  const canJoinCustomer = hasSalesOrderCustomerId && hasCustomerId

  return {
    salesLeadJoin: canJoinLead
      ? `
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
      : '',
    customerJoin: canJoinCustomer
      ? `
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id`
      : '',
    customerNameExpression: canJoinLead && hasSalesLeadCustomerName
      ? `COALESCE(sl.customer_name, ${canJoinCustomer && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
      : canJoinCustomer && hasCustomerFullName
        ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
        : `'Customer belum terpetakan'`,
  }
}

async function buildSalesOrderUpdatePayload(params: {
  nextOrderStatus: string
  technicianName: string | null
  scheduledAt: Date | null
}) {
  const [hasStatus, hasTechnicianName, hasScheduledInstallationAt, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('sales_orders', 'status'),
    hasReviewDbColumn('sales_orders', 'teknisi_name'),
    hasReviewDbColumn('sales_orders', 'scheduled_installation_at'),
    hasReviewDbColumn('sales_orders', 'updated_at'),
  ])

  if (!hasStatus) {
    throw new Error('Schema inti sales_orders belum siap. Kolom status wajib tersedia.')
  }

  const assignments = ['status = ?']
  const values: unknown[] = [params.nextOrderStatus]

  if (hasTechnicianName) {
    assignments.push('teknisi_name = COALESCE(?, teknisi_name)')
    values.push(params.technicianName)
  }
  if (hasScheduledInstallationAt) {
    assignments.push('scheduled_installation_at = COALESCE(?, scheduled_installation_at)')
    values.push(params.scheduledAt)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
    values,
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action work order hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      salesOrderId?: unknown
      workType?: unknown
      status?: unknown
      scheduledAt?: unknown
      technicianName?: unknown
      jobCategory?: unknown
      priority?: unknown
      branchId?: unknown
      currentPicUserId?: unknown
      address?: unknown
      latitude?: unknown
      longitude?: unknown
      notes?: unknown
    }

    const salesOrderId = Number(payload.salesOrderId)
    const workType = String(payload.workType ?? '').trim().toUpperCase()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const scheduledAtRaw = String(payload.scheduledAt ?? '').trim()
    const technicianName = String(payload.technicianName ?? '').trim()
    const jobCategoryRaw = String(payload.jobCategory ?? '').trim().toUpperCase()
    const priorityRaw = String(payload.priority ?? '').trim().toUpperCase()
    const branchId = resolveOptionalPositiveInt(payload.branchId) ?? session.branchId
    const currentPicUserId = resolveOptionalPositiveInt(payload.currentPicUserId)
    const address = String(payload.address ?? '').trim()
    const latitude = resolveOptionalCoordinate(payload.latitude)
    const longitude = resolveOptionalCoordinate(payload.longitude)
    const notesRaw = String(payload.notes ?? '').trim()
    const jobCategory = jobCategoryRaw && allowedJobCategories.has(jobCategoryRaw) ? jobCategoryRaw : null
    const priority: WorkOrderPriority =
      priorityRaw && allowedPriorities.has(priorityRaw) ? (priorityRaw as WorkOrderPriority) : 'MEDIUM'

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return Response.json({ message: 'Sales order sumber tidak valid.' }, { status: 400 })
    }
    if (!allowedWorkTypes.has(workType)) {
      return Response.json({ message: 'Work type tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status work order tidak valid.' }, { status: 400 })
    }

    const salesOrderQueryParts = await getSalesOrderQueryParts()
    const [salesOrder] = await runReviewDbQuery<ReviewSalesOrderRow>(
      `
        SELECT
          so.id,
          so.order_no AS orderNo,
          so.status AS orderStatus,
          ${salesOrderQueryParts.customerNameExpression} AS customerName
        FROM sales_orders so
        ${salesOrderQueryParts.salesLeadJoin}
        ${salesOrderQueryParts.customerJoin}
        WHERE so.id = ?
        LIMIT 1
      `,
      [salesOrderId]
    )
    if (!salesOrder) {
      return Response.json({ message: 'Sales order sumber tidak ditemukan di review DB.' }, { status: 404 })
    }

    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null
    if (scheduledAt && !Number.isFinite(scheduledAt.getTime())) {
      return Response.json({ message: 'Format jadwal work order tidak valid.' }, { status: 400 })
    }

    const actorUserId = await resolveReviewAuthUserIdByUsername(session.username)
    const workOrderNo = await generateServiceWorkOrderNo()
    const notes = `[Review Work Order] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`
    const workOrderInsertPayload = await buildServiceWorkOrderInsertPayload({
      salesOrderId,
      workOrderNo,
      workType,
      status,
      technicianName: technicianName || null,
      scheduledAt,
      notes,
      branchId,
      jobCategory,
      priority,
      sourceType: 'SALES_ORDER',
      currentPicUserId,
      scheduledByUserId: actorUserId,
      address: address || null,
      latitude,
      longitude,
    })

    const insertResult = await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO service_work_orders (
          ${workOrderInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${workOrderInsertPayload.placeholders.join(', ')})
      `,
      workOrderInsertPayload.values
    )
    const workOrderId = Number(insertResult.insertId ?? 0)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new Error('Work order berhasil disimpan tetapi ID insert tidak terbaca.')
    }

    if (currentPicUserId) {
      await insertServiceWorkOrderAssignment({
        workOrderId,
        assignedUserId: currentPicUserId,
        assignedByUserId: actorUserId,
        assignmentRole: 'FIELD_TECHNICIAN',
        assignmentStatus: 'ASSIGNED',
        isPrimary: true,
        notes: technicianName || null,
      })
    }
    await insertServiceWorkOrderStatusLog({
      workOrderId,
      fromStatus: null,
      toStatus: status,
      changedByUserId: actorUserId,
      reasonCode: 'AUTO_CREATED',
      reasonNotes: `WO dibuat dari sales order ${salesOrder.orderNo}${jobCategory ? ` (${jobCategory})` : ''}.`,
    })

    const salesOrderUpdatePayload = await buildSalesOrderUpdatePayload({
      nextOrderStatus: resolveNextOrderStatus(status),
      technicianName: technicianName || null,
      scheduledAt,
    })
    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_orders
        SET
          ${salesOrderUpdatePayload.assignments.join(',\n          ')}
        WHERE id = ?
      `,
      [...salesOrderUpdatePayload.values, salesOrder.id]
    )

    return Response.json({
      message: `Work order ${workOrderNo} untuk order ${salesOrder.orderNo} (${salesOrder.customerName}) berhasil disimpan${jobCategory ? ` dengan kategori ${jobCategory}` : ''}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
