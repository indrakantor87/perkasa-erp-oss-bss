import {
  DAILY_ACTIVITY_PLANNING_LEVELS,
  dailyActivityPlanningLevelLabels,
  getDailyActivityDivisionOptions,
  getDailyActivitySubdivisionMap,
  isValidDailyActivityDivision,
  isValidDailyActivitySubdivision,
  normalizeDailyActivityDivisionName,
  normalizeDailyActivitySubdivisionName,
  resolveDefaultDailyActivitySubdivision,
  type DailyActivityPlanningLevel,
} from '@/lib/daily-activity-org'
import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import type { AppSession } from '@/lib/auth-session'
import { getRoleMeta } from '@/lib/role-meta'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { resolveDailyActivityOrgContext } from '@/lib/services/daily-activity-user-profile-service'
import type { DataSourceSnapshot } from '@/lib/types'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type DailyActivityCountRow = {
  total: number
}

type DailyActivityDbRow = {
  activityId: number
  activityCode: string
  activityDate: string
  plannedUsername: string
  plannedBy: string
  roleCode: string
  planningLevel: string
  divisionName: string | null
  subdivisionName: string | null
  taskTitle: string
  taskDetail: string | null
  successMetric: string | null
  priorityLevel: string
  executionStatus: string
  approvalStatus: string | null
  approvalNotes: string | null
  approvedBy: string | null
  approvedAt: string | null
  closeNotes: string | null
  pendingReason: string | null
  followUpAction: string | null
  plannedAt: string
  closedAt: string | null
}

export type DailyActivityApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

export type DailyActivityItem = {
  id: number
  activityCode: string
  activityDate: string
  plannedUsername: string
  plannedBy: string
  roleCode: string
  planningLevel: DailyActivityPlanningLevel
  divisionName: string | null
  subdivisionName: string | null
  taskTitle: string
  taskDetail: string | null
  successMetric: string | null
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  executionStatus: 'PLANNED' | 'DONE' | 'PENDING'
  approvalStatus: DailyActivityApprovalStatus
  approvalNotes: string | null
  approvedBy: string | null
  approvedAt: string | null
  closeNotes: string | null
  pendingReason: string | null
  followUpAction: string | null
  plannedAt: string
  closedAt: string | null
}

export type DailyActivitySummary = {
  totalPlans: number
  totalDone: number
  totalPending: number
  totalOpen: number
}

export type DailyActivityPerformanceBucket = DailyActivitySummary & {
  label: string
  completionRate: number
}

export type DailyActivityPerformancePeriod = DailyActivityPerformanceBucket & {
  periodLabel: string
  divisionBreakdowns: DailyActivityPerformanceBucket[]
  levelBreakdowns: DailyActivityPerformanceBucket[]
}

export type DailyActivityCalendarDay = {
  key: string
  date: string | null
  dayNumber: string
  isPlaceholder: boolean
  isToday: boolean
  totalPlans: number
  doneCount: number
  pendingCount: number
  openCount: number
  completionRate: number
}

export type DailyActivityOption = {
  value: string
  label: string
}

export type DailyActivityPageData = {
  source: DataSourceSnapshot
  scopeLabel: string
  todayLabel: string
  defaultActivityDate: string
  defaultPlanningLevel: string
  lockOrgFields: boolean
  summary: DailyActivitySummary
  todayItems: DailyActivityItem[]
  recentItems: DailyActivityItem[]
  closeSuggestions: string[]
  approvalSuggestions: string[]
  pendingApprovals: DailyActivityItem[]
  planningLevelOptions: DailyActivityOption[]
  divisionOptions: string[]
  subdivisionMap: Record<string, string[]>
  defaultDivision: string
  defaultSubdivision: string
  selectedDivision: string
  selectedSubdivision: string
  selectedPlanningLevel: string
  selectedApprovalStatus: string
  performance: {
    daily: DailyActivityPerformancePeriod
    weekly: DailyActivityPerformancePeriod
    monthly: DailyActivityPerformancePeriod
  }
  calendarMonth: string
  calendarPrevMonth: string
  calendarNextMonth: string
  calendarMonthLabel: string
  calendarDays: DailyActivityCalendarDay[]
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatMonthLabel(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getTodayIsoDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function normalizeCalendarMonth(value: string | null | undefined) {
  const normalized = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    return null
  }

  const date = new Date(`${normalized}-01T00:00:00`)
  if (!Number.isFinite(date.getTime())) {
    return null
  }

  return normalized
}

function shiftCalendarMonth(value: string, offset: number) {
  const date = new Date(`${value}-01T00:00:00`)
  date.setMonth(date.getMonth() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getWeekStartIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().slice(0, 10)
}

function normalizePriority(value: string): DailyActivityItem['priorityLevel'] {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'HIGH') return 'HIGH'
  if (normalized === 'LOW') return 'LOW'
  return 'MEDIUM'
}

function normalizeStatus(value: string): DailyActivityItem['executionStatus'] {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'DONE') return 'DONE'
  if (normalized === 'PENDING') return 'PENDING'
  return 'PLANNED'
}

function normalizePlanningLevel(value: string): DailyActivityPlanningLevel {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'MANAGER') return 'MANAGER'
  if (normalized === 'SPV') return 'SPV'
  return 'LEADER'
}

function normalizeApprovalStatus(value: string | null | undefined): DailyActivityApprovalStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'PENDING') return 'PENDING'
  if (normalized === 'APPROVED') return 'APPROVED'
  if (normalized === 'REJECTED') return 'REJECTED'
  return 'NONE'
}

function mapRowToItem(row: DailyActivityDbRow): DailyActivityItem {
  return {
    id: Number(row.activityId),
    activityCode: String(row.activityCode),
    activityDate: String(row.activityDate),
    plannedUsername: String(row.plannedUsername),
    plannedBy: String(row.plannedBy),
    roleCode: String(row.roleCode),
    planningLevel: normalizePlanningLevel(String(row.planningLevel)),
    divisionName: row.divisionName ? normalizeDailyActivityDivisionName(String(row.divisionName)) : null,
    subdivisionName: row.subdivisionName ? normalizeDailyActivitySubdivisionName(String(row.subdivisionName)) : null,
    taskTitle: String(row.taskTitle),
    taskDetail: row.taskDetail ? String(row.taskDetail) : null,
    successMetric: row.successMetric ? String(row.successMetric) : null,
    priorityLevel: normalizePriority(String(row.priorityLevel)),
    executionStatus: normalizeStatus(String(row.executionStatus)),
    approvalStatus: normalizeApprovalStatus(row.approvalStatus),
    approvalNotes: row.approvalNotes ? String(row.approvalNotes) : null,
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    approvedAt: row.approvedAt ? String(row.approvedAt) : null,
    closeNotes: row.closeNotes ? String(row.closeNotes) : null,
    pendingReason: row.pendingReason ? String(row.pendingReason) : null,
    followUpAction: row.followUpAction ? String(row.followUpAction) : null,
    plannedAt: String(row.plannedAt),
    closedAt: row.closedAt ? String(row.closedAt) : null,
  }
}

function buildSummary(items: DailyActivityItem[]): DailyActivitySummary {
  const totalDone = items.filter(
    (item) => item.executionStatus === 'DONE' && item.approvalStatus === 'APPROVED',
  ).length
  const totalPending = items.filter(
    (item) => item.executionStatus === 'PENDING' && item.approvalStatus === 'APPROVED',
  ).length

  return {
    totalPlans: items.length,
    totalDone,
    totalPending,
    totalOpen: Math.max(items.length - totalDone - totalPending, 0),
  }
}

function computeCompletionRate(summary: DailyActivitySummary) {
  if (summary.totalPlans === 0) {
    return 0
  }

  return Math.round((summary.totalDone / summary.totalPlans) * 100)
}

function buildBucket(label: string, items: DailyActivityItem[]): DailyActivityPerformanceBucket {
  const summary = buildSummary(items)
  return {
    label,
    ...summary,
    completionRate: computeCompletionRate(summary),
  }
}

function buildBreakdowns(
  items: DailyActivityItem[],
  getLabel: (item: DailyActivityItem) => string,
): DailyActivityPerformanceBucket[] {
  const map = new Map<string, DailyActivityItem[]>()
  for (const item of items) {
    const label = getLabel(item)
    map.set(label, [...(map.get(label) ?? []), item])
  }

  return Array.from(map.entries())
    .map(([label, bucketItems]) => buildBucket(label, bucketItems))
    .sort(
      (left, right) =>
        right.totalPlans - left.totalPlans ||
        right.completionRate - left.completionRate ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 8)
}

function buildPerformancePeriod(periodLabel: string, items: DailyActivityItem[]): DailyActivityPerformancePeriod {
  return {
    periodLabel,
    ...buildBucket(periodLabel, items),
    divisionBreakdowns: buildBreakdowns(items, (item) =>
      `${item.divisionName || 'Tanpa Divisi'}${item.subdivisionName ? ` / ${item.subdivisionName}` : ''}`,
    ),
    levelBreakdowns: buildBreakdowns(items, (item) => dailyActivityPlanningLevelLabels[item.planningLevel]),
  }
}

function buildCloseSuggestions(items: DailyActivityItem[], username: string) {
  return items
    .filter(
      (item) =>
        (item.executionStatus === 'PLANNED' || item.approvalStatus === 'REJECTED') &&
        item.plannedUsername.trim().toLowerCase() === username.trim().toLowerCase(),
    )
    .map(
      (item) =>
        `${item.id} | ${item.activityCode} | ${dailyActivityPlanningLevelLabels[item.planningLevel]} | ${item.divisionName || '-'}${item.subdivisionName ? ` / ${item.subdivisionName}` : ''} | ${item.taskTitle}`,
    )
}

function buildCalendarDays(
  items: DailyActivityItem[],
  todayIsoDate: string,
  monthPrefix: string,
): DailyActivityCalendarDay[] {
  const monthStart = `${monthPrefix}-01`
  const monthStartDate = new Date(`${monthStart}T00:00:00`)
  const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0)
  const firstWeekday = (monthStartDate.getDay() + 6) % 7
  const days: DailyActivityCalendarDay[] = []

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push({
      key: `placeholder-${index}`,
      date: null,
      dayNumber: '',
      isPlaceholder: true,
      isToday: false,
      totalPlans: 0,
      doneCount: 0,
      pendingCount: 0,
      openCount: 0,
      completionRate: 0,
    })
  }

  for (let day = 1; day <= monthEndDate.getDate(); day += 1) {
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`
    const dateItems = items.filter((item) => item.activityDate === date)
    const summary = buildSummary(dateItems)
    days.push({
      key: date,
      date,
      dayNumber: String(day),
      isPlaceholder: false,
      isToday: date === todayIsoDate,
      totalPlans: summary.totalPlans,
      doneCount: summary.totalDone,
      pendingCount: summary.totalPending,
      openCount: summary.totalOpen,
      completionRate: computeCompletionRate(summary),
    })
  }

  return days
}

function getMockItems(session: AppSession): DailyActivityItem[] {
  const today = getTodayIsoDate()
  const yesterday = shiftIsoDate(today, -1)
  const twoDaysAgo = shiftIsoDate(today, -2)
  const fiveDaysAgo = shiftIsoDate(today, -5)
  const eightDaysAgo = shiftIsoDate(today, -8)
  const roleMeta = getRoleMeta(session.role)

  return [
    {
      id: 1,
      activityCode: 'DA-202607-0001',
      activityDate: today,
      plannedUsername: session.username,
      plannedBy: session.displayName,
      roleCode: session.role,
      planningLevel: 'LEADER',
      divisionName: roleMeta.division,
      subdivisionName: resolveDefaultDailyActivitySubdivision(roleMeta.division, roleMeta.subdivision),
      taskTitle: 'Koordinasi target aktivitas tim hari ini',
      taskDetail: 'Susun prioritas kerja pagi per sub-divisi agar semua tugas yang kritis langsung terlihat.',
      successMetric: 'Prioritas harian dan PIC tiap aktivitas terpetakan.',
      priorityLevel: 'HIGH',
      executionStatus: 'PLANNED',
      approvalStatus: 'NONE',
      approvalNotes: null,
      approvedBy: null,
      approvedAt: null,
      closeNotes: null,
      pendingReason: null,
      followUpAction: null,
      plannedAt: `${today} 08:05:00`,
      closedAt: null,
    },
    {
      id: 2,
      activityCode: 'DA-202607-0002',
      activityDate: today,
      plannedUsername: 'support.ops',
      plannedBy: 'Operator NOC Support',
      roleCode: 'NOC_OPERATOR',
      planningLevel: 'SPV',
      divisionName: 'Pemasaran & Pelayanan',
      subdivisionName: 'NOC',
      taskTitle: 'Monitoring ticket prioritas tinggi',
      taskDetail: 'Validasi daftar gangguan yang berpotensi melewati SLA.',
      successMetric: 'Seluruh ticket prioritas tinggi mendapat status follow up.',
      priorityLevel: 'HIGH',
      executionStatus: 'DONE',
      approvalStatus: 'APPROVED',
      approvalNotes: 'Disetujui manajer harian.',
      approvedBy: 'Manager Support',
      approvedAt: `${today} 18:05:00`,
      closeNotes: 'Ticket prioritas sudah dipilah dan 2 kasus kritis berhasil dieskalasikan.',
      pendingReason: null,
      followUpAction: null,
      plannedAt: `${today} 08:10:00`,
      closedAt: `${today} 16:42:00`,
    },
    {
      id: 3,
      activityCode: 'DA-202607-0003',
      activityDate: today,
      plannedUsername: 'cs.review',
      plannedBy: 'Admin CS Review',
      roleCode: 'CS_ADMIN',
      planningLevel: 'MANAGER',
      divisionName: 'Pemasaran & Pelayanan',
      subdivisionName: 'Admin CS',
      taskTitle: 'Rekap order pending verifikasi',
      taskDetail: 'Susun daftar order yang masih butuh kelengkapan data sebelum dijadwalkan.',
      successMetric: 'Daftar order pending verifikasi siap diteruskan ke tim terkait.',
      priorityLevel: 'MEDIUM',
      executionStatus: 'PENDING',
      approvalStatus: 'PENDING',
      approvalNotes: null,
      approvedBy: null,
      approvedAt: null,
      closeNotes: 'Sebagian order belum lengkap karena dokumen pelanggan belum masuk.',
      pendingReason: 'Dokumen pendukung pelanggan belum seluruhnya diterima.',
      followUpAction: 'Lanjut follow up pelanggan dan tutup gap dokumen besok pagi.',
      plannedAt: `${today} 08:20:00`,
      closedAt: `${today} 16:55:00`,
    },
    {
      id: 4,
      activityCode: 'DA-202607-0004',
      activityDate: yesterday,
      plannedUsername: 'admin.perkasa',
      plannedBy: 'Super Admin Perkasa',
      roleCode: 'SUPER_ADMIN',
      planningLevel: 'MANAGER',
      divisionName: 'General Affair',
      subdivisionName: 'Inventory',
      taskTitle: 'Kontrol ketersediaan stok cepat',
      taskDetail: 'Pastikan stok material prioritas aman untuk kebutuhan teknisi.',
      successMetric: 'Item kritis dan kebutuhan restock harian teridentifikasi.',
      priorityLevel: 'HIGH',
      executionStatus: 'DONE',
      approvalStatus: 'APPROVED',
      approvalNotes: 'Approved daily stock control.',
      approvedBy: 'Super Admin Perkasa',
      approvedAt: `${yesterday} 18:10:00`,
      closeNotes: 'Daftar item kritis selesai diringkas dan diteruskan ke gudang.',
      pendingReason: null,
      followUpAction: null,
      plannedAt: `${yesterday} 08:00:00`,
      closedAt: `${yesterday} 17:05:00`,
    },
    {
      id: 5,
      activityCode: 'DA-202607-0005',
      activityDate: twoDaysAgo,
      plannedUsername: 'support.ops',
      plannedBy: 'Operator NOC Support',
      roleCode: 'NOC_OPERATOR',
      planningLevel: 'LEADER',
      divisionName: 'Teknisi',
      subdivisionName: 'Teknisi PSB',
      taskTitle: 'Sinkron jadwal kunjungan instalasi',
      taskDetail: 'Cocokkan job teknisi dan area kerja yang harus dikejar pada hari berikutnya.',
      successMetric: 'Jadwal teknisi dan area kunjungan lebih rapi.',
      priorityLevel: 'MEDIUM',
      executionStatus: 'DONE',
      approvalStatus: 'APPROVED',
      approvalNotes: 'Approved oleh manager teknisi.',
      approvedBy: 'Manager Teknisi',
      approvedAt: `${twoDaysAgo} 18:00:00`,
      closeNotes: 'Jadwal teknisi dan area prioritas berhasil disinkronkan.',
      pendingReason: null,
      followUpAction: null,
      plannedAt: `${twoDaysAgo} 07:55:00`,
      closedAt: `${twoDaysAgo} 16:20:00`,
    },
    {
      id: 6,
      activityCode: 'DA-202607-0006',
      activityDate: fiveDaysAgo,
      plannedUsername: 'cs.review',
      plannedBy: 'Admin CS Review',
      roleCode: 'CS_ADMIN',
      planningLevel: 'SPV',
      divisionName: 'Operasional',
      subdivisionName: 'Kantor',
      taskTitle: 'Rapikan tiket administrasi operasional',
      taskDetail: 'Pastikan tiket administrasi kantor yang menumpuk mendapatkan tindak lanjut.',
      successMetric: 'Tiket administrasi operasional berkurang dan lebih terkendali.',
      priorityLevel: 'LOW',
      executionStatus: 'PENDING',
      approvalStatus: 'REJECTED',
      approvalNotes: 'Mohon detailkan kendala dan rencana aksi lanjut lebih spesifik.',
      approvedBy: 'Manager Operasional',
      approvedAt: `${fiveDaysAgo} 18:15:00`,
      closeNotes: 'Masih ada tiket yang perlu konfirmasi silang antar bagian.',
      pendingReason: 'Data pendukung dari bagian terkait belum lengkap.',
      followUpAction: 'Lakukan koordinasi lanjutan dengan bagian terkait esok pagi.',
      plannedAt: `${fiveDaysAgo} 08:15:00`,
      closedAt: `${fiveDaysAgo} 16:50:00`,
    },
    {
      id: 7,
      activityCode: 'DA-202607-0007',
      activityDate: eightDaysAgo,
      plannedUsername: 'support.ops',
      plannedBy: 'Operator NOC Support',
      roleCode: 'NOC_OPERATOR',
      planningLevel: 'MANAGER',
      divisionName: 'Finance & HR',
      subdivisionName: null,
      taskTitle: 'Review backlog absensi harian',
      taskDetail: 'Tutup gap data absensi yang masih belum sinkron.',
      successMetric: 'Temuan absensi bermasalah terkumpul untuk ditindaklanjuti.',
      priorityLevel: 'MEDIUM',
      executionStatus: 'DONE',
      approvalStatus: 'APPROVED',
      approvalNotes: 'Approved audit absensi.',
      approvedBy: 'Manager Finance & HR',
      approvedAt: `${eightDaysAgo} 18:00:00`,
      closeNotes: 'Temuan backlog absensi berhasil dipetakan untuk tindak lanjut.',
      pendingReason: null,
      followUpAction: null,
      plannedAt: `${eightDaysAgo} 08:30:00`,
      closedAt: `${eightDaysAgo} 16:00:00`,
    },
  ]
}

export async function ensureDailyActivityTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS daily_activity_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        activity_code VARCHAR(40) NOT NULL,
        activity_date DATE NOT NULL,
        planned_username VARCHAR(120) NOT NULL,
        planned_by VARCHAR(150) NOT NULL,
        role_code VARCHAR(50) NOT NULL,
        planning_level VARCHAR(20) NOT NULL DEFAULT 'LEADER',
        division_name VARCHAR(120) NULL,
        subdivision_name VARCHAR(150) NULL,
        task_title VARCHAR(180) NOT NULL,
        task_detail TEXT NULL,
        success_metric TEXT NULL,
        priority_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        execution_status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
        approval_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
        approval_notes TEXT NULL,
        approved_by_username VARCHAR(120) NULL,
        approved_by VARCHAR(150) NULL,
        approved_at DATETIME NULL,
        close_notes TEXT NULL,
        pending_reason TEXT NULL,
        follow_up_action TEXT NULL,
        closed_by_username VARCHAR(120) NULL,
        closed_by VARCHAR(150) NULL,
        planned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_daily_activity_items_code (activity_code),
        KEY idx_daily_activity_items_date (activity_date, execution_status),
        KEY idx_daily_activity_items_owner (planned_username, activity_date),
        KEY idx_daily_activity_items_scope (division_name, subdivision_name, planning_level),
        KEY idx_daily_activity_items_approval (approval_status, activity_date, division_name, subdivision_name)
      )
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE daily_activity_items
      ADD COLUMN IF NOT EXISTS planning_level VARCHAR(20) NOT NULL DEFAULT 'LEADER' AFTER role_code
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE daily_activity_items
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'NONE' AFTER execution_status
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE daily_activity_items
      ADD COLUMN IF NOT EXISTS approval_notes TEXT NULL AFTER approval_status
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE daily_activity_items
      ADD COLUMN IF NOT EXISTS approved_by_username VARCHAR(120) NULL AFTER approval_notes
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE daily_activity_items
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(150) NULL AFTER approved_by_username
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE daily_activity_items
      ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER approved_by
    `,
  )
}

export async function generateDailyActivityCode(activityDate: string) {
  const parsedDate = new Date(activityDate)
  if (!Number.isFinite(parsedDate.getTime())) {
    throw new Error('Tanggal aktivitas harian tidak valid.')
  }

  const year = parsedDate.getFullYear()
  const month = parsedDate.getMonth() + 1
  const period = `${year}${String(month).padStart(2, '0')}`
  const [row] = await runReviewDbQuery<DailyActivityCountRow>(
    `
      SELECT COUNT(*) AS total
      FROM daily_activity_items
      WHERE YEAR(activity_date) = ?
        AND MONTH(activity_date) = ?
    `,
    [year, month],
  )
  const sequence = Number(row?.total ?? 0) + 1
  return `DA-${period}-${String(sequence).padStart(4, '0')}`
}

export async function getDailyActivityPageData(
  session: AppSession,
  options?: {
    month?: string | null
    divisionName?: string | null
    subdivisionName?: string | null
    planningLevel?: string | null
    approvalStatus?: string | null
  },
): Promise<DailyActivityPageData> {
  const source = getDataSourceSnapshot()
  const roleMeta = getRoleMeta(session.role)
  const defaultActivityDate = getTodayIsoDate()
  const calendarMonth = normalizeCalendarMonth(options?.month) ?? defaultActivityDate.slice(0, 7)
  const calendarPrevMonth = shiftCalendarMonth(calendarMonth, -1)
  const calendarNextMonth = shiftCalendarMonth(calendarMonth, 1)
  const divisionOptions = getDailyActivityDivisionOptions()
  const subdivisionMap = getDailyActivitySubdivisionMap() as Record<string, string[]>
  const userOrg = await resolveDailyActivityOrgContext(session).catch(() => ({
    divisionName: roleMeta.division,
    subdivisionName: resolveDefaultDailyActivitySubdivision(roleMeta.division, roleMeta.subdivision),
    planningLevel: 'LEADER',
  }))
  const defaultDivision = divisionOptions.includes(userOrg.divisionName) ? userOrg.divisionName : divisionOptions[0]
  const defaultSubdivision = resolveDefaultDailyActivitySubdivision(defaultDivision, userOrg.subdivisionName)
  const rawDivision = String(options?.divisionName ?? '').trim()
  const rawSubdivision = String(options?.subdivisionName ?? '').trim()
  const rawPlanningLevel = String(options?.planningLevel ?? '').trim().toUpperCase()
  const rawApprovalStatus = String(options?.approvalStatus ?? '').trim().toUpperCase()

  const selectedDivision =
    session.role === 'SUPER_ADMIN' && isValidDailyActivityDivision(rawDivision)
      ? rawDivision
      : defaultDivision
  const selectedSubdivision =
    session.role === 'SUPER_ADMIN' && isValidDailyActivitySubdivision(selectedDivision, rawSubdivision)
      ? rawSubdivision
      : resolveDefaultDailyActivitySubdivision(selectedDivision, defaultSubdivision)
  const selectedPlanningLevel =
    rawPlanningLevel && DAILY_ACTIVITY_PLANNING_LEVELS.includes(rawPlanningLevel as DailyActivityPlanningLevel)
      ? rawPlanningLevel
      : 'ALL'
  const selectedApprovalStatus = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'NONE'].includes(rawApprovalStatus)
    ? rawApprovalStatus
    : 'ALL'
  const planningLevelOptions = DAILY_ACTIVITY_PLANNING_LEVELS.map((level) => ({
    value: level,
    label: dailyActivityPlanningLevelLabels[level],
  }))
  const scopeLabel = `${selectedDivision}${selectedSubdivision ? ` / ${selectedSubdivision}` : ''}`

  function matchesManagerScope(item: DailyActivityItem) {
    if (session.role === 'SUPER_ADMIN') return true
    const sameDivision = (item.divisionName || '').trim() === defaultDivision.trim()
    const sameSubdivision = (item.subdivisionName || '').trim() === defaultSubdivision.trim()
    return sameDivision && sameSubdivision
  }

  function matchesViewFilter(item: DailyActivityItem) {
    const divisionMatch = (item.divisionName || '').trim() === selectedDivision.trim()
    const subdivisionMatch =
      !selectedSubdivision ||
      (item.subdivisionName || '').trim() === selectedSubdivision.trim()
    const planningMatch =
      selectedPlanningLevel === 'ALL' || item.planningLevel === selectedPlanningLevel
    const approvalMatch =
      selectedApprovalStatus === 'ALL' ||
      (selectedApprovalStatus === 'NONE' ? item.executionStatus === 'PLANNED' : item.approvalStatus === selectedApprovalStatus)

    return divisionMatch && subdivisionMatch && planningMatch && approvalMatch
  }

  const buildPayload = (items: DailyActivityItem[]) => {
    const scopedItems = items.filter(matchesViewFilter)
    const todayItems = scopedItems.filter((item) => item.activityDate === defaultActivityDate)
    const weekStart = getWeekStartIsoDate(defaultActivityDate)
    const monthPrefix = calendarMonth
    const weeklyItems = scopedItems.filter(
      (item) => item.activityDate >= weekStart && item.activityDate <= defaultActivityDate,
    )
    const monthlyItems = scopedItems.filter((item) => item.activityDate.startsWith(monthPrefix))
    const pendingApprovals = scopedItems
      .filter(
        (item) =>
          (item.executionStatus === 'DONE' || item.executionStatus === 'PENDING') &&
          item.approvalStatus === 'PENDING',
      )
      .filter(matchesManagerScope)
      .slice(0, 30)

    return {
      scopeLabel,
      todayLabel: formatDateLabel(defaultActivityDate),
      defaultActivityDate,
      defaultPlanningLevel: userOrg.planningLevel,
      lockOrgFields: session.role !== 'SUPER_ADMIN',
      summary: buildSummary(todayItems),
      todayItems,
      recentItems: [...scopedItems]
        .sort((left, right) => `${right.activityDate} ${right.plannedAt}`.localeCompare(`${left.activityDate} ${left.plannedAt}`))
        .slice(0, 18),
      closeSuggestions: buildCloseSuggestions(todayItems, session.username),
      approvalSuggestions: pendingApprovals.map(
        (item) =>
          `${item.id} | ${item.activityCode} | ${dailyActivityPlanningLevelLabels[item.planningLevel]} | ${item.divisionName || '-'}${item.subdivisionName ? ` / ${item.subdivisionName}` : ''} | ${item.executionStatus} | ${item.taskTitle}`,
      ),
      pendingApprovals,
      planningLevelOptions,
      divisionOptions,
      subdivisionMap,
      defaultDivision,
      defaultSubdivision,
      selectedDivision,
      selectedSubdivision,
      selectedPlanningLevel,
      selectedApprovalStatus,
      performance: {
        daily: buildPerformancePeriod('Harian', todayItems),
        weekly: buildPerformancePeriod('Mingguan', weeklyItems),
        monthly: buildPerformancePeriod('Bulanan', monthlyItems),
      },
      calendarMonth,
      calendarPrevMonth,
      calendarNextMonth,
      calendarMonthLabel: formatMonthLabel(`${monthPrefix}-01`),
      calendarDays: buildCalendarDays(monthlyItems, defaultActivityDate, monthPrefix),
    }
  }

  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    const mockItems = getMockItems(session)
    return {
      source: getFallbackDataSourceSnapshot('Daily activity masih memakai fallback mock.'),
      ...buildPayload(mockItems),
    }
  }

  try {
    await ensureDailyActivityTable()

    const rows = await runReviewDbQuery<DailyActivityDbRow>(
      `
        SELECT
          id AS activityId,
          activity_code AS activityCode,
          CAST(activity_date AS CHAR) AS activityDate,
          planned_username AS plannedUsername,
          planned_by AS plannedBy,
          role_code AS roleCode,
          planning_level AS planningLevel,
          division_name AS divisionName,
          subdivision_name AS subdivisionName,
          task_title AS taskTitle,
          task_detail AS taskDetail,
          success_metric AS successMetric,
          priority_level AS priorityLevel,
          execution_status AS executionStatus,
          approval_status AS approvalStatus,
          approval_notes AS approvalNotes,
          approved_by AS approvedBy,
          CAST(approved_at AS CHAR) AS approvedAt,
          close_notes AS closeNotes,
          pending_reason AS pendingReason,
          follow_up_action AS followUpAction,
          CAST(planned_at AS CHAR) AS plannedAt,
          CAST(closed_at AS CHAR) AS closedAt
        FROM daily_activity_items
        WHERE activity_date >= DATE_SUB(CURRENT_DATE, INTERVAL 370 DAY)
        ORDER BY activity_date DESC, planned_at DESC, id DESC
      `,
    )

    return {
      source,
      ...buildPayload(rows.map(mapRowToItem)),
    }
  } catch (error) {
    const mockItems = getMockItems(session)
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      ...buildPayload(mockItems),
    }
  }
}
