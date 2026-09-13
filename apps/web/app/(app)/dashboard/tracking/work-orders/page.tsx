import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import WorkOrdersPageClient from '@/components/work-orders-page-client'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getFieldTechWorkOrderCounters, getWorkOrderTrackingList, type WorkOrderTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function WorkOrderTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<WorkOrderTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const roleUp = String(session.role ?? '').trim().toUpperCase()
  const isFieldTechRole = roleUp === 'FIELD_TECHNICIAN'

  const query = (await searchParams) ?? {}
  const explicitMineParam = resolveSearchParam(query.mine)
  const effectiveMine = explicitMineParam != null && String(explicitMineParam).length > 0
    ? ['1', 'true', 'yes', 'on'].includes(String(explicitMineParam).trim().toLowerCase())
    : isFieldTechRole
  const queryWithOwnership: WorkOrderTrackingQuery = { ...query }
  if (effectiveMine) queryWithOwnership.mine = explicitMineParam ?? '1'

  const [payload, countersPayload] = await Promise.all([
    getWorkOrderTrackingList(queryWithOwnership, { session }),
    isFieldTechRole || roleUp === 'TT_OPERATOR' || roleUp === 'NOC_OPERATOR'
      ? getFieldTechWorkOrderCounters({ session })
      : null,
  ])
  const q = resolveSearchParam(query.q) ?? ''
  const status = resolveSearchParam(query.status) ?? ''
  const jobCategory = resolveSearchParam(query.jobCategory) ?? ''
  const priority = resolveSearchParam(query.priority) ?? ''
  const mine = effectiveMine
  const counters = countersPayload?.counters ?? null
  const countersError = countersPayload?.error ?? null

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <WorkOrdersPageClient
        q={q}
        status={status}
        jobCategory={jobCategory}
        priority={priority}
        mine={mine}
        items={payload.items as any[]}
        counters={counters as any}
        countersError={countersError ?? null}
        error={payload.error ?? null}
      />
    </div>
  )
}
