import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryRequestTrackingDetail } from '@/lib/services/tracking-service'

export default async function InventoryRequestTrackingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const { id } = await params
  const requestId = Number.parseInt(id, 10)
  if (!Number.isInteger(requestId) || requestId <= 0) {
    redirect('/dashboard/tracking')
  }

  const payload = await getInventoryRequestTrackingDetail(requestId)
  const request = payload.request

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Detail Request Barang</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">
              {request?.requestCode ?? `REQ #${requestId}`}
            </h2>
            <p className="mt-3 text-sm leading-6 text-mute">
              {request?.itemCode ?? '-'} {request?.requestStatus ? `• ${request.requestStatus}` : ''}{' '}
              {request?.requestType ? `• ${request.requestType}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/tracking"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Kembali ke tracking
            </Link>
          </div>
        </div>

        {payload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{payload.error}</p>
          </div>
        ) : null}

        {!request ? (
          <div className="mt-6 rounded-3xl border border-line bg-surface px-5 py-4">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Request barang tidak ditemukan.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-3xl border border-line bg-surface p-5">
              <p className="section-title">Ringkasan Request</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Item</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {request.itemCode ?? `Item #${request.inventoryItemId}`} {request.itemName ? `• ${request.itemName}` : ''}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Qty</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestQty ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Status</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestStatus ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Type</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestType ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Subdivisi</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestedSubdivision ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Requested For</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestedFor ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Requested By</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestedBy ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Requested At</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.requestedAt ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Processed At</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{request.processedAt ?? '-'}</dd>
                </div>
              </dl>
              {request.requestNotes ? (
                <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Request Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{request.requestNotes}</p>
                </div>
              ) : null}
              {request.pendingReason ? (
                <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Pending Reason</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{request.pendingReason}</p>
                </div>
              ) : null}
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-line bg-surface p-5">
                <p className="section-title">Konteks Operasional</p>
                <div className="mt-4 space-y-3">
                  {payload.linkedWorkOrder ? (
                    <Link
                      href={`/dashboard/tracking/work-orders/${payload.linkedWorkOrder.id}`}
                      className="surface-soft block rounded-2xl border border-line px-4 py-3 transition hover:[border-color:var(--color-line-strong)]"
                    >
                      <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                        {payload.linkedWorkOrder.workOrderNo ?? `WO #${payload.linkedWorkOrder.id}`}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-mute">
                        {payload.linkedWorkOrder.jobCategory ?? payload.linkedWorkOrder.workType ?? 'WO'}{' '}
                        {payload.linkedWorkOrder.status ? `• ${payload.linkedWorkOrder.status}` : ''}
                      </p>
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Tidak ada work order yang tertaut ke request ini.
                    </div>
                  )}

                  {payload.linkedTroubleTicket ? (
                    <Link
                      href={`/dashboard/tracking/trouble-tickets/${payload.linkedTroubleTicket.id}`}
                      className="surface-soft block rounded-2xl border border-line px-4 py-3 transition hover:[border-color:var(--color-line-strong)]"
                    >
                      <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                        {payload.linkedTroubleTicket.ticketCode ?? `TT #${payload.linkedTroubleTicket.id}`}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-mute">
                        {payload.linkedTroubleTicket.customerName ?? '-'}{' '}
                        {payload.linkedTroubleTicket.status ? `• ${payload.linkedTroubleTicket.status}` : ''}
                      </p>
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Tidak ada trouble ticket yang tertaut ke request ini.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Movement Terkait</p>
                  <span className="solid-chip">{payload.movements.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {payload.movements.length ? (
                    payload.movements.map((row) => (
                      <Link
                        key={row.id}
                        href={`/dashboard/tracking/stock-movements/${row.id}`}
                        className="surface-soft block rounded-2xl border border-line px-4 py-3 transition hover:[border-color:var(--color-line-strong)]"
                      >
                        <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                          {row.itemCode ?? `Item #${row.itemId}`} • {row.movementType ?? '-'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-mute">
                          {row.qty ?? '-'} unit {row.referenceType ? `• ${row.referenceType}` : ''}{' '}
                          {row.movementAt ? `• ${row.movementAt}` : ''}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Belum ada movement inventory yang terhubung ke request ini.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

