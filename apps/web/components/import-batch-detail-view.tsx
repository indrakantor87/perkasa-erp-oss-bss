import Link from 'next/link'
import { ImportBatchActionPanel } from '@/components/import-batch-action-panel'
import { ImportBatchUploadForm } from '@/components/import-batch-upload-form'
import { ImportBatchRowReview } from '@/components/import-batch-row-review'
import type { BatchDetail, ImportBatch } from '@/lib/types'

const actionTone: Record<BatchDetail['actions'][number]['status'], string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-rose-50 text-rose-700',
  INFO: 'bg-blue-50 text-blue-700',
}

const runTone: Record<BatchDetail['transformRuns'][number]['status'], string> = {
  RUNNING: 'bg-blue-50 text-blue-700',
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-rose-50 text-rose-700',
}

export function ImportBatchDetailView({
  batch,
  detail,
  canUpload,
  canApprove,
  reviewDbReady,
}: {
  batch: ImportBatch
  detail: BatchDetail
  canUpload: boolean
  canApprove: boolean
  reviewDbReady: boolean
}) {
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">{batch.sourceSystem}</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {detail.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{detail.summary}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/import" className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              Kembali ke daftar batch
            </Link>
            <span className="badge border-transparent bg-blue-50 text-blue-700">{detail.status}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Scope</p>
            <p className="mt-3 text-sm font-semibold text-slate-950">{detail.scope}</p>
          </article>
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Valid row</p>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              {batch.validRows.toLocaleString('id-ID')} dari {batch.totalRows.toLocaleString('id-ID')}
            </p>
          </article>
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Catatan</p>
            <p className="mt-3 text-sm font-semibold text-slate-950">{batch.note}</p>
          </article>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">File sumber</p>
            <p className="mt-3 text-sm font-semibold text-slate-950">{batch.sourceFileName || '-'}</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              Metadata file sumber akan terhubung ke batch ini sebagai dasar validasi dan transform tahap berikutnya.
            </p>
          </article>

          <ImportBatchUploadForm
            batchId={batch.id}
            batchCode={batch.batchCode}
            sourceFileName={batch.sourceFileName}
            canUpload={canUpload}
            reviewDbReady={reviewDbReady}
          />
        </div>

        <ImportBatchActionPanel
          batchId={batch.id}
          batch={batch}
          canApprove={canApprove}
          reviewDbReady={reviewDbReady}
        />
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <p className="section-title">Histori aksi</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Jejak aktivitas batch import
          </h3>
        </div>

        <div className="space-y-4 p-4 md:p-6">
          {detail.actions.length > 0 ? (
            detail.actions.map((action) => (
              <article key={action.id} className="rounded-2xl border border-line bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-950">{action.actionType}</span>
                      <span className={`badge border-transparent ${actionTone[action.status]}`}>
                        {action.status}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{action.detail}</p>
                  </div>
                  <div className="text-sm text-mute md:text-right">
                    <p className="font-semibold text-slate-950">{action.actor}</p>
                    <p className="mt-1">{action.happenedAt}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="rounded-2xl border border-dashed border-line bg-slate-50 p-5 text-sm text-mute">
              Histori aksi batch belum tersedia. Jalankan create, upload, validasi, atau transform untuk mulai membangun timeline.
            </article>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <p className="section-title">Histori transform</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Eksekusi tahap 1-4 per batch
          </h3>
        </div>

        <div className="space-y-4 p-4 md:p-6">
          {detail.transformRuns.length > 0 ? (
            detail.transformRuns.map((run) => (
              <article key={run.id} className="rounded-2xl border border-line bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-950">Stage {run.stage}</span>
                      <span className={`badge border-transparent ${runTone[run.status]}`}>{run.status}</span>
                      <span className="badge border-transparent bg-white text-slate-700">
                        {run.executedStatements} stmt
                      </span>
                      <span className="badge border-transparent bg-white text-slate-700">
                        {Math.round(run.durationMs / 1000)}s
                      </span>
                    </div>
                    {run.error ? <p className="text-sm leading-6 text-rose-700">{run.error}</p> : null}
                    <p className="text-sm leading-6 text-slate-700">
                      Start: {run.startedAt} • Finish: {run.finishedAt}
                    </p>
                  </div>
                  <div className="text-sm text-mute md:text-right">
                    <p className="font-semibold text-slate-950">{run.actor}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="rounded-2xl border border-dashed border-line bg-slate-50 p-5 text-sm text-mute">
              Histori transform belum tersedia. Jalankan transform tahap 1-4 untuk membangun log eksekusi per batch.
            </article>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <p className="section-title">Row staging</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Review hasil mapping dan target final
          </h3>
        </div>
        <ImportBatchRowReview rows={detail.rows} />
      </section>
    </div>
  )
}
