import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbTransaction } from '@/lib/review-db'
import {
  ensureServiceWorkOrderAssignmentTable,
  ensureServiceWorkOrderStatusLogTable,
  insertServiceWorkOrderAssignment,
  insertServiceWorkOrderStatusLog,
  isBranchIdInScope,
  isWorkOrderTerminal,
  lockAndResolveWorkOrderBranch,
  resolveReviewAuthUserIdByUsername,
  hasFullFieldOpsReassignAccess,
  validateTargetTechnicianUser,
} from '@/lib/services/field-ops-service'
import type { AppRole } from '@/lib/types'

function resolveOptionalPositiveInt(raw: unknown): number | null {
  if (raw == null) return null
  const str = String(raw).trim()
  if (!str) return null
  const num = Number(str)
  return Number.isInteger(num) && num > 0 ? num : null
}

class AssignmentDispatchError extends Error {
  readonly statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'AssignmentDispatchError'
    this.statusCode = Number.isInteger(statusCode) && statusCode > 0 ? statusCode : 400
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idLocal } = await params

  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  const hasFullAccess = hasFullFieldOpsReassignAccess(sessionRole)
  const hasSupportUpdate = canPerformAction(sessionRole, 'support', 'update')
  const hasSalesUpdate = canPerformAction(sessionRole, 'sales', 'update')

  if (!(hasFullAccess || hasSupportUpdate || hasSalesUpdate)) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {const workOrderIdRaw = String(idLocal ?? '').trim()
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

    try {
      let completedAssignment = false
      await runReviewDbTransaction(async (conn) => {
        const woLock = await lockAndResolveWorkOrderBranch({ workOrderId, connection: conn })
        if (!woLock) {
          throw new AssignmentDispatchError(404, 'Work order tidak ditemukan.')
        }
        if (!isBranchIdInScope(session, woLock.branchId)) {
          throw new AssignmentDispatchError(403, 'Work order berada di luar scope cabang user (cross-branch dispatch ditolak).')
        }
        if (isWorkOrderTerminal(woLock)) {
          throw new AssignmentDispatchError(409, 'Work order sudah final (terminal status), assignment baru tidak dapat ditambahkan.')
        }
        const validatedTech = await validateTargetTechnicianUser({
          targetUserId: assignedUserId,
          connection: conn,
          forUpdate: true,
        })
        if (!validatedTech) {
          throw new AssignmentDispatchError(403, 'assignedUserId tidak valid: user tidak ditemukan / tidak aktif / bukan teknisi.')
        }
        const targetBranch = validatedTech.userBranchId
        if (woLock.branchId != null && targetBranch != null && !isBranchIdInScope(session, targetBranch)) {
          throw new AssignmentDispatchError(403, 'Teknisi target berada di luar scope cabang user (cross-branch assignment ditolak).')
        }
        if (woLock.branchId != null && targetBranch != null && targetBranch !== woLock.branchId) {
          throw new AssignmentDispatchError(403, 'Teknisi target harus berada pada cabang yang sama dengan work order.')
        }
        await insertServiceWorkOrderAssignment({
          workOrderId,
          assignedUserId,
          assignedByUserId: actorUserId ?? null,
          assignmentRole: 'FIELD_TECHNICIAN',
          assignmentStatus: 'ASSIGNED',
          isPrimary: true,
          notes,
          connection: conn,
        })
        completedAssignment = true
      })
      if (completedAssignment) {
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
      }
    } catch (error) {
      if (error instanceof AssignmentDispatchError) {
        return Response.json(
          { message: error.message },
          { status: error.statusCode },
        )
      }
      const errDetail = getReviewDbErrorDetail(error)
      if (typeof errDetail === 'string' && /duplicate/i.test(errDetail)) {
        return Response.json(
          { message: 'Teknisi target sudah memiliki assignment aktif pada work order ini (duplicate assignment ditolak).' },
          { status: 409 },
        )
      }
      if (typeof errDetail === 'string' && /Target teknisi assignment tidak valid/i.test(errDetail)) {
        return Response.json(
          { message: 'assignedUserId tidak valid: user tidak ditemukan / tidak aktif / bukan teknisi.' },
          { status: 403 },
        )
      }
      return Response.json(
        { message: errDetail },
        { status: 500 },
      )
    }

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
