import { runReviewDbQuery, runReviewDbExecute } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

type LeaveRequestRow = {
  id: number
  employee_id: number
  start_date: string
  end_date: string
  reason: string | null
  leave_type_id: number | null
}

type LeaveTypeRow = {
  id: number
  code: string | null
  name: string | null
}

type AttendanceRow = {
  id: number
  employee_id: number
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status: string | null
  overtime_minutes: number | null
  notes: string | null
  locked_by_admin: number
  source_type: string | null
}

type OvertimeRequestRow = {
  id: number
  employee_id: number
  overtime_date: string
  approved_minutes: number | null
  planned_minutes: number | null
  reason: string | null
}

type ApplyLeaveResult = {
  appliedCount: number
  skippedNoAttendanceRowCount: number
  totalDaysRange: number
  warnings: string[]
  snapshotMap: Record<string, any>
}

type ApplyOvertimeResult = {
  appliedCount: number
  skippedNoRowCount: number
  snapshotMap: Record<string, any>
  warnings: string[]
}

const allowedStatuses = new Set(['PRESENT', 'SICK', 'PERMIT', 'ALPHA'])

function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function iterateDateRange(startISO: string, endISO: string): string[] {
  const dates: string[] = []
  const s = new Date(startISO + 'T00:00:00')
  const e = new Date(endISO + 'T00:00:00')
  const cur = new Date(s)
  while (cur.getTime() <= e.getTime()) {
    dates.push(toISODateString(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function concatNotesSafely(oldNotes: string | null | undefined, append: string): string {
  const oldVal = typeof oldNotes === 'string' ? oldNotes.trim() : ''
  const sep = oldVal.length > 0 ? '; ' : ''
  const combined = oldVal + sep + append
  if (combined.length > 499) {
    return combined.substring(0, 499)
  }
  return combined
}

function mapLeaveTypeCodeToStatus(typeCode: string | null | undefined): string | null {
  if (!typeCode) return null
  const code = typeCode.trim().toUpperCase()
  if (code === 'SAKIT') return 'SICK'
  if (code === 'IZIN') return 'PERMIT'
  return 'PERMIT'
}

export async function applyApprovedLeaveToAttendance(
  leaveRequestId: number,
  actorDisplayName: string
): Promise<ApplyLeaveResult> {
  const snapshotMap: Record<string, any> = {}
  const warnings: string[] = []
  let appliedCount = 0
  let skippedNoAttendanceRowCount = 0

  const leaveRows = await runReviewDbQuery<LeaveRequestRow>(
    `
      SELECT
        id,
        employee_id,
        CAST(start_date AS CHAR) AS start_date,
        CAST(end_date AS CHAR) AS end_date,
        reason,
        leave_type_id
      FROM hr_leave_requests
      WHERE id = ?
      LIMIT 1
    `,
    [leaveRequestId]
  )

  if (!Array.isArray(leaveRows) || leaveRows.length === 0) {
    warnings.push(`Leave request ID=${leaveRequestId} tidak ditemukan`)
    return {
      appliedCount: 0,
      skippedNoAttendanceRowCount: 0,
      totalDaysRange: 0,
      warnings,
      snapshotMap: {},
    }
  }

  const leaveReq = leaveRows[0]
  const dates = iterateDateRange(leaveReq.start_date, leaveReq.end_date)
  const totalDaysRange = dates.length

  let leaveType: LeaveTypeRow | null = null
  if (leaveReq.leave_type_id) {
    const ltRows = await runReviewDbQuery<LeaveTypeRow>(
      `SELECT id, code, name FROM hr_leave_types WHERE id = ? LIMIT 1`,
      [leaveReq.leave_type_id]
    )
    if (Array.isArray(ltRows) && ltRows.length > 0) {
      leaveType = ltRows[0]
    }
  }

  const leaveTypeCode = leaveType?.code ?? null
  const leaveTypeName = leaveType?.name ?? leaveTypeCode ?? '-'

  for (const date of dates) {
    const attRows = await runReviewDbQuery<AttendanceRow>(
      `
        SELECT
          a.id,
          a.employee_id,
          CAST(a.attendance_date AS CHAR) AS attendance_date,
          CAST(a.check_in AS CHAR) AS check_in,
          CAST(a.check_out AS CHAR) AS check_out,
          a.status,
          a.overtime_minutes,
          a.notes,
          a.locked_by_admin,
          a.source_type
        FROM hr_attendance a
        WHERE a.employee_id = ? AND a.attendance_date = ?
        LIMIT 1
      `,
      [leaveReq.employee_id, date]
    )

    const att = Array.isArray(attRows) && attRows.length > 0 ? attRows[0] : null

    if (!att) {
      skippedNoAttendanceRowCount++
      warnings.push(`SKIP tgl=${date} employee_id=${leaveReq.employee_id}: TIDAK ADA baris attendance (tidak ada fingerprint event / engine belum populate). NO INSERT.`)
      continue
    }

    const finalStatus = mapLeaveTypeCodeToStatus(leaveTypeCode)
    if (!finalStatus || !allowedStatuses.has(finalStatus)) {
      warnings.push(`SKIP tgl=${date}: Mapping leave type.code=${leaveTypeCode ?? 'NULL'} -> status INVALID (bukan canonical 4 PRESENT/SICK/PERMIT/ALPHA). finalStatus=${finalStatus ?? 'NULL'}`)
      continue
    }

    const finalNoteAppend = `[LEAVE ID=${leaveRequestId} TYPE=${leaveTypeName} applied tgl=${date} alasan=${leaveReq.reason || '-'}]`
    const newNotesStoredValueExact = concatNotesSafely(att.notes, finalNoteAppend)

    snapshotMap[date] = {
      id: att.id,
      before_leave_status: att.status,
      before_leave_notes: att.notes,
      after_leave_applied_expected_status: finalStatus,
      after_leave_applied_expected_notes: newNotesStoredValueExact,
      overtime_before_snapshot_touched_not_by_leave: att.overtime_minutes,
      ci_before_not_touched: att.check_in,
      co_before_not_touched: att.check_out,
      lock_before_not_touched: att.locked_by_admin,
      source_type_before_provenance_never_touch: att.source_type,
    }

    await runReviewDbExecute(
      `
        UPDATE hr_attendance
        SET status = ?,
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
        LIMIT 1
      `,
      [finalStatus, newNotesStoredValueExact, att.id]
    )

    appliedCount++
  }

  const snapshotJson = JSON.stringify(snapshotMap)
  await runReviewDbExecute(
    `
      UPDATE hr_leave_requests
      SET attendance_snapshot_before = ?,
          updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [snapshotJson, leaveRequestId]
  )

  await recordHrAudit({
    actionType: 'ATTENDANCE_UPDATE',
    actor: actorDisplayName || 'System HR',
    targetRef: `hr_leave_requests:${leaveRequestId}`,
    detail: JSON.stringify({
      audit_hint: 'LEAVE_REQUEST_HR_ATTENDANCE_APPLIED',
      leave_request_id: leaveRequestId,
      employee_id: leaveReq.employee_id,
      appliedCount,
      skippedNoAttendanceRowCount,
      totalDaysRange,
      warnings,
    }),
  })

  return {
    appliedCount,
    skippedNoAttendanceRowCount,
    totalDaysRange,
    warnings,
    snapshotMap,
  }
}

export async function applyApprovedOvertimeToAttendance(
  otRequestId: number
): Promise<ApplyOvertimeResult> {
  const snapshotMap: Record<string, any> = {}
  const warnings: string[] = []
  let appliedCount = 0
  let skippedNoRowCount = 0

  const otRows = await runReviewDbQuery<OvertimeRequestRow>(
    `
      SELECT
        id,
        employee_id,
        CAST(overtime_date AS CHAR) AS overtime_date,
        approved_minutes,
        planned_minutes,
        reason
      FROM hr_overtime_requests
      WHERE id = ?
      LIMIT 1
    `,
    [otRequestId]
  )

  if (!Array.isArray(otRows) || otRows.length === 0) {
    warnings.push(`Overtime request ID=${otRequestId} tidak ditemukan`)
    return {
      appliedCount: 0,
      skippedNoRowCount: 0,
      snapshotMap: {},
      warnings,
    }
  }

  const otReq = otRows[0]
  const date = otReq.overtime_date

  const attRows = await runReviewDbQuery<AttendanceRow>(
    `
      SELECT
        a.id,
        a.employee_id,
        CAST(a.attendance_date AS CHAR) AS attendance_date,
        CAST(a.check_in AS CHAR) AS check_in,
        CAST(a.check_out AS CHAR) AS check_out,
        a.status,
        a.overtime_minutes,
        a.notes,
        a.locked_by_admin,
        a.source_type
      FROM hr_attendance a
      WHERE a.employee_id = ? AND a.attendance_date = ?
      LIMIT 1
    `,
    [otReq.employee_id, date]
  )

  const att = Array.isArray(attRows) && attRows.length > 0 ? attRows[0] : null

  if (!att) {
    skippedNoRowCount++
    warnings.push(`SKIP tgl=${date} employee_id=${otReq.employee_id}: TIDAK ADA baris attendance (tidak ada fingerprint event). NO INSERT.`)
  } else {
    const overtimeFinalSet =
      typeof otReq.approved_minutes === 'number'
        ? otReq.approved_minutes
        : typeof otReq.planned_minutes === 'number'
          ? otReq.planned_minutes
          : 0

    const noteAppend = `[OVERTIME ID=${otRequestId} approved ${overtimeFinalSet} menit (alasan: ${otReq.reason || '-'})]`
    const newNotesStored = concatNotesSafely(att.notes, noteAppend)

    snapshotMap[date] = {
      attendance_id: att.id,
      overtime_before_value: att.overtime_minutes,
      after_approved_expected_overtime: overtimeFinalSet,
      status_before_unchanged_never_overwrite: att.status,
      notes_before_value: att.notes,
      ci_before_not_touched: att.check_in,
      co_before_not_touched: att.check_out,
      lock_before: att.locked_by_admin,
      source_type_before_prov_never_touch: att.source_type,
    }

    await runReviewDbExecute(
      `
        UPDATE hr_attendance
        SET overtime_minutes = ?,
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
        LIMIT 1
      `,
      [overtimeFinalSet, newNotesStored, att.id]
    )

    appliedCount++
  }

  const snapshotJson = JSON.stringify(snapshotMap)
  await runReviewDbExecute(
    `
      UPDATE hr_overtime_requests
      SET attendance_snapshot_before = ?,
          updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [snapshotJson, otRequestId]
  )

  await recordHrAudit({
    actionType: 'ATTENDANCE_UPDATE',
    actor: 'System HR Overtime Apply',
    targetRef: `hr_overtime_requests:${otRequestId}`,
    detail: JSON.stringify({
      audit_hint: 'OVERTIME_HR_ATTENDANCE_APPLIED',
      overtime_request_id: otRequestId,
      employee_id: otReq.employee_id,
      appliedCount,
      skippedNoRowCount,
      warnings,
    }),
  })

  return {
    appliedCount,
    skippedNoRowCount,
    snapshotMap,
    warnings,
  }
}
