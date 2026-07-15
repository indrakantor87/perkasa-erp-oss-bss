import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedMovementTypes = new Set(['IN', 'OUT', 'ADJUSTMENT'])

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  rackCode: string | null
  rackBarcode: string | null
  currentStock: number
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveNextStock(currentStock: number, qty: number, movementType: string) {
  if (movementType === 'IN') return currentStock + qty
  if (movementType === 'OUT') return currentStock - qty
  return qty
}

function requiresInventoryPickupScan(role: string) {
  return !['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(String(role).trim().toUpperCase())
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action stock movement hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      movementType?: unknown
      referenceNo?: unknown
      qty?: unknown
      unitPrice?: unknown
      notes?: unknown
      scannedRackBarcode?: unknown
    }

    const itemCode = String(payload.itemCode ?? '').trim()
    const movementType = String(payload.movementType ?? '').trim().toUpperCase()
    const referenceNo = String(payload.referenceNo ?? '').trim()
    const qty = Number.parseInt(String(payload.qty ?? '0').trim() || '0', 10)
    const unitPrice = normalizePrice(payload.unitPrice)
    const notes = String(payload.notes ?? '').trim()
    const scannedRackBarcode = String(payload.scannedRackBarcode ?? '').trim().toUpperCase()

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!allowedMovementTypes.has(movementType)) {
      return Response.json({ message: 'Tipe movement tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty movement tidak valid.' }, { status: 400 })
    }
    if (unitPrice === null || unitPrice < 0) {
      return Response.json({ message: 'Harga satuan tidak valid.' }, { status: 400 })
    }

    const [hasRackCode, hasRackBarcode] = await Promise.all([
      hasReviewDbColumn('inventory_items', 'rack_code'),
      hasReviewDbColumn('inventory_items', 'rack_barcode'),
    ])

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          ${hasRackCode ? 'rack_code' : 'NULL'} AS rackCode,
          ${hasRackBarcode ? 'rack_barcode' : 'NULL'} AS rackBarcode,
          current_stock AS currentStock
        FROM inventory_items
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [itemCode],
    )
    if (!item) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (movementType === 'OUT' && requiresInventoryPickupScan(session.role)) {
      if (!scannedRackBarcode) {
        return Response.json(
          { message: 'Scan barcode rak wajib dilakukan sebelum movement OUT disimpan.' },
          { status: 400 },
        )
      }
      const expectedRackBarcode = String(item.rackBarcode || item.rackCode || '').trim().toUpperCase()
      if (!expectedRackBarcode) {
        return Response.json(
          { message: `Item ${item.itemCode} belum memiliki barcode rak. Lengkapi dulu data rak di item inventory.` },
          { status: 400 },
        )
      }
      if (scannedRackBarcode !== expectedRackBarcode) {
        return Response.json(
          {
            message: `Barcode rak tidak cocok. Form memilih ${item.itemCode} di rak ${item.rackCode || '-'}, tetapi barcode yang terbaca ${scannedRackBarcode}.`,
          },
          { status: 400 },
        )
      }
    }

    const nextStock = resolveNextStock(item.currentStock, qty, movementType)
    if (movementType === 'OUT' && nextStock < 0) {
      return Response.json({ message: 'Stok tidak cukup untuk movement OUT.' }, { status: 400 })
    }
    if (movementType === 'ADJUSTMENT' && qty < 0) {
      return Response.json({ message: 'Qty adjustment tidak valid.' }, { status: 400 })
    }

    const noteText = `[Review Movement] ${session.displayName} (${session.username})${
      notes ? ` - ${notes}` : ''
    }`

    await runReviewDbExecute<InsertResult>(
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
        VALUES (?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [item.id, movementType, referenceNo || null, qty, unitPrice, noteText],
    )

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE inventory_items
        SET
          current_stock = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextStock, item.id],
    )

    return Response.json({
      message: `Stock movement ${movementType} untuk ${item.itemCode} (${item.itemName}) berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
