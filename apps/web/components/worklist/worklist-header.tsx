import { StatusBadge } from '@/components/ui-status-badge'
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
    <section aria-label="Worklist summary" className="card-tier-2 border border-line p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <p className="section-title">{translateUiText('Ringkasan Antrean Aktif', language)}</p>
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
            {translateUiText('Queue lintas domain untuk role aktif', language)}
          </h2>
          <p className="max-w-3xl text-sm leading-5 text-mute">
            {translateUiText(
              'Penjualan, customer, support, inventory, dan import dibaca dari satu layar kerja dengan hierarki tekanan yang jelas.',
              language
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info" label={roleLabel} size="sm" ariaLabel={`Peran aktif: ${roleLabel}`} />
          <StatusBadge tone="neutral" label={`${division} / ${subdivision}`} size="sm" ariaLabel={`Divisi: ${division} ${subdivision}`} />
          <StatusBadge tone="in_progress" label={selectedQueue} size="sm" uppercase ariaLabel={`Antrean terpilih: ${selectedQueue}`} />
          {readOnly ? (
            <StatusBadge tone="warning" label={translateUiText('Mode baca saja', language)} size="sm" ariaLabel="Mode akses: baca saja" />
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        <article className="card-tier-1 rounded-control border border-line px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muteStrong">
            {translateUiText('Item Aktif', language)}
          </p>
          <p className="mt-1 text-lg font-semibold text-inkStrong">{totalCount}</p>
        </article>
        <article className="rounded-control border border-dangerLine bg-dangerSoft px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dangerInk">
            {translateUiText('Kritikal', language)}
          </p>
          <p className="mt-1 text-lg font-semibold text-dangerInk">{criticalCount}</p>
        </article>
        <article className="rounded-control border border-infoLine bg-infoSoft px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-infoInk">Follow Up</p>
          <p className="mt-1 text-lg font-semibold text-infoInk">{followUpCount}</p>
        </article>
        <article className="rounded-control border border-warningLine bg-warningSoft px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warningInk">
            {translateUiText('Menunggu', language)}
          </p>
          <p className="mt-1 text-lg font-semibold text-warningInk">{waitingCount}</p>
        </article>
        <article className="rounded-control border border-successLine bg-successSoft px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-successInk">
            {translateUiText('Siap Ditutup', language)}
          </p>
          <p className="mt-1 text-lg font-semibold text-successInk">{readyCloseCount}</p>
        </article>
      </div>
      <p className="mt-3 text-xs text-mute">
        {language === 'en'
          ? `Base scope: ${baseCount} items before active filters are applied.`
          : `Scope dasar: ${baseCount} item sebelum filter aktif diterapkan.`}
      </p>
    </section>
  )
}
