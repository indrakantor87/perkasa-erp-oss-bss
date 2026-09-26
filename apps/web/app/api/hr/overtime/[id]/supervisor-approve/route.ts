import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import {
  resolveDirectSubordinateEmployeeIds,
  validateSupervisorChainNoCircularAndNoSelf,
} from '@/lib/services/supervisor-scope.service'

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
  supervisor_id: number | null
  employee_code: string | null
  employee_name: string | null
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
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
    const me = await requireEmployeeByAuthUserId(session.userId)
    const otId = Number.parseInt(String(params.id ?? '').trim(), 10)

    if (!Number.isInteger(otId) || otId <= 0) {
      return Response.json({ message: 'ID overtime tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      decision?: unknown
      supervisor_approved_minutes?: unknown
      supervisor_reason?: unknown
    }
    const decision = String(payload.decision ?? '').trim().toUpperCase()
    const supApprovedMinutesRaw = payload.supervisor_approved_minutes
    const supervisorReason = String(payload.supervisor_reason ?? '').trim()

    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return Response.json(
        { message: 'decision wajib APPROVE atau REJECT.' },
        { status: 400 },
      )
    }

    if (decision === 'REJECT' && !supervisorReason) {
      return Response.json(
        { message: 'supervisor_reason wajib diisi saat menolak permohonan.' },
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
          hor.supervisor_id,
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

    const subordinateIds = await resolveDirectSubordinateEmployeeIds(Number(session.userId ?? 0))
    const inScope = subordinateIds.includes(Number(req.employee_id))

    if (!inScope) {
      await recordHrAudit({
        actionType: 'OVERTIME_SUPERVISOR_SCOPE_VIOLATION',
        actor: actorRef,
        targetRef: `OT-${otId}`,
        detail: `SUPERVISOR SCOPE VIOLATION ATTEMPT: ${actorRef} (emp_id=${me.id}) mencoba akses OT-${otId} employee_id=${req.employee_id} tapi TIDAK ADA di direct subordinates scope [${subordinateIds.join(',')}]. IDOR style block 404.`,
      })
      return Response.json({ message: 'Permohonan overtime tidak ditemukan.' }, { status: 404 })
    }

    if (Number(req.employee_id) === Number(me.id)) {
      await recordHrAudit({
        actionType: 'OVERTIME_SUPERVISOR_SCOPE_VIOLATION',
        actor: actorRef,
        targetRef: `OT-${otId}`,
        detail: `SELF APPROVE FORBIDDEN: ${actorRef} (emp_id=${me.id}) mencoba approve overtime milik SENDIRI employee_id=${req.employee_id}.`,
      })
      return Response.json({ message: 'Tidak diizinkan menyetujui permohonan overtime milik sendiri.' }, { status: 403 })
    }

    try {
      await validateSupervisorChainNoCircularAndNoSelf(Number(req.employee_id), Number(me.id))
    } catch (chainError) {
      await recordHrAudit({
        actionType: 'OVERTIME_SUPERVISOR_SCOPE_VIOLATION',
        actor: actorRef,
        targetRef: `OT-${otId}`,
        detail: `CIRCULAR CHAIN BLOCK: ${chainError instanceof Error ? chainError.message : String(chainError)}`,
      })
      return Response.json({ message: 'Rantai supervisor tidak valid (circular/self).' }, { status: 409 })
    }

    if (req.status !== 'PENDING_SUPERVISOR') {
      return Response.json(
        { message: `Hanya overtime status PENDING_SUPERVISOR yang dapat diproses Supervisor. Status sekarang: ${req.status}` },
        { status: 409 },
      )
    }

    let finalApprovedMinutes = Number(req.planned_minutes)
    if (decision === 'APPROVE') {
      if (supApprovedMinutesRaw !== undefined && supApprovedMinutesRaw !== null && String(supApprovedMinutesRaw).trim() !== '') {
        const parsed = Number(supApprovedMinutesRaw)
        if (!Number.isFinite(parsed) || parsed < 0) {
          return Response.json(
            { message: 'supervisor_approved_minutes tidak valid (harus angka positif / nol).' },
            { status: 400 },
          )
        }
        if (parsed > Number(req.planned_minutes)) {
          return Response.json(
            { message: `supervisor_approved_minutes tidak boleh melebihi planned_minutes (${req.planned_minutes}).` },
            { status: 400 },
          )
        }
        finalApprovedMinutes = parsed
      }
    }

    if (decision === 'APPROVE') {
      await runReviewDbExecute<UpdateResult>(
        `
          UPDATE hr_overtime_requests
          SET status = 'APPROVED_SUPERVISOR',
              approved_minutes = ?,
              supervisor_reason = ?,
              updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [finalApprovedMinutes, supervisorReason || null, otId],
      )
      await recordHrAudit({
        actionType: 'OVERTIME_SUPERVISOR_APPROVE',
        actor: actorRef,
        targetRef: `OT-${otId}`,
        detail: `Overtime ID=${otId} APPROVED_SUPERVISOR oleh ${me.employee_code} - ${me.full_name}. Employee ${req.employee_code} - ${req.employee_name}. Tanggal ${req.overtime_date} planned=${req.planned_minutes}m, approved_supervisor=${finalApprovedMinutes}m. Catatan: ${supervisorReason || '-'}`,
      })
      return Response.json({
        message: 'Permohonan overtime berhasil disetujui Supervisor.',
        overtime_request_id: otId,
        status: 'APPROVED_SUPERVISOR',
        approved_minutes: finalApprovedMinutes,
      })
    } else {
      await runReviewDbExecute<UpdateResult>(
        `
          UPDATE hr_overtime_requests
          SET status = 'REJECTED_SUPERVISOR',
              supervisor_reason = ?,
              updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [supervisorReason, otId],
      )
      await recordHrAudit({
        actionType: 'OVERTIME_SUPERVISOR_REJECT',
        actor: actorRef,
        targetRef: `OT-${otId}`,
        detail: `Overtime ID=${otId} REJECTED_SUPERVISOR oleh ${me.employee_code} - ${me.full_name}. Employee ${req.employee_code} - ${req.employee_name}. Tanggal ${req.overtime_date} (${req.planned_minutes}m). Alasan: ${supervisorReason}`,
      })
      return Response.json({
        message: 'Permohonan overtime ditolak Supervisor.',
        overtime_request_id: otId,
        status: 'REJECTED_SUPERVISOR',
        supervisor_reason: supervisorReason,
      })
    }
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
