import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  ActivateFlowError,
  canApprovePsbList,
  canUpdatePsbList,
  markPsbActivationStep,
  finalizePsbCustomerSubscription,
  type ActivateErrorCode,
  type PsbActivationMarkStep,
} from '@/lib/services/psb-list-service'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import type { AppRole } from '@/lib/types'

type PsbActivationAction = PsbActivationMarkStep | 'FINALIZE_CUSTOMER'

type ActivationSuccessResponse = {
  success: true
  action: PsbActivationAction
  psbId: number
  psbListCode: string
  idempotent?: boolean
  happenedAt?: string
  customerId?: number | null
  subscriptionId?: number | null
  serviceNo?: string | null
}

type ActivationFailureResponse = {
  success: false
  error: ActivateErrorCode | 'UNAUTHORIZED' | 'FORBIDDEN' | 'DB_UNAVAILABLE' | 'INVALID_PAYLOAD' | 'INTERNAL'
  message: string
}

function resolvePositiveInt(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function isMarkStep(value: unknown): value is PsbActivationMarkStep {
  return value === 'MARK_ONU' || value === 'MARK_ODP' || value === 'MARK_RADIUS'
}

function mapErrorToStatus(code: ActivateErrorCode): number {
  switch (code) {
    case 'PSB_NOT_FOUND':
      return 404
    case 'PSB_STATUS_INVALID':
    case 'PSB_ALREADY_ACTIVATED':
      return 409
    case 'CUSTOMER_CREATE_FAILED':
    case 'SUBSCRIPTION_CREATE_FAILED':
    case 'WORKORDER_CREATE_FAILED':
      return 422
    case 'INTERNAL':
    default:
      return 500
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json(
      {
        success: false,
        error: 'UNAUTHORIZED' as const,
        message: 'Sesi autentikasi tidak ditemukan. Silakan login kembali.',
      } satisfies ActivationFailureResponse,
      { status: 401 },
    )
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      {
        success: false,
        error: 'DB_UNAVAILABLE' as const,
        message: 'Aktivasi Data PSB hanya aktif saat review DB benar-benar tersedia.',
      } satisfies ActivationFailureResponse,
      { status: 503 },
    )
  }

  try {
    const body = (await request.json()) as {
      psbListId?: unknown
      action?: unknown
      notes?: string | null
    } | null

    const psbListId = resolvePositiveInt(body?.psbListId)
    if (!psbListId) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_PAYLOAD' as const,
          message: 'ID Data PSB tidak valid.',
        } satisfies ActivationFailureResponse,
        { status: 400 },
      )
    }

    const actionRaw = body?.action
    const isFinalize = actionRaw === 'FINALIZE_CUSTOMER'
    if (!isMarkStep(actionRaw) && !isFinalize) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_PAYLOAD' as const,
          message: 'Action harus MARK_ONU / MARK_ODP / MARK_RADIUS / FINALIZE_CUSTOMER.',
        } satisfies ActivationFailureResponse,
        { status: 400 },
      )
    }
    const action: PsbActivationAction = isFinalize ? 'FINALIZE_CUSTOMER' : (actionRaw as PsbActivationMarkStep)

    const sessionRole = (session.role ?? 'PUBLIC') as AppRole

    let hasPermission = false
    if (isFinalize) {
      hasPermission =
        canApprovePsbList(sessionRole) &&
        (canPerformAction(sessionRole, 'sales', 'approve') || canPerformAction(sessionRole, 'customers', 'approve'))
    } else {
      hasPermission =
        canUpdatePsbList(sessionRole) &&
        (canPerformAction(sessionRole, 'sales', 'update') ||
          canPerformAction(sessionRole, 'inventory', 'update') ||
          canPerformAction(sessionRole, 'customers', 'update'))
    }

    if (!hasPermission) {
      return Response.json(
        {
          success: false,
          error: 'FORBIDDEN' as const,
          message: 'Role aktif belum memiliki izin untuk perubahan tahapan aktivasi Data PSB.',
        } satisfies ActivationFailureResponse,
        { status: 403 },
      )
    }

    const userId = session.userId ? Number(session.userId) : null
    const actorBase = {
      userId: userId != null && Number.isInteger(userId) && userId > 0 ? userId : null,
      username: String(session.username ?? 'unknown'),
      displayName: String(session.displayName ?? String(session.username ?? 'Unknown User')),
      role: sessionRole,
      branchId: session.branchId ? Number(session.branchId) : null,
    }

    if (isFinalize) {
      const result = await finalizePsbCustomerSubscription({
        psbListId,
        actor: actorBase,
      })
      return Response.json(
        {
          success: true,
          action: 'FINALIZE_CUSTOMER',
          psbId: result.psbId,
          psbListCode: result.psbListCode,
          idempotent: result.idempotent,
          customerId: result.customerId,
          subscriptionId: result.subscriptionId,
          serviceNo: result.serviceNo,
        } satisfies ActivationSuccessResponse,
        { status: 200 },
      )
    }

    const markRes = await markPsbActivationStep({
      psbListId,
      step: action as PsbActivationMarkStep,
      actorName: `${actorBase.displayName} (${actorBase.username})`,
      actorRole: actorBase.role,
      notes: body?.notes?.trim() || null,
      customAt: null,
    })

    return Response.json(
      {
        success: true,
        action: markRes.step,
        psbId: markRes.psbId,
        psbListCode: markRes.psbListCode,
        happenedAt: markRes.happenedAt.toISOString(),
      } satisfies ActivationSuccessResponse,
      { status: 200 },
    )
  } catch (err) {
    if (err instanceof ActivateFlowError) {
      return Response.json(
        {
          success: false,
          error: err.code,
          message: err.message,
        } satisfies ActivationFailureResponse,
        { status: mapErrorToStatus(err.code) },
      )
    }

    const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error')
    const validationMatch = /tidak valid|belum ditandai/i.exec(msg)
    if (validationMatch) {
      return Response.json(
        {
          success: false,
          error: 'PSB_STATUS_INVALID',
          message: msg,
        } satisfies ActivationFailureResponse,
        { status: 409 },
      )
    }

    return Response.json(
      {
        success: false,
        error: 'INTERNAL' as const,
        message: getReviewDbErrorDetail(err),
      } satisfies ActivationFailureResponse,
      { status: 500 },
    )
  }
}
