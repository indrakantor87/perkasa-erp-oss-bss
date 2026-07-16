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
          className="surface-elevated overflow-hidden rounded-3xl border p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">{item.label}</p>
            <span className="status-chip-info rounded-full border px-2.5 py-1 text-[11px] font-semibold">
              {item.change}
            </span>
          </div>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            {item.value}
          </p>
          <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-strong)' }}>
            <div
              className="h-2 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)', width: `${Math.max(10, Math.round((item.numericValue / maxValue) * 100))}%` }}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-mute">{item.note}</p>
        </article>
      ))}
    </div>
  )
}
