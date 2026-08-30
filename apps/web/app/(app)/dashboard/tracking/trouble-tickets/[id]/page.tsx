import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CurrentHandlerCard } from '@/components/current-handler-card'
import { AssignmentHistoryTable } from '@/components/assignment-history-table'
import { ReassignAssignmentModal, type TechnicianOption } from '@/components/reassign-assignment-modal'
import { CreateTTAssignmentModal } from '@/components/create-tt-assignment-modal'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { buildInventoryBarcodeDetailPath } from '@/lib/inventory-barcode-utils'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getAuthUsersPageData, type AuthUserListItem } from '@/lib/services/auth-user-service'
import { getDeviceLifecycleLogs, getInventoryDeviceLifecycleItemSuggestions, type DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { getTroubleTicketTrackingDetail } from '@/lib/services/tracking-service'
import { buildTimelineEntries, getTimelineTone, formatDateLocale } from '@/lib/timeline-utils'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import type { DataSourceSnapshot } from '@/lib/types'

type ReviewDbTroubleTicketDismantleHistoryRow = {
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

async function getDismantleHistoryRowsForTroubleTicket(itemCodes: string[], source: DataSourceSnapshot) {
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as ReviewDbTroubleTicketDismantleHistoryRow[]
  }

  const normalizedItemCodes = Array.from(new Set(itemCodes.map((item) => item.trim().toUpperCase()).filter(Boolean)))
  if (!normalizedItemCodes.length) {
    return [] as ReviewDbTroubleTicketDismantleHistoryRow[]
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
    return [] as ReviewDbTroubleTicketDismantleHistoryRow[]
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

  const rows = await runReviewDbQuery<ReviewDbTroubleTicketDismantleHistoryRow>(
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

  const [payload, lifecyclePayload, itemSuggestions, authUsersRaw] = await Promise.all([
    getTroubleTicketTrackingDetail(troubleTicketId),
    getDeviceLifecycleLogs({ troubleTicketId, limit: 30 }),
    getInventoryDeviceLifecycleItemSuggestions(200),
    getAuthUsersPageData()
      .then((data) => (Array.isArray(data?.users) ? data.users : []))
      .catch(() => [] as AuthUserListItem[]),
  ])
  const tt = payload.troubleTicket
  const lifecycleItemCodes = Array.from(
    new Set(
      lifecyclePayload.items
        .map((item) => String(item.itemCode ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  )
  const dismantleHistoryRows = await getDismantleHistoryRowsForTroubleTicket(lifecycleItemCodes, payload.source)
  const canCreateDeviceLifecycle = canWriteDeviceLifecycle(session.role)
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback

  const P58A_FULL_ACCESS = new Set(['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'])
  const roleCodeUp = String(session.role ?? '').trim().toUpperCase()
  const canCreateAssignment =
    tt && tt.closedAt
      ? false
      : P58A_FULL_ACCESS.has(roleCodeUp) || canPerformAction(session.role, 'support', 'update')

  const hasActivePrimaryAssignment =
    Array.isArray(payload.assignments) &&
    payload.assignments.some((a) => Boolean(a.isPrimary) && !a.releasedAt && (a.status === 'ASSIGNED' || a.status === 'ACCEPTED'))
  const defaultPrimary = !hasActivePrimaryAssignment
  const timelineEntries = buildTimelineEntries({
    troubleTicket: tt ? { id: tt.id, ticketCode: tt.ticketCode, category: tt.category, type: tt.type, createdAt: tt.createdAt, status: tt.status } : null,
    assignments: payload.assignments ?? [],
    progressLogs: payload.progressLogs ?? [],
    movements: payload.movements ?? [],
  })

  const technicianOptions: TechnicianOption[] = (authUsersRaw ?? [])
    .filter((u) => {
      const status = String(u.status ?? '').trim().toUpperCase()
      const roleCode = String(u.roleCode ?? '').trim().toUpperCase()
      return status === 'ACTIVE' && (roleCode === 'TEKNISI' || roleCode === 'TEKNISI_PSB' || roleCode === 'FIELD_TECHNICIAN')
    })
    .map((u) => ({
      id: Number(u.id),
      label: `${u.fullName ?? u.username ?? `User #${u.id}`} (${u.username ?? `#${u.id}`}${u.roleCode ? ` • ${u.roleCode}` : ''})`,
      username: String(u.username ?? `user-${u.id}`),
      roleCode: String(u.roleCode ?? ''),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const TT_ENDPOINT_BASE = '/api/support/trouble-tickets/assignments'

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
            <div className="space-y-6">
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

              <CurrentHandlerCard
                currentHandler={payload.currentHandler ?? null}
                nextActionLabel={payload.nextAction?.label}
                nextActionTone={payload.nextAction?.tone}
                reviewDbReady={reviewDbReady}
                endpointBasePath={TT_ENDPOINT_BASE}
              >
                {!payload.currentHandler && tt?.ticketCode ? (
                  <CreateTTAssignmentModal
                    ticketCode={tt.ticketCode}
                    technicians={technicianOptions}
                    canCreateAssignment={canCreateAssignment}
                    reviewDbReady={reviewDbReady}
                    defaultPrimary={defaultPrimary}
                  />
                ) : null}
              </CurrentHandlerCard>

              <AssignmentHistoryTable
                assignments={payload.assignments ?? []}
                reviewDbReady={reviewDbReady}
                endpointBasePath={TT_ENDPOINT_BASE}
                sessionRole={session.role as string}
                sessionUserId={session.userId ? Number(session.userId) : null}
                technicianOptions={technicianOptions}
              />

              <div className="rounded-3xl border border-line bg-surface p-4">
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

              {payload.progressLogs && payload.progressLogs.length > 0 ? (
                <section className="rounded-3xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="section-title">Log Progress Ticket</p>
                    <span className="solid-chip">{payload.progressLogs.length}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {payload.progressLogs.map((row) => (
                      <div key={row.id} className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                            {row.progressStatus}
                          </span>
                          {row.ownerName ? (
                            <span className="text-xs text-slate-500">PIC: {row.ownerName}</span>
                          ) : null}
                          <span className="text-xs text-slate-400">{formatDateLocale(row.createdAt)}</span>
                        </div>
                        {row.progressNotes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-strong)]">{row.progressNotes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <section className="space-y-6">
              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="section-title">Timeline</p>
                  <span className="solid-chip">{timelineEntries.length}</span>
                </div>
                <div className="mt-4 space-y-4">
                  {timelineEntries.length ? (
                    timelineEntries.map((entry, index) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex w-16 flex-col items-center">
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${getTimelineTone(entry.type)}`}>
                            {entry.type === 'trouble-ticket' ? 'TT' : entry.type === 'assignment' ? 'ASM' : entry.type === 'status' ? 'STS' : entry.type === 'close' ? 'CLS' : entry.type === 'movement' ? 'MOV' : 'EVT'}
                          </span>
                          {index < timelineEntries.length - 1 ? <span className="mt-2 h-full w-px bg-[var(--color-line)]" /> : null}
                        </div>
                        <div className="surface-soft flex-1 rounded-2xl border border-line px-4 py-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{entry.title}</p>
                              {entry.detail ? <p className="mt-1 text-sm leading-6 text-mute">{entry.detail}</p> : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-slate-400">{formatDateLocale(entry.at)}</span>
                              {entry.href ? (
                                <Link
                                  href={entry.href}
                                  className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                                >
                                  Buka Detail
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-600">Belum ada event timeline</p>
                      <p className="mt-1 text-xs text-slate-500">Event penugasan, progress, dan movement akan muncul di sini.</p>
                    </div>
                  )}
                </div>
              </div>

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
                      Belum ada log lifecycle device untuk trouble ticket ini.
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
                  Backlink ke histori close support yang memakai device return atau replace pada ticket gangguan ini,
                  supaya operator tetap berada di konteks kasus yang sama saat pindah dari tracking ke support.
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
                                  'Kasus dismantle close yang memakai item return atau replace dari ticket gangguan ini.'}
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
                      Belum ada histori close dismantle yang memakai item dari ticket gangguan ini.
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
