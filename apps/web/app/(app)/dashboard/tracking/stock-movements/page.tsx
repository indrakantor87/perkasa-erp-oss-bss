import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { StockMovementTrackingFilters } from '@/components/stock-movement-tracking-filters'
import StockMovementsPageClient from '@/components/stock-movements-page-client'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getStockMovementTrackingList, type StockMovementTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function StockMovementTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<StockMovementTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const payload = await getStockMovementTrackingList(query, { session })

  const q = resolveSearchParam(query.q) ?? ''
  const movementType = resolveSearchParam(query.movementType) ?? ''
  const referenceType = resolveSearchParam(query.referenceType) ?? ''
  const workOrderId = resolveSearchParam(query.workOrderId) ?? ''
  const troubleTicketId = resolveSearchParam(query.troubleTicketId) ?? ''
  const technicianUserId = resolveSearchParam(query.technicianUserId) ?? ''
  const mine = ['1', 'true', 'yes', 'on'].includes((resolveSearchParam(query.mine) ?? '').trim().toLowerCase())

  const defaultValues = {
    q,
    movementType,
    referenceType,
    workOrderId,
    troubleTicketId,
    technicianUserId,
    mine,
  }

  const referenceActive = !!(workOrderId || troubleTicketId || technicianUserId || mine)

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <StockMovementsPageClient
        defaultValues={defaultValues}
        items={payload.items as any[]}
        referenceActive={referenceActive}
        error={payload.error ?? null}
        StockMovementTrackingFilters={StockMovementTrackingFilters as any}
      />
    </div>
  )
}
