import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'

type TroubleTicketRow = {
  id: number
  ticketCode: string
  customerName: string
  status: string
  closedAt: string | Date | null
}

type TroubleTicketProgressRow = {
  progressStatus: string
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getTroubleTicketByCode(ticketCode: string) {
  const [row] = await runReviewDbQuery<TroubleTicketRow>(
    `
      SELECT
        id,
        ticket_code AS ticketCode,
        customer_name AS customerName,
        status,
        closed_at AS closedAt
      FROM support_trouble_tickets
      WHERE UPPER(ticket_code) = ?
      LIMIT 1
    `,
    [ticketCode]
  )

  return row ?? null
}

async function getLatestProgressByTicketId(ticketId: number) {
  const [row] = await runReviewDbQuery<TroubleTicketProgressRow>(
    `
      SELECT
        progress_status AS progressStatus
      FROM support_trouble_ticket_progress_logs
      WHERE trouble_ticket_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [ticketId],
  )

  return row ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketCode: string }> }
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'support', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Close flow support hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const resolvedParams = await params
    const ticketCode = decodeURIComponent(resolvedParams.ticketCode ?? '').trim().toUpperCase()
    if (!ticketCode) {
      return Response.json({ message: 'Kode ticket wajib diisi.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      resolutionAction?: unknown
      closeNotes?: unknown
    }

    const resolutionAction = normalizeRequiredText(payload.resolutionAction).toUpperCase()
    const closeNotes = normalizeRequiredText(payload.closeNotes)

    if (!resolutionAction) {
      return Response.json({ message: 'Tindakan penyelesaian wajib diisi.' }, { status: 400 })
    }
    if (!closeNotes) {
      return Response.json({ message: 'Catatan penutupan wajib diisi.' }, { status: 400 })
    }

    const ticket = await getTroubleTicketByCode(ticketCode)
    if (!ticket) {
      return Response.json({ message: 'Trouble ticket tidak ditemukan.' }, { status: 404 })
    }
    if (ticket.closedAt || ['CLOSE', 'CLOSED'].includes(ticket.status.trim().toUpperCase())) {
      return Response.json({ message: `Trouble ticket ${ticket.ticketCode} sudah berstatus closed.` }, { status: 409 })
    }

    await ensureSupportTroubleTicketProgressTable()

    const latestProgress = await getLatestProgressByTicketId(ticket.id)
    const latestProgressStatus = String(latestProgress?.progressStatus ?? '').trim().toUpperCase()
    if (!latestProgress || !['ON_PROGRESS', 'FOLLOW_UP'].includes(latestProgressStatus)) {
      return Response.json(
        {
          message: `Trouble ticket ${ticket.ticketCode} belum memiliki progress aktif yang valid. Update progress ticket terlebih dahulu sebelum close.`,
        },
        { status: 409 },
      )
    }

    const closeNoteText = `[Closed via web] ${session.displayName} (${session.username}) - ${closeNotes}`

    await runReviewDbExecute(
      `
        UPDATE support_trouble_tickets
        SET
          status = 'CLOSED',
          resolution_action = ?,
          close_notes = ?,
          closed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [resolutionAction, closeNoteText, ticket.id]
    )

    return Response.json({
      message: `Trouble ticket ${ticket.ticketCode} untuk ${ticket.customerName} berhasil ditutup.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
