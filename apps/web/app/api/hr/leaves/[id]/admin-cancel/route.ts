import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { revertLeaveRequestAttendanceSnapshot } from '@/lib/services/attendance-workforce-cancel-revert.service'
import type { LeaveRequestStatus } from '@/lib/types'

type LeaveRequestRow = {
  id: number
  employee_id: number
  status: LeaveRequestStatus
}

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const hasHrCancel =
    canPerformAction(session.role, 'hr', 'update') ||
    canPerformAction(session.role, 'leave_requests', 'approve') ||
    session.role === 'SUPER_ADMIN' ||
    session.role === 'OWNER'

  if (!hasHrCancel) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  await ensureHrBatch02b()

  const leaveId = parsePositiveInt(idLocal)
  if (!leaveId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  try {
    const payload = (await request.json()) as { cancel_reason?: unknown }
    const cancelReason = payload.cancel_reason === undefined || payload.cancel_reason === null
      ? ''
      : String(payload.cancel_reason).trim()

    if (!cancelReason) {
      return Response.json({ message: 'cancel_reason wajib diisi.' }, { status: 400 })
    }

    const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
      `SELECT id, employee_id, status FROM hr_leave_requests WHERE id = ? LIMIT 1`,
      [leaveId],
    )
    if (!leaveReq) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

    const actorName = `${session.role}:${session.displayName}`

    const revertResult = await revertLeaveRequestAttendanceSnapshot(
      leaveId,
      actorName,
      cancelReason,
    )

    await recordHrAudit({
      actionType: 'LEAVE_REQUEST_HR_CANCEL',
      actor: actorName,
      targetRef: `LEAVE_REQUEST-${leaveId}`,
      detail: JSON.stringify({
        leave_request_id: leaveId,
        employee_id: leaveReq.employee_id,
        old_status: leaveReq.status,
        cancel_reason: cancelReason,
        attendance_revert: {
          revertedCount: revertResult.revertedCount,
          skippedConflictCount: revertResult.skippedConflictCount,
          skippedNoSnapshotKeyCount: revertResult.skippedNoSnapshotKeyCount,
          warnings: revertResult.warnings,
        },
      }),
    })

    const hasConflictWarnings = revertResult.warnings.some((w) =>
      String(w).includes('LEAVE_REVERT_CONFLICT') ||
      String(w).includes('telah berubah setelah leave approved') ||
      String(w).includes('Revert otomatis dibatalkan'),
    )

    return Response.json({
      message: 'Leave dibatalkan.',
      id: leaveId,
      status: 'CANCELLED_HR_ADMIN' as LeaveRequestStatus,
      cancel_reason: cancelReason,
      leave_revert_warning: revertResult.warnings.length > 0 ? revertResult.warnings.join('\n') : null,
      attendance_revert: {
        reverted_count: revertResult.revertedCount,
        skipped_conflict_count: revertResult.skippedConflictCount,
        skipped_no_snapshot_key_count: revertResult.skippedNoSnapshotKeyCount,
      },
      conflict_detected: hasConflictWarnings,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal HR admin cancel leave: ${detail}` }, { status: 500 })
  }
}
