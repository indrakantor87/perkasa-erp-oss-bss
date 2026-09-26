import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type RawEventItem = {
  id: number
  event_timestamp: string
  event_mode: string
  machine_id: number
  verify_score: number | null
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

function formatLocalTimestamp(value: unknown): string {
  if (value == null || value === '') return ''
  const str = String(value).trim()
  if (!str) return ''
  try {
    const d = new Date(str)
    if (!Number.isFinite(d.getTime())) return str
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  } catch {
    return str
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employee_id: string; attendance_date: string }> },
) {
  const { employee_id: employeeIdParam, attendance_date: attendanceDateParam } = await params
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
      { message: 'Query raw events HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const employeeIdRaw = employeeIdParam
    const attendanceDateRaw = attendanceDateParam

    if (!employeeIdRaw || !attendanceDateRaw) {
      return Response.json(
        { message: 'Parameter employee_id dan attendance_date wajib diisi.' },
        { status: 400 },
      )
    }

    const employeeId = Number.parseInt(String(employeeIdRaw).trim(), 10)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return Response.json({ message: 'Parameter employee_id tidak valid.' }, { status: 400 })
    }

    const attendanceDate = parseDateStrict(String(attendanceDateRaw))
    if (!attendanceDate) {
      return Response.json(
        { message: 'Format attendance_date tidak valid. Gunakan format YYYY-MM-DD.' },
        { status: 400 },
      )
    }
    const attendanceDateValue = String(attendanceDateRaw).trim()

    const existingAttendance = await runReviewDbQuery<{ id: number }>(
      `
        SELECT a.id
        FROM hr_attendance a
        WHERE a.employee_id = ?
          AND a.attendance_date = ?
        LIMIT 1
      `,
      [employeeId, attendanceDateValue],
    )

    if (existingAttendance.length === 0) {
      return Response.json(
        { message: 'Data attendance untuk employee dan tanggal tersebut tidak ditemukan.' },
        { status: 404 },
      )
    }

    const rows = await runReviewDbQuery<{
      id: number
      event_timestamp_local: unknown
      event_mode: string | null
      machine_id: number | null
      verify_score: number | null
    }>(
      `
        SELECT
          r.id,
          r.event_timestamp_local,
          COALESCE(r.event_mode, 'UNDEFINED') AS event_mode,
          r.machine_id,
          r.verify_score
        FROM hr_fp_raw_events r
        WHERE r.employee_id = ?
          AND DATE(r.event_timestamp_local) = ?
        ORDER BY r.event_timestamp_local DESC
        LIMIT 5
      `,
      [employeeId, attendanceDateValue],
    )

    const events: RawEventItem[] = rows.map((row) => ({
      id: Number(row.id) || 0,
      event_timestamp: formatLocalTimestamp(row.event_timestamp_local),
      event_mode: String(row.event_mode || 'UNDEFINED').toUpperCase(),
      machine_id: Number(row.machine_id) || 0,
      verify_score: row.verify_score != null ? Number(row.verify_score) : null,
    }))

    return Response.json({ events })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
