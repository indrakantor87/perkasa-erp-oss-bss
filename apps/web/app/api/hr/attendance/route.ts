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

  return Response.json(
    {
      message:
        'Pembuatan attendance HR tidak dapat dilakukan melalui endpoint browser/manual. Absensi hanya dapat diproses dari data raw events mesin fingerprint melalui attendance processing engine.',
    },
    { status: 403 },
  )

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
    if ((overtimeHours as any) === null || (overtimeHours as any) < 0) {
      return Response.json({ message: 'Nilai overtime tidak valid.' }, { status: 400 })
    }
    if ((latitude as any === null) !== (longitude as any === null)) {
      return Response.json({ message: 'Latitude dan longitude attendance harus diisi berpasangan.' }, { status: 400 })
    }
    if ((latitude as any) !== null && ((latitude as any) < -90 || (latitude as any) > 90)) {
      return Response.json({ message: 'Latitude attendance tidak valid.' }, { status: 400 })
    }
    if ((longitude as any) !== null && ((longitude as any) < -180 || (longitude as any) > 180)) {
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
    if ((checkIn as any) && !Number.isFinite((checkIn as any).getTime())) {
      return Response.json({ message: 'Waktu check in tidak valid.' }, { status: 400 })
    }
    if ((checkOut as any) && !Number.isFinite((checkOut as any).getTime())) {
      return Response.json({ message: 'Waktu check out tidak valid.' }, { status: 400 })
    }
    if ((checkIn as any) && (checkOut as any) && (checkOut as any).getTime() < (checkIn as any).getTime()) {
      return Response.json({ message: 'Check out tidak boleh lebih awal dari check in.' }, { status: 400 })
    }
    if (faceCaptureRef && !faceVerificationMode) {
      return Response.json({ message: 'Mode verifikasi wajah wajib diisi saat referensi wajah dikirim.' }, { status: 400 })
    }
    if ((faceConfig as any)?.isRequired && !faceCaptureRef) {
      return Response.json(
        { message: `Attendance saat ini wajib menyertakan referensi verifikasi wajah (${(faceConfig as any).verificationMode}).` },
        { status: 400 },
      )
    }

    if ((geofenceConfig as any)?.isRequired && ((latitude as any) === null || (longitude as any) === null)) {
      return Response.json(
        { message: `Attendance di ${(geofenceConfig as any).locationName} wajib mengirim lokasi browser.` },
        { status: 400 },
      )
    }

    let geofenceDistanceMeters: number | null = null
    let geofenceWithinRadius = false

    if (
      (geofenceConfig as any) &&
      (geofenceConfig as any).latitude !== null &&
      (geofenceConfig as any).longitude !== null &&
      (latitude as any) !== null &&
      (longitude as any) !== null
    ) {
      geofenceDistanceMeters = calculateDistanceMeters(
        (geofenceConfig as any).latitude,
        (geofenceConfig as any).longitude,
        latitude as any,
        longitude as any,
      )
      geofenceWithinRadius = (geofenceDistanceMeters as any) <= (geofenceConfig as any).radiusMeters

      if ((geofenceConfig as any).isRequired && !geofenceWithinRadius) {
        return Response.json(
          {
            message: `Lokasi attendance berada di luar radius ${(geofenceConfig as any).radiusMeters.toFixed(2)} meter dari ${(geofenceConfig as any).locationName}. Jarak terdeteksi ${(geofenceDistanceMeters as any).toFixed(2)} meter.`,
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
      (insertResult.insertId as number) &&
      faceCaptureRef
    ) {
      await recordHrAttendanceFaceLog({
        attendanceId: insertResult.insertId as number,
        employeeCode: employee.employeeCode,
        attendanceDate: attendanceDateValue,
        verificationMode: faceVerificationMode || (faceConfig as any)?.verificationMode || 'MANUAL_REVIEW',
        captureRef: faceCaptureRef,
        captureStatus: 'PENDING_REVIEW',
      })
    }

    if (
      (insertResult.insertId as number) &&
      (geofenceConfig as any) &&
      (geofenceConfig as any).latitude !== null &&
      (geofenceConfig as any).longitude !== null &&
      (latitude as any) !== null &&
      (longitude as any) !== null &&
      (geofenceDistanceMeters as any) !== null
    ) {
      await recordHrAttendanceGeofenceLog({
        attendanceId: insertResult.insertId as number,
        employeeCode: employee.employeeCode,
        attendanceDate: attendanceDateValue,
        config: geofenceConfig as any,
        submittedLatitude: latitude as any,
        submittedLongitude: longitude as any,
        distanceMeters: geofenceDistanceMeters as any,
        withinRadius: geofenceWithinRadius,
      })
    }

    await recordHrAudit({
      actionType: 'ATTENDANCE_CREATE',
      actor: `${(session as any).displayName} (${(session as any).username})`,
      targetRef: `${employee.employeeCode}:${attendanceDateValue}`,
      detail: `Attendance ${employee.employeeCode} - ${employee.fullName} tanggal ${attendanceDateValue} dicatat via web dengan status ${status}${(geofenceDistanceMeters as any) !== null ? ` dan jarak ${(geofenceDistanceMeters as any).toFixed(2)} meter dari geofence` : ''}${faceCaptureRef ? ` serta referensi verifikasi wajah ${faceCaptureRef}` : ''}.`,
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
          source_type = 'SOURCE_MANUAL_CORRECTION',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [checkInRaw || null, checkOutRaw || null, status, overtimeHours, lockByAdmin ? 1 : 0, attendance.id],
    )

    const beforeSnapshot = {
      attendance_id: attendance.id,
      employee_code: attendance.employeeCode,
      employee_name: attendance.fullName,
      attendance_date: attendance.attendanceDate,
      status: currentStatus,
      check_in: currentCheckIn,
      check_out: currentCheckOut,
      overtime_hours: currentOvertime,
      locked_by_admin: currentLock,
    }

    const afterSnapshot = {
      attendance_id: attendance.id,
      employee_code: attendance.employeeCode,
      employee_name: attendance.fullName,
      attendance_date: attendance.attendanceDate,
      status: status,
      check_in: checkInRaw || '',
      check_out: checkOutRaw || '',
      overtime_hours: overtimeHours,
      locked_by_admin: lockByAdmin,
    }

    const detailTextSnapshot =
      `BEFORE: ${JSON.stringify(beforeSnapshot)} | AFTER: ${JSON.stringify(afterSnapshot)}${notes ? ` | NOTES: ${notes}` : ''}`

    const statusChanged = currentStatus !== status
    const checkInChanged = currentCheckIn !== (checkInRaw || '')
    const checkOutChanged = currentCheckOut !== (checkOutRaw || '')
    const overtimeChanged = currentOvertime !== overtimeHours
    const lockChanged = currentLock !== lockByAdmin
    const isManualCorrection =
      statusChanged || checkInChanged || checkOutChanged || overtimeChanged || lockChanged

    await recordHrAudit({
      actionType: 'ATTENDANCE_UPDATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `ATT-${attendance.id}`,
      detail: `Attendance ${attendance.employeeCode} - ${attendance.fullName} tanggal ${attendance.attendanceDate} dikoreksi dari ${currentStatus} ke ${status}${notes ? ` (${notes})` : ''}.`,
    })

    if (isManualCorrection) {
      await recordHrAudit({
        actionType: 'EMPLOYEE_ATTENDANCE_CORRECTION',
        actor: `${session.displayName} (${session.username})`,
        targetRef: `${attendance.employeeCode}:ATT-${attendance.id}`,
        detail: detailTextSnapshot,
      })
    }

    return Response.json({
      message: `Attendance ${attendance.employeeCode} - ${attendance.fullName} tanggal ${attendance.attendanceDate} berhasil diperbarui.`,
      correction_recorded: isManualCorrection,
      before: beforeSnapshot,
      after: afterSnapshot,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
