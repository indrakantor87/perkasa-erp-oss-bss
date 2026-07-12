import type { CaseCorrelationSummary } from '@/lib/types'

const defaultTone = 'border-slate-200 bg-slate-50 text-slate-700'

export function CaseCorrelationSummaryPanel({
  summary,
  title = 'Ringkasan Korelasi Kasus',
}: {
  summary: CaseCorrelationSummary
  title?: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.customer ? (
              <span className="badge border-slate-200 bg-white text-slate-700">Customer: {summary.customer}</span>
            ) : null}
            {summary.service ? (
              <span className="badge border-slate-200 bg-white text-slate-700">Service: {summary.service}</span>
            ) : null}
          </div>
        </div>
        {summary.owner ? (
          <span className="badge border-slate-200 bg-slate-50 text-slate-700">Owner Aktif: {summary.owner}</span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summary.items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${item.tone || defaultTone}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}
