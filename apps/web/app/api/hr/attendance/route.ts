import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['PRESENT', 'SICK', 'PERMIT', 'ALPHA'])

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
}

type ExistingAttendanceRow = {
  id: number
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizeDecimal(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const normalized = raw.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action attendance HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      employeeCode?: unknown
      attendanceDate?: unknown
      checkIn?: unknown
      checkOut?: unknown
      status?: unknown
      overtimeHours?: unknown
    }

    const employeeCode = String(payload.employeeCode ?? '').trim()
    const attendanceDateRaw = String(payload.attendanceDate ?? '').trim()
    const checkInRaw = String(payload.checkIn ?? '').trim()
    const checkOutRaw = String(payload.checkOut ?? '').trim()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const overtimeHours = normalizeDecimal(payload.overtimeHours)

    if (!employeeCode) {
      return Response.json({ message: 'Employee HR wajib dipilih.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status attendance tidak valid.' }, { status: 400 })
    }
    if (overtimeHours === null || overtimeHours < 0) {
      return Response.json({ message: 'Nilai overtime tidak valid.' }, { status: 400 })
    }

    const [employee] = await runReviewDbQuery<EmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          full_name AS fullName
        FROM hr_employees
        WHERE UPPER(employee_code) = UPPER(?)
        LIMIT 1
      `,
      [employeeCode],
    )
    if (!employee) {
      return Response.json({ message: 'Employee HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const attendanceDate = attendanceDateRaw ? new Date(attendanceDateRaw) : new Date()
    if (!Number.isFinite(attendanceDate.getTime())) {
      return Response.json({ message: 'Tanggal attendance tidak valid.' }, { status: 400 })
    }
    const attendanceDateValue = toDateString(attendanceDate)

    const checkIn = checkInRaw ? new Date(checkInRaw) : null
    const checkOut = checkOutRaw ? new Date(checkOutRaw) : null
    if (checkIn && !Number.isFinite(checkIn.getTime())) {
      return Response.json({ message: 'Waktu check in tidak valid.' }, { status: 400 })
    }
    if (checkOut && !Number.isFinite(checkOut.getTime())) {
      return Response.json({ message: 'Waktu check out tidak valid.' }, { status: 400 })
    }
    if (checkIn && checkOut && checkOut.getTime() < checkIn.getTime()) {
      return Response.json({ message: 'Check out tidak boleh lebih awal dari check in.' }, { status: 400 })
    }

    const existing = await runReviewDbQuery<ExistingAttendanceRow>(
      `
        SELECT id
        FROM hr_attendance
        WHERE employee_id = ?
          AND attendance_date = ?
        LIMIT 1
      `,
      [employee.id, attendanceDateValue],
    )
    if (existing.length > 0) {
      return Response.json({ message: 'Attendance untuk employee dan tanggal tersebut sudah ada.' }, { status: 409 })
    }

    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_attendance (
          employee_id,
          attendance_date,
          check_in,
          check_out,
          status,
          overtime_hours,
          locked_by_admin
        )
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      [
        employee.id,
        attendanceDateValue,
        checkInRaw || null,
        checkOutRaw || null,
        status,
        overtimeHours,
      ],
    )

    return Response.json({
      message: `Attendance ${employee.employeeCode} - ${employee.fullName} untuk ${attendanceDateValue} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
