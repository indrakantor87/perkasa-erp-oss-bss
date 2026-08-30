import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  createServiceTroubleTicketAssignment,
  type CreateServiceTroubleTicketAssignmentSession,
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

type TtAssignSuccessResponse = {
  success: true
  message: string
  alreadyDone: boolean
  troubleTicketId: number | null
  newAssignmentId: number | null | undefined
}

type TtAssignFailureResponse = {
  success: false
  error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'TT_NOT_FOUND' | 'TT_CLOSED' | 'DUPLICATE_TECH' | 'DUPLICATE_PRIMARY' | 'TECH_INVALID' | 'INTERNAL'
  message: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketCode: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json(
      { success: false, error: 'UNAUTHORIZED' as const, message: 'Sesi autentikasi tidak ditemukan. Silakan login kembali.' } satisfies TtAssignFailureResponse,
      { status: 401 },
    )
  }
  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  const hasFullAccess = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
  const hasSupportUpdate = canPerformAction(sessionRole, 'support', 'update')
  if (!(hasFullAccess || hasSupportUpdate)) {
    return Response.json(
      { success: false, error: 'FORBIDDEN' as const, message: 'Forbidden: memerlukan izin support.update atau akses operator penuh.' } satisfies TtAssignFailureResponse,
      { status: 403 },
    )
  }

  try {
    const resolvedParams = await params
    const ticketCode = decodeURIComponent(resolvedParams.ticketCode ?? '').trim().toUpperCase()
    if (!ticketCode) {
      return Response.json(
        { success: false, error: 'INVALID_INPUT' as const, message: 'Kode ticket wajib diisi.' } satisfies TtAssignFailureResponse,
        { status: 400 },
      )
    }
    const body = (await request.json().catch(() => null)) as {
      targetTechUserId?: unknown
      isPrimary?: unknown
      notes?: unknown
    } | null
    const targetTechUserId = resolveOptionalPositiveInt(body?.targetTechUserId)
    if (targetTechUserId == null) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_INPUT' as const,
          message: 'ID teknisi target (targetTechUserId) tidak valid.',
        } satisfies TtAssignFailureResponse,
        { status: 400 },
      )
    }
    const isPrimary = body?.isPrimary !== false
    const notesRaw = body?.notes != null ? String(body.notes).trim() : null
    const source = getDataSourceSnapshot()
    const createSession: CreateServiceTroubleTicketAssignmentSession = {
      userId: session.userId,
      role: sessionRole,
    }

    let result
    if (source.effectiveMode === 'review-db' && !source.isFallback) {
      result = await createServiceTroubleTicketAssignment({
        ticketCode,
        targetTechUserId,
        isPrimary,
        notes: notesRaw,
        session: createSession,
      })
    } else {
      result = {
        affectedRows: 0,
        newAssignmentId: null,
        troubleTicketId: null,
        alreadyDone: false,
        errorCode: TT_ASSIGNMENT_ERROR_CODES.INTERNAL,
        errorMessage: 'Mode DB tidak tersedia.',
      }
    }

    if (result.errorCode) {
      let httpStatus = 500
      let errorRespCategory: TtAssignFailureResponse['error'] = 'INTERNAL'
      let message = 'Kesalahan internal.'
      switch (result.errorCode) {
        case TT_ASSIGNMENT_ERROR_CODES.TT_NOT_FOUND:
          httpStatus = 404
          errorRespCategory = 'TT_NOT_FOUND'
          message = 'Trouble ticket tidak ditemukan.'
          break
        case TT_ASSIGNMENT_ERROR_CODES.TT_ALREADY_CLOSED:
        case TT_ASSIGNMENT_ERROR_CODES.TT_STATUS_INVALID:
          httpStatus = 409
          errorRespCategory = 'TT_CLOSED'
          message = 'Trouble ticket sudah berstatus closed atau tidak valid untuk assignment.'
          break
        case TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_DUPLICATE_TECH:
          httpStatus = 409
          errorRespCategory = 'DUPLICATE_TECH'
          message = 'Teknisi target sudah memiliki assignment aktif pada TT ini.'
          break
        case TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_DUPLICATE_PRIMARY:
          httpStatus = 409
          errorRespCategory = 'DUPLICATE_PRIMARY'
          message = 'TT ini masih memiliki assignment aktif dengan primary flag.'
          break
        case TT_ASSIGNMENT_ERROR_CODES.TT_TECHNICIAN_INVALID:
          httpStatus = 400
          errorRespCategory = 'TECH_INVALID'
          message = 'Teknisi target tidak valid atau tidak aktif.'
          break
        case TT_ASSIGNMENT_ERROR_CODES.TT_ASSIGNMENT_NOT_AUTHORIZED:
          httpStatus = 403
          errorRespCategory = 'FORBIDDEN'
          message = result.errorMessage ?? 'Memerlukan izin operator penuh.'
          break
        default:
          httpStatus = 500
          message = result.errorMessage ?? 'Kesalahan internal saat membuat assignment.'
      }
      return Response.json(
        { success: false, error: errorRespCategory, message } satisfies TtAssignFailureResponse,
        { status: httpStatus },
      )
    }

    if (result.affectedRows <= 0) {
      return Response.json(
        {
          success: false,
          error: 'INTERNAL' as const,
          message: result.alreadyDone ? 'Assignment sudah pernah dilakukan sebelumnya.' : 'Gagal membuat assignment.',
        } satisfies TtAssignFailureResponse,
        { status: 500 },
      )
    }

    return Response.json(
      {
        success: true,
        message: result.alreadyDone ? 'Assignment sudah pernah dilakukan sebelumnya.' : 'Assignment teknisi berhasil dibuat.',
        alreadyDone: Boolean(result.alreadyDone),
        troubleTicketId: result.troubleTicketId,
        newAssignmentId: result.newAssignmentId ?? undefined,
      } satisfies TtAssignSuccessResponse,
      { status: 200 },
    )
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: 'INTERNAL' as const,
        message: getReviewDbErrorDetail(error),
      } satisfies TtAssignFailureResponse,
      { status: 500 },
    )
  }
}
