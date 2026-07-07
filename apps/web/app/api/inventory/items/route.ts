import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['ACTIVE', 'INACTIVE'])

type CategoryRow = {
  id: number
  code: string
}

type UnitRow = {
  id: number
  code: string
}

type ItemCodeRow = {
  itemCode: string | null
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

async function generateItemCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `INV-${year}${month}-%`
  const rows = await runReviewDbQuery<ItemCodeRow>(
    `
      SELECT item_code AS itemCode
      FROM inventory_items
      WHERE item_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.itemCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `INV-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
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
      { message: 'Write action inventory hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      categoryCode?: unknown
      unitCode?: unknown
      itemName?: unknown
      barcode?: unknown
      defaultPrice?: unknown
      minimumStock?: unknown
      currentStock?: unknown
      status?: unknown
    }

    const categoryCode = String(payload.categoryCode ?? '').trim()
    const unitCode = String(payload.unitCode ?? '').trim()
    const itemName = String(payload.itemName ?? '').trim()
    const barcode = String(payload.barcode ?? '').trim()
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

    const itemCode = await generateItemCode()
    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO inventory_items (
          category_id,
          unit_id,
          item_code,
          item_name,
          barcode,
          default_price,
          minimum_stock,
          current_stock,
          photo_path,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
      `,
      [
        category.id,
        unit.id,
        itemCode,
        itemName,
        barcode || null,
        defaultPrice,
        minimumStock,
        currentStock,
        status,
      ],
    )

    return Response.json({
      message: `Item inventory ${itemCode} untuk ${itemName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
