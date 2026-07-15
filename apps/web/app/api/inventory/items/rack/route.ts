import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, invalidateReviewDbColumnCache, runReviewDbExecute } from '@/lib/review-db'

type UpdateResult = {
  affectedRows?: number
}

async function ensureInventoryRackColumns() {
  const [hasRackCode, hasRackBarcode] = await Promise.all([
    hasReviewDbColumn('inventory_items', 'rack_code'),
    hasReviewDbColumn('inventory_items', 'rack_barcode'),
  ])

  if (!hasRackCode) {
    await runReviewDbExecute(`
      ALTER TABLE inventory_items
      ADD COLUMN rack_code VARCHAR(120) NULL AFTER barcode
    `)
  }

  if (!hasRackBarcode) {
    await runReviewDbExecute(`
      ALTER TABLE inventory_items
      ADD COLUMN rack_barcode VARCHAR(160) NULL AFTER rack_code
    `)
  }

  if (!hasRackCode || !hasRackBarcode) {
    invalidateReviewDbColumnCache('inventory_items')
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Penataan rak hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      rackCode?: unknown
      rackBarcode?: unknown
    }

    const itemCode = String(payload.itemCode ?? '').trim().toUpperCase()
    const rackCode = String(payload.rackCode ?? '').trim().toUpperCase()
    const rackBarcodeRaw = String(payload.rackBarcode ?? '').trim().toUpperCase()
    const rackBarcode = rackBarcodeRaw || rackCode || null

    if (!itemCode) {
      return Response.json({ message: 'Item code wajib diisi.' }, { status: 400 })
    }

    await ensureInventoryRackColumns()
    const hasUpdatedAt = await hasReviewDbColumn('inventory_items', 'updated_at')

    const result = await runReviewDbExecute<UpdateResult>(
      `
        UPDATE inventory_items
        SET
          rack_code = ?,
          rack_barcode = ?${hasUpdatedAt ? ', updated_at = CURRENT_TIMESTAMP' : ''}
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [rackCode || null, rackBarcode, itemCode],
    )

    if (!result.affectedRows) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }

    return Response.json({
      message: `Rak untuk item ${itemCode} berhasil diperbarui${rackCode ? ` ke ${rackCode}` : ''}.`,
      rackCode: rackCode || null,
      rackBarcode,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

