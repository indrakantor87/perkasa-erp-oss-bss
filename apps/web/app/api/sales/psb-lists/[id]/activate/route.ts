import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  ActivateFlowError,
  canApprovePsbList,
  activatePsbFlow,
  type ActivateErrorCode,
} from '@/lib/services/psb-list-service'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import type { AppRole } from '@/lib/types'

function resolvePositiveInt(value: string) {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
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

type ActivateSuccessResponse = {
  success: true
  idempotent: boolean
  psbId: number
  psbListCode: string
  customerId: number | null
  customerCode: string | null
  subscriptionId: number | null
  serviceNo: string | null
  workOrderId: number | null
  workOrderNo: string | null
  status: string
}

type ActivateFailureResponse = {
  success: false
  error: ActivateErrorCode | 'UNAUTHORIZED' | 'FORBIDDEN' | 'DB_UNAVAILABLE' | 'INVALID_ID' | 'INTERNAL'
  message: string
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json(
      {
        success: false,
        error: 'UNAUTHORIZED' as const,
        message: 'Sesi autentikasi tidak ditemukan. Silakan login kembali.',
      } satisfies ActivateFailureResponse,
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
      } satisfies ActivateFailureResponse,
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const psbListId = resolvePositiveInt(String(resolvedParams.id ?? ''))
    if (!psbListId) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_ID' as const,
          message: 'ID Data PSB tidak valid.',
        } satisfies ActivateFailureResponse,
        { status: 400 },
      )
    }

    const sessionRole = (session.role ?? 'PUBLIC') as AppRole
    const hasApprovePermission =
      canApprovePsbList(sessionRole) &&
      (canPerformAction(sessionRole, 'sales', 'approve') || canPerformAction(sessionRole, 'customers', 'approve'))

    if (!hasApprovePermission) {
      return Response.json(
        {
          success: false,
          error: 'FORBIDDEN' as const,
          message: 'Role aktif belum memiliki izin aktivasi Data PSB (memerlukan izin approve sales / customers).',
        } satisfies ActivateFailureResponse,
        { status: 403 },
      )
    }

    const userId = session.userId ? Number(session.userId) : null
    const result = await activatePsbFlow({
      psbListId,
      actor: {
        userId: Number.isInteger(userId) && userId! > 0 ? userId : null,
        username: String(session.username ?? 'unknown'),
        displayName: String(session.displayName ?? String(session.username ?? 'Unknown User')),
        role: sessionRole,
        branchId: session.branchId ? Number(session.branchId) : null,
      },
    })

    if (result.idempotent) {
      return Response.json(
        {
          success: true,
          idempotent: true,
          psbId: result.psbId,
          psbListCode: result.psbListCode,
          customerId: result.customerId,
          customerCode: result.customerCode,
          subscriptionId: result.subscriptionId,
          serviceNo: result.serviceNo,
          workOrderId: result.workOrderId,
          workOrderNo: result.workOrderNo,
          status: String(result.status ?? 'DITRANSFER_KE_TICKETING'),
        } satisfies ActivateSuccessResponse,
        { status: 200 },
      )
    }

    return Response.json(
      {
        success: true,
        idempotent: false,
        psbId: result.psbId,
        psbListCode: result.psbListCode,
        customerId: result.customerId,
        customerCode: result.customerCode,
        subscriptionId: result.subscriptionId,
        serviceNo: result.serviceNo,
        workOrderId: result.workOrderId,
        workOrderNo: result.workOrderNo,
        status: String(result.status ?? 'DITRANSFER_KE_TICKETING'),
      } satisfies ActivateSuccessResponse,
      { status: 200 },
    )
  } catch (err) {
    if (err instanceof ActivateFlowError) {
      return Response.json(
        {
          success: false,
          error: err.code,
          message: err.message,
        } satisfies ActivateFailureResponse,
        { status: mapErrorToStatus(err.code) },
      )
    }

    return Response.json(
      {
        success: false,
        error: 'INTERNAL' as const,
        message: getReviewDbErrorDetail(err),
      } satisfies ActivateFailureResponse,
      { status: 500 },
    )
  }
}
