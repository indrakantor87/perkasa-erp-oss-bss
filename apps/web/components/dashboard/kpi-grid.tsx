import type { DashboardMetric } from '@/lib/types'

function extractNumericValue(raw: string) {
  const normalized = raw.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function KpiGrid({ items }: { items: DashboardMetric[] }) {
  const parsedItems = items.map((item) => ({
    ...item,
    numericValue: extractNumericValue(item.value),
  }))
  const maxValue = Math.max(...parsedItems.map((item) => item.numericValue), 1)

  return (
    <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
      {parsedItems.map((item) => (
        <article
          key={item.label}
          className="overflow-hidden rounded-3xl border border-line bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">{item.label}</p>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {item.change}
            </span>
          </div>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {item.value}
          </p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#2563eb_100%)]"
              style={{ width: `${Math.max(10, Math.round((item.numericValue / maxValue) * 100))}%` }}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-mute">{item.note}</p>
        </article>
      ))}
    </div>
  )
}
