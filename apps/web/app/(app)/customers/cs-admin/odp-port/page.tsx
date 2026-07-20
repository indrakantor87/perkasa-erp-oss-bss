import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryNetworkOpsPanel } from '@/components/inventory-network-ops-panel'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { getDeviceLifecycleLogs } from '@/lib/services/device-lifecycle-service'
import { getDomainPageData } from '@/lib/services/domain-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default async function CsAdminOdpPortPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    inventoryAction?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'cs-admin')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const [payload, lifecyclePayload] = await Promise.all([
    getDomainPageData('inventory', session, {
      focus: resolveSearchParam(resolvedSearchParams.focus),
      month: resolvePositiveIntegerParam(resolvedSearchParams.month),
      year: resolvePositiveIntegerParam(resolvedSearchParams.year),
    }),
    getDeviceLifecycleLogs({ limit: 24 }),
  ])

  if (!payload) {
    redirect('/customers/cs-admin')
  }

  const reviewSections = payload.content.reviewSections ?? []
  const canCreate = payload.capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = payload.capabilities.some((item) => item.action === 'update' && item.enabled)
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback
  const itemSuggestions = reviewSections
    .filter((section) => section.title.toUpperCase().includes('ITEM'))
    .flatMap((section) => section.rows)
    .map((row) => `${row.primary} | ${row.secondary}`)
  const odpSuggestions = reviewSections
    .filter((section) => section.title.toUpperCase().includes('ODP'))
    .flatMap((section) => section.rows)
    .map((row) => `${row.primary} | ${row.secondary}`)
  const assignmentSuggestions = reviewSections
    .filter((section) => section.title.toUpperCase().includes('DEVICE ASSIGNMENT'))
    .flatMap((section) => section.rows)
    .map((row) => {
      const assignmentId = row.id.replace(/^ASSIGN-/, '').trim()
      return assignmentId ? `${assignmentId} | ${row.primary} | ${row.secondary}` : ''
    })
    .filter(Boolean)

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">CS & Admin CS</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">
              ODP dan Port
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
              Workspace ini menjadikan CS sebagai pintu kerja utama untuk membaca kapasitas ODP, status port,
              assignment perangkat, dan return yang berdampak langsung ke customer serta ticketing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/customers/cs-admin"
              className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Kembali ke Workspace CS
            </Link>
            <Link
              href="/inventory/network"
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-950"
            >
              Buka Engine Inventory
            </Link>
          </div>
        </div>
      </section>

      <InventoryNetworkOpsPanel
        sections={reviewSections}
        canCreate={canCreate}
        canUpdate={canUpdate}
        reviewDbReady={reviewDbReady}
        itemSuggestions={itemSuggestions}
        odpSuggestions={odpSuggestions}
        assignmentSuggestions={assignmentSuggestions}
        lifecycleItems={lifecyclePayload.items}
        showDeviceReturnForm={canUpdate}
      />
    </div>
  )
}
