import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import SalesTicketingPageClient from '@/components/sales-ticketing-page-client'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import {
  getNocQueueList,
  type NocQueueQuery,
  type NocQueueStatus,
  type NocTicketType,
} from '@/lib/services/noc-queue-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function SalesTicketingPage({
  searchParams,
}: {
  searchParams?: Promise<NocQueueQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/ticketing')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const effectiveQuery: NocQueueQuery = {
    ...query,
    mine: '1',
  }
  const payload = await getNocQueueList(effectiveQuery, { session })
  const q = resolveSearchParam(effectiveQuery.q) ?? ''
  const ticketType = resolveSearchParam(effectiveQuery.ticketType)?.toUpperCase() ?? ''
  const queueStatus = resolveSearchParam(effectiveQuery.queueStatus)?.toUpperCase() ?? ''

  const totalTickets = payload.items.length
  const openTickets = payload.items.filter((item) => item.queueStatus === 'OPEN' || item.queueStatus === 'ON_PROGRESS').length
  const urgentTickets = payload.items.filter((item) => item.slaState === 'BREACHED' || item.slaState === 'WARNING').length

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />
      <SalesTicketingPageClient
        q={q}
        ticketType={ticketType}
        queueStatus={queueStatus}
        totalTickets={totalTickets}
        openTickets={openTickets}
        urgentTickets={urgentTickets}
        items={payload.items}
        error={payload.error ?? null}
      />
    </div>
  )
}
