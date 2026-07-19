import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import type { DismantleListTransitionAction } from '@/lib/dismantle-list-shared'
import {
  canApproveDismantleList,
  canUpdateDismantleList,
  transferDismantleListToTicket,
  transitionDismantleListStatus,
} from '@/lib/services/dismantle-list-service'
import { getReviewDbErrorDetail } from '@/lib/review-db'

const allowedActions = new Set<DismantleListTransitionAction>([
  'SUBMIT_REVIEW',
  'REQUEST_CORRECTION',
  'TRANSFER',
  'CANCEL',
  'REOPEN',
])

function resolvePositiveInt(value: string) {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Aksi write-side List Dismantle hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const dismantleListId = resolvePositiveInt(String(resolvedParams.id ?? ''))
    if (!dismantleListId) {
      return Response.json({ message: 'ID List Dismantle tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      action?: unknown
      notes?: unknown
    }
    const action = String(payload.action ?? '').trim().toUpperCase() as DismantleListTransitionAction
    const notes = String(payload.notes ?? '').trim()

    if (!allowedActions.has(action)) {
      return Response.json({ message: 'Aksi transisi List Dismantle tidak valid.' }, { status: 400 })
    }

    const hasUpdatePermission =
      canUpdateDismantleList(session.role) &&
      (
        canPerformAction(session.role, 'support', 'update') ||
        canPerformAction(session.role, 'billing', 'update') ||
        canPerformAction(session.role, 'customers', 'update')
      )
    const hasApprovePermission =
      canApproveDismantleList(session.role) &&
      (
        canPerformAction(session.role, 'support', 'approve') ||
        canPerformAction(session.role, 'billing', 'approve') ||
        canPerformAction(session.role, 'customers', 'approve')
      )

    if (action === 'TRANSFER') {
      if (!hasApprovePermission) {
        return Response.json({ message: 'Role aktif belum memiliki izin transfer List Dismantle ke ticketing.' }, { status: 403 })
      }

      const result = await transferDismantleListToTicket({
        dismantleListId,
        notes,
        actorName: `${session.displayName} (${session.username})`,
        actorRole: session.role,
        actorUsername: session.username,
        branchId: session.branchId ?? null,
      })

      return Response.json({
        message: `List Dismantle ${result.dismantleListCode} (${result.customerName}) berhasil ditransfer ke ticket operasional ${result.workOrderNo}.`,
      })
    }

    if (action === 'CANCEL' || action === 'REOPEN') {
      if (!hasApprovePermission) {
        return Response.json({ message: 'Role aktif belum memiliki izin batal atau buka ulang List Dismantle.' }, { status: 403 })
      }
    } else if (!hasUpdatePermission) {
      return Response.json({ message: 'Role aktif belum memiliki izin update List Dismantle.' }, { status: 403 })
    }

    const result = await transitionDismantleListStatus({
      dismantleListId,
      action,
      notes,
      actorName: `${session.displayName} (${session.username})`,
      actorRole: session.role,
    })

    return Response.json({
      message: `List Dismantle ${result.dismantleListCode} (${result.customerName}) berhasil diubah dari ${result.previousStatus} ke ${result.nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
