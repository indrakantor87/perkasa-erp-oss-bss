import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedCategories = new Set(['TT', 'PV'])
const allowedStatuses = new Set(['OPEN', 'ON_PROGRESS'])

type TicketCodeRow = {
  ticketCode: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateTicketCode(category: string) {
  const prefix = category === 'PV' ? 'PV' : 'TT'
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `${prefix}-${year}${month}-%`
  const rows = await runReviewDbQuery<TicketCodeRow>(
    `
      SELECT ticket_code AS ticketCode
      FROM support_trouble_tickets
      WHERE ticket_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )
  const currentCode = rows[0]?.ticketCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `${prefix}-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'support', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action support hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      customerName?: unknown
      customerUser?: unknown
      category?: unknown
      type?: unknown
      status?: unknown
      problemCategory?: unknown
      notes?: unknown
    }

    const customerName = String(payload.customerName ?? '').trim()
    const customerUser = String(payload.customerUser ?? '').trim()
    const category = String(payload.category ?? '').trim().toUpperCase()
    const type = String(payload.type ?? '').trim().toUpperCase()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const problemCategory = String(payload.problemCategory ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!customerName) {
      return Response.json({ message: 'Nama customer wajib diisi.' }, { status: 400 })
    }
    if (!allowedCategories.has(category)) {
      return Response.json({ message: 'Kategori ticket tidak valid.' }, { status: 400 })
    }
    if (!type) {
      return Response.json({ message: 'Tipe ticket wajib diisi.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status ticket tidak valid.' }, { status: 400 })
    }

    const ticketCode = await generateTicketCode(category)
    const notes = `[Review Ticket] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO support_trouble_tickets (
          subscription_id,
          ticket_code,
          customer_name,
          customer_user,
          category,
          type,
          status,
          problem_category,
          notes
        )
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ticketCode,
        customerName,
        customerUser || null,
        category,
        type,
        status,
        problemCategory || null,
        notes,
      ],
    )

    return Response.json({
      message: `Trouble ticket ${ticketCode} untuk ${customerName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
