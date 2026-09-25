import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { applyApprovedOvertimeToAttendance } from '@/lib/services/attendance-workforce-apply.service'

type UpdateResult = {
  affectedRows?: number
  changedRows?: number
}

type OtRequestRow = {
  id: number
  employee_id: number
  status: string
  overtime_date: string
  planned_minutes: number
  approved_minutes: number
  employee_code: string | null
  employee_name: string | null
  reason: string | null
}

const HR_FINAL_ROLES = new Set(['HR', 'SUPER_ADMIN', 'OWNER'])

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!HR_FINAL_ROLES.has(session.role)) {
    return Response.json({ message: 'Forbidden: hanya HR / SUPER_ADMIN / OWNER yang dapat melakukan final approval overtime.' }, { status: 403 })
  }
  if (!canPerformAction(session.role, 'overtime_requests', 'approve')) {
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
    const otId = Number.parseInt(String(params.id ?? '').trim(), 10)

    if (!Number.isInteger(otId) || otId <= 0) {
      return Response.json({ message: 'ID overtime tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      decision?: unknown
      hr_final_approved_minutes?: unknown
      hr_reason?: unknown
    }
    const decision = String(payload.decision ?? '').trim().toUpperCase()
    const hrFinalApprovedRaw = payload.hr_final_approved_minutes
    const hrReason = String(payload.hr_reason ?? '').trim()

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return Response.json(
        { message: 'decision wajib APPROVE atau REJECT.' },
        { status: 400 },
      )
    }

    if (decision === 'REJECT' && !hrReason) {
      return Response.json(
        { message: 'hr_reason wajib diisi saat menolak permohonan.' },
        { status: 400 },
      )
    }

    const rows = await runReviewDbQuery<OtRequestRow>(
      `
        SELECT
          hor.id,
          hor.employee_id,
          hor.status,
          CAST(hor.overtime_date AS CHAR) AS overtime_date,
          hor.planned_minutes,
          hor.approved_minutes,
          hor.reason,
          he.employee_code AS employee_code,
          he.full_name AS employee_name
        FROM hr_overtime_requests hor
        LEFT JOIN hr_employees he ON he.id = hor.employee_id
        WHERE hor.id = ?
        LIMIT 1
      `,
      [otId],
    )

    const req = rows[0]
    if (!req) {
      return Response.json({ message: 'Permohonan overtime tidak ditemukan.' }, { status: 404 })
    }

    if (req.status !== 'APPROVED_SUPERVISOR' && req.status !== 'PENDING_SUPERVISOR') {
      return Response.json(
        { message: `Hanya overtime status APPROVED_SUPERVISOR atau PENDING_SUPERVISOR yang dapat diproses Final. Status sekarang: ${req.status}` },
        { status: 409 },
      )
    }

    if (decision === 'REJECT') {
      await runReviewDbExecute<UpdateResult>(
        `
          UPDATE hr_overtime_requests
          SET status = 'REJECTED_HR',
              hr_reason = ?,
              updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [hrReason, otId],
      )
      await recordHrAudit({
        actionType: 'OVERTIME_HR_REJECT',
        actor: actorRef,
        targetRef: `OT-${otId}`,
        detail: `Overtime ID=${otId} REJECTED_HR oleh ${actorRef}. Employee ${req.employee_code} - ${req.employee_name}. Tanggal ${req.overtime_date} (planned=${req.planned_minutes}m, supervisor_approved=${req.approved_minutes}m). Alasan: ${hrReason}`,
      })
      return Response.json({
        message: 'Permohonan overtime ditolak HR.',
        overtime_request_id: otId,
        status: 'REJECTED_HR',
        hr_reason: hrReason,
      })
    }

    let finalApprovedMinutes = Number(req.approved_minutes) > 0 ? Number(req.approved_minutes) : Number(req.planned_minutes)
    if (hrFinalApprovedRaw !== undefined && hrFinalApprovedRaw !== null && String(hrFinalApprovedRaw).trim() !== '') {
      const parsed = Number(hrFinalApprovedRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        return Response.json(
          { message: 'hr_final_approved_minutes tidak valid (harus angka positif / nol).' },
          { status: 400 },
        )
      }
      if (parsed > Number(req.planned_minutes)) {
        return Response.json(
          { message: `hr_final_approved_minutes tidak boleh melebihi planned_minutes (${req.planned_minutes}).` },
          { status: 400 },
        )
      }
      finalApprovedMinutes = parsed
    }

    await runReviewDbExecute<UpdateResult>(
      `
        UPDATE hr_overtime_requests
        SET status = 'APPROVED_HR',
            approved_minutes = ?,
            hr_reason = ?,
            updated_at = NOW()
        WHERE id = ?
        LIMIT 1
      `,
      [finalApprovedMinutes, hrReason || null, otId],
    )

    await recordHrAudit({
      actionType: 'OVERTIME_HR_APPROVE',
      actor: actorRef,
      targetRef: `OT-${otId}`,
      detail: `Overtime ID=${otId} APPROVED_HR oleh ${actorRef}. Employee ${req.employee_code} - ${req.employee_name}. Tanggal ${req.overtime_date} planned=${req.planned_minutes}m, final_approved=${finalApprovedMinutes}m. Alasan OT: ${req.reason || '-'}`,
    })

    const applyResult = await applyApprovedOvertimeToAttendance(otId)

    await recordHrAudit({
      actionType: 'OVERTIME_HR_ATTENDANCE_APPLIED',
      actor: actorRef,
      targetRef: `OT-${otId}`,
      detail: JSON.stringify({
        overtime_request_id: otId,
        hr_actor: actorRef,
        final_approved_minutes: finalApprovedMinutes,
        applied_count: applyResult.appliedCount,
        skipped_no_row_count: applyResult.skippedNoRowCount,
        warnings: applyResult.warnings,
      }),
    })

    return Response.json({
      message: 'Permohonan overtime berhasil disetujui HR dan diterapkan ke attendance.',
      overtime_request_id: otId,
      status: 'APPROVED_HR',
      approved_minutes: finalApprovedMinutes,
      attendance_apply: {
        applied_count: applyResult.appliedCount,
        skipped_no_row_count: applyResult.skippedNoRowCount,
        warnings: applyResult.warnings,
      },
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
