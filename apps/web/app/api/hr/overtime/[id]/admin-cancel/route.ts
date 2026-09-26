import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { revertOvertimeAttendanceSnapshot } from '@/lib/services/attendance-workforce-cancel-revert.service'

const HR_ADMIN_ROLES = new Set(['HR', 'SUPER_ADMIN', 'OWNER'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!HR_ADMIN_ROLES.has(session.role)) {
    return Response.json({ message: 'Forbidden: hanya HR / SUPER_ADMIN / OWNER yang dapat melakukan pembatalan admin overtime.' }, { status: 403 })
  }
  if (!canPerformAction(session.role, 'overtime_requests', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action overtime hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch02b()

  const actorRef = `${session.displayName} (${session.username})`

  try {
    const otId = Number.parseInt(String(idLocal ?? '').trim(), 10)

    if (!Number.isInteger(otId) || otId <= 0) {
      return Response.json({ message: 'ID overtime tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as { cancel_reason?: unknown }
    const cancelReason = String(payload.cancel_reason ?? '').trim()

    if (!cancelReason) {
      return Response.json({ message: 'cancel_reason wajib diisi untuk pembatalan admin.' }, { status: 400 })
    }

    const revertResult = await revertOvertimeAttendanceSnapshot(otId, actorRef, cancelReason)

    await recordHrAudit({
      actionType: 'OVERTIME_HR_CANCEL',
      actor: actorRef,
      targetRef: `OT-${otId}`,
      detail: JSON.stringify({
        overtime_request_id: otId,
        cancel_reason: cancelReason,
        actor: actorRef,
        revert_reverted_count: revertResult.revertedCount,
        revert_skipped_conflict: revertResult.skippedConflict,
        revert_skipped_no_row: revertResult.skippedNoRow,
        revert_warnings: revertResult.warnings,
        revert_audit_events: revertResult.auditEvents,
      }),
    })

    if (revertResult.skippedConflict > 0) {
      try {
        await recordHrAudit({
          actionType: 'OVERTIME_REVERT_CONFLICT',
          actor: actorRef,
          targetRef: `OT-${otId}`,
          detail: `OVERTIME_REVERT_CONFLICT OT-${otId}: ${revertResult.skippedConflict} attendance baris mengalami perubahan nilai setelah overtime approved (koreksi HR intervensi). Revert otomatis di-skip agar tidak timpa koreksi. Warning: ${revertResult.warnings.join(' | ')}`,
        })
      } catch {}
    }

    return Response.json({
      message: 'Permohonan overtime berhasil dibatalkan oleh HR Admin. Status selalu CANCELLED_HR_ADMIN (committed).',
      overtime_request_id: otId,
      status: 'CANCELLED_HR_ADMIN',
      cancel_reason: cancelReason,
      ot_revert_warning: revertResult.warnings.length > 0 ? revertResult.warnings.join('\n') : null,
      ot_revert_detail: {
        revertedCount: revertResult.revertedCount,
        skippedConflict: revertResult.skippedConflict,
        skippedNoRow: revertResult.skippedNoRow,
        warnings: revertResult.warnings,
        auditEvents: revertResult.auditEvents,
      },
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
