import { DASHBOARD_DIVISION_CLUSTERS, matchesDivisionMenuItem } from '@/lib/dashboard-division-structure'

type DivisionStructureBoardProps = {
  activeDivision: string
  activeSubdivision: string
}

export function DivisionStructureBoard({ activeDivision, activeSubdivision }: DivisionStructureBoardProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Struktur Divisi</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Pemisahan divisi dan kelompok menu yang dipakai di ERP
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Struktur ini menjadi acuan cara membaca dashboard, sidebar, worklist, dan scope akses per role.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Posisi Role Aktif</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{activeDivision}</p>
          <p className="mt-1 text-sm text-slate-700">{activeSubdivision}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {DASHBOARD_DIVISION_CLUSTERS.map((division) => (
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
                {division.items.length.toLocaleString('id-ID')} menu
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {division.items.map((item) => {
                const active = matchesDivisionMenuItem(activeSubdivision, item)
                return (
                  <span
                    key={`${division.title}-${item.label}`}
                    className={`badge border-slate-200 bg-white text-slate-700 ${
                      active ? 'border-transparent bg-slate-950 text-white' : ''
                    }`}
                  >
                    {item.label}
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
