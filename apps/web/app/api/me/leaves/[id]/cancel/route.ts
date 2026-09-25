import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import type { LeaveRequestStatus } from '@/lib/types'

type LeaveRequestRow = {
  id: number
  employee_id: number
  status: LeaveRequestStatus
}

type ExecuteResult = { affectedRows?: number; changedRows?: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  await ensureHrBatch02b()

  const me = await requireEmployeeByAuthUserId(session.userId)
  const canonicalTrustedEmpId = me.id

  const leaveId = parsePositiveInt(params.id)
  if (!leaveId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  try {
    const payload = (await request.json()) as { reason?: unknown }
    const reason = payload.reason === undefined || payload.reason === null ? '' : String(payload.reason).trim()

    if (!reason) {
      return Response.json({ message: 'Alasan cancel (reason) wajib diisi.' }, { status: 400 })
    }

    const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
      `SELECT id, employee_id, status FROM hr_leave_requests WHERE id = ? LIMIT 1`,
      [leaveId],
    )

    if (!leaveReq || leaveReq.employee_id !== canonicalTrustedEmpId) {
      await recordHrAudit({
        actionType: 'LEAVE_IDOR_ATTEMPT',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `LEAVE_REQUEST-${leaveId}`,
        detail: `IDOR cancel attempt emp_id=${canonicalTrustedEmpId} access req_id=${leaveId} owned_by=${leaveReq?.employee_id ?? 'NOT_FOUND'}`,
      })
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    const cancelableByEmp: LeaveRequestStatus[] = ['DRAFT', 'PENDING_SUPERVISOR']
    if (!cancelableByEmp.includes(leaveReq.status)) {
      return Response.json(
        { message: `Status leave request saat ini ${leaveReq.status}. Employee hanya dapat membatalkan status DRAFT atau PENDING_SUPERVISOR.` },
        { status: 400 },
      )
    }

    const updateRes = await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_leave_requests
        SET status = 'CANCELLED_EMPLOYEE',
            cancel_reason = ?,
            updated_at = NOW()
        WHERE id = ?
          AND employee_id = ?
          AND status IN ('DRAFT', 'PENDING_SUPERVISOR')
        LIMIT 1
      `,
      [reason, leaveId, canonicalTrustedEmpId],
    )

    if (Number(updateRes.affectedRows ?? 0) === 0) {
      return Response.json({ message: 'Gagal cancel leave request. Status mungkin sudah berubah.' }, { status: 409 })
    }

    await recordHrAudit({
      actionType: 'LEAVE_REQUEST_CANCEL_EMPLOYEE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_REQUEST-${leaveId}`,
      detail: `Employee cancel leave_request_id=${leaveId} emp_id=${canonicalTrustedEmpId} old_status=${leaveReq.status} cancel_reason=${reason}`,
    })

    return Response.json({
      id: leaveId,
      status: 'CANCELLED_EMPLOYEE' as LeaveRequestStatus,
      cancel_reason: reason,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal cancel leave request: ${detail}` }, { status: 500 })
  }
}
