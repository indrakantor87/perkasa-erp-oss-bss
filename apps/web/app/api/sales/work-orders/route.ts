import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

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

    const [salesOrder] = await runReviewDbQuery<ReviewSalesOrderRow>(
      `
        SELECT
          so.id,
          so.order_no AS orderNo,
          so.status AS orderStatus,
          COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName
        FROM sales_orders so
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
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

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO service_work_orders (
          sales_order_id,
          subscription_id,
          work_order_no,
          work_type,
          status,
          technician_name,
          scheduled_at,
          started_at,
          completed_at,
          notes
        )
        VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, NULL, ?)
      `,
      [
        salesOrder.id,
        workOrderNo,
        workType,
        status,
        technicianName || null,
        scheduledAt,
        notes,
      ]
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_orders
        SET
          status = ?,
          teknisi_name = COALESCE(?, teknisi_name),
          scheduled_installation_at = COALESCE(?, scheduled_installation_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [resolveNextOrderStatus(status), technicianName || null, scheduledAt, salesOrder.id]
    )

    return Response.json({
      message: `Work order ${workOrderNo} untuk order ${salesOrder.orderNo} (${salesOrder.customerName}) berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
