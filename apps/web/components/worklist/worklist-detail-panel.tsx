import Link from 'next/link'
import type { WorklistItem } from '@/lib/types'

export function WorklistDetailPanel({ item }: { item: WorklistItem | null }) {
  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Panel Detail</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Item aktif dan CTA tindak lanjut</h3>
        </div>
        {item ? <span className="badge border-slate-200 bg-white text-slate-600">{item.queue}</span> : null}
      </div>

      {item ? (
        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-slate-200 bg-white text-slate-600">{item.domain}</span>
              <span className="badge border-transparent bg-slate-950 text-white">{item.status}</span>
              <span className="badge border-slate-200 bg-white text-slate-600">{item.priority}</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-slate-950">{item.title}</h4>
              <p className="mt-1 text-sm font-medium text-slate-700">{item.subtitle}</p>
            </div>
            <p className="text-sm leading-6 text-mute">{item.detail}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Alasan Muncul</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason || '-'}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Langkah Berikut</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.nextAction || '-'}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">PIC / Target</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.owner || '-'}</p>
              <p className="mt-1 text-sm leading-6 text-mute">{item.dueLabel || 'Belum ada target eksplisit'}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blocker</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.blockingInfo || 'Belum ada blocker eksplisit.'}</p>
            </article>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CTA</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={item.href}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {item.actionLabel}
              </Link>
              <span className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Prefill token: {item.prefillToken || '-'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-mute">
          Belum ada item yang terpilih. Pilih salah satu baris pada daftar item untuk melihat konteks
          lintas domain dan CTA utamanya.
        </div>
      )}
    </section>
  )
}
