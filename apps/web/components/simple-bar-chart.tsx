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
        <div className="mt-6 overflow-x-auto">
          <svg
            role="img"
            aria-label={`Diagram batang: ${title}`}
            viewBox={`0 0 600 ${heightPx}`}
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto w-full min-w-[360px]"
            style={{ height: `${heightPx}px` }}
          >
            {(() => {
              const padTop = 32
              const padBottom = 44
              const padLeft = 14
              const padRight = 14
              const chartHeight = Math.max(40, heightPx - padTop - padBottom)
              const chartWidth = 600 - padLeft - padRight
              const n = data.length
              const maxBarWidth = chartWidth <= 480 ? 40 : 56
              const minGapBetweenBars = 14
              const maxTotalBarsWidth = chartWidth - minGapBetweenBars * (n + 1)
              const barWidth = Math.max(14, Math.min(maxBarWidth, maxTotalBarsWidth / n))
              const totalBarsWidth = barWidth * n
              const gapBetween = (chartWidth - totalBarsWidth) / (n + 1)

              return data.map((d, idx) => {
                const x = padLeft + gapBetween + idx * (barWidth + gapBetween)
                const barH = (d.value / max) * chartHeight
                const y = padTop + chartHeight - barH
                const baselineY = padTop + chartHeight
                const tone: NonNullable<SimpleBarDatum['tone']> = d.tone ?? 'ink'
                const rawLabel = d.label
                const hasSpace = /\s/.test(rawLabel)
                const labelTop = hasSpace ? rawLabel.slice(0, rawLabel.lastIndexOf(' ')) : rawLabel
                const labelBottom = hasSpace ? rawLabel.slice(rawLabel.lastIndexOf(' ') + 1) : ''
                const twoLineLabel = hasSpace && labelTop.length <= 10 && labelBottom.length <= 8

                return (
                  <g key={d.label}>
                    <line
                      x1={x - barWidth * 0.2}
                      x2={x + barWidth * 1.2}
                      y1={baselineY}
                      y2={baselineY}
                      stroke="#cbd5e1"
                      strokeWidth={0.8}
                    />
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      rx={4}
                      fill={TONE_FILL[tone]}
                      opacity={barH > 0 ? 0.92 : 0.12}
                    />
                    {showValueOnTop && barH > 20 ? (
                      <text
                        x={x + barWidth / 2}
                        y={y - 8}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill="#0f172a"
                      >
                        {d.value}
                      </text>
                    ) : showValueOnTop && barH > 0 ? (
                      <text
                        x={x + barWidth / 2}
                        y={y - 4}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill="#0f172a"
                      >
                        {d.value}
                      </text>
                    ) : null}
                    {twoLineLabel ? (
                      <>
                        <text
                          x={x + barWidth / 2}
                          y={baselineY + 16}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="700"
                          fill="#334155"
                        >
                          {labelTop.length > 11 ? `${labelTop.slice(0, 9)}…` : labelTop}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={baselineY + 30}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#64748b"
                        >
                          {labelBottom.length > 9 ? `${labelBottom.slice(0, 7)}…` : labelBottom}
                        </text>
                      </>
                    ) : (
                      <text
                        x={x + barWidth / 2}
                        y={baselineY + 24}
                        textAnchor="middle"
                        fontSize={rawLabel.length > 12 ? 11 : 12}
                        fontWeight="700"
                        fill="#334155"
                      >
                        {rawLabel.length > 16 ? `${rawLabel.slice(0, 14)}…` : rawLabel}
                      </text>
                    )}
                  </g>
                )
              })
            })()}
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
                    <span className="truncate text-sm font-semibold text-slate-950">{d.label}</span>
                    <span className="shrink-0 tabular-nums text-sm font-semibold text-muteStrong">
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
