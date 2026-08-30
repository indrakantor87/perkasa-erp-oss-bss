import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  REASSIGN_FULL_ACCESS_ROLES_SET,
  releaseServiceTroubleTicketAssignment,
  TT_ASSIGNMENT_ERROR_CODES,
} from '@/lib/services/field-ops-service'
import type { AppRole } from '@/lib/types'

type TtReleaseSuccess = {
  success: true
  idempotent: boolean
  message: string
  troubleTicketId: number | null
}

type TtReleaseFail = {
  success: false
  error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'NOT_FOUND' | 'INTERNAL'
  message: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { success: false, error: 'UNAUTHORIZED' as const, message: 'Unauthorized.' } satisfies TtReleaseFail,
      { status: 401 },
    )
  }
  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  const userId = session.userId ? Number(session.userId) : null
  let resolvedScope: 'SELF_ONLY' | 'FULL_ACCESS' | 'DENY' = 'DENY'
  if (sessionRole === 'FIELD_TECHNICIAN') {
    resolvedScope = 'SELF_ONLY'
  } else if (
    REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole) ||
    canPerformAction(sessionRole, 'support', 'update')
  ) {
    resolvedScope = 'FULL_ACCESS'
  } else {
    resolvedScope = 'DENY'
  }
  if (resolvedScope === 'DENY') {
    return Response.json(
      { success: false, error: 'FORBIDDEN' as const, message: 'Forbidden release TT assignment.' } satisfies TtReleaseFail,
      { status: 403 },
    )
  }
  try {
    const resolvedParams = await params
    const assignmentIdRaw = String(resolvedParams.assignmentId ?? '').trim()
    const assignmentId = Number.parseInt(assignmentIdRaw, 10)
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return Response.json(
        { success: false, error: 'INVALID_INPUT' as const, message: 'ID assignment tidak valid.' } satisfies TtReleaseFail,
        { status: 400 },
      )
    }
    const body = (await request.json().catch(() => null)) as {
      releasedReason?: unknown
    } | null
    const releasedReason = String(body?.releasedReason ?? '').trim().toUpperCase() || 'CANCELLED'
    const vocab = new Set(['CANCELLED', 'REASSIGNED', 'CLOSED', 'TRANSFERRED'])
    if (!vocab.has(releasedReason)) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_INPUT' as const,
          message: 'Alasan release tidak valid (hanya: CANCELLED, REASSIGNED, CLOSED, TRANSFERRED).',
        } satisfies TtReleaseFail,
        { status: 400 },
      )
    }
    const source = getDataSourceSnapshot()
    let affectedRows = 0
    let idempotent = false
    let troubleTicketId: number | null = null
    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      const res = await releaseServiceTroubleTicketAssignment({
        assignmentId,
        sessionUserId: userId,
        authorizationScope: resolvedScope,
        releasedReason,
        releasedByUserId: userId,
      })
      affectedRows = Number(res.affectedRows ?? 0)
      idempotent = Boolean(res.idempotent)
      troubleTicketId = res.troubleTicketId ?? null
    }
    if (affectedRows <= 0 && !idempotent) {
      return Response.json(
        { success: false, error: 'NOT_FOUND' as const, message: 'Assignment tidak ditemukan.' } satisfies TtReleaseFail,
        { status: 404 },
      )
    }
    void TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_ALREADY_RELEASED
    return Response.json(
      {
        success: true,
        idempotent,
        message: idempotent ? 'Assignment TT sudah dilepaskan sebelumnya.' : 'Assignment TT berhasil dilepaskan.',
        troubleTicketId,
      } satisfies TtReleaseSuccess,
      { status: 200 },
    )
  } catch (error) {
    return Response.json(
      { success: false, error: 'INTERNAL' as const, message: getReviewDbErrorDetail(error) } satisfies TtReleaseFail,
      { status: 500 },
    )
  }
}
