import type {
  AssignmentHistoryItem,
  TimelineEntry,
  TimelineEventType,
  TTProgressLogItem,
} from '@/lib/services/tracking-service'

type BaseMovementRow = {
  id: number
  itemCode: string | null
  itemName: string | null
  movementType: string | null
  qty: number | null
  referenceType: string | null
  toLocationCode: string | null
  movementAt: string | null
}

type BaseWorkOrder = {
  id: number
  workOrderNo: string | null
  jobCategory: string | null
  workType: string | null
  createdAt: string | null
}

type BaseTroubleTicket = {
  id: number
  ticketCode: string | null
  category: string | null
  type: string | null
  createdAt: string | null
  status: string | null
}

export type GenericTimelinePayload = {
  troubleTicket?: BaseTroubleTicket | null
  workOrder?: BaseWorkOrder | null
  assignments?: AssignmentHistoryItem[]
  statusLogs?: Array<{
    id: number
    fromStatus: string | null
    toStatus: string | null
    reasonCode: string | null
    reasonNotes: string | null
    changedAt: string | null
  }>
  progressLogs?: TTProgressLogItem[]
  movements?: BaseMovementRow[]
}

export function getTimelineTone(type: TimelineEventType): string {
  switch (type) {
    case 'trouble-ticket':
      return 'bg-slate-900 text-white'
    case 'assignment':
      return 'bg-sky-600 text-white'
    case 'status':
      return 'bg-amber-500 text-slate-950'
    case 'movement':
      return 'bg-emerald-600 text-white'
    case 'close':
      return 'bg-rose-500 text-white'
    default:
      return 'bg-slate-200 text-slate-900'
  }
}

function formatDateLocale(value: string | null | undefined): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function formatActorName(actor: { displayName: string | null; username: string; userId: number } | null): string {
  if (!actor) return 'Sistem'
  return actor.displayName?.trim() || actor.username?.trim() || `User #${actor.userId}`
}

function buildTypeRank(type: TimelineEventType): number {
  const map: Record<TimelineEventType, number> = {
    'trouble-ticket': 1,
    movement: 2,
    assignment: 3,
    status: 4,
    close: 5,
  }
  return map[type] ?? 0
}

export function buildTimelineEntries(payload: GenericTimelinePayload): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  if (payload.troubleTicket) {
    entries.push({
      id: `trouble-ticket-${payload.troubleTicket.id}`,
      type: 'trouble-ticket',
      at: payload.troubleTicket.createdAt,
      title: `Ticket dibuat`,
      detail: `${payload.troubleTicket.ticketCode ?? `TT #${payload.troubleTicket.id}`} • ${payload.troubleTicket.category ?? payload.troubleTicket.type ?? 'Trouble Ticket'}`,
    })
  } else if (payload.workOrder) {
    entries.push({
      id: `work-order-${payload.workOrder.id}`,
      type: 'trouble-ticket',
      at: payload.workOrder.createdAt,
      title: 'Work order dibuat',
      detail: `${payload.workOrder.workOrderNo ?? `WO #${payload.workOrder.id}`} • ${payload.workOrder.jobCategory ?? payload.workOrder.workType ?? 'WO'}`,
    })
  }

  for (const row of payload.assignments ?? []) {
    if (row.status === 'RELEASED' && row.releasedAt) {
      entries.push({
        id: `assignment-release-${row.assignmentId}`,
        type: 'assignment',
        at: row.releasedAt,
        title: 'Assignment RELEASED',
        detail: `${formatActorName(row.technician)} • ${row.role}${row.isPrimary ? ' • PIC utama' : ''}${row.releasedBy ? ` • Dilepas oleh: ${formatActorName(row.releasedBy)}` : ''}${row.releasedReason ? ` • Alasan: ${row.releasedReason}` : ''}`,
      })
    }
    if (row.status === 'ACCEPTED' && row.acceptedAt) {
      entries.push({
        id: `assignment-accept-${row.assignmentId}`,
        type: 'assignment',
        at: row.acceptedAt,
        title: 'Assignment ACCEPTED',
        detail: `${formatActorName(row.technician)} • ${row.role}${row.isPrimary ? ' • PIC utama' : ''}${row.acceptedBy ? ` • Diterima oleh: ${formatActorName(row.acceptedBy)}` : ''}`,
      })
    }
    if (row.assignedAt) {
      entries.push({
        id: `assignment-assign-${row.assignmentId}`,
        type: 'assignment',
        at: row.assignedAt,
        title: 'Assignment ASSIGNED',
        detail: `${formatActorName(row.technician)} • ${row.role}${row.isPrimary ? ' • PIC utama' : ''}${row.assignedBy ? ` • Ditugaskan oleh: ${formatActorName(row.assignedBy)}` : ''}`,
      })
    }
  }

  for (const row of payload.statusLogs ?? []) {
    entries.push({
      id: `status-${row.id}`,
      type: 'status',
      at: row.changedAt,
      title: `${row.fromStatus ?? 'DRAFT'} -> ${row.toStatus ?? '-'}`,
      detail: row.reasonNotes ?? row.reasonCode ?? 'Perubahan status',
    })
  }

  for (const row of payload.progressLogs ?? []) {
    const isClose = row.progressStatus === 'CLOSED' || row.progressStatus === 'COMPLETED'
    entries.push({
      id: `progress-${row.id}`,
      type: isClose ? 'close' : 'status',
      at: row.createdAt,
      title: isClose ? 'Ticket DITUTUP' : `Progress: ${row.progressStatus}`,
      detail: `${row.updatedBy ? `Oleh: ${formatActorName(row.updatedBy)}` : row.ownerName ? `PIC: ${row.ownerName}` : ''}${row.progressNotes ? ` • ${row.progressNotes}` : ''}`,
    })
  }

  for (const row of payload.movements ?? []) {
    entries.push({
      id: `movement-${row.id}`,
      type: 'movement',
      at: row.movementAt,
      title: `${row.movementType ?? 'MOVEMENT'} ${row.itemCode ?? `Item`}`,
      detail: `${row.qty ?? '-'} unit${row.referenceType ? ` • ${row.referenceType}` : ''}${row.toLocationCode ? ` • ${row.toLocationCode}` : ''}`,
      href: `/dashboard/tracking/stock-movements/${row.id}`,
    })
  }

  return entries.sort((left, right) => {
    const leftTime = left.at ? new Date(left.at).getTime() : 0
    const rightTime = right.at ? new Date(right.at).getTime() : 0
    const diff = rightTime - leftTime
    if (diff !== 0) return diff
    const rankDiff = buildTypeRank(right.type) - buildTypeRank(left.type)
    if (rankDiff !== 0) return rankDiff
    return String(left.id).localeCompare(String(right.id))
  })
}

export { formatDateLocale, formatActorName }
