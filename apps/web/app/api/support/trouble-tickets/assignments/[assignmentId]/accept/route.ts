import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  acceptServiceTroubleTicketAssignment,
  type AcceptFieldTechSession,
} from '@/lib/services/field-ops-service'
import type { AppRole } from '@/lib/types'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  if (sessionRole !== 'FIELD_TECHNICIAN') {
    return Response.json(
      { message: 'Forbidden: hanya Field Technician yang dapat accept assignment TT.' },
      { status: 403 },
    )
  }
  const userId = Number(session.userId ?? 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ message: 'Forbidden: user ID tidak valid.' }, { status: 403 })
  }
  try {
    const resolvedParams = await params
    const assignmentIdRaw = String(resolvedParams.assignmentId ?? '').trim()
    const assignmentId = Number.parseInt(assignmentIdRaw, 10)
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return Response.json({ message: 'ID assignment tidak valid.' }, { status: 400 })
    }
    const source = getDataSourceSnapshot()
    const acceptSession: AcceptFieldTechSession = { userId, role: sessionRole }
    let affectedRows = 0
    let alreadyAccepted = false
    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      const res = await acceptServiceTroubleTicketAssignment({
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
        ? 'Assignment TT sudah pernah di-accept sebelumnya.'
        : 'Assignment TT berhasil di-accept oleh teknisi.',
      alreadyAccepted,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
