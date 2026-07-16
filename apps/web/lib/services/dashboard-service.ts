import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { canAccessPath, canPerformAction, getDefaultLandingPath } from '@/lib/access-control'
import {
  getDailyActivityDivisionAliases,
  getDailyActivitySubdivisionAliases,
  normalizeDailyActivityDivisionName,
  normalizeDailyActivitySubdivisionName,
} from '@/lib/daily-activity-org'
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
import { buildSupportLaneActionHref, buildSupportLaneHref } from '@/lib/support-action-links'
import { getRecentAuthPermissionAudits } from '@/lib/services/auth-permission-audit-service'
import { getRecentAuthRolePermissionAudits } from '@/lib/services/auth-role-permission-audit-service'
import { getRecentAuthUserAudits } from '@/lib/services/auth-user-audit-service'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'
import { listMergedDashboardKpiDefinitions, resolveDashboardKpiManagerScope } from '@/lib/services/dashboard-kpi-service'
import { getRecentHrAudits } from '@/lib/services/hr-audit-service'
import { ensureImportBatchActionTable } from '@/lib/services/import-write-service'
import { ensureSupportDismantleQueueTable } from '@/lib/services/support-dismantle-service'
import { ensureSupportTroubleTicketEscalationTable } from '@/lib/services/support-ticket-escalation-service'
import { ensureSupportTroubleTicketProgressTable } from '@/lib/services/support-ticket-progress-service'
import { canAccessSupportLane, canUseSupportAction, normalizeSupportLane } from '@/lib/support-lanes'
import type {
  AppRole,
  ActivityItem,
  CaseActionOutcomeSummary,
  CaseCorrelationSummary,
  CaseDecisionTrail,
  CaseEvidencePanel,
  CaseHealthSignal,
  CaseRecommendedActionMatrix,
  DashboardAlertItem,
  DashboardDailyActivityApprovalQueue,
  DashboardDailyActivityApprovalQueueItem,
  DashboardDailyActivityPendingApprovalItem,
  DashboardMetric,
  DashboardNextActionItem,
  DashboardOperationalCard,
  DashboardOperationalDivisionKey,
  DashboardQueueItem,
  DashboardSummary,
  SupportLaneActionKey,
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
  openDismantles: number
  monthlyDismantles: number
}

type DashboardNocOperationalRow = {
  openTickets: number
  overdueTickets: number
  monthlyOpenedTickets: number
  escalationPending: number
  readyClose: number
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

type DashboardMarketingCustomerRow = {
  customerId: number
  customerCode: string | null
  customerName: string
  phone: string | null
  email: string | null
  address: string | null
}

type DashboardCoverageRow = {
  coverageId: number
  areaCode: string
  areaName: string
  coverageStatus: string
  village: string | null
  district: string | null
}

type DashboardMarketingOrderRow = {
  orderId: number
  orderNo: string
  customerName: string
  status: string
  orderType: string | null
  marketingName: string | null
  requestDate: string | null
}

type DashboardOdpPortIssueRow = {
  portId: number
  odpCode: string
  portNo: string
  portStatus: string
  customerCode: string | null
  serviceNo: string | null
  installedAt: string | null
}

type DashboardDigitalOrderRow = {
  orderId: number
  orderNo: string
  customerName: string
  status: string
  source: string | null
  orderType: string | null
  requestDate: string | null
}

type DashboardDigitalSurveyRow = {
  surveyId: number
  surveyNo: string
  customerName: string
  status: string
  source: string | null
  feasibilityStatus: string | null
  scheduledAt: string | null
}

type DashboardDigitalSourceSummaryRow = {
  source: string | null
  totalOpen: number
}

type DashboardSupportRow = {
  ticketCode: string
  customerName: string
  status: string
  ticketType: string
  openedAt: string
  agingHours?: number
}

function parseDashboardHrefParts(href: string) {
  try {
    const url = new URL(href, 'https://perkasa.local')
    return {
      pathname: url.pathname,
      hash: url.hash,
    }
  } catch {
    return {
      pathname: '',
      hash: '',
    }
  }
}

function parseSupportActionKey(hash: string): SupportLaneActionKey | null {
  const normalizedHash = String(hash ?? '').trim()
  if (!normalizedHash.startsWith('#support-action-')) {
    return null
  }

  const rawKey = normalizedHash.replace(/^#support-action-/, '') as SupportLaneActionKey
  const allowedKeys: SupportLaneActionKey[] = [
    'ticket-create',
    'ticket-progress',
    'ticket-escalate',
    'ticket-close',
    'sla-manage',
    'isolation-create',
    'isolation-restore',
    'dismantle-approve',
    'dismantle-close',
    'dismantle-reopen',
  ]

  return allowedKeys.includes(rawKey) ? rawKey : null
}

function getRoleSupportActionCapability(role: AppRole) {
  return {
    role,
    canCreate: canPerformAction(role, 'support', 'create'),
    canUpdate: canPerformAction(role, 'support', 'update'),
    canApprove: canPerformAction(role, 'support', 'approve'),
  }
}

function canAccessDashboardHref(role: AppRole, href: string) {
  const { pathname, hash } = parseDashboardHrefParts(href)
  if (!pathname || !canAccessPath(role, pathname)) {
    return false
  }

  if (pathname.startsWith('/support/')) {
    const lane = normalizeSupportLane(pathname.split('/')[2] ?? '')
    if (lane && !canAccessSupportLane(role, lane)) {
      return false
    }
  }

  const actionKey = parseSupportActionKey(hash)
  if (actionKey && !canUseSupportAction({ ...getRoleSupportActionCapability(role), actionKey })) {
    return false
  }

  return true
}

function getLockedOperationalDivision(role: AppRole): DashboardOperationalDivisionKey {
  switch (role) {
    case 'SALES_MARKETING':
      return 'SALES'
    case 'CS_OPERATOR':
    case 'CS_ADMIN':
      return 'CS'
    case 'NOC_OPERATOR':
    case 'FIELD_TECHNICIAN':
      return 'NOC'
    case 'TT_OPERATOR':
      return 'TT'
    case 'DIGITAL_CREATOR':
      return 'DIGITAL'
    case 'DISMANTLE_OPERATOR':
      return 'DISMANTLE'
    default:
      return 'ALL'
  }
}

function getDashboardOperationalCardHref(role: AppRole, card: DashboardOperationalCard) {
  switch (card.key) {
    case 'CS':
      if (canAccessSupportLane(role, 'isolations')) {
        return buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })
      }
      break
    case 'NOC':
      if (canAccessSupportLane(role, 'tt')) {
        return buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })
      }
      break
    case 'TT':
      if (canAccessSupportLane(role, 'tt')) {
        return buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })
      }
      break
    case 'DISMANTLE':
      if (canAccessSupportLane(role, 'dismantle')) {
        return buildSupportLaneHref('dismantle')
      }
      if (canAccessSupportLane(role, 'isolations')) {
        return buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })
      }
      break
    case 'SALES':
    case 'DIGITAL':
      if (canAccessDashboardHref(role, '/sales')) {
        return '/sales'
      }
      break
    case 'BILLING':
      if (canAccessDashboardHref(role, '/billing')) {
        return '/billing'
      }
      break
    case 'HR':
      if (canAccessDashboardHref(role, '/hr')) {
        return '/hr'
      }
      break
    case 'INVENTORY':
      if (canAccessDashboardHref(role, '/inventory')) {
        return '/inventory'
      }
      break
  }

  return canAccessDashboardHref(role, card.href) ? card.href : getDefaultLandingPath(role)
}

function sanitizeDashboardOperationalMetric(
  role: AppRole,
  metric: DashboardOperationalCard['metrics'][number],
): DashboardOperationalCard['metrics'][number] {
  const hint = isRoleSafeDashboardText(role, metric.hint) ? metric.hint : undefined
  const hintBadges = metric.hintBadges?.filter((item) => isRoleSafeDashboardText(role, item))

  return {
    ...metric,
    href: metric.href && canAccessDashboardHref(role, metric.href) ? metric.href : undefined,
    hint,
    hintBadges: hintBadges?.length ? hintBadges : undefined,
  }
}

function sanitizeDashboardOperationalCards(
  role: AppRole,
  cards: DashboardOperationalCard[],
  filters: DashboardPageFilters,
) {
  const visibleDivision = role === 'SUPER_ADMIN' ? filters.division : getLockedOperationalDivision(role)
  const nextCards = cards
    .filter((card) => visibleDivision === 'ALL' || card.key === visibleDivision)
    .map((card) => ({
      ...card,
      href: getDashboardOperationalCardHref(role, card),
      description: isRoleSafeDashboardText(role, card.description)
        ? card.description
        : 'Ringkasan operasional ini disederhanakan agar tetap sesuai dengan scope role aktif.',
      metrics: card.metrics.map((metric) => sanitizeDashboardOperationalMetric(role, metric)),
    }))

  return nextCards
}

function getAlertTone(severity: DashboardAlertItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'high':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700'
  }
}

function getWorklistTone(priority: DashboardWorkItem['priority']) {
  switch (priority) {
    case 'tinggi':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'sedang':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
}

function getQueueTone(accent: string) {
  if (accent.includes('rose') || accent.includes('orange')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (accent.includes('amber')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (accent.includes('emerald')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (accent.includes('sky') || accent.includes('blue') || accent.includes('indigo') || accent.includes('cyan')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function getDashboardNextActionLabel(href: string, fallbackLabel?: string) {
  const { pathname, hash } = parseDashboardHrefParts(href)
  const actionKey = parseSupportActionKey(hash)

  switch (actionKey) {
    case 'ticket-progress':
      return 'Update Ticket'
    case 'ticket-escalate':
      return 'Eskalasi Ticket'
    case 'ticket-close':
      return 'Tutup Ticket'
    case 'sla-manage':
      return 'Kontrol SLA'
    case 'isolation-create':
      return 'Buat Isolir'
    case 'isolation-restore':
      return 'Proses Restore'
    case 'dismantle-approve':
      return 'Masuk Dismantle'
    case 'dismantle-close':
      return 'Tutup Dismantle'
    case 'dismantle-reopen':
      return 'Reopen Dismantle'
    default:
      break
  }

  if (pathname.startsWith('/support/sla')) return 'Kontrol SLA'
  if (pathname.startsWith('/support/tt')) return 'Buka Ticket'
  if (pathname.startsWith('/support/isolations')) return 'Buka Isolir'
  if (pathname.startsWith('/support/dismantle')) return 'Buka Dismantle'
  if (pathname.startsWith('/billing')) return 'Buka Billing'
  if (pathname.startsWith('/dashboard/daily-activity')) return 'Buka Approval'
  if (pathname.startsWith('/sales')) return 'Buka Sales'
  if (pathname.startsWith('/inventory')) return 'Buka Inventory'
  if (pathname.startsWith('/customers')) return 'Buka Customer'
  if (pathname.startsWith('/import')) return 'Review Import'
  if (pathname.startsWith('/dashboard/worklist')) return 'Buka Worklist'
  if (pathname.startsWith('/dashboard')) return 'Buka Dashboard'

  return fallbackLabel || 'Buka Detail'
}

export function buildDashboardNextActions(params: {
  role: AppRole
  alerts: DashboardAlertItem[]
  worklist: DashboardWorkItem[]
  roleQueues: DashboardQueueItem[]
}) {
  const items: DashboardNextActionItem[] = [
    ...params.alerts.slice(0, 3).map((item) => ({
      id: `alert-${item.id}`,
      sourceLabel: 'Alert',
      domain: item.domain,
      title: item.title,
      detail: item.nextStep,
      actionLabel: getDashboardNextActionLabel(item.href, item.actionLabel),
      href: item.href,
      tone: getAlertTone(item.severity),
    })),
    ...params.worklist.slice(0, 2).map((item) => ({
      id: `worklist-${item.id}`,
      sourceLabel: 'List Kerja',
      domain: item.domain,
      title: item.title,
      detail: item.detail,
      actionLabel: getDashboardNextActionLabel(item.href),
      href: item.href,
      tone: getWorklistTone(item.priority),
    })),
    ...params.roleQueues.slice(0, 2).map((item) => ({
      id: `queue-${item.title}-${item.href}`,
      sourceLabel: 'Queue',
      domain: 'Role Aktif',
      title: item.title,
      detail: `${item.count} item aktif. ${item.description}`,
      actionLabel: getDashboardNextActionLabel(item.href),
      href: item.href,
      tone: getQueueTone(item.accent),
    })),
  ]

  const seen = new Set<string>()

  return items.filter((item) => {
    if (!canAccessDashboardHref(params.role, item.href)) {
      return false
    }

    const key = `${item.href}::${item.title}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function canAccessBillingContext(role: AppRole) {
  return canAccessPath(role, '/billing')
}

function canAccessHrContext(role: AppRole) {
  return canAccessPath(role, '/hr')
}

function canAccessSupervisorContext(role: AppRole) {
  return canAccessPath(role, '/customers/cs-admin')
}

function isRoleSafeDashboardText(role: AppRole, text?: string | null) {
  const normalized = String(text ?? '').trim().toLowerCase()
  if (!normalized) {
    return true
  }

  if (!canAccessBillingContext(role) && /(billing|collection|invoice|penagihan)/i.test(normalized)) {
    return false
  }

  if (!canAccessHrContext(role) && /(hr|daily activity|approval harian|approval supervisor)/i.test(normalized)) {
    return false
  }

  if (!canAccessSupervisorContext(role) && /(supervisor cs|admin cs|cs admin)/i.test(normalized)) {
    return false
  }

  return true
}

function getDashboardQueueFallbackHref(role: AppRole, item: DashboardQueueItem) {
  const title = `${item.title} ${item.description}`.toLowerCase()

  if ((title.includes('sla') || title.includes('ticket') || title.includes('tt')) && canAccessSupportLane(role, 'tt')) {
    return title.includes('sla') && canAccessSupportLane(role, 'sla')
      ? buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })
      : buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })
  }
  if (title.includes('isolir') && canAccessSupportLane(role, 'isolations')) {
    return buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })
  }
  if ((title.includes('dismantle') || title.includes('lapangan')) && canAccessSupportLane(role, 'dismantle')) {
    return buildSupportLaneHref('dismantle')
  }
  if ((title.includes('odp') || title.includes('port') || title.includes('inventory')) && canAccessDashboardHref(role, '/inventory')) {
    return '/inventory'
  }
  if ((title.includes('lead') || title.includes('order') || title.includes('coverage')) && canAccessDashboardHref(role, '/sales')) {
    return '/sales'
  }
  if (title.includes('customer') && canAccessDashboardHref(role, '/customers')) {
    return '/customers'
  }
  if ((title.includes('approval') || title.includes('daily')) && canAccessDashboardHref(role, '/dashboard/daily-activity')) {
    return '/dashboard/daily-activity'
  }
  if (title.includes('import') && canAccessDashboardHref(role, '/import')) {
    return '/import'
  }
  return getDefaultLandingPath(role)
}

function sanitizeDashboardQueueItem(role: AppRole, item: DashboardQueueItem): DashboardQueueItem {
  const needsSpecificSupportFallback =
    item.href === '/support' && /(ticket|tt|sla|isolir|dismantle|lapangan)/i.test(`${item.title} ${item.description}`)
  const href =
    !needsSpecificSupportFallback && canAccessDashboardHref(role, item.href)
      ? item.href
      : getDashboardQueueFallbackHref(role, item)
  const description = isRoleSafeDashboardText(role, item.description)
    ? item.description
    : 'Queue ini tetap relevan untuk role Anda, dengan konteks lintas tim disederhanakan.'

  return {
    ...item,
    href,
    description,
  }
}

function sanitizeAffectedModules(role: AppRole, modules: string[]) {
  return modules.filter((item) => isRoleSafeDashboardText(role, item))
}

function getDashboardAlertFallback(role: AppRole, item: DashboardAlertItem) {
  const haystack = `${item.domain} ${item.title} ${item.detail}`.toLowerCase()

  if ((haystack.includes('import') || haystack.includes('batch')) && canAccessDashboardHref(role, '/import')) {
    return { href: '/import', actionLabel: 'Review Import' }
  }
  if ((haystack.includes('daily') || haystack.includes('approval')) && canAccessDashboardHref(role, '/dashboard/daily-activity')) {
    return { href: '/dashboard/daily-activity', actionLabel: 'Buka Approval' }
  }
  if ((haystack.includes('isolir') || haystack.includes('restore')) && canAccessSupportLane(role, 'isolations')) {
    return { href: buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' }), actionLabel: 'Buka Isolir' }
  }
  if ((haystack.includes('ticket') || haystack.includes('sla') || haystack.includes('tt')) && canAccessSupportLane(role, 'tt')) {
    return canAccessSupportLane(role, 'sla')
      ? { href: buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' }), actionLabel: 'Kontrol SLA' }
      : { href: buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' }), actionLabel: 'Buka Ticket' }
  }
  if ((haystack.includes('billing') || haystack.includes('invoice')) && canAccessDashboardHref(role, '/billing')) {
    return { href: '/billing', actionLabel: 'Buka Billing' }
  }

  const fallbackHref =
    ['/dashboard', '/support/tt', '/support/isolations', '/inventory', '/sales']
      .find((candidate) => canAccessDashboardHref(role, candidate))
      ?? getDefaultLandingPath(role)

  return {
    href: fallbackHref,
    actionLabel: 'Buka Detail',
  }
}

function sanitizeDashboardAlertItem(role: AppRole, item: DashboardAlertItem): DashboardAlertItem | null {
  const haystack = `${item.domain} ${item.title} ${item.detail} ${item.nextStep}`.toLowerCase()
  const isBillingAlert = /(billing|invoice|collection|penagihan)/i.test(haystack)
  const isApprovalAlert = /(daily activity|approval)/i.test(haystack)
  const isImportAlert = /(import|batch)/i.test(haystack)

  if (isBillingAlert && !canAccessBillingContext(role)) {
    return null
  }

  if (isApprovalAlert && !canPerformAction(role, 'daily_activity', 'approve')) {
    return null
  }

  if (isImportAlert && !canAccessDashboardHref(role, '/import')) {
    return null
  }

  const primaryAction = canAccessDashboardHref(role, item.href)
    ? { href: item.href, actionLabel: item.actionLabel }
    : getDashboardAlertFallback(role, item)

  const detail = isRoleSafeDashboardText(role, item.detail)
    ? item.detail
    : 'Alert ini tetap relevan untuk role Anda, dengan detail lintas tim disederhanakan.'
  const impactSummary = isRoleSafeDashboardText(role, item.impactSummary)
    ? item.impactSummary
    : 'Sebagian dampak lintas domain disembunyikan agar fokus tetap sesuai scope role aktif.'
  const nextStep = isRoleSafeDashboardText(role, item.nextStep)
    ? item.nextStep
    : 'Buka queue atau modul yang tersedia untuk role Anda lalu tindak lanjuti prioritas operasional yang aman.'
  const affectedModules = sanitizeAffectedModules(role, item.affectedModules)
  const domain = isRoleSafeDashboardText(role, item.domain) ? item.domain : 'Operasional'

  const isCompletelyHidden =
    !affectedModules.length &&
    !isRoleSafeDashboardText(role, item.domain) &&
    !isRoleSafeDashboardText(role, item.detail) &&
    !isRoleSafeDashboardText(role, item.impactSummary) &&
    !isRoleSafeDashboardText(role, item.nextStep)

  if (isCompletelyHidden && !canAccessDashboardHref(role, primaryAction.href)) {
    return null
  }

  return {
    ...item,
    domain,
    detail,
    impactSummary,
    nextStep,
    affectedModules,
    href: primaryAction.href,
    actionLabel: primaryAction.actionLabel,
  }
}

function sanitizeDashboardQueueItems(role: AppRole, items: DashboardQueueItem[]) {
  return items.map((item) => sanitizeDashboardQueueItem(role, item))
}

function sanitizeDashboardAlerts(role: AppRole, items: DashboardAlertItem[]) {
  return items
    .map((item) => sanitizeDashboardAlertItem(role, item))
    .filter(Boolean) as DashboardAlertItem[]
}

type DashboardIsolationRow = {
  isolationId: number
  customerName: string
  status: string
  reason: string | null
  isolationDate: string | null
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
  queueId: number
  dismantleId: number
  customerName: string
  closeNote: string | null
  closedAt: string | null
  transferredAt: string | null
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

type DashboardRejectedActivityRow = {
  activityId: number
  activityCode: string
  activityDate: string
  taskTitle: string
  plannedBy: string
  approvalNotes: string | null
}

type DashboardIsolationDecisionRow = {
  isolationId: number
  customerName: string
  serviceNo: string | null
  reason: string | null
  isolationDate: string | null
  agingDays: number | null
}

type DashboardDismantleDecisionRow = {
  queueId: number
  isolationId: number
  customerName: string
  serviceNo: string | null
  isolationDate: string | null
  transferNote: string | null
  transferredAt: string | null
  agingDays: number | null
}

type DashboardHighRiskTicketRow = {
  ticketCode: string
  customerName: string
  serviceNo: string | null
  status: string
  ticketType: string
  openedAt: string
  agingHours: number
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
  happenedAt: string | null
}

type DashboardPortIssueQueryParts = {
  serviceSubscriptionJoin: string
  customerJoin: string
  customerCodeExpression: string
  serviceNoExpression: string
  installedAtExpression: string
}

type DashboardSupportTicketServiceQueryParts = {
  serviceSubscriptionJoin: string
  serviceNoExpression: string
}

type DashboardSalesOrderQueryParts = {
  leadJoin: string
  customerJoin: string
  customerNameExpression: string
  marketingNameExpression: string
  requestDateExpression: string
  sourceExpression: string
  sourceFilterEnabled: boolean
  orderByExpression: string
}

type DashboardWorkOrderQueryParts = {
  salesOrderJoin: string
  leadJoin: string
  customerJoin: string
  customerNameExpression: string
  workTypeExpression: string
  technicianNameExpression: string
  scheduledAtExpression: string
  orderByExpression: string
}

type DashboardSalesSurveyQueryParts = {
  leadJoin: string
  customerJoin: string
  customerNameExpression: string
  sourceExpression: string
  scheduledAtExpression: string
  orderByExpression: string
}

type DashboardCustomerCompletenessQueryParts = {
  addressJoin: string
  customerCodeExpression: string
  customerNameExpression: string
  phoneExpression: string
  emailExpression: string
  addressExpression: string
  whereClause: string
  enabled: boolean
}

type DashboardBillingAuditQueryParts = {
  subscriptionJoin: string
  customerJoin: string
  customerNameExpression: string
  paymentMethodExpression: string
  paymentDateExpression: string
  actionTypeExpression: string
  actionAtExpression: string
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

const DIGITAL_SALES_SOURCES = ['DIGITAL', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'WEBSITE', 'META ADS'] as const

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

function buildIsolationPrefillToken(isolationId: number, customerName: string, subtitle: string) {
  return `${isolationId} | ${customerName} | ${subtitle}`
}

function buildDismantleQueuePrefillToken(queueId: number, customerName: string, subtitle: string) {
  return `${queueId} | ${customerName} | ${subtitle}`
}

function buildCaseCorrelationSummary(params: {
  customerName: string
  serviceNo?: string | null
  owner: string
  billing: string
  isolation: string
  ttSla: string
  dismantle: string
}): CaseCorrelationSummary {
  return {
    customer: params.customerName,
    service: params.serviceNo?.trim() || undefined,
    owner: params.owner,
    items: [
      {
        label: 'Billing',
        value: params.billing,
        tone: 'border-violet-200 bg-violet-50 text-violet-700',
      },
      {
        label: 'Isolir',
        value: params.isolation,
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      },
      {
        label: 'TT/SLA',
        value: params.ttSla,
        tone: 'border-sky-200 bg-sky-50 text-sky-700',
      },
      {
        label: 'Dismantle',
        value: params.dismantle,
        tone: 'border-rose-200 bg-rose-50 text-rose-700',
      },
      {
        label: 'Owner Aktif',
        value: params.owner,
        tone: 'border-slate-200 bg-slate-50 text-slate-700',
      },
    ],
  }
}

function buildCaseDecisionTrail(params: {
  owner: string
  entries: Array<{
    label: string
    detail: string
    happenedAt?: unknown
    tone?: string
  }>
}): CaseDecisionTrail {
  return {
    owner: params.owner,
    items: params.entries.map((entry) => ({
      label: entry.label,
      detail: entry.detail,
      happenedAt: entry.happenedAt ? formatActivityTime(entry.happenedAt) : undefined,
      tone: entry.tone,
    })),
  }
}

function buildCaseEvidencePanel(params: {
  owner: string
  items: Array<{
    label: string
    detail: string
    happenedAt?: unknown
    tone?: string
  }>
}): CaseEvidencePanel {
  return {
    owner: params.owner,
    items: params.items.map((item) => ({
      label: item.label,
      detail: item.detail,
      happenedAt: item.happenedAt ? formatActivityTime(item.happenedAt) : undefined,
      tone: item.tone,
    })),
  }
}

function buildCaseHealthSignal(params: {
  label: string
  detail: string
  tone?: string
}): CaseHealthSignal {
  return {
    label: params.label,
    detail: params.detail,
    tone: params.tone,
  }
}

function buildCaseRecommendedActionMatrix(params: {
  owner: string
  items: Array<{
    label: string
    detail: string
    href: string
    tone?: string
  }>
}): CaseRecommendedActionMatrix {
  return {
    owner: params.owner,
    items: params.items.map((item) => ({
      label: item.label,
      detail: item.detail,
      href: item.href,
      tone: item.tone,
    })),
  }
}

function buildCaseActionOutcomeSummary(params: {
  owner: string
  items: Array<{
    label: string
    detail: string
    tone?: string
  }>
}): CaseActionOutcomeSummary {
  return {
    owner: params.owner,
    items: params.items.map((item) => ({
      label: item.label,
      detail: item.detail,
      tone: item.tone,
    })),
  }
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

async function getDashboardPortIssueQueryParts(): Promise<DashboardPortIssueQueryParts> {
  const [
    hasPortSubscriptionId,
    hasPortCustomerId,
    hasPortInstalledAt,
    hasSubscriptionId,
    hasSubscriptionServiceNo,
    hasCustomerId,
    hasCustomerCode,
  ] = await Promise.all([
    hasReviewDbColumn('network_odp_ports', 'subscription_id'),
    hasReviewDbColumn('network_odp_ports', 'customer_id'),
    hasReviewDbColumn('network_odp_ports', 'installed_at'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'customer_code'),
  ])

  return {
    serviceSubscriptionJoin:
      hasPortSubscriptionId && hasSubscriptionId
        ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = nop.subscription_id`
        : '',
    customerJoin:
      hasPortCustomerId && hasCustomerId
        ? `
        LEFT JOIN crm_customers c
          ON c.id = nop.customer_id`
        : '',
    customerCodeExpression: hasPortCustomerId && hasCustomerId && hasCustomerCode ? 'c.customer_code' : 'NULL',
    serviceNoExpression: hasPortSubscriptionId && hasSubscriptionId && hasSubscriptionServiceNo ? 'ss.service_no' : 'NULL',
    installedAtExpression: hasPortInstalledAt ? 'CAST(nop.installed_at AS CHAR)' : 'NULL',
  }
}

async function getDashboardSupportTicketServiceQueryParts(): Promise<DashboardSupportTicketServiceQueryParts> {
  const [hasTicketSubscriptionId, hasSubscriptionId, hasSubscriptionServiceNo] = await Promise.all([
    hasReviewDbColumn('support_trouble_tickets', 'subscription_id'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
  ])

  return {
    serviceSubscriptionJoin:
      hasTicketSubscriptionId && hasSubscriptionId
        ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = support_trouble_tickets.subscription_id`
        : '',
    serviceNoExpression:
      hasTicketSubscriptionId && hasSubscriptionId && hasSubscriptionServiceNo ? 'ss.service_no' : 'NULL',
  }
}

async function getDashboardCustomerCompletenessQueryParts(): Promise<DashboardCustomerCompletenessQueryParts> {
  const [
    hasCustomerId,
    hasCustomerCode,
    hasCustomerFullName,
    hasCustomerPhone,
    hasCustomerEmail,
    hasCustomerAddressId,
    hasCustomerAddressCustomerId,
    hasCustomerAddressIsPrimary,
    hasCustomerAddressAddress,
  ] = await Promise.all([
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'customer_code'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('crm_customers', 'phone'),
    hasReviewDbColumn('crm_customers', 'email'),
    hasReviewDbColumn('crm_customer_addresses', 'id'),
    hasReviewDbColumn('crm_customer_addresses', 'customer_id'),
    hasReviewDbColumn('crm_customer_addresses', 'is_primary'),
    hasReviewDbColumn('crm_customer_addresses', 'address'),
  ])

  const canJoinAddress = hasCustomerId && hasCustomerAddressCustomerId
  const addressExpression = canJoinAddress && hasCustomerAddressAddress ? 'a.address' : 'NULL'

  return {
    addressJoin: canJoinAddress
      ? `
        LEFT JOIN crm_customer_addresses a
          ON a.customer_id = c.id${hasCustomerAddressIsPrimary ? `
          AND a.is_primary = 1` : ''}`
      : '',
    customerCodeExpression: hasCustomerCode ? 'c.customer_code' : 'NULL',
    customerNameExpression: hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'",
    phoneExpression: hasCustomerPhone ? 'c.phone' : 'NULL',
    emailExpression: hasCustomerEmail ? 'c.email' : 'NULL',
    addressExpression,
    whereClause: [
      hasCustomerPhone ? `COALESCE(TRIM(c.phone), '') = ''` : '1 = 0',
      hasCustomerEmail ? `COALESCE(TRIM(c.email), '') = ''` : '1 = 0',
      addressExpression !== 'NULL' ? `COALESCE(TRIM(${addressExpression}), '') = ''` : '1 = 0',
    ].join(`
          OR `),
    enabled: hasCustomerId && hasCustomerFullName,
  }
}

async function getDashboardSalesOrderQueryParts(): Promise<DashboardSalesOrderQueryParts> {
  const [
    hasOrderLeadId,
    hasOrderCustomerId,
    hasOrderMarketingName,
    hasOrderRequestDate,
    hasOrderCreatedAt,
    hasLeadId,
    hasLeadCustomerName,
    hasLeadSource,
    hasCustomerId,
    hasCustomerFullName,
  ] = await Promise.all([
    hasReviewDbColumn('sales_orders', 'lead_id'),
    hasReviewDbColumn('sales_orders', 'customer_id'),
    hasReviewDbColumn('sales_orders', 'marketing_name'),
    hasReviewDbColumn('sales_orders', 'request_date'),
    hasReviewDbColumn('sales_orders', 'created_at'),
    hasReviewDbColumn('sales_leads', 'id'),
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('sales_leads', 'source'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
  ])

  const canJoinLead = hasOrderLeadId && hasLeadId
  const canJoinCustomer = hasOrderCustomerId && hasCustomerId

  return {
    leadJoin: canJoinLead
      ? `
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
      : '',
    customerJoin: canJoinCustomer
      ? `
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id`
      : '',
    customerNameExpression:
      canJoinLead && hasLeadCustomerName
        ? `COALESCE(sl.customer_name, ${canJoinCustomer && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
        : canJoinCustomer && hasCustomerFullName
          ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
          : `'Customer belum terpetakan'`,
    marketingNameExpression: hasOrderMarketingName ? 'so.marketing_name' : 'NULL',
    requestDateExpression: hasOrderRequestDate ? 'CAST(so.request_date AS CHAR)' : 'NULL',
    sourceExpression: canJoinLead && hasLeadSource ? 'sl.source' : 'NULL',
    sourceFilterEnabled: canJoinLead && hasLeadSource,
    orderByExpression:
      hasOrderRequestDate && hasOrderCreatedAt
        ? 'COALESCE(so.request_date, so.created_at) DESC, so.id DESC'
        : hasOrderRequestDate
          ? 'so.request_date DESC, so.id DESC'
          : hasOrderCreatedAt
            ? 'so.created_at DESC, so.id DESC'
            : 'so.id DESC',
  }
}

async function getDashboardWorkOrderQueryParts(): Promise<DashboardWorkOrderQueryParts> {
  const [
    hasWorkOrderSalesOrderId,
    hasWorkOrderType,
    hasWorkOrderTechnicianName,
    hasWorkOrderScheduledAt,
    hasWorkOrderCreatedAt,
    hasSalesOrderId,
    hasSalesOrderLeadId,
    hasSalesOrderCustomerId,
    hasLeadId,
    hasLeadCustomerName,
    hasCustomerId,
    hasCustomerFullName,
  ] = await Promise.all([
    hasReviewDbColumn('service_work_orders', 'sales_order_id'),
    hasReviewDbColumn('service_work_orders', 'work_type'),
    hasReviewDbColumn('service_work_orders', 'technician_name'),
    hasReviewDbColumn('service_work_orders', 'scheduled_at'),
    hasReviewDbColumn('service_work_orders', 'created_at'),
    hasReviewDbColumn('sales_orders', 'id'),
    hasReviewDbColumn('sales_orders', 'lead_id'),
    hasReviewDbColumn('sales_orders', 'customer_id'),
    hasReviewDbColumn('sales_leads', 'id'),
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
  ])

  const canJoinSalesOrder = hasWorkOrderSalesOrderId && hasSalesOrderId
  const canJoinLead = canJoinSalesOrder && hasSalesOrderLeadId && hasLeadId
  const canJoinCustomer = canJoinSalesOrder && hasSalesOrderCustomerId && hasCustomerId

  return {
    salesOrderJoin: canJoinSalesOrder
      ? `
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id`
      : '',
    leadJoin: canJoinLead
      ? `
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
      : '',
    customerJoin: canJoinCustomer
      ? `
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id`
      : '',
    customerNameExpression:
      canJoinLead && hasLeadCustomerName
        ? `COALESCE(sl.customer_name, ${canJoinCustomer && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
        : canJoinCustomer && hasCustomerFullName
          ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
          : `'Customer belum terpetakan'`,
    workTypeExpression: hasWorkOrderType ? 'swo.work_type' : "'UNKNOWN'",
    technicianNameExpression: hasWorkOrderTechnicianName ? 'swo.technician_name' : 'NULL',
    scheduledAtExpression: hasWorkOrderScheduledAt ? 'CAST(swo.scheduled_at AS CHAR)' : 'NULL',
    orderByExpression:
      hasWorkOrderScheduledAt && hasWorkOrderCreatedAt
        ? 'COALESCE(swo.scheduled_at, swo.created_at) DESC, swo.id DESC'
        : hasWorkOrderScheduledAt
          ? 'swo.scheduled_at DESC, swo.id DESC'
          : hasWorkOrderCreatedAt
            ? 'swo.created_at DESC, swo.id DESC'
            : 'swo.id DESC',
  }
}

async function getDashboardSalesSurveyQueryParts(): Promise<DashboardSalesSurveyQueryParts> {
  const [
    hasSurveyLeadId,
    hasSurveyCustomerId,
    hasSurveyScheduledAt,
    hasSurveyCreatedAt,
    hasLeadId,
    hasLeadCustomerName,
    hasLeadSource,
    hasCustomerId,
    hasCustomerFullName,
  ] = await Promise.all([
    hasReviewDbColumn('sales_surveys', 'lead_id'),
    hasReviewDbColumn('sales_surveys', 'customer_id'),
    hasReviewDbColumn('sales_surveys', 'scheduled_at'),
    hasReviewDbColumn('sales_surveys', 'created_at'),
    hasReviewDbColumn('sales_leads', 'id'),
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('sales_leads', 'source'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
  ])

  const canJoinLead = hasSurveyLeadId && hasLeadId
  const canJoinCustomer = hasSurveyCustomerId && hasCustomerId

  return {
    leadJoin: canJoinLead
      ? `
        LEFT JOIN sales_leads sl
          ON sl.id = ss.lead_id`
      : '',
    customerJoin: canJoinCustomer
      ? `
        LEFT JOIN crm_customers c
          ON c.id = ss.customer_id`
      : '',
    customerNameExpression:
      canJoinLead && hasLeadCustomerName
        ? `COALESCE(sl.customer_name, ${canJoinCustomer && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
        : canJoinCustomer && hasCustomerFullName
          ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
          : `'Customer belum terpetakan'`,
    sourceExpression: canJoinLead && hasLeadSource ? 'sl.source' : 'NULL',
    scheduledAtExpression:
      hasSurveyScheduledAt && hasSurveyCreatedAt
        ? 'CAST(COALESCE(ss.scheduled_at, ss.created_at) AS CHAR)'
        : hasSurveyScheduledAt
          ? 'CAST(ss.scheduled_at AS CHAR)'
          : hasSurveyCreatedAt
            ? 'CAST(ss.created_at AS CHAR)'
            : 'NULL',
    orderByExpression:
      hasSurveyScheduledAt && hasSurveyCreatedAt
        ? 'COALESCE(ss.scheduled_at, ss.created_at) DESC, ss.id DESC'
        : hasSurveyScheduledAt
          ? 'ss.scheduled_at DESC, ss.id DESC'
          : hasSurveyCreatedAt
            ? 'ss.created_at DESC, ss.id DESC'
            : 'ss.id DESC',
  }
}

async function getDashboardBillingAuditQueryParts(): Promise<DashboardBillingAuditQueryParts> {
  const [
    hasInvoiceSubscriptionId,
    hasSubscriptionId,
    hasSubscriptionCustomerId,
    hasCustomerId,
    hasCustomerFullName,
    hasPaymentMethod,
    hasPaymentDate,
    hasCollectionActionType,
    hasCollectionActionAt,
  ] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'subscription_id'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('billing_payments', 'payment_method'),
    hasReviewDbColumn('billing_payments', 'payment_date'),
    hasReviewDbColumn('billing_collection_actions', 'action_type'),
    hasReviewDbColumn('billing_collection_actions', 'action_at'),
  ])

  const canJoinSubscription = hasInvoiceSubscriptionId && hasSubscriptionId
  const canJoinCustomer = canJoinSubscription && hasSubscriptionCustomerId && hasCustomerId

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
    customerNameExpression: canJoinCustomer && hasCustomerFullName ? 'c.full_name' : 'NULL',
    paymentMethodExpression: hasPaymentMethod ? 'bp.payment_method' : 'NULL',
    paymentDateExpression: hasPaymentDate ? 'bp.payment_date' : 'NULL',
    actionTypeExpression: hasCollectionActionType ? 'bca.action_type' : 'NULL',
    actionAtExpression: hasCollectionActionAt ? 'bca.action_at' : 'NULL',
  }
}

function buildRoleQueues(role: AppRole, summary: DashboardSummary): DashboardQueueItem[] {
  return sanitizeDashboardQueueItems(role, getMockRoleQueues(role, summary))
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

  return sanitizeDashboardAlerts(params.role, items).slice(0, 4)
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

  return sanitizeDashboardOperationalCards('SUPER_ADMIN', cards, filters)
}

async function getReviewDbOperationalCards(
  session: AppSession,
  filters: DashboardPageFilters,
): Promise<DashboardOperationalCard[]> {
  const { startText, endText } = getMonthRange(filters)
  const digitalSources = ['DIGITAL', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'WEBSITE', 'META ADS']
  const digitalSourceConditions = digitalSources.map(() => '?').join(', ')
  await ensureSupportDismantleQueueTable()
  await ensureSupportTroubleTicketProgressTable()
  await ensureSupportTroubleTicketEscalationTable()

  const [
    hasSupportSlaDueAt,
    hasSupportSlaTroubleType,
    hasSupportSlaDurationDays,
    hasProgressId,
    hasProgressTicketId,
    hasProgressStatus,
    hasProgressFollowUpAt,
    hasProgressUpdatedAt,
    hasEscalationId,
    hasEscalationTicketId,
    hasEscalationEscalatedAt,
    hasSalesLeadStatus,
    hasSalesLeadSource,
    hasSalesOrderRequestDate,
    hasSalesOrderLeadId,
    hasSalesSubscriptionActivatedAt,
    hasSalesSurveyLeadId,
    hasSalesSurveyScheduledAt,
    hasSalesSurveyCreatedAt,
    hasBillingInvoiceId,
    hasBillingInvoiceStatus,
    hasBillingInvoiceDueDate,
    hasBillingInvoicePaidAmount,
    hasBillingInvoiceTotalAmount,
    hasBillingInvoiceBillingYear,
    hasBillingInvoiceBillingMonth,
    hasBillingInvoiceCollectionStatus,
    hasBillingInvoiceSuspendCandidate,
    hasBillingCollectionActionId,
    hasBillingCollectionActionInvoiceId,
    hasBillingCollectionActionType,
    hasBillingCollectionActionStatus,
    hasBillingCollectionActionDueFollowUpAt,
    hasInventoryItemStatus,
    hasInventoryMovementAt,
    hasInventoryRequestStatus,
  ] = await Promise.all([
    hasReviewDbColumn('support_trouble_tickets', 'sla_due_at'),
    hasReviewDbColumn('support_trouble_ticket_sla', 'trouble_type'),
    hasReviewDbColumn('support_trouble_ticket_sla', 'duration_days'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'id'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'trouble_ticket_id'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'progress_status'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'follow_up_at'),
    hasReviewDbColumn('support_trouble_ticket_progress_logs', 'updated_at'),
    hasReviewDbColumn('support_trouble_ticket_escalation_logs', 'id'),
    hasReviewDbColumn('support_trouble_ticket_escalation_logs', 'trouble_ticket_id'),
    hasReviewDbColumn('support_trouble_ticket_escalation_logs', 'escalated_at'),
    hasReviewDbColumn('sales_leads', 'status'),
    hasReviewDbColumn('sales_leads', 'source'),
    hasReviewDbColumn('sales_orders', 'request_date'),
    hasReviewDbColumn('sales_orders', 'lead_id'),
    hasReviewDbColumn('service_subscriptions', 'activated_at'),
    hasReviewDbColumn('sales_surveys', 'lead_id'),
    hasReviewDbColumn('sales_surveys', 'scheduled_at'),
    hasReviewDbColumn('sales_surveys', 'created_at'),
    hasReviewDbColumn('billing_invoices', 'id'),
    hasReviewDbColumn('billing_invoices', 'invoice_status'),
    hasReviewDbColumn('billing_invoices', 'due_date'),
    hasReviewDbColumn('billing_invoices', 'paid_amount'),
    hasReviewDbColumn('billing_invoices', 'total_amount'),
    hasReviewDbColumn('billing_invoices', 'billing_year'),
    hasReviewDbColumn('billing_invoices', 'billing_month'),
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
    hasReviewDbColumn('billing_collection_actions', 'id'),
    hasReviewDbColumn('billing_collection_actions', 'invoice_id'),
    hasReviewDbColumn('billing_collection_actions', 'action_type'),
    hasReviewDbColumn('billing_collection_actions', 'action_status'),
    hasReviewDbColumn('billing_collection_actions', 'due_follow_up_at'),
    hasReviewDbColumn('inventory_items', 'status'),
    hasReviewDbColumn('inventory_stock_movements', 'movement_at'),
    hasReviewDbColumn('inventory_item_requests', 'request_status'),
  ])

  const canJoinSupportSla = hasSupportSlaTroubleType && hasSupportSlaDurationDays
  const canUseProgressLogs =
    hasProgressId &&
    hasProgressTicketId &&
    hasProgressStatus &&
    hasProgressFollowUpAt &&
    hasProgressUpdatedAt
  const canUseEscalationLogs = hasEscalationId && hasEscalationTicketId && hasEscalationEscalatedAt

  const supportSlaJoinClause = canJoinSupportSla
    ? `LEFT JOIN support_trouble_ticket_sla sla
              ON UPPER(TRIM(sla.trouble_type)) = UPPER(TRIM(stt.type))`
    : `LEFT JOIN (
              SELECT
                NULL AS trouble_type,
                NULL AS duration_days
            ) sla
              ON 1 = 0`

  const latestProgressJoinClause = canUseProgressLogs
    ? `LEFT JOIN (
              SELECT
                progress.trouble_ticket_id,
                progress.progress_status,
                progress.follow_up_at,
                progress.updated_at
              FROM support_trouble_ticket_progress_logs progress
              INNER JOIN (
                SELECT trouble_ticket_id, MAX(id) AS latestId
                FROM support_trouble_ticket_progress_logs
                GROUP BY trouble_ticket_id
              ) latest_progress
                ON latest_progress.latestId = progress.id
            ) latest
              ON latest.trouble_ticket_id = stt.id`
    : `LEFT JOIN (
              SELECT
                NULL AS trouble_ticket_id,
                NULL AS progress_status,
                NULL AS follow_up_at,
                NULL AS updated_at
            ) latest
              ON 1 = 0`

  const latestEscalationJoinClause = canUseEscalationLogs
    ? `LEFT JOIN (
              SELECT
                escalation.trouble_ticket_id,
                escalation.escalated_at
              FROM support_trouble_ticket_escalation_logs escalation
              INNER JOIN (
                SELECT trouble_ticket_id, MAX(id) AS latestId
                FROM support_trouble_ticket_escalation_logs
                GROUP BY trouble_ticket_id
              ) latest_escalation
                ON latest_escalation.latestId = escalation.id
            ) escalations
              ON escalations.trouble_ticket_id = stt.id`
    : `LEFT JOIN (
              SELECT
                NULL AS trouble_ticket_id,
                NULL AS escalated_at
            ) escalations
              ON 1 = 0`

  const salesActiveLeadFilter = hasSalesLeadStatus
    ? `
            FROM sales_leads
            WHERE COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CANCELLED', 'DONE')`
    : `
            FROM sales_leads`
  const salesMonthlyOrderFilter = hasSalesOrderRequestDate
    ? `
            FROM sales_orders
            WHERE request_date >= ?
              AND request_date < ?`
    : `
            FROM (SELECT NULL AS request_date) sales_orders
            WHERE 1 = 0`
  const salesMonthlyOrderArgs = hasSalesOrderRequestDate ? [startText, endText] : []
  const salesMonthlyActivationFilter = hasSalesSubscriptionActivatedAt
    ? `
            FROM service_subscriptions
            WHERE activated_at IS NOT NULL
              AND activated_at >= ?
              AND activated_at < ?`
    : `
            FROM (SELECT NULL AS activated_at) service_subscriptions
            WHERE 1 = 0`
  const salesMonthlyActivationArgs = hasSalesSubscriptionActivatedAt ? [startText, endText] : []

  const digitalLeadFilter = hasSalesLeadSource
    ? `
            FROM sales_leads
            WHERE UPPER(COALESCE(source, '')) IN (${digitalSourceConditions})`
    : `
            FROM (SELECT NULL AS source) sales_leads
            WHERE 1 = 0`
  const digitalLeadArgs = hasSalesLeadSource ? [...digitalSources] : []
  const digitalOrderFilter =
    hasSalesLeadSource && hasSalesOrderLeadId && hasSalesOrderRequestDate
      ? `
            FROM sales_orders so
            JOIN sales_leads sl
              ON sl.id = so.lead_id
            WHERE UPPER(COALESCE(sl.source, '')) IN (${digitalSourceConditions})
              AND so.request_date >= ?
              AND so.request_date < ?`
      : `
            FROM (SELECT NULL AS request_date) sales_orders
            WHERE 1 = 0`
  const digitalOrderArgs =
    hasSalesLeadSource && hasSalesOrderLeadId && hasSalesOrderRequestDate
      ? [...digitalSources, startText, endText]
      : []
  const digitalSurveyDateExpression =
    hasSalesSurveyScheduledAt && hasSalesSurveyCreatedAt
      ? 'COALESCE(ss.scheduled_at, ss.created_at)'
      : hasSalesSurveyScheduledAt
        ? 'ss.scheduled_at'
        : hasSalesSurveyCreatedAt
          ? 'ss.created_at'
          : null
  const digitalSurveyFilter =
    hasSalesLeadSource && hasSalesSurveyLeadId && digitalSurveyDateExpression
      ? `
            FROM sales_surveys ss
            JOIN sales_leads sl
              ON sl.id = ss.lead_id
            WHERE UPPER(COALESCE(sl.source, '')) IN (${digitalSourceConditions})
              AND ${digitalSurveyDateExpression} >= ?
              AND ${digitalSurveyDateExpression} < ?`
      : `
            FROM (SELECT NULL AS id) sales_surveys
            WHERE 1 = 0`
  const digitalSurveyArgs =
    hasSalesLeadSource && hasSalesSurveyLeadId && digitalSurveyDateExpression
      ? [...digitalSources, startText, endText]
      : []

  const billingPeriodClauses: string[] = []
  const billingPeriodArgs: unknown[] = []
  if (hasBillingInvoiceBillingYear && hasBillingInvoiceBillingMonth) {
    billingPeriodClauses.push('(bi.billing_year = ? AND bi.billing_month = ?)')
    billingPeriodArgs.push(filters.year, filters.month)
  }
  if (hasBillingInvoiceDueDate) {
    billingPeriodClauses.push('(bi.due_date >= ? AND bi.due_date < ?)')
    billingPeriodArgs.push(startText, endText)
  }
  const billingPeriodWhere = billingPeriodClauses.length ? ` AND (${billingPeriodClauses.join(' OR ')})` : ''
  const billingCollectionOpenFilter = hasBillingInvoiceCollectionStatus
    ? ` AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') NOT IN ('WRITE_OFF', 'CLOSED')`
    : ''
  const billingBaseEnabled =
    hasBillingInvoiceStatus && hasBillingInvoicePaidAmount && hasBillingInvoiceTotalAmount && billingPeriodClauses.length > 0
  const billingOverdueCondition = `(
                ${hasBillingInvoiceStatus ? `bi.invoice_status = 'OVERDUE'` : '1 = 0'}
                OR (
                  ${hasBillingInvoiceDueDate ? 'bi.due_date < CURRENT_DATE' : '1 = 0'}
                  AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
                  AND ${hasBillingInvoiceStatus ? `bi.invoice_status NOT IN ('PAID', 'CANCELLED')` : '1 = 0'}
                )
              )`
  const canUseBillingLatestActions =
    hasBillingCollectionActionId &&
    hasBillingCollectionActionInvoiceId &&
    hasBillingCollectionActionStatus &&
    hasBillingInvoiceId
  const billingLatestActionJoinClause = canUseBillingLatestActions
    ? `JOIN (
              SELECT
                action_latest.invoice_id,
                ${hasBillingCollectionActionType ? 'action_latest.action_type' : 'NULL'} AS action_type,
                action_latest.action_status,
                ${hasBillingCollectionActionDueFollowUpAt ? 'action_latest.due_follow_up_at' : 'NULL'} AS due_follow_up_at
              FROM billing_collection_actions action_latest
              INNER JOIN (
                SELECT invoice_id, MAX(id) AS latestId
                FROM billing_collection_actions
                GROUP BY invoice_id
              ) latest_ids
                ON latest_ids.latestId = action_latest.id
            ) latest
              ON latest.invoice_id = bi.id`
    : `JOIN (
              SELECT
                NULL AS invoice_id,
                NULL AS action_type,
                NULL AS action_status,
                NULL AS due_follow_up_at
            ) latest
              ON 1 = 0`
  const suspendCandidateConditions = [
    hasBillingInvoiceSuspendCandidate ? `COALESCE(bi.suspend_candidate, 0) = 1` : '1 = 0',
    canUseBillingLatestActions && hasBillingCollectionActionType
      ? `COALESCE(UPPER(TRIM(latest.action_type)), '') = 'SUSPEND'`
      : '1 = 0',
    canUseBillingLatestActions && hasBillingCollectionActionType && hasBillingCollectionActionDueFollowUpAt
      ? `(
                  COALESCE(UPPER(TRIM(latest.action_type)), '') = 'PROMISE_TO_PAY'
                  AND latest.due_follow_up_at IS NOT NULL
                  AND latest.due_follow_up_at < CURRENT_TIMESTAMP
                )`
      : '1 = 0',
  ]

  const inventoryActiveItemFilter = hasInventoryItemStatus
    ? `
            FROM inventory_items
            WHERE status = 'ACTIVE'`
    : `
            FROM inventory_items`
  const inventoryMovementFilter = hasInventoryMovementAt
    ? `
            FROM inventory_stock_movements
            WHERE movement_at >= ?
              AND movement_at < ?`
    : `
            FROM (SELECT NULL AS movement_at) inventory_stock_movements
            WHERE 1 = 0`
  const inventoryMovementArgs = hasInventoryMovementAt ? [startText, endText] : []
  const inventoryPendingRequestFilter = hasInventoryRequestStatus
    ? `
            FROM inventory_item_requests
            WHERE UPPER(COALESCE(request_status, 'REQUEST')) = 'PENDING'`
    : `
            FROM (SELECT NULL AS request_status) inventory_item_requests
            WHERE 1 = 0`

  const supportSlaDueExpression = hasSupportSlaDueAt
    ? `COALESCE(
        stt.sla_due_at,
        CASE
          WHEN sla.duration_days IS NULL THEN NULL
          ELSE DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY)
        END
      )`
    : `CASE
        WHEN sla.duration_days IS NULL THEN NULL
        ELSE DATE_ADD(stt.opened_at, INTERVAL sla.duration_days DAY)
      END`

  const [
    hasIsolationStatus,
    hasIsolationIsArchived,
    hasDismantleHistoryClosedAt,
  ] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'is_archived'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
  ])
  const isolationActiveFilter = hasIsolationStatus
    ? `
            FROM support_isolations
            WHERE status = 'OPEN'${hasIsolationIsArchived ? `
              AND is_archived = 0` : ''}`
    : `
            FROM (SELECT 0 AS id) support_isolations
            WHERE 1 = 0`
  const monthlyDismantleFilter = hasDismantleHistoryClosedAt
    ? `
            FROM support_dismantle_history
            WHERE closed_at IS NOT NULL
              AND closed_at >= ?
              AND closed_at < ?`
    : `
            FROM (SELECT NULL AS closed_at) support_dismantle_history
            WHERE 1 = 0`
  const monthlyDismantleArgs = hasDismantleHistoryClosedAt ? [startText, endText] : []

  const [salesRows, csRows, nocRows, digitalRows, billingRows, hrRows, inventoryRows] = await Promise.all([
    runReviewDbQuery<DashboardSalesOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            ${salesActiveLeadFilter}
          ) AS activeLeads,
          (
            SELECT COUNT(*)
            ${salesMonthlyOrderFilter}
          ) AS monthlyOrders,
          (
            SELECT COUNT(*)
            ${salesMonthlyActivationFilter}
          ) AS monthlyActivations
      `,
      [...salesMonthlyOrderArgs, ...salesMonthlyActivationArgs]
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
            ${isolationActiveFilter}
          ) AS activeIsolations,
          (
            SELECT COUNT(*)
            FROM support_dismantle_queue
          ) AS openDismantles,
          (
            SELECT COUNT(*)
            ${monthlyDismantleFilter}
          ) AS monthlyDismantles
      `,
      monthlyDismantleArgs
    ),
    runReviewDbQuery<DashboardNocOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM support_trouble_tickets stt
            WHERE stt.closed_at IS NULL
              AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
          ) AS openTickets,
          (
            SELECT COUNT(*)
            FROM support_trouble_tickets stt
            ${supportSlaJoinClause}
            WHERE stt.closed_at IS NULL
              AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
              AND ${supportSlaDueExpression} IS NOT NULL
              AND ${supportSlaDueExpression} < CURRENT_TIMESTAMP
          ) AS overdueTickets,
          (
            SELECT COUNT(*)
            FROM support_trouble_tickets stt
            WHERE stt.opened_at >= ?
              AND stt.opened_at < ?
          ) AS monthlyOpenedTickets,
          (
            SELECT COUNT(*)
            FROM support_trouble_tickets stt
            ${supportSlaJoinClause}
            ${latestProgressJoinClause}
            ${latestEscalationJoinClause}
            WHERE stt.closed_at IS NULL
              AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
              AND (
                (
                  escalations.escalated_at IS NOT NULL
                  AND (latest.updated_at IS NULL OR escalations.escalated_at > latest.updated_at)
                )
                OR (
                  latest.follow_up_at IS NOT NULL
                  AND latest.follow_up_at < CURRENT_TIMESTAMP
                )
                OR (
                  ${supportSlaDueExpression} IS NOT NULL
                  AND ${supportSlaDueExpression} < CURRENT_TIMESTAMP
                )
              )
          ) AS escalationPending,
          (
            SELECT COUNT(*)
            FROM support_trouble_tickets stt
            ${latestProgressJoinClause}
            ${latestEscalationJoinClause}
            WHERE stt.closed_at IS NULL
              AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
              AND COALESCE(UPPER(TRIM(latest.progress_status)), '') IN ('ON_PROGRESS', 'FOLLOW_UP')
              AND latest.follow_up_at IS NULL
              AND (
                escalations.escalated_at IS NULL
                OR (latest.updated_at IS NOT NULL AND escalations.escalated_at <= latest.updated_at)
              )
          ) AS readyClose
      `,
      [startText, endText]
    ),
    runReviewDbQuery<DashboardDigitalOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            ${digitalLeadFilter}
          ) AS digitalLeads,
          (
            SELECT COUNT(*)
            ${digitalOrderFilter}
          ) AS digitalOrders,
          (
            SELECT COUNT(*)
            ${digitalSurveyFilter}
          ) AS digitalSurveys
      `,
      [...digitalLeadArgs, ...digitalOrderArgs, ...digitalSurveyArgs]
    ),
    runReviewDbQuery<DashboardBillingOperationalRow>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM billing_invoices bi
            WHERE ${billingBaseEnabled ? billingOverdueCondition : '1 = 0'}
              ${billingPeriodWhere}
              ${billingCollectionOpenFilter}
          ) AS overdueInvoices,
          (
            SELECT COALESCE(SUM(GREATEST(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0), 0)), 0)
            FROM billing_invoices bi
            WHERE ${billingBaseEnabled ? billingOverdueCondition : '1 = 0'}
              ${billingPeriodWhere}
              ${billingCollectionOpenFilter}
          ) AS overdueAmount,
          (
            SELECT COUNT(*)
            FROM billing_invoices bi
            WHERE ${
              billingBaseEnabled && hasBillingInvoiceStatus
                ? `bi.invoice_status = 'PARTIAL'`
                : '1 = 0'
            }
              AND COALESCE(bi.paid_amount, 0) < COALESCE(bi.total_amount, 0)
              ${billingPeriodWhere}
              ${billingCollectionOpenFilter}
          ) AS partialInvoices,
          (
            SELECT COUNT(*)
            FROM billing_invoices bi
            ${billingLatestActionJoinClause}
            WHERE ${
              billingBaseEnabled && hasBillingInvoiceStatus
                ? `COALESCE(UPPER(TRIM(bi.invoice_status)), 'ISSUED') IN ('ISSUED', 'OVERDUE', 'PARTIAL')`
                : '1 = 0'
            }
              ${
                canUseBillingLatestActions
                  ? `AND COALESCE(UPPER(TRIM(latest.action_status)), 'OPEN') = 'OPEN'`
                  : ''
              }
              ${
                hasBillingInvoiceCollectionStatus
                  ? `AND COALESCE(UPPER(TRIM(bi.collection_status)), 'REMINDER') <> 'CLOSED'`
                  : ''
              }
              AND (${suspendCandidateConditions.join('\n                OR ')})
              ${billingPeriodWhere}
          ) AS suspendCandidates
      `,
      [...billingPeriodArgs, ...billingPeriodArgs, ...billingPeriodArgs, ...billingPeriodArgs]
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
            ${inventoryActiveItemFilter}
          ) AS activeItems,
          (
            SELECT COUNT(*)
            ${inventoryMovementFilter}
          ) AS currentMonthMovements,
          (
            SELECT COUNT(*)
            ${inventoryPendingRequestFilter}
          ) AS pendingRequests
      `,
      inventoryMovementArgs
    ),
  ])

  const sales = salesRows[0] ?? { activeLeads: 0, monthlyOrders: 0, monthlyActivations: 0 }
  const cs = csRows[0] ?? { activeWorkOrders: 0, activeIsolations: 0, monthlyDismantles: 0 }
  const noc = nocRows[0] ?? {
    openTickets: 0,
    overdueTickets: 0,
    monthlyOpenedTickets: 0,
    escalationPending: 0,
    readyClose: 0,
  }
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
        return Number(noc.escalationPending ?? 0)
      case 'TT_READY_CLOSE':
        return Number(noc.readyClose ?? 0)
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
        { label: 'Perlu Eskalasi', value: formatNumber(Number(noc.escalationPending ?? 0)) },
        { label: 'Siap Close', value: formatNumber(Number(noc.readyClose ?? 0)) },
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
        { label: 'Queue Dismantle', value: formatNumber(Number(cs.openDismantles ?? 0)) },
        { label: 'Follow Up Lapangan', value: formatNumber(Math.max(0, Number(cs.openDismantles ?? 0))) },
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

  return sanitizeDashboardOperationalCards(session.role, nextCards, filters)
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
        href: '/billing#billing-action-collection-action',
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
        href: buildSupportLaneActionHref('sla', 'sla-manage', {
          focus: 'SLA_OVERDUE',
        }),
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
        href: '/customers/cs-admin?queue=Transfer+atau+Restore',
        actionLabel: 'Sinkron Restore/Terminate',
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

  return sanitizeDashboardAlerts(params.role, items).slice(0, 4)
}

function getTodayIsoDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function buildDailyActivityScopedHref(params: {
  month: string
  approvalStatus: 'PENDING' | 'REJECTED'
  divisionName?: string
  subdivisionName?: string
}) {
  const parts = [
    `month=${encodeURIComponent(params.month)}`,
    `approvalStatus=${encodeURIComponent(params.approvalStatus)}`,
    params.divisionName ? `divisionName=${encodeURIComponent(params.divisionName)}` : null,
    params.subdivisionName ? `subdivisionName=${encodeURIComponent(params.subdivisionName)}` : null,
  ].filter(Boolean)

  return `/dashboard/daily-activity?${parts.join('&')}`
}

async function getReviewDbDailyActivityApprovalQueue(session: AppSession): Promise<DashboardDailyActivityApprovalQueue> {
  const role = session.role
  const today = getTodayIsoDate()
  const month = today.slice(0, 7)

  const userOrg = role === 'SUPER_ADMIN' ? null : await resolveDailyActivityOrgContext(session)
  const divisionAliases = role === 'SUPER_ADMIN' ? [] : getDailyActivityDivisionAliases(userOrg?.divisionName ?? '')
  const subdivisionAliases =
    role === 'SUPER_ADMIN'
      ? []
      : getDailyActivitySubdivisionAliases(userOrg?.divisionName ?? '', userOrg?.subdivisionName ?? '')
  const whereDivision = divisionAliases.length
    ? `AND COALESCE(division_name, '') IN (${divisionAliases.map(() => '?').join(',')})`
    : ''
  const whereSubdivision = subdivisionAliases.length
    ? `AND COALESCE(subdivision_name, '') IN (${subdivisionAliases.map(() => '?').join(',')})`
    : ''
  const args = role === 'SUPER_ADMIN' ? [] : [...divisionAliases, ...subdivisionAliases]

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
    divisionName: normalizeDailyActivityDivisionName(String(row.divisionName ?? '')),
    subdivisionName: normalizeDailyActivitySubdivisionName(String(row.subdivisionName ?? '')),
    pendingCount: Number(row.pendingCount ?? 0),
  }))
  const totalPending = items.reduce((acc, item) => acc + item.pendingCount, 0)
  const pendingItems: DashboardDailyActivityPendingApprovalItem[] = pendingRows.map((row) => ({
    activityId: Number(row.activityId ?? 0),
    activityCode: String(row.activityCode ?? ''),
    activityDate: String(row.activityDate ?? ''),
    taskTitle: String(row.taskTitle ?? ''),
    plannedBy: String(row.plannedBy ?? ''),
    divisionName: normalizeDailyActivityDivisionName(String(row.divisionName ?? '')),
    subdivisionName: normalizeDailyActivitySubdivisionName(String(row.subdivisionName ?? '')),
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

async function getReviewDbWorklist(session: AppSession): Promise<DashboardWorkItem[]> {
  const role = session.role
  switch (role) {
    default:
      return []
    case 'OWNER':
    case 'ADMIN':
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
    case 'PENJUALAN':
    case 'SALES_MARKETING': {
      const [customerCompletenessQueryParts, salesOrderQueryParts] = await Promise.all([
        getDashboardCustomerCompletenessQueryParts(),
        getDashboardSalesOrderQueryParts(),
      ])
      const leads = await runReviewDbQuery<DashboardLeadRow>(`
        SELECT
          id AS leadId,
          customer_name AS customerName,
          status,
          marketing_name AS marketingName,
          source
        FROM sales_leads
        WHERE COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CANCELLED', 'DONE')
        ORDER BY created_at DESC, id DESC
        LIMIT 2
      `)
      const customers = customerCompletenessQueryParts.enabled
        ? await runReviewDbQuery<DashboardMarketingCustomerRow>(`
            SELECT
              c.id AS customerId,
              ${customerCompletenessQueryParts.customerCodeExpression} AS customerCode,
              ${customerCompletenessQueryParts.customerNameExpression} AS customerName,
              ${customerCompletenessQueryParts.phoneExpression} AS phone,
              ${customerCompletenessQueryParts.emailExpression} AS email,
              ${customerCompletenessQueryParts.addressExpression} AS address
            FROM crm_customers c
            ${customerCompletenessQueryParts.addressJoin}
            WHERE ${customerCompletenessQueryParts.whereClause}
            ORDER BY c.id DESC
            LIMIT 1
          `)
        : []
      const coverages = await runReviewDbQuery<DashboardCoverageRow>(`
        SELECT
          id AS coverageId,
          area_code AS areaCode,
          area_name AS areaName,
          coverage_status AS coverageStatus,
          village,
          district
        FROM sales_covered_areas
        WHERE COALESCE(UPPER(TRIM(coverage_status)), 'OPEN') NOT IN ('READY', 'ACTIVE', 'AVAILABLE')
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `)
      const orders = await runReviewDbQuery<DashboardMarketingOrderRow>(`
        SELECT
          so.id AS orderId,
          so.order_no AS orderNo,
          ${salesOrderQueryParts.customerNameExpression} AS customerName,
          so.status,
          so.order_type AS orderType,
          ${salesOrderQueryParts.marketingNameExpression} AS marketingName,
          ${salesOrderQueryParts.requestDateExpression} AS requestDate
        FROM sales_orders so
        ${salesOrderQueryParts.leadJoin}
        ${salesOrderQueryParts.customerJoin}
        WHERE COALESCE(UPPER(TRIM(so.status)), 'REGISTERED') NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
        ORDER BY ${salesOrderQueryParts.orderByExpression}
        LIMIT 1
      `)

      return [
        ...leads.map((item) => ({
          id: `lead-${item.leadId}`,
          domain: 'Sales',
          title: item.customerName,
          subtitle: item.marketingName || 'Marketing belum terisi',
          status: item.status,
          priority: 'tinggi' as const,
          detail: `Lead dari ${item.source || 'sumber belum terpetakan'} menunggu follow up awal dan validasi kebutuhan pelanggan.`,
          href: '/sales',
        })),
        ...customers.map((item) => ({
          id: `customer-${item.customerId}`,
          domain: 'Customers',
          title: item.customerName,
          subtitle: item.customerCode || 'Customer code belum terisi',
          status: 'REVIEW',
          priority: 'sedang' as const,
          detail: `Data customer belum lengkap: phone ${item.phone ? 'siap' : 'kosong'}, email ${item.email ? 'siap' : 'kosong'}, alamat ${item.address ? 'siap' : 'kosong'}.`,
          href: '/customers',
        })),
        ...coverages.map((item) => ({
          id: `coverage-${item.coverageId}`,
          domain: 'Sales',
          title: item.areaCode,
          subtitle: item.areaName,
          status: item.coverageStatus,
          priority: 'sedang' as const,
          detail: `Coverage ${item.coverageStatus} untuk area ${item.village || '-'} / ${item.district || '-'} masih perlu review survey dan kesiapan layanan.`,
          href: '/sales',
        })),
        ...orders.map((item) => ({
          id: `order-${item.orderId}`,
          domain: 'Sales',
          title: item.orderNo,
          subtitle: item.customerName,
          status: item.status,
          priority: 'tinggi' as const,
          detail: `Order ${item.orderType || '-'} dari ${item.marketingName || 'marketing belum terisi'} direquest ${formatActivityTime(item.requestDate)} dan siap didorong ke aktivasi.`,
          href: '/sales',
        })),
      ]
    }
    case 'CS_OPERATOR': {
      const [hasIsolationReason, hasIsolationDate, hasIsolationIsArchived] = await Promise.all([
        hasReviewDbColumn('support_isolations', 'reason'),
        hasReviewDbColumn('support_isolations', 'isolation_date'),
        hasReviewDbColumn('support_isolations', 'is_archived'),
      ])
      const [portIssueQueryParts, customerCompletenessQueryParts, workOrderQueryParts] = await Promise.all([
        getDashboardPortIssueQueryParts(),
        getDashboardCustomerCompletenessQueryParts(),
        getDashboardWorkOrderQueryParts(),
      ])
      const customers = customerCompletenessQueryParts.enabled
        ? await runReviewDbQuery<DashboardMarketingCustomerRow>(`
            SELECT
              c.id AS customerId,
              ${customerCompletenessQueryParts.customerCodeExpression} AS customerCode,
              ${customerCompletenessQueryParts.customerNameExpression} AS customerName,
              ${customerCompletenessQueryParts.phoneExpression} AS phone,
              ${customerCompletenessQueryParts.emailExpression} AS email,
              ${customerCompletenessQueryParts.addressExpression} AS address
            FROM crm_customers c
            ${customerCompletenessQueryParts.addressJoin}
            WHERE ${customerCompletenessQueryParts.whereClause}
            ORDER BY c.id DESC
            LIMIT 1
          `)
        : []
      const orders = await runReviewDbQuery<DashboardWorkOrderRow>(`
        SELECT
          swo.id AS workOrderId,
          swo.work_order_no AS workOrderNo,
          ${workOrderQueryParts.customerNameExpression} AS customerName,
          swo.status,
          ${workOrderQueryParts.workTypeExpression} AS workType,
          ${workOrderQueryParts.technicianNameExpression} AS technicianName,
          ${workOrderQueryParts.scheduledAtExpression} AS scheduledAt
        FROM service_work_orders swo
        ${workOrderQueryParts.salesOrderJoin}
        ${workOrderQueryParts.leadJoin}
        ${workOrderQueryParts.customerJoin}
        WHERE COALESCE(UPPER(TRIM(swo.status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
        ORDER BY ${workOrderQueryParts.orderByExpression}
        LIMIT 2
      `)
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
        LIMIT 1
      `)
      const isolations = await runReviewDbQuery<DashboardIsolationRow>(`
        SELECT
          id AS isolationId,
          customer_name AS customerName,
          status,
          ${hasIsolationReason ? 'reason' : 'NULL'} AS reason,
          ${hasIsolationDate ? 'CAST(isolation_date AS CHAR)' : 'NULL'} AS isolationDate
        FROM support_isolations
        WHERE status = 'OPEN'
          ${hasIsolationIsArchived ? 'AND is_archived = 0' : ''}
        ORDER BY ${hasIsolationDate ? 'isolation_date' : 'id'} DESC, id DESC
        LIMIT 1
      `)
      const portIssues = await runReviewDbQuery<DashboardOdpPortIssueRow>(`
        SELECT
          nop.id AS portId,
          no.code AS odpCode,
          nop.port_no AS portNo,
          nop.port_status AS portStatus,
          ${portIssueQueryParts.customerCodeExpression} AS customerCode,
          ${portIssueQueryParts.serviceNoExpression} AS serviceNo,
          ${portIssueQueryParts.installedAtExpression} AS installedAt
        FROM network_odp_ports nop
        JOIN network_odp no
          ON no.id = nop.odp_id
        ${portIssueQueryParts.serviceSubscriptionJoin}
        ${portIssueQueryParts.customerJoin}
        WHERE nop.port_status IN ('RESERVED', 'FAULTY', 'DISABLED')
        ORDER BY nop.updated_at DESC, nop.id DESC
        LIMIT 1
      `)

      return [
        ...customers.map((item) => ({
          id: `customer-${item.customerId}`,
          domain: 'Customers',
          title: item.customerName,
          subtitle: item.customerCode || 'Customer perlu dirapikan',
          status: 'REVIEW',
          priority: 'sedang' as const,
          detail: `Data customer belum lengkap: phone ${item.phone ? 'siap' : 'kosong'}, email ${item.email ? 'siap' : 'kosong'}, alamat ${item.address ? 'siap' : 'kosong'}.`,
          href: '/customers',
        })),
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
        ...tickets.map((item) => ({
          id: `tt-${item.ticketCode}`,
          domain: 'Support',
          title: item.ticketCode,
          subtitle: item.customerName,
          status: item.status,
          priority: 'tinggi' as const,
          detail: `${item.ticketType} • Ticket dasar perlu update awal sejak ${formatActivityTime(item.openedAt)}.`,
          href: '/support',
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
        ...portIssues.map((item) => ({
          id: `port-${item.portId}`,
          domain: 'Inventory',
          title: `${item.odpCode} / Port ${item.portNo}`,
          subtitle: item.customerCode || item.serviceNo || 'ODP dan port perlu dicek',
          status: item.portStatus,
          priority: 'sedang' as const,
          detail: `Port berstatus ${item.portStatus} perlu verifikasi kapasitas dan tindak lanjut inventory. Installed ${formatActivityTime(item.installedAt)}.`,
          href: '/inventory',
        })),
      ]
    }
    case 'CS_ADMIN': {
      const [
        hasIsolationSubscriptionId,
        hasSubscriptionId,
        hasSubscriptionServiceNo,
        hasIsolationReason,
        hasIsolationDate,
        hasIsolationIsArchived,
        hasDismantleQueueTransferNote,
        hasDismantleQueueTransferredAt,
      ] = await Promise.all([
        hasReviewDbColumn('support_isolations', 'subscription_id'),
        hasReviewDbColumn('service_subscriptions', 'id'),
        hasReviewDbColumn('service_subscriptions', 'service_no'),
        hasReviewDbColumn('support_isolations', 'reason'),
        hasReviewDbColumn('support_isolations', 'isolation_date'),
        hasReviewDbColumn('support_isolations', 'is_archived'),
        hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
        hasReviewDbColumn('support_dismantle_queue', 'transferred_at'),
      ])
      const isolationSubscriptionJoin =
        hasIsolationSubscriptionId && hasSubscriptionId
          ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = si.subscription_id`
          : ''
      const isolationServiceNoExpression =
        hasIsolationSubscriptionId && hasSubscriptionId && hasSubscriptionServiceNo ? 'ss.service_no' : 'NULL'
      const portIssueQueryParts = await getDashboardPortIssueQueryParts()
      const supportTicketServiceQueryParts = await getDashboardSupportTicketServiceQueryParts()
      const today = getTodayIsoDate()
      const month = today.slice(0, 7)
      const userOrg = await resolveDailyActivityOrgContext(session)
      const divisionAliases = getDailyActivityDivisionAliases(userOrg.divisionName)
      const subdivisionAliases = getDailyActivitySubdivisionAliases(userOrg.divisionName, userOrg.subdivisionName)
      const whereDivision = divisionAliases.length
        ? `AND COALESCE(division_name, '') IN (${divisionAliases.map(() => '?').join(',')})`
        : ''
      const whereSubdivision = subdivisionAliases.length
        ? `AND COALESCE(subdivision_name, '') IN (${subdivisionAliases.map(() => '?').join(',')})`
        : ''
      const orgArgs = [...divisionAliases, ...subdivisionAliases]
      const dailyActivityPendingHref = buildDailyActivityScopedHref({
        month,
        approvalStatus: 'PENDING',
        divisionName: userOrg.divisionName,
        subdivisionName: userOrg.subdivisionName,
      })
      const dailyActivityRejectedHref = buildDailyActivityScopedHref({
        month,
        approvalStatus: 'REJECTED',
        divisionName: userOrg.divisionName,
        subdivisionName: userOrg.subdivisionName,
      })

      const pendingApprovals = await runReviewDbQuery<DailyActivityApprovalPendingRow>(
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
          LIMIT 2
        `,
        orgArgs,
      )
      const rejectedActivities = await runReviewDbQuery<DashboardRejectedActivityRow>(
        `
          SELECT
            id AS activityId,
            activity_code AS activityCode,
            DATE_FORMAT(activity_date, '%Y-%m-%d') AS activityDate,
            task_title AS taskTitle,
            planned_by AS plannedBy,
            approval_notes AS approvalNotes
          FROM daily_activity_items
          WHERE approval_status = 'REJECTED'
            AND activity_date >= DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY)
            ${whereDivision}
            ${whereSubdivision}
          ORDER BY activity_date DESC, id DESC
          LIMIT 1
        `,
        orgArgs,
      )
      const restoreCandidates = await runReviewDbQuery<DashboardIsolationDecisionRow>(`
        SELECT
          si.id AS isolationId,
          si.customer_name AS customerName,
          ${isolationServiceNoExpression} AS serviceNo,
          ${hasIsolationReason ? 'si.reason' : 'NULL'} AS reason,
          ${hasIsolationDate ? 'CAST(si.isolation_date AS CHAR)' : 'NULL'} AS isolationDate,
          ${hasIsolationDate ? 'DATEDIFF(CURRENT_DATE, DATE(si.isolation_date))' : 'NULL'} AS agingDays
        FROM support_isolations si
        ${isolationSubscriptionJoin}
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = si.id
        WHERE si.status = 'OPEN'
          ${hasIsolationIsArchived ? 'AND si.is_archived = 0' : ''}
          AND dq.id IS NULL
        ORDER BY ${hasIsolationDate ? 'si.isolation_date' : 'si.id'} ASC, si.id ASC
        LIMIT 1
      `)
      await ensureSupportDismantleQueueTable()
      const terminateCandidates = await runReviewDbQuery<DashboardDismantleDecisionRow>(`
        SELECT
          dq.id AS queueId,
          si.id AS isolationId,
          si.customer_name AS customerName,
          ${isolationServiceNoExpression} AS serviceNo,
          ${hasIsolationDate ? 'CAST(si.isolation_date AS CHAR)' : 'NULL'} AS isolationDate,
          ${hasDismantleQueueTransferNote ? 'dq.transfer_note' : 'NULL'} AS transferNote,
          ${hasDismantleQueueTransferredAt ? 'CAST(dq.transferred_at AS CHAR)' : 'NULL'} AS transferredAt,
          ${hasDismantleQueueTransferredAt ? 'DATEDIFF(CURRENT_DATE, DATE(dq.transferred_at))' : 'NULL'} AS agingDays
        FROM support_dismantle_queue dq
        INNER JOIN support_isolations si
          ON si.id = dq.isolation_id
        ${isolationSubscriptionJoin}
        ORDER BY ${hasDismantleQueueTransferredAt ? 'dq.transferred_at' : 'dq.id'} ASC, dq.id ASC
        LIMIT 1
      `)
      const highRiskTickets = await runReviewDbQuery<DashboardHighRiskTicketRow>(`
        SELECT
          ticket_code AS ticketCode,
          customer_name AS customerName,
          ${supportTicketServiceQueryParts.serviceNoExpression} AS serviceNo,
          support_trouble_tickets.status AS status,
          type AS ticketType,
          CAST(opened_at AS CHAR) AS openedAt,
          TIMESTAMPDIFF(HOUR, opened_at, CURRENT_TIMESTAMP) AS agingHours
        FROM support_trouble_tickets
        ${supportTicketServiceQueryParts.serviceSubscriptionJoin}
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(support_trouble_tickets.status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
          AND opened_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)
        ORDER BY agingHours DESC, opened_at ASC
        LIMIT 1
      `)
      const portIssues = await runReviewDbQuery<DashboardOdpPortIssueRow>(`
        SELECT
          nop.id AS portId,
          no.code AS odpCode,
          nop.port_no AS portNo,
          nop.port_status AS portStatus,
          ${portIssueQueryParts.customerCodeExpression} AS customerCode,
          ${portIssueQueryParts.serviceNoExpression} AS serviceNo,
          ${portIssueQueryParts.installedAtExpression} AS installedAt
        FROM network_odp_ports nop
        JOIN network_odp no
          ON no.id = nop.odp_id
        ${portIssueQueryParts.serviceSubscriptionJoin}
        ${portIssueQueryParts.customerJoin}
        WHERE nop.port_status IN ('RESERVED', 'FAULTY', 'DISABLED')
        ORDER BY nop.updated_at DESC, nop.id DESC
        LIMIT 1
      `)

      return [
        ...pendingApprovals.map((item) => ({
          id: `daily-pending-${item.activityId}`,
          domain: 'Daily Activity',
          title: item.activityCode,
          subtitle: item.plannedBy || userOrg.subdivisionName,
          status: 'PENDING',
          priority: 'tinggi' as const,
          detail: `${item.executionStatus} • ${item.taskTitle} • Menunggu approval supervisor untuk ${normalizeDailyActivityDivisionName(String(item.divisionName ?? ''))}/${normalizeDailyActivitySubdivisionName(String(item.subdivisionName ?? ''))}.`,
          href: dailyActivityPendingHref,
        })),
        ...rejectedActivities.map((item) => ({
          id: `daily-rejected-${item.activityId}`,
          domain: 'Daily Activity',
          title: item.activityCode,
          subtitle: item.plannedBy,
          status: 'REJECTED',
          priority: 'sedang' as const,
          detail: `${item.taskTitle} • Koreksi supervisor: ${item.approvalNotes?.trim() || 'Catatan revisi belum ditulis.'}`,
          href: dailyActivityRejectedHref,
        })),
        ...restoreCandidates.map((item) => ({
          id: `iso-${item.isolationId}`,
          domain: 'Support',
          title: item.customerName,
          subtitle: 'Owner Billing / Restore',
          status: 'OPEN',
          priority: 'tinggi' as const,
          detail: `${item.reason?.trim() || 'Belum ada alasan isolir'} • Isolir ${formatNumber(Number(item.agingDays ?? 0))} hari dan masih menunggu validasi restore dari Billing sejak ${formatActivityTime(item.isolationDate)}.`,
          href: buildSupportLaneActionHref('isolations', 'isolation-restore', {
            isolation: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Owner Billing / Restore'),
            focus: 'ACTIVE_ISOLATIONS',
          }),
          actionLabel: 'Proses Restore Billing',
          reason: 'Ownership utama berada di Billing untuk memutuskan apakah pelanggan dipulihkan, ditahan, atau butuh klarifikasi pembayaran.',
          owner: 'Billing / Collection',
          nextAction: 'Validasi kesiapan restore dari sisi Billing',
          blockingInfo: 'Kasus belum boleh diteruskan ke terminate sebelum keputusan Billing jelas.',
          prefillToken: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Owner Billing / Restore'),
          healthSignal: buildCaseHealthSignal({
            label: 'Butuh Follow-Up Billing',
            detail:
              'Kasus masih sehat untuk jalur restore, tetapi belum aman dipulihkan sebelum Billing menyelesaikan validasi pembayaran dan arah keputusan layanan.',
            tone: 'border-violet-200 bg-violet-50 text-violet-700',
          }),
          recommendedActions: buildCaseRecommendedActionMatrix({
            owner: 'Billing / Collection',
            items: [
              {
                label: 'Putuskan Restore Billing',
                detail: 'Validasi pembayaran dan arah recovery layanan sebelum kasus bergerak ke lane lain.',
                href: buildSupportLaneActionHref('isolations', 'isolation-restore', {
                  isolation: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Owner Billing / Restore'),
                  focus: 'ACTIVE_ISOLATIONS',
                }),
                tone: 'border-violet-200 bg-violet-50 text-violet-700',
              },
              {
                label: 'Audit Konteks Billing',
                detail: 'Baca ulang keputusan collection, invoice, dan follow-up agar restore tidak salah arah.',
                href: '/billing',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
              {
                label: 'Alihkan ke Dismantle Bila Gagal',
                detail: 'Pindahkan ke jalur terminate hanya jika Billing tidak lagi menempatkan kasus ini sebagai kandidat restore.',
                href: buildSupportLaneActionHref('dismantle', 'dismantle-approve', {
                  isolation: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Transfer Dismantle'),
                }),
                tone: 'border-rose-200 bg-rose-50 text-rose-700',
              },
            ],
          }),
          actionOutcomeSummary: buildCaseActionOutcomeSummary({
            owner: 'Billing / Collection',
            items: [
              {
                label: 'Target Hasil',
                detail: 'Billing memberi keputusan restore yang cukup jelas sehingga layanan aman dibaca sebagai kandidat pulih, bukan terminate.',
                tone: 'border-violet-200 bg-violet-50 text-violet-700',
              },
              {
                label: 'Sinyal Berhasil',
                detail: 'Arah collection, invoice, dan follow-up sudah sinkron lalu kasus tetap terkontrol di jalur restore tanpa eskalasi tambahan.',
                tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
              },
              {
                label: 'Fallback',
                detail: 'Jika restore tidak lagi layak, pindahkan ke queue dismantle agar terminate tidak tertahan di area Billing.',
                tone: 'border-rose-200 bg-rose-50 text-rose-700',
              },
            ],
          }),
          correlationSummary: buildCaseCorrelationSummary({
            customerName: item.customerName,
            serviceNo: item.serviceNo,
            owner: 'Billing / Collection',
            billing: 'Menunggu restore',
            isolation: 'Aktif',
            ttSla: 'Monitor dampak',
            dismantle: 'Belum ditransfer',
          }),
          decisionTrail: buildCaseDecisionTrail({
            owner: 'Billing / Collection',
            entries: [
              {
                label: 'Isolir dibuka',
                detail: item.reason?.trim()
                  ? `Kasus masuk isolir dengan alasan "${item.reason.trim()}".`
                  : 'Kasus masuk isolir aktif dan perlu dibaca sebagai keputusan layanan yang belum final.',
                happenedAt: item.isolationDate,
                tone: 'border-amber-200 bg-amber-50 text-amber-700',
              },
              {
                label: 'Billing menilai jalur restore',
                detail: 'Kasus belum boleh dipindah ke terminate sebelum Billing atau collection memberi arah pemulihan layanan.',
                tone: 'border-violet-200 bg-violet-50 text-violet-700',
              },
              {
                label: 'Supervisor memonitor keputusan',
                detail: 'CS_ADMIN menjaga agar kasus tetap terbaca lintas divisi sampai restore benar-benar diputuskan.',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            ],
          }),
          evidencePanel: buildCaseEvidencePanel({
            owner: 'Billing / Collection',
            items: [
              {
                label: 'Alasan isolir terakhir',
                detail: item.reason?.trim() || 'Belum ada alasan isolir tertulis pada kasus ini.',
                happenedAt: item.isolationDate,
                tone: 'border-amber-200 bg-amber-50 text-amber-700',
              },
              {
                label: 'Acuan keputusan Billing',
                detail: 'Billing masih menjadi domain yang harus memberi keputusan restore atau menahan kasus sebelum bergerak ke terminate.',
                tone: 'border-violet-200 bg-violet-50 text-violet-700',
              },
              {
                label: 'Scope layanan terkait',
                detail: item.serviceNo?.trim()
                  ? `Service aktif yang terkait adalah ${item.serviceNo.trim()}.`
                  : 'Service number belum terbaca pada snapshot supervisor saat ini.',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            ],
          }),
          handoffLinks: [
            {
              label: 'Buka Billing',
              href: '/billing',
            },
            {
              label: 'Transfer ke Dismantle CS',
              href: buildSupportLaneActionHref('dismantle', 'dismantle-approve', {
                isolation: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Transfer Dismantle'),
              }),
            },
          ],
        })),
        ...terminateCandidates.map((item) => ({
          id: `dismantle-queue-${item.queueId}`,
          domain: 'Support',
          title: item.customerName,
          subtitle: 'Owner CS & Admin CS / Dismantle',
          status: 'OPEN',
          priority: 'tinggi' as const,
          detail: `${item.transferNote?.trim() || 'Belum ada catatan transfer'} • Queue terminate aktif ${formatNumber(Number(item.agingDays ?? 0))} hari sejak ${formatActivityTime(item.transferredAt)}.`,
          href: buildSupportLaneActionHref('dismantle', 'dismantle-close', {
            dismantle: buildDismantleQueuePrefillToken(item.queueId, item.customerName, 'Close Dismantle'),
            focus: 'RECENT_DISMANTLE',
          }),
          actionLabel: 'Tutup Dismantle',
          reason: 'Ownership sudah berpindah ke CS & Admin CS untuk finalisasi terminate, close histori, atau reopen bila keputusan lapangan berubah.',
          owner: 'CS & Admin CS',
          nextAction: 'Putuskan close ke histori atau reopen ke queue aktif',
          blockingInfo: 'Kasus terminate menunggu keputusan supervisor dan catatan lapangan yang final.',
          prefillToken: buildDismantleQueuePrefillToken(item.queueId, item.customerName, 'Close Dismantle'),
          healthSignal: buildCaseHealthSignal({
            label: 'Siap Terminate',
            detail:
              'Kasus sudah bergerak melewati isolir dan aktif di queue dismantle, sehingga fokus utamanya adalah finalisasi terminate serta disposition akhir Billing.',
            tone: 'border-rose-200 bg-rose-50 text-rose-700',
          }),
          recommendedActions: buildCaseRecommendedActionMatrix({
            owner: 'CS & Admin CS',
            items: [
              {
                label: 'Finalisasi Close Dismantle',
                detail: 'Lengkapi keputusan lapangan dan pindahkan kasus ke histori terminate final.',
                href: buildSupportLaneActionHref('dismantle', 'dismantle-close', {
                  dismantle: buildDismantleQueuePrefillToken(item.queueId, item.customerName, 'Close Dismantle'),
                  focus: 'RECENT_DISMANTLE',
                }),
                tone: 'border-rose-200 bg-rose-50 text-rose-700',
              },
              {
                label: 'Sinkron Disposition Billing',
                detail: 'Pastikan write-off, disposition, atau status tagihan akhir ikut terbaca sebelum kasus ditutup penuh.',
                href: '/billing',
                tone: 'border-violet-200 bg-violet-50 text-violet-700',
              },
              {
                label: 'Rollback ke Restore Jika Berubah',
                detail: 'Kembalikan ke jalur recovery saat keputusan lapangan atau Billing berbalik dari terminate ke restore.',
                href: buildSupportLaneActionHref('isolations', 'isolation-restore', {
                  isolation: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Owner Billing / Recovery'),
                }),
                tone: 'border-amber-200 bg-amber-50 text-amber-700',
              },
            ],
          }),
          actionOutcomeSummary: buildCaseActionOutcomeSummary({
            owner: 'CS & Admin CS',
            items: [
              {
                label: 'Target Hasil',
                detail: 'Kasus terminate ditutup ke histori dengan metadata lapangan dan disposition Billing yang sudah cukup final.',
                tone: 'border-rose-200 bg-rose-50 text-rose-700',
              },
              {
                label: 'Sinyal Berhasil',
                detail: 'Queue dismantle tidak lagi aktif untuk customer yang sama dan keputusan close tidak perlu dibuka ulang oleh supervisor.',
                tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
              },
              {
                label: 'Fallback',
                detail: 'Jika keputusan lapangan berubah atau disposition belum kuat, rollback ke restore atau reopen sebelum close final dipaksakan.',
                tone: 'border-amber-200 bg-amber-50 text-amber-700',
              },
            ],
          }),
          correlationSummary: buildCaseCorrelationSummary({
            customerName: item.customerName,
            serviceNo: item.serviceNo,
            owner: 'CS & Admin CS',
            billing: 'Cek disposition',
            isolation: 'Sudah diisolir',
            ttSla: 'Pastikan aman',
            dismantle: 'Queue aktif',
          }),
          decisionTrail: buildCaseDecisionTrail({
            owner: 'CS & Admin CS',
            entries: [
              {
                label: 'Isolir aktif lebih dulu',
                detail: 'Kasus sudah melalui fase isolir sebelum diteruskan ke terminate atau close dismantle.',
                happenedAt: item.isolationDate,
                tone: 'border-amber-200 bg-amber-50 text-amber-700',
              },
              {
                label: 'Transfer ke queue dismantle',
                detail: item.transferNote?.trim()
                  ? `Catatan transfer: ${item.transferNote.trim()}`
                  : 'Kasus dipindahkan ke queue dismantle aktif untuk finalisasi lapangan.',
                happenedAt: item.transferredAt,
                tone: 'border-rose-200 bg-rose-50 text-rose-700',
              },
              {
                label: 'Menunggu close final dan disposition Billing',
                detail: 'CS & Admin CS menutup terminasi lapangan, sementara Billing tetap perlu membaca disposition akhir pelanggan.',
                tone: 'border-violet-200 bg-violet-50 text-violet-700',
              },
            ],
          }),
          evidencePanel: buildCaseEvidencePanel({
            owner: 'CS & Admin CS',
            items: [
              {
                label: 'Catatan transfer terakhir',
                detail: item.transferNote?.trim() || 'Belum ada catatan transfer tertulis pada queue dismantle ini.',
                happenedAt: item.transferredAt,
                tone: 'border-rose-200 bg-rose-50 text-rose-700',
              },
              {
                label: 'Jejak fase isolir',
                detail: 'Kasus sudah melalui fase isolir sebelum dipindahkan ke queue terminate aktif.',
                happenedAt: item.isolationDate,
                tone: 'border-amber-200 bg-amber-50 text-amber-700',
              },
              {
                label: 'Scope layanan terkait',
                detail: item.serviceNo?.trim()
                  ? `Service aktif yang terkait adalah ${item.serviceNo.trim()}.`
                  : 'Service number belum terbaca pada snapshot queue terminate saat ini.',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            ],
          }),
          handoffLinks: [
            {
              label: 'Kembali ke Restore Billing',
              href: buildSupportLaneActionHref('isolations', 'isolation-restore', {
                isolation: buildIsolationPrefillToken(item.isolationId, item.customerName, 'Owner Billing / Recovery'),
              }),
            },
            {
              label: 'Buka Billing',
              href: '/billing',
            },
          ],
        })),
        ...highRiskTickets.map((item) => ({
          id: `tt-risk-${item.ticketCode}`,
          domain: 'Support',
          title: item.ticketCode,
          subtitle: item.customerName,
          status: 'PENDING',
          priority: 'tinggi' as const,
          detail: `${item.ticketType} • Ticket sudah terbuka ${formatNumber(Number(item.agingHours ?? 0))} jam dan perlu keputusan supervisor.`,
          href: buildSupportLaneActionHref('tt', 'ticket-progress', {
            ticket: item.ticketCode,
            focus: 'OPEN_TICKETS',
          }),
          actionLabel: 'Update Ticket',
          owner: 'NOC / TT',
          nextAction: 'Perbarui progres ticket dulu, lalu tentukan apakah perlu eskalasi atau siap ditutup.',
          healthSignal: buildCaseHealthSignal({
            label: 'Ticket Kritis',
            detail:
              'Kasus masih berada di jalur troubleshooting dan perlu kontrol supervisor agar progres teknis, eskalasi, dan keputusan tindak lanjut tidak mandek.',
            tone: 'border-orange-200 bg-orange-50 text-orange-700',
          }),
          recommendedActions: buildCaseRecommendedActionMatrix({
            owner: 'NOC / TT',
            items: [
              {
                label: 'Update Progress Ticket',
                detail: 'Tuliskan progres teknis terbaru agar supervisor membaca arah penanganan yang paling mutakhir.',
                href: buildSupportLaneActionHref('tt', 'ticket-progress', {
                  ticket: item.ticketCode,
                  focus: 'OPEN_TICKETS',
                }),
                tone: 'border-sky-200 bg-sky-50 text-sky-700',
              },
              {
                label: 'Eskalasi Bila Tetap Mandek',
                detail: 'Naikkan ticket jika hambatan teknis belum terselesaikan setelah progress terbaru dicatat.',
                href: buildSupportLaneActionHref('tt', 'ticket-escalate', {
                  ticket: item.ticketCode,
                  focus: 'OPEN_TICKETS',
                }),
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
              {
                label: 'Pantau Dampak Layanan',
                detail: 'Gunakan lane SLA hanya bila konteks SLA benar-benar perlu dikontrol setelah progres teknis dibaca ulang.',
                href: buildSupportLaneHref('sla', {
                  focus: 'OPEN_TICKETS',
                }),
                tone: 'border-orange-200 bg-orange-50 text-orange-700',
              },
            ],
          }),
          actionOutcomeSummary: buildCaseActionOutcomeSummary({
            owner: 'NOC / TT',
            items: [
              {
                label: 'Target Hasil',
                detail: 'Ticket kembali berada di jalur progress yang jelas, punya keputusan teknis berikutnya, dan siap dipantau atau ditutup secara aman.',
                tone: 'border-orange-200 bg-orange-50 text-orange-700',
              },
              {
                label: 'Sinyal Berhasil',
                detail: 'Ada progres teknis yang jelas, update ticket terbaru terbaca, dan supervisor tidak lagi melihat kasus ini sebagai backlog kritis tanpa arah.',
                tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
              },
              {
                label: 'Fallback',
                detail: 'Jika progres teknis tetap mandek, eskalasi ticket agar penanganan tidak berhenti di level operator.',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            ],
          }),
          correlationSummary: buildCaseCorrelationSummary({
            customerName: item.customerName,
            serviceNo: item.serviceNo,
            owner: 'NOC / TT',
            billing: 'Pantau dampak',
            isolation: 'Cek bila perlu',
            ttSla: 'Perlu kontrol',
            dismantle: 'Belum prioritas',
          }),
          decisionTrail: buildCaseDecisionTrail({
            owner: 'NOC / TT',
            entries: [
              {
                label: 'Ticket dibuka',
                detail: `Ticket ${item.ticketType} aktif dan perlu penyelesaian teknis sebelum kasus bergeser ke keputusan layanan lain.`,
                happenedAt: item.openedAt,
                tone: 'border-sky-200 bg-sky-50 text-sky-700',
              },
              {
                label: 'Aging melewati ambang pantau',
                detail: `Aging ${formatNumber(item.agingHours)} jam menandakan supervisor perlu mengontrol progres, eskalasi, atau penutupan.`,
                tone: 'border-orange-200 bg-orange-50 text-orange-700',
              },
              {
                label: 'Owner terakhir tetap NOC / TT',
                detail: 'Billing, Isolir, atau Dismantle hanya perlu ikut membaca dampak kasus ini setelah jalur troubleshooting benar-benar jelas.',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            ],
          }),
          evidencePanel: buildCaseEvidencePanel({
            owner: 'NOC / TT',
            items: [
              {
                label: 'Ticket aktif terakhir',
                detail: `Ticket ${item.ticketType} masih berstatus ${item.status} dan belum ditutup.`,
                happenedAt: item.openedAt,
                tone: 'border-sky-200 bg-sky-50 text-sky-700',
              },
              {
                label: 'Sinyal aging kritis',
                detail: `Aging ${formatNumber(item.agingHours)} jam menunjukkan kasus ini sudah melewati ambang pantau normal dan perlu kontrol supervisor.`,
                tone: 'border-orange-200 bg-orange-50 text-orange-700',
              },
              {
                label: 'Scope layanan terkait',
                detail: item.serviceNo?.trim()
                  ? `Service aktif yang terkait adalah ${item.serviceNo.trim()}.`
                  : 'Service number belum terbaca pada snapshot ticket kritis saat ini.',
                tone: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            ],
          }),
          handoffLinks: [
            {
              label: 'Update Progress TT',
              href: buildSupportLaneActionHref('tt', 'ticket-progress', {
                ticket: item.ticketCode,
                focus: 'OPEN_TICKETS',
              }),
            },
            {
              label: 'Eskalasi Ticket',
              href: buildSupportLaneActionHref('tt', 'ticket-escalate', {
                ticket: item.ticketCode,
                focus: 'OPEN_TICKETS',
              }),
            },
          ],
        })),
        ...portIssues.map((item) => ({
          id: `port-${item.portId}`,
          domain: 'Inventory',
          title: `${item.odpCode} / Port ${item.portNo}`,
          subtitle: item.customerCode || item.serviceNo || 'Port perlu koreksi tim',
          status: item.portStatus,
          priority: 'sedang' as const,
          detail: `Port ${item.portStatus} menahan ritme order/restore dan perlu sinkron koreksi inventory sejak ${formatActivityTime(item.installedAt)}.`,
          href: '/inventory',
        })),
      ]
    }
    case 'NOC_OPERATOR': {
      const [hasIsolationReason, hasIsolationDate, hasIsolationIsArchived] = await Promise.all([
        hasReviewDbColumn('support_isolations', 'reason'),
        hasReviewDbColumn('support_isolations', 'isolation_date'),
        hasReviewDbColumn('support_isolations', 'is_archived'),
      ])
      const portIssueQueryParts = await getDashboardPortIssueQueryParts()
      const tickets = await runReviewDbQuery<DashboardSupportRow>(`
        SELECT
          ticket_code AS ticketCode,
          customer_name AS customerName,
          status,
          type AS ticketType,
          CAST(opened_at AS CHAR) AS openedAt,
          TIMESTAMPDIFF(HOUR, opened_at, CURRENT_TIMESTAMP) AS agingHours
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
        ORDER BY opened_at DESC, id DESC
        LIMIT 5
      `)
      const isolations = await runReviewDbQuery<DashboardIsolationRow>(`
        SELECT
          id AS isolationId,
          customer_name AS customerName,
          status,
          ${hasIsolationReason ? 'reason' : 'NULL'} AS reason,
          ${hasIsolationDate ? 'CAST(isolation_date AS CHAR)' : 'NULL'} AS isolationDate
        FROM support_isolations
        WHERE status = 'OPEN'
          ${hasIsolationIsArchived ? 'AND is_archived = 0' : ''}
        ORDER BY ${hasIsolationDate ? 'isolation_date' : 'id'} DESC, id DESC
        LIMIT 2
      `)
      const portIssues = await runReviewDbQuery<DashboardOdpPortIssueRow>(`
        SELECT
          nop.id AS portId,
          no.code AS odpCode,
          nop.port_no AS portNo,
          nop.port_status AS portStatus,
          ${portIssueQueryParts.customerCodeExpression} AS customerCode,
          ${portIssueQueryParts.serviceNoExpression} AS serviceNo,
          ${portIssueQueryParts.installedAtExpression} AS installedAt
        FROM network_odp_ports nop
        JOIN network_odp no
          ON no.id = nop.odp_id
        ${portIssueQueryParts.serviceSubscriptionJoin}
        ${portIssueQueryParts.customerJoin}
        WHERE nop.port_status IN ('RESERVED', 'FAULTY', 'DISABLED')
        ORDER BY nop.updated_at DESC, nop.id DESC
        LIMIT 2
      `)

      return [
        ...tickets.map((item) => {
          const agingHours = Number(item.agingHours ?? 0)
          const isAgingCritical = agingHours >= 24

          return {
            id: `${isAgingCritical ? 'tt-risk' : 'tt'}-${item.ticketCode}`,
            domain: 'Support',
            title: item.ticketCode,
            subtitle: item.customerName,
            status: item.status,
            priority: 'tinggi' as const,
            detail: isAgingCritical
              ? `${item.ticketType} • Ticket teknis aktif ${formatNumber(agingHours)} jam dan perlu kontrol NOC sekarang.`
              : `${item.ticketType} • Ticket teknis aktif ${formatNumber(agingHours)} jam sejak ${formatActivityTime(item.openedAt)}.`,
            href: buildSupportLaneActionHref('tt', 'ticket-progress', {
              ticket: item.ticketCode,
              focus: 'OPEN_TICKETS',
            }),
            actionLabel: 'Update Ticket',
            handoffLinks: isAgingCritical
              ? [
                  {
                    label: 'Eskalasi Ticket',
                    href: buildSupportLaneActionHref('tt', 'ticket-escalate', {
                      ticket: item.ticketCode,
                      focus: 'OPEN_TICKETS',
                    }),
                  },
                ]
              : undefined,
          }
        }),
        ...isolations.map((item) => ({
          id: `iso-${item.isolationId}`,
          domain: 'Support',
          title: item.customerName,
          subtitle: 'Monitoring isolir',
          status: item.status,
          priority: 'sedang' as const,
          detail: `${item.reason?.trim() || 'Belum ada alasan isolir'} • Isolir aktif sejak ${formatActivityTime(item.isolationDate)} dan perlu monitoring jaringan.`,
          href: '/support/isolations?focus=ACTIVE_ISOLATIONS',
          actionLabel: 'Monitor isolir',
        })),
        ...portIssues.map((item) => ({
          id: `port-${item.portId}`,
          domain: 'Inventory',
          title: `${item.odpCode} / Port ${item.portNo}`,
          subtitle: item.customerCode || item.serviceNo || 'Port perlu koreksi tim',
          status: item.portStatus,
          priority: 'sedang' as const,
          detail: `Port ${item.portStatus} menahan ritme order/restore dan perlu sinkron koreksi inventory sejak ${formatActivityTime(item.installedAt)}.`,
          href: '/inventory',
        })),
      ]
    }
    case 'TT_OPERATOR': {
      const tickets = await runReviewDbQuery<DashboardSupportRow>(`
        SELECT
          ticket_code AS ticketCode,
          customer_name AS customerName,
          status,
          type AS ticketType,
          CAST(opened_at AS CHAR) AS openedAt,
          TIMESTAMPDIFF(HOUR, opened_at, CURRENT_TIMESTAMP) AS agingHours
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSE', 'CLOSED')
        ORDER BY opened_at DESC, id DESC
        LIMIT 5
      `)

      return tickets.map((item) => {
        const agingHours = Number(item.agingHours ?? 0)
        const normalizedStatus = String(item.status ?? '').trim().toUpperCase()
        const isReadyClose = ['READY', 'DONE', 'COMPLETED'].includes(normalizedStatus)
        const isEscalationCandidate = normalizedStatus.includes('ESCALAT') || agingHours >= 18
        const needsUrgentProgress = agingHours >= 24 && !isReadyClose

        return {
          id: `tt-${item.ticketCode}`,
          domain: 'Support',
          title: item.ticketCode,
          subtitle: item.customerName,
          status: isReadyClose ? 'READY' : item.status,
          priority: 'tinggi' as const,
          detail: isReadyClose
            ? `${item.ticketType} • Ticket siap close setelah progres terakhir tervalidasi.`
            : needsUrgentProgress
              ? `${item.ticketType} • Ticket perlu update progress segera setelah aktif ${formatNumber(agingHours)} jam.`
              : isEscalationCandidate
                ? `${item.ticketType} • Ticket siap eskalasi bila progres teknis masih mandek setelah ${formatNumber(agingHours)} jam.`
                : `${item.ticketType} • Ticket baru perlu update awal sejak ${formatActivityTime(item.openedAt)}.`,
          href: isReadyClose
            ? buildSupportLaneActionHref('tt', 'ticket-close', {
                ticket: item.ticketCode,
                focus: 'OPEN_TICKETS',
              })
            : buildSupportLaneActionHref('tt', 'ticket-progress', {
                ticket: item.ticketCode,
                focus: 'OPEN_TICKETS',
              }),
          actionLabel: isReadyClose ? 'Tutup Ticket' : 'Update Ticket',
          handoffLinks:
            isReadyClose || !isEscalationCandidate
              ? undefined
              : [
                  {
                    label: 'Eskalasi Ticket',
                    href: buildSupportLaneActionHref('tt', 'ticket-escalate', {
                      ticket: item.ticketCode,
                      focus: 'OPEN_TICKETS',
                    }),
                  },
                ],
        }
      })
    }
    case 'FIELD_TECHNICIAN': {
      const workOrderQueryParts = await getDashboardWorkOrderQueryParts()
      const rows = await runReviewDbQuery<DashboardWorkOrderRow>(`
        SELECT
          swo.id AS workOrderId,
          swo.work_order_no AS workOrderNo,
          ${workOrderQueryParts.customerNameExpression} AS customerName,
          swo.status,
          ${workOrderQueryParts.workTypeExpression} AS workType,
          ${workOrderQueryParts.technicianNameExpression} AS technicianName,
          ${workOrderQueryParts.scheduledAtExpression} AS scheduledAt
        FROM service_work_orders swo
        ${workOrderQueryParts.salesOrderJoin}
        ${workOrderQueryParts.leadJoin}
        ${workOrderQueryParts.customerJoin}
        WHERE COALESCE(UPPER(TRIM(swo.status)), 'OPEN') NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
        ORDER BY ${workOrderQueryParts.orderByExpression}
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
      await ensureSupportDismantleQueueTable()
      const [hasDismantleQueueTransferNote, hasDismantleQueueTransferredAt] = await Promise.all([
        hasReviewDbColumn('support_dismantle_queue', 'transfer_note'),
        hasReviewDbColumn('support_dismantle_queue', 'transferred_at'),
      ])
      const rows = await runReviewDbQuery<DashboardDismantleRow>(`
        SELECT
          dq.id AS queueId,
          0 AS dismantleId,
          si.customer_name AS customerName,
          ${hasDismantleQueueTransferNote ? 'dq.transfer_note' : 'NULL'} AS closeNote,
          NULL AS closedAt,
          ${hasDismantleQueueTransferredAt ? 'CAST(dq.transferred_at AS CHAR)' : 'NULL'} AS transferredAt
        FROM support_dismantle_queue dq
        INNER JOIN support_isolations si
          ON si.id = dq.isolation_id
        ORDER BY ${hasDismantleQueueTransferredAt ? 'dq.transferred_at' : 'dq.id'} DESC, dq.id DESC
        LIMIT 4
      `)

      return rows.map((item) => ({
        id: `dismantle-queue-${item.queueId}`,
        domain: 'Support',
        title: item.customerName,
        subtitle: 'Queue dismantle aktif',
        status: 'OPEN',
        priority: 'tinggi',
        detail: `${item.closeNote?.trim() || 'Belum ada catatan transfer'} • Masuk queue ${formatActivityTime(item.transferredAt)}.`,
        href: '/support/dismantle',
      }))
    }
    case 'DIGITAL_CREATOR': {
      const digitalSourcePlaceholders = DIGITAL_SALES_SOURCES.map(() => '?').join(', ')
      const [salesOrderQueryParts, salesSurveyQueryParts] = await Promise.all([
        getDashboardSalesOrderQueryParts(),
        getDashboardSalesSurveyQueryParts(),
      ])
      const leads = await runReviewDbQuery<DashboardLeadRow>(
        `
          SELECT
            id AS leadId,
            customer_name AS customerName,
            status,
            marketing_name AS marketingName,
            source
          FROM sales_leads
          WHERE UPPER(COALESCE(source, '')) IN (${digitalSourcePlaceholders})
          ORDER BY created_at DESC, id DESC
          LIMIT 2
        `,
        [...DIGITAL_SALES_SOURCES],
      )
      const orders = await runReviewDbQuery<DashboardDigitalOrderRow>(
        `
          SELECT
            so.id AS orderId,
            so.order_no AS orderNo,
            ${salesOrderQueryParts.customerNameExpression} AS customerName,
            so.status,
            ${salesOrderQueryParts.sourceExpression} AS source,
            so.order_type AS orderType,
            ${salesOrderQueryParts.requestDateExpression} AS requestDate
          FROM sales_orders so
          ${salesOrderQueryParts.leadJoin}
          ${salesOrderQueryParts.customerJoin}
          WHERE ${salesOrderQueryParts.sourceFilterEnabled ? `UPPER(COALESCE(${salesOrderQueryParts.sourceExpression}, '')) IN (${digitalSourcePlaceholders})` : '1 = 0'}
            AND COALESCE(UPPER(TRIM(so.status)), 'REGISTERED') NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
          ORDER BY ${salesOrderQueryParts.orderByExpression}
          LIMIT 2
        `,
        [...DIGITAL_SALES_SOURCES],
      )
      const surveys = await runReviewDbQuery<DashboardDigitalSurveyRow>(
        `
          SELECT
            ss.id AS surveyId,
            ss.survey_no AS surveyNo,
            ${salesSurveyQueryParts.customerNameExpression} AS customerName,
            ss.survey_status AS status,
            ${salesSurveyQueryParts.sourceExpression} AS source,
            ss.feasibility_status AS feasibilityStatus,
            ${salesSurveyQueryParts.scheduledAtExpression} AS scheduledAt
          FROM sales_surveys ss
          ${salesSurveyQueryParts.leadJoin}
          ${salesSurveyQueryParts.customerJoin}
          WHERE UPPER(COALESCE(${salesSurveyQueryParts.sourceExpression}, '')) IN (${digitalSourcePlaceholders})
          ORDER BY ${salesSurveyQueryParts.orderByExpression}
          LIMIT 1
        `,
        [...DIGITAL_SALES_SOURCES],
      )
      const [topSource] = await runReviewDbQuery<DashboardDigitalSourceSummaryRow>(
        `
          SELECT
            UPPER(COALESCE(source, 'DIGITAL')) AS source,
            COUNT(*) AS totalOpen
          FROM sales_leads
          WHERE UPPER(COALESCE(source, '')) IN (${digitalSourcePlaceholders})
            AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CANCELLED', 'DONE')
          GROUP BY UPPER(COALESCE(source, 'DIGITAL'))
          ORDER BY totalOpen DESC, source ASC
          LIMIT 1
        `,
        [...DIGITAL_SALES_SOURCES],
      )

      const items: DashboardWorkItem[] = [
        ...leads.map((item) => ({
          id: `digital-lead-${item.leadId}`,
          domain: 'Sales',
          title: item.customerName,
          subtitle: item.marketingName || 'Lead digital baru',
          status: item.status,
          priority: 'tinggi' as const,
          detail: `Lead digital dari ${item.source || 'DIGITAL'} menunggu follow up funnel awal.`,
          href: '/sales?focus=DIGITAL_LEADS',
        })),
        ...orders.map((item) => ({
          id: `digital-order-${item.orderId}`,
          domain: 'Sales',
          title: item.orderNo,
          subtitle: item.customerName,
          status: item.status,
          priority: 'sedang' as const,
          detail: `Order digital ${item.orderType || '-'} dari channel ${item.source || 'DIGITAL'} direquest ${formatActivityTime(item.requestDate)}.`,
          href: '/sales?focus=DIGITAL_ORDERS',
        })),
        ...surveys.map((item) => ({
          id: `digital-survey-${item.surveyId}`,
          domain: 'Sales',
          title: item.surveyNo,
          subtitle: item.customerName,
          status: item.status,
          priority: 'sedang' as const,
          detail: `Survey digital ${item.feasibilityStatus || 'PENDING'} dari channel ${item.source || 'DIGITAL'} dijadwalkan ${formatActivityTime(item.scheduledAt)}.`,
          href: '/sales?focus=DIGITAL_SURVEYS',
        })),
      ]

      if (topSource) {
        items.unshift({
          id: `digital-analytics-${String(topSource.source ?? 'DIGITAL').trim() || 'DIGITAL'}`,
          domain: 'Dashboard',
          title: `Review funnel channel ${String(topSource.source ?? 'DIGITAL').trim() || 'DIGITAL'}`,
          subtitle: `${formatNumber(Number(topSource.totalOpen ?? 0))} lead aktif`,
          status: 'REVIEW',
          priority: 'sedang',
          detail: 'Channel digital dengan lead aktif terbanyak perlu dicek performa copy, konten, dan kualitas lead sebelum diteruskan ke marketing.',
          href: '/dashboard?division=DIGITAL',
        })
      }

      return items.slice(0, 5)
    }
  }
}

async function getReviewDbDashboardSummary() {
  const [hasIsolationStatus, hasIsolationIsArchived] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'is_archived'),
  ])
  const dashboardIsolationCountFilter = hasIsolationStatus
    ? `
        SELECT COUNT(*)
        FROM support_isolations
        WHERE status = 'OPEN'${hasIsolationIsArchived ? `
          AND is_archived = 0` : ''}`
    : `
        SELECT COUNT(*)
        FROM (SELECT 0 AS id) support_isolations
        WHERE 1 = 0`
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
        ${dashboardIsolationCountFilter}
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
  const [
    hasSupportTicketNotes,
    hasSupportTicketCloseNotes,
    hasSupportTicketClosedAt,
    hasIsolationReason,
    hasIsolationDate,
    hasIsolationCloseNote,
    hasIsolationRestorationDate,
    hasDismantleHistoryCustomerName,
    hasDismantleHistoryCloseNote,
    hasDismantleHistoryClosedAt,
  ] = await Promise.all([
    hasReviewDbColumn('support_trouble_tickets', 'notes'),
    hasReviewDbColumn('support_trouble_tickets', 'close_notes'),
    hasReviewDbColumn('support_trouble_tickets', 'closed_at'),
    hasReviewDbColumn('support_isolations', 'reason'),
    hasReviewDbColumn('support_isolations', 'isolation_date'),
    hasReviewDbColumn('support_isolations', 'close_note'),
    hasReviewDbColumn('support_isolations', 'restoration_date'),
    hasReviewDbColumn('support_dismantle_history', 'customer_name'),
    hasReviewDbColumn('support_dismantle_history', 'close_note'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
  ])
  const rows = await runReviewDbQuery<SupportAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'TT_CREATE' AS actionType,
          ticket_code AS entityRef,
          customer_name AS customerName,
          ${hasSupportTicketNotes ? 'notes' : 'NULL'} AS detailText,
          opened_at AS happenedAt
        FROM support_trouble_tickets
        WHERE ${hasSupportTicketNotes ? 'notes IS NOT NULL' : '1 = 0'}
          AND ${hasSupportTicketNotes ? "notes <> ''" : '1 = 0'}
          AND ${hasSupportTicketNotes ? "notes LIKE '[Review Ticket]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'TT_CLOSE' AS actionType,
          ticket_code AS entityRef,
          customer_name AS customerName,
          ${hasSupportTicketCloseNotes ? 'close_notes' : 'NULL'} AS detailText,
          ${hasSupportTicketClosedAt ? 'closed_at' : 'NULL'} AS happenedAt
        FROM support_trouble_tickets
        WHERE ${hasSupportTicketClosedAt ? 'closed_at IS NOT NULL' : '1 = 0'}
          AND ${hasSupportTicketCloseNotes ? 'close_notes IS NOT NULL' : '1 = 0'}
          AND ${hasSupportTicketCloseNotes ? "close_notes <> ''" : '1 = 0'}
          AND ${hasSupportTicketCloseNotes ? "close_notes LIKE '[Closed via web]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'ISOLATION_CREATE' AS actionType,
          CONCAT('ISOLIR-', id) AS entityRef,
          customer_name AS customerName,
          ${hasIsolationReason ? 'reason' : 'NULL'} AS detailText,
          ${hasIsolationDate ? 'isolation_date' : 'NULL'} AS happenedAt
        FROM support_isolations
        WHERE ${hasIsolationReason ? 'reason IS NOT NULL' : '1 = 0'}
          AND ${hasIsolationReason ? "reason <> ''" : '1 = 0'}
          AND ${hasIsolationReason ? "reason LIKE '[Review Isolir]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'ISOLATION_RESTORE' AS actionType,
          CONCAT('ISOLIR-', id) AS entityRef,
          customer_name AS customerName,
          ${hasIsolationCloseNote ? 'close_note' : 'NULL'} AS detailText,
          ${hasIsolationRestorationDate ? 'restoration_date' : 'NULL'} AS happenedAt
        FROM support_isolations
        WHERE ${hasIsolationRestorationDate ? 'restoration_date IS NOT NULL' : '1 = 0'}
          AND ${hasIsolationCloseNote ? 'close_note IS NOT NULL' : '1 = 0'}
          AND ${hasIsolationCloseNote ? "close_note <> ''" : '1 = 0'}
          AND ${hasIsolationCloseNote ? "close_note LIKE '[Restored via web]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'DISMANTLE' AS actionType,
          CONCAT('DISMANTLE-', id) AS entityRef,
          ${hasDismantleHistoryCustomerName ? 'customer_name' : 'NULL'} AS customerName,
          ${hasDismantleHistoryCloseNote ? 'close_note' : 'NULL'} AS detailText,
          ${hasDismantleHistoryClosedAt ? 'closed_at' : 'NULL'} AS happenedAt
        FROM support_dismantle_history
        WHERE ${hasDismantleHistoryClosedAt ? 'closed_at IS NOT NULL' : '1 = 0'}
          AND ${hasDismantleHistoryCloseNote ? 'close_note IS NOT NULL' : '1 = 0'}
          AND ${hasDismantleHistoryCloseNote ? "close_note <> ''" : '1 = 0'}
          AND ${hasDismantleHistoryCloseNote ? "close_note LIKE '[Dismantled via web]%'" : '1 = 0'}
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
  const [hasInventoryRequestNotes, hasInventoryStockMovementNotes] = await Promise.all([
    hasReviewDbColumn('inventory_item_requests', 'request_notes'),
    hasReviewDbColumn('inventory_stock_movements', 'notes'),
  ])
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
          ${hasInventoryRequestNotes ? 'iir.request_notes' : 'NULL'} AS detailText,
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
          ${hasInventoryRequestNotes ? 'iir.request_notes' : 'NULL'} AS detailText,
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
          ${hasInventoryStockMovementNotes ? 'ism.notes' : 'NULL'} AS detailText,
          ism.movement_at AS happenedAt
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        WHERE ism.movement_type = 'IN'
          AND ${hasInventoryStockMovementNotes ? 'ism.notes IS NOT NULL' : '1 = 0'}
          AND ${hasInventoryStockMovementNotes ? "ism.notes <> ''" : '1 = 0'}
          AND ${hasInventoryStockMovementNotes ? "ism.notes LIKE '[BARANG MASUK]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'LOAN_OUT' AS actionType,
          COALESCE(ism.reference_no, CONCAT('MOVE-', ism.id)) AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ism.qty AS qty,
          ism.movement_type AS statusText,
          NULL AS actorName,
          ${hasInventoryStockMovementNotes ? 'ism.notes' : 'NULL'} AS detailText,
          ism.movement_at AS happenedAt
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        WHERE ism.movement_type = 'OUT'
          AND ${hasInventoryStockMovementNotes ? 'ism.notes IS NOT NULL' : '1 = 0'}
          AND ${hasInventoryStockMovementNotes ? "ism.notes <> ''" : '1 = 0'}
          AND ${hasInventoryStockMovementNotes ? "ism.notes LIKE '[PINJAM]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'LOAN_RETURN' AS actionType,
          COALESCE(ism.reference_no, CONCAT('MOVE-', ism.id)) AS entityRef,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          ism.qty AS qty,
          ism.movement_type AS statusText,
          NULL AS actorName,
          ${hasInventoryStockMovementNotes ? 'ism.notes' : 'NULL'} AS detailText,
          ism.movement_at AS happenedAt
        FROM inventory_stock_movements ism
        JOIN inventory_items ii
          ON ii.id = ism.item_id
        WHERE ism.movement_type = 'IN'
          AND ${hasInventoryStockMovementNotes ? 'ism.notes IS NOT NULL' : '1 = 0'}
          AND ${hasInventoryStockMovementNotes ? "ism.notes <> ''" : '1 = 0'}
          AND ${hasInventoryStockMovementNotes ? "ism.notes LIKE '[KEMBALI]%'" : '1 = 0'}
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
  const [hasBillingInvoiceNotes, hasBillingPaymentNotes, hasBillingCollectionActionNotes] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'notes'),
    hasReviewDbColumn('billing_payments', 'notes'),
    hasReviewDbColumn('billing_collection_actions', 'notes'),
  ])
  const billingAuditQueryParts = await getDashboardBillingAuditQueryParts()
  const rows = await runReviewDbQuery<BillingAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'INVOICE_CREATE' AS actionType,
          bi.invoice_no AS entityRef,
          ${billingAuditQueryParts.customerNameExpression} AS customerName,
          bi.total_amount AS amount,
          bi.invoice_status AS statusText,
          ${hasBillingInvoiceNotes ? 'bi.notes' : 'NULL'} AS detailText,
          bi.created_at AS happenedAt
        FROM billing_invoices bi
        ${billingAuditQueryParts.subscriptionJoin}
        ${billingAuditQueryParts.customerJoin}
        WHERE ${hasBillingInvoiceNotes ? 'bi.notes IS NOT NULL' : '1 = 0'}
          AND ${hasBillingInvoiceNotes ? "bi.notes <> ''" : '1 = 0'}
          AND ${hasBillingInvoiceNotes ? "bi.notes LIKE '[Review Invoice]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'INVOICE_CANCEL' AS actionType,
          bi.invoice_no AS entityRef,
          ${billingAuditQueryParts.customerNameExpression} AS customerName,
          bi.total_amount AS amount,
          bi.invoice_status AS statusText,
          ${hasBillingInvoiceNotes ? 'bi.notes' : 'NULL'} AS detailText,
          bi.updated_at AS happenedAt
        FROM billing_invoices bi
        ${billingAuditQueryParts.subscriptionJoin}
        ${billingAuditQueryParts.customerJoin}
        WHERE ${hasBillingInvoiceNotes ? 'bi.notes IS NOT NULL' : '1 = 0'}
          AND ${hasBillingInvoiceNotes ? "bi.notes <> ''" : '1 = 0'}
          AND ${hasBillingInvoiceNotes ? "bi.notes LIKE '%[Status Update]%'" : '1 = 0'}
          AND bi.invoice_status = 'CANCELLED'

        UNION ALL

        SELECT
          'PAYMENT_CREATE' AS actionType,
          bp.payment_no AS entityRef,
          ${billingAuditQueryParts.customerNameExpression} AS customerName,
          bp.amount AS amount,
          ${billingAuditQueryParts.paymentMethodExpression} AS statusText,
          ${hasBillingPaymentNotes ? 'bp.notes' : 'NULL'} AS detailText,
          ${billingAuditQueryParts.paymentDateExpression} AS happenedAt
        FROM billing_payments bp
        JOIN billing_invoices bi
          ON bi.id = bp.invoice_id
        ${billingAuditQueryParts.subscriptionJoin}
        ${billingAuditQueryParts.customerJoin}
        WHERE ${hasBillingPaymentNotes ? 'bp.notes IS NOT NULL' : '1 = 0'}
          AND ${hasBillingPaymentNotes ? "bp.notes <> ''" : '1 = 0'}
          AND ${hasBillingPaymentNotes ? "bp.notes LIKE '[Review Payment]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'COLLECTION_ACTION' AS actionType,
          bi.invoice_no AS entityRef,
          ${billingAuditQueryParts.customerNameExpression} AS customerName,
          bi.total_amount AS amount,
          ${billingAuditQueryParts.actionTypeExpression} AS statusText,
          ${hasBillingCollectionActionNotes ? 'bca.notes' : 'NULL'} AS detailText,
          ${billingAuditQueryParts.actionAtExpression} AS happenedAt
        FROM billing_collection_actions bca
        JOIN billing_invoices bi
          ON bi.id = bca.invoice_id
        ${billingAuditQueryParts.subscriptionJoin}
        ${billingAuditQueryParts.customerJoin}
        WHERE ${hasBillingCollectionActionNotes ? 'bca.notes IS NOT NULL' : '1 = 0'}
          AND ${hasBillingCollectionActionNotes ? "bca.notes <> ''" : '1 = 0'}
          AND ${hasBillingCollectionActionNotes ? "bca.notes LIKE '[Review Action]%'" : '1 = 0'}
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
  const [hasSalesLeadNotes, hasSalesSurveyTechnicalNotes, hasSalesOrderNotes, hasServiceWorkOrderNotes] =
    await Promise.all([
      hasReviewDbColumn('sales_leads', 'notes'),
      hasReviewDbColumn('sales_surveys', 'technical_notes'),
      hasReviewDbColumn('sales_orders', 'notes'),
      hasReviewDbColumn('service_work_orders', 'notes'),
    ])
  const rows = await runReviewDbQuery<SalesAuditActivityRow>(
    `
      SELECT *
      FROM (
        SELECT
          'LEAD_CREATE' AS actionType,
          CONCAT('LEAD-', sl.id) AS entityRef,
          sl.customer_name AS customerName,
          sl.status AS statusText,
          ${hasSalesLeadNotes ? 'sl.notes' : 'NULL'} AS detailText,
          sl.created_at AS happenedAt
        FROM sales_leads sl
        WHERE ${hasSalesLeadNotes ? 'sl.notes IS NOT NULL' : '1 = 0'}
          AND ${hasSalesLeadNotes ? "sl.notes <> ''" : '1 = 0'}
          AND ${hasSalesLeadNotes ? "sl.notes LIKE '[Review Lead]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'SURVEY_CREATE' AS actionType,
          ss.survey_no AS entityRef,
          sl.customer_name AS customerName,
          ss.survey_status AS statusText,
          ${hasSalesSurveyTechnicalNotes ? 'ss.technical_notes' : 'NULL'} AS detailText,
          COALESCE(ss.scheduled_at, ss.created_at) AS happenedAt
        FROM sales_surveys ss
        LEFT JOIN sales_leads sl
          ON sl.id = ss.lead_id
        WHERE ${hasSalesSurveyTechnicalNotes ? 'ss.technical_notes IS NOT NULL' : '1 = 0'}
          AND ${hasSalesSurveyTechnicalNotes ? "ss.technical_notes <> ''" : '1 = 0'}
          AND ${hasSalesSurveyTechnicalNotes ? "ss.technical_notes LIKE '[Review Survey]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'ORDER_CREATE' AS actionType,
          so.order_no AS entityRef,
          sl.customer_name AS customerName,
          so.status AS statusText,
          ${hasSalesOrderNotes ? 'so.notes' : 'NULL'} AS detailText,
          so.request_date AS happenedAt
        FROM sales_orders so
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        WHERE ${hasSalesOrderNotes ? 'so.notes IS NOT NULL' : '1 = 0'}
          AND ${hasSalesOrderNotes ? "so.notes <> ''" : '1 = 0'}
          AND ${hasSalesOrderNotes ? "so.notes LIKE '[Review Sales Order]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'WORK_ORDER_CREATE' AS actionType,
          swo.work_order_no AS entityRef,
          COALESCE(sl.customer_name, c.full_name) AS customerName,
          swo.status AS statusText,
          ${hasServiceWorkOrderNotes ? 'swo.notes' : 'NULL'} AS detailText,
          COALESCE(swo.scheduled_at, swo.created_at) AS happenedAt
        FROM service_work_orders swo
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE ${hasServiceWorkOrderNotes ? 'swo.notes IS NOT NULL' : '1 = 0'}
          AND ${hasServiceWorkOrderNotes ? "swo.notes <> ''" : '1 = 0'}
          AND ${hasServiceWorkOrderNotes ? "swo.notes LIKE '[Review Work Order]%'" : '1 = 0'}

        UNION ALL

        SELECT
          'SUBSCRIPTION_ACTIVATE' AS actionType,
          swo.work_order_no AS entityRef,
          COALESCE(sl.customer_name, c.full_name) AS customerName,
          'COMPLETED' AS statusText,
          ${hasServiceWorkOrderNotes ? 'swo.notes' : 'NULL'} AS detailText,
          COALESCE(swo.completed_at, swo.updated_at) AS happenedAt
        FROM service_work_orders swo
        LEFT JOIN sales_orders so
          ON so.id = swo.sales_order_id
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE ${hasServiceWorkOrderNotes ? 'swo.notes IS NOT NULL' : '1 = 0'}
          AND ${hasServiceWorkOrderNotes ? "swo.notes <> ''" : '1 = 0'}
          AND ${hasServiceWorkOrderNotes ? "swo.notes LIKE '%[Activation]%'" : '1 = 0'}
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

async function runSafeDashboardActivitySource<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader()
  } catch {
    return []
  }
}

async function getReviewDbActivities(role: AppRole) {
  if (role !== 'SUPER_ADMIN') {
    const importActivities = await runSafeDashboardActivitySource(() => getReviewDbImportBatchActivities())
    return importActivities.length ? importActivities : dashboardActivities
  }

  const [importAudits, supportAudits, inventoryAudits, billingAudits, salesAudits, hrAudits, userAudits, permissionAudits, rolePermissionAudits] = await Promise.all([
    runSafeDashboardActivitySource(() => getReviewDbImportAuditTimeline(8)),
    runSafeDashboardActivitySource(() => getReviewDbSupportAuditTimeline(8)),
    runSafeDashboardActivitySource(() => getReviewDbInventoryAuditTimeline(8)),
    runSafeDashboardActivitySource(() => getReviewDbBillingAuditTimeline(8)),
    runSafeDashboardActivitySource(() => getReviewDbSalesAuditTimeline(8)),
    runSafeDashboardActivitySource(() => getRecentHrAudits(8)),
    runSafeDashboardActivitySource(() => getRecentAuthUserAudits(8)),
    runSafeDashboardActivitySource(() => getRecentAuthPermissionAudits(8)),
    runSafeDashboardActivitySource(() => getRecentAuthRolePermissionAudits(8)),
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
    const importActivities = await runSafeDashboardActivitySource(() => getReviewDbImportBatchActivities())
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
      roleQueues: buildRoleQueues(role, dashboardSummary),
      worklist: getMockWorklist(role),
      operationalCards: sanitizeDashboardOperationalCards(role, buildMockOperationalCards(dashboardSummary, resolvedFilters), resolvedFilters),
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
    const [summary, activities, worklist, operationalCards, dailyActivityApprovalQueue] = await Promise.all([
      getReviewDbDashboardSummary(),
      getReviewDbActivities(role),
      getReviewDbWorklist(session),
      getReviewDbOperationalCards(session, resolvedFilters),
      getReviewDbDailyActivityApprovalQueue(session),
    ])
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
      roleQueues: buildRoleQueues(role, dashboardSummary),
      worklist: getMockWorklist(role),
      operationalCards: sanitizeDashboardOperationalCards(role, buildMockOperationalCards(dashboardSummary, resolvedFilters), resolvedFilters),
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
