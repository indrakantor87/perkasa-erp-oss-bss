import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureInventoryAssetTable } from '@/lib/services/inventory-asset-service'

type AssetRow = {
  id: number
  assetType: string
  assetName: string
  qty: number
  purchasePrice: number
  notes: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function normalizeMoney(value: unknown) {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '').trim()
  const parsed = Number(raw || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeAssetType(value: unknown) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  if (!normalized) return ''
  if (['ELEKTRONIK', 'ELECTRONIC'].includes(normalized)) return 'ELEKTRONIK'
  if (['OPERASIONAL', 'OPERATIONAL'].includes(normalized)) return 'OPERASIONAL'
  if (['PERLENGKAPAN_TEKNISI', 'TECHNICIAN_GEAR', 'PERLENGKAPAN', 'TEKNISI'].includes(normalized)) return 'PERLENGKAPAN_TEKNISI'
  return normalized
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
    return Response.json({ message: 'Total asset hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  try {
    await ensureInventoryAssetTable()

    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(300, Number.parseInt(searchParams.get('limit') ?? '200', 10) || 200))

    const rows = await runReviewDbQuery<AssetRow>(
      `
        SELECT
          id,
          asset_type AS assetType,
          asset_name AS assetName,
          qty,
          purchase_price AS purchasePrice,
          notes
        FROM inventory_assets
        ORDER BY asset_type ASC, asset_name ASC, id DESC
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
    return Response.json({ message: 'Total asset hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  try {
    const payload = (await request.json()) as {
      assetType?: unknown
      assetName?: unknown
      qty?: unknown
      purchasePrice?: unknown
      notes?: unknown
    }

    const assetType = normalizeAssetType(payload.assetType)
    const assetName = String(payload.assetName ?? '').trim()
    const qty = Number.parseInt(String(payload.qty ?? '1').trim() || '1', 10)
    const purchasePrice = normalizeMoney(payload.purchasePrice)
    const notes = String(payload.notes ?? '').trim()

    if (!assetType) {
      return Response.json({ message: 'Jenis asset wajib dipilih.' }, { status: 400 })
    }
    if (!assetName) {
      return Response.json({ message: 'Nama asset wajib diisi.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Jumlah asset harus lebih dari 0.' }, { status: 400 })
    }

    await ensureInventoryAssetTable()

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO inventory_assets (
          asset_type,
          asset_name,
          qty,
          purchase_price,
          notes
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [assetType, assetName, qty, purchasePrice, notes || null],
    )

    return Response.json({ message: 'Asset berhasil disimpan.' })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

