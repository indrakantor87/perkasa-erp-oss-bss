import Link from 'next/link'
import type { DashboardQueueItem } from '@/lib/types'

export function RoleQueueGrid({ items }: { items: DashboardQueueItem[] }) {
  if (!items.length) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Queue Per Role</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            Prioritas kerja hari ini
          </h2>
        </div>
        <span className="solid-chip">Role-aware</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.title}`}
            href={item.href}
            prefetch={false}
            className="group surface-elevated overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:[border-color:var(--color-line-strong)] hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`badge ${item.accent}`}>{item.count} item</span>
              <span className="solid-chip px-2.5 py-1 transition group-hover:[border-color:var(--color-line-strong)]">
                Buka
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink-strong)]">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
            <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-strong)' }}>
              <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
