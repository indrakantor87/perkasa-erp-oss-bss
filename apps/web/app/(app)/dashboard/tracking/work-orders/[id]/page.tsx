import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AssignmentAcceptButton } from '@/components/assignment-accept-button'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { buildInventoryBarcodeDetailPath } from '@/lib/inventory-barcode-utils'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getDeviceLifecycleLogs, getInventoryDeviceLifecycleItemSuggestions, type DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { getWorkOrderTrackingDetail, type WorkOrderAssignmentRow } from '@/lib/services/tracking-service'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import type { DataSourceSnapshot } from '@/lib/types'

type TimelineEntry = {
  id: string
  at: string | null
  type: 'work-order' | 'assignment' | 'status' | 'movement'
  title: string
  detail: string
  href?: string
}

type ReviewDbWorkOrderDismantleHistoryRow = {
  historyId: number
  customerName: string | null
  serviceNo: string | null
  closedAt: string | null
  closeNote: string | null
  returnedItemCodes: string | null
}

function parseReturnedItemCodes(value: string | null | undefined) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\r\n,;]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

async function getDismantleHistoryRowsForWorkOrder(itemCodes: string[], source: DataSourceSnapshot) {
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as ReviewDbWorkOrderDismantleHistoryRow[]
  }

  const normalizedItemCodes = Array.from(new Set(itemCodes.map((item) => item.trim().toUpperCase()).filter(Boolean)))
  if (!normalizedItemCodes.length) {
    return [] as ReviewDbWorkOrderDismantleHistoryRow[]
  }

  const [
    hasHistoryId,
    hasCloseNote,
    hasReturnedItemCodes,
    hasClosedAt,
    hasHistoryCustomerName,
    hasIsolationId,
    hasIsolationCustomerName,
    hasIsolationSubscriptionId,
    hasServiceSubscriptionId,
    hasServiceSubscriptionNo,
  ] = await Promise.all([
    hasReviewDbColumn('support_dismantle_history', 'id'),
    hasReviewDbColumn('support_dismantle_history', 'close_note'),
    hasReviewDbColumn('support_dismantle_history', 'returned_item_codes'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
    hasReviewDbColumn('support_dismantle_history', 'customer_name'),
    hasReviewDbColumn('support_dismantle_history', 'isolation_id'),
    hasReviewDbColumn('support_isolations', 'customer_name'),
    hasReviewDbColumn('support_isolations', 'subscription_id'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
  ])

  if (!hasHistoryId || (!hasCloseNote && !hasReturnedItemCodes)) {
    return [] as ReviewDbWorkOrderDismantleHistoryRow[]
  }

  const whereClauses = normalizedItemCodes.map(() =>
    hasReturnedItemCodes && hasCloseNote
      ? '(dh.returned_item_codes LIKE ? OR dh.close_note LIKE ?)'
      : hasReturnedItemCodes
        ? 'dh.returned_item_codes LIKE ?'
        : 'dh.close_note LIKE ?',
  )
  const values = normalizedItemCodes.flatMap((itemCode) =>
    hasReturnedItemCodes && hasCloseNote ? [`%${itemCode}%`, `%${itemCode}%`] : [`%${itemCode}%`],
  )

  const rows = await runReviewDbQuery<ReviewDbWorkOrderDismantleHistoryRow>(
    `
      SELECT
        dh.id AS historyId,
        ${
          hasHistoryCustomerName
            ? 'dh.customer_name'
            : hasIsolationId && hasIsolationCustomerName
              ? 'si.customer_name'
              : "CONCAT('Histori Dismantle #', dh.id)"
        } AS customerName,
        ${
          hasIsolationId && hasIsolationSubscriptionId && hasServiceSubscriptionId && hasServiceSubscriptionNo
            ? 'ss.service_no'
            : 'NULL'
        } AS serviceNo,
        ${hasClosedAt ? 'dh.closed_at' : 'NULL'} AS closedAt,
        ${hasCloseNote ? 'dh.close_note' : 'NULL'} AS closeNote,
        ${hasReturnedItemCodes ? 'dh.returned_item_codes' : 'NULL'} AS returnedItemCodes
      FROM support_dismantle_history dh
      ${hasIsolationId ? 'LEFT JOIN support_isolations si ON si.id = dh.isolation_id' : ''}
      ${
        hasIsolationId && hasIsolationSubscriptionId && hasServiceSubscriptionId
          ? 'LEFT JOIN service_subscriptions ss ON ss.id = si.subscription_id'
          : ''
      }
      WHERE ${whereClauses.join(' OR ')}
      ORDER BY ${hasClosedAt ? 'dh.closed_at' : 'dh.id'} DESC, dh.id DESC
      LIMIT 10
    `,
    values,
  )

  return rows.filter((row) => {
    const explicitCodes = parseReturnedItemCodes(row.returnedItemCodes)
    if (explicitCodes.length) {
      return explicitCodes.some((itemCode) => normalizedItemCodes.includes(itemCode))
    }

    const note = row.closeNote?.toUpperCase() ?? ''
    return normalizedItemCodes.some((itemCode) => note.includes(itemCode))
  })
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
    const statusCanon = String(row.assignmentStatus ?? '').trim().toUpperCase()
    let timelineAt: string | null = row.assignedAt
    let acceptedByLabel = ''
    if (statusCanon === 'RELEASED') {
      timelineAt = row.releasedAt
    } else if (statusCanon === 'ACCEPTED') {
      timelineAt = row.acceptedAt
      if (row.acceptedByFullName || row.acceptedByUsername) {
        acceptedByLabel = ` • Diterima oleh: ${row.acceptedByFullName ?? row.acceptedByUsername ?? `User #${row.acceptedByUserId}`}`
      }
    } else {
      timelineAt = row.assignedAt
    }
    entries.push({
      id: `assignment-${row.id}`,
      at: timelineAt,
      type: 'assignment',
      title: `Assignment ${row.assignmentStatus ?? 'ASSIGNED'}`,
      detail: `${row.assignedFullName ?? row.assignedUsername ?? `User #${row.assignedUserId}`} • ${row.assignmentRole ?? 'TECHNICIAN'}${row.isPrimary ? ' • PIC utama' : ''}${acceptedByLabel}`,
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

function canAcceptAssignment(
  session: Awaited<ReturnType<typeof requireSession>>,
  row: WorkOrderAssignmentRow,
): boolean {
  return (
    session.role === 'FIELD_TECHNICIAN' &&
    Number(session.userId) === Number(row.assignedUserId) &&
    String(row.assignmentStatus ?? '').toUpperCase() === 'ASSIGNED' &&
    row.releasedAt == null
  )
}

type AssignmentStatusBadgeInfo = { tone: string; label: string }

function getAssignmentStatusBadge(statusRaw: string | null): AssignmentStatusBadgeInfo {
  const status = String(statusRaw ?? '').trim().toUpperCase()
  switch (status) {
    case 'ACCEPTED':
      return { tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Diterima (ACCEPTED)' }
    case 'RELEASED':
      return { tone: 'border-slate-200 bg-slate-100 text-slate-600', label: 'Dilepaskan (RELEASED)' }
    case 'ASSIGNED':
      return { tone: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Menunggu diterima (ASSIGNED)' }
    default:
      return {
        tone: 'border-slate-200 bg-white text-slate-600',
        label: statusRaw ? String(statusRaw) : '-',
      }
  }
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
    getWorkOrderTrackingDetail(workOrderId, { session }),
    getDeviceLifecycleLogs({ workOrderId, limit: 30 }),
    getInventoryDeviceLifecycleItemSuggestions(200),
  ])
  const lifecycleItemCodes = Array.from(
    new Set(
      lifecyclePayload.items
        .map((item) => String(item.itemCode ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  )
  const dismantleHistoryRows = await getDismantleHistoryRowsForWorkOrder(lifecycleItemCodes, payload.source)
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
            {dismantleHistoryRows[0] ? (
              <Link
                href={buildSupportLaneHref('dismantle', {
                  focus: 'CLOSED_THIS_PERIOD',
                  customer: dismantleHistoryRows[0].customerName || '',
                  service: dismantleHistoryRows[0].serviceNo || '',
                  dismantleHistory: `${dismantleHistoryRows[0].historyId} | ${dismantleHistoryRows[0].customerName || ''} | ${dismantleHistoryRows[0].serviceNo || ''}`,
                })}
                className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
              >
                Buka Histori Dismantle
              </Link>
            ) : null}
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
                  <p className="section-title">Histori Support Dismantle</p>
                  <span className="solid-chip">{dismantleHistoryRows.length}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-mute">
                  Backlink ke histori close support yang memakai item return dari work order ini, agar operator bisa lompat
                  balik ke konteks terminate yang sama.
                </p>
                <div className="mt-4 space-y-3">
                  {dismantleHistoryRows.length ? (
                    dismantleHistoryRows.map((row) => {
                      const returnedItemCodes = parseReturnedItemCodes(row.returnedItemCodes)
                      return (
                        <div key={row.historyId} className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                                {row.customerName || `Histori Dismantle #${row.historyId}`} {row.serviceNo ? `• ${row.serviceNo}` : ''}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-mute">
                                {row.closeNote?.split('\n').find((line) => line.trim())?.trim() ||
                                  'Kasus dismantle close yang terhubung ke item return pada work order ini.'}
                              </p>
                            </div>
                            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                              {row.closedAt || 'Closed'}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="badge border-slate-200 bg-white text-slate-600">History ID: {row.historyId}</span>
                            <span className="badge border-slate-200 bg-white text-slate-600">Service: {row.serviceNo || '-'}</span>
                            <span className="badge border-slate-200 bg-white text-slate-600">
                              Returned: {returnedItemCodes.length ? returnedItemCodes.join(', ') : lifecycleItemCodes.join(', ') || '-'}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={buildSupportLaneHref('dismantle', {
                                focus: 'CLOSED_THIS_PERIOD',
                                customer: row.customerName || '',
                                service: row.serviceNo || '',
                                dismantleHistory: `${row.historyId} | ${row.customerName || ''} | ${row.serviceNo || ''}`,
                              })}
                              className="inline-flex rounded-full border border-slate-950 bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              Buka Histori Support
                            </Link>
                            {returnedItemCodes.slice(0, 2).map((itemCode) => (
                              <Link
                                key={`${row.historyId}-${itemCode}`}
                                href={buildInventoryBarcodeDetailPath(itemCode)}
                                className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                              >
                                Buka Barcode {itemCode}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                      Belum ada histori close dismantle yang memakai item return dari work order ini.
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
                        <th className="px-4 py-3">Acceptance</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {payload.assignments.map((row) => {
                        const statusBadge = getAssignmentStatusBadge(row.assignmentStatus)
                        const acceptanceInfo = (() => {
                          const canon = String(row.assignmentStatus ?? '').trim().toUpperCase()
                          if (canon === 'ACCEPTED') {
                            const byName =
                              row.acceptedByFullName ??
                              row.acceptedByUsername ??
                              (row.acceptedByUserId ? `User #${row.acceptedByUserId}` : null)
                            return [
                              `Diterima: ${row.acceptedAt ?? '-'}`,
                              byName ? `Oleh: ${byName}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          }
                          if (canon === 'RELEASED') {
                            return `Dilepaskan: ${row.releasedAt ?? '-'}`
                          }
                          return null
                        })()
                        return (
                          <tr key={row.id}>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-[var(--color-ink-strong)]">
                              {row.assignedFullName ?? row.assignedUsername ?? `User #${row.assignedUserId}`}
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                              {row.assignmentRole ?? '-'}
                            </td>
                            <td className="px-4 py-4 align-top text-sm">
                              <span className={`badge border ${statusBadge.tone}`}>{statusBadge.label}</span>
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                              {row.isPrimary ? 'YES' : '-'}
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                              {row.assignedAt ?? '-'}
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">
                              {acceptanceInfo ?? '-'}
                            </td>
                            <td className="px-4 py-4 align-top text-sm">
                              <AssignmentAcceptButton
                                assignmentId={row.id}
                                canAccept={canAcceptAssignment(session, row)}
                                reviewDbReady={reviewDbReady}
                              />
                            </td>
                          </tr>
                        )
                      })}
                      {!payload.assignments.length ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-mute" colSpan={7}>
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
                              {row.itemCode ? (
                                <Link
                                  href={buildInventoryBarcodeDetailPath(row.itemCode)}
                                  className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                                >
                                  Buka Barcode
                                </Link>
                              ) : null}
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
