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
            className="group overflow-hidden rounded-3xl border border-line bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`badge ${item.accent}`}>{item.count} item</span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition group-hover:border-slate-300">
                Buka
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
            <div className="mt-4 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 w-1/2 rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#475569_100%)]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
