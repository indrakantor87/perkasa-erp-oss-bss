import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { resolveDirectSubordinateEmployeeIds } from '@/lib/services/supervisor-scope.service'
import type { LeaveRequestStatus } from '@/lib/types'

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

type LeaveRequestListRow = {
  id: number
  employee_id: number
  employee_name: string | null
  employee_code: string | null
  leave_type_id: number
  leave_type_code: string | null
  leave_type_name: string | null
  status: LeaveRequestStatus
  start_date: string
  end_date: string
  total_days: number
  reason: string
  supervisor_id: number | null
  supervisor_name: string | null
  supervisor_reason: string | null
  hr_reason: string | null
  cancel_reason: string | null
  balance_applied: number
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  await ensureHrBatch02b()

  const isHrOrAdmin =
    canPerformAction(session.role, 'hr', 'view') ||
    canPerformAction(session.role, 'leave_requests', 'view') ||
    canPerformAction(session.role, 'leave_requests', 'approve') ||
    session.role === 'SUPER_ADMIN' ||
    session.role === 'OWNER'

  if (!isHrOrAdmin && session.role !== 'KARYAWAN') {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const statusRaw = String(url.searchParams.get('status') ?? '').trim()
  const employeeIdRaw = url.searchParams.get('employee_id')
  const keyword = String(url.searchParams.get('keyword') ?? '').trim()

  let allowedEmployeeIds: number[] = []

  if (isHrOrAdmin) {
    allowedEmployeeIds = []
  } else {
    allowedEmployeeIds = await resolveDirectSubordinateEmployeeIds(session.userId ?? 0)
    if (allowedEmployeeIds.length === 0) {
      return Response.json({ data: [], total: 0, scope: 'supervisor_empty' })
    }
  }

  const clauses: string[] = []
  const params: unknown[] = []

  if (allowedEmployeeIds.length > 0) {
    clauses.push(`lr.employee_id IN (${allowedEmployeeIds.map(() => '?').join(',')})`)
    params.push(...allowedEmployeeIds)
  }

  const empIdFilter = parsePositiveInt(employeeIdRaw)
  if (empIdFilter) {
    if (allowedEmployeeIds.length > 0 && !allowedEmployeeIds.includes(empIdFilter)) {
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }
    clauses.push('lr.employee_id = ?')
    params.push(empIdFilter)
  }

  if (statusRaw) {
    clauses.push('lr.status = ?')
    params.push(statusRaw.toUpperCase())
  }

  if (keyword) {
    clauses.push(
      '(UPPER(lr.reason) LIKE ? OR UPPER(lt.name) LIKE ? OR UPPER(lt.code) LIKE ? OR UPPER(emp.full_name) LIKE ? OR UPPER(emp.employee_code) LIKE ?)',
    )
    const like = `%${keyword.toUpperCase()}%`
    params.push(like, like, like, like, like)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const rows = await runReviewDbQuery<LeaveRequestListRow>(
    `
      SELECT
        lr.id,
        lr.employee_id,
        emp.full_name AS employee_name,
        emp.employee_code AS employee_code,
        lr.leave_type_id,
        lt.code AS leave_type_code,
        lt.name AS leave_type_name,
        lr.status,
        CAST(lr.start_date AS CHAR) AS start_date,
        CAST(lr.end_date AS CHAR) AS end_date,
        lr.total_days,
        lr.reason,
        lr.supervisor_id,
        sup.full_name AS supervisor_name,
        lr.supervisor_reason,
        lr.hr_reason,
        lr.cancel_reason,
        lr.balance_applied,
        CAST(lr.created_at AS CHAR) AS created_at,
        CAST(lr.updated_at AS CHAR) AS updated_at
      FROM hr_leave_requests lr
      LEFT JOIN hr_employees emp ON emp.id = lr.employee_id
      LEFT JOIN hr_employees sup ON sup.id = lr.supervisor_id
      LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
      ${where}
      ORDER BY lr.created_at DESC, lr.id DESC
      LIMIT 1000
    `,
    params,
  )

  return Response.json({
    scope: isHrOrAdmin ? 'hr_admin_all' : 'supervisor_subordinates_only',
    data: rows.map((r) => ({
      id: r.id,
      employee: {
        id: r.employee_id,
        name: r.employee_name,
        code: r.employee_code,
      },
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
      supervisor: r.supervisor_id
        ? { id: r.supervisor_id, name: r.supervisor_name }
        : null,
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
