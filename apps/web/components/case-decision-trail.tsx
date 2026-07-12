import type { CaseDecisionTrail } from '@/lib/types'

const defaultTone = 'border-slate-200 bg-white text-slate-700'

export function CaseDecisionTrailPanel({
  trail,
  title = 'Decision Trail',
}: {
  trail: CaseDecisionTrail
  title?: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-2 text-sm leading-6 text-mute">
            Jejak singkat fase keputusan terakhir agar operator bisa membaca perpindahan ownership dan tindak lanjut tanpa membuka banyak lane.
          </p>
        </div>
        {trail.owner ? (
          <span className="badge border-slate-200 bg-slate-50 text-slate-700">Owner Terakhir: {trail.owner}</span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {trail.items.map((item, index) => (
          <div key={`${item.label}-${item.detail}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex w-10 shrink-0 items-start justify-center">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${item.tone || defaultTone}`}>
                {index + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                {item.happenedAt ? <span className="text-xs font-medium text-slate-500">{item.happenedAt}</span> : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-700">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
