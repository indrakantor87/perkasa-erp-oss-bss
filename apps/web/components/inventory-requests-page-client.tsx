'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'
import { InventoryRequestTrackingFilters } from '@/components/inventory-request-tracking-filters'

type InventoryRequestItem = {
  id: string | number
  requestCode?: string | null
  requestType?: string | null
  itemCode?: string | null
  inventoryItemId?: string | number | null
  itemName?: string | null
  requestQty?: string | number | null
  requestStatus?: string | null
  requestedSubdivision?: string | null
  requestedBy?: string | null
  requestedAt?: string | null
  workOrderId?: string | number | null
  troubleTicketId?: string | number | null
}

type InventoryRequestFilterDefaults = {
  q: string
  status: string
  requestType: string
  workOrderId: string
  troubleTicketId: string
  mine: boolean
}

type InventoryRequestsPageClientProps = {
  defaultValues: InventoryRequestFilterDefaults
  items: InventoryRequestItem[]
  referenceActive: boolean
  error: string | null
}

export default function InventoryRequestsPageClient(props: InventoryRequestsPageClientProps) {
  const { defaultValues, items, referenceActive, error } = props
  const totalCols = 10

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tracking Inventory</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Request Barang</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Filter request barang untuk melihat detail, konteks WO/TT, dan movement inventory terkait.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        <InventoryRequestTrackingFilters defaultValues={defaultValues} />

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
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subdivisi</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((row, idx) => {
                const compactRow = (
                  <>
                    <td className="px-4 py-4 align-top">
                      <Link
                        href={`/dashboard/tracking/inventory-requests/${row.id}`}
                        className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90"
                      >
                        {row.requestCode ?? `#${row.id}`}
                      </Link>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mute">{row.requestType ?? '-'}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      <p className="font-semibold text-[var(--color-ink-strong)]">{row.itemCode ?? `Item #${row.inventoryItemId}`}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-mute">{row.itemName ?? ''}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.requestQty ?? '-'}</td>
                    <td className="px-4 py-4 align-top">
                      <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>
                        {row.requestStatus ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.requestedSubdivision ?? '-'}</td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">{row.requestedBy ?? '-'}</td>
                    <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.requestedAt ?? '-'}</td>
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
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Request</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Item / Qty</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Pemohon</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Referensi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{row.requestCode ?? `#${row.id}`}</p>
                                <p className="text-xs text-mute">Type: {row.requestType ?? '-'}</p>
                                <p className="text-xs text-mute">Status: {row.requestStatus ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>{row.itemCode ?? `Item #${row.inventoryItemId}`}</p>
                                <p className="text-xs text-mute">{row.itemName ?? '-'}</p>
                                <p className="text-xs text-mute">Qty: {row.requestQty ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>{row.requestedBy ?? '-'}</p>
                                <p className="text-xs text-mute">Subdivisi: {row.requestedSubdivision ?? '-'}</p>
                                <p className="text-xs text-mute">Waktu: {row.requestedAt ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>WO: {row.workOrderId ?? '-'}</p>
                                <p className="text-xs text-mute">TT: {row.troubleTicketId ?? '-'}</p>
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
                          <span className="tabular-nums text-slate-900">{row.requestType ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
                          <span className="tabular-nums text-slate-900">{row.requestStatus ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Waktu</span>
                          <span className="tabular-nums text-slate-900">{row.requestedAt ?? '-'}</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 pt-3 border-t border-line">
                      <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                      <div className="flex flex-wrap gap-3 items-center">
                        <Link
                          href={`/dashboard/tracking/inventory-requests/${row.id}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                          Lihat Detail Request
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
