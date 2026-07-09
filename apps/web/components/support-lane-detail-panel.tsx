import Link from 'next/link'
import { getSupportLanePath } from '@/lib/support-lanes'
import type { DomainSupportFocus } from '@/lib/types'

export function SupportLaneDetailPanel({
  supportFocus,
}: {
  supportFocus: DomainSupportFocus
}) {
  const { activeLane, activeWorkspace, reviewSummary } = supportFocus

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-title">Halaman kerja lane</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Ringkasan operasional {activeWorkspace.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Halaman dedicated ini menyorot data prioritas, status dominan, dan item yang perlu
            ditindaklanjuti khusus untuk lane aktif.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/support" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Kembali ke support
          </Link>
          {supportFocus.lanes.map((lane) => (
            <Link
              key={lane.key}
              href={getSupportLanePath(lane.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                lane.key === activeLane ? 'bg-slate-950 text-white' : 'border border-line bg-white text-slate-700'
              }`}
            >
              {lane.shortLabel}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Item lane</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{reviewSummary.totalRows}</p>
          <p className="mt-2 text-sm text-mute">Total row review aktif pada lane ini.</p>
        </article>
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Section aktif</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{reviewSummary.sectionCount}</p>
          <p className="mt-2 text-sm text-mute">Jumlah section review yang sedang dipakai halaman lane.</p>
        </article>
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Status dominan</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{reviewSummary.dominantStatus}</p>
          <p className="mt-2 text-sm text-mute">Status yang paling sering muncul pada lane aktif.</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Item prioritas</p>
          <div className="mt-4 space-y-3">
            {reviewSummary.topItems.length ? (
              reviewSummary.topItems.map((item) => (
                <div key={item} className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-700">
                  {item}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Belum ada item prioritas pada lane ini.</p>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Meta penting</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {reviewSummary.metaHighlights.length ? (
              reviewSummary.metaHighlights.map((item) => (
                <span key={item} className="badge border-slate-200 bg-white text-slate-600">
                  {item}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">Belum ada meta highlight untuk lane ini.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
