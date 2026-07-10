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
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">List Kerja Terpadu</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            Queue lintas domain yang dibaca dari perspektif role aktif
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Modul ini merangkum pekerjaan dari penjualan, customer, support, inventory, dan import
            agar user tidak perlu bolak-balik menu untuk tindak lanjut harian.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className={`badge border-transparent ${roleTone}`}>{roleLabel}</span>
          <span className="badge border-slate-200 bg-white text-slate-600">
            {division} / {subdivision}
          </span>
          <span className="badge border-slate-200 bg-white text-slate-600">{selectedQueue}</span>
          {readOnly ? <span className="badge border-amber-200 bg-amber-50 text-amber-700">Mode baca saja</span> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Item aktif</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{totalCount}</p>
          <p className="mt-2 text-sm text-mute">Dari {baseCount} item dasar sesuai scope role.</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Kritikal</p>
          <p className="mt-3 text-3xl font-semibold text-rose-900">{criticalCount}</p>
          <p className="mt-2 text-sm text-rose-700">Item yang perlu tindakan cepat hari ini.</p>
        </article>
        <article className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Follow Up</p>
          <p className="mt-3 text-3xl font-semibold text-sky-900">{followUpCount}</p>
          <p className="mt-2 text-sm text-sky-700">Queue yang masih terbuka atau pending.</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Menunggu</p>
          <p className="mt-3 text-3xl font-semibold text-amber-900">{waitingCount}</p>
          <p className="mt-2 text-sm text-amber-700">Butuh validasi, monitoring, atau pihak lain.</p>
        </article>
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Siap Ditutup</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-900">{readyCloseCount}</p>
          <p className="mt-2 text-sm text-emerald-700">Item yang mendekati finalisasi atau handoff.</p>
        </article>
      </div>
    </section>
  )
}
