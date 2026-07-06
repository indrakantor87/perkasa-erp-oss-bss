import Link from 'next/link'
import { ImportBatchActionPanel } from '@/components/import-batch-action-panel'
import { ImportBatchUploadForm } from '@/components/import-batch-upload-form'
import type { BatchDetail, ImportBatch } from '@/lib/types'

const rowTone: Record<BatchDetail['rows'][number]['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  MAPPED: 'bg-blue-50 text-blue-700',
  VALID: 'bg-emerald-50 text-emerald-700',
  INVALID: 'bg-rose-50 text-rose-700',
  IMPORTED: 'bg-violet-50 text-violet-700',
  SKIPPED: 'bg-amber-50 text-amber-700',
}

const actionTone: Record<BatchDetail['actions'][number]['status'], string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-rose-50 text-rose-700',
  INFO: 'bg-blue-50 text-blue-700',
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
          <p className="section-title">Row staging</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Review hasil mapping dan target final
          </h3>
        </div>

        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-slate-50 text-mute">
              <tr>
                <th className="px-6 py-4 font-semibold">Legacy ID</th>
                <th className="px-6 py-4 font-semibold">Normalized Key</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Target</th>
                <th className="px-6 py-4 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {detail.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-5 font-medium text-slate-900">{row.legacyId}</td>
                  <td className="px-6 py-5 text-slate-700">{row.normalizedKey}</td>
                  <td className="px-6 py-5">
                    <span className={`badge border-transparent ${rowTone[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="px-6 py-5 text-slate-700">{row.targetId}</td>
                  <td className="px-6 py-5 text-slate-700">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 p-4 md:hidden">
          {detail.rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">{row.legacyId}</p>
                  <p className="mt-1 text-xs text-mute">{row.normalizedKey}</p>
                </div>
                <span className={`badge border-transparent ${rowTone[row.status]}`}>{row.status}</span>
              </div>
              <p className="mt-4 text-sm text-slate-700">Target: {row.targetId}</p>
              <p className="mt-2 text-sm leading-6 text-mute">{row.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
