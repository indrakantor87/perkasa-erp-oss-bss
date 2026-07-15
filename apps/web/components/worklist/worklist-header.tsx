import { translateUiText, type UiLanguage } from '@/lib/ui-language'

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
  language: UiLanguage
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
  language,
}: WorklistHeaderProps) {
  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">{translateUiText('List Kerja Terpadu', language)}</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            {translateUiText('Queue lintas domain untuk role aktif', language)}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
            {translateUiText('Penjualan, customer, support, inventory, dan import dibaca dari satu layar kerja.', language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge border-transparent ${roleTone}`}>{roleLabel}</span>
          <span className="badge border-slate-200 bg-white text-slate-600">
            {division} / {subdivision}
          </span>
          <span className="badge border-slate-200 bg-white text-slate-600">{selectedQueue}</span>
          {readOnly ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              {translateUiText('Mode baca saja', language)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
        <article className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {translateUiText('Item Aktif', language)}
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{totalCount}</p>
        </article>
        <article className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
            {translateUiText('Kritikal', language)}
          </p>
          <p className="mt-1 text-xl font-semibold text-rose-900">{criticalCount}</p>
        </article>
        <article className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Follow Up</p>
          <p className="mt-1 text-xl font-semibold text-sky-900">{followUpCount}</p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            {translateUiText('Menunggu', language)}
          </p>
          <p className="mt-1 text-xl font-semibold text-amber-900">{waitingCount}</p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {translateUiText('Siap Ditutup', language)}
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{readyCloseCount}</p>
        </article>
      </div>
      <div className="mt-2">
        <span className="text-xs text-slate-500">
          {language === 'en'
            ? `Base scope: ${baseCount} items before active filters are applied.`
            : `Scope dasar: ${baseCount} item sebelum filter aktif diterapkan.`}
        </span>
      </div>
    </section>
  )
}
