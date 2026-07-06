import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { ModuleGrid } from '@/components/dashboard/module-grid'
import { DataSourceStatus } from '@/components/data-source-status'
import { requireSession } from '@/lib/auth'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import { getVisibleModuleCards } from '@/lib/ui-access'

export default async function DashboardPage() {
  const session = await requireSession()
  const { source, metrics, activities } = await getDashboardPageData()

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <KpiGrid items={metrics} />
      <ModuleGrid items={getVisibleModuleCards(session.role)} />
      <ActivityFeed items={activities} />
    </div>
  )
}
