import { notFound, redirect } from 'next/navigation'
import { SalesPsbInputForm } from '@/components/sales-psb-input-form'
import { canPerformAction } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDataSourceSnapshot } from '@/lib/data-source'

export default async function SalesInputPsbPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/input-psb')) {
    redirect('/dashboard')
  }

  const source = getDataSourceSnapshot()
  if (!source) {
    notFound()
  }

  return (
    <SalesPsbInputForm
      canCreate={canPerformAction(session.role, 'sales', 'create')}
      reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
      defaultSalesOwner={`${session.displayName} (${session.username})`}
    />
  )
}
