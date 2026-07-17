import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { StockMovementTrackingFilters } from '@/components/stock-movement-tracking-filters'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getStockMovementTrackingList, type StockMovementTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function StockMovementTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<StockMovementTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const payload = await getStockMovementTrackingList(query)

  const q = resolveSearchParam(query.q) ?? ''
  const movementType = resolveSearchParam(query.movementType) ?? ''
  const referenceType = resolveSearchParam(query.referenceType) ?? ''
  const workOrderId = resolveSearchParam(query.workOrderId) ?? ''
  const troubleTicketId = resolveSearchParam(query.troubleTicketId) ?? ''
  const technicianUserId = resolveSearchParam(query.technicianUserId) ?? ''

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
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

        <StockMovementTrackingFilters
          defaultValues={{
            q,
            movementType,
            referenceType,
            workOrderId,
            troubleTicketId,
            technicianUserId,
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="solid-chip">{payload.items.length} item</span>
          {(workOrderId || troubleTicketId || technicianUserId) ? (
            <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-surface-soft)', color: 'var(--color-ink-strong)' }}>
              Filter referensi aktif
            </span>
          ) : null}
        </div>

        {payload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{payload.error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Teknisi</th>
                <th className="px-4 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {payload.items.map((row) => (
                <tr key={row.id}>
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
                    <p>WO: {row.workOrderId ?? '-'}</p>
                    <p>TT: {row.troubleTicketId ?? '-'}</p>
                    <p>REQ: {row.requestId ?? '-'}</p>
                  </td>
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
                </tr>
              ))}
              {!payload.items.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-mute" colSpan={7}>
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
