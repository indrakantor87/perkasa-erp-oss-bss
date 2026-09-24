import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type AttendanceDailyRow = {
  id: string
  employee_id: number
  employee_code: string
  employee_name: string
  division: string
  team: string
  position: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  worked_hours: string
  status: string
  source_type: string
  fingerprint_device_id: number | null
  tap_count: number
  overtime_hours: number
  locked_by_admin: boolean
}

function formatWorkedHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '-'
  try {
    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    if (!Number.isFinite(inDate.getTime()) || !Number.isFinite(outDate.getTime())) return '-'
    const diffMs = outDate.getTime() - inDate.getTime()
    if (diffMs < 0) return '-'
    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}j ${minutes}m`
  } catch {
    return '-'
  }
}

function parseDateStrict(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d
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
    const fromDateRaw = url.searchParams.get('from_date')
    const toDateRaw = url.searchParams.get('to_date')
    const divisionIdRaw = url.searchParams.get('division_id')
    const teamIdRaw = url.searchParams.get('team_id')
    const employeeIdRaw = url.searchParams.get('employee_id')

    if (!fromDateRaw || !toDateRaw) {
      return Response.json(
        { message: 'Parameter from_date dan to_date wajib diisi (format YYYY-MM-DD).' },
        { status: 400 },
      )
    }

    const fromDate = parseDateStrict(fromDateRaw)
    const toDate = parseDateStrict(toDateRaw)
    if (!fromDate || !toDate) {
      return Response.json(
        { message: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD.' },
        { status: 400 },
      )
    }

    const diffMs = toDate.getTime() - fromDate.getTime()
    const diffDays = Math.floor(diffMs / 86400000) + 1
    if (diffDays > 62) {
      return Response.json(
        { message: 'Maksimal periode rekap harian adalah 62 hari. Silakan pecah menjadi beberapa periode.' },
        { status: 400 },
      )
    }

    const fromDateValue = fromDateRaw.trim()
    const toDateValue = toDateRaw.trim()

    const sqlParts: string[] = []
    const params: unknown[] = []

    sqlParts.push(`
      SELECT
        CAST(a.id AS CHAR) AS id,
        e.id AS employee_id,
        e.employee_code AS employee_code,
        e.full_name AS employee_name,
        COALESCE(d.division_name, '') AS division,
        COALESCE(t.team_name, '') AS team,
        COALESCE(p.position_name, '') AS position,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
        CAST(a.check_in AS CHAR) AS check_in,
        CAST(a.check_out AS CHAR) AS check_out,
        a.status AS status,
        COALESCE(a.source_type, '') AS source_type,
        a.fingerprint_device_id AS fingerprint_device_id,
        a.overtime_hours AS overtime_hours,
        a.locked_by_admin AS locked_by_admin,
        (
          SELECT COUNT(*)
          FROM hr_fp_raw_events r
          WHERE r.employee_id = a.employee_id
            AND DATE(r.event_timestamp_local) = a.attendance_date
        ) AS tap_count
      FROM hr_attendance a
      INNER JOIN hr_employees e ON a.employee_id = e.id
      LEFT JOIN org_teams t ON e.team_id = t.id
      LEFT JOIN org_positions p ON e.position_id = p.id
      LEFT JOIN org_divisions d ON e.division_id = d.id
      WHERE a.attendance_date BETWEEN ? AND ?
    `)
    params.push(fromDateValue, toDateValue)

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

    sqlParts.push('ORDER BY a.attendance_date DESC, e.employee_code ASC')

    const sql = sqlParts.join(' ')

    const rows = await runReviewDbQuery<{
      id: string
      employee_id: number
      employee_code: string
      employee_name: string
      division: string
      team: string
      position: string
      attendance_date: string
      check_in: string | null
      check_out: string | null
      status: string
      source_type: string
      fingerprint_device_id: number | null
      overtime_hours: number
      locked_by_admin: number | boolean
      tap_count: number
    }>(sql, params)

    const daily: AttendanceDailyRow[] = rows.map((row) => ({
      id: row.id,
      employee_id: row.employee_id,
      employee_code: row.employee_code,
      employee_name: row.employee_name,
      division: row.division || '',
      team: row.team || '',
      position: row.position || '',
      attendance_date: row.attendance_date,
      check_in: row.check_in,
      check_out: row.check_out,
      worked_hours: formatWorkedHours(row.check_in, row.check_out),
      status: row.status || '',
      source_type: row.source_type || '',
      fingerprint_device_id: row.fingerprint_device_id ?? null,
      tap_count: Number(row.tap_count) || 0,
      overtime_hours: Number(row.overtime_hours) || 0,
      locked_by_admin: Number(row.locked_by_admin) === 1,
    }))

    const monthly_filters = {
      from_date: fromDateValue,
      to_date: toDateValue,
      total_days: diffDays,
      division_id: divisionIdRaw ? Number.parseInt(divisionIdRaw.trim(), 10) : null,
      team_id: teamIdRaw ? Number.parseInt(teamIdRaw.trim(), 10) : null,
      employee_id: employeeIdRaw ? Number.parseInt(employeeIdRaw.trim(), 10) : null,
    }

    return Response.json({ daily, monthly_filters })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
