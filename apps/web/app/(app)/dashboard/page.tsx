import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CrossDomainAlerts } from '@/components/dashboard/cross-domain-alerts'
import { DashboardCommandCenter } from '@/components/dashboard/dashboard-command-center'
import { DashboardKpiManagerPanel } from '@/components/dashboard/dashboard-kpi-manager-panel'
import { DashboardNextActions } from '@/components/dashboard/dashboard-next-actions'
import { DashboardProcessKpis } from '@/components/dashboard/dashboard-process-kpis'
import { DivisionStructureBoard } from '@/components/dashboard/division-structure-board'
import { DailyActivityApprovalQueue } from '@/components/dashboard/daily-activity-approval-queue'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { ModuleGrid } from '@/components/dashboard/module-grid'
import { OperationalDivisionBoard } from '@/components/dashboard/operational-division-board'
import { RoleQueueGrid } from '@/components/dashboard/role-queue-grid'
import { WorklistBoard } from '@/components/dashboard/worklist-board'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { listMergedDashboardKpiDefinitions, resolveDashboardKpiManagerScope } from '@/lib/services/dashboard-kpi-service'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import type { DashboardOperationalDivisionKey } from '@/lib/types'
import type { AppRole } from '@/lib/types'
import { getVisibleModuleCards } from '@/lib/ui-access'

function parsePositiveNumber(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseDivision(value: string | string[] | undefined): DashboardOperationalDivisionKey {
  const raw = String(Array.isArray(value) ? value[0] : value ?? 'ALL')
    .trim()
    .toUpperCase()

  if (
    raw === 'SALES' ||
    raw === 'CS' ||
    raw === 'NOC' ||
    raw === 'TT' ||
    raw === 'DISMANTLE' ||
    raw === 'DIGITAL' ||
    raw === 'BILLING' ||
    raw === 'HR' ||
    raw === 'INVENTORY'
  ) {
    return raw
  }

  return 'ALL'
}

function getDefaultDivision(role: AppRole): DashboardOperationalDivisionKey {
  switch (role) {
    case 'SALES_MARKETING':
      return 'SALES'
    case 'CS_OPERATOR':
    case 'CS_ADMIN':
      return 'CS'
    case 'NOC_OPERATOR':
      return 'NOC'
    case 'TT_OPERATOR':
      return 'TT'
    case 'DISMANTLE_OPERATOR':
      return 'DISMANTLE'
    case 'DIGITAL_CREATOR':
      return 'DIGITAL'
    default:
      return 'ALL'
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const resolvedSearchParams = (await searchParams) ?? {}
  const now = new Date()
  const month = Math.min(12, Math.max(1, parsePositiveNumber(resolvedSearchParams.month, now.getMonth() + 1)))
  const year = Math.min(2100, Math.max(2024, parsePositiveNumber(resolvedSearchParams.year, now.getFullYear())))
  const roleDivisionFallback = getDefaultDivision(session.role)
  const division =
    typeof resolvedSearchParams.division === 'undefined'
      ? roleDivisionFallback
      : parseDivision(resolvedSearchParams.division)
  const kpiDivisionName = String(resolvedSearchParams.kpiDivisionName ?? '').trim()
  const kpiSubdivisionName = String(resolvedSearchParams.kpiSubdivisionName ?? '').trim()
  const {
    source,
    metrics,
    roleQueues,
    worklist,
    activities,
    dailyActivityApprovalQueue,
    operationalCards,
    dashboardAlerts,
  } =
    await getDashboardPageData(session, {
      month,
      year,
      division,
      kpiDivisionName: kpiDivisionName || undefined,
      kpiSubdivisionName: kpiSubdivisionName || undefined,
    })
  const roleMeta = getRoleMeta(session.role)
  const canApproveDailyActivity = canPerformAction(session.role, 'daily_activity', 'approve')
  const visibleModuleCards = getVisibleModuleCards(session.role)
  const lockDivisionFilter = session.role !== 'SUPER_ADMIN'
  const sourceSnapshot = getDataSourceSnapshot()
  const reviewDbReady = sourceSnapshot.effectiveMode === 'review-db' && !sourceSnapshot.isFallback
  const managerScope = await resolveDashboardKpiManagerScope(session)
  const initialKpiDivision =
    managerScope.planningLevel === 'SUPER_ADMIN'
      ? kpiDivisionName || managerScope.divisionName || 'Pemasaran dan Pelayanan'
      : managerScope.divisionName || 'Pemasaran dan Pelayanan'
  const initialKpiSubdivision =
    managerScope.planningLevel === 'SUPER_ADMIN'
      ? kpiSubdivisionName || managerScope.subdivisionName || 'Penjualan'
      : managerScope.subdivisionName || 'Penjualan'
  const initialKpiDefinitions = reviewDbReady
    ? await listMergedDashboardKpiDefinitions({
        divisionName: initialKpiDivision,
        subdivisionName: initialKpiSubdivision,
      }).catch(() => [])
    : []

  return (
    <div className="space-y-6">
      <DashboardCommandCenter
        roleLabel={roleMeta.label}
        roleShortLabel={roleMeta.shortLabel}
        roleTone={roleMeta.tone}
        roleDivision={roleMeta.division}
        roleSubdivision={roleMeta.subdivision}
        roleScope={roleMeta.scope}
        queueCount={roleQueues.length}
        worklistCount={worklist.length}
        moduleCount={visibleModuleCards.length}
        approvalCount={canApproveDailyActivity ? dailyActivityApprovalQueue.totalPending : 0}
      />
      <DivisionStructureBoard activeDivision={roleMeta.division} activeSubdivision={roleMeta.subdivision} />
      <DataSourceStatus source={source} />
      <DashboardKpiManagerPanel
        reviewDbReady={reviewDbReady}
        managerScope={managerScope}
        initialDefinitions={initialKpiDefinitions}
      />
      <OperationalDivisionBoard
        cards={operationalCards}
        month={month}
        year={year}
        division={division}
        lockDivision={lockDivisionFilter}
      />
      <DashboardProcessKpis cards={operationalCards} month={month} year={year} />
      <CrossDomainAlerts items={dashboardAlerts} />
      <DashboardNextActions alerts={dashboardAlerts} worklist={worklist} roleQueues={roleQueues} />
      <section className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-title">Kontrol Lintas Domain</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                KPI utama untuk membaca kesehatan operasi
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                Ringkasan ini dipakai untuk memastikan customer, order, support, inventory, HR,
                dan billing tetap terbaca dari satu halaman yang sama.
              </p>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{metrics.length} KPI</span>
          </div>
          <div className="mt-6">
            <KpiGrid items={metrics} />
          </div>
        </div>
        <RoleQueueGrid items={roleQueues} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <WorklistBoard items={worklist} />
          <ActivityFeed items={activities} />
        </div>
        <div className="space-y-6">
          {canApproveDailyActivity ? <DailyActivityApprovalQueue queue={dailyActivityApprovalQueue} /> : null}
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-title">Shortcut Operasional</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                  Masuk ke modul yang relevan tanpa berpindah konteks
                </h2>
                <p className="mt-3 text-sm leading-6 text-mute">
                  Shortcut ini mengikuti RBAC role aktif agar dashboard tetap menjadi pintu kerja
                  tunggal lintas domain.
                </p>
              </div>
              <span className="badge border-slate-200 bg-white text-slate-600">
                {visibleModuleCards.length} modul
              </span>
            </div>
            <div className="mt-6">
              <ModuleGrid items={visibleModuleCards} />
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
