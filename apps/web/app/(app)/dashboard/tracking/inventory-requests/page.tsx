import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryRequestTrackingFilters } from '@/components/inventory-request-tracking-filters'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryRequestTrackingList, type InventoryRequestTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function InventoryRequestTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<InventoryRequestTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const payload = await getInventoryRequestTrackingList(query)
  const q = resolveSearchParam(query.q) ?? ''
  const status = resolveSearchParam(query.status) ?? ''
  const requestType = resolveSearchParam(query.requestType) ?? ''
  const workOrderId = resolveSearchParam(query.workOrderId) ?? ''
  const troubleTicketId = resolveSearchParam(query.troubleTicketId) ?? ''

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
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

        <InventoryRequestTrackingFilters
          defaultValues={{
            q,
            status,
            requestType,
            workOrderId,
            troubleTicketId,
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="solid-chip">{payload.items.length} item</span>
          {(workOrderId || troubleTicketId) ? (
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
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subdivisi</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {payload.items.map((row) => (
                <tr key={row.id}>
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
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                    <p>WO: {row.workOrderId ?? '-'}</p>
                    <p>TT: {row.troubleTicketId ?? '-'}</p>
                  </td>
                </tr>
              ))}
              {!payload.items.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-mute" colSpan={8}>
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

