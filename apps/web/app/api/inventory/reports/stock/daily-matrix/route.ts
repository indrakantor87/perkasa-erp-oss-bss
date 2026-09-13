import { NextResponse } from 'next/server'
import { runReviewDbQuery } from '@/lib/review-db'

export const dynamic = 'force-dynamic'

type DailyMatrixDbRow = {
  itemCode: string
  itemName: string
  categoryCode: string
  unitCode: string | null
  movementDate: string
  movementType: string
  qty: number
  currentStock: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const monthRaw = searchParams.get('month')
    const yearRaw = searchParams.get('year')

    const today = new Date()
    const month = monthRaw ? Number(monthRaw) : today.getMonth() + 1
    const year = yearRaw ? Number(yearRaw) : today.getFullYear()

    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ message: 'Parameter bulan tidak valid.' }, { status: 400 })
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ message: 'Parameter tahun tidak valid.' }, { status: 400 })
    }

    const lastDay = new Date(year, month, 0).getDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`

    const rows = await runReviewDbQuery<DailyMatrixDbRow>(
      `
      SELECT
        ii.item_code AS itemCode,
        ii.item_name AS itemName,
        ii.category_code AS categoryCode,
        ii.unit_code AS unitCode,
        DATE(ism.movement_at) AS movementDate,
        ism.movement_type AS movementType,
        ism.qty AS qty,
        ii.current_stock AS currentStock
      FROM inventory_items ii
      LEFT JOIN inventory_stock_movements ism
        ON ism.item_id = ii.id
        AND ism.movement_at BETWEEN ? AND ?
      WHERE ii.status = 'ACTIVE'
      ORDER BY ii.category_code, ii.item_code, ism.movement_at
      `,
      [startDate, endDate],
    )

    type AggregatedItem = {
      itemCode: string
      itemName: string
      categoryCode: string
      unitCode: string
      dailyByDate: Record<string, { masuk: number; keluar: number }>
      totalMasuk: number
      totalKeluar: number
      stokAkhir: number
    }

    const itemMap = new Map<string, AggregatedItem>()

    for (const row of rows) {
      const key = row.itemCode
      let item = itemMap.get(key)
      if (!item) {
        item = {
          itemCode: row.itemCode,
          itemName: row.itemName,
          categoryCode: row.categoryCode,
          unitCode: row.unitCode ?? 'pcs',
          dailyByDate: {},
          totalMasuk: 0,
          totalKeluar: 0,
          stokAkhir: Number(row.currentStock ?? 0),
        }
        itemMap.set(key, item)
      }

      if (!row.movementDate || !row.movementType) continue
      const dateKey = row.movementDate.slice(8, 10)
      if (!item.dailyByDate[dateKey]) {
        item.dailyByDate[dateKey] = { masuk: 0, keluar: 0 }
      }
      const bucket = item.dailyByDate[dateKey]
      const normalizedType = (row.movementType || '').toUpperCase()
      const qtyAbs = Math.abs(Number(row.qty ?? 0))
      const isIncoming =
        normalizedType === 'RECEIPT' ||
        normalizedType === 'IN' ||
        normalizedType === 'RETURN' ||
        normalizedType === 'ADJUSTMENT_IN'
      const isOutgoing =
        normalizedType === 'ISSUANCE' ||
        normalizedType === 'OUT' ||
        normalizedType === 'USAGE' ||
        normalizedType === 'DAMAGED' ||
        normalizedType === 'ADJUSTMENT_OUT' ||
        normalizedType === 'TRANSFER_OUT'
      if (isIncoming) {
        bucket.masuk += qtyAbs
        item.totalMasuk += qtyAbs
      } else if (isOutgoing) {
        bucket.keluar += qtyAbs
        item.totalKeluar += qtyAbs
      }
    }

    const items = Array.from(itemMap.values())
    const dateHeaders: number[] = []
    for (let d = 1; d <= lastDay; d += 1) dateHeaders.push(d)

    return NextResponse.json({
      month,
      year,
      lastDay,
      dateHeaders,
      items,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat matrix rekap harian.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
