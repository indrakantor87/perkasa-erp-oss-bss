import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import { ensureInventoryRequestTable } from '@/lib/services/inventory-request-service'
import type { AppRole } from '@/lib/types'

const allowedStatuses = new Set(['ON_PROGRESS', 'COMPLETED', 'PENDING'])

type RequestRow = {
  id: number
  requestCode: string
  requestQty: number
  requestStatus: string
  inventoryItemId: number
  itemCode: string
  itemName: string
  currentStock: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function extractRequestId(value: string) {
  return Number.parseInt(value.split('|')[0]?.trim() ?? '', 10)
}

function canProcessInventoryRequest(role: AppRole) {
  if (role === 'FIELD_TECHNICIAN') {
    return false
  }

  return canPerformAction(role, 'inventory', 'approve') || canPerformAction(role, 'inventory', 'update')
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canProcessInventoryRequest(session.role)) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Status request inventory hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      requestId?: unknown
      nextStatus?: unknown
      pendingReason?: unknown
      processNotes?: unknown
    }

    const requestId = extractRequestId(String(payload.requestId ?? '').trim())
    const nextStatus = String(payload.nextStatus ?? '').trim().toUpperCase()
    const pendingReason = String(payload.pendingReason ?? '').trim()
    const processNotes = String(payload.processNotes ?? '').trim()

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return Response.json({ message: 'Request inventory tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(nextStatus)) {
      return Response.json({ message: 'Status request inventory tidak valid.' }, { status: 400 })
    }
    if (nextStatus === 'PENDING' && !pendingReason) {
      return Response.json({ message: 'Alasan pending wajib diisi.' }, { status: 400 })
    }

    await ensureInventoryRequestTable()

    const [requestRow] = await runReviewDbQuery<RequestRow>(
      `
        SELECT
          iir.id,
          iir.request_code AS requestCode,
          iir.request_qty AS requestQty,
          iir.request_status AS requestStatus,
          iir.inventory_item_id AS inventoryItemId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ii.current_stock AS currentStock
        FROM inventory_item_requests iir
        JOIN inventory_items ii
          ON ii.id = iir.inventory_item_id
        WHERE iir.id = ?
        LIMIT 1
      `,
      [requestId],
    )
    if (!requestRow) {
      return Response.json({ message: 'Request inventory tidak ditemukan.' }, { status: 404 })
    }

    const currentStatus = String(requestRow.requestStatus ?? '').trim().toUpperCase()
    if (currentStatus === 'COMPLETED') {
      return Response.json({ message: 'Request inventory ini sudah selesai diproses.' }, { status: 409 })
    }

    const actor = `${session.displayName} (${session.username})`
    const noteText = processNotes ? `[${nextStatus}] ${actor} - ${processNotes}` : `[${nextStatus}] ${actor}`

    await runReviewDbTransaction(async (connection) => {
      if (nextStatus === 'COMPLETED') {
        if (requestRow.currentStock < requestRow.requestQty) {
          throw new Error('Stok item tidak cukup untuk menyelesaikan request ini.')
        }

        await connection.query(
          `
            INSERT INTO inventory_stock_movements (
              item_id,
              work_order_id,
              movement_type,
              reference_no,
              qty,
              unit_price,
              notes,
              movement_at
            )
            VALUES (?, NULL, 'OUT', ?, ?, 0, ?, CURRENT_TIMESTAMP)
          `,
          [requestRow.inventoryItemId, requestRow.requestCode, requestRow.requestQty, noteText],
        )

        await connection.query(
          `
            UPDATE inventory_items
            SET
              current_stock = current_stock - ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [requestRow.requestQty, requestRow.inventoryItemId],
        )
      }

      await connection.query(
        `
          UPDATE inventory_item_requests
          SET
            request_status = ?,
            pending_reason = ?,
            request_notes = CASE
              WHEN request_notes IS NULL OR TRIM(request_notes) = '' THEN ?
              ELSE CONCAT(request_notes, '\n', ?)
            END,
            processed_by = ?,
            processed_at = CURRENT_TIMESTAMP,
            completed_at = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          nextStatus,
          nextStatus === 'PENDING' ? pendingReason : null,
          noteText,
          noteText,
          actor,
          nextStatus,
          requestRow.id,
        ],
      )
    })

    return Response.json({
      message: `Request ${requestRow.requestCode} untuk ${requestRow.itemCode} (${requestRow.itemName}) berhasil diubah ke ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
