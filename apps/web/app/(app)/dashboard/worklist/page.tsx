import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { WorklistDetailPanel } from '@/components/worklist/worklist-detail-panel'
import { WorklistFilters } from '@/components/worklist/worklist-filters'
import { WorklistHeader } from '@/components/worklist/worklist-header'
import { WorklistTable } from '@/components/worklist/worklist-table'
import { WorklistTabs } from '@/components/worklist/worklist-tabs'
import { canAccessPath, canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getRoleMeta } from '@/lib/role-meta'
import { getWorklistPageData } from '@/lib/services/worklist-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function DashboardWorklistPage({
  searchParams,
}: {
  searchParams?: Promise<{
    queue?: string | string[]
    domain?: string | string[]
    priority?: string | string[]
    status?: string | string[]
    q?: string | string[]
    mine?: string | string[]
    overdue?: string | string[]
    selected?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const state = {
    queue: resolveSearchParam(resolvedSearchParams.queue),
    domain: resolveSearchParam(resolvedSearchParams.domain),
    priority: resolveSearchParam(resolvedSearchParams.priority),
    status: resolveSearchParam(resolvedSearchParams.status),
    q: resolveSearchParam(resolvedSearchParams.q),
    mine: resolveSearchParam(resolvedSearchParams.mine) === '1',
    overdue: resolveSearchParam(resolvedSearchParams.overdue) === '1',
    selected: resolveSearchParam(resolvedSearchParams.selected),
  }

  const payload = await getWorklistPageData(session, state)
  const roleMeta = getRoleMeta(session.role)
  const readOnly =
    !canPerformAction(session.role, 'sales', 'update') &&
    !canPerformAction(session.role, 'customers', 'update') &&
    !canPerformAction(session.role, 'support', 'update') &&
    !canPerformAction(session.role, 'inventory', 'update')

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <WorklistHeader
        roleLabel={roleMeta.label}
        roleTone={roleMeta.tone}
        division={roleMeta.division}
        subdivision={roleMeta.subdivision}
        selectedQueue={payload.selectedQueue}
        totalCount={payload.totalCount}
        baseCount={payload.baseCount}
        criticalCount={payload.summary.criticalCount}
        followUpCount={payload.summary.followUpCount}
        waitingCount={payload.summary.waitingCount}
        readyCloseCount={payload.summary.readyCloseCount}
        readOnly={readOnly}
      />
      <WorklistFilters state={{ ...state, queue: payload.selectedQueue }} queueOptions={payload.queueOptions} />
      <WorklistTabs queueOptions={payload.queueOptions} state={{ ...state, queue: payload.selectedQueue }} />
      <section className="grid items-start gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <WorklistTable items={payload.items} selectedItemId={payload.selectedItem?.id} state={{ ...state, queue: payload.selectedQueue }} />
        <WorklistDetailPanel item={payload.selectedItem} />
      </section>
    </div>
  )
}
