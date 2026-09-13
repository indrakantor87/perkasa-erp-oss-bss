'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'
import { StockMovementTrackingFilters } from '@/components/stock-movement-tracking-filters'

type StockMovementItem = {
  id: string | number
  itemId?: string | number | null
  itemCode?: string | null
  itemName?: string | null
  movementType?: string | null
  referenceType?: string | null
  qty?: string | number | null
  workOrderId?: string | number | null
  troubleTicketId?: string | number | null
  requestId?: string | number | null
  fromLocationCode?: string | null
  toLocationCode?: string | null
  technicianFullName?: string | null
  technicianUsername?: string | null
  technicianUserId?: string | number | null
  movementAt?: string | null
}

type StockMovementFilterDefaults = {
  q: string
  movementType: string
  referenceType: string
  workOrderId: string
  troubleTicketId: string
  technicianUserId: string
  mine: boolean
}

type StockMovementsPageClientProps = {
  defaultValues: StockMovementFilterDefaults
  items: StockMovementItem[]
  referenceActive: boolean
  error: string | null
}

export default function StockMovementsPageClient(props: StockMovementsPageClientProps) {
  const { defaultValues, items, referenceActive, error } = props
  const totalCols = 9

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tracking Barang</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Inventory Stock Movements</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Filter movement berdasarkan item, referensi (WO/TT/Request), teknisi, atau lokasi.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        <StockMovementTrackingFilters defaultValues={defaultValues} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="solid-chip">{items.length} item</span>
          {referenceActive ? (
            <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-surface-soft)', color: 'var(--color-ink-strong)' }}>
              Filter referensi aktif
            </span>
          ) : null}
        </div>

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
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Teknisi</th>
                <th className="px-4 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((row, idx) => {
                const compactRow = (
                  <>
                    <td className="px-4 py-4 align-top">
                      <Link
                        href={`/dashboard/tracking/stock-movements/${row.id}`}
                        className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90"
                      >
                        {row.itemCode ?? `Item #${row.itemId}`}
                      </Link>
                      <p className="mt-1 text-sm text-mute">{row.itemName ?? ''}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                      {row.movementType ?? '-'}
                      {row.referenceType ? ` • ${row.referenceType}` : ''}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.qty ?? '-'}</td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      <p>
                        {row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}
                        {row.toLocationCode ? row.toLocationCode : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                      {row.technicianFullName ?? row.technicianUsername ?? (row.technicianUserId ? `User #${row.technicianUserId}` : '-')}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.movementAt ?? '-'}</td>
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
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Item</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Movement</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Lokasi / Teknisi</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Referensi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{row.itemCode ?? `Item #${row.itemId}`}</p>
                                <p className="text-xs text-mute">{row.itemName ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>Type: {row.movementType ?? '-'}</p>
                                <p className="text-xs text-mute">Ref Type: {row.referenceType ?? '-'}</p>
                                <p className="text-xs text-mute">Qty: {row.qty ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>
                                  {row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}
                                  {row.toLocationCode ?? '-'}
                                </p>
                                <p className="text-xs text-mute">
                                  Teknisi: {row.technicianFullName ?? row.technicianUsername ?? (row.technicianUserId ? `User #${row.technicianUserId}` : '-')}
                                </p>
                                <p className="text-xs text-mute">Waktu: {row.movementAt ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>WO: {row.workOrderId ?? '-'}</p>
                                <p className="text-xs text-mute">TT: {row.troubleTicketId ?? '-'}</p>
                                <p className="text-xs text-mute">REQ: {row.requestId ?? '-'}</p>
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
                          <span className="tabular-nums text-slate-900">{row.movementType ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Qty</span>
                          <span className="tabular-nums text-slate-900">{String(row.qty ?? '-')}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Waktu</span>
                          <span className="tabular-nums text-slate-900">{row.movementAt ?? '-'}</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 pt-3 border-t border-line">
                      <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                      <div className="flex flex-wrap gap-3 items-center">
                        <Link
                          href={`/dashboard/tracking/stock-movements/${row.id}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                          Lihat Detail Movement
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
