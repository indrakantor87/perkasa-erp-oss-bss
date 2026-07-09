import { canPerformAction } from '@/lib/access-control'
import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { domainPages } from '@/lib/mock-domains'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { getHrAttendanceFaceConfig } from '@/lib/services/hr-attendance-face-service'
import { getRecentHrEmployeeFaceReferenceItems } from '@/lib/services/hr-attendance-face-service'
import { getRecentHrEmployeeFaceReferenceHistoryItems } from '@/lib/services/hr-attendance-face-service'
import { getRecentHrAttendanceFaceRetakeQueueItems } from '@/lib/services/hr-attendance-face-service'
import { getHrAttendanceFacePriorityQueueItems } from '@/lib/services/hr-attendance-face-service'
import { getHrEmployeeFaceReferenceTrendItems } from '@/lib/services/hr-attendance-face-service'
import { getVerifiedHrEmployeeFaceReferenceCandidates } from '@/lib/services/hr-attendance-face-service'
import { getHrAttendanceFaceOutcomeAnalytics } from '@/lib/services/hr-attendance-face-service'
import { getRecentHrAttendanceFaceReviewItems } from '@/lib/services/hr-attendance-face-service'
import { getHrAttendanceGeofenceConfig } from '@/lib/services/hr-attendance-geofence-service'
import { ensureInventoryLoanTable } from '@/lib/services/inventory-loan-service'
import { ensureInventoryRequestTable } from '@/lib/services/inventory-request-service'
import { ensureHrSalarySlipVoidTable } from '@/lib/services/hr-salary-slip-void-service'
import { ensureSupportTroubleTicketEscalationTable } from '@/lib/services/support-ticket-escalation-service'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'
import {
  buildSupportLaneSnapshots,
  buildSupportLaneReviewSummary,
  buildSupportLaneWorkspace,
  getActiveSupportLane,
  getPreferredSupportLane,
  getSupportLaneSections,
} from '@/lib/support-lanes'
import type {
  AccessAction,
  AppRole,
  DomainPageData,
  DomainCapability,
  DomainKey,
  DomainPageContent,
  DomainReviewSection,
  DomainSupportFocus,
  SupportLaneKey,
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
  ticketId: number
  ticketCode: string
  customerName: string
  customerUser: string | null
  ticketType: string
  status: string
  notes: string | null
  openedAt: string | Date
  slaDurationDays: number | null
  slaDueAt: string | Date | null
  progressStatus: string | null
  ownerName: string | null
  followUpAt: string | Date | null
  progressNotes: string | null
  progressUpdatedBy: string | null
  progressUpdatedAt: string | Date | null
  escalationTarget: string | null
  escalationLevel: string | null
  escalationReason: string | null
  escalatedBy: string | null
  escalatedAt: string | Date | null
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

type ReviewDbBillingReadySubscriptionRow = {
  subscriptionId: number
  serviceNo: string
  customerName: string
  packageName: string | null
  speedLabel: string | null
  monthlyPrice: number
  activatedAt: string | Date | null
}

type ReviewDbBillingLatestInvoiceRow = {
  invoiceNo: string
  invoiceType: string
  invoiceStatus: string
  totalAmount: number
  paidAmount: number
  issueDate: string | Date
  dueDate: string | Date
  billingMonth: number | null
  billingYear: number | null
  serviceNo: string
  customerName: string
}

type ReviewDbBillingCancelledInvoiceRow = {
  invoiceNo: string
  customerName: string
  totalAmount: number
  updatedAt: string | Date
  notes: string | null
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

type ReviewDbCollectionFollowUpRow = {
  invoiceNo: string
  customerName: string
  invoiceStatus: string
  totalAmount: number
  paidAmount: number
  dueDate: string | Date
  collectionStatus: string | null
  suspendCandidate: number
  actionType: string
  actionStatus: string
  actionAt: string | Date
  dueFollowUpAt: string | Date | null
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

type ReviewDbSalesCoverageRow = {
  coverageId: number
  areaCode: string
  areaName: string
  village: string | null
  district: string | null
  city: string | null
  province: string | null
  coverageStatus: string
  notes: string | null
}

type ReviewDbSalesFlowRow = {
  sourceId: number | null
  flowCode: string
  customerName: string
  flowKind: string
  status: string
  detailLine: string | null
  detailDate: string | Date | null
  marketingName: string | null
}

type ReviewDbSalesWorkOrderRow = {
  workOrderId: number
  workOrderNo: string
  customerName: string
  status: string
  workType: string
  scheduledAt: string | Date | null
  technicianName: string | null
  orderNo: string | null
}

type ReviewDbSalesActivationRow = {
  subscriptionId: number
  serviceNo: string
  customerName: string
  status: string
  packageName: string | null
  speedLabel: string | null
  monthlyPrice: number
  activatedAt: string | Date | null
  orderNo: string | null
}

type ReviewDbInventoryItemRow = {
  itemId: number
  itemCode: string
  itemName: string
  categoryCode: string | null
  unitCode: string | null
  currentStock: number
  minimumStock: number
  status: string
}

type ReviewDbInventoryMovementRow = {
  movementId: number
  movementType: string
  referenceNo: string | null
  qty: number
  unitPrice: number
  movementAt: string | Date
  itemName: string
  itemCode: string
  notes: string | null
}

type ReviewDbInventoryOdpRow = {
  odpId: number
  odpCode: string
  odpName: string
  totalPorts: number
  activePorts: number
  locationText: string | null
  latitude: number | null
  longitude: number | null
}

type ReviewDbInventoryOdpPortRow = {
  portId: number
  odpCode: string
  portNo: number
  portStatus: string
  serviceNo: string | null
  customerCode: string | null
  installedAt: string | Date | null
}

type ReviewDbInventoryDeviceAssignmentRow = {
  assignmentId: number
  itemCode: string
  itemName: string
  categoryCode: string | null
  assignmentStatus: string
  assignedAt: string | Date
  serviceNo: string | null
  workOrderNo: string | null
  customerName: string | null
  serialNumber: string | null
}

type ReviewDbInventoryDeviceReturnRow = {
  assignmentId: number
  itemCode: string
  itemName: string
  assignmentStatus: string
  returnedAt: string | Date
  serviceNo: string | null
  workOrderNo: string | null
  customerName: string | null
  serialNumber: string | null
}

type ReviewDbInventoryRequestRow = {
  requestId: number
  requestCode: string
  requestQty: number
  requestStatus: string
  requestedDivision: string | null
  requestedSubdivision: string | null
  requestedFor: string | null
  requestNotes: string | null
  pendingReason: string | null
  requestedBy: string
  processedBy: string | null
  requestedAt: string | Date
  processedAt: string | Date | null
  itemCode: string
  itemName: string
  currentStock: number
}

type ReviewDbInventoryLoanRow = {
  loanId: number
  loanCode: string
  loanQty: number
  returnedQty: number
  loanStatus: string
  borrowerName: string
  borrowerDivision: string | null
  borrowerSubdivision: string | null
  loanNotes: string | null
  returnNotes: string | null
  borrowedAt: string | Date
  dueAt: string | Date | null
  returnedAt: string | Date | null
  itemCode: string
  itemName: string
}

type ReviewDbHrEmployeeRow = {
  employeeId: number
  employeeCode: string
  fullName: string
  positionName: string | null
  employmentStatus: string
  joinDate: string | Date | null
  phone: string | null
  divisionName: string | null
  branchName: string | null
}

type ReviewDbHrAttendanceRow = {
  attendanceId: number
  employeeName: string
  attendanceDate: string
  status: string
  checkIn: string | Date | null
  checkOut: string | Date | null
  overtimeHours: number
  lockedByAdmin: number
}

type ReviewDbHrLoanRow = {
  loanId: number
  employeeName: string
  loanType: string
  amount: number
  monthlyInstallment: number
  status: string
}

type ReviewDbHrSalarySlipRow = {
  salarySlipId: number
  employeeName: string
  payrollMonth: number
  payrollYear: number
  totalIncome: number
  totalDeduction: number
  netSalary: number
  releasedAt: string | Date | null
  voidedAt: string | Date | null
  voidReason: string | null
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

function formatPercentage(part: number, total: number) {
  if (total <= 0) {
    return '0%'
  }

  return `${Math.round((part / total) * 100)}%`
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

function formatDateTimeInputValue(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function getFollowUpState(value: string | Date | null | undefined) {
  if (!value) return 'UNSET'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'UNSET'

  const now = new Date()
  if (date.getTime() < now.getTime()) {
    return 'OVERDUE'
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const nextDay = new Date(today)
  nextDay.setDate(nextDay.getDate() + 1)

  if (date.getTime() >= today.getTime() && date.getTime() < nextDay.getTime()) {
    return 'TODAY'
  }

  return 'SCHEDULED'
}

function getSlaState(value: string | Date | null | undefined) {
  if (!value) return 'UNSET'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'UNSET'

  const now = new Date()
  if (date.getTime() < now.getTime()) {
    return 'OVERDUE'
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const nextDay = new Date(today)
  nextDay.setDate(nextDay.getDate() + 1)

  if (date.getTime() >= today.getTime() && date.getTime() < nextDay.getTime()) {
    return 'DUE_TODAY'
  }

  return 'ON_TRACK'
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

async function getReviewDbSupportSections(lane?: SupportLaneKey | null): Promise<DomainReviewSection[]> {
  const wantTickets = !lane || lane === 'tt'
  const wantIsolations = !lane || lane === 'isolations'
  const wantSla = !lane || lane === 'sla'
  const wantDismantle = !lane || lane === 'dismantle'

  const tickets = wantTickets
    ? (await ensureSupportTroubleTicketProgressTable(),
      await ensureSupportTroubleTicketEscalationTable(),
      await runReviewDbQuery<ReviewDbSupportTicketRow>(`
    SELECT
      stt.id AS ticketId,
      ticket_code AS ticketCode,
      customer_name AS customerName,
      customer_user AS customerUser,
      type AS ticketType,
      stt.status AS status,
      stt.notes AS notes,
      stt.opened_at AS openedAt,
      sla.duration_days AS slaDurationDays,
      CASE
        WHEN sla.duration_days IS NULL THEN NULL
        ELSE DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY)
      END AS slaDueAt,
      latest.progress_status AS progressStatus,
      latest.owner_name AS ownerName,
      latest.follow_up_at AS followUpAt,
      latest.progress_notes AS progressNotes,
      latest.updated_by AS progressUpdatedBy,
      latest.updated_at AS progressUpdatedAt,
      escalations.escalation_target AS escalationTarget,
      escalations.escalation_level AS escalationLevel,
      escalations.escalation_reason AS escalationReason,
      escalations.escalated_by AS escalatedBy,
      escalations.escalated_at AS escalatedAt
    FROM support_trouble_tickets stt
    LEFT JOIN support_trouble_ticket_sla sla
      ON UPPER(TRIM(sla.trouble_type)) = UPPER(TRIM(stt.type))
    LEFT JOIN (
      SELECT
        progress.trouble_ticket_id,
        progress.progress_status,
        progress.owner_name,
        progress.follow_up_at,
        progress.progress_notes,
        progress.updated_by,
        progress.updated_at
      FROM support_trouble_ticket_progress_logs progress
      INNER JOIN (
        SELECT trouble_ticket_id, MAX(id) AS latestId
        FROM support_trouble_ticket_progress_logs
        GROUP BY trouble_ticket_id
      ) latest_progress
        ON latest_progress.latestId = progress.id
    ) latest
      ON latest.trouble_ticket_id = stt.id
    LEFT JOIN (
      SELECT
        escalation.trouble_ticket_id,
        escalation.escalation_target,
        escalation.escalation_level,
        escalation.escalation_reason,
        escalation.escalated_by,
        escalation.escalated_at
      FROM support_trouble_ticket_escalation_logs escalation
      INNER JOIN (
        SELECT trouble_ticket_id, MAX(id) AS latestId
        FROM support_trouble_ticket_escalation_logs
        GROUP BY trouble_ticket_id
      ) latest_escalation
        ON latest_escalation.latestId = escalation.id
    ) escalations
      ON escalations.trouble_ticket_id = stt.id
    WHERE stt.closed_at IS NULL
      AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
    ORDER BY
      CASE
        WHEN sla.duration_days IS NULL THEN 1
        WHEN DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY) < CURRENT_TIMESTAMP THEN 0
        ELSE 1
      END ASC,
      CASE
        WHEN sla.duration_days IS NULL THEN NULL
        ELSE DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY)
      END ASC,
      CASE WHEN latest.follow_up_at IS NULL THEN 1 ELSE 0 END ASC,
      latest.follow_up_at ASC,
      stt.opened_at DESC,
      stt.id DESC
    LIMIT 5
  `))
    : []

  const isolations = wantIsolations
    ? await runReviewDbQuery<ReviewDbSupportIsolationRow>(`
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
    : []

  const slaRows = wantSla
    ? await runReviewDbQuery<ReviewDbSupportSlaRow>(`
    SELECT
      trouble_type AS troubleType,
      duration_days AS durationDays,
      updated_at AS updatedAt
    FROM support_trouble_ticket_sla
    ORDER BY updated_at DESC, trouble_type ASC
    LIMIT 5
  `)
    : []

  const dismantles = wantDismantle
    ? await runReviewDbQuery<ReviewDbSupportDismantleRow>(`
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
    : []

  return [
    {
      title: 'Trouble Ticket Open',
      description: 'Queue operasional terbaru dari tabel support_trouble_tickets pada database review.',
      rows: tickets.map((item) => {
        const followUpState = getFollowUpState(item.followUpAt)
        const slaState = getSlaState(item.slaDueAt)
        return {
          id: item.ticketCode,
          primary: item.ticketCode,
          secondary: item.customerName,
          status: item.progressStatus?.trim() || item.status,
          detail:
            item.progressNotes?.trim() ||
            item.notes?.trim() ||
            'Belum ada catatan tambahan pada ticket ini.',
          meta: [
            `Type: ${item.ticketType || '-'}`,
            `Customer User: ${item.customerUser || '-'}`,
            `Opened: ${formatDateTime(item.openedAt)}`,
            `SLA Days: ${item.slaDurationDays ?? '-'}`,
            `SLA Due: ${formatDateTime(item.slaDueAt)}`,
            `SLA State: ${slaState}`,
            `PIC: ${item.ownerName || '-'}`,
            `Next Follow Up: ${formatDateTime(item.followUpAt)}`,
            `Follow Up State: ${followUpState}`,
            `Progress Updated: ${formatDateTime(item.progressUpdatedAt)}`,
            `Updated By: ${item.progressUpdatedBy || '-'}`,
            `Latest Progress: ${item.progressNotes?.trim() || '-'}`,
            `Escalation Target: ${item.escalationTarget || '-'}`,
            `Escalation Level: ${item.escalationLevel || '-'}`,
            `Escalated At: ${formatDateTime(item.escalatedAt)}`,
            `Escalated By: ${item.escalatedBy || '-'}`,
            `Escalation Reason: ${item.escalationReason?.trim() || '-'}`,
            `Ticket Notes: ${item.notes?.trim() || '-'}`,
          ],
        }
      }),
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
  const subscriptionsReady = await runReviewDbQuery<ReviewDbBillingReadySubscriptionRow>(`
    SELECT
      ss.id AS subscriptionId,
      ss.service_no AS serviceNo,
      c.full_name AS customerName,
      sp.name AS packageName,
      sp.speed_label AS speedLabel,
      ss.monthly_price AS monthlyPrice,
      ss.activated_at AS activatedAt
    FROM service_subscriptions ss
    JOIN crm_customers c
      ON c.id = ss.customer_id
    LEFT JOIN sales_packages sp
      ON sp.id = ss.package_id
    WHERE ss.status = 'ACTIVE'
      AND COALESCE(ss.monthly_price, 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM billing_invoices bi
        WHERE bi.subscription_id = ss.id
          AND bi.invoice_type = 'RECURRING'
          AND bi.billing_year = YEAR(CURRENT_DATE)
          AND bi.billing_month = MONTH(CURRENT_DATE)
          AND bi.invoice_status NOT IN ('CANCELLED')
      )
    ORDER BY COALESCE(ss.activated_at, ss.created_at) DESC, ss.id DESC
    LIMIT 5
  `)

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

  const latestInvoices = await runReviewDbQuery<ReviewDbBillingLatestInvoiceRow>(`
    SELECT
      bi.invoice_no AS invoiceNo,
      bi.invoice_type AS invoiceType,
      bi.invoice_status AS invoiceStatus,
      bi.total_amount AS totalAmount,
      bi.paid_amount AS paidAmount,
      bi.issue_date AS issueDate,
      bi.due_date AS dueDate,
      bi.billing_month AS billingMonth,
      bi.billing_year AS billingYear,
      ss.service_no AS serviceNo,
      c.full_name AS customerName
    FROM billing_invoices bi
    JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id
    JOIN crm_customers c
      ON c.id = ss.customer_id
    ORDER BY bi.issue_date DESC, bi.id DESC
    LIMIT 5
  `)

  const cancelledInvoices = await runReviewDbQuery<ReviewDbBillingCancelledInvoiceRow>(`
    SELECT
      bi.invoice_no AS invoiceNo,
      c.full_name AS customerName,
      bi.total_amount AS totalAmount,
      bi.updated_at AS updatedAt,
      bi.notes
    FROM billing_invoices bi
    JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id
    JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE bi.invoice_status = 'CANCELLED'
    ORDER BY bi.updated_at DESC, bi.id DESC
    LIMIT 5
  `)

  const suspendedInvoices = await runReviewDbQuery<ReviewDbBillingInvoiceRow>(`
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
    WHERE COALESCE(UPPER(TRIM(bi.invoice_status)), '') = 'SUSPENDED'
       OR COALESCE(UPPER(TRIM(bi.collection_status)), '') = 'SUSPEND'
       OR COALESCE(bi.suspend_candidate, 0) = 1
    ORDER BY bi.updated_at DESC, bi.id DESC
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

  const collectionFollowUps = await runReviewDbQuery<ReviewDbCollectionFollowUpRow>(`
    SELECT
      bi.invoice_no AS invoiceNo,
      c.full_name AS customerName,
      bi.invoice_status AS invoiceStatus,
      bi.total_amount AS totalAmount,
      bi.paid_amount AS paidAmount,
      bi.due_date AS dueDate,
      bi.collection_status AS collectionStatus,
      bi.suspend_candidate AS suspendCandidate,
      latest.action_type AS actionType,
      latest.action_status AS actionStatus,
      latest.action_at AS actionAt,
      latest.due_follow_up_at AS dueFollowUpAt,
      latest.notes
    FROM billing_invoices bi
    JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id
    JOIN crm_customers c
      ON c.id = ss.customer_id
    JOIN (
      SELECT
        action_latest.invoice_id,
        action_latest.action_type,
        action_latest.action_status,
        action_latest.action_at,
        action_latest.due_follow_up_at,
        action_latest.notes
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
    ORDER BY
      CASE WHEN latest.due_follow_up_at IS NULL THEN 1 ELSE 0 END ASC,
      latest.due_follow_up_at ASC,
      bi.due_date ASC,
      bi.id DESC
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
      title: 'Subscription Billing-Ready',
      description:
        'Subscription ACTIVE yang belum memiliki invoice recurring periode bulan berjalan, siap digenerate dari halaman billing.',
      rows: subscriptionsReady.map((item) => ({
        id: item.serviceNo,
        primary: item.serviceNo,
        secondary: item.customerName,
        status: 'READY',
        detail: `Harga bulanan ${formatCurrency(item.monthlyPrice)} untuk layanan aktif yang siap dibuat invoice recurring.`,
        meta: [
          `Subscription ID: ${item.subscriptionId}`,
          `Paket: ${item.packageName ? `${item.packageName}${item.speedLabel ? ` • ${item.speedLabel}` : ''}` : '-'}`,
          `Activated: ${formatDateTime(item.activatedAt)}`,
          `Periode: ${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
        ],
      })),
    },
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
      title: 'Invoice Terbaru',
      description: 'Invoice terbaru dari review DB untuk memastikan output generate invoice langsung terlihat pada halaman billing.',
      rows: latestInvoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Invoice ${item.invoiceType} untuk layanan ${item.serviceNo} dengan total ${formatCurrency(item.totalAmount)}.`,
        meta: [
          `Service: ${item.serviceNo}`,
          `Issue: ${formatDateTime(item.issueDate)}`,
          `Due: ${formatDateTime(item.dueDate)}`,
          `Paid: ${formatCurrency(item.paidAmount)}`,
          item.billingMonth && item.billingYear
            ? `Periode: ${String(item.billingMonth).padStart(2, '0')}/${item.billingYear}`
            : 'Periode: -',
        ],
      })),
    },
    {
      title: 'Invoice Dibatalkan Terbaru',
      description:
        'Invoice yang dibatalkan terbaru untuk memastikan pembatalan invoice unpaid tetap tercatat dan terlihat di halaman billing.',
      rows: cancelledInvoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: 'CANCELLED',
        detail: item.notes?.trim() || 'Invoice dibatalkan tanpa catatan tambahan.',
        meta: [
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Updated: ${formatDateTime(item.updatedAt)}`,
        ],
      })),
    },
    {
      title: 'Invoice Suspended',
      description:
        'Invoice yang sedang berada pada jalur suspend agar operator billing bisa memantau kandidat suspend dan melakukan reconnect bila tindak lanjut sudah siap.',
      rows: suspendedInvoices.map((item) => ({
        id: `${item.invoiceNo}-SUSPENDED`,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: 'SUSPENDED',
        detail: `Sisa tagihan ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))} pada invoice yang sudah masuk jalur suspend.`,
        meta: [
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Terbayar: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Jatuh Tempo: ${formatDateTime(item.dueDate)}`,
        ],
      })),
    },
    {
      title: 'Suspend Ready Queue',
      description:
        'Antrean invoice yang sudah masuk sinyal suspend dari collection follow-up agar operator billing bisa mengeksekusi suspend massal tanpa memilah catatan satu per satu.',
      rows: collectionFollowUps
        .filter((item) => Number(item.suspendCandidate) > 0 || item.actionType.trim().toUpperCase() === 'SUSPEND')
        .map((item, index) => {
          const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
          const followUpState = getFollowUpState(item.dueFollowUpAt)

          return {
            id: `${item.invoiceNo}-SUSPEND-READY-${index}`,
            primary: item.invoiceNo,
            secondary: item.customerName,
            status: followUpState,
            detail: `Invoice siap suspend dengan sisa tagihan ${formatCurrency(remainingAmount)} dan action ${item.actionType}.`,
            meta: [
              `Invoice Status: ${item.invoiceStatus}`,
              `Total: ${formatCurrency(item.totalAmount)}`,
              `Paid: ${formatCurrency(item.paidAmount)}`,
              `Remaining: ${formatCurrency(remainingAmount)}`,
              `Invoice Due: ${formatDateTime(item.dueDate)}`,
              `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
              `Follow Up State: ${followUpState}`,
              `Action Type: ${item.actionType}`,
              `Collection Status: ${item.collectionStatus || '-'}`,
              `Suspend Candidate: ${Number(item.suspendCandidate) > 0 ? 'Ya' : 'Tidak'}`,
              `Action Notes: ${item.notes?.trim() || '-'}`,
            ],
          }
        }),
    },
    {
      title: 'Promise To Pay Queue',
      description:
        'Antrean invoice dengan janji bayar aktif agar operator collection bisa memisahkan invoice yang masih layak ditunggu dari invoice yang sudah harus naik ke jalur suspend.',
      rows: collectionFollowUps
        .filter((item) => item.actionType.trim().toUpperCase() === 'PROMISE_TO_PAY')
        .map((item, index) => {
          const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
          const followUpState = getFollowUpState(item.dueFollowUpAt)

          return {
            id: `${item.invoiceNo}-PTP-${index}`,
            primary: item.invoiceNo,
            secondary: item.customerName,
            status: followUpState,
            detail: `Janji bayar aktif dengan sisa tagihan ${formatCurrency(remainingAmount)} dan follow-up ${formatDateTime(item.dueFollowUpAt)}.`,
            meta: [
              `Invoice Status: ${item.invoiceStatus}`,
              `Total: ${formatCurrency(item.totalAmount)}`,
              `Paid: ${formatCurrency(item.paidAmount)}`,
              `Remaining: ${formatCurrency(remainingAmount)}`,
              `Invoice Due: ${formatDateTime(item.dueDate)}`,
              `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
              `Follow Up State: ${followUpState}`,
              `Action Type: ${item.actionType}`,
              `Collection Status: ${item.collectionStatus || '-'}`,
              `Suspend Candidate: ${Number(item.suspendCandidate) > 0 ? 'Ya' : 'Tidak'}`,
              `Action Notes: ${item.notes?.trim() || '-'}`,
            ],
          }
        }),
    },
    {
      title: 'Reconnect Ready Queue',
      description:
        'Antrean invoice yang sudah disuspend dan siap dikembalikan ke jalur overdue/reconnect setelah tindak lanjut lapangan atau negosiasi customer selesai.',
      rows: suspendedInvoices.map((item) => ({
        id: `${item.invoiceNo}-RECONNECT`,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: 'READY',
        detail: `Invoice suspended dengan sisa tagihan ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))} siap diaktifkan lagi ke jalur overdue.`,
        meta: [
          `Invoice Status: ${item.invoiceStatus}`,
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Paid: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Invoice Due: ${formatDateTime(item.dueDate)}`,
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
      title: 'Collection Follow Up Queue',
      description:
        'Antrean follow-up collection aktif berdasarkan action OPEN terbaru per invoice agar operator bisa menindak promise to pay, reminder, dan suspend candidate dari satu layar.',
      rows: collectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)

        return {
          id: `${item.invoiceNo}-FOLLOW-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: `Action ${item.actionType} masih ${item.actionStatus} dengan sisa tagihan ${formatCurrency(remainingAmount)}.`,
          meta: [
            `Invoice Status: ${item.invoiceStatus}`,
            `Total: ${formatCurrency(item.totalAmount)}`,
            `Paid: ${formatCurrency(item.paidAmount)}`,
            `Remaining: ${formatCurrency(remainingAmount)}`,
            `Invoice Due: ${formatDateTime(item.dueDate)}`,
            `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
            `Follow Up State: ${followUpState}`,
            `Action Type: ${item.actionType}`,
            `Collection Status: ${item.collectionStatus || '-'}`,
            `Suspend Candidate: ${Number(item.suspendCandidate) > 0 ? 'Ya' : 'Tidak'}`,
            `Action At: ${formatDateTime(item.actionAt)}`,
            `Action Notes: ${item.notes?.trim() || '-'}`,
          ],
        }
      }),
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

  const coverages = await runReviewDbQuery<ReviewDbSalesCoverageRow>(`
    SELECT
      id AS coverageId,
      area_code AS areaCode,
      area_name AS areaName,
      village,
      district,
      city,
      province,
      coverage_status AS coverageStatus,
      notes
    FROM sales_covered_areas
    ORDER BY updated_at DESC, id DESC
    LIMIT 5
  `)

  const flows = await runReviewDbQuery<ReviewDbSalesFlowRow>(`
    SELECT
      ss.id AS sourceId,
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
      so.id AS sourceId,
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

  const workOrders = await runReviewDbQuery<ReviewDbSalesWorkOrderRow>(`
    SELECT
      swo.id AS workOrderId,
      swo.work_order_no AS workOrderNo,
      COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName,
      swo.status,
      swo.work_type AS workType,
      swo.scheduled_at AS scheduledAt,
      swo.technician_name AS technicianName,
      so.order_no AS orderNo
    FROM service_work_orders swo
    LEFT JOIN sales_orders so
      ON so.id = swo.sales_order_id
    LEFT JOIN sales_leads sl
      ON sl.id = so.lead_id
    LEFT JOIN crm_customers c
      ON c.id = so.customer_id
    WHERE COALESCE(UPPER(TRIM(swo.status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
    ORDER BY COALESCE(swo.scheduled_at, swo.created_at) DESC, swo.id DESC
    LIMIT 5
  `)

  const activations = await runReviewDbQuery<ReviewDbSalesActivationRow>(`
    SELECT
      ss.id AS subscriptionId,
      ss.service_no AS serviceNo,
      c.full_name AS customerName,
      ss.status,
      sp.name AS packageName,
      sp.speed_label AS speedLabel,
      ss.monthly_price AS monthlyPrice,
      ss.activated_at AS activatedAt,
      so.order_no AS orderNo
    FROM service_subscriptions ss
    JOIN crm_customers c
      ON c.id = ss.customer_id
    LEFT JOIN sales_orders so
      ON so.id = ss.order_id
    LEFT JOIN sales_packages sp
      ON sp.id = ss.package_id
    WHERE ss.status IN ('PENDING', 'ACTIVE')
    ORDER BY COALESCE(ss.activated_at, ss.created_at) DESC, ss.id DESC
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
      title: 'Coverage Terbaru',
      description: 'Master coverage area terbaru dari review DB untuk menghubungkan lead dengan kesiapan area layanan.',
      rows: coverages.map((item) => ({
        id: `COV-${item.coverageId}`,
        primary: item.areaCode,
        secondary: item.areaName,
        status: item.coverageStatus,
        detail: item.notes?.trim() || 'Belum ada catatan coverage tambahan pada area ini.',
        meta: [
          `Village: ${item.village || '-'}`,
          `District: ${item.district || '-'}`,
          `City: ${item.city || '-'}`,
          `Province: ${item.province || '-'}`,
        ],
      })),
    },
    {
      title: 'Survey Dan Order Berjalan',
      description: 'Daftar survey pending dan order aktif terbaru dari review DB untuk memantau delivery awal.',
      rows: flows.map((item) => ({
        id: item.flowKind === 'ORDER' ? `ORDER-${item.sourceId ?? item.flowCode}` : `${item.flowKind}-${item.flowCode}`,
        primary: item.flowCode,
        secondary: item.customerName,
        status: item.status,
        detail:
          item.flowKind === 'SURVEY'
            ? `Status feasibility ${item.detailLine || 'PENDING'} dengan jadwal survey ${formatDateTime(item.detailDate)}.`
            : `Order ${item.detailLine || '-'} dengan jadwal instalasi ${formatDateTime(item.detailDate)}.`,
        meta: [
          `Flow: ${item.flowKind}`,
          ...(item.flowKind === 'ORDER' ? [`Order ID: ${item.sourceId ?? '-'}`] : []),
          `Marketing: ${item.marketingName || '-'}`,
          `At: ${formatDateTime(item.detailDate)}`,
        ],
      })),
    },
    {
      title: 'Work Order Aktif',
      description: 'Work order delivery terbaru dari review DB untuk memantau order yang sudah bergerak ke tahap lapangan.',
      rows: workOrders.map((item) => ({
        id: `WO-${item.workOrderId}`,
        primary: item.workOrderNo,
        secondary: item.customerName,
        status: item.status,
        detail: `Work order ${item.workType} ditautkan ke order ${item.orderNo || '-'} dengan jadwal ${formatDateTime(item.scheduledAt)}.`,
        meta: [
          `Type: ${item.workType}`,
          `Order: ${item.orderNo || '-'}`,
          `Technician: ${item.technicianName || '-'}`,
          `Scheduled: ${formatDateTime(item.scheduledAt)}`,
        ],
      })),
    },
    {
      title: 'Subscription Aktivasi Terbaru',
      description: 'Subscription terbaru dari aktivasi order untuk memastikan alur delivery sudah benar-benar masuk ke layanan aktif.',
      rows: activations.map((item) => ({
        id: `SUB-${item.subscriptionId}`,
        primary: item.serviceNo,
        secondary: item.customerName,
        status: item.status,
        detail: `Layanan ${item.packageName || '-'} ${item.speedLabel ? `(${item.speedLabel})` : ''} berasal dari order ${item.orderNo || '-'}.`,
        meta: [
          `Order: ${item.orderNo || '-'}`,
          `Harga: ${formatCurrency(item.monthlyPrice)}`,
          `Aktivasi: ${formatDateTime(item.activatedAt)}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbInventorySections(): Promise<DomainReviewSection[]> {
  await ensureInventoryLoanTable()
  await ensureInventoryRequestTable()

  const items = await runReviewDbQuery<ReviewDbInventoryItemRow>(`
    SELECT
      ii.id AS itemId,
      ii.item_code AS itemCode,
      ii.item_name AS itemName,
      ic.code AS categoryCode,
      iu.code AS unitCode,
      ii.current_stock AS currentStock,
      ii.minimum_stock AS minimumStock,
      ii.status
    FROM inventory_items ii
    LEFT JOIN inventory_categories ic
      ON ic.id = ii.category_id
    LEFT JOIN inventory_units iu
      ON iu.id = ii.unit_id
    ORDER BY ii.updated_at DESC, ii.id DESC
    LIMIT 5
  `)

  const movements = await runReviewDbQuery<ReviewDbInventoryMovementRow>(`
    SELECT
      ism.id AS movementId,
      ism.movement_type AS movementType,
      ism.reference_no AS referenceNo,
      ism.qty,
      ism.unit_price AS unitPrice,
      ism.movement_at AS movementAt,
      ii.item_name AS itemName,
      ii.item_code AS itemCode,
      ism.notes
    FROM inventory_stock_movements ism
    JOIN inventory_items ii
      ON ii.id = ism.item_id
    ORDER BY ism.movement_at DESC, ism.id DESC
    LIMIT 5
  `)

  const odps = await runReviewDbQuery<ReviewDbInventoryOdpRow>(`
    SELECT
      id AS odpId,
      code AS odpCode,
      name AS odpName,
      total_ports AS totalPorts,
      active_ports AS activePorts,
      location_text AS locationText,
      latitude,
      longitude
    FROM network_odp
    ORDER BY updated_at DESC, id DESC
    LIMIT 5
  `)

  const usedPorts = await runReviewDbQuery<ReviewDbInventoryOdpPortRow>(`
    SELECT
      nop.id AS portId,
      no.code AS odpCode,
      nop.port_no AS portNo,
      nop.port_status AS portStatus,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode,
      nop.installed_at AS installedAt
    FROM network_odp_ports nop
    JOIN network_odp no
      ON no.id = nop.odp_id
    LEFT JOIN service_subscriptions ss
      ON ss.id = nop.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = nop.customer_id
    WHERE nop.port_status = 'USED'
    ORDER BY COALESCE(nop.installed_at, nop.created_at) DESC, nop.id DESC
    LIMIT 5
  `)

  const assignments = await runReviewDbQuery<ReviewDbInventoryDeviceAssignmentRow>(`
    SELECT
      sda.id AS assignmentId,
      ii.item_code AS itemCode,
      ii.item_name AS itemName,
      ic.code AS categoryCode,
      sda.assignment_status AS assignmentStatus,
      sda.assigned_at AS assignedAt,
      ss.service_no AS serviceNo,
      swo.work_order_no AS workOrderNo,
      c.full_name AS customerName,
      sda.serial_number AS serialNumber
    FROM service_device_assignments sda
    JOIN inventory_items ii
      ON ii.id = sda.inventory_item_id
    LEFT JOIN inventory_categories ic
      ON ic.id = ii.category_id
    LEFT JOIN service_subscriptions ss
      ON ss.id = sda.subscription_id
    LEFT JOIN service_work_orders swo
      ON swo.id = sda.work_order_id
    LEFT JOIN crm_customers c
      ON c.id = sda.customer_id
    ORDER BY sda.assigned_at DESC, sda.id DESC
    LIMIT 5
  `)

  const portIssues = await runReviewDbQuery<ReviewDbInventoryOdpPortRow>(`
    SELECT
      nop.id AS portId,
      no.code AS odpCode,
      nop.port_no AS portNo,
      nop.port_status AS portStatus,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode,
      nop.installed_at AS installedAt
    FROM network_odp_ports nop
    JOIN network_odp no
      ON no.id = nop.odp_id
    LEFT JOIN service_subscriptions ss
      ON ss.id = nop.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = nop.customer_id
    WHERE nop.port_status IN ('RESERVED', 'FAULTY', 'DISABLED')
    ORDER BY nop.updated_at DESC, nop.id DESC
    LIMIT 5
  `)

  const returns = await runReviewDbQuery<ReviewDbInventoryDeviceReturnRow>(`
    SELECT
      sda.id AS assignmentId,
      ii.item_code AS itemCode,
      ii.item_name AS itemName,
      sda.assignment_status AS assignmentStatus,
      sda.returned_at AS returnedAt,
      ss.service_no AS serviceNo,
      swo.work_order_no AS workOrderNo,
      c.full_name AS customerName,
      sda.serial_number AS serialNumber
    FROM service_device_assignments sda
    JOIN inventory_items ii
      ON ii.id = sda.inventory_item_id
    LEFT JOIN service_subscriptions ss
      ON ss.id = sda.subscription_id
    LEFT JOIN service_work_orders swo
      ON swo.id = sda.work_order_id
    LEFT JOIN crm_customers c
      ON c.id = sda.customer_id
    WHERE sda.assignment_status IN ('RETURNED', 'DAMAGED', 'LOST')
      AND sda.returned_at IS NOT NULL
    ORDER BY sda.returned_at DESC, sda.id DESC
    LIMIT 5
  `)

  const requests = await runReviewDbQuery<ReviewDbInventoryRequestRow>(`
    SELECT
      iir.id AS requestId,
      iir.request_code AS requestCode,
      iir.request_qty AS requestQty,
      iir.request_status AS requestStatus,
      iir.requested_division AS requestedDivision,
      iir.requested_subdivision AS requestedSubdivision,
      iir.requested_for AS requestedFor,
      iir.request_notes AS requestNotes,
      iir.pending_reason AS pendingReason,
      iir.requested_by AS requestedBy,
      iir.processed_by AS processedBy,
      iir.requested_at AS requestedAt,
      iir.processed_at AS processedAt,
      ii.item_code AS itemCode,
      ii.item_name AS itemName,
      ii.current_stock AS currentStock
    FROM inventory_item_requests iir
    JOIN inventory_items ii
      ON ii.id = iir.inventory_item_id
    ORDER BY iir.requested_at DESC, iir.id DESC
    LIMIT 5
  `)

  const loans = await runReviewDbQuery<ReviewDbInventoryLoanRow>(`
    SELECT
      iil.id AS loanId,
      iil.loan_code AS loanCode,
      iil.loan_qty AS loanQty,
      iil.returned_qty AS returnedQty,
      iil.loan_status AS loanStatus,
      iil.borrower_name AS borrowerName,
      iil.borrower_division AS borrowerDivision,
      iil.borrower_subdivision AS borrowerSubdivision,
      iil.loan_notes AS loanNotes,
      iil.return_notes AS returnNotes,
      iil.borrowed_at AS borrowedAt,
      iil.due_at AS dueAt,
      iil.returned_at AS returnedAt,
      ii.item_code AS itemCode,
      ii.item_name AS itemName
    FROM inventory_item_loans iil
    JOIN inventory_items ii
      ON ii.id = iil.inventory_item_id
    ORDER BY iil.borrowed_at DESC, iil.id DESC
    LIMIT 5
  `)

  return [
    {
      title: 'Item Inventory Terbaru',
      description: 'Item master terbaru dari review DB untuk memulai kontrol stok, kategori, dan satuan barang.',
      rows: items.map((item) => ({
        id: `ITEM-${item.itemId}`,
        primary: item.itemCode,
        secondary: item.itemName,
        status: item.status,
        detail: `Stok saat ini ${formatNumber(item.currentStock)} ${item.unitCode || 'unit'} dengan minimum ${formatNumber(item.minimumStock)}.`,
        meta: [
          `Category: ${item.categoryCode || '-'}`,
          `Unit: ${item.unitCode || '-'}`,
          `Current Stock: ${formatNumber(item.currentStock)}`,
          `Minimum: ${formatNumber(item.minimumStock)}`,
        ],
      })),
    },
    {
      title: 'Stock Movement Terbaru',
      description: 'Pergerakan stok terbaru dari review DB untuk menautkan item inventory dengan aktivitas operasional lapangan.',
      rows: movements.map((item) => ({
        id: `MOV-${item.movementId}`,
        primary: item.movementType,
        secondary: `${item.itemCode} | ${item.itemName}`,
        status: item.referenceNo || 'NO-REF',
        detail: item.notes?.trim() || `Pergerakan ${item.movementType} sebanyak ${formatNumber(item.qty)} item.`,
        meta: [
          `Qty: ${formatNumber(item.qty)}`,
          `Harga: ${formatCurrency(item.unitPrice)}`,
          `At: ${formatDateTime(item.movementAt)}`,
        ],
      })),
    },
    {
      title: 'ODP Terbaru',
      description: 'ODP terbaru dari review DB untuk memulai pemetaan port dan assignment jaringan.',
      rows: odps.map((item) => ({
        id: `ODP-${item.odpId}`,
        primary: item.odpCode,
        secondary: item.odpName,
        status: `${formatNumber(item.activePorts)}/${formatNumber(item.totalPorts)}`,
        detail: item.locationText?.trim() || 'Lokasi ODP belum diisi.',
        meta: [
          `Total Ports: ${formatNumber(item.totalPorts)}`,
          `Active Ports: ${formatNumber(item.activePorts)}`,
          `Latitude: ${item.latitude ?? '-'}`,
          `Longitude: ${item.longitude ?? '-'}`,
        ],
      })),
    },
    {
      title: 'Port Terpakai',
      description: 'Port ODP yang sudah digunakan untuk layanan aktif agar mapping port lebih mudah diaudit dari inventory.',
      rows: usedPorts.map((item) => ({
        id: `PORT-${item.portId}`,
        primary: `${item.odpCode} #${item.portNo}`,
        secondary: item.serviceNo || item.customerCode || '-',
        status: item.portStatus,
        detail: `Installed ${formatDateTime(item.installedAt)}.`,
        meta: [
          `Service: ${item.serviceNo || '-'}`,
          `Customer: ${item.customerCode || '-'}`,
          `Installed: ${formatDateTime(item.installedAt)}`,
        ],
      })),
    },
    {
      title: 'Device Assignment Terbaru',
      description: 'Assignment perangkat terbaru dari review DB untuk menautkan stok keluar dengan subscription/work order.',
      rows: assignments.map((item) => ({
        id: `ASSIGN-${item.assignmentId}`,
        primary: `${item.itemCode} | ${item.itemName}`,
        secondary: item.customerName || item.serviceNo || '-',
        status: item.assignmentStatus,
        detail: `Assigned ${formatDateTime(item.assignedAt)} untuk ${item.serviceNo || item.workOrderNo || '-'}.`,
        meta: [
          `Category: ${item.categoryCode || '-'}`,
          `Service: ${item.serviceNo || '-'}`,
          `Work Order: ${item.workOrderNo || '-'}`,
          `Serial: ${item.serialNumber || '-'}`,
        ],
      })),
    },
    {
      title: 'Port Bermasalah',
      description: 'Port yang sedang reserved, faulty, atau disabled agar tim jaringan cepat melihat kendala ketersediaan port.',
      rows: portIssues.map((item) => ({
        id: `PORT-ISSUE-${item.portId}`,
        primary: `${item.odpCode} #${item.portNo}`,
        secondary: item.serviceNo || item.customerCode || '-',
        status: item.portStatus,
        detail: item.portStatus === 'RESERVED' ? 'Port sedang dicadangkan.' : 'Port membutuhkan penanganan jaringan.',
        meta: [
          `Service: ${item.serviceNo || '-'}`,
          `Customer: ${item.customerCode || '-'}`,
          `Installed: ${formatDateTime(item.installedAt)}`,
        ],
      })),
    },
    {
      title: 'Request Inventory Teknisi',
      description: 'Request barang harian dari teknisi/internal inventory dengan alur mirip marketplace untuk diproses sampai selesai.',
      rows: requests.map((item) => ({
        id: `REQ-${item.requestId}`,
        primary: item.requestCode,
        secondary: `${item.itemCode} | ${item.itemName}`,
        status:
          item.requestStatus === 'ON_PROGRESS'
            ? 'ON PROGRESS'
            : item.requestStatus === 'COMPLETED'
              ? 'SELESAI'
              : item.requestStatus,
        detail:
          item.requestStatus === 'PENDING'
            ? item.pendingReason?.trim() || 'Request sedang pending.'
            : item.requestNotes?.trim() ||
              `Request ${formatNumber(item.requestQty)} item untuk ${item.requestedFor || item.requestedBy} dari ${item.requestedSubdivision || item.requestedDivision || 'tim teknisi'}.`,
        meta: [
          `Qty: ${formatNumber(item.requestQty)}`,
          `Divisi: ${item.requestedDivision || '-'}`,
          `Sub-divisi: ${item.requestedSubdivision || '-'}`,
          `Untuk: ${item.requestedFor || '-'}`,
          `Requester: ${item.requestedBy}`,
          `Processor: ${item.processedBy || '-'}`,
          `Stock Saat Ini: ${formatNumber(item.currentStock)}`,
          `Requested: ${formatDateTime(item.requestedAt)}`,
          `Processed: ${formatDateTime(item.processedAt)}`,
        ],
      })),
    },
    {
      title: 'Pinjaman Inventory',
      description: 'Barang inventaris yang dipinjam dan wajib kembali ke gudang agar stok alat kerja tidak tercampur dengan barang habis pakai.',
      rows: loans.map((item) => {
        const remainingQty = Math.max(item.loanQty - item.returnedQty, 0)
        const dueAtDate = item.dueAt ? new Date(item.dueAt) : null
        const isOverdue =
          remainingQty > 0 && dueAtDate instanceof Date && !Number.isNaN(dueAtDate.getTime()) && dueAtDate.getTime() < Date.now()
        const displayStatus = isOverdue ? 'OVERDUE' : item.loanStatus
        const detailBase =
          item.returnNotes?.trim() ||
          item.loanNotes?.trim() ||
          `Pinjaman ${formatNumber(item.loanQty)} item untuk ${item.borrowerName}.`

        return {
          id: `LOAN-${item.loanId}`,
          primary: item.loanCode,
          secondary: `${item.itemCode} | ${item.itemName}`,
          status: displayStatus,
          detail:
            displayStatus === 'OVERDUE'
              ? `Pengembalian melewati target. ${detailBase}`
              : detailBase,
          meta: [
            `Peminjam: ${item.borrowerName}`,
            `Divisi: ${item.borrowerDivision || '-'}`,
            `Sub-divisi: ${item.borrowerSubdivision || '-'}`,
            `Qty Pinjam: ${formatNumber(item.loanQty)}`,
            `Qty Kembali: ${formatNumber(item.returnedQty)}`,
            `Sisa Pinjam: ${formatNumber(remainingQty)}`,
            `Dipinjam: ${formatDateTime(item.borrowedAt)}`,
            `Jatuh Tempo: ${formatDateTime(item.dueAt)}`,
            `Dikembalikan: ${formatDateTime(item.returnedAt)}`,
          ],
        }
      }),
    },
    {
      title: 'Device Return Terbaru',
      description: 'Histori return perangkat terbaru untuk memulihkan stok dan audit perangkat yang rusak/hilang.',
      rows: returns.map((item) => ({
        id: `RETURN-${item.assignmentId}`,
        primary: `${item.itemCode} | ${item.itemName}`,
        secondary: item.customerName || item.serviceNo || '-',
        status: item.assignmentStatus,
        detail: `Return ${formatDateTime(item.returnedAt)} untuk ${item.serviceNo || item.workOrderNo || '-'}.`,
        meta: [
          `Service: ${item.serviceNo || '-'}`,
          `Work Order: ${item.workOrderNo || '-'}`,
          `Serial: ${item.serialNumber || '-'}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbHrSections(): Promise<DomainReviewSection[]> {
  await ensureHrSalarySlipVoidTable()
  const faceConfig = await getHrAttendanceFaceConfig().catch(() => null)
  const faceReferenceItems = await getRecentHrEmployeeFaceReferenceItems(5).catch(() => [])
  const faceReferenceHistoryItems = await getRecentHrEmployeeFaceReferenceHistoryItems(8).catch(() => [])
  const faceReferenceTrendItems = await getHrEmployeeFaceReferenceTrendItems(5).catch(() => [])
  const faceRetakeQueueItems = await getRecentHrAttendanceFaceRetakeQueueItems(5).catch(() => [])
  const facePriorityQueueItems = await getHrAttendanceFacePriorityQueueItems(8).catch(() => [])
  const verifiedFaceReferenceCandidates = await getVerifiedHrEmployeeFaceReferenceCandidates(5).catch(() => [])
  const faceReviewItems = await getRecentHrAttendanceFaceReviewItems(5).catch(() => [])
  const faceOutcomeAnalytics = await getHrAttendanceFaceOutcomeAnalytics().catch(() => null)
  const geofenceConfig = await getHrAttendanceGeofenceConfig().catch(() => null)


  const employees = await runReviewDbQuery<ReviewDbHrEmployeeRow>(`
    SELECT
      he.id AS employeeId,
      he.employee_code AS employeeCode,
      he.full_name AS fullName,
      he.position_name AS positionName,
      he.employment_status AS employmentStatus,
      he.join_date AS joinDate,
      he.phone,
      od.name AS divisionName,
      ob.name AS branchName
    FROM hr_employees he
    LEFT JOIN org_divisions od
      ON od.id = he.division_id
    LEFT JOIN org_branches ob
      ON ob.id = he.branch_id
    ORDER BY COALESCE(he.join_date, DATE(he.created_at)) DESC, he.id DESC
    LIMIT 5
  `)

  const attendances = await runReviewDbQuery<ReviewDbHrAttendanceRow>(`
    SELECT
      ha.id AS attendanceId,
      he.full_name AS employeeName,
      DATE_FORMAT(ha.attendance_date, '%Y-%m-%d') AS attendanceDate,
      ha.status,
      CAST(ha.check_in AS CHAR) AS checkIn,
      CAST(ha.check_out AS CHAR) AS checkOut,
      ha.overtime_hours AS overtimeHours,
      ha.locked_by_admin AS lockedByAdmin
    FROM hr_attendance ha
    JOIN hr_employees he
      ON he.id = ha.employee_id
    WHERE ha.attendance_date = CURRENT_DATE
    ORDER BY COALESCE(ha.check_in, ha.created_at) DESC, ha.id DESC
    LIMIT 5
  `)

  const loans = await runReviewDbQuery<ReviewDbHrLoanRow>(`
    SELECT
      hl.id AS loanId,
      he.full_name AS employeeName,
      hl.loan_type AS loanType,
      hl.amount,
      hl.monthly_installment AS monthlyInstallment,
      hl.status
    FROM hr_loans hl
    JOIN hr_employees he
      ON he.id = hl.employee_id
    ORDER BY hl.loan_date DESC, hl.id DESC
    LIMIT 5
  `)

  const salarySlips = await runReviewDbQuery<ReviewDbHrSalarySlipRow>(`
    SELECT
      hss.id AS salarySlipId,
      he.full_name AS employeeName,
      hss.payroll_month AS payrollMonth,
      hss.payroll_year AS payrollYear,
      hss.total_income AS totalIncome,
      hss.total_deduction AS totalDeduction,
      hss.net_salary AS netSalary,
      hss.released_at AS releasedAt,
      hsv.voided_at AS voidedAt,
      hsv.reason_text AS voidReason
    FROM hr_salary_slips hss
    JOIN hr_employees he
      ON he.id = hss.employee_id
    LEFT JOIN hr_salary_slip_voids hsv
      ON hsv.salary_slip_id = hss.id
    ORDER BY hss.payroll_year DESC, hss.payroll_month DESC, hss.id DESC
    LIMIT 5
  `)

  return [
    {
      title: 'Face Attendance',
      description:
        'Konfigurasi verifikasi wajah attendance untuk menyiapkan jalur capture browser sebelum phase face recognition penuh diaktifkan.',
      rows: [
        faceConfig
          ? {
              id: 'ATT-FACE-1',
              primary: faceConfig.verificationMode,
              secondary: faceConfig.isRequired ? 'Wajib saat check-in' : 'Masih opsional',
              status: faceConfig.isRequired ? 'REQUIRED' : 'OPTIONAL',
              detail: `Face attendance aktif dengan mode ${faceConfig.verificationMode}.`,
              meta: [
                `Required: ${faceConfig.isRequired ? 'Ya' : 'Tidak'}`,
                `Mode: ${faceConfig.verificationMode}`,
                `Auto Verify: ${faceConfig.autoVerifyHighConfidence ? 'Ya' : 'Tidak'}`,
                `Auto Verify Min Score: ${faceConfig.autoVerifyMinScore}`,
                `Updated By: ${faceConfig.updatedBy || '-'}`,
                `Updated At: ${formatDateTime(faceConfig.updatedAt)}`,
                `Notes: ${faceConfig.notes || '-'}`,
              ],
            }
          : {
              id: 'ATT-FACE-EMPTY',
              primary: 'Face attendance belum diatur',
              secondary: 'Verifikasi wajah belum aktif',
              status: 'NOT_SET',
              detail: 'Atur mode verifikasi wajah agar attendance web siap menerima referensi capture browser.',
              meta: ['Required: Tidak', 'Mode: MANUAL_REVIEW', 'Auto Verify: Tidak', 'Auto Verify Min Score: 85', 'Notes: Belum ada konfigurasi face attendance.'],
            },
      ],
    },
    {
      title: 'Face Priority Queue',
      description:
        'Daftar kerja prioritas untuk HR yang menggabungkan capture retake pending dan baseline employee yang mulai drifting agar tindak lanjut harian bisa langsung dieksekusi.',
      rows:
        facePriorityQueueItems.length > 0
          ? facePriorityQueueItems.map((item) => ({
              id: `FACE-PRIORITY-${item.faceLogId > 0 ? item.faceLogId : item.employeeId}`,
              primary: item.employeeCode,
              secondary: item.employeeName,
              status: `${item.queueType} • P${item.priorityScore}`,
              detail: item.detailReason,
              meta: [
                `Queue Type: ${item.queueType}`,
                `Priority Score: ${item.priorityScore}`,
                `Attendance ID: ${item.attendanceId > 0 ? item.attendanceId : '-'}`,
                `Face Log ID: ${item.faceLogId > 0 ? item.faceLogId : '-'}`,
                `Capture Ref: ${item.captureRef || '-'}`,
                `Reference Ref: ${item.referenceRef || '-'}`,
                `Retake Status: ${item.retakeStatus || '-'}`,
                `Drift Status: ${item.driftStatus}`,
                `Latest Score: ${formatNumber(item.latestScore)}`,
                `Average Score: ${item.averageScore.toFixed(1)}`,
                `Best Score: ${formatNumber(item.bestScore)}`,
                `Gap From Average: ${item.driftGapFromAverage.toFixed(1)}`,
                `Gap From Best: ${formatNumber(item.driftGapFromBest)}`,
                `Updated By: ${item.latestUpdatedBy || '-'}`,
                `Updated At: ${formatDateTime(item.latestUpdatedAt)}`,
              ],
            }))
          : [
              {
                id: 'FACE-PRIORITY-EMPTY',
                primary: 'Priority queue wajah masih aman',
                secondary: 'Belum ada retake pending atau baseline drifting',
                status: 'CLEAR',
                detail: 'Saat capture retake pending muncul atau baseline employee mulai melemah, item prioritas akan muncul di section ini.',
                meta: [
                  'Queue Type: -',
                  'Priority Score: 0',
                  'Attendance ID: -',
                  'Face Log ID: -',
                  'Capture Ref: -',
                  'Reference Ref: -',
                  'Retake Status: -',
                  'Drift Status: STABLE',
                ],
              },
            ],
    },
    {
      title: 'Review Face Attendance',
      description:
        'Antrean review verifikasi wajah terbaru untuk memastikan snapshot capture browser atau manual review bisa diproses operasional sebelum recognition engine penuh aktif.',
      rows: faceReviewItems.map((item) => ({
        id: `FACE-${item.faceLogId}`,
        primary: item.employeeCode,
        secondary: item.verificationMode,
        status: item.captureStatus,
        detail: `Capture ${item.captureRef} untuk attendance ${item.attendanceDate} dengan skor ${item.matchScore} dan hasil baseline ${item.baselineMatchOutcome}.`,
        meta: [
          `Attendance ID: ${item.attendanceId}`,
          `Date: ${item.attendanceDate}`,
          `Capture Ref: ${item.captureRef}`,
          `Mode: ${item.verificationMode}`,
          `Match Score: ${item.matchScore}`,
          `Confidence Band: ${item.confidenceBand}`,
          `Baseline Reference Ref: ${item.baselineReferenceRef || '-'}`,
          `Baseline Reference Mode: ${item.baselineVerificationMode || '-'}`,
          `Baseline Match Score: ${item.baselineMatchScore}`,
          `Baseline Match Band: ${item.baselineMatchBand}`,
          `Baseline Match Outcome: ${item.baselineMatchOutcome}`,
          `Baseline Match Reason: ${item.baselineMatchReason}`,
          `Recommendation: ${item.recommendedDecision}`,
          `Recommendation Reason: ${item.recommendationReason}`,
          `Auto Review Eligible: ${item.autoReviewEligible ? 'Ya' : 'Tidak'}`,
          `Reviewed By: ${item.reviewedBy || '-'}`,
          `Reviewed At: ${formatDateTime(item.reviewedAt)}`,
          `Review Notes: ${item.reviewNotes || '-'}`,
          `Created At: ${formatDateTime(item.createdAt)}`,
        ],
      })),
    },
    {
      title: 'Face Retake Queue',
      description:
        'Antrean capture wajah yang perlu diulang agar operator HR bisa memprioritaskan pengambilan ulang untuk outcome yang terlalu lemah terhadap baseline employee.',
      rows:
        faceRetakeQueueItems.length > 0
          ? faceRetakeQueueItems.map((item) => ({
              id: `FACE-RETAKE-${item.faceLogId}`,
              primary: item.employeeCode,
              secondary: item.captureRef,
              status: item.queueStatus,
              detail: `Capture ${item.captureRef} untuk attendance ${item.attendanceId} ${item.queueStatus === 'PENDING' ? 'menunggu retake' : 'sudah ditindaklanjuti'}.`,
              meta: [
                `Attendance ID: ${item.attendanceId}`,
                `Capture Ref: ${item.captureRef}`,
                `Reason: ${item.reasonText || '-'}`,
                `Queued By: ${item.queuedBy || '-'}`,
                `Queued At: ${formatDateTime(item.queuedAt)}`,
                `Resolved By: ${item.resolvedBy || '-'}`,
                `Resolved At: ${formatDateTime(item.resolvedAt)}`,
              ],
            }))
          : [
              {
                id: 'FACE-RETAKE-EMPTY',
                primary: 'Antrean retake wajah masih kosong',
                secondary: 'Belum ada capture yang perlu diulang',
                status: 'CLEAR',
                detail: 'Jika review berakhir REJECTED dengan outcome RETAKE, item akan muncul di antrean ini untuk follow-up operasional.',
                meta: [
                  'Attendance ID: -',
                  'Capture Ref: -',
                  'Reason: -',
                  'Queued By: -',
                  'Queued At: -',
                  'Resolved By: -',
                  'Resolved At: -',
                ],
              },
            ],
    },
    {
      title: 'Face Attendance Analytics',
      description:
        'Ringkasan outcome verifikasi wajah untuk memantau backlog review, kualitas placeholder score, dan adopsi camera capture sebelum recognition engine penuh diaktifkan.',
      rows:
        faceOutcomeAnalytics && faceOutcomeAnalytics.totalLogs > 0
          ? [
              {
                id: 'FACE-ANALYTICS-OUTCOME',
                primary: `${formatNumber(faceOutcomeAnalytics.verifiedCount)} VERIFIED / ${formatNumber(faceOutcomeAnalytics.rejectedCount)} REJECTED`,
                secondary: `${formatNumber(faceOutcomeAnalytics.pendingCount)} masih pending review`,
                status: faceOutcomeAnalytics.pendingCount > 0 ? 'ACTION_NEEDED' : 'STABLE',
                detail: `${formatNumber(faceOutcomeAnalytics.reviewedCount)} dari ${formatNumber(faceOutcomeAnalytics.totalLogs)} capture sudah punya keputusan final.`,
                meta: [
                  `Total Capture: ${formatNumber(faceOutcomeAnalytics.totalLogs)}`,
                  `Reviewed Final: ${formatNumber(faceOutcomeAnalytics.reviewedCount)} (${formatPercentage(faceOutcomeAnalytics.reviewedCount, faceOutcomeAnalytics.totalLogs)})`,
                  `Pending Review: ${formatNumber(faceOutcomeAnalytics.pendingCount)} (${formatPercentage(faceOutcomeAnalytics.pendingCount, faceOutcomeAnalytics.totalLogs)})`,
                  `Verified: ${formatNumber(faceOutcomeAnalytics.verifiedCount)}`,
                  `Rejected: ${formatNumber(faceOutcomeAnalytics.rejectedCount)}`,
                  `Latest Capture At: ${formatDateTime(faceOutcomeAnalytics.latestCaptureAt)}`,
                  `Latest Review At: ${formatDateTime(faceOutcomeAnalytics.latestReviewAt)}`,
                ],
              },
              {
                id: 'FACE-ANALYTICS-CONFIDENCE',
                primary: `Avg score ${faceOutcomeAnalytics.averageMatchScore.toFixed(1)}`,
                secondary: `HIGH ${formatNumber(faceOutcomeAnalytics.highConfidenceCount)} | MEDIUM ${formatNumber(faceOutcomeAnalytics.mediumConfidenceCount)} | LOW ${formatNumber(faceOutcomeAnalytics.lowConfidenceCount)}`,
                status: 'ANALYTICS',
                detail: `Distribusi confidence placeholder dihitung dari ${formatNumber(faceOutcomeAnalytics.scoreSampleSize)} capture terbaru.`,
                meta: [
                  `Score Sample Size: ${formatNumber(faceOutcomeAnalytics.scoreSampleSize)}`,
                  `High Confidence: ${formatNumber(faceOutcomeAnalytics.highConfidenceCount)}`,
                  `Medium Confidence: ${formatNumber(faceOutcomeAnalytics.mediumConfidenceCount)}`,
                  `Low Confidence: ${formatNumber(faceOutcomeAnalytics.lowConfidenceCount)}`,
                  `Auto Review Eligible: ${formatNumber(faceOutcomeAnalytics.autoReviewEligibleCount)}`,
                  `Recommended Verified: ${formatNumber(faceOutcomeAnalytics.recommendedVerifiedCount)}`,
                  `Recommended Pending Review: ${formatNumber(faceOutcomeAnalytics.recommendedPendingReviewCount)}`,
                  `Recommended Rejected: ${formatNumber(faceOutcomeAnalytics.recommendedRejectedCount)}`,
                ],
              },
              {
                id: 'FACE-ANALYTICS-MODE',
                primary: `Camera ${formatNumber(faceOutcomeAnalytics.cameraCaptureCount)} capture`,
                secondary: `Manual ${formatNumber(faceOutcomeAnalytics.manualReviewCount)} capture`,
                status: 'MODE_SPLIT',
                detail: 'Memantau pergeseran operasional dari referensi manual ke snapshot kamera browser.',
                meta: [
                  `Camera Capture: ${formatNumber(faceOutcomeAnalytics.cameraCaptureCount)} (${formatPercentage(faceOutcomeAnalytics.cameraCaptureCount, faceOutcomeAnalytics.totalLogs)})`,
                  `Manual Review Mode: ${formatNumber(faceOutcomeAnalytics.manualReviewCount)} (${formatPercentage(faceOutcomeAnalytics.manualReviewCount, faceOutcomeAnalytics.totalLogs)})`,
                  `Total Capture: ${formatNumber(faceOutcomeAnalytics.totalLogs)}`,
                  `Pending Review: ${formatNumber(faceOutcomeAnalytics.pendingCount)}`,
                  `Auto Review Eligible: ${formatNumber(faceOutcomeAnalytics.autoReviewEligibleCount)}`,
                ],
              },
            ]
          : [
              {
                id: 'FACE-ANALYTICS-EMPTY',
                primary: 'Analytics verifikasi wajah belum tersedia',
                secondary: 'Belum ada capture attendance wajah',
                status: 'NO_DATA',
                detail: 'Ringkasan outcome akan muncul otomatis setelah attendance mulai menyimpan capture wajah.',
                meta: [
                  'Total Capture: 0',
                  'Pending Review: 0',
                  'Verified: 0',
                  'Rejected: 0',
                  'Score Sample Size: 0',
                ],
              },
            ],
    },
    {
      title: 'Geofence Attendance',
      description:
        'Konfigurasi titik kerja attendance untuk fondasi validasi radius check-in sebelum face recognition diaktifkan penuh.',
      rows: [
        geofenceConfig
          ? {
              id: 'ATT-GEOFENCE-1',
              primary: geofenceConfig.locationName,
              secondary: `${geofenceConfig.radiusMeters.toFixed(2)} meter`,
              status: geofenceConfig.isRequired ? 'REQUIRED' : 'OPTIONAL',
              detail: `Titik attendance aktif di ${geofenceConfig.locationName} dengan radius ${geofenceConfig.radiusMeters.toFixed(2)} meter.`,
              meta: [
                `Latitude: ${geofenceConfig.latitude ?? '-'}`,
                `Longitude: ${geofenceConfig.longitude ?? '-'}`,
                `Radius: ${geofenceConfig.radiusMeters.toFixed(2)} meter`,
                `Required: ${geofenceConfig.isRequired ? 'Ya' : 'Tidak'}`,
                `Updated By: ${geofenceConfig.updatedBy || '-'}`,
                `Updated At: ${formatDateTime(geofenceConfig.updatedAt)}`,
                `Notes: ${geofenceConfig.notes || '-'}`,
              ],
            }
          : {
              id: 'ATT-GEOFENCE-EMPTY',
              primary: 'Geofence attendance belum diatur',
              secondary: 'Radius belum aktif',
              status: 'NOT_SET',
              detail: 'Atur titik kerja dan radius attendance agar check-in lokasi bisa divalidasi dari browser.',
              meta: ['Required: Tidak', 'Notes: Belum ada konfigurasi geofence attendance.'],
            },
      ],
    },
    {
      title: 'Employee Terbaru',
      description: 'Employee master terbaru dari review DB untuk memulai fondasi absensi, payroll, dan kontrol HR.',
      rows: employees.map((item) => ({
        id: `EMP-${item.employeeId}`,
        primary: item.employeeCode,
        secondary: item.fullName,
        status: item.employmentStatus,
        detail: `${item.positionName || 'Jabatan belum diisi'} pada divisi ${item.divisionName || '-'} dan cabang ${item.branchName || '-'}.`,
        meta: [
          `Join: ${formatDateTime(item.joinDate)}`,
          `Phone: ${item.phone || '-'}`,
          `Division: ${item.divisionName || '-'}`,
          `Branch: ${item.branchName || '-'}`,
        ],
      })),
    },
    {
      title: 'Employee Face References',
      description:
        'Baseline referensi wajah per employee untuk menyiapkan data acuan sebelum recognition engine penuh diaktifkan pada attendance HR.',
      rows:
        faceReferenceItems.length > 0
          ? faceReferenceItems.map((item) => ({
              id: `FACE-REF-${item.employeeId}`,
              primary: item.employeeCode,
              secondary: item.employeeName,
              status: item.employmentStatus,
              detail: `Baseline wajah mode ${item.verificationMode} tersimpan dengan referensi ${item.referenceRef}.`,
              meta: [
                `Employee ID: ${item.employeeId}`,
                `Reference Ref: ${item.referenceRef}`,
                `Mode: ${item.verificationMode}`,
                `Notes: ${item.notes || '-'}`,
                `Updated By: ${item.updatedBy || '-'}`,
                `Updated At: ${formatDateTime(item.updatedAt)}`,
              ],
            }))
          : [
              {
                id: 'FACE-REF-EMPTY',
                primary: 'Baseline referensi wajah belum tersedia',
                secondary: 'Belum ada employee yang punya face reference',
                status: 'NOT_SET',
                detail: 'Simpan referensi wajah per employee agar fondasi matching nanti tidak dimulai dari nol.',
                meta: ['Employee ID: -', 'Reference Ref: -', 'Mode: CAMERA_CAPTURE', 'Notes: -'],
              },
            ],
    },
    {
      title: 'Face Reference Trends',
      description:
        'Ringkasan perkembangan baseline wajah per employee agar HR bisa melihat apakah kualitas referensi membaik, stagnan, atau perlu pengambilan baseline baru.',
      rows:
        faceReferenceTrendItems.length > 0
          ? faceReferenceTrendItems.map((item) => ({
              id: `FACE-TREND-${item.employeeId}`,
              primary: item.employeeCode,
              secondary: item.employeeName,
              status: item.driftStatus,
              detail: `Riwayat ${formatNumber(item.historyCount)} baseline dengan skor terbaru ${formatNumber(item.latestScore)} dan skor terbaik ${formatNumber(item.bestScore)}. ${item.driftReason}`,
              meta: [
                `History Count: ${formatNumber(item.historyCount)}`,
                `Average Score: ${item.averageScore.toFixed(1)}`,
                `Latest Score: ${formatNumber(item.latestScore)}`,
                `Best Score: ${formatNumber(item.bestScore)}`,
                `Drift Status: ${item.driftStatus}`,
                `Gap From Average: ${item.driftGapFromAverage.toFixed(1)}`,
                `Gap From Best: ${formatNumber(item.driftGapFromBest)}`,
                `Drift Reason: ${item.driftReason}`,
                `Latest Mode: ${item.latestVerificationMode}`,
                `Latest Source: ${item.latestSourceType}`,
                `Latest Source Ref: ${item.latestSourceRef || '-'}`,
                `Updated By: ${item.latestUpdatedBy || '-'}`,
                `Updated At: ${formatDateTime(item.latestCreatedAt)}`,
              ],
            }))
          : [
              {
                id: 'FACE-TREND-EMPTY',
                primary: 'Trend baseline wajah belum tersedia',
                secondary: 'Belum ada histori penguatan baseline',
                status: 'NO_DATA',
                detail: 'Trend akan muncul setelah baseline manual atau reinforce review mulai tercatat lebih dari satu kali.',
                meta: [
                  'History Count: 0',
                  'Average Score: 0.0',
                  'Latest Score: 0',
                  'Best Score: 0',
                  'Drift Status: INSUFFICIENT_DATA',
                  'Gap From Average: 0.0',
                  'Gap From Best: 0',
                  'Drift Reason: Histori baseline belum cukup untuk membaca tren penurunan kualitas.',
                ],
              },
            ],
    },
    {
      title: 'Face Reference History',
      description:
        'Jejak perubahan baseline wajah terbaru untuk audit operasional sebelum recognition engine penuh diaktifkan.',
      rows:
        faceReferenceHistoryItems.length > 0
          ? faceReferenceHistoryItems.map((item) => ({
              id: `FACE-HIST-${item.historyId}`,
              primary: item.employeeCode,
              secondary: item.employeeName,
              status: item.sourceType,
              detail: `Baseline ${item.referenceRef} dicatat melalui ${item.sourceType} dengan skor snapshot ${formatNumber(item.scoreSnapshot)}.`,
              meta: [
                `Employee ID: ${item.employeeId}`,
                `Reference Ref: ${item.referenceRef}`,
                `Mode: ${item.verificationMode}`,
                `Score Snapshot: ${formatNumber(item.scoreSnapshot)}`,
                `Source Type: ${item.sourceType}`,
                `Source Ref: ${item.sourceRef || '-'}`,
                `Updated By: ${item.updatedBy || '-'}`,
                `Created At: ${formatDateTime(item.createdAt)}`,
                `Notes: ${item.notes || '-'}`,
              ],
            }))
          : [
              {
                id: 'FACE-HIST-EMPTY',
                primary: 'History baseline wajah belum tersedia',
                secondary: 'Belum ada baseline yang terekam',
                status: 'NO_DATA',
                detail: 'Setelah baseline manual atau reinforce pertama disimpan, jejak history akan muncul di sini.',
                meta: ['Employee ID: -', 'Reference Ref: -', 'Mode: -', 'Score Snapshot: 0', 'Source Type: -'],
              },
            ],
    },
    {
      title: 'Verified Face Candidates',
      description:
        'Capture wajah yang sudah VERIFIED dan siap dipertimbangkan sebagai baseline referensi employee untuk mengurangi input manual saat menyiapkan fondasi matching.',
      rows:
        verifiedFaceReferenceCandidates.length > 0
          ? verifiedFaceReferenceCandidates.map((item) => ({
              id: `FACE-CAND-${item.faceLogId}`,
              primary: item.employeeCode,
              secondary: item.employeeName,
              status: item.employmentStatus,
              detail: `Capture ${item.captureRef} mode ${item.verificationMode} sudah VERIFIED dan siap dijadikan kandidat baseline wajah.`,
              meta: [
                `Employee ID: ${item.employeeId}`,
                `Capture Ref: ${item.captureRef}`,
                `Mode: ${item.verificationMode}`,
                `Reviewed At: ${formatDateTime(item.reviewedAt)}`,
                `Current Reference Ref: ${item.currentReferenceRef || '-'}`,
                `Current Reference Mode: ${item.currentReferenceMode || '-'}`,
              ],
            }))
          : [
              {
                id: 'FACE-CAND-EMPTY',
                primary: 'Belum ada kandidat baseline VERIFIED',
                secondary: 'Capture VERIFIED belum tersedia',
                status: 'NOT_READY',
                detail: 'Operator HR perlu memverifikasi capture wajah dulu sebelum sistem bisa memberi kandidat baseline otomatis.',
                meta: [
                  'Employee ID: -',
                  'Capture Ref: -',
                  'Mode: -',
                  'Reviewed At: -',
                  'Current Reference Ref: -',
                  'Current Reference Mode: -',
                ],
              },
            ],
    },
    {
      title: 'Attendance Hari Ini',
      description: 'Kehadiran terbaru hari ini dari review DB untuk memastikan employee yang aktif mulai tercatat di HR.',
      rows: attendances.map((item) => ({
        id: `ATT-${item.attendanceId}`,
        primary: item.employeeName,
        secondary: item.status,
        status: item.status,
        detail: `Check-in ${formatDateTime(item.checkIn)} dengan overtime ${item.overtimeHours.toFixed(2)} jam.`,
        meta: [
          `Date: ${item.attendanceDate}`,
          `Check In: ${formatDateTime(item.checkIn)}`,
          `Check Out: ${formatDateTime(item.checkOut)}`,
          `Overtime: ${item.overtimeHours.toFixed(2)} jam`,
          `Lock Admin: ${Number(item.lockedByAdmin ?? 0) === 1 ? 'Ya' : 'Tidak'}`,
          `Check In Raw: ${formatDateTimeInputValue(item.checkIn) || '-'}`,
          `Check Out Raw: ${formatDateTimeInputValue(item.checkOut) || '-'}`,
          `Overtime Raw: ${item.overtimeHours.toFixed(2)}`,
          `Lock Raw: ${Number(item.lockedByAdmin ?? 0) === 1 ? '1' : '0'}`,
        ],
      })),
    },
    {
      title: 'Loan Terbaru',
      description: 'Kasbon atau pinjaman terbaru dari review DB untuk menjaga histori HR tetap terlihat, termasuk yang sudah dibatalkan secara non-destruktif.',
      rows: loans.map((item) => ({
        id: `LOAN-${item.loanId}`,
        primary: item.employeeName,
        secondary: item.loanType,
        status: item.status,
        detail: `Pinjaman ${formatCurrency(item.amount)} dengan cicilan ${formatCurrency(item.monthlyInstallment)} per bulan.`,
        meta: [
          `Loan Type: ${item.loanType}`,
          `Amount: ${formatCurrency(item.amount)}`,
          `Installment: ${formatCurrency(item.monthlyInstallment)}`,
        ],
      })),
    },
    {
      title: 'Slip Gaji Terbaru',
      description: 'Slip gaji terbaru dari review DB untuk menutup loop HR dari employee, attendance, loan, sampai payroll.',
      rows: salarySlips.map((item) => ({
        id: `PAYROLL-${item.salarySlipId}`,
        primary: item.employeeName,
        secondary: `${String(item.payrollMonth).padStart(2, '0')}/${item.payrollYear}`,
        status: item.voidedAt ? 'VOIDED' : item.releasedAt ? 'RELEASED' : 'DRAFT',
        detail: `Net salary ${formatCurrency(item.netSalary)} dari total income ${formatCurrency(item.totalIncome)} dan deduction ${formatCurrency(item.totalDeduction)}.`,
        meta: [
          `Income: ${formatCurrency(item.totalIncome)}`,
          `Deduction: ${formatCurrency(item.totalDeduction)}`,
          `Released: ${formatDateTime(item.releasedAt)}`,
          `Voided: ${formatDateTime(item.voidedAt)}`,
          `Void Reason: ${item.voidReason || '-'}`,
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

function applyReviewDbInventorySections(content: DomainPageContent, reviewSections: DomainReviewSection[]) {
  if (content.key !== 'inventory' || reviewSections.length === 0) {
    return content
  }

  return {
    ...content,
    reviewSections,
  }
}

function applyReviewDbHrSections(content: DomainPageContent, reviewSections: DomainReviewSection[]) {
  if (content.key !== 'hr' || reviewSections.length === 0) {
    return content
  }

  return {
    ...content,
    reviewSections,
  }
}

function buildSupportFocus(
  content: DomainPageContent,
  role: AppRole,
  selectedLane: SupportLaneKey | null,
): DomainSupportFocus | undefined {
  if (content.key !== 'support') {
    return undefined
  }

  const sections = content.reviewSections ?? []
  const defaultLane = getPreferredSupportLane(role)
  const activeLane = getActiveSupportLane(role, selectedLane)
  const lanes = buildSupportLaneSnapshots(role, sections)
  const visibleSections = selectedLane ? getSupportLaneSections(sections, selectedLane) : sections

  return {
    defaultLane,
    selectedLane,
    activeLane,
    lanes,
    activeWorkspace: buildSupportLaneWorkspace(role, activeLane, lanes),
    visibleSections,
    reviewSummary: buildSupportLaneReviewSummary(visibleSections),
  }
}

export async function getDomainPageData(
  domain: DomainKey,
  role: AppRole,
  options?: { supportLane?: SupportLaneKey | null },
): Promise<DomainPageData | null> {
  const source = getDataSourceSnapshot()
  const content = domainPages[domain]
  const selectedSupportLane = domain === 'support' ? options?.supportLane ?? null : null

  if (!content) {
    return null
  }

  if (source.effectiveMode !== 'review-db') {
    return {
      source,
      content,
      capabilities: buildCapabilities(role, domain),
      supportFocus: buildSupportFocus(content, role, selectedSupportLane),
    }
  }

  try {
    const stats = await getReviewDbDomainStats()
    const salesSections = domain === 'sales' ? await getReviewDbSalesSections() : []
    const supportSections = domain === 'support' ? await getReviewDbSupportSections(selectedSupportLane) : []
    const customerSections = domain === 'customers' ? await getReviewDbCustomerSections() : []
    const billingSections = domain === 'billing' ? await getReviewDbBillingSections() : []
    const inventorySections = domain === 'inventory' ? await getReviewDbInventorySections() : []
    const hrSections = domain === 'hr' ? await getReviewDbHrSections() : []

    const nextContent = applyReviewDbHrSections(
      applyReviewDbInventorySections(
        applyReviewDbSalesSections(
          applyReviewDbBillingSections(
            applyReviewDbCustomerSections(
              applyReviewDbSupportSections(applyReviewDbSummaries(content, stats), supportSections),
              customerSections,
            ),
            billingSections,
          ),
          salesSections,
        ),
        inventorySections,
      ),
      hrSections,
    )

    return {
      source,
      content: nextContent,
      capabilities: buildCapabilities(role, domain),
      supportFocus: buildSupportFocus(nextContent, role, selectedSupportLane),
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      content,
      capabilities: buildCapabilities(role, domain),
      supportFocus: buildSupportFocus(content, role, selectedSupportLane),
    }
  }
}
