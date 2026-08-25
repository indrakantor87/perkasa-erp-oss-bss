import Link from 'next/link'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import type { DashboardOperationalCard, DashboardOperationalDivisionKey } from '@/lib/types'
import type { DashboardMetric } from '@/lib/types'
import {
  DASHBOARD_DIVISION_CLUSTERS,
  SUPER_ADMIN_OPERASIONAL_INTI_CLUSTERS,
  isDivisionMenuItemIntegrated,
} from '@/lib/dashboard-division-structure'
import { buildSuperAdminCoreOperationalCards } from '@/lib/dashboard-super-admin-core'

const monthOptions = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const divisionOptions: Array<{ value: DashboardOperationalDivisionKey; label: string }> = [
  { value: 'ALL', label: 'Semua Sub-divisi' },
  { value: 'SALES', label: 'Penjualan' },
  { value: 'CS', label: 'CS' },
  { value: 'NOC', label: 'NOC' },
  { value: 'TT', label: 'Troubleshoots' },
  { value: 'DISMANTLE', label: 'Dismantle' },
  { value: 'DIGITAL', label: 'Creator Digital' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'HR', label: 'HR' },
  { value: 'INVENTORY', label: 'Inventory' },
]

function appendDrilldownPeriod(href: string | undefined, month: number, year: number) {
  if (!href) return href
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('month', String(month))
  params.set('year', String(year))
  return `${path}?${params.toString()}`
}

export function OperationalDivisionBoard({
  cards,
  metrics = [],
  month,
  year,
  division,
  lockDivision = false,
  superAdminMode = false,
}: {
  cards: DashboardOperationalCard[]
  metrics?: DashboardMetric[]
  month: number
  year: number
  division: DashboardOperationalDivisionKey
  lockDivision?: boolean
  superAdminMode?: boolean
}) {
  const currentYear = new Date().getFullYear()
  const displayCards = superAdminMode ? buildSuperAdminCoreOperationalCards({ cards, metrics }) : cards
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]
  const cardByKey = new Map<Exclude<DashboardOperationalDivisionKey, 'ALL'>, DashboardOperationalCard>(
    displayCards.map((card) => [card.key, card]),
  )
  const clusters = superAdminMode ? SUPER_ADMIN_OPERASIONAL_INTI_CLUSTERS : DASHBOARD_DIVISION_CLUSTERS
  const visibleCardCount = superAdminMode
    ? displayCards.length
    : new Set(clusters.flatMap((cluster) => cluster.cardKeys)).size

  const labelStyle: CSSProperties = {
    color: 'var(--color-mute)',
  }
  const inputStyle: CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-ink)',
  }
  const submitButtonStyle: CSSProperties = {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-accent-ink)',
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Dashboard Operasional</p>
          <h2
            className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--color-ink-strong)' }}
          >
            Ringkasan kerja harian lintas modul
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Tampilan ini mengikuti PRD sebagai papan kendali lintas divisi untuk membaca ritme
            operasional utama sebelum operator masuk ke lane kerja yang lebih detail.
          </p>
        </div>

        <form
          method="get"
          className={`grid gap-2 rounded-2xl border border-line p-3 ${
            lockDivision ? 'md:grid-cols-3' : 'md:grid-cols-4'
          }`}
          style={{ backgroundColor: 'var(--color-card-subtle)' }}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em]" style={labelStyle}>
            Bulan
            <select
              name="month"
              defaultValue={String(month)}
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium normal-case tracking-normal"
              style={inputStyle}
            >
              {monthOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em]" style={labelStyle}>
            Tahun
            <select
              name="year"
              defaultValue={String(year)}
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium normal-case tracking-normal"
              style={inputStyle}
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {lockDivision ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={labelStyle}>Sub-divisi</p>
              <input type="hidden" name="division" value={division} />
              <span
                className="inline-flex h-[42px] items-center rounded-xl border border-line px-3 text-sm font-medium"
                style={inputStyle}
              >
                {divisionOptions.find((item) => item.value === division)?.label ?? division}
              </span>
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em]" style={labelStyle}>
              Sub-divisi
              <select
                name="division"
                defaultValue={division}
                className="rounded-xl border border-line px-3 py-2 text-sm font-medium normal-case tracking-normal"
                style={inputStyle}
              >
                {divisionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)] hover:opacity-[0.92]"
            >
              Terapkan
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-title">Performa Sub-divisi</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              {superAdminMode
                ? 'Susunan Operasional Inti untuk Super Admin dengan pemetaan menu utama yang dipakai di ERP.'
                : 'Ringkasan per divisi dari data operasional yang sudah aktif di ERP.'}
            </p>
          </div>
          <span
            className="badge border"
            style={{
              borderColor: 'var(--color-line)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-mute)',
            }}
          >
            {superAdminMode ? `${visibleCardCount} area operasional` : `${displayCards.length} sub-divisi tampil`}
          </span>
        </div>

        <div className="mt-6 space-y-6">
          {clusters.map((cluster) => {
            const clusterCards = cluster.cardKeys
              .map((key) => cardByKey.get(key))
              .filter((card): card is DashboardOperationalCard => Boolean(card))
            const integratedCardKeys = new Set(clusterCards.map((card) => card.key))

            return (
              <section
                key={cluster.title}
                className="rounded-3xl border border-line p-5"
                style={{ backgroundColor: 'var(--color-card-subtle)' }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`badge border ${cluster.tone}`}>{cluster.title}</span>
                      <span
                        className="badge border"
                        style={{
                          borderColor: 'var(--color-line)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-mute)',
                        }}
                      >
                        {cluster.items.length} menu
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-mute">
                      Dashboard operasional membaca kelompok menu per divisi dan menandai area yang sudah aktif di ERP.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {cluster.items.map((item) => {
                    const integrated = isDivisionMenuItemIntegrated(item, integratedCardKeys)
                    const integratedStyle: CSSProperties = integrated
                      ? {
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-accent-ink)',
                          borderColor: 'var(--color-accent)',
                        }
                      : {
                          borderColor: 'var(--color-line)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-mute)',
                        }

                    return (
                      <span
                        key={`${cluster.title}-${item.label}`}
                        className="badge border"
                        style={integratedStyle}
                      >
                        {item.label}
                      </span>
                    )
                  })}
                </div>

                {clusterCards.length ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {clusterCards.map((card) => (
                      <article
                        key={card.key}
                        className="rounded-3xl border border-line p-5"
                        style={{ backgroundColor: 'var(--color-surface)' }}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className={`badge border ${card.tone}`}>{card.badge}</span>
                              <p
                                className="text-lg font-semibold"
                                style={{ color: 'var(--color-ink-strong)' }}
                              >
                                {card.title}
                              </p>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-mute">{card.description}</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {card.metrics.map((metric) => (
                            <div
                              key={`${card.key}-${metric.label}`}
                              className="rounded-2xl border border-line p-4"
                              style={{ backgroundColor: 'var(--color-card-subtle)' }}
                            >
                              {metric.href ? (
                                <Link
                                  prefetch={false}
                                  href={appendDrilldownPeriod(metric.href, month, year) ?? metric.href}
                                  className="block transition hover:opacity-80"
                                >
                                  <p
                                    className="text-xs font-semibold uppercase tracking-[0.18em]"
                                    style={{ color: 'var(--color-mute)' }}
                                  >
                                    {metric.label}
                                  </p>
                                  <p
                                    className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight"
                                    style={{ color: 'var(--color-ink-strong)' }}
                                  >
                                    {metric.value}
                                  </p>
                                  {metric.hintBadges?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {metric.hintBadges.map((badge) => (
                                        <span
                                          key={`${card.key}-${metric.label}-${badge}`}
                                          className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                          style={{
                                            borderColor: 'var(--color-line)',
                                            backgroundColor: 'var(--color-surface)',
                                            color: 'var(--color-mute)',
                                          }}
                                        >
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  <p className="mt-2 text-xs leading-5 text-mute">
                                    {metric.hint || 'Klik untuk masuk ke proses terkait.'}
                                  </p>
                                </Link>
                              ) : (
                                <>
                                  <p
                                    className="text-xs font-semibold uppercase tracking-[0.18em]"
                                    style={{ color: 'var(--color-mute)' }}
                                  >
                                    {metric.label}
                                  </p>
                                  <p
                                    className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight"
                                    style={{ color: 'var(--color-ink-strong)' }}
                                  >
                                    {metric.value}
                                  </p>
                                  {metric.hintBadges?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {metric.hintBadges.map((badge) => (
                                        <span
                                          key={`${card.key}-${metric.label}-${badge}`}
                                          className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                          style={{
                                            borderColor: 'var(--color-line)',
                                            backgroundColor: 'var(--color-surface)',
                                            color: 'var(--color-mute)',
                                          }}
                                        >
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  <p className="mt-2 text-xs leading-5 text-mute">
                                    {metric.hint || 'Ringkasan KPI operasional saat ini.'}
                                  </p>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 flex justify-end">
                          <Link
                            href={card.href}
                            prefetch={false}
                            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition bg-[var(--color-surface)] text-[var(--color-mute-strong)] hover:bg-[var(--color-surface-soft)] hover:border-[var(--color-line-strong)]"
                          >
                            Lihat detail
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div
                    className="mt-5 rounded-3xl border border-dashed p-5"
                    style={{
                      borderColor: 'var(--color-line-strong)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
                      Belum ada kartu KPI aktif
                    </p>
                    <p className="mt-2 text-sm leading-6 text-mute">
                      Divisi ini sudah tampil di struktur dashboard, tetapi KPI operasional per sub-divisinya masih
                      menunggu integrasi batch berikutnya.
                    </p>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}
