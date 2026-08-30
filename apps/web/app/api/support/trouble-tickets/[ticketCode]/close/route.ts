import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  TT_CLOSE_ERROR_CODES,
  TroubleTicketCloseError,
  closeTroubleTicketWithMaterials,
  REASSIGN_FULL_ACCESS_ROLES_SET,
  type TtCloseErrorCode,
} from '@/lib/services/field-ops-service'
import type { AppRole } from '@/lib/types'

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

function mapTtCloseErrorToStatus(code: TtCloseErrorCode): number {
  switch (code) {
    case TT_CLOSE_ERROR_CODES.TT_NOT_FOUND:
      return 404
    case TT_CLOSE_ERROR_CODES.TT_ALREADY_CLOSED:
    case TT_CLOSE_ERROR_CODES.TT_STATUS_INVALID:
      return 409
    case TT_CLOSE_ERROR_CODES.TT_NOT_AUTHORIZED:
      return 403
    case TT_CLOSE_ERROR_CODES.TT_MATERIAL_INVALID:
    case TT_CLOSE_ERROR_CODES.TT_INVENTORY_INSUFFICIENT:
    case TT_CLOSE_ERROR_CODES.TT_REQUEST_UPDATE_FAILED:
    case TT_CLOSE_ERROR_CODES.TT_MOVEMENT_INSERT_FAILED:
    case TT_CLOSE_ERROR_CODES.TT_STOCK_UPDATE_FAILED:
    case TT_CLOSE_ERROR_CODES.TT_UPDATE_FAILED:
    case TT_CLOSE_ERROR_CODES.TT_PROGRESS_INSERT_FAILED:
      return 422
    case TT_CLOSE_ERROR_CODES.DB_UNAVAILABLE:
      return 503
    case TT_CLOSE_ERROR_CODES.INTERNAL:
    default:
      return 500
  }
}

type TtCloseSuccessResponse = {
  success: true
  idempotent: boolean
  troubleTicketId: number
  troubleTicketCode: string
  status: 'CLOSED'
  closedBy: { userId: number | null; username: string; displayName: string }
  closedAt: string
  resolutionAction: string
  closeNotes: string
  materials: Array<{
    requestId: number
    requestCode: string | null
    inventoryItemId: number
    itemCode: string | null
    qty: number
    beforeStock: number
    afterStock: number
    movementId: number | null
  }>
  movementIds: number[]
  progressLogInserted: boolean
}

type TtCloseFailureResponse = {
  success: false
  error: TtCloseErrorCode | 'UNAUTHORIZED' | 'FORBIDDEN' | 'DB_UNAVAILABLE' | 'INVALID_INPUT' | 'INTERNAL'
  message: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketCode: string }> },
): Promise<Response> {
  const session = await getSession()
  if (!session) {
    return Response.json(
      {
        success: false,
        error: 'UNAUTHORIZED' as const,
        message: 'Sesi autentikasi tidak ditemukan. Silakan login kembali.',
      } satisfies TtCloseFailureResponse,
      { status: 401 },
    )
  }

  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  const canUpdateSupport = canPerformAction(sessionRole, 'support', 'update')
  const canCreateInventory = canPerformAction(sessionRole, 'inventory', 'create')
  const canManageInventory = canPerformAction(sessionRole, 'inventory', 'manage')
  const hasFullAccess = REASSIGN_FULL_ACCESS_ROLES_SET.has(sessionRole)
  if (!(canUpdateSupport && (canCreateInventory || canManageInventory || hasFullAccess))) {
    return Response.json(
      {
        success: false,
        error: 'FORBIDDEN' as const,
        message:
          'Forbidden: memerlukan izin support.update ditambah inventory.create/manage, atau akses operator penuh.',
      } satisfies TtCloseFailureResponse,
      { status: 403 },
    )
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      {
        success: false,
        error: 'DB_UNAVAILABLE' as const,
        message: 'Close flow trouble ticket hanya aktif saat review DB benar-benar tersedia.',
      } satisfies TtCloseFailureResponse,
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const ticketCode = decodeURIComponent(resolvedParams.ticketCode ?? '').trim().toUpperCase()
    if (!ticketCode) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_INPUT' as const,
          message: 'Kode ticket wajib diisi.',
        } satisfies TtCloseFailureResponse,
        { status: 400 },
      )
    }

    const payload = (await request.json().catch(() => null)) as {
      resolutionAction?: unknown
      closeNotes?: unknown
    } | null
    const resolutionAction = normalizeRequiredText(payload?.resolutionAction).toUpperCase()
    const closeNotes = normalizeRequiredText(payload?.closeNotes)

    if (!resolutionAction) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_INPUT' as const,
          message: 'Tindakan penyelesaian wajib diisi.',
        } satisfies TtCloseFailureResponse,
        { status: 400 },
      )
    }
    if (!closeNotes) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_INPUT' as const,
          message: 'Catatan penutupan wajib diisi.',
        } satisfies TtCloseFailureResponse,
        { status: 400 },
      )
    }

    const userId = session.userId ? Number(session.userId) : null
    const result = await closeTroubleTicketWithMaterials({
      ticketCode,
      resolutionAction,
      closeNotes,
      actor: {
        userId: Number.isInteger(userId) && (userId as number) > 0 ? (userId as number) : null,
        username: String(session.username ?? 'unknown'),
        displayName: String(session.displayName ?? session.username ?? 'Unknown User'),
        role: sessionRole,
        branchId: session.branchId ? Number(session.branchId) : null,
      },
    })

    return Response.json(
      {
        success: true,
        idempotent: result.idempotent,
        troubleTicketId: result.troubleTicketId,
        troubleTicketCode: result.troubleTicketCode,
        status: 'CLOSED',
        closedBy: result.closedBy,
        closedAt: result.closedAt,
        resolutionAction: result.resolutionAction,
        closeNotes: result.closeNotes,
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
        progressLogInserted: result.progressLogInserted,
      } satisfies TtCloseSuccessResponse,
      { status: 200 },
    )
  } catch (err) {
    if (err instanceof TroubleTicketCloseError) {
      return Response.json(
        {
          success: false,
          error: err.code,
          message: err.message ?? err.code,
        } satisfies TtCloseFailureResponse,
        { status: mapTtCloseErrorToStatus(err.code) },
      )
    }

    return Response.json(
      {
        success: false,
        error: 'INTERNAL' as const,
        message: 'Terjadi kesalahan internal saat menutup trouble ticket.',
      } satisfies TtCloseFailureResponse,
      { status: 500 },
    )
  }
}
