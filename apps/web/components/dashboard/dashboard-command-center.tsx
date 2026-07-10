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
    <section className="panel p-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="section-title">Pusat Kendali ERP</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            Dashboard lintas modul untuk monitor, eksekusi, dan audit harian
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Dashboard ini mengikuti konsep PRD sebagai landing utama ERP: memantau performa divisi,
            mendorong tindakan operasional per role, dan menjaga integrasi antar menu tetap terasa
            dalam satu workspace.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleTone}`}>{roleShortLabel}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">{roleLabel}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">
              {roleDivision} / {roleSubdivision}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fokus Role Aktif</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{roleScope}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/daily-activity"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Buka Daily Activity
            </Link>
            <Link
              href="/support"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Support
            </Link>
            <Link
              href="/billing"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Billing
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {statusCards.map((item) => (
            <article key={item.label} className="rounded-2xl border border-line bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
                {item.value.toLocaleString('id-ID')}
              </p>
              <p className="mt-3 text-sm leading-6 text-mute">{item.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
