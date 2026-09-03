import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CurrentHandlerCard } from '@/components/current-handler-card'
import { AssignmentHistoryTable } from '@/components/assignment-history-table'
import { ReassignAssignmentModal, type TechnicianOption } from '@/components/reassign-assignment-modal'
import { CreateTTAssignmentModal } from '@/components/create-tt-assignment-modal'
import { AssignmentAcceptButton } from '@/components/assignment-accept-button'
import { ReleaseAssignmentButton } from '@/components/release-assignment-button'
import { DispatchWorkOrderModal } from '@/components/dispatch-work-order-modal'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
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

function resolveTtStatusTone(statusRaw: string | null | undefined): StatusTone {
  const s = String(statusRaw ?? '').trim().toUpperCase()
  if (s === 'CLOSED' || s === 'COMPLETED' || s === 'RESOLVED' || s === 'READY') return 'closed'
  if (s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'ON_PROGRESS' || s.startsWith('ON_')) return 'in_progress'
  if (s === 'OPEN' || s === 'OVERDUE' || s === 'ESCALATED') return 'danger'
  if (s === 'PENDING' || s === 'REVIEW' || s === 'WAITING' || s === 'HOLD' || s === 'MONITOR') return 'pending'
  if (s === 'ASSIGNED') return 'assigned'
  return 'neutral'
}

function resolveLifecycleTone(status: string | null): StatusTone {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'INSTALLED') return 'success'
  if (s === 'DAMAGED') return 'danger'
  if (s === 'REPLACE' || s === 'REPLACE_OLD' || s === 'REPLACE_NEW') return 'warning'
  if (s === 'RETURNED' || s === 'INVENTORY') return 'neutral'
  if (s === 'PENDING_NOC_VALIDATION') return 'pending'
  if (s === 'NOC') return 'info'
  return 'in_progress'
}

function resolveValidationTone(status: string | null): StatusTone {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'APPROVED') return 'success'
  if (s === 'REJECTED') return 'danger'
  if (s === 'PENDING') return 'warning'
  return 'neutral'
}

function resolveProgressTone(statusRaw: string | null | undefined): StatusTone {
  const s = String(statusRaw ?? '').trim().toUpperCase()
  if (s === 'CLOSED' || s === 'COMPLETED' || s === 'RESOLVED') return 'closed'
  if (s === 'ACCEPTED' || s.startsWith('ON_') || s === 'IN_PROGRESS') return 'in_progress'
  if (s === 'ESCALATED' || s === 'BLOCKED') return 'danger'
  return 'pending'
}

function canWriteDeviceLifecycle(role: Awaited<ReturnType<typeof requireSession>>['role']) {
  return (
    role === 'FIELD_TECHNICIAN' ||
    canPerformAction(role, 'inventory', 'update') ||
    canPerformAction(role, 'inventory', 'create') ||
    canPerformAction(role, 'support', 'update')
  )
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

  const primaryActiveAssignment =
    Array.isArray(payload.assignments)
      ? payload.assignments.find(
          (a) =>
            Boolean(a.isPrimary) &&
            !a.releasedAt &&
            (a.status === 'ASSIGNED' || a.status === 'ACCEPTED'),
        ) ?? null
      : null
  const activeAssignmentId = primaryActiveAssignment?.assignmentId ? Number(primaryActiveAssignment.assignmentId) : null
  const activeAssignmentStatus = primaryActiveAssignment?.status
  const currentTechnicianLabel =
    primaryActiveAssignment?.technician?.displayName ??
    primaryActiveAssignment?.technician?.username ??
    payload.currentHandler?.displayName ??
    payload.currentHandler?.username ??
    'Teknisi aktif'
  const activeTechnicianUserId = primaryActiveAssignment?.technician?.userId
    ? Number(primaryActiveAssignment.technician.userId)
    : null
  const canAcceptAssignment =
    tt && !tt.closedAt && activeAssignmentId && activeAssignmentStatus === 'ASSIGNED'
      ? P58A_FULL_ACCESS.has(roleCodeUp) ||
        canPerformAction(session.role, 'support', 'update') ||
        (session.userId && activeTechnicianUserId && activeTechnicianUserId === Number(session.userId))
      : false
  const canReleaseAssignment =
    tt && !tt.closedAt && activeAssignmentId && (activeAssignmentStatus === 'ASSIGNED' || activeAssignmentStatus === 'ACCEPTED')
      ? P58A_FULL_ACCESS.has(roleCodeUp) ||
        canPerformAction(session.role, 'support', 'update') ||
        (session.userId && activeTechnicianUserId && activeTechnicianUserId === Number(session.userId))
      : false
  const canReassignAssignment =
    tt && !tt.closedAt && activeAssignmentId
      ? P58A_FULL_ACCESS.has(roleCodeUp) || canPerformAction(session.role, 'support', 'manage')
      : false
  const canDispatchWorkOrder =
    tt && !tt.closedAt && payload.workOrders && payload.workOrders.length > 0
      ? P58A_FULL_ACCESS.has(roleCodeUp) || canPerformAction(session.role, 'sales', 'create')
      : false
  const canEscalateTicket =
    tt && !tt.closedAt
      ? P58A_FULL_ACCESS.has(roleCodeUp) || canPerformAction(session.role, 'support', 'approve')
      : false

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

  const canCreateWorkOrderFromTT =
    tt && !tt.closedAt
      ? P58A_FULL_ACCESS.has(roleCodeUp) ||
        canPerformAction(session.role, 'sales', 'create') ||
        canPerformAction(session.role, 'support', 'update')
      : false
  const canCreateInventoryRequest =
    tt && !tt.closedAt
      ? P58A_FULL_ACCESS.has(roleCodeUp) ||
        canPerformAction(session.role, 'inventory', 'create') ||
        canPerformAction(session.role, 'support', 'update')
      : false
  const canCreateStockMovement =
    tt && !tt.closedAt
      ? P58A_FULL_ACCESS.has(roleCodeUp) ||
        canPerformAction(session.role, 'inventory', 'update') ||
        canPerformAction(session.role, 'inventory', 'manage')
      : false

  const ttCodeOrId = tt?.ticketCode ?? `TT #${troubleTicketId}`
  const descriptionBits = [
    tt?.customerName,
    tt?.type,
    tt?.category,
  ].filter(Boolean)
  const breadcrumbs = [
    { label: 'Workspace', href: '/dashboard' },
    { label: 'Tracking', href: '/dashboard/tracking' },
    { label: 'Trouble', href: '/dashboard/tracking/trouble-tickets' },
    { label: ttCodeOrId },
  ]
  const pageActions = tt ? (
    <>
      <Link href="/dashboard/tracking/trouble-tickets" className="btn-ghost tap-44 focus-visible:shadow-focus">
        Kembali
      </Link>
      {canCreateWorkOrderFromTT ? (
        <Link
          href={(() => {
            const params = new URLSearchParams()
            params.set('troubleTicketId', String(troubleTicketId))
            params.set('jobCategory', 'TROUBLE')
            params.set('notes', tt.ticketCode ? `[Dibuat dari TT ${tt.ticketCode}] ${tt.type ? ` • ${tt.type}` : ''}${tt.customerName ? ` • ${tt.customerName}` : ''}` : `[Dibuat dari TT #${troubleTicketId}] ${tt.type ? ` • ${tt.type}` : ''}${tt.customerName ? ` • ${tt.customerName}` : ''}`)
            return `/sales?${params.toString()}#sales-action-work-order-create`
          })()}
          className="btn-primary tap-44 focus-visible:shadow-focus"
          aria-label="Buat work order lapangan dari trouble ticket ini"
        >
          Buat Work Order dari Ticket
        </Link>
      ) : null}
      {canCreateInventoryRequest ? (
        <Link
          href={`/inventory/requests?inventoryAction=item-request&troubleTicketId=${troubleTicketId}&requestType=TROUBLE_SUPPORT#inventory-action-item-request`}
          className="btn-secondary tap-44 focus-visible:shadow-focus"
        >
          Request Barang
        </Link>
      ) : null}
      {canCreateStockMovement ? (
        <Link
          href={`/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=TROUBLE_TICKET&troubleTicketId=${troubleTicketId}#inventory-action-stock-movement`}
          className="btn-secondary tap-44 focus-visible:shadow-focus"
        >
          Buat Movement
        </Link>
      ) : null}
      {dismantleHistoryRows[0] ? (
        <Link
          href={buildSupportLaneHref('dismantle', {
            focus: 'CLOSED_THIS_PERIOD',
            customer: dismantleHistoryRows[0].customerName || '',
            service: dismantleHistoryRows[0].serviceNo || '',
            dismantleHistory: `${dismantleHistoryRows[0].historyId} | ${dismantleHistoryRows[0].customerName || ''} | ${dismantleHistoryRows[0].serviceNo || ''}`,
          })}
          className="btn-ghost tap-44 focus-visible:shadow-focus"
        >
          Histori Dismantle
        </Link>
      ) : null}
    </>
  ) : null

  return (
    <div className="space-y-6 content-fade-in">
      <DataSourceStatus source={payload.source} />
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={ttCodeOrId}
        description={
          descriptionBits.length
            ? `Detail ticket lintas status, penanganan, progress, dan jejak barang — ${descriptionBits.join(' • ')}.`
            : 'Detail ticket lintas status, penanganan, progress, dan jejak barang.'
        }
        actions={pageActions}
      />

      {payload.error ? (
        <div className="card-tier-2 border border-warningLine bg-warningSoft p-4 sm:p-5">
          <p className="text-sm font-semibold text-warningInk">Review DB belum bisa dibaca</p>
          <p className="mt-2 text-sm leading-6 text-warningInk/90">{payload.error}</p>
        </div>
      ) : null}

      {!tt ? (
        <div className="card-tier-2 border border-line bg-card p-5">
          <p className="text-sm font-semibold text-inkStrong">Trouble ticket tidak ditemukan.</p>
        </div>
      ) : (
        <>
          <section aria-label="Ringkasan utama trouble ticket" className="card-tier-1 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">Snapshot 4 Pertanyaan</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">Status Sekarang</p>
                    <p className="mt-1 font-semibold text-inkStrong flex flex-wrap items-center gap-2">
                      <StatusBadge tone={resolveTtStatusTone(tt.status)} label={tt.status ?? 'DRAFT'} size="sm" />
                      {tt.type ? <StatusBadge tone="info" label={tt.type} size="sm" /> : null}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">PIC Aktif</p>
                    <p className="mt-1 font-semibold text-inkStrong">
                      {payload.currentHandler ? `${payload.currentHandler.displayName ?? payload.currentHandler.username} (${payload.currentHandler.status})` : 'Belum ada assignment aktif'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">Terakhir Update</p>
                    <p className="mt-1 text-ink">{tt.closedAt ?? tt.openedAt ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">Langkah Berikutnya</p>
                    <p className="mt-1 text-ink">
                      {payload.nextAction?.label ?? 'Lakukan assignment jika belum ada, atau follow up status aktif.'}
                    </p>
                  </div>
                </div>
              </div>
              <StatusBadge tone="info" label={`TT #${tt.id}`} size="md" />
            </div>
          </section>
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section aria-label="Ringkasan ticket" className="card-tier-2 border border-line p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={resolveTtStatusTone(tt.status)} label={tt.status ?? 'DRAFT'} uppercase />
                {tt.type ? <StatusBadge tone="info" label={tt.type} size="sm" /> : null}
                {tt.category ? <StatusBadge tone="neutral" label={tt.category} size="sm" /> : null}
                {tt.problemCategory ? <StatusBadge tone="pending" label={tt.problemCategory} size="sm" /> : null}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Customer</dt>
                  <dd className="mt-1 font-semibold text-inkStrong">
                    {tt.customerName ? (
                      <Link
                        href={`/customers/${encodeURIComponent(tt.customerName)}?name=${encodeURIComponent(tt.customerName)}${tt.customerUser ? `&subscription=${encodeURIComponent(tt.customerUser)}` : ''}`}
                        className="hover:underline underline-offset-4 transition"
                        aria-label={`Buka histori customer ${tt.customerName}`}
                      >
                        {tt.customerName}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Service Ref</dt>
                  <dd className="mt-1 font-semibold text-inkStrong">{tt.customerUser ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Opened</dt>
                  <dd className="mt-1 font-medium text-ink">{tt.openedAt ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Closed</dt>
                  <dd className="mt-1 font-medium text-ink">{tt.closedAt ?? '-'}</dd>
                </div>
              </dl>
              {tt.notes ? (
                <article className="mt-4 rounded-control border border-line bg-cardSubtle px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muteStrong">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-inkStrong">{tt.notes}</p>
                </article>
              ) : null}
              {tt.closeNotes ? (
                <article className="mt-3 rounded-control border border-successLine bg-successSoft px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-successInk">Close Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-successInk">{tt.closeNotes}</p>
                </article>
              ) : null}
            </section>

            <AssignmentHistoryTable
              assignments={payload.assignments ?? []}
              reviewDbReady={reviewDbReady}
              endpointBasePath={TT_ENDPOINT_BASE}
              sessionRole={session.role as string}
              sessionUserId={session.userId ? Number(session.userId) : null}
              technicianOptions={technicianOptions}
            />

            <section aria-label="Form scan lifecycle device" className="card-tier-2 border border-line p-4 sm:p-5">
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
            </section>

            {payload.progressLogs && payload.progressLogs.length > 0 ? (
              <section aria-label="Log progress ticket" className="card-tier-3 border border-line p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                      Log Progress
                    </p>
                    <p className="mt-1 text-xs text-mute">{payload.progressLogs.length} total catatan progress</p>
                  </div>
                  <StatusBadge tone="neutral" label={String(payload.progressLogs.length)} size="sm" />
                </div>
                <ol className="mt-4 space-y-3">
                  {payload.progressLogs.map((row) => (
                    <li key={row.id} className="rounded-control border border-line bg-cardSubtle px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          tone={resolveProgressTone(row.progressStatus)}
                          label={String(row.progressStatus ?? 'PROGRESS')}
                          size="sm"
                          uppercase
                        />
                        {row.ownerName ? (
                          <span className="text-xs text-mute">
                            PIC: <span className="font-semibold text-ink">{row.ownerName}</span>
                          </span>
                        ) : null}
                        <span className="text-xs text-mute">{formatDateLocale(row.createdAt)}</span>
                      </div>
                      {row.progressNotes ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-inkStrong">
                          {row.progressNotes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>

          <section className="space-y-6" aria-label="Handler dan timeline ticket">
            <CurrentHandlerCard
              currentHandler={payload.currentHandler ?? null}
              nextActionLabel={payload.nextAction?.label}
              nextActionTone={payload.nextAction?.tone}
              reviewDbReady={reviewDbReady}
              endpointBasePath={TT_ENDPOINT_BASE}
            >
              <div className="space-y-2.5 w-full">
                {!payload.currentHandler && tt?.ticketCode ? (
                  <CreateTTAssignmentModal
                    ticketCode={tt.ticketCode}
                    technicians={technicianOptions}
                    canCreateAssignment={canCreateAssignment}
                    reviewDbReady={reviewDbReady}
                    defaultPrimary={defaultPrimary}
                  />
                ) : null}
                {activeAssignmentId && activeAssignmentStatus === 'ASSIGNED' ? (
                  <AssignmentAcceptButton
                    assignmentId={activeAssignmentId}
                    canAccept={Boolean(canAcceptAssignment)}
                    reviewDbReady={reviewDbReady}
                    endpointBasePath={TT_ENDPOINT_BASE}
                  />
                ) : null}
                {activeAssignmentId && (activeAssignmentStatus === 'ASSIGNED' || activeAssignmentStatus === 'ACCEPTED') ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ReleaseAssignmentButton
                      assignmentId={activeAssignmentId}
                      canRelease={Boolean(canReleaseAssignment)}
                      reviewDbReady={reviewDbReady}
                      endpointBasePath={TT_ENDPOINT_BASE}
                    />
                    <ReassignAssignmentModal
                      assignmentId={activeAssignmentId}
                      canReassign={Boolean(canReassignAssignment)}
                      reviewDbReady={reviewDbReady}
                      currentTechnicianLabel={String(currentTechnicianLabel)}
                      technicianOptions={technicianOptions}
                      endpointBasePath={TT_ENDPOINT_BASE}
                    />
                  </div>
                ) : null}
              </div>
            </CurrentHandlerCard>

            {canEscalateTicket ? (
              <section aria-label="Escalation supervisor" className="card-tier-3 border border-warningLine bg-warningSoft/60 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-warningInk">
                      Escalation Supervisor CS
                    </p>
                    <p className="mt-1.5 text-xs text-warningInk/90">
                      Jika penanganan teknisi melebihi SLA atau kategori ticket termasuk kritis, gunakan tombol escalate untuk naik level ke Supervisor CS/NOC.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/support?focus=ESCALATION_PENDING&troubleTicketId=${troubleTicketId}#support-trouble-ticket-queue`}
                      className="btn-secondary tap-44 text-xs"
                    >
                      Lihat Antrean Escalation
                    </Link>
                    <StatusBadge tone="warning" label="Supervisor only" size="sm" />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-control border border-warningLine bg-white/60 dark:bg-surface/30 px-3 py-2.5">
                    <p className="uppercase tracking-[0.14em] text-warningInk/80 text-[10px]">Level 1</p>
                    <p className="mt-1 text-sm font-semibold text-warningInk">Operator CS / NOC</p>
                  </div>
                  <div className="rounded-control border border-warningLine bg-white/60 dark:bg-surface/30 px-3 py-2.5">
                    <p className="uppercase tracking-[0.14em] text-warningInk/80 text-[10px]">Level 2</p>
                    <p className="mt-1 text-sm font-semibold text-warningInk">Supervisor / Team Lead</p>
                  </div>
                  <div className="rounded-control border border-warningLine bg-white/60 dark:bg-surface/30 px-3 py-2.5">
                    <p className="uppercase tracking-[0.14em] text-warningInk/80 text-[10px]">Level 3</p>
                    <p className="mt-1 text-sm font-semibold text-warningInk">Manager / Engineering</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section aria-label="Timeline event" className="card-tier-3 border border-line p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Timeline
                </p>
                <StatusBadge tone="neutral" label={String(timelineEntries.length)} size="sm" />
              </div>
              <ol className="mt-4 space-y-4">
                {timelineEntries.length ? (
                  timelineEntries.map((entry, index) => (
                    <li key={entry.id} className="flex gap-4">
                      <div className="flex w-16 shrink-0 flex-col items-center">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${getTimelineTone(entry.type)}`}>
                          {entry.type === 'trouble-ticket' ? 'TT' : entry.type === 'assignment' ? 'ASM' : entry.type === 'status' ? 'STS' : entry.type === 'close' ? 'CLS' : entry.type === 'movement' ? 'MOV' : 'EVT'}
                        </span>
                        {index < timelineEntries.length - 1 ? <span className="mt-2 h-full w-px bg-line" /> : null}
                      </div>
                      <div className="min-w-0 flex-1 rounded-control border border-line bg-cardSubtle px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-inkStrong">{entry.title}</p>
                            {entry.detail ? <p className="mt-1 text-sm leading-6 text-mute">{entry.detail}</p> : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-mute">{formatDateLocale(entry.at)}</span>
                            {entry.href ? (
                              <Link
                                href={entry.href}
                                className="btn-ghost tap-44 focus-visible:shadow-focus px-3 py-1 text-xs"
                                aria-label={`Buka detail event: ${entry.title}`}
                              >
                                Buka Detail
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="rounded-control border border-dashed border-line bg-surfaceSoft px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-ink">Belum ada event timeline</p>
                    <p className="mt-1 text-xs text-mute">Event penugasan, progress, dan movement akan muncul di sini.</p>
                  </div>
                )}
              </ol>
            </section>

            <section aria-label="Work order terkait" className="card-tier-2 border border-line p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                    WO Terkait
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    Assign teknisi lapangan via Dispatch untuk setiap WO yang sudah siap dieksekusi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="neutral" label={String(payload.workOrders.length)} size="sm" />
                  {canDispatchWorkOrder ? <StatusBadge tone="info" label="Dispatch ready" size="sm" /> : null}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {payload.workOrders.length ? (
                  payload.workOrders.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-control border border-line bg-cardSubtle transition hover:border-lineStrong"
                    >
                      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/dashboard/tracking/work-orders/${row.id}`}
                          className="flex-1 min-w-0 transition hover:text-accent"
                          aria-label={`Buka work order terkait ${row.workOrderNo ?? `WO #${row.id}`}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-inkStrong">
                              {row.workOrderNo ?? `WO #${row.id}`}
                            </p>
                            {row.priority ? <StatusBadge tone="warning" label={row.priority} size="sm" /> : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-mute">
                            {row.jobCategory ?? row.workType ?? 'WO'}
                            {row.status ? ` • ${row.status}` : ''}
                          </p>
                        </Link>
                        <DispatchWorkOrderModal
                          workOrderId={Number(row.id)}
                          workOrderLabel={row.workOrderNo ?? `WO #${row.id}`}
                          customerLabel={tt?.customerName ?? null}
                          canDispatch={Boolean(canDispatchWorkOrder)}
                          reviewDbReady={reviewDbReady}
                          technicianOptions={technicianOptions}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-control border border-line bg-surfaceSoft px-4 py-3 text-sm text-mute">
                    Belum ada work order lapangan yang terhubung ke ticket ini. Gunakan tombol <strong className="text-inkStrong">Buat Work Order dari Ticket</strong> di header untuk membuat WO baru.
                  </div>
                )}
              </div>
            </section>

            {tt?.category && /PSB|PEMASANGAN|PASANG BARU|INSTALLATION/i.test(`${tt.category} ${tt.type ?? ''} ${tt.ticketCode ?? ''}`) ? (
              <section aria-label="Data PSB sumber ticket" className="card-tier-2 border border-violet-200 bg-violet-50/40 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                      Linked PSB
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold text-violet-700">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden="true" />
                      Sumber Penjualan / Pemasangan Baru
                    </span>
                  </div>
                  <StatusBadge tone="neutral" label="PSB" size="sm" />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-control border border-violet-200 bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-inkStrong">
                      Ticket {ttCodeOrId} berasal dari alur Penjualan (PSB)
                    </p>
                    <p className="mt-1 text-sm leading-6 text-mute">
                      Ikuti link di bawah ini untuk membuka Control Tower PSB dan melihat end-to-end progress mulai dari Sales input sampai Customer aktif + Billing bulan pertama.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/list-psb?q=${encodeURIComponent(tt.ticketCode ?? String(troubleTicketId))}`}
                        className="inline-flex items-center justify-center rounded-xl border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
                      >
                        Cari PSB via Ticket Code
                      </Link>
                      {tt.customerName ? (
                        <Link
                          href={`/list-psb?q=${encodeURIComponent(tt.customerName)}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cari PSB via Nama Customer
                        </Link>
                      ) : null}
                      <Link
                        href="/list-psb"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Buka Daftar PSB
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section aria-label="Movement inventory terkait" className="card-tier-2 border border-line p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Movement Terkait
                </p>
                <StatusBadge tone="neutral" label={String(payload.movements.length)} size="sm" />
              </div>
              <div className="mt-4 space-y-3">
                {payload.movements.length ? (
                  payload.movements.map((row) => (
                    <Link
                      key={row.id}
                      href={`/dashboard/tracking/stock-movements/${row.id}`}
                      className="block rounded-control border border-line bg-cardSubtle px-4 py-3 transition hover:border-lineStrong"
                      aria-label={`Buka movement inventory ${row.itemCode ?? `Item #${row.itemId}`}`}
                    >
                      <p className="text-sm font-semibold text-inkStrong">
                        {row.itemCode ?? `Item #${row.itemId}`}
                        {row.movementType ? ` • ${row.movementType}` : ''}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-mute">
                        {row.qty ?? '-'} unit
                        {row.referenceType ? ` • ${row.referenceType}` : ''}
                        {row.movementAt ? ` • ${row.movementAt}` : ''}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-control border border-line bg-surfaceSoft px-4 py-3 text-sm text-mute">
                    Belum ada movement inventory yang terhubung ke ticket ini.
                  </div>
                )}
              </div>
            </section>

            <section aria-label="Lifecycle device" className="card-tier-3 border border-line p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Lifecycle Device
                </p>
                <StatusBadge tone="neutral" label={String(lifecyclePayload.items.length)} size="sm" />
              </div>
              <ol className="mt-4 space-y-4">
                {lifecyclePayload.items.length ? (
                  lifecyclePayload.items.map((row: DeviceLifecycleLogRow, index) => (
                    <li key={row.id} className="flex gap-4">
                      <div className="flex w-16 shrink-0 flex-col items-center">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${getTimelineTone('movement')}`}>
                          DEV
                        </span>
                        {index < lifecyclePayload.items.length - 1 ? <span className="mt-2 h-full w-px bg-line" /> : null}
                      </div>
                      <div className="min-w-0 flex-1 rounded-control border border-line bg-cardSubtle px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-inkStrong">
                              {row.itemCode ?? `Item #${row.inventoryItemId}`}
                              {row.itemName ? ` • ${row.itemName}` : ''}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-mute">
                              {row.eventType ?? '-'}
                              {row.scanSource ? ` • ${row.scanSource}` : ''}
                              {row.ticketRef ? ` • ${row.ticketRef}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {row.itemCode ? (
                              <Link
                                href={buildInventoryBarcodeDetailPath(row.itemCode)}
                                className="btn-secondary tap-44 focus-visible:shadow-focus px-3 py-1 text-xs"
                                aria-label={`Buka barcode ${row.itemCode}`}
                              >
                                Barcode
                              </Link>
                            ) : null}
                            {row.fromStatus ? (
                              <StatusBadge tone={resolveLifecycleTone(row.fromStatus)} label={String(row.fromStatus)} size="sm" />
                            ) : null}
                            <StatusBadge tone={resolveLifecycleTone(row.lifecycleStatus)} label={String(row.lifecycleStatus ?? '-')} size="sm" uppercase />
                            {row.validationStatus && row.validationStatus !== 'NOT_REQUIRED' ? (
                              <StatusBadge tone={resolveValidationTone(row.validationStatus)} label={String(row.validationStatus)} size="sm" />
                            ) : null}
                          </div>
                        </div>
                        <dl className="mt-3 grid gap-2 text-sm text-mute sm:grid-cols-2">
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Actor</dt>
                            <dd className="font-semibold text-inkStrong">{row.actorName ?? row.actorRole ?? '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Waktu</dt>
                            <dd className="font-semibold text-inkStrong">{row.createdAt ?? '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Tim</dt>
                            <dd className="font-semibold text-inkStrong">{row.targetTeam ?? '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Lokasi</dt>
                            <dd className="font-semibold text-inkStrong">{row.locationName ?? row.locationCode ?? '-'}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Handover</dt>
                            <dd className="font-semibold text-inkStrong">
                              {row.handoverFromLabel || row.handoverToLabel
                                ? `${row.handoverFromLabel ?? '-'} → ${row.handoverToLabel ?? '-'}`
                                : '-'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Proof Type</dt>
                            <dd className="font-semibold text-inkStrong">{row.handoverProofType ?? '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Proof Ref</dt>
                            <dd className="font-semibold text-inkStrong">{row.handoverProofRef ?? '-'}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs uppercase tracking-wider text-muteStrong">Pasangan Replace</dt>
                            <dd className="font-semibold text-inkStrong">
                              {row.relatedItemCode || row.relatedItemName
                                ? [row.relatedItemCode, row.relatedItemName].filter(Boolean).join(' | ')
                                : '-'}
                            </dd>
                          </div>
                        </dl>
                        {row.notes ? <p className="mt-3 text-sm leading-6 text-inkStrong">{row.notes}</p> : null}
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="rounded-control border border-line bg-surfaceSoft px-4 py-3 text-sm text-mute">
                    Belum ada log lifecycle device untuk trouble ticket ini.
                  </div>
                )}
              </ol>
            </section>

            <section aria-label="Histori support dismantle" className="card-tier-2 border border-line p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                    Histori Dismantle
                  </p>
                  <p className="mt-1 text-xs leading-5 text-mute">
                    Backlink ke histori close support yang memakai device return atau replace pada ticket gangguan ini.
                  </p>
                </div>
                <StatusBadge tone="neutral" label={String(dismantleHistoryRows.length)} size="sm" />
              </div>
              <div className="mt-4 space-y-3">
                {dismantleHistoryRows.length ? (
                  dismantleHistoryRows.map((row) => {
                    const returnedItemCodes = parseReturnedItemCodes(row.returnedItemCodes)
                    const closedLabel = row.closedAt ? formatDateLocale(row.closedAt) : 'Closed'
                    return (
                      <article key={row.historyId} className="rounded-control border border-line bg-cardSubtle px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-inkStrong">
                              {row.customerName || `Histori Dismantle #${row.historyId}`}
                              {row.serviceNo ? ` • ${row.serviceNo}` : ''}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-mute">
                              {row.closeNote?.split('\n').find((line) => line.trim())?.trim() ||
                                'Kasus dismantle close yang memakai item return atau replace dari ticket gangguan ini.'}
                            </p>
                          </div>
                          <StatusBadge tone="closed" label={closedLabel} size="sm" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusBadge tone="neutral" label={`History ID: ${row.historyId}`} size="sm" />
                          {row.serviceNo ? (
                            <StatusBadge tone="info" label={`Service: ${row.serviceNo}`} size="sm" />
                          ) : null}
                          <StatusBadge
                            tone="pending"
                            label={`Returned: ${returnedItemCodes.length ? returnedItemCodes.length : lifecycleItemCodes.length}`}
                            size="sm"
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={buildSupportLaneHref('dismantle', {
                              focus: 'CLOSED_THIS_PERIOD',
                              customer: row.customerName || '',
                              service: row.serviceNo || '',
                              dismantleHistory: `${row.historyId} | ${row.customerName || ''} | ${row.serviceNo || ''}`,
                            })}
                            className="btn-primary tap-44 focus-visible:shadow-focus px-3 py-1 text-xs"
                            aria-label={`Buka histori support dismantle ${row.historyId}`}
                          >
                            Buka Histori Support
                          </Link>
                          {returnedItemCodes.slice(0, 2).map((itemCode) => (
                            <Link
                              key={`${row.historyId}-${itemCode}`}
                              href={buildInventoryBarcodeDetailPath(itemCode)}
                              className="btn-secondary tap-44 focus-visible:shadow-focus px-3 py-1 text-xs"
                              aria-label={`Buka barcode ${itemCode}`}
                            >
                              Barcode {itemCode}
                            </Link>
                          ))}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-control border border-line bg-surfaceSoft px-4 py-3 text-sm text-mute">
                    Belum ada histori close dismantle yang memakai item dari ticket gangguan ini.
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
        </>
      )}
    </div>
  )
}
