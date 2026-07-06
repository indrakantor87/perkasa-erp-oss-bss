import Link from 'next/link'
import type { ModuleCard } from '@/lib/types'

export function ModuleGrid({ items }: { items: ModuleCard[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="panel block p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
        >
          <span className={`badge ${item.accent}`}>{item.status}</span>
          <h2 className="mt-5 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {item.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
        </Link>
      ))}
    </div>
  )
}
