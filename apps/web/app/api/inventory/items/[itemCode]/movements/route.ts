import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

export type ItemMovementRow = {
  movementId: number
  movementType: string
  referenceNo: string | null
  referenceType: string | null
  qty: number
  unitPrice: number
  movementAt: string
  itemId: number
  itemCode: string
  itemName: string
  unitCode: string | null
  notes: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  requestId: number | null
}

function resolveOptionalPositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
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

export async function GET(request: Request, { params }: { params: Promise<{ itemCode: string }> }) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Riwayat stok hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const resolvedParams = await params
    const itemCode = decodeURIComponent(String(resolvedParams.itemCode ?? '')).trim()
    if (!itemCode) {
      return Response.json({ message: 'Kode item tidak valid.' }, { status: 400 })
    }

    const url = new URL(request.url)
    const limitRaw = Number.parseInt(String(url.searchParams.get('limit') ?? '500').trim() || '500', 10)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 2000)) : 500
    const fromDate = normalizeDateToSql(url.searchParams.get('from'))
    const toDate = normalizeDateToSql(url.searchParams.get('to'))
    const orderRaw = String(url.searchParams.get('order') ?? 'ASC').trim().toUpperCase()
    const orderDir = orderRaw === 'DESC' ? 'DESC' : 'ASC'

    const [hasWorkOrderId, hasTroubleTicketId, hasRequestId, hasReferenceType] = await Promise.all([
      hasReviewDbColumn('inventory_stock_movements', 'work_order_id'),
      hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id'),
      hasReviewDbColumn('inventory_stock_movements', 'request_id'),
      hasReviewDbColumn('inventory_stock_movements', 'reference_type'),
    ])

    const filters: string[] = ['UPPER(ii.item_code) = UPPER(?)']
    const values: unknown[] = [itemCode]

    if (fromDate) {
      filters.push('DATE(ism.movement_at) >= ?')
      values.push(fromDate)
    }
    if (toDate) {
      filters.push('DATE(ism.movement_at) <= ?')
      values.push(toDate)
    }
    const whereClause = `WHERE ${filters.join(' AND ')}`

    values.push(limit)
    const rows = await runReviewDbQuery<ItemMovementRow>(
      `
        SELECT
          ism.id AS movementId,
          ism.movement_type AS movementType,
          ism.reference_no AS referenceNo,
          ${hasReferenceType ? 'ism.reference_type' : 'NULL'} AS referenceType,
          ism.qty AS qty,
          COALESCE(ism.unit_price, 0) AS unitPrice,
          CAST(ism.movement_at AS CHAR) AS movementAt,
          ism.item_id AS itemId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          iu.code AS unitCode,
          ism.notes AS notes,
          ${hasWorkOrderId ? 'ism.work_order_id' : 'NULL'} AS workOrderId,
          ${hasTroubleTicketId ? 'ism.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
          ${hasRequestId ? 'ism.request_id' : 'NULL'} AS requestId
        FROM inventory_stock_movements ism
        INNER JOIN inventory_items ii
          ON ii.id = ism.item_id
        LEFT JOIN inventory_units iu
          ON iu.id = ii.unit_id
        ${whereClause}
        ORDER BY DATE(ism.movement_at) ${orderDir}, ism.id ${orderDir}
        LIMIT ?
      `,
      values,
    )

    const items = rows.map((row) => ({
      movementId: Number(row.movementId ?? 0),
      movementType: String(row.movementType ?? '').trim().toUpperCase() || 'MANUAL',
      referenceNo: row.referenceNo ? String(row.referenceNo).trim() : null,
      referenceType: row.referenceType ? String(row.referenceType).trim() : null,
      qty: Number(row.qty ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      movementAt: row.movementAt ? String(row.movementAt).trim() : '',
      itemId: Number(row.itemId ?? 0),
      itemCode: String(row.itemCode ?? ''),
      itemName: String(row.itemName ?? ''),
      unitCode: row.unitCode ? String(row.unitCode).trim() : null,
      notes: row.notes ? String(row.notes).trim() : null,
      workOrderId: row.workOrderId ? Number(row.workOrderId) : null,
      troubleTicketId: row.troubleTicketId ? Number(row.troubleTicketId) : null,
      requestId: row.requestId ? Number(row.requestId) : null,
    }))

    return Response.json({ items, total: items.length })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
