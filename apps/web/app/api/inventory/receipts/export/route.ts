import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type ReceiptRow = {
  transactionId: string | null
  movementDate: string | null
  itemCode: string
  itemName: string
  unitCode: string | null
  qty: number
  notes: string | null
}

function normalizeDateToSql(value: unknown) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseReceiptNotes(value: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return { storeName: '', description: '' }
  }

  const parts = raw
    .split(' - ')
    .map((item) => item.trim())
    .filter(Boolean)

  const filtered: string[] = []
  let storeName = ''

  for (const part of parts) {
    if (part.startsWith('[BARANG MASUK]')) {
      continue
    }
    if (part.startsWith('Supplier/Sumber:')) {
      storeName = part.replace('Supplier/Sumber:', '').trim()
      continue
    }
    if (filtered.length === 0 && part.includes('(') && part.includes(')')) {
      continue
    }
    filtered.push(part)
  }

  return { storeName, description: filtered.join(' - ') }
}

function escapeCsvCell(value: string) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'export')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Export barang masuk hanya aktif saat review DB benar-benar tersedia.' }, { status: 503 })
  }

  try {
    const url = new URL(request.url)
    const search = String(url.searchParams.get('search') ?? '').trim()
    const fromDate = normalizeDateToSql(url.searchParams.get('from'))
    const toDate = normalizeDateToSql(url.searchParams.get('to'))

    const filters: string[] = ["ism.movement_type = 'IN'"]
    const values: unknown[] = []

    if (fromDate) {
      filters.push('DATE(ism.movement_at) >= ?')
      values.push(fromDate)
    }
    if (toDate) {
      filters.push('DATE(ism.movement_at) <= ?')
      values.push(toDate)
    }
    if (search) {
      const like = `%${search}%`
      filters.push(
        `(UPPER(COALESCE(ism.reference_no, '')) LIKE UPPER(?) OR UPPER(ii.item_code) LIKE UPPER(?) OR UPPER(ii.item_name) LIKE UPPER(?) OR UPPER(COALESCE(ism.notes, '')) LIKE UPPER(?))`,
      )
      values.push(like, like, like, like)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const rows = await runReviewDbQuery<ReceiptRow>(
      `
        SELECT
          ism.reference_no AS transactionId,
          CAST(DATE(ism.movement_at) AS CHAR) AS movementDate,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          iu.code AS unitCode,
          ism.qty AS qty,
          ism.notes AS notes
        FROM inventory_stock_movements ism
        INNER JOIN inventory_items ii
          ON ii.id = ism.item_id
        LEFT JOIN inventory_units iu
          ON iu.id = ii.unit_id
        ${whereClause}
        ORDER BY ism.movement_at DESC, ism.id DESC
        LIMIT 5000
      `,
      values,
    )

    const header = [
      'ID Transaksi',
      'Tanggal',
      'Kode',
      'Nama Barang',
      'Nama Toko',
      'Satuan',
      'Jumlah',
      'Keterangan',
    ]
      .map(escapeCsvCell)
      .join(',')

    const lines = rows.map((row) => {
      const parsed = parseReceiptNotes(row.notes)
      return [
        escapeCsvCell(row.transactionId || ''),
        escapeCsvCell(row.movementDate || ''),
        escapeCsvCell(row.itemCode),
        escapeCsvCell(row.itemName),
        escapeCsvCell(parsed.storeName || ''),
        escapeCsvCell(row.unitCode || ''),
        escapeCsvCell(String(row.qty ?? 0)),
        escapeCsvCell(parsed.description || ''),
      ].join(',')
    })

    const csv = [header, ...lines].join('\n')
    const filename = `barang-masuk_${fromDate || 'all'}_to_${toDate || 'all'}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

