import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import {
  dashboardActivities,
  dashboardMetrics,
  dashboardSummary,
} from '@/lib/mock-dashboard'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import type { ActivityItem, DashboardMetric, DashboardSummary } from '@/lib/types'

type DashboardSummaryRow = {
  customers: number
  orders: number
  troubleTickets: number
  isolations: number
  inventoryItems: number
  employees: number
  overdueInvoices: number
}

type ImportActivityRow = {
  batchCode: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  importStatus: string
  totalRows: number
  updatedAt: string
}

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function buildMetrics(summary: DashboardSummary): DashboardMetric[] {
  return [
    {
      label: 'Customer Aktif',
      value: formatNumber(summary.customers),
      change: `${formatNumber(summary.orders)} order tercatat`,
      note: 'Diambil dari master customer final pada database review.',
    },
    {
      label: 'Order Berjalan',
      value: formatNumber(summary.orders),
      change: `${formatNumber(summary.troubleTickets)} TT open`,
      note: 'Membaca order final yang sudah masuk ke satu platform review.',
    },
    {
      label: 'Trouble Ticket Open',
      value: formatNumber(summary.troubleTickets),
      change: `${formatNumber(summary.isolations)} isolir aktif`,
      note: 'Hitungan open issue mengikuti tabel support final, bukan angka mock terpisah.',
    },
    {
      label: 'Invoice Overdue',
      value: formatNumber(summary.overdueInvoices),
      change: `${formatNumber(summary.employees)} employee tercatat`,
      note: 'Overdue dibaca dari billing final yang belum lunas atau sudah berstatus overdue.',
    },
  ]
}

async function getReviewDbDashboardSummary() {
  const [row] = await runReviewDbQuery<DashboardSummaryRow>(`
    SELECT
      (SELECT COUNT(*) FROM crm_customers) AS customers,
      (SELECT COUNT(*) FROM sales_orders) AS orders,
      (
        SELECT COUNT(*)
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
      ) AS troubleTickets,
      (
        SELECT COUNT(*)
        FROM support_isolations
        WHERE status = 'OPEN'
          AND is_archived = 0
      ) AS isolations,
      (
        SELECT COUNT(*)
        FROM inventory_items
        WHERE status = 'ACTIVE'
      ) AS inventoryItems,
      (SELECT COUNT(*) FROM hr_employees) AS employees,
      (
        SELECT COUNT(*)
        FROM billing_invoices
        WHERE invoice_status = 'OVERDUE'
          OR (
            due_date < CURRENT_DATE
            AND COALESCE(paid_amount, 0) < COALESCE(total_amount, 0)
            AND invoice_status NOT IN ('PAID', 'CANCELLED')
          )
      ) AS overdueInvoices
  `)

  return row ?? dashboardSummary
}

async function getReviewDbActivities() {
  const rows = await runReviewDbQuery<ImportActivityRow>(`
    SELECT
      batch_code AS batchCode,
      source_system AS sourceSystem,
      import_status AS importStatus,
      total_rows AS totalRows,
      updated_at AS updatedAt
    FROM staging_import_batches
    ORDER BY updated_at DESC, id DESC
    LIMIT 3
  `)

  if (!rows.length) {
    return dashboardActivities
  }

  return rows.map<ActivityItem>((row) => ({
    title: `Batch ${row.batchCode}`,
    detail: `${row.sourceSystem} • ${row.importStatus} • ${formatNumber(Number(row.totalRows ?? 0))} row review.`,
    at: formatActivityTime(row.updatedAt),
  }))
}

export async function getDashboardSummary() {
  const source = getDataSourceSnapshot()

  if (source.effectiveMode !== 'review-db') {
    return {
      source,
      summary: dashboardSummary,
    }
  }

  try {
    return {
      source,
      summary: await getReviewDbDashboardSummary(),
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      summary: dashboardSummary,
    }
  }
}

export async function getDashboardPageData() {
  const source = getDataSourceSnapshot()

  if (source.effectiveMode !== 'review-db') {
    return {
      source,
      summary: dashboardSummary,
      metrics: dashboardMetrics,
      activities: dashboardActivities,
    }
  }

  try {
    const summary = await getReviewDbDashboardSummary()
    const activities = await getReviewDbActivities()

    return {
      source,
      summary,
      metrics: buildMetrics(summary),
      activities,
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      summary: dashboardSummary,
      metrics: dashboardMetrics,
      activities: dashboardActivities,
    }
  }
}
