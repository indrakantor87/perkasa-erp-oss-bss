import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import CsAdminPageClient from '@/components/cs-admin-page-client'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import { buildWorklistHref, getWorklistBucketsData } from '@/lib/services/worklist-service'
import type { DashboardSummary, WorklistItem } from '@/lib/types'
import type { WorklistBucketData } from '@/lib/services/worklist-service'

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

function buildCsFollowUpRows(buckets: WorklistBucketData[]) {
  return buckets.flatMap((bucket) =>
    bucket.items.map((item) => ({
      ...item,
      bucketQueue: bucket.queue,
    })),
  )
}

function buildCsSummary(summary: DashboardSummary, buckets: WorklistBucketData[]) {
  const allItems = flattenBucketItems(buckets)
  const correctionBucket = findBucket(buckets, 'Perlu Koreksi')
  const transferBucket = findBucket(buckets, 'Transfer atau Restore')
  const riskBucket = findBucket(buckets, 'Queue Risiko Tinggi')

  return {
    customerBacklog: countItemsByDomains(allItems, ['Customers', 'Sales']),
    correctionCount: correctionBucket?.totalCount ?? 0,
    transferCount: transferBucket?.totalCount ?? 0,
    transferWaitingCount: transferBucket?.summary.waitingCount ?? 0,
    riskCount: riskBucket?.totalCount ?? 0,
    customerCount: summary.customers,
    orderCount: summary.orders,
    isolationCount: summary.isolations,
    troubleTicketCount: summary.troubleTickets,
    inventoryCount: summary.inventoryItems,
  }
}

export default async function CsAdminWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'cs-admin')) {
    redirect('/dashboard')
  }

  const [payload, dashboardPayload] = await Promise.all([
    getWorklistBucketsData(session, [...trackedQueues]),
    getDashboardPageData(session),
  ])
  const summary = buildCsSummary(dashboardPayload.summary, payload.buckets)
  const followUpRows = buildCsFollowUpRows(payload.buckets).slice(0, 12)

  const bucketsWithHref = payload.buckets.map((bucket) => ({
    ...bucket,
    href: buildWorklistHref(session.role, { queue: bucket.queue }),
  }))

  const worklistCorrectionHref = buildWorklistHref(session.role, { queue: 'Perlu Koreksi' })

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">CS & Admin CS</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
              Customer / CS & Admin CS
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muteStrong">
              Halaman ini difokuskan untuk pembacaan customer, order berjalan, koreksi data, dan keputusan
              CS harian. Menu lain tetap dibuka dari sidebar agar tiap modul berdiri sendiri dan tidak
              bercampur seperti workspace besar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/customers"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-accentInk"
            >
              Buka Customer
            </Link>
            <Link
              href="/list-psb"
              className="rounded-md border border-line bg-surfaceSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Buka Data PSB
            </Link>
            <Link
              href="/dashboard/tracking/noc-queue"
              className="rounded-md border border-line bg-surfaceSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Buka Ticketing
            </Link>
          </div>
        </div>
      </section>

      <CsAdminPageClient
        summary={summary}
        buckets={bucketsWithHref as any}
        baseCount={payload.baseCount}
        followUpRows={followUpRows as any}
        worklistHref=""
        worklistCorrectionHref={worklistCorrectionHref}
        isolationCount={summary.isolationCount}
        troubleTicketCount={summary.troubleTicketCount}
        inventoryCount={summary.inventoryCount}
        transferWaitingCount={summary.transferWaitingCount}
        transferCount={summary.transferCount}
        correctionCount={summary.correctionCount}
        riskCount={summary.riskCount}
      />
    </div>
  )
}
