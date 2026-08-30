import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  WO_COMPLETION_ERROR_CODES,
  type WorkOrderCompletionErrorCode,
  WorkOrderCompletionError,
  completeWorkOrderWithMaterials,
  resolveReviewAuthUserIdByUsername,
} from '@/lib/services/field-ops-service'

type CompletePayload = {
  reasonNotes?: unknown
  actorDisplayName?: unknown
}

function mapCompletionErrorCodeToHttpStatus(code: WorkOrderCompletionErrorCode): number {
  switch (code) {
    case WO_COMPLETION_ERROR_CODES.WO_NOT_FOUND:
      return 404
    case WO_COMPLETION_ERROR_CODES.WO_STATUS_INVALID:
    case WO_COMPLETION_ERROR_CODES.WO_ALREADY_CANCELLED:
      return 409
    case WO_COMPLETION_ERROR_CODES.WO_ALREADY_COMPLETED:
      return 409
    case WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_INSUFFICIENT:
    case WO_COMPLETION_ERROR_CODES.INVENTORY_ITEM_NOT_FOUND:
    case WO_COMPLETION_ERROR_CODES.REQUEST_UPDATE_FAILED:
    case WO_COMPLETION_ERROR_CODES.MATERIAL_DEBIT_FAILED:
      return 422
    case WO_COMPLETION_ERROR_CODES.WO_UPDATE_FAILED:
      return 409
    case WO_COMPLETION_ERROR_CODES.DB_UNAVAILABLE:
      return 503
    case WO_COMPLETION_ERROR_CODES.INTERNAL:
    default:
      return 500
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
  }

  const canUpdateSupport = canPerformAction(session.role, 'support', 'update')
  const canCreateInventory = canPerformAction(session.role, 'inventory', 'create')
  const canManageInventory = canPerformAction(session.role, 'inventory', 'manage')
  const hasFullAccess =
    session.role === 'OWNER' ||
    session.role === 'SUPER_ADMIN' ||
    session.role === 'ADMIN' ||
    session.role === 'NOC_OPERATOR' ||
    session.role === 'TT_OPERATOR'
  if (!(canUpdateSupport && (canCreateInventory || canManageInventory || hasFullAccess))) {
    return Response.json(
      { code: 'FORBIDDEN', message: 'Forbidden: tidak memiliki izin untuk menyelesaikan work order dengan material.' },
      { status: 403 },
    )
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      {
        code: WO_COMPLETION_ERROR_CODES.DB_UNAVAILABLE,
        message: 'Penyelesaian work order hanya aktif saat review DB benar-benar tersedia.',
      },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const workOrderId = Number.parseInt(String(resolvedParams.id ?? '').trim(), 10)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return Response.json(
        { code: 'BAD_REQUEST', message: 'ID work order tidak valid.' },
        { status: 400 },
      )
    }

    let payload: CompletePayload = {}
    try {
      payload = (await request.json()) as CompletePayload
    } catch {
      payload = {}
    }
    const reasonNotes =
      typeof payload.reasonNotes === 'string' && payload.reasonNotes.trim()
        ? payload.reasonNotes.trim()
        : null
    const actorDisplayName =
      typeof payload.actorDisplayName === 'string' && payload.actorDisplayName.trim()
        ? payload.actorDisplayName.trim()
        : session.displayName || session.username

    const actorUserId = await resolveReviewAuthUserIdByUsername(session.username)
    const result = await completeWorkOrderWithMaterials({
      workOrderId,
      actorUserId,
      actorUsername: session.username,
      reasonNotes,
    })

    const httpStatus = result.idempotent ? 200 : 200
    return Response.json(
      {
        success: true,
        idempotent: result.idempotent,
        workOrderId: result.workOrderId,
        workOrderNo: result.workOrderNo,
        status: result.status,
        closedBy: {
          userId: result.closedByUserId,
          username: session.username,
          displayName: actorDisplayName,
        },
        closedAt: result.closedAt,
        materials: result.materials.map((m) => ({
          requestId: m.requestId,
          requestCode: m.requestCode,
          inventoryItemId: m.inventoryItemId,
          itemCode: m.itemCode,
          qty: m.qty,
          beforeStock: m.beforeStock,
          afterStock: m.afterStock,
          movementId: m.movementId,
        })),
        movementIds: result.movementIds,
      },
      { status: httpStatus },
    )
  } catch (error) {
    if (error instanceof WorkOrderCompletionError) {
      return Response.json(
        {
          code: error.code,
          message: error.message,
          details: error.details ?? undefined,
        },
        { status: mapCompletionErrorCodeToHttpStatus(error.code) },
      )
    }
    return Response.json(
      {
        code: WO_COMPLETION_ERROR_CODES.INTERNAL,
        message: getReviewDbErrorDetail(error),
      },
      { status: 500 },
    )
  }
}
