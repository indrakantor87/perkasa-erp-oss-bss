import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryRequestTrackingFilters } from '@/components/inventory-request-tracking-filters'
import InventoryRequestsPageClient from '@/components/inventory-requests-page-client'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryRequestTrackingList, type InventoryRequestTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function InventoryRequestTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<InventoryRequestTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const payload = await getInventoryRequestTrackingList(query, { session })
  const q = resolveSearchParam(query.q) ?? ''
  const status = resolveSearchParam(query.status) ?? ''
  const requestType = resolveSearchParam(query.requestType) ?? ''
  const workOrderId = resolveSearchParam(query.workOrderId) ?? ''
  const troubleTicketId = resolveSearchParam(query.troubleTicketId) ?? ''
  const mine = ['1', 'true', 'yes', 'on'].includes((resolveSearchParam(query.mine) ?? '').trim().toLowerCase())

  const defaultValues = {
    q,
    status,
    requestType,
    workOrderId,
    troubleTicketId,
    mine,
  }

  const referenceActive = !!(workOrderId || troubleTicketId || mine)

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <InventoryRequestsPageClient
        defaultValues={defaultValues}
        items={payload.items as any[]}
        referenceActive={referenceActive}
        error={payload.error ?? null}
        InventoryRequestTrackingFilters={InventoryRequestTrackingFilters as any}
      />
    </div>
  )
}
