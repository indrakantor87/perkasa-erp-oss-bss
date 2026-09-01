import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  ensureServiceWorkOrderAssignmentTable,
  ensureServiceWorkOrderStatusLogTable,
  insertServiceWorkOrderAssignment,
  insertServiceWorkOrderStatusLog,
  resolveReviewAuthUserIdByUsername,
  REASSIGN_FULL_ACCESS_ROLES_SET,
} from '@/lib/services/field-ops-service'
import type { AppRole } from '@/lib/types'

function resolveOptionalPositiveInt(raw: unknown): number | null {
  if (raw == null) return null
  const str = String(raw).trim()
  if (!str) return null
  const num = Number(str)
  return Number.isInteger(num) && num > 0 ? num : null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  const hasFullAccess = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
  const hasSupportUpdate = canPerformAction(sessionRole, 'support', 'update')
  const hasSalesUpdate = canPerformAction(sessionRole, 'sales', 'update')

  if (!(hasFullAccess || hasSupportUpdate || hasSalesUpdate)) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const resolvedParams = await params
    const workOrderIdRaw = String(resolvedParams.id ?? '').trim()
    const workOrderId = Number.parseInt(workOrderIdRaw, 10)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return Response.json(
        { message: 'ID work order tidak valid.' },
        { status: 400 },
      )
    }

    const body = (await request.json().catch(() => null)) as {
      assignedUserId?: unknown
      notes?: unknown
    } | null

    const assignedUserId = resolveOptionalPositiveInt(body?.assignedUserId)
    if (assignedUserId == null) {
      return Response.json(
        { message: 'ID teknisi target (assignedUserId) tidak valid.' },
        { status: 400 },
      )
    }

    const notesRaw = body?.notes
    const notes =
      typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : null

    const source = getDataSourceSnapshot()
    if (source.effectiveMode !== 'review-db' || source.isFallback) {
      return Response.json(
        {
          message:
            'Write action dispatch work order hanya aktif saat review DB benar-benar tersedia.',
        },
        { status: 503 },
      )
    }

    await ensureServiceWorkOrderAssignmentTable()
    await ensureServiceWorkOrderStatusLogTable()

    const actorUserId = await resolveReviewAuthUserIdByUsername(session.username)

    await insertServiceWorkOrderAssignment({
      workOrderId,
      assignedUserId,
      assignedByUserId: actorUserId ?? null,
      assignmentRole: 'FIELD_TECHNICIAN',
      assignmentStatus: 'ASSIGNED',
      isPrimary: true,
      notes,
    })

    await insertServiceWorkOrderStatusLog({
      workOrderId,
      fromStatus: null,
      toStatus: 'ASSIGNED',
      changedByUserId: actorUserId ?? null,
      reasonCode: 'DISPATCH',
      reasonNotes: notes
        ? `Dispatch via WO detail: ${notes}`
        : 'Dispatch via WO detail panel.',
    })

    return Response.json({
      message: 'Berhasil dispatch: teknisi berhasil ditugaskan ke work order ini.',
    })
  } catch (error) {
    return Response.json(
      { message: getReviewDbErrorDetail(error) },
      { status: 500 },
    )
  }
}
