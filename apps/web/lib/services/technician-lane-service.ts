import { getDataSourceSnapshot } from '@/lib/data-source'
import type { AppSession } from '@/lib/auth-session'
import { runReviewDbQuery, hasReviewDbColumn } from '@/lib/review-db'
import {
  Q3_ASSIGNMENT_ACTIVE_STATUSES,
  Q3_ASSIGNMENT_ROLE_CANONICAL,
} from '@/lib/q3-field-tech-ownership'
import { ensureTicketsUnifiedTable, type UnifiedTicketPriority, type UnifiedTicketStatus, type UnifiedTicketType } from '@/lib/services/unified-ticket-service'

export type TechnicianLaneTicketRow = {
  id: number
  ticketCode: string
  ticketType: UnifiedTicketType | string
  title: string | null
  customerName: string | null
  customerId: number | null
  address: string | null
  phone: string | null
  priority: UnifiedTicketPriority | string
  status: UnifiedTicketStatus | string
  openedAt: string | null
  assignedAt: string | null
  acceptedAt: string | null
  startedAt: string | null
  submittedAt: string | null
  slaDueAt: string | null
  assignedUserId: number | null
  workOrderId: number | null
  troubleTicketId: number | null
  assignmentId: number | null
  branchId: number | null
  description: string | null
  jobCategory: string | null
}

export type TechnicianLaneTicketEvidence = {
  id: number
  ticketId: number
  uploadedByUserId: number | null
  uploadedByName: string | null
  uploadedAt: string | null
  evidenceType: string | null
  storageReference: string | null
  notes: string | null
}

export type TechnicianLaneTimelineEntry = {
  key: string
  label: string
  at: string | null
  note?: string | null
}

export type TechnicianLaneTemporaryPeriod = {
  id: number
  startedAt: string | null
  endedAt: string | null
  reason: string | null
  status: string | null
}

export type TechnicianLaneTicketDetail = TechnicianLaneTicketRow & {
  evidences: TechnicianLaneTicketEvidence[]
  timeline: TechnicianLaneTimelineEntry[]
  temporaryPeriods: TechnicianLaneTemporaryPeriod[]
}

export type TechnicianLaneCounters = {
  assigned: number
  accepted: number
  onProgress: number
  submitted: number
  temporary: number
  total: number
}

function normalizeLike(value: string) {
  return `%${value.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

export type TechnicianLaneQuery = {
  q?: string
  status?: string
  priority?: string
}

type TicketTypeFilter = {
  primary: UnifiedTicketType | string
  legacyTypes?: string[]
  legacyJobCategories?: string[]
}

function resolveTicketTypeFilter(laneKey: string): TicketTypeFilter {
  const key = String(laneKey ?? '').trim().toUpperCase()
  switch (key) {
    case 'PSB':
    case 'TEKNISI-PSB':
    case 'TEKNISI_PSB':
      return {
        primary: 'PSB',
        legacyTypes: ['PSB'],
        legacyJobCategories: ['PSB', 'PASANG BARU', 'INSTALLATION'],
      }
    case 'TROUBLE':
    case 'TROUBLESHOOTS':
    case 'TEKNISI-TROUBLESHOOTS':
    case 'TEKNISI_TROUBLESHOOTS':
      return {
        primary: 'TROUBLE',
        legacyTypes: ['TROUBLE', 'TROUBLESHOOT', 'COMPLAINT'],
        legacyJobCategories: ['TROUBLE', 'TROUBLESHOOT'],
      }
    case 'DISMANTLE':
    case 'TEKNISI-DISMANTLE':
    case 'TEKNISI_DISMANTLE':
      return {
        primary: 'DISMANTLE',
        legacyTypes: ['DISMANTLE', 'CABUT'],
        legacyJobCategories: ['DISMANTLE', 'CABUT'],
      }
    case 'EXPAN':
    case 'TEKNISI-EXPAN':
    case 'TEKNISI_EXPAN':
      return {
        primary: 'JALUR',
        legacyTypes: ['EXPAN', 'EXPANSION', 'JALUR'],
        legacyJobCategories: ['EXPAN', 'EXPANSION'],
      }
    case 'JOINTER':
    case 'TEKNISI-JOINTER':
    case 'TEKNISI_JOINTER':
      return {
        primary: 'JALUR',
        legacyTypes: ['JOINTER', 'JOINT', 'JALUR'],
        legacyJobCategories: ['JOINTER', 'JOINTING'],
      }
    default:
      return {
        primary: key,
        legacyTypes: [key],
        legacyJobCategories: [key],
      }
  }
}

function laneMatchesTicketType(
  laneKey: string,
  unifiedType: string | null | undefined,
  legacyCategory: string | null | undefined,
): boolean {
  const filter = resolveTicketTypeFilter(laneKey)
  const upUnified = String(unifiedType ?? '').trim().toUpperCase()
  const upCategory = String(legacyCategory ?? '').trim().toUpperCase()
  if (upUnified === filter.primary) return true
  if (filter.legacyTypes?.includes(upUnified)) return true
  if (filter.legacyJobCategories?.includes(upCategory)) return true
  if (upCategory === String(filter.primary).trim().toUpperCase()) return true
  const keyUp = String(laneKey ?? '').trim().toUpperCase()
  if (upUnified === keyUp || upCategory === keyUp) return true
  return false
}

export async function getTechnicianLaneTickets(
  laneKey: string,
  query: TechnicianLaneQuery,
  session: AppSession,
): Promise<{
  source: ReturnType<typeof getDataSourceSnapshot>
  items: TechnicianLaneTicketRow[]
  counters: TechnicianLaneCounters
  error: string | null
}> {
  const source = getDataSourceSnapshot()
  const userId = Number(session?.userId ?? 0)
  const emptyCounters: TechnicianLaneCounters = {
    assigned: 0,
    accepted: 0,
    onProgress: 0,
    submitted: 0,
    temporary: 0,
    total: 0,
  }
  const filter = resolveTicketTypeFilter(laneKey)

  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const mockItemsRaw: TechnicianLaneTicketRow[] = [
      {
        id: 1001,
        ticketCode: `${laneKey.toUpperCase()}-202609-0001`,
        ticketType: filter.primary,
        title: `${laneKey.toUpperCase()} Pelanggan Budi Santoso`,
        customerName: 'Budi Santoso',
        customerId: 501,
        address: 'Jl. Merdeka No. 123, Kel. Sukamaju, Kec. Cibadak',
        phone: '0812-3456-7890',
        priority: 'HIGH',
        status: 'ASSIGNED',
        openedAt: yesterday,
        assignedAt: twoHoursAgo,
        acceptedAt: null,
        startedAt: null,
        submittedAt: null,
        slaDueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        assignedUserId: userId,
        workOrderId: 2001,
        troubleTicketId: null,
        assignmentId: 3001,
        branchId: 1,
        description: `Pekerjaan ${laneKey} rutin area cabang pusat.`,
        jobCategory: laneKey.toUpperCase(),
      },
      {
        id: 1002,
        ticketCode: `${laneKey.toUpperCase()}-202609-0002`,
        ticketType: filter.primary,
        title: `${laneKey.toUpperCase()} Siti Rahayu`,
        customerName: 'Siti Rahayu',
        customerId: 502,
        address: 'Perumahan Griya Asri Blok A No. 5',
        phone: '0856-7890-1234',
        priority: 'MEDIUM',
        status: 'ACCEPTED',
        openedAt: yesterday,
        assignedAt: yesterday,
        acceptedAt: twoHoursAgo,
        startedAt: null,
        submittedAt: null,
        slaDueAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        assignedUserId: userId,
        workOrderId: 2002,
        troubleTicketId: null,
        assignmentId: 3002,
        branchId: 1,
        description: `Follow-up ${laneKey} setelah pembayaran lunas.`,
        jobCategory: laneKey.toUpperCase(),
      },
      {
        id: 1003,
        ticketCode: `${laneKey.toUpperCase()}-202609-0003`,
        ticketType: filter.primary,
        title: `${laneKey.toUpperCase()} Ahmad Fauzi`,
        customerName: 'Ahmad Fauzi',
        customerId: 503,
        address: 'Jl. Sudirman No. 45, RT 02 RW 05',
        phone: '0813-2222-3333',
        priority: 'URGENT',
        status: laneKey === 'TROUBLESHOOTS' || laneKey === 'TROUBLE' ? 'TEMPORARY' : 'ON_PROGRESS',
        openedAt: yesterday,
        assignedAt: yesterday,
        acceptedAt: yesterday,
        startedAt: twoHoursAgo,
        submittedAt: null,
        slaDueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        assignedUserId: userId,
        workOrderId: 2003,
        troubleTicketId: 7001,
        assignmentId: 3003,
        branchId: 1,
        description: `Keluhan utama sinyal hilang total. Sudah cek ODP, perlu material pengganti.`,
        jobCategory: laneKey.toUpperCase(),
      },
      {
        id: 1004,
        ticketCode: `${laneKey.toUpperCase()}-202609-0004`,
        ticketType: filter.primary,
        title: `${laneKey.toUpperCase()} Dewi Lestari`,
        customerName: 'Dewi Lestari',
        customerId: 504,
        address: 'Komplek Permata Hijau Kav. 12',
        phone: '0811-9988-7766',
        priority: 'LOW',
        status: 'SUBMITTED',
        openedAt: yesterday,
        assignedAt: yesterday,
        acceptedAt: yesterday,
        startedAt: yesterday,
        submittedAt: twoHoursAgo,
        slaDueAt: now,
        assignedUserId: userId,
        workOrderId: 2004,
        troubleTicketId: null,
        assignmentId: 3004,
        branchId: 1,
        description: `${laneKey} selesai, menunggu verifikasi NOC.`,
        jobCategory: laneKey.toUpperCase(),
      },
      {
        id: 1005,
        ticketCode: `${laneKey.toUpperCase()}-202609-0005`,
        ticketType: filter.primary,
        title: `${laneKey.toUpperCase()} Joko Susilo`,
        customerName: 'Joko Susilo',
        customerId: 505,
        address: 'Jl. Gatot Subroto KM 5',
        phone: '0821-1111-2222',
        priority: 'MEDIUM',
        status: 'ON_PROGRESS',
        openedAt: twoHoursAgo,
        assignedAt: twoHoursAgo,
        acceptedAt: twoHoursAgo,
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        submittedAt: null,
        slaDueAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
        assignedUserId: userId,
        workOrderId: 2005,
        troubleTicketId: null,
        assignmentId: 3005,
        branchId: 2,
        description: `${laneKey} berjalan lancar.`,
        jobCategory: laneKey.toUpperCase(),
      },
      {
        id: 1006,
        ticketCode: `${laneKey.toUpperCase()}-202609-0099`,
        ticketType: filter.primary === 'JALUR' ? (laneKey.toUpperCase() === 'EXPAN' ? 'EXPAN' : 'JOINTER') : filter.primary,
        title: `${laneKey.toUpperCase()} Rina Wati - Tidak ditugaskan ke saya`,
        customerName: 'Rina Wati',
        customerId: 599,
        address: 'Jl. Diponegoro No. 7',
        phone: '0852-3333-4444',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        openedAt: yesterday,
        assignedAt: twoHoursAgo,
        acceptedAt: null,
        startedAt: null,
        submittedAt: null,
        slaDueAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        assignedUserId: userId + 99,
        workOrderId: 2099,
        troubleTicketId: null,
        assignmentId: 3099,
        branchId: 1,
        description: `Contoh ticket ${laneKey} milik teknisi lain.`,
        jobCategory: laneKey.toUpperCase(),
      },
    ]
    let items = mockItemsRaw.filter((row) => {
      return Number(row.assignedUserId) === userId
    })
    items = items.filter((row) => laneMatchesTicketType(laneKey, row.ticketType, row.jobCategory))
    if (query.q) {
      const needle = String(query.q).trim().toUpperCase()
      items = items.filter((row) => {
        return (
          String(row.ticketCode ?? '').toUpperCase().includes(needle) ||
          String(row.customerName ?? '').toUpperCase().includes(needle) ||
          String(row.address ?? '').toUpperCase().includes(needle)
        )
      })
    }
    if (query.status) {
      const s = String(query.status).trim().toUpperCase()
      items = items.filter((row) => String(row.status ?? '').toUpperCase() === s)
    }
    if (query.priority) {
      const p = String(query.priority).trim().toUpperCase()
      items = items.filter((row) => String(row.priority ?? '').toUpperCase() === p)
    }
    const counters: TechnicianLaneCounters = { ...emptyCounters, total: items.length }
    for (const row of items) {
      const st = String(row.status ?? '').trim().toUpperCase()
      if (st === 'ASSIGNED') counters.assigned++
      if (st === 'ACCEPTED') counters.accepted++
      if (st === 'ON_PROGRESS' || st === 'IN_PROGRESS') counters.onProgress++
      if (st === 'TEMPORARY' || st === 'PENDING' || st === 'ON_HOLD') counters.temporary++
      if (st === 'SUBMITTED') counters.submitted++
    }
    return { source, items, counters, error: null }
  }

  try {
    await ensureTicketsUnifiedTable()
    const sessionUserId = Number(userId)
    const activePlaceholders = Q3_ASSIGNMENT_ACTIVE_STATUSES.map(() => '?').join(', ')

    const hasAssignedUserId = await hasReviewDbColumn('tickets', 'assigned_user_id')
    const hasSlaDueAt = await hasReviewDbColumn('tickets', 'sla_due_at')
    const hasTitle = await hasReviewDbColumn('tickets', 'title')
    const hasDescription = await hasReviewDbColumn('tickets', 'description')
    const hasCustomerName = await hasReviewDbColumn('tickets', 'customer_name')
    const hasCustomerId = await hasReviewDbColumn('tickets', 'customer_id')
    const hasBranchId = await hasReviewDbColumn('tickets', 'branch_id')
    const hasOpenedAt = await hasReviewDbColumn('tickets', 'opened_at')
    const hasSubmittedAt = await hasReviewDbColumn('tickets', 'submitted_at')
    const hasWorkOrderId = await hasReviewDbColumn('tickets', 'work_order_id')
    const hasTroubleTicketId = await hasReviewDbColumn('tickets', 'trouble_ticket_id')
    const hasTicketType = await hasReviewDbColumn('tickets', 'ticket_type')
    const hasPriority = await hasReviewDbColumn('tickets', 'priority')
    const hasStatus = await hasReviewDbColumn('tickets', 'status')
    const hasTicketCode = await hasReviewDbColumn('tickets', 'ticket_code')

    const unifiedSelectCols: string[] = []
    if (hasTicketCode) unifiedSelectCols.push('t.ticket_code AS ticketCode')
    if (hasTicketType) unifiedSelectCols.push('t.ticket_type AS ticketType')
    if (hasTitle) unifiedSelectCols.push('t.title AS title')
    if (hasDescription) unifiedSelectCols.push('t.description AS description')
    if (hasCustomerName) unifiedSelectCols.push('t.customer_name AS customerName')
    if (hasCustomerId) unifiedSelectCols.push('t.customer_id AS customerId')
    if (hasBranchId) unifiedSelectCols.push('t.branch_id AS branchId')
    if (hasStatus) unifiedSelectCols.push('t.status AS status')
    if (hasPriority) unifiedSelectCols.push('t.priority AS priority')
    if (hasOpenedAt) unifiedSelectCols.push('t.opened_at AS openedAt')
    if (hasAssignedUserId) unifiedSelectCols.push('t.assigned_user_id AS assignedUserId')
    if (hasSlaDueAt) unifiedSelectCols.push('t.sla_due_at AS slaDueAt')
    if (hasSubmittedAt) unifiedSelectCols.push('t.submitted_at AS submittedAt')
    if (hasWorkOrderId) unifiedSelectCols.push('t.work_order_id AS workOrderId')
    if (hasTroubleTicketId) unifiedSelectCols.push('t.trouble_ticket_id AS troubleTicketId')

    const bindBase: unknown[] = [
      sessionUserId,
      Q3_ASSIGNMENT_ROLE_CANONICAL,
      ...Q3_ASSIGNMENT_ACTIVE_STATUSES,
    ]

    const filterClauses: string[] = []

    const q = String(query.q ?? '').trim()
    if (q) {
      filterClauses.push(
        '(UPPER(COALESCE(t.ticket_code, \'\')) LIKE ? OR UPPER(COALESCE(t.customer_name, \'\')) LIKE ?)',
      )
      const like = normalizeLike(q)
      bindBase.push(like, like)
    }
    if (query.status) {
      filterClauses.push('UPPER(COALESCE(t.status, \'\')) = ?')
      bindBase.push(String(query.status).trim().toUpperCase())
    }
    if (query.priority) {
      filterClauses.push('UPPER(COALESCE(t.priority, \'\')) = ?')
      bindBase.push(String(query.priority).trim().toUpperCase())
    }

    const whereClause = filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''

    const tSelect = unifiedSelectCols.length > 0 ? unifiedSelectCols.join(', ') : 't.id AS id'

    const sql = `
      SELECT t.id AS id,
             ${tSelect},
             wo.job_category AS jobCategory,
             sub.address AS address,
             sub.customer_phone AS phone,
             a.id AS assignmentId,
             a.assigned_at AS assignedAt,
             a.accepted_at AS acceptedAt,
             wo.started_at AS startedAt
      FROM tickets t
      LEFT JOIN service_work_orders wo ON wo.id = t.work_order_id
      LEFT JOIN sales_subscriptions sub ON sub.id = COALESCE(t.subscription_id, wo.subscription_id)
      LEFT JOIN service_work_order_assignments a
             ON a.work_order_id = wo.id
            AND a.assigned_user_id = ?
            AND a.assignment_role = ?
            AND a.assignment_status IN (${activePlaceholders})
            AND a.released_at IS NULL
      WHERE (
              (t.assigned_user_id IS NOT NULL AND t.assigned_user_id = ?)
              OR a.id IS NOT NULL
            )
            AND (
              (t.submitted_at IS NULL AND t.completed_at IS NULL AND t.closed_at IS NULL)
              OR t.status IN ('SUBMITTED', 'TEMPORARY', 'PENDING', 'ON_HOLD')
            )
            ${whereClause}
      ORDER BY COALESCE(a.assigned_at, t.opened_at) DESC
      LIMIT 200
    `
    const allBinds: unknown[] = [
      ...bindBase,
      sessionUserId,
    ]
    const rawRows = await runReviewDbQuery<Record<string, unknown>>(sql, allBinds).catch((err) => {
      console.error('[technician-lane-service] tickets query error:', err)
      return []
    })
    const items: TechnicianLaneTicketRow[] = []
    for (const r of rawRows) {
      const typeOk = laneMatchesTicketType(
        laneKey,
        String(r.ticketType ?? ''),
        String(r.jobCategory ?? ''),
      )
      if (!typeOk) continue
      items.push({
        id: Number(r.id ?? 0),
        ticketCode: String(r.ticketCode ?? r.id ?? ''),
        ticketType: String(r.ticketType ?? filter.primary),
        title: r.title != null ? String(r.title) : null,
        customerName: r.customerName != null ? String(r.customerName) : null,
        customerId: Number(r.customerId ?? 0) || null,
        address: r.address != null ? String(r.address) : null,
        phone: r.phone != null ? String(r.phone) : null,
        priority: String(r.priority ?? 'MEDIUM'),
        status: String(r.status ?? 'OPEN'),
        openedAt: r.openedAt != null ? String(r.openedAt) : null,
        assignedAt: r.assignedAt != null ? String(r.assignedAt) : null,
        acceptedAt: r.acceptedAt != null ? String(r.acceptedAt) : null,
        startedAt: r.startedAt != null ? String(r.startedAt) : null,
        submittedAt: r.submittedAt != null ? String(r.submittedAt) : null,
        slaDueAt: r.slaDueAt != null ? String(r.slaDueAt) : null,
        assignedUserId: Number(r.assignedUserId ?? sessionUserId) || null,
        workOrderId: Number(r.workOrderId ?? 0) || null,
        troubleTicketId: Number(r.troubleTicketId ?? 0) || null,
        assignmentId: Number(r.assignmentId ?? 0) || null,
        branchId: Number(r.branchId ?? 0) || null,
        description: r.description != null ? String(r.description) : null,
        jobCategory: r.jobCategory != null ? String(r.jobCategory) : null,
      })
    }
    const counters: TechnicianLaneCounters = { ...emptyCounters, total: items.length }
    for (const row of items) {
      const st = String(row.status ?? '').trim().toUpperCase()
      if (st === 'ASSIGNED') counters.assigned++
      if (st === 'ACCEPTED') counters.accepted++
      if (st === 'ON_PROGRESS' || st === 'IN_PROGRESS') counters.onProgress++
      if (st === 'TEMPORARY' || st === 'PENDING' || st === 'ON_HOLD') counters.temporary++
      if (st === 'SUBMITTED') counters.submitted++
    }
    return { source, items, counters, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      source,
      items: [],
      counters: emptyCounters,
      error: `Gagal memuat daftar ticket ${laneKey}: ${message}`,
    }
  }
}

export async function getTechnicianLaneTicketDetail(
  ticketId: number,
  session: AppSession,
): Promise<TechnicianLaneTicketDetail | null> {
  const id = Number(ticketId ?? 0)
  if (!id || id <= 0) return null
  const userId = Number(session?.userId ?? 0)
  try {
    await ensureTicketsUnifiedTable()
    const baseRows = await runReviewDbQuery<Record<string, unknown>>(
      `
        SELECT t.*, wo.job_category AS jobCategory, wo.started_at AS startedAt,
               sub.address AS address, sub.customer_phone AS phone,
               a.id AS assignmentId, a.assigned_at AS assignedAt, a.accepted_at AS acceptedAt
        FROM tickets t
        LEFT JOIN service_work_orders wo ON wo.id = t.work_order_id
        LEFT JOIN sales_subscriptions sub ON sub.id = COALESCE(t.subscription_id, wo.subscription_id)
        LEFT JOIN service_work_order_assignments a
               ON a.work_order_id = wo.id
              AND a.assigned_user_id = ?
              AND a.released_at IS NULL
        WHERE t.id = ?
        LIMIT 1
      `,
      [userId, id],
    ).catch(() => [])
    if (!baseRows[0]) return null
    const r = baseRows[0]
    const evidences = await runReviewDbQuery<Record<string, unknown>>(
      `
        SELECT e.id, e.ticket_id AS ticketId, e.uploaded_by_user_id AS uploadedByUserId,
               e.uploaded_at AS uploadedAt, e.evidence_type AS evidenceType,
               e.storage_reference AS storageReference, e.notes AS notes,
               u.display_name AS uploadedByName
        FROM ticket_work_evidences e
        LEFT JOIN auth_users u ON u.id = e.uploaded_by_user_id
        WHERE e.ticket_id = ?
        ORDER BY e.uploaded_at DESC
        LIMIT 50
      `,
      [id],
    ).catch(() => [])
    const tempPeriods = await runReviewDbQuery<Record<string, unknown>>(
      `
        SELECT id, ticket_id AS ticketId, started_at AS startedAt, ended_at AS endedAt,
               reason, status
        FROM tickets_temporary_periods
        WHERE ticket_id = ?
        ORDER BY started_at DESC
        LIMIT 50
      `,
      [id],
    ).catch(() => [])
    const timeline: TechnicianLaneTimelineEntry[] = []
    if (r.opened_at) timeline.push({ key: 'opened', label: 'Dibuka', at: String(r.opened_at) })
    if (r.assignedAt) timeline.push({ key: 'assigned', label: 'Ditugaskan', at: String(r.assignedAt) })
    if (r.acceptedAt) timeline.push({ key: 'accepted', label: 'Diterima', at: String(r.acceptedAt) })
    if (r.startedAt) timeline.push({ key: 'started', label: 'Mulai Pengerjaan', at: String(r.startedAt) })
    for (const p of tempPeriods) {
      if (p.startedAt) {
        timeline.push({
          key: `temp-start-${p.id}`,
          label: `Temporary Mulai${p.reason ? ` (${String(p.reason).slice(0, 30)})` : ''}`,
          at: String(p.startedAt),
          note: String(p.reason ?? ''),
        })
      }
      if (p.endedAt) {
        timeline.push({ key: `temp-end-${p.id}`, label: 'Temporary Selesai / Resume', at: String(p.endedAt) })
      }
    }
    if (r.submitted_at) timeline.push({ key: 'submitted', label: 'Disubmit', at: String(r.submitted_at) })
    if (r.completed_at) timeline.push({ key: 'completed', label: 'Selesai', at: String(r.completed_at) })
    if (r.closed_at) timeline.push({ key: 'closed', label: 'Ditutup', at: String(r.closed_at) })
    timeline.sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0
      const tb = b.at ? new Date(b.at).getTime() : 0
      return ta - tb
    })
    return {
      id: Number(r.id ?? 0),
      ticketCode: String(r.ticket_code ?? r.id ?? ''),
      ticketType: String(r.ticket_type ?? ''),
      title: r.title != null ? String(r.title) : null,
      customerName: r.customer_name != null ? String(r.customer_name) : null,
      customerId: Number(r.customer_id ?? 0) || null,
      address: r.address != null ? String(r.address) : (r.customer_name != null ? String(r.customer_name) : null),
      phone: r.phone != null ? String(r.phone) : null,
      priority: String(r.priority ?? 'MEDIUM'),
      status: String(r.status ?? 'OPEN'),
      openedAt: r.opened_at != null ? String(r.opened_at) : null,
      assignedAt: r.assignedAt != null ? String(r.assignedAt) : null,
      acceptedAt: r.acceptedAt != null ? String(r.acceptedAt) : null,
      startedAt: r.startedAt != null ? String(r.startedAt) : null,
      submittedAt: r.submitted_at != null ? String(r.submitted_at) : null,
      slaDueAt: r.sla_due_at != null ? String(r.sla_due_at) : null,
      assignedUserId: Number(r.assigned_user_id ?? userId) || null,
      workOrderId: Number(r.work_order_id ?? 0) || null,
      troubleTicketId: Number(r.trouble_ticket_id ?? 0) || null,
      assignmentId: Number(r.assignmentId ?? 0) || null,
      branchId: Number(r.branch_id ?? 0) || null,
      description: r.description != null ? String(r.description) : null,
      jobCategory: r.jobCategory != null ? String(r.jobCategory) : null,
      evidences: evidences.map((e) => ({
        id: Number(e.id ?? 0),
        ticketId: Number(e.ticketId ?? 0),
        uploadedByUserId: Number(e.uploadedByUserId ?? 0) || null,
        uploadedByName: e.uploadedByName != null ? String(e.uploadedByName) : null,
        uploadedAt: e.uploadedAt != null ? String(e.uploadedAt) : null,
        evidenceType: e.evidenceType != null ? String(e.evidenceType) : null,
        storageReference: e.storageReference != null ? String(e.storageReference) : null,
        notes: e.notes != null ? String(e.notes) : null,
      })),
      timeline,
      temporaryPeriods: tempPeriods.map((p) => ({
        id: Number(p.id ?? 0),
        startedAt: p.startedAt != null ? String(p.startedAt) : null,
        endedAt: p.endedAt != null ? String(p.endedAt) : null,
        reason: p.reason != null ? String(p.reason) : null,
        status: p.status != null ? String(p.status) : null,
      })),
    }
  } catch {
    return null
  }
}
