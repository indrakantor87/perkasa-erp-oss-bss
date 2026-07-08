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
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Prioritas kerja hari ini
          </h2>
        </div>
        <span className="badge">Role-aware</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.title}`}
            href={item.href}
            className="rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
          >
            <span className={`badge ${item.accent}`}>{item.count} item</span>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
