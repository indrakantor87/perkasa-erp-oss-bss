import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDeviceLifecycleLogs, getInventoryDeviceLifecycleItemSuggestions, type DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { getWorkOrderTrackingDetail } from '@/lib/services/tracking-service'

type TimelineEntry = {
  id: string
  at: string | null
  type: 'work-order' | 'assignment' | 'status' | 'movement'
  title: string
  detail: string
  href?: string
}

function buildTimelineEntries(payload: Awaited<ReturnType<typeof getWorkOrderTrackingDetail>>) {
  const entries: TimelineEntry[] = []

  if (payload.workOrder) {
    entries.push({
      id: `wo-${payload.workOrder.id}`,
      at: payload.workOrder.createdAt,
      type: 'work-order',
      title: 'Work order dibuat',
      detail: `${payload.workOrder.workOrderNo ?? `WO #${payload.workOrder.id}`} • ${payload.workOrder.jobCategory ?? payload.workOrder.workType ?? 'WO'}`,
    })
  }

  for (const row of payload.assignments) {
    entries.push({
      id: `assignment-${row.id}`,
      at: row.assignedAt,
      type: 'assignment',
      title: `Assignment ${row.assignmentStatus ?? 'ASSIGNED'}`,
      detail: `${row.assignedFullName ?? row.assignedUsername ?? `User #${row.assignedUserId}`} • ${row.assignmentRole ?? 'TECHNICIAN'}${row.isPrimary ? ' • PIC utama' : ''}`,
    })
  }

  for (const row of payload.statusLogs) {
    entries.push({
      id: `status-${row.id}`,
      at: row.changedAt,
      type: 'status',
      title: `${row.fromStatus ?? 'DRAFT'} -> ${row.toStatus ?? '-'}`,
      detail: row.reasonNotes ?? row.reasonCode ?? 'Perubahan status',
    })
  }

  for (const row of payload.movements) {
    entries.push({
      id: `movement-${row.id}`,
      at: row.movementAt,
      type: 'movement',
      title: `${row.movementType ?? 'MOVEMENT'} ${row.itemCode ?? `Item #${row.itemId}`}`,
      detail: `${row.qty ?? '-'} unit${row.referenceType ? ` • ${row.referenceType}` : ''}${row.toLocationCode ? ` • ${row.toLocationCode}` : ''}`,
      href: `/dashboard/tracking/stock-movements/${row.id}`,
    })
  }

  return entries.sort((left, right) => {
    const leftTime = left.at ? new Date(left.at).getTime() : 0
    const rightTime = right.at ? new Date(right.at).getTime() : 0
    return rightTime - leftTime
  })
}

function getTimelineTone(type: TimelineEntry['type']) {
  switch (type) {
    case 'work-order':
      return 'bg-slate-900 text-white'
    case 'assignment':
      return 'bg-sky-600 text-white'
    case 'status':
      return 'bg-amber-500 text-slate-950'
    case 'movement':
      return 'bg-emerald-600 text-white'
    default:
      return 'bg-slate-200 text-slate-900'
  }
}

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
      return 'bg-amber-100 text-amber-800'
    case 'PENDING_NOC_VALIDATION':
      return 'bg-orange-100 text-orange-700'
    case 'INSTALLED':
      return 'bg-emerald-100 text-emerald-700'
    case 'DAMAGED':
      return 'bg-rose-100 text-rose-700'
    case 'REPLACE':
      return 'bg-violet-100 text-violet-700'
    case 'RETURNED':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default async function WorkOrderTrackingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const { id } = await params
  const workOrderId = Number.parseInt(id, 10)
  if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
    redirect('/dashboard/tracking/work-orders')
  }

  const [payload, lifecyclePayload, itemSuggestions] = await Promise.all([
    getWorkOrderTrackingDetail(workOrderId),
    getDeviceLifecycleLogs({ workOrderId, limit: 30 }),
    getInventoryDeviceLifecycleItemSuggestions(200),
  ])
  const wo = payload.workOrder
  const timelineEntries = buildTimelineEntries(payload)
  const canCreateDeviceLifecycle = canWriteDeviceLifecycle(session.role)
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Detail Work Order</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">
              {wo?.workOrderNo ?? `Work Order #${workOrderId}`}
            </h2>
            <p className="mt-3 text-sm leading-6 text-mute">
              Status: {wo?.status ?? '-'} • Kategori: {wo?.jobCategory ?? '-'} • Prioritas: {wo?.priority ?? '-'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/tracking/work-orders"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Kembali ke list
            </Link>
            <Link
              href={`/dashboard/tracking/stock-movements?workOrderId=${workOrderId}`}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              Lihat movement
            </Link>
            <Link
              href={`/inventory/requests?inventoryAction=item-request&workOrderId=${workOrderId}&requestType=WO_MATERIAL#inventory-action-item-request`}
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Buat request barang
            </Link>
            <Link
              href={`/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=WORK_ORDER&workOrderId=${workOrderId}#inventory-action-stock-movement`}
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Buat movement
            </Link>
            {wo?.troubleTicketId ? (
              <Link
                href={`/dashboard/tracking/trouble-tickets/${wo.troubleTicketId}`}
                className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
              >
                Buka TT #{wo.troubleTicketId}
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

        {!wo ? (
          <div className="mt-6 rounded-3xl border border-line bg-surface px-5 py-4">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Work order tidak ditemukan.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-3xl border border-line bg-surface p-5">
              <p className="section-title">Ringkasan</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Work Type</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{wo.workType ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Teknisi / Tim</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{wo.technicianName ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">PIC</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">
                    {wo.picFullName ?? wo.picUsername ?? (wo.picUserId ? `User #${wo.picUserId}` : '-')}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Scheduled</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{wo.scheduledAt ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">SO</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{wo.salesOrderId ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">TT</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{wo.troubleTicketId ?? '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-mute">Subscription</dt>
                  <dd className="font-semibold text-[var(--color-ink-strong)]">{wo.subscriptionId ?? '-'}</dd>
                </div>
              </dl>
              {wo.notes ? (
                <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{wo.notes}</p>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Jejak Cepat</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-mute">Status Log</span>
                    <span className="font-semibold text-[var(--color-ink-strong)]">{payload.statusLogs.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-mute">Assignment</span>
                    <span className="font-semibold text-[var(--color-ink-strong)]">{payload.assignments.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-mute">Movement</span>
                    <span className="font-semibold text-[var(--color-ink-strong)]">{payload.movements.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-mute">Lifecycle Device</span>
                    <span className="font-semibold text-[var(--color-ink-strong)]">{lifecyclePayload.items.length}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-line bg-surface p-4">
                <DeviceLifecycleActionForm
                  canCreate={canCreateDeviceLifecycle}
                  reviewDbReady={reviewDbReady}
                  itemSuggestions={itemSuggestions}
                  workOrderId={workOrderId}
                  troubleTicketId={wo.troubleTicketId}
                  defaultLifecycleStatus={wo.jobCategory === 'PSB' ? 'TEAM_PSB' : 'NOC'}
                  defaultTargetTeam={wo.jobCategory === 'PSB' ? 'Team Teknisi PSB' : ''}
                  embedded
                  title="Scan lifecycle device"
                  description="Gunakan form ini untuk mencatat scan barcode ONT/modem pada alur NOC, delegasi ke teknisi, replace, sampai validasi akhir."
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Timeline Tracking</p>
                  <span className="solid-chip">{timelineEntries.length}</span>
                </div>
                <div className="mt-5 space-y-4">
                  {timelineEntries.length ? (
                    timelineEntries.map((entry, index) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex w-16 flex-col items-center">
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${getTimelineTone(entry.type)}`}>
                            {entry.type === 'work-order' ? 'WO' : entry.type === 'assignment' ? 'PIC' : entry.type === 'status' ? 'STS' : 'MOV'}
                          </span>
                          {index < timelineEntries.length - 1 ? <span className="mt-2 h-full w-px bg-[var(--color-line)]" /> : null}
                        </div>
                        <div className="flex-1 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{entry.title}</p>
                              <p className="mt-1 text-sm leading-6 text-mute">{entry.detail}</p>
                            </div>
                            <div className="text-xs uppercase tracking-[0.2em] text-mute">{entry.at ?? '-'}</div>
                          </div>
                          {entry.href ? (
                            <div className="mt-3">
                              <Link
                                href={entry.href}
                                className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90"
                              >
                                Buka detail movement
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Belum ada event timeline yang bisa ditampilkan untuk work order ini.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Assignment Log</p>
                  <span className="solid-chip">{payload.assignments.length}</span>
                </div>
                <div className="mt-4 overflow-hidden rounded-3xl border border-line">
                  <table className="min-w-full divide-y divide-line">
                    <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                        <th className="px-4 py-3">Teknisi/User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Primary</th>
                        <th className="px-4 py-3">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {payload.assignments.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-4 align-top text-sm font-semibold text-[var(--color-ink-strong)]">
                            {row.assignedFullName ?? row.assignedUsername ?? `User #${row.assignedUserId}`}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.assignmentRole ?? '-'}</td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.assignmentStatus ?? '-'}</td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.isPrimary ? 'YES' : '-'}</td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.assignedAt ?? '-'}</td>
                        </tr>
                      ))}
                      {!payload.assignments.length ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-mute" colSpan={5}>
                            Belum ada assignment log.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Status Log</p>
                  <span className="solid-chip">{payload.statusLogs.length}</span>
                </div>
                <div className="mt-4 overflow-hidden rounded-3xl border border-line">
                  <table className="min-w-full divide-y divide-line">
                    <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                        <th className="px-4 py-3">From</th>
                        <th className="px-4 py-3">To</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Changed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {payload.statusLogs.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.fromStatus ?? '-'}</td>
                          <td className="px-4 py-4 align-top text-sm font-semibold text-[var(--color-ink-strong)]">{row.toStatus ?? '-'}</td>
                          <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                            <p className="font-semibold text-[var(--color-ink-strong)]">{row.reasonCode ?? '-'}</p>
                            <p className="mt-1">{row.reasonNotes ?? ''}</p>
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.changedAt ?? '-'}</td>
                        </tr>
                      ))}
                      {!payload.statusLogs.length ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-mute" colSpan={4}>
                            Belum ada status log.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Movement Terkait</p>
                  <span className="solid-chip">{payload.movements.length}</span>
                </div>
                <div className="mt-4 overflow-hidden rounded-3xl border border-line">
                  <table className="min-w-full divide-y divide-line">
                    <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Lokasi</th>
                        <th className="px-4 py-3">Teknisi</th>
                        <th className="px-4 py-3">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {payload.movements.map((row) => (
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
                            <p>
                              {row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}
                              {row.toLocationCode ? `${row.toLocationCode}` : '-'}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                            {row.technicianFullName ?? row.technicianUsername ?? (row.technicianUserId ? `User #${row.technicianUserId}` : '-')}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.movementAt ?? '-'}</td>
                        </tr>
                      ))}
                      {!payload.movements.length ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-mute" colSpan={6}>
                            Belum ada movement yang terhubung ke work order ini.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Lifecycle Device</p>
                  <span className="solid-chip">{lifecyclePayload.items.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {lifecyclePayload.items.length ? (
                    lifecyclePayload.items.map((row: DeviceLifecycleLogRow) => (
                      <div
                        key={row.id}
                        className="surface-soft rounded-2xl border border-line px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                              {row.itemCode ?? `Item #${row.inventoryItemId}`} {row.itemName ? `• ${row.itemName}` : ''}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-mute">
                              {row.eventType ?? '-'} {row.targetTeam ? `• ${row.targetTeam}` : ''} {row.scanSource ? `• ${row.scanSource}` : ''}
                            </p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getLifecycleTone(row.lifecycleStatus)}`}>
                            {row.lifecycleStatus ?? '-'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-mute">
                          {row.actorName ?? row.actorRole ?? '-'} {row.createdAt ? `• ${row.createdAt}` : ''}
                        </p>
                        {row.notes ? <p className="mt-2 text-sm leading-6 text-[var(--color-ink-strong)]">{row.notes}</p> : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Belum ada log lifecycle device untuk work order ini.
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
