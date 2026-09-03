import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { PsbListWorkspace } from '@/components/psb-list-workspace'
import { canAccessPath, canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { getPsbListPageData } from '@/lib/services/psb-list-service'
import { getServerUiLanguage } from '@/lib/ui-language-server'

export default async function ListPsbPage({
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
  if (!canAccessPath(session.role, '/list-psb')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getPsbListPageData(resolvedSearchParams, session)
  const language = await getServerUiLanguage()
  const roleMeta = getRoleMeta(session.role, language)
  const writeSource = getDataSourceSnapshot()
  const reviewDbReady = writeSource.effectiveMode === 'review-db' && !writeSource.isFallback
  const canUpdate =
    canPerformAction(session.role, 'sales', 'update') ||
    canPerformAction(session.role, 'customers', 'update')
  const canApprove =
    canPerformAction(session.role, 'sales', 'approve') ||
    canPerformAction(session.role, 'customers', 'approve')
  const canExport = canPerformAction(session.role, 'sales', 'export')

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <PsbListWorkspace
        payload={payload}
        roleLabel={roleMeta.label}
        canUpdate={canUpdate}
        canApprove={canApprove}
        canExport={canExport}
        reviewDbReady={reviewDbReady}
      />
    </div>
  )
}
