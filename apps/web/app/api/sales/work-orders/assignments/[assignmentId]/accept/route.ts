import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  acceptServiceWorkOrderAssignment,
  type AcceptFieldTechSession,
} from '@/lib/services/field-ops-service'
import { acceptServiceWorkOrderAssignmentMock } from '@/lib/services/tracking-service'

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
    const acceptSession: AcceptFieldTechSession = {
      userId: session.userId,
      role: session.role,
    }

    let affectedRows = 0
    let alreadyAccepted = false
    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      const res = await acceptServiceWorkOrderAssignment({
        assignmentId,
        session: acceptSession,
      })
      affectedRows = Number(res.affectedRows ?? 0)
      alreadyAccepted = Boolean(res.alreadyAccepted)
    } else {
      const res = await acceptServiceWorkOrderAssignmentMock({
        assignmentId,
        session: acceptSession,
      })
      affectedRows = Number(res.affectedRows ?? 0)
      alreadyAccepted = Boolean(res.alreadyAccepted)
    }

    if (affectedRows <= 0) {
      return Response.json(
        { message: 'Assignment tidak ditemukan, tidak berstatus ASSIGNED aktif, atau bukan milik Anda.' },
        { status: 404 },
      )
    }

    return Response.json({
      message: alreadyAccepted
        ? 'Assignment sudah pernah di-accept sebelumnya.'
        : 'Assignment berhasil di-accept oleh teknisi.',
      alreadyAccepted,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
