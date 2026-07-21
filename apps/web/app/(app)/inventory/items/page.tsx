import { notFound, redirect } from 'next/navigation'
import { InventoryItemsWorkspacePage } from '@/components/inventory-items-workspace-page'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
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

export default async function InventoryItemsPage({
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
  const [payload, lifecyclePayload] = await Promise.all([
    getDomainPageData('inventory', session, {
      focus: resolveSearchParam(resolvedSearchParams.focus),
      month: resolvePositiveIntegerParam(resolvedSearchParams.month),
      year: resolvePositiveIntegerParam(resolvedSearchParams.year),
    }),
    getDeviceLifecycleLogs({ limit: 40 }),
  ])

  if (!payload) {
    notFound()
  }

  return (
    <InventoryItemsWorkspacePage
      source={payload.source}
      sections={payload.content.reviewSections ?? []}
      lifecycleItems={lifecyclePayload.items}
      canCreate={canPerformAction(session.role, 'inventory', 'create')}
      canUpdate={canPerformAction(session.role, 'inventory', 'update')}
      reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
    />
  )
}
