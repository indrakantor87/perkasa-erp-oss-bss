import Link from 'next/link'

export function DashboardCommandCenter({
  roleLabel,
  roleShortLabel,
  roleTone,
  roleDivision,
  roleSubdivision,
  roleScope,
  queueCount,
  worklistCount,
  moduleCount,
  approvalCount,
  quickLinks,
}: {
  roleLabel: string
  roleShortLabel: string
  roleTone: string
  roleDivision: string
  roleSubdivision: string
  roleScope: string
  queueCount: number
  worklistCount: number
  moduleCount: number
  approvalCount: number
  quickLinks: Array<{
    label: string
    href: string
    tone: 'primary' | 'secondary'
  }>
}) {
  const statusCards = [
    {
      label: 'Queue aktif',
      value: queueCount,
      note: 'Lane kerja yang paling dekat untuk langsung dibuka.',
    },
    {
      label: 'Item kerja',
      value: worklistCount,
      note: 'Agenda lintas domain yang perlu ditindak hari ini.',
    },
    {
      label: 'Shortcut modul',
      value: moduleCount,
      note: 'Pintu masuk cepat ke modul yang memang terbuka untuk role ini.',
    },
    {
      label: 'Approval pending',
      value: approvalCount,
      note: 'Approval yang ikut memengaruhi ritme kerja hari ini.',
    },
  ]

  return (
    <section className="panel overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[1.12fr_0.88fr]">
        <div
          className="px-5 py-5 md:px-6 md:py-6"
          style={{
            backgroundColor: 'var(--color-surface-soft)',
          }}
        >
          <p className="section-title">Executive Dashboard</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)] md:text-3xl">
            Dashboard profesional yang memadukan fokus role, sinyal prioritas, dan jalur aksi tercepat
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Tampilan ini dirancang sebagai pintu masuk kerja harian untuk semua role. Gunakan area atas
            untuk membaca konteks, lalu lanjut ke panel visual dan daftar kerja yang paling dekat dengan kebutuhan hari ini.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleTone}`}>{roleShortLabel}</span>
            <span className="badge border-line bg-surface text-mute">{roleLabel}</span>
            <span className="badge border-line bg-surface text-mute">
              {roleDivision} / {roleSubdivision}
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-elevated rounded-3xl border p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Fokus Role Aktif</p>
              <p className="mt-2 text-sm leading-6 text-ink">{roleScope}</p>
            </div>
            <div
              className="rounded-3xl border p-4 shadow-sm"
              style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'color-mix(in srgb, var(--color-accent-ink) 78%, transparent)' }}>
                Arah Baca Dashboard
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-accent-ink)' }}>
                Mulai dari visual prioritas, validasi list kerja, lalu masuk ke modul melalui quick action di bawah.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={
                  item.tone === 'primary'
                    ? 'rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition opacity-100 hover:opacity-90'
                    : 'surface-soft rounded-xl border px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-ink transition hover:[border-color:var(--color-line-strong)]'
                }
                style={
                  item.tone === 'primary'
                    ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }
                    : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div
          className="border-t px-5 py-5 xl:border-l xl:border-t-0"
          style={{ borderColor: 'var(--color-sidebar-line)', backgroundColor: 'var(--color-sidebar)', color: 'var(--color-sidebar-ink)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 72%, var(--color-mute) 28%)' }}>
                Command Signal
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight">
                Snapshot angka kerja cepat
              </h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: 'var(--color-line-strong)', backgroundColor: 'var(--color-surface-strong)', color: 'var(--color-sidebar-ink)' }}>
              All role
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {statusCards.map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border px-4 py-4"
                style={{
                  borderColor: 'var(--color-line-strong)',
                  backgroundColor: 'var(--color-surface-strong)',
                  color: 'var(--color-ink-strong)',
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">{item.label}</p>
                <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
                  {item.value.toLocaleString('id-ID')}
                </p>
                <p className="mt-2 text-xs leading-5 text-mute">{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
