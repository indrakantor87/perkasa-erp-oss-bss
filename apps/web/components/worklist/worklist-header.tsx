type WorklistHeaderProps = {
  roleLabel: string
  roleTone: string
  division: string
  subdivision: string
  selectedQueue: string
  totalCount: number
  baseCount: number
  criticalCount: number
  followUpCount: number
  waitingCount: number
  readyCloseCount: number
  readOnly: boolean
}

export function WorklistHeader({
  roleLabel,
  roleTone,
  division,
  subdivision,
  selectedQueue,
  totalCount,
  baseCount,
  criticalCount,
  followUpCount,
  waitingCount,
  readyCloseCount,
  readOnly,
}: WorklistHeaderProps) {
  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">List Kerja Terpadu</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Queue lintas domain untuk role aktif
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
            Penjualan, customer, support, inventory, dan import dibaca dari satu layar kerja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge border-transparent ${roleTone}`}>{roleLabel}</span>
          <span className="badge border-slate-200 bg-white text-slate-600">
            {division} / {subdivision}
          </span>
          <span className="badge border-slate-200 bg-white text-slate-600">{selectedQueue}</span>
          {readOnly ? <span className="badge border-amber-200 bg-amber-50 text-amber-700">Mode baca saja</span> : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
        <article className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Item Aktif</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{totalCount}</p>
        </article>
        <article className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Kritikal</p>
          <p className="mt-1 text-xl font-semibold text-rose-900">{criticalCount}</p>
        </article>
        <article className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Follow Up</p>
          <p className="mt-1 text-xl font-semibold text-sky-900">{followUpCount}</p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Menunggu</p>
          <p className="mt-1 text-xl font-semibold text-amber-900">{waitingCount}</p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Siap Ditutup</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{readyCloseCount}</p>
        </article>
      </div>
      <div className="mt-2">
        <span className="text-xs text-slate-500">Scope dasar: {baseCount} item sebelum filter aktif diterapkan.</span>
      </div>
    </section>
  )
}
