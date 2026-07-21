import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import type { DataSourceSnapshot } from '@/lib/types'

type InventoryStockRow = {
  itemCode: string | null
  itemName: string | null
  categoryCode: string | null
  unitCode: string | null
  currentStock: number | null
  minimumStock: number | null
  itemStatus: string | null
}

type InventoryMovementRow = {
  id: number
  itemCode: string | null
  itemName: string | null
  movementType: string | null
  referenceNo: string | null
  qty: number | null
  movementAt: string | null
  notes: string | null
}

export type InventoryStockReportItem = {
  itemCode: string
  itemName: string
  categoryCode: string
  unitCode: string
  currentStock: number
  minimumStock: number
  itemStatus: string
}

export type InventoryMovementReportItem = {
  id: number
  itemCode: string
  itemName: string
  movementType: string
  referenceNo: string
  qty: number
  movementAt: string
  notes: string
}

export type InventoryStockReportData = {
  source: DataSourceSnapshot
  items: InventoryStockReportItem[]
  warning: string | null
}

export type InventoryMovementReportData = {
  source: DataSourceSnapshot
  items: InventoryMovementReportItem[]
  warning: string | null
}

function normalizeStockRows(rows: InventoryStockRow[]) {
  return rows.map((row) => ({
    itemCode: String(row.itemCode ?? '-').trim() || '-',
    itemName: String(row.itemName ?? '-').trim() || '-',
    categoryCode: String(row.categoryCode ?? '-').trim() || '-',
    unitCode: String(row.unitCode ?? '-').trim() || '-',
    currentStock: Number(row.currentStock ?? 0),
    minimumStock: Number(row.minimumStock ?? 0),
    itemStatus: String(row.itemStatus ?? '-').trim() || '-',
  }))
}

function normalizeMovementRows(rows: InventoryMovementRow[]) {
  return rows.map((row) => ({
    id: Number(row.id),
    itemCode: String(row.itemCode ?? '-').trim() || '-',
    itemName: String(row.itemName ?? '-').trim() || '-',
    movementType: String(row.movementType ?? '-').trim() || '-',
    referenceNo: String(row.referenceNo ?? '-').trim() || '-',
    qty: Number(row.qty ?? 0),
    movementAt: String(row.movementAt ?? '-').trim() || '-',
    notes: String(row.notes ?? '-').trim() || '-',
  }))
}

export async function getInventoryStockReportData(): Promise<InventoryStockReportData> {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      source:
        source.isFallback
          ? getFallbackDataSourceSnapshot('Laporan stok memakai fallback karena review DB belum aktif penuh.')
          : source,
      items: [],
      warning: 'Laporan stok penuh muncul saat review DB aktif.',
    }
  }

  try {
    const rows = await runReviewDbQuery<InventoryStockRow>(
      `
        SELECT
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ic.code AS categoryCode,
          iu.code AS unitCode,
          ii.current_stock AS currentStock,
          ii.minimum_stock AS minimumStock,
          ii.status AS itemStatus
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic
          ON ic.id = ii.category_id
        LEFT JOIN inventory_units iu
          ON iu.id = ii.unit_id
        ORDER BY
          CASE WHEN ii.current_stock <= ii.minimum_stock THEN 0 ELSE 1 END ASC,
          ii.current_stock ASC,
          ii.item_code ASC
      `,
    )

    return {
      source,
      items: normalizeStockRows(rows),
      warning: null,
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(`Laporan stok fallback aktif: ${getReviewDbErrorDetail(error)}`),
      items: [],
      warning: getReviewDbErrorDetail(error),
    }
  }
}

export async function getInventoryMovementReportData(direction: 'IN' | 'OUT'): Promise<InventoryMovementReportData> {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      source:
        source.isFallback
          ? getFallbackDataSourceSnapshot(`Laporan ${direction === 'IN' ? 'barang masuk' : 'barang keluar'} memakai fallback karena review DB belum aktif penuh.`)
          : source,
      items: [],
      warning: 'Laporan movement penuh muncul saat review DB aktif.',
    }
  }

  const types = direction === 'IN' ? ['IN'] : ['OUT', 'ADJUSTMENT']
  const placeholders = types.map(() => '?').join(', ')

  try {
    const rows = await runReviewDbQuery<InventoryMovementRow>(
      `
        SELECT
          m.id AS id,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          m.movement_type AS movementType,
          m.reference_no AS referenceNo,
          m.qty AS qty,
          m.movement_at AS movementAt,
          m.notes AS notes
        FROM inventory_stock_movements m
        INNER JOIN inventory_items ii
          ON ii.id = m.item_id
        WHERE m.movement_type IN (${placeholders})
        ORDER BY m.movement_at DESC, m.id DESC
        LIMIT 200
      `,
      types,
    )

    return {
      source,
      items: normalizeMovementRows(rows),
      warning: null,
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(`Laporan movement fallback aktif: ${getReviewDbErrorDetail(error)}`),
      items: [],
      warning: getReviewDbErrorDetail(error),
    }
  }
}
