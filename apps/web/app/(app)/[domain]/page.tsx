import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import type { DomainKey } from '@/lib/types'

const enabledDomains: DomainKey[] = ['sales', 'customers', 'support', 'inventory', 'hr', 'billing']

export function generateStaticParams() {
  return enabledDomains.map((domain) => ({ domain }))
}

export default async function DomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ lane?: string | string[] }>
}) {
  const session = await requireSession()

  const { domain } = await params
  const resolvedSearchParams = await searchParams
  if (!canAccessPath(session.role, `/${domain}`)) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData(domain as DomainKey, session.role)

  if (!payload) {
    notFound()
  }

  const selectedSupportLane =
    payload.content.key === 'support' ? normalizeSupportLane(resolvedSearchParams.lane) : null

  return (
    <DomainShell
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      selectedSupportLane={selectedSupportLane}
    />
  )
}
