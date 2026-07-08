import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import {
  dashboardActivities,
  dashboardMetrics,
  dashboardSummary,
  getMockRoleQueues,
  getMockWorklist,
} from '@/lib/mock-dashboard'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import type { AppRole, ActivityItem, DashboardMetric, DashboardQueueItem, DashboardSummary, DashboardWorkItem } from '@/lib/types'

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

type DashboardLeadRow = {
  leadId: number
  customerName: string
  status: string
  marketingName: string | null
  source: string | null
}

type DashboardSupportRow = {
  ticketCode: string
  customerName: string
  status: string
  ticketType: string
  openedAt: string
}

type DashboardIsolationRow = {
  isolationId: number
  customerName: string
  status: string
  reason: string | null
  isolationDate: string
}

type DashboardWorkOrderRow = {
  workOrderId: number
  workOrderNo: string
  customerName: string
  status: string
  workType: string
  technicianName: string | null
  scheduledAt: string | null
}

type DashboardDismantleRow = {
  dismantleId: number
  customerName: string
  closeNote: string | null
  closedAt: string
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

function buildRoleQueues(role: AppRole, summary: DashboardSummary): DashboardQueueItem[] {
  return getMockRoleQueues(role, summary)
}

async function getReviewDbWorklist(role: AppRole): Promise<DashboardWorkItem[]> {
  switch (role) {
    case 'SUPER_ADMIN': {
      const rows = await runReviewDbQuery<ImportActivityRow>(`
        SELECT
          batch_code AS batchCode,
          source_system AS sourceSystem,
          import_status AS importStatus,
          total_rows AS totalRows,
          updated_at AS updatedAt
        FROM staging_import_batches
        ORDER BY updated_at DESC, id DESC
        LIMIT 2
      `)

      return rows.map((row) => ({
        id: `batch-${row.batchCode}`,
        domain: 'Import',
        title: `Review batch ${row.batchCode}`,
        subtitle: `${row.sourceSystem} • ${Number(row.totalRows ?? 0).toLocaleString('id-ID')} row`,
        status: row.importStatus,
        priority: 'tinggi',
        detail: `Batch terbaru perlu validasi sebelum transform berikutnya. Updated ${formatActivityTime(row.updatedAt)}.`,
        href: '/import',
      }))
    }
    case 'SALES_MARKETING': {
      const leads = await runReviewDbQuery<DashboardLeadRow>(`
        SELECT
          id AS leadId,
          customer_name AS customerName,
          status,
          marketing_name AS marketingName,
          source
        FROM sales_leads
        ORDER BY created_at DESC, id DESC
        LIMIT 4
      `)

      return leads.map((item) => ({
        id: `lead-${item.leadId}`,
        domain: 'Sales',
        title: item.customerName,
        subtitle: item.marketingName || 'Marketing belum terisi',
        status: item.status,
        priority: 'tinggi',
        detail: `Lead dari ${item.source || 'sumber belum terpetakan'} menunggu follow up awal.`,
        href: '/sales',
      }))
    }
    case 'CS_OPERATOR':
    case 'CS_ADMIN': {
      const orders = await runReviewDbQuery<DashboardWorkOrderRow>(`
        SELECT
          swo.id AS workOrderId,
          swo.work_order_no AS workOrderNo,
          COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName,
          swo.status,
          swo.work_type AS workType,
          swo.technician_name AS technicianName,
          CAST(swo.scheduled_at AS CHAR) AS scheduledAt
        FROM service_work_orders swo
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE COALESCE(UPPER(TRIM(swo.status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
        ORDER BY COALESCE(swo.scheduled_at, swo.created_at) DESC, swo.id DESC
        LIMIT 3
      `)
      const isolations = await runReviewDbQuery<DashboardIsolationRow>(`
        SELECT
          id AS isolationId,
          customer_name AS customerName,
          status,
          reason,
          CAST(isolation_date AS CHAR) AS isolationDate
        FROM support_isolations
        WHERE status = 'OPEN'
          AND is_archived = 0
        ORDER BY isolation_date DESC, id DESC
        LIMIT 2
      `)

      return [
        ...orders.map((item) => ({
          id: `wo-${item.workOrderId}`,
          domain: 'Sales',
          title: item.workOrderNo,
          subtitle: item.customerName,
          status: item.status,
          priority: 'tinggi' as const,
          detail: `${item.workType} • Teknisi: ${item.technicianName || '-'} • Jadwal: ${item.scheduledAt ? formatActivityTime(item.scheduledAt) : '-'}.`,
          href: '/sales',
        })),
        ...isolations.map((item) => ({
          id: `iso-${item.isolationId}`,
          domain: 'Support',
          title: item.customerName,
          subtitle: 'Isolir aktif',
          status: item.status,
          priority: 'tinggi' as const,
          detail: `${item.reason?.trim() || 'Belum ada alasan isolir'} • Tanggal: ${formatActivityTime(item.isolationDate)}.`,
          href: '/support',
        })),
      ]
    }
    case 'NOC_OPERATOR':
    case 'TT_OPERATOR': {
      const tickets = await runReviewDbQuery<DashboardSupportRow>(`
        SELECT
          ticket_code AS ticketCode,
          customer_name AS customerName,
          status,
          type AS ticketType,
          CAST(opened_at AS CHAR) AS openedAt
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
        ORDER BY opened_at DESC, id DESC
        LIMIT 5
      `)

      return tickets.map((item) => ({
        id: item.ticketCode,
        domain: 'Support',
        title: item.ticketCode,
        subtitle: item.customerName,
        status: item.status,
        priority: 'tinggi',
        detail: `${item.ticketType} • Dibuka ${formatActivityTime(item.openedAt)}.`,
        href: '/support',
      }))
    }
    case 'FIELD_TECHNICIAN': {
      const rows = await runReviewDbQuery<DashboardWorkOrderRow>(`
        SELECT
          swo.id AS workOrderId,
          swo.work_order_no AS workOrderNo,
          COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName,
          swo.status,
          swo.work_type AS workType,
          swo.technician_name AS technicianName,
          CAST(swo.scheduled_at AS CHAR) AS scheduledAt
        FROM service_work_orders swo
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE COALESCE(UPPER(TRIM(swo.status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
        ORDER BY COALESCE(swo.scheduled_at, swo.created_at) DESC, swo.id DESC
        LIMIT 4
      `)

      return rows.map((item) => ({
        id: `wo-${item.workOrderId}`,
        domain: 'Sales',
        title: item.workOrderNo,
        subtitle: item.customerName,
        status: item.status,
        priority: 'tinggi',
        detail: `${item.workType} • Teknisi: ${item.technicianName || '-'} • Jadwal: ${item.scheduledAt ? formatActivityTime(item.scheduledAt) : '-'}.`,
        href: '/sales',
      }))
    }
    case 'DISMANTLE_OPERATOR': {
      const rows = await runReviewDbQuery<DashboardDismantleRow>(`
        SELECT
          id AS dismantleId,
          customer_name AS customerName,
          close_note AS closeNote,
          CAST(closed_at AS CHAR) AS closedAt
        FROM support_dismantle_history
        ORDER BY closed_at DESC, id DESC
        LIMIT 4
      `)

      return rows.map((item) => ({
        id: `dismantle-${item.dismantleId}`,
        domain: 'Support',
        title: item.customerName,
        subtitle: 'Histori dismantle terbaru',
        status: 'DONE',
        priority: 'sedang',
        detail: `${item.closeNote?.trim() || 'Belum ada catatan lapangan'} • Closed ${formatActivityTime(item.closedAt)}.`,
        href: '/support',
      }))
    }
    case 'DIGITAL_CREATOR':
      return []
  }
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

export async function getDashboardPageData(role: AppRole) {
  const source = getDataSourceSnapshot()

  if (source.effectiveMode !== 'review-db') {
    return {
      source,
      summary: dashboardSummary,
      metrics: dashboardMetrics,
      roleQueues: getMockRoleQueues(role, dashboardSummary),
      worklist: getMockWorklist(role),
      activities: dashboardActivities,
    }
  }

  try {
    const summary = await getReviewDbDashboardSummary()
    const activities = await getReviewDbActivities()
    const worklist = await getReviewDbWorklist(role)

    return {
      source,
      summary,
      metrics: buildMetrics(summary),
      roleQueues: buildRoleQueues(role, summary),
      worklist: worklist.length ? worklist : getMockWorklist(role),
      activities,
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      summary: dashboardSummary,
      metrics: dashboardMetrics,
      roleQueues: getMockRoleQueues(role, dashboardSummary),
      worklist: getMockWorklist(role),
      activities: dashboardActivities,
    }
  }
}
