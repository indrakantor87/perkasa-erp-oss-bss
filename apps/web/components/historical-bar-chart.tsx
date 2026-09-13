export type GranularityKey = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'YEARLY'

export type GranularityOption = {
  key: GranularityKey
  label: string
  shortLabel: string
  description: string
}

export const GRANULARITY_OPTIONS: GranularityOption[] = [
  { key: 'DAILY', shortLabel: '1H', label: 'Harian', description: 'Ringkasan per hari dalam periode.' },
  { key: 'WEEKLY', shortLabel: '1M', label: 'Mingguan', description: 'Ringkasan per minggu dalam periode.' },
  { key: 'MONTHLY', shortLabel: '3B', label: 'Bulanan', description: 'Ringkasan per bulan dalam periode.' },
  { key: 'QUARTERLY', shortLabel: '6B', label: 'Kuartal', description: 'Ringkasan per kuartal (3 bulan).' },
  { key: 'SEMESTER', shortLabel: '1Th', label: 'Semester', description: 'Ringkasan per semester (6 bulan).' },
  { key: 'YEARLY', shortLabel: 'Seluruhnya', label: 'Tahunan', description: 'Ringkasan per tahun.' },
]

export type HistoricalSeriesDatum = {
  bucket: string
  bucketMeta?: string
  current: number
  previous: number
}

export type HistoricalBarChartProps = {
  title: string
  subtitle?: string
  granularity: GranularityKey
  setGranularityHref: (next: GranularityKey) => string
  currentPeriodLabel: string
  previousPeriodLabel: string
  series: HistoricalSeriesDatum[]
  unitLabel?: string
  emptyNote?: string
  heightPx?: number
  onEmptyPreviousHint?: string
}

function percentDelta(current: number, previous: number): { pct: number; sign: 'UP' | 'DOWN' | 'FLAT' } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, sign: 'FLAT' }
    return { pct: 100, sign: 'UP' }
  }
  const pct = ((current - previous) / previous) * 100
  if (pct > 0.5) return { pct: Math.round(pct * 10) / 10, sign: 'UP' }
  if (pct < -0.5) return { pct: Math.round(Math.abs(pct) * 10) / 10, sign: 'DOWN' }
  return { pct: 0, sign: 'FLAT' }
}

export function HistoricalBarChart({
  title,
  subtitle,
  granularity,
  setGranularityHref,
  currentPeriodLabel,
  previousPeriodLabel,
  series,
  unitLabel = 'transaksi',
  emptyNote = 'Belum ada historis pada periode ini.',
  heightPx = 260,
  onEmptyPreviousHint = 'Periode sebelumnya tidak memiliki data historis untuk dibandingkan.',
}: HistoricalBarChartProps) {
  const totalCurrent = series.reduce((sum, d) => sum + d.current, 0)
  const totalPrevious = series.reduce((sum, d) => sum + d.previous, 0)
  const delta = percentDelta(totalCurrent, totalPrevious)
  const hasData = series.length > 0 && series.some((d) => d.current > 0 || d.previous > 0)

  return (
    <article className="rounded-3xl border border-line bg-surfaceElevated p-5 shadow-sm">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-mute">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="flex flex-wrap gap-1.5 rounded-full border border-line bg-surfaceMuted/70 p-1">
            {GRANULARITY_OPTIONS.map((opt) => {
              const active = opt.key === granularity
              return (
                <a
                  key={opt.key}
                  href={setGranularityHref(opt.key)}
                  aria-label={`Ubah periodisitas ke ${opt.label}`}
                  title={opt.description}
                  className={
                    'rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase transition focus-visible:shadow-focus ' +
                    (active
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-muteStrong hover:bg-surface hover:text-slate-950')
                  }
                >
                  {opt.shortLabel}
                </a>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-right">
            <span className="badge border-line bg-surface text-muteStrong">
              Periode: {currentPeriodLabel}
            </span>
            <span className="badge border-line bg-surfaceMuted text-muteStrong">
              Sebelumnya: {previousPeriodLabel}
            </span>
            {hasData ? (
              delta.sign === 'UP' ? (
                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                  ↑ {delta.pct}% vs sebelumnya
                </span>
              ) : delta.sign === 'DOWN' ? (
                <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                  ↓ {delta.pct}% vs sebelumnya
                </span>
              ) : (
                <span className="badge border-slate-200 bg-white text-slate-600">
                  = stabil vs sebelumnya
                </span>
              )
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{currentPeriodLabel}</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
            {totalCurrent} {unitLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{previousPeriodLabel}</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
            {totalPrevious} {unitLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Bucket Analisis</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
            {series.length} {GRANULARITY_OPTIONS.find((o) => o.key === granularity)?.label ?? 'periode'}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-dashed border-line bg-surfaceMuted/50 p-8 text-center">
            <p className="text-sm text-mute">{emptyNote}</p>
          </div>
          {series.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surfaceMuted/60 p-4 text-xs leading-6 text-mute">
              {onEmptyPreviousHint}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6">
          <svg
            role="img"
            aria-label={`Diagram batang historis: ${title}. Perbandingan ${currentPeriodLabel} vs ${previousPeriodLabel}`}
            viewBox={`0 0 100 ${heightPx}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: `${heightPx}px` }}
          >
            {(() => {
              const maxPerBucket = series.map((d) => Math.max(d.current, d.previous, 1))
              const globalMax = Math.max(1, ...maxPerBucket)
              const bucketSlot = 100 / series.length
              const pairWidth = bucketSlot * 0.72
              const barWidth = pairWidth / 2.2

              return series.map((d, idx) => {
                const slotStart = idx * bucketSlot + bucketSlot * 0.14
                const currH = (d.current / globalMax) * (heightPx - 34)
                const prevH = (d.previous / globalMax) * (heightPx - 34)
                const currX = slotStart
                const prevX = slotStart + barWidth * 1.1
                const currY = heightPx - 16 - currH
                const prevY = heightPx - 16 - prevH

                return (
                  <g key={d.bucket}>
                    <rect x={currX} y={currY} width={barWidth} height={currH} rx={2.8} fill="#0f172a" opacity={currH > 0 ? 0.94 : 0.12} />
                    <rect x={prevX} y={prevY} width={barWidth} height={prevH} rx={2.8} fill="#94a3b8" opacity={prevH > 0 ? 0.62 : 0.1} />
                    {currH > 12 ? (
                      <text x={currX + barWidth / 2} y={currY - 3} textAnchor="middle" fontSize="6.8" fontWeight="800" fill="#0f172a">
                        {d.current}
                      </text>
                    ) : null}
                    {prevH > 12 ? (
                      <text x={prevX + barWidth / 2} y={prevY - 3} textAnchor="middle" fontSize="6.8" fontWeight="700" fill="#475569">
                        {d.previous}
                      </text>
                    ) : null}
                    <text
                      x={slotStart + pairWidth / 2}
                      y={heightPx - 3}
                      textAnchor="middle"
                      fontSize={series.length <= 8 ? 6 : 5.2}
                      fontWeight="600"
                      fill="#475569"
                    >
                      {d.bucket.length > 9 ? `${d.bucket.slice(0, 8)}…` : d.bucket}
                    </text>
                  </g>
                )
              })
            })()}
          </svg>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface/80 p-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-slate-950" aria-hidden />
              <span className="text-xs font-semibold text-slate-950">{currentPeriodLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-sm bg-slate-400" aria-hidden />
              <span className="text-xs font-semibold text-muteStrong">{previousPeriodLabel}</span>
            </div>
            <p className="text-xs text-mute">
              Visualisasi hanya menampilkan angka hitung absolut. Tinggi batang sebanding literal dengan jumlah {unitLabel}, tanpa smoothing atau interpolasi.
            </p>
          </div>
        </div>
      )}
    </article>
  )
}
