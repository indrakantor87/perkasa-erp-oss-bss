import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryRequestOpsPanel } from '@/components/inventory-request-ops-panel'
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
    .map((row) => {
      const rack = row.meta.find((item) => item.startsWith('Rack: '))?.replace('Rack: ', '').trim() || '-'
      const rackBarcode =
        row.meta.find((item) => item.startsWith('Rack Barcode: '))?.replace('Rack Barcode: ', '').trim() || row.primary
      return `${rackBarcode} | ${row.primary} | ${row.secondary} | ${rack}`
    })
    .filter(Boolean)
}

function buildRequestSuggestions(sections: DomainReviewSection[]) {
  return sections
    .filter((section) => section.title.toUpperCase().includes('REQUEST INVENTORY'))
    .flatMap((section) => section.rows)
    .map((row) => {
      const requestId = row.id.replace(/^REQ-/, '').trim()
      const subdivision = row.meta.find((item) => item.startsWith('Sub-divisi: '))?.replace('Sub-divisi: ', '').trim() || '-'
      const rackBarcode =
        row.meta.find((item) => item.startsWith('Rack Barcode: '))?.replace('Rack Barcode: ', '').trim() || row.primary
      return requestId ? `${requestId} | ${row.primary} | ${rackBarcode} | ${row.secondary} | ${subdivision} | ${row.status}` : ''
    })
    .filter(Boolean)
}

function buildMovementRows(sections: DomainReviewSection[]) {
  return sections.find((section) => section.title.toUpperCase().includes('STOCK MOVEMENT'))?.rows ?? []
}

export default async function InventoryRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    itemCode?: string | string[]
    request?: string | string[]
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

      <InventoryRequestOpsPanel
        sections={sections}
        canRequestCreate={canPerformAction(session.role, 'inventory', 'create')}
        canProcessRequest={canPerformAction(session.role, 'inventory', 'update')}
        reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
        itemSuggestions={buildItemSuggestions(sections)}
        requestSuggestions={buildRequestSuggestions(sections)}
        rackSuggestions={buildRackSuggestions(sections)}
        movementRows={buildMovementRows(sections)}
        requireScan={!['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(session.role)}
        initialItemValue={resolveSearchParam(resolvedSearchParams.itemCode)}
        initialRequestValue={resolveSearchParam(resolvedSearchParams.request)}
      />
    </div>
  )
}
