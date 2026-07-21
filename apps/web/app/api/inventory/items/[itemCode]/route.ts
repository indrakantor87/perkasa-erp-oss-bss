import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, invalidateReviewDbColumnCache, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['ACTIVE', 'INACTIVE'])

type CategoryRow = {
  id: number
  code: string
}

type UnitRow = {
  id: number
  code: string
}

type InventoryItemRow = {
  itemCode: string
  itemName: string
  categoryCode: string | null
  unitCode: string | null
  barcode: string | null
  rackCode: string | null
  rackBarcode: string | null
  defaultPrice: number | null
  currentStock: number
  minimumStock: number
  status: string
}

type ExecuteResult = {
  affectedRows?: number
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
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

async function getInventoryItemByCode(itemCode: string) {
  const [hasRackCode, hasRackBarcode] = await Promise.all([
    hasReviewDbColumn('inventory_items', 'rack_code'),
    hasReviewDbColumn('inventory_items', 'rack_barcode'),
  ])

  const rows = await runReviewDbQuery<InventoryItemRow>(
    `
      SELECT
        ii.item_code AS itemCode,
        ii.item_name AS itemName,
        ic.code AS categoryCode,
        iu.code AS unitCode,
        ii.barcode AS barcode,
        ${hasRackCode ? 'ii.rack_code' : 'NULL'} AS rackCode,
        ${hasRackBarcode ? 'ii.rack_barcode' : 'NULL'} AS rackBarcode,
        ii.default_price AS defaultPrice,
        ii.current_stock AS currentStock,
        ii.minimum_stock AS minimumStock,
        ii.status AS status
      FROM inventory_items ii
      LEFT JOIN inventory_categories ic
        ON ic.id = ii.category_id
      LEFT JOIN inventory_units iu
        ON iu.id = ii.unit_id
      WHERE ii.item_code = ?
      LIMIT 1
    `,
    [itemCode],
  )

  return rows[0] ?? null
}

export async function PUT(request: Request, { params }: { params: Promise<{ itemCode: string }> }) {
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
      { message: 'Write action inventory hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const itemCode = decodeURIComponent(String(resolvedParams.itemCode ?? '')).trim()
    if (!itemCode) {
      return Response.json({ message: 'Kode item tidak valid.' }, { status: 400 })
    }

    const existing = await getInventoryItemByCode(itemCode)
    if (!existing) {
      return Response.json({ message: 'Item inventory tidak ditemukan.' }, { status: 404 })
    }

    const payload = (await request.json()) as {
      categoryCode?: unknown
      unitCode?: unknown
      itemName?: unknown
      barcode?: unknown
      rackCode?: unknown
      rackBarcode?: unknown
      defaultPrice?: unknown
      minimumStock?: unknown
      currentStock?: unknown
      status?: unknown
    }

    const categoryCode = String(payload.categoryCode ?? '').trim()
    const unitCode = String(payload.unitCode ?? '').trim()
    const itemName = String(payload.itemName ?? '').trim()
    const barcode = String(payload.barcode ?? '').trim()
    const rackCode = String(payload.rackCode ?? '').trim().toUpperCase()
    const rackBarcodeRaw = String(payload.rackBarcode ?? '').trim().toUpperCase()
    const rackBarcode = rackBarcodeRaw || rackCode || null
    const defaultPrice = normalizePrice(payload.defaultPrice)
    const minimumStock = Number.parseInt(String(payload.minimumStock ?? '0').trim() || '0', 10)
    const currentStock = Number.parseInt(String(payload.currentStock ?? '0').trim() || '0', 10)
    const status = String(payload.status ?? '').trim().toUpperCase()

    if (!categoryCode) {
      return Response.json({ message: 'Kategori item wajib diisi.' }, { status: 400 })
    }
    if (!unitCode) {
      return Response.json({ message: 'Satuan item wajib diisi.' }, { status: 400 })
    }
    if (!itemName) {
      return Response.json({ message: 'Nama item wajib diisi.' }, { status: 400 })
    }
    if (defaultPrice === null || defaultPrice < 0) {
      return Response.json({ message: 'Harga default tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(minimumStock) || minimumStock < 0) {
      return Response.json({ message: 'Minimum stock tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(currentStock) || currentStock < 0) {
      return Response.json({ message: 'Current stock tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status item tidak valid.' }, { status: 400 })
    }

    await ensureInventoryRackColumns()

    const [category] = await runReviewDbQuery<CategoryRow>(
      `
        SELECT id, code
        FROM inventory_categories
        WHERE UPPER(code) = UPPER(?)
        LIMIT 1
      `,
      [categoryCode],
    )
    if (!category) {
      return Response.json({ message: 'Kategori inventory tidak ditemukan di review DB.' }, { status: 404 })
    }

    const [unit] = await runReviewDbQuery<UnitRow>(
      `
        SELECT id, code
        FROM inventory_units
        WHERE UPPER(code) = UPPER(?)
        LIMIT 1
      `,
      [unitCode],
    )
    if (!unit) {
      return Response.json({ message: 'Satuan inventory tidak ditemukan di review DB.' }, { status: 404 })
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE inventory_items
        SET
          category_id = ?,
          unit_id = ?,
          item_name = ?,
          barcode = ?,
          rack_code = ?,
          rack_barcode = ?,
          default_price = ?,
          minimum_stock = ?,
          current_stock = ?,
          status = ?
        WHERE item_code = ?
        LIMIT 1
      `,
      [
        category.id,
        unit.id,
        itemName,
        barcode || null,
        rackCode || null,
        rackBarcode,
        defaultPrice,
        minimumStock,
        currentStock,
        status,
        itemCode,
      ],
    )

    const updated = await getInventoryItemByCode(itemCode)

    return Response.json({
      message: `Item inventory ${itemCode} berhasil diperbarui${status === 'INACTIVE' ? ' dan dinonaktifkan' : ''}.`,
      item: updated,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
