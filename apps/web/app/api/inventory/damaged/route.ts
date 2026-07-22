import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureInventoryDamagedTable } from '@/lib/services/inventory-damaged-service'

type DamagedRow = {
  id: number
  damagedDate: string
  itemName: string
  qty: number
  purchasePrice: number
  sellingPrice: number
  notes: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function formatDateToSql(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeMoney(value: unknown) {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '').trim()
  const parsed = Number(raw || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Data barang rusak hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  try {
    await ensureInventoryDamagedTable()

    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(200, Number.parseInt(searchParams.get('limit') ?? '120', 10) || 120))

    const rows = await runReviewDbQuery<DamagedRow>(
      `
        SELECT
          id,
          CAST(damaged_date AS CHAR) AS damagedDate,
          item_name AS itemName,
          qty,
          purchase_price AS purchasePrice,
          selling_price AS sellingPrice,
          notes
        FROM inventory_damaged_items
        ORDER BY damaged_date DESC, id DESC
        LIMIT ${limit}
      `,
    )

    return Response.json({ items: rows })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
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
    return Response.json({ message: 'Data barang rusak hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  try {
    const payload = (await request.json()) as {
      damagedDate?: unknown
      itemName?: unknown
      qty?: unknown
      purchasePrice?: unknown
      sellingPrice?: unknown
      notes?: unknown
    }

    const damagedDate = formatDateToSql(String(payload.damagedDate ?? ''))
    const itemName = String(payload.itemName ?? '').trim()
    const qty = Number.parseInt(String(payload.qty ?? '1').trim() || '1', 10)
    const purchasePrice = normalizeMoney(payload.purchasePrice)
    const sellingPrice = normalizeMoney(payload.sellingPrice)
    const notes = String(payload.notes ?? '').trim()

    if (!damagedDate) {
      return Response.json({ message: 'Tanggal wajib diisi.' }, { status: 400 })
    }
    if (!itemName) {
      return Response.json({ message: 'Item barang wajib diisi.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Jumlah barang harus lebih dari 0.' }, { status: 400 })
    }

    await ensureInventoryDamagedTable()

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO inventory_damaged_items (
          damaged_date,
          item_name,
          qty,
          purchase_price,
          selling_price,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [damagedDate, itemName, qty, purchasePrice, sellingPrice, notes || null],
    )

    return Response.json({ message: 'Barang rusak berhasil disimpan.' })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

