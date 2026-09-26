import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getReviewDbErrorDetail,
  hasReviewDbColumn,
  runReviewDbTransaction,
  type ReviewDbConnection,
} from '@/lib/review-db'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'
import {
  isBranchIdInScope,
  lockAndResolveTroubleTicketBranch,
  type ValidateBranchScopeSession,
  type TroubleTicketBranchLockRow,
} from '@/lib/services/field-ops-service'

const allowedStatuses = new Set(['OPEN', 'ON_PROGRESS', 'FOLLOW_UP'])

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

async function buildProgressLogInsertPayload(params: {
  ticketId: number
  progressStatus: string
  ownerName: string
  progressNotes: string
  followUpAt: Date | null
  actorLabel: string
  connection: ReviewDbConnection
}) {
  void params.connection
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
  const { ticketCode: ticketCodeLocal } = await params

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

  let resolvedTicketCode = ''
  try {const ticketCode = decodeURIComponent(ticketCodeLocal ?? '').trim().toUpperCase()
    if (!ticketCode) {
      return Response.json({ message: 'Kode ticket wajib diisi.' }, { status: 400 })
    }
    resolvedTicketCode = ticketCode

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

    await ensureSupportTroubleTicketProgressTable()

    const sessionSafe = session as unknown as ValidateBranchScopeSession
    const result = await runReviewDbTransaction(async (conn) => {
      const lockedTicket = await lockAndResolveTroubleTicketBranch({
        ticketCode,
        connection: conn,
      })
      if (!lockedTicket) {
        return { status: 404, message: 'Trouble ticket tidak ditemukan.' } as const
      }
      if (
        lockedTicket.closedAt ||
        ['CLOSE', 'CLOSED'].includes(lockedTicket.status.trim().toUpperCase())
      ) {
        return {
          status: 409,
          message: `Trouble ticket ${lockedTicket.ticketCode ?? ticketCode} sudah berstatus closed.`,
        } as const
      }
      if (!isBranchIdInScope(sessionSafe, lockedTicket.branchId)) {
        return {
          status: 403,
          message: 'Akses lintas cabang tidak diizinkan untuk update progress trouble ticket.',
        } as const
      }
      void 0 satisfies TroubleTicketBranchLockRow | unknown

      const actorLabel = `${session.displayName} (${session.username})`
      const noteText = `[Progress via web] ${actorLabel} - ${progressNotes}`

      await conn.query(
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
        [progressStatus, noteText, noteText, lockedTicket.id],
      )

      const progressLogPayload = await buildProgressLogInsertPayload({
        ticketId: lockedTicket.id,
        progressStatus,
        ownerName,
        progressNotes,
        followUpAt,
        actorLabel,
        connection: conn,
      })

      if (progressLogPayload) {
        await conn.query(
          `
            INSERT INTO support_trouble_ticket_progress_logs (
              ${progressLogPayload.columns.join(',\n            ')}
            )
            VALUES (${progressLogPayload.placeholders.join(', ')})
          `,
          progressLogPayload.values,
        )
      }

      return {
        status: 200 as const,
        message: `Progress trouble ticket ${lockedTicket.ticketCode ?? ticketCode} untuk ${lockedTicket.customerName ?? 'customer'} berhasil diperbarui.`,
      }
    })

    return Response.json({ message: result.message }, { status: result.status })
  } catch (error) {
    return Response.json(
      {
        message: getReviewDbErrorDetail(error),
        ticketCode: resolvedTicketCode || undefined,
      },
      { status: 500 },
    )
  }
}

declare const _ttAnchorType: never
