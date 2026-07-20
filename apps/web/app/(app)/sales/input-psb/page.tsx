import { notFound, redirect } from 'next/navigation'
import { SalesDomainWorkspace } from '@/components/sales-domain-workspace'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDomainPageData } from '@/lib/services/domain-service'

export default async function SalesInputPsbPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/input-psb')) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData('sales', session, {})
  if (!payload) {
    notFound()
  }

  return (
    <SalesDomainWorkspace
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      initialActionPanelOpen
      displayMode="input"
    />
  )
}
