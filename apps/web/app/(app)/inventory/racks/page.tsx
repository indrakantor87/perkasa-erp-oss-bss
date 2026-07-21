import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryRackLayoutPanel } from '@/components/inventory-rack-layout-panel'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default async function InventoryRacksPage({
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
    notFound()
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <p className="section-title">Penataan Rak Inventory</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
          Kelola lokasi rak dan barcode rak tanpa panel lain
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-mute">
          Halaman ini difokuskan khusus untuk penataan rak agar tim gudang bisa mengatur lokasi fisik item dan barcode rak
          tanpa tercampur dengan form input item atau audit barcode.
        </p>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5">
        <InventoryRackLayoutPanel
          canUpdate={canPerformAction(session.role, 'inventory', 'update')}
          reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
        />
      </section>
    </div>
  )
}
