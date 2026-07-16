import type { ActivityItem } from '@/lib/types'

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Audit & Aktivitas</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            Jejak aksi terbaru
          </h2>
        </div>
        <span className="solid-chip">Live review</span>
      </div>

      <div className="mt-6 max-h-[40rem] space-y-4 overflow-y-auto pr-1">
        {items.map((item) => (
          <article key={`${item.title}-${item.at}`} className="surface-soft rounded-2xl border p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.title}</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                {item.at}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
