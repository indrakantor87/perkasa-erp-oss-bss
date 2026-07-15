import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { DomainShell } from '@/components/domain-shell'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { DomainFormPrefill } from '@/lib/types'

type InventoryWorkspaceKey = 'items' | 'racks' | 'requests' | 'receipts' | 'movements' | 'loans' | 'network'

const inventoryWorkspaceViewMap: Record<InventoryWorkspaceKey, 'items' | 'requests' | 'movements' | 'network'> = {
  items: 'items',
  racks: 'items',
  requests: 'requests',
  receipts: 'movements',
  movements: 'movements',
  loans: 'movements',
  network: 'network',
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function isInventoryWorkspaceKey(value: string): value is InventoryWorkspaceKey {
  return value in inventoryWorkspaceViewMap
}

export default async function InventoryWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    inventoryAction?: string | string[]
    lead?: string | string[]
    order?: string | string[]
    invoice?: string | string[]
    service?: string | string[]
    itemCode?: string | string[]
    request?: string | string[]
    employee?: string | string[]
    attendance?: string | string[]
    loan?: string | string[]
    payroll?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const { workspace } = await params
  if (!isInventoryWorkspaceKey(workspace)) {
    notFound()
  }

  const resolvedSearchParams = await searchParams
  const inventoryAction = resolveSearchParam(resolvedSearchParams.inventoryAction)
  const payload = await getDomainPageData('inventory', session, {
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    notFound()
  }

  const domainPrefill: DomainFormPrefill = {
    lead: resolveSearchParam(resolvedSearchParams.lead),
    order: resolveSearchParam(resolvedSearchParams.order),
    invoice: resolveSearchParam(resolvedSearchParams.invoice),
    service: resolveSearchParam(resolvedSearchParams.service),
    itemCode: resolveSearchParam(resolvedSearchParams.itemCode),
    request: resolveSearchParam(resolvedSearchParams.request),
    employee: resolveSearchParam(resolvedSearchParams.employee),
    attendance: resolveSearchParam(resolvedSearchParams.attendance),
    loan: resolveSearchParam(resolvedSearchParams.loan),
    payroll: resolveSearchParam(resolvedSearchParams.payroll),
  }

  return (
    <DomainShell
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      domainPrefill={domainPrefill}
      inventoryView={inventoryWorkspaceViewMap[workspace]}
      inventoryAction={inventoryAction}
      hideInventoryWorkspaceTabs
    />
  )
}
