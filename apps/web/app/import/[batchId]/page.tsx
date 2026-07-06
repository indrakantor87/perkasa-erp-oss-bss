import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { ImportBatchDetailView } from '@/components/import-batch-detail-view'
import { canAccessPath } from '@/lib/access-control'
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

  if (!batch || !detail) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <ImportBatchDetailView batch={batch!} detail={detail!} />
    </div>
  )
}
