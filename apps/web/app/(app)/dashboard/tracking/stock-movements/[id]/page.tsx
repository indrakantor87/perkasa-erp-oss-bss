import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getStockMovementTrackingDetail } from '@/lib/services/tracking-service'

export default async function StockMovementTrackingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const { id } = await params
  const movementId = Number.parseInt(id, 10)
  if (!Number.isInteger(movementId) || movementId <= 0) {
    redirect('/dashboard/tracking/stock-movements')
  }

  const payload = await getStockMovementTrackingDetail(movementId)
  const m = payload.movement

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Detail Movement</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Movement #{movementId}</h2>
            <p className="mt-3 text-sm leading-6 text-mute">
              {m?.itemCode ?? '-'} • {m?.movementType ?? '-'} {m?.referenceType ? `• ${m.referenceType}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/tracking/stock-movements"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Kembali ke list
            </Link>
            {m?.workOrderId ? (
              <Link
                href={`/dashboard/tracking/work-orders/${m.workOrderId}`}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
              >
                Buka WO #{m.workOrderId}
              </Link>
            ) : null}
            {m?.troubleTicketId ? (
              <Link
                href={`/dashboard/tracking/trouble-tickets/${m.troubleTicketId}`}
                className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
              >
                Buka TT #{m.troubleTicketId}
              </Link>
            ) : null}
            {m?.requestId ? (
              <Link
                href={`/dashboard/tracking/inventory-requests/${m.requestId}`}
                className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
              >
                Buka Request #{m.requestId}
              </Link>
            ) : null}
          </div>
        </div>

        {payload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{payload.error}</p>
          </div>
        ) : null}

        {!m ? (
          <div className="mt-6 rounded-3xl border border-line bg-surface px-5 py-4">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Movement tidak ditemukan.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-line bg-surface p-5">
              <p className="section-title">Item</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink-strong)]">{m.itemCode ?? `Item #${m.itemId}`}</p>
              <p className="mt-2 text-sm leading-6 text-mute">{m.itemName ?? ''}</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Qty</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{m.qty ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Unit Price</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{m.unitPrice ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Status</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{m.movementStatus ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Waktu</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{m.movementAt ?? '-'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-line bg-surface p-5">
              <p className="section-title">Konteks</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Work Order</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {m.workOrderId ? (
                      <Link href={`/dashboard/tracking/work-orders/${m.workOrderId}`} className="hover:opacity-80">
                        WO #{m.workOrderId}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Trouble Ticket</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {m.troubleTicketId ? (
                      <Link href={`/dashboard/tracking/trouble-tickets/${m.troubleTicketId}`} className="hover:opacity-80">
                        TT #{m.troubleTicketId}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Request</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {m.requestId ? (
                      <Link href={`/dashboard/tracking/inventory-requests/${m.requestId}`} className="hover:opacity-80">
                        REQ #{m.requestId}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Teknisi</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {m.technicianFullName ?? m.technicianUsername ?? (m.technicianUserId ? `User #${m.technicianUserId}` : '-')}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">From</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {m.fromLocationCode ? `${m.fromLocationCode} - ${m.fromLocationName ?? ''}` : m.fromLocationId ?? '-'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">To</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {m.toLocationCode ? `${m.toLocationCode} - ${m.toLocationName ?? ''}` : m.toLocationId ?? '-'}
                  </dd>
                </div>
              </dl>
              {m.notes ? (
                <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{m.notes}</p>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </div>
  )
}
