import { canPerformAction } from '@/lib/access-control'
import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { domainPages } from '@/lib/mock-domains'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { readThroughServerTtlCache, runOncePerServer } from '@/lib/server-ttl-cache'
import { getServerUiLanguage } from '@/lib/ui-language-server'
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
import { ensureHrEmployeeKpiTable, listRecentHrEmployeeKpis } from '@/lib/services/hr-employee-kpi-service'
import { ensureInventoryLoanTable } from '@/lib/services/inventory-loan-service'
import { ensureInventoryRequestTable } from '@/lib/services/inventory-request-service'
import { ensureHrSalarySlipVoidTable } from '@/lib/services/hr-salary-slip-void-service'
import {
  ensureSupportDismantleQueueTable,
  parseStructuredSupportNote,
  SUPPORT_DISMANTLE_METADATA_PREFIXES,
} from '@/lib/services/support-dismantle-service'
import { ensureSupportTroubleTicketEscalationTable } from '@/lib/services/support-ticket-escalation-service'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'
import {
  buildSupportLaneSnapshots,
  buildSupportLaneReviewSummary,
  buildSupportLaneWorkspace,
  canAccessSupportLane,
  getActiveSupportLane,
  getPreferredSupportLane,
  getSupportLaneSections,
} from '@/lib/support-lanes'
import type { AppSession } from '@/lib/auth-session'
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

type BranchScope = {
  mode: 'GLOBAL' | 'BRANCH_SET' | 'BRANCH_ONLY'
  branchIds: number[]
}

const DOMAIN_PAGE_CACHE_TTL_MS = 15_000

function buildDomainSessionCacheScope(session: AppSession) {
  return JSON.stringify({
    username: session.username,
    role: session.role,
    branchId: session.branchId,
    branchIds: session.branchIds,
  })
}

async function ensureDomainSupportDismantleQueueTable() {
  await runOncePerServer('domain-support-dismantle-queue-table', async () => {
    await ensureSupportDismantleQueueTable()
  })
}

async function ensureDomainSupportTicketReadTables() {
  await runOncePerServer('domain-support-ticket-read-tables', async () => {
    await Promise.all([ensureSupportTroubleTicketProgressTable(), ensureSupportTroubleTicketEscalationTable()])
  })
}

async function ensureDomainInventoryReadTables() {
  await runOncePerServer('domain-inventory-read-tables', async () => {
    await Promise.all([ensureInventoryLoanTable(), ensureInventoryRequestTable()])
  })
}

async function ensureDomainHrReadTables() {
  await runOncePerServer('domain-hr-read-tables', async () => {
    await Promise.all([ensureHrSalarySlipVoidTable(), ensureHrEmployeeKpiTable()])
  })
}

function resolveBranchScope(session: AppSession): BranchScope {
  if (session.role === 'SUPER_ADMIN' || session.role === 'OWNER') {
    return { mode: 'GLOBAL', branchIds: [] }
  }

  if (session.role === 'ADMIN') {
    const branchIds = Array.isArray(session.branchIds)
      ? session.branchIds.filter((value) => Number.isFinite(value) && value > 0)
      : []
    const fallback = session.branchId && Number.isFinite(session.branchId) && session.branchId > 0 ? [session.branchId] : []
    return { mode: 'BRANCH_SET', branchIds: branchIds.length > 0 ? branchIds : fallback }
  }

  if (session.branchId && Number.isFinite(session.branchId) && session.branchId > 0) {
    return { mode: 'BRANCH_ONLY', branchIds: [session.branchId] }
  }

  return { mode: 'BRANCH_ONLY', branchIds: [] }
}

function buildBranchWhere(scope: BranchScope, columnRef: string) {
  if (scope.mode === 'GLOBAL') {
    return { clause: '', values: [] as unknown[] }
  }
  if (scope.branchIds.length === 0) {
    return { clause: 'AND 1 = 0', values: [] as unknown[] }
  }
  if (scope.branchIds.length === 1) {
    return { clause: `AND ${columnRef} = ?`, values: [scope.branchIds[0]] as unknown[] }
  }
  return { clause: `AND ${columnRef} IN (?)`, values: [scope.branchIds] as unknown[] }
}

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
  serviceNo: string | null
  customerCode: string | null
  customerPhone: string | null
  ticketType: string
  status: string
  notes: string | null
  openedAt: string | Date
  closedAt: string | Date | null
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
  serviceNo: string | null
  customerCode: string | null
  radboxName: string | null
  customerPhone: string | null
  marketingName: string | null
  status: string
  reason: string | null
  isolationDate: string | Date | null
  hasDismantleQueue: number
}

type ReviewDbSupportDismantleOpenRow = {
  queueId: number
  isolationId: number
  customerName: string
  serviceNo: string | null
  customerCode: string | null
  radboxName: string | null
  customerPhone: string | null
  marketingName: string | null
  status: string
  transferNote: string | null
  isolationReason: string | null
  transferredAt: string | Date | null
  ageDays: number | null
}

type ReviewDbSupportSlaRow = {
  troubleType: string
  durationDays: number
  updatedAt: string | Date
}

type ReviewDbSupportDismantleRow = {
  dismantleId: number
  customerName: string
  serviceNo: string | null
  customerCode: string | null
  radboxName: string | null
  customerPhone: string | null
  marketingName: string | null
  closeNote: string | null
  closedAt: string | Date | null
  returnedItemCodes: string | null
  relatedWorkOrderId?: number | null
  relatedWorkOrderNo?: string | null
  relatedTroubleTicketId?: number | null
  relatedTicketRef?: string | null
}

type SupportNonTicketReadSchema = {
  isolationStatus: boolean
  isolationCustomerName: boolean
  isolationSubscriptionId: boolean
  isolationRadboxName: boolean
  isolationCustomerPhone: boolean
  isolationMarketingName: boolean
  isolationReason: boolean
  isolationDate: boolean
  isolationIsArchived: boolean
  subscriptionId: boolean
  subscriptionServiceNo: boolean
  subscriptionCustomerId: boolean
  customerId: boolean
  customerCode: boolean
  dismantleQueueId: boolean
  dismantleQueueIsolationId: boolean
  dismantleQueueTransferNote: boolean
  dismantleQueueTransferredAt: boolean
  dismantleHistoryId: boolean
  dismantleHistoryIsolationId: boolean
  dismantleHistoryCustomerName: boolean
  dismantleHistoryRadboxName: boolean
  dismantleHistoryCustomerPhone: boolean
  dismantleHistoryMarketingName: boolean
  dismantleHistoryCloseNote: boolean
  dismantleHistoryClosedAt: boolean
  dismantleHistoryReturnedItemCodes: boolean
}

type BillingReadSchema = {
  subscriptionId: boolean
  subscriptionServiceNo: boolean
  subscriptionStatus: boolean
  subscriptionCustomerId: boolean
  subscriptionPackageId: boolean
  subscriptionMonthlyPrice: boolean
  subscriptionActivatedAt: boolean
  subscriptionCreatedAt: boolean
  customerId: boolean
  customerFullName: boolean
  packageId: boolean
  packageName: boolean
  packageSpeedLabel: boolean
  invoiceId: boolean
  invoiceSubscriptionId: boolean
  invoiceNo: boolean
  invoiceType: boolean
  invoiceStatus: boolean
  invoiceTotalAmount: boolean
  invoicePaidAmount: boolean
  invoiceDueDate: boolean
  invoiceIssueDate: boolean
  invoiceBillingMonth: boolean
  invoiceBillingYear: boolean
  invoiceCollectionStatus: boolean
  invoiceSuspendCandidate: boolean
  invoiceUpdatedAt: boolean
  invoiceNotes: boolean
  actionId: boolean
  actionInvoiceId: boolean
  actionType: boolean
  actionStatus: boolean
  actionAt: boolean
  actionDueFollowUpAt: boolean
  actionNotes: boolean
  paymentId: boolean
  paymentInvoiceId: boolean
  paymentNo: boolean
  paymentDate: boolean
  paymentAmount: boolean
  paymentMethod: boolean
  paymentReferenceNo: boolean
  paymentNotes: boolean
}

type SalesReadSchema = {
  leadId: boolean
  leadCustomerName: boolean
  leadType: boolean
  leadStatus: boolean
  leadSource: boolean
  leadMarketingName: boolean
  leadPhone: boolean
  leadNotes: boolean
  leadCreatedAt: boolean
  coverageId: boolean
  coverageAreaCode: boolean
  coverageAreaName: boolean
  coverageVillage: boolean
  coverageDistrict: boolean
  coverageCity: boolean
  coverageProvince: boolean
  coverageStatus: boolean
  coverageNotes: boolean
  coverageUpdatedAt: boolean
  surveyId: boolean
  surveyNo: boolean
  surveyLeadId: boolean
  surveyCustomerId: boolean
  surveyStatus: boolean
  surveyFeasibilityStatus: boolean
  surveyScheduledAt: boolean
  surveyCreatedAt: boolean
  orderId: boolean
  orderNo: boolean
  orderLeadId: boolean
  orderCustomerId: boolean
  orderStatus: boolean
  orderType: boolean
  orderScheduledInstallationAt: boolean
  orderRequestDate: boolean
  orderMarketingName: boolean
  workOrderId: boolean
  workOrderNo: boolean
  workOrderStatus: boolean
  workOrderType: boolean
  workOrderScheduledAt: boolean
  workOrderCreatedAt: boolean
  workOrderTechnicianName: boolean
  workOrderSalesOrderId: boolean
  subscriptionId: boolean
  subscriptionServiceNo: boolean
  subscriptionCustomerId: boolean
  subscriptionOrderId: boolean
  subscriptionPackageId: boolean
  subscriptionStatus: boolean
  subscriptionMonthlyPrice: boolean
  subscriptionActivatedAt: boolean
  subscriptionCreatedAt: boolean
  customerId: boolean
  customerFullName: boolean
  packageId: boolean
  packageName: boolean
  packageSpeedLabel: boolean
  quotationId: boolean
  quotationNo: boolean
  quotationLeadId: boolean
  quotationStatus: boolean
  quotationMonthlyPrice: boolean
  quotationInstallationFee: boolean
  quotationContractMonths: boolean
  quotationCreatedAt: boolean
  contractId: boolean
  contractNo: boolean
  contractQuotationId: boolean
  contractLeadId: boolean
  contractStatus: boolean
  contractSignedAt: boolean
  corporateDeliveryId: boolean
  corporateDeliveryContractId: boolean
  corporateDeliveryMilestoneCode: boolean
  corporateDeliveryMilestoneName: boolean
  corporateDeliveryStatus: boolean
  corporateDeliveryOwnerName: boolean
  corporateDeliveryPlannedAt: boolean
  corporateDeliveryCompletedAt: boolean
  corporateAcceptanceId: boolean
  corporateAcceptanceContractId: boolean
  corporateAcceptanceNo: boolean
  corporateAcceptanceStatus: boolean
  corporateAcceptanceTestedAt: boolean
  corporateAcceptanceAcceptedAt: boolean
}

type InventoryReadSchema = {
  itemId: boolean
  itemCode: boolean
  itemName: boolean
  itemCategoryId: boolean
  itemUnitId: boolean
  itemRackCode: boolean
  itemRackBarcode: boolean
  itemCurrentStock: boolean
  itemMinimumStock: boolean
  itemStatus: boolean
  itemUpdatedAt: boolean
  categoryId: boolean
  categoryCode: boolean
  unitId: boolean
  unitCode: boolean
  movementId: boolean
  movementItemId: boolean
  movementType: boolean
  movementReferenceNo: boolean
  movementQty: boolean
  movementUnitPrice: boolean
  movementAt: boolean
  movementNotes: boolean
  odpId: boolean
  odpCode: boolean
  odpName: boolean
  odpTotalPorts: boolean
  odpActivePorts: boolean
  odpLocationText: boolean
  odpLatitude: boolean
  odpLongitude: boolean
  odpUpdatedAt: boolean
  odpPortId: boolean
  odpPortOdpId: boolean
  odpPortNo: boolean
  odpPortStatus: boolean
  odpPortSubscriptionId: boolean
  odpPortCustomerId: boolean
  odpPortInstalledAt: boolean
  odpPortCreatedAt: boolean
  odpPortUpdatedAt: boolean
  subscriptionId: boolean
  subscriptionServiceNo: boolean
  customerId: boolean
  customerCode: boolean
  customerFullName: boolean
  deviceAssignmentId: boolean
  deviceAssignmentInventoryItemId: boolean
  deviceAssignmentSubscriptionId: boolean
  deviceAssignmentWorkOrderId: boolean
  deviceAssignmentCustomerId: boolean
  deviceAssignmentStatus: boolean
  deviceAssignmentAssignedAt: boolean
  deviceAssignmentReturnedAt: boolean
  deviceAssignmentSerialNumber: boolean
  workOrderId: boolean
  workOrderNo: boolean
  requestId: boolean
  requestInventoryItemId: boolean
  requestCode: boolean
  requestQty: boolean
  requestStatus: boolean
  requestRequestedDivision: boolean
  requestRequestedSubdivision: boolean
  requestRequestedFor: boolean
  requestNotes: boolean
  requestPendingReason: boolean
  requestRequestedBy: boolean
  requestProcessedBy: boolean
  requestRequestedAt: boolean
  requestProcessedAt: boolean
  loanId: boolean
  loanInventoryItemId: boolean
  loanCode: boolean
  loanQty: boolean
  loanReturnedQty: boolean
  loanStatus: boolean
  loanBorrowerName: boolean
  loanBorrowerDivision: boolean
  loanBorrowerSubdivision: boolean
  loanNotes: boolean
  loanReturnNotes: boolean
  loanBorrowedAt: boolean
  loanDueAt: boolean
  loanReturnedAt: boolean
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
  serviceNo: string
  invoiceType: string
  invoiceStatus: string
  totalAmount: number
  paidAmount: number
  dueDate: string | Date
}

type ReviewDbBillingReconnectRow = {
  invoiceNo: string
  customerName: string
  serviceNo: string
  invoiceType: string
  invoiceStatus: string
  totalAmount: number
  paidAmount: number
  dueDate: string | Date
  collectionStatus: string | null
  updatedAt: string | Date
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
  serviceNo: string
  totalAmount: number
  updatedAt: string | Date
  notes: string | null
}

type ReviewDbCollectionActionRow = {
  invoiceType: string
  actionType: string
  actionStatus: string
  actionAt: string | Date
  dueFollowUpAt: string | Date | null
  customerName: string
  serviceNo: string
  invoiceNo: string
  notes: string | null
}

type ReviewDbCollectionFollowUpRow = {
  invoiceNo: string
  customerName: string
  serviceNo: string
  invoiceType: string
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
  serviceNo: string
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
  rackCode: string | null
  rackBarcode: string | null
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

const DIGITAL_SALES_SOURCES = ['DIGITAL', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'WEBSITE', 'META ADS'] as const

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

function pickStructuredSupportMetadata(note: string | null | undefined, prefix: string) {
  return parseStructuredSupportNote(note).metadata.get(prefix) ?? '-'
}

function parseDismantleReturnedItemCodes(value: string | null | undefined) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\r\n,;]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

async function attachSupportDismantleWorkOrderLinks(rows: ReviewDbSupportDismantleRow[]) {
  const sourceRows = rows.filter((row) => parseDismantleReturnedItemCodes(row.returnedItemCodes).length)
  if (!sourceRows.length) {
    return rows
  }

  const [
    hasLifecycleItemId,
    hasLifecycleWorkOrderId,
    hasLifecycleTroubleTicketId,
    hasLifecycleTicketRef,
    hasInventoryItemId,
    hasInventoryItemCode,
    hasWorkOrderId,
    hasWorkOrderNo,
  ] = await Promise.all([
    hasReviewDbColumn('inventory_device_lifecycle_logs', 'inventory_item_id'),
    hasReviewDbColumn('inventory_device_lifecycle_logs', 'work_order_id'),
    hasReviewDbColumn('inventory_device_lifecycle_logs', 'trouble_ticket_id'),
    hasReviewDbColumn('inventory_device_lifecycle_logs', 'ticket_ref'),
    hasReviewDbColumn('inventory_items', 'id'),
    hasReviewDbColumn('inventory_items', 'item_code'),
    hasReviewDbColumn('service_work_orders', 'id'),
    hasReviewDbColumn('service_work_orders', 'work_order_no'),
  ])

  if (!hasLifecycleItemId || !hasInventoryItemId || !hasInventoryItemCode) {
    return rows
  }

  const itemCodes = Array.from(new Set(sourceRows.flatMap((row) => parseDismantleReturnedItemCodes(row.returnedItemCodes))))
  if (!itemCodes.length) {
    return rows
  }

  const placeholders = itemCodes.map(() => '?').join(', ')
  const linkedRows = await runReviewDbQuery<{
    itemCode: string | null
    workOrderId: number | null
    workOrderNo: string | null
    troubleTicketId: number | null
    ticketRef: string | null
  }>(
    `
      SELECT
        i.item_code AS itemCode,
        ${hasLifecycleWorkOrderId ? 'l.work_order_id' : 'NULL'} AS workOrderId,
        ${hasWorkOrderId && hasWorkOrderNo && hasLifecycleWorkOrderId ? 'wo.work_order_no' : 'NULL'} AS workOrderNo,
        ${hasLifecycleTroubleTicketId ? 'l.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
        ${hasLifecycleTicketRef ? 'l.ticket_ref' : 'NULL'} AS ticketRef
      FROM inventory_device_lifecycle_logs l
      INNER JOIN inventory_items i
        ON i.id = l.inventory_item_id
      ${hasWorkOrderId && hasWorkOrderNo && hasLifecycleWorkOrderId ? 'LEFT JOIN service_work_orders wo ON wo.id = l.work_order_id' : ''}
      WHERE i.item_code IN (${placeholders})
      ORDER BY l.id DESC
    `,
    itemCodes,
  )

  const byItemCode = new Map<string, (typeof linkedRows)[number]>()
  for (const row of linkedRows) {
    const key = String(row.itemCode ?? '').trim().toUpperCase()
    if (key && !byItemCode.has(key)) {
      byItemCode.set(key, row)
    }
  }

  return rows.map((row) => {
    const matched = parseDismantleReturnedItemCodes(row.returnedItemCodes)
      .map((itemCode) => byItemCode.get(itemCode))
      .find(Boolean)

    return matched
      ? {
          ...row,
          relatedWorkOrderId: matched.workOrderId ?? null,
          relatedWorkOrderNo: matched.workOrderNo ?? null,
          relatedTroubleTicketId: matched.troubleTicketId ?? null,
          relatedTicketRef: matched.ticketRef ?? null,
        }
      : row
  })
}

function formatDateTimeInputValue(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function toPeriodKey(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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

function getTimeValue(value: string | Date | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null

  return date.getTime()
}

function hasSupportCloseEligibleProgress(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toUpperCase()
  return normalized === 'ON_PROGRESS' || normalized === 'FOLLOW_UP'
}

function isSupportTicketReadyToClose(item: ReviewDbSupportTicketRow) {
  if (!hasSupportCloseEligibleProgress(item.progressStatus)) {
    return false
  }

  if (getFollowUpState(item.followUpAt) !== 'UNSET') {
    return false
  }

  const escalationAt = getTimeValue(item.escalatedAt)
  const progressUpdatedAt = getTimeValue(item.progressUpdatedAt)

  if (escalationAt !== null && (progressUpdatedAt === null || escalationAt > progressUpdatedAt)) {
    return false
  }

  return true
}

function getSupportTicketQueueReason(item: ReviewDbSupportTicketRow) {
  if (isSupportTicketReadyToClose(item)) {
    return 'READY_CLOSE'
  }

  const escalationAt = getTimeValue(item.escalatedAt)
  const progressUpdatedAt = getTimeValue(item.progressUpdatedAt)
  if (escalationAt !== null && (progressUpdatedAt === null || escalationAt > progressUpdatedAt)) {
    return 'ESCALATION_PENDING'
  }

  const followUpState = getFollowUpState(item.followUpAt)
  if (followUpState === 'OVERDUE') {
    return 'FOLLOW_UP_OVERDUE'
  }
  if (followUpState === 'TODAY') {
    return 'FOLLOW_UP_TODAY'
  }
  if (followUpState === 'SCHEDULED') {
    return 'FOLLOW_UP_SCHEDULED'
  }

  const slaState = getSlaState(item.slaDueAt)
  if (slaState === 'OVERDUE') {
    return 'SLA_OVERDUE'
  }
  if (slaState === 'DUE_TODAY') {
    return 'SLA_DUE_TODAY'
  }

  return 'WAITING_PROGRESS'
}

function getSupportQueuePriorityRank(reason: string) {
  switch (reason) {
    case 'ESCALATION_PENDING':
      return 1
    case 'FOLLOW_UP_OVERDUE':
      return 2
    case 'SLA_OVERDUE':
      return 3
    case 'FOLLOW_UP_TODAY':
      return 4
    case 'SLA_DUE_TODAY':
      return 5
    case 'READY_CLOSE':
      return 6
    case 'FOLLOW_UP_SCHEDULED':
      return 7
    case 'WAITING_PROGRESS':
      return 8
    default:
      return 9
  }
}

function getSupportQueuePriorityLabel(reason: string) {
  const rank = getSupportQueuePriorityRank(reason)
  if (rank <= 2) return 'P1'
  if (rank <= 4) return 'P2'
  if (rank <= 6) return 'P3'
  return 'P4'
}

function isSupportCriticalQueueReason(reason: string) {
  return getSupportQueuePriorityRank(reason) <= 5
}

function isSupportPlannedQueueReason(reason: string) {
  return reason === 'FOLLOW_UP_SCHEDULED'
}

function isSupportWaitingProgressQueueReason(reason: string) {
  return reason === 'WAITING_PROGRESS'
}

function sortSupportTicketsByPriority(left: ReviewDbSupportTicketRow, right: ReviewDbSupportTicketRow) {
  const leftReason = getSupportTicketQueueReason(left)
  const rightReason = getSupportTicketQueueReason(right)
  const rankDiff = getSupportQueuePriorityRank(leftReason) - getSupportQueuePriorityRank(rightReason)
  if (rankDiff !== 0) {
    return rankDiff
  }

  const leftFollowUp = getTimeValue(left.followUpAt)
  const rightFollowUp = getTimeValue(right.followUpAt)
  if (leftFollowUp !== null || rightFollowUp !== null) {
    if (leftFollowUp === null) return 1
    if (rightFollowUp === null) return -1
    if (leftFollowUp !== rightFollowUp) return leftFollowUp - rightFollowUp
  }

  const leftProgress = getTimeValue(left.progressUpdatedAt)
  const rightProgress = getTimeValue(right.progressUpdatedAt)
  if (leftProgress !== null || rightProgress !== null) {
    if (leftProgress === null) return 1
    if (rightProgress === null) return -1
    if (leftProgress !== rightProgress) return rightProgress - leftProgress
  }

  const leftOpened = getTimeValue(left.openedAt)
  const rightOpened = getTimeValue(right.openedAt)
  if (leftOpened !== null || rightOpened !== null) {
    if (leftOpened === null) return 1
    if (rightOpened === null) return -1
    if (leftOpened !== rightOpened) return rightOpened - leftOpened
  }

  return String(right.ticketCode).localeCompare(String(left.ticketCode))
}

function isRecurringInvoiceType(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase() === 'RECURRING'
}

function isPromiseToPayOverdue(params: {
  actionType: string
  dueFollowUpAt: string | Date | null | undefined
}) {
  return params.actionType.trim().toUpperCase() === 'PROMISE_TO_PAY' && getFollowUpState(params.dueFollowUpAt) === 'OVERDUE'
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

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return 'Query support tidak bisa dibaca dari review DB.'
}

async function runSafeSupportSectionQuery<T>(params: {
  sectionLabel: string
  enabled: boolean
  query: () => Promise<T[]>
}) {
  if (!params.enabled) {
    return {
      rows: [] as T[],
      error: null as string | null,
      enabled: false,
      sectionLabel: params.sectionLabel,
    }
  }

  try {
    return {
      rows: await params.query(),
      error: null as string | null,
      enabled: true,
      sectionLabel: params.sectionLabel,
    }
  } catch (error) {
    return {
      rows: [] as T[],
      error: getReadableErrorMessage(error),
      enabled: true,
      sectionLabel: params.sectionLabel,
    }
  }
}

async function getSupportNonTicketReadSchema(): Promise<SupportNonTicketReadSchema> {
  const [
    isolationStatus,
    isolationCustomerName,
    isolationSubscriptionId,
    isolationRadboxName,
    isolationCustomerPhone,
    isolationMarketingName,
    isolationReason,
    isolationDate,
    isolationIsArchived,
    subscriptionId,
    subscriptionServiceNo,
    subscriptionCustomerId,
    customerId,
    customerCode,
    dismantleQueueId,
    dismantleQueueIsolationId,
    dismantleQueueTransferNote,
    dismantleQueueTransferredAt,
    dismantleHistoryId,
    dismantleHistoryIsolationId,
    dismantleHistoryCustomerName,
    dismantleHistoryRadboxName,
    dismantleHistoryCustomerPhone,
    dismantleHistoryMarketingName,
    dismantleHistoryCloseNote,
    dismantleHistoryClosedAt,
    dismantleHistoryReturnedItemCodes,
  ] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'customer_name'),
    hasReviewDbColumn('support_isolations', 'subscription_id'),
    hasReviewDbColumn('support_isolations', 'radbox_name'),
    hasReviewDbColumn('support_isolations', 'customer_phone'),
    hasReviewDbColumn('support_isolations', 'marketing_name'),
    hasReviewDbColumn('support_isolations', 'reason'),
    hasReviewDbColumn('support_isolations', 'isolation_date'),
    hasReviewDbColumn('support_isolations', 'is_archived'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'customer_code'),
    hasReviewDbColumn('support_dismantle_queue', 'id'),
    hasReviewDbColumn('support_dismantle_queue', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
    hasReviewDbColumn('support_dismantle_queue', 'transferred_at'),
    hasReviewDbColumn('support_dismantle_history', 'id'),
    hasReviewDbColumn('support_dismantle_history', 'isolation_id'),
    hasReviewDbColumn('support_dismantle_history', 'customer_name'),
    hasReviewDbColumn('support_dismantle_history', 'radbox_name'),
    hasReviewDbColumn('support_dismantle_history', 'customer_phone'),
    hasReviewDbColumn('support_dismantle_history', 'marketing_name'),
    hasReviewDbColumn('support_dismantle_history', 'close_note'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
    hasReviewDbColumn('support_dismantle_history', 'returned_item_codes'),
  ])

  return {
    isolationStatus,
    isolationCustomerName,
    isolationSubscriptionId,
    isolationRadboxName,
    isolationCustomerPhone,
    isolationMarketingName,
    isolationReason,
    isolationDate,
    isolationIsArchived,
    subscriptionId,
    subscriptionServiceNo,
    subscriptionCustomerId,
    customerId,
    customerCode,
    dismantleQueueId,
    dismantleQueueIsolationId,
    dismantleQueueTransferNote,
    dismantleQueueTransferredAt,
    dismantleHistoryId,
    dismantleHistoryIsolationId,
    dismantleHistoryCustomerName,
    dismantleHistoryRadboxName,
    dismantleHistoryCustomerPhone,
    dismantleHistoryMarketingName,
    dismantleHistoryCloseNote,
    dismantleHistoryClosedAt,
    dismantleHistoryReturnedItemCodes,
  }
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

async function getReviewDbSupportSections(session: AppSession, params?: {
  lane?: SupportLaneKey | null
  focus?: string
}): Promise<DomainReviewSection[]> {
  const lane = params?.lane ?? null
  const focus = String(params?.focus ?? '')
    .trim()
    .toUpperCase()
  const branchScope = resolveBranchScope(session)
  const wantTickets = !lane || lane === 'tt' || lane === 'sla'
  const wantIsolations = !lane || lane === 'isolations'
  const wantSla = !lane || lane === 'sla'
  const wantDismantle = !lane || lane === 'dismantle'
  const ticketMonthFilter =
    focus === 'MONTHLY_OPENED'
      ? `
      AND stt.opened_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
      AND stt.opened_at < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)
    `
      : ''
  const [hasCustomerBranchId, hasTicketBranchId, hasIsolationBranchId] = await Promise.all([
    hasReviewDbColumn('crm_customers', 'branch_id'),
    hasReviewDbColumn('support_trouble_tickets', 'branch_id'),
    hasReviewDbColumn('support_isolations', 'branch_id'),
  ])

  const ticketBranchWhere = hasTicketBranchId
    ? buildBranchWhere(branchScope, 'stt.branch_id')
    : hasCustomerBranchId
      ? buildBranchWhere(branchScope, 'c.branch_id')
      : { clause: '', values: [] as unknown[] }
  const isolationBranchWhere = hasIsolationBranchId
    ? buildBranchWhere(branchScope, 'si.branch_id')
    : hasCustomerBranchId
      ? buildBranchWhere(branchScope, 'c.branch_id')
      : { clause: '', values: [] as unknown[] }
  const ticketReadEnsurePromise = wantTickets ? ensureDomainSupportTicketReadTables() : Promise.resolve()

  if (wantIsolations || wantDismantle) {
    await ensureDomainSupportDismantleQueueTable()
  }

  const supportNonTicketReadSchema =
    wantIsolations || wantDismantle ? await getSupportNonTicketReadSchema() : null
  const isolationSubscriptionJoinClause =
    supportNonTicketReadSchema?.isolationSubscriptionId &&
    supportNonTicketReadSchema.subscriptionId
      ? `
    LEFT JOIN service_subscriptions ss
      ON ss.id = si.subscription_id`
      : ''
  const isolationCustomerJoinClause =
    isolationSubscriptionJoinClause &&
    supportNonTicketReadSchema?.subscriptionCustomerId &&
    supportNonTicketReadSchema.customerId
      ? `
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id`
      : ''
  const isolationServiceNoExpression =
    isolationSubscriptionJoinClause && supportNonTicketReadSchema?.subscriptionServiceNo
      ? 'ss.service_no'
      : 'NULL'
  const isolationCustomerCodeExpression =
    isolationCustomerJoinClause && supportNonTicketReadSchema?.customerCode
      ? 'c.customer_code'
      : 'NULL'
  const isolationArchivedFilter = supportNonTicketReadSchema?.isolationIsArchived ? '\n      AND si.is_archived = 0' : ''
  const dismantleHistoryRadboxExpression =
    supportNonTicketReadSchema?.dismantleHistoryRadboxName && supportNonTicketReadSchema?.dismantleHistoryIsolationId
      ? supportNonTicketReadSchema.isolationRadboxName
        ? 'COALESCE(NULLIF(TRIM(dh.radbox_name), \'\'), NULLIF(TRIM(si.radbox_name), \'\'))'
        : 'NULLIF(TRIM(dh.radbox_name), \'\')'
      : supportNonTicketReadSchema?.dismantleHistoryRadboxName
        ? 'NULLIF(TRIM(dh.radbox_name), \'\')'
        : supportNonTicketReadSchema?.dismantleHistoryIsolationId && supportNonTicketReadSchema?.isolationRadboxName
          ? 'NULLIF(TRIM(si.radbox_name), \'\')'
          : 'NULL'
  const dismantleClosedMonthFilter =
    focus === 'CLOSED_THIS_PERIOD' || focus === 'MONTHLY_DISMANTLES'
      ? supportNonTicketReadSchema?.dismantleHistoryClosedAt
        ? `
      WHERE dh.closed_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
        AND dh.closed_at < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)
    `
        : ''
      : ''

  const ticketResult = await runSafeSupportSectionQuery<ReviewDbSupportTicketRow>({
    sectionLabel: 'Trouble Ticket',
    enabled: wantTickets,
    query: async () => {
      await ticketReadEnsurePromise
      return runReviewDbQuery<ReviewDbSupportTicketRow>(`
    SELECT
      stt.id AS ticketId,
      ticket_code AS ticketCode,
      customer_name AS customerName,
      customer_user AS customerUser,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode,
      c.phone AS customerPhone,
      type AS ticketType,
      stt.status AS status,
      stt.notes AS notes,
      stt.opened_at AS openedAt,
      stt.closed_at AS closedAt,
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
    LEFT JOIN service_subscriptions ss
      ON ss.id = stt.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE stt.closed_at IS NULL
      AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
      ${ticketMonthFilter}
      ${ticketBranchWhere.clause}
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
  `, ticketBranchWhere.values)
    },
  })

  const isolationResult = await runSafeSupportSectionQuery<ReviewDbSupportIsolationRow>({
    sectionLabel: 'Isolir Aktif',
    enabled: wantIsolations,
    query: () => {
      if (!supportNonTicketReadSchema?.isolationStatus || !supportNonTicketReadSchema.isolationCustomerName) {
        throw new Error('Schema inti Isolir belum siap pada review DB aktif.')
      }

      return runReviewDbQuery<ReviewDbSupportIsolationRow>(`
    SELECT
      si.id AS isolationId,
      si.customer_name AS customerName,
      ${isolationServiceNoExpression} AS serviceNo,
      ${isolationCustomerCodeExpression} AS customerCode,
      ${supportNonTicketReadSchema.isolationRadboxName ? 'si.radbox_name' : 'NULL'} AS radboxName,
      ${supportNonTicketReadSchema.isolationCustomerPhone ? 'si.customer_phone' : 'NULL'} AS customerPhone,
      ${supportNonTicketReadSchema.isolationMarketingName ? 'si.marketing_name' : 'NULL'} AS marketingName,
      si.status,
      ${supportNonTicketReadSchema.isolationReason ? 'si.reason' : 'NULL'} AS reason,
      ${supportNonTicketReadSchema.isolationDate ? 'si.isolation_date' : 'NULL'} AS isolationDate,
      CASE WHEN ${supportNonTicketReadSchema.dismantleQueueId ? 'dq.id' : 'NULL'} IS NULL THEN 0 ELSE 1 END AS hasDismantleQueue
    FROM support_isolations si
    ${isolationSubscriptionJoinClause}
    ${isolationCustomerJoinClause}
    LEFT JOIN support_dismantle_queue dq
      ON dq.isolation_id = si.id
    WHERE si.status = 'OPEN'
      ${isolationArchivedFilter}
      ${isolationBranchWhere.clause}
    ORDER BY ${supportNonTicketReadSchema.isolationDate ? 'si.isolation_date' : 'si.id'} DESC, si.id DESC
    LIMIT 5
  `, isolationBranchWhere.values)
    },
  })

  const slaResult = await runSafeSupportSectionQuery<ReviewDbSupportSlaRow>({
    sectionLabel: 'SLA Trouble Ticket',
    enabled: wantSla,
    query: () => runReviewDbQuery<ReviewDbSupportSlaRow>(`
    SELECT
      trouble_type AS troubleType,
      duration_days AS durationDays,
      updated_at AS updatedAt
    FROM support_trouble_ticket_sla
    ORDER BY updated_at DESC, trouble_type ASC
    LIMIT 5
  `)
  })

  const dismantleOpenResult = await runSafeSupportSectionQuery<ReviewDbSupportDismantleOpenRow>({
    sectionLabel: 'Queue Dismantle Open',
    enabled: wantDismantle,
    query: () => {
      if (!supportNonTicketReadSchema?.dismantleQueueId || !supportNonTicketReadSchema.dismantleQueueIsolationId) {
        throw new Error('Schema inti queue dismantle belum siap pada review DB aktif.')
      }
      if (!supportNonTicketReadSchema.isolationCustomerName || !supportNonTicketReadSchema.isolationStatus) {
        throw new Error('Schema inti isolir belum siap untuk membaca queue dismantle.')
      }

      return runReviewDbQuery<ReviewDbSupportDismantleOpenRow>(`
    SELECT
      dq.id AS queueId,
      si.id AS isolationId,
      si.customer_name AS customerName,
      ${isolationServiceNoExpression} AS serviceNo,
      ${isolationCustomerCodeExpression} AS customerCode,
      ${supportNonTicketReadSchema.isolationRadboxName ? 'si.radbox_name' : 'NULL'} AS radboxName,
      ${supportNonTicketReadSchema.isolationCustomerPhone ? 'si.customer_phone' : 'NULL'} AS customerPhone,
      ${supportNonTicketReadSchema.isolationMarketingName ? 'si.marketing_name' : 'NULL'} AS marketingName,
      si.status,
      ${supportNonTicketReadSchema.dismantleQueueTransferNote ? 'dq.transfer_note' : 'NULL'} AS transferNote,
      ${supportNonTicketReadSchema.isolationReason ? 'si.reason' : 'NULL'} AS isolationReason,
      ${supportNonTicketReadSchema.dismantleQueueTransferredAt ? 'dq.transferred_at' : 'NULL'} AS transferredAt,
      ${
        supportNonTicketReadSchema.dismantleQueueTransferredAt
          ? 'DATEDIFF(CURRENT_DATE, DATE(dq.transferred_at))'
          : 'NULL'
      } AS ageDays
    FROM support_dismantle_queue dq
    INNER JOIN support_isolations si
      ON si.id = dq.isolation_id
    ${isolationSubscriptionJoinClause}
    ${isolationCustomerJoinClause}
    ORDER BY ${supportNonTicketReadSchema.dismantleQueueTransferredAt ? 'dq.transferred_at' : 'dq.id'} DESC, dq.id DESC
    LIMIT 8
  `)
    },
  })

  const dismantleHistoryResult = await runSafeSupportSectionQuery<ReviewDbSupportDismantleRow>({
    sectionLabel: 'Histori Dismantle',
    enabled: wantDismantle,
    query: () => {
      if (!supportNonTicketReadSchema?.dismantleHistoryId) {
        throw new Error('Schema inti histori dismantle belum siap pada review DB aktif.')
      }

      return runReviewDbQuery<ReviewDbSupportDismantleRow>(`
    SELECT
      dh.id AS dismantleId,
      ${
        supportNonTicketReadSchema.dismantleHistoryCustomerName
          ? 'dh.customer_name'
          : supportNonTicketReadSchema.isolationCustomerName
            ? 'si.customer_name'
            : "CONCAT('Histori Dismantle #', dh.id)"
      } AS customerName,
      ${isolationServiceNoExpression} AS serviceNo,
      ${isolationCustomerCodeExpression} AS customerCode,
      ${dismantleHistoryRadboxExpression} AS radboxName,
      ${supportNonTicketReadSchema.dismantleHistoryCustomerPhone ? 'dh.customer_phone' : 'NULL'} AS customerPhone,
      ${supportNonTicketReadSchema.dismantleHistoryMarketingName ? 'dh.marketing_name' : 'NULL'} AS marketingName,
      ${supportNonTicketReadSchema.dismantleHistoryCloseNote ? 'dh.close_note' : 'NULL'} AS closeNote,
      ${supportNonTicketReadSchema.dismantleHistoryClosedAt ? 'dh.closed_at' : 'NULL'} AS closedAt,
      ${supportNonTicketReadSchema.dismantleHistoryReturnedItemCodes ? 'dh.returned_item_codes' : 'NULL'} AS returnedItemCodes
    FROM support_dismantle_history dh
    LEFT JOIN support_isolations si
      ON si.id = ${
        supportNonTicketReadSchema.dismantleHistoryIsolationId ? 'dh.isolation_id' : 'NULL'
      }
    ${isolationSubscriptionJoinClause}
    ${isolationCustomerJoinClause}
    ${dismantleClosedMonthFilter}
    ORDER BY ${supportNonTicketReadSchema.dismantleHistoryClosedAt ? 'dh.closed_at' : 'dh.id'} DESC, dh.id DESC
    LIMIT 5
  `)
    },
  })

  const tickets = ticketResult.rows
  const isolations = isolationResult.rows
  const slaRows = slaResult.rows
  const dismantleOpenRows = dismantleOpenResult.rows
  const dismantles = await attachSupportDismantleWorkOrderLinks(dismantleHistoryResult.rows)
  const supportSectionFailures = [
    ticketResult,
    isolationResult,
    slaResult,
    dismantleOpenResult,
    dismantleHistoryResult,
  ].filter((item) => item.enabled && item.error)

  const totalLoadedRows =
    tickets.length + isolations.length + slaRows.length + dismantleOpenRows.length + dismantles.length

  if (!totalLoadedRows && supportSectionFailures.length > 0) {
    throw new Error(supportSectionFailures.map((item) => item.error).join(' | '))
  }

  const readyCloseTickets = tickets
    .filter((item) => isSupportTicketReadyToClose(item))
    .sort(sortSupportTicketsByPriority)
  const activeTickets = tickets
    .filter((item) => !isSupportTicketReadyToClose(item))
    .sort(sortSupportTicketsByPriority)
  const criticalAttentionTickets = activeTickets.filter((item) =>
    isSupportCriticalQueueReason(getSupportTicketQueueReason(item)),
  )
  const plannedFollowUpTickets = activeTickets.filter((item) =>
    isSupportPlannedQueueReason(getSupportTicketQueueReason(item)),
  )
  const waitingProgressTickets = activeTickets.filter((item) =>
    isSupportWaitingProgressQueueReason(getSupportTicketQueueReason(item)),
  )
  const slaOpenTickets = activeTickets.filter((item) => getSlaState(item.slaDueAt) !== 'UNSET')
  const slaOverdueTickets = activeTickets.filter((item) => getSlaState(item.slaDueAt) === 'OVERDUE')
  const showSlaTicketSections = lane === 'sla' || focus === 'SLA_OVERDUE' || focus === 'OVERDUE_RATE'
  const slaRateSummary = [
    { label: 'Ticket Open SLA', value: formatNumber(slaOpenTickets.length) },
    { label: 'Ticket Overdue', value: formatNumber(slaOverdueTickets.length) },
    { label: 'Rasio Overdue', value: formatPercentage(slaOverdueTickets.length, slaOpenTickets.length) },
  ]

  const buildSupportTicketRow = (
    item: ReviewDbSupportTicketRow,
    options: {
      idSuffix?: string
      status: string
      closeCandidate: 'Ya' | 'Tidak'
      defaultDetail: string
    },
  ) => {
    const followUpState = getFollowUpState(item.followUpAt)
    const slaState = getSlaState(item.slaDueAt)
    const queueReason = getSupportTicketQueueReason(item)
    const queuePriority = getSupportQueuePriorityLabel(queueReason)

    return {
      id: options.idSuffix ? `${item.ticketCode}-${options.idSuffix}` : item.ticketCode,
      primary: item.ticketCode,
      secondary: item.customerName,
      status: options.status,
      detail: item.progressNotes?.trim() || item.notes?.trim() || options.defaultDetail,
      meta: [
        `Type: ${item.ticketType || '-'}`,
        `Customer User: ${item.customerUser || '-'}`,
        `Service No: ${item.serviceNo || '-'}`,
        `Customer Code: ${item.customerCode || '-'}`,
        `Phone: ${item.customerPhone || '-'}`,
        `Opened: ${formatDateTime(item.openedAt)}`,
        `Closed: ${formatDateTime(item.closedAt)}`,
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
        `Queue Priority: ${queuePriority}`,
        `Queue Reason: ${queueReason}`,
        `Close Candidate: ${options.closeCandidate}`,
        `Ticket Notes: ${item.notes?.trim() || '-'}`,
      ],
    }
  }

  return [
    {
      title: 'Trouble Ticket Ready Close',
      description:
        'Antrean ticket yang sudah punya progress valid, tidak punya follow-up aktif, dan tidak sedang menunggu eskalasi yang lebih baru sehingga siap masuk ke jalur close formal.',
      rows: readyCloseTickets.map((item) =>
        buildSupportTicketRow(item, {
          idSuffix: 'READY-CLOSE',
          status: 'READY_CLOSE',
          closeCandidate: 'Ya',
          defaultDetail: 'Ticket ini sudah punya progress valid dan siap ditutup secara formal.',
        }),
      ),
    },
    {
      title: 'Trouble Ticket Critical Attention',
      description:
        'Ticket dengan urgensi tertinggi seperti eskalasi pending, follow-up overdue, atau SLA yang sudah kritis sehingga perlu tindakan operator lebih dulu.',
      rows: criticalAttentionTickets.map((item) =>
        buildSupportTicketRow(item, {
          idSuffix: 'CRITICAL',
          status: item.progressStatus?.trim() || item.status,
          closeCandidate: 'Tidak',
          defaultDetail: 'Ticket ini berada pada lane perhatian kritis dan perlu tindakan cepat operator.',
        }),
      ),
    },
    {
      title: 'Trouble Ticket Planned Follow Up',
      description:
        'Ticket yang sudah punya jadwal follow-up aktif untuk hari berikutnya sehingga bisa dipantau terpisah dari antrean kritis.',
      rows: plannedFollowUpTickets.map((item) =>
        buildSupportTicketRow(item, {
          idSuffix: 'PLANNED',
          status: item.progressStatus?.trim() || item.status,
          closeCandidate: 'Tidak',
          defaultDetail: 'Ticket ini sudah punya follow-up terjadwal dan tinggal dipantau sesuai jadwal berikutnya.',
        }),
      ),
    },
    {
      title: 'Trouble Ticket Waiting Progress',
      description:
        'Ticket yang belum punya follow-up aktif maupun kandidat close formal sehingga operator bisa fokus menambahkan progress baru atau menetapkan PIC berikutnya.',
      rows: waitingProgressTickets.map((item) =>
        buildSupportTicketRow(item, {
          idSuffix: 'WAITING',
          status: item.progressStatus?.trim() || item.status,
          closeCandidate: 'Tidak',
          defaultDetail: 'Ticket ini masih menunggu progress operasional berikutnya dari tim support.',
        }),
      ),
    },
    {
      title: 'SLA Ticket Open Aktif',
      description:
        'Penyebut KPI rasio overdue, berisi ticket aktif yang masih berjalan dan sudah memiliki target SLA sehingga kontrol backlog bisa dibandingkan dengan pembilang overdue.',
      summary: slaRateSummary,
      rows:
        showSlaTicketSections
          ? slaOpenTickets.map((item) =>
              buildSupportTicketRow(item, {
                idSuffix: 'SLA-OPEN',
                status: item.progressStatus?.trim() || item.status,
                closeCandidate: 'Tidak',
                defaultDetail: 'Ticket aktif ini masih berjalan di dalam kontrol SLA dan menjadi pembanding untuk rasio overdue.',
              }),
            )
          : [],
    },
    {
      title: 'SLA Ticket Overdue',
      description:
        'Pembilang KPI overdue rate, berisi ticket aktif yang sudah melewati target SLA agar operator bisa memprioritaskan backlog paling kritis.',
      summary: slaRateSummary,
      rows:
        showSlaTicketSections
          ? slaOverdueTickets.map((item) =>
              buildSupportTicketRow(item, {
                idSuffix: 'SLA-OVERDUE',
                status: 'OVERDUE',
                closeCandidate: 'Tidak',
                defaultDetail: 'Ticket ini sudah melewati SLA dan perlu tindakan operasional lebih cepat.',
              }),
            )
          : [],
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
          `Service No: ${item.serviceNo || '-'}`,
          `Customer Code: ${item.customerCode || '-'}`,
          `Phone: ${item.customerPhone || '-'}`,
          `Marketing: ${item.marketingName || '-'}`,
          `Isolasi: ${formatDateTime(item.isolationDate)}`,
          `Ticket Dismantle: ${item.hasDismantleQueue ? 'Sudah' : 'Belum'}`,
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
      title: 'Queue Dismantle Open',
      description:
        'Kandidat terminasi yang masih aktif di isolir dan perlu divalidasi lebih dulu sebelum dipindahkan ke histori dismantle permanen.',
      rows: dismantleOpenRows.map((item) => ({
        id: `DISMANTLE-QUEUE-${item.queueId}`,
        primary: item.customerName,
        secondary: item.radboxName || 'Radbox belum terpetakan',
        status: item.status,
        detail:
          item.transferNote?.trim() ||
          item.isolationReason?.trim() ||
          'Belum ada catatan transfer untuk kandidat dismantle ini.',
        meta: [
          `Queue ID: ${item.queueId}`,
          `Isolation ID: ${item.isolationId}`,
          `Service No: ${item.serviceNo || '-'}`,
          `Customer Code: ${item.customerCode || '-'}`,
          `Phone: ${item.customerPhone || '-'}`,
          `Marketing: ${item.marketingName || '-'}`,
          `Transferred: ${formatDateTime(item.transferredAt)}`,
          `Aging: ${item.ageDays ?? 0} hari`,
          'Source: Queue dismantle aktif',
        ],
      })),
    },
    {
      title: 'Histori Dismantle',
      description: 'Riwayat perangkat dan layanan yang sudah ditutup permanen agar jejak operasional tidak hilang.',
      rows: dismantles.map((item) => {
        const structuredNote = parseStructuredSupportNote(item.closeNote)

        return {
          id: `DIS-${item.dismantleId}`,
          primary: item.customerName,
          secondary: item.radboxName || 'Radbox belum terpetakan',
          status: 'CLOSED',
          detail: structuredNote.summary || 'Belum ada catatan dismantle yang tercatat.',
          meta: [
            `Service No: ${item.serviceNo || '-'}`,
            `Customer Code: ${item.customerCode || '-'}`,
            `Phone: ${item.customerPhone || '-'}`,
            `Marketing: ${item.marketingName || '-'}`,
            `Closed: ${formatDateTime(item.closedAt)}`,
            `Field PIC: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.fieldPic)}`,
            `Device Status: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.deviceStatus)}`,
            `Pickup Status: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.pickupStatus)}`,
            `Close Outcome: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.closeOutcome)}`,
            `Billing Disposition: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.billingDisposition)}`,
            `Returned Item Codes: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.returnedItemCodes)}`,
            `Work Order ID: ${item.relatedWorkOrderId ?? '-'}`,
            `Work Order: ${item.relatedWorkOrderNo || '-'}`,
            `Ticket Ref: ${item.relatedTicketRef || '-'}`,
            `Trouble Ticket ID: ${item.relatedTroubleTicketId ?? '-'}`,
            `Closed By: ${pickStructuredSupportMetadata(item.closeNote, SUPPORT_DISMANTLE_METADATA_PREFIXES.actor)}`,
          ],
        }
      }),
    },
    ...(supportSectionFailures.length
      ? [
          {
            title: 'Catatan Koneksi Support',
            description:
              'Sebagian subsection support belum bisa dibaca dari review DB, tetapi subsection lain tetap dipertahankan agar workspace tidak langsung jatuh ke mock fallback penuh.',
            rows: supportSectionFailures.map((item, index) => ({
              id: `support-warning-${index + 1}`,
              primary: item.sectionLabel,
              secondary: 'Partial review-db',
              status: 'WARNING',
              detail: item.error ?? 'Subsection support gagal dibaca.',
              meta: [
                `Lane: ${lane || 'all'}`,
                `Focus: ${focus || '-'}`,
              ],
            })),
          },
        ]
      : []),
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

async function runSafeDomainSectionQuery<T>(params: {
  sectionLabel: string
  enabled: boolean
  query: () => Promise<T[]>
}) {
  if (!params.enabled) {
    return {
      rows: [] as T[],
      error: null as string | null,
      enabled: false,
      sectionLabel: params.sectionLabel,
    }
  }

  try {
    return {
      rows: await params.query(),
      error: null as string | null,
      enabled: true,
      sectionLabel: params.sectionLabel,
    }
  } catch (error) {
    return {
      rows: [] as T[],
      error: getReadableErrorMessage(error),
      enabled: true,
      sectionLabel: params.sectionLabel,
    }
  }
}

async function getBillingReadSchema(): Promise<BillingReadSchema> {
  const [
    subscriptionId,
    subscriptionServiceNo,
    subscriptionStatus,
    subscriptionCustomerId,
    subscriptionPackageId,
    subscriptionMonthlyPrice,
    subscriptionActivatedAt,
    subscriptionCreatedAt,
    customerId,
    customerFullName,
    packageId,
    packageName,
    packageSpeedLabel,
    invoiceId,
    invoiceSubscriptionId,
    invoiceNo,
    invoiceType,
    invoiceStatus,
    invoiceTotalAmount,
    invoicePaidAmount,
    invoiceDueDate,
    invoiceIssueDate,
    invoiceBillingMonth,
    invoiceBillingYear,
    invoiceCollectionStatus,
    invoiceSuspendCandidate,
    invoiceUpdatedAt,
    invoiceNotes,
    actionId,
    actionInvoiceId,
    actionType,
    actionStatus,
    actionAt,
    actionDueFollowUpAt,
    actionNotes,
    paymentId,
    paymentInvoiceId,
    paymentNo,
    paymentDate,
    paymentAmount,
    paymentMethod,
    paymentReferenceNo,
    paymentNotes,
  ] = await Promise.all([
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('service_subscriptions', 'status'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('service_subscriptions', 'package_id'),
    hasReviewDbColumn('service_subscriptions', 'monthly_price'),
    hasReviewDbColumn('service_subscriptions', 'activated_at'),
    hasReviewDbColumn('service_subscriptions', 'created_at'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('sales_packages', 'id'),
    hasReviewDbColumn('sales_packages', 'name'),
    hasReviewDbColumn('sales_packages', 'speed_label'),
    hasReviewDbColumn('billing_invoices', 'id'),
    hasReviewDbColumn('billing_invoices', 'subscription_id'),
    hasReviewDbColumn('billing_invoices', 'invoice_no'),
    hasReviewDbColumn('billing_invoices', 'invoice_type'),
    hasReviewDbColumn('billing_invoices', 'invoice_status'),
    hasReviewDbColumn('billing_invoices', 'total_amount'),
    hasReviewDbColumn('billing_invoices', 'paid_amount'),
    hasReviewDbColumn('billing_invoices', 'due_date'),
    hasReviewDbColumn('billing_invoices', 'issue_date'),
    hasReviewDbColumn('billing_invoices', 'billing_month'),
    hasReviewDbColumn('billing_invoices', 'billing_year'),
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
    hasReviewDbColumn('billing_invoices', 'updated_at'),
    hasReviewDbColumn('billing_invoices', 'notes'),
    hasReviewDbColumn('billing_collection_actions', 'id'),
    hasReviewDbColumn('billing_collection_actions', 'invoice_id'),
    hasReviewDbColumn('billing_collection_actions', 'action_type'),
    hasReviewDbColumn('billing_collection_actions', 'action_status'),
    hasReviewDbColumn('billing_collection_actions', 'action_at'),
    hasReviewDbColumn('billing_collection_actions', 'due_follow_up_at'),
    hasReviewDbColumn('billing_collection_actions', 'notes'),
    hasReviewDbColumn('billing_payments', 'id'),
    hasReviewDbColumn('billing_payments', 'invoice_id'),
    hasReviewDbColumn('billing_payments', 'payment_no'),
    hasReviewDbColumn('billing_payments', 'payment_date'),
    hasReviewDbColumn('billing_payments', 'amount'),
    hasReviewDbColumn('billing_payments', 'payment_method'),
    hasReviewDbColumn('billing_payments', 'reference_no'),
    hasReviewDbColumn('billing_payments', 'notes'),
  ])

  return {
    subscriptionId,
    subscriptionServiceNo,
    subscriptionStatus,
    subscriptionCustomerId,
    subscriptionPackageId,
    subscriptionMonthlyPrice,
    subscriptionActivatedAt,
    subscriptionCreatedAt,
    customerId,
    customerFullName,
    packageId,
    packageName,
    packageSpeedLabel,
    invoiceId,
    invoiceSubscriptionId,
    invoiceNo,
    invoiceType,
    invoiceStatus,
    invoiceTotalAmount,
    invoicePaidAmount,
    invoiceDueDate,
    invoiceIssueDate,
    invoiceBillingMonth,
    invoiceBillingYear,
    invoiceCollectionStatus,
    invoiceSuspendCandidate,
    invoiceUpdatedAt,
    invoiceNotes,
    actionId,
    actionInvoiceId,
    actionType,
    actionStatus,
    actionAt,
    actionDueFollowUpAt,
    actionNotes,
    paymentId,
    paymentInvoiceId,
    paymentNo,
    paymentDate,
    paymentAmount,
    paymentMethod,
    paymentReferenceNo,
    paymentNotes,
  }
}

function getBillingSubscriptionQueryParts(schema: BillingReadSchema) {
  const canJoinCustomer = schema.subscriptionCustomerId && schema.customerId
  const canJoinPackage = schema.subscriptionPackageId && schema.packageId

  return {
    customerJoin: canJoinCustomer
      ? `
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id`
      : '',
    packageJoin: canJoinPackage
      ? `
    LEFT JOIN sales_packages sp
      ON sp.id = ss.package_id`
      : '',
    customerNameExpression: canJoinCustomer && schema.customerFullName ? 'c.full_name' : "'Customer belum terpetakan'",
    packageNameExpression: canJoinPackage && schema.packageName ? 'sp.name' : 'NULL',
    speedLabelExpression: canJoinPackage && schema.packageSpeedLabel ? 'sp.speed_label' : 'NULL',
    monthlyPriceExpression: schema.subscriptionMonthlyPrice ? 'ss.monthly_price' : '0',
    activatedAtExpression: schema.subscriptionActivatedAt ? 'ss.activated_at' : 'NULL',
    orderByExpression: schema.subscriptionActivatedAt
      ? schema.subscriptionCreatedAt
        ? 'COALESCE(ss.activated_at, ss.created_at) DESC, ss.id DESC'
        : 'ss.activated_at DESC, ss.id DESC'
      : schema.subscriptionCreatedAt
        ? 'ss.created_at DESC, ss.id DESC'
        : 'ss.id DESC',
  }
}

function getBillingInvoiceQueryParts(schema: BillingReadSchema) {
  const canJoinSubscription = schema.invoiceSubscriptionId && schema.subscriptionId
  const canJoinCustomer = canJoinSubscription && schema.subscriptionCustomerId && schema.customerId

  return {
    subscriptionJoin: canJoinSubscription
      ? `
    LEFT JOIN service_subscriptions ss
      ON ss.id = bi.subscription_id`
      : '',
    customerJoin: canJoinCustomer
      ? `
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id`
      : '',
    customerNameExpression: canJoinCustomer && schema.customerFullName ? 'c.full_name' : "'Customer belum terpetakan'",
    serviceNoExpression: canJoinSubscription && schema.subscriptionServiceNo ? 'ss.service_no' : "'-'",
    issueDateExpression: schema.invoiceIssueDate ? 'bi.issue_date' : 'NULL',
    dueDateExpression: schema.invoiceDueDate ? 'bi.due_date' : 'NULL',
    billingMonthExpression: schema.invoiceBillingMonth ? 'bi.billing_month' : 'NULL',
    billingYearExpression: schema.invoiceBillingYear ? 'bi.billing_year' : 'NULL',
    collectionStatusExpression: schema.invoiceCollectionStatus ? 'bi.collection_status' : 'NULL',
    suspendCandidateExpression: schema.invoiceSuspendCandidate ? 'bi.suspend_candidate' : '0',
    updatedAtExpression: schema.invoiceUpdatedAt ? 'bi.updated_at' : 'NULL',
    notesExpression: schema.invoiceNotes ? 'bi.notes' : 'NULL',
    collectionOpenFilter: schema.invoiceCollectionStatus
      ? "AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') NOT IN ('WRITE_OFF', 'CLOSED')"
      : '',
    latestOrderByExpression: schema.invoiceIssueDate
      ? schema.invoiceUpdatedAt
        ? 'COALESCE(bi.issue_date, bi.updated_at) DESC, bi.id DESC'
        : 'bi.issue_date DESC, bi.id DESC'
      : schema.invoiceUpdatedAt
        ? 'bi.updated_at DESC, bi.id DESC'
        : 'bi.id DESC',
    updatedOrderByExpression: schema.invoiceUpdatedAt ? 'bi.updated_at DESC, bi.id DESC' : 'bi.id DESC',
  }
}

function getBillingActionQueryParts(schema: BillingReadSchema) {
  return {
    actionAtExpression: schema.actionAt ? 'bca.action_at' : 'NULL',
    dueFollowUpAtExpression: schema.actionDueFollowUpAt ? 'bca.due_follow_up_at' : 'NULL',
    notesExpression: schema.actionNotes ? 'bca.notes' : 'NULL',
    orderByExpression: schema.actionAt ? 'bca.action_at DESC, bca.id DESC' : 'bca.id DESC',
    latestActionAtExpression: schema.actionAt ? 'action_latest.action_at' : 'NULL',
    latestDueFollowUpAtExpression: schema.actionDueFollowUpAt ? 'action_latest.due_follow_up_at' : 'NULL',
    latestNotesExpression: schema.actionNotes ? 'action_latest.notes' : 'NULL',
  }
}

async function getSalesReadSchema(): Promise<SalesReadSchema> {
  const [
    leadId,
    leadCustomerName,
    leadType,
    leadStatus,
    leadSource,
    leadMarketingName,
    leadPhone,
    leadNotes,
    leadCreatedAt,
    coverageId,
    coverageAreaCode,
    coverageAreaName,
    coverageVillage,
    coverageDistrict,
    coverageCity,
    coverageProvince,
    coverageStatus,
    coverageNotes,
    coverageUpdatedAt,
    surveyId,
    surveyNo,
    surveyLeadId,
    surveyCustomerId,
    surveyStatus,
    surveyFeasibilityStatus,
    surveyScheduledAt,
    surveyCreatedAt,
    orderId,
    orderNo,
    orderLeadId,
    orderCustomerId,
    orderStatus,
    orderType,
    orderScheduledInstallationAt,
    orderRequestDate,
    orderMarketingName,
    workOrderId,
    workOrderNo,
    workOrderStatus,
    workOrderType,
    workOrderScheduledAt,
    workOrderCreatedAt,
    workOrderTechnicianName,
    workOrderSalesOrderId,
    subscriptionId,
    subscriptionServiceNo,
    subscriptionCustomerId,
    subscriptionOrderId,
    subscriptionPackageId,
    subscriptionStatus,
    subscriptionMonthlyPrice,
    subscriptionActivatedAt,
    subscriptionCreatedAt,
    customerId,
    customerFullName,
    packageId,
    packageName,
    packageSpeedLabel,
    quotationId,
    quotationNo,
    quotationLeadId,
    quotationStatus,
    quotationMonthlyPrice,
    quotationInstallationFee,
    quotationContractMonths,
    quotationCreatedAt,
    contractId,
    contractNo,
    contractQuotationId,
    contractLeadId,
    contractStatus,
    contractSignedAt,
    corporateDeliveryId,
    corporateDeliveryContractId,
    corporateDeliveryMilestoneCode,
    corporateDeliveryMilestoneName,
    corporateDeliveryStatus,
    corporateDeliveryOwnerName,
    corporateDeliveryPlannedAt,
    corporateDeliveryCompletedAt,
    corporateAcceptanceId,
    corporateAcceptanceContractId,
    corporateAcceptanceNo,
    corporateAcceptanceStatus,
    corporateAcceptanceTestedAt,
    corporateAcceptanceAcceptedAt,
  ] = await Promise.all([
    hasReviewDbColumn('sales_leads', 'id'),
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('sales_leads', 'lead_type'),
    hasReviewDbColumn('sales_leads', 'status'),
    hasReviewDbColumn('sales_leads', 'source'),
    hasReviewDbColumn('sales_leads', 'marketing_name'),
    hasReviewDbColumn('sales_leads', 'phone'),
    hasReviewDbColumn('sales_leads', 'notes'),
    hasReviewDbColumn('sales_leads', 'created_at'),
    hasReviewDbColumn('sales_covered_areas', 'id'),
    hasReviewDbColumn('sales_covered_areas', 'area_code'),
    hasReviewDbColumn('sales_covered_areas', 'area_name'),
    hasReviewDbColumn('sales_covered_areas', 'village'),
    hasReviewDbColumn('sales_covered_areas', 'district'),
    hasReviewDbColumn('sales_covered_areas', 'city'),
    hasReviewDbColumn('sales_covered_areas', 'province'),
    hasReviewDbColumn('sales_covered_areas', 'coverage_status'),
    hasReviewDbColumn('sales_covered_areas', 'notes'),
    hasReviewDbColumn('sales_covered_areas', 'updated_at'),
    hasReviewDbColumn('sales_surveys', 'id'),
    hasReviewDbColumn('sales_surveys', 'survey_no'),
    hasReviewDbColumn('sales_surveys', 'lead_id'),
    hasReviewDbColumn('sales_surveys', 'customer_id'),
    hasReviewDbColumn('sales_surveys', 'survey_status'),
    hasReviewDbColumn('sales_surveys', 'feasibility_status'),
    hasReviewDbColumn('sales_surveys', 'scheduled_at'),
    hasReviewDbColumn('sales_surveys', 'created_at'),
    hasReviewDbColumn('sales_orders', 'id'),
    hasReviewDbColumn('sales_orders', 'order_no'),
    hasReviewDbColumn('sales_orders', 'lead_id'),
    hasReviewDbColumn('sales_orders', 'customer_id'),
    hasReviewDbColumn('sales_orders', 'status'),
    hasReviewDbColumn('sales_orders', 'order_type'),
    hasReviewDbColumn('sales_orders', 'scheduled_installation_at'),
    hasReviewDbColumn('sales_orders', 'request_date'),
    hasReviewDbColumn('sales_orders', 'marketing_name'),
    hasReviewDbColumn('service_work_orders', 'id'),
    hasReviewDbColumn('service_work_orders', 'work_order_no'),
    hasReviewDbColumn('service_work_orders', 'status'),
    hasReviewDbColumn('service_work_orders', 'work_type'),
    hasReviewDbColumn('service_work_orders', 'scheduled_at'),
    hasReviewDbColumn('service_work_orders', 'created_at'),
    hasReviewDbColumn('service_work_orders', 'technician_name'),
    hasReviewDbColumn('service_work_orders', 'sales_order_id'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('service_subscriptions', 'order_id'),
    hasReviewDbColumn('service_subscriptions', 'package_id'),
    hasReviewDbColumn('service_subscriptions', 'status'),
    hasReviewDbColumn('service_subscriptions', 'monthly_price'),
    hasReviewDbColumn('service_subscriptions', 'activated_at'),
    hasReviewDbColumn('service_subscriptions', 'created_at'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('sales_packages', 'id'),
    hasReviewDbColumn('sales_packages', 'name'),
    hasReviewDbColumn('sales_packages', 'speed_label'),
    hasReviewDbColumn('sales_quotations', 'id'),
    hasReviewDbColumn('sales_quotations', 'quotation_no'),
    hasReviewDbColumn('sales_quotations', 'lead_id'),
    hasReviewDbColumn('sales_quotations', 'status'),
    hasReviewDbColumn('sales_quotations', 'monthly_price'),
    hasReviewDbColumn('sales_quotations', 'installation_fee'),
    hasReviewDbColumn('sales_quotations', 'contract_months'),
    hasReviewDbColumn('sales_quotations', 'created_at'),
    hasReviewDbColumn('sales_contracts', 'id'),
    hasReviewDbColumn('sales_contracts', 'contract_no'),
    hasReviewDbColumn('sales_contracts', 'quotation_id'),
    hasReviewDbColumn('sales_contracts', 'lead_id'),
    hasReviewDbColumn('sales_contracts', 'status'),
    hasReviewDbColumn('sales_contracts', 'signed_at'),
    hasReviewDbColumn('sales_corporate_deliveries', 'id'),
    hasReviewDbColumn('sales_corporate_deliveries', 'contract_id'),
    hasReviewDbColumn('sales_corporate_deliveries', 'milestone_code'),
    hasReviewDbColumn('sales_corporate_deliveries', 'milestone_name'),
    hasReviewDbColumn('sales_corporate_deliveries', 'status'),
    hasReviewDbColumn('sales_corporate_deliveries', 'owner_name'),
    hasReviewDbColumn('sales_corporate_deliveries', 'planned_at'),
    hasReviewDbColumn('sales_corporate_deliveries', 'completed_at'),
    hasReviewDbColumn('sales_corporate_acceptances', 'id'),
    hasReviewDbColumn('sales_corporate_acceptances', 'contract_id'),
    hasReviewDbColumn('sales_corporate_acceptances', 'acceptance_no'),
    hasReviewDbColumn('sales_corporate_acceptances', 'status'),
    hasReviewDbColumn('sales_corporate_acceptances', 'tested_at'),
    hasReviewDbColumn('sales_corporate_acceptances', 'accepted_at'),
  ])

  return {
    leadId,
    leadCustomerName,
    leadType,
    leadStatus,
    leadSource,
    leadMarketingName,
    leadPhone,
    leadNotes,
    leadCreatedAt,
    coverageId,
    coverageAreaCode,
    coverageAreaName,
    coverageVillage,
    coverageDistrict,
    coverageCity,
    coverageProvince,
    coverageStatus,
    coverageNotes,
    coverageUpdatedAt,
    surveyId,
    surveyNo,
    surveyLeadId,
    surveyCustomerId,
    surveyStatus,
    surveyFeasibilityStatus,
    surveyScheduledAt,
    surveyCreatedAt,
    orderId,
    orderNo,
    orderLeadId,
    orderCustomerId,
    orderStatus,
    orderType,
    orderScheduledInstallationAt,
    orderRequestDate,
    orderMarketingName,
    workOrderId,
    workOrderNo,
    workOrderStatus,
    workOrderType,
    workOrderScheduledAt,
    workOrderCreatedAt,
    workOrderTechnicianName,
    workOrderSalesOrderId,
    subscriptionId,
    subscriptionServiceNo,
    subscriptionCustomerId,
    subscriptionOrderId,
    subscriptionPackageId,
    subscriptionStatus,
    subscriptionMonthlyPrice,
    subscriptionActivatedAt,
    subscriptionCreatedAt,
    customerId,
    customerFullName,
    packageId,
    packageName,
    packageSpeedLabel,
    quotationId,
    quotationNo,
    quotationLeadId,
    quotationStatus,
    quotationMonthlyPrice,
    quotationInstallationFee,
    quotationContractMonths,
    quotationCreatedAt,
    contractId,
    contractNo,
    contractQuotationId,
    contractLeadId,
    contractStatus,
    contractSignedAt,
    corporateDeliveryId,
    corporateDeliveryContractId,
    corporateDeliveryMilestoneCode,
    corporateDeliveryMilestoneName,
    corporateDeliveryStatus,
    corporateDeliveryOwnerName,
    corporateDeliveryPlannedAt,
    corporateDeliveryCompletedAt,
    corporateAcceptanceId,
    corporateAcceptanceContractId,
    corporateAcceptanceNo,
    corporateAcceptanceStatus,
    corporateAcceptanceTestedAt,
    corporateAcceptanceAcceptedAt,
  }
}

async function getInventoryReadSchema(): Promise<InventoryReadSchema> {
  const [
    itemId,
    itemCode,
    itemName,
    itemCategoryId,
    itemUnitId,
    itemRackCode,
    itemRackBarcode,
    itemCurrentStock,
    itemMinimumStock,
    itemStatus,
    itemUpdatedAt,
    categoryId,
    categoryCode,
    unitId,
    unitCode,
    movementId,
    movementItemId,
    movementType,
    movementReferenceNo,
    movementQty,
    movementUnitPrice,
    movementAt,
    movementNotes,
    odpId,
    odpCode,
    odpName,
    odpTotalPorts,
    odpActivePorts,
    odpLocationText,
    odpLatitude,
    odpLongitude,
    odpUpdatedAt,
    odpPortId,
    odpPortOdpId,
    odpPortNo,
    odpPortStatus,
    odpPortSubscriptionId,
    odpPortCustomerId,
    odpPortInstalledAt,
    odpPortCreatedAt,
    odpPortUpdatedAt,
    subscriptionId,
    subscriptionServiceNo,
    customerId,
    customerCode,
    customerFullName,
    deviceAssignmentId,
    deviceAssignmentInventoryItemId,
    deviceAssignmentSubscriptionId,
    deviceAssignmentWorkOrderId,
    deviceAssignmentCustomerId,
    deviceAssignmentStatus,
    deviceAssignmentAssignedAt,
    deviceAssignmentReturnedAt,
    deviceAssignmentSerialNumber,
    workOrderId,
    workOrderNo,
    requestId,
    requestInventoryItemId,
    requestCode,
    requestQty,
    requestStatus,
    requestRequestedDivision,
    requestRequestedSubdivision,
    requestRequestedFor,
    requestNotes,
    requestPendingReason,
    requestRequestedBy,
    requestProcessedBy,
    requestRequestedAt,
    requestProcessedAt,
    loanId,
    loanInventoryItemId,
    loanCode,
    loanQty,
    loanReturnedQty,
    loanStatus,
    loanBorrowerName,
    loanBorrowerDivision,
    loanBorrowerSubdivision,
    loanNotes,
    loanReturnNotes,
    loanBorrowedAt,
    loanDueAt,
    loanReturnedAt,
  ] = await Promise.all([
    hasReviewDbColumn('inventory_items', 'id'),
    hasReviewDbColumn('inventory_items', 'item_code'),
    hasReviewDbColumn('inventory_items', 'item_name'),
    hasReviewDbColumn('inventory_items', 'category_id'),
    hasReviewDbColumn('inventory_items', 'unit_id'),
    hasReviewDbColumn('inventory_items', 'rack_code'),
    hasReviewDbColumn('inventory_items', 'rack_barcode'),
    hasReviewDbColumn('inventory_items', 'current_stock'),
    hasReviewDbColumn('inventory_items', 'minimum_stock'),
    hasReviewDbColumn('inventory_items', 'status'),
    hasReviewDbColumn('inventory_items', 'updated_at'),
    hasReviewDbColumn('inventory_categories', 'id'),
    hasReviewDbColumn('inventory_categories', 'code'),
    hasReviewDbColumn('inventory_units', 'id'),
    hasReviewDbColumn('inventory_units', 'code'),
    hasReviewDbColumn('inventory_stock_movements', 'id'),
    hasReviewDbColumn('inventory_stock_movements', 'item_id'),
    hasReviewDbColumn('inventory_stock_movements', 'movement_type'),
    hasReviewDbColumn('inventory_stock_movements', 'reference_no'),
    hasReviewDbColumn('inventory_stock_movements', 'qty'),
    hasReviewDbColumn('inventory_stock_movements', 'unit_price'),
    hasReviewDbColumn('inventory_stock_movements', 'movement_at'),
    hasReviewDbColumn('inventory_stock_movements', 'notes'),
    hasReviewDbColumn('network_odp', 'id'),
    hasReviewDbColumn('network_odp', 'code'),
    hasReviewDbColumn('network_odp', 'name'),
    hasReviewDbColumn('network_odp', 'total_ports'),
    hasReviewDbColumn('network_odp', 'active_ports'),
    hasReviewDbColumn('network_odp', 'location_text'),
    hasReviewDbColumn('network_odp', 'latitude'),
    hasReviewDbColumn('network_odp', 'longitude'),
    hasReviewDbColumn('network_odp', 'updated_at'),
    hasReviewDbColumn('network_odp_ports', 'id'),
    hasReviewDbColumn('network_odp_ports', 'odp_id'),
    hasReviewDbColumn('network_odp_ports', 'port_no'),
    hasReviewDbColumn('network_odp_ports', 'port_status'),
    hasReviewDbColumn('network_odp_ports', 'subscription_id'),
    hasReviewDbColumn('network_odp_ports', 'customer_id'),
    hasReviewDbColumn('network_odp_ports', 'installed_at'),
    hasReviewDbColumn('network_odp_ports', 'created_at'),
    hasReviewDbColumn('network_odp_ports', 'updated_at'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'customer_code'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('service_device_assignments', 'id'),
    hasReviewDbColumn('service_device_assignments', 'inventory_item_id'),
    hasReviewDbColumn('service_device_assignments', 'subscription_id'),
    hasReviewDbColumn('service_device_assignments', 'work_order_id'),
    hasReviewDbColumn('service_device_assignments', 'customer_id'),
    hasReviewDbColumn('service_device_assignments', 'assignment_status'),
    hasReviewDbColumn('service_device_assignments', 'assigned_at'),
    hasReviewDbColumn('service_device_assignments', 'returned_at'),
    hasReviewDbColumn('service_device_assignments', 'serial_number'),
    hasReviewDbColumn('service_work_orders', 'id'),
    hasReviewDbColumn('service_work_orders', 'work_order_no'),
    hasReviewDbColumn('inventory_item_requests', 'id'),
    hasReviewDbColumn('inventory_item_requests', 'inventory_item_id'),
    hasReviewDbColumn('inventory_item_requests', 'request_code'),
    hasReviewDbColumn('inventory_item_requests', 'request_qty'),
    hasReviewDbColumn('inventory_item_requests', 'request_status'),
    hasReviewDbColumn('inventory_item_requests', 'requested_division'),
    hasReviewDbColumn('inventory_item_requests', 'requested_subdivision'),
    hasReviewDbColumn('inventory_item_requests', 'requested_for'),
    hasReviewDbColumn('inventory_item_requests', 'request_notes'),
    hasReviewDbColumn('inventory_item_requests', 'pending_reason'),
    hasReviewDbColumn('inventory_item_requests', 'requested_by'),
    hasReviewDbColumn('inventory_item_requests', 'processed_by'),
    hasReviewDbColumn('inventory_item_requests', 'requested_at'),
    hasReviewDbColumn('inventory_item_requests', 'processed_at'),
    hasReviewDbColumn('inventory_item_loans', 'id'),
    hasReviewDbColumn('inventory_item_loans', 'inventory_item_id'),
    hasReviewDbColumn('inventory_item_loans', 'loan_code'),
    hasReviewDbColumn('inventory_item_loans', 'loan_qty'),
    hasReviewDbColumn('inventory_item_loans', 'returned_qty'),
    hasReviewDbColumn('inventory_item_loans', 'loan_status'),
    hasReviewDbColumn('inventory_item_loans', 'borrower_name'),
    hasReviewDbColumn('inventory_item_loans', 'borrower_division'),
    hasReviewDbColumn('inventory_item_loans', 'borrower_subdivision'),
    hasReviewDbColumn('inventory_item_loans', 'loan_notes'),
    hasReviewDbColumn('inventory_item_loans', 'return_notes'),
    hasReviewDbColumn('inventory_item_loans', 'borrowed_at'),
    hasReviewDbColumn('inventory_item_loans', 'due_at'),
    hasReviewDbColumn('inventory_item_loans', 'returned_at'),
  ])

  return {
    itemId,
    itemCode,
    itemName,
    itemCategoryId,
    itemUnitId,
    itemRackCode,
    itemRackBarcode,
    itemCurrentStock,
    itemMinimumStock,
    itemStatus,
    itemUpdatedAt,
    categoryId,
    categoryCode,
    unitId,
    unitCode,
    movementId,
    movementItemId,
    movementType,
    movementReferenceNo,
    movementQty,
    movementUnitPrice,
    movementAt,
    movementNotes,
    odpId,
    odpCode,
    odpName,
    odpTotalPorts,
    odpActivePorts,
    odpLocationText,
    odpLatitude,
    odpLongitude,
    odpUpdatedAt,
    odpPortId,
    odpPortOdpId,
    odpPortNo,
    odpPortStatus,
    odpPortSubscriptionId,
    odpPortCustomerId,
    odpPortInstalledAt,
    odpPortCreatedAt,
    odpPortUpdatedAt,
    subscriptionId,
    subscriptionServiceNo,
    customerId,
    customerCode,
    customerFullName,
    deviceAssignmentId,
    deviceAssignmentInventoryItemId,
    deviceAssignmentSubscriptionId,
    deviceAssignmentWorkOrderId,
    deviceAssignmentCustomerId,
    deviceAssignmentStatus,
    deviceAssignmentAssignedAt,
    deviceAssignmentReturnedAt,
    deviceAssignmentSerialNumber,
    workOrderId,
    workOrderNo,
    requestId,
    requestInventoryItemId,
    requestCode,
    requestQty,
    requestStatus,
    requestRequestedDivision,
    requestRequestedSubdivision,
    requestRequestedFor,
    requestNotes,
    requestPendingReason,
    requestRequestedBy,
    requestProcessedBy,
    requestRequestedAt,
    requestProcessedAt,
    loanId,
    loanInventoryItemId,
    loanCode,
    loanQty,
    loanReturnedQty,
    loanStatus,
    loanBorrowerName,
    loanBorrowerDivision,
    loanBorrowerSubdivision,
    loanNotes,
    loanReturnNotes,
    loanBorrowedAt,
    loanDueAt,
    loanReturnedAt,
  }
}

async function getReviewDbBillingSections(session: AppSession, filters?: DomainReviewDrilldownFilters): Promise<DomainReviewSection[]> {
  const focus = String(filters?.focus ?? '')
    .trim()
    .toUpperCase()
  const branchScope = resolveBranchScope(session)
  const period = resolveSqlPeriodRange(filters)
  const billingSchema = await getBillingReadSchema()
  const billingSubscriptionParts = getBillingSubscriptionQueryParts(billingSchema)
  const billingInvoiceParts = getBillingInvoiceQueryParts(billingSchema)
  const billingActionParts = getBillingActionQueryParts(billingSchema)

  const [hasCustomerBranchId] = await Promise.all([hasReviewDbColumn('crm_customers', 'branch_id')])
  const subscriptionBranchWhere =
    billingSubscriptionParts.customerJoin && hasCustomerBranchId
      ? buildBranchWhere(branchScope, 'c.branch_id')
      : { clause: '', values: [] as unknown[] }
  const invoiceBranchWhere =
    billingInvoiceParts.customerJoin && hasCustomerBranchId
      ? buildBranchWhere(branchScope, 'c.branch_id')
      : { clause: '', values: [] as unknown[] }

  const subscriptionsReadyResult = await runSafeDomainSectionQuery<ReviewDbBillingReadySubscriptionRow>({
    sectionLabel: 'billing-ready-subscriptions',
    enabled:
      billingSchema.subscriptionId &&
      billingSchema.subscriptionServiceNo &&
      billingSchema.subscriptionStatus &&
      billingSchema.subscriptionMonthlyPrice &&
      billingSchema.invoiceSubscriptionId &&
      billingSchema.invoiceType &&
      billingSchema.invoiceBillingYear &&
      billingSchema.invoiceBillingMonth &&
      billingSchema.invoiceStatus,
    query: () =>
      runReviewDbQuery<ReviewDbBillingReadySubscriptionRow>(`
        SELECT
          ss.id AS subscriptionId,
          ss.service_no AS serviceNo,
          ${billingSubscriptionParts.customerNameExpression} AS customerName,
          ${billingSubscriptionParts.packageNameExpression} AS packageName,
          ${billingSubscriptionParts.speedLabelExpression} AS speedLabel,
          ${billingSubscriptionParts.monthlyPriceExpression} AS monthlyPrice,
          ${billingSubscriptionParts.activatedAtExpression} AS activatedAt
        FROM service_subscriptions ss
        ${billingSubscriptionParts.customerJoin}
        ${billingSubscriptionParts.packageJoin}
        WHERE ss.status = 'ACTIVE'
          ${subscriptionBranchWhere.clause}
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
        ORDER BY ${billingSubscriptionParts.orderByExpression}
        LIMIT 5
      `, subscriptionBranchWhere.values),
  })
  const subscriptionsReady = subscriptionsReadyResult.rows

  const invoiceValues: unknown[] = []
  const invoicePeriodClauses: string[] = []
  if (period && billingSchema.invoiceBillingYear && billingSchema.invoiceBillingMonth) {
    invoicePeriodClauses.push('(bi.billing_year = ? AND bi.billing_month = ?)')
    invoiceValues.push(period.year, period.month)
  }
  if (period && billingSchema.invoiceDueDate) {
    invoicePeriodClauses.push('(bi.due_date >= ? AND bi.due_date < ?)')
    invoiceValues.push(period.startDate, period.endDate)
  }
  const invoicePeriodWhere = invoicePeriodClauses.length ? ` AND (${invoicePeriodClauses.join(' OR ')}) ` : ''

  const invoiceFocusWhere = (() => {
    if (focus === 'OVERDUE_INVOICES' || focus === 'BILLING_OVERDUE_AMOUNT') {
      return `
        AND (
          bi.invoice_status = 'OVERDUE'
          ${billingSchema.invoiceDueDate ? `OR (
            bi.due_date < CURRENT_DATE
            AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
            AND bi.invoice_status NOT IN ('PAID', 'CANCELLED')
          )` : ''}
        )
      `
    }
    if (focus === 'PARTIAL_INVOICES' || focus === 'PARTIAL_PAYMENTS') {
      return `
        AND bi.invoice_status = 'PARTIAL'
        AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
      `
    }
    return `
      AND (
        bi.invoice_status IN ('OVERDUE', 'PARTIAL')
        ${billingSchema.invoiceDueDate ? `OR (
          bi.due_date < CURRENT_DATE
          AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
          AND bi.invoice_status NOT IN ('PAID', 'CANCELLED')
        )` : ''}
      )
    `
  })()

  const invoiceOrderBy =
    focus === 'BILLING_OVERDUE_AMOUNT'
      ? `ORDER BY (COALESCE(bi.total_amount, 0) - COALESCE(bi.paid_amount, 0)) DESC${
          billingSchema.invoiceDueDate ? ', bi.due_date ASC' : ''
        }, bi.id DESC`
      : `ORDER BY ${billingSchema.invoiceDueDate ? 'bi.due_date ASC, ' : ''}bi.id DESC`
  const invoiceLimit = focus === 'BILLING_OVERDUE_AMOUNT' ? 10 : 5

  const invoicesResult = await runSafeDomainSectionQuery<ReviewDbBillingInvoiceRow>({
    sectionLabel: 'billing-overdue-invoices',
    enabled:
      billingSchema.invoiceNo &&
      billingSchema.invoiceType &&
      billingSchema.invoiceStatus &&
      billingSchema.invoiceTotalAmount &&
      billingSchema.invoicePaidAmount &&
      billingSchema.invoiceDueDate,
    query: () =>
      runReviewDbQuery<ReviewDbBillingInvoiceRow>(
        `
          SELECT
            bi.invoice_no AS invoiceNo,
            ${billingInvoiceParts.customerNameExpression} AS customerName,
            ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
            bi.invoice_type AS invoiceType,
            bi.invoice_status AS invoiceStatus,
            bi.total_amount AS totalAmount,
            bi.paid_amount AS paidAmount,
            ${billingInvoiceParts.dueDateExpression} AS dueDate
          FROM billing_invoices bi
          ${billingInvoiceParts.subscriptionJoin}
          ${billingInvoiceParts.customerJoin}
          WHERE 1 = 1
            ${invoiceFocusWhere}
            ${invoicePeriodWhere}
            ${invoiceBranchWhere.clause}
            ${billingInvoiceParts.collectionOpenFilter}
          ${invoiceOrderBy}
          LIMIT ${invoiceLimit}
        `,
        [...invoiceValues, ...invoiceBranchWhere.values],
      ),
  })
  const invoices = invoicesResult.rows

  const latestInvoicesResult = await runSafeDomainSectionQuery<ReviewDbBillingLatestInvoiceRow>({
    sectionLabel: 'billing-latest-invoices',
    enabled:
      billingSchema.invoiceNo &&
      billingSchema.invoiceType &&
      billingSchema.invoiceStatus &&
      billingSchema.invoiceTotalAmount &&
      billingSchema.invoicePaidAmount,
    query: () =>
      runReviewDbQuery<ReviewDbBillingLatestInvoiceRow>(`
        SELECT
          bi.invoice_no AS invoiceNo,
          bi.invoice_type AS invoiceType,
          bi.invoice_status AS invoiceStatus,
          bi.total_amount AS totalAmount,
          bi.paid_amount AS paidAmount,
          ${billingInvoiceParts.issueDateExpression} AS issueDate,
          ${billingInvoiceParts.dueDateExpression} AS dueDate,
          ${billingInvoiceParts.billingMonthExpression} AS billingMonth,
          ${billingInvoiceParts.billingYearExpression} AS billingYear,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          ${billingInvoiceParts.customerNameExpression} AS customerName
        FROM billing_invoices bi
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        WHERE 1 = 1
          ${invoiceBranchWhere.clause}
        ORDER BY ${billingInvoiceParts.latestOrderByExpression}
        LIMIT 5
      `, invoiceBranchWhere.values),
  })
  const latestInvoices = latestInvoicesResult.rows

  const cancelledInvoicesResult = await runSafeDomainSectionQuery<ReviewDbBillingCancelledInvoiceRow>({
    sectionLabel: 'billing-cancelled-invoices',
    enabled: billingSchema.invoiceNo && billingSchema.invoiceStatus && billingSchema.invoiceTotalAmount,
    query: () =>
      runReviewDbQuery<ReviewDbBillingCancelledInvoiceRow>(`
        SELECT
          bi.invoice_no AS invoiceNo,
          ${billingInvoiceParts.customerNameExpression} AS customerName,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          bi.total_amount AS totalAmount,
          ${billingInvoiceParts.updatedAtExpression} AS updatedAt,
          ${billingInvoiceParts.notesExpression} AS notes
        FROM billing_invoices bi
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        WHERE bi.invoice_status = 'CANCELLED'
          ${invoiceBranchWhere.clause}
        ORDER BY ${billingInvoiceParts.updatedOrderByExpression}
        LIMIT 5
      `, invoiceBranchWhere.values),
  })
  const cancelledInvoices = cancelledInvoicesResult.rows

  const suspendedWhereParts = [
    billingSchema.invoiceStatus ? `COALESCE(UPPER(TRIM(bi.invoice_status)), '') = 'SUSPENDED'` : '',
    billingSchema.invoiceCollectionStatus ? `COALESCE(UPPER(TRIM(bi.collection_status)), '') = 'SUSPEND'` : '',
    billingSchema.invoiceSuspendCandidate ? `COALESCE(bi.suspend_candidate, 0) = 1` : '',
  ].filter(Boolean)
  const suspendedInvoicesResult = await runSafeDomainSectionQuery<ReviewDbBillingInvoiceRow>({
    sectionLabel: 'billing-suspended-invoices',
    enabled:
      billingSchema.invoiceNo &&
      billingSchema.invoiceTotalAmount &&
      billingSchema.invoicePaidAmount &&
      suspendedWhereParts.length > 0,
    query: () =>
      runReviewDbQuery<ReviewDbBillingInvoiceRow>(`
        SELECT
          bi.invoice_no AS invoiceNo,
          ${billingInvoiceParts.customerNameExpression} AS customerName,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          bi.invoice_status AS invoiceStatus,
          bi.total_amount AS totalAmount,
          bi.paid_amount AS paidAmount,
          ${billingInvoiceParts.dueDateExpression} AS dueDate
        FROM billing_invoices bi
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        WHERE (${suspendedWhereParts.join('\n       OR ')})
          ${invoiceBranchWhere.clause}
        ORDER BY ${billingInvoiceParts.updatedOrderByExpression}
        LIMIT 5
      `, invoiceBranchWhere.values),
  })
  const suspendedInvoices = suspendedInvoicesResult.rows

  const reconnectReadyInvoicesResult = await runSafeDomainSectionQuery<ReviewDbBillingReconnectRow>({
    sectionLabel: 'billing-reconnect-ready',
    enabled:
      billingSchema.invoiceNo &&
      billingSchema.invoiceType &&
      billingSchema.invoiceStatus &&
      billingSchema.invoiceTotalAmount &&
      billingSchema.invoicePaidAmount &&
      billingSchema.invoiceCollectionStatus,
    query: () =>
      runReviewDbQuery<ReviewDbBillingReconnectRow>(`
        SELECT
          bi.invoice_no AS invoiceNo,
          ${billingInvoiceParts.customerNameExpression} AS customerName,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          bi.invoice_type AS invoiceType,
          bi.invoice_status AS invoiceStatus,
          bi.total_amount AS totalAmount,
          bi.paid_amount AS paidAmount,
          ${billingInvoiceParts.dueDateExpression} AS dueDate,
          ${billingInvoiceParts.collectionStatusExpression} AS collectionStatus,
          ${billingInvoiceParts.updatedAtExpression} AS updatedAt
        FROM billing_invoices bi
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        WHERE COALESCE(UPPER(TRIM(bi.collection_status)), '') = 'RECONNECT'
          AND COALESCE(UPPER(TRIM(bi.invoice_status)), 'ISSUED') IN ('ISSUED', 'OVERDUE', 'PARTIAL')
        ORDER BY ${billingInvoiceParts.updatedOrderByExpression}
        LIMIT 5
      `),
  })
  const reconnectReadyInvoices = reconnectReadyInvoicesResult.rows

  const actionsResult = await runSafeDomainSectionQuery<ReviewDbCollectionActionRow>({
    sectionLabel: 'billing-collection-actions',
    enabled:
      billingSchema.actionInvoiceId &&
      billingSchema.actionType &&
      billingSchema.actionStatus &&
      billingSchema.invoiceId &&
      billingSchema.invoiceNo &&
      billingSchema.invoiceType,
    query: () =>
      runReviewDbQuery<ReviewDbCollectionActionRow>(`
        SELECT
          bi.invoice_type AS invoiceType,
          bca.action_type AS actionType,
          bca.action_status AS actionStatus,
          ${billingActionParts.actionAtExpression} AS actionAt,
          ${billingActionParts.dueFollowUpAtExpression} AS dueFollowUpAt,
          ${billingInvoiceParts.customerNameExpression} AS customerName,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          bi.invoice_no AS invoiceNo,
          ${billingActionParts.notesExpression} AS notes
        FROM billing_collection_actions bca
        JOIN billing_invoices bi
          ON bi.id = bca.invoice_id
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        ORDER BY ${billingActionParts.orderByExpression}
        LIMIT 5
      `),
  })
  const actions = actionsResult.rows

  const followUpValues: unknown[] = []
  const followUpPeriodWhere = period && billingSchema.invoiceDueDate ? ` AND bi.due_date >= ? AND bi.due_date < ? ` : ''
  if (followUpPeriodWhere && period) {
    followUpValues.push(period.startDate, period.endDate)
  }

  const followUpFocusWhere =
    focus === 'SUSPEND_CANDIDATES'
      ? `
        AND (
          ${billingSchema.invoiceSuspendCandidate ? 'COALESCE(bi.suspend_candidate, 0) = 1' : '1 = 0'}
          OR ${billingSchema.actionType ? "COALESCE(UPPER(TRIM(latest.action_type)), '') = 'SUSPEND'" : '1 = 0'}
          OR ${
            billingSchema.actionType && billingSchema.actionDueFollowUpAt
              ? `(
            COALESCE(UPPER(TRIM(latest.action_type)), '') = 'PROMISE_TO_PAY'
            AND latest.due_follow_up_at IS NOT NULL
            AND latest.due_follow_up_at < CURRENT_TIMESTAMP
          )`
              : '1 = 0'
          }
        )
      `
      : ''

  const collectionFollowUpsResult = await runSafeDomainSectionQuery<ReviewDbCollectionFollowUpRow>({
    sectionLabel: 'billing-collection-followups',
    enabled:
      billingSchema.invoiceId &&
      billingSchema.invoiceNo &&
      billingSchema.invoiceType &&
      billingSchema.invoiceStatus &&
      billingSchema.invoiceTotalAmount &&
      billingSchema.invoicePaidAmount &&
      billingSchema.actionId &&
      billingSchema.actionInvoiceId &&
      billingSchema.actionType &&
      billingSchema.actionStatus,
    query: () =>
      runReviewDbQuery<ReviewDbCollectionFollowUpRow>(
        `
        SELECT
          bi.invoice_no AS invoiceNo,
          ${billingInvoiceParts.customerNameExpression} AS customerName,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          bi.invoice_type AS invoiceType,
          bi.invoice_status AS invoiceStatus,
          bi.total_amount AS totalAmount,
          bi.paid_amount AS paidAmount,
          ${billingInvoiceParts.dueDateExpression} AS dueDate,
          ${billingInvoiceParts.collectionStatusExpression} AS collectionStatus,
          ${billingInvoiceParts.suspendCandidateExpression} AS suspendCandidate,
          latest.action_type AS actionType,
          latest.action_status AS actionStatus,
          latest.action_at AS actionAt,
          latest.due_follow_up_at AS dueFollowUpAt,
          latest.notes
        FROM billing_invoices bi
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        JOIN (
          SELECT
            action_latest.invoice_id,
            action_latest.action_type,
            action_latest.action_status,
            ${billingActionParts.latestActionAtExpression} AS action_at,
            ${billingActionParts.latestDueFollowUpAtExpression} AS due_follow_up_at,
            ${billingActionParts.latestNotesExpression} AS notes
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
          ${billingSchema.invoiceCollectionStatus ? "AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') <> 'CLOSED'" : ''}
          ${followUpFocusWhere}
          ${followUpPeriodWhere}
        ORDER BY
          ${
            billingSchema.actionDueFollowUpAt
              ? `CASE WHEN latest.due_follow_up_at IS NULL THEN 1 ELSE 0 END ASC,
          latest.due_follow_up_at ASC,`
              : ''
          }
          ${billingSchema.invoiceDueDate ? 'bi.due_date ASC,' : ''}
          bi.id DESC
        LIMIT 10
      `,
        followUpValues,
      ),
  })
  const collectionFollowUps = collectionFollowUpsResult.rows

  const activeCollectionFollowUps = collectionFollowUps.filter(
    (item) => !['WRITE_OFF', 'CLOSED'].includes(String(item.collectionStatus ?? '').trim().toUpperCase()),
  )
  const recurringActiveCollectionFollowUps = activeCollectionFollowUps.filter((item) => isRecurringInvoiceType(item.invoiceType))
  const oneTimeActiveCollectionFollowUps = activeCollectionFollowUps.filter((item) => !isRecurringInvoiceType(item.invoiceType))
  const writeOffCollectionFollowUps = collectionFollowUps.filter(
    (item) => String(item.collectionStatus ?? '').trim().toUpperCase() === 'WRITE_OFF',
  )
  const suspendReadyCollectionFollowUps = activeCollectionFollowUps.filter(
    (item) =>
      Number(item.suspendCandidate) > 0 ||
      item.actionType.trim().toUpperCase() === 'SUSPEND' ||
      isPromiseToPayOverdue({
        actionType: item.actionType,
        dueFollowUpAt: item.dueFollowUpAt,
      }),
  )
  const recurringSuspendReadyCollectionFollowUps = suspendReadyCollectionFollowUps.filter((item) =>
    isRecurringInvoiceType(item.invoiceType),
  )
  const oneTimeSuspendReadyCollectionFollowUps = suspendReadyCollectionFollowUps.filter(
    (item) => !isRecurringInvoiceType(item.invoiceType),
  )
  const promiseToPayCollectionFollowUps = activeCollectionFollowUps.filter(
    (item) =>
      item.actionType.trim().toUpperCase() === 'PROMISE_TO_PAY' &&
      !isPromiseToPayOverdue({
        actionType: item.actionType,
        dueFollowUpAt: item.dueFollowUpAt,
      }),
  )
  const recurringPromiseToPayCollectionFollowUps = promiseToPayCollectionFollowUps.filter((item) =>
    isRecurringInvoiceType(item.invoiceType),
  )
  const oneTimePromiseToPayCollectionFollowUps = promiseToPayCollectionFollowUps.filter(
    (item) => !isRecurringInvoiceType(item.invoiceType),
  )
  const recurringActions = actions.filter((item) => isRecurringInvoiceType(item.invoiceType))
  const oneTimeActions = actions.filter((item) => !isRecurringInvoiceType(item.invoiceType))
  const recurringReconnectReadyInvoices = reconnectReadyInvoices.filter((item) => isRecurringInvoiceType(item.invoiceType))
  const oneTimeReconnectReadyInvoices = reconnectReadyInvoices.filter((item) => !isRecurringInvoiceType(item.invoiceType))
  const recurringWriteOffCollectionFollowUps = writeOffCollectionFollowUps.filter((item) =>
    isRecurringInvoiceType(item.invoiceType),
  )
  const oneTimeWriteOffCollectionFollowUps = writeOffCollectionFollowUps.filter(
    (item) => !isRecurringInvoiceType(item.invoiceType),
  )
  const recurringInvoices = invoices.filter((item) => isRecurringInvoiceType(item.invoiceType))
  const oneTimeInvoices = invoices.filter((item) => !isRecurringInvoiceType(item.invoiceType))
  const recurringLatestInvoices = latestInvoices.filter((item) => isRecurringInvoiceType(item.invoiceType))
  const oneTimeLatestInvoices = latestInvoices.filter((item) => !isRecurringInvoiceType(item.invoiceType))
  const recurringOutstandingAmount = recurringInvoices.reduce(
    (total, item) => total + Math.max(0, Number(item.totalAmount) - Number(item.paidAmount)),
    0,
  )
  const oneTimeOutstandingAmount = oneTimeInvoices.reduce(
    (total, item) => total + Math.max(0, Number(item.totalAmount) - Number(item.paidAmount)),
    0,
  )
  const overdueAmountSummary = {
    recurring: [
      { label: 'Invoice', value: formatNumber(recurringInvoices.length) },
      { label: 'Outstanding', value: formatCurrency(recurringOutstandingAmount) },
      {
        label: 'Rata-rata',
        value: formatCurrency(recurringInvoices.length ? recurringOutstandingAmount / recurringInvoices.length : 0),
      },
    ],
    oneTime: [
      { label: 'Invoice', value: formatNumber(oneTimeInvoices.length) },
      { label: 'Outstanding', value: formatCurrency(oneTimeOutstandingAmount) },
      {
        label: 'Rata-rata',
        value: formatCurrency(oneTimeInvoices.length ? oneTimeOutstandingAmount / oneTimeInvoices.length : 0),
      },
    ],
  }

  const paymentsResult = await runSafeDomainSectionQuery<ReviewDbPaymentRow>({
    sectionLabel: 'billing-payments',
    enabled:
      billingSchema.paymentInvoiceId &&
      billingSchema.paymentDate &&
      billingSchema.paymentAmount &&
      billingSchema.invoiceId &&
      billingSchema.invoiceNo,
    query: () =>
      runReviewDbQuery<ReviewDbPaymentRow>(`
        SELECT
          ${billingSchema.paymentNo ? 'bp.payment_no' : 'NULL'} AS paymentNo,
          bp.payment_date AS paymentDate,
          bp.amount,
          ${billingSchema.paymentMethod ? 'bp.payment_method' : 'NULL'} AS paymentMethod,
          ${billingSchema.paymentReferenceNo ? 'bp.reference_no' : 'NULL'} AS referenceNo,
          ${billingInvoiceParts.customerNameExpression} AS customerName,
          ${billingInvoiceParts.serviceNoExpression} AS serviceNo,
          bi.invoice_no AS invoiceNo,
          ${billingSchema.paymentNotes ? 'bp.notes' : 'NULL'} AS notes
        FROM billing_payments bp
        JOIN billing_invoices bi
          ON bi.id = bp.invoice_id
        ${billingInvoiceParts.subscriptionJoin}
        ${billingInvoiceParts.customerJoin}
        ORDER BY ${billingSchema.paymentDate ? 'bp.payment_date DESC,' : ''} bp.id DESC
        LIMIT 5
      `),
  })
  const payments = paymentsResult.rows

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
      title: focus === 'BILLING_OVERDUE_AMOUNT' ? 'Nominal Overdue Recurring Terbesar' : 'Invoice Recurring Perlu Tindak Lanjut',
      description:
        focus === 'BILLING_OVERDUE_AMOUNT'
          ? 'Invoice recurring dengan sisa tagihan terbesar agar tim billing bisa memprioritaskan nominal overdue paling besar lebih dulu.'
          : 'Invoice recurring overdue atau partial terbaru untuk memantau prioritas penagihan bulanan yang masih collectible.',
      summary: focus === 'BILLING_OVERDUE_AMOUNT' ? overdueAmountSummary.recurring : undefined,
      rows: recurringInvoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail:
          focus === 'BILLING_OVERDUE_AMOUNT'
            ? `Sisa tagihan ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))} dari total ${formatCurrency(item.totalAmount)} pada invoice recurring overdue.`
            : `Total tagihan ${formatCurrency(item.totalAmount)} dengan pembayaran masuk ${formatCurrency(item.paidAmount)}.`,
        meta: [
          `Service: ${item.serviceNo}`,
          `Invoice Type: ${item.invoiceType}`,
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Terbayar: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Jatuh Tempo: ${formatDateTime(item.dueDate)}`,
        ],
        filterTags: [
          `PERIOD:${toPeriodKey(item.dueDate)}`,
          `INVOICE_STATUS:${String(item.invoiceStatus).trim().toUpperCase()}`,
          `REMAINING_POSITIVE:${Number(item.totalAmount) > Number(item.paidAmount) ? 'YES' : 'NO'}`,
        ],
      })),
    },
    {
      title: focus === 'BILLING_OVERDUE_AMOUNT' ? 'Nominal Overdue One-Time Terbesar' : 'Invoice One-Time Perlu Tindak Lanjut',
      description:
        focus === 'BILLING_OVERDUE_AMOUNT'
          ? 'Invoice one-time dengan sisa tagihan terbesar agar charge instalasi, adjustment, atau terminasi bisa diprioritaskan berdasarkan nominal outstanding.'
          : 'Invoice one-time overdue atau partial terbaru untuk memisahkan charge instalasi, adjustment, atau terminasi dari tagihan bulanan.',
      summary: focus === 'BILLING_OVERDUE_AMOUNT' ? overdueAmountSummary.oneTime : undefined,
      rows: oneTimeInvoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Invoice ${item.invoiceType} masih menyisakan tagihan ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))} dan perlu follow-up one-time terpisah dari recurring billing.`,
        meta: [
          `Service: ${item.serviceNo}`,
          `Invoice Type: ${item.invoiceType}`,
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Terbayar: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Jatuh Tempo: ${formatDateTime(item.dueDate)}`,
        ],
        filterTags: [
          `PERIOD:${toPeriodKey(item.dueDate)}`,
          `INVOICE_STATUS:${String(item.invoiceStatus).trim().toUpperCase()}`,
          `REMAINING_POSITIVE:${Number(item.totalAmount) > Number(item.paidAmount) ? 'YES' : 'NO'}`,
        ],
      })),
    },
    {
      title: 'Invoice Recurring Terbaru',
      description:
        'Invoice recurring terbaru dari review DB untuk memastikan hasil generate tagihan bulanan langsung terlihat terpisah dari one-time charge.',
      rows: recurringLatestInvoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Invoice ${item.invoiceType} untuk layanan ${item.serviceNo} dengan total ${formatCurrency(item.totalAmount)}.`,
        meta: [
          `Invoice Type: ${item.invoiceType}`,
          `Service: ${item.serviceNo}`,
          `Issue: ${formatDateTime(item.issueDate)}`,
          `Due: ${formatDateTime(item.dueDate)}`,
          `Paid: ${formatCurrency(item.paidAmount)}`,
          item.billingMonth && item.billingYear
            ? `Periode: ${String(item.billingMonth).padStart(2, '0')}/${item.billingYear}`
            : 'Periode: -',
        ],
        filterTags: [
          item.billingMonth && item.billingYear
            ? `PERIOD:${item.billingYear}-${String(item.billingMonth).padStart(2, '0')}`
            : `PERIOD:${toPeriodKey(item.issueDate)}`,
          `INVOICE_STATUS:${String(item.invoiceStatus).trim().toUpperCase()}`,
        ],
      })),
    },
    {
      title: 'Invoice One-Time Terbaru',
      description:
        'Invoice one-time terbaru untuk meninjau charge instalasi, adjustment, atau terminasi secara terpisah dari recurring billing.',
      rows: oneTimeLatestInvoices.map((item) => ({
        id: item.invoiceNo,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Invoice ${item.invoiceType} untuk layanan ${item.serviceNo} dengan total ${formatCurrency(item.totalAmount)}.`,
        meta: [
          `Invoice Type: ${item.invoiceType}`,
          `Service: ${item.serviceNo}`,
          `Issue: ${formatDateTime(item.issueDate)}`,
          `Due: ${formatDateTime(item.dueDate)}`,
          `Paid: ${formatCurrency(item.paidAmount)}`,
          item.billingMonth && item.billingYear
            ? `Periode: ${String(item.billingMonth).padStart(2, '0')}/${item.billingYear}`
            : 'Periode: -',
        ],
        filterTags: [
          item.billingMonth && item.billingYear
            ? `PERIOD:${item.billingYear}-${String(item.billingMonth).padStart(2, '0')}`
            : `PERIOD:${toPeriodKey(item.issueDate)}`,
          `INVOICE_STATUS:${String(item.invoiceStatus).trim().toUpperCase()}`,
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
          `Service: ${item.serviceNo}`,
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
          `Service: ${item.serviceNo}`,
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Terbayar: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Jatuh Tempo: ${formatDateTime(item.dueDate)}`,
        ],
      })),
    },
    {
      title: 'Suspend Ready Queue • Recurring',
      description:
        'Antrean invoice recurring yang sudah masuk sinyal suspend dari collection follow-up agar operator billing bisa mengeksekusi suspend massal untuk tagihan bulanan tanpa tercampur one-time charge.',
      rows: recurringSuspendReadyCollectionFollowUps.map((item, index) => {
          const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
          const followUpState = getFollowUpState(item.dueFollowUpAt)
          const autoEscalatedPromiseToPay = isPromiseToPayOverdue({
            actionType: item.actionType,
            dueFollowUpAt: item.dueFollowUpAt,
          })

          return {
            id: `${item.invoiceNo}-SUSPEND-READY-${index}`,
            primary: item.invoiceNo,
            secondary: item.customerName,
            status: followUpState,
            detail: autoEscalatedPromiseToPay
              ? `Promise to pay sudah lewat jatuh tempo, sehingga invoice otomatis masuk sinyal suspend dengan sisa tagihan ${formatCurrency(remainingAmount)}.`
              : `Invoice siap suspend dengan sisa tagihan ${formatCurrency(remainingAmount)} dan action ${item.actionType}.`,
            meta: [
              `Service: ${item.serviceNo}`,
              `Invoice Type: ${item.invoiceType}`,
              `Invoice Status: ${item.invoiceStatus}`,
              `Total: ${formatCurrency(item.totalAmount)}`,
              `Paid: ${formatCurrency(item.paidAmount)}`,
              `Remaining: ${formatCurrency(remainingAmount)}`,
              `Invoice Due: ${formatDateTime(item.dueDate)}`,
              `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
              `Follow Up State: ${followUpState}`,
              `Action Type: ${item.actionType}`,
              `Auto Escalated From Promise To Pay: ${autoEscalatedPromiseToPay ? 'Ya' : 'Tidak'}`,
              `Collection Status: ${item.collectionStatus || '-'}`,
              `Suspend Candidate: ${Number(item.suspendCandidate) > 0 ? 'Ya' : 'Tidak'}`,
              `Action Notes: ${item.notes?.trim() || '-'}`,
            ],
            filterTags: [
              `PERIOD:${toPeriodKey(item.dueDate)}`,
              `INVOICE_STATUS:${String(item.invoiceStatus).trim().toUpperCase()}`,
              `REMAINING_POSITIVE:${remainingAmount > 0 ? 'YES' : 'NO'}`,
              `SUSPEND_CANDIDATE:${Number(item.suspendCandidate) > 0 ? 'YES' : 'NO'}`,
            ],
          }
        }),
    },
    {
      title: 'Suspend Ready Queue • One-Time',
      description:
        'Antrean invoice one-time yang sudah masuk sinyal suspend atau eskalasi follow-up agar charge khusus tidak bercampur dengan ritme recurring billing.',
      rows: oneTimeSuspendReadyCollectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)
        const autoEscalatedPromiseToPay = isPromiseToPayOverdue({
          actionType: item.actionType,
          dueFollowUpAt: item.dueFollowUpAt,
        })

        return {
          id: `${item.invoiceNo}-SUSPEND-READY-ONE-TIME-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: autoEscalatedPromiseToPay
            ? `Promise to pay one-time sudah lewat jatuh tempo, sehingga invoice otomatis masuk sinyal suspend dengan sisa tagihan ${formatCurrency(remainingAmount)}.`
            : `Invoice one-time siap suspend dengan sisa tagihan ${formatCurrency(remainingAmount)} dan action ${item.actionType}.`,
          meta: [
            `Service: ${item.serviceNo}`,
            `Invoice Type: ${item.invoiceType}`,
            `Invoice Status: ${item.invoiceStatus}`,
            `Total: ${formatCurrency(item.totalAmount)}`,
            `Paid: ${formatCurrency(item.paidAmount)}`,
            `Remaining: ${formatCurrency(remainingAmount)}`,
            `Invoice Due: ${formatDateTime(item.dueDate)}`,
            `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
            `Follow Up State: ${followUpState}`,
            `Action Type: ${item.actionType}`,
            `Auto Escalated From Promise To Pay: ${autoEscalatedPromiseToPay ? 'Ya' : 'Tidak'}`,
            `Collection Status: ${item.collectionStatus || '-'}`,
            `Suspend Candidate: ${Number(item.suspendCandidate) > 0 ? 'Ya' : 'Tidak'}`,
            `Action Notes: ${item.notes?.trim() || '-'}`,
          ],
          filterTags: [
            `PERIOD:${toPeriodKey(item.dueDate)}`,
            `INVOICE_STATUS:${String(item.invoiceStatus).trim().toUpperCase()}`,
            `REMAINING_POSITIVE:${remainingAmount > 0 ? 'YES' : 'NO'}`,
            `SUSPEND_CANDIDATE:${Number(item.suspendCandidate) > 0 ? 'YES' : 'NO'}`,
          ],
        }
      }),
    },
    {
      title: 'Promise To Pay Queue • Recurring',
      description:
        'Antrean invoice recurring dengan janji bayar aktif agar operator collection bisa memisahkan tagihan bulanan yang masih layak ditunggu dari yang harus naik ke jalur suspend.',
      rows: recurringPromiseToPayCollectionFollowUps.map((item, index) => {
          const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
          const followUpState = getFollowUpState(item.dueFollowUpAt)

          return {
            id: `${item.invoiceNo}-PTP-${index}`,
            primary: item.invoiceNo,
            secondary: item.customerName,
            status: followUpState,
            detail: `Janji bayar aktif dengan sisa tagihan ${formatCurrency(remainingAmount)} dan follow-up ${formatDateTime(item.dueFollowUpAt)}.`,
            meta: [
              `Service: ${item.serviceNo}`,
              `Invoice Type: ${item.invoiceType}`,
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
      title: 'Promise To Pay Queue • One-Time',
      description:
        'Antrean invoice one-time dengan janji bayar aktif agar negosiasi biaya instalasi, adjustment, atau terminasi tidak bercampur dengan tagihan bulanan.',
      rows: oneTimePromiseToPayCollectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)

        return {
          id: `${item.invoiceNo}-PTP-ONE-TIME-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: `Janji bayar one-time aktif dengan sisa tagihan ${formatCurrency(remainingAmount)} dan follow-up ${formatDateTime(item.dueFollowUpAt)}.`,
          meta: [
            `Service: ${item.serviceNo}`,
            `Invoice Type: ${item.invoiceType}`,
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
      title: 'Reconnect Ready Queue • Recurring',
      description:
        'Antrean invoice recurring yang sudah disuspend dan siap dikembalikan ke jalur overdue/reconnect setelah tindak lanjut lapangan atau negosiasi customer selesai.',
      rows: recurringReconnectReadyInvoices.map((item) => ({
        id: `${item.invoiceNo}-RECONNECT-RECURRING`,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Invoice recurring pada jalur reconnect dengan sisa tagihan ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))} masih perlu pemulihan layanan atau tindak lanjut billing.`,
        meta: [
          `Service: ${item.serviceNo}`,
          `Invoice Type: ${item.invoiceType}`,
          `Invoice Status: ${item.invoiceStatus}`,
          `Collection Status: ${item.collectionStatus || '-'}`,
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Paid: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Invoice Due: ${formatDateTime(item.dueDate)}`,
          `Updated: ${formatDateTime(item.updatedAt)}`,
        ],
      })),
    },
    {
      title: 'Reconnect Ready Queue • One-Time',
      description:
        'Antrean invoice one-time yang sudah masuk jalur reconnect agar charge instalasi, adjustment, atau terminasi yang masih perlu pemulihan tidak bercampur dengan tagihan bulanan.',
      rows: oneTimeReconnectReadyInvoices.map((item) => ({
        id: `${item.invoiceNo}-RECONNECT-ONE-TIME`,
        primary: item.invoiceNo,
        secondary: item.customerName,
        status: item.invoiceStatus,
        detail: `Invoice one-time pada jalur reconnect dengan sisa tagihan ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))} masih perlu tindak lanjut billing.`,
        meta: [
          `Service: ${item.serviceNo}`,
          `Invoice Type: ${item.invoiceType}`,
          `Invoice Status: ${item.invoiceStatus}`,
          `Collection Status: ${item.collectionStatus || '-'}`,
          `Total: ${formatCurrency(item.totalAmount)}`,
          `Paid: ${formatCurrency(item.paidAmount)}`,
          `Remaining: ${formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}`,
          `Invoice Due: ${formatDateTime(item.dueDate)}`,
          `Updated: ${formatDateTime(item.updatedAt)}`,
        ],
      })),
    },
    {
      title: 'Write Off Queue • Recurring',
      description:
        'Antrean invoice recurring yang sedang diajukan atau diproses write-off agar operator collection bisa memisahkannya dari follow-up penagihan normal.',
      rows: recurringWriteOffCollectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)

        return {
          id: `${item.invoiceNo}-WRITE-OFF-RECURRING-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: `Invoice berada pada jalur write-off dengan sisa tagihan ${formatCurrency(remainingAmount)} dan perlu keputusan formal sebelum keluar penuh dari lifecycle billing.`,
          meta: [
            `Service: ${item.serviceNo}`,
            `Invoice Type: ${item.invoiceType}`,
            `Invoice Status: ${item.invoiceStatus}`,
            `Total: ${formatCurrency(item.totalAmount)}`,
            `Paid: ${formatCurrency(item.paidAmount)}`,
            `Remaining: ${formatCurrency(remainingAmount)}`,
            `Invoice Due: ${formatDateTime(item.dueDate)}`,
            `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
            `Follow Up State: ${followUpState}`,
            `Action Type: ${item.actionType}`,
            `Collection Status: ${item.collectionStatus || '-'}`,
            `Action At: ${formatDateTime(item.actionAt)}`,
            `Action Notes: ${item.notes?.trim() || '-'}`,
          ],
        }
      }),
    },
    {
      title: 'Write Off Queue • One-Time',
      description:
        'Antrean invoice one-time yang sedang diajukan atau diproses write-off agar charge khusus tidak bercampur dengan invoice recurring non-collectible.',
      rows: oneTimeWriteOffCollectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)

        return {
          id: `${item.invoiceNo}-WRITE-OFF-ONE-TIME-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: `Invoice one-time berada pada jalur write-off dengan sisa tagihan ${formatCurrency(remainingAmount)} dan perlu keputusan formal sebelum keluar penuh dari lifecycle billing.`,
          meta: [
            `Service: ${item.serviceNo}`,
            `Invoice Type: ${item.invoiceType}`,
            `Invoice Status: ${item.invoiceStatus}`,
            `Total: ${formatCurrency(item.totalAmount)}`,
            `Paid: ${formatCurrency(item.paidAmount)}`,
            `Remaining: ${formatCurrency(remainingAmount)}`,
            `Invoice Due: ${formatDateTime(item.dueDate)}`,
            `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
            `Follow Up State: ${followUpState}`,
            `Action Type: ${item.actionType}`,
            `Collection Status: ${item.collectionStatus || '-'}`,
            `Action At: ${formatDateTime(item.actionAt)}`,
            `Action Notes: ${item.notes?.trim() || '-'}`,
          ],
        }
      }),
    },
    {
      title: 'Collection Action Terbaru • Recurring',
      description:
        'Aktivitas collection recurring terbaru untuk memantau reminder, promise to pay, dan suspend candidate pada tagihan bulanan.',
      rows: recurringActions.map((item, index) => ({
        id: `${item.invoiceNo}-${item.actionType}-${index}`,
        primary: item.actionType,
        secondary: item.invoiceNo,
        status: item.actionStatus,
        detail: item.notes?.trim() || 'Belum ada catatan tambahan pada action collection ini.',
        meta: [
          `Customer: ${item.customerName}`,
          `Service: ${item.serviceNo}`,
          `Invoice Type: ${item.invoiceType}`,
          `At: ${formatDateTime(item.actionAt)}`,
          `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
        ],
      })),
    },
    {
      title: 'Collection Action Terbaru • One-Time',
      description:
        'Aktivitas collection one-time terbaru untuk memantau negosiasi charge instalasi, adjustment, atau terminasi secara terpisah dari recurring billing.',
      rows: oneTimeActions.map((item, index) => ({
        id: `${item.invoiceNo}-${item.actionType}-ONE-TIME-${index}`,
        primary: item.actionType,
        secondary: item.invoiceNo,
        status: item.actionStatus,
        detail: item.notes?.trim() || 'Belum ada catatan tambahan pada action collection ini.',
        meta: [
          `Customer: ${item.customerName}`,
          `Service: ${item.serviceNo}`,
          `Invoice Type: ${item.invoiceType}`,
          `At: ${formatDateTime(item.actionAt)}`,
          `Follow Up: ${formatDateTime(item.dueFollowUpAt)}`,
        ],
      })),
    },
    {
      title: 'Collection Follow Up Queue • Recurring',
      description:
        'Antrean follow-up collection aktif untuk invoice recurring berdasarkan action OPEN terbaru per invoice agar operator billing bisa fokus pada tagihan bulanan yang masih collectible.',
      rows: recurringActiveCollectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)

        return {
          id: `${item.invoiceNo}-FOLLOW-RECURRING-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: `Action ${item.actionType} masih ${item.actionStatus} dengan sisa tagihan ${formatCurrency(remainingAmount)}.`,
          meta: [
            `Service: ${item.serviceNo}`,
            `Invoice Type: ${item.invoiceType}`,
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
      title: 'Collection Follow Up Queue • One-Time',
      description:
        'Antrean follow-up collection aktif untuk invoice one-time agar charge instalasi, adjustment, atau terminasi tidak bercampur dengan ritme recurring billing.',
      rows: oneTimeActiveCollectionFollowUps.map((item, index) => {
        const remainingAmount = Number(item.totalAmount) - Number(item.paidAmount)
        const followUpState = getFollowUpState(item.dueFollowUpAt)

        return {
          id: `${item.invoiceNo}-FOLLOW-ONE-TIME-${index}`,
          primary: item.invoiceNo,
          secondary: item.customerName,
          status: followUpState,
          detail: `Action ${item.actionType} masih ${item.actionStatus} dengan sisa tagihan ${formatCurrency(remainingAmount)}.`,
          meta: [
            `Service: ${item.serviceNo}`,
            `Invoice Type: ${item.invoiceType}`,
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
          `Service: ${item.serviceNo}`,
          `Amount: ${formatCurrency(item.amount)}`,
          `Paid At: ${formatDateTime(item.paymentDate)}`,
          `Reference: ${item.referenceNo || '-'}`,
        ],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbSalesSections(session: AppSession, filters?: DomainReviewDrilldownFilters): Promise<DomainReviewSection[]> {
  const focus = String(filters?.focus ?? '')
    .trim()
    .toUpperCase()
  const branchScope = resolveBranchScope(session)
  const period = resolveSqlPeriodRange(filters)
  const digitalSourcePlaceholders = DIGITAL_SALES_SOURCES.map(() => '?').join(', ')
  const salesSchema = await getSalesReadSchema()

  const canJoinLeadCustomer = salesSchema.orderLeadId && salesSchema.leadId
  const canJoinOrderCustomer = salesSchema.orderCustomerId && salesSchema.customerId
  const canJoinSurveyLead = salesSchema.surveyLeadId && salesSchema.leadId
  const canJoinSurveyCustomer = salesSchema.surveyCustomerId && salesSchema.customerId
  const canJoinActivationCustomer = salesSchema.subscriptionCustomerId && salesSchema.customerId
  const canJoinActivationPackage = salesSchema.subscriptionPackageId && salesSchema.packageId
  const canJoinActivationOrder = salesSchema.subscriptionOrderId && salesSchema.orderId
  const canJoinWorkOrderOrder = salesSchema.workOrderSalesOrderId && salesSchema.orderId

  const leadValues: unknown[] = []
  const leadWhereParts: string[] = []
  const leadBranchWhere = buildBranchWhere(branchScope, 'branch_id')
  if (leadBranchWhere.clause) {
    leadWhereParts.push(leadBranchWhere.clause.replace(/^AND\s+/i, ''))
    leadValues.push(...leadBranchWhere.values)
  }
  if (focus === 'ACTIVE_LEADS') {
    leadWhereParts.push(`COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CANCELLED', 'DONE')`)
  }
  if (focus === 'DIGITAL_LEADS') {
    leadWhereParts.push(
      salesSchema.leadSource ? `UPPER(COALESCE(source, '')) IN (${digitalSourcePlaceholders})` : '1 = 0',
    )
    if (salesSchema.leadSource) {
      leadValues.push(...DIGITAL_SALES_SOURCES)
    }
  }
  const leadWhere = leadWhereParts.length ? ` WHERE ${leadWhereParts.join(' AND ')} ` : ''

  const leadsResult = await runSafeDomainSectionQuery<ReviewDbSalesLeadRow>({
    sectionLabel: 'sales-leads',
    enabled: salesSchema.leadId && salesSchema.leadCustomerName && salesSchema.leadType && salesSchema.leadStatus,
    query: () =>
      runReviewDbQuery<ReviewDbSalesLeadRow>(
        `
        SELECT
          id AS leadId,
          customer_name AS customerName,
          lead_type AS leadType,
          status,
          ${salesSchema.leadSource ? 'source' : 'NULL'} AS source,
          ${salesSchema.leadMarketingName ? 'marketing_name' : 'NULL'} AS marketingName,
          ${salesSchema.leadPhone ? 'phone' : 'NULL'} AS phone,
          ${salesSchema.leadNotes ? 'notes' : 'NULL'} AS notes
        FROM sales_leads
        ${leadWhere}
        ORDER BY ${salesSchema.leadCreatedAt ? 'created_at DESC,' : ''} id DESC
        LIMIT 5
      `,
        leadValues,
      ),
  })
  const leads = leadsResult.rows

  const coverageBranchWhere = buildBranchWhere(branchScope, 'branch_id')

  const coveragesResult = await runSafeDomainSectionQuery<ReviewDbSalesCoverageRow>({
    sectionLabel: 'sales-coverages',
    enabled: salesSchema.coverageId && salesSchema.coverageAreaCode && salesSchema.coverageAreaName && salesSchema.coverageStatus,
    query: () =>
      runReviewDbQuery<ReviewDbSalesCoverageRow>(`
        SELECT
          id AS coverageId,
          area_code AS areaCode,
          area_name AS areaName,
          ${salesSchema.coverageVillage ? 'village' : 'NULL'} AS village,
          ${salesSchema.coverageDistrict ? 'district' : 'NULL'} AS district,
          ${salesSchema.coverageCity ? 'city' : 'NULL'} AS city,
          ${salesSchema.coverageProvince ? 'province' : 'NULL'} AS province,
          coverage_status AS coverageStatus,
          ${salesSchema.coverageNotes ? 'notes' : 'NULL'} AS notes
        FROM sales_covered_areas
        WHERE 1 = 1
          ${coverageBranchWhere.clause}
        ORDER BY ${salesSchema.coverageUpdatedAt ? 'updated_at DESC,' : ''} id DESC
        LIMIT 5
      `, coverageBranchWhere.values),
  })
  const coverages = coveragesResult.rows

  const flowValues: unknown[] = []
  const surveyLeadJoin =
    canJoinSurveyLead
      ? `
      LEFT JOIN sales_leads sl
        ON sl.id = ss.lead_id`
      : ''
  const surveyCustomerJoin =
    canJoinSurveyCustomer
      ? `
      LEFT JOIN crm_customers c
        ON c.id = ss.customer_id`
      : ''
  const surveyCustomerNameExpression =
    canJoinSurveyLead && salesSchema.leadCustomerName
      ? `COALESCE(sl.customer_name, ${canJoinSurveyCustomer && salesSchema.customerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
      : canJoinSurveyCustomer && salesSchema.customerFullName
        ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
        : `'Customer belum terpetakan'`
  const surveyMarketingExpression = canJoinSurveyLead && salesSchema.leadMarketingName ? 'sl.marketing_name' : 'NULL'
  const surveyDateExpression = salesSchema.surveyScheduledAt
    ? 'ss.scheduled_at'
    : salesSchema.surveyCreatedAt
      ? 'ss.created_at'
      : 'NULL'

  const orderLeadJoin =
    canJoinLeadCustomer
      ? `
      LEFT JOIN sales_leads sl
        ON sl.id = so.lead_id`
      : ''
  const orderCustomerJoin =
    canJoinOrderCustomer
      ? `
      LEFT JOIN crm_customers c
        ON c.id = so.customer_id`
      : ''
  const orderCustomerNameExpression =
    canJoinLeadCustomer && salesSchema.leadCustomerName
      ? `COALESCE(sl.customer_name, ${canJoinOrderCustomer && salesSchema.customerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
      : canJoinOrderCustomer && salesSchema.customerFullName
        ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
        : `'Customer belum terpetakan'`
  const orderMarketingExpression = salesSchema.orderMarketingName ? 'so.marketing_name' : 'NULL'
  const orderDateExpression = salesSchema.orderScheduledInstallationAt
    ? 'so.scheduled_installation_at'
    : salesSchema.orderRequestDate
      ? 'so.request_date'
      : 'NULL'

  const canApplyFlowBranchFilter = canJoinSurveyLead || canJoinSurveyCustomer || canJoinLeadCustomer || canJoinOrderCustomer
  const surveyBranchIdExpression = canJoinSurveyLead ? 'sl.branch_id' : canJoinSurveyCustomer ? 'c.branch_id' : 'NULL'
  const orderBranchIdExpression = canJoinLeadCustomer ? 'sl.branch_id' : canJoinOrderCustomer ? 'c.branch_id' : 'NULL'
  const flowBranchWhere = canApplyFlowBranchFilter ? buildBranchWhere(branchScope, 'branchId') : { clause: '', values: [] as unknown[] }

  let flowsQuery = `
    SELECT *
    FROM (
      SELECT
        ss.id AS sourceId,
        ss.survey_no AS flowCode,
        ${surveyCustomerNameExpression} AS customerName,
        'SURVEY' AS flowKind,
        ss.survey_status AS status,
        ${salesSchema.surveyFeasibilityStatus ? 'ss.feasibility_status' : 'NULL'} AS detailLine,
        ${surveyDateExpression} AS detailDate,
        ${surveyMarketingExpression} AS marketingName,
        ${surveyBranchIdExpression} AS branchId
      FROM sales_surveys ss
      ${surveyLeadJoin}
      ${surveyCustomerJoin}
      WHERE ss.survey_status IN ('REQUESTED', 'SCHEDULED', 'ON_PROGRESS')
      UNION ALL
      SELECT
        so.id AS sourceId,
        so.order_no AS flowCode,
        ${orderCustomerNameExpression} AS customerName,
        'ORDER' AS flowKind,
        so.status AS status,
        ${salesSchema.orderType ? 'so.order_type' : 'NULL'} AS detailLine,
        ${orderDateExpression} AS detailDate,
        ${orderMarketingExpression} AS marketingName,
        ${orderBranchIdExpression} AS branchId
      FROM sales_orders so
      ${orderLeadJoin}
      ${orderCustomerJoin}
      WHERE COALESCE(UPPER(TRIM(so.status)), 'REGISTERED') NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
    ) sales_flow
    WHERE detailDate IS NOT NULL
      ${flowBranchWhere.clause}
    ORDER BY detailDate DESC, flowCode DESC
    LIMIT 5
  `

  if (focus === 'MONTHLY_ORDERS' || focus === 'DIGITAL_ORDERS' || focus === 'ACTIVATION_RATE') {
    const digitalOrderWhere =
      focus === 'DIGITAL_ORDERS'
        ? canJoinLeadCustomer && salesSchema.leadSource
          ? ` AND UPPER(COALESCE(sl.source, '')) IN (${digitalSourcePlaceholders}) `
          : ' AND 1 = 0 '
        : ''

    if (focus === 'DIGITAL_ORDERS' && canJoinLeadCustomer && salesSchema.leadSource) {
      flowValues.push(...DIGITAL_SALES_SOURCES)
    }
    if (period && salesSchema.orderRequestDate) {
      flowValues.push(period.startDate, period.endDate)
    }

    flowsQuery = `
      SELECT
        so.id AS sourceId,
        so.order_no AS flowCode,
        ${orderCustomerNameExpression} AS customerName,
        'ORDER' AS flowKind,
        so.status AS status,
        ${salesSchema.orderType ? 'so.order_type' : 'NULL'} AS detailLine,
        ${salesSchema.orderRequestDate ? 'so.request_date' : 'NULL'} AS detailDate,
        ${orderMarketingExpression} AS marketingName
      FROM sales_orders so
      ${orderLeadJoin}
      ${orderCustomerJoin}
      WHERE 1 = 1
        ${digitalOrderWhere}
        ${period && salesSchema.orderRequestDate ? 'AND so.request_date >= ? AND so.request_date < ?' : ''}
      ORDER BY ${salesSchema.orderRequestDate ? 'so.request_date DESC,' : ''} so.id DESC
      LIMIT 5
    `
  } else if (focus === 'DIGITAL_SURVEYS') {
    if (canJoinSurveyLead && salesSchema.leadSource) {
      flowValues.push(...DIGITAL_SALES_SOURCES)
    }
    if (period && (salesSchema.surveyScheduledAt || salesSchema.surveyCreatedAt)) {
      flowValues.push(period.startDate, period.endDate)
    }

    flowsQuery = `
      SELECT
        ss.id AS sourceId,
        ss.survey_no AS flowCode,
        ${surveyCustomerNameExpression} AS customerName,
        'SURVEY' AS flowKind,
        ss.survey_status AS status,
        ${salesSchema.surveyFeasibilityStatus ? 'ss.feasibility_status' : 'NULL'} AS detailLine,
        ${
          salesSchema.surveyScheduledAt && salesSchema.surveyCreatedAt
            ? 'COALESCE(ss.scheduled_at, ss.created_at)'
            : surveyDateExpression
        } AS detailDate,
        ${surveyMarketingExpression} AS marketingName
      FROM sales_surveys ss
      ${surveyLeadJoin}
      ${surveyCustomerJoin}
      WHERE ${
        canJoinSurveyLead && salesSchema.leadSource
          ? `UPPER(COALESCE(sl.source, '')) IN (${digitalSourcePlaceholders})`
          : '1 = 0'
      }
        ${
          period && (salesSchema.surveyScheduledAt || salesSchema.surveyCreatedAt)
            ? `AND ${
                salesSchema.surveyScheduledAt && salesSchema.surveyCreatedAt
                  ? 'COALESCE(ss.scheduled_at, ss.created_at)'
                  : surveyDateExpression
              } >= ? AND ${
                salesSchema.surveyScheduledAt && salesSchema.surveyCreatedAt
                  ? 'COALESCE(ss.scheduled_at, ss.created_at)'
                  : surveyDateExpression
              } < ?`
            : ''
        }
      ORDER BY ${
        salesSchema.surveyScheduledAt && salesSchema.surveyCreatedAt
          ? 'COALESCE(ss.scheduled_at, ss.created_at) DESC,'
          : surveyDateExpression !== 'NULL'
            ? `${surveyDateExpression} DESC,`
            : ''
      } ss.id DESC
      LIMIT 5
    `
  }

  const flowsResult = await runSafeDomainSectionQuery<ReviewDbSalesFlowRow>({
    sectionLabel: 'sales-flows',
    enabled:
      (salesSchema.surveyId && salesSchema.surveyNo && salesSchema.surveyStatus) ||
      (salesSchema.orderId && salesSchema.orderNo && salesSchema.orderStatus),
    query: () => runReviewDbQuery<ReviewDbSalesFlowRow>(flowsQuery, [...flowValues, ...flowBranchWhere.values]),
  })
  const flows = flowsResult.rows

  const activationRateSummary =
    focus === 'ACTIVATION_RATE'
      ? await (async () => {
          const orderAggregateResult = await runSafeDomainSectionQuery<{ total: number }>({
            sectionLabel: 'sales-order-aggregate',
            enabled: salesSchema.orderId,
            query: () =>
              runReviewDbQuery<{ total: number }>(
                `
                  SELECT COUNT(*) AS total
                  FROM sales_orders so
                  WHERE 1 = 1
                    ${period && salesSchema.orderRequestDate ? 'AND so.request_date >= ? AND so.request_date < ?' : ''}
                `,
                period && salesSchema.orderRequestDate ? [period.startDate, period.endDate] : [],
              ),
          })
          const activationAggregateResult = await runSafeDomainSectionQuery<{ total: number }>({
            sectionLabel: 'sales-activation-aggregate',
            enabled: salesSchema.subscriptionId && salesSchema.subscriptionActivatedAt,
            query: () =>
              runReviewDbQuery<{ total: number }>(
                `
                  SELECT COUNT(*) AS total
                  FROM service_subscriptions ss
                  WHERE ss.activated_at IS NOT NULL
                    ${
                      period && salesSchema.subscriptionActivatedAt ? 'AND ss.activated_at >= ? AND ss.activated_at < ?' : ''
                    }
                `,
                period && salesSchema.subscriptionActivatedAt ? [period.startDate, period.endDate] : [],
              ),
          })

          const orderTotal = Number(orderAggregateResult.rows[0]?.total ?? 0)
          const activationTotal = Number(activationAggregateResult.rows[0]?.total ?? 0)

          return [
            { label: 'Order Periode', value: formatNumber(orderTotal) },
            { label: 'Aktivasi', value: formatNumber(activationTotal) },
            { label: 'Rasio Aktivasi', value: formatPercentage(activationTotal, orderTotal) },
          ]
        })()
      : undefined

  const workOrderCustomerNameExpression =
    canJoinWorkOrderOrder && canJoinLeadCustomer && salesSchema.leadCustomerName
      ? `COALESCE(sl.customer_name, ${canJoinOrderCustomer && salesSchema.customerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
      : canJoinWorkOrderOrder && canJoinOrderCustomer && salesSchema.customerFullName
        ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
        : `'Customer belum terpetakan'`
  const workOrdersResult = await runSafeDomainSectionQuery<ReviewDbSalesWorkOrderRow>({
    sectionLabel: 'sales-work-orders',
    enabled: salesSchema.workOrderId && salesSchema.workOrderNo && salesSchema.workOrderStatus,
    query: () =>
      runReviewDbQuery<ReviewDbSalesWorkOrderRow>(`
        SELECT
          swo.id AS workOrderId,
          swo.work_order_no AS workOrderNo,
          ${workOrderCustomerNameExpression} AS customerName,
          swo.status,
          ${salesSchema.workOrderType ? 'swo.work_type' : "'UNKNOWN'"} AS workType,
          ${salesSchema.workOrderScheduledAt ? 'swo.scheduled_at' : 'NULL'} AS scheduledAt,
          ${salesSchema.workOrderTechnicianName ? 'swo.technician_name' : 'NULL'} AS technicianName,
          ${canJoinWorkOrderOrder && salesSchema.orderNo ? 'so.order_no' : 'NULL'} AS orderNo
        FROM service_work_orders swo
        ${
          canJoinWorkOrderOrder
            ? `
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id`
            : ''
        }
        ${
          canJoinWorkOrderOrder && canJoinLeadCustomer
            ? `
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
            : ''
        }
        ${
          canJoinWorkOrderOrder && canJoinOrderCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id`
            : ''
        }
        WHERE COALESCE(UPPER(TRIM(swo.status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
        ORDER BY ${
          salesSchema.workOrderScheduledAt && salesSchema.workOrderCreatedAt
            ? 'COALESCE(swo.scheduled_at, swo.created_at) DESC,'
            : salesSchema.workOrderScheduledAt
              ? 'swo.scheduled_at DESC,'
              : salesSchema.workOrderCreatedAt
                ? 'swo.created_at DESC,'
                : ''
        } swo.id DESC
        LIMIT 5
      `),
  })
  const workOrders = workOrdersResult.rows

  const activationValues: unknown[] = []
  const activationWhereParts = ["ss.status IN ('PENDING', 'ACTIVE')"]
  if (focus === 'MONTHLY_ACTIVATIONS' || focus === 'ACTIVATION_RATE') {
    activationWhereParts.splice(0, activationWhereParts.length, salesSchema.subscriptionActivatedAt ? 'ss.activated_at IS NOT NULL' : '1 = 0')
    if (period && salesSchema.subscriptionActivatedAt) {
      activationWhereParts.push('ss.activated_at >= ? AND ss.activated_at < ?')
      activationValues.push(period.startDate, period.endDate)
    }
  }
  const activationWhere = activationWhereParts.length ? `WHERE ${activationWhereParts.join(' AND ')}` : ''

  const activationsResult = await runSafeDomainSectionQuery<ReviewDbSalesActivationRow>({
    sectionLabel: 'sales-activations',
    enabled: salesSchema.subscriptionId && salesSchema.subscriptionServiceNo && salesSchema.subscriptionStatus,
    query: () =>
      runReviewDbQuery<ReviewDbSalesActivationRow>(
        `
        SELECT
          ss.id AS subscriptionId,
          ss.service_no AS serviceNo,
          ${
            canJoinActivationCustomer && salesSchema.customerFullName
              ? 'c.full_name'
              : "'Customer belum terpetakan'"
          } AS customerName,
          ss.status,
          ${canJoinActivationPackage && salesSchema.packageName ? 'sp.name' : 'NULL'} AS packageName,
          ${canJoinActivationPackage && salesSchema.packageSpeedLabel ? 'sp.speed_label' : 'NULL'} AS speedLabel,
          ${salesSchema.subscriptionMonthlyPrice ? 'ss.monthly_price' : '0'} AS monthlyPrice,
          ${salesSchema.subscriptionActivatedAt ? 'ss.activated_at' : 'NULL'} AS activatedAt,
          ${canJoinActivationOrder && salesSchema.orderNo ? 'so.order_no' : 'NULL'} AS orderNo
        FROM service_subscriptions ss
        ${
          canJoinActivationCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = ss.customer_id`
            : ''
        }
        ${
          canJoinActivationOrder
            ? `
        LEFT JOIN sales_orders so
          ON so.id = ss.order_id`
            : ''
        }
        ${
          canJoinActivationPackage
            ? `
        LEFT JOIN sales_packages sp
          ON sp.id = ss.package_id`
            : ''
        }
        ${activationWhere}
        ORDER BY ${
          salesSchema.subscriptionActivatedAt && salesSchema.subscriptionCreatedAt
            ? 'COALESCE(ss.activated_at, ss.created_at) DESC,'
            : salesSchema.subscriptionActivatedAt
              ? 'ss.activated_at DESC,'
              : salesSchema.subscriptionCreatedAt
                ? 'ss.created_at DESC,'
                : ''
        } ss.id DESC
        LIMIT 5
      `,
        activationValues,
      ),
  })
  const activations = activationsResult.rows

  type ReviewDbSalesQuotationRow = {
    quotationId: number
    quotationNo: string
    status: string
    monthlyPrice: number
    installationFee: number
    contractMonths: number
    customerName: string
    leadId: number
    createdAt: string | null
  }

  const quotationsResult = await runSafeDomainSectionQuery<ReviewDbSalesQuotationRow>({
    sectionLabel: 'sales-quotations',
    enabled: salesSchema.quotationId && salesSchema.quotationNo && salesSchema.quotationStatus && salesSchema.quotationLeadId,
    query: () =>
      runReviewDbQuery<ReviewDbSalesQuotationRow>(`
        SELECT
          q.id AS quotationId,
          q.quotation_no AS quotationNo,
          q.status,
          COALESCE(q.monthly_price, 0) AS monthlyPrice,
          COALESCE(q.installation_fee, 0) AS installationFee,
          COALESCE(q.contract_months, 12) AS contractMonths,
          ${salesSchema.leadCustomerName ? 'sl.customer_name' : "'Customer belum terpetakan'"} AS customerName,
          q.lead_id AS leadId,
          ${salesSchema.quotationCreatedAt ? 'q.created_at' : 'NULL'} AS createdAt
        FROM sales_quotations q
        LEFT JOIN sales_leads sl
          ON sl.id = q.lead_id
        ORDER BY ${salesSchema.quotationCreatedAt ? 'q.created_at DESC,' : ''} q.id DESC
        LIMIT 5
      `),
  })
  const quotations = quotationsResult.rows

  type ReviewDbSalesContractRow = {
    contractId: number
    contractNo: string
    status: string
    signedAt: string | null
    quotationNo: string | null
    customerName: string
    leadId: number
  }

  const contractsResult = await runSafeDomainSectionQuery<ReviewDbSalesContractRow>({
    sectionLabel: 'sales-contracts',
    enabled: salesSchema.contractId && salesSchema.contractNo && salesSchema.contractStatus && salesSchema.contractLeadId,
    query: () =>
      runReviewDbQuery<ReviewDbSalesContractRow>(`
        SELECT
          c.id AS contractId,
          c.contract_no AS contractNo,
          c.status,
          ${salesSchema.contractSignedAt ? 'c.signed_at' : 'NULL'} AS signedAt,
          ${salesSchema.quotationNo ? 'q.quotation_no' : 'NULL'} AS quotationNo,
          ${salesSchema.leadCustomerName ? 'sl.customer_name' : "'Customer belum terpetakan'"} AS customerName,
          c.lead_id AS leadId
        FROM sales_contracts c
        LEFT JOIN sales_quotations q
          ON q.id = c.quotation_id
        LEFT JOIN sales_leads sl
          ON sl.id = c.lead_id
        ORDER BY ${salesSchema.contractSignedAt ? 'c.signed_at DESC,' : ''} c.id DESC
        LIMIT 5
      `),
  })
  const contracts = contractsResult.rows

  type ReviewDbSalesCorporateDeliveryRow = {
    deliveryId: number
    contractId: number
    milestoneCode: string
    milestoneName: string
    status: string
    ownerName: string | null
    plannedAt: string | null
    completedAt: string | null
    contractNo: string | null
    customerName: string
  }

  const corporateDeliveriesResult = await runSafeDomainSectionQuery<ReviewDbSalesCorporateDeliveryRow>({
    sectionLabel: 'sales-corporate-deliveries',
    enabled:
      salesSchema.corporateDeliveryId &&
      salesSchema.corporateDeliveryContractId &&
      salesSchema.corporateDeliveryMilestoneCode &&
      salesSchema.corporateDeliveryMilestoneName &&
      salesSchema.corporateDeliveryStatus,
    query: () =>
      runReviewDbQuery<ReviewDbSalesCorporateDeliveryRow>(`
        SELECT
          d.id AS deliveryId,
          d.contract_id AS contractId,
          d.milestone_code AS milestoneCode,
          d.milestone_name AS milestoneName,
          d.status,
          ${salesSchema.corporateDeliveryOwnerName ? 'd.owner_name' : 'NULL'} AS ownerName,
          ${salesSchema.corporateDeliveryPlannedAt ? 'd.planned_at' : 'NULL'} AS plannedAt,
          ${salesSchema.corporateDeliveryCompletedAt ? 'd.completed_at' : 'NULL'} AS completedAt,
          ${salesSchema.contractNo ? 'c.contract_no' : 'NULL'} AS contractNo,
          ${salesSchema.leadCustomerName ? 'sl.customer_name' : "'Customer belum terpetakan'"} AS customerName
        FROM sales_corporate_deliveries d
        LEFT JOIN sales_contracts c
          ON c.id = d.contract_id
        LEFT JOIN sales_leads sl
          ON sl.id = c.lead_id
        ORDER BY ${
          salesSchema.corporateDeliveryCompletedAt && salesSchema.corporateDeliveryPlannedAt
            ? 'COALESCE(d.completed_at, d.planned_at) DESC,'
            : salesSchema.corporateDeliveryCompletedAt
              ? 'd.completed_at DESC,'
              : salesSchema.corporateDeliveryPlannedAt
                ? 'd.planned_at DESC,'
                : ''
        } d.id DESC
        LIMIT 5
      `),
  })
  const corporateDeliveries = corporateDeliveriesResult.rows

  type ReviewDbSalesCorporateAcceptanceRow = {
    acceptanceId: number
    contractId: number
    acceptanceNo: string
    status: string
    testedAt: string | null
    acceptedAt: string | null
    contractNo: string | null
    customerName: string
  }

  const corporateAcceptancesResult = await runSafeDomainSectionQuery<ReviewDbSalesCorporateAcceptanceRow>({
    sectionLabel: 'sales-corporate-acceptances',
    enabled:
      salesSchema.corporateAcceptanceId &&
      salesSchema.corporateAcceptanceContractId &&
      salesSchema.corporateAcceptanceNo &&
      salesSchema.corporateAcceptanceStatus,
    query: () =>
      runReviewDbQuery<ReviewDbSalesCorporateAcceptanceRow>(`
        SELECT
          a.id AS acceptanceId,
          a.contract_id AS contractId,
          a.acceptance_no AS acceptanceNo,
          a.status,
          ${salesSchema.corporateAcceptanceTestedAt ? 'a.tested_at' : 'NULL'} AS testedAt,
          ${salesSchema.corporateAcceptanceAcceptedAt ? 'a.accepted_at' : 'NULL'} AS acceptedAt,
          ${salesSchema.contractNo ? 'c.contract_no' : 'NULL'} AS contractNo,
          ${salesSchema.leadCustomerName ? 'sl.customer_name' : "'Customer belum terpetakan'"} AS customerName
        FROM sales_corporate_acceptances a
        LEFT JOIN sales_contracts c
          ON c.id = a.contract_id
        LEFT JOIN sales_leads sl
          ON sl.id = c.lead_id
        ORDER BY ${
          salesSchema.corporateAcceptanceAcceptedAt && salesSchema.corporateAcceptanceTestedAt
            ? 'COALESCE(a.accepted_at, a.tested_at) DESC,'
            : salesSchema.corporateAcceptanceAcceptedAt
              ? 'a.accepted_at DESC,'
              : salesSchema.corporateAcceptanceTestedAt
                ? 'a.tested_at DESC,'
                : ''
        } a.id DESC
        LIMIT 5
      `),
  })
  const corporateAcceptances = corporateAcceptancesResult.rows

  const leadTypeSections = [
    { key: 'HOME', title: 'Lead Home Terbaru' },
    { key: 'CORPORATE', title: 'Lead Corporate Terbaru' },
    { key: 'RESELLER', title: 'Lead Reseller Terbaru' },
  ] as const
  const leadSections: DomainReviewSection[] = []
  leadTypeSections.forEach((leadType) => {
    const rows = leads.filter((item) => String(item.leadType ?? '').trim().toUpperCase() === leadType.key)
    if (!rows.length) return

    leadSections.push({
      title: leadType.title,
      description: `Lead terbaru untuk flow ${leadType.key} dari tabel sales_leads agar funnel akuisisi tiap segmen tidak tercampur.`,
      rows: rows.map((item) => ({
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
    })
  })

  return [
    ...leadSections,
    ...(quotations.length
      ? [
          {
            title: 'Quotation Corporate Terbaru',
            description: 'Quotation corporate terbaru untuk memproses approval internal sebelum kontrak disahkan.',
            rows: quotations.map((item) => ({
              id: `QTN-${item.quotationId}`,
              primary: item.quotationNo,
              secondary: item.customerName,
              status: item.status,
              detail: `Harga bulanan ${formatCurrency(item.monthlyPrice)} dengan biaya instalasi ${formatCurrency(item.installationFee)} dan durasi ${item.contractMonths} bulan.`,
              meta: [
                `Lead ID: ${item.leadId}`,
                `Created: ${formatDateTime(item.createdAt)}`,
              ],
            })),
          },
        ]
      : []),
    ...(contracts.length
      ? [
          {
            title: 'Kontrak Corporate Terbaru',
            description: 'Kontrak corporate terbaru yang sudah ditandatangani sebagai guardrail sebelum delivery dimulai.',
            rows: contracts.map((item) => ({
              id: `CTR-${item.contractId}`,
              primary: item.contractNo,
              secondary: item.customerName,
              status: item.status,
              detail: `Kontrak dibuat dari quotation ${item.quotationNo || '-'} dan siap masuk ke delivery corporate.`,
              meta: [
                `Lead ID: ${item.leadId}`,
                `Signed: ${formatDateTime(item.signedAt)}`,
              ],
            })),
          },
        ]
      : []),
    ...(corporateDeliveries.length
      ? [
          {
            title: 'Delivery Corporate Terbaru',
            description: 'Milestone delivery corporate terbaru agar jalur implementasi dedicated tidak bercampur dengan instalasi home.',
            rows: corporateDeliveries.map((item) => ({
              id: `CDL-${item.deliveryId}`,
              primary: item.milestoneCode,
              secondary: item.customerName,
              status: item.status,
              detail: `Milestone ${item.milestoneName} untuk kontrak ${item.contractNo || '-'} dijadwalkan ${formatDateTime(item.plannedAt)}.`,
              meta: [
                `Contract: ${item.contractNo || '-'}`,
                `Owner: ${item.ownerName || '-'}`,
                `Planned: ${formatDateTime(item.plannedAt)}`,
                `Completed: ${formatDateTime(item.completedAt)}`,
              ],
            })),
          },
        ]
      : []),
    ...(corporateAcceptances.length
      ? [
          {
            title: 'Acceptance Corporate Terbaru',
            description: 'Acceptance testing dan UAT corporate terbaru untuk memastikan aktivasi hanya terjadi setelah hasilnya jelas.',
            rows: corporateAcceptances.map((item) => ({
              id: `UAT-${item.acceptanceId}`,
              primary: item.acceptanceNo,
              secondary: item.customerName,
              status: item.status,
              detail: `Acceptance untuk kontrak ${item.contractNo || '-'} memiliki checkpoint testing ${formatDateTime(item.testedAt)}.`,
              meta: [
                `Contract: ${item.contractNo || '-'}`,
                `Tested: ${formatDateTime(item.testedAt)}`,
                `Accepted: ${formatDateTime(item.acceptedAt)}`,
              ],
            })),
          },
        ]
      : []),
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
      title:
        focus === 'MONTHLY_ORDERS'
          ? 'Order Periode Ini'
          : focus === 'DIGITAL_ORDERS'
            ? 'Order Digital Periode Ini'
            : focus === 'DIGITAL_SURVEYS'
              ? 'Survey Digital Periode Ini'
              : focus === 'ACTIVATION_RATE'
                ? 'Order Pembanding Aktivasi'
              : 'Survey Dan Order Berjalan',
      description:
        focus === 'MONTHLY_ORDERS'
          ? 'Daftar order yang benar-benar tercatat pada periode dashboard agar angka PSB selaras dengan KPI kartu.'
          : focus === 'DIGITAL_ORDERS'
            ? 'Daftar order dari source digital pada periode dashboard agar KPI order digital tidak bercampur dengan source lain.'
            : focus === 'DIGITAL_SURVEYS'
              ? 'Daftar survey dari source digital pada periode dashboard agar KPI survey digital mengikuti rule yang sama dengan kartu.'
              : focus === 'ACTIVATION_RATE'
                ? 'Daftar order pada periode dashboard yang menjadi penyebut rasio aktivasi, agar pembanding terhadap subscription aktif terlihat jelas.'
              : 'Daftar survey pending dan order aktif terbaru dari review DB untuk memantau delivery awal.',
      summary: focus === 'ACTIVATION_RATE' ? activationRateSummary : undefined,
      rows: flows.map((item) => ({
        id: item.flowKind === 'ORDER' ? `ORDER-${item.sourceId ?? item.flowCode}` : `${item.flowKind}-${item.flowCode}`,
        primary: item.flowCode,
        secondary: item.customerName,
        status: item.status,
        detail:
          item.flowKind === 'SURVEY'
            ? `Status feasibility ${item.detailLine || 'PENDING'} dengan jadwal survey ${formatDateTime(item.detailDate)}.`
            : focus === 'MONTHLY_ORDERS' || focus === 'DIGITAL_ORDERS'
              ? `Order ${item.detailLine || '-'} direquest pada ${formatDateTime(item.detailDate)}.`
              : `Order ${item.detailLine || '-'} dengan jadwal instalasi ${formatDateTime(item.detailDate)}.`,
        meta: [
          `Flow: ${item.flowKind}`,
          ...(item.flowKind === 'ORDER' ? [`Order ID: ${item.sourceId ?? '-'}`] : []),
          `Marketing: ${item.marketingName || '-'}`,
          `At: ${formatDateTime(item.detailDate)}`,
        ],
        filterTags: [`PERIOD:${toPeriodKey(item.detailDate)}`, `FLOW:${item.flowKind}`],
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
      title:
        focus === 'MONTHLY_ACTIVATIONS' || focus === 'ACTIVATION_RATE'
          ? 'Subscription Aktivasi Periode Ini'
          : 'Subscription Aktivasi Terbaru',
      description:
        focus === 'MONTHLY_ACTIVATIONS' || focus === 'ACTIVATION_RATE'
          ? 'Subscription yang benar-benar aktif pada periode dashboard agar drilldown aktivasi 1:1 dengan KPI kartu.'
          : 'Subscription terbaru dari aktivasi order untuk memastikan alur delivery sudah benar-benar masuk ke layanan aktif.',
      summary: focus === 'ACTIVATION_RATE' ? activationRateSummary : undefined,
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
        filterTags: [`PERIOD:${toPeriodKey(item.activatedAt)}`, 'FLOW:ACTIVATION'],
      })),
    },
  ].filter((section) => section.rows.length > 0)
}

async function getReviewDbInventorySections(filters?: DomainReviewDrilldownFilters): Promise<DomainReviewSection[]> {
  const focus = String(filters?.focus ?? '')
    .trim()
    .toUpperCase()
  const period = resolveSqlPeriodRange(filters)

  await ensureDomainInventoryReadTables()
  const inventorySchema = await getInventoryReadSchema()
  const canJoinItemCategory = inventorySchema.itemCategoryId && inventorySchema.categoryId
  const canJoinItemUnit = inventorySchema.itemUnitId && inventorySchema.unitId
  const canJoinMovementItem = inventorySchema.movementItemId && inventorySchema.itemId
  const canJoinPortOdp = inventorySchema.odpPortOdpId && inventorySchema.odpId
  const canJoinPortSubscription = inventorySchema.odpPortSubscriptionId && inventorySchema.subscriptionId
  const canJoinPortCustomer = inventorySchema.odpPortCustomerId && inventorySchema.customerId
  const canJoinAssignmentItem = inventorySchema.deviceAssignmentInventoryItemId && inventorySchema.itemId
  const canJoinAssignmentSubscription = inventorySchema.deviceAssignmentSubscriptionId && inventorySchema.subscriptionId
  const canJoinAssignmentWorkOrder = inventorySchema.deviceAssignmentWorkOrderId && inventorySchema.workOrderId
  const canJoinAssignmentCustomer = inventorySchema.deviceAssignmentCustomerId && inventorySchema.customerId
  const canJoinRequestItem = inventorySchema.requestInventoryItemId && inventorySchema.itemId
  const canJoinLoanItem = inventorySchema.loanInventoryItemId && inventorySchema.itemId

  const itemsResult = await runSafeDomainSectionQuery<ReviewDbInventoryItemRow>({
    sectionLabel: 'inventory-items',
    enabled:
      inventorySchema.itemId &&
      inventorySchema.itemCode &&
      inventorySchema.itemName &&
      inventorySchema.itemCurrentStock &&
      inventorySchema.itemMinimumStock &&
      inventorySchema.itemStatus,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryItemRow>(`
        SELECT
          ii.id AS itemId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ${canJoinItemCategory && inventorySchema.categoryCode ? 'ic.code' : 'NULL'} AS categoryCode,
          ${canJoinItemUnit && inventorySchema.unitCode ? 'iu.code' : 'NULL'} AS unitCode,
          ${inventorySchema.itemRackCode ? 'ii.rack_code' : 'NULL'} AS rackCode,
          ${inventorySchema.itemRackBarcode ? 'ii.rack_barcode' : 'NULL'} AS rackBarcode,
          ii.current_stock AS currentStock,
          ii.minimum_stock AS minimumStock,
          ii.status
        FROM inventory_items ii
        ${
          canJoinItemCategory
            ? `
        LEFT JOIN inventory_categories ic
          ON ic.id = ii.category_id`
            : ''
        }
        ${
          canJoinItemUnit
            ? `
        LEFT JOIN inventory_units iu
          ON iu.id = ii.unit_id`
            : ''
        }
        ORDER BY ${inventorySchema.itemUpdatedAt ? 'ii.updated_at DESC,' : ''} ii.id DESC
        LIMIT 5
      `),
  })
  const items = itemsResult.rows

  const movementValues: unknown[] = []
  const movementPeriodWhere =
    focus === 'MONTHLY_MOVEMENTS' && period && inventorySchema.movementAt
      ? ` WHERE ism.movement_at >= ? AND ism.movement_at < ? `
      : ''
  if (movementPeriodWhere && period) {
    movementValues.push(period.startDate, period.endDate)
  }

  const movementsResult = await runSafeDomainSectionQuery<ReviewDbInventoryMovementRow>({
    sectionLabel: 'inventory-movements',
    enabled:
      inventorySchema.movementId &&
      inventorySchema.movementType &&
      inventorySchema.movementQty &&
      canJoinMovementItem &&
      inventorySchema.itemCode &&
      inventorySchema.itemName,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryMovementRow>(
        `
        SELECT
          ism.id AS movementId,
          ism.movement_type AS movementType,
          ${inventorySchema.movementReferenceNo ? 'ism.reference_no' : 'NULL'} AS referenceNo,
          ism.qty,
          ${inventorySchema.movementUnitPrice ? 'ism.unit_price' : '0'} AS unitPrice,
          ${inventorySchema.movementAt ? 'ism.movement_at' : 'CURRENT_TIMESTAMP'} AS movementAt,
          ii.item_name AS itemName,
          ii.item_code AS itemCode,
          ${inventorySchema.movementNotes ? 'ism.notes' : 'NULL'} AS notes
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        ${movementPeriodWhere}
        ORDER BY ${inventorySchema.movementAt ? 'ism.movement_at DESC,' : ''} ism.id DESC
        LIMIT 5
      `,
        movementValues,
      ),
  })
  const movements = movementsResult.rows

  const odpsResult = await runSafeDomainSectionQuery<ReviewDbInventoryOdpRow>({
    sectionLabel: 'inventory-odps',
    enabled:
      inventorySchema.odpId &&
      inventorySchema.odpCode &&
      inventorySchema.odpName &&
      inventorySchema.odpTotalPorts &&
      inventorySchema.odpActivePorts,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryOdpRow>(`
        SELECT
          id AS odpId,
          code AS odpCode,
          name AS odpName,
          total_ports AS totalPorts,
          active_ports AS activePorts,
          ${inventorySchema.odpLocationText ? 'location_text' : 'NULL'} AS locationText,
          ${inventorySchema.odpLatitude ? 'latitude' : 'NULL'} AS latitude,
          ${inventorySchema.odpLongitude ? 'longitude' : 'NULL'} AS longitude
        FROM network_odp
        ORDER BY ${inventorySchema.odpUpdatedAt ? 'updated_at DESC,' : ''} id DESC
        LIMIT 5
      `),
  })
  const odps = odpsResult.rows

  const portServiceExpression = canJoinPortSubscription && inventorySchema.subscriptionServiceNo ? 'ss.service_no' : 'NULL'
  const portCustomerCodeExpression = canJoinPortCustomer && inventorySchema.customerCode ? 'c.customer_code' : 'NULL'
  const portInstalledExpression = inventorySchema.odpPortInstalledAt
    ? 'nop.installed_at'
    : inventorySchema.odpPortCreatedAt
      ? 'nop.created_at'
      : 'NULL'
  const portOrderByExpression = inventorySchema.odpPortInstalledAt && inventorySchema.odpPortCreatedAt
    ? 'COALESCE(nop.installed_at, nop.created_at) DESC, nop.id DESC'
    : inventorySchema.odpPortInstalledAt
      ? 'nop.installed_at DESC, nop.id DESC'
      : inventorySchema.odpPortCreatedAt
        ? 'nop.created_at DESC, nop.id DESC'
        : inventorySchema.odpPortUpdatedAt
          ? 'nop.updated_at DESC, nop.id DESC'
          : 'nop.id DESC'

  const usedPortsResult = await runSafeDomainSectionQuery<ReviewDbInventoryOdpPortRow>({
    sectionLabel: 'inventory-used-ports',
    enabled:
      inventorySchema.odpPortId &&
      inventorySchema.odpPortNo &&
      inventorySchema.odpPortStatus &&
      canJoinPortOdp &&
      inventorySchema.odpCode,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryOdpPortRow>(`
        SELECT
          nop.id AS portId,
          no.code AS odpCode,
          nop.port_no AS portNo,
          nop.port_status AS portStatus,
          ${portServiceExpression} AS serviceNo,
          ${portCustomerCodeExpression} AS customerCode,
          ${portInstalledExpression} AS installedAt
        FROM network_odp_ports nop
        JOIN network_odp no
          ON no.id = nop.odp_id
        ${
          canJoinPortSubscription
            ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = nop.subscription_id`
            : ''
        }
        ${
          canJoinPortCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = nop.customer_id`
            : ''
        }
        WHERE nop.port_status = 'USED'
        ORDER BY ${portOrderByExpression}
        LIMIT 5
      `),
  })
  const usedPorts = usedPortsResult.rows

  const assignmentServiceExpression =
    canJoinAssignmentSubscription && inventorySchema.subscriptionServiceNo ? 'ss.service_no' : 'NULL'
  const assignmentWorkOrderExpression =
    canJoinAssignmentWorkOrder && inventorySchema.workOrderNo ? 'swo.work_order_no' : 'NULL'
  const assignmentCustomerExpression =
    canJoinAssignmentCustomer && inventorySchema.customerFullName ? 'c.full_name' : 'NULL'

  const assignmentsResult = await runSafeDomainSectionQuery<ReviewDbInventoryDeviceAssignmentRow>({
    sectionLabel: 'inventory-device-assignments',
    enabled:
      inventorySchema.deviceAssignmentId &&
      inventorySchema.deviceAssignmentStatus &&
      canJoinAssignmentItem &&
      inventorySchema.itemCode &&
      inventorySchema.itemName &&
      inventorySchema.deviceAssignmentAssignedAt,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryDeviceAssignmentRow>(`
        SELECT
          sda.id AS assignmentId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ${canJoinItemCategory && inventorySchema.categoryCode ? 'ic.code' : 'NULL'} AS categoryCode,
          sda.assignment_status AS assignmentStatus,
          sda.assigned_at AS assignedAt,
          ${assignmentServiceExpression} AS serviceNo,
          ${assignmentWorkOrderExpression} AS workOrderNo,
          ${assignmentCustomerExpression} AS customerName,
          ${inventorySchema.deviceAssignmentSerialNumber ? 'sda.serial_number' : 'NULL'} AS serialNumber
        FROM service_device_assignments sda
        JOIN inventory_items ii
          ON ii.id = sda.inventory_item_id
        ${
          canJoinItemCategory
            ? `
        LEFT JOIN inventory_categories ic
          ON ic.id = ii.category_id`
            : ''
        }
        ${
          canJoinAssignmentSubscription
            ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = sda.subscription_id`
            : ''
        }
        ${
          canJoinAssignmentWorkOrder
            ? `
        LEFT JOIN service_work_orders swo
          ON swo.id = sda.work_order_id`
            : ''
        }
        ${
          canJoinAssignmentCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = sda.customer_id`
            : ''
        }
        ORDER BY sda.assigned_at DESC, sda.id DESC
        LIMIT 5
      `),
  })
  const assignments = assignmentsResult.rows

  const portIssuesResult = await runSafeDomainSectionQuery<ReviewDbInventoryOdpPortRow>({
    sectionLabel: 'inventory-port-issues',
    enabled:
      inventorySchema.odpPortId &&
      inventorySchema.odpPortNo &&
      inventorySchema.odpPortStatus &&
      canJoinPortOdp &&
      inventorySchema.odpCode,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryOdpPortRow>(`
        SELECT
          nop.id AS portId,
          no.code AS odpCode,
          nop.port_no AS portNo,
          nop.port_status AS portStatus,
          ${portServiceExpression} AS serviceNo,
          ${portCustomerCodeExpression} AS customerCode,
          ${portInstalledExpression} AS installedAt
        FROM network_odp_ports nop
        JOIN network_odp no
          ON no.id = nop.odp_id
        ${
          canJoinPortSubscription
            ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = nop.subscription_id`
            : ''
        }
        ${
          canJoinPortCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = nop.customer_id`
            : ''
        }
        WHERE nop.port_status IN ('RESERVED', 'FAULTY', 'DISABLED')
        ORDER BY ${inventorySchema.odpPortUpdatedAt ? 'nop.updated_at DESC,' : ''} nop.id DESC
        LIMIT 5
      `),
  })
  const portIssues = portIssuesResult.rows

  const returnsResult = await runSafeDomainSectionQuery<ReviewDbInventoryDeviceReturnRow>({
    sectionLabel: 'inventory-device-returns',
    enabled:
      inventorySchema.deviceAssignmentId &&
      inventorySchema.deviceAssignmentStatus &&
      canJoinAssignmentItem &&
      inventorySchema.itemCode &&
      inventorySchema.itemName &&
      inventorySchema.deviceAssignmentReturnedAt,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryDeviceReturnRow>(`
        SELECT
          sda.id AS assignmentId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          sda.assignment_status AS assignmentStatus,
          sda.returned_at AS returnedAt,
          ${assignmentServiceExpression} AS serviceNo,
          ${assignmentWorkOrderExpression} AS workOrderNo,
          ${assignmentCustomerExpression} AS customerName,
          ${inventorySchema.deviceAssignmentSerialNumber ? 'sda.serial_number' : 'NULL'} AS serialNumber
        FROM service_device_assignments sda
        JOIN inventory_items ii
          ON ii.id = sda.inventory_item_id
        ${
          canJoinAssignmentSubscription
            ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = sda.subscription_id`
            : ''
        }
        ${
          canJoinAssignmentWorkOrder
            ? `
        LEFT JOIN service_work_orders swo
          ON swo.id = sda.work_order_id`
            : ''
        }
        ${
          canJoinAssignmentCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = sda.customer_id`
            : ''
        }
        WHERE sda.assignment_status IN ('RETURNED', 'DAMAGED', 'LOST')
          AND sda.returned_at IS NOT NULL
        ORDER BY sda.returned_at DESC, sda.id DESC
        LIMIT 5
      `),
  })
  const returns = returnsResult.rows

  const requestValues: unknown[] = []
  const requestWhereParts: string[] = []
  if (focus === 'PENDING_REQUESTS') {
    requestWhereParts.push(inventorySchema.requestStatus ? `UPPER(TRIM(iir.request_status)) = 'PENDING'` : '1 = 0')
  }
  if (period && inventorySchema.requestRequestedAt) {
    requestWhereParts.push(`iir.requested_at >= ? AND iir.requested_at < ?`)
    requestValues.push(period.startDate, period.endDate)
  }
  const requestWhere = requestWhereParts.length ? ` WHERE ${requestWhereParts.join(' AND ')} ` : ''

  const requestsResult = await runSafeDomainSectionQuery<ReviewDbInventoryRequestRow>({
    sectionLabel: 'inventory-requests',
    enabled:
      inventorySchema.requestId &&
      inventorySchema.requestCode &&
      inventorySchema.requestQty &&
      inventorySchema.requestStatus &&
      inventorySchema.requestRequestedBy &&
      canJoinRequestItem &&
      inventorySchema.itemCode &&
      inventorySchema.itemName,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryRequestRow>(
        `
        SELECT
          iir.id AS requestId,
          iir.request_code AS requestCode,
          iir.request_qty AS requestQty,
          iir.request_status AS requestStatus,
          ${inventorySchema.requestRequestedDivision ? 'iir.requested_division' : 'NULL'} AS requestedDivision,
          ${inventorySchema.requestRequestedSubdivision ? 'iir.requested_subdivision' : 'NULL'} AS requestedSubdivision,
          ${inventorySchema.requestRequestedFor ? 'iir.requested_for' : 'NULL'} AS requestedFor,
          ${inventorySchema.requestNotes ? 'iir.request_notes' : 'NULL'} AS requestNotes,
          ${inventorySchema.requestPendingReason ? 'iir.pending_reason' : 'NULL'} AS pendingReason,
          iir.requested_by AS requestedBy,
          ${inventorySchema.requestProcessedBy ? 'iir.processed_by' : 'NULL'} AS processedBy,
          ${inventorySchema.requestRequestedAt ? 'iir.requested_at' : 'CURRENT_TIMESTAMP'} AS requestedAt,
          ${inventorySchema.requestProcessedAt ? 'iir.processed_at' : 'NULL'} AS processedAt,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ${inventorySchema.itemCurrentStock ? 'ii.current_stock' : '0'} AS currentStock
        FROM inventory_item_requests iir
        JOIN inventory_items ii
          ON ii.id = iir.inventory_item_id
        ${requestWhere}
        ORDER BY ${inventorySchema.requestRequestedAt ? 'iir.requested_at DESC,' : ''} iir.id DESC
        LIMIT 5
      `,
        requestValues,
      ),
  })
  const requests = requestsResult.rows

  const loansResult = await runSafeDomainSectionQuery<ReviewDbInventoryLoanRow>({
    sectionLabel: 'inventory-loans',
    enabled:
      inventorySchema.loanId &&
      inventorySchema.loanCode &&
      inventorySchema.loanQty &&
      inventorySchema.loanReturnedQty &&
      inventorySchema.loanStatus &&
      inventorySchema.loanBorrowerName &&
      canJoinLoanItem &&
      inventorySchema.itemCode &&
      inventorySchema.itemName,
    query: () =>
      runReviewDbQuery<ReviewDbInventoryLoanRow>(`
        SELECT
          iil.id AS loanId,
          iil.loan_code AS loanCode,
          iil.loan_qty AS loanQty,
          iil.returned_qty AS returnedQty,
          iil.loan_status AS loanStatus,
          iil.borrower_name AS borrowerName,
          ${inventorySchema.loanBorrowerDivision ? 'iil.borrower_division' : 'NULL'} AS borrowerDivision,
          ${inventorySchema.loanBorrowerSubdivision ? 'iil.borrower_subdivision' : 'NULL'} AS borrowerSubdivision,
          ${inventorySchema.loanNotes ? 'iil.loan_notes' : 'NULL'} AS loanNotes,
          ${inventorySchema.loanReturnNotes ? 'iil.return_notes' : 'NULL'} AS returnNotes,
          ${inventorySchema.loanBorrowedAt ? 'iil.borrowed_at' : 'CURRENT_TIMESTAMP'} AS borrowedAt,
          ${inventorySchema.loanDueAt ? 'iil.due_at' : 'NULL'} AS dueAt,
          ${inventorySchema.loanReturnedAt ? 'iil.returned_at' : 'NULL'} AS returnedAt,
          ii.item_code AS itemCode,
          ii.item_name AS itemName
        FROM inventory_item_loans iil
        JOIN inventory_items ii
          ON ii.id = iil.inventory_item_id
        ORDER BY ${inventorySchema.loanBorrowedAt ? 'iil.borrowed_at DESC,' : ''} iil.id DESC
        LIMIT 5
      `),
  })
  const loans = loansResult.rows

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
          `Rack: ${item.rackCode || '-'}`,
          `Rack Barcode: ${item.rackBarcode || item.rackCode || item.itemCode}`,
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
        filterTags: [`PERIOD:${toPeriodKey(item.movementAt)}`],
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
        filterTags: [
          `PERIOD:${toPeriodKey(item.requestedAt)}`,
          `REQUEST_STATUS:${String(item.requestStatus).trim().toUpperCase()}`,
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

async function getReviewDbHrSections(filters?: DomainReviewDrilldownFilters): Promise<DomainReviewSection[]> {
  const focus = String(filters?.focus ?? '')
    .trim()
    .toUpperCase()
  const period = resolveSqlPeriodRange(filters)

  const [
    ,
    faceConfig,
    faceReferenceItems,
    faceReferenceHistoryItems,
    faceReferenceTrendItems,
    faceRetakeQueueItems,
    facePriorityQueueItems,
    verifiedFaceReferenceCandidates,
    faceReviewItems,
    faceOutcomeAnalytics,
    geofenceConfig,
    recentKpis,
  ] = await Promise.all([
    ensureDomainHrReadTables(),
    getHrAttendanceFaceConfig().catch(() => null),
    getRecentHrEmployeeFaceReferenceItems(5).catch(() => []),
    getRecentHrEmployeeFaceReferenceHistoryItems(8).catch(() => []),
    getHrEmployeeFaceReferenceTrendItems(5).catch(() => []),
    getRecentHrAttendanceFaceRetakeQueueItems(5).catch(() => []),
    getHrAttendanceFacePriorityQueueItems(8).catch(() => []),
    getVerifiedHrEmployeeFaceReferenceCandidates(5).catch(() => []),
    getRecentHrAttendanceFaceReviewItems(5).catch(() => []),
    getHrAttendanceFaceOutcomeAnalytics().catch(() => null),
    getHrAttendanceGeofenceConfig().catch(() => null),
    listRecentHrEmployeeKpis(5).catch(() => []),
  ])


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
    WHERE COALESCE(UPPER(TRIM(he.employment_status)), 'ACTIVE') <> 'ARCHIVED'
    ORDER BY COALESCE(he.join_date, DATE(he.created_at)) DESC, he.id DESC
    LIMIT 5
  `)

  const attendanceValues: unknown[] = []
  const attendanceWhere = (() => {
    return `ha.attendance_date = CURRENT_DATE`
  })()

  const attendances = await runReviewDbQuery<ReviewDbHrAttendanceRow>(
    `
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
    WHERE ${attendanceWhere}
    ORDER BY COALESCE(ha.check_in, ha.created_at) DESC, ha.id DESC
    LIMIT 5
  `,
    attendanceValues,
  )

  const attendanceRateSummary =
    focus === 'ATTENDANCE_RATE'
      ? await (async () => {
          const employeeAggregate = await runReviewDbQuery<{ total: number }>(
            `
              SELECT COUNT(*) AS total
              FROM hr_employees
              WHERE COALESCE(UPPER(TRIM(employment_status)), 'ACTIVE') <> 'ARCHIVED'
            `,
          )
          const attendanceAggregate = await runReviewDbQuery<{ total: number }>(
            `
              SELECT COUNT(*) AS total
              FROM hr_attendance
              WHERE attendance_date = CURRENT_DATE
            `,
          )

          const employeeTotal = Number(employeeAggregate[0]?.total ?? 0)
          const attendanceTotal = Number(attendanceAggregate[0]?.total ?? 0)

          return [
            { label: 'Employee Aktif', value: formatNumber(employeeTotal) },
            { label: 'Attendance Hari Ini', value: formatNumber(attendanceTotal) },
            { label: 'Rasio Kehadiran', value: formatPercentage(attendanceTotal, employeeTotal) },
          ]
        })()
      : undefined

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
    ${focus === 'ACTIVE_LOANS' ? `WHERE hl.status = 'ACTIVE'` : ''}
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
      summary: focus === 'ATTENDANCE_RATE' ? attendanceRateSummary : undefined,
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
      description:
        focus === 'ATTENDANCE_RATE'
          ? 'Kehadiran hari ini sebagai pembilang rasio attendance, disandingkan dengan employee aktif yang menjadi penyebut KPI.'
          : 'Kehadiran terbaru hari ini dari review DB untuk memastikan employee yang aktif mulai tercatat di HR.',
      summary: focus === 'ATTENDANCE_RATE' ? attendanceRateSummary : undefined,
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
        filterTags: [`PERIOD:${toPeriodKey(item.attendanceDate)}`],
      })),
    },
    {
      title: focus === 'ACTIVE_LOANS' ? 'Loan Aktif' : 'Loan Terbaru',
      description:
        focus === 'ACTIVE_LOANS'
          ? 'Pinjaman dengan status aktif agar antrean HR mengikuti angka KPI pinjaman aktif pada dashboard.'
          : 'Kasbon atau pinjaman terbaru dari review DB untuk menjaga histori HR tetap terlihat, termasuk yang sudah dibatalkan secara non-destruktif.',
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
      title: 'KPI Bulanan Terbaru',
      description:
        'KPI manual per employee yang dipakai sebagai acuan bonus performa payroll. Isi bonus akan dipakai sebagai default saat slip gaji dibuat.',
      rows: recentKpis.map((item) => ({
        id: `KPI-${item.kpiId}`,
        primary: item.employeeName,
        secondary: `${String(item.kpiMonth).padStart(2, '0')}/${item.kpiYear}`,
        status: `SCORE ${formatNumber(item.score)}`,
        detail: `Bonus performa ${formatCurrency(item.performanceBonus)} untuk periode payroll.`,
        meta: [
          `Employee: ${item.employeeCode}`,
          `Score: ${formatNumber(item.score)}`,
          `Bonus: ${formatCurrency(item.performanceBonus)}`,
          `Updated At: ${formatDateTime(item.updatedAt)}`,
          `Notes: ${item.notes || '-'}`,
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
  if (content.key !== 'support') {
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
  if (content.key !== 'billing') {
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

type DomainReviewDrilldownFilters = {
  focus?: string
  month?: number
  year?: number
}

function resolveSqlPeriodRange(filters?: DomainReviewDrilldownFilters) {
  if (!filters?.month || !filters?.year) return null
  const month = filters.month
  const year = filters.year
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const toSqlDate = (value: Date) => {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 10)
  }

  return {
    month,
    year,
    startDate: toSqlDate(start),
    endDate: toSqlDate(end),
  }
}

function filterReviewSectionsForDomain(
  domain: DomainKey,
  reviewSections: DomainReviewSection[],
  filters?: DomainReviewDrilldownFilters,
) {
  const focus = String(filters?.focus ?? '')
    .trim()
    .toUpperCase()
  const period =
    filters?.year && filters?.month ? `${filters.year}-${String(filters.month).padStart(2, '0')}` : ''

  if (!focus || !reviewSections.length || domain === 'support' || domain === 'customers') {
    return reviewSections
  }

  const hasTag = (tags: string[] | undefined, key: string, value: string) => tags?.includes(`${key}:${value}`) ?? false

  return reviewSections
    .map((section) => {
      const title = section.title.trim().toUpperCase()

      if (domain === 'sales') {
        if (['ACTIVE_LEADS', 'DIGITAL_LEADS'].includes(focus)) {
          return title.includes('LEAD TERBARU') ? section : null
        }
        if (focus === 'MONTHLY_ORDERS') {
          if (!title.includes('ORDER PERIODE INI')) return null
          const rows = period ? section.rows.filter((row) => hasTag(row.filterTags, 'PERIOD', period)) : section.rows
          return rows.length > 0 ? { ...section, rows } : null
        }
        if (focus === 'DIGITAL_ORDERS') {
          if (!title.includes('ORDER DIGITAL PERIODE INI')) return null
          const rows = period ? section.rows.filter((row) => hasTag(row.filterTags, 'PERIOD', period)) : section.rows
          return rows.length > 0 ? { ...section, rows } : null
        }
        if (focus === 'DIGITAL_SURVEYS') {
          if (!title.includes('SURVEY DIGITAL PERIODE INI')) return null
          const rows = period ? section.rows.filter((row) => hasTag(row.filterTags, 'PERIOD', period)) : section.rows
          return rows.length > 0 ? { ...section, rows } : null
        }
        if (focus === 'ACTIVE_WORK_ORDERS') {
          return title.includes('WORK ORDER AKTIF') ? section : null
        }
        if (focus === 'MONTHLY_ACTIVATIONS') {
          if (!title.includes('SUBSCRIPTION AKTIVASI')) return null
          const rows = period ? section.rows.filter((row) => hasTag(row.filterTags, 'PERIOD', period)) : section.rows
          return rows.length > 0 ? { ...section, rows } : null
        }
        if (focus === 'ACTIVATION_RATE') {
          if (!title.includes('ORDER PEMBANDING AKTIVASI') && !title.includes('SUBSCRIPTION AKTIVASI')) return null
          const rows = period ? section.rows.filter((row) => hasTag(row.filterTags, 'PERIOD', period)) : section.rows
          return rows.length > 0 ? { ...section, rows } : null
        }
      }

      if (domain === 'billing') {
        const isOverdueFocus = focus === 'OVERDUE_INVOICES' || focus === 'BILLING_OVERDUE_AMOUNT'
        const isPartialFocus = focus === 'PARTIAL_INVOICES' || focus === 'PARTIAL_PAYMENTS'

        if (isOverdueFocus || isPartialFocus) {
          if (
            !title.includes('PERLU TINDAK LANJUT') &&
            !(focus === 'BILLING_OVERDUE_AMOUNT' && title.includes('NOMINAL OVERDUE'))
          ) {
            return null
          }
          const statusNeedle = isOverdueFocus ? 'OVERDUE' : 'PARTIAL'
          const rows = section.rows.filter((row) => {
            const periodMatches = period ? hasTag(row.filterTags, 'PERIOD', period) : true
            return (
              periodMatches &&
              hasTag(row.filterTags, 'INVOICE_STATUS', statusNeedle) &&
              hasTag(row.filterTags, 'REMAINING_POSITIVE', 'YES')
            )
          })
          return rows.length > 0 ? { ...section, rows } : null
        }

        if (focus === 'SUSPEND_CANDIDATES') {
          const rows = section.rows.filter((row) => {
            const periodMatches = period ? hasTag(row.filterTags, 'PERIOD', period) : true
            return periodMatches && hasTag(row.filterTags, 'SUSPEND_CANDIDATE', 'YES')
          })

          if (rows.length > 0) {
            return { ...section, rows }
          }

          return title.includes('SUSPEND') ? section : null
        }
      }

      if (domain === 'hr') {
        if (focus === 'ACTIVE_EMPLOYEES') {
          return title.includes('EMPLOYEE TERBARU') ? section : null
        }
        if (focus === 'TODAY_ATTENDANCE') {
          if (!title.includes('ATTENDANCE HARI INI')) return null
          return section.rows.length > 0 ? section : null
        }
        if (focus === 'ATTENDANCE_RATE') {
          if (!title.includes('EMPLOYEE TERBARU') && !title.includes('ATTENDANCE HARI INI')) return null
          return section.rows.length > 0 ? section : null
        }
        if (focus === 'ACTIVE_LOANS') {
          return title.includes('LOAN AKTIF') ? section : null
        }
      }

      if (domain === 'inventory') {
        if (focus === 'ACTIVE_ITEMS') {
          return title.includes('ITEM INVENTORY TERBARU') ? section : null
        }
        if (focus === 'MONTHLY_MOVEMENTS') {
          if (!title.includes('STOCK MOVEMENT TERBARU')) return null
          const rows = period ? section.rows.filter((row) => hasTag(row.filterTags, 'PERIOD', period)) : section.rows
          return rows.length > 0 ? { ...section, rows } : null
        }
        if (focus === 'PENDING_REQUESTS') {
          if (!title.includes('REQUEST INVENTORY TEKNISI')) return null
          const rows = section.rows.filter((row) => {
            const periodMatches = period ? hasTag(row.filterTags, 'PERIOD', period) : true
            return periodMatches && hasTag(row.filterTags, 'REQUEST_STATUS', 'PENDING')
          })
          return rows.length > 0 ? { ...section, rows } : null
        }
      }

      return section
    })
    .filter((section): section is DomainReviewSection => Boolean(section))
}

async function buildSupportFocus(
  content: DomainPageContent,
  role: AppRole,
  selectedLane: SupportLaneKey | null,
): Promise<DomainSupportFocus | undefined> {
  if (content.key !== 'support') {
    return undefined
  }

  const sections = content.reviewSections ?? []
  const language = await getServerUiLanguage()
  const defaultLane = getPreferredSupportLane(role)
  const resolvedSelectedLane = selectedLane && canAccessSupportLane(role, selectedLane) ? selectedLane : null
  const activeLane = getActiveSupportLane(role, resolvedSelectedLane)
  const lanes = buildSupportLaneSnapshots(role, sections, language)
  const visibleSections = resolvedSelectedLane ? getSupportLaneSections(sections, activeLane) : sections

  return {
    defaultLane,
    selectedLane: resolvedSelectedLane,
    activeLane,
    lanes,
    activeWorkspace: buildSupportLaneWorkspace(role, activeLane, lanes, language),
    visibleSections,
    reviewSummary: buildSupportLaneReviewSummary(visibleSections),
  }
}

export async function getDomainPageData(
  domain: DomainKey,
  session: AppSession,
  options?: {
    supportLane?: SupportLaneKey | null
    focus?: string
    month?: number
    year?: number
  },
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
      capabilities: buildCapabilities(session.role, domain),
      supportFocus: await buildSupportFocus(content, session.role, selectedSupportLane),
    }
  }

  return readThroughServerTtlCache(
    `domain-page:${domain}:${buildDomainSessionCacheScope(session)}:${JSON.stringify({
      supportLane: selectedSupportLane,
      focus: options?.focus ?? null,
      month: options?.month ?? null,
      year: options?.year ?? null,
    })}`,
    DOMAIN_PAGE_CACHE_TTL_MS,
    async () => {
      try {
        const reviewFilters = {
          focus: options?.focus,
          month: options?.month,
          year: options?.year,
        }
        const [stats, salesSectionsRaw, supportSections, customerSections, billingSectionsRaw, inventorySectionsRaw, hrSectionsRaw] =
          await Promise.all([
            getReviewDbDomainStats(),
            domain === 'sales'
              ? getReviewDbSalesSections(session, reviewFilters)
              : Promise.resolve([] as DomainReviewSection[]),
            domain === 'support'
              ? getReviewDbSupportSections(session, {
                  lane: selectedSupportLane,
                  focus: options?.focus,
                })
              : Promise.resolve([] as DomainReviewSection[]),
            domain === 'customers' ? getReviewDbCustomerSections() : Promise.resolve([] as DomainReviewSection[]),
            domain === 'billing'
              ? getReviewDbBillingSections(session, reviewFilters)
              : Promise.resolve([] as DomainReviewSection[]),
            domain === 'inventory'
              ? getReviewDbInventorySections(reviewFilters)
              : Promise.resolve([] as DomainReviewSection[]),
            domain === 'hr' ? getReviewDbHrSections(reviewFilters) : Promise.resolve([] as DomainReviewSection[]),
          ])
        const salesSections = domain === 'sales' ? filterReviewSectionsForDomain(domain, salesSectionsRaw, reviewFilters) : []
        const billingSections =
          domain === 'billing' ? filterReviewSectionsForDomain(domain, billingSectionsRaw, reviewFilters) : []
        const inventorySections =
          domain === 'inventory' ? filterReviewSectionsForDomain(domain, inventorySectionsRaw, reviewFilters) : []
        const hrSections = domain === 'hr' ? filterReviewSectionsForDomain(domain, hrSectionsRaw, reviewFilters) : []

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
          capabilities: buildCapabilities(session.role, domain),
          supportFocus: await buildSupportFocus(nextContent, session.role, selectedSupportLane),
        }
      } catch (error) {
        return {
          source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
          content,
          capabilities: buildCapabilities(session.role, domain),
          supportFocus: await buildSupportFocus(content, session.role, selectedSupportLane),
        }
      }
    },
  )
}
