import { DataSourceStatus } from '@/components/data-source-status'
import { ImportBatchCreateForm } from '@/components/import-batch-create-form'
import { ImportBatchTable } from '@/components/import-batch-table'
import { ImportTransformStageList } from '@/components/import-transform-stage-list'
import { canAccessPath, canPerformAction } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getImportOverview } from '@/lib/services/import-service'

export default async function ImportPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/import')) {
    redirect('/dashboard')
  }

  const { source, overview } = await getImportOverview()
  const canCreate = canPerformAction(session.role, 'import_center', 'create')

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Batch aktif</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {overview.items.length}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Row review</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {overview.totalRows.toLocaleString('id-ID')}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Batch imported</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {overview.importedBatches}
          </p>
        </article>
      </section>

      <ImportBatchCreateForm
        canCreate={canCreate}
        reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
      />

      <ImportBatchTable items={overview.items} />
      <ImportTransformStageList items={overview.stages} />
    </div>
  )
}

