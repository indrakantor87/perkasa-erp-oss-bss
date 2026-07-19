import { redirect } from 'next/navigation'
import { CsAdminWorkspaceDashboard } from '@/components/cs-admin-workspace-dashboard'
import { requireSession } from '@/lib/auth'
import { buildSuperAdminCoreOperationalCards } from '@/lib/dashboard-super-admin-core'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import { getWorklistBucketsData } from '@/lib/services/worklist-service'
import type { DashboardOperationalCard, DashboardSummary } from '@/lib/types'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const trackedQueues = ['Perlu Approval', 'Perlu Koreksi', 'Transfer atau Restore', 'Queue Risiko Tinggi'] as const

function buildCsReportingCards(
  cards: DashboardOperationalCard[],
  metrics: Awaited<ReturnType<typeof getDashboardPageData>>['metrics'],
  summary: DashboardSummary,
) {
  const coreCards = buildSuperAdminCoreOperationalCards({ cards, metrics })
  const customerCard = coreCards.find((card) => card.key === 'SALES')
  const isolirCard = coreCards.find((card) => card.key === 'CS')
  const inventoryCard =
    coreCards.find((card) => card.key === 'INVENTORY') ??
    ({
      key: 'INVENTORY',
      title: 'ODP dan Port',
      badge: 'ODP dan Port',
      description:
        'Ringkasan ODP dan port untuk membaca kapasitas, pergerakan, dan request yang biasa dipakai bersama GA dan NOC.',
      href: '/inventory',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      metrics: [
        {
          label: 'Item Aktif',
          value: String(summary.inventoryItems ?? 0),
          href: '/inventory?focus=ACTIVE_ITEMS',
          hint: 'Jumlah item inventory aktif yang masih dipakai membaca kesiapan ODP dan port.',
        },
        {
          label: 'Mutasi Bulan Ini',
          value: '0',
          href: '/inventory?focus=MONTHLY_MOVEMENTS',
          hint: 'Pergerakan barang periode berjalan untuk membaca ritme perubahan kapasitas lapangan.',
        },
        {
          label: 'Request Pending',
          value: '0',
          href: '/inventory?focus=PENDING_REQUESTS',
          hint: 'Permintaan inventory yang masih menunggu proses dan bisa berdampak ke kesiapan teknis.',
        },
      ],
    } satisfies DashboardOperationalCard)
  const ticketingCard = coreCards.find((card) => card.key === 'NOC')

  return [customerCard, isolirCard, inventoryCard, ticketingCard]
    .filter((card): card is DashboardOperationalCard => Boolean(card))
    .map((card) => {
      if (card.key !== 'INVENTORY') {
        return card
      }

      return {
        ...card,
        title: 'ODP dan Port',
        badge: 'ODP dan Port',
        description:
          'Ringkasan ODP dan port untuk membaca kapasitas, pergerakan, dan request yang biasa dipakai bersama GA dan NOC.',
      }
    })
}

export default async function CsAdminWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<{
    queue?: string | string[]
    selected?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'cs-admin')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedQueue = resolveSearchParam(resolvedSearchParams.queue) || trackedQueues[0]
  const selectedItemId = resolveSearchParam(resolvedSearchParams.selected)
  const [payload, dashboardPayload] = await Promise.all([
    getWorklistBucketsData(session, [...trackedQueues]),
    getDashboardPageData(session),
  ])
  const reportingCards = buildCsReportingCards(
    dashboardPayload.operationalCards,
    dashboardPayload.metrics,
    dashboardPayload.summary,
  )

  return (
    <CsAdminWorkspaceDashboard
      role={session.role}
      source={payload.source}
      baseCount={payload.baseCount}
      buckets={payload.buckets}
      selectedQueue={selectedQueue}
      selectedItemId={selectedItemId}
      reportCards={reportingCards}
    />
  )
}
