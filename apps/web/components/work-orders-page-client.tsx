'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'

type WorkOrderItem = {
  id: string | number
  workOrderNo?: string | null
  workType?: string | null
  jobCategory?: string | null
  status?: string | null
  priority?: string | null
  picFullName?: string | null
  picUsername?: string | null
  technicianName?: string | null
  scheduledAt?: string | null
  salesOrderId?: string | number | null
  troubleTicketId?: string | number | null
  subscriptionId?: string | number | null
}

type WorkOrdersPageClientProps = {
  q: string
  status: string
  jobCategory: string
  priority: string
  mine: boolean
  items: WorkOrderItem[]
  counters: {
    assigned: number
    accepted: number
    onProgress: number
    completed: number
    total: number
  } | null
  countersError: string | null
  error: string | null
}

export default function WorkOrdersPageClient(props: WorkOrdersPageClientProps) {
  const { q, status, jobCategory, priority, mine, items, counters, countersError, error } = props
  const totalCols = 10

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tracking Pekerjaan</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Work Order Lapangan</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Filter dan pilih work order untuk melihat status log, assignment log, dan movement barang terkait.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        {counters && (counters.total > 0 || countersError) ? (
          <section aria-label="Ringkasan antrean teknisi" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-tier-2 border border-sky-200 bg-sky-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Menunggu ACCEPT</p>
              <p className="mt-2 text-3xl font-bold text-sky-900">{counters.assigned}</p>
              <p className="mt-1 text-xs text-sky-700">Assignment ASSIGNED menunggu konfirmasi teknisi.</p>
            </div>
            <div className="card-tier-2 border border-indigo-200 bg-indigo-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Sudah ACCEPTED</p>
              <p className="mt-2 text-3xl font-bold text-indigo-900">{counters.accepted}</p>
              <p className="mt-1 text-xs text-indigo-700">Sudah diterima teknisi, segera mulai eksekusi ON_PROGRESS.</p>
            </div>
            <div className="card-tier-2 border border-amber-200 bg-amber-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Sedang On Progress</p>
              <p className="mt-2 text-3xl font-bold text-amber-900">{counters.onProgress}</p>
              <p className="mt-1 text-xs text-amber-700">Pekerjaan lapangan sedang berjalan, pastikan material usage tercatat.</p>
            </div>
            <div className="card-tier-2 border border-emerald-200 bg-emerald-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Selesai / Closed</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">{counters.completed}</p>
              <p className="mt-1 text-xs text-emerald-700">Work order sudah ditandai COMPLETED pada periode berjalan.</p>
            </div>
          </section>
        ) : null}

        <form className="mt-6 grid gap-4 lg:grid-cols-5" action="/dashboard/tracking/work-orders" method="get">
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="WO-202607-0001 / nama teknisi"
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
            <span className="font-semibold text-slate-950">Kategori</span>
            <input
              name="jobCategory"
              defaultValue={jobCategory}
              placeholder="PSB"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Prioritas</span>
            <input
              name="priority"
              defaultValue={priority}
              placeholder="MEDIUM"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4" />
              Pekerjaan saya
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              Terapkan Filter
            </button>
            <Link
              href="/dashboard/tracking/work-orders"
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
                <th className="px-4 py-3">WO</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioritas</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Teknisi/TIm</th>
                <th className="px-4 py-3">Jadwal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((row, idx) => {
                const compactRow = (
                  <>
                    <td className="px-4 py-4 align-top">
                      <Link
                        href={`/dashboard/tracking/work-orders/${row.id}`}
                        className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90"
                      >
                        {row.workOrderNo ?? `#${row.id}`}
                      </Link>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mute">{row.workType ?? '-'}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.jobCategory ?? '-'}</td>
                    <td className="px-4 py-4 align-top">
                      <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>
                        {row.status ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.priority ?? '-'}</td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      {row.picFullName || row.picUsername ? (
                        <>
                          <p className="font-semibold text-[var(--color-ink-strong)]">{row.picFullName ?? row.picUsername}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-mute">{row.picUsername ? `@${row.picUsername}` : ''}</p>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.technicianName ?? '-'}</td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.scheduledAt ?? '-'}</td>
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
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">WO</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Tipe / Kategori</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">PIC / Teknisi</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Referensi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{row.workOrderNo ?? `#${row.id}`}</p>
                                <p className="text-xs text-mute">Status: {row.status ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>{row.workType ?? '-'}</p>
                                <p className="text-xs text-mute">Kategori: {row.jobCategory ?? '-'}</p>
                                <p className="text-xs text-mute">Priority: {row.priority ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>PIC: {row.picFullName ?? row.picUsername ?? '-'}</p>
                                <p className="text-xs text-mute">Teknisi: {row.technicianName ?? '-'}</p>
                                <p className="text-xs text-mute">Jadwal: {row.scheduledAt ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>SO: {row.salesOrderId ?? '-'}</p>
                                <p className="text-xs text-mute">TT: {row.troubleTicketId ?? '-'}</p>
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
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
                          <span className="tabular-nums text-slate-900">{row.status ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Priority</span>
                          <span className="tabular-nums text-slate-900">{row.priority ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Kategori</span>
                          <span className="tabular-nums text-slate-900">{row.jobCategory ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Jadwal</span>
                          <span className="tabular-nums text-slate-900">{row.scheduledAt ?? '-'}</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 pt-3 border-t border-line">
                      <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                      <div className="flex flex-wrap gap-3 items-center">
                        <Link
                          href={`/dashboard/tracking/work-orders/${row.id}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                          Lihat Detail WO
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
