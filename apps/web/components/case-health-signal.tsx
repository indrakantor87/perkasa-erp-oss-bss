import type { CaseHealthSignal } from '@/lib/types'

const defaultTone = 'border-slate-200 bg-slate-50 text-slate-700'

export function CaseHealthSignalCard({
  signal,
  title = 'Case Health Signal',
}: {
  signal: CaseHealthSignal
  title?: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">{signal.label}</h4>
          <p className="mt-2 text-sm leading-6 text-mute">{signal.detail}</p>
        </div>
        <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${signal.tone || defaultTone}`}>
          {signal.label}
        </span>
      </div>
    </article>
  )
}
