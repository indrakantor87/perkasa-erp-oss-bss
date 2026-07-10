type DivisionStructureBoardProps = {
  activeDivision: string
  activeSubdivision: string
}

type DivisionBlock = {
  title: string
  subdivisions: string[]
  tone: string
  wide?: boolean
}

const divisions: DivisionBlock[] = [
  {
    title: 'Pemasaran dan Pelayanan',
    subdivisions: ['Penjualan', 'CS', 'Admin CS', 'NOC', 'Troubleshoots', 'Dismantle', 'Creator Digital'],
    tone: 'border-sky-200 bg-sky-50 text-sky-900',
    wide: true,
  },
  {
    title: 'Teknis dan Expan',
    subdivisions: ['Teknisi PSB', 'Teknisi Jalur & Expan', 'Teknisi Jointer'],
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  {
    title: 'Finance dan HR',
    subdivisions: ['Billing', 'HR'],
    tone: 'border-violet-200 bg-violet-50 text-violet-900',
  },
  {
    title: 'General Affair',
    subdivisions: ['Inventory', 'Legal'],
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  {
    title: 'Operasional',
    subdivisions: ['Kantor', 'Toko'],
    tone: 'border-slate-200 bg-slate-50 text-slate-900',
  },
]

function isActiveSubdivision(active: string, subdivision: string) {
  const normalized = active.trim().toLowerCase()
  return normalized === subdivision.trim().toLowerCase() || normalized.includes(subdivision.trim().toLowerCase())
}

export function DivisionStructureBoard({ activeDivision, activeSubdivision }: DivisionStructureBoardProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Struktur Divisi</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Pemisahan divisi dan sub-divisi yang dipakai di ERP
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Struktur ini menjadi acuan cara membaca dashboard, worklist, dan scope akses per role.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Posisi Role Aktif</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{activeDivision}</p>
          <p className="mt-1 text-sm text-slate-700">{activeSubdivision}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {divisions.map((division) => (
          <article
            key={division.title}
            className={`rounded-3xl border border-line bg-white p-5 ${division.wide ? 'lg:col-span-2' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`badge border ${division.tone}`}>{division.title}</span>
                {activeDivision.trim().toLowerCase() === division.title.trim().toLowerCase() ? (
                  <span className="badge border-transparent bg-slate-950 text-white">Aktif</span>
                ) : null}
              </div>
              <span className="badge border-slate-200 bg-white text-slate-600">
                {division.subdivisions.length.toLocaleString('id-ID')} sub-divisi
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {division.subdivisions.map((subdivision) => {
                const active = isActiveSubdivision(activeSubdivision, subdivision)
                return (
                  <span
                    key={`${division.title}-${subdivision}`}
                    className={`badge border-slate-200 bg-white text-slate-700 ${
                      active ? 'border-transparent bg-slate-950 text-white' : ''
                    }`}
                  >
                    {subdivision}
                  </span>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

