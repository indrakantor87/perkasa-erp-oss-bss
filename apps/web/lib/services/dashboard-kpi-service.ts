import type { AppSession } from '@/lib/auth-session'
import {
  isValidDashboardKpiDivision,
  isValidDashboardKpiKey,
  isValidDashboardKpiMetricType,
  isValidDashboardKpiSubdivision,
  isValidDashboardKpiTemplate,
  resolveDashboardKpiTemplateDrilldown,
} from '@/lib/dashboard-kpi-config'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type DashboardKpiScopeType = 'SYSTEM' | 'DIVISION'
type DashboardKpiMetricType = 'COUNT' | 'SUM' | 'PERCENTAGE'

type DashboardKpiDefinitionRow = {
  id: number
  scopeType: DashboardKpiScopeType
  divisionName: string | null
  subdivisionName: string | null
  dashboardKey: string
  metricKey: string
  metricLabel: string
  metricType: DashboardKpiMetricType
  templateKey: string
  displayOrder: number
  isActive: number
  isDefault: number
  drilldownHref: string | null
  createdBy: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export type DashboardKpiDefinition = {
  id: string
  scopeType: DashboardKpiScopeType
  divisionName: string
  subdivisionName: string
  dashboardKey: string
  metricKey: string
  metricLabel: string
  metricType: DashboardKpiMetricType
  templateKey: string
  displayOrder: number
  isActive: boolean
  isDefault: boolean
  drilldownHref: string
  createdBy: string
  updatedBy: string
  updatedAt: string
}

export type DashboardKpiManagerScope = {
  divisionName: string
  subdivisionName: string
  planningLevel: string
  canManage: boolean
}

let dashboardKpiInitPromise: Promise<void> | null = null

function normalizeDashboardDivisionName(value: string) {
  const normalized = value.trim()
  if (!normalized) return ''
  if (normalized === 'Pemasaran & Pelayanan') return 'Pemasaran dan Pelayanan'
  if (normalized === 'Teknisi') return 'Teknis dan Expan'
  if (normalized === 'Finance & HR') return 'Finance dan HR'
  return normalized
}

function normalizeDashboardSubdivisionName(value: string) {
  const normalized = value.trim()
  if (!normalized) return ''
  if (normalized === 'Digital Creator') return 'Creator Digital'
  if (normalized === 'Dismantle Operasional') return 'Dismantle'
  if (normalized === 'Teknisi Jalur dan Expan') return 'Teknisi Jalur & Expan'
  return normalized
}

function mapDefinitionRow(row: DashboardKpiDefinitionRow): DashboardKpiDefinition {
  return {
    id: String(row.id),
    scopeType: row.scopeType,
    divisionName: normalizeDashboardDivisionName(String(row.divisionName ?? '')),
    subdivisionName: normalizeDashboardSubdivisionName(String(row.subdivisionName ?? '')),
    dashboardKey: String(row.dashboardKey ?? '').trim(),
    metricKey: String(row.metricKey ?? '').trim(),
    metricLabel: String(row.metricLabel ?? '').trim(),
    metricType: row.metricType,
    templateKey: String(row.templateKey ?? '').trim(),
    displayOrder: Number(row.displayOrder ?? 0),
    isActive: Number(row.isActive ?? 0) === 1,
    isDefault: Number(row.isDefault ?? 0) === 1,
    drilldownHref: String(row.drilldownHref ?? '').trim(),
    createdBy: String(row.createdBy ?? '').trim(),
    updatedBy: String(row.updatedBy ?? '').trim(),
    updatedAt: String(row.updatedAt ?? '').trim(),
  }
}

export async function ensureDashboardKpiTables() {
  if (!dashboardKpiInitPromise) {
    dashboardKpiInitPromise = (async () => {
      await runReviewDbExecute<ExecuteResult>(
        `
          CREATE TABLE IF NOT EXISTS dashboard_kpi_definitions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            scope_type VARCHAR(20) NOT NULL DEFAULT 'DIVISION',
            division_name VARCHAR(120) NULL,
            subdivision_name VARCHAR(150) NULL,
            dashboard_key VARCHAR(40) NOT NULL,
            metric_key VARCHAR(80) NOT NULL,
            metric_label VARCHAR(150) NOT NULL,
            metric_type VARCHAR(20) NOT NULL DEFAULT 'COUNT',
            template_key VARCHAR(80) NOT NULL,
            display_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            is_default TINYINT(1) NOT NULL DEFAULT 0,
            drilldown_href VARCHAR(255) NULL,
            created_by VARCHAR(120) NULL,
            updated_by VARCHAR(120) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_dashboard_kpi_scope_metric (
              scope_type,
              division_name,
              subdivision_name,
              dashboard_key,
              metric_key
            ),
            KEY idx_dashboard_kpi_scope (division_name, subdivision_name, dashboard_key, is_active)
          )
        `,
      )
      await runReviewDbExecute<ExecuteResult>(
        `
          CREATE TABLE IF NOT EXISTS dashboard_kpi_definition_audits (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            definition_id BIGINT UNSIGNED NULL,
            action_type VARCHAR(30) NOT NULL,
            actor VARCHAR(120) NOT NULL,
            detail_json LONGTEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_dashboard_kpi_definition_audits_ref (definition_id, action_type, created_at)
          )
        `,
      )
    })()
  }

  await dashboardKpiInitPromise
}

type DashboardKpiBaselineSeed = {
  dashboardKey: string
  metricKey: string
  metricLabel: string
  metricType: DashboardKpiMetricType
  templateKey: string
  displayOrder: number
  drilldownHref?: string
}

function getDashboardKpiBaselineSeeds(): DashboardKpiBaselineSeed[] {
  return [
    {
      dashboardKey: 'SALES',
      metricKey: 'SALES_SALES_ACTIVE_LEADS',
      metricLabel: 'Lead Aktif',
      metricType: 'COUNT',
      templateKey: 'SALES_ACTIVE_LEADS',
      displayOrder: 10,
      drilldownHref: '/sales?focus=ACTIVE_LEADS',
    },
    {
      dashboardKey: 'SALES',
      metricKey: 'SALES_SALES_MONTHLY_ORDERS',
      metricLabel: 'PSB Periode Ini',
      metricType: 'COUNT',
      templateKey: 'SALES_MONTHLY_ORDERS',
      displayOrder: 20,
      drilldownHref: '/sales?focus=MONTHLY_ORDERS',
    },
    {
      dashboardKey: 'SALES',
      metricKey: 'SALES_SALES_MONTHLY_ACTIVATIONS',
      metricLabel: 'Aktivasi',
      metricType: 'COUNT',
      templateKey: 'SALES_MONTHLY_ACTIVATIONS',
      displayOrder: 30,
      drilldownHref: '/sales?focus=MONTHLY_ACTIVATIONS',
    },
    {
      dashboardKey: 'CS',
      metricKey: 'CS_CS_ACTIVE_WORK_ORDERS',
      metricLabel: 'Work Order Aktif',
      metricType: 'COUNT',
      templateKey: 'CS_ACTIVE_WORK_ORDERS',
      displayOrder: 10,
      drilldownHref: '/support?focus=ACTIVE_WORK_ORDERS',
    },
    {
      dashboardKey: 'CS',
      metricKey: 'CS_CS_ACTIVE_ISOLATIONS',
      metricLabel: 'Total Isolir',
      metricType: 'COUNT',
      templateKey: 'CS_ACTIVE_ISOLATIONS',
      displayOrder: 20,
      drilldownHref: '/support/isolations?focus=ACTIVE_ISOLATIONS',
    },
    {
      dashboardKey: 'CS',
      metricKey: 'CS_CS_MONTHLY_DISMANTLES',
      metricLabel: 'Dismantle Periode Ini',
      metricType: 'COUNT',
      templateKey: 'CS_MONTHLY_DISMANTLES',
      displayOrder: 30,
      drilldownHref: '/support/dismantle?focus=MONTHLY_DISMANTLES',
    },
    {
      dashboardKey: 'NOC',
      metricKey: 'NOC_SUPPORT_OPEN_TICKETS',
      metricLabel: 'Trouble Ticket',
      metricType: 'COUNT',
      templateKey: 'SUPPORT_OPEN_TICKETS',
      displayOrder: 10,
      drilldownHref: '/support/tt?focus=OPEN_TICKETS',
    },
    {
      dashboardKey: 'NOC',
      metricKey: 'NOC_SUPPORT_SLA_OVERDUE',
      metricLabel: 'Ticket Overdue',
      metricType: 'COUNT',
      templateKey: 'SUPPORT_SLA_OVERDUE',
      displayOrder: 20,
      drilldownHref: '/support/sla?focus=SLA_OVERDUE',
    },
    {
      dashboardKey: 'NOC',
      metricKey: 'NOC_SUPPORT_MONTHLY_OPENED_TICKETS',
      metricLabel: 'Ticket Periode Ini',
      metricType: 'COUNT',
      templateKey: 'SUPPORT_MONTHLY_OPENED_TICKETS',
      displayOrder: 30,
      drilldownHref: '/support/tt?focus=MONTHLY_OPENED',
    },
    {
      dashboardKey: 'TT',
      metricKey: 'TT_TT_OPEN_TICKETS',
      metricLabel: 'TT Open',
      metricType: 'COUNT',
      templateKey: 'TT_OPEN_TICKETS',
      displayOrder: 10,
      drilldownHref: '/support/tt?focus=OPEN_TICKETS',
    },
    {
      dashboardKey: 'TT',
      metricKey: 'TT_TT_NEED_ESCALATION',
      metricLabel: 'Perlu Eskalasi',
      metricType: 'COUNT',
      templateKey: 'TT_NEED_ESCALATION',
      displayOrder: 20,
      drilldownHref: '/support/tt?focus=SLA_OVERDUE',
    },
    {
      dashboardKey: 'TT',
      metricKey: 'TT_TT_READY_CLOSE',
      metricLabel: 'Siap Close',
      metricType: 'COUNT',
      templateKey: 'TT_READY_CLOSE',
      displayOrder: 30,
      drilldownHref: '/support/tt?focus=READY_CLOSE',
    },
    {
      dashboardKey: 'DISMANTLE',
      metricKey: 'DISMANTLE_DISMANTLE_OPEN_QUEUE',
      metricLabel: 'Queue Dismantle',
      metricType: 'COUNT',
      templateKey: 'DISMANTLE_OPEN_QUEUE',
      displayOrder: 10,
      drilldownHref: '/support/dismantle?focus=OPEN_QUEUE',
    },
    {
      dashboardKey: 'DISMANTLE',
      metricKey: 'DISMANTLE_DISMANTLE_FIELD_FOLLOW_UP',
      metricLabel: 'Follow Up Lapangan',
      metricType: 'COUNT',
      templateKey: 'DISMANTLE_FIELD_FOLLOW_UP',
      displayOrder: 20,
      drilldownHref: '/support/dismantle?focus=FIELD_FOLLOW_UP',
    },
    {
      dashboardKey: 'DISMANTLE',
      metricKey: 'DISMANTLE_DISMANTLE_CLOSED_THIS_PERIOD',
      metricLabel: 'Close Periode Ini',
      metricType: 'COUNT',
      templateKey: 'DISMANTLE_CLOSED_THIS_PERIOD',
      displayOrder: 30,
      drilldownHref: '/support/dismantle?focus=CLOSED_THIS_PERIOD',
    },
    {
      dashboardKey: 'DIGITAL',
      metricKey: 'DIGITAL_DIGITAL_LEADS',
      metricLabel: 'Lead Digital',
      metricType: 'COUNT',
      templateKey: 'DIGITAL_LEADS',
      displayOrder: 10,
      drilldownHref: '/sales?focus=DIGITAL_LEADS',
    },
    {
      dashboardKey: 'DIGITAL',
      metricKey: 'DIGITAL_DIGITAL_ORDERS',
      metricLabel: 'Order Digital',
      metricType: 'COUNT',
      templateKey: 'DIGITAL_ORDERS',
      displayOrder: 20,
      drilldownHref: '/sales?focus=DIGITAL_ORDERS',
    },
    {
      dashboardKey: 'DIGITAL',
      metricKey: 'DIGITAL_DIGITAL_SURVEYS',
      metricLabel: 'Survey Digital',
      metricType: 'COUNT',
      templateKey: 'DIGITAL_SURVEYS',
      displayOrder: 30,
      drilldownHref: '/sales?focus=DIGITAL_SURVEYS',
    },
    {
      dashboardKey: 'BILLING',
      metricKey: 'BILLING_BILLING_OVERDUE',
      metricLabel: 'Invoice Overdue',
      metricType: 'COUNT',
      templateKey: 'BILLING_OVERDUE',
      displayOrder: 10,
      drilldownHref: '/billing?focus=OVERDUE_INVOICES',
    },
    {
      dashboardKey: 'BILLING',
      metricKey: 'BILLING_BILLING_PARTIAL',
      metricLabel: 'Payment Parsial',
      metricType: 'COUNT',
      templateKey: 'BILLING_PARTIAL',
      displayOrder: 20,
      drilldownHref: '/billing?focus=PARTIAL_INVOICES',
    },
    {
      dashboardKey: 'BILLING',
      metricKey: 'BILLING_BILLING_SUSPEND_CANDIDATE',
      metricLabel: 'Suspend Candidate',
      metricType: 'COUNT',
      templateKey: 'BILLING_SUSPEND_CANDIDATE',
      displayOrder: 30,
      drilldownHref: '/billing?focus=SUSPEND_CANDIDATES',
    },
    {
      dashboardKey: 'HR',
      metricKey: 'HR_HR_ACTIVE_EMPLOYEES',
      metricLabel: 'Employee Aktif',
      metricType: 'COUNT',
      templateKey: 'HR_ACTIVE_EMPLOYEES',
      displayOrder: 10,
      drilldownHref: '/hr?focus=ACTIVE_EMPLOYEES',
    },
    {
      dashboardKey: 'HR',
      metricKey: 'HR_HR_TODAY_ATTENDANCE',
      metricLabel: 'Absensi Hari Ini',
      metricType: 'COUNT',
      templateKey: 'HR_TODAY_ATTENDANCE',
      displayOrder: 20,
      drilldownHref: '/hr?focus=TODAY_ATTENDANCE',
    },
    {
      dashboardKey: 'HR',
      metricKey: 'HR_HR_ACTIVE_LOANS',
      metricLabel: 'Pinjaman Aktif',
      metricType: 'COUNT',
      templateKey: 'HR_ACTIVE_LOANS',
      displayOrder: 30,
      drilldownHref: '/hr?focus=ACTIVE_LOANS',
    },
    {
      dashboardKey: 'INVENTORY',
      metricKey: 'INVENTORY_INVENTORY_ACTIVE_ITEMS',
      metricLabel: 'Item Aktif',
      metricType: 'COUNT',
      templateKey: 'INVENTORY_ACTIVE_ITEMS',
      displayOrder: 10,
      drilldownHref: '/inventory?focus=ACTIVE_ITEMS',
    },
    {
      dashboardKey: 'INVENTORY',
      metricKey: 'INVENTORY_INVENTORY_MONTHLY_MOVEMENTS',
      metricLabel: 'Mutasi Bulan Ini',
      metricType: 'COUNT',
      templateKey: 'INVENTORY_MONTHLY_MOVEMENTS',
      displayOrder: 20,
      drilldownHref: '/inventory?focus=MONTHLY_MOVEMENTS',
    },
    {
      dashboardKey: 'INVENTORY',
      metricKey: 'INVENTORY_INVENTORY_PENDING_REQUESTS',
      metricLabel: 'Request Pending',
      metricType: 'COUNT',
      templateKey: 'INVENTORY_PENDING_REQUESTS',
      displayOrder: 30,
      drilldownHref: '/inventory?focus=PENDING_REQUESTS',
    },
  ]
}

export async function ensureDashboardKpiBaselineDefinitions() {
  assertDataSourceReady()
  await ensureDashboardKpiTables()

  const rows = await runReviewDbQuery<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM dashboard_kpi_definitions
      WHERE scope_type = 'SYSTEM'
        AND is_default = 1
    `,
  )
  const total = Number(rows[0]?.total ?? 0)
  if (total > 0) {
    return
  }

  const seeds = getDashboardKpiBaselineSeeds()
  if (!seeds.length) {
    return
  }

  const placeholders = seeds.map(() => '(?, NULL, NULL, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)').join(', ')
  const args: Array<string | number | null> = []
  seeds.forEach((seed) => {
    args.push(
      'SYSTEM',
      seed.dashboardKey.trim().toUpperCase(),
      seed.metricKey.trim().toUpperCase(),
      seed.metricLabel.trim(),
      seed.metricType,
      seed.templateKey.trim().toUpperCase(),
      Math.max(0, Math.trunc(seed.displayOrder)),
      seed.drilldownHref?.trim() ? seed.drilldownHref.trim() : null,
      'system',
      'system',
    )
  })

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO dashboard_kpi_definitions (
        scope_type,
        division_name,
        subdivision_name,
        dashboard_key,
        metric_key,
        metric_label,
        metric_type,
        template_key,
        display_order,
        is_active,
        is_default,
        drilldown_href,
        created_by,
        updated_by
      )
      VALUES ${placeholders}
    `,
    args,
  )

  await recordDashboardKpiAudit({
    definitionId: null,
    actionType: 'CREATE',
    actor: 'system',
    detailJson: JSON.stringify({ action: 'seed_baseline', total: seeds.length }),
  })
}

export async function resolveDashboardKpiManagerScope(session: AppSession): Promise<DashboardKpiManagerScope> {
  if (session.role === 'SUPER_ADMIN') {
    return {
      divisionName: '',
      subdivisionName: '',
      planningLevel: 'SUPER_ADMIN',
      canManage: true,
    }
  }

  const roleMeta = getRoleMeta(session.role)
  const fallbackDivision = normalizeDashboardDivisionName(roleMeta.division)
  const fallbackSubdivision = normalizeDashboardSubdivisionName(roleMeta.subdivision)
  const org = await resolveDailyActivityOrgContext(session)
  const divisionName = normalizeDashboardDivisionName(org.divisionName)
  const normalizedSubdivision = normalizeDashboardSubdivisionName(org.subdivisionName)

  return {
    divisionName: isValidDashboardKpiDivision(divisionName) ? divisionName : fallbackDivision,
    subdivisionName: isValidDashboardKpiSubdivision(
      isValidDashboardKpiDivision(divisionName) ? divisionName : fallbackDivision,
      normalizedSubdivision,
    )
      ? normalizedSubdivision
      : fallbackSubdivision,
    planningLevel: String(org.planningLevel ?? '').trim().toUpperCase(),
    canManage: String(org.planningLevel ?? '').trim().toUpperCase() === 'MANAGER',
  }
}

async function recordDashboardKpiAudit(params: {
  definitionId?: number | null
  actionType: 'CREATE' | 'UPDATE' | 'DELETE'
  actor: string
  detailJson: string
}) {
  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO dashboard_kpi_definition_audits (definition_id, action_type, actor, detail_json)
      VALUES (?, ?, ?, ?)
    `,
    [params.definitionId ?? null, params.actionType, params.actor, params.detailJson],
  )
}

function assertDataSourceReady() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    throw new Error('Mode review database belum aktif.')
  }
}

export async function listDashboardKpiDefinitions(params?: {
  scopeType?: DashboardKpiScopeType
  divisionName?: string
  subdivisionName?: string
  dashboardKey?: string
  activeOnly?: boolean
  defaultOnly?: boolean
}) {
  assertDataSourceReady()
  await ensureDashboardKpiTables()

  const conditions: string[] = []
  const args: Array<string | number> = []

  if (params?.scopeType) {
    conditions.push('scope_type = ?')
    args.push(params.scopeType)
  }
  if (params?.divisionName) {
    conditions.push('division_name = ?')
    args.push(normalizeDashboardDivisionName(params.divisionName))
  }
  if (params?.subdivisionName) {
    conditions.push('subdivision_name = ?')
    args.push(normalizeDashboardSubdivisionName(params.subdivisionName))
  }
  if (params?.dashboardKey) {
    conditions.push('dashboard_key = ?')
    args.push(params.dashboardKey.trim().toUpperCase())
  }
  if (params?.activeOnly) {
    conditions.push('is_active = 1')
  }
  if (params?.defaultOnly) {
    conditions.push('is_default = 1')
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<DashboardKpiDefinitionRow>(
    `
      SELECT
        id,
        scope_type AS scopeType,
        division_name AS divisionName,
        subdivision_name AS subdivisionName,
        dashboard_key AS dashboardKey,
        metric_key AS metricKey,
        metric_label AS metricLabel,
        metric_type AS metricType,
        template_key AS templateKey,
        display_order AS displayOrder,
        is_active AS isActive,
        is_default AS isDefault,
        drilldown_href AS drilldownHref,
        created_by AS createdBy,
        updated_by AS updatedBy,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM dashboard_kpi_definitions
      ${whereClause}
      ORDER BY dashboard_key ASC, display_order ASC, metric_label ASC, id ASC
    `,
    args,
  )

  return rows.map(mapDefinitionRow)
}

export async function listMergedDashboardKpiDefinitions(params: {
  divisionName: string
  subdivisionName: string
  dashboardKey?: string
  activeOnly?: boolean
}) {
  assertDataSourceReady()
  await ensureDashboardKpiBaselineDefinitions()

  const divisionName = normalizeDashboardDivisionName(params.divisionName)
  const subdivisionName = normalizeDashboardSubdivisionName(params.subdivisionName)
  if (!divisionName || !subdivisionName) {
    throw new Error('Scope KPI belum lengkap.')
  }
  if (!isValidDashboardKpiDivision(divisionName)) {
    throw new Error('Divisi KPI dashboard tidak valid.')
  }
  if (!isValidDashboardKpiSubdivision(divisionName, subdivisionName)) {
    throw new Error('Sub-divisi KPI dashboard tidak valid.')
  }

  const dashboardKey = params.dashboardKey?.trim().toUpperCase()
  if (dashboardKey && !isValidDashboardKpiKey(dashboardKey)) {
    throw new Error('Dashboard key KPI tidak valid.')
  }

  const [systemDefaults, divisionDefinitions] = await Promise.all([
    listDashboardKpiDefinitions({
      scopeType: 'SYSTEM',
      dashboardKey,
      defaultOnly: true,
    }),
    listDashboardKpiDefinitions({
      scopeType: 'DIVISION',
      divisionName,
      subdivisionName,
      dashboardKey,
    }),
  ])

  const merged = new Map<string, DashboardKpiDefinition>()
  systemDefaults.forEach((definition) => {
    const key = definition.metricKey.trim().toUpperCase()
    merged.set(key, { ...definition, divisionName, subdivisionName })
  })
  divisionDefinitions.forEach((definition) => {
    const key = definition.metricKey.trim().toUpperCase()
    merged.set(key, { ...definition, divisionName, subdivisionName })
  })

  const values = Array.from(merged.values())
    .filter((item) => (params.activeOnly ? item.isActive : true))
    .sort(
      (a, b) =>
        a.dashboardKey.localeCompare(b.dashboardKey) ||
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        a.metricLabel.localeCompare(b.metricLabel) ||
        Number(a.id) - Number(b.id),
    )

  return values
}

async function getDefinitionById(id: number) {
  const rows = await runReviewDbQuery<DashboardKpiDefinitionRow>(
    `
      SELECT
        id,
        scope_type AS scopeType,
        division_name AS divisionName,
        subdivision_name AS subdivisionName,
        dashboard_key AS dashboardKey,
        metric_key AS metricKey,
        metric_label AS metricLabel,
        metric_type AS metricType,
        template_key AS templateKey,
        display_order AS displayOrder,
        is_active AS isActive,
        is_default AS isDefault,
        drilldown_href AS drilldownHref,
        created_by AS createdBy,
        updated_by AS updatedBy,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM dashboard_kpi_definitions
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  return rows[0] ? mapDefinitionRow(rows[0]) : null
}

async function getDivisionDefinitionByMetric(params: {
  divisionName: string
  subdivisionName: string
  dashboardKey: string
  metricKey: string
}) {
  const rows = await runReviewDbQuery<DashboardKpiDefinitionRow>(
    `
      SELECT
        id,
        scope_type AS scopeType,
        division_name AS divisionName,
        subdivision_name AS subdivisionName,
        dashboard_key AS dashboardKey,
        metric_key AS metricKey,
        metric_label AS metricLabel,
        metric_type AS metricType,
        template_key AS templateKey,
        display_order AS displayOrder,
        is_active AS isActive,
        is_default AS isDefault,
        drilldown_href AS drilldownHref,
        created_by AS createdBy,
        updated_by AS updatedBy,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
      FROM dashboard_kpi_definitions
      WHERE scope_type = 'DIVISION'
        AND division_name = ?
        AND subdivision_name = ?
        AND dashboard_key = ?
        AND metric_key = ?
      LIMIT 1
    `,
    [
      normalizeDashboardDivisionName(params.divisionName),
      normalizeDashboardSubdivisionName(params.subdivisionName),
      params.dashboardKey.trim().toUpperCase(),
      params.metricKey.trim().toUpperCase(),
    ],
  )

  return rows[0] ? mapDefinitionRow(rows[0]) : null
}

function assertManagerScope(managerScope: DashboardKpiManagerScope, target: { divisionName: string; subdivisionName: string }) {
  if (!managerScope.canManage) {
    throw new Error('User belum memiliki hak manager KPI dashboard.')
  }

  if (managerScope.planningLevel === 'MANAGER') {
    const sameDivision = managerScope.divisionName.trim() === normalizeDashboardDivisionName(target.divisionName)
    const sameSubdivision =
      managerScope.subdivisionName.trim() === normalizeDashboardSubdivisionName(target.subdivisionName)

    if (!sameDivision || !sameSubdivision) {
      throw new Error('Manager hanya boleh mengelola KPI pada divisi dan sub-divisinya sendiri.')
    }
  }
}

export async function createDashboardKpiDefinition(params: {
  session: AppSession
  divisionName: string
  subdivisionName: string
  dashboardKey: string
  metricKey: string
  metricLabel: string
  metricType: DashboardKpiMetricType
  templateKey: string
  displayOrder: number
  drilldownHref?: string
}) {
  assertDataSourceReady()
  await ensureDashboardKpiTables()

  const managerScope = await resolveDashboardKpiManagerScope(params.session)
  const divisionName = normalizeDashboardDivisionName(params.divisionName)
  const subdivisionName = normalizeDashboardSubdivisionName(params.subdivisionName)
  assertManagerScope(managerScope, { divisionName, subdivisionName })

  const dashboardKey = params.dashboardKey.trim().toUpperCase()
  const metricKey = params.metricKey.trim().toUpperCase()
  const metricLabel = params.metricLabel.trim()
  const templateKey = params.templateKey.trim().toUpperCase()
  const displayOrder = Number.isFinite(params.displayOrder) ? Math.max(0, Math.trunc(params.displayOrder)) : 0
  const drilldownHref =
    String(params.drilldownHref ?? '').trim() || resolveDashboardKpiTemplateDrilldown(templateKey)

  if (!divisionName || !subdivisionName || !dashboardKey || !metricKey || !metricLabel || !templateKey) {
    throw new Error('Definisi KPI belum lengkap.')
  }
  if (!isValidDashboardKpiDivision(divisionName)) {
    throw new Error('Divisi KPI dashboard tidak valid.')
  }
  if (!isValidDashboardKpiSubdivision(divisionName, subdivisionName)) {
    throw new Error('Sub-divisi KPI dashboard tidak valid.')
  }
  if (!isValidDashboardKpiKey(dashboardKey)) {
    throw new Error('Dashboard key KPI tidak valid.')
  }
  if (!isValidDashboardKpiMetricType(params.metricType)) {
    throw new Error('Tipe KPI tidak valid.')
  }
  if (!isValidDashboardKpiTemplate(templateKey)) {
    throw new Error('Template KPI tidak valid.')
  }

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO dashboard_kpi_definitions (
        scope_type,
        division_name,
        subdivision_name,
        dashboard_key,
        metric_key,
        metric_label,
        metric_type,
        template_key,
        display_order,
        is_active,
        is_default,
        drilldown_href,
        created_by,
        updated_by
      )
      VALUES ('DIVISION', ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
    `,
    [
      divisionName,
      subdivisionName,
      dashboardKey,
      metricKey,
      metricLabel,
      params.metricType,
      templateKey,
      displayOrder,
      drilldownHref || null,
      params.session.username,
      params.session.username,
    ],
  )

  const definitionId = Number(result.insertId ?? 0)
  if (definitionId > 0) {
    await recordDashboardKpiAudit({
      definitionId,
      actionType: 'CREATE',
      actor: params.session.username,
      detailJson: JSON.stringify({
        divisionName,
        subdivisionName,
        dashboardKey,
        metricKey,
        metricLabel,
        templateKey,
      }),
    })
  }

  return definitionId > 0 ? getDefinitionById(definitionId) : null
}

export async function updateDashboardKpiDefinition(params: {
  session: AppSession
  id: number
  metricLabel: string
  displayOrder: number
  isActive: boolean
  drilldownHref?: string
}) {
  assertDataSourceReady()
  await ensureDashboardKpiTables()

  const current = await getDefinitionById(params.id)
  if (!current) {
    throw new Error('Definisi KPI tidak ditemukan.')
  }

  if (current.isDefault) {
    throw new Error('KPI default sistem tidak boleh diubah langsung.')
  }

  const managerScope = await resolveDashboardKpiManagerScope(params.session)
  assertManagerScope(managerScope, {
    divisionName: current.divisionName,
    subdivisionName: current.subdivisionName,
  })

  const metricLabel = params.metricLabel.trim()
  const displayOrder = Number.isFinite(params.displayOrder) ? Math.max(0, Math.trunc(params.displayOrder)) : 0
  const drilldownHref =
    String(params.drilldownHref ?? '').trim() || resolveDashboardKpiTemplateDrilldown(current.templateKey)

  if (!metricLabel) {
    throw new Error('Label KPI wajib diisi.')
  }
  if (current.divisionName && !isValidDashboardKpiDivision(current.divisionName)) {
    throw new Error('Scope divisi KPI tidak valid.')
  }
  if (
    current.divisionName &&
    current.subdivisionName &&
    !isValidDashboardKpiSubdivision(current.divisionName, current.subdivisionName)
  ) {
    throw new Error('Scope sub-divisi KPI tidak valid.')
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE dashboard_kpi_definitions
      SET
        metric_label = ?,
        display_order = ?,
        is_active = ?,
        drilldown_href = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [metricLabel, displayOrder, params.isActive ? 1 : 0, drilldownHref || null, params.session.username, params.id],
  )

  await recordDashboardKpiAudit({
    definitionId: params.id,
    actionType: 'UPDATE',
    actor: params.session.username,
    detailJson: JSON.stringify({
      before: current,
      after: {
        metricLabel,
        displayOrder,
        isActive: params.isActive,
        drilldownHref,
      },
    }),
  })

  return getDefinitionById(params.id)
}

export async function upsertDashboardKpiOverrideFromDefault(params: {
  session: AppSession
  defaultId: number
  divisionName: string
  subdivisionName: string
  metricLabel: string
  displayOrder: number
  isActive: boolean
  drilldownHref?: string
}) {
  assertDataSourceReady()
  await ensureDashboardKpiBaselineDefinitions()

  const defaultDefinition = await getDefinitionById(params.defaultId)
  if (!defaultDefinition) {
    throw new Error('Definisi KPI tidak ditemukan.')
  }
  if (!defaultDefinition.isDefault || defaultDefinition.scopeType !== 'SYSTEM') {
    throw new Error('Definisi KPI yang dipilih bukan KPI default sistem.')
  }

  const divisionName = normalizeDashboardDivisionName(params.divisionName)
  const subdivisionName = normalizeDashboardSubdivisionName(params.subdivisionName)
  if (!divisionName || !subdivisionName) {
    throw new Error('Scope KPI belum lengkap.')
  }
  if (!isValidDashboardKpiDivision(divisionName)) {
    throw new Error('Divisi KPI dashboard tidak valid.')
  }
  if (!isValidDashboardKpiSubdivision(divisionName, subdivisionName)) {
    throw new Error('Sub-divisi KPI dashboard tidak valid.')
  }

  const managerScope = await resolveDashboardKpiManagerScope(params.session)
  assertManagerScope(managerScope, { divisionName, subdivisionName })

  const metricLabel = params.metricLabel.trim()
  const displayOrder = Number.isFinite(params.displayOrder) ? Math.max(0, Math.trunc(params.displayOrder)) : 0
  const drilldownHref =
    String(params.drilldownHref ?? '').trim() || resolveDashboardKpiTemplateDrilldown(defaultDefinition.templateKey)
  if (!metricLabel) {
    throw new Error('Label KPI wajib diisi.')
  }

  const existing = await getDivisionDefinitionByMetric({
    divisionName,
    subdivisionName,
    dashboardKey: defaultDefinition.dashboardKey,
    metricKey: defaultDefinition.metricKey,
  })

  if (existing) {
    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE dashboard_kpi_definitions
        SET
          metric_label = ?,
          display_order = ?,
          is_active = ?,
          drilldown_href = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        metricLabel,
        displayOrder,
        params.isActive ? 1 : 0,
        drilldownHref || null,
        params.session.username,
        Number(existing.id),
      ],
    )

    await recordDashboardKpiAudit({
      definitionId: Number(existing.id),
      actionType: 'UPDATE',
      actor: params.session.username,
      detailJson: JSON.stringify({
        action: 'override_default',
        defaultId: params.defaultId,
        divisionName,
        subdivisionName,
        before: existing,
        after: {
          metricLabel,
          displayOrder,
          isActive: params.isActive,
          drilldownHref,
        },
      }),
    })

    return getDefinitionById(Number(existing.id))
  }

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO dashboard_kpi_definitions (
        scope_type,
        division_name,
        subdivision_name,
        dashboard_key,
        metric_key,
        metric_label,
        metric_type,
        template_key,
        display_order,
        is_active,
        is_default,
        drilldown_href,
        created_by,
        updated_by
      )
      VALUES ('DIVISION', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `,
    [
      divisionName,
      subdivisionName,
      defaultDefinition.dashboardKey.trim().toUpperCase(),
      defaultDefinition.metricKey.trim().toUpperCase(),
      metricLabel,
      defaultDefinition.metricType,
      defaultDefinition.templateKey.trim().toUpperCase(),
      displayOrder,
      params.isActive ? 1 : 0,
      drilldownHref || null,
      params.session.username,
      params.session.username,
    ],
  )

  const definitionId = Number(result.insertId ?? 0)
  if (definitionId > 0) {
    await recordDashboardKpiAudit({
      definitionId,
      actionType: 'CREATE',
      actor: params.session.username,
      detailJson: JSON.stringify({
        action: 'override_default',
        defaultId: params.defaultId,
        divisionName,
        subdivisionName,
        metricLabel,
        displayOrder,
        isActive: params.isActive,
        drilldownHref,
      }),
    })
  }

  return definitionId > 0 ? getDefinitionById(definitionId) : null
}

export async function deleteDashboardKpiDefinition(params: { session: AppSession; id: number }) {
  assertDataSourceReady()
  await ensureDashboardKpiTables()

  const current = await getDefinitionById(params.id)
  if (!current) {
    throw new Error('Definisi KPI tidak ditemukan.')
  }
  if (current.isDefault) {
    throw new Error('KPI default sistem tidak boleh dihapus.')
  }

  const managerScope = await resolveDashboardKpiManagerScope(params.session)
  assertManagerScope(managerScope, {
    divisionName: current.divisionName,
    subdivisionName: current.subdivisionName,
  })

  await runReviewDbExecute<ExecuteResult>(
    `
      DELETE FROM dashboard_kpi_definitions
      WHERE id = ?
      LIMIT 1
    `,
    [params.id],
  )

  await recordDashboardKpiAudit({
    definitionId: params.id,
    actionType: 'DELETE',
    actor: params.session.username,
    detailJson: JSON.stringify(current),
  })

  return { id: String(params.id), deleted: true }
}

export function getDashboardKpiErrorDetail(error: unknown) {
  return getReviewDbErrorDetail(error)
}
