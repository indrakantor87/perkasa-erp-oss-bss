export type SimpleBarDatum = {
  label: string
  value: number
  tone?: 'ink' | 'accent' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'
}

export type SimpleBarChartProps = {
  title: string
  subtitle?: string
  data: SimpleBarDatum[]
  unitLabel?: string
  emptyNote?: string
  heightPx?: number
  showValueOnTop?: boolean
}

const TONE_FILL: Record<NonNullable<SimpleBarDatum['tone']>, string> = {
  ink: '#0f172a',
  accent: '#0f172a',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  sky: '#0284c7',
  violet: '#7c3aed',
  slate: '#475569',
}

const TONE_BG: Record<NonNullable<SimpleBarDatum['tone']>, string> = {
  ink: 'bg-slate-900/10',
  accent: 'bg-slate-900/10',
  emerald: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  sky: 'bg-sky-500/10',
  violet: 'bg-violet-500/10',
  slate: 'bg-slate-500/10',
}

export function SimpleBarChart({
  title,
  subtitle,
  data,
  unitLabel = 'unit',
  emptyNote = 'Belum ada data untuk divisualisasikan.',
  heightPx = 220,
  showValueOnTop = true,
}: SimpleBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const hasData = data.length > 0 && data.some((d) => d.value > 0)

  return (
    <article className="rounded-3xl border border-line bg-surfaceElevated p-5 shadow-sm">
      <header className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-mute">{subtitle}</p> : null}
        </div>
        <span className="badge border-line bg-surfaceMuted text-muteStrong self-start">
          {hasData ? `${data.reduce((sum, d) => sum + d.value, 0)} ${unitLabel}` : '—'}
        </span>
      </header>

      {!hasData ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-surfaceMuted/50 p-8 text-center">
          <p className="text-sm text-mute">{emptyNote}</p>
        </div>
      ) : (
        <div className="mt-6">
          <svg
            role="img"
            aria-label={`Diagram batang: ${title}`}
            viewBox={`0 0 100 ${heightPx}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: `${heightPx}px` }}
          >
            {data.map((d, idx) => {
              const width = data.length <= 6 ? 12 : data.length <= 10 ? 8.5 : 6.5
              const gap = (100 - width * data.length) / (data.length + 1)
              const x = gap + idx * (width + gap)
              const barH = (d.value / max) * (heightPx - 36)
              const y = heightPx - 18 - barH
              const tone: NonNullable<SimpleBarDatum['tone']> = d.tone ?? 'ink'

              return (
                <g key={d.label}>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={barH}
                    rx={3.5}
                    fill={TONE_FILL[tone]}
                    opacity={barH > 0 ? 0.92 : 0.12}
                  />
                  {showValueOnTop && barH > 12 ? (
                    <text
                      x={x + width / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#0f172a"
                    >
                      {d.value}
                    </text>
                  ) : null}
                  <text
                    x={x + width / 2}
                    y={heightPx - 4}
                    textAnchor="middle"
                    fontSize={width > 8 ? 6 : 5}
                    fontWeight="600"
                    fill="#475569"
                  >
                    {d.label.length > (width > 8 ? 14 : 9) ? `${d.label.slice(0, width > 8 ? 12 : 7)}…` : d.label}
                  </text>
                </g>
              )
            })}
          </svg>

          {data.length <= 8 ? (
            <ul className="mt-5 grid gap-2 md:grid-cols-2">
              {data.map((d) => {
                const tone: NonNullable<SimpleBarDatum['tone']> = d.tone ?? 'ink'
                return (
                  <li
                    key={d.label}
                    className={`flex items-center justify-between rounded-xl border border-line px-3 py-2 ${TONE_BG[tone]}`}
                  >
                    <span className="text-sm font-semibold text-slate-950">{d.label}</span>
                    <span className="tabular-nums text-sm font-semibold text-muteStrong">
                      {d.value} {unitLabel}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      )}
    </article>
  )
}
