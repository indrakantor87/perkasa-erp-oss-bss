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
}

export type DomainReviewSection = {
  title: string
  description: string
  rows: DomainReviewRow[]
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
}
