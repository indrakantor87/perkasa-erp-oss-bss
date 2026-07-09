import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import type { DomainKey } from '@/lib/types'

const enabledDomains: DomainKey[] = ['sales', 'customers', 'support', 'inventory', 'hr', 'billing']

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function generateStaticParams() {
  return enabledDomains.map((domain) => ({ domain }))
}

export default async function DomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{
    lane?: string | string[]
    ticket?: string | string[]
    isolation?: string | string[]
    type?: string | string[]
  }>
}) {
  const session = await requireSession()

  const { domain } = await params
  const resolvedSearchParams = await searchParams
  if (!canAccessPath(session.role, `/${domain}`)) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData(domain as DomainKey, session.role, {
    supportLane: normalizeSupportLane(resolvedSearchParams.lane),
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
      supportFocus={payload.supportFocus}
      supportPrefill={{
        ticket: resolveSearchParam(resolvedSearchParams.ticket),
        isolation: resolveSearchParam(resolvedSearchParams.isolation),
        type: resolveSearchParam(resolvedSearchParams.type),
      }}
    />
  )
}
