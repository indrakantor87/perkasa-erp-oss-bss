import { redirect } from 'next/navigation'
import { InventoryNetworkOpsPanel } from '@/components/inventory-network-ops-panel'
import { canPerformAction } from '@/lib/access-control'
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
    <div>
      <InventoryNetworkOpsPanel
        sections={reviewSections}
        canCreate={canPerformAction(session.role, 'inventory', 'create')}
        canUpdate={canPerformAction(session.role, 'inventory', 'update')}
        reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
        itemSuggestions={[]}
        odpSuggestions={[]}
        assignmentSuggestions={[]}
        lifecycleItems={[]}
        showDeviceReturnForm={false}
        mode="inventory-odp-focus"
      />
    </div>
  )
}
