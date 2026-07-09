import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  INVENTORY_REQUEST_DIVISION,
  isValidInventoryRequestSubdivision,
} from '@/lib/inventory-request-org'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
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
      requestNotes?: unknown
    }

    const itemCode = extractItemCode(String(payload.itemCode ?? '').trim())
    const qty = Number.parseInt(String(payload.qty ?? '1').trim() || '1', 10)
    const requestedSubdivision = String(payload.requestedSubdivision ?? '').trim()
    const requestedFor = String(payload.requestedFor ?? '').trim()
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

    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO inventory_item_requests (
          request_code,
          inventory_item_id,
          request_qty,
          request_status,
          requested_division,
          requested_subdivision,
          requested_for,
          request_notes,
          pending_reason,
          requested_by,
          processed_by,
          requested_at,
          processed_at,
          completed_at
        )
        VALUES (?, ?, ?, 'REQUEST', ?, ?, ?, ?, NULL, ?, NULL, CURRENT_TIMESTAMP, NULL, NULL)
      `,
      [
        requestCode,
        item.id,
        qty,
        INVENTORY_REQUEST_DIVISION,
        requestedSubdivision,
        requestedFor || null,
        requestNotes || null,
        requestedBy,
      ],
    )

    return Response.json({
      message: `Request ${requestCode} untuk ${item.itemCode} (${item.itemName}) berhasil dibuat untuk ${requestedSubdivision}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
