import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedOrderTypes = new Set(['NEW_INSTALL', 'UPGRADE', 'DOWNGRADE', 'RELOCATION', 'TERMINATION'])
const allowedOrderStatuses = new Set(['REGISTERED', 'SURVEY_PENDING', 'READY_INSTALL', 'ON_PROCESS'])

type ReviewLeadRow = {
  id: number
  customerName: string
  marketingName: string | null
}

type OrderNoRow = {
  orderNo: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `ORD-${year}${month}-%`
  const rows = await runReviewDbQuery<OrderNoRow>(
    `
      SELECT order_no AS orderNo
      FROM sales_orders
      WHERE order_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix]
  )

  const currentCode = rows[0]?.orderNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `ORD-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
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
      { message: 'Write action sales order hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      leadId?: unknown
      orderType?: unknown
      status?: unknown
      scheduledInstallationAt?: unknown
      marketingName?: unknown
      teknisiName?: unknown
      notes?: unknown
    }

    const leadId = Number(payload.leadId)
    const orderType = String(payload.orderType ?? '').trim().toUpperCase()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const scheduledInstallationAtRaw = String(payload.scheduledInstallationAt ?? '').trim()
    const marketingName = String(payload.marketingName ?? '').trim()
    const teknisiName = String(payload.teknisiName ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return Response.json({ message: 'Lead sumber tidak valid.' }, { status: 400 })
    }
    if (!allowedOrderTypes.has(orderType)) {
      return Response.json({ message: 'Order type tidak valid.' }, { status: 400 })
    }
    if (!allowedOrderStatuses.has(status)) {
      return Response.json({ message: 'Status order tidak valid.' }, { status: 400 })
    }

    const [lead] = await runReviewDbQuery<ReviewLeadRow>(
      `
        SELECT
          id,
          customer_name AS customerName,
          marketing_name AS marketingName
        FROM sales_leads
        WHERE id = ?
        LIMIT 1
      `,
      [leadId]
    )
    if (!lead) {
      return Response.json({ message: 'Lead sumber tidak ditemukan di review DB.' }, { status: 404 })
    }

    const scheduledInstallationAt = scheduledInstallationAtRaw ? new Date(scheduledInstallationAtRaw) : null
    if (scheduledInstallationAt && !Number.isFinite(scheduledInstallationAt.getTime())) {
      return Response.json({ message: 'Format jadwal instalasi tidak valid.' }, { status: 400 })
    }

    const orderNo = await generateOrderNo()
    const notes = `[Review Sales Order] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_orders (
          lead_id,
          customer_id,
          package_id,
          order_no,
          order_type,
          status,
          request_date,
          scheduled_installation_at,
          marketing_name,
          teknisi_name,
          notes
        )
        VALUES (?, NULL, NULL, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
      `,
      [
        lead.id,
        orderNo,
        orderType,
        status,
        scheduledInstallationAt,
        marketingName || lead.marketingName || session.displayName,
        teknisiName || null,
        notes,
      ]
    )

    return Response.json({
      message: `Sales order ${orderNo} untuk ${lead.customerName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
