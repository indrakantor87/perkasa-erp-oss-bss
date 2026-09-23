import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'

type ExportFormat = 'DAILY_DETAILED' | 'MONTHLY_RECAP'

type ExportRequestBody = {
  from_date: string
  to_date: string
  format: ExportFormat
  division_id?: number
  team_id?: number
  employee_id?: number
}

type DailyAttendanceRow = {
  employee_id: number
  employee_code: string | null
  employee_name: string | null
  division_id: number | null
  division_name: string | null
  team_id: number | null
  team_name: string | null
  position_id: number | null
  position_name: string | null
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status: string | null
  overtime_hours: number | null
  source_type: string | null
  fingerprint_device_id: number | null
  locked_by_admin: number
}

type MonthlyRecapRow = {
  employee_id: number
  employee_code: string | null
  employee_name: string | null
  division_id: number | null
  division_name: string | null
  team_id: number | null
  team_name: string | null
  position_id: number | null
  position_name: string | null
  total_work_days: number
  present_count: number
  alpha_count: number
  sick_count: number
  leave_count: number
  partial_morning_count: number
  total_ot_hours: number
  avg_check_in_minutes: number
  avg_check_out_minutes: number
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + 'T00:00:00')
  const to = new Date(toIso + 'T00:00:00')
  const ms = to.getTime() - from.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatWIBTimestamp(date: Date): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${y}-${m}-${d} ${hh}:${mm}:${ss} WIB`
}

function extractTime(datetimeStr: string | null): string {
  if (!datetimeStr) return '-'
  const t = datetimeStr.split('T')
  const time = t.length > 1 ? t[1] : datetimeStr.split(' ')[1]
  return (time || '-').split('.')[0].substring(0, 8) || '-'
}

function calculateWorkedHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '-'
  const ci = new Date(checkIn)
  const co = new Date(checkOut)
  const diffMs = co.getTime() - ci.getTime()
  if (diffMs <= 0) return '-'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}j ${minutes}m`
}

function sourceTypeToLabel(source: string | null): string {
  const s = String(source || '').toUpperCase()
  if (s === 'SOURCE_FINGERPRINT_MACHINE') return 'Fingerprint'
  if (s === 'SOURCE_BROWSER') return 'Browser'
  if (s === 'SOURCE_MANUAL_CORRECTION') return 'Manual'
  return source || '-'
}

function statusToLabel(status: string | null): string {
  const s = String(status || '').toUpperCase()
  switch (s) {
    case 'PRESENT': return 'Hadir'
    case 'ALPHA': return 'Alpha'
    case 'SICK': return 'Sakit'
    case 'LEAVE': return 'Izin'
    case 'PERMISSION': return 'Izin'
    default: return status || '-'
  }
}

function timeToMinutes(datetimeStr: string | null): number | null {
  if (!datetimeStr) return null
  const time = extractTime(datetimeStr)
  if (time === '-') return null
  const parts = String(time).split(':')
  if (parts.length !== 3) return null
  return Number(parts[0]) * 60 + Number(parts[1])
}

function normalizeSourceTypeLabel(source: string | null): string {
  return sourceTypeToLabel(source)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 })
  }

  if (String(session.role).toUpperCase() === 'FINANCE') {
    return Response.json(
      { message: 'Forbidden. Role FINANCE tidak diizinkan melakukan export attendance.' },
      { status: 403 }
    )
  }

  if (!canPerformAction(session.role, 'hr', 'export')) {
    return Response.json({ message: 'Forbidden. Anda tidak memiliki izin export.' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Export attendance hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as Partial<ExportRequestBody>

    const fromDate = String(body.from_date ?? '').trim()
    const toDate = String(body.to_date ?? '').trim()
    const format = String(body.format ?? '').trim().toUpperCase() as ExportFormat

    if (!fromDate || !toDate) {
      return Response.json({ message: 'Parameter from_date dan to_date wajib diisi.' }, { status: 400 })
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return Response.json({ message: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD.' }, { status: 400 })
    }

    const fromObj = new Date(fromDate + 'T00:00:00')
    const toObj = new Date(toDate + 'T00:00:00')
    if (Number.isNaN(fromObj.getTime()) || Number.isNaN(toObj.getTime())) {
      return Response.json({ message: 'Tanggal tidak valid.' }, { status: 400 })
    }

    if (fromObj.getTime() > toObj.getTime()) {
      return Response.json({ message: 'from_date tidak boleh lebih besar dari to_date.' }, { status: 400 })
    }

    const daysDiff = diffDays(fromDate, toDate)
    if (daysDiff > 90) {
      return Response.json(
        { message: 'Periode maksimal export 90 hari. Silakan pecah menjadi beberapa periode.' },
        { status: 400 }
      )
    }

    if (format !== 'DAILY_DETAILED' && format !== 'MONTHLY_RECAP') {
      return Response.json(
        { message: "Format tidak valid. Hanya 'DAILY_DETAILED' atau 'MONTHLY_RECAP' yang diizinkan." },
        { status: 400 }
      )
    }

    const divisionId = body.division_id ? Number(body.division_id) : undefined
    const teamId = body.team_id ? Number(body.team_id) : undefined
    const employeeId = body.employee_id ? Number(body.employee_id) : undefined

    if (divisionId !== undefined && (!Number.isFinite(divisionId) || divisionId <= 0)) {
      return Response.json({ message: 'division_id tidak valid.' }, { status: 400 })
    }
    if (teamId !== undefined && (!Number.isFinite(teamId) || teamId <= 0)) {
      return Response.json({ message: 'team_id tidak valid.' }, { status: 400 })
    }
    if (employeeId !== undefined && (!Number.isFinite(employeeId) || employeeId <= 0)) {
      return Response.json({ message: 'employee_id tidak valid.' }, { status: 400 })
    }

    await ensureHrBatch01Schema()

    const filters: string[] = ['1 = 1']
    const values: unknown[] = []

    filters.push('a.attendance_date >= ?')
    values.push(fromDate)
    filters.push('a.attendance_date <= ?')
    values.push(toDate)

    if (employeeId) {
      filters.push('a.employee_id = ?')
      values.push(employeeId)
    }
    if (teamId) {
      filters.push('e.team_id = ?')
      values.push(teamId)
    }
    if (divisionId) {
      filters.push('e.division_id = ?')
      values.push(divisionId)
    }

    const whereClause = filters.join(' AND ')

    let xlsxModule
    try {
      xlsxModule = await import('xlsx')
    } catch {
      return Response.json({ message: 'Library xlsx tidak tersedia.' }, { status: 500 })
    }
    const XLSX = (xlsxModule as unknown as { default?: typeof import('xlsx') }).default ?? xlsxModule

    const now = new Date()
    const displayRole = String(session.role).toUpperCase()
    const filterParts: string[] = []
    if (divisionId) filterParts.push(`div=${divisionId}`)
    if (teamId) filterParts.push(`team=${teamId}`)
    if (employeeId) filterParts.push(`emp=${employeeId}`)
    const filterStr = filterParts.length ? ` [${filterParts.join(',')}]` : ''
    const targetRef = `${fromDate}_${toDate}_${format}${filterStr}`

    let rowCount = 0
    let workbook: ReturnType<typeof XLSX.utils.book_new>

    if (format === 'DAILY_DETAILED') {
      const dailyRows = await runReviewDbQuery<DailyAttendanceRow>(
        `
          SELECT
            a.employee_id,
            e.employee_code,
            e.full_name AS employee_name,
            e.division_id,
            d.name AS division_name,
            e.team_id,
            t.name AS team_name,
            e.position_id,
            p.position_name,
            CAST(a.attendance_date AS CHAR) AS attendance_date,
            CAST(a.check_in AS CHAR) AS check_in,
            CAST(a.check_out AS CHAR) AS check_out,
            a.status,
            a.overtime_hours,
            a.source_type,
            a.fingerprint_device_id,
            a.locked_by_admin,
            (
              SELECT COUNT(*)
              FROM hr_fp_raw_events r
              WHERE r.employee_id = a.employee_id
                AND DATE(r.event_timestamp_normalized) = a.attendance_date
            ) AS tap_count
          FROM hr_attendance a
          INNER JOIN hr_employees e
            ON e.id = a.employee_id
          LEFT JOIN org_divisions d
            ON d.id = e.division_id
          LEFT JOIN org_teams t
            ON t.id = e.team_id
          LEFT JOIN org_positions p
            ON p.id = e.position_id
          WHERE ${whereClause}
          ORDER BY a.attendance_date ASC, e.full_name ASC, e.employee_code ASC
          LIMIT 50000
        `,
        values
      )

      rowCount = dailyRows.length

      const payloadRows: Record<string, string | number>[] = dailyRows.map((row, idx) => ({
        'No': idx + 1,
        'Kode Karyawan': row.employee_code || '',
        'Nama Karyawan': row.employee_name || '',
        'Divisi': row.division_name || '',
        'Team': row.team_name || '',
        'Jabatan': row.position_name || '',
        'Tanggal': row.attendance_date,
        'Clock IN': extractTime(row.check_in),
        'Clock OUT': extractTime(row.check_out),
        'Durasi Jam Kerja': calculateWorkedHours(row.check_in, row.check_out),
        'Status': statusToLabel(row.status),
        'Lembur(jam)': row.overtime_hours ?? 0,
        'Sumber Data': normalizeSourceTypeLabel(row.source_type),
        'Jumlah Tap': (row as unknown as { tap_count?: number }).tap_count ?? 0,
      }))

      const footerRows: Record<string, string | number>[] = [
        { 'No': '', 'Kode Karyawan': `Laporan dibuat oleh: ${session.displayName} — ${displayRole}` },
        { 'No': '', 'Kode Karyawan': `Dibuat tanggal: ${formatWIBTimestamp(now)}` },
        { 'No': '', 'Kode Karyawan': `Periode: ${fromDate} → ${toDate}` },
      ]

      const allRows = [...payloadRows, ...footerRows]

      const sheet = XLSX.utils.json_to_sheet(allRows, {
        header: [
          'No',
          'Kode Karyawan',
          'Nama Karyawan',
          'Divisi',
          'Team',
          'Jabatan',
          'Tanggal',
          'Clock IN',
          'Clock OUT',
          'Durasi Jam Kerja',
          'Status',
          'Lembur(jam)',
          'Sumber Data',
          'Jumlah Tap',
        ],
      })
      sheet['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 12 },
      ]
      workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance')
    } else {
      const monthlyRows = await runReviewDbQuery<MonthlyRecapRow>(
        `
          SELECT
            a.employee_id,
            e.employee_code,
            e.full_name AS employee_name,
            e.division_id,
            d.name AS division_name,
            e.team_id,
            t.name AS team_name,
            e.position_id,
            p.position_name,
            COUNT(DISTINCT a.attendance_date) AS total_work_days,
            SUM(CASE WHEN UPPER(a.status) = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
            SUM(CASE WHEN UPPER(a.status) IN ('ALPHA', 'ABSENT', '') OR a.status IS NULL THEN 1 ELSE 0 END) AS alpha_count,
            SUM(CASE WHEN UPPER(a.status) = 'SICK' THEN 1 ELSE 0 END) AS sick_count,
            SUM(CASE WHEN UPPER(a.status) IN ('LEAVE', 'PERMISSION') THEN 1 ELSE 0 END) AS leave_count,
            SUM(
              CASE
                WHEN a.check_in IS NOT NULL AND a.check_out IS NULL THEN 1
                WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL
                     AND HOUR(CAST(a.check_out AS TIME)) < 16 THEN 1
                ELSE 0
              END
            ) AS partial_morning_count,
            COALESCE(SUM(a.overtime_hours), 0) AS total_ot_hours,
            AVG(
              CASE
                WHEN a.check_in IS NOT NULL THEN MINUTE(a.check_in) + HOUR(a.check_in) * 60
                ELSE NULL
              END
            ) AS avg_check_in_minutes,
            AVG(
              CASE
                WHEN a.check_out IS NOT NULL THEN MINUTE(a.check_out) + HOUR(a.check_out) * 60
                ELSE NULL
              END
            ) AS avg_check_out_minutes
          FROM hr_attendance a
          INNER JOIN hr_employees e
            ON e.id = a.employee_id
          LEFT JOIN org_divisions d
            ON d.id = e.division_id
          LEFT JOIN org_teams t
            ON t.id = e.team_id
          LEFT JOIN org_positions p
            ON p.id = e.position_id
          WHERE ${whereClause}
          GROUP BY
            a.employee_id,
            e.employee_code,
            e.full_name,
            e.division_id,
            d.name,
            e.team_id,
            t.name,
            e.position_id,
            p.position_name
          ORDER BY e.full_name ASC, e.employee_code ASC
          LIMIT 10000
        `,
        values
      )

      rowCount = monthlyRows.length

      function minutesToTimeStr(mins: number | null): string {
        if (mins == null || !Number.isFinite(mins)) return '-'
        const total = Math.round(mins)
        if (total < 0) return '-'
        const h = Math.floor(total / 60)
        const m = total % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }

      const payloadRows: Record<string, string | number>[] = monthlyRows.map((row) => ({
        'Kode Karyawan': row.employee_code || '',
        'Nama Karyawan': row.employee_name || '',
        'Divisi': row.division_name || '',
        'Team': row.team_name || '',
        'Jabatan': row.position_name || '',
        'Total Hari Kerja': row.total_work_days || 0,
        'Hadir': row.present_count || 0,
        'Alpha/Tanpa Data': row.alpha_count || 0,
        'Sakit': row.sick_count || 0,
        'Izin': row.leave_count || 0,
        'Jumlah Tap Sebagian Pagi (1x only)': row.partial_morning_count || 0,
        'Total OT Hours': row.total_ot_hours || 0,
        'Rata-rata Clock IN': minutesToTimeStr(row.avg_check_in_minutes),
        'Rata-rata Clock OUT': minutesToTimeStr(row.avg_check_out_minutes),
      }))

      const footerRows: Record<string, string | number>[] = [
        { 'Kode Karyawan': `Laporan dibuat oleh: ${session.displayName} — ${displayRole}` },
        { 'Kode Karyawan': `Dibuat tanggal: ${formatWIBTimestamp(now)}` },
        { 'Kode Karyawan': `Periode: ${fromDate} → ${toDate}` },
      ]

      const allRows = [...payloadRows, ...footerRows]

      const sheet = XLSX.utils.json_to_sheet(allRows, {
        header: [
          'Kode Karyawan',
          'Nama Karyawan',
          'Divisi',
          'Team',
          'Jabatan',
          'Total Hari Kerja',
          'Hadir',
          'Alpha/Tanpa Data',
          'Sakit',
          'Izin',
          'Jumlah Tap Sebagian Pagi (1x only)',
          'Total OT Hours',
          'Rata-rata Clock IN',
          'Rata-rata Clock OUT',
        ],
      })
      sheet['!cols'] = [
        { wch: 16 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 10 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 28 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
      ]
      workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Monthly Recap')
    }

    const stamp = now
    const filename = `Attendance_Period_${fromDate.replace(/-/g, '')}_${toDate.replace(/-/g, '')}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.xlsx`
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true })

    try {
      await recordHrAudit({
        actionType: 'ATTENDANCE_EXPORT',
        actor: session.displayName,
        targetRef: targetRef,
        detail: `rows=${rowCount},format=${format},from=${fromDate},to=${toDate}${filterStr}`,
      })
    } catch {
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
