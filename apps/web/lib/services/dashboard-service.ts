import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { resolveDashboardKpiTemplateDrilldown } from '@/lib/dashboard-kpi-config'
import {
  dashboardActivities,
  dashboardMetrics,
  dashboardSummary,
  getMockRoleQueues,
  getMockWorklist,
} from '@/lib/mock-dashboard'
import type { AppSession } from '@/lib/auth-session'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { getRecentAuthPermissionAudits } from '@/lib/services/auth-permission-audit-service'
import { getRecentAuthRolePermissionAudits } from '@/lib/services/auth-role-permission-audit-service'
import { getRecentAuthUserAudits } from '@/lib/services/auth-user-audit-service'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'
import { listMergedDashboardKpiDefinitions, resolveDashboardKpiManagerScope } from '@/lib/services/dashboard-kpi-service'
import { getRecentHrAudits } from '@/lib/services/hr-audit-service'
import { ensureImportBatchActionTable } from '@/lib/services/import-write-service'
import type {
  AppRole,
  ActivityItem,
  DashboardAlertItem,
  DashboardDailyActivityApprovalQueue,
  DashboardDailyActivityApprovalQueueItem,
  DashboardDailyActivityPendingApprovalItem,
  DashboardMetric,
  DashboardOperationalCard,
  DashboardOperationalDivisionKey,
  DashboardQueueItem,
  DashboardSummary,
  DashboardWorkItem,
} from '@/lib/types'

type DashboardSummaryRow = {
  customers: number
  orders: number
  troubleTickets: number
  isolations: number
  inventoryItems: number
  employees: number
  overdueInvoices: number
}

type DashboardSalesOperationalRow = {
  activeLeads: number
  monthlyOrders: number
  monthlyActivations: number
}

type DashboardCsOperationalRow = {
  activeWorkOrders: number
  activeIsolations: number
  monthlyDismantles: number
}

type DashboardNocOperationalRow = {
  openTickets: number
  overdueTickets: number
  monthlyOpenedTickets: number
}

type DashboardDigitalOperationalRow = {
  digitalLeads: number
  digitalOrders: number
  digitalSurveys: number
}

type DashboardBillingOperationalRow = {
  overdueInvoices: number
  partialInvoices: number
  suspendCandidates: number
  overdueAmount: number
}

type DashboardHrOperationalRow = {
  employees: number
  attendanceToday: number
  activeLoans: number
}

type DashboardInventoryOperationalRow = {
  activeItems: number
  currentMonthMovements: number
  pendingRequests: number
}

type ImportActivityRow = {
  batchCode: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  importStatus: string
  totalRows: number
  updatedAt: string
}

type DashboardAlertImportBatchRow = {
  batchCode: string
  importStatus: string
  totalRows: number
  updatedAt: string
}

type ImportBatchActionActivityRow = {
  id: number
  batchCode: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  actionType: string
  actionStatus: string
  actorName: string | null
  detailText: string | null
  createdAt: string
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

type DailyActivityApprovalQueueRow = {
  divisionName: string | null
  subdivisionName: string | null
  pendingCount: number
}

type DailyActivityApprovalPendingRow = {
  activityId: number
  activityCode: string
  activityDate: string
  taskTitle: string
  plannedBy: string
  divisionName: string | null
  subdivisionName: string | null
  executionStatus: string
}

type TimelineActivityItem = {
  title: string
  detail: string
  happenedAt: string
}

type SupportAuditActivityRow = {
  actionType: string
  entityRef: string
  customerName: string | null
  detailText: string | null
  happenedAt: string
}

type InventoryAuditActivityRow = {
  actionType: string
  entityRef: string
  itemCode: string | null
  itemName: string | null
  qty: number | null
  statusText: string | null
  actorName: string | null
  detailText: string | null
  happenedAt: string
}

type BillingAuditActivityRow = {
  actionType: string
  entityRef: string
  customerName: string | null
  amount: number | null
  statusText: string | null
  detailText: string | null
  happenedAt: string
}

type SalesAuditActivityRow = {
  actionType: string
  entityRef: string
  customerName: string | null
  statusText: string | null
  detailText: string | null
  happenedAt: string
}

type DashboardPageFilters = {
  month: number
  year: number
  division: DashboardOperationalDivisionKey
  kpiDivisionName?: string
  kpiSubdivisionName?: string
}

const reviewDbColumnCache = new Map<string, boolean>()

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

function formatPercentage(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatCompactCurrency(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  if (Math.abs(safe) >= 1_000_000_000) {
    return `Rp${(safe / 1_000_000_000).toFixed(1)} M`
  }
  if (Math.abs(safe) >= 1_000_000) {
    return `Rp${(safe / 1_000_000).toFixed(1)} Jt`
  }
  if (Math.abs(safe) >= 1_000) {
    return `Rp${(safe / 1_000).toFixed(1)} Rb`
  }
  return formatCurrency(safe)
}

function normalizeActivityDate(value: unknown) {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'number') {
    return new Date(value)
  }

  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  if (!text) {
    return new Date(NaN)
  }

  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }

  return new Date(text)
}

function formatActivityTime(value: unknown) {
  const safeDate = normalizeActivityDate(value)
  if (Number.isNaN(safeDate.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(safeDate)
}

function getActivitySortTime(value: unknown) {
  const timestamp = normalizeActivityDate(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
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

async function hasReviewDbColumn(tableName: string, columnName: string) {
  const cacheKey = `${tableName}.${columnName}`.toLowerCase()
  if (reviewDbColumnCache.has(cacheKey)) {
    return reviewDbColumnCache.get(cacheKey) ?? false
  }

  const rows = await runReviewDbQuery<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [tableName, columnName]
  )

  const exists = Number(rows[0]?.total ?? 0) > 0
  reviewDbColumnCache.set(cacheKey, exists)
  return exists
}

function buildRoleQueues(role: AppRole, summary: DashboardSummary): DashboardQueueItem[] {
  return getMockRoleQueues(role, summary)
}

function buildMockDashboardAlerts(params: {
  summary: DashboardSummary
  approvalPending: number
  role: AppRole
}): DashboardAlertItem[] {
  const items: DashboardAlertItem[] = []

  if (params.role === 'SUPER_ADMIN') {
    items.push({
      id: 'mock-import-review',
      domain: 'Import',
      severity: 'critical',
      title: 'Batch import masih menunggu review akhir',
      detail: 'Landing ERP harus menjaga ritme migrasi data karena batch yang tertahan bisa memblok domain lain.',
      impactSummary:
        'Customer, billing, dan support bisa membaca data yang belum final sehingga antrean operasional lintas domain ikut tertahan.',
      nextStep: 'Selesaikan review batch terakhir, jalankan transform yang aman, lalu pastikan domain hilir sudah membaca data final.',
      affectedModules: ['Customer', 'Billing', 'Support'],
      href: '/import',
      actionLabel: 'Review Import',
    })
  }

  if (params.summary.overdueInvoices > 0) {
    items.push({
      id: 'mock-billing-overdue',
      domain: 'Billing',
      severity: 'high',
      title: `${formatNumber(params.summary.overdueInvoices)} invoice overdue butuh tindak lanjut billing`,
      detail: 'Invoice overdue berdampak ke collection, suspend, dan reconnect sehingga perlu diprioritaskan cepat.',
      impactSummary:
        'Backlog overdue menekan ritme collection, memicu isolir/reconnect, dan ikut memengaruhi pengalaman customer di support.',
      nextStep:
        'Prioritaskan invoice paling tua atau terbesar, tentukan follow-up aktif, lalu sinkronkan keputusan suspend atau reconnect dengan support.',
      affectedModules: ['Support', 'Customer', 'Billing'],
      href: '/billing',
      actionLabel: 'Buka Billing',
    })
  }

  if (params.summary.troubleTickets > 0) {
    items.push({
      id: 'mock-support-open',
      domain: 'Support',
      severity: 'high',
      title: `${formatNumber(params.summary.troubleTickets)} trouble ticket open masih aktif`,
      detail: 'Ticket teknis yang terus terbuka akan menekan SLA, kapasitas NOC, dan pengalaman customer.',
      impactSummary:
        'Saat backlog ticket naik, lane SLA, follow-up CS, dan keputusan billing terkait isolir atau restore ikut melambat.',
      nextStep:
        'Fokuskan operator ke ticket prioritas tertinggi, update progress terbaru, lalu eskalasi atau close sesuai queue reason aktif.',
      affectedModules: ['NOC', 'CS', 'Billing'],
      href: '/support/tt',
      actionLabel: 'Buka Ticket',
    })
  }

  if (params.summary.isolations > 0) {
    items.push({
      id: 'mock-support-isolation',
      domain: 'Support/Billing',
      severity: 'medium',
      title: `${formatNumber(params.summary.isolations)} pelanggan isolir aktif perlu sinkron support dan billing`,
      detail: 'Kasus isolir aktif biasanya butuh tindak lanjut billing, support, atau keputusan restore/dismantle.',
      impactSummary:
        'Isolir aktif memengaruhi customer experience, status collection, dan keputusan restore layanan atau dismantle lapangan.',
      nextStep:
        'Cek penyebab isolir per customer, samakan status billing dengan support, lalu putuskan restore, lanjut follow-up, atau dismantle.',
      affectedModules: ['Billing', 'Support', 'Sales'],
      href: '/support/isolations',
      actionLabel: 'Lihat Isolir',
    })
  }

  if (params.approvalPending > 0) {
    items.push({
      id: 'mock-daily-approval',
      domain: 'HR/Daily Activity',
      severity: 'medium',
      title: `${formatNumber(params.approvalPending)} approval Daily Activity masih tertahan`,
      detail: 'Approval yang tertahan memperlambat kontrol performa divisi dan ritme kerja harian.',
      impactSummary:
        'Dashboard kehilangan konteks performa terbaru per divisi sehingga monitoring lintas domain dan audit harian ikut kurang tajam.',
      nextStep:
        'Selesaikan approval backlog per divisi lebih dulu agar ritme kerja, monitoring dashboard, dan evaluasi tim kembali sinkron.',
      affectedModules: ['HR', 'Dashboard', 'Daily Activity'],
      href: '/dashboard/daily-activity',
      actionLabel: 'Buka Approval',
    })
  }

  return items.slice(0, 4)
}

function getMonthRange(filters: DashboardPageFilters) {
  const start = new Date(filters.year, filters.month - 1, 1)
  const end = new Date(filters.year, filters.month, 1)

  const toSqlDateTime = (value: Date) => {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 19).replace('T', ' ')
  }

  return {
    start,
    end,
    startText: toSqlDateTime(start),
    endText: toSqlDateTime(end),
  }
}

function buildMockOperationalCards(summary: DashboardSummary, filters: DashboardPageFilters): DashboardOperationalCard[] {
  const mockSalesActivations = Math.max(4, Math.round(summary.orders / 5))
  const mockSupportOverdue = Math.max(1, Math.round(summary.troubleTickets / 5))
  const mockAttendanceToday = Math.max(18, Math.round(summary.employees * 0.72))

  const cards: DashboardOperationalCard[] = [
    {
      key: 'SALES',
      title: 'Penjualan',
      description: 'Fokus pada PSB, order aktif, dan aktivasi subscription lintas marketing.',
      badge: 'Penjualan',
      href: '/sales',
      tone: 'border-sky-200 bg-sky-50 text-sky-900',
      metrics: [
        { label: 'Lead Aktif', value: formatNumber(Math.max(12, Math.round(summary.orders / 2))) },
        { label: 'PSB Periode Ini', value: formatNumber(summary.orders) },
        {
          label: 'Aktivasi',
          value: formatNumber(mockSalesActivations),
          hint: `${formatNumber(mockSalesActivations)} aktivasi dari ${formatNumber(summary.orders)} order (${formatPercentage(
            summary.orders > 0 ? (mockSalesActivations / summary.orders) * 100 : 0,
          )})`,
          hintBadges: [
            `Aktivasi ${formatNumber(mockSalesActivations)}`,
            `Order ${formatNumber(summary.orders)}`,
            `Rasio ${formatPercentage(summary.orders > 0 ? (mockSalesActivations / summary.orders) * 100 : 0)}`,
          ],
        },
      ],
    },
    {
      key: 'CS',
      title: 'CS',
      description: 'Fokus pada work order, isolir aktif, dan tindak lanjut pelanggan operasional.',
      badge: 'CS',
      href: '/support',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-900',
      metrics: [
        { label: 'Work Order Aktif', value: formatNumber(Math.max(6, Math.round(summary.orders / 3))) },
        { label: 'Total Isolir', value: formatNumber(summary.isolations) },
        { label: 'Dismantle Bulan Ini', value: formatNumber(Math.max(2, Math.round(summary.isolations / 4))) },
      ],
    },
    {
      key: 'NOC',
      title: 'NOC',
      description: 'Fokus pada penanganan trouble ticket, SLA, dan stabilitas operasi jaringan.',
      badge: 'NOC',
      href: '/support/tt',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      metrics: [
        { label: 'Trouble Ticket', value: formatNumber(summary.troubleTickets) },
        {
          label: 'Ticket Overdue',
          value: formatNumber(mockSupportOverdue),
          hint: `${formatNumber(mockSupportOverdue)} overdue dari ${formatNumber(summary.troubleTickets)} ticket open (${formatPercentage(
            summary.troubleTickets > 0 ? (mockSupportOverdue / summary.troubleTickets) * 100 : 0,
          )})`,
          hintBadges: [
            `Overdue ${formatNumber(mockSupportOverdue)}`,
            `Open ${formatNumber(summary.troubleTickets)}`,
            `Rasio ${formatPercentage(summary.troubleTickets > 0 ? (mockSupportOverdue / summary.troubleTickets) * 100 : 0)}`,
          ],
        },
        { label: 'Ticket Periode Ini', value: formatNumber(Math.max(4, Math.round(summary.troubleTickets / 2))) },
      ],
    },
    {
      key: 'TT',
      title: 'Troubleshoots',
      description: 'Fokus pada queue TT, eskalasi, dan penyelesaian ticket yang lebih sempit dari monitoring NOC.',
      badge: 'Troubleshoots',
      href: '/support/tt',
      tone: 'border-orange-200 bg-orange-50 text-orange-900',
      metrics: [
        { label: 'TT Open', value: formatNumber(summary.troubleTickets) },
        { label: 'Perlu Eskalasi', value: formatNumber(Math.max(2, Math.round(summary.troubleTickets / 4))) },
        { label: 'Siap Close', value: formatNumber(Math.max(1, Math.round(summary.troubleTickets / 6))) },
      ],
    },
    {
      key: 'DISMANTLE',
      title: 'Dismantle',
      description: 'Queue pembongkaran, tindak lanjut lapangan, dan penutupan catatan dismantle operasional.',
      badge: 'Dismantle',
      href: '/support/dismantle',
      tone: 'border-rose-200 bg-rose-50 text-rose-900',
      metrics: [
        { label: 'Queue Dismantle', value: formatNumber(Math.max(5, Math.round(summary.isolations / 3))) },
        { label: 'Follow Up Lapangan', value: formatNumber(Math.max(2, Math.round(summary.isolations / 5))) },
        { label: 'Close Periode Ini', value: formatNumber(Math.max(2, Math.round(summary.isolations / 6))) },
      ],
    },
    {
      key: 'DIGITAL',
      title: 'Creator Digital',
      description: 'Konten, campaign, dan lead digital yang mendukung pertumbuhan channel akuisisi.',
      badge: 'Creator Digital',
      href: '/sales',
      tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900',
      metrics: [
        { label: 'Lead Digital', value: formatNumber(Math.max(0, Math.round(summary.orders / 6))) },
        { label: 'Campaign Aktif', value: formatNumber(0) },
        { label: 'Konten Tercatat', value: formatNumber(0) },
      ],
    },
    {
      key: 'BILLING',
      title: 'Billing',
      description: 'Kontrol invoice overdue, payment parsial, dan kandidat suspend pada koleksi berjalan.',
      badge: 'Billing',
      href: '/billing',
      tone: 'border-violet-200 bg-violet-50 text-violet-900',
      metrics: [
        {
          label: 'Invoice Overdue',
          value: formatNumber(summary.overdueInvoices),
          hint: `${formatCurrency(summary.overdueInvoices * 275000)} outstanding pada ${formatNumber(summary.overdueInvoices)} invoice overdue`,
          hintBadges: [
            `Outstanding ${formatCompactCurrency(summary.overdueInvoices * 275000)}`,
            `Invoice ${formatNumber(summary.overdueInvoices)}`,
          ],
        },
        { label: 'Payment Parsial', value: formatNumber(Math.max(6, Math.round(summary.overdueInvoices / 4))) },
        { label: 'Suspend Candidate', value: formatNumber(Math.max(4, Math.round(summary.overdueInvoices / 7))) },
      ],
    },
    {
      key: 'HR',
      title: 'HR',
      description: 'Monitor employee aktif, kehadiran hari ini, dan pinjaman karyawan yang masih berjalan.',
      badge: 'HR',
      href: '/hr',
      tone: 'border-violet-200 bg-violet-50 text-violet-900',
      metrics: [
        { label: 'Employee Aktif', value: formatNumber(summary.employees) },
        {
          label: 'Absensi Hari Ini',
          value: formatNumber(mockAttendanceToday),
          hint: `${formatNumber(mockAttendanceToday)} hadir dari ${formatNumber(summary.employees)} employee aktif (${formatPercentage(
            summary.employees > 0 ? (mockAttendanceToday / summary.employees) * 100 : 0,
          )})`,
          hintBadges: [
            `Hadir ${formatNumber(mockAttendanceToday)}`,
            `Employee ${formatNumber(summary.employees)}`,
            `Rasio ${formatPercentage(summary.employees > 0 ? (mockAttendanceToday / summary.employees) * 100 : 0)}`,
          ],
        },
        { label: 'Pinjaman Aktif', value: formatNumber(Math.max(2, Math.round(summary.employees / 14))) },
      ],
    },
    {
      key: 'INVENTORY',
      title: 'Inventory',
      description: 'Pantau item aktif, pergerakan stok, dan request gudang yang mendukung operasi lintas divisi.',
      badge: 'Inventory',
      href: '/inventory',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      metrics: [
        { label: 'Item Aktif', value: formatNumber(summary.inventoryItems) },
        { label: 'Mutasi Bulan Ini', value: formatNumber(Math.max(16, Math.round(summary.inventoryItems / 18))) },
        { label: 'Request Pending', value: formatNumber(Math.max(5, Math.round(summary.inventoryItems / 60))) },
      ],
    },
  ]

  return filters.division === 'ALL' ? cards : cards.filter((card) => card.key === filters.division)
}

async function getReviewDbOperationalCards(
  session: AppSession,
  filters: DashboardPageFilters,
): Promise<DashboardOperationalCard[]> {
  const { startText, endText } = getMonthRange(filters)
  const digitalSources = ['DIGITAL', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'WEBSITE', 'META ADS']
  const digitalSourceConditions = digitalSources.map(() => '?').join(', ')
  const hasSupportSlaDueAt = await hasReviewDbColumn('support_trouble_tickets', 'sla_due_at')

  const [salesRows, csRows, nocRows, digitalRows, billingRows, hrRows, inventoryRows] = await Promise.all([
    runReviewDbQuery<DashboardSalesOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM sales_leads
            WHERE COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CANCELLED', 'DONE')
          ) AS activeLeads,
          (
            SELECT COUNT(*)
            FROM sales_orders
            WHERE request_date >= ?
              AND request_date < ?
          ) AS monthlyOrders,
          (
            SELECT COUNT(*)
            FROM service_subscriptions
            WHERE activated_at IS NOT NULL
              AND activated_at >= ?
              AND activated_at < ?
          ) AS monthlyActivations
      `,
      [startText, endText, startText, endText]
    ),
    runReviewDbQuery<DashboardCsOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM service_work_orders
            WHERE COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
          ) AS activeWorkOrders,
          (
            SELECT COUNT(*)
            FROM support_isolations
            WHERE status = 'OPEN'
              AND is_archived = 0
          ) AS activeIsolations,
          (
            SELECT COUNT(*)
            FROM support_dismantle_history
            WHERE closed_at IS NOT NULL
              AND closed_at >= ?
              AND closed_at < ?
          ) AS monthlyDismantles
      `,
      [startText, endText]
    ),
    runReviewDbQuery<DashboardNocOperationalRow>(
      hasSupportSlaDueAt
        ? `
            SELECT
              (
                SELECT COUNT(*)
                FROM support_trouble_tickets
                WHERE closed_at IS NULL
                  AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
              ) AS openTickets,
              (
                SELECT COUNT(*)
                FROM support_trouble_tickets
                WHERE closed_at IS NULL
                  AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
                  AND sla_due_at IS NOT NULL
                  AND sla_due_at < CURRENT_TIMESTAMP
              ) AS overdueTickets,
              (
                SELECT COUNT(*)
                FROM support_trouble_tickets
                WHERE opened_at >= ?
                  AND opened_at < ?
              ) AS monthlyOpenedTickets
          `
        : `
            SELECT
              (
                SELECT COUNT(*)
                FROM support_trouble_tickets
                WHERE closed_at IS NULL
                  AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
              ) AS openTickets,
              0 AS overdueTickets,
              (
                SELECT COUNT(*)
                FROM support_trouble_tickets
                WHERE opened_at >= ?
                  AND opened_at < ?
              ) AS monthlyOpenedTickets
          `,
      [startText, endText]
    ),
    runReviewDbQuery<DashboardDigitalOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM sales_leads
            WHERE UPPER(COALESCE(source, '')) IN (${digitalSourceConditions})
          ) AS digitalLeads,
          (
            SELECT COUNT(*)
            FROM sales_orders so
            JOIN sales_leads sl
              ON sl.id = so.lead_id
            WHERE UPPER(COALESCE(sl.source, '')) IN (${digitalSourceConditions})
              AND so.request_date >= ?
              AND so.request_date < ?
          ) AS digitalOrders,
          (
            SELECT COUNT(*)
            FROM sales_surveys ss
            JOIN sales_leads sl
              ON sl.id = ss.lead_id
            WHERE UPPER(COALESCE(sl.source, '')) IN (${digitalSourceConditions})
              AND COALESCE(ss.scheduled_at, ss.created_at) >= ?
              AND COALESCE(ss.scheduled_at, ss.created_at) < ?
          ) AS digitalSurveys
      `,
      [...digitalSources, ...digitalSources, startText, endText, ...digitalSources, startText, endText]
    ),
    runReviewDbQuery<DashboardBillingOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM billing_invoices bi
            WHERE (
                bi.invoice_status = 'OVERDUE'
                OR (
                  bi.due_date < CURRENT_DATE
                  AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
                  AND bi.invoice_status NOT IN ('PAID', 'CANCELLED')
                )
              )
              AND (
                (bi.billing_year = ? AND bi.billing_month = ?)
                OR (bi.due_date >= ? AND bi.due_date < ?)
              )
              AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') NOT IN ('WRITE_OFF', 'CLOSED')
          ) AS overdueInvoices,
          (
            SELECT COALESCE(SUM(GREATEST(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0), 0)), 0)
            FROM billing_invoices bi
            WHERE (
                bi.invoice_status = 'OVERDUE'
                OR (
                  bi.due_date < CURRENT_DATE
                  AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
                  AND bi.invoice_status NOT IN ('PAID', 'CANCELLED')
                )
              )
              AND (
                (bi.billing_year = ? AND bi.billing_month = ?)
                OR (bi.due_date >= ? AND bi.due_date < ?)
              )
              AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') NOT IN ('WRITE_OFF', 'CLOSED')
          ) AS overdueAmount,
          (
            SELECT COUNT(*)
            FROM billing_invoices bi
            WHERE bi.invoice_status = 'PARTIAL'
              AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
              AND (
                (bi.billing_year = ? AND bi.billing_month = ?)
                OR (bi.due_date >= ? AND bi.due_date < ?)
              )
              AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') NOT IN ('WRITE_OFF', 'CLOSED')
          ) AS partialInvoices,
          (
            SELECT COUNT(*)
            FROM billing_invoices bi
            JOIN (
              SELECT
                action_latest.invoice_id,
                action_latest.action_type,
                action_latest.action_status,
                action_latest.due_follow_up_at
              FROM billing_collection_actions action_latest
              INNER JOIN (
                SELECT invoice_id, MAX(id) AS latestId
                FROM billing_collection_actions
                GROUP BY invoice_id
              ) latest_ids
                ON latest_ids.latestId = action_latest.id
            ) latest
              ON latest.invoice_id = bi.id
            WHERE COALESCE(UPPER(TRIM(latest.action_status)), 'OPEN') = 'OPEN'
              AND COALESCE(UPPER(TRIM(bi.invoice_status)), 'ISSUED') IN ('ISSUED', 'OVERDUE', 'PARTIAL')
              AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') <> 'CLOSED'
              AND (
                COALESCE(bi.suspend_candidate, 0) = 1
                OR COALESCE(UPPER(TRIM(latest.action_type)), '') = 'SUSPEND'
                OR (
                  COALESCE(UPPER(TRIM(latest.action_type)), '') = 'PROMISE_TO_PAY'
                  AND latest.due_follow_up_at IS NOT NULL
                  AND latest.due_follow_up_at < CURRENT_TIMESTAMP
                )
              )
              AND (
                (bi.billing_year = ? AND bi.billing_month = ?)
                OR (bi.due_date >= ? AND bi.due_date < ?)
              )
          ) AS suspendCandidates
      `,
      [
        filters.year,
        filters.month,
        startText,
        endText,
        filters.year,
        filters.month,
        startText,
        endText,
        filters.year,
        filters.month,
        startText,
        endText,
        filters.year,
        filters.month,
        startText,
        endText,
      ]
    ),
    runReviewDbQuery<DashboardHrOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM hr_employees
            WHERE COALESCE(UPPER(TRIM(employment_status)), 'ACTIVE') <> 'ARCHIVED'
          ) AS employees,
          (
            SELECT COUNT(*)
            FROM hr_attendance
            WHERE attendance_date = CURRENT_DATE
          ) AS attendanceToday,
          (
            SELECT COUNT(*)
            FROM hr_loans
            WHERE status = 'ACTIVE'
          ) AS activeLoans
      `
    ),
    runReviewDbQuery<DashboardInventoryOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM inventory_items
            WHERE status = 'ACTIVE'
          ) AS activeItems,
          (
            SELECT COUNT(*)
            FROM inventory_stock_movements
            WHERE movement_at >= ?
              AND movement_at < ?
          ) AS currentMonthMovements,
          (
            SELECT COUNT(*)
            FROM inventory_item_requests
            WHERE UPPER(COALESCE(request_status, 'REQUEST')) = 'PENDING'
          ) AS pendingRequests
      `,
      [startText, endText]
    ),
  ])

  const sales = salesRows[0] ?? { activeLeads: 0, monthlyOrders: 0, monthlyActivations: 0 }
  const cs = csRows[0] ?? { activeWorkOrders: 0, activeIsolations: 0, monthlyDismantles: 0 }
  const noc = nocRows[0] ?? { openTickets: 0, overdueTickets: 0, monthlyOpenedTickets: 0 }
  const digital = digitalRows[0] ?? { digitalLeads: 0, digitalOrders: 0, digitalSurveys: 0 }
  const billing = billingRows[0] ?? { overdueInvoices: 0, partialInvoices: 0, suspendCandidates: 0, overdueAmount: 0 }
  const hr = hrRows[0] ?? { employees: 0, attendanceToday: 0, activeLoans: 0 }
  const inventory = inventoryRows[0] ?? { activeItems: 0, currentMonthMovements: 0, pendingRequests: 0 }

  function resolveTemplateValue(templateKey: string) {
    const key = templateKey.trim().toUpperCase()

    switch (key) {
      case 'SALES_ACTIVE_LEADS':
        return Number(sales.activeLeads ?? 0)
      case 'SALES_MONTHLY_ORDERS':
        return Number(sales.monthlyOrders ?? 0)
      case 'SALES_MONTHLY_ACTIVATIONS':
        return Number(sales.monthlyActivations ?? 0)
      case 'SALES_ACTIVATION_RATE': {
        const orders = Number(sales.monthlyOrders ?? 0)
        const activations = Number(sales.monthlyActivations ?? 0)
        if (orders <= 0) return 0
        return (activations / orders) * 100
      }
      case 'CS_ACTIVE_WORK_ORDERS':
        return Number(cs.activeWorkOrders ?? 0)
      case 'CS_ACTIVE_ISOLATIONS':
        return Number(cs.activeIsolations ?? 0)
      case 'CS_MONTHLY_DISMANTLES':
        return Number(cs.monthlyDismantles ?? 0)
      case 'SUPPORT_OPEN_TICKETS':
        return Number(noc.openTickets ?? 0)
      case 'SUPPORT_SLA_OVERDUE':
        return Number(noc.overdueTickets ?? 0)
      case 'SUPPORT_MONTHLY_OPENED_TICKETS':
        return Number(noc.monthlyOpenedTickets ?? 0)
      case 'SUPPORT_OVERDUE_RATE': {
        const openTickets = Number(noc.openTickets ?? 0)
        const overdueTickets = Number(noc.overdueTickets ?? 0)
        if (openTickets <= 0) return 0
        return (overdueTickets / openTickets) * 100
      }
      case 'TT_OPEN_TICKETS':
        return Number(noc.openTickets ?? 0)
      case 'TT_NEED_ESCALATION':
        return Number(noc.overdueTickets ?? 0)
      case 'TT_READY_CLOSE':
        return Math.max(0, Math.round(Number(noc.monthlyOpenedTickets ?? 0) / 3))
      case 'DISMANTLE_OPEN_QUEUE':
        return Math.max(0, Math.round(Number(cs.activeIsolations ?? 0) / 2))
      case 'DISMANTLE_FIELD_FOLLOW_UP':
        return Math.max(0, Math.round(Number(cs.activeIsolations ?? 0) / 3))
      case 'DISMANTLE_CLOSED_THIS_PERIOD':
        return Number(cs.monthlyDismantles ?? 0)
      case 'DIGITAL_LEADS':
        return Number(digital.digitalLeads ?? 0)
      case 'DIGITAL_ORDERS':
        return Number(digital.digitalOrders ?? 0)
      case 'DIGITAL_SURVEYS':
        return Number(digital.digitalSurveys ?? 0)
      case 'BILLING_OVERDUE':
        return Number(billing.overdueInvoices ?? 0)
      case 'BILLING_PARTIAL':
        return Number(billing.partialInvoices ?? 0)
      case 'BILLING_SUSPEND_CANDIDATE':
        return Number(billing.suspendCandidates ?? 0)
      case 'BILLING_OVERDUE_AMOUNT':
        return Number(billing.overdueAmount ?? 0)
      case 'HR_ACTIVE_EMPLOYEES':
        return Number(hr.employees ?? 0)
      case 'HR_TODAY_ATTENDANCE':
        return Number(hr.attendanceToday ?? 0)
      case 'HR_ACTIVE_LOANS':
        return Number(hr.activeLoans ?? 0)
      case 'HR_ATTENDANCE_RATE': {
        const employees = Number(hr.employees ?? 0)
        const attendanceToday = Number(hr.attendanceToday ?? 0)
        if (employees <= 0) return 0
        return (attendanceToday / employees) * 100
      }
      case 'INVENTORY_ACTIVE_ITEMS':
        return Number(inventory.activeItems ?? 0)
      case 'INVENTORY_MONTHLY_MOVEMENTS':
        return Number(inventory.currentMonthMovements ?? 0)
      case 'INVENTORY_PENDING_REQUESTS':
        return Number(inventory.pendingRequests ?? 0)
      default:
        return 0
    }
  }

  function resolveTemplateHint(templateKey: string) {
    const key = templateKey.trim().toUpperCase()

    switch (key) {
      case 'SALES_MONTHLY_ACTIVATIONS':
      case 'SALES_ACTIVATION_RATE': {
        const orders = Number(sales.monthlyOrders ?? 0)
        const activations = Number(sales.monthlyActivations ?? 0)
        const ratio = orders > 0 ? (activations / orders) * 100 : 0
        return `${formatNumber(activations)} aktivasi dari ${formatNumber(orders)} order (${formatPercentage(ratio)})`
      }
      case 'SUPPORT_SLA_OVERDUE':
      case 'SUPPORT_OVERDUE_RATE': {
        const openTickets = Number(noc.openTickets ?? 0)
        const overdueTickets = Number(noc.overdueTickets ?? 0)
        const ratio = openTickets > 0 ? (overdueTickets / openTickets) * 100 : 0
        return `${formatNumber(overdueTickets)} overdue dari ${formatNumber(openTickets)} ticket open (${formatPercentage(ratio)})`
      }
      case 'BILLING_OVERDUE':
      case 'BILLING_OVERDUE_AMOUNT': {
        const overdueInvoices = Number(billing.overdueInvoices ?? 0)
        const overdueAmount = Number(billing.overdueAmount ?? 0)
        return `${formatCurrency(overdueAmount)} outstanding pada ${formatNumber(overdueInvoices)} invoice overdue`
      }
      case 'HR_TODAY_ATTENDANCE':
      case 'HR_ATTENDANCE_RATE': {
        const employees = Number(hr.employees ?? 0)
        const attendanceToday = Number(hr.attendanceToday ?? 0)
        const ratio = employees > 0 ? (attendanceToday / employees) * 100 : 0
        return `${formatNumber(attendanceToday)} hadir dari ${formatNumber(employees)} employee aktif (${formatPercentage(ratio)})`
      }
      default:
        return undefined
    }
  }

  function resolveTemplateHintBadges(templateKey: string) {
    const key = templateKey.trim().toUpperCase()

    switch (key) {
      case 'SALES_MONTHLY_ACTIVATIONS':
      case 'SALES_ACTIVATION_RATE': {
        const orders = Number(sales.monthlyOrders ?? 0)
        const activations = Number(sales.monthlyActivations ?? 0)
        const ratio = orders > 0 ? (activations / orders) * 100 : 0
        return [`Aktivasi ${formatNumber(activations)}`, `Order ${formatNumber(orders)}`, `Rasio ${formatPercentage(ratio)}`]
      }
      case 'SUPPORT_SLA_OVERDUE':
      case 'SUPPORT_OVERDUE_RATE': {
        const openTickets = Number(noc.openTickets ?? 0)
        const overdueTickets = Number(noc.overdueTickets ?? 0)
        const ratio = openTickets > 0 ? (overdueTickets / openTickets) * 100 : 0
        return [`Overdue ${formatNumber(overdueTickets)}`, `Open ${formatNumber(openTickets)}`, `Rasio ${formatPercentage(ratio)}`]
      }
      case 'BILLING_OVERDUE':
      case 'BILLING_OVERDUE_AMOUNT': {
        const overdueInvoices = Number(billing.overdueInvoices ?? 0)
        const overdueAmount = Number(billing.overdueAmount ?? 0)
        return [`Outstanding ${formatCompactCurrency(overdueAmount)}`, `Invoice ${formatNumber(overdueInvoices)}`]
      }
      case 'HR_TODAY_ATTENDANCE':
      case 'HR_ATTENDANCE_RATE': {
        const employees = Number(hr.employees ?? 0)
        const attendanceToday = Number(hr.attendanceToday ?? 0)
        const ratio = employees > 0 ? (attendanceToday / employees) * 100 : 0
        return [`Hadir ${formatNumber(attendanceToday)}`, `Employee ${formatNumber(employees)}`, `Rasio ${formatPercentage(ratio)}`]
      }
      default:
        return undefined
    }
  }

  function formatKpiValue(value: number, metricType: string) {
    const resolvedType = metricType.trim().toUpperCase()
    if (resolvedType === 'PERCENTAGE') {
      return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`
    }

    return formatNumber(Number.isFinite(value) ? value : 0)
  }

  const cards: DashboardOperationalCard[] = [
    {
      key: 'SALES',
      title: 'Penjualan',
      description: 'Fokus pada PSB, order aktif, dan aktivasi subscription lintas marketing.',
      badge: 'Penjualan',
      href: '/sales',
      tone: 'border-sky-200 bg-sky-50 text-sky-900',
      metrics: [
        { label: 'Lead Aktif', value: formatNumber(Number(sales.activeLeads ?? 0)) },
        { label: 'PSB Periode Ini', value: formatNumber(Number(sales.monthlyOrders ?? 0)) },
        {
          label: 'Aktivasi',
          value: formatNumber(Number(sales.monthlyActivations ?? 0)),
          hint: resolveTemplateHint('SALES_MONTHLY_ACTIVATIONS'),
        },
      ],
    },
    {
      key: 'CS',
      title: 'CS',
      description: 'Fokus pada work order, isolir aktif, dan tindak lanjut pelanggan operasional.',
      badge: 'CS',
      href: '/support',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-900',
      metrics: [
        { label: 'Work Order Aktif', value: formatNumber(Number(cs.activeWorkOrders ?? 0)) },
        { label: 'Total Isolir', value: formatNumber(Number(cs.activeIsolations ?? 0)) },
        { label: 'Dismantle Periode Ini', value: formatNumber(Number(cs.monthlyDismantles ?? 0)) },
      ],
    },
    {
      key: 'NOC',
      title: 'NOC',
      description: 'Fokus pada penanganan trouble ticket, SLA, dan stabilitas operasi jaringan.',
      badge: 'NOC',
      href: '/support/tt',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      metrics: [
        { label: 'Trouble Ticket', value: formatNumber(Number(noc.openTickets ?? 0)) },
        {
          label: 'Ticket Overdue',
          value: formatNumber(Number(noc.overdueTickets ?? 0)),
          hint: resolveTemplateHint('SUPPORT_SLA_OVERDUE'),
        },
        { label: 'Ticket Periode Ini', value: formatNumber(Number(noc.monthlyOpenedTickets ?? 0)) },
      ],
    },
    {
      key: 'TT',
      title: 'Troubleshoots',
      description: 'Fokus pada queue TT, eskalasi, dan penyelesaian ticket yang lebih sempit dari monitoring NOC.',
      badge: 'Troubleshoots',
      href: '/support/tt',
      tone: 'border-orange-200 bg-orange-50 text-orange-900',
      metrics: [
        { label: 'TT Open', value: formatNumber(Number(noc.openTickets ?? 0)) },
        { label: 'Perlu Eskalasi', value: formatNumber(Math.max(0, Math.round(Number(noc.overdueTickets ?? 0)))) },
        { label: 'Siap Close', value: formatNumber(Math.max(0, Math.round(Number(noc.monthlyOpenedTickets ?? 0) / 3))) },
      ],
    },
    {
      key: 'DISMANTLE',
      title: 'Dismantle',
      description: 'Queue pembongkaran, tindak lanjut lapangan, dan penutupan catatan dismantle operasional.',
      badge: 'Dismantle',
      href: '/support/dismantle',
      tone: 'border-rose-200 bg-rose-50 text-rose-900',
      metrics: [
        { label: 'Queue Dismantle', value: formatNumber(Math.max(0, Math.round(Number(cs.activeIsolations ?? 0) / 2))) },
        { label: 'Follow Up Lapangan', value: formatNumber(Math.max(0, Math.round(Number(cs.activeIsolations ?? 0) / 3))) },
        { label: 'Close Periode Ini', value: formatNumber(Number(cs.monthlyDismantles ?? 0)) },
      ],
    },
    {
      key: 'DIGITAL',
      title: 'Creator Digital',
      description: 'Konten, campaign, dan lead digital yang mendukung pertumbuhan channel akuisisi.',
      badge: 'Creator Digital',
      href: '/sales',
      tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900',
      metrics: [
        { label: 'Lead Digital', value: formatNumber(Number(digital.digitalLeads ?? 0)) },
        { label: 'Order Digital', value: formatNumber(Number(digital.digitalOrders ?? 0)) },
        { label: 'Survey Digital', value: formatNumber(Number(digital.digitalSurveys ?? 0)) },
      ],
    },
    {
      key: 'BILLING',
      title: 'Billing',
      description: 'Kontrol invoice overdue, payment parsial, dan kandidat suspend pada koleksi berjalan.',
      badge: 'Billing',
      href: '/billing',
      tone: 'border-violet-200 bg-violet-50 text-violet-900',
      metrics: [
        {
          label: 'Invoice Overdue',
          value: formatNumber(Number(billing.overdueInvoices ?? 0)),
          hint: resolveTemplateHint('BILLING_OVERDUE'),
        },
        { label: 'Payment Parsial', value: formatNumber(Number(billing.partialInvoices ?? 0)) },
        { label: 'Suspend Candidate', value: formatNumber(Number(billing.suspendCandidates ?? 0)) },
      ],
    },
    {
      key: 'HR',
      title: 'HR',
      description: 'Monitor employee aktif, kehadiran hari ini, dan pinjaman karyawan yang masih berjalan.',
      badge: 'HR',
      href: '/hr',
      tone: 'border-violet-200 bg-violet-50 text-violet-900',
      metrics: [
        { label: 'Employee Aktif', value: formatNumber(Number(hr.employees ?? 0)) },
        {
          label: 'Absensi Hari Ini',
          value: formatNumber(Number(hr.attendanceToday ?? 0)),
          hint: resolveTemplateHint('HR_TODAY_ATTENDANCE'),
        },
        { label: 'Pinjaman Aktif', value: formatNumber(Number(hr.activeLoans ?? 0)) },
      ],
    },
    {
      key: 'INVENTORY',
      title: 'Inventory',
      description: 'Pantau item aktif, pergerakan stok, dan request gudang yang mendukung operasi lintas divisi.',
      badge: 'Inventory',
      href: '/inventory',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      metrics: [
        { label: 'Item Aktif', value: formatNumber(Number(inventory.activeItems ?? 0)) },
        { label: 'Mutasi Bulan Ini', value: formatNumber(Number(inventory.currentMonthMovements ?? 0)) },
        { label: 'Request Pending', value: formatNumber(Number(inventory.pendingRequests ?? 0)) },
      ],
    },
  ]

  const managerScope = await resolveDashboardKpiManagerScope(session)
  const kpiScopeReady =
    session.role !== 'SUPER_ADMIN' || (filters.kpiDivisionName && filters.kpiSubdivisionName)
  const kpiDivisionName =
    session.role === 'SUPER_ADMIN'
      ? String(filters.kpiDivisionName ?? '').trim()
      : String(managerScope.divisionName ?? '').trim()
  const kpiSubdivisionName =
    session.role === 'SUPER_ADMIN'
      ? String(filters.kpiSubdivisionName ?? '').trim()
      : String(managerScope.subdivisionName ?? '').trim()

  const mergedDefinitions = kpiScopeReady
    ? await listMergedDashboardKpiDefinitions({
        divisionName: kpiDivisionName || 'Pemasaran dan Pelayanan',
        subdivisionName: kpiSubdivisionName || 'Penjualan',
        activeOnly: true,
      }).catch(() => [])
    : []

  const definitionsByKey = new Map<string, typeof mergedDefinitions>()
  mergedDefinitions.forEach((definition) => {
    const key = definition.dashboardKey.trim().toUpperCase()
    const existing = definitionsByKey.get(key)
    if (existing) {
      existing.push(definition)
    } else {
      definitionsByKey.set(key, [definition])
    }
  })

  const nextCards = cards.map((card) => {
    const defs = definitionsByKey.get(card.key) ?? []
    if (defs.length === 0) return card

    const metrics = [...defs]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.metricLabel.localeCompare(b.metricLabel))
      .map((definition) => ({
        label: definition.metricLabel,
        value: formatKpiValue(resolveTemplateValue(definition.templateKey), definition.metricType),
        hint: resolveTemplateHint(definition.templateKey),
        hintBadges: resolveTemplateHintBadges(definition.templateKey),
        href:
          (definition.scopeType === 'SYSTEM'
            ? resolveDashboardKpiTemplateDrilldown(definition.templateKey) || definition.drilldownHref
            : definition.drilldownHref || resolveDashboardKpiTemplateDrilldown(definition.templateKey)) || undefined,
      }))

    return { ...card, metrics }
  })

  return filters.division === 'ALL'
    ? nextCards
    : nextCards.filter((card) => card.key === filters.division)
}

async function getReviewDbDashboardAlerts(params: {
  role: AppRole
  summary: DashboardSummary
  approvalPending: number
}): Promise<DashboardAlertItem[]> {
  const items: DashboardAlertItem[] = []

  if (params.role === 'SUPER_ADMIN') {
    const importRows = await runReviewDbQuery<DashboardAlertImportBatchRow>(
      `
        SELECT
          batch_code AS batchCode,
          import_status AS importStatus,
          total_rows AS totalRows,
          updated_at AS updatedAt
        FROM staging_import_batches
        WHERE COALESCE(UPPER(TRIM(import_status)), 'DRAFT') NOT IN ('IMPORTED')
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `
    )

    const importBatch = importRows[0]
    if (importBatch) {
      items.push({
        id: `alert-import-${importBatch.batchCode}`,
        domain: 'Import',
        severity: 'critical',
        title: `Batch ${importBatch.batchCode} masih di status ${importBatch.importStatus}`,
        detail: `${formatNumber(Number(importBatch.totalRows ?? 0))} row masih menunggu review/transform akhir dan bisa memblok kesiapan domain lain.`,
        impactSummary:
          'Batch yang tertahan menahan konsistensi data customer, billing, dan support sehingga dashboard lintas domain belum membaca hasil final.',
        nextStep:
          'Review batch ini lebih dulu, tuntaskan validasi/transform akhir, lalu cek ulang modul hilir yang bergantung pada data import terbaru.',
        affectedModules: ['Customer', 'Billing', 'Support'],
        href: '/import',
        actionLabel: 'Review Import',
      })
    }
  }

  if (params.summary.overdueInvoices > 0) {
    items.push({
      id: 'alert-billing-overdue',
      domain: 'Billing',
      severity: params.summary.overdueInvoices >= 25 ? 'critical' : 'high',
      title: `${formatNumber(params.summary.overdueInvoices)} invoice overdue memerlukan tindak lanjut`,
      detail: 'Backlog billing overdue memengaruhi collection, suspend candidate, dan pemulihan layanan customer.',
      impactSummary:
        'Saat overdue menumpuk, support ikut menerima tekanan isolir/reconnect dan customer berisiko masuk ke jalur follow-up lebih agresif.',
      nextStep:
        'Tindak invoice overdue terbesar lebih dulu, putuskan promise to pay atau suspend, lalu sinkronkan kasus yang berdampak ke isolir dan reconnect.',
      affectedModules: ['Support', 'Customer', 'Billing'],
      href: '/billing',
      actionLabel: 'Tindak Billing',
    })
  }

  if (params.summary.troubleTickets > 0) {
    items.push({
      id: 'alert-support-ticket',
      domain: 'Support',
      severity: params.summary.troubleTickets >= 20 ? 'high' : 'medium',
      title: `${formatNumber(params.summary.troubleTickets)} trouble ticket open masih aktif`,
      detail: 'Trouble ticket terbuka perlu dijaga agar tidak menumpuk ke jalur SLA, isolir, atau eskalasi NOC.',
      impactSummary:
        'Backlog TT yang tidak cepat ditutup akan merembet ke SLA, follow-up customer, dan keputusan layanan yang ikut memengaruhi billing.',
      nextStep:
        'Masuk ke lane ticket prioritas tertinggi, eksekusi update progress atau eskalasi, lalu close ticket yang memang sudah matang.',
      affectedModules: ['NOC', 'CS', 'Billing'],
      href: '/support/tt',
      actionLabel: 'Buka Ticket',
    })
  }

  if (params.summary.isolations > 0) {
    items.push({
      id: 'alert-support-isolation',
      domain: 'Support/Billing',
      severity: params.summary.isolations >= 10 ? 'high' : 'medium',
      title: `${formatNumber(params.summary.isolations)} pelanggan isolir aktif perlu sinkron lintas domain`,
      detail: 'Kasus isolir aktif biasanya membutuhkan sinkron billing, follow-up customer, restore, atau keputusan dismantle.',
      impactSummary:
        'Isolir aktif memengaruhi kualitas layanan customer, collection status, dan keputusan restore/dismantle yang menyentuh support serta sales lapangan.',
      nextStep:
        'Audit daftar isolir aktif, selaraskan keputusan billing dengan status support, lalu tetapkan apakah kasus harus direstore, difollow-up, atau didismantle.',
      affectedModules: ['Billing', 'Support', 'Sales'],
      href: '/support/isolations',
      actionLabel: 'Lihat Isolir',
    })
  }

  if (params.approvalPending > 0) {
    items.push({
      id: 'alert-daily-approval',
      domain: 'HR/Daily Activity',
      severity: params.approvalPending >= 10 ? 'high' : 'medium',
      title: `${formatNumber(params.approvalPending)} approval Daily Activity masih menunggu`,
      detail: 'Approval yang tertahan memengaruhi monitoring performa divisi dan ritme closing aktivitas harian.',
      impactSummary:
        'Approval yang tertahan membuat dashboard kehilangan konteks performa terbaru sehingga supervisi lintas divisi dan audit aktivitas ikut tertunda.',
      nextStep:
        'Selesaikan approval per divisi yang paling menumpuk lebih dulu, lalu gunakan hasilnya untuk menormalkan ritme monitoring dan closing harian.',
      affectedModules: ['HR', 'Dashboard', 'Daily Activity'],
      href: '/dashboard/daily-activity',
      actionLabel: 'Buka Approval',
    })
  }

  return items.slice(0, 4)
}

function getTodayIsoDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

async function getReviewDbDailyActivityApprovalQueue(session: AppSession): Promise<DashboardDailyActivityApprovalQueue> {
  const role = session.role
  const today = getTodayIsoDate()
  const month = today.slice(0, 7)

  const whereDivision = role === 'SUPER_ADMIN' ? '' : 'AND COALESCE(division_name, \'\') = ?'
  const whereSubdivision = role === 'SUPER_ADMIN' ? '' : 'AND COALESCE(subdivision_name, \'\') = ?'
  const userOrg = role === 'SUPER_ADMIN' ? null : await resolveDailyActivityOrgContext(session)
  const args = role === 'SUPER_ADMIN' ? [] : [userOrg?.divisionName ?? '', userOrg?.subdivisionName ?? '']

  const pendingRows = await runReviewDbQuery<DailyActivityApprovalPendingRow>(
    `
      SELECT
        id AS activityId,
        activity_code AS activityCode,
        DATE_FORMAT(activity_date, '%Y-%m-%d') AS activityDate,
        task_title AS taskTitle,
        planned_by AS plannedBy,
        division_name AS divisionName,
        subdivision_name AS subdivisionName,
        execution_status AS executionStatus
      FROM daily_activity_items
      WHERE approval_status = 'PENDING'
        AND execution_status IN ('DONE', 'PENDING')
        AND activity_date >= DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY)
        ${whereDivision}
        ${whereSubdivision}
      ORDER BY activity_date DESC, id DESC
      LIMIT 6
    `,
    args,
  )

  const rows = await runReviewDbQuery<DailyActivityApprovalQueueRow>(
    `
      SELECT
        COALESCE(division_name, '') AS divisionName,
        COALESCE(subdivision_name, '') AS subdivisionName,
        COUNT(*) AS pendingCount
      FROM daily_activity_items
      WHERE approval_status = 'PENDING'
        AND execution_status IN ('DONE', 'PENDING')
        AND activity_date >= DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY)
        ${whereDivision}
        ${whereSubdivision}
      GROUP BY COALESCE(division_name, ''), COALESCE(subdivision_name, '')
      ORDER BY pendingCount DESC, divisionName ASC, subdivisionName ASC
      LIMIT 8
    `,
    args,
  )

  const items: DashboardDailyActivityApprovalQueueItem[] = rows.map((row) => ({
    divisionName: String(row.divisionName ?? ''),
    subdivisionName: String(row.subdivisionName ?? ''),
    pendingCount: Number(row.pendingCount ?? 0),
  }))
  const totalPending = items.reduce((acc, item) => acc + item.pendingCount, 0)
  const pendingItems: DashboardDailyActivityPendingApprovalItem[] = pendingRows.map((row) => ({
    activityId: Number(row.activityId ?? 0),
    activityCode: String(row.activityCode ?? ''),
    activityDate: String(row.activityDate ?? ''),
    taskTitle: String(row.taskTitle ?? ''),
    plannedBy: String(row.plannedBy ?? ''),
    divisionName: String(row.divisionName ?? ''),
    subdivisionName: String(row.subdivisionName ?? ''),
    executionStatus: String(row.executionStatus ?? ''),
  }))

  const hrefParts = [
    `month=${encodeURIComponent(month)}`,
    `approvalStatus=PENDING`,
    role === 'SUPER_ADMIN' ? null : `divisionName=${encodeURIComponent(userOrg?.divisionName ?? '')}`,
    role === 'SUPER_ADMIN' ? null : `subdivisionName=${encodeURIComponent(userOrg?.subdivisionName ?? '')}`,
  ].filter(Boolean)

  return {
    totalPending,
    items,
    pendingItems,
    href: `/dashboard/daily-activity?${hrefParts.join('&')}`,
  }
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

async function getReviewDbImportBatchActivities() {
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
    return [] as ActivityItem[]
  }

  return rows.map<ActivityItem>((row) => ({
    title: `Batch ${row.batchCode}`,
    detail: `${row.sourceSystem} • ${row.importStatus} • ${formatNumber(Number(row.totalRows ?? 0))} row review.`,
    at: formatActivityTime(row.updatedAt),
  }))
}

async function getReviewDbImportAuditTimeline(limit = 6): Promise<TimelineActivityItem[]> {
  await ensureImportBatchActionTable()

  const rows = await runReviewDbQuery<ImportBatchActionActivityRow>(
    `
      SELECT
        bia.id AS id,
        bib.batch_code AS batchCode,
        bib.source_system AS sourceSystem,
        bia.action_type AS actionType,
        bia.action_status AS actionStatus,
        bia.actor_name AS actorName,
        bia.detail_text AS detailText,
        bia.created_at AS createdAt
      FROM staging_import_batch_actions bia
      JOIN staging_import_batches bib
        ON bib.id = bia.batch_id
      ORDER BY bia.created_at DESC, bia.id DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => ({
    title: `Import ${String(row.actionType ?? 'INFO').trim().toUpperCase()} • ${row.batchCode}`,
    detail: [
      row.sourceSystem,
      String(row.actionStatus ?? 'INFO').trim().toUpperCase(),
      row.actorName?.trim() ? `oleh ${row.actorName.trim()}` : null,
      row.detailText?.trim() || 'Aksi import batch tercatat di review DB.',
    ]
      .filter(Boolean)
      .join(' • '),
    happenedAt: String(row.createdAt),
  }))
}

function formatSupportAuditTitle(actionType: string, entityRef: string, customerName: string) {
  const normalized = actionType.trim().toUpperCase()
  if (normalized === 'TT_CREATE') {
    return `Support Ticket Dibuat • ${entityRef}`
  }
  if (normalized === 'TT_CLOSE') {
    return `Support Ticket Ditutup • ${entityRef}`
  }
  if (normalized === 'ISOLATION_CREATE') {
    return `Isolir Dibuat • ${customerName || entityRef}`
  }
  if (normalized === 'ISOLATION_RESTORE') {
    return `Isolir Direstorasi • ${customerName || entityRef}`
  }
  if (normalized === 'DISMANTLE') {
    return `Dismantle Diproses • ${customerName || entityRef}`
  }

  return `Support Activity • ${customerName || entityRef}`
}

async function getReviewDbSupportAuditTimeline(limit = 8): Promise<TimelineActivityItem[]> {
  const rows = await runReviewDbQuery<SupportAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'TT_CREATE' AS actionType,
          ticket_code AS entityRef,
          customer_name AS customerName,
          notes AS detailText,
          opened_at AS happenedAt
        FROM support_trouble_tickets
        WHERE notes IS NOT NULL
          AND notes <> ''
          AND notes LIKE '[Review Ticket]%'

        UNION ALL

        SELECT
          'TT_CLOSE' AS actionType,
          ticket_code AS entityRef,
          customer_name AS customerName,
          close_notes AS detailText,
          closed_at AS happenedAt
        FROM support_trouble_tickets
        WHERE closed_at IS NOT NULL
          AND close_notes IS NOT NULL
          AND close_notes <> ''
          AND close_notes LIKE '[Closed via web]%'

        UNION ALL

        SELECT
          'ISOLATION_CREATE' AS actionType,
          CONCAT('ISOLIR-', id) AS entityRef,
          customer_name AS customerName,
          reason AS detailText,
          isolation_date AS happenedAt
        FROM support_isolations
        WHERE reason IS NOT NULL
          AND reason <> ''
          AND reason LIKE '[Review Isolir]%'

        UNION ALL

        SELECT
          'ISOLATION_RESTORE' AS actionType,
          CONCAT('ISOLIR-', id) AS entityRef,
          customer_name AS customerName,
          close_note AS detailText,
          restoration_date AS happenedAt
        FROM support_isolations
        WHERE restoration_date IS NOT NULL
          AND close_note IS NOT NULL
          AND close_note <> ''
          AND close_note LIKE '[Restored via web]%'

        UNION ALL

        SELECT
          'DISMANTLE' AS actionType,
          CONCAT('DISMANTLE-', id) AS entityRef,
          customer_name AS customerName,
          close_note AS detailText,
          closed_at AS happenedAt
        FROM support_dismantle_history
        WHERE closed_at IS NOT NULL
          AND close_note IS NOT NULL
          AND close_note <> ''
          AND close_note LIKE '[Dismantled via web]%'
      ) support_audits
      ORDER BY happenedAt DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => {
    const entityRef = String(row.entityRef ?? '').trim() || 'SUPPORT'
    const customerName = String(row.customerName ?? '').trim()
    return {
      title: formatSupportAuditTitle(String(row.actionType ?? ''), entityRef, customerName),
      detail:
        row.detailText?.trim() ||
        `Aktivitas support ${String(row.actionType ?? '').trim().toUpperCase()} tercatat untuk ${customerName || entityRef}.`,
      happenedAt: String(row.happenedAt),
    }
  })
}

function formatInventoryAuditTitle(actionType: string, entityRef: string, itemCode: string, itemName: string) {
  const label = itemCode || itemName || entityRef
  const normalized = actionType.trim().toUpperCase()

  if (normalized === 'REQUEST_CREATE') {
    return `Inventory Request Dibuat • ${entityRef}`
  }
  if (normalized === 'REQUEST_UPDATE') {
    return `Inventory Request Diproses • ${entityRef}`
  }
  if (normalized === 'RECEIPT_IN') {
    return `Barang Masuk Dicatat • ${label}`
  }
  if (normalized === 'LOAN_OUT') {
    return `Pinjaman Inventory Dibuat • ${entityRef}`
  }
  if (normalized === 'LOAN_RETURN') {
    return `Pengembalian Inventory Diproses • ${entityRef}`
  }

  return `Inventory Activity • ${label}`
}

async function getReviewDbInventoryAuditTimeline(limit = 8): Promise<TimelineActivityItem[]> {
  const rows = await runReviewDbQuery<InventoryAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'REQUEST_CREATE' AS actionType,
          iir.request_code AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          iir.request_qty AS qty,
          iir.requested_subdivision AS statusText,
          iir.requested_by AS actorName,
          iir.request_notes AS detailText,
          iir.requested_at AS happenedAt
        FROM inventory_item_requests iir
        JOIN inventory_items ii
          ON ii.id = iir.inventory_item_id

        UNION ALL

        SELECT
          'REQUEST_UPDATE' AS actionType,
          iir.request_code AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          iir.request_qty AS qty,
          iir.request_status AS statusText,
          iir.processed_by AS actorName,
          iir.request_notes AS detailText,
          iir.processed_at AS happenedAt
        FROM inventory_item_requests iir
        JOIN inventory_items ii
          ON ii.id = iir.inventory_item_id
        WHERE iir.processed_at IS NOT NULL
          AND iir.processed_by IS NOT NULL
          AND TRIM(iir.processed_by) <> ''
          AND UPPER(TRIM(iir.request_status)) <> 'REQUEST'

        UNION ALL

        SELECT
          'RECEIPT_IN' AS actionType,
          COALESCE(ism.reference_no, CONCAT('MOVE-', ism.id)) AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ism.qty AS qty,
          ism.movement_type AS statusText,
          NULL AS actorName,
          ism.notes AS detailText,
          ism.movement_at AS happenedAt
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        WHERE ism.movement_type = 'IN'
          AND ism.notes IS NOT NULL
          AND ism.notes <> ''
          AND ism.notes LIKE '[BARANG MASUK]%'

        UNION ALL

        SELECT
          'LOAN_OUT' AS actionType,
          COALESCE(ism.reference_no, CONCAT('MOVE-', ism.id)) AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ism.qty AS qty,
          ism.movement_type AS statusText,
          NULL AS actorName,
          ism.notes AS detailText,
          ism.movement_at AS happenedAt
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        WHERE ism.movement_type = 'OUT'
          AND ism.notes IS NOT NULL
          AND ism.notes <> ''
          AND ism.notes LIKE '[PINJAM]%'

        UNION ALL

        SELECT
          'LOAN_RETURN' AS actionType,
          COALESCE(ism.reference_no, CONCAT('MOVE-', ism.id)) AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ism.qty AS qty,
          ism.movement_type AS statusText,
          NULL AS actorName,
          ism.notes AS detailText,
          ism.movement_at AS happenedAt
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        WHERE ism.movement_type = 'IN'
          AND ism.notes IS NOT NULL
          AND ism.notes <> ''
          AND ism.notes LIKE '[KEMBALI]%'
      ) inventory_audits
      ORDER BY happenedAt DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => {
    const entityRef = String(row.entityRef ?? '').trim() || 'INVENTORY'
    const itemCode = String(row.itemCode ?? '').trim()
    const itemName = String(row.itemName ?? '').trim()
    const qty = Number(row.qty ?? 0)
    const statusText = String(row.statusText ?? '').trim()
    const actorName = String(row.actorName ?? '').trim()
    const detail =
      row.detailText?.trim() ||
      [
        itemCode || itemName || entityRef,
        Number.isFinite(qty) && qty > 0 ? `${qty.toLocaleString('id-ID')} unit` : null,
        statusText || null,
        actorName ? `oleh ${actorName}` : null,
      ]
        .filter(Boolean)
        .join(' • ')

    return {
      title: formatInventoryAuditTitle(String(row.actionType ?? ''), entityRef, itemCode, itemName),
      detail,
      happenedAt: String(row.happenedAt),
    }
  })
}

function formatBillingAuditTitle(actionType: string, entityRef: string, customerName: string) {
  const normalized = actionType.trim().toUpperCase()
  if (normalized === 'INVOICE_CREATE') {
    return `Invoice Dibuat • ${entityRef}`
  }
  if (normalized === 'INVOICE_CANCEL') {
    return `Invoice Dibatalkan • ${entityRef}`
  }
  if (normalized === 'PAYMENT_CREATE') {
    return `Payment Entry Dicatat • ${entityRef}`
  }
  if (normalized === 'COLLECTION_ACTION') {
    return `Collection Action Dicatat • ${entityRef}`
  }

  return `Billing Activity • ${customerName || entityRef}`
}

async function getReviewDbBillingAuditTimeline(limit = 8): Promise<TimelineActivityItem[]> {
  const rows = await runReviewDbQuery<BillingAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'INVOICE_CREATE' AS actionType,
          bi.invoice_no AS entityRef,
          c.full_name AS customerName,
          bi.total_amount AS amount,
          bi.invoice_status AS statusText,
          bi.notes AS detailText,
          bi.created_at AS happenedAt
        FROM billing_invoices bi
        JOIN service_subscriptions ss
          ON ss.id = bi.subscription_id
        JOIN crm_customers c
          ON c.id = ss.customer_id
        WHERE bi.notes IS NOT NULL
          AND bi.notes <> ''
          AND bi.notes LIKE '[Review Invoice]%'

        UNION ALL

        SELECT
          'INVOICE_CANCEL' AS actionType,
          bi.invoice_no AS entityRef,
          c.full_name AS customerName,
          bi.total_amount AS amount,
          bi.invoice_status AS statusText,
          bi.notes AS detailText,
          bi.updated_at AS happenedAt
        FROM billing_invoices bi
        JOIN service_subscriptions ss
          ON ss.id = bi.subscription_id
        JOIN crm_customers c
          ON c.id = ss.customer_id
        WHERE bi.notes IS NOT NULL
          AND bi.notes <> ''
          AND bi.notes LIKE '%[Status Update]%'
          AND bi.invoice_status = 'CANCELLED'

        UNION ALL

        SELECT
          'PAYMENT_CREATE' AS actionType,
          bp.payment_no AS entityRef,
          c.full_name AS customerName,
          bp.amount AS amount,
          bp.payment_method AS statusText,
          bp.notes AS detailText,
          bp.payment_date AS happenedAt
        FROM billing_payments bp
        JOIN billing_invoices bi
          ON bi.id = bp.invoice_id
        JOIN service_subscriptions ss
          ON ss.id = bi.subscription_id
        JOIN crm_customers c
          ON c.id = ss.customer_id
        WHERE bp.notes IS NOT NULL
          AND bp.notes <> ''
          AND bp.notes LIKE '[Review Payment]%'

        UNION ALL

        SELECT
          'COLLECTION_ACTION' AS actionType,
          bi.invoice_no AS entityRef,
          c.full_name AS customerName,
          bi.total_amount AS amount,
          bca.action_type AS statusText,
          bca.notes AS detailText,
          bca.action_at AS happenedAt
        FROM billing_collection_actions bca
        JOIN billing_invoices bi
          ON bi.id = bca.invoice_id
        JOIN service_subscriptions ss
          ON ss.id = bi.subscription_id
        JOIN crm_customers c
          ON c.id = ss.customer_id
        WHERE bca.notes IS NOT NULL
          AND bca.notes <> ''
          AND bca.notes LIKE '[Review Action]%'
      ) billing_audits
      ORDER BY happenedAt DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => {
    const entityRef = String(row.entityRef ?? '').trim() || 'BILLING'
    const customerName = String(row.customerName ?? '').trim()
    const amount = Number(row.amount ?? 0)
    const statusText = String(row.statusText ?? '').trim()

    return {
      title: formatBillingAuditTitle(String(row.actionType ?? ''), entityRef, customerName),
      detail:
        row.detailText?.trim() ||
        [
          customerName || entityRef,
          Number.isFinite(amount) && amount > 0 ? `Rp ${amount.toLocaleString('id-ID')}` : null,
          statusText || null,
        ]
          .filter(Boolean)
          .join(' • '),
      happenedAt: String(row.happenedAt),
    }
  })
}

function formatSalesAuditTitle(actionType: string, entityRef: string, customerName: string) {
  const normalized = actionType.trim().toUpperCase()
  if (normalized === 'LEAD_CREATE') {
    return `Lead Dibuat • ${customerName || entityRef}`
  }
  if (normalized === 'SURVEY_CREATE') {
    return `Survey Dibuat • ${entityRef}`
  }
  if (normalized === 'ORDER_CREATE') {
    return `Sales Order Dibuat • ${entityRef}`
  }
  if (normalized === 'WORK_ORDER_CREATE') {
    return `Work Order Dibuat • ${entityRef}`
  }
  if (normalized === 'SUBSCRIPTION_ACTIVATE') {
    return `Subscription Diaktivasi • ${entityRef}`
  }

  return `Sales Activity • ${customerName || entityRef}`
}

function formatHrAuditTitle(actionType: string, targetRef: string) {
  const normalized = actionType.trim().toUpperCase()
  if (normalized === 'EMPLOYEE_CREATE') {
    return `Employee HR Dibuat • ${targetRef}`
  }
  if (normalized === 'EMPLOYEE_ARCHIVE') {
    return `Employee HR Diarsipkan • ${targetRef}`
  }
  if (normalized === 'EMPLOYEE_REACTIVATE') {
    return `Employee HR Diaktifkan Kembali • ${targetRef}`
  }
  if (normalized === 'EMPLOYEE_FACE_REFERENCE_UPSERT') {
    return `Baseline Wajah Employee Disimpan • ${targetRef}`
  }
  if (normalized === 'ATTENDANCE_CREATE') {
    return `Attendance HR Dicatat • ${targetRef}`
  }
  if (normalized === 'ATTENDANCE_UPDATE') {
    return `Attendance HR Dikoreksi • ${targetRef}`
  }
  if (normalized === 'ATTENDANCE_GEOFENCE_CONFIG') {
    return `Geofence Attendance Diperbarui • ${targetRef}`
  }
  if (normalized === 'ATTENDANCE_FACE_CONFIG') {
    return `Face Attendance Diperbarui • ${targetRef}`
  }
  if (normalized === 'ATTENDANCE_FACE_REVIEW') {
    return `Review Face Attendance • ${targetRef}`
  }
  if (normalized === 'ATTENDANCE_FACE_RETAKE_QUEUE') {
    return `Retake Face Attendance • ${targetRef}`
  }
  if (normalized === 'LOAN_CREATE') {
    return `Loan HR Dibuat • ${targetRef}`
  }
  if (normalized === 'LOAN_UPDATE') {
    return `Status Loan HR Diperbarui • ${targetRef}`
  }
  if (normalized === 'LOAN_VOID') {
    return `Loan HR Dibatalkan • ${targetRef}`
  }
  if (normalized === 'SALARY_SLIP_CREATE') {
    return `Slip Gaji Dibuat • ${targetRef}`
  }
  if (normalized === 'SALARY_SLIP_RELEASE') {
    return `Slip Gaji Dirilis • ${targetRef}`
  }
  if (normalized === 'SALARY_SLIP_VOID') {
    return `Slip Gaji Di-void • ${targetRef}`
  }

  return `HR Activity • ${targetRef}`
}

async function getReviewDbSalesAuditTimeline(limit = 8): Promise<TimelineActivityItem[]> {
  const rows = await runReviewDbQuery<SalesAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'LEAD_CREATE' AS actionType,
          CONCAT('LEAD-', sl.id) AS entityRef,
          sl.customer_name AS customerName,
          sl.status AS statusText,
          sl.notes AS detailText,
          sl.created_at AS happenedAt
        FROM sales_leads sl
        WHERE sl.notes IS NOT NULL
          AND sl.notes <> ''
          AND sl.notes LIKE '[Review Lead]%'

        UNION ALL

        SELECT
          'SURVEY_CREATE' AS actionType,
          ss.survey_no AS entityRef,
          sl.customer_name AS customerName,
          ss.survey_status AS statusText,
          ss.technical_notes AS detailText,
          COALESCE(ss.scheduled_at, ss.created_at) AS happenedAt
        FROM sales_surveys ss
        LEFT JOIN sales_leads sl
          ON sl.id = ss.lead_id
        WHERE ss.technical_notes IS NOT NULL
          AND ss.technical_notes <> ''
          AND ss.technical_notes LIKE '[Review Survey]%'

        UNION ALL

        SELECT
          'ORDER_CREATE' AS actionType,
          so.order_no AS entityRef,
          sl.customer_name AS customerName,
          so.status AS statusText,
          so.notes AS detailText,
          so.request_date AS happenedAt
        FROM sales_orders so
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        WHERE so.notes IS NOT NULL
          AND so.notes <> ''
          AND so.notes LIKE '[Review Sales Order]%'

        UNION ALL

        SELECT
          'WORK_ORDER_CREATE' AS actionType,
          swo.work_order_no AS entityRef,
          COALESCE(sl.customer_name, c.full_name) AS customerName,
          swo.status AS statusText,
          swo.notes AS detailText,
          COALESCE(swo.scheduled_at, swo.created_at) AS happenedAt
        FROM service_work_orders swo
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE swo.notes IS NOT NULL
          AND swo.notes <> ''
          AND swo.notes LIKE '[Review Work Order]%'

        UNION ALL

        SELECT
          'SUBSCRIPTION_ACTIVATE' AS actionType,
          swo.work_order_no AS entityRef,
          COALESCE(sl.customer_name, c.full_name) AS customerName,
          'COMPLETED' AS statusText,
          swo.notes AS detailText,
          COALESCE(swo.completed_at, swo.updated_at) AS happenedAt
        FROM service_work_orders swo
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE swo.notes IS NOT NULL
          AND swo.notes <> ''
          AND swo.notes LIKE '%[Activation]%'
      ) sales_audits
      ORDER BY happenedAt DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map((row) => {
    const entityRef = String(row.entityRef ?? '').trim() || 'SALES'
    const customerName = String(row.customerName ?? '').trim()
    const statusText = String(row.statusText ?? '').trim()
    return {
      title: formatSalesAuditTitle(String(row.actionType ?? ''), entityRef, customerName),
      detail:
        row.detailText?.trim() ||
        [customerName || entityRef, statusText || null].filter(Boolean).join(' • '),
      happenedAt: String(row.happenedAt),
    }
  })
}

async function getReviewDbActivities(role: AppRole) {
  if (role !== 'SUPER_ADMIN') {
    const importActivities = await getReviewDbImportBatchActivities()
    return importActivities.length ? importActivities : dashboardActivities
  }

  const [importAudits, supportAudits, inventoryAudits, billingAudits, salesAudits, hrAudits, userAudits, permissionAudits, rolePermissionAudits] = await Promise.all([
    getReviewDbImportAuditTimeline(8),
    getReviewDbSupportAuditTimeline(8),
    getReviewDbInventoryAuditTimeline(8),
    getReviewDbBillingAuditTimeline(8),
    getReviewDbSalesAuditTimeline(8),
    getRecentHrAudits(8),
    getRecentAuthUserAudits(8),
    getRecentAuthPermissionAudits(8),
    getRecentAuthRolePermissionAudits(8),
  ])

  const timeline: TimelineActivityItem[] = [
    ...importAudits,
    ...supportAudits,
    ...inventoryAudits,
    ...billingAudits,
    ...salesAudits,
    ...hrAudits.map((item) => ({
      title: formatHrAuditTitle(item.actionType, item.targetRef),
      detail: [`oleh ${item.actor}`, item.detail].filter(Boolean).join(' • '),
      happenedAt: item.happenedAt,
    })),
    ...userAudits.map((item) => ({
      title: `Users ${item.actionType} • ${item.targetUser}`,
      detail: [`oleh ${item.actor}`, item.detail].filter(Boolean).join(' • '),
      happenedAt: item.happenedAt,
    })),
    ...permissionAudits.map((item) => ({
      title: `Access Permission ${item.actionType} • ${item.target}`,
      detail: [`oleh ${item.actor}`, item.detail].filter(Boolean).join(' • '),
      happenedAt: item.happenedAt,
    })),
    ...rolePermissionAudits.map((item) => ({
      title: `Access Role ${item.actionType} • ${item.target}`,
      detail: [`oleh ${item.actor}`, item.detail].filter(Boolean).join(' • '),
      happenedAt: item.happenedAt,
    })),
  ]
    .sort((left, right) => getActivitySortTime(right.happenedAt) - getActivitySortTime(left.happenedAt))
    .slice(0, 10)

  if (!timeline.length) {
    const importActivities = await getReviewDbImportBatchActivities()
    return importActivities.length ? importActivities : dashboardActivities
  }

  return timeline.map<ActivityItem>((item) => ({
    title: item.title,
    detail: item.detail,
    at: formatActivityTime(item.happenedAt),
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

export async function getDashboardPageData(session: AppSession, filters?: DashboardPageFilters) {
  const role = session.role
  const source = getDataSourceSnapshot()
  const now = new Date()
  const resolvedFilters =
    filters ??
    ({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      division: 'ALL',
    } satisfies DashboardPageFilters)

  if (source.effectiveMode !== 'review-db') {
    const mockDailyActivityApprovalQueue = {
      totalPending: 0,
      items: [],
      pendingItems: [],
      href: '/dashboard/daily-activity?approvalStatus=PENDING',
    } satisfies DashboardDailyActivityApprovalQueue

    return {
      source,
      summary: dashboardSummary,
      metrics: dashboardMetrics,
      roleQueues: getMockRoleQueues(role, dashboardSummary),
      worklist: getMockWorklist(role),
      operationalCards: buildMockOperationalCards(dashboardSummary, resolvedFilters),
      dashboardAlerts: buildMockDashboardAlerts({
        summary: dashboardSummary,
        approvalPending: mockDailyActivityApprovalQueue.totalPending,
        role,
      }),
      dailyActivityApprovalQueue: mockDailyActivityApprovalQueue,
      activities: dashboardActivities,
    }
  }

  try {
    const summary = await getReviewDbDashboardSummary()
    const activities = await getReviewDbActivities(role)
    const worklist = await getReviewDbWorklist(role)
    const operationalCards = await getReviewDbOperationalCards(session, resolvedFilters)
    const dailyActivityApprovalQueue = await getReviewDbDailyActivityApprovalQueue(session)
    const dashboardAlerts = await getReviewDbDashboardAlerts({
      role,
      summary,
      approvalPending: dailyActivityApprovalQueue.totalPending,
    })

    return {
      source,
      summary,
      metrics: buildMetrics(summary),
      roleQueues: buildRoleQueues(role, summary),
      worklist: worklist.length ? worklist : getMockWorklist(role),
      operationalCards,
      dashboardAlerts,
      dailyActivityApprovalQueue,
      activities,
    }
  } catch (error) {
    const fallbackDailyActivityApprovalQueue = {
      totalPending: 0,
      items: [],
      pendingItems: [],
      href: '/dashboard/daily-activity?approvalStatus=PENDING',
    } satisfies DashboardDailyActivityApprovalQueue

    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      summary: dashboardSummary,
      metrics: dashboardMetrics,
      roleQueues: getMockRoleQueues(role, dashboardSummary),
      worklist: getMockWorklist(role),
      operationalCards: buildMockOperationalCards(dashboardSummary, resolvedFilters),
      dashboardAlerts: buildMockDashboardAlerts({
        summary: dashboardSummary,
        approvalPending: fallbackDailyActivityApprovalQueue.totalPending,
        role,
      }),
      dailyActivityApprovalQueue: fallbackDailyActivityApprovalQueue,
      activities: dashboardActivities,
    }
  }
}
