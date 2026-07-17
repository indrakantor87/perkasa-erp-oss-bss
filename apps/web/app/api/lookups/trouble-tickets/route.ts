import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type TroubleTicketRow = {
  id: number
  ticketCode: string | null
  customerName: string | null
  status: string | null
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ items: [] })
  }

  try {
    const rows = await runReviewDbQuery<TroubleTicketRow>(
      `
        SELECT
          id AS id,
          ticket_code AS ticketCode,
          customer_name AS customerName,
          status AS status
        FROM support_trouble_tickets
        ORDER BY id DESC
        LIMIT 200
      `,
    )

    return Response.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        code: String(row.ticketCode ?? '').trim(),
        title: String(row.customerName ?? '').trim() || 'Trouble Ticket',
        subtitle: String(row.status ?? '').trim() || null,
      })),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

