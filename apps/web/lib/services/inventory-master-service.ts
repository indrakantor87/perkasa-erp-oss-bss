import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import type { DataSourceSnapshot } from '@/lib/types'

type InventoryMasterAggregateRow = {
  code: string | null
  itemCount: number | null
  activeItemCount: number | null
  totalStock: number | null
  totalMinimumStock: number | null
}

export type InventoryMasterSummaryItem = {
  code: string
  itemCount: number
  activeItemCount: number
  totalStock: number
  totalMinimumStock: number
}

export type InventoryMasterData = {
  source: DataSourceSnapshot
  categories: InventoryMasterSummaryItem[]
  units: InventoryMasterSummaryItem[]
  warning: string | null
}

function normalizeSummaryRows(rows: InventoryMasterAggregateRow[]) {
  return rows.map((row) => ({
    code: String(row.code ?? '-').trim() || '-',
    itemCount: Number(row.itemCount ?? 0),
    activeItemCount: Number(row.activeItemCount ?? 0),
    totalStock: Number(row.totalStock ?? 0),
    totalMinimumStock: Number(row.totalMinimumStock ?? 0),
  }))
}

export async function getInventoryMasterData(): Promise<InventoryMasterData> {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      source:
        source.isFallback
          ? getFallbackDataSourceSnapshot('Data master inventory memakai fallback karena review DB belum aktif penuh.')
          : source,
      categories: [],
      units: [],
      warning: 'Data master inventory penuh muncul saat review DB aktif.',
    }
  }

  try {
    const [categories, units] = await Promise.all([
      runReviewDbQuery<InventoryMasterAggregateRow>(
        `
          SELECT
            ic.code AS code,
            COUNT(ii.id) AS itemCount,
            SUM(CASE WHEN UPPER(COALESCE(ii.status, '')) = 'ACTIVE' THEN 1 ELSE 0 END) AS activeItemCount,
            COALESCE(SUM(ii.current_stock), 0) AS totalStock,
            COALESCE(SUM(ii.minimum_stock), 0) AS totalMinimumStock
          FROM inventory_categories ic
          LEFT JOIN inventory_items ii
            ON ii.category_id = ic.id
          GROUP BY ic.id, ic.code
          ORDER BY itemCount DESC, ic.code ASC
        `,
      ),
      runReviewDbQuery<InventoryMasterAggregateRow>(
        `
          SELECT
            iu.code AS code,
            COUNT(ii.id) AS itemCount,
            SUM(CASE WHEN UPPER(COALESCE(ii.status, '')) = 'ACTIVE' THEN 1 ELSE 0 END) AS activeItemCount,
            COALESCE(SUM(ii.current_stock), 0) AS totalStock,
            COALESCE(SUM(ii.minimum_stock), 0) AS totalMinimumStock
          FROM inventory_units iu
          LEFT JOIN inventory_items ii
            ON ii.unit_id = iu.id
          GROUP BY iu.id, iu.code
          ORDER BY itemCount DESC, iu.code ASC
        `,
      ),
    ])

    return {
      source,
      categories: normalizeSummaryRows(categories),
      units: normalizeSummaryRows(units),
      warning: null,
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(`Inventory master fallback aktif: ${getReviewDbErrorDetail(error)}`),
      categories: [],
      units: [],
      warning: getReviewDbErrorDetail(error),
    }
  }
}
