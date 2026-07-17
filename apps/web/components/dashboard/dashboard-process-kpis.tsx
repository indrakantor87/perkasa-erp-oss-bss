import Link from 'next/link'
import type { DashboardOperationalCard } from '@/lib/types'

function appendDrilldownPeriod(href: string | undefined, month: number, year: number) {
  if (!href) return href
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('month', String(month))
  params.set('year', String(year))
  return `${path}?${params.toString()}`
}

function resolveMetricHref(params: { card: DashboardOperationalCard; metricLabel: string }) {
  const label = params.metricLabel.trim().toUpperCase()

  if (params.card.key === 'CS') {
    if (label.includes('ISOLIR')) return '/support/isolations?focus=ACTIVE_ISOLATIONS'
    if (label.includes('DISMANTLE')) return '/support/dismantle?focus=RECENT_DISMANTLE'
    if (label.includes('WORK ORDER')) return '/sales'
  }

  if (params.card.key === 'NOC') {
    if (label.includes('RASIO')) return '/support/sla?focus=OVERDUE_RATE'
    if (label.includes('OVERDUE') || label.includes('SLA')) return '/support/sla?focus=SLA_OVERDUE'
    if (label.includes('PERIODE')) return '/support/tt?focus=MONTHLY_OPENED'
    return '/support/tt?focus=OPEN_TICKETS'
  }

  if (params.card.key === 'TT') {
    if (label.includes('ESKALASI')) return '/support/tt?focus=NEED_ESCALATION'
    if (label.includes('CLOSE')) return '/support/tt?focus=READY_CLOSE'
    return '/support/tt?focus=OPEN_TICKETS'
  }

  if (params.card.key === 'DISMANTLE') {
    if (label.includes('CLOSE')) return '/support/dismantle?focus=RECENT_DISMANTLE'
    return '/support/dismantle?focus=OPEN_QUEUE'
  }

  if (params.card.key === 'SALES') {
    if (label.includes('RASIO')) return '/sales?focus=ACTIVATION_RATE'
    if (label.includes('AKTIVASI')) return '/sales?focus=MONTHLY_ACTIVATIONS'
    if (label.includes('PSB') || label.includes('ORDER') || label.includes('PERIODE')) return '/sales?focus=MONTHLY_ORDERS'
    return '/sales?focus=ACTIVE_LEADS'
  }

  if (params.card.key === 'DIGITAL') {
    if (label.includes('SURVEY')) return '/sales?focus=DIGITAL_SURVEYS'
    if (label.includes('ORDER')) return '/sales?focus=DIGITAL_ORDERS'
    return '/sales?focus=DIGITAL_LEADS'
  }

  if (params.card.key === 'BILLING') {
    if (label.includes('SUSPEND')) return '/billing?focus=SUSPEND_CANDIDATES'
    if (label.includes('NOMINAL')) return '/billing?focus=BILLING_OVERDUE_AMOUNT'
    if (label.includes('PARSIAL')) return '/billing?focus=PARTIAL_INVOICES'
    return '/billing?focus=OVERDUE_INVOICES'
  }

  if (params.card.key === 'HR') {
    if (label.includes('RASIO')) return '/hr?focus=ATTENDANCE_RATE'
    if (label.includes('PINJAMAN')) return '/hr?focus=ACTIVE_LOANS'
    if (label.includes('ABSENSI')) return '/hr?focus=TODAY_ATTENDANCE'
    return '/hr?focus=ACTIVE_EMPLOYEES'
  }

  if (params.card.key === 'INVENTORY') {
    if (label.includes('REQUEST')) return '/inventory?focus=PENDING_REQUESTS'
    if (label.includes('MUTASI')) return '/inventory?focus=MONTHLY_MOVEMENTS'
    return '/inventory?focus=ACTIVE_ITEMS'
  }

  return params.card.href
}

export function DashboardProcessKpis({ cards, month, year }: { cards: DashboardOperationalCard[]; month: number; year: number }) {
  if (!cards.length) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">KPI Proses</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Metrik detail untuk membaca proses harian per sub-divisi
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini memecah ringkasan sub-divisi menjadi metrik proses yang bisa langsung diklik ke lane atau modul yang relevan.
          </p>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{cards.length} sub-divisi</span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {cards.map((card) => (
          <article key={card.key} className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge border ${card.tone}`}>{card.badge}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">{card.title}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-mute">{card.description}</p>
              </div>
              <Link
                href={card.href}
                prefetch={false}
                className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                Buka Modul
              </Link>
            </div>

            <div className="mt-5 space-y-2">
              {card.metrics.map((metric) => {
                const href = appendDrilldownPeriod(resolveMetricHref({ card, metricLabel: metric.label }), month, year)
                return (
                  <Link
                    key={`${card.key}-${metric.label}`}
                    href={href}
                    prefetch={false}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{metric.label}</p>
                      {metric.hintBadges?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {metric.hintBadges.map((badge) => (
                            <span
                              key={`${card.key}-${metric.label}-${badge}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm text-mute">{metric.hint || 'Klik untuk masuk ke proses terkait'}</p>
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                      {metric.value}
                    </span>
                  </Link>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
