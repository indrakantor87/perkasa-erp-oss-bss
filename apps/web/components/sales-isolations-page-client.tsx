'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'

type IsolationRow = {
  id: string | number
  primary: string
  secondary?: string | null
  detail?: string | null
  meta: string[]
}

type SalesIsolationsPageClientProps = {
  q: string
  radboox: string
  radbooxOptions: string[]
  filteredRows: IsolationRow[]
  totalRows: number
  withTicket: number
  withoutTicket: number
}

function pickMeta(row: IsolationRow, prefix: string) {
  return (
    row.meta
      .find((item) => item.startsWith(prefix))
      ?.replace(prefix, '')
      .trim() ?? ''
  )
}

export default function SalesIsolationsPageClient(props: SalesIsolationsPageClientProps) {
  const { q, radboox, radbooxOptions, filteredRows, totalRows, withTicket, withoutTicket } = props
  const totalCols = 11

  return (
    <div className="space-y-4">
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
              List Data Isolir
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muteStrong">
              Halaman ini fokus untuk memantau data isolir milik user login dengan pola tabel monitoring seperti referensi `web-psb-perkasa`, tanpa membawa lane support yang lebih lebar.
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
          Data isolir di menu penjualan dibatasi ke customer yang terkait marketing user login, sehingga tabel tetap fokus untuk follow up prospek dan customer aktif.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-surface px-4 py-4 text-muteStrong">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Total Isolir</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{totalRows}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Customer isolir aktif sesuai ownership marketing user login.</p>
          </article>
          <article className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-4 text-warning">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Belum Ada Ticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{withoutTicket}</p>
            <p className="mt-2 text-sm leading-6 text-warning/90">Kasus isolir yang belum masuk ke jalur dismantle.</p>
          </article>
          <article className="rounded-2xl border border-info/40 bg-info/10 px-4 py-4 text-info">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Sudah Berticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{withTicket}</p>
            <p className="mt-2 text-sm leading-6 text-info/90">Data isolir yang sudah punya ticket dismantle.</p>
          </article>
        </div>

        <form className="mt-4 grid gap-4 lg:grid-cols-4" action="/sales/isolations" method="get">
          <label className="flex flex-col gap-2 text-sm text-muteStrong lg:col-span-3">
            <span className="font-semibold text-inkStrong">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nama pelanggan / service no / no hp / marketing"
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Radboox</span>
            <select
              name="radboox"
              defaultValue={radboox}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {radbooxOptions.map((item) => (
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
              href="/sales/isolations"
              className="inline-flex items-center justify-center rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surfaceElevated shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1260px] w-full border-collapse">
              <thead className="bg-surfaceStrong">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muteStrong">
                  <ExpandableHeaderLeftCells />
                  <th className="px-4 py-3">Nama Pelanggan</th>
                  <th className="px-4 py-3">User / Service</th>
                  <th className="px-4 py-3">No. HP</th>
                  <th className="px-4 py-3">Marketing</th>
                  <th className="px-4 py-3">Radboox</th>
                  <th className="px-4 py-3">Suspend</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {filteredRows.map((row, index) => {
                  const ticketStatus = pickMeta(row, 'Ticket Dismantle: ') || 'Belum'
                  const ticketTone = ticketStatus.toUpperCase() === 'SUDAH'
                    ? 'bg-info/15 text-info'
                    : 'bg-warning/15 text-warning'

                  const compactRow = (
                    <>
                      <td className="px-4 py-3 text-sm text-muteStrong">
                        <p className="font-semibold text-inkStrong">{row.primary}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">{pickMeta(row, 'Customer Code: ') || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Service No: ') || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Phone: ') || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Marketing: ') || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muteStrong">{row.secondary || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Isolasi: ') || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muteStrong">
                        <p className="max-w-[320px] leading-6">{row.detail || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muteStrong">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${ticketTone}`}
                        >
                          {ticketStatus}
                        </span>
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
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Pelanggan</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Service / Kontak</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Lokasi / Radboox</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p className="font-semibold">{row.primary}</p>
                                  <p className="text-xs text-mute">Code: {pickMeta(row, 'Customer Code: ') || '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p>Service: {pickMeta(row, 'Service No: ') || '-'}</p>
                                  <p className="text-xs text-mute">HP: {pickMeta(row, 'Phone: ') || '-'}</p>
                                  <p className="text-xs text-mute">Marketing: {pickMeta(row, 'Marketing: ') || '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p>Radboox: {row.secondary || '-'}</p>
                                  <p className="text-xs text-mute">Isolasi: {pickMeta(row, 'Isolasi: ') || '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p>Ticket Dismantle: {ticketStatus}</p>
                                  <p className="mt-1 text-xs leading-5 text-mute">{row.detail || '-'}</p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Radboox</span>
                            <span className="tabular-nums text-slate-900">{row.secondary || '-'}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Marketing</span>
                            <span className="tabular-nums text-slate-900">{pickMeta(row, 'Marketing: ') || '-'}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Ticket</span>
                            <span className="tabular-nums text-slate-900">{ticketStatus}</span>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-2 pt-3 border-t border-line">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                        <div className="flex flex-wrap gap-3 items-center">
                          <Link
                            href="/support/isolations"
                            className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                          >
                            Buka Lane Isolir
                          </Link>
                        </div>
                      </section>
                    </div>
                  )

                  return (
                    <ExpandableRow
                      key={row.id}
                      id={`${row.id}`}
                      num={index + 1}
                      totalCols={totalCols}
                      compactRow={compactRow}
                      detail={detail}
                    />
                  )
                })}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-6 text-sm text-muteStrong">
                      Belum ada data isolir yang sesuai filter untuk user login.
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
