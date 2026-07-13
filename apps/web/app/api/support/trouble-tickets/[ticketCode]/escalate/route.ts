import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureSupportTroubleTicketEscalationTable } from '@/lib/services/support-ticket-escalation-service'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'

const allowedEscalationLevels = new Set(['DUE_TODAY', 'OVERDUE', 'MANUAL'])

type TroubleTicketRow = {
  id: number
  ticketCode: string
  customerName: string
  ticketType: string
  status: string
  closedAt: string | Date | null
  openedAt: string | Date
  slaDurationDays: number | null
  slaDueAt: string | Date | null
}

type TroubleTicketEscalationRow = {
  escalationTarget: string
  escalationLevel: string
  escalationReason: string | null
  escalatedAt: string | Date
}

type TroubleTicketProgressRow = {
  progressUpdatedAt: string | Date
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function getTroubleTicketByCode(ticketCode: string) {
  const [hasSupportSlaDueAt, hasSupportSlaTroubleType, hasSupportSlaDurationDays] = await Promise.all([
    hasReviewDbColumn('support_trouble_tickets', 'sla_due_at'),
    hasReviewDbColumn('support_trouble_ticket_sla', 'trouble_type'),
    hasReviewDbColumn('support_trouble_ticket_sla', 'duration_days'),
  ])

  const supportSlaJoinClause =
    hasSupportSlaTroubleType && hasSupportSlaDurationDays
      ? `LEFT JOIN support_trouble_ticket_sla sla
        ON UPPER(TRIM(sla.trouble_type)) = UPPER(TRIM(stt.type))`
      : `LEFT JOIN (
        SELECT
          NULL AS trouble_type,
          NULL AS duration_days
      ) sla
        ON 1 = 0`

  const supportSlaDueExpression = hasSupportSlaDueAt
    ? `COALESCE(
        stt.sla_due_at,
        CASE
          WHEN sla.duration_days IS NULL THEN NULL
          ELSE DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY)
        END
      )`
    : `CASE
        WHEN sla.duration_days IS NULL THEN NULL
        ELSE DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY)
      END`

  const [row] = await runReviewDbQuery<TroubleTicketRow>(
    `
      SELECT
        stt.id AS id,
        stt.ticket_code AS ticketCode,
        stt.customer_name AS customerName,
        stt.type AS ticketType,
        stt.status AS status,
        stt.closed_at AS closedAt,
        stt.opened_at AS openedAt,
        sla.duration_days AS slaDurationDays,
        ${supportSlaDueExpression} AS slaDueAt
      FROM support_trouble_tickets stt
      ${supportSlaJoinClause}
      WHERE UPPER(stt.ticket_code) = ?
      LIMIT 1
    `,
    [ticketCode],
  )

  return row ?? null
}

function isDateWithinToday(value: Date) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return value >= start && value < end
}

async function getLatestEscalationByTicketId(ticketId: number) {
  const [row] = await runReviewDbQuery<TroubleTicketEscalationRow>(
    `
      SELECT
        escalation_target AS escalationTarget,
        escalation_level AS escalationLevel,
        escalation_reason AS escalationReason,
        escalated_at AS escalatedAt
      FROM support_trouble_ticket_escalation_logs
      WHERE trouble_ticket_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [ticketId],
  )

  return row ?? null
}

async function getLatestProgressByTicketId(ticketId: number) {
  const [row] = await runReviewDbQuery<TroubleTicketProgressRow>(
    `
      SELECT
        updated_at AS progressUpdatedAt
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

    const slaDueAt = ticket.slaDueAt ? new Date(ticket.slaDueAt) : null
    const hasValidSlaDueAt = !!slaDueAt && Number.isFinite(slaDueAt.getTime())
    if (escalationLevel === 'OVERDUE' && !hasValidSlaDueAt) {
      return Response.json(
        {
          message: `Trouble ticket ${ticket.ticketCode} belum memiliki konteks SLA yang cukup untuk eskalasi OVERDUE. Lengkapi master SLA atau gunakan level MANUAL.`,
        },
        { status: 409 },
      )
    }
    if (escalationLevel === 'OVERDUE' && hasValidSlaDueAt && slaDueAt >= new Date()) {
      return Response.json(
        {
          message: `Trouble ticket ${ticket.ticketCode} belum OVERDUE menurut SLA. Gunakan level MANUAL bila eskalasi tetap diperlukan.`,
        },
        { status: 409 },
      )
    }
    if (escalationLevel === 'DUE_TODAY' && !hasValidSlaDueAt) {
      return Response.json(
        {
          message: `Trouble ticket ${ticket.ticketCode} belum memiliki konteks SLA yang cukup untuk eskalasi DUE_TODAY. Lengkapi master SLA atau gunakan level MANUAL.`,
        },
        { status: 409 },
      )
    }
    if (
      escalationLevel === 'DUE_TODAY' &&
      hasValidSlaDueAt &&
      (!isDateWithinToday(slaDueAt) || slaDueAt < new Date())
    ) {
      return Response.json(
        {
          message: `Trouble ticket ${ticket.ticketCode} tidak berada pada status SLA DUE_TODAY. Gunakan level yang sesuai dengan kondisi aktual.`,
        },
        { status: 409 },
      )
    }

    await ensureSupportTroubleTicketEscalationTable()
    await ensureSupportTroubleTicketProgressTable()

    const latestEscalation = await getLatestEscalationByTicketId(ticket.id)
    const latestProgress = await getLatestProgressByTicketId(ticket.id)
    const normalizedIncomingTarget = escalationTarget.trim().toUpperCase()
    const normalizedIncomingReason = escalationReason.trim().toUpperCase()
    const normalizedLatestTarget = String(latestEscalation?.escalationTarget ?? '')
      .trim()
      .toUpperCase()
    const normalizedLatestLevel = String(latestEscalation?.escalationLevel ?? '')
      .trim()
      .toUpperCase()
    const normalizedLatestReason = String(latestEscalation?.escalationReason ?? '')
      .trim()
      .toUpperCase()
    const latestEscalatedAt = latestEscalation?.escalatedAt ? new Date(latestEscalation.escalatedAt) : null
    const latestProgressUpdatedAt = latestProgress?.progressUpdatedAt ? new Date(latestProgress.progressUpdatedAt) : null
    const hasNewProgressAfterEscalation =
      !!latestEscalatedAt &&
      !!latestProgressUpdatedAt &&
      Number.isFinite(latestEscalatedAt.getTime()) &&
      Number.isFinite(latestProgressUpdatedAt.getTime()) &&
      latestProgressUpdatedAt > latestEscalatedAt

    if (
      latestEscalation &&
      normalizedLatestTarget === normalizedIncomingTarget &&
      normalizedLatestLevel === escalationLevel &&
      normalizedLatestReason === normalizedIncomingReason &&
      !hasNewProgressAfterEscalation
    ) {
      return Response.json(
        {
          message: `Trouble ticket ${ticket.ticketCode} sudah memiliki eskalasi yang sama tanpa progress baru sesudah eskalasi terakhir. Tambahkan context baru atau update progress ticket terlebih dahulu sebelum eskalasi ulang.`,
        },
        { status: 409 },
      )
    }

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
