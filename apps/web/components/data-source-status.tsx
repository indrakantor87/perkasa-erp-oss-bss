import type { DataSourceSnapshot } from '@/lib/types'

export function DataSourceStatus({ source }: { source: DataSourceSnapshot }) {
  const toneClass = source.isFallback
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : source.effectiveMode === 'review-db'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-slate-200 bg-slate-50 text-slate-800'

  return (
    <section className={`rounded-3xl border px-5 py-4 ${toneClass}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Sumber Data</p>
          <p className="mt-2 text-lg font-semibold">{source.label}</p>
          <p className="mt-2 text-sm leading-6">{source.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="badge border-current/20 text-current">Configured: {source.configuredMode}</span>
          <span className="badge border-current/20 text-current">Effective: {source.effectiveMode}</span>
        </div>
      </div>
    </section>
  )
}
