import Link from 'next/link'
import type { DashboardWorkItem } from '@/lib/types'

const priorityTone: Record<DashboardWorkItem['priority'], string> = {
  tinggi: 'status-chip-danger',
  sedang: 'status-chip-warning',
  rendah: 'status-chip-success',
}

export function WorklistBoard({ items, viewAllHref }: { items: DashboardWorkItem[]; viewAllHref: string }) {
  if (!items.length) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">List Kerja Utama</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            Item yang paling dekat untuk ditindak
          </h2>
          <p className="mt-2 text-sm leading-6 text-mute">
            Dashboard hanya menampilkan item paling penting terlebih dahulu agar operator tidak kehilangan fokus.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="solid-chip">{items.length} item</span>
          <Link
            href={viewAllHref}
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Buka list kerja
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="surface-soft block rounded-2xl border p-5 transition hover:[border-color:var(--color-line-strong)] hover:bg-surface hover:shadow-lg"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge">{item.domain}</span>
                  <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
                  <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>{item.status}</span>
                </div>
                <h3 className="text-base font-semibold text-[var(--color-ink-strong)]">{item.title}</h3>
                <p className="text-sm font-medium text-[var(--color-mute-strong)]">{item.subtitle}</p>
                <p className="text-sm leading-6 text-mute">{item.detail}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--color-mute-strong)]">Tindak lanjuti</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
