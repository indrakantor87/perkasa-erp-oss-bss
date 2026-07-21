import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryStockReceiptPanel } from '@/components/inventory-stock-receipt-panel'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { DomainReviewSection } from '@/lib/types'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function buildItemSuggestions(sections: DomainReviewSection[]) {
  return sections
    .filter((section) => section.title.toUpperCase().includes('ITEM'))
    .flatMap((section) => section.rows)
    .map((row) => `${row.primary} | ${row.secondary}`)
    .filter(Boolean)
}

function buildRackSuggestions(sections: DomainReviewSection[]) {
  return sections
    .filter((section) => section.title.toUpperCase().includes('ITEM'))
    .flatMap((section) => section.rows)
    .map((row) => row.meta.find((item) => item.startsWith('Rack: '))?.replace('Rack: ', '').trim() ?? '')
    .filter(Boolean)
}

export default async function InventoryReceiptsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    itemCode?: string | string[]
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

  const sections = payload.content.reviewSections ?? []

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />

      <InventoryStockReceiptPanel
        sections={sections}
        canCreate={canPerformAction(session.role, 'inventory', 'create')}
        reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
        itemSuggestions={buildItemSuggestions(sections)}
        rackSuggestions={buildRackSuggestions(sections)}
        requireScan={!['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(session.role)}
        initialItemValue={resolveSearchParam(resolvedSearchParams.itemCode)}
        focusAction="stock-receipt"
      />
    </div>
  )
}
