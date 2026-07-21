import { notFound, redirect } from 'next/navigation'
import { DomainShell } from '@/components/domain-shell'
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

export default async function InventoryOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    inventoryView?: string | string[]
    inventoryAction?: string | string[]
    itemCode?: string | string[]
    request?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}

  if (session.role === 'SUPER_ADMIN') {
    const payload = await getDomainPageData('inventory', session, {
      focus: resolveSearchParam(resolvedSearchParams.focus),
      month: resolvePositiveIntegerParam(resolvedSearchParams.month),
      year: resolvePositiveIntegerParam(resolvedSearchParams.year),
    })

    if (!payload) {
      notFound()
    }

    return (
      <DomainShell
        content={payload.content}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        inventoryView={resolveSearchParam(resolvedSearchParams.inventoryView)}
        inventoryAction={resolveSearchParam(resolvedSearchParams.inventoryAction)}
        domainPrefill={{
          itemCode: resolveSearchParam(resolvedSearchParams.itemCode),
          request: resolveSearchParam(resolvedSearchParams.request),
        }}
      />
    )
  }

  if (session.role === 'FIELD_TECHNICIAN') {
    redirect('/inventory/requests?inventoryAction=item-request')
  }

  redirect('/inventory/network')
}
