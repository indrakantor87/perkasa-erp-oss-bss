import type { ActivityItem } from '@/lib/types'

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Audit & Aktivitas</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Jejak aksi terbaru
          </h2>
        </div>
        <span className="badge">Live review</span>
      </div>

      <div className="mt-6 max-h-[40rem] space-y-4 overflow-y-auto pr-1">
        {items.map((item) => (
          <article key={`${item.title}-${item.at}`} className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
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
