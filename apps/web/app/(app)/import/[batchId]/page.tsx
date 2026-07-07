import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { ImportBatchDetailView } from '@/components/import-batch-detail-view'
import { canAccessPath, canPerformAction } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { getImportBatchDetail } from '@/lib/services/import-service'

export default async function ImportBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/import')) {
    redirect('/dashboard')
  }

  const { batchId } = await params
  const { source, batch, detail } = await getImportBatchDetail(batchId)
  const canUpload = canPerformAction(session.role, 'import_center', 'create')
  const canApprove = canPerformAction(session.role, 'import_center', 'approve')

  if (!batch || !detail) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <ImportBatchDetailView
        batch={batch!}
        detail={detail!}
        canUpload={canUpload}
        canApprove={canApprove}
        reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
      />
    </div>
  )
}

