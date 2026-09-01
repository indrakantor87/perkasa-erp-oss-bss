import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AssignmentAcceptButton } from '@/components/assignment-accept-button'
import { ReleaseAssignmentButton } from '@/components/release-assignment-button'
import { ReassignAssignmentModal, type TechnicianOption } from '@/components/reassign-assignment-modal'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { CurrentHandlerCard } from '@/components/current-handler-card'
import { AssignmentHistoryTable } from '@/components/assignment-history-table'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { buildInventoryBarcodeDetailPath } from '@/lib/inventory-barcode-utils'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getDeviceLifecycleLogs, getInventoryDeviceLifecycleItemSuggestions, type DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { getAuthUsersPageData, type AuthUserListItem } from '@/lib/services/auth-user-service'
import { getWorkOrderTrackingDetail, type WorkOrderAssignmentRow, type AssignmentHistoryItem, type CurrentHandlerInfo } from '@/lib/services/tracking-service'
import { buildTimelineEntries, getTimelineTone, formatDateLocale } from '@/lib/timeline-utils'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import type { DataSourceSnapshot } from '@/lib/types'

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

function resolveWoStatusTone(statusRaw: string | null | undefined): StatusTone {
  const s = String(statusRaw ?? '').trim().toUpperCase()
  if (s === 'CLOSED' || s === 'COMPLETED' || s === 'CANCELLED' || s === 'READY') return 'closed'
  if (s === 'IN_PROGRESS' || s === 'ON_PROGRESS' || s.startsWith('ON_')) return 'in_progress'
  if (s === 'OPEN' || s === 'ESCALATED' || s === 'OVERDUE') return 'danger'
  if (s === 'PENDING' || s === 'SCHEDULED' || s === 'WAITING' || s === 'HOLD') return 'pending'
  if (s === 'ASSIGNED') return 'assigned'
  return 'neutral'
}

function resolvePriorityTone(priorityRaw: string | null | undefined): StatusTone {
  const s = String(priorityRaw ?? '').trim().toUpperCase()
  if (s === 'HIGH' || s === 'URGENT' || s === 'TINGGI' || s === 'KRITIS') return 'danger'
  if (s === 'MEDIUM' || s === 'NORMAL' || s === 'SEDANG') return 'warning'
  if (s === 'LOW' || s === 'RENDAH') return 'success'
  return 'neutral'
}

function resolveAssignmentTone(statusRaw: string | null | undefined): StatusTone {
  const s = String(statusRaw ?? '').trim().toUpperCase()
  if (s === 'ACCEPTED') return 'accepted'
  if (s === 'RELEASED') return 'released'
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

const P58A_ASSIGNMENT_FULL_ACCESS_ROLES = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'NOC_OPERATOR',
  'TT_OPERATOR',
] as const

function isAssignmentFullAccessRole(role: string): boolean {
  return P58A_ASSIGNMENT_FULL_ACCESS_ROLES.includes(
    String(role ?? '').trim().toUpperCase() as (typeof P58A_ASSIGNMENT_FULL_ACCESS_ROLES)[number],
  )
}

function canReleaseAssignment(
  session: Awaited<ReturnType<typeof requireSession>>,
  row: WorkOrderAssignmentRow,
): boolean {
  const status = String(row.assignmentStatus ?? '').trim().toUpperCase()
  const isActiveStatus = status === 'ASSIGNED' || status === 'ACCEPTED'

  if (!isActiveStatus) return false
  if (row.releasedAt != null) return false

  const isFieldTechSelf =
    session.role === 'FIELD_TECHNICIAN' &&
    Number(session.userId) === Number(row.assignedUserId)

  const isFullAccessReleaseRole = isAssignmentFullAccessRole(session.role)

  return isFieldTechSelf || isFullAccessReleaseRole
}

function canReassignAssignment(
  session: Awaited<ReturnType<typeof requireSession>>,
  row: WorkOrderAssignmentRow,
): boolean {
  const status = String(row.assignmentStatus ?? '').trim().toUpperCase()
  const isActiveStatus = status === 'ASSIGNED' || status === 'ACCEPTED'

  if (!isActiveStatus) return false
  if (row.releasedAt != null) return false

  const isFieldTechSelf =
    session.role === 'FIELD_TECHNICIAN' &&
    Number(session.userId) === Number(row.assignedUserId)

  const isFullAccessReassignRole = isAssignmentFullAccessRole(session.role)

  if (isFullAccessReassignRole) return true
  return isFieldTechSelf
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

  const [payload, lifecyclePayload, itemSuggestions, authUsersRaw] = await Promise.all([
    getWorkOrderTrackingDetail(workOrderId, { session }),
    getDeviceLifecycleLogs({ workOrderId, limit: 30 }),
    getInventoryDeviceLifecycleItemSuggestions(200),
    getAuthUsersPageData()
      .then((data) => (Array.isArray(data?.users) ? data.users : []))
      .catch(() => [] as AuthUserListItem[]),
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

  function mapWorkOrderAssignmentToHistoryItem(row: WorkOrderAssignmentRow): AssignmentHistoryItem {
    const statusRaw = String(row.assignmentStatus ?? 'ASSIGNED').trim().toUpperCase()
    const status: 'ASSIGNED' | 'ACCEPTED' | 'RELEASED' =
      statusRaw === 'ACCEPTED' ? 'ACCEPTED'
      : statusRaw === 'RELEASED' ? 'RELEASED'
      : 'ASSIGNED'
    const actor = (uid: number | null, uname: string | null, fname: string | null) =>
      uid != null && !Number.isNaN(uid)
        ? { userId: Number(uid), username: uname || `user-${uid}`, displayName: fname || null }
        : null
    return {
      assignmentId: row.id,
      technician: {
        userId: Number(row.assignedUserId),
        displayName: row.acceptedByFullName || null,
        username: row.acceptedByUsername || (row.assignedUserId ? `assigned-${row.assignedUserId}` : 'unknown'),
      },
      role: String(row.assignmentRole ?? 'ASSIGNEE'),
      status,
      isPrimary: (Number(row.isPrimary) === 1 ? 1 : 0) as 0 | 1,
      assignedAt: row.assignedAt,
      acceptedAt: row.acceptedAt,
      releasedAt: row.releasedAt,
      releasedReason: row.notes,
      assignedBy: actor(row.assignedByUserId ?? null, null, row.assignedByFullName || null),
      acceptedBy: actor(row.acceptedByUserId ?? null, row.acceptedByUsername || null, row.acceptedByFullName || null),
      releasedBy: actor(row.releasedByUserId ?? null, row.releasedByUsername || null, row.releasedByFullName || null),
      notes: row.notes,
    }
  }

  const normalizedAssignments: AssignmentHistoryItem[] = Array.isArray(payload.assignments)
    ? payload.assignments.map(mapWorkOrderAssignmentToHistoryItem)
    : []

  let derivedCurrentHandler: CurrentHandlerInfo | null = null
  const activePrimary = normalizedAssignments.find(
    (h) =>
      h.isPrimary === 1 &&
      h.releasedAt == null &&
      (h.status === 'ASSIGNED' || h.status === 'ACCEPTED'),
  )
  if (activePrimary) {
    if (activePrimary.assignedAt) {
      derivedCurrentHandler = {
        userId: activePrimary.technician.userId,
        displayName: activePrimary.technician.displayName,
        username: activePrimary.technician.username,
        assignmentId: activePrimary.assignmentId,
        status: activePrimary.status as 'ASSIGNED' | 'ACCEPTED',
        assignedAt: activePrimary.assignedAt,
        acceptedAt: activePrimary.acceptedAt ?? null,
      }
    }
  } else {
    const fallbackActive = normalizedAssignments.find(
      (h) => h.releasedAt == null && (h.status === 'ASSIGNED' || h.status === 'ACCEPTED'),
    )
    if (fallbackActive && fallbackActive.assignedAt) {
      derivedCurrentHandler = {
        userId: fallbackActive.technician.userId,
        displayName: fallbackActive.technician.displayName,
        username: fallbackActive.technician.username,
        assignmentId: fallbackActive.assignmentId,
        status: fallbackActive.status as 'ASSIGNED' | 'ACCEPTED',
        assignedAt: fallbackActive.assignedAt,
        acceptedAt: fallbackActive.acceptedAt ?? null,
      }
    }
  }

  const woEndpointBase = '/api/work-orders/assignments'
  const canAcceptHandler = derivedCurrentHandler
    ? canAcceptAssignment(session, payload.assignments.find(r => r.id === derivedCurrentHandler!.assignmentId) ?? ({} as WorkOrderAssignmentRow))
    : false
  const canReleaseHandler = derivedCurrentHandler
    ? canReleaseAssignment(session, payload.assignments.find(r => r.id === derivedCurrentHandler!.assignmentId) ?? ({} as WorkOrderAssignmentRow))
    : false
  const canReassignHandler = derivedCurrentHandler
    ? canReassignAssignment(session, payload.assignments.find(r => r.id === derivedCurrentHandler!.assignmentId) ?? ({} as WorkOrderAssignmentRow))
    : (session.role === 'OWNER' || session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' || session.role === 'NOC_OPERATOR' || session.role === 'TT_OPERATOR')

  const timelineEntries = buildTimelineEntries({
    workOrder: wo ? {
      id: wo.id,
      workOrderNo: wo.workOrderNo,
      jobCategory: wo.jobCategory,
      workType: wo.workType,
      createdAt: wo.createdAt,
    } : null,
    assignments: normalizedAssignments,
    statusLogs: payload.statusLogs,
    movements: payload.movements,
  })
  const canCreateDeviceLifecycle = canWriteDeviceLifecycle(session.role)
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback

  const technicianOptions: TechnicianOption[] = (authUsersRaw ?? [])
    .filter((u) => {
      const status = String(u.status ?? '').trim().toUpperCase()
      const roleCode = String(u.roleCode ?? '').trim().toUpperCase()
      return status === 'ACTIVE' && (roleCode === 'TEKNISI' || roleCode === 'TEKNISI_PSB')
    })
    .map((u) => ({
      id: Number(u.id),
      label: `${u.fullName ?? u.username ?? `User #${u.id}`} (${u.username ?? `#${u.id}`}${u.roleCode ? ` • ${u.roleCode}` : ''})`,
      username: String(u.username ?? `user-${u.id}`),
      roleCode: String(u.roleCode ?? ''),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const woCode = wo?.workOrderNo ?? `Work Order #${workOrderId}`
  const woDescription = wo
    ? [wo.jobCategory ?? wo.workType, wo.priority ?? ''].filter(Boolean).join(' • ')
    : 'Memuat data work order...'

  const pageActions = (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/dashboard/tracking/work-orders"
        aria-label="Kembali ke daftar work order"
        className="btn-ghost tap-44"
      >
        Kembali
      </Link>
      <Link
        href={(() => {
          const params = new URLSearchParams()
          params.set('referenceWorkOrder', String(workOrderId))
          if (wo?.workOrderNo) params.set('workOrderNo', wo.workOrderNo)
          if (wo?.jobCategory) params.set('activityCategory', wo.jobCategory)
          if (wo?.workType) params.set('activityType', wo.workType)
          return `/dashboard/daily-activity?${params.toString()}`
        })()}
        aria-label="Buat daily activity dengan konteks work order ini"
        className="btn-primary tap-44"
      >
        Buat Daily Activity
      </Link>
      <Link
        href={`/dashboard/tracking/stock-movements?workOrderId=${workOrderId}`}
        aria-label="Lihat stock movement terkait work order ini"
        className="btn-secondary tap-44"
      >
        Lihat Movement
      </Link>
      <Link
        href={`/inventory/requests?inventoryAction=item-request&workOrderId=${workOrderId}&requestType=WO_MATERIAL#inventory-action-item-request`}
        aria-label="Buat request barang untuk work order ini"
        className="btn-secondary tap-44"
      >
        Request Barang
      </Link>
      <Link
        href={`/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=WORK_ORDER&workOrderId=${workOrderId}#inventory-action-stock-movement`}
        aria-label="Buat stock movement keluar untuk work order ini"
        className="btn-secondary tap-44"
      >
        Buat Movement
      </Link>
      {dismantleHistoryRows[0] ? (
        <Link
          href={buildSupportLaneHref('dismantle', {
            focus: 'CLOSED_THIS_PERIOD',
            customer: dismantleHistoryRows[0].customerName || '',
            service: dismantleHistoryRows[0].serviceNo || '',
            dismantleHistory: `${dismantleHistoryRows[0].historyId} | ${dismantleHistoryRows[0].customerName || ''} | ${dismantleHistoryRows[0].serviceNo || ''}`,
          })}
          aria-label="Buka histori dismantle support terkait"
          className="btn-ghost tap-44"
        >
          Histori Dismantle
        </Link>
      ) : null}
      {wo?.troubleTicketId ? (
        <Link
          href={`/dashboard/tracking/trouble-tickets/${wo.troubleTicketId}`}
          aria-label={`Buka trouble ticket #${wo.troubleTicketId} terkait`}
          className="btn-secondary tap-44"
        >
          Buka TT #{wo.troubleTicketId}
        </Link>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-6 content-fade-in">
      <DataSourceStatus source={payload.source} />

      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Tracking', href: '/dashboard/tracking' },
          { label: 'Work Order', href: '/dashboard/tracking/work-orders' },
          { label: woCode, href: null as any },
        ]}
        title={woCode}
        description={woDescription}
        actions={pageActions}
      />

      {payload.error ? (
        <section className="card-tier-2 border-warningLine bg-warningSoft p-5">
          <p className="text-sm font-semibold text-warningInk">Review DB belum bisa dibaca</p>
          <p className="mt-2 text-sm leading-6 text-warningInk">{payload.error}</p>
        </section>
      ) : null}

      {!wo ? (
        <section className="card-tier-2 p-5">
          <p className="text-sm font-semibold text-inkStrong">Work order tidak ditemukan.</p>
        </section>
      ) : (
        <>
          <section aria-label="Ringkasan utama work order" className="card-tier-1 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">Snapshot 4 Pertanyaan</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">Status Sekarang</p>
                    <p className="mt-1 font-semibold text-inkStrong flex flex-wrap items-center gap-2">
                      <StatusBadge tone={resolveWoStatusTone(wo.status)} label={wo.status ?? 'UNKNOWN'} size="sm" />
                      <StatusBadge tone={resolvePriorityTone(wo.priority)} label={wo.priority ?? 'PRIORITY'} size="sm" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">PIC Aktif</p>
                    <p className="mt-1 font-semibold text-inkStrong">
                      {derivedCurrentHandler ? `${derivedCurrentHandler.displayName ?? derivedCurrentHandler.username} (${derivedCurrentHandler.status})` : 'Belum ada assignment aktif'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">Terakhir Update</p>
                    <p className="mt-1 text-ink">{wo.scheduledAt ?? wo.createdAt ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">Langkah Berikutnya</p>
                    <p className="mt-1 text-ink">
                      {!derivedCurrentHandler ? 'Buat assignment PIC untuk work order ini.' : (derivedCurrentHandler.status === 'ASSIGNED' ? 'Tunggu konfirmasi ACCEPT teknisi, atau lakukan dispatch manual.' : 'Lanjutkan eksekusi sesuai SOP dan catat status log.')}
                    </p>
                  </div>
                </div>
              </div>
              <StatusBadge tone="info" label={`WO #${wo.id}`} size="md" />
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="card-tier-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={resolveWoStatusTone(wo.status)} label={wo.status ?? 'UNKNOWN'} />
              <StatusBadge tone="info" label={wo.workType ?? wo.jobCategory ?? 'WORK ORDER'} />
              <StatusBadge tone={resolvePriorityTone(wo.priority)} label={wo.priority ?? 'PRIORITY'} />
              {wo.jobCategory ? <StatusBadge tone="neutral" label={wo.jobCategory} /> : null}
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Work Type</dt>
                <dd className="mt-1 font-semibold text-inkStrong">{wo.workType ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Teknisi / Tim</dt>
                <dd className="mt-1 font-semibold text-inkStrong">{wo.technicianName ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">PIC</dt>
                <dd className="mt-1 font-semibold text-inkStrong">
                  {wo.picFullName ?? wo.picUsername ?? (wo.picUserId ? `User #${wo.picUserId}` : '-')}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Scheduled</dt>
                <dd className="mt-1 font-semibold text-inkStrong">{wo.scheduledAt ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">SO</dt>
                <dd className="mt-1 font-semibold text-inkStrong">{wo.salesOrderId ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">TT</dt>
                <dd className="mt-1 font-semibold text-inkStrong">{wo.troubleTicketId ?? '-'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-[0.14em] text-muteStrong">Subscription</dt>
                <dd className="mt-1 font-semibold text-inkStrong">{wo.subscriptionId ?? '-'}</dd>
              </div>
            </dl>
            {wo.notes ? (
              <div className="mt-5 rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-inkStrong">{wo.notes}</p>
              </div>
            ) : null}

            <section className="mt-5 rounded-control border border-line bg-cardSubtle p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Jejak Cepat</p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muteStrong">Status Log</span>
                  <StatusBadge tone="info" label={`${payload.statusLogs.length}`} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muteStrong">Assignment</span>
                  <StatusBadge tone="assigned" label={`${payload.assignments.length}`} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muteStrong">Movement</span>
                  <StatusBadge tone="success" label={`${payload.movements.length}`} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muteStrong">Lifecycle Device</span>
                  <StatusBadge tone="in_progress" label={`${lifecyclePayload.items.length}`} />
                </div>
              </div>
            </section>

            <section className="mt-5 card-tier-2 p-4" aria-label="Form scan lifecycle device">
              <DeviceLifecycleActionForm
                canCreate={canCreateDeviceLifecycle}
                reviewDbReady={reviewDbReady}
                itemSuggestions={itemSuggestions}
                workOrderId={workOrderId}
                troubleTicketId={wo.troubleTicketId}
                defaultLifecycleStatus={wo.jobCategory === 'PSB' ? 'TEAM_PSB' : 'NOC'}
                defaultTargetTeam={wo.jobCategory === 'PSB' ? 'Team Teknisi PSB' : ''}
                embedded
                title="Scan Lifecycle Device"
                description="Gunakan form ini untuk mencatat scan barcode ONT/modem pada alur NOC, delegasi ke teknisi, replace, sampai validasi akhir."
              />
            </section>
          </section>

          <section className="space-y-6">
            <CurrentHandlerCard
              currentHandler={derivedCurrentHandler}
              reviewDbReady={reviewDbReady}
              endpointBasePath={woEndpointBase}
              canAccept={canAcceptHandler}
              canRelease={canReleaseHandler}
              canReassign={canReassignHandler}
              nextActionLabel={!derivedCurrentHandler ? 'Belum ada PIC aktif. Buat assignment baru untuk work order ini.' : (derivedCurrentHandler.status === 'ASSIGNED' ? 'Menunggu konfirmasi ACCEPT dari teknisi yang ditugaskan.' : 'Lanjutkan pekerjaan sesuai SOP, atau lakukan REASSIGN jika perlu perubahan PIC.')}
              nextActionTone={!derivedCurrentHandler ? 'warning' : derivedCurrentHandler.status === 'ASSIGNED' ? 'info' : 'success'}
            />

            <section className="card-tier-3 p-5" aria-label="Timeline tracking work order">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Timeline Tracking</p>
                <StatusBadge tone="neutral" label={`${timelineEntries.length} event`} />
              </div>
              <ol className="mt-5 space-y-4">
                {timelineEntries.length ? (
                  timelineEntries.map((entry, index) => {
                    const tlTone = getTimelineTone(entry.type)
                    return (
                      <li key={entry.id} className="flex gap-4">
                        <div className="flex w-16 shrink-0 flex-col items-center">
                          <span
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${tlTone}`}
                            aria-hidden="true"
                          >
                            {entry.type === 'close' ? 'CLS' : entry.type === 'trouble-ticket' ? 'TT' : entry.type === 'assignment' ? 'PIC' : entry.type === 'status' ? 'STS' : entry.type === 'movement' ? 'MOV' : 'LOG'}
                          </span>
                          {index < timelineEntries.length - 1 ? <span className="mt-2 h-full w-px bg-line" aria-hidden="true" /> : null}
                        </div>
                        <div className="flex-1 rounded-control bg-cardSubtle p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-inkStrong">{entry.title}</p>
                              <p className="mt-1 text-sm leading-6 text-mute">{entry.detail}</p>
                            </div>
                            <div className="text-xs uppercase tracking-[0.2em] text-muteStrong">
                              {formatDateLocale(entry.at)}
                            </div>
                          </div>
                          {entry.href ? (
                            <div className="mt-3">
                              <Link
                                href={entry.href}
                                aria-label={`Buka detail ${entry.type}`}
                                className="btn-ghost tap-44"
                              >
                                Buka Detail
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    )
                  })
                ) : (
                  <li className="rounded-control border border-dashed border-line bg-surfaceSoft p-4 text-sm text-muteStrong">
                    Belum ada event timeline yang bisa ditampilkan untuk work order ini.
                  </li>
                )}
              </ol>
            </section>

            <section className="card-tier-2 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Histori Support Dismantle</p>
                  <p className="mt-2 text-sm leading-6 text-mute">
                    Backlink ke histori close support yang memakai item return dari work order ini, agar operator bisa lompat
                    balik ke konteks terminate yang sama.
                  </p>
                </div>
                <StatusBadge tone="closed" label={`${dismantleHistoryRows.length} closed`} />
              </div>
              <div className="mt-4 space-y-3">
                {dismantleHistoryRows.length ? (
                  dismantleHistoryRows.map((row) => {
                    const returnedItemCodes = parseReturnedItemCodes(row.returnedItemCodes)
                    return (
                      <article key={row.historyId} className="rounded-control border border-line bg-cardSubtle p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-inkStrong">
                              {row.customerName || `Histori Dismantle #${row.historyId}`} {row.serviceNo ? `• ${row.serviceNo}` : ''}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-mute">
                              {row.closeNote?.split('\n').find((line) => line.trim())?.trim() ||
                                'Kasus dismantle close yang terhubung ke item return pada work order ini.'}
                            </p>
                          </div>
                          <StatusBadge tone="closed" label={row.closedAt || 'Closed'} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusBadge tone="neutral" label={`History ID: ${row.historyId}`} />
                          <StatusBadge tone="info" label={`Service: ${row.serviceNo || '-'}`} />
                          <StatusBadge tone="pending" label={`Returned: ${returnedItemCodes.length ? returnedItemCodes.join(', ') : lifecycleItemCodes.join(', ') || '-'}`} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={buildSupportLaneHref('dismantle', {
                              focus: 'CLOSED_THIS_PERIOD',
                              customer: row.customerName || '',
                              service: row.serviceNo || '',
                              dismantleHistory: `${row.historyId} | ${row.customerName || ''} | ${row.serviceNo || ''}`,
                            })}
                            aria-label={`Buka histori support dismantle #${row.historyId}`}
                            className="btn-primary tap-44"
                          >
                            Histori Support
                          </Link>
                          {returnedItemCodes.slice(0, 2).map((itemCode) => (
                            <Link
                              key={`${row.historyId}-${itemCode}`}
                              href={buildInventoryBarcodeDetailPath(itemCode)}
                              aria-label={`Buka barcode inventory ${itemCode}`}
                              className="btn-secondary tap-44"
                            >
                              Buka {itemCode}
                            </Link>
                          ))}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-control border border-dashed border-line bg-surfaceSoft p-4 text-sm text-muteStrong">
                    Belum ada histori close dismantle yang memakai item return dari work order ini.
                  </div>
                )}
              </div>
            </section>

            <AssignmentHistoryTable
              assignments={normalizedAssignments}
              reviewDbReady={reviewDbReady}
              endpointBasePath={woEndpointBase}
              sessionRole={session.role as string}
              sessionUserId={session.userId ? Number(session.userId) : null}
              technicianOptions={technicianOptions}
            />

            <section className="card-tier-3 p-5" aria-label="Status log work order">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Status Log</p>
                <StatusBadge tone="info" label={`${payload.statusLogs.length} log`} />
              </div>
              <div className="mt-4 hidden overflow-x-auto rounded-control border border-line lg:block" aria-label="Tabel status log work order">
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-surfaceSoft">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">To</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Changed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {payload.statusLogs.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-4 align-top text-sm">
                          <StatusBadge tone={resolveWoStatusTone(row.fromStatus)} label={row.fromStatus ?? '-'} />
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <StatusBadge tone={resolveWoStatusTone(row.toStatus)} label={row.toStatus ?? '-'} />
                        </td>
                        <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                          <p className="font-semibold text-inkStrong">{row.reasonCode ?? '-'}</p>
                          <p className="mt-1">{row.reasonNotes ?? ''}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muteStrong">{formatDateLocale(row.changedAt)}</td>
                      </tr>
                    ))}
                    {!payload.statusLogs.length ? (
                      <tr>
                        <td className="px-4 py-6 text-sm text-muteStrong" colSpan={4}>
                          Belum ada status log.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-3 lg:hidden" aria-label="Mobile status log cards">
                {payload.statusLogs.length ? (
                  payload.statusLogs.map((row) => (
                    <article key={row.id} className="rounded-control border border-line bg-cardSubtle p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={resolveWoStatusTone(row.fromStatus)} label={row.fromStatus ?? '-'} />
                        <span className="text-muteStrong" aria-hidden="true">→</span>
                        <StatusBadge tone={resolveWoStatusTone(row.toStatus)} label={row.toStatus ?? '-'} />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <p className="font-semibold text-inkStrong">{row.reasonCode ?? '-'}</p>
                        {row.reasonNotes ? <p className="text-mute">{row.reasonNotes}</p> : null}
                        <p className="text-muteStrong">Changed: {formatDateLocale(row.changedAt)}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-control border border-dashed border-line bg-surfaceSoft p-4 text-sm text-muteStrong">
                    Belum ada status log.
                  </div>
                )}
              </div>
            </section>

            <section className="card-tier-3 p-5" aria-label="Movement terkait work order">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Movement Terkait</p>
                <StatusBadge tone="success" label={`${payload.movements.length} movement`} />
              </div>
              <div className="mt-4 hidden overflow-x-auto rounded-control border border-line lg:block" aria-label="Tabel movement work order">
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-surfaceSoft">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">
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
                            aria-label={`Buka detail movement ${row.itemCode ?? `Item #${row.itemId}`}`}
                            className="text-sm font-semibold text-inkStrong hover:opacity-90"
                          >
                            {row.itemCode ?? `Item #${row.itemId}`}
                          </Link>
                          <p className="mt-1 text-sm text-mute">{row.itemName ?? ''}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muteStrong">
                          {row.movementType ?? '-'}
                          {row.referenceType ? ` • ${row.referenceType}` : ''}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muteStrong">{row.qty ?? '-'}</td>
                        <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                          <p>
                            {row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}
                            {row.toLocationCode ? `${row.toLocationCode}` : '-'}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muteStrong">
                          {row.technicianFullName ?? row.technicianUsername ?? (row.technicianUserId ? `User #${row.technicianUserId}` : '-')}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muteStrong">{formatDateLocale(row.movementAt)}</td>
                      </tr>
                    ))}
                    {!payload.movements.length ? (
                      <tr>
                        <td className="px-4 py-6 text-sm text-muteStrong" colSpan={6}>
                          Belum ada movement yang terhubung ke work order ini.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-3 lg:hidden" aria-label="Mobile movement cards">
                {payload.movements.length ? (
                  payload.movements.map((row) => (
                    <article key={row.id} className="rounded-control border border-line bg-cardSubtle p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/dashboard/tracking/stock-movements/${row.id}`}
                          aria-label={`Buka detail movement ${row.itemCode ?? `Item #${row.itemId}`}`}
                          className="text-sm font-semibold text-inkStrong"
                        >
                          {row.itemCode ?? `Item #${row.itemId}`}
                        </Link>
                        <StatusBadge tone="success" label={`${row.qty ?? '-'} unit`} />
                      </div>
                      {row.itemName ? <p className="mt-1 text-sm text-mute">{row.itemName}</p> : null}
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="text-muteStrong">Type: <span className="font-medium text-inkStrong">{row.movementType ?? '-'}{row.referenceType ? ` • ${row.referenceType}` : ''}</span></p>
                        <p className="text-muteStrong">Waktu: <span className="font-medium text-inkStrong">{formatDateLocale(row.movementAt)}</span></p>
                        <p className="text-muteStrong">Lokasi: <span className="font-medium text-inkStrong">{row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}{row.toLocationCode ?? '-'}</span></p>
                        <p className="text-muteStrong">Teknisi: <span className="font-medium text-inkStrong">{row.technicianFullName ?? row.technicianUsername ?? (row.technicianUserId ? `User #${row.technicianUserId}` : '-')}</span></p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-control border border-dashed border-line bg-surfaceSoft p-4 text-sm text-muteStrong">
                    Belum ada movement yang terhubung ke work order ini.
                  </div>
                )}
              </div>
            </section>

            <section className="card-tier-3 p-5" aria-label="Lifecycle device work order">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Lifecycle Device</p>
                <StatusBadge tone="in_progress" label={`${lifecyclePayload.items.length} device`} />
              </div>
              <ol className="mt-4 space-y-3">
                {lifecyclePayload.items.length ? (
                  lifecyclePayload.items.map((row: DeviceLifecycleLogRow, index) => (
                    <li key={row.id} className="flex gap-4">
                      <div className="flex w-16 shrink-0 flex-col items-center">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] ${getTimelineTone('assignment')}`}
                          aria-hidden="true"
                        >
                          DEV
                        </span>
                        {index < lifecyclePayload.items.length - 1 ? <span className="mt-2 h-full w-px bg-line" aria-hidden="true" /> : null}
                      </div>
                      <div className="flex-1 rounded-control bg-cardSubtle p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-inkStrong">
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
                                aria-label={`Buka barcode inventory ${row.itemCode}`}
                                className="btn-secondary tap-44"
                              >
                                Buka Barcode
                              </Link>
                            ) : null}
                            {row.fromStatus ? (
                              <StatusBadge tone={resolveLifecycleTone(row.fromStatus)} label={row.fromStatus} />
                            ) : null}
                            <StatusBadge tone={resolveLifecycleTone(row.lifecycleStatus)} label={row.lifecycleStatus ?? '-'} />
                            {row.validationStatus && row.validationStatus !== 'NOT_REQUIRED' ? (
                              <StatusBadge tone={resolveValidationTone(row.validationStatus)} label={row.validationStatus} />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-mute lg:grid-cols-2">
                          <p>
                            Actor: <span className="font-semibold text-inkStrong">{row.actorName ?? row.actorRole ?? '-'}</span>
                          </p>
                          <p>
                            Waktu: <span className="font-semibold text-inkStrong">{formatDateLocale(row.createdAt)}</span>
                          </p>
                          <p>
                            Tim: <span className="font-semibold text-inkStrong">{row.targetTeam ?? '-'}</span>
                          </p>
                          <p>
                            Lokasi: <span className="font-semibold text-inkStrong">{row.locationName ?? row.locationCode ?? '-'}</span>
                          </p>
                          <p className="lg:col-span-2">
                            Handover: <span className="font-semibold text-inkStrong">{row.handoverFromLabel || row.handoverToLabel ? `${row.handoverFromLabel ?? '-'} → ${row.handoverToLabel ?? '-'}` : '-'}</span>
                          </p>
                          <p>
                            Jenis Proof: <span className="font-semibold text-inkStrong">{row.handoverProofType ?? '-'}</span>
                          </p>
                          <p>
                            Ref Proof: <span className="font-semibold text-inkStrong">{row.handoverProofRef ?? '-'}</span>
                          </p>
                          <p className="lg:col-span-2">
                            Pasangan Replace:{' '}
                            <span className="font-semibold text-inkStrong">
                              {row.relatedItemCode || row.relatedItemName
                                ? [row.relatedItemCode, row.relatedItemName].filter(Boolean).join(' | ')
                                : '-'}
                            </span>
                          </p>
                        </div>
                        {row.notes ? <p className="mt-3 text-sm leading-6 text-inkStrong">{row.notes}</p> : null}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-control border border-dashed border-line bg-surfaceSoft p-4 text-sm text-muteStrong">
                    Belum ada log lifecycle device untuk work order ini.
                  </li>
                )}
              </ol>
            </section>
          </section>
        </div>
        </>
      )}
    </div>
  )
}
