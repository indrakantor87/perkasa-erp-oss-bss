import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDeviceLifecycleLogs, getInventoryDeviceLifecycleItemSuggestions, type DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { getTroubleTicketTrackingDetail } from '@/lib/services/tracking-service'

function canWriteDeviceLifecycle(role: Awaited<ReturnType<typeof requireSession>>['role']) {
  return (
    role === 'FIELD_TECHNICIAN' ||
    canPerformAction(role, 'inventory', 'update') ||
    canPerformAction(role, 'inventory', 'create') ||
    canPerformAction(role, 'support', 'update')
  )
}

function getLifecycleTone(status: string | null) {
  switch (status) {
    case 'INVENTORY':
      return 'bg-slate-100 text-slate-700'
    case 'NOC':
      return 'bg-sky-100 text-sky-700'
    case 'TEAM_PSB':
    case 'TEAM_TROUBLESHOOTS':
    case 'TEAM_JALUR':
    case 'TEAM_DISMANTLE':
      return 'bg-amber-100 text-amber-800'
    case 'PENDING_NOC_VALIDATION':
      return 'bg-orange-100 text-orange-700'
    case 'INSTALLED':
      return 'bg-emerald-100 text-emerald-700'
    case 'DAMAGED':
      return 'bg-rose-100 text-rose-700'
    case 'REPLACE':
    case 'REPLACE_OLD':
    case 'REPLACE_NEW':
      return 'bg-violet-100 text-violet-700'
    case 'RETURNED':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getValidationTone(status: string | null) {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-700'
    case 'PENDING':
      return 'bg-amber-100 text-amber-800'
    case 'REJECTED':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

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

  const [payload, lifecyclePayload, itemSuggestions] = await Promise.all([
    getTroubleTicketTrackingDetail(troubleTicketId),
    getDeviceLifecycleLogs({ troubleTicketId, limit: 30 }),
    getInventoryDeviceLifecycleItemSuggestions(200),
  ])
  const tt = payload.troubleTicket
  const canCreateDeviceLifecycle = canWriteDeviceLifecycle(session.role)
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback

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

              <div className="mt-5 rounded-3xl border border-line bg-surface p-4">
                <DeviceLifecycleActionForm
                  canCreate={canCreateDeviceLifecycle}
                  reviewDbReady={reviewDbReady}
                  itemSuggestions={itemSuggestions}
                  troubleTicketId={troubleTicketId}
                  defaultLifecycleStatus="TEAM_TROUBLESHOOTS"
                  defaultTargetTeam="Team Troubleshoots"
                  embedded
                  title="Scan lifecycle device"
                  description="Catat scan barcode modem/ONT saat NOC cek barang, delegasi ke teknisi troubleshoots, replace unit lama, hingga validasi akhir oleh NOC."
                />
              </div>
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

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Lifecycle Device</p>
                  <span className="solid-chip">{lifecyclePayload.items.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {lifecyclePayload.items.length ? (
                    lifecyclePayload.items.map((row: DeviceLifecycleLogRow, index) => (
                      <div key={row.id} className="flex gap-4">
                        <div className="flex w-16 flex-col items-center">
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${getLifecycleTone(row.lifecycleStatus)}`}>
                            DEV
                          </span>
                          {index < lifecyclePayload.items.length - 1 ? <span className="mt-2 h-full w-px bg-[var(--color-line)]" /> : null}
                        </div>
                        <div className="surface-soft flex-1 rounded-2xl border border-line px-4 py-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                                {row.itemCode ?? `Item #${row.inventoryItemId}`} {row.itemName ? `• ${row.itemName}` : ''}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-mute">
                                {row.eventType ?? '-'} {row.scanSource ? `• ${row.scanSource}` : ''} {row.ticketRef ? `• ${row.ticketRef}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {row.fromStatus ? (
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getLifecycleTone(row.fromStatus)}`}>
                                  {row.fromStatus}
                                </span>
                              ) : null}
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getLifecycleTone(row.lifecycleStatus)}`}>
                                {row.lifecycleStatus ?? '-'}
                              </span>
                              {row.validationStatus && row.validationStatus !== 'NOT_REQUIRED' ? (
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getValidationTone(row.validationStatus)}`}>
                                  {row.validationStatus}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-mute lg:grid-cols-2">
                            <p>
                              Actor: <span className="font-semibold text-[var(--color-ink-strong)]">{row.actorName ?? row.actorRole ?? '-'}</span>
                            </p>
                            <p>
                              Waktu: <span className="font-semibold text-[var(--color-ink-strong)]">{row.createdAt ?? '-'}</span>
                            </p>
                            <p>
                              Tim: <span className="font-semibold text-[var(--color-ink-strong)]">{row.targetTeam ?? '-'}</span>
                            </p>
                            <p>
                              Lokasi: <span className="font-semibold text-[var(--color-ink-strong)]">{row.locationName ?? row.locationCode ?? '-'}</span>
                            </p>
                            <p className="lg:col-span-2">
                              Handover: <span className="font-semibold text-[var(--color-ink-strong)]">{row.handoverFromLabel || row.handoverToLabel ? `${row.handoverFromLabel ?? '-'} -> ${row.handoverToLabel ?? '-'}` : '-'}</span>
                            </p>
                            <p>
                              Jenis Proof: <span className="font-semibold text-[var(--color-ink-strong)]">{row.handoverProofType ?? '-'}</span>
                            </p>
                            <p>
                              Ref Proof: <span className="font-semibold text-[var(--color-ink-strong)]">{row.handoverProofRef ?? '-'}</span>
                            </p>
                            <p className="lg:col-span-2">
                              Pasangan Replace:{' '}
                              <span className="font-semibold text-[var(--color-ink-strong)]">
                                {row.relatedItemCode || row.relatedItemName
                                  ? [row.relatedItemCode, row.relatedItemName].filter(Boolean).join(' | ')
                                  : '-'}
                              </span>
                            </p>
                          </div>
                          {row.notes ? <p className="mt-3 text-sm leading-6 text-[var(--color-ink-strong)]">{row.notes}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Belum ada log lifecycle device untuk trouble ticket ini.
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
