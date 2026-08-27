import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { releaseServiceWorkOrderAssignment } from '@/lib/services/field-ops-service'
import { releaseServiceWorkOrderAssignmentMock } from '@/lib/services/tracking-service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resolvedParams = await params
    const assignmentIdRaw = String(resolvedParams.assignmentId ?? '').trim()
    const assignmentId = Number.parseInt(assignmentIdRaw, 10)
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return Response.json({ message: 'ID assignment tidak valid.' }, { status: 400 })
    }

    void request
    const source = getDataSourceSnapshot()
    const actorUserId = session.userId

    const normalizedRole = (session.role ?? '').trim().toUpperCase() as
      | 'FIELD_TECHNICIAN'
      | 'OWNER'
      | 'SUPER_ADMIN'
      | 'ADMIN'
      | 'NOC_OPERATOR'
      | 'TT_OPERATOR'
      | string

    let resolvedScope: 'SELF_ONLY' | 'FULL_ACCESS' | 'DENY' = 'DENY'
    if (normalizedRole === 'FIELD_TECHNICIAN') {
      resolvedScope = 'SELF_ONLY'
    } else if (
      normalizedRole === 'OWNER' ||
      normalizedRole === 'SUPER_ADMIN' ||
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'NOC_OPERATOR' ||
      normalizedRole === 'TT_OPERATOR'
    ) {
      resolvedScope = 'FULL_ACCESS'
    } else {
      resolvedScope = 'DENY'
    }

    if (resolvedScope === 'DENY') {
      return Response.json({ message: 'Assignment tidak ditemukan.' }, { status: 404 })
    }

    let affectedRows = 0

    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      const res = await releaseServiceWorkOrderAssignment({
        assignmentId,
        sessionUserId: actorUserId,
        authorizationScope: resolvedScope,
        releasedByUserId: actorUserId,
      })
      affectedRows = Number(res.affectedRows ?? 0)
    } else {
      const res = await releaseServiceWorkOrderAssignmentMock({
        assignmentId,
        sessionUserId: actorUserId,
        authorizationScope: resolvedScope,
        releasedByUserId: actorUserId,
      })
      affectedRows = Number(res.affectedRows ?? 0)
    }

    if (affectedRows <= 0) {
      return Response.json({ message: 'Assignment tidak ditemukan.' }, { status: 404 })
    }

    return Response.json({
      message: 'Assignment berhasil dilepaskan.',
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
