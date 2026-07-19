import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { DismantleListWorkspace } from '@/components/dismantle-list-workspace'
import { canAccessPath, canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { getDismantleListPageData } from '@/lib/services/dismantle-list-service'
import { getServerUiLanguage } from '@/lib/ui-language-server'

export default async function ListDismantlePage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string | string[]
    owner?: string | string[]
    q?: string | string[]
    selected?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/list-dismantle')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDismantleListPageData(resolvedSearchParams)
  const language = await getServerUiLanguage()
  const roleMeta = getRoleMeta(session.role, language)
  const writeSource = getDataSourceSnapshot()
  const reviewDbReady = writeSource.effectiveMode === 'review-db' && !writeSource.isFallback
  const canUpdate =
    canPerformAction(session.role, 'support', 'update') ||
    canPerformAction(session.role, 'billing', 'update') ||
    canPerformAction(session.role, 'customers', 'update')
  const canApprove =
    canPerformAction(session.role, 'support', 'approve') ||
    canPerformAction(session.role, 'billing', 'approve') ||
    canPerformAction(session.role, 'customers', 'approve')

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <DismantleListWorkspace
        payload={payload}
        roleLabel={roleMeta.label}
        canUpdate={canUpdate}
        canApprove={canApprove}
        reviewDbReady={reviewDbReady}
      />
    </div>
  )
}
