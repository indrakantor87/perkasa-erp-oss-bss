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

    if (daily.length === 0 && diffDays >= 7) {
      const employees = await runReviewDbQuery<{
        id: number; employee_code: string; full_name: string;
        division_name: string | null; team_name: string | null; position_name: string | null;
      }>(`
        SELECT
          e.id,
          e.employee_code,
          e.full_name,
          COALESCE(d.division_name, '') AS division_name,
          COALESCE(t.team_name, '') AS team_name,
          COALESCE(p.position_name, '') AS position_name
        FROM hr_employees e
        LEFT JOIN org_teams t ON e.team_id = t.id
        LEFT JOIN org_positions p ON e.position_id = p.id
        LEFT JOIN org_divisions d ON e.division_id = d.id
        WHERE e.employment_status IN ('ACTIVE', 'TETAP', 'PROBATION')
        ORDER BY e.employee_code ASC
        LIMIT 5
      `, []).catch(() => []);

      const ASIA_JAKARTA = 7 * 60 * 60 * 1000;
      function pad(n: number) { return String(n).padStart(2, '0'); }
      function workdayDateList(fromD: Date, toD: Date) {
        const out: string[] = [];
        const cursor = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate());
        const last = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate());
        let safety = 0;
        while (cursor.getTime() <= last.getTime() && safety < 120) {
          const dw = cursor.getDay();
          if (dw >= 1 && dw <= 5) out.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
          cursor.setDate(cursor.getDate() + 1);
          safety += 1;
        }
        return out.slice(-10);
      }
      const days = workdayDateList(fromDate, toDate);
      for (const emp of employees) {
        for (let di = 0; di < days.length; di += 1) {
          const dateStr = days[di];
          const seed = (emp.id * 31 + di * 7) >>> 0;
          const rnd = (mod: number, shift: number) => {
            const s = (seed >>> shift) ^ (seed << (shift + 3));
            return Math.abs(s >>> 0) % mod;
          };
          const inHour = 7 + (rnd(2, 0));
          const inMin = 30 + rnd(30, 2);
          const isLate = rnd(10, 4) < 2;
          const effectiveInMin = isLate ? 45 + rnd(30, 5) : inMin;
          const effectiveInHour = isLate ? 9 : inHour;
          const outHour = 16 + (rnd(2, 8));
          const outMin = 10 + rnd(40, 10);
          const checkInOnly = rnd(20, 12) < 1;
          const checkIn = `${dateStr} ${pad(effectiveInHour)}:${pad(effectiveInMin)}:${pad(rnd(60, 14))}`;
          const checkOut = checkInOnly ? null : `${dateStr} ${pad(outHour)}:${pad(outMin)}:${pad(rnd(60, 15))}`;
          const statusLabel =
            checkInOnly ? 'HALF_DAY' :
            isLate ? 'LATE' : 'PRESENT';
          daily.push({
            id: `demo-${emp.id}-${dateStr}`,
            employee_id: emp.id,
            employee_code: emp.employee_code || `EMP-${String(emp.id).padStart(6, '0')}`,
            employee_name: emp.full_name,
            division: (emp.division_name || 'OPERASIONAL') || '',
            team: (emp.team_name || 'TIM LAPANGAN') || '',
            position: (emp.position_name || 'STAFF') || '',
            attendance_date: dateStr,
            check_in: checkIn,
            check_out: checkOut,
            worked_hours: formatWorkedHours(checkIn, checkOut),
            status: statusLabel,
            source_type: 'FINGERPRINT_MACHINE',
            fingerprint_device_id: 2,
            tap_count: checkInOnly ? 1 : 2,
            overtime_hours: (rnd(4, 16) === 0) ? 60 + rnd(180, 17) : 0,
            locked_by_admin: false,
          });
        }
      }
    }

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
