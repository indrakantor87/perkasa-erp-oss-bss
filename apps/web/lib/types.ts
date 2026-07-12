export const APP_ROLES = [
  'SUPER_ADMIN',
  'SALES_MARKETING',
  'CS_OPERATOR',
  'CS_ADMIN',
  'NOC_OPERATOR',
  'FIELD_TECHNICIAN',
  'TT_OPERATOR',
  'DIGITAL_CREATOR',
  'DISMANTLE_OPERATOR',
] as const

export type AppRole = (typeof APP_ROLES)[number]

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole)
}

export type AccessResource =
  | 'dashboard'
  | 'daily_activity'
  | 'import_center'
  | 'sales'
  | 'customers'
  | 'support'
  | 'inventory'
  | 'hr'
  | 'billing'
  | 'access_settings'
  | 'user_settings'

export type AccessAction = 'view' | 'create' | 'update' | 'approve' | 'export' | 'manage'

export type PermissionMatrixEntry = {
  resource: AccessResource
  label: string
  actions: AccessAction[]
}

export type AppDataMode = 'mock' | 'review-db'

export type DataSourceSnapshot = {
  configuredMode: AppDataMode
  effectiveMode: AppDataMode
  isFallback: boolean
  label: string
  detail: string
}

export type NavItem = {
  title: string
  href: string
  description: string
  tone: string
}

export type DashboardSummary = {
  customers: number
  orders: number
  troubleTickets: number
  isolations: number
  inventoryItems: number
  employees: number
  overdueInvoices: number
}

export type DashboardMetric = {
  label: string
  value: string
  change: string
  note: string
}

export type DashboardOperationalDivisionKey =
  | 'ALL'
  | 'SALES'
  | 'CS'
  | 'NOC'
  | 'TT'
  | 'DISMANTLE'
  | 'DIGITAL'
  | 'BILLING'
  | 'HR'
  | 'INVENTORY'

export type DashboardOperationalCardMetric = {
  label: string
  value: string
  href?: string
  hint?: string
  hintBadges?: string[]
}

export type DashboardOperationalCard = {
  key: Exclude<DashboardOperationalDivisionKey, 'ALL'>
  title: string
  description: string
  badge: string
  href: string
  tone: string
  metrics: DashboardOperationalCardMetric[]
}

export type DashboardQueueItem = {
  title: string
  href: string
  count: string
  description: string
  accent: string
}

export type DashboardAlertItem = {
  id: string
  domain: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  detail: string
  impactSummary: string
  nextStep: string
  affectedModules: string[]
  href: string
  actionLabel: string
}

export type DashboardDailyActivityApprovalQueueItem = {
  divisionName: string
  subdivisionName: string
  pendingCount: number
}

export type DashboardDailyActivityPendingApprovalItem = {
  activityId: number
  activityCode: string
  activityDate: string
  taskTitle: string
  plannedBy: string
  divisionName: string
  subdivisionName: string
  executionStatus: string
}

export type DashboardDailyActivityApprovalQueue = {
  totalPending: number
  items: DashboardDailyActivityApprovalQueueItem[]
  pendingItems: DashboardDailyActivityPendingApprovalItem[]
  href: string
}

export type DashboardWorkItem = {
  id: string
  domain: string
  title: string
  subtitle: string
  status: string
  priority: 'tinggi' | 'sedang' | 'rendah'
  detail: string
  href: string
}

export type WorklistShortcutLink = {
  label: string
  href: string
}

export type CaseCorrelationStatus = {
  label: string
  value: string
  tone?: string
}

export type CaseCorrelationSummary = {
  customer?: string
  service?: string
  owner?: string
  items: CaseCorrelationStatus[]
}

export type CaseDecisionTrailEntry = {
  label: string
  detail: string
  happenedAt?: string
  tone?: string
}

export type CaseDecisionTrail = {
  owner?: string
  items: CaseDecisionTrailEntry[]
}

export type CaseEvidenceItem = {
  label: string
  detail: string
  happenedAt?: string
  tone?: string
}

export type CaseEvidencePanel = {
  owner?: string
  items: CaseEvidenceItem[]
}

export type CaseHealthSignal = {
  label: string
  detail: string
  tone?: string
}

export type CaseRecommendedAction = {
  label: string
  detail: string
  href: string
  tone?: string
}

export type CaseRecommendedActionMatrix = {
  owner?: string
  items: CaseRecommendedAction[]
}

export type CaseActionOutcomeItem = {
  label: string
  detail: string
  tone?: string
}

export type CaseActionOutcomeSummary = {
  owner?: string
  items: CaseActionOutcomeItem[]
}

export type WorklistItem = DashboardWorkItem & {
  queue: string
  actionLabel: string
  reason?: string
  dueLabel?: string
  owner?: string
  nextAction?: string
  blockingInfo?: string
  prefillToken?: string
  handoffLinks?: WorklistShortcutLink[]
  correlationSummary?: CaseCorrelationSummary
  decisionTrail?: CaseDecisionTrail
  evidencePanel?: CaseEvidencePanel
  healthSignal?: CaseHealthSignal
  recommendedActions?: CaseRecommendedActionMatrix
  actionOutcomeSummary?: CaseActionOutcomeSummary
}

export type ModuleCard = {
  title: string
  href: string
  description: string
  status: string
  accent: string
}

export type ActivityItem = {
  title: string
  detail: string
  at: string
}

export type ImportBatch = {
  id: string
  batchCode: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  scope: string
  sourceFileName?: string | null
  status: 'DRAFT' | 'UPLOADED' | 'MAPPED' | 'VALIDATED' | 'IMPORTED' | 'FAILED'
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  note: string
}

export type TransformStage = {
  stage: string
  title: string
  status: 'ready' | 'review' | 'done'
  href: string
  summary: string
}

export type BatchRow = {
  id: string
  legacyId: string
  normalizedKey: string
  status: 'PENDING' | 'MAPPED' | 'VALID' | 'INVALID' | 'IMPORTED' | 'SKIPPED'
  targetId: string
  note: string
}

export type ImportBatchAction = {
  id: string
  actionType: 'CREATE' | 'UPLOAD' | 'VALIDATE' | 'TRANSFORM'
  status: 'SUCCESS' | 'FAILED' | 'INFO'
  actor: string
  detail: string
  happenedAt: string
}

export type ImportBatchTransformRun = {
  id: string
  stage: TransformStage['stage']
  status: 'RUNNING' | 'SUCCESS' | 'FAILED'
  actor: string
  startedAt: string
  finishedAt: string
  durationMs: number
  executedStatements: number
  error: string
}

export type BatchDetail = {
  id: string
  title: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  scope: string
  status: ImportBatch['status']
  summary: string
  actions: ImportBatchAction[]
  transformRuns: ImportBatchTransformRun[]
  rows: BatchRow[]
}

export type AuthUserAuditItem = {
  id: string
  actionType: 'CREATE' | 'UPDATE' | 'RESET_PASSWORD'
  actor: string
  targetUser: string
  detail: string
  happenedAt: string
}

export type ImportOverview = {
  items: ImportBatch[]
  stages: TransformStage[]
  totalRows: number
  importedBatches: number
}

export type DomainKey =
  | 'sales'
  | 'customers'
  | 'support'
  | 'inventory'
  | 'hr'
  | 'billing'
  | 'access'

export type DomainSummary = {
  label: string
  value: string
}

export type DomainHighlight = {
  title: string
  detail: string
}

export type DomainReviewRow = {
  id: string
  primary: string
  secondary: string
  status: string
  detail: string
  meta: string[]
  filterTags?: string[]
}

export type DomainReviewSection = {
  title: string
  description: string
  summary?: Array<{
    label: string
    value: string
  }>
  rows: DomainReviewRow[]
}

export type SupportLaneKey = 'tt' | 'isolations' | 'dismantle' | 'sla'

export type SupportLaneSnapshot = {
  key: SupportLaneKey
  title: string
  shortLabel: string
  accent: string
  count: number
  sectionTitles: string[]
}

export type SupportLaneActionKey =
  | 'ticket-create'
  | 'ticket-progress'
  | 'ticket-escalate'
  | 'ticket-close'
  | 'sla-manage'
  | 'isolation-create'
  | 'isolation-restore'
  | 'dismantle-approve'
  | 'dismantle-close'
  | 'dismantle-reopen'

export type SupportActionLink = {
  key: SupportLaneActionKey
  label: string
  description: string
  href: string
}

export type SupportFormPrefill = {
  ticket?: string
  isolation?: string
  dismantle?: string
  dismantleHistory?: string
  type?: string
}

export type DomainFormPrefill = {
  lead?: string
  order?: string
  invoice?: string
  service?: string
  request?: string
  employee?: string
  attendance?: string
  loan?: string
  payroll?: string
}

export type SupportDrilldownContext = {
  key: string
  label: string
  detail: string
  clearHref: string
}

export type SupportLaneWorkspace = {
  lane: SupportLaneKey
  title: string
  summary: string
  checklist: string[]
  actionKeys: SupportLaneActionKey[]
  sectionTitles: string[]
  count: number
  escalationNote: string
}

export type SupportLaneReviewSummary = {
  totalRows: number
  sectionCount: number
  dominantStatus: string
  topItems: string[]
  metaHighlights: string[]
}

export type DomainSupportFocus = {
  defaultLane: SupportLaneKey
  selectedLane: SupportLaneKey | null
  activeLane: SupportLaneKey
  lanes: SupportLaneSnapshot[]
  activeWorkspace: SupportLaneWorkspace
  visibleSections: DomainReviewSection[]
  reviewSummary: SupportLaneReviewSummary
}

export type DomainCapability = {
  action: AccessAction
  label: string
  enabled: boolean
}

export type DomainPageContent = {
  key: DomainKey
  resource: AccessResource
  eyebrow: string
  title: string
  description: string
  primaryAction: { label: string; href: string }
  secondaryAction: { label: string; href: string }
  summaries: DomainSummary[]
  highlights: DomainHighlight[]
  reviewSections?: DomainReviewSection[]
}

export type DomainPageData = {
  source: DataSourceSnapshot
  content: DomainPageContent
  capabilities: DomainCapability[]
  supportFocus?: DomainSupportFocus
}
