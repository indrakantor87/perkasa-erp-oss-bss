import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'

const allowedStatuses = new Set(['OPEN', 'ON_PROGRESS', 'FOLLOW_UP'])

type TroubleTicketRow = {
  id: number
  ticketCode: string
  customerName: string
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

async function buildProgressLogInsertPayload(params: {
  ticketId: number
  progressStatus: string
  ownerName: string
  progressNotes: string
  followUpAt: Date | null
  actorLabel: string
}) {
  const [
    hasTroubleTicketId,
    hasProgressStatus,
    hasOwnerName,
    hasProgressNotes,
    hasFollowUpAt,
    hasUpdatedBy,
  ] = await Promise.all([
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'trouble_ticket_id'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'progress_status'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'owner_name'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'progress_notes'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'follow_up_at'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'updated_by'),
  ])

  if (!hasTroubleTicketId || !hasProgressStatus) {
    return null
  }

  const columns = ['trouble_ticket_id', 'progress_status']
  const values: unknown[] = [params.ticketId, params.progressStatus]

  if (hasOwnerName) {
    columns.push('owner_name')
    values.push(params.ownerName)
  }
  if (hasProgressNotes) {
    columns.push('progress_notes')
    values.push(params.progressNotes)
  }
  if (hasFollowUpAt) {
    columns.push('follow_up_at')
    values.push(params.followUpAt)
  }
  if (hasUpdatedBy) {
    columns.push('updated_by')
    values.push(params.actorLabel)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
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
      { message: 'Update progress support hanya aktif saat review DB benar-benar tersedia.' },
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
      progressStatus?: unknown
      ownerName?: unknown
      progressNotes?: unknown
      followUpAt?: unknown
    }

    const progressStatus = normalizeRequiredText(payload.progressStatus).toUpperCase()
    const ownerName = normalizeRequiredText(payload.ownerName)
    const progressNotes = normalizeRequiredText(payload.progressNotes)
    const followUpAtRaw = normalizeRequiredText(payload.followUpAt)

    if (!allowedStatuses.has(progressStatus)) {
      return Response.json({ message: 'Status progress ticket tidak valid.' }, { status: 400 })
    }
    if (!ownerName) {
      return Response.json({ message: 'PIC / owner wajib diisi.' }, { status: 400 })
    }
    if (!progressNotes) {
      return Response.json({ message: 'Catatan progress wajib diisi.' }, { status: 400 })
    }

    let followUpAt: Date | null = null
    if (followUpAtRaw) {
      followUpAt = new Date(followUpAtRaw)
      if (!Number.isFinite(followUpAt.getTime())) {
        return Response.json({ message: 'Jadwal follow-up tidak valid.' }, { status: 400 })
      }
    }

    const ticket = await getTroubleTicketByCode(ticketCode)
    if (!ticket) {
      return Response.json({ message: 'Trouble ticket tidak ditemukan.' }, { status: 404 })
    }
    if (ticket.closedAt || ['CLOSE', 'CLOSED'].includes(ticket.status.trim().toUpperCase())) {
      return Response.json({ message: `Trouble ticket ${ticket.ticketCode} sudah berstatus closed.` }, { status: 409 })
    }

    await ensureSupportTroubleTicketProgressTable()

    const actorLabel = `${session.displayName} (${session.username})`
    const noteText = `[Progress via web] ${actorLabel} - ${progressNotes}`

    await runReviewDbExecute(
      `
        UPDATE support_trouble_tickets
        SET
          status = ?,
          notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [progressStatus, noteText, noteText, ticket.id],
    )

    const progressLogPayload = await buildProgressLogInsertPayload({
      ticketId: ticket.id,
      progressStatus,
      ownerName,
      progressNotes,
      followUpAt,
      actorLabel,
    })

    if (progressLogPayload) {
      await runReviewDbExecute(
        `
          INSERT INTO support_trouble_ticket_progress_logs (
            ${progressLogPayload.columns.join(',\n            ')}
          )
          VALUES (${progressLogPayload.placeholders.join(', ')})
        `,
        progressLogPayload.values,
      )
    }

    return Response.json({
      message: `Progress trouble ticket ${ticket.ticketCode} untuk ${ticket.customerName} berhasil diperbarui.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
