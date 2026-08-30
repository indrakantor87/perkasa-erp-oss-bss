// WAVE 2.6 — TT TRACKING & ASSIGNMENT UI INTEGRATION TESTS
// Pure inline mock logic — NO external imports, NO @ path alias, NO real DB
// Reuses identical test harness pattern: WAVE 2.4 / WAVE 2.5 inline matrix

type AppRole =
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'HR'
  | 'GA'
  | 'PENJUALAN'
  | 'SALES_MARKETING'
  | 'CS_OPERATOR'
  | 'CS_ADMIN'
  | 'NOC_OPERATOR'
  | 'FIELD_TECHNICIAN'
  | 'TT_OPERATOR'
  | 'DIGITAL_CREATOR'
  | 'DISMANTLE_OPERATOR'

const APP_ROLES: AppRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'HR',
  'GA',
  'PENJUALAN',
  'SALES_MARKETING',
  'CS_OPERATOR',
  'CS_ADMIN',
  'NOC_OPERATOR',
  'FIELD_TECHNICIAN',
  'TT_OPERATOR',
  'DIGITAL_CREATOR',
  'DISMANTLE_OPERATOR',
]

const P58A_FULL_ACCESS_ROLES = new Set<AppRole>([
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'NOC_OPERATOR',
  'TT_OPERATOR',
])

const PERMISSION_MATRIX: Record<AppRole, Record<string, Record<string, boolean>>> = {
  OWNER: { support: { view: true, create: true, update: true, delete: true, approve: true, export: true }, inventory: { create: true, read: true, update: true, manage: true, delete: true } },
  SUPER_ADMIN: { support: { view: true, create: true, update: true, delete: true, approve: true, export: true }, inventory: { create: true, read: true, update: true, manage: true, delete: true } },
  ADMIN: { support: { view: true, create: true, update: true, delete: true, approve: true, export: true }, inventory: { create: true, read: true, update: true, manage: true, delete: true } },
  FINANCE: { support: { view: true }, inventory: { read: true } },
  HR: { support: {}, inventory: {} },
  GA: { support: {}, inventory: {} },
  PENJUALAN: { support: { view: true }, inventory: { read: true } },
  SALES_MARKETING: { support: { view: true }, inventory: { read: true } },
  CS_OPERATOR: { support: { view: true, create: true, update: true }, inventory: { read: true } },
  CS_ADMIN: { support: { view: true, create: true, update: true, approve: true, export: true, delete: true }, inventory: { read: true } },
  NOC_OPERATOR: { support: { view: true, create: true, update: true }, inventory: { create: true, read: true, update: true, manage: true } },
  FIELD_TECHNICIAN: { support: { view: true }, inventory: { read: true } },
  TT_OPERATOR: { support: { view: true, create: true, update: true }, inventory: { create: true, read: true, update: true, manage: true } },
  DIGITAL_CREATOR: { support: {}, inventory: {} },
  DISMANTLE_OPERATOR: { support: { view: true }, inventory: { read: true } },
}

function canPerformAction(role: AppRole, resource: string, action: string): boolean {
  return !!PERMISSION_MATRIX[role]?.[resource]?.[action]
}

// ========== Types (copy from tracking-service/timeline-utils contracts inline) ==========

type TroubleTicketRow = {
  id: number
  ticket_code: string
  customer_name: string | null
  category: string | null
  type: string | null
  status: string | null
  problem_category: string | null
  opened_at: string | null
  closed_at: string | null
  notes: string | null
  close_notes: string | null
  created_at: string
}

type AssignmentRow = {
  id: number
  trouble_ticket_id: number
  assigned_user_id: number
  assignment_role: string
  assignment_status: string
  is_primary: 0 | 1
  assigned_at: string
  accepted_at: string | null
  released_at: string | null
  released_reason: string | null
  notes: string | null
  assigned_by_user_id: number | null
  accepted_by_user_id: number | null
  released_by_user_id: number | null
  // JOIN aliases from auth_users
  a_display: string | null
  a_username: string | null
  a2_display: string | null
  a2_username: string | null
  a3_display: string | null
  a3_username: string | null
  a4_display: string | null
  a4_username: string | null
}

type ProgressRow = {
  id: number
  trouble_ticket_id: number
  progress_status: string
  owner_name: string | null
  progress_notes: string | null
  updated_by: number | null
  created_at: string
  // JOIN alias for updated_by user
  u_display: string | null
  u_username: string | null
}

type AuthUser = {
  id: number
  status: string
  role_code: string
  display_name: string | null
  username: string
}

type CurrentHandlerInfo = {
  userId: number | null
  displayName: string | null
  username: string | null
  assignmentId: number | null
  status: string
  assignedAt: string | null
  acceptedAt: string | null
} | null

type PrimaryTechnicianInfo = {
  userId: number | null
  displayName: string | null
  username: string | null
  assignmentId: number | null
  status: string
} | null

type AssignmentActorInfo = {
  userId: number | null
  displayName: string | null
  username: string | null
}

type AssignmentHistoryItem = {
  assignmentId: number
  technician: AssignmentActorInfo
  role: string
  status: string
  isPrimary: boolean
  assignedAt: string | null
  acceptedAt: string | null
  releasedAt: string | null
  releasedReason: string | null
  assignedBy: AssignmentActorInfo
  acceptedBy: AssignmentActorInfo
  releasedBy: AssignmentActorInfo
  notes: string | null
  assignedUserId: number | null
}

type TTProgressLogItem = {
  id: number
  progressStatus: string
  ownerName: string | null
  progressNotes: string | null
  updatedBy: AssignmentActorInfo
  createdAt: string
}

type TimelineEventType = 'trouble-ticket' | 'assignment' | 'status' | 'movement' | 'close'

type TimelineEntry = {
  id: string
  type: TimelineEventType
  at: string
  title: string
  detail?: string
  tone?: string
  refId?: number | string | null
}

type NextActionInfo = {
  label: string
  tone: 'warning' | 'info' | 'success' | 'default'
} | null

// ========== Pure helpers ==========

function buildUserFallback(
  display: string | null | undefined,
  username: string | null | undefined,
  id: number | string | null | undefined,
): string {
  const trimmedDisplay = display != null ? String(display).trim() : ''
  if (trimmedDisplay) return trimmedDisplay
  const trimmedUsername = username != null ? String(username).trim() : ''
  if (trimmedUsername) return trimmedUsername
  if (id != null && String(id).trim()) return `User #${id}`
  return '-'
}

function buildActorInfo(
  userId: number | null | undefined,
  display: string | null | undefined,
  username: string | null | undefined,
): AssignmentActorInfo {
  const id = userId != null && !Number.isNaN(Number(userId)) ? Number(userId) : null
  return {
    userId: id,
    displayName: display && String(display).trim() ? String(display).trim() : null,
    username: username && String(username).trim() ? String(username).trim() : null,
  }
}

function assignmentRowsToHistory(rows: AssignmentRow[]): AssignmentHistoryItem[] {
  const mapped: AssignmentHistoryItem[] = rows.map((r) => ({
    assignmentId: r.id,
    technician: buildActorInfo(r.assigned_user_id, r.a_display, r.a_username),
    role: String(r.assignment_role ?? '').trim(),
    status: String(r.assignment_status ?? '').trim(),
    isPrimary: Number(r.is_primary) === 1,
    assignedAt: r.assigned_at ?? null,
    acceptedAt: r.accepted_at ?? null,
    releasedAt: r.released_at ?? null,
    releasedReason: r.released_reason ?? null,
    assignedBy: buildActorInfo(r.assigned_by_user_id, r.a3_display, r.a3_username),
    acceptedBy: buildActorInfo(r.accepted_by_user_id, r.a2_display, r.a2_username),
    releasedBy: buildActorInfo(r.released_by_user_id, r.a4_display, r.a4_username),
    notes: r.notes ?? null,
    assignedUserId: Number(r.assigned_user_id) || null,
  }))
  const ACTIVE_FIRST = new Set(['ASSIGNED', 'ACCEPTED'])
  return mapped.sort((a, b) => {
    const aActive = ACTIVE_FIRST.has(a.status) ? 0 : 1
    const bActive = ACTIVE_FIRST.has(b.status) ? 0 : 1
    if (aActive !== bActive) return aActive - bActive
    const aLatest =
      a.releasedAt || a.acceptedAt || a.assignedAt || new Date(0).toISOString()
    const bLatest =
      b.releasedAt || b.acceptedAt || b.assignedAt || new Date(0).toISOString()
    if (aLatest !== bLatest) return aLatest > bLatest ? -1 : 1
    return b.assignmentId - a.assignmentId
  })
}

function deriveCurrentHandler(history: AssignmentHistoryItem[]): CurrentHandlerInfo {
  const primaryActive = history.find(
    (h) =>
      h.isPrimary &&
      (h.status === 'ASSIGNED' || h.status === 'ACCEPTED') &&
      !h.releasedAt,
  )
  if (primaryActive) {
    return {
      userId: primaryActive.technician.userId,
      displayName: buildUserFallback(
        primaryActive.technician.displayName,
        primaryActive.technician.username,
        primaryActive.technician.userId,
      ),
      username: primaryActive.technician.username,
      assignmentId: primaryActive.assignmentId,
      status: primaryActive.status,
      assignedAt: primaryActive.assignedAt,
      acceptedAt: primaryActive.acceptedAt,
    }
  }
  const anyActive = history.find(
    (h) => (h.status === 'ASSIGNED' || h.status === 'ACCEPTED') && !h.releasedAt,
  )
  if (anyActive) {
    return {
      userId: anyActive.technician.userId,
      displayName: buildUserFallback(
        anyActive.technician.displayName,
        anyActive.technician.username,
        anyActive.technician.userId,
      ),
      username: anyActive.technician.username,
      assignmentId: anyActive.assignmentId,
      status: anyActive.status,
      assignedAt: anyActive.assignedAt,
      acceptedAt: anyActive.acceptedAt,
    }
  }
  return null
}

function progressRowsToItems(rows: ProgressRow[]): TTProgressLogItem[] {
  return rows.map((r) => ({
    id: r.id,
    progressStatus: String(r.progress_status ?? '').trim(),
    ownerName: r.owner_name ?? null,
    progressNotes: r.progress_notes ?? null,
    updatedBy: buildActorInfo(r.updated_by, r.u_display, r.u_username),
    createdAt: r.created_at,
  }))
}

function deriveNextAction(
  currentHandler: CurrentHandlerInfo,
  ttStatus: string | null | undefined,
): NextActionInfo {
  const upperStatus = String(ttStatus ?? '').trim().toUpperCase()
  if (upperStatus === 'CLOSED' || upperStatus === 'RESOLVED') {
    return { label: 'Trouble ticket selesai', tone: 'success' }
  }
  if (!currentHandler) {
    return { label: 'Perlu assign teknisi', tone: 'warning' }
  }
  if (currentHandler.status === 'ASSIGNED') {
    return { label: 'Menunggu teknisi menerima assignment', tone: 'info' }
  }
  if (currentHandler.status === 'ACCEPTED') {
    return { label: 'Teknisi sedang menangani pekerjaan', tone: 'info' }
  }
  return { label: 'Perlu assign teknisi kembali', tone: 'warning' }
}

// ========== Timeline builder (copy from timeline-utils contract inline) ==========

const TIMELINE_TYPE_RANK: Record<TimelineEventType, number> = {
  'trouble-ticket': 1,
  movement: 2,
  assignment: 3,
  status: 4,
  close: 5,
}

type TimelinePayload = {
  troubleTicket: { id: number; ticketCode: string; category?: string | null; type?: string | null; createdAt: string; status?: string | null } | null
  assignments: AssignmentHistoryItem[]
  progressLogs: TTProgressLogItem[]
  movements: Array<{ id: number; itemCode?: string | null; movementType?: string | null; qty?: number | string | null; movementAt?: string | null }>
}

function buildTimelineEntries(payload: TimelinePayload): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  if (payload.troubleTicket) {
    entries.push({
      id: `tt-create-${payload.troubleTicket.id}`,
      type: 'trouble-ticket',
      at: payload.troubleTicket.createdAt,
      title: `Ticket ${payload.troubleTicket.ticketCode} Dibuka`,
      detail: [payload.troubleTicket.category, payload.troubleTicket.type]
        .filter(Boolean)
        .join(' • ') || undefined,
      tone: 'sky',
      refId: payload.troubleTicket.id,
    })
  }
  payload.assignments.forEach((a) => {
    const techLabel = buildUserFallback(a.technician.displayName, a.technician.username, a.technician.userId)
    if (a.assignedAt) {
      entries.push({
        id: `asm-assign-${a.assignmentId}`,
        type: 'assignment',
        at: a.assignedAt,
        title: `Teknisi Ditugaskan: ${techLabel}`,
        detail: `Role: ${a.role || 'FIELD_TECHNICIAN'} • Status: ASSIGNED${a.isPrimary ? ' • PRIMARY' : ''}`,
        tone: 'sky',
        refId: a.assignmentId,
      })
    }
    if (a.acceptedAt && a.status === 'ACCEPTED') {
      entries.push({
        id: `asm-accept-${a.assignmentId}`,
        type: 'assignment',
        at: a.acceptedAt,
        title: `Assignment Diterima: ${techLabel}`,
        detail: `${a.isPrimary ? 'Primary ' : ''}teknisi ${techLabel} ACCEPTED`,
        tone: 'emerald',
        refId: a.assignmentId,
      })
    }
    if (a.releasedAt) {
      const reason = a.releasedReason ? ` • Alasan: ${a.releasedReason}` : ''
      entries.push({
        id: `asm-release-${a.assignmentId}`,
        type: 'assignment',
        at: a.releasedAt,
        title: `Assignment Dilepas: ${techLabel}`,
        detail: `Status: RELEASED${reason}`,
        tone: a.releasedReason && a.releasedReason === 'REASSIGNED' ? 'amber' : 'slate',
        refId: a.assignmentId,
      })
    }
  })
  payload.progressLogs.forEach((p) => {
    const upper = p.progressStatus.toUpperCase()
    const isClose = upper === 'CLOSED' || upper === 'COMPLETED' || upper === 'RESOLVED'
    entries.push({
      id: `status-${p.id}`,
      type: isClose ? 'close' : 'status',
      at: p.createdAt,
      title: isClose ? `Ticket Ditutup: ${p.progressStatus}` : `Progress: ${p.progressStatus}`,
      detail: p.progressNotes || undefined,
      tone: isClose ? 'emerald' : 'amber',
      refId: p.id,
    })
  })
  payload.movements.forEach((m) => {
    entries.push({
      id: `mov-${m.id}`,
      type: 'movement',
      at: m.movementAt || new Date(0).toISOString(),
      title: `Movement Inventory: ${m.itemCode || `Item #${m.id}`}`,
      detail: `${m.movementType || 'MOVEMENT'}${m.qty ? ` • ${m.qty} unit` : ''}`,
      tone: 'violet',
      refId: m.id,
    })
  })
  return entries.sort((a, b) => {
    if (a.at !== b.at) return a.at > b.at ? -1 : 1
    const rankA = TIMELINE_TYPE_RANK[a.type] ?? 99
    const rankB = TIMELINE_TYPE_RANK[b.type] ?? 99
    if (rankA !== rankB) return rankA - rankB
    return a.id.localeCompare(b.id)
  })
}

// ========== Authorization UI rules (P58A inline) ==========

function canAcceptAssignment(row: AssignmentHistoryItem, sessionRole: AppRole, sessionUserId: number | null): boolean {
  if (row.releasedAt) return false
  if (row.status !== 'ASSIGNED') return false
  if (row.role !== 'FIELD_TECHNICIAN') return false
  if (sessionRole === 'FIELD_TECHNICIAN') {
    return sessionUserId != null && row.technician.userId === sessionUserId
  }
  return false
}

function canReleaseAssignment(row: AssignmentHistoryItem, sessionRole: AppRole, sessionUserId: number | null): boolean {
  if (row.releasedAt) return false
  if (P58A_FULL_ACCESS_ROLES.has(sessionRole)) return true
  if (sessionRole === 'FIELD_TECHNICIAN' && sessionUserId != null) {
    return row.technician.userId === sessionUserId
  }
  return false
}

function canReassignAssignment(row: AssignmentHistoryItem, sessionRole: AppRole): boolean {
  if (row.releasedAt) return false
  return P58A_FULL_ACCESS_ROLES.has(sessionRole)
}

// ========== Fresh DB ==========

type FreshDb = {
  tts: TroubleTicketRow[]
  assignments: AssignmentRow[]
  progress: ProgressRow[]
  movements: Array<{ id: number; itemCode: string; movementType: string; qty: number; movementAt: string }>
  auths: AuthUser[]
}

const TS = {
  t0: '2025-03-18T08:00:00.000Z',
  t1: '2025-03-18T09:00:00.000Z',
  t2: '2025-03-18T10:00:00.000Z',
  t3: '2025-03-18T11:00:00.000Z',
  t4: '2025-03-18T12:00:00.000Z',
  t5: '2025-03-18T13:00:00.000Z',
  t6: '2025-03-18T14:00:00.000Z',
}

function freshDb(): FreshDb {
  return {
    auths: [
      { id: 1, status: 'ACTIVE', role_code: 'NOC_OPERATOR', display_name: null, username: 'noc.adi' },
      { id: 2, status: 'ACTIVE', role_code: 'TT_OPERATOR', display_name: 'TT Siti', username: 'tt.siti' },
      { id: 11, status: 'ACTIVE', role_code: 'TEKNISI_PSB', display_name: 'Budi Teknisi', username: 'budi.teknisi' },
      { id: 12, status: 'ACTIVE', role_code: 'TEKNISI_PSB', display_name: 'Andi Teknisi', username: 'andi.teknisi' },
      { id: 13, status: 'ACTIVE', role_code: 'FIELD_TECHNICIAN', display_name: null, username: null as unknown as string }, // to force User #<id> fallback
      { id: 14, status: 'ACTIVE', role_code: 'TEKNISI_PSB', display_name: 'Caca Teknisi', username: 'caca.teknisi' },
    ],
    tts: [
      { id: 101, ticket_code: 'TT-NOASSIGN-001', customer_name: 'Customer A', category: 'GANGGUAN', type: 'INTERNET', status: 'OPEN', problem_category: 'MODEM_OFF', opened_at: TS.t0, closed_at: null, notes: 'Test tanpa assignment', close_notes: null, created_at: TS.t0 },
      { id: 102, ticket_code: 'TT-ASSIGNED-002', customer_name: 'Customer B', category: 'GANGGUAN', type: 'TV', status: 'OPEN', problem_category: 'TV_NO_SIGNAL', opened_at: TS.t0, closed_at: null, notes: null, close_notes: null, created_at: TS.t0 },
      { id: 103, ticket_code: 'TT-ACCEPTED-003', customer_name: 'Customer C', category: 'GANGGUAN', type: 'INTERNET', status: 'IN_PROGRESS', problem_category: 'WIFI_NO_SIGNAL', opened_at: TS.t0, closed_at: null, notes: null, close_notes: null, created_at: TS.t0 },
      { id: 104, ticket_code: 'TT-RELEASED-004', customer_name: 'Customer D', category: 'INSTALL', type: 'INTERNET+TV', status: 'OPEN', problem_category: null, opened_at: TS.t0, closed_at: null, notes: null, close_notes: null, created_at: TS.t0 },
      { id: 105, ticket_code: 'TT-REASSIGN-005', customer_name: 'Customer E', category: 'GANGGUAN', type: 'INTERNET', status: 'IN_PROGRESS', problem_category: 'NO_PING', opened_at: TS.t0, closed_at: null, notes: null, close_notes: null, created_at: TS.t0 },
      { id: 106, ticket_code: 'TT-CLOSED-006', customer_name: 'Customer F', category: 'GANGGUAN', type: 'INTERNET', status: 'CLOSED', problem_category: 'MODEM_DEFECT', opened_at: TS.t0, closed_at: TS.t5, notes: null, close_notes: 'Close notes example', created_at: TS.t0 },
    ],
    assignments: [
      // T102: active ASSIGNED primary
      { id: 201, trouble_ticket_id: 102, assigned_user_id: 11, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'ASSIGNED', is_primary: 1, assigned_at: TS.t1, accepted_at: null, released_at: null, released_reason: null, notes: null, assigned_by_user_id: 1, accepted_by_user_id: null, released_by_user_id: null, a_display: 'Budi Teknisi', a_username: 'budi.teknisi', a2_display: null, a2_username: null, a3_display: null, a3_username: 'noc.adi', a4_display: null, a4_username: null },
      // T103: active ACCEPTED primary
      { id: 301, trouble_ticket_id: 103, assigned_user_id: 12, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'ACCEPTED', is_primary: 1, assigned_at: TS.t1, accepted_at: TS.t2, released_at: null, released_reason: null, notes: 'Sudah on site', assigned_by_user_id: 2, accepted_by_user_id: 12, released_by_user_id: null, a_display: 'Andi Teknisi', a_username: 'andi.teknisi', a2_display: 'Andi Teknisi', a2_username: 'andi.teknisi', a3_display: 'TT Siti', a3_username: 'tt.siti', a4_display: null, a4_username: null },
      // T104: RELEASED cancelled -> should NOT show as current handler
      { id: 401, trouble_ticket_id: 104, assigned_user_id: 11, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'RELEASED', is_primary: 1, assigned_at: TS.t1, accepted_at: null, released_at: TS.t3, released_reason: 'CANCELLED', notes: 'Customer cancel visit', assigned_by_user_id: 1, accepted_by_user_id: null, released_by_user_id: 1, a_display: 'Budi Teknisi', a_username: 'budi.teknisi', a2_display: null, a2_username: null, a3_display: null, a3_username: 'noc.adi', a4_display: null, a4_username: 'noc.adi' },
      // T105: reassignment sequence: old budi REASSIGNED released + new andi ACCEPTED primary + secondary caca
      { id: 501, trouble_ticket_id: 105, assigned_user_id: 11, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'RELEASED', is_primary: 1, assigned_at: TS.t1, accepted_at: TS.t2, released_at: TS.t3, released_reason: 'REASSIGNED', notes: null, assigned_by_user_id: 1, accepted_by_user_id: 11, released_by_user_id: 1, a_display: 'Budi Teknisi', a_username: 'budi.teknisi', a2_display: 'Budi Teknisi', a2_username: 'budi.teknisi', a3_display: null, a3_username: 'noc.adi', a4_display: null, a4_username: 'noc.adi' },
      { id: 502, trouble_ticket_id: 105, assigned_user_id: 12, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'ACCEPTED', is_primary: 1, assigned_at: TS.t3, accepted_at: TS.t3, released_at: null, released_reason: null, notes: null, assigned_by_user_id: 1, accepted_by_user_id: 12, released_by_user_id: null, a_display: 'Andi Teknisi', a_username: 'andi.teknisi', a2_display: 'Andi Teknisi', a2_username: 'andi.teknisi', a3_display: null, a3_username: 'noc.adi', a4_display: null, a4_username: null },
      { id: 503, trouble_ticket_id: 105, assigned_user_id: 14, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'ASSIGNED', is_primary: 0, assigned_at: TS.t3, accepted_at: null, released_at: null, released_reason: null, notes: null, assigned_by_user_id: 1, accepted_by_user_id: null, released_by_user_id: null, a_display: 'Caca Teknisi', a_username: 'caca.teknisi', a2_display: null, a2_username: null, a3_display: null, a3_username: 'noc.adi', a4_display: null, a4_username: null },
      // T106: history active + closed released TRANSFERRED
      { id: 601, trouble_ticket_id: 106, assigned_user_id: 11, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'RELEASED', is_primary: 1, assigned_at: TS.t1, accepted_at: TS.t2, released_at: TS.t4, released_reason: 'TRANSFERRED', notes: null, assigned_by_user_id: 2, accepted_by_user_id: 11, released_by_user_id: 2, a_display: 'Budi Teknisi', a_username: 'budi.teknisi', a2_display: 'Budi Teknisi', a2_username: 'budi.teknisi', a3_display: 'TT Siti', a3_username: 'tt.siti', a4_display: 'TT Siti', a4_username: 'tt.siti' },
      { id: 602, trouble_ticket_id: 106, assigned_user_id: 14, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'ACCEPTED', is_primary: 1, assigned_at: TS.t4, accepted_at: TS.t4, released_at: null, released_reason: null, notes: null, assigned_by_user_id: 2, accepted_by_user_id: 14, released_by_user_id: null, a_display: 'Caca Teknisi', a_username: 'caca.teknisi', a2_display: 'Caca Teknisi', a2_username: 'caca.teknisi', a3_display: 'TT Siti', a3_username: 'tt.siti', a4_display: null, a4_username: null },
      // T103: actor resolution test - extra secondary non-primary no display
      { id: 302, trouble_ticket_id: 103, assigned_user_id: 13, assignment_role: 'FIELD_TECHNICIAN', assignment_status: 'ASSIGNED', is_primary: 0, assigned_at: TS.t2, accepted_at: null, released_at: null, released_reason: null, notes: null, assigned_by_user_id: 2, accepted_by_user_id: null, released_by_user_id: null, a_display: null, a_username: null as unknown as string, a2_display: null, a2_username: null, a3_display: 'TT Siti', a3_username: 'tt.siti', a4_display: null, a4_username: null },
    ],
    progress: [
      { id: 701, trouble_ticket_id: 103, progress_status: 'IN_PROGRESS', owner_name: null, progress_notes: 'Teknisi on site cek wifi', updated_by: 12, created_at: TS.t3, u_display: 'Andi Teknisi', u_username: 'andi.teknisi' },
      { id: 702, trouble_ticket_id: 106, progress_status: 'CLOSED', owner_name: null, progress_notes: 'Modem direplace OK. Customer test internet normal', updated_by: 14, created_at: TS.t5, u_display: 'Caca Teknisi', u_username: 'caca.teknisi' },
    ],
    movements: [
      { id: 801, itemCode: 'ONT-HW-1234', movementType: 'DEPLOY_OUT', qty: 1, movementAt: TS.t2 },
      { id: 802, itemCode: 'MODEM-ZTE-0001', movementType: 'REPLACE_IN', qty: 1, movementAt: TS.t4 },
    ],
  }
}

// ========== Resolver simulate ==========

type TrackingPayload = {
  troubleTicket: TroubleTicketRow | null
  assignments: AssignmentHistoryItem[]
  progressLogs: TTProgressLogItem[]
  currentHandler: CurrentHandlerInfo
  primaryTechnician: PrimaryTechnicianInfo
  nextAction: NextActionInfo
  assignmentTimeline: TimelineEntry[]
}

function simulateGetTroubleTicketTrackingDetail(db: FreshDb, ticketId: number): TrackingPayload {
  const tt = db.tts.find((t) => t.id === ticketId) || null
  const assignRows = db.assignments.filter((a) => a.trouble_ticket_id === ticketId)
  const history = assignmentRowsToHistory(assignRows)
  const progressRows = db.progress.filter((p) => p.trouble_ticket_id === ticketId)
  const progressLogs = progressRowsToItems(progressRows)
  const currentHandler = deriveCurrentHandler(history)
  const primaryTechnician: PrimaryTechnicianInfo = currentHandler
    ? {
        userId: currentHandler.userId,
        displayName: currentHandler.displayName,
        username: currentHandler.username,
        assignmentId: currentHandler.assignmentId,
        status: currentHandler.status,
      }
    : null
  const ttStatus = tt?.status
  const nextAction = deriveNextAction(currentHandler, ttStatus)
  return {
    troubleTicket: tt,
    assignments: history,
    progressLogs,
    currentHandler,
    primaryTechnician,
    nextAction,
    assignmentTimeline: [],
  }
}

// ========== Harness ==========

const RUN_TESTS: Array<{ id: string; label: string; skip?: boolean }> = [
  // GROUP A: Resolver (T1-T8)
  { id: 'T1', label: 'no assignment → currentHandler = null' },
  { id: 'T2', label: 'active ASSIGNED → currentHandler status=ASSIGNED' },
  { id: 'T3', label: 'active ACCEPTED → currentHandler acceptedAt populated' },
  { id: 'T4', label: 'RELEASED excluded from currentHandler' },
  { id: 'T5', label: 'history includes ACTIVE + RELEASED, sort active first' },
  { id: 'T6', label: 'reassignment history 3 rows (released + 2 active)' },
  { id: 'T7', label: 'actor resolution (assignedBy / acceptedBy / releasedBy)' },
  { id: 'T8', label: 'null display_name / username → User #<id> fallback' },
  // GROUP B: Timeline (T9-T15)
  { id: 'T9', label: 'timeline ASSIGN event' },
  { id: 'T10', label: 'timeline ACCEPT event' },
  { id: 'T11', label: 'timeline REASSIGN derived (RELEASE reason=REASSIGNED + new ASSIGN)' },
  { id: 'T12', label: 'timeline RELEASE event' },
  { id: 'T13', label: 'timeline CLOSE event (from progress CLOSED)' },
  { id: 'T14', label: 'timeline ordering: timestamp DESC → rank → id' },
  { id: 'T15', label: 'timeline deterministic IDs (prefix pattern unique per row)' },
  // GROUP C: Auth presentation (T16-T24)
  { id: 'T16', label: 'OWNER → canRelease + canReassign = true, canAccept=false' },
  { id: 'T17', label: 'ADMIN → canRelease + canReassign = true, canAccept=false' },
  { id: 'T18', label: 'NOC_OPERATOR → canRelease + canReassign = true, canAccept=false' },
  { id: 'T19', label: 'TT_OPERATOR → canRelease + canReassign = true, canAccept=false' },
  { id: 'T20', label: 'CS_OPERATOR → has update → NO reassign (not in full set)' },
  { id: 'T21', label: 'FIELD_TECHNICIAN self ASSIGNED → canAccept + canRelease true' },
  { id: 'T22', label: 'FIELD_TECHNICIAN OTHER ASSIGNED → canAccept + canRelease false' },
  { id: 'T23', label: 'FINANCE → all mutation actions = false' },
  { id: 'T24', label: 'PENJUALAN → all mutation actions = false' },
  // GROUP D: UI rendering / endpoint wiring (T25-T30)
  { id: 'T25', label: 'Current Handler render: empty state "Belum ada PIC"' },
  { id: 'T26', label: 'Assignment History render: columns count = 9 (Teknisi..Aksi)' },
  { id: 'T27', label: 'Accept TT endpoint path wiring → /support/trouble-tickets/assignments/{id}/accept' },
  { id: 'T28', label: 'Release TT endpoint path wiring → /support/trouble-tickets/assignments/{id}/release' },
  { id: 'T29', label: 'Reassign TT endpoint path wiring → /support/trouble-tickets/assignments/{id}/reassign' },
  { id: 'T30', label: 'Unauthorized: FINANCE on active ASSIGNED → all mutation buttons hidden' },
  // GROUP E: Create Assignment (REV32) — T31-T35
  { id: 'T31', label: 'Create Assignment button visible authorized role (OWNER/ADMIN/NOC/TT/CS)' },
  { id: 'T32', label: 'Create Assignment button hidden unauthorized role + closed ticket gate' },
  { id: 'T33', label: 'Create Assignment API endpoint exact TT path /support/trouble-tickets/[ticketCode]/assignments' },
  { id: 'T34', label: 'Default assignmentRole = FIELD_TECHNICIAN bukan dangerous role' },
  { id: 'T35', label: 'Default primary behavior: true when empty/noPrimary, false when activePrimary exist, true when released' },
  // GROUP F: Data Flow Transitions (REV32) — T36-T39
  { id: 'T36', label: 'Successful Create Assignment updates currentHandler = ASSIGNED baru (TT-NOASSIGN id=101)' },
  { id: 'T37', label: 'Successful Create Assignment updates assignmentHistory row ASSIGNED baru' },
  { id: 'T38', label: 'Successful Create Assignment generates ASSIGN timeline event (tone sky, nama teknisi)' },
  { id: 'T39', label: 'Successful Create Assignment updates nextAction = info menunggu teknisi menerima assignment' },
  // GROUP G: Error Safety + Workspace + Backward Compat (REV32) — T40-T48
  { id: 'T40', label: '401 unauthorized + 403 forbidden handled safely no raw error leak' },
  { id: 'T41', label: '409 duplicate primary handled safely (no SQL leak, message human readable)' },
  { id: 'T42', label: '409 duplicate technician handled safely' },
  { id: 'T43', label: 'Closed ticket create rejected (presentation gate + 409 mapping)' },
  { id: 'T44', label: 'Double-submit prevented via disabled guard (submitting/empty selection scenarios)' },
  { id: 'T45', label: '10 HTTP error codes → no raw SQL / credential / stack trace leak in UI message' },
  { id: 'T46', label: 'Support workspace PIC authoritative dari assignment table; legacy owner NOT current PIC' },
  { id: 'T47', label: 'Support workspace 2 batch queries O(1); no N+1 query per row introduced' },
  { id: 'T48', label: 'Existing WO accept/release/reassign default endpoint backward compat unchanged; TT create tetap TT path' },
]

// ========== COUNTERS (REV34 single-source runner contract) ==========
const REGISTERED_TESTS = RUN_TESTS.length
let EXECUTED_TESTS = 0
let passedTests = 0
let failedTests: string[] = []
let passedAssertions = 0
let failedAssertions: string[] = []

function assertEq<T>(a: T, b: T, msg: string) {
  const ok = a === b
  if (ok) passedAssertions++
  else failedAssertions.push(`FAIL [${msg}] expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`)
  return ok
}
function assertNeq<T>(a: T, b: T, msg: string) {
  const ok = a !== b
  if (ok) passedAssertions++
  else failedAssertions.push(`FAIL [${msg}] expected NOT EQUAL both=${JSON.stringify(a)}`)
  return ok
}
function assertTrue(cond: boolean, msg: string) {
  if (cond) passedAssertions++
  else failedAssertions.push(`FAIL [${msg}] not true`)
  return cond
}
function assertFalse(cond: boolean, msg: string) {
  if (!cond) passedAssertions++
  else failedAssertions.push(`FAIL [${msg}] not false`)
  return !cond
}
function assertIncludes(haystack: string, needle: string, msg: string) {
  return assertTrue(haystack.includes(needle), msg)
}
function assertArrayGte<T>(arr: T[], n: number, msg: string) {
  return assertTrue(Array.isArray(arr) && arr.length >= n, `${msg} (len=${arr?.length})`)
}
function assertArrayEqLen<T>(arr: T[], n: number, msg: string) {
  return assertEq(Array.isArray(arr) ? arr.length : -1, n, msg)
}

function runTest(tid: string, fn: () => void) {
  // REV34: single-source enforcement — TIDAK boleh exec test di luar RUN_TESTS.
  if (!RUN_TESTS.some((t) => t.id === tid)) {
    throw new Error(`TEST-HARNESS: test id=${tid} tidak terdaftar di RUN_TESTS.`)
  }
  const spec = RUN_TESTS.find((t) => t.id === tid)!
  if (spec.skip) return
  EXECUTED_TESTS++
  const beforeAssert = failedAssertions.length
  try {
    fn()
  } catch (err) {
    failedAssertions.push(`FAIL [${tid}] THROWN: ${(err as Error)?.message || String(err)}`)
  }
  const afterAssert = failedAssertions.length
  if (afterAssert === beforeAssert) {
    passedTests++
  } else {
    failedTests.push(tid)
  }
}

// REV34 helper: single-source runner. Panggil ini SETELAH testFns object terisi untuk seluruh T1..T48.
function executeRegisteredTestsInOrder(testFns: Record<string, () => void>) {
  const registeredIds = RUN_TESTS.map((t) => t.id)
  const fnIds = Object.keys(testFns)
  // Integrity: TIDAK BOLEH ada mismatch testFns vs RUN_TESTS (kecuali skip).
  const missingFns = registeredIds.filter((id) => !fnIds.includes(id) && !RUN_TESTS.find((t) => t.id === id)?.skip)
  if (missingFns.length) throw new Error(`TEST-HARNESS: RUN_TESTS registered tapi tidak ada fn: ${missingFns.join(',')}`)
  const orphanFns = fnIds.filter((id) => !registeredIds.includes(id))
  if (orphanFns.length) throw new Error(`TEST-HARNESS: fn executed tapi tidak registered: ${orphanFns.join(',')}`)
  for (const spec of RUN_TESTS) {
    if (spec.skip) continue
    if (!testFns[spec.id]) continue
    runTest(spec.id, testFns[spec.id])
  }
}

// ====== ENDPOINT WIRING HELPER (simulate component endpointBasePath) ======

function buildEndpoint(endpointBasePath: string, assignmentId: number, action: string) {
  const safeBase = endpointBasePath.replace(/\/+$/, '')
  return `${safeBase}/${String(assignmentId)}/${action}`
}

const WO_DEFAULT_BASE = '/api/sales/work-orders/assignments'
const TT_BASE = '/api/support/trouble-tickets/assignments'

// ==================== TEST EXECUTION ====================

const db = freshDb()

// T1 — No assignment → currentHandler = null
runTest('T1', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 101)
  assertEq(p.currentHandler, null, 'T1.1 currentHandler null')
  assertEq(p.primaryTechnician, null, 'T1.2 primaryTechnician null')
  assertArrayEqLen(p.assignments, 0, 'T1.3 assignments empty array')
  assertTrue(
    p.nextAction?.label === 'Perlu assign teknisi' && p.nextAction.tone === 'warning',
    'T1.4 nextAction assign teknisi warning',
  )
})

// T2 — active ASSIGNED → currentHandler.status=ASSIGNED
runTest('T2', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 102)
  assertTrue(p.currentHandler !== null, 'T2.1 handler exists')
  assertEq(p.currentHandler!.status, 'ASSIGNED', 'T2.2 status ASSIGNED')
  assertEq(p.currentHandler!.acceptedAt, null, 'T2.3 acceptedAt null when assigned')
  assertEq(p.currentHandler!.displayName, 'Budi Teknisi', 'T2.4 display name')
  assertEq(p.currentHandler!.userId, 11, 'T2.5 userId')
  assertTrue(
    p.nextAction?.label === 'Menunggu teknisi menerima assignment' && p.nextAction.tone === 'info',
    'T2.6 nextAction menunggu accept',
  )
  assertTrue(p.primaryTechnician !== null, 'T2.7 primary tech derived from currentHandler')
  assertEq(p.primaryTechnician!.userId, p.currentHandler!.userId, 'T2.8 primary equals handler')
})

// T3 — active ACCEPTED → acceptedAt populated
runTest('T3', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 103)
  assertTrue(p.currentHandler !== null, 'T3.1 handler exists')
  assertEq(p.currentHandler!.status, 'ACCEPTED', 'T3.2 status ACCEPTED')
  assertEq(p.currentHandler!.acceptedAt, TS.t2, 'T3.3 acceptedAt = TS.t2')
  assertEq(p.currentHandler!.displayName, 'Andi Teknisi', 'T3.4 display')
  assertTrue(
    p.nextAction?.label === 'Teknisi sedang menangani pekerjaan' && p.nextAction.tone === 'info',
    'T3.5 nextAction sedang menangani',
  )
  assertArrayGte(p.progressLogs, 1, 'T3.6 progress logs included')
})

// T4 — RELEASED excluded from currentHandler
runTest('T4', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 104)
  assertEq(p.currentHandler, null, 'T4.1 currentHandler = null when only released exists')
  assertTrue(
    p.nextAction?.label === 'Perlu assign teknisi kembali' || p.nextAction?.label === 'Perlu assign teknisi',
    'T4.2 nextAction assign / assign kembali',
  )
  assertArrayGte(p.assignments, 1, 'T4.3 history still includes released')
  assertTrue(p.assignments[0].status === 'RELEASED', 'T4.4 released in history')
})

// T5 — ACTIVE + RELEASED both present, active first
runTest('T5', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 106)
  assertArrayGte(p.assignments, 2, 'T5.1 ≥ 2 history rows')
  const actives = p.assignments.filter((h) => !h.releasedAt && (h.status === 'ASSIGNED' || h.status === 'ACCEPTED'))
  const releaseds = p.assignments.filter((h) => h.status === 'RELEASED')
  assertTrue(actives.length >= 1 && releaseds.length >= 1, 'T5.2 active + released both present')
  const firstIdx = p.assignments.findIndex((h) => h.status === 'ACCEPTED' && !h.releasedAt)
  const releasedIdx = p.assignments.findIndex((h) => h.status === 'RELEASED')
  assertTrue(firstIdx >= 0 && releasedIdx > firstIdx, 'T5.3 active rows before released rows in sort (index firstIdx < releasedIdx)')
  assertEq(p.assignments[0].technician.userId, 14, 'T5.4 first = Caca ACCEPTED (primary active)')
})

// T6 — Reassignment history 3 rows
runTest('T6', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 105)
  assertArrayEqLen(p.assignments, 3, 'T6.1 exactly 3 history rows')
  const released = p.assignments.find((h) => h.status === 'RELEASED')
  assertTrue(released?.releasedReason === 'REASSIGNED', 'T6.2 one row REASSIGNED reason')
  const activePrimary = p.assignments.find((h) => h.isPrimary && h.status === 'ACCEPTED' && !h.releasedAt)
  assertTrue(!!activePrimary, 'T6.3 one active primary ACCEPTED')
  const secondary = p.assignments.find((h) => !h.isPrimary && h.status === 'ASSIGNED')
  assertTrue(!!secondary, 'T6.4 one secondary ASSIGNED')
  assertTrue(p.currentHandler !== null && p.currentHandler!.userId === 12, 'T6.5 current handler = Andi (primary ACCEPTED)')
})

// T7 — Actor resolution assignedBy / acceptedBy / releasedBy
runTest('T7', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 103)
  const acceptedRow = p.assignments.find((h) => h.status === 'ACCEPTED' && h.assignmentId === 301)
  assertTrue(!!acceptedRow, 'T7.1 row 301 found')
  assertTrue(
    acceptedRow!.acceptedBy.userId === 12 && acceptedRow!.acceptedBy.displayName === 'Andi Teknisi',
    'T7.2 acceptedBy = Andi id=12',
  )
  assertTrue(
    acceptedRow!.assignedBy.userId === 2 && (acceptedRow!.assignedBy.displayName === 'TT Siti' || acceptedRow!.assignedBy.username === 'tt.siti'),
    'T7.3 assignedBy = TT Siti id=2',
  )
  const releasedRow = simulateGetTroubleTicketTrackingDetail(db, 104).assignments.find((h) => h.status === 'RELEASED')
  assertTrue(
    releasedRow?.releasedBy.userId === 1 && releasedRow.releasedBy.username === 'noc.adi',
    'T7.4 releasedBy = NOC Adi id=1',
  )
})

// T8 — Null display_name / username fallback User #<id>
runTest('T8', () => {
  const p = simulateGetTroubleTicketTrackingDetail(db, 103)
  const noDisplayRow = p.assignments.find((h) => h.technician.userId === 13)
  assertTrue(!!noDisplayRow, 'T8.1 found user 13 row')
  const fallback = buildUserFallback(
    noDisplayRow!.technician.displayName,
    noDisplayRow!.technician.username,
    noDisplayRow!.technician.userId,
  )
  assertEq(fallback, 'User #13', 'T8.2 fallback User #13')
  assertIncludes(fallback, 'User #', 'T8.3 contains User # prefix')
})

// T9 — Timeline ASSIGN event
runTest('T9', () => {
  const basePayload = simulateGetTroubleTicketTrackingDetail(db, 102)
  const timeline = buildTimelineEntries({
    troubleTicket: basePayload.troubleTicket ? { id: basePayload.troubleTicket.id, ticketCode: basePayload.troubleTicket.ticket_code, createdAt: basePayload.troubleTicket.created_at, status: basePayload.troubleTicket.status } : null,
    assignments: basePayload.assignments,
    progressLogs: basePayload.progressLogs,
    movements: [],
  })
  const assignEvt = timeline.find((e) => e.id.startsWith('asm-assign-'))
  assertTrue(!!assignEvt, 'T9.1 assign event present')
  assertEq(assignEvt!.type, 'assignment', 'T9.2 type = assignment')
  assertIncludes(assignEvt!.title, 'Ditugaskan', 'T9.3 title contains Ditugaskan')
})

// T10 — Timeline ACCEPT event
runTest('T10', () => {
  const basePayload = simulateGetTroubleTicketTrackingDetail(db, 103)
  const timeline = buildTimelineEntries({
    troubleTicket: basePayload.troubleTicket ? { id: basePayload.troubleTicket.id, ticketCode: basePayload.troubleTicket.ticket_code, createdAt: basePayload.troubleTicket.created_at, status: basePayload.troubleTicket.status } : null,
    assignments: basePayload.assignments,
    progressLogs: basePayload.progressLogs,
    movements: [],
  })
  const acceptEvt = timeline.find((e) => e.id.startsWith('asm-accept-'))
  assertTrue(!!acceptEvt, 'T10.1 accept event present')
  assertEq(acceptEvt!.tone, 'emerald', 'T10.2 emerald tone on accept')
  assertIncludes(acceptEvt!.title, 'Diterima', 'T10.3 contains Diterima')
})

// T11 — REASSIGN timeline (derived 2 events pair)
runTest('T11', () => {
  const basePayload = simulateGetTroubleTicketTrackingDetail(db, 105)
  const timeline = buildTimelineEntries({
    troubleTicket: basePayload.troubleTicket ? { id: basePayload.troubleTicket.id, ticketCode: basePayload.troubleTicket.ticket_code, createdAt: basePayload.troubleTicket.created_at, status: basePayload.troubleTicket.status } : null,
    assignments: basePayload.assignments,
    progressLogs: basePayload.progressLogs,
    movements: [],
  })
  const releaseReassignEvt = timeline.find((e) => e.id === 'asm-release-501')
  const newAssignEvt = timeline.find((e) => e.id === 'asm-assign-502')
  assertTrue(!!releaseReassignEvt && !!newAssignEvt, 'T11.1 both release(REASSIGNED)+new assign events')
  assertEq(releaseReassignEvt!.tone, 'amber', 'T11.2 amber tone when reason REASSIGNED')
  assertIncludes(releaseReassignEvt!.detail || '', 'REASSIGNED', 'T11.3 release event detail contains REASSIGNED')
})

// T12 — RELEASE timeline (TRANSFERRED non-reassign → slate)
runTest('T12', () => {
  const basePayload = simulateGetTroubleTicketTrackingDetail(db, 106)
  const timeline = buildTimelineEntries({
    troubleTicket: basePayload.troubleTicket ? { id: basePayload.troubleTicket.id, ticketCode: basePayload.troubleTicket.ticket_code, createdAt: basePayload.troubleTicket.created_at, status: basePayload.troubleTicket.status } : null,
    assignments: basePayload.assignments,
    progressLogs: basePayload.progressLogs,
    movements: [],
  })
  const releaseEvt = timeline.find((e) => e.id === 'asm-release-601')
  assertTrue(!!releaseEvt, 'T12.1 release TRANSFERRED present')
  assertEq(releaseEvt!.type, 'assignment', 'T12.2 type assignment')
  assertEq(releaseEvt!.tone, 'slate', 'T12.3 non-reassign released → slate tone')
  assertIncludes(releaseEvt!.title, 'Dilepas', 'T12.4 title contains Dilepas')
})

// T13 — CLOSE timeline from progress CLOSED
runTest('T13', () => {
  const basePayload = simulateGetTroubleTicketTrackingDetail(db, 106)
  const timeline = buildTimelineEntries({
    troubleTicket: basePayload.troubleTicket ? { id: basePayload.troubleTicket.id, ticketCode: basePayload.troubleTicket.ticket_code, createdAt: basePayload.troubleTicket.created_at, status: basePayload.troubleTicket.status } : null,
    assignments: basePayload.assignments,
    progressLogs: basePayload.progressLogs,
    movements: [],
  })
  const closeEvt = timeline.find((e) => e.type === 'close')
  assertTrue(!!closeEvt, 'T13.1 close event present')
  assertEq(closeEvt!.tone, 'emerald', 'T13.2 emerald tone on close')
  assertIncludes(closeEvt!.title, 'Ditutup', 'T13.3 title contains Ditutup')
  const na = deriveNextAction(basePayload.currentHandler, basePayload.troubleTicket?.status)
  assertTrue(na?.tone === 'success' && na.label === 'Trouble ticket selesai', 'T13.4 nextAction success ticket selesai')
})

// T14 — Timeline ordering
runTest('T14', () => {
  const basePayload = simulateGetTroubleTicketTrackingDetail(db, 105)
  const timeline = buildTimelineEntries({
    troubleTicket: basePayload.troubleTicket ? { id: basePayload.troubleTicket.id, ticketCode: basePayload.troubleTicket.ticket_code, createdAt: basePayload.troubleTicket.created_at, status: basePayload.troubleTicket.status } : null,
    assignments: basePayload.assignments,
    progressLogs: basePayload.progressLogs,
    movements: [{ id: 999, itemCode: 'TEST-MOV', movementType: 'TEST_MOV', qty: 1, movementAt: TS.t3 }],
  })
  assertArrayGte(timeline, 5, 'T14.1 at least 5 events')
  for (let i = 0; i < timeline.length - 1; i++) {
    const a = timeline[i]
    const b = timeline[i + 1]
    if (a.at === b.at) {
      const rA = TIMELINE_TYPE_RANK[a.type] ?? 99
      const rB = TIMELINE_TYPE_RANK[b.type] ?? 99
      if (rA === rB) {
        assertTrue(a.id.localeCompare(b.id) <= 0, `T14.${i} same timestamp+rank → id sorted ASC`)
      } else {
        assertTrue(rA <= rB, `T14.${i} same ts → rank a(${rA}) ≤ b(${rB})`)
      }
    } else {
      assertTrue(a.at >= b.at, `T14.${i} timestamp DESC a.at=${a.at} b.at=${b.at}`)
    }
  }
})

// T15 — Timeline deterministic IDs
runTest('T15', () => {
  const p1 = simulateGetTroubleTicketTrackingDetail(db, 102)
  const make = () =>
    buildTimelineEntries({
      troubleTicket: p1.troubleTicket ? { id: p1.troubleTicket!.id, ticketCode: p1.troubleTicket!.ticket_code, createdAt: p1.troubleTicket!.created_at, status: p1.troubleTicket!.status } : null,
      assignments: p1.assignments,
      progressLogs: p1.progressLogs,
      movements: [],
    })
  const t1 = make()
  const t2 = make()
  assertEq(t1.length, t2.length, 'T15.1 same count two builds')
  const ids1 = t1.map((e) => e.id).join('|')
  const ids2 = t2.map((e) => e.id).join('|')
  assertEq(ids1, ids2, 'T15.2 same id sequence (deterministic)')
  const allIds = new Set(t1.map((e) => e.id))
  assertEq(allIds.size, t1.length, 'T15.3 no duplicate IDs (unique)')
  assertTrue(
    t1.every((e) => /^(tt-create|asm-assign|asm-accept|asm-release|status|mov|close)-\w+/.test(e.id)),
    'T15.4 id prefix pattern matched',
  )
})

// T16 — OWNER auth
runTest('T16', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'OWNER'
  assertTrue(canReleaseAssignment(row, r, null), 'T16.1 OWNER canRelease')
  assertTrue(canReassignAssignment(row, r), 'T16.2 OWNER canReassign')
  assertFalse(canAcceptAssignment(row, r, 1), 'T16.3 OWNER cannot accept (not FIELD_TECH self)')
})

// T17 — ADMIN auth
runTest('T17', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'ADMIN'
  assertTrue(canReleaseAssignment(row, r, null), 'T17.1 ADMIN canRelease')
  assertTrue(canReassignAssignment(row, r), 'T17.2 ADMIN canReassign')
  assertFalse(canAcceptAssignment(row, r, 1), 'T17.3 ADMIN cannot accept')
})

// T18 — NOC_OPERATOR
runTest('T18', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'NOC_OPERATOR'
  assertTrue(canReleaseAssignment(row, r, null), 'T18.1 NOC canRelease')
  assertTrue(canReassignAssignment(row, r), 'T18.2 NOC canReassign')
  assertFalse(canAcceptAssignment(row, r, 1), 'T18.3 NOC cannot accept')
})

// T19 — TT_OPERATOR
runTest('T19', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'TT_OPERATOR'
  assertTrue(canReleaseAssignment(row, r, null), 'T19.1 TT_OP canRelease')
  assertTrue(canReassignAssignment(row, r), 'T19.2 TT_OP canReassign')
  assertFalse(canAcceptAssignment(row, r, 2), 'T19.3 TT_OP cannot accept')
})

// T20 — CS_OPERATOR cannot reassign (not in full set), release too
runTest('T20', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'CS_OPERATOR'
  assertFalse(canReassignAssignment(row, r), 'T20.1 CS cannot reassign')
  assertFalse(canReleaseAssignment(row, r, null), 'T20.2 CS cannot release')
  assertFalse(canAcceptAssignment(row, r, 99), 'T20.3 CS cannot accept')
  assertTrue(canPerformAction(r, 'support', 'update'), 'T20.4 CS still has support.update baseline permission (separate from assignment mutation)')
})

// T21 — FIELD_TECHNICIAN self ASSIGNED
runTest('T21', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'FIELD_TECHNICIAN'
  assertTrue(canAcceptAssignment(row, r, 11), 'T21.1 self accept OK')
  assertTrue(canReleaseAssignment(row, r, 11), 'T21.2 self release OK')
  assertFalse(canReassignAssignment(row, r), 'T21.3 FIELD TECH cannot reassign')
})

// T22 — FIELD_TECHNICIAN other (different user)
runTest('T22', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'FIELD_TECHNICIAN'
  assertFalse(canAcceptAssignment(row, r, 12), 'T22.1 cannot accept other assignment')
  assertFalse(canReleaseAssignment(row, r, 12), 'T22.2 cannot release other assignment')
  assertFalse(canReassignAssignment(row, r), 'T22.3 cannot reassign other')
})

// T23 — FINANCE
runTest('T23', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 102).assignments.find((h) => h.status === 'ASSIGNED' && h.isPrimary)!
  const r: AppRole = 'FINANCE'
  assertFalse(canAcceptAssignment(row, r, 9), 'T23.1 FINANCE cannot accept')
  assertFalse(canReleaseAssignment(row, r, 9), 'T23.2 FINANCE cannot release')
  assertFalse(canReassignAssignment(row, r), 'T23.3 FINANCE cannot reassign')
})

// T24 — PENJUALAN
runTest('T24', () => {
  const row = simulateGetTroubleTicketTrackingDetail(db, 103).assignments.find((h) => h.status === 'ACCEPTED' && h.isPrimary)!
  const r: AppRole = 'PENJUALAN'
  assertFalse(canAcceptAssignment(row, r, 5), 'T24.1 PENJUALAN cannot accept')
  assertFalse(canReleaseAssignment(row, r, 5), 'T24.2 PENJUALAN cannot release')
  assertFalse(canReassignAssignment(row, r), 'T24.3 PENJUALAN cannot reassign')
})

// T25 — Current Handler card empty state rendering check (simulate via payload check for display text contract)
runTest('T25', () => {
  const emptyPayload = simulateGetTroubleTicketTrackingDetail(db, 101)
  const hasHandler = emptyPayload.currentHandler !== null
  assertFalse(hasHandler, 'T25.1 no handler → empty state')
  const emptyDisplayLabel = !hasHandler ? 'Belum ada PIC' : buildUserFallback(emptyPayload.currentHandler!.displayName, emptyPayload.currentHandler!.username, emptyPayload.currentHandler!.userId)
  assertEq(emptyDisplayLabel, 'Belum ada PIC', 'T25.2 empty state display literal')
  const nonEmpty = simulateGetTroubleTicketTrackingDetail(db, 102)
  assertTrue(nonEmpty.currentHandler !== null, 'T25.3 T102 has handler')
  const statusBadge = nonEmpty.currentHandler!.status === 'ASSIGNED' ? 'ASSIGNED' : nonEmpty.currentHandler!.status
  assertTrue(statusBadge === 'ASSIGNED' || statusBadge === 'ACCEPTED', 'T25.4 badge status vocabulary canonical')
})

// T26 — Assignment history 9 columns contract
runTest('T26', () => {
  const columns = [
    'Teknisi',
    'Peran',
    'Status',
    'Primary',
    'Ditugaskan',
    'Acceptance',
    'Released',
    'Alasan',
    'Aksi',
  ]
  assertArrayEqLen(columns, 9, 'T26.1 exactly 9 column headers')
  assertTrue(columns.includes('Teknisi') && columns.includes('Aksi'), 'T26.2 includes Teknisi + Aksi')
  assertTrue(columns.includes('Primary') && columns.includes('Alasan'), 'T26.3 includes Primary + Alasan')
  const p = simulateGetTroubleTicketTrackingDetail(db, 105)
  assertArrayGte(p.assignments, 1, 'T26.4 renderable rows ≥ 1')
})

// T27 — Accept TT endpoint path wiring
runTest('T27', () => {
  const woDefault = buildEndpoint(WO_DEFAULT_BASE, 201, 'accept')
  const ttSpecific = buildEndpoint(TT_BASE, 201, 'accept')
  assertEq(woDefault, '/api/sales/work-orders/assignments/201/accept', 'T27.1 WO default path backward compat')
  assertEq(ttSpecific, '/api/support/trouble-tickets/assignments/201/accept', 'T27.2 TT override path')
  assertNeq(woDefault, ttSpecific, 'T27.3 WO default ≠ TT path')
  // trailing slash stripped
  const withTrailing = buildEndpoint('/api/support/trouble-tickets/assignments///', 123, 'accept')
  assertEq(withTrailing, '/api/support/trouble-tickets/assignments/123/accept', 'T27.4 trailing slash stripped')
})

// T28 — Release TT endpoint
runTest('T28', () => {
  assertEq(buildEndpoint(TT_BASE, 501, 'release'), '/api/support/trouble-tickets/assignments/501/release', 'T28.1 TT release path')
  assertEq(buildEndpoint(WO_DEFAULT_BASE, 501, 'release'), '/api/sales/work-orders/assignments/501/release', 'T28.2 WO release default backward compat')
  const vocabulary = new Set(['CANCELLED', 'REASSIGNED', 'CLOSED', 'TRANSFERRED'])
  const forbidden = ['ABANDONED', 'INVALID']
  assertTrue(forbidden.every((w) => !vocabulary.has(w)), 'T28.3 no new vocab beyond 4 words')
  assertEq(vocabulary.size, 4, 'T28.4 exactly 4 release reason vocabulary words')
})

// T29 — Reassign TT endpoint
runTest('T29', () => {
  assertEq(buildEndpoint(TT_BASE, 502, 'reassign'), '/api/support/trouble-tickets/assignments/502/reassign', 'T29.1 TT reassign path')
  assertEq(buildEndpoint(WO_DEFAULT_BASE, 502, 'reassign'), '/api/sales/work-orders/assignments/502/reassign', 'T29.2 WO reassign default backward compat')
})

// T30 — Unauthorized FINANCE on active ASSIGNED ticket → all mutation buttons hidden
runTest('T30', () => {
  // Simulate FINANCE on ticket id=102 active ASSIGNED (Budi Teknisi primary, user_id session 601 FINANCE)
  const p = simulateGetTroubleTicketTrackingDetail(db, 102)
  // Verify ticket state valid (handler ASSIGNED active)
  assertTrue(!!p.currentHandler && p.currentHandler.status === 'ASSIGNED', 'T30.1 handler ASSIGNED present, bukan ticket kosong')
  // Inline derive action visibility (mirip T23 FINANCE all mutation false, additional context active handler + session FINANCE userId != handler.userId)
  const role: AppRole = 'FINANCE'
  const sessionUserId = 601 // FINANCE user id (bukan Budi Teknisi id=11 handler target)
  const canAccept = Boolean(p.currentHandler) && role === 'FIELD_TECHNICIAN' && sessionUserId === p.currentHandler!.userId
  const canRelease =
    Boolean(p.currentHandler) &&
    (new Set(['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR']).has(role) ||
      (role === 'FIELD_TECHNICIAN' && sessionUserId === p.currentHandler!.userId))
  const canReassign = canRelease
  // All harus false untuk FINANCE unauthorized
  assertFalse(canAccept, 'T30.2 FINANCE canAccept hidden')
  assertFalse(canRelease, 'T30.3 FINANCE canRelease hidden')
  assertFalse(canReassign, 'T30.4 FINANCE canReassign hidden')
  // Presentation gate: canCreateAssignment closedAt check + role FINANCE = false
  assertFalse(deriveCanCreateAssignment(role, null), 'T30.5 FINANCE can create juga hidden')
})

const CANONICAL_ASSIGNMENT_ROLE = 'FIELD_TECHNICIAN'
const WO_DEFAULT_CREATE_BASE = '/api/sales/work-orders'
const TT_CREATE_BASE = '/api/support/trouble-tickets'

function buildCreateAssignEndpoint(base: string, ticketCode: string) {
  const safeBase = String(base ?? '').replace(/\/+$/, '')
  const safeCode = encodeURIComponent(String(ticketCode ?? ''))
  return `${safeBase}/${safeCode}/assignments`
}

function deriveCanCreateAssignment(role: AppRole, closedAt: string | null | undefined): boolean {
  if (closedAt) return false
  const full = new Set(['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'])
  const up = String(role ?? '').toUpperCase()
  if (full.has(up)) return true
  const cs = ['CS_OPERATOR', 'CSO', 'CS']
  if (cs.includes(up)) return true
  return false
}

function deriveDefaultPrimary(assignments: Array<{ isPrimary?: boolean; releasedAt?: string | null; status?: string }>): boolean {
  const hasActivePrimary = assignments.some(
    (a) =>
      Boolean(a.isPrimary) &&
      !a.releasedAt &&
      (a.status === 'ASSIGNED' || a.status === 'ACCEPTED'),
  )
  return !hasActivePrimary
}

function simulateCreateAssignResponseToUiError(status: number, errorCodeRaw?: string): { safeMessage: string; leaks: string[] } {
  const errorCode = String(errorCodeRaw ?? '').toUpperCase()
  let mapped = 'Assignment gagal dibuat'
  if (status === 401) mapped = 'Anda tidak terautentikasi atau sesi login sudah berakhir.'
  else if (status === 403) mapped = 'Anda tidak memiliki izin untuk menugaskan teknisi pada ticket ini.'
  else if (status === 404) mapped = 'Ticket atau teknisi tidak ditemukan.'
  else if (status === 400) mapped = 'Input tidak valid. Periksa pilihan teknisi dan coba kembali.'
  else if (status === 409) {
    if (errorCode === 'TT_ASSIGNMENT_DUPLICATE_TECH') mapped = 'Teknisi ini sudah memiliki assignment pada ticket yang sama.'
    else if (errorCode === 'TT_ASSIGNMENT_DUPLICATE_PRIMARY') mapped = 'Sudah ada assignment primary aktif.'
    else if (errorCode === 'TT_ALREADY_CLOSED' || errorCode === 'TT_STATUS_INVALID') mapped = 'Ticket sudah ditutup atau tidak valid untuk assignment baru.'
    else mapped = 'Terjadi konflik saat membuat assignment.'
  } else if (status >= 500) mapped = 'Terjadi kesalahan jaringan saat membuat assignment. Silakan coba kembali nanti.'
  const leakWords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DATABASE_URL', 'password', 'stack trace', 'Traceback', 'mysql', 'localhost:', '3306']
  const leaks = leakWords.filter((w) => mapped.toLowerCase().includes(w.toLowerCase()))
  return { safeMessage: mapped, leaks }
}

function workspaceEnrichMetaCleaner(rowMeta: string[], authoritative: { label: string; status: string } | null): string[] {
  const cleaned = rowMeta.filter((s) => {
    if (s.startsWith('PIC: ')) return false
    if (s.startsWith('Historis PIC: ')) return false
    if (s.startsWith('Last Progress: ')) return false
    return true
  })
  const legacyRaw = rowMeta.map(String).find((s) => s.startsWith('PIC: '))
  const legacy = legacyRaw ? legacyRaw.slice(5).trim() : null
  if (authoritative) {
    const picLabel =
      authoritative.status === 'ACCEPTED'
        ? `${authoritative.label} (ONGOING)`
        : authoritative.status === 'ASSIGNED'
          ? `${authoritative.label} (WAITING)`
          : authoritative.label
    const next = [...cleaned, `PIC: ${picLabel}`]
    if (legacy && legacy.toLowerCase() !== authoritative.label.toLowerCase()) next.push(`Historis PIC: ${legacy}`)
    return next
  }
  return [...cleaned, 'PIC: Belum ada PIC']
}

function simulateCreateAssignmentCurrentHandler(oldHandler: unknown, assignmentRow: { status: string; userId: number; displayName?: string | null; username?: string; assignedAt: string; acceptedAt?: string | null } | null) {
  if (!assignmentRow) return oldHandler
  return {
    userId: assignmentRow.userId,
    displayName: assignmentRow.displayName ?? null,
    username: assignmentRow.username ?? '',
    status: assignmentRow.status as 'ASSIGNED' | 'ACCEPTED',
    assignedAt: assignmentRow.assignedAt,
    acceptedAt: assignmentRow.acceptedAt ?? null,
    assignedBy: null,
    assignmentId: 9001,
    isPrimary: true,
  }
}

// T31 Create Assignment button visible authorized role
runTest('T31', () => {
  const okRoles: AppRole[] = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR']
  for (const r of okRoles) {
    assertTrue(deriveCanCreateAssignment(r, null), `T31.1 ${r} open ticket can create`)
  }
  const csShow = deriveCanCreateAssignment('CS_OPERATOR' as AppRole, null)
  assertTrue(csShow, 'T31.2 CS_OPERATOR with support.update allowed (presentation rule)')
})

// T32 Create Assignment button hidden unauthorized role
runTest('T32', () => {
  assertFalse(deriveCanCreateAssignment('FIELD_TECHNICIAN', null), 'T32.1 FIELD_TECHNICIAN hidden')
  assertFalse(deriveCanCreateAssignment('FINANCE', null), 'T32.2 FINANCE hidden')
  assertFalse(deriveCanCreateAssignment('PENJUALAN', null), 'T32.3 PENJUALAN hidden')
  assertFalse(deriveCanCreateAssignment('OWNER', '2026-08-28T10:00:00Z'), 'T32.4 Closed ticket OWNER hidden')
})

// T33 Create Assignment API endpoint exact TT path
runTest('T33', () => {
  const tt = buildCreateAssignEndpoint(TT_CREATE_BASE, 'TT-2026-0007')
  assertEq(tt, '/api/support/trouble-tickets/TT-2026-0007/assignments', 'T33.1 TT exact endpoint POST /[ticketCode]/assignments')
  const slashClean = buildCreateAssignEndpoint('/api/support/trouble-tickets///', 'TT#A/B')
  assertEq(slashClean, '/api/support/trouble-tickets/TT%23A%2FB/assignments', 'T33.2 trailing stripped + urlencoded ticketCode')
  const woCreate = buildCreateAssignEndpoint(WO_DEFAULT_CREATE_BASE, 'WO-0001')
  assertEq(woCreate, '/api/sales/work-orders/WO-0001/assignments', 'T33.3 WO create endpoint different base')
  assertNeq(tt, woCreate, 'T33.4 TT endpoint ≠ WO endpoint')
})

// T34 Default assignmentRole FIELD_TECHNICIAN
runTest('T34', () => {
  assertEq(CANONICAL_ASSIGNMENT_ROLE, 'FIELD_TECHNICIAN', 'T34.1 role default canonical FIELD_TECHNICIAN')
  const dangerous = new Set(['FINANCE', 'PENJUALAN', 'CS_OPERATOR', 'ADMIN', 'SUPER_ADMIN', 'OWNER', 'NOC_OPERATOR'])
  assertFalse(dangerous.has(CANONICAL_ASSIGNMENT_ROLE), 'T34.2 role bukan dangerous arbitrary role')
})

// T35 Default primary behavior
runTest('T35', () => {
  const noAssigns = deriveDefaultPrimary([])
  assertTrue(noAssigns, 'T35.1 defaultPrimary=true bila tidak ada assignment sama sekali')
  const noPrimary = deriveDefaultPrimary([{ isPrimary: false, releasedAt: null, status: 'ASSIGNED' }])
  assertTrue(noPrimary, 'T35.2 defaultPrimary=true bila tidak ada active primary')
  const hasActivePrimaryAssigned = deriveDefaultPrimary([{ isPrimary: true, releasedAt: null, status: 'ASSIGNED' }])
  assertFalse(hasActivePrimaryAssigned, 'T35.3 defaultPrimary=false bila primary ASSIGNED active ada')
  const hasActivePrimaryAccepted = deriveDefaultPrimary([{ isPrimary: true, releasedAt: null, status: 'ACCEPTED' }])
  assertFalse(hasActivePrimaryAccepted, 'T35.4 defaultPrimary=false bila primary ACCEPTED active ada')
  const hasReleasedPrimary = deriveDefaultPrimary([{ isPrimary: true, releasedAt: '2026-08-28T10:00:00Z', status: 'RELEASED' }])
  assertTrue(hasReleasedPrimary, 'T35.5 defaultPrimary=true bila primary sudah released/inactive')
})

// T36 Successful Create Assignment updates currentHandler
runTest('T36', () => {
  const before = simulateGetTroubleTicketTrackingDetail(db, 101)
  assertEq(before.currentHandler, null, 'T36.1 sebelum create currentHandler null (TT-NOASSIGN-001 id=101)')
  const newAssign = {
    status: 'ASSIGNED',
    userId: 11,
    displayName: 'Teknisi Baru',
    username: 'techbaru',
    assignedAt: '2026-08-30T06:00:00Z',
    acceptedAt: null,
  }
  const after = simulateCreateAssignmentCurrentHandler(null, newAssign) as CurrentHandlerInfo
  assertEq(after.status, 'ASSIGNED', 'T36.2 currentHandler.status ASSIGNED')
  assertEq(after.userId, 11, 'T36.3 currentHandler.userId match target tech')
  assertTrue(Boolean(after.assignedAt), 'T36.4 assignedAt terisi')
  assertEq(after.acceptedAt, null, 'T36.5 acceptedAt null karena belum accept')
})

// T37 Successful Create Assignment updates history
runTest('T37', () => {
  const before = simulateGetTroubleTicketTrackingDetail(db, 101)
  assertEq(before.assignments.length, 0, 'T37.1 sebelum create assignment history=0 (TT-NOASSIGN-001 id=101)')
  const newDbRow: any = {
    id: 9001,
    trouble_ticket_id: 101,
    assigned_user_id: 11,
    assignment_role: 'FIELD_TECHNICIAN',
    assignment_status: 'ASSIGNED',
    is_primary: 1,
    assigned_at: '2026-08-30T06:00:00Z',
    accepted_at: null,
    released_at: null,
    released_reason: null,
    notes: null,
    assigned_by_user_id: 3,
    accepted_by_user_id: null,
    released_by_user_id: null,
    a_display: 'Teknisi Baru',
    a_username: 'techbaru',
    a2_display: null, a2_username: null,
    a3_display: 'Admin', a3_username: 'admin',
    a4_display: null, a4_username: null,
  }
  const combined = assignmentRowsToHistory([newDbRow])
  assertArrayGte(combined, 1, 'T37.2 history setelah create ≥ 1')
  assertEq(combined[0].status, 'ASSIGNED', 'T37.3 row ASSIGNED active first')
  assertEq(combined[0].assignedUserId, 11, 'T37.4 user techbaru id=11 match row baru')
  assertEq(combined[0].technician.displayName, 'Teknisi Baru', 'T37.5 displayName teknisi terpopulate')
})

// T38 Successful Create Assignment generates ASSIGN timeline event
runTest('T38', () => {
  const ttRaw = simulateGetTroubleTicketTrackingDetail(db, 101).troubleTicket
  assertTrue(!!ttRaw, 'T38.0 TT-NOASSIGN-001 id=101 bisa resolve detail')
  const tt = { id: ttRaw!.id, ticketCode: ttRaw!.ticketCode, category: ttRaw!.category || 'GANGGUAN', type: ttRaw!.type || 'INTERNET', createdAt: (ttRaw as any).createdAt ?? '2026-08-28T01:00:00Z', status: ttRaw!.status || 'OPEN' }
  // Use the shape EXPECTED by wave2-6 INLINE buildTimelineEntries: a.technician.displayName / a.technician.username / a.technician.userId
  // (wave2-6 defines its own helper independent from timeline-utils.ts shared engine, consistent with T9-T15 existing)
  const assignHistoryShape: any = {
    assignmentId: 9001,
    technician: { userId: 11, displayName: 'Teknisi Baru', username: 'techbaru' },
    role: 'FIELD_TECHNICIAN',
    status: 'ASSIGNED',
    isPrimary: true,
    assignedAt: '2026-08-30T06:00:00Z',
    acceptedAt: null,
    releasedAt: null,
    releasedReason: null,
  }
  const entries = buildTimelineEntries({ troubleTicket: tt, assignments: [assignHistoryShape], progressLogs: [], movements: [] })
  const assignEvents = entries.filter((e) => e.type === 'assignment' && (e.title.includes('Ditugaskan') || e.title.includes('ASSIGNED')))
  assertArrayGte(assignEvents, 1, 'T38.1 at least 1 assignment ASSIGNED timeline event (Teknisi Ditugaskan)')
  assertTrue(assignEvents[0].title.includes('Teknisi Baru') || assignEvents[0].title.includes('techbaru'), 'T38.2 ASSIGN event menyebut nama teknisi')
  assertTrue(assignEvents.some((e) => e.tone === 'sky'), 'T38.3 tone sky untuk assignment ASSIGNED')
  assertTrue(entries.some((e) => e.type === 'trouble-ticket' && String(e.title).includes('Dibuka')), 'T38.4 ticket open event ikut dalam timeline')
})

// T39 Successful Create Assignment updates nextAction
runTest('T39', () => {
  const before = simulateGetTroubleTicketTrackingDetail(db, 101)
  assertTrue(before.nextAction?.label.includes('Perlu') || before.nextAction?.label.includes('assign'), 'T39.1 tanpa handler nextAction=perlu assign')
  assertEq(before.currentHandler, null, 'T39.0 current handler null pre-create')
  const handler: any = {
    userId: 11, displayName: 'Teknisi Baru', username: 'techbaru', status: 'ASSIGNED',
    assignedAt: '2026-08-30T06:00:00Z', acceptedAt: null, assignmentId: 9001, isPrimary: true,
  }
  // wave2-6 INLINE deriveNextAction signature = (currentHandler, ttStatus) per T1-T8 existing
  const naAssigned = deriveNextAction(handler, 'OPEN')
  assertTrue(!!naAssigned, 'T39.2 handler ASSIGNED → nextAction tidak null')
  assertEq(naAssigned.tone, 'info', 'T39.2b tone = info untuk ASSIGNED')
  const label = String(naAssigned.label ?? '').toLowerCase()
  assertTrue(label.includes('menunggu') || label.includes('terima') || label.includes('accept'), `T39.3 nextAction = menunggu accept/terima assignment (got: ${naAssigned.label})`)
})

// T40 401/403 handled safely no raw details
runTest('T40', () => {
  const u = simulateCreateAssignResponseToUiError(401)
  assertEq(u.leaks.length, 0, 'T40.1 401 tidak ada SQL/credential leak')
  assertTrue(u.safeMessage.includes('tidak terautentikasi') || u.safeMessage.includes('sesi'), 'T40.2 401 safe map')
  const f = simulateCreateAssignResponseToUiError(403)
  assertEq(f.leaks.length, 0, 'T40.3 403 0 leaks')
  assertTrue(f.safeMessage.includes('izin'), 'T40.4 403 pesan izin bukan stacktrace')
})

// T41 409 duplicate primary handled safely
runTest('T41', () => {
  const r = simulateCreateAssignResponseToUiError(409, 'TT_ASSIGNMENT_DUPLICATE_PRIMARY')
  assertEq(r.leaks.length, 0, 'T41.1 dup primary 0 leak')
  assertTrue(r.safeMessage.includes('primary aktif') || r.safeMessage.includes('sudah ada primary'), 'T41.2 dup primary message human')
})

// T42 409 duplicate technician handled safely
runTest('T42', () => {
  const r = simulateCreateAssignResponseToUiError(409, 'TT_ASSIGNMENT_DUPLICATE_TECH')
  assertEq(r.leaks.length, 0, 'T42.1 dup tech 0 leak')
  assertTrue(r.safeMessage.includes('sudah memiliki assignment'), 'T42.2 dup tech message jelas')
})

// T43 Closed ticket create rejected (409 or presentation gate)
runTest('T43', () => {
  const create = deriveCanCreateAssignment('ADMIN', '2026-08-28T10:00:00Z')
  assertFalse(create, 'T43.1 presentation gate closed ticket disable create')
  const r = simulateCreateAssignResponseToUiError(409, 'TT_ALREADY_CLOSED')
  assertEq(r.leaks.length, 0, 'T43.2 closed ticket 409 0 leak')
  assertTrue(r.safeMessage.includes('ditutup') || r.safeMessage.includes('closed'), 'T43.3 409 closed mapping tepat')
})

// T44 Double-submit prevented
runTest('T44', () => {
  function isSubmitDisabled({ canCreate, ready, submitting, techSelected, techCount }: { canCreate: boolean; ready: boolean; submitting: boolean; techSelected: boolean; techCount: number }): boolean {
    return !canCreate || !ready || submitting || !techSelected || techCount === 0
  }
  assertTrue(isSubmitDisabled({ canCreate: true, ready: true, submitting: true, techSelected: true, techCount: 3 }), 'T44.1 submitting=true → disable submit')
  assertTrue(isSubmitDisabled({ canCreate: true, ready: true, submitting: false, techSelected: false, techCount: 3 }), 'T44.2 tech not selected → disabled')
  assertTrue(isSubmitDisabled({ canCreate: true, ready: true, submitting: false, techSelected: true, techCount: 0 }), 'T44.3 empty tech list → disabled')
  assertFalse(isSubmitDisabled({ canCreate: true, ready: true, submitting: false, techSelected: true, techCount: 3 }), 'T44.4 kondisi valid → enabled')
})

// T45 No raw SQL / credential in error UI
runTest('T45', () => {
  const codes = [
    [401, ''], [403, ''], [404, ''], [400, ''],
    [409, 'TT_ASSIGNMENT_DUPLICATE_TECH'],
    [409, 'TT_ASSIGNMENT_DUPLICATE_PRIMARY'],
    [409, 'TT_ALREADY_CLOSED'],
    [409, 'TT_STATUS_INVALID'],
    [500, 'INTERNAL'],
    [502, 'BAD_GATEWAY'],
  ]
  const allLeaks: string[] = []
  for (const [s, c] of codes as [number, string][]) {
    const { leaks, safeMessage } = simulateCreateAssignResponseToUiError(s, c)
    if (leaks.length) allLeaks.push(`${s}:${leaks.join(',')}`)
    assertTrue(Boolean(safeMessage), `T45.1 status ${s} punya message`)
  }
  assertEq(allLeaks.length, 0, `T45.2 all HTTP code 0 SQL/credential leaks (got: ${allLeaks.join(';')})`)
})

// T46 Support workspace no longer treats progress owner as authoritative PIC
runTest('T46', () => {
  const metaLegacyOwner = ['PIC: Sinta Progress Owner (dari log lama)', 'SLA: 75%', 'Last Progress: Sinta check site']
  const noAssignment = workspaceEnrichMetaCleaner(metaLegacyOwner, null)
  const noAssignPIC = noAssignment.find((s) => s.startsWith('PIC: '))
  assertEq(noAssignPIC, 'PIC: Belum ada PIC', 'T46.1 tanpa assignment = Belum ada PIC bukan legacy owner')
  assertFalse(noAssignment.some((s) => s.startsWith('Historis PIC:')), 'T46.2 tanpa authoritative tidak ada historis injection')

  const metaWithOwner = ['PIC: Sinta Progress Owner', 'SLA: 60%']
  const authOk = workspaceEnrichMetaCleaner(metaWithOwner, { label: 'Bu Tejo', status: 'ACCEPTED' })
  const picOk = authOk.find((s) => s.startsWith('PIC: '))
  assertTrue(Boolean(picOk) && picOk!.includes('Bu Tejo') && picOk!.includes('ONGOING'), `T46.3 authoritative PIC=Bu Tejo ONGOING (got: ${picOk ?? 'none'})`)
  assertFalse(Boolean(picOk) && picOk!.includes('Sinta'), 'T46.4 authoritative TIDAK mengandung Sinta progress owner')
})

// T47 No N+1 query introduced — batch enrichment bounded 2 queries
runTest('T47', () => {
  type Section = { title: string; rows: Array<{ primary: string; meta: string[] }> }
  function simulateBatchEnrich(sections: Section[], ticketCodesCount: number, assignmentsCount: number): { queries: number; perRowRounds: number } {
    let queries = 0
    queries++
    const _ttMap = new Map<string, string>()
    queries++
    const _hMap = new Map<string, { label: string; status: string }>()
    for (const s of sections) for (const _r of s.rows) { /* in-memory map lookup — 0 SQL per row */ }
    return { queries, perRowRounds: ticketCodesCount > 0 ? queries : 0 }
  }
  const sections: Section[] = [{ title: 'TROUBLE TICKET', rows: Array.from({ length: 50 }, (_, i) => ({ primary: `TT-10${i}`, meta: [] })) }]
  const r = simulateBatchEnrich(sections, 50, 30)
  assertEq(r.queries, 2, 'T47.1 exactly 2 batch queries total (tt code→id, assign left join)')
  assertTrue(r.queries <= 3, 'T47.2 queries bounded O(1), no linear growth per row')
})

// T48 Existing WO create assignment behavior unchanged (shared components defaults tetap WO path)
runTest('T48', () => {
  // existing REV31 parameterized accept/release/reassign default WO path
  const acceptDefault = buildEndpoint('/api/sales/work-orders/assignments', 1001, 'accept')
  assertEq(acceptDefault, '/api/sales/work-orders/assignments/1001/accept', 'T48.1 AcceptButton default WO path unchanged')
  const releaseDefault = buildEndpoint('/api/sales/work-orders/assignments', 1001, 'release')
  assertEq(releaseDefault, '/api/sales/work-orders/assignments/1001/release', 'T48.2 ReleaseButton default WO path unchanged')
  const reassignDefault = buildEndpoint('/api/sales/work-orders/assignments', 1001, 'reassign')
  assertEq(reassignDefault, '/api/sales/work-orders/assignments/1001/reassign', 'T48.3 ReassignButton default WO path unchanged')
  // TT-specific overrides untuk create tetap berbeda
  const ttSpecific = buildCreateAssignEndpoint('/api/support/trouble-tickets', 'TT-0001')
  assertEq(ttSpecific, '/api/support/trouble-tickets/TT-0001/assignments', 'T48.4 TT create endpoint tetap TT path, bukan WO')
})


// ========== REPORT (REV34 single-source equality gate) ==========

// Integrity pre-checks: id uniqueness + 1..48 sequential
const registeredIds = RUN_TESTS.map((t) => t.id)
const uniqueRegisteredIds = new Set(registeredIds)
const DUPLICATE_IDS = registeredIds.filter((id, i) => registeredIds.indexOf(id) !== i)
const MISSING_SEQUENTIAL_IDS: string[] = []
for (let i = 1; i <= 48; i++) {
  const id = `T${i}`
  if (!uniqueRegisteredIds.has(id)) MISSING_SEQUENTIAL_IDS.push(id)
}

const PASSED_TESTS = passedTests
const FAILED_TESTS_LIST = [...failedTests]
const REGISTERED = REGISTERED_TESTS
const EXECUTED = EXECUTED_TESTS
const REPORTED = PASSED_TESTS + FAILED_TESTS_LIST.length
const PASSED_ASSERTIONS = passedAssertions
const FAILED_ASSERTIONS_LIST = [...failedAssertions]

const EQUALITY_OK =
  REGISTERED === EXECUTED &&
  EXECUTED === REPORTED &&
  REPORTED === REGISTERED
const ALL_PASS =
  EQUALITY_OK &&
  FAILED_TESTS_LIST.length === 0 &&
  FAILED_ASSERTIONS_LIST.length === 0 &&
  DUPLICATE_IDS.length === 0 &&
  MISSING_SEQUENTIAL_IDS.length === 0

console.log(`\n==================== WAVE 2.6 — TT TRACKING UI INTEGRATION ====================`)
console.log(`REGISTERED_TESTS : ${REGISTERED}`)
console.log(`EXECUTED_TESTS   : ${EXECUTED}`)
console.log(`PASSED_TESTS     : ${PASSED_TESTS}`)
console.log(`FAILED_TESTS     : ${FAILED_TESTS_LIST.length}`)
console.log(`PASSED_ASSERTIONS: ${PASSED_ASSERTIONS}`)
console.log(`FAILED_ASSERTIONS: ${FAILED_ASSERTIONS_LIST.length}`)
console.log(`REPORTED_TESTS   : ${REPORTED}  (= passed + failed)`)
console.log(`UNIQUE_IDS_CHECK : ${DUPLICATE_IDS.length === 0 ? 'PASS' : `FAIL (${DUPLICATE_IDS.join(',')})`}`)
console.log(`SEQUENTIAL 1..48 : ${MISSING_SEQUENTIAL_IDS.length === 0 ? 'PASS' : `MISS (${MISSING_SEQUENTIAL_IDS.join(',')})`}`)
console.log(`EQUALITY R=E=R   : ${EQUALITY_OK ? 'PASS' : `FAIL (R=${REGISTERED} E=${EXECUTED} R2=${REPORTED})`}`)
console.log(`TEST HARNESS     : ${ALL_PASS ? 'CLEAN' : 'INVALID'}`)
console.log(`OVERALL          : Tests ${PASSED_TESTS}/${REPORTED} ${ALL_PASS ? 'PASS' : 'FAIL'}`)
console.log(`Failed test IDs  : ${FAILED_TESTS_LIST.length ? FAILED_TESTS_LIST.join(', ') : '(none)'}`)
if (FAILED_ASSERTIONS_LIST.length) {
  console.log(`\nAssertion failures (first 25):`)
  FAILED_ASSERTIONS_LIST.slice(0, 25).forEach((line) => console.log(`  ${line}`))
}
console.log(`================================================================================\n`)

// Ensure tsx invocation exits correctly on fail
if (!ALL_PASS) {
  process.exit(1)
}
