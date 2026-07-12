import type { CaseActionOutcomeSummary } from '@/lib/types'

const defaultTone = 'border-slate-200 bg-slate-50 text-slate-700'

export function CaseActionOutcomeSummaryCard({
  summary,
  title = 'Action Outcome Summary',
}: {
  summary: CaseActionOutcomeSummary
  title?: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Ringkasan hasil yang dituju setelah action</h4>
          <p className="mt-2 text-sm leading-6 text-mute">
            {summary.owner
              ? `Outcome dibaca dari sudut pandang owner ${summary.owner} agar operator tahu batas selesai dan fallback per lane.`
              : 'Outcome membantu operator membaca batas selesai dan fallback per lane.'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summary.items.map((item, index) => (
          <div key={`${item.label}-${index}`} className={`rounded-2xl border p-4 ${item.tone || defaultTone}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-current/70">{item.label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  )
}
