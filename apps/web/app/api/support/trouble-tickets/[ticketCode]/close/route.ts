import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
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

type TroubleTicketMasterRow = {
  masterValue: string
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
  const [hasProgressId, hasProgressTicketId, hasProgressStatus] = await Promise.all([
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'id'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'trouble_ticket_id'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'progress_status'),
  ])

  if (!hasProgressId || !hasProgressTicketId || !hasProgressStatus) {
    return null
  }

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

async function hasResolutionActionMaster(resolutionAction: string) {
  const [hasMasterKind, hasMasterValue] = await Promise.all([
    hasReviewDbColumn('support_trouble_ticket_masters', 'kind'),
    hasReviewDbColumn('support_trouble_ticket_masters', 'master_value'),
  ])

  if (!hasMasterKind || !hasMasterValue) {
    return null
  }

  const rows = await runReviewDbQuery<TroubleTicketMasterRow>(
    `
      SELECT master_value AS masterValue
      FROM support_trouble_ticket_masters
      WHERE UPPER(TRIM(kind)) = 'RESOLUTION_ACTION'
        AND UPPER(TRIM(master_value)) = UPPER(TRIM(?))
      LIMIT 1
    `,
    [resolutionAction],
  )

  return rows.length > 0
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

    const hasKnownResolutionAction = await hasResolutionActionMaster(resolutionAction)
    if (hasKnownResolutionAction === false) {
      return Response.json(
        { message: 'Tindakan penyelesaian belum terdaftar pada master resolution action.' },
        { status: 400 },
      )
    }

    await ensureSupportTroubleTicketProgressTable()

    const latestProgress = await getLatestProgressByTicketId(ticket.id)
    const latestProgressStatus = String(latestProgress?.progressStatus ?? '').trim().toUpperCase()
    const ticketStatus = ticket.status.trim().toUpperCase()
    const hasValidProgressState = latestProgress
      ? ['ON_PROGRESS', 'FOLLOW_UP'].includes(latestProgressStatus)
      : ['ON_PROGRESS', 'FOLLOW_UP'].includes(ticketStatus)
    if (!hasValidProgressState) {
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
