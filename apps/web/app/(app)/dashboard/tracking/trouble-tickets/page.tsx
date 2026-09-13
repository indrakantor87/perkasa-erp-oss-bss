import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import TroubleTicketsPageClient from '@/components/trouble-tickets-page-client'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getTroubleTicketTrackingList, type TroubleTicketTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function TroubleTicketTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<TroubleTicketTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const payload = await getTroubleTicketTrackingList(query)
  const q = resolveSearchParam(query.q) ?? ''
  const status = resolveSearchParam(query.status) ?? ''
  const type = resolveSearchParam(query.type) ?? ''
  const category = resolveSearchParam(query.category) ?? ''

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <TroubleTicketsPageClient
        q={q}
        status={status}
        type={type}
        category={category}
        items={payload.items as any[]}
        error={payload.error ?? null}
      />
    </div>
  )
}
