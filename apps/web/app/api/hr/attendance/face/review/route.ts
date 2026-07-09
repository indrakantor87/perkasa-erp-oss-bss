import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  getRecentHrAttendanceFaceReviewItems,
  processHrAttendanceFaceReviewFeedback,
  reviewHrAttendanceFaceLog,
} from '@/lib/services/hr-attendance-face-service'

const allowedDecisionStatuses = new Set(['PENDING_REVIEW', 'VERIFIED', 'REJECTED'])

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Review verifikasi wajah hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const items = await getRecentHrAttendanceFaceReviewItems(12)
    return Response.json({ items })
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
      { message: 'Review verifikasi wajah hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      faceLogId?: unknown
      decisionStatus?: unknown
      reviewNotes?: unknown
      applyBaselineFeedback?: unknown
    }

    const faceLogId = Number.parseInt(String(payload.faceLogId ?? '').trim(), 10)
    const decisionStatus = String(payload.decisionStatus ?? '').trim().toUpperCase()
    const reviewNotes = String(payload.reviewNotes ?? '').trim()
    const applyBaselineFeedback =
      String(payload.applyBaselineFeedback ?? '').trim() === '1' || payload.applyBaselineFeedback === true

    if (!Number.isInteger(faceLogId) || faceLogId <= 0) {
      return Response.json({ message: 'Log verifikasi wajah tidak valid.' }, { status: 400 })
    }
    if (!allowedDecisionStatuses.has(decisionStatus)) {
      return Response.json({ message: 'Status review wajah tidak valid.' }, { status: 400 })
    }
    if (decisionStatus === 'REJECTED' && !reviewNotes) {
      return Response.json({ message: 'Catatan review wajib diisi saat verifikasi wajah ditolak.' }, { status: 400 })
    }

    const items = await getRecentHrAttendanceFaceReviewItems(100)
    const targetItem = items.find((item) => item.faceLogId === faceLogId)
    if (!targetItem) {
      return Response.json({ message: 'Log verifikasi wajah tidak ditemukan.' }, { status: 404 })
    }

    await reviewHrAttendanceFaceLog({
      faceLogId,
      decisionStatus: decisionStatus as 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED',
      reviewNotes,
      reviewedBy: `${session.displayName} (${session.username})`,
    })

    const feedbackResult = await processHrAttendanceFaceReviewFeedback({
      item: targetItem,
      decisionStatus: decisionStatus as 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED',
      actedBy: `${session.displayName} (${session.username})`,
      applyBaselineFeedback,
    })

    await recordHrAudit({
      actionType: 'ATTENDANCE_FACE_REVIEW',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `FACE-${faceLogId}`,
      detail: `Review verifikasi wajah ${targetItem.employeeCode} pada attendance ${targetItem.attendanceDate} diubah ke ${decisionStatus}${reviewNotes ? ` (${reviewNotes})` : ''}${feedbackResult.baselineReinforced ? '; baseline employee diperkuat otomatis' : ''}${feedbackResult.retakeQueued ? '; antrean retake dibuat' : ''}.`,
    })

    if (feedbackResult.baselineReinforced) {
      await recordHrAudit({
        actionType: 'EMPLOYEE_FACE_REFERENCE_UPSERT',
        actor: `${session.displayName} (${session.username})`,
        targetRef: targetItem.employeeCode,
        detail: `Baseline wajah employee diperkuat dari review FACE-${faceLogId} yang berstatus VERIFIED + MATCH.`,
      })
    }

    if (feedbackResult.retakeQueued) {
      await recordHrAudit({
        actionType: 'ATTENDANCE_FACE_RETAKE_QUEUE',
        actor: `${session.displayName} (${session.username})`,
        targetRef: `FACE-${faceLogId}`,
        detail: `Capture ${targetItem.captureRef} untuk ${targetItem.employeeCode} masuk antrean retake karena outcome baseline ${targetItem.baselineMatchOutcome}.`,
      })
    }

    return Response.json({
      message: `Review verifikasi wajah berhasil diubah ke ${decisionStatus}.${feedbackResult.baselineReinforced ? ' Baseline employee ikut diperkuat.' : ''}${feedbackResult.retakeQueued ? ' Capture masuk antrean retake.' : ''}`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
