import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  getHrAttendanceFaceConfig,
  recordHrAttendanceFaceLog,
} from '@/lib/services/hr-attendance-face-service'
import {
  calculateDistanceMeters,
  getHrAttendanceGeofenceConfig,
  recordHrAttendanceGeofenceLog,
} from '@/lib/services/hr-attendance-geofence-service'

const allowedStatuses = new Set(['PRESENT', 'SICK', 'PERMIT', 'ALPHA'])

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
}

type ExistingAttendanceRow = {
  id: number
}

type AttendanceRow = {
  id: number
  employeeCode: string
  fullName: string
  attendanceDate: string
  status: string
  checkIn: string | null
  checkOut: string | null
  overtimeHours: number
  lockedByAdmin: number
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
      latitude?: unknown
      longitude?: unknown
      faceCaptureRef?: unknown
      faceVerificationMode?: unknown
      status?: unknown
      overtimeHours?: unknown
    }

    const employeeCode = String(payload.employeeCode ?? '').trim()
    const attendanceDateRaw = String(payload.attendanceDate ?? '').trim()
    const checkInRaw = String(payload.checkIn ?? '').trim()
    const checkOutRaw = String(payload.checkOut ?? '').trim()
    const latitude = normalizeDecimal(payload.latitude)
    const longitude = normalizeDecimal(payload.longitude)
    const faceCaptureRef = String(payload.faceCaptureRef ?? '').trim()
    const faceVerificationMode = String(payload.faceVerificationMode ?? '').trim().toUpperCase()
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
    if ((latitude === null) !== (longitude === null)) {
      return Response.json({ message: 'Latitude dan longitude attendance harus diisi berpasangan.' }, { status: 400 })
    }
    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      return Response.json({ message: 'Latitude attendance tidak valid.' }, { status: 400 })
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      return Response.json({ message: 'Longitude attendance tidak valid.' }, { status: 400 })
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
    const faceConfig = await getHrAttendanceFaceConfig().catch(() => null)
    const geofenceConfig = await getHrAttendanceGeofenceConfig().catch(() => null)

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
    if (faceCaptureRef && !faceVerificationMode) {
      return Response.json({ message: 'Mode verifikasi wajah wajib diisi saat referensi wajah dikirim.' }, { status: 400 })
    }
    if (faceConfig?.isRequired && !faceCaptureRef) {
      return Response.json(
        { message: `Attendance saat ini wajib menyertakan referensi verifikasi wajah (${faceConfig.verificationMode}).` },
        { status: 400 },
      )
    }

    if (geofenceConfig?.isRequired && (latitude === null || longitude === null)) {
      return Response.json(
        { message: `Attendance di ${geofenceConfig.locationName} wajib mengirim lokasi browser.` },
        { status: 400 },
      )
    }

    let geofenceDistanceMeters: number | null = null
    let geofenceWithinRadius = false

    if (
      geofenceConfig &&
      geofenceConfig.latitude !== null &&
      geofenceConfig.longitude !== null &&
      latitude !== null &&
      longitude !== null
    ) {
      geofenceDistanceMeters = calculateDistanceMeters(
        geofenceConfig.latitude,
        geofenceConfig.longitude,
        latitude,
        longitude,
      )
      geofenceWithinRadius = geofenceDistanceMeters <= geofenceConfig.radiusMeters

      if (geofenceConfig.isRequired && !geofenceWithinRadius) {
        return Response.json(
          {
            message: `Lokasi attendance berada di luar radius ${geofenceConfig.radiusMeters.toFixed(2)} meter dari ${geofenceConfig.locationName}. Jarak terdeteksi ${geofenceDistanceMeters.toFixed(2)} meter.`,
          },
          { status: 400 },
        )
      }
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

    const insertResult = await runReviewDbExecute<InsertResult>(
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

    if (
      insertResult.insertId &&
      faceCaptureRef
    ) {
      await recordHrAttendanceFaceLog({
        attendanceId: insertResult.insertId,
        employeeCode: employee.employeeCode,
        attendanceDate: attendanceDateValue,
        verificationMode: faceVerificationMode || faceConfig?.verificationMode || 'MANUAL_REVIEW',
        captureRef: faceCaptureRef,
        captureStatus: 'PENDING_REVIEW',
      })
    }

    if (
      insertResult.insertId &&
      geofenceConfig &&
      geofenceConfig.latitude !== null &&
      geofenceConfig.longitude !== null &&
      latitude !== null &&
      longitude !== null &&
      geofenceDistanceMeters !== null
    ) {
      await recordHrAttendanceGeofenceLog({
        attendanceId: insertResult.insertId,
        employeeCode: employee.employeeCode,
        attendanceDate: attendanceDateValue,
        config: geofenceConfig,
        submittedLatitude: latitude,
        submittedLongitude: longitude,
        distanceMeters: geofenceDistanceMeters,
        withinRadius: geofenceWithinRadius,
      })
    }

    await recordHrAudit({
      actionType: 'ATTENDANCE_CREATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `${employee.employeeCode}:${attendanceDateValue}`,
      detail: `Attendance ${employee.employeeCode} - ${employee.fullName} tanggal ${attendanceDateValue} dicatat via web dengan status ${status}${geofenceDistanceMeters !== null ? ` dan jarak ${geofenceDistanceMeters.toFixed(2)} meter dari geofence` : ''}${faceCaptureRef ? ` serta referensi verifikasi wajah ${faceCaptureRef}` : ''}.`,
    })

    return Response.json({
      message: `Attendance ${employee.employeeCode} - ${employee.fullName} untuk ${attendanceDateValue} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Correction attendance HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      attendanceId?: unknown
      checkIn?: unknown
      checkOut?: unknown
      status?: unknown
      overtimeHours?: unknown
      lockByAdmin?: unknown
      notes?: unknown
    }

    const attendanceId = Number.parseInt(String(payload.attendanceId ?? '').trim(), 10)
    const checkInRaw = String(payload.checkIn ?? '').trim()
    const checkOutRaw = String(payload.checkOut ?? '').trim()
    const status = String(payload.status ?? '').trim().toUpperCase()
    const overtimeHours = normalizeDecimal(payload.overtimeHours)
    const lockByAdmin = String(payload.lockByAdmin ?? '').trim() === '1' || payload.lockByAdmin === true
    const notes = String(payload.notes ?? '').trim()

    if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
      return Response.json({ message: 'Attendance HR tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status attendance tidak valid.' }, { status: 400 })
    }
    if (overtimeHours === null || overtimeHours < 0) {
      return Response.json({ message: 'Nilai overtime tidak valid.' }, { status: 400 })
    }

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

    const [attendance] = await runReviewDbQuery<AttendanceRow>(
      `
        SELECT
          ha.id,
          he.employee_code AS employeeCode,
          he.full_name AS fullName,
          DATE_FORMAT(ha.attendance_date, '%Y-%m-%d') AS attendanceDate,
          ha.status,
          CAST(ha.check_in AS CHAR) AS checkIn,
          CAST(ha.check_out AS CHAR) AS checkOut,
          ha.overtime_hours AS overtimeHours,
          ha.locked_by_admin AS lockedByAdmin
        FROM hr_attendance ha
        JOIN hr_employees he
          ON he.id = ha.employee_id
        WHERE ha.id = ?
        LIMIT 1
      `,
      [attendanceId],
    )
    if (!attendance) {
      return Response.json({ message: 'Attendance HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const currentStatus = String(attendance.status ?? '').trim().toUpperCase()
    const currentCheckIn = String(attendance.checkIn ?? '').trim()
    const currentCheckOut = String(attendance.checkOut ?? '').trim()
    const currentOvertime = Number(attendance.overtimeHours ?? 0)
    const currentLock = Number(attendance.lockedByAdmin ?? 0) === 1

    if (
      currentStatus === status &&
      currentCheckIn === (checkInRaw || '') &&
      currentCheckOut === (checkOutRaw || '') &&
      currentOvertime === overtimeHours &&
      currentLock === lockByAdmin
    ) {
      return Response.json({ message: 'Tidak ada perubahan pada attendance HR.' }, { status: 409 })
    }

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_attendance
        SET
          check_in = ?,
          check_out = ?,
          status = ?,
          overtime_hours = ?,
          locked_by_admin = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [checkInRaw || null, checkOutRaw || null, status, overtimeHours, lockByAdmin ? 1 : 0, attendance.id],
    )

    await recordHrAudit({
      actionType: 'ATTENDANCE_UPDATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `ATT-${attendance.id}`,
      detail: `Attendance ${attendance.employeeCode} - ${attendance.fullName} tanggal ${attendance.attendanceDate} dikoreksi dari ${currentStatus} ke ${status}${notes ? ` (${notes})` : ''}.`,
    })

    return Response.json({
      message: `Attendance ${attendance.employeeCode} - ${attendance.fullName} tanggal ${attendance.attendanceDate} berhasil diperbarui.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
