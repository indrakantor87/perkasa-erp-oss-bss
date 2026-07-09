import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  currentStock: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
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
      { message: 'Penerimaan barang hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      qty?: unknown
      referenceNo?: unknown
      supplierName?: unknown
      unitPrice?: unknown
      notes?: unknown
    }

    const itemCode = extractItemCode(String(payload.itemCode ?? '').trim())
    const qty = Number.parseInt(String(payload.qty ?? '0').trim() || '0', 10)
    const referenceNo = String(payload.referenceNo ?? '').trim()
    const supplierName = String(payload.supplierName ?? '').trim()
    const unitPrice = normalizePrice(payload.unitPrice)
    const notes = String(payload.notes ?? '').trim()

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty barang masuk harus lebih dari 0.' }, { status: 400 })
    }
    if (unitPrice === null || unitPrice < 0) {
      return Response.json({ message: 'Harga satuan barang masuk tidak valid.' }, { status: 400 })
    }

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
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

    const actor = `${session.displayName} (${session.username})`
    const noteSegments = ['[BARANG MASUK]', actor]
    if (supplierName) {
      noteSegments.push(`Supplier/Sumber: ${supplierName}`)
    }
    if (notes) {
      noteSegments.push(notes)
    }
    const noteText = noteSegments.join(' - ')

    await runReviewDbExecute<ExecuteResult>(
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
        VALUES (?, NULL, 'IN', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [item.id, referenceNo || null, qty, unitPrice, noteText],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE inventory_items
        SET
          current_stock = current_stock + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [qty, item.id],
    )

    return Response.json({
      message: `Barang masuk untuk ${item.itemCode} (${item.itemName}) berhasil dicatat.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
