import { redirect } from 'next/navigation'
import { CsAdminWorkspaceDashboard } from '@/components/cs-admin-workspace-dashboard'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import { buildWorklistHref, getWorklistBucketsData } from '@/lib/services/worklist-service'
import type { AppRole, DashboardOperationalCard, DashboardSummary, WorklistItem } from '@/lib/types'
import type { WorklistBucketData } from '@/lib/services/worklist-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const trackedQueues = ['Perlu Approval', 'Perlu Koreksi', 'Transfer atau Restore', 'Queue Risiko Tinggi'] as const

function formatCount(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.max(0, Number(value) || 0))
}

function normalizeDomain(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function flattenBucketItems(buckets: WorklistBucketData[]) {
  return buckets.flatMap((bucket) => bucket.items)
}

function countItemsByDomains(items: WorklistItem[], domains: string[]) {
  const allowed = new Set(domains.map((domain) => normalizeDomain(domain)))
  return items.filter((item) => allowed.has(normalizeDomain(item.domain))).length
}

function findBucket(buckets: WorklistBucketData[], queue: string) {
  return buckets.find((bucket) => bucket.queue === queue) ?? null
}

function buildCsReportingCards(
  role: AppRole,
  buckets: WorklistBucketData[],
  summary: DashboardSummary,
) {
  const allItems = flattenBucketItems(buckets)
  const correctionBucket = findBucket(buckets, 'Perlu Koreksi')
  const transferBucket = findBucket(buckets, 'Transfer atau Restore')
  const riskBucket = findBucket(buckets, 'Queue Risiko Tinggi')

  const customerBacklog = countItemsByDomains(allItems, ['Customers', 'Sales'])
  const inventoryBacklog = countItemsByDomains(allItems, ['Inventory'])
  const supportBacklog = countItemsByDomains(allItems, ['Support'])
  const inventoryCorrectionCount = countItemsByDomains(correctionBucket?.items ?? [], ['Inventory'])
  const supportRiskCount = countItemsByDomains(riskBucket?.items ?? [], ['Support'])

  return [
    ({
      key: 'SALES',
      title: 'Customer',
      badge: 'Customer',
      description:
        'Ringkasan customer dan order pemasangan baru yang paling sering dibaca CS untuk follow-up harian.',
      href: '/customers',
      tone: 'border-sky-200 bg-sky-50 text-sky-900',
      metrics: [
        {
          label: 'Customer Aktif',
          value: formatCount(summary.customers),
          href: '/customers',
          hint: 'Master customer aktif yang menjadi dasar pembacaan pemasangan dan tindak lanjut layanan.',
        },
        {
          label: 'Order Bulan Ini',
          value: formatCount(summary.orders),
          href: '/sales?focus=MONTHLY_ORDERS',
          hint: 'Order pemasangan baru yang masuk dari marketing atau penjualan pada periode berjalan.',
        },
        {
          label: 'Follow Up CS',
          value: formatCount(customerBacklog),
          href: buildWorklistHref(role, { queue: 'Perlu Koreksi' }),
          hint: 'Jumlah backlog customer dan sales yang sedang menunggu pembacaan atau koreksi dari CS.',
        },
      ],
    } satisfies DashboardOperationalCard),
    ({
      key: 'CS',
      title: 'Isolir',
      badge: 'Isolir',
      description:
        'Ringkasan suspend aktif dan keputusan restore/transfer yang perlu dibaca cepat oleh tim CS.',
      href: '/support/isolations',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      metrics: [
        {
          label: 'Isolir Aktif',
          value: formatCount(summary.isolations),
          href: '/support/isolations?focus=ACTIVE_ISOLATIONS',
          hint: 'Pelanggan yang masih berada pada jalur isolir aktif dan perlu tindak lanjut layanan.',
        },
        {
          label: 'Transfer atau Restore',
          value: formatCount(transferBucket?.totalCount ?? 0),
          href: buildWorklistHref(role, { queue: 'Transfer atau Restore' }),
          hint: 'Kasus yang menunggu keputusan apakah dipulihkan, diteruskan, atau ditutup sebagai terminasi.',
        },
        {
          label: 'Menunggu Keputusan',
          value: formatCount(transferBucket?.summary.waitingCount ?? 0),
          href: buildWorklistHref(role, { queue: 'Transfer atau Restore', status: 'OPEN' }),
          hint: 'Item isolir yang masih menunggu keputusan akhir supervisor atau tindak lanjut lintas tim.',
        },
      ],
    } satisfies DashboardOperationalCard),
    ({
      key: 'INVENTORY',
      title: 'ODP dan Port',
      badge: 'ODP dan Port',
      description:
        'Ringkasan ODP dan port untuk membaca kapasitas, assignment, dan follow up customer dengan ownership UI di CS.',
      href: '/customers/cs-admin/odp-port',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      metrics: [
        {
          label: 'Item Aktif',
          value: formatCount(summary.inventoryItems),
          href: '/customers/cs-admin/odp-port?focus=ACTIVE_ITEMS',
          hint: 'Jumlah item inventory aktif yang masih dipakai membaca kesiapan ODP dan port.',
        },
        {
          label: 'Perlu Koreksi',
          value: formatCount(inventoryCorrectionCount),
          href: buildWorklistHref(role, { queue: 'Perlu Koreksi', domain: 'Inventory' }),
          hint: 'Backlog inventory yang masih perlu dikoreksi agar pembacaan ODP dan port tetap sinkron.',
        },
        {
          label: 'Perlu Follow Up',
          value: formatCount(inventoryBacklog),
          href: '/customers/cs-admin/odp-port',
          hint: 'Jumlah pekerjaan inventory aktif yang sedang berdampak ke kesiapan teknis atau kapasitas lapangan.',
        },
      ],
    } satisfies DashboardOperationalCard),
    ({
      key: 'NOC',
      title: 'Ticketing',
      badge: 'Ticketing',
      description:
        'Ringkasan ticketing terpadu untuk membaca PSB, Troubleshoots, Dismantle, dan Jalur dalam satu pembacaan cepat.',
      href: '/dashboard/tracking/noc-queue',
      tone: 'border-violet-200 bg-violet-50 text-violet-900',
      metrics: [
        {
          label: 'Ticket Open',
          value: formatCount(summary.troubleTickets),
          href: '/dashboard/tracking/noc-queue?queueStatus=OPEN',
          hint: 'Ticket operasional yang masih terbuka dan perlu pembacaan cepat dari tim CS.',
        },
        {
          label: 'Risiko Tinggi',
          value: formatCount(supportRiskCount),
          href: buildWorklistHref(role, { queue: 'Queue Risiko Tinggi', domain: 'Support' }),
          hint: 'Kasus support berisiko tinggi yang berpotensi menahan SLA atau eskalasi customer.',
        },
        {
          label: 'Perlu Follow Up',
          value: formatCount(supportBacklog),
          href: '/dashboard/tracking/noc-queue',
          hint: 'Jumlah backlog support aktif yang masih membutuhkan update, kontrol, atau keputusan lanjutan.',
        },
      ],
    } satisfies DashboardOperationalCard),
  ] satisfies DashboardOperationalCard[]
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
  const reportingCards = buildCsReportingCards(session.role, payload.buckets, dashboardPayload.summary)

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
