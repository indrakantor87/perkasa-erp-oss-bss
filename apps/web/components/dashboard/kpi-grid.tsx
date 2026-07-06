import type { DashboardMetric } from '@/lib/types'

export function KpiGrid({ items }: { items: DashboardMetric[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.label} className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">{item.label}</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {item.value}
          </p>
          <p className="mt-3 text-sm font-semibold text-blue-700">{item.change}</p>
          <p className="mt-4 text-sm leading-6 text-mute">{item.note}</p>
        </article>
      ))}
    </div>
  )
}
