import Link from 'next/link'
import type { DashboardNextActionItem } from '@/lib/types'

export function DashboardNextActions({
  items,
}: {
  items: DashboardNextActionItem[]
}) {
  if (!items.length) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Tindakan Berikutnya</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            Aksi operasional yang paling cepat menjaga ritme kerja harian
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini merangkum alert, list kerja, dan queue role aktif menjadi langkah berikutnya
            yang bisa langsung dibuka tanpa menebak modul tujuan.
          </p>
        </div>
        <span className="badge border-line bg-surface text-mute">{items.length} aksi prioritas</span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl border border-line p-5"
            style={{ backgroundColor: 'var(--color-card-subtle)' }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge border ${item.tone}`}>Prioritas {index + 1}</span>
                  <span className="badge border-line bg-surface text-mute">{item.sourceLabel}</span>
                  <span className="badge border-line bg-surface text-mute">{item.domain}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink-strong)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </div>
              <Link
                href={item.href}
                prefetch={false}
                className="shrink-0 rounded-full bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
              >
                {item.actionLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
