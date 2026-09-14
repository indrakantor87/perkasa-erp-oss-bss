'use client'

import {
  GRANULARITY_OPTIONS,
  HistoricalBarChart,
  type GranularityKey,
  type HistoricalSeriesDatum,
} from '@/components/historical-bar-chart'
import { SimpleBarChart, type SimpleBarDatum } from '@/components/simple-bar-chart'

type NocHistoricalChartPayload = {
  title: string
  subtitle: string
  series: HistoricalSeriesDatum[]
  currentPeriodLabel: string
  previousPeriodLabel: string
  unitLabel: string
  emptyNote: string
  onEmptyPreviousHint: string
}

type NocKpiChartPayload = {
  title: string
  subtitle: string
  unitLabel: string
  data: SimpleBarDatum[]
  emptyNote: string
  heightPx?: number
  span2?: boolean
}

export type NocDashboardChartsProps = {
  granularity: GranularityKey
  historical: {
    opened: NocHistoricalChartPayload
    closedCombined: NocHistoricalChartPayload
    overdue: NocHistoricalChartPayload
  }
  kpi: {
    ticketStatus: NocKpiChartPayload
    isolationPipeline: NocKpiChartPayload
    ticketTypeDistribution: NocKpiChartPayload
    overduePerType: NocKpiChartPayload
  }
  granularityBasePath: string
  granularityPreserveParams: Record<string, string>
}

export function NocDashboardCharts({
  granularity,
  historical,
  kpi,
  granularityBasePath,
  granularityPreserveParams,
}: NocDashboardChartsProps) {
  const setGranularityHref = (next: GranularityKey) => {
    const nextParams = new URLSearchParams(granularityPreserveParams)
    nextParams.set('nocGranularity', next)
    return `${granularityBasePath}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`
  }

  return (
    <>
      <section id="noc-overview-historical" className="scroll-mt-24 space-y-4">
        <div className="panel p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
            <div>
              <p className="section-title">Pemantauan Historis NOC &amp; Troubleshoots</p>
              <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                Perbandingan kinerja periode saat ini vs periode sebelumnya
              </h2>
              <p className="mt-1 text-sm leading-6 text-mute">
                Visualisasi historis ini menampilkan perbandingan LITERAL periode sekarang dengan periode sebelumnya, tanpa prediksi, tanpa
                smoothing, dan tanpa interpolasi. Warna gelap = periode saat ini; warna abu = periode sebelumnya. Gunakan toggle periodisitas
                di kanan atas untuk ganti granularitas: harian sampai tahunan (sama persis dengan Dashboard Inventory).
              </p>
            </div>
            <div className="flex flex-col gap-1 text-xs leading-6 text-mute md:items-end">
              <span className="badge border-accent bg-accent/10 text-accent self-start md:self-end">
                MODE: {GRANULARITY_OPTIONS.find((o) => o.key === granularity)?.label ?? 'Bulanan'}
              </span>
              <span>Toggle periodisitas = ubah skala agregasi bucket perbandingan historis.</span>
              <span>
                Cakupan data default: 5 rows terbaru per kategori. Untuk historis panjang, buka sub menu TT, SLA, Isolations, atau Dismantle.
              </span>
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
            <form method="get" action={granularityBasePath} className="grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-end">
              <label htmlFor="nocGranularity" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
                Granularitas Historis
              </label>
              <select
                id="nocGranularity"
                name="nocGranularity"
                defaultValue={granularity}
                className="h-10 w-full rounded-full border border-line bg-surface px-3 text-sm text-inkStrong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
              >
                {GRANULARITY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-10 rounded-full border border-accent bg-accent px-4 text-sm font-semibold text-accentInk transition hover:bg-accent/90 focus-visible:shadow-focus"
              >
                Terapkan Mode
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {GRANULARITY_OPTIONS.map((opt) => {
                const active = opt.key === granularity
                return (
                  <a
                    key={opt.key}
                    href={setGranularityHref(opt.key)}
                    aria-label={`Ubah mode granularitas ke ${opt.label}`}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] transition ${
                      active
                        ? 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
                        : 'border-line bg-surface text-muteStrong hover:bg-surfaceElevated hover:text-slate-950'
                    }`}
                  >
                    {opt.shortLabel}
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <HistoricalBarChart
            title={historical.opened.title}
            subtitle={historical.opened.subtitle}
            granularity={granularity}
            setGranularityHref={setGranularityHref}
            currentPeriodLabel={historical.opened.currentPeriodLabel}
            previousPeriodLabel={historical.opened.previousPeriodLabel}
            series={historical.opened.series}
            unitLabel={historical.opened.unitLabel}
            emptyNote={historical.opened.emptyNote}
            onEmptyPreviousHint={historical.opened.onEmptyPreviousHint}
          />
          <HistoricalBarChart
            title={historical.closedCombined.title}
            subtitle={historical.closedCombined.subtitle}
            granularity={granularity}
            setGranularityHref={setGranularityHref}
            currentPeriodLabel={historical.closedCombined.currentPeriodLabel}
            previousPeriodLabel={historical.closedCombined.previousPeriodLabel}
            series={historical.closedCombined.series}
            unitLabel={historical.closedCombined.unitLabel}
            emptyNote={historical.closedCombined.emptyNote}
            onEmptyPreviousHint={historical.closedCombined.onEmptyPreviousHint}
          />
          <HistoricalBarChart
            title={historical.overdue.title}
            subtitle={historical.overdue.subtitle}
            granularity={granularity}
            setGranularityHref={setGranularityHref}
            currentPeriodLabel={historical.overdue.currentPeriodLabel}
            previousPeriodLabel={historical.overdue.previousPeriodLabel}
            series={historical.overdue.series}
            unitLabel={historical.overdue.unitLabel}
            emptyNote={historical.overdue.emptyNote}
            onEmptyPreviousHint={historical.overdue.onEmptyPreviousHint}
          />
        </div>
      </section>

      <section id="noc-overview-kpi" className="scroll-mt-24 space-y-4">
        <div className="panel p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
            <div>
              <p className="section-title">Pemantauan Kinerja NOC (Snapshot Saat Ini)</p>
              <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                Ringkasan visual proses operasional divisi NOC
              </h2>
              <p className="mt-1 text-sm leading-6 text-mute">
                Visualisasi ini menampilkan angka hitung mentah (tidak ada prediksi, asumsi, atau smoothing). Data diambil langsung dari
                review DB terbaru ticket, SLA, isolations, dan dismantle untuk dijadikan acuan dasar pengambilan keputusan harian.
              </p>
            </div>
            <span className="badge border-line bg-surfaceMuted text-muteStrong self-start">
              7 visualisasi (4 snapshot + 3 historis)
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SimpleBarChart
            title={kpi.ticketStatus.title}
            subtitle={kpi.ticketStatus.subtitle}
            unitLabel={kpi.ticketStatus.unitLabel}
            data={kpi.ticketStatus.data}
            emptyNote={kpi.ticketStatus.emptyNote}
            heightPx={kpi.ticketStatus.heightPx}
          />
          <SimpleBarChart
            title={kpi.isolationPipeline.title}
            subtitle={kpi.isolationPipeline.subtitle}
            unitLabel={kpi.isolationPipeline.unitLabel}
            data={kpi.isolationPipeline.data}
            emptyNote={kpi.isolationPipeline.emptyNote}
            heightPx={kpi.isolationPipeline.heightPx}
          />
          <SimpleBarChart
            title={kpi.ticketTypeDistribution.title}
            subtitle={kpi.ticketTypeDistribution.subtitle}
            unitLabel={kpi.ticketTypeDistribution.unitLabel}
            data={kpi.ticketTypeDistribution.data}
            emptyNote={kpi.ticketTypeDistribution.emptyNote}
            heightPx={kpi.ticketTypeDistribution.heightPx}
          />
          <SimpleBarChart
            title={kpi.overduePerType.title}
            subtitle={kpi.overduePerType.subtitle}
            unitLabel={kpi.overduePerType.unitLabel}
            data={kpi.overduePerType.data}
            emptyNote={kpi.overduePerType.emptyNote}
            heightPx={kpi.overduePerType.heightPx}
          />
        </div>
      </section>
    </>
  )
}
