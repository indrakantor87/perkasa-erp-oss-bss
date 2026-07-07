import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control'
import { DomainShell } from '@/components/domain-shell'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { DomainKey } from '@/lib/types'

const enabledDomains: DomainKey[] = ['sales', 'customers', 'support', 'inventory', 'hr', 'billing']

export function generateStaticParams() {
  return enabledDomains.map((domain) => ({ domain }))
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const session = await requireSession()

  const { domain } = await params
  if (!canAccessPath(session.role, `/${domain}`)) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData(domain as DomainKey, session.role)

  if (!payload) {
    notFound()
  }

  return <DomainShell content={payload.content} source={payload.source} capabilities={payload.capabilities} />
}

