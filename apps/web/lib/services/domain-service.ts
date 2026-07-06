import { canPerformAction } from '@/lib/access-control'
import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { domainPages } from '@/lib/mock-domains'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import type {
  AccessAction,
  AppRole,
  DomainCapability,
  DomainKey,
  DomainPageContent,
  DomainReviewSection,
} from '@/lib/types'

const capabilityLabels: Record<AccessAction, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  approve: 'Approve',
  export: 'Export',
  manage: 'Manage',
}

const capabilityOrder: AccessAction[] = ['view', 'create', 'update', 'approve', 'export', 'manage']

type DomainStatsRow = {
  salesLeads: number
  salesOrders: number
  pendingSurveys: number
  customers: number
  activeSubscriptions: number
  customerAddresses: number
  openTroubleTickets: number
  preventiveOpen: number
  activeIsolations: number
  inventoryItems: number
  currentMonthMovements: number
  odpCount: number
  employees: number
  attendanceToday: number
  activeLoans: number
  overdueInvoices: number
  partialInvoices: number
  suspendCandidates: number
}

type ReviewDbSupportTicketRow = {
  ticketCode: string
  customerName: string
  customerUser: string | null
  ticketType: string
  status: string
  notes: string | null
  openedAt: string | Date
}

type ReviewDbSupportIsolationRow = {
  isolationId: number
  customerName: string
  radboxName: string | null
  customerPhone: string | null
  marketingName: string | null
  status: string
  reason: string | null
  isolationDate: string | Date
}

type ReviewDbSupportSlaRow = {
  troubleType: string
  durationDays: number
  updatedAt: string | Date
}

type ReviewDbSupportDismantleRow = {
  dismantleId: number
  customerName: string
  radboxName: string | null
  customerPhone: string | null
  marketingName: string | null
  closeNote: string | null
  closedAt: string | Date
}

type ReviewDbCustomerRow = {
  customerCode: string
  customerName: string
  customerType: string
  phone: string | null
  email: string | null
  address: string | null
}

type ReviewDbSubscriptionRow = {
  serviceNo: string
  customerName: string
  packageName: string | null
  speedLabel: string | null
  status: string
  monthlyPrice: number
  activatedAt: string | Date | null
}

type ReviewDbBillingInvoiceRow = {
  invoiceNo: string
  customerName: string
  invoiceStatus: string
  totalAmount: number
  paidAmount: number
  dueDate: string | Date
}

type ReviewDbCollectionActionRow = {
  actionType: string
  actionStatus: string
  actionAt: string | Date
  dueFollowUpAt: string | Date | null
  customerName: string
  invoiceNo: string
  notes: string | null
}

type ReviewDbPaymentRow = {
  paymentNo: string | null
  paymentDate: string | Date
  amount: number
  paymentMethod: string
  referenceNo: string | null
  customerName: string
  invoiceNo: string
  notes: string | null
}

type ReviewDbSalesLeadRow = {
  leadId: number
  customerName: string
  leadType: string
  status: string
  source: string | null
  marketingName: string | null
  phone: string | null
  notes: string | null
}

type ReviewDbSalesFlowRow = {
  flowCode: string
  customerName: string
  flowKind: string
  status: string
  detailLine: string | null
  detailDate: string | Date | null
  marketingName: string | null
}

function buildCapabilities(role: AppRole, domain: DomainKey): DomainCapability[] {
  const content = domainPages[domain]

  return capabilityOrder.map((action) => ({
    action,
    label: capabilityLabels[action],
    enabled: canPerformAction(role, content.resource, action),
  }))
}

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

function formatCurrency(value: number | null | undefined) {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(safe)
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function getReviewDbDomainStats() {
  const [row] = await runReviewDbQuery<DomainStatsRow>(`
    SELECT
      (SELECT COUNT(*) FROM sales_leads) AS salesLeads,
      (SELECT COUNT(*) FROM sales_orders) AS salesOrders,
      (
        SELECT COUNT(*)
        FROM sales_surveys
        WHERE survey_status IN ('REQUESTED', 'SCHEDULED', 'ON_PROGRESS')
      ) AS pendingSurveys,
      (SELECT COUNT(*) FROM crm_customers) AS customers,
      (
        SELECT COUNT(*)
        FROM service_subscriptions
        WHERE status = 'ACTIVE'
      ) AS activeSubscriptions,
      (SELECT COUNT(*) FROM crm_customer_addresses) AS customerAddresses,
      (
        SELECT COUNT(*)
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
          AND COALESCE(UPPER(TRIM(category)), 'TT') <> 'PV'
          AND COALESCE(UPPER(TRIM(type)), '') <> 'PREVENTIVE'
      ) AS openTroubleTickets,
      (
        SELECT COUNT(*)
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
          AND (
            COALESCE(UPPER(TRIM(category)), 'TT') = 'PV'
            OR COALESCE(UPPER(TRIM(type)), '') = 'PREVENTIVE'
          )
      ) AS preventiveOpen,
      (
        SELECT COUNT(*)
        FROM support_isolations
        WHERE status = 'OPEN'
          AND is_archived = 0
      ) AS activeIsolations,
      (
        SELECT COUNT(*)
        FROM inventory_items
        WHERE status = 'ACTIVE'
      ) AS inventoryItems,
      (
        SELECT COUNT(*)
        FROM inventory_stock_movements
        WHERE YEAR(movement_at) = YEAR(CURRENT_DATE)
          AND MONTH(movement_at) = MONTH(CURRENT_DATE)
      ) AS currentMonthMovements,
      (SELECT COUNT(*) FROM network_odp) AS odpCount,
      (SELECT COUNT(*) FROM hr_employees) AS employees,
      (
        SELECT COUNT(*)
        FROM hr_attendance
        WHERE attendance_date = CURRENT_DATE
      ) AS attendanceToday,
      (
        SELECT COUNT(*)
        FROM hr_loans
        WHERE status = 'ACTIVE'
      ) AS activeLoans,
      (
        SELECT COUNT(*)
        FROM billing_invoices
        WHERE invoice_status = 'OVERDUE'
          OR (
            due_date < CURRENT_DATE
            AND COALESCE(paid_amount, 0) < COALESCE(total_amount, 0)
            AND invoice_status NOT IN ('PAID', 'CANCELLED')
          )
      ) AS overdueInvoices,
      (
        SELECT COUNT(*)
        FROM billing_invoices
        WHERE invoice_status = 'PARTIAL'
      ) AS partialInvoices,
      (
        SELECT COUNT(*)
        FROM billing_invoices
        WHERE suspend_candidate = 1
      ) AS suspendCandidates
  `)

  return row
}

async function getReviewDbSupportSections(): Promise<DomainReviewSection[]> {
  const tickets = await runReviewDbQuery<ReviewDbSupportTicketRow>(`
    SELECT
      ticket_code AS ticketCode,
      customer_name AS customerName,
      customer_user AS customerUser,
      type AS ticketType,
      status,
      notes,
      opened_at AS openedAt
    FROM support_trouble_tickets
    WHERE closed_at IS NULL
      AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
    ORDER BY opened_at DESC, id DESC
    LIMIT 5
  `)

  const isolations = await runReviewDbQuery<ReviewDbSupportIsolationRow>(`
    SELECT
      id AS isolationId,
      customer_name AS customerName,
      radbox_name AS radboxName,
      customer_phone AS customerPhone,
      marketing_name AS marketingName,
      status,
      reason,
      isolation_date AS isolationDate
    FROM support_isolations
    WHERE status = 'OPEN'
      AND is_archived = 0
    ORDER BY isolation_date DESC, id DESC
    LIMIT 5
  `)

  const slaRows = await runReviewDbQuery<ReviewDbSupportSlaRow>(`
    SELECT
      trouble_type AS troubleType,
      duration_days AS durationDays,
      updated_at AS updatedAt
    FROM support_trouble_ticket_sla
    ORDER BY updated_at DESC, trouble_type ASC
    LIMIT 5
  `)

  const dismantles = await runReviewDbQuery<ReviewDbSupportDismantleRow>(`
    SELECT
      id AS dismantleId,
      customer_name AS customerName,
      radbox_name AS radboxName,
      customer_phone AS customerPhone,
      marketing_name AS marketingName,
      close_note AS closeNote,
      closed_at AS closedAt
    FROM support_dismantle_history
    ORDER BY closed_at DESC, id DESC
    LIMIT 5
  `)

  return [
    {
      title: 'Trouble Ticket Open',
      description: 'Queue operasional terbaru dari tabel support_trouble_tickets pada database review.',
      rows: tickets.map((item) => ({
        id: item.ticketCode,
        primary: item.ticketCode,
        secondary: item.customerName,
        status: item.status,
        detail: item.notes?.trim() || 'Belum ada catatan tambahan pada ticket ini.',
        meta: [
          `Type: ${item.ticketType || '-'}`,
          `Customer User: ${item.customerUser || '-'}`,
          `Opened: ${formatDateTime(item.openedAt)}`,
        ],
      })),
    },
    {
      title: 'Isolir Aktif',
      description: 'Pelanggan isolir aktif terbaru dari tabel support_isolations untuk menyiapkan flow suspend dan dismantle.',
      rows: isolations.map((item) => ({
        id: `ISO-${item.isolationId}`,
        primary: item.customerName,
        secondary: item.radboxName || 'Radbox belum terpetakan',
        status: item.status,
        detail: item.reason?.trim() || 'Belum ada alasan isolir yang tercatat.',
        meta: [
          `Phone: ${item.customerPhone || '-'}`,
          `Marketing: ${item.marketingName || '-'}`,
          `Isolasi: ${formatDateTime(item.isolationDate)}`,
        ],
      })),
    },
    {
      title: 'SLA Trouble Ticket',
      description: 'Master SLA aktif dari review DB untuk menjaga target penanganan per tipe ticket tetap terukur.',
      rows: slaRows.map((item) => ({
        id: `SLA-${item.troubleType}`,
        primary: item.troubleType,
        secondary: `${item.durationDays} hari`,
        status: 'ACTIVE',
        detail: `Ticket dengan tipe ${item.troubleType} ditargetkan selesai maksimal ${item.durationDays} hari sejak dibuka.`,
        meta: [
          `Durasi: ${item.durationDays} hari`,
          `Updated: ${formatDateTime(item.updatedAt)}`,
        ],
      })),
    },
    {
      title: 'Histori Dismantle',
      description: 'Riwayat perangkat dan layanan yang sudah ditutup permanen agar jejak operasional tidak hilang.',
      rows: dismantles.map((item) => ({
        id: `DIS-${item.dismantleId}`,
        primary: item.customerName,
        secondary: item.radboxName || 'Radbox belum terpetakan',
        status: 'CLOSED',
        detail: item.closeNote?.trim() || 'Belum ada catatan dismantle yang tercatat.',
        meta: [
          `Phone: ${item.customerPhone || '-'}`,
          `Marketing: ${item.marketingName || '-'}`,
          `Closed: ${formatDateTime(item.closedAt)}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbCustomerSections(): Promise<DomainReviewSection[]> {
  const customers = await runReviewDbQuery<ReviewDbCustomerRow>(`
    SELECT
      c.customer_code AS customerCode,
      c.full_name AS customerName,
      c.customer_type AS customerType,
      c.phone,
      c.email,
      a.address
    FROM crm_customers c
    LEFT JOIN crm_customer_addresses a
      ON a.customer_id = c.id
      AND a.is_primary = 1
    ORDER BY c.id DESC
    LIMIT 5
  `)

  const subscriptions = await runReviewDbQuery<ReviewDbSubscriptionRow>(`
    SELECT
      ss.service_no AS serviceNo,
      c.full_name AS customerName,
      sp.name AS packageName,
      sp.speed_label AS speedLabel,
      ss.status,
      ss.monthly_price AS monthlyPrice,
      ss.activated_at AS activatedAt
    FROM service_subscriptions ss
    JOIN crm_customers c
      ON c.id = ss.customer_id
    LEFT JOIN sales_packages sp
      ON sp.id = ss.package_id
    WHERE ss.status = 'ACTIVE'
    ORDER BY COALESCE(ss.activated_at, ss.created_at) DESC, ss.id DESC
    LIMIT 5
  `)

  return [
    {
      title: 'Customer Terbaru',
      description: 'Review customer master terbaru dari tabel crm_customers dan alamat utama pada review DB.',
      rows: customers.map((item) => ({
        id: item.customerCode,
        primary: item.customerCode,
        secondary: item.customerName,
        status: item.customerType,
        detail: item.address?.trim() || 'Alamat utama belum tersedia pada customer ini.',
        meta: [
          `Phone: ${item.phone || '-'}`,
          `Email: ${item.email || '-'}`,
          `Address: ${item.address || '-'}`,
        ],
      })),
    },
    {
      title: 'Subscription Aktif',
      description: 'Layanan aktif terbaru dari tabel service_subscriptions yang menghubungkan customer, paket, dan harga bulanan.',
      rows: subscriptions.map((item) => ({
        id: item.serviceNo,
        primary: item.serviceNo,
        secondary: item.packageName ? `${item.packageName}${item.speedLabel ? ` • ${item.speedLabel}` : ''}` : 'Paket belum terpetakan',
        status: item.status,
        detail: `Harga bulanan ${formatCurrency(item.monthlyPrice)} dengan status layanan ${item.status}.`,
        meta: [
          `Customer: ${item.customerName}`,
          `Harga: ${formatCurrency(item.monthlyPrice)}`,
          `Activated: ${formatDateTime(item.activatedAt)}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbBillingSections(): Promise<DomainReviewSection[]> {
  const invoices = await runReviewDbQuery<ReviewDbBillingInvoiceRow>(`
    SELECT
      bi.invoice_no AS invoiceNo,
      c.full_name AS customerName,
      bi.invoice_status AS invoiceStatus,
      bi.total_amount AS totalAmount,
      bi.paid_amount AS paidAmount,
      bi.due_date AS dueDate
    FROM billing_invoices bi
    JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id
    JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE bi.invoice_status IN ('OVERDUE', 'PARTIAL')
       OR (
         bi.due_date < CURRENT_DATE
         AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
         AND bi.invoice_status NOT IN ('PAID', 'CANCELLED')
       )
    ORDER BY bi.due_date ASC, bi.id DESC
    LIMIT 5
  `)

  const actions = await runReviewDbQuery<ReviewDbCollectionActionRow>(`
    SELECT
      bca.action_type AS actionType,
      bca.action_status AS actionStatus,
      bca.action_at AS actionAt,
      bca.due_follow_up_at AS dueFollowUpAt,
      c.full_name AS customerName,
      bi.invoice_no AS invoiceNo,
      bca.notes
    FROM billing_collection_actions bca
    JOIN billing_invoices bi
      ON bi.id = bca.invoice_id
    JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id
    JOIN crm_customers c
      ON c.id = ss.customer_id
    ORDER BY bca.action_at DESC, bca.id DESC
    LIMIT 5
  `)

  const payments = await runReviewDbQuery<ReviewDbPaymentRow>(`
    SELECT
      bp.payment_no AS paymentNo,
      bp.payment_date AS paymentDate,
      bp.amount,
      bp.payment_method AS paymentMethod,
      bp.reference_no AS referenceNo,
      c.full_name AS customerName,
      bi.invoice_no AS invoiceNo,
      bp.notes
    FROM billing_payments bp
    JOIN billing_invoices bi
      ON bi.id = bp.invoice_id
    JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id
    JOIN crm_customers c
      ON c.id = ss.customer_id
    ORDER BY bp.payment_date DESC, bp.id DESC
    LIMIT 5
  `)

  return [
    {
      title: 'Invoice Perlu Tindak Lanjut',
      description: 'Invoice overdue atau partial terbaru dari review DB untuk memantau prioritas penagihan.',
      rows: invoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Total tagihan ${formatCurrency(item.totalAmount)} dengan pembayaran masuk ${formatCurrency(item.paidAmount)}.`,
        meta: [
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Terbayar: ${formatCurrency(item.paidAmount)}`,
          `Jatuh Tempo: ${formatDateTime(item.dueDate)}`,
        ],
      })),
    },
    {
      title: 'Collection Action Terbaru',
      description: 'Aktivitas collection terbaru untuk memantau reminder, promise to pay, dan suspend candidate.',
      rows: actions.map((item, index) => ({
        id: `${item.invoiceNo}-${item.actionType}-${index}`,
        primary: item.actionType,
        secondary: item.invoiceNo,
        status: item.actionStatus,
        detail: item.notes?.trim() || 'Belum ada catatan tambahan pada action collection ini.',
        meta: [
          `Customer: ${item.customerName}`,
          `At: ${formatDateTime(item.actionAt)}`,
          `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
        ],
      })),
    },
    {
      title: 'Payment Terbaru',
      description: 'Pembayaran terbaru dari review DB untuk memantau invoice yang mulai bergerak ke partial atau paid.',
      rows: payments.map((item, index) => ({
        id: item.paymentNo || `${item.invoiceNo}-${index}`,
        primary: item.paymentNo || `PAY-${index + 1}`,
        secondary: item.invoiceNo,
        status: item.paymentMethod,
        detail: item.notes?.trim() || 'Belum ada catatan tambahan pada payment entry ini.',
        meta: [
          `Customer: ${item.customerName}`,
          `Amount: ${formatCurrency(item.amount)}`,
          `Paid At: ${formatDateTime(item.paymentDate)}`,
          `Reference: ${item.referenceNo || '-'}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbSalesSections(): Promise<DomainReviewSection[]> {
  const leads = await runReviewDbQuery<ReviewDbSalesLeadRow>(`
    SELECT
      id AS leadId,
      customer_name AS customerName,
      lead_type AS leadType,
      status,
      source,
      marketing_name AS marketingName,
      phone,
      notes
    FROM sales_leads
    ORDER BY created_at DESC, id DESC
    LIMIT 5
  `)

  const flows = await runReviewDbQuery<ReviewDbSalesFlowRow>(`
    SELECT
      survey_no AS flowCode,
      COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName,
      'SURVEY' AS flowKind,
      survey_status AS status,
      feasibility_status AS detailLine,
      scheduled_at AS detailDate,
      sl.marketing_name AS marketingName
    FROM sales_surveys ss
    LEFT JOIN sales_leads sl
      ON sl.id = ss.lead_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE survey_status IN ('REQUESTED', 'SCHEDULED', 'ON_PROGRESS')
    UNION ALL
    SELECT
      so.order_no AS flowCode,
      COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName,
      'ORDER' AS flowKind,
      so.status AS status,
      so.order_type AS detailLine,
      so.scheduled_installation_at AS detailDate,
      so.marketing_name AS marketingName
    FROM sales_orders so
    LEFT JOIN sales_leads sl
      ON sl.id = so.lead_id
    LEFT JOIN crm_customers c
      ON c.id = so.customer_id
    WHERE COALESCE(UPPER(TRIM(so.status)), 'REGISTERED') NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
    ORDER BY detailDate DESC, flowCode DESC
    LIMIT 5
  `)

  return [
    {
      title: 'Lead Terbaru',
      description: 'Lead terbaru dari tabel sales_leads untuk memantau funnel awal akuisisi pelanggan.',
      rows: leads.map((item) => ({
        id: `LEAD-${item.leadId}`,
        primary: item.customerName,
        secondary: item.leadType,
        status: item.status,
        detail: item.notes?.trim() || 'Belum ada catatan tambahan pada lead ini.',
        meta: [
          `Source: ${item.source || '-'}`,
          `Marketing: ${item.marketingName || '-'}`,
          `Phone: ${item.phone || '-'}`,
        ],
      })),
    },
    {
      title: 'Survey Dan Order Berjalan',
      description: 'Daftar survey pending dan order aktif terbaru dari review DB untuk memantau delivery awal.',
      rows: flows.map((item) => ({
        id: `${item.flowKind}-${item.flowCode}`,
        primary: item.flowCode,
        secondary: item.customerName,
        status: item.status,
        detail:
          item.flowKind === 'SURVEY'
            ? `Status feasibility ${item.detailLine || 'PENDING'} dengan jadwal survey ${formatDateTime(item.detailDate)}.`
            : `Order ${item.detailLine || '-'} dengan jadwal instalasi ${formatDateTime(item.detailDate)}.`,
        meta: [
          `Flow: ${item.flowKind}`,
          `Marketing: ${item.marketingName || '-'}`,
          `At: ${formatDateTime(item.detailDate)}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

function applyReviewDbSummaries(content: DomainPageContent, stats: DomainStatsRow): DomainPageContent {
  switch (content.key) {
    case 'sales':
      return {
        ...content,
        summaries: [
          { label: 'Lead Review', value: formatNumber(stats.salesLeads) },
          { label: 'Order Aktif', value: formatNumber(stats.salesOrders) },
          { label: 'Survey Pending', value: formatNumber(stats.pendingSurveys) },
        ],
      }
    case 'customers':
      return {
        ...content,
        summaries: [
          { label: 'Customer Aktif', value: formatNumber(stats.customers) },
          { label: 'Subscription Aktif', value: formatNumber(stats.activeSubscriptions) },
          { label: 'Address Terkait', value: formatNumber(stats.customerAddresses) },
        ],
      }
    case 'support':
      return {
        ...content,
        summaries: [
          { label: 'TT Open', value: formatNumber(stats.openTroubleTickets) },
          { label: 'Preventive Open', value: formatNumber(stats.preventiveOpen) },
          { label: 'Isolir Aktif', value: formatNumber(stats.activeIsolations) },
        ],
      }
    case 'inventory':
      return {
        ...content,
        summaries: [
          { label: 'Item Master', value: formatNumber(stats.inventoryItems) },
          { label: 'Movement Bulan Ini', value: formatNumber(stats.currentMonthMovements) },
          { label: 'ODP Terdeteksi', value: formatNumber(stats.odpCount) },
        ],
      }
    case 'hr':
      return {
        ...content,
        summaries: [
          { label: 'Employee', value: formatNumber(stats.employees) },
          { label: 'Attendance Hari Ini', value: formatNumber(stats.attendanceToday) },
          { label: 'Loan Aktif', value: formatNumber(stats.activeLoans) },
        ],
      }
    case 'billing':
      return {
        ...content,
        summaries: [
          { label: 'Invoice Overdue', value: formatNumber(stats.overdueInvoices) },
          { label: 'Payment Partial', value: formatNumber(stats.partialInvoices) },
          { label: 'Suspend Candidate', value: formatNumber(stats.suspendCandidates) },
        ],
      }
    default:
      return content
  }
}

function applyReviewDbSupportSections(content: DomainPageContent, reviewSections: DomainReviewSection[]) {
  if (content.key !== 'support' || reviewSections.length === 0) {
    return content
  }

  return {
    ...content,
    reviewSections,
  }
}

function applyReviewDbCustomerSections(content: DomainPageContent, reviewSections: DomainReviewSection[]) {
  if (content.key !== 'customers' || reviewSections.length === 0) {
    return content
  }

  return {
    ...content,
    reviewSections,
  }
}

function applyReviewDbBillingSections(content: DomainPageContent, reviewSections: DomainReviewSection[]) {
  if (content.key !== 'billing' || reviewSections.length === 0) {
    return content
  }

  return {
    ...content,
    reviewSections,
  }
}

function applyReviewDbSalesSections(content: DomainPageContent, reviewSections: DomainReviewSection[]) {
  if (content.key !== 'sales' || reviewSections.length === 0) {
    return content
  }

  return {
    ...content,
    reviewSections,
  }
}

export async function getDomainPageData(domain: DomainKey, role: AppRole) {
  const source = getDataSourceSnapshot()
  const content = domainPages[domain]

  if (!content) {
    return null
  }

  if (source.effectiveMode !== 'review-db') {
    return {
      source,
      content,
      capabilities: buildCapabilities(role, domain),
    }
  }

  try {
    const stats = await getReviewDbDomainStats()
    const salesSections = domain === 'sales' ? await getReviewDbSalesSections() : []
    const supportSections = domain === 'support' ? await getReviewDbSupportSections() : []
    const customerSections = domain === 'customers' ? await getReviewDbCustomerSections() : []
    const billingSections = domain === 'billing' ? await getReviewDbBillingSections() : []

    return {
      source,
      content: applyReviewDbSalesSections(
        applyReviewDbBillingSections(
          applyReviewDbCustomerSections(
            applyReviewDbSupportSections(applyReviewDbSummaries(content, stats), supportSections),
            customerSections,
          ),
          billingSections,
        ),
        salesSections,
      ),
      capabilities: buildCapabilities(role, domain),
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      content,
      capabilities: buildCapabilities(role, domain),
    }
  }
}
