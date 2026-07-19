import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import type { PsbListTransitionAction } from '@/lib/psb-list-shared'
import {
  canApprovePsbList,
  canUpdatePsbList,
  transferPsbListToTicket,
  transitionPsbListStatus,
} from '@/lib/services/psb-list-service'
import { getReviewDbErrorDetail } from '@/lib/review-db'

const allowedActions = new Set<PsbListTransitionAction>([
  'SUBMIT_REVIEW',
  'REQUEST_CORRECTION',
  'APPROVE',
  'REJECT',
  'TRANSFER',
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
      { message: 'Aksi write-side List PSB hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const psbListId = resolvePositiveInt(String(resolvedParams.id ?? ''))
    if (!psbListId) {
      return Response.json({ message: 'ID List PSB tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      action?: unknown
      notes?: unknown
    }
    const action = String(payload.action ?? '').trim().toUpperCase() as PsbListTransitionAction
    const notes = String(payload.notes ?? '').trim()

    if (!allowedActions.has(action)) {
      return Response.json({ message: 'Aksi transisi List PSB tidak valid.' }, { status: 400 })
    }

    const hasUpdatePermission =
      canUpdatePsbList(session.role) &&
      (canPerformAction(session.role, 'sales', 'update') || canPerformAction(session.role, 'customers', 'update'))
    const hasApprovePermission =
      canApprovePsbList(session.role) &&
      (canPerformAction(session.role, 'sales', 'approve') || canPerformAction(session.role, 'customers', 'approve'))

    if (action === 'TRANSFER') {
      if (!hasApprovePermission) {
        return Response.json({ message: 'Role aktif belum memiliki izin transfer List PSB ke ticketing.' }, { status: 403 })
      }

      const result = await transferPsbListToTicket({
        psbListId,
        notes,
        actorName: `${session.displayName} (${session.username})`,
        actorRole: session.role,
        actorUsername: session.username,
        branchId: session.branchId ?? null,
      })

      return Response.json({
        message: `List PSB ${result.psbListCode} (${result.customerName}) berhasil ditransfer ke ticket operasional ${result.workOrderNo}.`,
      })
    }

    if (action === 'APPROVE' || action === 'REJECT') {
      if (!hasApprovePermission) {
        return Response.json({ message: 'Role aktif belum memiliki izin approval List PSB.' }, { status: 403 })
      }
    } else if (!hasUpdatePermission) {
      return Response.json({ message: 'Role aktif belum memiliki izin update List PSB.' }, { status: 403 })
    }

    const result = await transitionPsbListStatus({
      psbListId,
      action,
      notes,
      actorName: `${session.displayName} (${session.username})`,
      actorRole: session.role,
    })

    return Response.json({
      message: `List PSB ${result.psbListCode} (${result.customerName}) berhasil diubah dari ${result.previousStatus} ke ${result.nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
