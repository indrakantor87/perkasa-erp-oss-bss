import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedWorkTypes = new Set(['INSTALLATION', 'REPAIR', 'DISMANTLE', 'RELOCATION'])
const allowedStatuses = new Set(['OPEN', 'SCHEDULED', 'ON_PROGRESS'])

type ReviewSalesOrderRow = {
  id: number
  orderNo: string
  orderStatus: string
  customerName: string
}

type WorkOrderNoRow = {
  workOrderNo: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateWorkOrderNo() {
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
    [likePrefix]
  )

  const currentCode = rows[0]?.workOrderNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `WO-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
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

async function buildWorkOrderInsertPayload(params: {
  salesOrderId: number
  workOrderNo: string
  workType: string
  status: string
  technicianName: string | null
  scheduledAt: Date | null
  notes: string
}) {
  const [
    hasSalesOrderId,
    hasSubscriptionId,
    hasWorkOrderNo,
    hasWorkType,
    hasStatus,
    hasTechnicianName,
    hasScheduledAt,
    hasStartedAt,
    hasCompletedAt,
    hasNotes,
  ] = await Promise.all([
    hasReviewDbColumn('service_work_orders', 'sales_order_id'),
    hasReviewDbColumn('service_work_orders', 'subscription_id'),
    hasReviewDbColumn('service_work_orders', 'work_order_no'),
    hasReviewDbColumn('service_work_orders', 'work_type'),
    hasReviewDbColumn('service_work_orders', 'status'),
    hasReviewDbColumn('service_work_orders', 'technician_name'),
    hasReviewDbColumn('service_work_orders', 'scheduled_at'),
    hasReviewDbColumn('service_work_orders', 'started_at'),
    hasReviewDbColumn('service_work_orders', 'completed_at'),
    hasReviewDbColumn('service_work_orders', 'notes'),
  ])

  if (!hasSalesOrderId || !hasWorkOrderNo || !hasStatus) {
    throw new Error('Schema inti service_work_orders belum siap. Kolom sales_order_id, work_order_no, dan status wajib tersedia.')
  }

  const columns = ['sales_order_id', 'work_order_no', 'status']
  const values: unknown[] = [params.salesOrderId, params.workOrderNo, params.status]

  if (hasSubscriptionId) {
    columns.push('subscription_id')
    values.push(null)
  }
  if (hasWorkType) {
    columns.push('work_type')
    values.push(params.workType)
  }
  if (hasTechnicianName) {
    columns.push('technician_name')
    values.push(params.technicianName)
  }
  if (hasScheduledAt) {
    columns.push('scheduled_at')
    values.push(params.scheduledAt)
  }
  if (hasStartedAt) {
    columns.push('started_at')
    values.push(null)
  }
  if (hasCompletedAt) {
    columns.push('completed_at')
    values.push(null)
  }
  if (hasNotes) {
    columns.push('notes')
    values.push(params.notes)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
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
      notes?: unknown
    }

    const salesOrderId = Number(payload.salesOrderId)
    const workType = String(payload.workType ?? '').trim().toUpperCase()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const scheduledAtRaw = String(payload.scheduledAt ?? '').trim()
    const technicianName = String(payload.technicianName ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

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

    const workOrderNo = await generateWorkOrderNo()
    const notes = `[Review Work Order] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`
    const workOrderInsertPayload = await buildWorkOrderInsertPayload({
      salesOrderId: salesOrder.id,
      workOrderNo,
      workType,
      status,
      technicianName: technicianName || null,
      scheduledAt,
      notes,
    })

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO service_work_orders (
          ${workOrderInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${workOrderInsertPayload.placeholders.join(', ')})
      `,
      workOrderInsertPayload.values
    )

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
      message: `Work order ${workOrderNo} untuk order ${salesOrder.orderNo} (${salesOrder.customerName}) berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
