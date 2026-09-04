import type {
  DailyActivityCalendarDay,
  DailyActivityItem,
  DailyActivityPerformancePeriod,
  DailyActivitySummary,
} from '@/lib/services/daily-activity-service'

type DailyActivitySummaryPanelProps = {
  summary: DailyActivitySummary
  todayLabel: string
  scopeLabel: string
  todayItems: DailyActivityItem[]
  recentItems: DailyActivityItem[]
  performance: {
    daily: DailyActivityPerformancePeriod
    weekly: DailyActivityPerformancePeriod
    monthly: DailyActivityPerformancePeriod
  }
  calendarMonth: string
  calendarPrevHref: string
  calendarNextHref: string
  calendarMonthLabel: string
  calendarDays: DailyActivityCalendarDay[]
}

export function DailyActivitySummaryPanel({
  summary,
  todayLabel,
  scopeLabel,
  performance,
  calendarMonth,
  calendarPrevHref,
  calendarNextHref,
  calendarMonthLabel,
  calendarDays,
}: DailyActivitySummaryPanelProps) {
  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Kontrol Harian</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Daily activity untuk {todayLabel}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
              Jaga plan pagi dan closing sore tetap disiplin dengan ringkasan harian yang lebih ringkas.
            </p>
          </div>
          <span className="badge border-transparent bg-slate-950 text-white">{scopeLabel}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Total Plan</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            {summary.totalPlans}
          </p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Selesai</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-emerald-700">
            {summary.totalDone}
          </p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Pending</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-amber-700">
            {summary.totalPending}
          </p>
        </article>
        <article className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Belum Close</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            {summary.totalOpen}
          </p>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Performa Otomatis</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Rekap harian, mingguan, dan bulanan per divisi
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Persentase performa dihitung dari jumlah aktivitas yang berhasil ditutup `DONE` dibanding total plan pada periode yang sama.
            </p>
          </div>
          <span className="badge border-slate-200 bg-white text-slate-600">{scopeLabel}</span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {[performance.daily, performance.weekly, performance.monthly].map((period) => (
            <article key={period.periodLabel} className="rounded-2xl border border-line bg-slate-50 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{period.periodLabel}</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-950">{period.completionRate}% tercapai</h4>
                </div>
                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">{period.totalDone}/{period.totalPlans} done</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mute">Pending</p>
                  <p className="mt-2 text-xl font-semibold text-amber-700">{period.totalPending}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mute">Open</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{period.totalOpen}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-mute">Total</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{period.totalPlans}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Breakdown divisi / sub-divisi</p>
                <div className="mt-3 space-y-2">
                  {period.divisionBreakdowns.length ? (
                    period.divisionBreakdowns.map((bucket) => (
                      <div key={`${period.periodLabel}-${bucket.label}`} className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-950">{bucket.label}</p>
                          <p className="text-mute">{bucket.totalDone}/{bucket.totalPlans} selesai</p>
                        </div>
                        <span className="badge border-slate-200 bg-slate-50 text-slate-700">{bucket.completionRate}%</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white bg-white px-4 py-3 text-sm text-mute">
                      Belum ada data pada periode ini.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Breakdown level</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {period.levelBreakdowns.length ? (
                    period.levelBreakdowns.map((bucket) => (
                      <span key={`${period.periodLabel}-${bucket.label}-level`} className="badge border-sky-200 bg-sky-50 text-sky-700">
                        {bucket.label}: {bucket.completionRate}% ({bucket.totalDone}/{bucket.totalPlans})
                      </span>
                    ))
                  ) : (
                    <span className="badge border-slate-200 bg-white text-slate-600">Belum ada data level</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Kalender Plan</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Kalender rencana aktivitas {calendarMonthLabel}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Kalender ini membantu melihat sebaran plan per tanggal sekaligus memantau hari mana yang performanya masih rendah.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={calendarPrevHref}
              className="badge border-slate-200 bg-white text-slate-600"
            >
              Bulan sebelumnya
            </a>
            <span className="badge border-slate-200 bg-white text-slate-600">
              {calendarMonthLabel} ({calendarMonth})
            </span>
            <a
              href={calendarNextHref}
              className="badge border-slate-200 bg-white text-slate-600"
            >
              Bulan berikutnya
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-mute">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
            <div key={day} className="rounded-2xl border border-line bg-slate-50 px-2 py-3">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {calendarDays.map((day) =>
            day.isPlaceholder ? (
              <div key={day.key} className="min-h-28 rounded-2xl border border-dashed border-line bg-slate-50" />
            ) : (
              <article
                key={day.key}
                className={`min-h-28 rounded-2xl border p-3 text-sm ${
                  day.isToday ? 'border-slate-950 bg-slate-950 text-white' : 'border-line bg-white text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{day.dayNumber}</span>
                  <span className={`badge ${day.isToday ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    {day.totalPlans}
                  </span>
                </div>
                <div className={`mt-3 space-y-1 text-xs leading-5 ${day.isToday ? 'text-slate-200' : 'text-mute'}`}>
                  <p>Done: {day.doneCount}</p>
                  <p>Pending: {day.pendingCount}</p>
                  <p>Open: {day.openCount}</p>
                  <p>Performa: {day.completionRate}%</p>
                </div>
              </article>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
