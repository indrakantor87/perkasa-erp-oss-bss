import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getTroubleTicketTrackingDetail } from '@/lib/services/tracking-service'

export default async function TroubleTicketTrackingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const { id } = await params
  const troubleTicketId = Number.parseInt(id, 10)
  if (!Number.isInteger(troubleTicketId) || troubleTicketId <= 0) {
    redirect('/dashboard/tracking')
  }

  const payload = await getTroubleTicketTrackingDetail(troubleTicketId)
  const tt = payload.troubleTicket

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Detail Trouble Ticket</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">
              {tt?.ticketCode ?? `TT #${troubleTicketId}`}
            </h2>
            <p className="mt-3 text-sm leading-6 text-mute">
              {tt?.customerName ?? '-'} {tt?.type ? `• ${tt.type}` : ''} {tt?.status ? `• ${tt.status}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/tracking"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Kembali ke tracking
            </Link>
            <Link
              href={`/inventory/requests?inventoryAction=item-request&troubleTicketId=${troubleTicketId}&requestType=TROUBLE_SUPPORT#inventory-action-item-request`}
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Buat request barang
            </Link>
            <Link
              href={`/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=TROUBLE_TICKET&troubleTicketId=${troubleTicketId}#inventory-action-stock-movement`}
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Buat movement
            </Link>
          </div>
        </div>

        {payload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{payload.error}</p>
          </div>
        ) : null}

        {!tt ? (
          <div className="mt-6 rounded-3xl border border-line bg-surface px-5 py-4">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Trouble ticket tidak ditemukan.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-3xl border border-line bg-surface p-5">
              <p className="section-title">Ringkasan Ticket</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Customer</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.customerName ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Service Ref</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.customerUser ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Kategori</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.category ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Type</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.type ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Status</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.status ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Problem</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.problemCategory ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Opened</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.openedAt ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Closed</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{tt.closedAt ?? '-'}</dd>
                </div>
              </dl>
              {tt.notes ? (
                <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{tt.notes}</p>
                </div>
              ) : null}
              {tt.closeNotes ? (
                <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Close Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{tt.closeNotes}</p>
                </div>
              ) : null}
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Work Order Terkait</p>
                  <span className="solid-chip">{payload.workOrders.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {payload.workOrders.length ? (
                    payload.workOrders.map((row) => (
                      <Link
                        key={row.id}
                        href={`/dashboard/tracking/work-orders/${row.id}`}
                        className="surface-soft block rounded-2xl border border-line px-4 py-3 transition hover:[border-color:var(--color-line-strong)]"
                      >
                        <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                          {row.workOrderNo ?? `WO #${row.id}`}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-mute">
                          {row.jobCategory ?? row.workType ?? 'WO'} {row.status ? `• ${row.status}` : ''}{' '}
                          {row.priority ? `• ${row.priority}` : ''}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Belum ada work order lapangan yang terhubung ke ticket ini.
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
                      Belum ada movement inventory yang terhubung ke ticket ini.
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
