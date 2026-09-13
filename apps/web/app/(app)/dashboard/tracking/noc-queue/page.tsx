import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import NocQueuePageClient from '@/components/noc-queue-page-client'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { extractInventoryItemCodeFromScan } from '@/lib/inventory-barcode-utils'
import { getInventoryDeviceLifecycleItemSuggestions } from '@/lib/services/device-lifecycle-service'
import { getNocQueueList, type NocQueueQuery, type NocQueueStatus, type NocTicketType } from '@/lib/services/noc-queue-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildNocQueueFilterHref(params: {
  q?: string
  ticketType?: string
  queueStatus?: string
  slaState?: string
  mine?: boolean
  patch: Partial<{
    ticketType: string
    queueStatus: string
    slaState: string
    mine: string
  }>
}) {
  const search = new URLSearchParams()
  const q = String(params.q ?? '').trim()
  const ticketType = String(params.patch.ticketType ?? params.ticketType ?? '').trim()
  const queueStatus = String(params.patch.queueStatus ?? params.queueStatus ?? '').trim()
  const slaState = String(params.patch.slaState ?? params.slaState ?? '').trim()
  const mine = String(params.patch.mine ?? (params.mine ? '1' : '')).trim()

  if (q) search.set('q', q)
  if (ticketType) search.set('ticketType', ticketType)
  if (queueStatus) search.set('queueStatus', queueStatus)
  if (slaState) search.set('slaState', slaState)
  if (mine) search.set('mine', mine)

  const query = search.toString()
  return query ? `/dashboard/tracking/noc-queue?${query}` : '/dashboard/tracking/noc-queue'
}

const ticketTypeOptions: NocTicketType[] = ['PSB', 'TROUBLESHOOTS', 'DISMANTLE', 'JALUR']

function getWorkspaceLabel(role: string) {
  if (role === 'CS_OPERATOR' || role === 'CS_ADMIN') return 'CS & Admin CS'
  if (role === 'NOC_OPERATOR') return 'NOC'
  if (role === 'PENJUALAN') return 'Penjualan'
  return 'Operasional'
}

export default async function NocQueuePage({
  searchParams,
}: {
  searchParams?: Promise<NocQueueQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const effectiveQuery =
    session.role === 'PENJUALAN'
      ? {
          ...query,
          mine: '1',
        }
      : query
  const [payload, itemSuggestions] = await Promise.all([
    getNocQueueList(effectiveQuery, { session }),
    getInventoryDeviceLifecycleItemSuggestions(200),
  ])
  const q = resolveSearchParam(effectiveQuery.q) ?? ''
  const ticketType = resolveSearchParam(effectiveQuery.ticketType)?.toUpperCase() ?? ''
  const queueStatus = resolveSearchParam(effectiveQuery.queueStatus)?.toUpperCase() ?? ''
  const slaState = resolveSearchParam(effectiveQuery.slaState)?.toUpperCase() ?? ''
  const mine = ['1', 'true', 'yes', 'on'].includes((resolveSearchParam(effectiveQuery.mine) ?? '').trim().toLowerCase())
  const canCreateDeviceLifecycle =
    session.role === 'FIELD_TECHNICIAN' ||
    canPerformAction(session.role, 'inventory', 'update') ||
    canPerformAction(session.role, 'inventory', 'create') ||
    canPerformAction(session.role, 'support', 'update')
  const canUpdateSupport = canPerformAction(session.role, 'support', 'update')
  const canUpdateWorkOrder = canPerformAction(session.role, 'support', 'update')
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback
  const totalTickets = payload.items.length
  const activeTickets = payload.items.filter((item) => item.queueStatus === 'OPEN' || item.queueStatus === 'ON_PROGRESS').length
  const riskTickets = payload.items.filter((item) => item.slaState === 'BREACHED' || item.slaState === 'WARNING').length
  const mineTickets = mine
    ? totalTickets
    : payload.items.filter((item) => item.picUsername && item.picUsername.toLowerCase() === session.username.toLowerCase()).length
  const typeCounts = {
    PSB: payload.items.filter((item) => item.ticketType === 'PSB').length,
    TROUBLESHOOTS: payload.items.filter((item) => item.ticketType === 'TROUBLESHOOTS').length,
    DISMANTLE: payload.items.filter((item) => item.ticketType === 'DISMANTLE').length,
    JALUR: payload.items.filter((item) => item.ticketType === 'JALUR').length,
    OTHER: payload.items.filter((item) => item.ticketType === 'OTHER').length,
  } satisfies Record<NocTicketType, number>

  const buildFilterHref = (patch: Partial<{ ticketType: string; queueStatus: string; slaState: string; mine: string }>) =>
    buildNocQueueFilterHref({ q, ticketType, queueStatus, slaState, mine, patch })

  const workspaceLabel = getWorkspaceLabel(session.role)

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <NocQueuePageClient
        q={q}
        ticketType={ticketType}
        queueStatus={queueStatus}
        slaState={slaState}
        mine={mine}
        canCreateDeviceLifecycle={canCreateDeviceLifecycle}
        canUpdateSupport={canUpdateSupport}
        canUpdateWorkOrder={canUpdateWorkOrder}
        reviewDbReady={reviewDbReady}
        totalTickets={totalTickets}
        activeTickets={activeTickets}
        riskTickets={riskTickets}
        mineTickets={mineTickets}
        typeCounts={typeCounts}
        items={payload.items}
        otherItems={payload.otherItems}
        itemSuggestions={itemSuggestions as any}
        error={payload.error ?? null}
        buildFilterHref={buildFilterHref}
        workspaceLabel={workspaceLabel}
      />
    </div>
  )
}
