import Link from 'next/link'
import type { ModuleCard } from '@/lib/types'

export function ModuleGrid({ items }: { items: ModuleCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group surface-elevated block overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:[border-color:var(--color-line-strong)] hover:shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <span className={`badge ${item.accent}`}>{item.status}</span>
            <span className="solid-chip px-2.5 py-1 transition group-hover:[border-color:var(--color-line-strong)]">
              Masuk
            </span>
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            {item.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
          <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-strong)' }}>
            <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
          </div>
        </Link>
      ))}
    </div>
  )
}
