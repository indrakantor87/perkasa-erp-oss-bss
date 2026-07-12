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
}) {
  const statusCards = [
    {
      label: 'Queue prioritas',
      value: queueCount,
      note: 'Lane kerja yang langsung bisa ditindak per role aktif.',
    },
    {
      label: 'List kerja terpadu',
      value: worklistCount,
      note: 'Agenda lintas domain yang perlu ditutup operator hari ini.',
    },
    {
      label: 'Shortcut modul',
      value: moduleCount,
      note: 'Pintu masuk cepat ke modul yang memang terbuka untuk role ini.',
    },
    {
      label: 'Approval pending',
      value: approvalCount,
      note: 'Antrian approval yang ikut memengaruhi ritme kerja harian.',
    },
  ]

  return (
    <section className="panel p-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="section-title">Pusat Kendali ERP</p>
          <h1 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Dashboard kerja lintas modul
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
            Monitor performa, buka worklist, dan masuk ke modul inti dari satu landing yang ringkas.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleTone}`}>{roleShortLabel}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">{roleLabel}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">
              {roleDivision} / {roleSubdivision}
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-line bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus Role Aktif</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{roleScope}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard/daily-activity"
              className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800"
            >
              Buka Daily Activity
            </Link>
            <Link
              href="/support"
              className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Support
            </Link>
            <Link
              href="/billing"
              className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Billing
            </Link>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
          {statusCards.map((item) => (
            <article key={item.label} className="rounded-md border border-line bg-slate-50 px-3 py-2 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
                {item.value.toLocaleString('id-ID')}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
