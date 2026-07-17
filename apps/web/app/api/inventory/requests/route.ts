import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  INVENTORY_REQUEST_DIVISION,
  isValidInventoryRequestSubdivision,
} from '@/lib/inventory-request-org'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { resolveReviewAuthUserIdByUsername } from '@/lib/services/field-ops-service'
import {
  ensureInventoryRequestTable,
  generateInventoryRequestCode,
} from '@/lib/services/inventory-request-service'
import type { AppRole } from '@/lib/types'

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  currentStock: number
  status: string
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function canCreateInventoryRequest(role: AppRole) {
  return role === 'FIELD_TECHNICIAN' || canPerformAction(role, 'inventory', 'create')
}

function resolveOptionalPositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canCreateInventoryRequest(session.role)) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Request inventory hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      qty?: unknown
      requestedSubdivision?: unknown
      requestedFor?: unknown
      requestType?: unknown
      workOrderId?: unknown
      troubleTicketId?: unknown
      requestNotes?: unknown
    }

    const itemCode = extractItemCode(String(payload.itemCode ?? '').trim())
    const qty = Number.parseInt(String(payload.qty ?? '1').trim() || '1', 10)
    const requestedSubdivision = String(payload.requestedSubdivision ?? '').trim()
    const requestedFor = String(payload.requestedFor ?? '').trim()
    const requestType = String(payload.requestType ?? 'MANUAL').trim().toUpperCase() || 'MANUAL'
    const workOrderId = resolveOptionalPositiveInt(payload.workOrderId)
    const troubleTicketId = resolveOptionalPositiveInt(payload.troubleTicketId)
    const requestNotes = String(payload.requestNotes ?? '').trim()

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty request harus lebih dari 0.' }, { status: 400 })
    }
    if (!isValidInventoryRequestSubdivision(requestedSubdivision)) {
      return Response.json({ message: 'Sub-divisi teknisi wajib dipilih.' }, { status: 400 })
    }

    await ensureInventoryRequestTable()
    const [
      hasWorkOrderId,
      hasTroubleTicketId,
      hasRequestedByUserId,
      hasProcessedByUserId,
      hasRequestType,
    ] = await Promise.all([
      hasReviewDbColumn('inventory_item_requests', 'work_order_id'),
      hasReviewDbColumn('inventory_item_requests', 'trouble_ticket_id'),
      hasReviewDbColumn('inventory_item_requests', 'requested_by_user_id'),
      hasReviewDbColumn('inventory_item_requests', 'processed_by_user_id'),
      hasReviewDbColumn('inventory_item_requests', 'request_type'),
    ])

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          current_stock AS currentStock,
          status
        FROM inventory_items
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [itemCode],
    )
    if (!item) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (String(item.status).trim().toUpperCase() !== 'ACTIVE') {
      return Response.json({ message: 'Hanya item inventory aktif yang bisa direquest.' }, { status: 409 })
    }

    const requestCode = await generateInventoryRequestCode()
    const requestedBy = `${session.displayName} (${session.username})`
    const requestedByUserId = await resolveReviewAuthUserIdByUsername(session.username)
    const columns = [
      'request_code',
      'inventory_item_id',
      'request_qty',
      'request_status',
    ]
    const values: unknown[] = [requestCode, item.id, qty, 'REQUEST']

    if (hasRequestType) {
      columns.push('request_type')
      values.push(requestType)
    }
    if (hasWorkOrderId) {
      columns.push('work_order_id')
      values.push(workOrderId)
    }
    if (hasTroubleTicketId) {
      columns.push('trouble_ticket_id')
      values.push(troubleTicketId)
    }
    if (hasRequestedByUserId) {
      columns.push('requested_by_user_id')
      values.push(requestedByUserId)
    }
    if (hasProcessedByUserId) {
      columns.push('processed_by_user_id')
      values.push(null)
    }

    columns.push(
      'requested_division',
      'requested_subdivision',
      'requested_for',
      'request_notes',
      'pending_reason',
      'requested_by',
      'processed_by',
      'requested_at',
      'processed_at',
      'completed_at',
    )
    values.push(
      INVENTORY_REQUEST_DIVISION,
      requestedSubdivision,
      requestedFor || null,
      requestNotes || null,
      null,
      requestedBy,
      null,
      new Date(),
      null,
      null,
    )

    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO inventory_item_requests (
          ${columns.join(',\n          ')}
        )
        VALUES (${columns.map(() => '?').join(', ')})
      `,
      values,
    )

    return Response.json({
      message: `Request ${requestCode} untuk ${item.itemCode} (${item.itemName}) berhasil dibuat untuk ${requestedSubdivision}${workOrderId ? ` pada WO #${workOrderId}` : troubleTicketId ? ` pada TT #${troubleTicketId}` : ''}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
