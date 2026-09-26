import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import { resolveDirectSubordinateEmployeeIds } from '@/lib/services/supervisor-scope.service'

const HR_FULL_SCOPE_ROLES = new Set(['HR', 'SUPER_ADMIN', 'OWNER'])

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'overtime_requests', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await ensureHrBatch02b()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 200), 500)
    const offset = Number(searchParams.get('offset') ?? 0)
    const statusFilter = String(searchParams.get('status') ?? '').trim().toUpperCase()
    const dateFrom = String(searchParams.get('date_from') ?? '').trim()
    const dateTo = String(searchParams.get('date_to') ?? '').trim()

    const isFullScope = HR_FULL_SCOPE_ROLES.has(session.role)

    let allowedEmployeeIds: number[] = []

    if (!isFullScope) {
      allowedEmployeeIds = await resolveDirectSubordinateEmployeeIds(Number(session.userId ?? 0))
      if (allowedEmployeeIds.length === 0) {
        return Response.json({
          data: [],
          total: 0,
          scope: 'supervisor_direct',
          scope_employee_ids: [],
          identity: null,
        })
      }
    }

    let whereClause = ''
    const params: any[] = []

    if (!isFullScope) {
      const placeholders = allowedEmployeeIds.map(() => '?').join(',')
      whereClause = `WHERE hor.employee_id IN (${placeholders})`
      params.push(...allowedEmployeeIds)
    }

    if (statusFilter) {
      whereClause += whereClause ? ' AND hor.status = ?' : 'WHERE hor.status = ?'
      params.push(statusFilter)
    }
    if (dateFrom) {
      whereClause += whereClause ? ' AND hor.overtime_date >= ?' : 'WHERE hor.overtime_date >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += whereClause ? ' AND hor.overtime_date <= ?' : 'WHERE hor.overtime_date <= ?'
      params.push(dateTo)
    }

    const rows = await runReviewDbQuery<any>(
      `
        SELECT
          hor.id,
          hor.employee_id,
          CAST(hor.overtime_date AS CHAR) AS overtime_date,
          CAST(hor.planned_start_time AS CHAR) AS planned_start_time,
          CAST(hor.planned_end_time AS CHAR) AS planned_end_time,
          hor.planned_minutes,
          hor.approved_minutes,
          hor.status,
          hor.reason,
          hor.supervisor_id,
          hor.supervisor_reason,
          hor.hr_reason,
          hor.cancel_reason,
          CAST(hor.created_at AS CHAR) AS created_at,
          CAST(hor.updated_at AS CHAR) AS updated_at,
          he.employee_code,
          he.full_name,
          he_sup.employee_code AS supervisor_code,
          he_sup.full_name AS supervisor_name
        FROM hr_overtime_requests hor
        LEFT JOIN hr_employees he ON he.id = hor.employee_id
        LEFT JOIN hr_employees he_sup ON he_sup.id = hor.supervisor_id
        ${whereClause}
        ORDER BY hor.overtime_date DESC, hor.id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    )

    const countRows = await runReviewDbQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM hr_overtime_requests hor ${whereClause}`,
      params,
    )

    let identity: any = null
    if (session.role === 'KARYAWAN' || !isFullScope) {
      try {
        const me = await requireEmployeeByAuthUserId(session.userId)
        identity = { id: me.id, employee_code: me.employee_code, full_name: me.full_name }
      } catch {}
    }

    return Response.json({
      data: rows,
      total: countRows[0]?.c ?? rows.length,
      scope: isFullScope ? 'all_employees' : 'supervisor_direct',
      scope_employee_ids: isFullScope ? null : allowedEmployeeIds,
      identity,
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
