import type { AppSession } from '@/lib/auth-session'
import { canAccessPath, canPerformAction, getDefaultLandingPath } from '@/lib/access-control'
import { readThroughServerTtlCache } from '@/lib/server-ttl-cache'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import { getDashboardWorklistBaseData } from '@/lib/services/dashboard-service'
import { canAccessSupportLane, canUseSupportAction, normalizeSupportLane } from '@/lib/support-lanes'
import type {
  AppRole,
  DashboardDailyActivityApprovalQueue,
  SupportLaneActionKey,
  WorklistItem,
  WorklistShortcutLink,
} from '@/lib/types'

export type WorklistPageFilters = {
  queue?: string
  domain?: string
  priority?: string
  status?: string
  q?: string
  mine?: boolean
  overdue?: boolean
  selected?: string
}

const WORKLIST_QUEUE_MAP: Record<AppRole, string[]> = {
  OWNER: ['All', 'Lead Follow Up', 'Input dan Follow Up', 'Order dan Aktivasi', 'Isolir dan Dismantle', 'TT Teknis', 'Ticket Baru', 'ODP dan Port', 'Siap Dismantle', 'Import Review', 'Perlu Approval', 'Lainnya'],
  SUPER_ADMIN: ['All', 'Lead Follow Up', 'Input dan Follow Up', 'Order dan Aktivasi', 'Isolir dan Dismantle', 'TT Teknis', 'Ticket Baru', 'ODP dan Port', 'Siap Dismantle', 'Import Review', 'Perlu Approval', 'Lainnya'],
  ADMIN: ['All', 'Lead Follow Up', 'Input dan Follow Up', 'Order dan Aktivasi', 'Isolir dan Dismantle', 'TT Teknis', 'Ticket Baru', 'ODP dan Port', 'Siap Dismantle', 'Import Review', 'Perlu Approval', 'Lainnya'],
  FINANCE: ['Billing Overdue', 'Partial Payment', 'Monitoring Isolir', 'Lainnya'],
  HR: ['Absensi Hari Ini', 'Loan Aktif', 'Payroll Periode', 'Lainnya'],
  GA: ['ODP dan Port', 'Inventory Request', 'Movement Bulanan', 'Lainnya'],
  PENJUALAN: ['Lead Follow Up', 'Customer Belum Lengkap', 'Coverage dan Survey', 'Order Siap Aktivasi', 'Monitoring Support/ODP', 'Lainnya'],
  SALES_MARKETING: ['Lead Follow Up', 'Customer Belum Lengkap', 'Coverage dan Survey', 'Order Siap Aktivasi', 'Monitoring Support/ODP', 'Lainnya'],
  CS_OPERATOR: ['Input dan Follow Up', 'Order dan Aktivasi', 'Isolir dan Dismantle', 'TT Dasar', 'ODP dan Port', 'Lainnya'],
  CS_ADMIN: ['Queue CS Tim', 'Perlu Approval', 'Perlu Koreksi', 'Transfer atau Restore', 'Queue Risiko Tinggi', 'Lainnya'],
  NOC_OPERATOR: ['TT Teknis', 'SLA Kritis', 'ODP dan Port', 'Monitoring Isolir', 'Lainnya'],
  FIELD_TECHNICIAN: ['Work Order Lapangan', 'ODP dan Port', 'TT Teknis', 'Lainnya'],
  TT_OPERATOR: ['Ticket Baru', 'Follow Up Overdue', 'Siap Eskalasi', 'Siap Close', 'Lainnya'],
  DIGITAL_CREATOR: ['Campaign Draft', 'Lead Digital', 'Analytics Review', 'Lainnya'],
  DISMANTLE_OPERATOR: ['Siap Dismantle', 'On Progress', 'Perlu Catatan Close', 'Lainnya'],
}

const ROLE_QUEUE_DEFAULT: Record<AppRole, string> = {
  OWNER: 'All',
  SUPER_ADMIN: 'All',
  ADMIN: 'All',
  FINANCE: 'Billing Overdue',
  HR: 'Absensi Hari Ini',
  GA: 'ODP dan Port',
  PENJUALAN: 'Lead Follow Up',
  SALES_MARKETING: 'Lead Follow Up',
  CS_OPERATOR: 'Input dan Follow Up',
  CS_ADMIN: 'Queue CS Tim',
  NOC_OPERATOR: 'TT Teknis',
  FIELD_TECHNICIAN: 'Work Order Lapangan',
  TT_OPERATOR: 'Ticket Baru',
  DIGITAL_CREATOR: 'Campaign Draft',
  DISMANTLE_OPERATOR: 'Siap Dismantle',
}

export type WorklistSummary = {
  criticalCount: number
  followUpCount: number
  waitingCount: number
  readyCloseCount: number
}

export type WorklistBucketData = {
  queue: string
  items: WorklistItem[]
  summary: WorklistSummary
  totalCount: number
}

const WORKLIST_BASE_CACHE_TTL_MS = 10_000

function buildWorklistSessionCacheScope(session: AppSession) {
  return JSON.stringify({
    username: session.username,
    role: session.role,
    branchId: session.branchId,
    branchIds: session.branchIds,
  })
}

function isHighPriority(status: string, priority: WorklistItem['priority']) {
  if (priority === 'tinggi') return true
  return ['OPEN', 'PENDING', 'OVERDUE'].includes(status)
}

function isWaitingStatus(status: string) {
  return ['REVIEW', 'MONITOR', 'HOLD', 'WAITING'].includes(status)
}

function isReadyCloseStatus(status: string, queue: string) {
  return ['READY', 'CLOSE', 'CLOSED', 'DONE', 'COMPLETED'].includes(status) || queue.includes('Close')
}

function isOverdueItem(item: WorklistItem) {
  const haystack = `${item.status} ${item.detail} ${item.reason ?? ''}`.toLowerCase()
  if (haystack.includes('overdue') || haystack.includes('sla')) {
    return true
  }

  const normalizedStatus = String(item.status ?? '').trim().toUpperCase()
  return isHighPriority(normalizedStatus, item.priority) && !isReadyCloseStatus(normalizedStatus, item.queue)
}

function getActionLabel(domain: string, role: AppRole) {
  const normalizedDomain = String(domain).trim().toLowerCase()
  if (normalizedDomain === 'support') {
    return role === 'TT_OPERATOR' ? 'Update ticket' : 'Buka support'
  }
  if (normalizedDomain === 'daily activity') return 'Buka approval'
  if (normalizedDomain === 'dashboard') return 'Buka dashboard'
  if (normalizedDomain === 'sales') return 'Buka penjualan'
  if (normalizedDomain === 'customers') return 'Buka customer'
  if (normalizedDomain === 'inventory') return 'Buka inventory'
  if (normalizedDomain === 'import') return 'Buka import'
  return 'Buka modul'
}

function parseHrefParts(href: string) {
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

export function canAccessWorklistHref(role: AppRole, href: string) {
  const { pathname, hash } = parseHrefParts(href)
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

function getSupportFallbackHref(role: AppRole, queue: string) {
  if (queue === 'SLA Kritis' && canAccessSupportLane(role, 'sla')) {
    return buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })
  }
  if (queue === 'Monitoring Isolir' && canAccessSupportLane(role, 'isolations')) {
    return buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })
  }
  if ((queue === 'Siap Dismantle' || queue === 'On Progress' || queue === 'Perlu Catatan Close') && canAccessSupportLane(role, 'dismantle')) {
    return buildSupportLaneHref('dismantle')
  }
  if (queue === 'Transfer atau Restore' && canAccessSupportLane(role, 'isolations')) {
    return buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })
  }
  if (canAccessSupportLane(role, 'tt')) {
    return buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })
  }
  if (canAccessSupportLane(role, 'isolations')) {
    return buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })
  }
  if (canAccessSupportLane(role, 'dismantle')) {
    return buildSupportLaneHref('dismantle')
  }
  if (canAccessSupportLane(role, 'sla')) {
    return buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })
  }
  return '/support'
}

function getWorklistFallback(role: AppRole, item: WorklistItem) {
  const domain = String(item.domain ?? '').trim().toLowerCase()

  if (domain === 'support') {
    if (item.queue === 'SLA Kritis') {
      return { href: getSupportFallbackHref(role, item.queue), actionLabel: 'Kontrol SLA' }
    }
    if (item.queue === 'Monitoring Isolir') {
      return { href: getSupportFallbackHref(role, item.queue), actionLabel: 'Monitor isolir' }
    }
    if (item.queue === 'Siap Dismantle' || item.queue === 'On Progress' || item.queue === 'Perlu Catatan Close') {
      return { href: getSupportFallbackHref(role, item.queue), actionLabel: 'Buka dismantle' }
    }
    if (role === 'TT_OPERATOR') {
      return { href: getSupportFallbackHref(role, item.queue), actionLabel: 'Update ticket' }
    }
    return { href: getSupportFallbackHref(role, item.queue), actionLabel: 'Buka support' }
  }

  const domainFallbacks = [
    domain === 'inventory' ? '/inventory' : null,
    domain === 'sales' ? '/sales' : null,
    domain === 'customers' ? '/customers' : null,
    domain === 'daily activity' ? '/dashboard/daily-activity' : null,
    domain === 'dashboard' ? '/dashboard' : null,
    domain === 'import' ? '/import' : null,
  ].filter(Boolean) as string[]

  const fallbackHref = domainFallbacks.find((href) => canAccessWorklistHref(role, href)) ?? getDefaultLandingPath(role)
  return {
    href: fallbackHref,
    actionLabel: getActionLabel(item.domain, role),
  }
}

function sanitizeShortcutLinks(role: AppRole, links?: WorklistShortcutLink[]) {
  if (!links?.length) {
    return undefined
  }

  const sanitizedLinks = links.filter((link) => canAccessWorklistHref(role, link.href))
  return sanitizedLinks.length ? sanitizedLinks : undefined
}

function canAccessBillingContext(role: AppRole) {
  return canAccessPath(role, '/billing')
}

function canAccessSupervisorContext(role: AppRole) {
  return canAccessPath(role, '/customers/cs-admin')
}

function isRoleSafeText(role: AppRole, text?: string | null) {
  const normalized = String(text ?? '').trim().toLowerCase()
  if (!normalized) {
    return true
  }

  if (!canAccessBillingContext(role) && /(billing|collection|invoice|penagihan)/i.test(normalized)) {
    return false
  }

  if (!canAccessSupervisorContext(role) && /(supervisor cs|admin cs|cs & admin cs)/i.test(normalized)) {
    return false
  }

  return true
}

function sanitizeOwnerLabel(role: AppRole, owner?: string) {
  const normalizedOwner = String(owner ?? '').trim()
  if (!normalizedOwner) {
    return undefined
  }

  if (!isRoleSafeText(role, normalizedOwner)) {
    return 'Tim terkait'
  }

  return normalizedOwner
}

function getRoleSafeReason(role: AppRole, item: WorklistItem) {
  if (isRoleSafeText(role, item.reason)) {
    return item.reason
  }
  if (String(item.domain ?? '').trim().toLowerCase() === 'support') {
    return 'Item ini tetap relevan untuk role Anda, tetapi sebagian konteks lintas tim disembunyikan.'
  }
  return 'Item ini masih membutuhkan tindak lanjut, dengan sebagian konteks detail dibatasi sesuai role.'
}

function getRoleSafeNextAction(role: AppRole, item: WorklistItem) {
  if (isRoleSafeText(role, item.nextAction)) {
    return item.nextAction
  }
  if (String(item.domain ?? '').trim().toLowerCase() === 'support') {
    return 'Buka lane kerja yang tersedia untuk role Anda lalu lanjutkan follow up operasional.'
  }
  return 'Buka modul yang tersedia untuk role Anda lalu lanjutkan tindak lanjut yang aman.'
}

function getRoleSafeBlockingInfo(role: AppRole, item: WorklistItem) {
  if (isRoleSafeText(role, item.blockingInfo)) {
    return item.blockingInfo
  }
  return 'Sebagian blocker berada pada tim lain dan disembunyikan untuk role ini.'
}

function sanitizeCorrelationSummary(role: AppRole, summary: WorklistItem['correlationSummary']) {
  if (!summary) {
    return undefined
  }

  const items = summary.items.filter((entry) => isRoleSafeText(role, `${entry.label} ${entry.value}`))
  const customer = isRoleSafeText(role, summary.customer) ? summary.customer : undefined
  const service = isRoleSafeText(role, summary.service) ? summary.service : undefined
  const owner = sanitizeOwnerLabel(role, summary.owner)

  if (!items.length && !customer && !service && !owner) {
    return undefined
  }

  return {
    ...summary,
    customer,
    service,
    owner,
    items,
  }
}

function sanitizeDecisionTrail(role: AppRole, trail: WorklistItem['decisionTrail']) {
  if (!trail) {
    return undefined
  }

  const items = trail.items.filter((entry) => isRoleSafeText(role, `${entry.label} ${entry.detail}`))
  if (!items.length) {
    return undefined
  }

  return {
    ...trail,
    owner: sanitizeOwnerLabel(role, trail.owner),
    items,
  }
}

function sanitizeEvidencePanel(role: AppRole, evidence: WorklistItem['evidencePanel']) {
  if (!evidence) {
    return undefined
  }

  const items = evidence.items.filter((entry) => isRoleSafeText(role, `${entry.label} ${entry.detail}`))
  if (!items.length) {
    return undefined
  }

  return {
    ...evidence,
    owner: sanitizeOwnerLabel(role, evidence.owner),
    items,
  }
}

function sanitizeHealthSignal(role: AppRole, signal: WorklistItem['healthSignal']) {
  if (!signal || !isRoleSafeText(role, `${signal.label} ${signal.detail}`)) {
    return undefined
  }
  return signal
}

function sanitizeActionOutcomeSummary(role: AppRole, summary: WorklistItem['actionOutcomeSummary']) {
  if (!summary) {
    return undefined
  }

  const items = summary.items.filter((entry) => isRoleSafeText(role, `${entry.label} ${entry.detail}`))
  if (!items.length) {
    return undefined
  }

  return {
    ...summary,
    owner: sanitizeOwnerLabel(role, summary.owner),
    items,
  }
}

export function sanitizeWorklistItemForRole(role: AppRole, item: WorklistItem): WorklistItem {
  const primaryAction = canAccessWorklistHref(role, item.href)
    ? { href: item.href, actionLabel: item.actionLabel }
    : getWorklistFallback(role, item)

  const recommendedActions = item.recommendedActions
    ? {
        ...item.recommendedActions,
        owner: sanitizeOwnerLabel(role, item.recommendedActions.owner),
        items: item.recommendedActions.items.filter(
          (action) => canAccessWorklistHref(role, action.href) && isRoleSafeText(role, `${action.label} ${action.detail}`),
        ),
      }
    : undefined

  return {
    ...item,
    href: primaryAction.href,
    actionLabel: primaryAction.actionLabel,
    reason: getRoleSafeReason(role, item),
    nextAction: getRoleSafeNextAction(role, item),
    owner: sanitizeOwnerLabel(role, item.owner),
    blockingInfo: getRoleSafeBlockingInfo(role, item),
    handoffLinks: sanitizeShortcutLinks(role, item.handoffLinks),
    correlationSummary: sanitizeCorrelationSummary(role, item.correlationSummary),
    decisionTrail: sanitizeDecisionTrail(role, item.decisionTrail),
    evidencePanel: sanitizeEvidencePanel(role, item.evidencePanel),
    healthSignal: sanitizeHealthSignal(role, item.healthSignal),
    actionOutcomeSummary: sanitizeActionOutcomeSummary(role, item.actionOutcomeSummary),
    recommendedActions:
      recommendedActions && recommendedActions.items.length
        ? recommendedActions
        : undefined,
  }
}

function getQueueForRole(role: AppRole, item: Pick<WorklistItem, 'id' | 'domain' | 'status' | 'priority' | 'detail'>) {
  const id = String(item.id ?? '').trim().toLowerCase()
  const domain = String(item.domain ?? '').trim().toLowerCase()
  const status = String(item.status ?? '').trim().toUpperCase()
  const detail = String(item.detail ?? '').trim().toLowerCase()

  if (role === 'SUPER_ADMIN') {
    if (id.startsWith('batch-') || domain === 'import') return 'Import Review'
    if (domain === 'daily activity') return 'Perlu Approval'
    if (id.startsWith('lead-') || id.startsWith('sales-lead-')) return 'Lead Follow Up'
    if (id.startsWith('wo-') || id.startsWith('order-') || domain === 'sales') return 'Order dan Aktivasi'
    if (id.startsWith('iso-') || id.startsWith('dismantle-')) return 'Isolir dan Dismantle'
    if (domain === 'support') return 'TT Teknis'
    if (domain === 'inventory') return 'ODP dan Port'
    return 'Lainnya'
  }

  if (role === 'SALES_MARKETING') {
    if (id.startsWith('lead-') || id.startsWith('sales-lead-')) return 'Lead Follow Up'
    if (id.startsWith('customer-') || domain === 'customers') return 'Customer Belum Lengkap'
    if (id.startsWith('coverage-') || detail.includes('coverage') || detail.includes('survey')) return 'Coverage dan Survey'
    if (id.startsWith('wo-') || id.startsWith('order-') || domain === 'sales') return 'Order Siap Aktivasi'
    if (domain === 'support') return 'Monitoring Support/ODP'
    return 'Lainnya'
  }

  if (role === 'CS_OPERATOR') {
    if (id.startsWith('port-') || id.startsWith('odp-') || domain === 'inventory') return 'ODP dan Port'
    if (id.startsWith('iso-') || id.startsWith('dismantle-')) return 'Isolir dan Dismantle'
    if (id.startsWith('tt-') || domain === 'support') return 'TT Dasar'
    if (id.startsWith('wo-') || id.startsWith('order-')) return 'Order dan Aktivasi'
    if (id.startsWith('customer-') || id.startsWith('lead-') || domain === 'sales' || domain === 'customers') {
      return 'Input dan Follow Up'
    }
    return 'Lainnya'
  }

  if (role === 'CS_ADMIN') {
    if (id.startsWith('daily-rejected-') || (domain === 'daily activity' && status === 'REJECTED')) return 'Perlu Koreksi'
    if (domain === 'daily activity') return 'Perlu Approval'
    if (id.startsWith('port-') || domain === 'inventory') return 'Perlu Koreksi'
    if (id.startsWith('iso-') || id.startsWith('dismantle-')) return 'Transfer atau Restore'
    if ((id.startsWith('tt-risk-') || domain === 'support') && isHighPriority(status, item.priority)) return 'Queue Risiko Tinggi'
    if (domain === 'support' && detail.includes('approval')) return 'Perlu Approval'
    if (domain === 'sales' || domain === 'customers' || domain === 'support') return 'Queue CS Tim'
    return 'Lainnya'
  }

  if (role === 'NOC_OPERATOR') {
    if (domain === 'inventory') return 'ODP dan Port'
    if (id.startsWith('iso-')) return 'Monitoring Isolir'
    if (isOverdueItem({ ...item, queue: 'TT Teknis', actionLabel: 'Buka support', title: '', subtitle: '', href: '' })) return 'SLA Kritis'
    if (domain === 'support') return 'TT Teknis'
    return 'Lainnya'
  }

  if (role === 'FIELD_TECHNICIAN') {
    if (domain === 'inventory') return 'ODP dan Port'
    if (domain === 'support') return 'TT Teknis'
    if (domain === 'sales') return 'Work Order Lapangan'
    return 'Lainnya'
  }

  if (role === 'TT_OPERATOR') {
    if (status === 'READY' || detail.includes('siap close')) return 'Siap Close'
    if (isOverdueItem({ ...item, queue: 'Ticket Baru', actionLabel: 'Update ticket', title: '', subtitle: '', href: '' })) return 'Follow Up Overdue'
    if (detail.includes('eskalasi')) return 'Siap Eskalasi'
    if (domain === 'support') return 'Ticket Baru'
    return 'Lainnya'
  }

  if (role === 'DIGITAL_CREATOR') {
    const digitalHaystack = `${detail} ${status} ${domain}`.toLowerCase()
    if (digitalHaystack.includes('analytics') || digitalHaystack.includes('funnel') || digitalHaystack.includes('konversi') || domain === 'dashboard') {
      return 'Analytics Review'
    }
    if (digitalHaystack.includes('campaign') || digitalHaystack.includes('asset') || digitalHaystack.includes('konten') || status === 'DRAFT') {
      return 'Campaign Draft'
    }
    if (domain === 'sales' || domain === 'customers') return 'Lead Digital'
    return 'Lainnya'
  }

  if (role === 'DISMANTLE_OPERATOR') {
    if (status === 'READY' || detail.includes('catatan close')) return 'Perlu Catatan Close'
    if (status === 'ON_PROGRESS' || status === 'PROCESS') return 'On Progress'
    if (domain === 'support') return 'Siap Dismantle'
    return 'Lainnya'
  }

  return 'Lainnya'
}

function buildReason(queue: string, item: Pick<WorklistItem, 'status' | 'detail'>) {
  const status = String(item.status ?? '').trim().toUpperCase()
  const detail = String(item.detail ?? '').trim().toLowerCase()
  if (queue === 'Perlu Approval') return 'Supervisor perlu memfinalkan aktivitas harian agar performa tim valid.'
  if (queue === 'Perlu Koreksi') return 'Ada item yang harus direvisi atau disinkronkan sebelum workflow tim lanjut.'
  if (queue === 'Lead Follow Up') return 'Lead baru perlu ditindaklanjuti agar tidak dingin.'
  if (queue === 'Customer Belum Lengkap') return 'Data customer belum lengkap dan berisiko menghambat order.'
  if (queue === 'Order dan Aktivasi' || queue === 'Order Siap Aktivasi') return 'Order aktif perlu sinkronisasi jadwal dan kesiapan teknis.'
  if (queue === 'Transfer atau Restore' && detail.includes('billing')) {
    return 'Kasus isolir ini masih berada pada ownership Billing untuk memutuskan restore atau tindak lanjut penagihan.'
  }
  if (queue === 'Transfer atau Restore' && (detail.includes('terminate') || detail.includes('dismantle'))) {
    return 'Kasus ini sudah berada pada ownership CS & Admin CS untuk terminate, close histori, atau reopen.'
  }
  if (queue === 'Isolir dan Dismantle' || queue === 'Transfer atau Restore')
    return 'Kasus isolir perlu keputusan lanjut lintas support dan billing.'
  if (queue === 'TT Teknis' || queue === 'Ticket Baru') return 'Ticket support aktif masih membutuhkan progress operasional.'
  if (queue === 'ODP dan Port') return 'Kapasitas atau ketersediaan titik inventory perlu dicek.'
  if (queue === 'Queue Risiko Tinggi') return 'Ada backlog supervisor yang berisiko menahan SLA atau keputusan tim.'
  if (status === 'READY') return 'Item sudah mendekati tahap finalisasi atau handoff.'
  return String(item.detail ?? '').trim()
}

function buildNextAction(queue: string, domain: string) {
  if (queue === 'Perlu Approval' || domain === 'Daily Activity') return 'Review aktivitas lalu approve atau reject'
  if (queue === 'Perlu Koreksi') return 'Baca catatan revisi lalu arahkan koreksi tim'
  if (queue === 'Lead Follow Up') return 'Hubungi lead dan cek coverage'
  if (queue === 'Customer Belum Lengkap') return 'Lengkapi data customer'
  if (queue === 'Order dan Aktivasi' || queue === 'Order Siap Aktivasi') return 'Sinkronkan jadwal aktivasi'
  if (queue === 'Transfer atau Restore') return 'Pilih apakah Billing memulihkan layanan atau CS/Admin memfinalkan terminate'
  if (queue === 'Isolir dan Dismantle' || queue === 'Siap Dismantle') return 'Tentukan tindak lanjut support'
  if (queue === 'TT Teknis' || queue === 'Ticket Baru') return 'Update progress trouble ticket'
  if (queue === 'Queue Risiko Tinggi') return 'Prioritaskan keputusan supervisor pada backlog paling berisiko'
  if (queue === 'ODP dan Port') return 'Verifikasi ODP dan kapasitas port'
  if (domain === 'Import') return 'Review batch import terbaru'
  return 'Buka modul terkait'
}

function buildOwner(role: AppRole, subtitle: string) {
  const normalizedSubtitle = String(subtitle ?? '').trim()
  if (normalizedSubtitle) return normalizedSubtitle
  if (role === 'SUPER_ADMIN') return 'Observasi lintas role'
  return 'Tim saya'
}

function buildDueLabel(item: Pick<WorklistItem, 'priority' | 'status' | 'detail'>) {
  const status = String(item.status ?? '').trim().toUpperCase()
  const detail = String(item.detail ?? '').trim().toLowerCase()
  if (detail.includes('hari ini') || detail.includes('today')) return 'Hari ini'
  if (detail.includes('besok') || detail.includes('tomorrow')) return 'Besok'
  if (detail.includes('approval')) return 'Butuh keputusan supervisor'
  if (status === 'READY') return 'Siap ditutup'
  if (item.priority === 'tinggi') return 'Butuh tindakan hari ini'
  if (item.priority === 'sedang') return 'Monitor minggu ini'
  return 'Monitoring'
}

function upgradeDashboardItems(role: AppRole, items: Array<Omit<WorklistItem, 'queue' | 'actionLabel'> & Partial<Pick<WorklistItem, 'queue' | 'actionLabel'>>>) {
  return items.map((item) => {
    const queue = item.queue || getQueueForRole(role, item)
    return sanitizeWorklistItemForRole(role, {
      ...item,
      queue,
      actionLabel: item.actionLabel || getActionLabel(item.domain, role),
      reason: item.reason || buildReason(queue, item),
      dueLabel: item.dueLabel || buildDueLabel(item),
      owner: item.owner || buildOwner(role, item.subtitle),
      nextAction: item.nextAction || buildNextAction(queue, item.domain),
      blockingInfo:
        item.blockingInfo ||
        (String(item.status ?? '').trim().toUpperCase() === 'REVIEW' ? 'Menunggu validasi lanjutan.' : undefined),
      prefillToken: item.prefillToken || item.id,
    } satisfies WorklistItem)
  })
}

function buildDailyActivityApprovalWorklistItems(role: AppRole, approvalQueue: DashboardDailyActivityApprovalQueue): WorklistItem[] {
  if (!approvalQueue.totalPending || !approvalQueue.pendingItems.length) {
    return []
  }

  const queueLabel = role === 'CS_ADMIN' || role === 'SUPER_ADMIN' ? 'Perlu Approval' : 'Lainnya'

  return approvalQueue.pendingItems.map((item, index) => ({
    id: `daily-approval-${item.activityId}`,
    domain: 'Daily Activity',
    title: item.taskTitle || `Approval ${item.activityCode}`,
    subtitle: item.plannedBy || 'Tim operasional',
    status: 'PENDING',
    priority: index < 2 || item.executionStatus === 'PENDING' ? 'tinggi' : 'sedang',
    detail: `${item.activityCode} • ${item.divisionName || 'Tanpa divisi'}${item.subdivisionName ? ` / ${item.subdivisionName}` : ''} • ${item.executionStatus} • pending approval supervisor.`,
    href: approvalQueue.href,
    queue: queueLabel,
    actionLabel: 'Buka approval',
    reason: 'Approval supervisor diperlukan agar performa harian dan kontrol disiplin tim kembali sinkron.',
    dueLabel: 'Closing sore ini',
    owner: item.plannedBy || 'Tim saya',
    nextAction: 'Review aktivitas lalu approve atau reject',
    blockingInfo: 'Status aktivitas belum final sebelum approval selesai.',
    prefillToken: String(item.activityId),
  }))
}

function getWorklistSummary(items: WorklistItem[]): WorklistSummary {
  return items.reduce<WorklistSummary>(
    (summary, item) => {
      const status = String(item.status ?? '').trim().toUpperCase()
      if (isHighPriority(status, item.priority)) summary.criticalCount += 1
      if (['OPEN', 'PENDING', 'REVIEW'].includes(status)) summary.followUpCount += 1
      if (isWaitingStatus(status)) summary.waitingCount += 1
      if (isReadyCloseStatus(status, item.queue)) summary.readyCloseCount += 1
      return summary
    },
    { criticalCount: 0, followUpCount: 0, waitingCount: 0, readyCloseCount: 0 },
  )
}

function normalizeQueryValue(value?: string) {
  return String(value ?? '').trim().toLowerCase()
}

function filterItems(role: AppRole, items: WorklistItem[], filters: WorklistPageFilters) {
  const selectedQueue = String(filters.queue ?? '').trim()
  const normalizedDomain = normalizeQueryValue(filters.domain)
  const normalizedPriority = normalizeQueryValue(filters.priority)
  const normalizedStatus = normalizeQueryValue(filters.status)
  const normalizedKeyword = normalizeQueryValue(filters.q)

  return items.filter((item) => {
    if (role !== 'SUPER_ADMIN' && selectedQueue && selectedQueue !== getDefaultWorklistQueue(role) && item.queue !== selectedQueue) {
      return false
    }
    if (role === 'SUPER_ADMIN' && selectedQueue && selectedQueue !== 'All' && item.queue !== selectedQueue) {
      return false
    }
    if (normalizedDomain && normalizeQueryValue(item.domain) !== normalizedDomain) {
      return false
    }
    if (normalizedPriority && normalizeQueryValue(item.priority) !== normalizedPriority) {
      return false
    }
    if (normalizedStatus && !normalizeQueryValue(item.status).includes(normalizedStatus)) {
      return false
    }
    if (normalizedKeyword) {
      const haystack = [item.id, item.title, item.subtitle, item.detail, item.queue, item.reason, item.owner]
        .map((value) => normalizeQueryValue(value))
        .join(' ')
      if (!haystack.includes(normalizedKeyword)) {
        return false
      }
    }
    if (filters.overdue && !isOverdueItem(item)) {
      return false
    }
    if (filters.mine && role === 'SUPER_ADMIN') {
      return false
    }
    return true
  })
}

export function getWorklistQueues(role: AppRole) {
  return WORKLIST_QUEUE_MAP[role]
}

export function getDefaultWorklistQueue(role: AppRole) {
  return ROLE_QUEUE_DEFAULT[role]
}

export function buildWorklistHref(role: AppRole, params?: Partial<Pick<WorklistPageFilters, 'queue' | 'domain' | 'priority' | 'status' | 'q' | 'mine' | 'overdue'>>) {
  const searchParams = new URLSearchParams()
  searchParams.set('queue', params?.queue || getDefaultWorklistQueue(role))
  if (params?.domain) searchParams.set('domain', params.domain)
  if (params?.priority) searchParams.set('priority', params.priority)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.q) searchParams.set('q', params.q)
  if (params?.mine) searchParams.set('mine', '1')
  if (params?.overdue) searchParams.set('overdue', '1')
  return `/dashboard/worklist?${searchParams.toString()}`
}

async function getWorklistBaseData(session: AppSession) {
  return readThroughServerTtlCache(
    `worklist-base:${buildWorklistSessionCacheScope(session)}`,
    WORKLIST_BASE_CACHE_TTL_MS,
    async () => {
      const dashboardData = await getDashboardWorklistBaseData(session)
      const queueOptions = getWorklistQueues(session.role)
      const approvalItems = buildDailyActivityApprovalWorklistItems(session.role, dashboardData.dailyActivityApprovalQueue)
      const items = upgradeDashboardItems(session.role, [...dashboardData.worklist, ...approvalItems])

      return {
        source: dashboardData.source,
        queueOptions,
        items,
      }
    },
  )
}

const WORKLIST_RENDER_LIMIT = 200

export async function getWorklistPageData(session: AppSession, filters: WorklistPageFilters) {
  const baseData = await getWorklistBaseData(session)
  const requestedQueue = String(filters.queue ?? '').trim()
  const selectedQueue =
    requestedQueue && baseData.queueOptions.includes(requestedQueue)
      ? requestedQueue
      : getDefaultWorklistQueue(session.role)
  const filteredItems = filterItems(session.role, baseData.items, { ...filters, queue: selectedQueue })
  const selectedItemId = String(filters.selected ?? '').trim()
  const hasSelectionFilter = Boolean(selectedItemId)

  let renderItems: WorklistItem[]
  if (hasSelectionFilter) {
    const selectedFromList = filteredItems.find((item) => item.id === selectedItemId)
    const others = filteredItems.filter((item) => item.id !== selectedItemId).slice(0, WORKLIST_RENDER_LIMIT - 1)
    renderItems = selectedFromList ? [selectedFromList, ...others] : others
  } else {
    renderItems = filteredItems.slice(0, WORKLIST_RENDER_LIMIT)
  }
  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null

  return {
    source: baseData.source,
    queueOptions: baseData.queueOptions,
    selectedQueue,
    items: renderItems,
    selectedItem,
    summary: getWorklistSummary(filteredItems),
    totalCount: filteredItems.length,
    baseCount: baseData.items.length,
    renderLimit: WORKLIST_RENDER_LIMIT,
  }
}

export async function getWorklistBucketsData(session: AppSession, queues: string[]) {
  const baseData = await getWorklistBaseData(session)
  const normalizedQueues = Array.from(new Set(queues.map((queue) => String(queue).trim()).filter(Boolean)))

  const buckets: WorklistBucketData[] = normalizedQueues.map((queue) => {
    const items = baseData.items.filter((item) => item.queue === queue)
    return {
      queue,
      items,
      summary: getWorklistSummary(items),
      totalCount: items.length,
    }
  })

  return {
    source: baseData.source,
    queueOptions: baseData.queueOptions,
    baseCount: baseData.items.length,
    buckets,
  }
}
