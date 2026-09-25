import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

type ExecuteResult = {
  affectedRows?: number
  changedRows?: number
}

type LeaveRequestRow = {
  id: number
  employee_id: number
  leave_type_id: number
  start_date: string
  total_days: number
  balance_applied: number | boolean
  attendance_snapshot_before: string | null
  status: string | null
}

type OvertimeRequestRow = {
  id: number
  attendance_snapshot_before: string | null
  status: string | null
}

type LeaveAttendanceSnapshotEntry = {
  id: number
  before_leave_status: string | null
  before_leave_notes: string | null
  after_leave_applied_expected_status: string | null
  after_leave_applied_expected_notes: string | null
}

type OvertimeAttendanceSnapshotEntry = {
  attendance_id: number
  overtime_before_value: number | null
  after_approved_expected_overtime: number | null
  notes_before_value: string | null
}

type CurrentAttendanceStatusRow = {
  id: number
  status: string | null
  notes: string | null
}

type CurrentAttendanceOvertimeRow = {
  id: number
  overtime_minutes: number | null
  notes: string | null
}

export type RestoreLeaveBalanceResult = {
  balanceRestored: boolean
  alreadyRestored: boolean
  statusUpdatedToCancelled: boolean
  warnings: string[]
  auditEvents: string[]
}

export type RevertLeaveAttendanceResult = {
  revertedCount: number
  skippedConflictCount: number
  skippedNoSnapshotKeyCount: number
  warnings: string[]
  auditEvents: string[]
}

export type RevertOvertimeAttendanceResult = {
  revertedCount: number
  skippedConflict: number
  skippedNoRow: number
  warnings: string[]
  auditEvents: string[]
}

export async function restoreLeaveRequestBalance(
  leaveRequestId: number | string,
  actorDisplayName: string,
  cancelReason?: string | null,
): Promise<RestoreLeaveBalanceResult> {
  const result: RestoreLeaveBalanceResult = {
    balanceRestored: false,
    alreadyRestored: false,
    statusUpdatedToCancelled: false,
    warnings: [],
    auditEvents: [],
  }

  const leaveRows = await runReviewDbQuery<LeaveRequestRow>(
    `
      SELECT
        id,
        employee_id,
        leave_type_id,
        start_date,
        total_days,
        balance_applied,
        attendance_snapshot_before,
        status
      FROM hr_leave_requests
      WHERE id = ?
      LIMIT 1
    `,
    [leaveRequestId],
  )

  const leave = leaveRows[0]
  if (!leave) {
    result.warnings.push(`Leave request id=${leaveRequestId} tidak ditemukan.`)
    return result
  }

  const leaveIdNum = Number(leave.id)
  const employeeIdNum = Number(leave.employee_id)
  const leaveTypeIdNum = Number(leave.leave_type_id)
  const totalDaysNum = Number(leave.total_days ?? 0)
  const balanceAppliedFlag =
    leave.balance_applied === true ||
    leave.balance_applied === 1 ||
    String(leave.balance_applied) === '1'

  if (!balanceAppliedFlag) {
    result.alreadyRestored = true
    result.warnings.push(
      `balance already restored idempotent skip: leave_request id=${leaveIdNum} sudah memiliki balance_applied=FALSE.`,
    )
    result.auditEvents.push(
      `LEAVE_BALANCE_ALREADY_RESTORED leave_request_id=${leaveIdNum} balance_applied=0 skip idempotent.`,
    )
  } else {
    const startDateStr = String(leave.start_date ?? '')
    const fiscalYearMatch = startDateStr.match(/^(\d{4})/)
    const fiscalYearNum = fiscalYearMatch ? Number(fiscalYearMatch[1]) : new Date().getFullYear()

    const balanceUpdateResult = await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_leave_balances
        SET balance_used = balance_used - ?,
            updated_at = NOW()
        WHERE employee_id = ?
          AND leave_type_id = ?
          AND fiscal_year = ?
        LIMIT 1
      `,
      [totalDaysNum, employeeIdNum, leaveTypeIdNum, fiscalYearNum],
    )

    const balanceRowsAffected = Number(balanceUpdateResult.affectedRows ?? 0)
    if (balanceRowsAffected > 0) {
      result.balanceRestored = true
      result.auditEvents.push(
        `LEAVE_BALANCE_RESTORE_SUCCESS leave_request_id=${leaveIdNum} employee_id=${employeeIdNum} leave_type_id=${leaveTypeIdNum} fiscal_year=${fiscalYearNum} total_days_restored=${totalDaysNum}.`,
      )
    } else {
      result.warnings.push(
        `Balance restore: hr_leave_balances tidak ditemukan untuk employee_id=${employeeIdNum}, leave_type_id=${leaveTypeIdNum}, fiscal_year=${fiscalYearNum}. Skip update balance_used.`,
      )
      result.auditEvents.push(
        `LEAVE_BALANCE_RESTORE_NO_ROW leave_request_id=${leaveIdNum} employee_id=${employeeIdNum} leave_type_id=${leaveTypeIdNum} fiscal_year=${fiscalYearNum}.`,
      )
    }
  }

  const finalCancelReason = cancelReason && String(cancelReason).trim() ? String(cancelReason).trim() : null
  const statusUpdateResult = await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_leave_requests
      SET balance_applied = 0,
          status = 'CANCELLED_HR_ADMIN',
          cancel_reason = ?,
          updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [finalCancelReason, leaveIdNum],
  )

  if (Number(statusUpdateResult.affectedRows ?? 0) > 0) {
    result.statusUpdatedToCancelled = true
    result.auditEvents.push(
      `LEAVE_REQUEST_STATUS_UPDATED_CANCELLED_HR_ADMIN leave_request_id=${leaveIdNum}.`,
    )
  }

  try {
    await recordHrAudit({
      actionType: 'EMPLOYEE_ATTENDANCE_CORRECTION',
      actor: actorDisplayName?.trim() || 'HR Admin System',
      targetRef: `hr_leave_requests:${leaveIdNum}`,
      detail: `LEAVE_BALANCE_RESTORE id=${leaveIdNum} balance_restored=${result.balanceRestored} already_restored=${result.alreadyRestored} actor=${actorDisplayName}`,
    })
  } catch {}

  return result
}

export async function revertLeaveRequestAttendanceSnapshot(
  leaveRequestId: number | string,
  actorDisplayName: string,
  cancelReason?: string | null,
): Promise<RevertLeaveAttendanceResult> {
  const result: RevertLeaveAttendanceResult = {
    revertedCount: 0,
    skippedConflictCount: 0,
    skippedNoSnapshotKeyCount: 0,
    warnings: [],
    auditEvents: [],
  }

  const leaveRows = await runReviewDbQuery<LeaveRequestRow>(
    `
      SELECT
        id,
        employee_id,
        leave_type_id,
        start_date,
        total_days,
        balance_applied,
        attendance_snapshot_before,
        status
      FROM hr_leave_requests
      WHERE id = ?
      LIMIT 1
    `,
    [leaveRequestId],
  )

  const leave = leaveRows[0]
  if (!leave) {
    result.warnings.push(`Leave request id=${leaveRequestId} tidak ditemukan.`)
    return result
  }

  const leaveIdNum = Number(leave.id)
  const snapshotRaw = leave.attendance_snapshot_before

  let snapshot: Record<string, LeaveAttendanceSnapshotEntry> = {}
  if (snapshotRaw && String(snapshotRaw).trim()) {
    try {
      snapshot = JSON.parse(String(snapshotRaw)) as Record<string, LeaveAttendanceSnapshotEntry>
    } catch {
      snapshot = {}
      result.warnings.push(
        `attendance_snapshot_before JSON parse gagal untuk leave_request id=${leaveIdNum}. Semua attendance revert attendance dibatalkan.`,
      )
    }
  }

  const dateKeys = snapshot && typeof snapshot === 'object' ? Object.keys(snapshot) : []

  for (const dateKey of dateKeys) {
    const YYYYMMDDMatch = dateKey.match(/^\d{4}-\d{2}-\d{2}$/)
    if (!YYYYMMDDMatch) {
      result.skippedNoSnapshotKeyCount++
      continue
    }

    const snap = snapshot[dateKey]
    if (!snap || !snap.id) {
      result.skippedNoSnapshotKeyCount++
      continue
    }

    const attendanceIdNum = Number(snap.id)
    const expectedAfterStatus = snap.after_leave_applied_expected_status ?? null
    const expectedAfterNotes = snap.after_leave_applied_expected_notes ?? null
    const revertTargetStatus = snap.before_leave_status ?? null
    const revertTargetNotes = snap.before_leave_notes ?? null

    const currentRows = await runReviewDbQuery<CurrentAttendanceStatusRow>(
      `
        SELECT id, status, notes
        FROM hr_attendance
        WHERE id = ?
        LIMIT 1
      `,
      [attendanceIdNum],
    )

    const current = currentRows[0]
    if (!current) {
      result.skippedNoSnapshotKeyCount++
      result.auditEvents.push(
        `LEAVE_REVERT_NO_ATTENDANCE_ROW date=${dateKey} attendance_id=${attendanceIdNum} leave_request_id=${leaveIdNum}.`,
      )
      continue
    }

    const currentStatusNorm = current.status ?? null
    const currentNotesNorm = (current.notes ?? '') as string
    const expectedStatusNorm = expectedAfterStatus ?? null
    const expectedNotesNorm = (expectedAfterNotes ?? '') as string

    const statusMatch = currentStatusNorm === expectedStatusNorm
    const notesMatch = currentNotesNorm === expectedNotesNorm
    const safeToRevert = statusMatch && notesMatch

    if (safeToRevert) {
      const updateResult = await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE hr_attendance
          SET status = ?,
              notes = ?,
              updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [revertTargetStatus, revertTargetNotes, attendanceIdNum],
      )

      if (Number(updateResult.affectedRows ?? 0) > 0) {
        result.revertedCount++
        result.auditEvents.push(
          `LEAVE_REQUEST_HR_CANCEL_REVERT_ATTENDANCE_SUCCESS date=${dateKey} attendance_id=${attendanceIdNum} leave_request_id=${leaveIdNum} revert_status=${String(revertTargetStatus ?? 'NULL')}.`,
        )
      }
    } else {
      result.skippedConflictCount++
      result.warnings.push(
        `Tanggal ${dateKey}: attendance value telah berubah setelah leave approved (intervensi koreksi/proses lain). Revert otomatis dibatalkan. Silakan finalisasi via PATCH Correction.`,
      )
      result.auditEvents.push(
        `LEAVE_REVERT_CONFLICT date=${dateKey} attendance_id=${attendanceIdNum} leave_request_id=${leaveIdNum} current_status=${String(currentStatusNorm ?? 'NULL')} expected_status=${String(expectedStatusNorm ?? 'NULL')} status_match=${statusMatch} notes_match=${notesMatch}.`,
      )
    }
  }

  try {
    await recordHrAudit({
      actionType: 'EMPLOYEE_ATTENDANCE_CORRECTION',
      actor: actorDisplayName?.trim() || 'HR Admin System',
      targetRef: `hr_leave_requests:${leaveIdNum}`,
      detail: `LEAVE_REQUEST_HR_CANCEL_ATTENDANCE_REVERT id=${leaveIdNum} reverted=${result.revertedCount} conflict_skip=${result.skippedConflictCount} no_snapshot_key_skip=${result.skippedNoSnapshotKeyCount} actor=${actorDisplayName}`,
    })
  } catch {}

  const balanceResult = await restoreLeaveRequestBalance(leaveRequestId, actorDisplayName, cancelReason)

  result.warnings = result.warnings.concat(balanceResult.warnings)
  result.auditEvents = result.auditEvents.concat(balanceResult.auditEvents)

  if (!balanceResult.statusUpdatedToCancelled) {
    const finalCancelReason = cancelReason && String(cancelReason).trim() ? String(cancelReason).trim() : null
    const statusOnlyResult = await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_leave_requests
        SET status = 'CANCELLED_HR_ADMIN',
            cancel_reason = ?,
            updated_at = NOW()
        WHERE id = ?
          AND status <> 'CANCELLED_HR_ADMIN'
        LIMIT 1
      `,
      [finalCancelReason, leaveIdNum],
    )
    if (Number(statusOnlyResult.affectedRows ?? 0) > 0) {
      result.auditEvents.push(
        `LEAVE_REQUEST_FALLBACK_STATUS_CANCELLED_HR_ADMIN leave_request_id=${leaveIdNum}.`,
      )
    }
  }

  return result
}

export async function revertOvertimeAttendanceSnapshot(
  otRequestId: number | string,
  actorDisplayName: string,
  cancelReason?: string | null,
): Promise<RevertOvertimeAttendanceResult> {
  const result: RevertOvertimeAttendanceResult = {
    revertedCount: 0,
    skippedConflict: 0,
    skippedNoRow: 0,
    warnings: [],
    auditEvents: [],
  }

  const otRows = await runReviewDbQuery<OvertimeRequestRow>(
    `
      SELECT
        id,
        attendance_snapshot_before,
        status
      FROM hr_overtime_requests
      WHERE id = ?
      LIMIT 1
    `,
    [otRequestId],
  )

  const ot = otRows[0]
  if (!ot) {
    result.warnings.push(`Overtime request id=${otRequestId} tidak ditemukan.`)
    return result
  }

  const otIdNum = Number(ot.id)
  const snapshotRaw = ot.attendance_snapshot_before

  let snapshot: Record<string, OvertimeAttendanceSnapshotEntry> = {}
  if (snapshotRaw && String(snapshotRaw).trim()) {
    try {
      snapshot = JSON.parse(String(snapshotRaw)) as Record<string, OvertimeAttendanceSnapshotEntry>
    } catch {
      snapshot = {}
      result.warnings.push(
        `attendance_snapshot_before JSON parse gagal untuk overtime_request id=${otIdNum}. Semua attendance revert overtime dibatalkan.`,
      )
    }
  }

  const dateKeys = snapshot && typeof snapshot === 'object' ? Object.keys(snapshot) : []

  for (const dateKey of dateKeys) {
    const YYYYMMDDMatch = dateKey.match(/^\d{4}-\d{2}-\d{2}$/)
    if (!YYYYMMDDMatch) {
      result.skippedNoRow++
      continue
    }

    const snap = snapshot[dateKey]
    if (!snap || !snap.attendance_id) {
      result.skippedNoRow++
      continue
    }

    const attendanceIdNum = Number(snap.attendance_id)
    const expectedAfterOvertime =
      snap.after_approved_expected_overtime === undefined || snap.after_approved_expected_overtime === null
        ? null
        : Number(snap.after_approved_expected_overtime)
    const revertToOvertime =
      snap.overtime_before_value === undefined || snap.overtime_before_value === null
        ? null
        : Number(snap.overtime_before_value)
    const revertOldNotes = snap.notes_before_value ?? null

    const currentRows = await runReviewDbQuery<CurrentAttendanceOvertimeRow>(
      `
        SELECT id, overtime_minutes, notes
        FROM hr_attendance
        WHERE id = ?
        LIMIT 1
      `,
      [attendanceIdNum],
    )

    const current = currentRows[0]
    if (!current) {
      result.skippedNoRow++
      result.auditEvents.push(
        `OVERTIME_REVERT_NO_ATTENDANCE_ROW date=${dateKey} attendance_id=${attendanceIdNum} ot_request_id=${otIdNum}.`,
      )
      continue
    }

    const currentOvertime =
      current.overtime_minutes === undefined || current.overtime_minutes === null
        ? null
        : Number(current.overtime_minutes)

    const overtimeMatch = currentOvertime === expectedAfterOvertime

    if (overtimeMatch) {
      const updateResult = await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE hr_attendance
          SET overtime_minutes = ?,
              notes = ?,
              updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [revertToOvertime, revertOldNotes, attendanceIdNum],
      )

      if (Number(updateResult.affectedRows ?? 0) > 0) {
        result.revertedCount++
        result.auditEvents.push(
          `OVERTIME_HR_CANCEL_REVERT_SUCCESS date=${dateKey} attendance_id=${attendanceIdNum} ot_request_id=${otIdNum} revert_overtime_minutes=${String(revertToOvertime ?? 'NULL')}.`,
        )
      }
    } else {
      result.skippedConflict++
      result.warnings.push(
        `Tanggal ${dateKey}: overtime_minutes attendance telah diubah koreksi HR setelah approved OT. Revert otomatis dibatalkan tidak overwrite. Silakan finalisasi via PATCH Correction attendance.`,
      )
      result.auditEvents.push(
        `OVERTIME_REVERT_CONFLICT date=${dateKey} attendance_id=${attendanceIdNum} ot_request_id=${otIdNum} current_overtime_minutes=${String(currentOvertime ?? 'NULL')} expected_after_overtime=${String(expectedAfterOvertime ?? 'NULL')} match=${overtimeMatch}.`,
      )
    }
  }

  const finalCancelReason = cancelReason && String(cancelReason).trim() ? String(cancelReason).trim() : null
  const statusUpdateResult = await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_overtime_requests
      SET status = 'CANCELLED_HR_ADMIN',
          cancel_reason = ?,
          updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [finalCancelReason, otIdNum],
  )

  if (Number(statusUpdateResult.affectedRows ?? 0) > 0) {
    result.auditEvents.push(
      `OVERTIME_HR_CANCEL_STATUS_UPDATED ot_request_id=${otIdNum} status=CANCELLED_HR_ADMIN.`,
    )
  }

  try {
    await recordHrAudit({
      actionType: 'EMPLOYEE_ATTENDANCE_CORRECTION',
      actor: actorDisplayName?.trim() || 'HR Admin System',
      targetRef: `hr_overtime_requests:${otIdNum}`,
      detail: `OVERTIME_HR_CANCEL_ATTENDANCE_REVERT id=${otIdNum} reverted=${result.revertedCount} conflict_skip=${result.skippedConflict} no_row_skip=${result.skippedNoRow} actor=${actorDisplayName}`,
    })
  } catch {}

  return result
}
