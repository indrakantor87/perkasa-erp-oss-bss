import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import type { LeaveRequestStatus } from '@/lib/types'

type LeaveRequestRow = {
  id: number
  employee_id: number
  leave_type_id: number
  status: LeaveRequestStatus
  start_date: string
  end_date: string
  total_days: number
  reason: string
  supervisor_id: number | null
  supervisor_reason: string | null
  hr_reason: string | null
  cancel_reason: string | null
  balance_applied: number
  created_at: string
  updated_at: string
  half_day_morning?: number | null
}

type EmployeeWithSupervisorRow = {
  id: number
  supervisor_id: number | null
  full_name: string
}

type LeaveTypeRow = {
  id: number
  code: string
  name: string
  needs_docs: number
  deduct_balance: number
}

type InsertResult = { insertId?: number; affectedRows?: number; changedRows?: number }
type CountRow = { n: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseISODate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const str = String(value).trim()
  const match = str.match(/^\d{4}-\d{2}-\d{2}$/)
  return match ? str : null
}

function parseTinyInt(value: unknown): number {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1
  return 0
}

function calculateTotalDays(startISO: string, endISO: string, halfDayMorning: boolean): number {
  const s = new Date(startISO + 'T00:00:00')
  const e = new Date(endISO + 'T00:00:00')
  const diffMs = e.getTime() - s.getTime()
  const rawDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1
  const total = Math.max(1, rawDays)
  if (halfDayMorning && total === 1) {
    return 0.5
  }
  return total
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  await ensureHrBatch02b()

  const me = await requireEmployeeByAuthUserId(session.userId)
  const canonicalTrustedEmpId = me.id

  try {
    const payload = (await request.json()) as {
      leave_type_id?: unknown
      start_date?: unknown
      end_date?: unknown
      reason?: unknown
      half_day_morning?: unknown
    }

    const leaveTypeId = parsePositiveInt(payload.leave_type_id)
    const startDate = parseISODate(payload.start_date)
    const endDate = parseISODate(payload.end_date)
    const reason = payload.reason === undefined || payload.reason === null ? '' : String(payload.reason).trim()
    const halfDayMorning = parseTinyInt(payload.half_day_morning) === 1

    if (!leaveTypeId) return Response.json({ message: 'leave_type_id wajib diisi dan valid.' }, { status: 400 })
    if (!startDate || !endDate) return Response.json({ message: 'start_date dan end_date wajib diisi format YYYY-MM-DD.' }, { status: 400 })
    if (new Date(endDate + 'T00:00:00').getTime() < new Date(startDate + 'T00:00:00').getTime()) {
      return Response.json({ message: 'end_date tidak boleh lebih awal dari start_date.' }, { status: 400 })
    }
    if (halfDayMorning && startDate !== endDate) {
      return Response.json({ message: 'half_day_morning hanya berlaku untuk 1 hari cuti (start_date = end_date).' }, { status: 400 })
    }

    const [leaveType] = await runReviewDbQuery<LeaveTypeRow>(
      `SELECT id, code, name, needs_docs, deduct_balance FROM hr_leave_types WHERE id = ? AND is_active = 1 LIMIT 1`,
      [leaveTypeId],
    )
    if (!leaveType) return Response.json({ message: 'Leave type tidak ditemukan atau tidak aktif.' }, { status: 404 })

    const [emp] = await runReviewDbQuery<EmployeeWithSupervisorRow>(
      `SELECT id, supervisor_id, full_name FROM hr_employees WHERE id = ? AND is_active = 1 LIMIT 1`,
      [canonicalTrustedEmpId],
    )
    if (!emp) return Response.json({ message: 'Employee tidak ditemukan atau tidak aktif.' }, { status: 404 })

    const ACTIVE_STATUSES = ['DRAFT', 'PENDING_SUPERVISOR', 'APPROVED_SUPERVISOR', 'PENDING_HR', 'APPROVED_HR', 'PARTIAL']
    const [overlap] = await runReviewDbQuery<CountRow>(
      `
        SELECT COUNT(*) AS n
        FROM hr_leave_requests lr
        WHERE lr.employee_id = ?
          AND NOT (
            CAST(lr.end_date AS DATE) < CAST(? AS DATE)
            OR CAST(lr.start_date AS DATE) > CAST(? AS DATE)
          )
          AND lr.status IN (${ACTIVE_STATUSES.map(() => '?').join(',')})
      `,
      [canonicalTrustedEmpId, startDate, endDate, ...ACTIVE_STATUSES],
    )
    const overlapCount = Number(overlap?.n ?? 0)
    if (overlapCount > 0) {
      return Response.json(
        { message: 'Overlap tanggal: sudah ada permohonan cuti aktif (non-terminal) pada rentang tanggal tersebut.' },
        { status: 400 },
      )
    }

    const totalDays = calculateTotalDays(startDate, endDate, halfDayMorning)
    const supervisorId = emp.supervisor_id ? Number(emp.supervisor_id) : null
    const halfDayMorningStored = halfDayMorning ? 1 : 0

    const insertRes = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_leave_requests (
          employee_id,
          leave_type_id,
          status,
          start_date,
          end_date,
          total_days,
          reason,
          supervisor_id
        ) VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?)
      `,
      [canonicalTrustedEmpId, leaveTypeId, startDate, endDate, totalDays, reason, supervisorId],
    )

    const leaveId = Number(insertRes.insertId ?? 0)

    if (halfDayMorning) {
      await runReviewDbExecute(
        `ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS half_day_morning TINYINT(1) NOT NULL DEFAULT 0`,
      ).catch(() => null)
      await runReviewDbExecute(
        `UPDATE hr_leave_requests SET half_day_morning = ? WHERE id = ? LIMIT 1`,
        [halfDayMorningStored, leaveId],
      ).catch(() => null)
    }

    await recordHrAudit({
      actionType: 'LEAVE_REQUEST_CREATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_REQUEST-${leaveId}`,
      detail: `Employee create leave request id=${leaveId} emp_id=${canonicalTrustedEmpId} leave_type=${leaveType.code} (${leaveType.name}) start=${startDate} end=${endDate} total_days=${totalDays} half_day_morning=${halfDayMorning} supervisor_id=${supervisorId ?? 'NULL'}`,
    })

    return Response.json(
      {
        id: leaveId,
        employee_id: canonicalTrustedEmpId,
        leave_type_id: leaveTypeId,
        status: 'DRAFT' as LeaveRequestStatus,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason,
        supervisor_id: supervisorId,
        half_day_morning: halfDayMorning,
      },
      { status: 201 },
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal create leave request: ${detail}` }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  await ensureHrBatch02b()

  const me = await requireEmployeeByAuthUserId(session.userId)
  const canonicalTrustedEmpId = me.id

  const url = new URL(request.url)
  const statusRaw = String(url.searchParams.get('status') ?? '').trim()
  const keyword = String(url.searchParams.get('keyword') ?? '').trim()

  const clauses: string[] = [`lr.employee_id = ?`]
  const params: unknown[] = [canonicalTrustedEmpId]

  if (statusRaw) {
    clauses.push('lr.status = ?')
    params.push(statusRaw.toUpperCase())
  }
  if (keyword) {
    clauses.push('(UPPER(lr.reason) LIKE ? OR UPPER(lt.name) LIKE ? OR UPPER(lt.code) LIKE ?)')
    const like = `%${keyword.toUpperCase()}%`
    params.push(like, like, like)
  }

  const where = `WHERE ${clauses.join(' AND ')}`

  const rows = await runReviewDbQuery<LeaveRequestRow & { leave_type_code: string | null; leave_type_name: string | null }>(
    `
      SELECT
        lr.id,
        lr.employee_id,
        lr.leave_type_id,
        lt.code AS leave_type_code,
        lt.name AS leave_type_name,
        lr.status,
        CAST(lr.start_date AS CHAR) AS start_date,
        CAST(lr.end_date AS CHAR) AS end_date,
        lr.total_days,
        lr.reason,
        lr.supervisor_id,
        lr.supervisor_reason,
        lr.hr_reason,
        lr.cancel_reason,
        lr.balance_applied,
        CAST(lr.created_at AS CHAR) AS created_at,
        CAST(lr.updated_at AS CHAR) AS updated_at
      FROM hr_leave_requests lr
      LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
      ${where}
      ORDER BY lr.created_at DESC, lr.id DESC
      LIMIT 500
    `,
    params,
  )

  return Response.json({
    self: true,
    employee_id: canonicalTrustedEmpId,
    data: rows.map((r) => ({
      id: r.id,
      employee_id: r.employee_id,
      leave_type: {
        id: r.leave_type_id,
        code: r.leave_type_code,
        name: r.leave_type_name,
      },
      status: r.status,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: r.total_days,
      reason: r.reason,
      supervisor_id: r.supervisor_id,
      supervisor_reason: r.supervisor_reason,
      hr_reason: r.hr_reason,
      cancel_reason: r.cancel_reason,
      balance_applied: r.balance_applied === 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    total: rows.length,
  })
}
