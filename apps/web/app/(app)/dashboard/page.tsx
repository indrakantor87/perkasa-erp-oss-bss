import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { ModuleGrid } from '@/components/dashboard/module-grid'
import { RoleQueueGrid } from '@/components/dashboard/role-queue-grid'
import { WorklistBoard } from '@/components/dashboard/worklist-board'
import { DataSourceStatus } from '@/components/data-source-status'
import { requireSession } from '@/lib/auth'
import { getRoleMeta } from '@/lib/role-meta'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import { getVisibleModuleCards } from '@/lib/ui-access'

export default async function DashboardPage() {
  const session = await requireSession()
  const { source, metrics, roleQueues, worklist, activities } = await getDashboardPageData(session.role)
  const roleMeta = getRoleMeta(session.role)

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Perspektif Role</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Dashboard kerja untuk {roleMeta.label}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{roleMeta.scope}</p>
          </div>
          <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.shortLabel}</span>
        </div>
      </section>
      <KpiGrid items={metrics} />
      <RoleQueueGrid items={roleQueues} />
      <WorklistBoard items={worklist} />
      <ModuleGrid items={getVisibleModuleCards(session.role)} />
      <ActivityFeed items={activities} />
    </div>
  )
}
