import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type MonthlyRecapRow = {
  employee_id: number
  employee_code: string
  employee_name: string
  division: string
  team: string
  position: string
  total_work_days: number
  present_count: number
  alpha_count: number
  sick_count: number
  leave_count: number
  partial_morning_count: number
  total_ot_hours: number
  avg_check_in: string
  avg_check_out: string
}

function parseMonthStrict(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

function formatAvgTime(value: unknown): string {
  if (value == null || value === '') return '-'
  const str = String(value).trim()
  if (!str) return '-'
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(str)
  if (!match) return str.substring(0, 5)
  const hh = match[1].padStart(2, '0')
  const mm = match[2]
  return `${hh}:${mm}`
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.isFallback) {
    return Response.json(
      { message: 'Query attendance HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const url = new URL(request.url)
    const monthRaw = url.searchParams.get('month')
    const divisionIdRaw = url.searchParams.get('division_id')
    const teamIdRaw = url.searchParams.get('team_id')
    const employeeIdRaw = url.searchParams.get('employee_id')

    if (!monthRaw) {
      return Response.json(
        { message: 'Parameter month wajib diisi (format YYYY-MM).' },
        { status: 400 },
      )
    }

    const parsed = parseMonthStrict(monthRaw)
    if (!parsed) {
      return Response.json(
        { message: 'Format bulan tidak valid. Gunakan format YYYY-MM.' },
        { status: 400 },
      )
    }

    const { year, month } = parsed

    const sqlParts: string[] = []
    const params: unknown[] = []

    sqlParts.push(`
      SELECT
        e.id AS employee_id,
        e.employee_code AS employee_code,
        e.full_name AS employee_name,
        COALESCE(d.division_name, '') AS division,
        COALESCE(t.team_name, '') AS team,
        COALESCE(p.position_name, '') AS position,
        COUNT(DISTINCT a.attendance_date) AS total_work_days,
        SUM(CASE WHEN UPPER(a.status) = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN UPPER(a.status) = 'ALPHA' THEN 1 ELSE 0 END) AS alpha_count,
        SUM(CASE WHEN UPPER(a.status) = 'SICK' THEN 1 ELSE 0 END) AS sick_count,
        SUM(CASE WHEN UPPER(a.status) IN ('LEAVE', 'PERMISSION', 'PERMIT') THEN 1 ELSE 0 END) AS leave_count,
        SUM(CASE WHEN UPPER(a.status) = 'PRESENT' AND a.check_out IS NULL AND a.check_in IS NOT NULL THEN 1 ELSE 0 END) AS partial_morning_count,
        COALESCE(SUM(a.overtime_hours), 0) AS total_ot_hours,
        TIME_FORMAT(SEC_TO_TIME(AVG(TIME_TO_SEC(CAST(a.check_in AS TIME)))), '%H:%i') AS avg_check_in,
        TIME_FORMAT(SEC_TO_TIME(AVG(TIME_TO_SEC(CAST(a.check_out AS TIME)))), '%H:%i') AS avg_check_out
      FROM hr_attendance a
      INNER JOIN hr_employees e ON a.employee_id = e.id
      LEFT JOIN org_teams t ON e.team_id = t.id
      LEFT JOIN org_positions p ON e.position_id = p.id
      LEFT JOIN org_divisions d ON e.division_id = d.id
      WHERE YEAR(a.attendance_date) = ?
        AND MONTH(a.attendance_date) = ?
    `)
    params.push(year, month)

    if (divisionIdRaw) {
      const divisionId = Number.parseInt(divisionIdRaw.trim(), 10)
      if (!Number.isInteger(divisionId) || divisionId <= 0) {
        return Response.json({ message: 'Parameter division_id tidak valid.' }, { status: 400 })
      }
      sqlParts.push('AND e.division_id = ?')
      params.push(divisionId)
    }

    if (teamIdRaw) {
      const teamId = Number.parseInt(teamIdRaw.trim(), 10)
      if (!Number.isInteger(teamId) || teamId <= 0) {
        return Response.json({ message: 'Parameter team_id tidak valid.' }, { status: 400 })
      }
      sqlParts.push('AND e.team_id = ?')
      params.push(teamId)
    }

    if (employeeIdRaw) {
      const employeeId = Number.parseInt(employeeIdRaw.trim(), 10)
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return Response.json({ message: 'Parameter employee_id tidak valid.' }, { status: 400 })
      }
      sqlParts.push('AND e.id = ?')
      params.push(employeeId)
    }

    sqlParts.push('GROUP BY e.id, e.employee_code, e.full_name, d.division_name, t.team_name, p.position_name')
    sqlParts.push('ORDER BY e.employee_code ASC')

    const sql = sqlParts.join(' ')

    const rows = await runReviewDbQuery<{
      employee_id: number
      employee_code: string
      employee_name: string
      division: string
      team: string
      position: string
      total_work_days: number
      present_count: number
      alpha_count: number
      sick_count: number
      leave_count: number
      partial_morning_count: number
      total_ot_hours: number
      avg_check_in: unknown
      avg_check_out: unknown
    }>(sql, params)

    const recap: MonthlyRecapRow[] = rows.map((row) => ({
      employee_id: row.employee_id,
      employee_code: row.employee_code,
      employee_name: row.employee_name,
      division: row.division || '',
      team: row.team || '',
      position: row.position || '',
      total_work_days: Number(row.total_work_days) || 0,
      present_count: Number(row.present_count) || 0,
      alpha_count: Number(row.alpha_count) || 0,
      sick_count: Number(row.sick_count) || 0,
      leave_count: Number(row.leave_count) || 0,
      partial_morning_count: Number(row.partial_morning_count) || 0,
      total_ot_hours: Number(row.total_ot_hours) || 0,
      avg_check_in: formatAvgTime(row.avg_check_in),
      avg_check_out: formatAvgTime(row.avg_check_out),
    }))

    return Response.json(recap)
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
