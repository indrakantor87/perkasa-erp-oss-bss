import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureSupportTroubleTicketEscalationTable } from '@/lib/services/support-ticket-escalation-service'

const allowedEscalationLevels = new Set(['DUE_TODAY', 'OVERDUE', 'MANUAL'])

type TroubleTicketRow = {
  id: number
  ticketCode: string
  customerName: string
  ticketType: string
  status: string
  closedAt: string | Date | null
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
        type AS ticketType,
        status,
        closed_at AS closedAt
      FROM support_trouble_tickets
      WHERE UPPER(ticket_code) = ?
      LIMIT 1
    `,
    [ticketCode],
  )

  return row ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketCode: string }> },
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
      { message: 'Eskalasi support hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const ticketCode = decodeURIComponent(resolvedParams.ticketCode ?? '').trim().toUpperCase()
    if (!ticketCode) {
      return Response.json({ message: 'Kode ticket wajib diisi.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      escalationTarget?: unknown
      escalationLevel?: unknown
      escalationReason?: unknown
    }

    const escalationTarget = normalizeRequiredText(payload.escalationTarget)
    const escalationLevel = normalizeRequiredText(payload.escalationLevel).toUpperCase()
    const escalationReason = normalizeRequiredText(payload.escalationReason)

    if (!escalationTarget) {
      return Response.json({ message: 'Tujuan eskalasi wajib diisi.' }, { status: 400 })
    }
    if (!allowedEscalationLevels.has(escalationLevel)) {
      return Response.json({ message: 'Level eskalasi tidak valid.' }, { status: 400 })
    }
    if (!escalationReason) {
      return Response.json({ message: 'Alasan eskalasi wajib diisi.' }, { status: 400 })
    }

    const ticket = await getTroubleTicketByCode(ticketCode)
    if (!ticket) {
      return Response.json({ message: 'Trouble ticket tidak ditemukan.' }, { status: 404 })
    }
    if (ticket.closedAt || ['CLOSE', 'CLOSED'].includes(ticket.status.trim().toUpperCase())) {
      return Response.json({ message: `Trouble ticket ${ticket.ticketCode} sudah berstatus closed.` }, { status: 409 })
    }

    await ensureSupportTroubleTicketEscalationTable()

    const actorLabel = `${session.displayName} (${session.username})`
    const noteText = `[Escalated via web] ${actorLabel} -> ${escalationTarget} [${escalationLevel}] - ${escalationReason}`

    await runReviewDbExecute(
      `
        UPDATE support_trouble_tickets
        SET
          notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [noteText, noteText, ticket.id],
    )

    await runReviewDbExecute(
      `
        INSERT INTO support_trouble_ticket_escalation_logs (
          trouble_ticket_id,
          escalation_target,
          escalation_level,
          escalation_reason,
          escalated_by
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [ticket.id, escalationTarget, escalationLevel, escalationReason, actorLabel],
    )

    return Response.json({
      message: `Trouble ticket ${ticket.ticketCode} berhasil dieskalasikan ke ${escalationTarget}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
