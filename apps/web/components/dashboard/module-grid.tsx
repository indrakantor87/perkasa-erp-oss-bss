import Link from 'next/link'
import type { ModuleCard } from '@/lib/types'

export function ModuleGrid({ items }: { items: ModuleCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group block overflow-hidden rounded-3xl border border-line bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <span className={`badge ${item.accent}`}>{item.status}</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition group-hover:border-slate-300">
              Masuk
            </span>
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            {item.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
          <div className="mt-4 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 w-2/3 rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#2563eb_100%)]" />
          </div>
        </Link>
      ))}
    </div>
  )
}
