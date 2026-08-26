import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  reassignServiceWorkOrderAssignment,
  type ReassignFieldTechSession,
} from '@/lib/services/field-ops-service'
import { reassignServiceWorkOrderAssignmentMock } from '@/lib/services/tracking-service'

function resolveOptionalPositiveInt(raw: unknown): number | null {
  if (raw == null) {
    return null
  }
  const str = String(raw).trim()
  if (!str) {
    return null
  }
  const num = Number(str)
  if (!Number.isInteger(num) || num <= 0) {
    return null
  }
  return num
}

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
      return Response.json({ message: 'ID assignment lama tidak valid.' }, { status: 400 })
    }
    const body = (await request.json().catch(() => null)) as { targetTechBId?: unknown } | null
    const targetTechBId = resolveOptionalPositiveInt(body?.targetTechBId)
    if (targetTechBId == null) {
      return Response.json(
        { message: 'ID teknisi target baru (targetTechBId) tidak valid.' },
        { status: 400 },
      )
    }

    const source = getDataSourceSnapshot()
    const reassignSession: ReassignFieldTechSession = {
      userId: session.userId,
      role: session.role,
    }

    let affectedRows = 0
    let alreadyDone = false
    let newAssignmentId: number | null = null
    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      const res = await reassignServiceWorkOrderAssignment({
        assignmentAId: assignmentId,
        targetTechBId,
        session: reassignSession,
      })
      affectedRows = Number(res.affectedRows ?? 0)
      alreadyDone = Boolean(res.alreadyDone)
      newAssignmentId = res.newAssignmentId ?? null
    } else {
      const res = await reassignServiceWorkOrderAssignmentMock({
        assignmentAId: assignmentId,
        targetTechBId,
        session: reassignSession,
      })
      affectedRows = Number(res.affectedRows ?? 0)
      alreadyDone = Boolean(res.alreadyDone)
      newAssignmentId = res.newAssignmentId ?? null
    }

    if (affectedRows <= 0) {
      return Response.json({ message: 'Assignment tidak ditemukan.' }, { status: 404 })
    }

    return Response.json({
      message: alreadyDone
        ? 'Reassign teknisi sudah pernah dilakukan sebelumnya.'
        : 'Assignment teknisi berhasil direassign.',
      alreadyDone,
      newAssignmentId: newAssignmentId ?? undefined,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
