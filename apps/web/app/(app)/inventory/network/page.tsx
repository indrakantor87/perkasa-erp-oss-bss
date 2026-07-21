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

export default async function InventoryNetworkPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDomainPageData('inventory', session, {
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    redirect('/inventory')
  }

  const reviewSections = payload.content.reviewSections ?? []

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Inventory Workspace</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">
              Networks & ODP
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
              Halaman ini berdiri sendiri untuk pembacaan kapasitas ODP, status port, marker peta, dan coverage area tanpa
              membawa form inventory lain yang tidak relevan ke workspace operasional.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/inventory"
              className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Kembali ke Inventory
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
        mode="ops-odp-focus"
      />
    </div>
  )
}
