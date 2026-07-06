import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute } from '@/lib/review-db'

const allowedLeadTypes = new Set(['HOME', 'CORPORATE', 'RESELLER'])
const allowedLeadStatuses = new Set(['NEW', 'FOLLOW_UP', 'COVERAGE_CHECK', 'SURVEY_REQUEST', 'QUALIFIED'])

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
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
      { message: 'Write action sales hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      customerName?: unknown
      leadType?: unknown
      status?: unknown
      source?: unknown
      phone?: unknown
      address?: unknown
      marketingName?: unknown
      notes?: unknown
    }

    const customerName = String(payload.customerName ?? '').trim()
    const leadType = String(payload.leadType ?? '').trim().toUpperCase()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const sourceLabel = String(payload.source ?? '').trim()
    const phone = String(payload.phone ?? '').trim()
    const address = String(payload.address ?? '').trim()
    const marketingName = String(payload.marketingName ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!customerName) {
      return Response.json({ message: 'Nama customer / prospek wajib diisi.' }, { status: 400 })
    }
    if (!allowedLeadTypes.has(leadType)) {
      return Response.json({ message: 'Lead type tidak valid.' }, { status: 400 })
    }
    if (!allowedLeadStatuses.has(status)) {
      return Response.json({ message: 'Status lead tidak valid.' }, { status: 400 })
    }

    const notes = `[Review Lead] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_leads (
          branch_id,
          source,
          lead_type,
          customer_name,
          phone,
          address,
          marketing_name,
          status,
          notes
        )
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sourceLabel || 'Manual Review',
        leadType,
        customerName,
        phone || null,
        address || null,
        marketingName || session.displayName,
        status,
        notes,
      ],
    )

    return Response.json({
      message: `Lead review untuk ${customerName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
