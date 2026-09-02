import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryNetworkOpsPanel } from '@/components/inventory-network-ops-panel'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDomainPageData } from '@/lib/services/domain-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default async function SalesPortOdpPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/port-odp')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDomainPageData('inventory', session, {
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    redirect('/sales')
  }

  const reviewSections = payload.content.reviewSections ?? []

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
              Port ODP
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muteStrong">
              Halaman ini berdiri sendiri khusus untuk membaca coverage area, kapasitas ODP, marker peta, dan jarak rumah prospek ke ODP terdekat
              tanpa membawa workspace inventory yang tidak relevan ke UI penjualan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales"
              className="rounded-md border border-line bg-surfaceSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Kembali ke Penjualan
            </Link>
          </div>
        </div>
      </section>

      <InventoryNetworkOpsPanel
        sections={reviewSections}
        canCreate={false}
        canUpdate={false}
        reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
        itemSuggestions={[]}
        odpSuggestions={[]}
        assignmentSuggestions={[]}
        lifecycleItems={[]}
        showDeviceReturnForm={false}
        mode="sales-odp-focus"
      />
    </div>
  )
}
