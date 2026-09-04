import { notFound, redirect } from 'next/navigation'
import { SalesDomainListPage } from '@/components/sales-domain-list-page'
import { canPerformAction } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getSalesDomainListPageData } from '@/lib/services/domain-service'

export default async function SalesCoveredAreasPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/covered-areas')) {
    redirect('/dashboard')
  }

  const source = getDataSourceSnapshot()
  if (!source) {
    notFound()
  }

  const canCreate = canPerformAction(session.role, 'sales', 'create')
  const canUpdate = canPerformAction(session.role, 'sales', 'update')
  const canApprove = canPerformAction(session.role, 'sales', 'approve')
  const canExport = canPerformAction(session.role, 'sales', 'export')
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback

  let isLoading = reviewDbReady
  let errorMessage: string | null = null
  let rows: Awaited<ReturnType<typeof getSalesDomainListPageData>>['rows'] | undefined
  if (reviewDbReady) {
    try {
      const list = await getSalesDomainListPageData('covered-areas', source, session.role)
      isLoading = list.isLoading
      errorMessage = list.errorMessage
      rows = list.rows
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Gagal memuat data covered areas.'
      isLoading = false
    }
  }

  return (
    <SalesDomainListPage
      entityKey="covered-areas"
      role={session.role}
      displayName={session.displayName}
      username={session.username}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canApprove={canApprove}
      canExport={canExport}
      reviewDbReady={reviewDbReady}
      isLoading={isLoading}
      errorMessage={errorMessage}
      rows={rows}
    />
  )
}
