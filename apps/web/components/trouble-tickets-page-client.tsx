'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'

type TroubleTicketItem = {
  id: string | number
  ticketCode?: string | null
  category?: string | null
  customerName?: string | null
  customerUser?: string | null
  type?: string | null
  status?: string | null
  openedAt?: string | null
  branchId?: string | number | null
  subscriptionId?: string | number | null
}

type TroubleTicketsPageClientProps = {
  q: string
  status: string
  type: string
  category: string
  items: TroubleTicketItem[]
  error: string | null
}

export default function TroubleTicketsPageClient(props: TroubleTicketsPageClientProps) {
  const { q, status, type, category, items, error } = props
  const totalCols = 8

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tracking Support</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Trouble Ticket</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Filter ticket gangguan untuk melihat detail, work order terkait, dan movement barang.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-5" action="/dashboard/tracking/trouble-tickets" method="get">
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="TT-202607-0001 / customer"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <input
              name="status"
              defaultValue={status}
              placeholder="OPEN"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Type</span>
            <input
              name="type"
              defaultValue={type}
              placeholder="LOS"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Category</span>
            <input
              name="category"
              defaultValue={category}
              placeholder="TT"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              Terapkan Filter
            </button>
            <Link
              href="/dashboard/tracking/trouble-tickets"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Reset
            </Link>
            <span className="solid-chip">{items.length} item</span>
          </div>
        </form>

        {error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                <ExpandableHeaderLeftCells />
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((row, idx) => {
                const compactRow = (
                  <>
                    <td className="px-4 py-3 align-middle max-w-[14ch]">
                      <Link
                        href={`/dashboard/tracking/trouble-tickets/${row.id}`}
                        className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90 whitespace-nowrap overflow-hidden text-ellipsis block max-w-[14ch]"
                        title={row.ticketCode ?? `#${row.id}`}
                      >
                        {row.ticketCode ?? `#${row.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm leading-6 text-mute max-w-[16ch]">
                      <p className="font-semibold text-[var(--color-ink-strong)] whitespace-nowrap overflow-hidden text-ellipsis max-w-[16ch]" title={row.customerName ?? '-'}>
                        {row.customerName ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-[var(--color-mute-strong)] max-w-[12ch] whitespace-nowrap overflow-hidden text-ellipsis" title={row.type ?? '-'}>
                      {row.type ?? '-'}
                    </td>
                    <td className="px-4 py-3 align-middle max-w-[12ch]">
                      <span className="badge border-transparent whitespace-nowrap max-w-[12ch] overflow-hidden text-ellipsis inline-block" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }} title={row.status ?? '-'}>
                        {row.status ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-[var(--color-mute-strong)] max-w-[18ch] whitespace-nowrap overflow-hidden text-ellipsis" title={row.openedAt ?? '-'}>
                      {row.openedAt ?? '-'}
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
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Customer</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Type / Status</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Referensi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{row.ticketCode ?? `#${row.id}`}</p>
                                <p className="text-xs text-mute">Kategori: {row.category ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{row.customerName ?? '-'}</p>
                                <p className="text-xs text-mute">{row.customerUser ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>Type: {row.type ?? '-'}</p>
                                <p className="text-xs text-mute">Status: {row.status ?? '-'}</p>
                                <p className="text-xs text-mute">Opened: {row.openedAt ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>BR: {row.branchId ?? '-'}</p>
                                <p className="text-xs text-mute">SUB: {row.subscriptionId ?? '-'}</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="space-y-2">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Type</span>
                          <span className="tabular-nums text-slate-900">{row.type ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
                          <span className="tabular-nums text-slate-900">{row.status ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Opened</span>
                          <span className="tabular-nums text-slate-900">{row.openedAt ?? '-'}</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 pt-3 border-t border-line">
                      <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                      <div className="flex flex-wrap gap-3 items-center">
                        <Link
                          href={`/dashboard/tracking/trouble-tickets/${row.id}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                          Lihat Detail TT
                        </Link>
                      </div>
                    </section>
                  </div>
                )

                return (
                  <ExpandableRow
                    key={row.id}
                    id={`${row.id}`}
                    num={idx + 1}
                    totalCols={totalCols}
                    compactRow={compactRow}
                    detail={detail}
                  />
                )
              })}
              {!items.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-mute" colSpan={totalCols}>
                    Tidak ada data pada kombinasi filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
