import { getDataSourceSnapshot } from '@/lib/data-source'
import type { AppSession } from '@/lib/auth-session'
import { mockTrackingNocQueueItems } from '@/lib/mock-tracking'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getLatestDeviceLifecycleMaps } from '@/lib/services/device-lifecycle-service'
import { ensureInventoryLocationsTable } from '@/lib/services/inventory-location-service'
import { resolveCanonicalSlaState } from '@/lib/services/sla-resolver'
import type { DataSourceSnapshot } from '@/lib/types'

type WorkOrderQueueRow = {
  id: number
  workOrderNo: string | null
  workType: string | null
  jobCategory: string | null
  status: string | null
  priority: string | null
  slaDueAt: string | null
  scheduledAt: string | null
  technicianName: string | null
  troubleTicketId: number | null
  picUsername: string | null
  picFullName: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

type TroubleTicketQueueRow = {
  id: number
  ticketCode: string | null
  customerName: string | null
  customerUser: string | null
  category: string | null
  type: string | null
  status: string | null
  openedAt: string | null
  updatedAt: string | null
}

type InventoryRequestSummaryRow = {
  id: number
  requestCode: string | null
  requestStatus: string | null
  requestType: string | null
  requestedSubdivision: string | null
  requestedFor: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  requestedAt: string | null
  completedAt: string | null
}

type MovementSummaryRow = {
  id: number
  itemCode: string | null
  itemName: string | null
  movementType: string | null
  movementStatus: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  fromLocationCode: string | null
  fromLocationName: string | null
  toLocationCode: string | null
  toLocationName: string | null
  technicianUsername: string | null
  technicianFullName: string | null
  notes: string | null
  movementAt: string | null
}

export type NocQueueQuery = {
  q?: string | string[]
  ticketType?: string | string[]
  queueStatus?: string | string[]
  slaState?: string | string[]
  mine?: string | string[]
  limit?: string | string[]
}

export type NocTicketType = 'PSB' | 'TROUBLESHOOTS' | 'DISMANTLE' | 'JALUR' | 'OTHER'

export type NocQueueStatus = 'OPEN' | 'ON_PROGRESS' | 'TEMPORARY' | 'CLOSE'

export type NocQueueItem = {
  queueKey: string
  sourceType: 'WORK_ORDER' | 'TROUBLE_TICKET'
  sourceId: number
  ticketNo: string | null
  ticketType: NocTicketType
  queueStatus: NocQueueStatus
  rawStatus: string | null
  customerName: string | null
  customerUser: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  priority: string | null
  technicianName: string | null
  picName: string | null
  picUsername: string | null
  supportLaneLabel: string
  requestCode: string | null
  requestStatus: string | null
  requestRequestedFor: string | null
  deviceState: string | null
  deviceLifecycleStatus: string | null
  deviceValidationStatus: string | null
  deviceTicketRef: string | null
  deviceHandoverFrom: string | null
  deviceHandoverTo: string | null
  deviceHandoverProofType: string | null
  deviceHandoverProofRef: string | null
  deviceItemLabel: string | null
  deviceLocationLabel: string | null
  deviceLastActor: string | null
  queueStartedAt: string | null
  ageHours: number | null
  ageLabel: string | null
  slaState: 'ON_TRACK' | 'WARNING' | 'BREACHED' | null
  slaLabel: string | null
  operationalBadges: string[]
  lastUpdateAt: string | null
  href: string
}

type NocQueueState = {
  q: string | null
  ticketType: NocTicketType | null
  queueStatus: NocQueueStatus | null
  slaState: 'ON_TRACK' | 'WARNING' | 'BREACHED' | null
  mine: boolean
  limit: number
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeLike(value: string) {
  return `%${value.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

function resolveOptionalInt(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function uniquePositiveIntegers(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
    ),
  )
}

function buildInClause(values: number[]) {
  if (!values.length) {
    return null
  }

  return values.map(() => '?').join(', ')
}

function detectTicketType({
  workType,
  jobCategory,
  category,
  type,
  sourceType,
}: {
  workType?: string | null
  jobCategory?: string | null
  category?: string | null
  type?: string | null
  sourceType: 'WORK_ORDER' | 'TROUBLE_TICKET'
}): NocTicketType {
  const haystack = [workType, jobCategory, category, type]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(' ')

  if (haystack.includes('PSB') || haystack.includes('INSTALL') || haystack.includes('PASANG')) {
    return 'PSB'
  }
  if (haystack.includes('DISMANTLE') || haystack.includes('CABUT') || haystack.includes('TERMINASI')) {
    return 'DISMANTLE'
  }
  if (haystack.includes('JALUR') || haystack.includes('EXPAN') || haystack.includes('JOINT') || haystack.includes('BACKBONE')) {
    return 'JALUR'
  }
  if (
    haystack.includes('TROUBLE') ||
    haystack.includes('GANGGUAN') ||
    haystack.includes('LOS') ||
    haystack.includes('DOWN') ||
    haystack.includes('ISOLIR')
  ) {
    return 'TROUBLESHOOTS'
  }

  return sourceType === 'TROUBLE_TICKET' ? 'TROUBLESHOOTS' : 'OTHER'
}

function normalizeQueueStatus(rawStatus: string | null | undefined): NocQueueStatus {
  const value = normalizeText(rawStatus)

  if (!value || value === 'OPEN' || value === 'NEW') {
    return 'OPEN'
  }
  if (value === 'SCHEDULED' || value === 'ASSIGNED') {
    return 'OPEN'
  }
  if (
    value.includes('CLOSE') ||
    value.includes('DONE') ||
    value.includes('COMPLETE') ||
    value.includes('SELESAI') ||
    value.includes('RESOLVED') ||
    value.includes('INSTALLED')
  ) {
    return 'CLOSE'
  }
  if (
    value.includes('FOLLOW_UP') ||
    value.includes('TEMP') ||
    value.includes('PENDING') ||
    value.includes('WAIT') ||
    value.includes('HOLD') ||
    value.includes('REVISIT')
  ) {
    return 'TEMPORARY'
  }
  if (
    value.includes('PROGRESS') ||
    value.includes('PROCESS') ||
    value.includes('CHECK') ||
    value.includes('ASSIGN') ||
    value.includes('DISPATCH') ||
    value.includes('VISIT') ||
    value.includes('REPLACE')
  ) {
    return 'ON_PROGRESS'
  }

  return 'OPEN'
}

function resolveSupportLaneLabel(ticketType: NocTicketType) {
  if (ticketType === 'DISMANTLE') {
    return 'Lane Dismantle'
  }
  if (ticketType === 'JALUR') {
    return 'Lane Jalur'
  }
  return 'Lane TT'
}

function resolveQueueStartedAt(params: {
  sourceType: 'WORK_ORDER' | 'TROUBLE_TICKET'
  createdAt?: string | null
  scheduledAt?: string | null
  openedAt?: string | null
}) {
  if (params.sourceType === 'WORK_ORDER') {
    return params.scheduledAt ?? params.createdAt ?? null
  }

  return params.openedAt ?? params.createdAt ?? null
}

function parseDateValue(value: string | null | undefined) {
  const parsed = Date.parse(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

function resolveAgeHours(startedAt: string | null | undefined) {
  const startedMs = parseDateValue(startedAt)
  if (startedMs === null) {
    return null
  }

  return Math.max(0, Math.floor((Date.now() - startedMs) / (1000 * 60 * 60)))
}

function formatAgeLabel(ageHours: number | null) {
  if (ageHours === null) {
    return null
  }
  if (ageHours < 24) {
    return `${ageHours}j`
  }

  const days = Math.floor(ageHours / 24)
  const hours = ageHours % 24
  return hours ? `${days}h ${hours}j` : `${days}h`
}

function resolveFallbackSlaHours(ticketType: NocTicketType, priority: string | null | undefined) {
  const normalizedPriority = normalizeText(priority)
  if (normalizedPriority === 'URGENT') return 4
  if (normalizedPriority === 'HIGH') return 8
  if (normalizedPriority === 'MEDIUM') return 24
  if (normalizedPriority === 'LOW') return 48
  if (ticketType === 'TROUBLESHOOTS') return 12
  if (ticketType === 'DISMANTLE') return 24
  if (ticketType === 'JALUR') return 48
  return 24
}

function buildSlaSnapshot(params: {
  startedAt: string | null
  dueAt?: string | null
  ticketType: NocTicketType
  priority?: string | null
}) {
  const ageHours = resolveAgeHours(params.startedAt)
  const ageLabel = formatAgeLabel(ageHours)
  const canonicalState = resolveCanonicalSlaState({
    slaDueAt: params.dueAt ?? null,
    openedAt: params.startedAt ?? null,
    fallbackTargetHours: resolveFallbackSlaHours(params.ticketType, params.priority),
    warningCalendarDays: params.dueAt && String(params.dueAt).trim() ? true : false,
    warningWindowHours: 2,
  })

  const dueMs = parseDateValue(params.dueAt)
  if (dueMs !== null) {
    const diffHours = Math.floor((dueMs - Date.now()) / (1000 * 60 * 60))
    if (canonicalState === 'BREACHED') {
      return {
        ageHours,
        ageLabel,
        slaState: 'BREACHED' as const,
        slaLabel: `Lewat ${Math.max(0, Math.abs(diffHours))}j`,
      }
    }
    if (canonicalState === 'WARNING') {
      return {
        ageHours,
        ageLabel,
        slaState: 'WARNING' as const,
        slaLabel: `Sisa ${Math.max(0, diffHours)}j`,
      }
    }

    return {
      ageHours,
      ageLabel,
      slaState: 'ON_TRACK' as const,
      slaLabel: `SLA ${Math.max(0, diffHours)}j`,
    }
  }

  const targetHours = resolveFallbackSlaHours(params.ticketType, params.priority)
  if (ageHours === null) {
    return {
      ageHours: null,
      ageLabel: null,
      slaState: null,
      slaLabel: null,
    }
  }
  if (canonicalState === 'BREACHED') {
    return {
      ageHours,
      ageLabel,
      slaState: 'BREACHED' as const,
      slaLabel: `>${targetHours}j`,
    }
  }
  if (canonicalState === 'WARNING') {
    return {
      ageHours,
      ageLabel,
      slaState: 'WARNING' as const,
      slaLabel: `Mepet ${targetHours}j`,
    }
  }

  return {
    ageHours,
    ageLabel,
    slaState: 'ON_TRACK' as const,
    slaLabel: `Target ${targetHours}j`,
  }
}

function resolveOperationalBadges(params: {
  requestStatus?: string | null
  deviceState?: string | null
  queueStatus?: NocQueueStatus | null
  ticketType: NocTicketType
}) {
  const badges = new Set<string>()
  const requestStatus = normalizeText(params.requestStatus)
  const deviceState = normalizeText(params.deviceState)

  if (requestStatus.includes('PENDING') || requestStatus.includes('WAIT')) {
    badges.add('MENUNGGU MATERIAL')
  } else if (requestStatus.includes('PROGRESS') || requestStatus.includes('PROCESS')) {
    badges.add('MATERIAL DIPROSES')
  }

  if (deviceState === 'PENDING VALIDASI NOC' || deviceState === 'PENDING_NOC_VALIDATION') {
    badges.add('PENDING VALIDASI')
  }
  if (
    deviceState === 'REPLACE' ||
    deviceState === 'REPLACE_OLD' ||
    deviceState === 'REPLACE_NEW' ||
    deviceState === 'REPLACE DEVICE LAMA' ||
    deviceState === 'REPLACE DEVICE BARU'
  ) {
    badges.add('BUTUH REPLACE')
  }
  if (deviceState === 'RUSAK' || deviceState === 'DAMAGED') {
    badges.add('DEVICE RUSAK')
  }
  if (deviceState === 'KEMBALI' || deviceState === 'RETURNED') {
    badges.add(params.ticketType === 'DISMANTLE' ? 'BARANG KEMBALI' : 'RETURN')
  }
  if (params.queueStatus === 'TEMPORARY') {
    badges.add('FOLLOW UP')
  }

  return Array.from(badges)
}

function getSlaPriority(slaState: NocQueueItem['slaState']) {
  if (slaState === 'BREACHED') return 3
  if (slaState === 'WARNING') return 2
  if (slaState === 'ON_TRACK') return 1
  return 0
}

function getQueuePriority(queueStatus: NocQueueStatus) {
  if (queueStatus === 'ON_PROGRESS') return 4
  if (queueStatus === 'OPEN') return 3
  if (queueStatus === 'TEMPORARY') return 2
  if (queueStatus === 'CLOSE') return 1
  return 0
}

function mapRequestDeviceState(request: InventoryRequestSummaryRow | null) {
  if (!request) {
    return null
  }

  const status = normalizeText(request.requestStatus)
  if (!status) {
    return 'REQUEST BARANG'
  }
  if (status.includes('COMPLETE') || status.includes('SELESAI') || status.includes('DONE')) {
    return 'SIAP DIPASANG'
  }
  if (status.includes('PROGRESS') || status.includes('PROCESS')) {
    return 'DIPROSES INVENTORY'
  }
  if (status.includes('PENDING') || status.includes('WAIT')) {
    return 'MENUNGGU MATERIAL'
  }

  return `REQUEST ${status}`
}

function mapMovementDeviceState(movement: MovementSummaryRow | null) {
  if (!movement) {
    return null
  }

  const destination = normalizeText(`${movement.toLocationCode} ${movement.toLocationName}`)
  const origin = normalizeText(`${movement.fromLocationCode} ${movement.fromLocationName}`)
  const notes = normalizeText(movement.notes)
  const movementStatus = normalizeText(movement.movementStatus)

  if (notes.includes('REPLACE')) {
    return 'REPLACE'
  }
  if (notes.includes('RUSAK') || notes.includes('BROKEN') || notes.includes('DAMAGED')) {
    return 'RUSAK'
  }
  if (movementStatus === 'CANCELED') {
    return 'KEMBALI'
  }
  if (destination.includes('NOC') || origin.includes('NOC')) {
    return 'NOC'
  }
  if (destination.includes('TECH-') || destination.includes('TEKNISI')) {
    return 'TEAM TEKNISI'
  }
  if (destination.includes('WH-') || origin.includes('WH-') || destination.includes('WAREHOUSE')) {
    return 'INVENTORY'
  }
  if (normalizeText(movement.movementType) === 'OUT') {
    return 'DELEGASI'
  }
  if (normalizeText(movement.movementType) === 'IN') {
    return 'INVENTORY'
  }

  return normalizeText(movement.movementType) || null
}

function buildMovementLocationLabel(movement: MovementSummaryRow | null) {
  if (!movement) {
    return null
  }

  const fromLabel = movement.fromLocationCode || movement.fromLocationName
  const toLabel = movement.toLocationCode || movement.toLocationName
  if (fromLabel && toLabel) {
    return `${fromLabel} -> ${toLabel}`
  }
  return toLabel || fromLabel || null
}

function mapLifecycleDeviceState(status: string | null | undefined) {
  const value = normalizeText(status)
  if (!value) {
    return null
  }
  if (value === 'TEAM_PSB') {
    return 'TEAM TEKNISI PSB'
  }
  if (value === 'TEAM_TROUBLESHOOTS') {
    return 'TEAM TEKNISI TROUBLESHOOTS'
  }
  if (value === 'TEAM_JALUR') {
    return 'TEAM TEKNISI JALUR'
  }
  if (value === 'TEAM_DISMANTLE') {
    return 'TEAM TEKNISI DISMANTLE'
  }
  if (value === 'PENDING_NOC_VALIDATION') {
    return 'PENDING VALIDASI NOC'
  }
  if (value === 'INSTALLED') {
    return 'TERPASANG'
  }
  if (value === 'DAMAGED') {
    return 'RUSAK'
  }
  if (value === 'RETURNED') {
    return 'KEMBALI'
  }
  if (value === 'REPLACE_OLD') {
    return 'REPLACE DEVICE LAMA'
  }
  if (value === 'REPLACE_NEW') {
    return 'REPLACE DEVICE BARU'
  }
  return value
}

function pickMostRecentDate(...values: Array<string | null | undefined>) {
  const resolved = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))

  return resolved[0] ?? null
}

function buildRequestMaps(requestRows: InventoryRequestSummaryRow[]) {
  const byWorkOrder = new Map<number, InventoryRequestSummaryRow>()
  const byTroubleTicket = new Map<number, InventoryRequestSummaryRow>()

  for (const row of requestRows) {
    if (row.workOrderId && !byWorkOrder.has(row.workOrderId)) {
      byWorkOrder.set(row.workOrderId, row)
    }
    if (row.troubleTicketId && !byTroubleTicket.has(row.troubleTicketId)) {
      byTroubleTicket.set(row.troubleTicketId, row)
    }
  }

  return { byWorkOrder, byTroubleTicket }
}

function buildMovementMaps(movementRows: MovementSummaryRow[]) {
  const byWorkOrder = new Map<number, MovementSummaryRow>()
  const byTroubleTicket = new Map<number, MovementSummaryRow>()

  for (const row of movementRows) {
    if (row.workOrderId && !byWorkOrder.has(row.workOrderId)) {
      byWorkOrder.set(row.workOrderId, row)
    }
    if (row.troubleTicketId && !byTroubleTicket.has(row.troubleTicketId)) {
      byTroubleTicket.set(row.troubleTicketId, row)
    }
  }

  return { byWorkOrder, byTroubleTicket }
}

function getFallbackDataSource(source: DataSourceSnapshot, error: unknown): DataSourceSnapshot {
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return source
  }

  return {
    configuredMode: source.configuredMode,
    effectiveMode: 'mock',
    isFallback: true,
    label: 'Mock Fallback',
    detail: getReviewDbErrorDetail(error),
  }
}

function resolveNocQueueState(query: NocQueueQuery): NocQueueState {
  const q = resolveSearchParam(query.q)?.trim() ?? ''
  const ticketTypeRaw = resolveSearchParam(query.ticketType)?.trim().toUpperCase() ?? ''
  const queueStatusRaw = resolveSearchParam(query.queueStatus)?.trim().toUpperCase() ?? ''
  const slaStateRaw = resolveSearchParam(query.slaState)?.trim().toUpperCase() ?? ''
  const mineRaw = resolveSearchParam(query.mine)?.trim().toLowerCase() ?? ''
  const limitRaw = resolveSearchParam(query.limit)?.trim() ?? ''
  const limit = Math.min(Math.max(resolveOptionalInt(limitRaw) ?? 80, 20), 200)

  const ticketType = ['PSB', 'TROUBLESHOOTS', 'DISMANTLE', 'JALUR', 'OTHER'].includes(ticketTypeRaw)
    ? (ticketTypeRaw as NocTicketType)
    : null
  const queueStatus = ['OPEN', 'ON_PROGRESS', 'TEMPORARY', 'CLOSE'].includes(queueStatusRaw)
    ? (queueStatusRaw as NocQueueStatus)
    : null
  const slaState = ['ON_TRACK', 'WARNING', 'BREACHED'].includes(slaStateRaw)
    ? (slaStateRaw as NocQueueState['slaState'])
    : null
  const mine = ['1', 'true', 'yes', 'on'].includes(mineRaw)

  return {
    q: q || null,
    ticketType,
    queueStatus,
    slaState,
    mine,
    limit,
  }
}

export async function getNocQueueList(query: NocQueueQuery, options?: { session?: AppSession }) {
  const source = getDataSourceSnapshot()
  const state = resolveNocQueueState(query)
  const session = options?.session
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const searchNeedle = normalizeText(state.q)
    const items = mockTrackingNocQueueItems
      .filter((item) =>
        !searchNeedle ||
        [
          item.ticketNo,
          item.customerName,
          item.customerUser,
          item.technicianName,
          item.picName,
          item.picUsername,
          item.deviceItemLabel,
          item.deviceTicketRef,
        ].some((value) => normalizeText(value).includes(searchNeedle)),
      )
      .filter((item) =>
        state.mine && session?.username
          ? normalizeText(item.picUsername) === normalizeText(session.username)
          : true,
      )
      .filter((item) => !state.ticketType || item.ticketType === state.ticketType)
      .filter((item) => !state.queueStatus || item.queueStatus === state.queueStatus)
      .filter((item) => !state.slaState || item.slaState === state.slaState)
      .slice(0, state.limit)

    return { source, items, otherItems: items.filter((i) => i.ticketType === 'OTHER').slice(0, 50), error: null as string | null, state }
  }

  try {
    await ensureInventoryLocationsTable()
    const fetchLimit = Math.min(state.limit * 3, 400)
    const hasWorkOrderJobCategory = await hasReviewDbColumn('service_work_orders', 'job_category')
    const hasWorkOrderPriority = await hasReviewDbColumn('service_work_orders', 'priority')
    const hasWorkOrderSlaDueAt = await hasReviewDbColumn('service_work_orders', 'sla_due_at')
    const hasWorkOrderScheduledAt = await hasReviewDbColumn('service_work_orders', 'scheduled_at')
    const hasWorkOrderTroubleTicketId = await hasReviewDbColumn('service_work_orders', 'trouble_ticket_id')
    const hasWorkOrderPicUserId = await hasReviewDbColumn('service_work_orders', 'current_pic_user_id')
    const hasWorkOrderNotes = await hasReviewDbColumn('service_work_orders', 'notes')
    const hasWorkOrderCreatedAt = await hasReviewDbColumn('service_work_orders', 'created_at')
    const hasWorkOrderUpdatedAt = await hasReviewDbColumn('service_work_orders', 'updated_at')
    const hasRequestTable = await hasReviewDbColumn('inventory_item_requests', 'id')
    const hasRequestWorkOrderId = hasRequestTable && (await hasReviewDbColumn('inventory_item_requests', 'work_order_id'))
    const hasRequestTroubleTicketId = hasRequestTable && (await hasReviewDbColumn('inventory_item_requests', 'trouble_ticket_id'))
    const hasRequestType = hasRequestTable && (await hasReviewDbColumn('inventory_item_requests', 'request_type'))
    const hasMovementTable = await hasReviewDbColumn('inventory_stock_movements', 'id')
    const hasMovementWorkOrderId = hasMovementTable && (await hasReviewDbColumn('inventory_stock_movements', 'work_order_id'))
    const hasMovementTroubleTicketId = hasMovementTable && (await hasReviewDbColumn('inventory_stock_movements', 'trouble_ticket_id'))
    const hasMovementStatus = hasMovementTable && (await hasReviewDbColumn('inventory_stock_movements', 'movement_status'))
    const hasMovementLocations =
      hasMovementTable &&
      (await hasReviewDbColumn('inventory_stock_movements', 'from_location_id')) &&
      (await hasReviewDbColumn('inventory_stock_movements', 'to_location_id')) &&
      (await hasReviewDbColumn('inventory_locations', 'id'))
    const hasMovementTechnician = hasMovementTable && (await hasReviewDbColumn('inventory_stock_movements', 'technician_user_id'))

    const workOrderWhere: string[] = []
    const workOrderValues: unknown[] = []
    if (state.mine && session?.userId && hasWorkOrderPicUserId) {
      workOrderWhere.push('wo.current_pic_user_id = ?')
      workOrderValues.push(session.userId)
    }
    if (state.q) {
      workOrderWhere.push('(wo.work_order_no LIKE ? OR wo.technician_name LIKE ?)')
      workOrderValues.push(normalizeLike(state.q), normalizeLike(state.q))
    }
    workOrderValues.push(fetchLimit)

    const workOrders = await runReviewDbQuery<WorkOrderQueueRow>(
      `
        SELECT
          wo.id AS id,
          wo.work_order_no AS workOrderNo,
          wo.work_type AS workType,
          ${hasWorkOrderJobCategory ? 'wo.job_category' : 'NULL'} AS jobCategory,
          wo.status AS status,
          ${hasWorkOrderPriority ? 'wo.priority' : 'NULL'} AS priority,
          ${hasWorkOrderSlaDueAt ? 'wo.sla_due_at' : 'NULL'} AS slaDueAt,
          ${hasWorkOrderScheduledAt ? 'wo.scheduled_at' : 'NULL'} AS scheduledAt,
          wo.technician_name AS technicianName,
          ${hasWorkOrderTroubleTicketId ? 'wo.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
          ${hasWorkOrderPicUserId ? 'au.username' : 'NULL'} AS picUsername,
          ${hasWorkOrderPicUserId ? 'au.full_name' : 'NULL'} AS picFullName,
          ${hasWorkOrderNotes ? 'wo.notes' : 'NULL'} AS notes,
          ${hasWorkOrderCreatedAt ? 'wo.created_at' : 'NULL'} AS createdAt,
          ${hasWorkOrderUpdatedAt ? 'wo.updated_at' : 'NULL'} AS updatedAt
        FROM service_work_orders wo
        ${hasWorkOrderPicUserId ? 'LEFT JOIN auth_users au ON au.id = wo.current_pic_user_id' : ''}
        ${workOrderWhere.length ? `WHERE ${workOrderWhere.join(' AND ')}` : ''}
        ORDER BY wo.id DESC
        LIMIT ?
      `,
      workOrderValues,
    )

    const troubleWhere: string[] = []
    const troubleValues: unknown[] = []
    if (state.q) {
      troubleWhere.push('(tt.ticket_code LIKE ? OR tt.customer_name LIKE ? OR tt.customer_user LIKE ?)')
      troubleValues.push(normalizeLike(state.q), normalizeLike(state.q), normalizeLike(state.q))
    }
    troubleValues.push(fetchLimit)

    const troubleTickets = await runReviewDbQuery<TroubleTicketQueueRow>(
      `
        SELECT
          tt.id AS id,
          tt.ticket_code AS ticketCode,
          tt.customer_name AS customerName,
          tt.customer_user AS customerUser,
          tt.category AS category,
          tt.type AS type,
          tt.status AS status,
          tt.opened_at AS openedAt,
          tt.updated_at AS updatedAt
        FROM support_trouble_tickets tt
        ${troubleWhere.length ? `WHERE ${troubleWhere.join(' AND ')}` : ''}
        ORDER BY tt.id DESC
        LIMIT ?
      `,
      troubleValues,
    )

    const workOrderIds = uniquePositiveIntegers(workOrders.map((row) => row.id))
    const troubleTicketIds = uniquePositiveIntegers([
      ...troubleTickets.map((row) => row.id),
      ...workOrders.map((row) => row.troubleTicketId),
    ])

    const requestRows: InventoryRequestSummaryRow[] = []
    if (hasRequestTable && (workOrderIds.length || troubleTicketIds.length) && (hasRequestWorkOrderId || hasRequestTroubleTicketId)) {
      const requestClauses: string[] = []
      const requestValues: unknown[] = []

      if (hasRequestWorkOrderId && workOrderIds.length) {
        const clause = buildInClause(workOrderIds)
        if (clause) {
          requestClauses.push(`r.work_order_id IN (${clause})`)
          requestValues.push(...workOrderIds)
        }
      }
      if (hasRequestTroubleTicketId && troubleTicketIds.length) {
        const clause = buildInClause(troubleTicketIds)
        if (clause) {
          requestClauses.push(`r.trouble_ticket_id IN (${clause})`)
          requestValues.push(...troubleTicketIds)
        }
      }

      if (requestClauses.length) {
        requestRows.push(
          ...(await runReviewDbQuery<InventoryRequestSummaryRow>(
            `
              SELECT
                r.id AS id,
                r.request_code AS requestCode,
                r.request_status AS requestStatus,
                ${hasRequestType ? 'r.request_type' : 'NULL'} AS requestType,
                r.requested_subdivision AS requestedSubdivision,
                r.requested_for AS requestedFor,
                ${hasRequestWorkOrderId ? 'r.work_order_id' : 'NULL'} AS workOrderId,
                ${hasRequestTroubleTicketId ? 'r.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
                r.requested_at AS requestedAt,
                r.completed_at AS completedAt
              FROM inventory_item_requests r
              WHERE ${requestClauses.join(' OR ')}
              ORDER BY r.id DESC
            `,
            requestValues,
          )),
        )
      }
    }

    const movementRows: MovementSummaryRow[] = []
    if (hasMovementTable && (workOrderIds.length || troubleTicketIds.length) && (hasMovementWorkOrderId || hasMovementTroubleTicketId)) {
      const movementClauses: string[] = []
      const movementValues: unknown[] = []

      if (hasMovementWorkOrderId && workOrderIds.length) {
        const clause = buildInClause(workOrderIds)
        if (clause) {
          movementClauses.push(`m.work_order_id IN (${clause})`)
          movementValues.push(...workOrderIds)
        }
      }
      if (hasMovementTroubleTicketId && troubleTicketIds.length) {
        const clause = buildInClause(troubleTicketIds)
        if (clause) {
          movementClauses.push(`m.trouble_ticket_id IN (${clause})`)
          movementValues.push(...troubleTicketIds)
        }
      }

      if (movementClauses.length) {
        movementRows.push(
          ...(await runReviewDbQuery<MovementSummaryRow>(
            `
              SELECT
                m.id AS id,
                i.item_code AS itemCode,
                i.item_name AS itemName,
                m.movement_type AS movementType,
                ${hasMovementStatus ? 'm.movement_status' : 'NULL'} AS movementStatus,
                ${hasMovementWorkOrderId ? 'm.work_order_id' : 'NULL'} AS workOrderId,
                ${hasMovementTroubleTicketId ? 'm.trouble_ticket_id' : 'NULL'} AS troubleTicketId,
                ${hasMovementLocations ? 'fl.location_code' : 'NULL'} AS fromLocationCode,
                ${hasMovementLocations ? 'fl.location_name' : 'NULL'} AS fromLocationName,
                ${hasMovementLocations ? 'tl.location_code' : 'NULL'} AS toLocationCode,
                ${hasMovementLocations ? 'tl.location_name' : 'NULL'} AS toLocationName,
                ${hasMovementTechnician ? 'tu.username' : 'NULL'} AS technicianUsername,
                ${hasMovementTechnician ? 'tu.full_name' : 'NULL'} AS technicianFullName,
                m.notes AS notes,
                m.movement_at AS movementAt
              FROM inventory_stock_movements m
              INNER JOIN inventory_items i
                ON i.id = m.item_id
              ${hasMovementTechnician ? 'LEFT JOIN auth_users tu ON tu.id = m.technician_user_id' : ''}
              ${hasMovementLocations ? 'LEFT JOIN inventory_locations fl ON fl.id = m.from_location_id' : ''}
              ${hasMovementLocations ? 'LEFT JOIN inventory_locations tl ON tl.id = m.to_location_id' : ''}
              WHERE ${movementClauses.join(' OR ')}
              ORDER BY m.id DESC
            `,
            movementValues,
          )),
        )
      }
    }

    const requestMaps = buildRequestMaps(requestRows)
    const movementMaps = buildMovementMaps(movementRows)
    const lifecycleMaps = await getLatestDeviceLifecycleMaps({
      workOrderIds,
      troubleTicketIds,
    })
    const firstWorkOrderByTroubleTicket = new Map<number, WorkOrderQueueRow>()
    const troubleTicketById = new Map<number, TroubleTicketQueueRow>()

    for (const row of workOrders) {
      if (row.troubleTicketId && !firstWorkOrderByTroubleTicket.has(row.troubleTicketId)) {
        firstWorkOrderByTroubleTicket.set(row.troubleTicketId, row)
      }
    }

    for (const row of troubleTickets) {
      troubleTicketById.set(row.id, row)
    }

    const rawItems: NocQueueItem[] = [
      ...workOrders.map((row) => {
        const linkedTroubleTicket = row.troubleTicketId ? troubleTicketById.get(row.troubleTicketId) ?? null : null
        const ticketType = detectTicketType({
          workType: row.workType,
          jobCategory: row.jobCategory,
          sourceType: 'WORK_ORDER',
        })
        const request = requestMaps.byWorkOrder.get(row.id) ?? (row.troubleTicketId ? requestMaps.byTroubleTicket.get(row.troubleTicketId) ?? null : null)
        const movement = movementMaps.byWorkOrder.get(row.id) ?? (row.troubleTicketId ? movementMaps.byTroubleTicket.get(row.troubleTicketId) ?? null : null)
        const lifecycle =
          lifecycleMaps.byWorkOrder.get(row.id) ??
          (row.troubleTicketId ? lifecycleMaps.byTroubleTicket.get(row.troubleTicketId) ?? null : null)
        const deviceState =
          mapLifecycleDeviceState(lifecycle?.lifecycleStatus) ?? mapMovementDeviceState(movement) ?? mapRequestDeviceState(request)
        const queueStartedAt = resolveQueueStartedAt({
          sourceType: 'WORK_ORDER',
          createdAt: row.createdAt,
          scheduledAt: row.scheduledAt,
        })
        const slaSnapshot = buildSlaSnapshot({
          startedAt: queueStartedAt,
          dueAt: row.slaDueAt,
          ticketType,
          priority: row.priority,
        })

        const item: NocQueueItem = {
          queueKey: `WO-${row.id}`,
          sourceType: 'WORK_ORDER',
          sourceId: row.id,
          ticketNo: row.workOrderNo,
          ticketType,
          queueStatus: normalizeQueueStatus(row.status),
          rawStatus: row.status,
          customerName: linkedTroubleTicket?.customerName ?? null,
          customerUser: linkedTroubleTicket?.customerUser ?? null,
          workOrderId: row.id,
          troubleTicketId: row.troubleTicketId,
          priority: row.priority,
          technicianName: row.technicianName,
          picName: row.picFullName ?? null,
          picUsername: row.picUsername ?? null,
          supportLaneLabel: resolveSupportLaneLabel(ticketType),
          requestCode: request?.requestCode ?? null,
          requestStatus: request?.requestStatus ?? null,
          requestRequestedFor: request?.requestedFor ?? null,
          deviceState,
          deviceLifecycleStatus: lifecycle?.lifecycleStatus ?? null,
          deviceValidationStatus: lifecycle?.validationStatus ?? null,
          deviceTicketRef: lifecycle?.ticketRef ?? row.workOrderNo ?? null,
          deviceHandoverFrom: lifecycle?.handoverFromLabel ?? null,
          deviceHandoverTo: lifecycle?.handoverToLabel ?? null,
          deviceHandoverProofType: lifecycle?.handoverProofType ?? null,
          deviceHandoverProofRef: lifecycle?.handoverProofRef ?? null,
          deviceItemLabel:
            lifecycle && (lifecycle.itemCode || lifecycle.itemName)
              ? [lifecycle.itemCode, lifecycle.itemName].filter(Boolean).join(' | ')
              : movement
                ? [movement.itemCode, movement.itemName].filter(Boolean).join(' | ')
                : null,
          deviceLocationLabel: lifecycle?.locationName ?? lifecycle?.targetTeam ?? buildMovementLocationLabel(movement),
          deviceLastActor: lifecycle?.actorName ?? null,
          queueStartedAt,
          ageHours: slaSnapshot.ageHours,
          ageLabel: slaSnapshot.ageLabel,
          slaState: slaSnapshot.slaState,
          slaLabel: slaSnapshot.slaLabel,
          operationalBadges: resolveOperationalBadges({
            requestStatus: request?.requestStatus ?? null,
            deviceState,
            queueStatus: normalizeQueueStatus(row.status),
            ticketType,
          }),
          lastUpdateAt: pickMostRecentDate(lifecycle?.createdAt, movement?.movementAt, request?.completedAt, request?.requestedAt, row.updatedAt, row.scheduledAt, row.createdAt),
          href: `/dashboard/tracking/work-orders/${row.id}`,
        }

        return item
      }),
      ...troubleTickets.map((row) => {
        const linkedWorkOrder = firstWorkOrderByTroubleTicket.get(row.id) ?? null
        const ticketType = detectTicketType({
          category: row.category,
          type: row.type,
          jobCategory: linkedWorkOrder?.jobCategory ?? null,
          workType: linkedWorkOrder?.workType ?? null,
          sourceType: 'TROUBLE_TICKET',
        })
        const request = requestMaps.byTroubleTicket.get(row.id) ?? (linkedWorkOrder ? requestMaps.byWorkOrder.get(linkedWorkOrder.id) ?? null : null)
        const movement = movementMaps.byTroubleTicket.get(row.id) ?? (linkedWorkOrder ? movementMaps.byWorkOrder.get(linkedWorkOrder.id) ?? null : null)
        const lifecycle =
          lifecycleMaps.byTroubleTicket.get(row.id) ??
          (linkedWorkOrder ? lifecycleMaps.byWorkOrder.get(linkedWorkOrder.id) ?? null : null)
        const deviceState =
          mapLifecycleDeviceState(lifecycle?.lifecycleStatus) ?? mapMovementDeviceState(movement) ?? mapRequestDeviceState(request)
        const queueStartedAt = resolveQueueStartedAt({
          sourceType: 'TROUBLE_TICKET',
          createdAt: linkedWorkOrder?.createdAt ?? null,
          openedAt: row.openedAt,
        })
        const slaSnapshot = buildSlaSnapshot({
          startedAt: queueStartedAt,
          dueAt: linkedWorkOrder?.slaDueAt ?? null,
          ticketType,
          priority: linkedWorkOrder?.priority ?? null,
        })

        const item: NocQueueItem = {
          queueKey: `TT-${row.id}`,
          sourceType: 'TROUBLE_TICKET',
          sourceId: row.id,
          ticketNo: row.ticketCode,
          ticketType,
          queueStatus: normalizeQueueStatus(row.status),
          rawStatus: row.status,
          customerName: row.customerName,
          customerUser: row.customerUser,
          workOrderId: linkedWorkOrder?.id ?? null,
          troubleTicketId: row.id,
          priority: linkedWorkOrder?.priority ?? null,
          technicianName: linkedWorkOrder?.technicianName ?? null,
          picName: linkedWorkOrder?.picFullName ?? null,
          picUsername: linkedWorkOrder?.picUsername ?? null,
          supportLaneLabel: resolveSupportLaneLabel(ticketType),
          requestCode: request?.requestCode ?? null,
          requestStatus: request?.requestStatus ?? null,
          requestRequestedFor: request?.requestedFor ?? null,
          deviceState,
          deviceLifecycleStatus: lifecycle?.lifecycleStatus ?? null,
          deviceValidationStatus: lifecycle?.validationStatus ?? null,
          deviceTicketRef: lifecycle?.ticketRef ?? row.ticketCode ?? null,
          deviceHandoverFrom: lifecycle?.handoverFromLabel ?? null,
          deviceHandoverTo: lifecycle?.handoverToLabel ?? null,
          deviceHandoverProofType: lifecycle?.handoverProofType ?? null,
          deviceHandoverProofRef: lifecycle?.handoverProofRef ?? null,
          deviceItemLabel:
            lifecycle && (lifecycle.itemCode || lifecycle.itemName)
              ? [lifecycle.itemCode, lifecycle.itemName].filter(Boolean).join(' | ')
              : movement
                ? [movement.itemCode, movement.itemName].filter(Boolean).join(' | ')
                : null,
          deviceLocationLabel: lifecycle?.locationName ?? lifecycle?.targetTeam ?? buildMovementLocationLabel(movement),
          deviceLastActor: lifecycle?.actorName ?? null,
          queueStartedAt,
          ageHours: slaSnapshot.ageHours,
          ageLabel: slaSnapshot.ageLabel,
          slaState: slaSnapshot.slaState,
          slaLabel: slaSnapshot.slaLabel,
          operationalBadges: resolveOperationalBadges({
            requestStatus: request?.requestStatus ?? null,
            deviceState,
            queueStatus: normalizeQueueStatus(row.status),
            ticketType,
          }),
          lastUpdateAt: pickMostRecentDate(lifecycle?.createdAt, movement?.movementAt, request?.completedAt, request?.requestedAt, linkedWorkOrder?.updatedAt, row.updatedAt, row.openedAt),
          href: `/dashboard/tracking/trouble-tickets/${row.id}`,
        }

        return item
      }),
    ]

    const preFiltered = rawItems.filter((item: NocQueueItem) =>
      state.mine && session?.username
        ? normalizeText(item.picUsername) === normalizeText(session.username)
        : true,
    )

    const otherItems = preFiltered
      .filter((item) => item.ticketType === 'OTHER')
      .filter((item) => (state.ticketType ? item.ticketType === state.ticketType : true))
      .filter((item) => (state.queueStatus ? item.queueStatus === state.queueStatus : true))
      .filter((item) => (state.slaState ? item.slaState === state.slaState : true))
      .slice(0, 50)

    const items = preFiltered
      .filter((item) => item.ticketType !== 'OTHER')
      .filter((item) => (state.ticketType ? item.ticketType === state.ticketType : true))
      .filter((item) => (state.queueStatus ? item.queueStatus === state.queueStatus : true))
      .filter((item) => (state.slaState ? item.slaState === state.slaState : true))
      .sort((left, right) => {
        const bySla = getSlaPriority(right.slaState) - getSlaPriority(left.slaState)
        if (bySla !== 0) {
          return bySla
        }

        const byQueue = getQueuePriority(right.queueStatus) - getQueuePriority(left.queueStatus)
        if (byQueue !== 0) {
          return byQueue
        }

        const byPriority =
          resolveFallbackSlaHours(left.ticketType, left.priority) -
          resolveFallbackSlaHours(right.ticketType, right.priority)
        if (byPriority !== 0) {
          return byPriority
        }

        return String(right.lastUpdateAt ?? '').localeCompare(String(left.lastUpdateAt ?? ''))
      })
      .slice(0, state.limit)

    return { source, items, otherItems, error: null as string | null, state }
  } catch (error) {
    return {
      source: getFallbackDataSource(source, error),
      items: [] as NocQueueItem[],
      otherItems: [] as NocQueueItem[],
      error: getReviewDbErrorDetail(error),
      state,
    }
  }
}
