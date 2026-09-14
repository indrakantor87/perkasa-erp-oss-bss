'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'
import type { NocQueueItem, NocQueueStatus, NocTicketType } from '@/lib/services/noc-queue-service'

type TicketType = NocTicketType
type QueueStatus = NocQueueStatus

const ticketTypeOptions: TicketType[] = ['PSB', 'TROUBLESHOOTS', 'DISMANTLE', 'JALUR']
const queueStatusOptions: QueueStatus[] = ['OPEN', 'ON_PROGRESS', 'TEMPORARY', 'CLOSE']

function getTypeBadgeClass(ticketType: NocTicketType) {
  if (ticketType === 'PSB') return 'bg-sky-100 text-sky-700'
  if (ticketType === 'TROUBLESHOOTS') return 'bg-amber-100 text-amber-800'
  if (ticketType === 'DISMANTLE') return 'bg-rose-100 text-rose-700'
  if (ticketType === 'JALUR') return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-700'
}

function getStatusBadgeClass(queueStatus: NocQueueStatus) {
  if (queueStatus === 'OPEN') return 'bg-sky-100 text-sky-700'
  if (queueStatus === 'ON_PROGRESS') return 'bg-amber-100 text-amber-800'
  if (queueStatus === 'TEMPORARY') return 'bg-orange-100 text-orange-700'
  if (queueStatus === 'CLOSE') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

function getSlaBadgeClass(slaState: NocQueueItem['slaState']) {
  if (slaState === 'BREACHED') return 'bg-rose-100 text-rose-700'
  if (slaState === 'WARNING') return 'bg-amber-100 text-amber-800'
  if (slaState === 'ON_TRACK') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

function formatTicketTimestamp(value: string | null | undefined) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type SalesTicketingPageClientProps = {
  q: string
  ticketType: string
  queueStatus: string
  totalTickets: number
  openTickets: number
  urgentTickets: number
  items: NocQueueItem[]
  error: string | null
}

export default function SalesTicketingPageClient(props: SalesTicketingPageClientProps) {
  const { q, ticketType, queueStatus, totalTickets, openTickets, urgentTickets, items, error } = props
  const totalCols = 11

  return (
    <div className="space-y-4">
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
              Ticketing Perkasa
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muteStrong">
              Halaman ini memakai pola tabel NOC dari `web-psb-perkasa`, tetapi isi datanya menjadi ticket gabungan ERP: PSB, Troubleshoots, Dismantle, dan Jalur milik user login.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales"
              className="rounded-md border border-line bg-surfaceSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Kembali ke Penjualan
            </Link>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="rounded-xl border border-line bg-surfaceSoft px-4 py-3 text-sm text-muteStrong">
          Ticketing Perkasa di menu penjualan hanya menampilkan ticket yang terkait user login agar monitoring progres tetap fokus, ringan, dan tetap mengikuti pola tabel referensi NOC.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-surface px-4 py-4 text-muteStrong">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Total Ticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{totalTickets}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Semua ticket yang terhubung ke user login.</p>
          </article>
          <article className="rounded-2xl border border-info/40 bg-info/10 px-4 py-4 text-info">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Masih Berjalan</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{openTickets}</p>
            <p className="mt-2 text-sm leading-6 text-info/90">Ticket open atau on progress yang masih perlu dipantau.</p>
          </article>
          <article className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-4 text-warning">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Perlu Perhatian</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{urgentTickets}</p>
            <p className="mt-2 text-sm leading-6 text-warning/90">Ticket dengan SLA warning atau breached.</p>
          </article>
        </div>

        <form className="mt-4 grid gap-4 lg:grid-cols-4" action="/sales/ticketing" method="get">
          <label className="flex flex-col gap-2 text-sm text-muteStrong lg:col-span-2">
            <span className="font-semibold text-inkStrong">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="WO- / TT- / nama customer / teknisi"
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Jenis Ticket</span>
            <select
              name="ticketType"
              defaultValue={ticketType}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {ticketTypeOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Status</span>
            <select
              name="queueStatus"
              defaultValue={queueStatus}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {queueStatusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="lg:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accentInk"
            >
              Terapkan Filter
            </button>
            <Link
              href="/sales/ticketing"
              className="inline-flex items-center justify-center rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Reset
            </Link>
          </div>
        </form>

        {error ? (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surfaceElevated shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse">
              <thead className="bg-surfaceStrong">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muteStrong">
                  <ExpandableHeaderLeftCells />
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">User / Site</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PIC / Teknisi</th>
                  <th className="px-4 py-3">Open</th>
                  <th className="px-4 py-3">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {items.map((item, idx) => {
                  const compactRow = (
                    <>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[14ch]">
                        <p className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis max-w-[14ch]" title={item.ticketNo ?? `#${item.sourceId}`}>
                          {item.ticketNo ?? `#${item.sourceId}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[16ch]">
                        <p className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis max-w-[16ch]" title={item.customerName ?? '-'}>
                          {item.customerName ?? '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[18ch] whitespace-nowrap overflow-hidden text-ellipsis" title={item.customerUser ?? 'Customer / site belum terhubung'}>
                        {item.customerUser ?? 'Customer / site belum terhubung'}
                      </td>
                      <td className="px-4 py-3 align-middle max-w-[12ch]">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap max-w-[12ch] overflow-hidden text-ellipsis ${getTypeBadgeClass(item.ticketType)}`}
                          title={item.ticketType}
                        >
                          {item.ticketType}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap ${getStatusBadgeClass(item.queueStatus)}`}
                          >
                            {item.queueStatus}
                          </span>
                          {item.slaLabel ? (
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap ${getSlaBadgeClass(item.slaState)}`}
                            >
                              SLA {item.slaLabel}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[16ch]">
                        <p className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis max-w-[16ch]" title={item.technicianName ?? '-'}>
                          {item.technicianName ?? '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[18ch] whitespace-nowrap overflow-hidden text-ellipsis" title={formatTicketTimestamp(item.queueStartedAt)}>
                        {formatTicketTimestamp(item.queueStartedAt)}
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[18ch] whitespace-nowrap overflow-hidden text-ellipsis" title={formatTicketTimestamp(item.lastUpdateAt ?? item.queueStartedAt)}>
                        {formatTicketTimestamp(item.lastUpdateAt ?? item.queueStartedAt)}
                      </td>
                    </>
                  )

                  const detail = (
                    <div className="space-y-5">
                      <section className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Detil Data</h4>
                        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Ticket</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Customer / Site</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">PIC / Teknisi</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p className="font-semibold">{item.ticketNo ?? `#${item.sourceId}`}</p>
                                  <p className="text-xs text-mute">Lane: {item.supportLaneLabel}</p>
                                  <p className="text-xs text-mute">Source: {item.sourceType}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p className="font-semibold">{item.customerName ?? '-'}</p>
                                  <p className="text-xs text-mute">{item.customerUser ?? '-'}</p>
                                  <p className="text-xs text-mute">WO: {item.workOrderId ?? '-'}</p>
                                  <p className="text-xs text-mute">TT: {item.troubleTicketId ?? '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p>Teknisi: {item.technicianName ?? '-'}</p>
                                  <p className="text-xs text-mute">PIC: {item.picName ?? item.supportLaneLabel}</p>
                                  <p className="text-xs text-mute">Priority: {item.priority ?? '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p>{item.requestCode ?? item.deviceState ?? '-'}</p>
                                  {item.operationalBadges.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {item.operationalBadges.map((badge) => (
                                        <span
                                          key={`detail-${item.queueKey}-${badge}`}
                                          className="inline-flex rounded-full bg-surfaceMuted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muteStrong"
                                        >
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Jenis</span>
                            <span className="tabular-nums text-slate-900">{item.ticketType}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
                            <span className="tabular-nums text-slate-900">{item.queueStatus}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">SLA</span>
                            <span className="tabular-nums text-slate-900">{item.slaLabel ?? item.slaState ?? '-'}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Umur</span>
                            <span className="tabular-nums text-slate-900">{item.ageLabel ?? '-'}</span>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-2 pt-3 border-t border-line">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                        <div className="flex flex-wrap gap-3 items-center">
                          <Link
                            href={item.href}
                            className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                          >
                            Buka
                          </Link>
                        </div>
                      </section>
                    </div>
                  )

                  return (
                    <ExpandableRow
                      key={item.queueKey}
                      id={item.queueKey || `${idx}`}
                      num={idx + 1}
                      totalCols={totalCols}
                      compactRow={compactRow}
                      detail={detail}
                    />
                  )
                })}
                {!items.length ? (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-6 text-sm text-muteStrong">
                      Belum ada ticket yang sesuai filter untuk user login.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
