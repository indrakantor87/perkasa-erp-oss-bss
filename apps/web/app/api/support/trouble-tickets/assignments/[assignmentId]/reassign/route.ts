import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  reassignServiceTroubleTicketAssignment,
  type ReassignFieldTechSession,
  REASSIGN_FULL_ACCESS_ROLES_SET,
  TT_ASSIGNMENT_ERROR_CODES,
} from '@/lib/services/field-ops-service'
import type { AppRole } from '@/lib/types'

function resolveOptionalPositiveInt(raw: unknown): number | null {
  if (raw == null) return null
  const str = String(raw).trim()
  if (!str) return null
  const num = Number(str)
  if (!Number.isInteger(num) || num <= 0) return null
  return num
}

type TtReassignSuccess = {
  success: true
  message: string
  alreadyDone: boolean
  troubleTicketId: number | null
  newAssignmentId: number | null | undefined
}
type TtReassignFail = {
  success: false
  error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL'
  message: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { success: false, error: 'UNAUTHORIZED' as const, message: 'Unauthorized.' } satisfies TtReassignFail,
      { status: 401 },
    )
  }
  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  const hasFullAccess = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
  const hasSupportUpdate = canPerformAction(sessionRole, 'support', 'update')
  if (!(hasFullAccess || hasSupportUpdate)) {
    return Response.json(
      { success: false, error: 'FORBIDDEN' as const, message: 'Forbidden reassign TT assignment.' } satisfies TtReassignFail,
      { status: 403 },
    )
  }
  try {
    const resolvedParams = await params
    const assignmentIdRaw = String(resolvedParams.assignmentId ?? '').trim()
    const assignmentId = Number.parseInt(assignmentIdRaw, 10)
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return Response.json(
        { success: false, error: 'INVALID_INPUT' as const, message: 'ID assignment lama tidak valid.' } satisfies TtReassignFail,
        { status: 400 },
      )
    }
    const body = (await request.json().catch(() => null)) as { targetTechBId?: unknown } | null
    const targetTechBId = resolveOptionalPositiveInt(body?.targetTechBId)
    if (targetTechBId == null) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_INPUT' as const,
          message: 'ID teknisi target baru (targetTechBId) tidak valid.',
        } satisfies TtReassignFail,
        { status: 400 },
      )
    }
    const source = getDataSourceSnapshot()
    const reassignSession: ReassignFieldTechSession = { userId: session.userId, role: sessionRole }
    let affectedRows = 0
    let alreadyDone = false
    let newAssignmentId: number | null = null
    let troubleTicketId: number | null = null
    let errorCode: typeof TT_ASSIGNMENT_ERROR_CODES[keyof typeof TT_ASSIGNMENT_ERROR_CODES] | null = null
    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      const res = await reassignServiceTroubleTicketAssignment({
        assignmentAId: assignmentId,
        targetTechBId,
        session: reassignSession,
      })
      affectedRows = Number(res.affectedRows ?? 0)
      alreadyDone = Boolean(res.alreadyDone)
      newAssignmentId = res.newAssignmentId ?? null
      troubleTicketId = res.troubleTicketId ?? null
      errorCode = res.errorCode ?? null
    }
    if (errorCode && errorCode !== TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_SAME_USER_NOP && affectedRows <= 0 && !alreadyDone) {
      switch (errorCode) {
        case TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID:
          return Response.json(
            { success: false, error: 'INVALID_INPUT' as const, message: 'Teknisi target tidak valid/aktif.' } satisfies TtReassignFail,
            { status: 400 },
          )
        case TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_DUPLICATE_TECH:
          return Response.json(
            {
              success: false,
              error: 'CONFLICT' as const,
              message: 'Teknisi target sudah memiliki assignment aktif pada TT ini.',
            } satisfies TtReassignFail,
            { status: 409 },
          )
        default:
          break
      }
    }
    if (affectedRows <= 0 && !alreadyDone && errorCode !== TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_SAME_USER_NOP) {
      return Response.json(
        { success: false, error: 'NOT_FOUND' as const, message: 'Assignment tidak ditemukan.' } satisfies TtReassignFail,
        { status: 404 },
      )
    }
    return Response.json(
      {
        success: true,
        message: alreadyDone
          ? 'Reassign teknisi TT sudah pernah dilakukan sebelumnya.'
          : errorCode === TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_SAME_USER_NOP
            ? 'Reassign ke teknisi yang sama: tidak ada perubahan (NOP).'
            : 'Assignment TT berhasil direassign.',
        alreadyDone,
        troubleTicketId,
        newAssignmentId: newAssignmentId ?? undefined,
      } satisfies TtReassignSuccess,
      { status: 200 },
    )
  } catch (error) {
    return Response.json(
      { success: false, error: 'INTERNAL' as const, message: getReviewDbErrorDetail(error) } satisfies TtReassignFail,
      { status: 500 },
    )
  }
}
