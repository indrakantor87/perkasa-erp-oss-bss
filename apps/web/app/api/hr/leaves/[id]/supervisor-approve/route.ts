import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import {
  resolveDirectSubordinateEmployeeIds,
  validateSupervisorChainNoCircularAndNoSelf,
} from '@/lib/services/supervisor-scope.service'
import type { LeaveRequestStatus } from '@/lib/types'

type LeaveRequestRow = {
  id: number
  employee_id: number
  leave_type_id: number
  status: LeaveRequestStatus
  supervisor_id: number | null
}

type EmployeeRow = {
  id: number
  user_id: number | null
  supervisor_id: number | null
  full_name: string
}

type ExecuteResult = { affectedRows?: number; changedRows?: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  await ensureHrBatch02b()

  const leaveId = parsePositiveInt(idLocal)
  if (!leaveId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  try {
    const payload = (await request.json()) as {
      decision?: unknown
      reason?: unknown
    }

    const decisionRaw = String(payload.decision ?? '').trim().toUpperCase()
    const reason = payload.reason === undefined || payload.reason === null ? null : String(payload.reason).trim()

    if (!['APPROVE', 'REJECT'].includes(decisionRaw)) {
      return Response.json({ message: 'decision wajib APPROVE atau REJECT.' }, { status: 400 })
    }

    const isApprove = decisionRaw === 'APPROVE'

    const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
      `SELECT id, employee_id, leave_type_id, status, supervisor_id FROM hr_leave_requests WHERE id = ? LIMIT 1`,
      [leaveId],
    )

    if (!leaveReq) {
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    const subordinateIds = await resolveDirectSubordinateEmployeeIds(session.userId ?? 0)
    const inScope = subordinateIds.includes(Number(leaveReq.employee_id))

    if (!inScope) {
      await recordHrAudit({
        actionType: 'LEAVE_SUPERVISOR_SCOPE_VIOLATION',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `LEAVE_REQUEST-${leaveId}`,
        detail: `SUPERVISOR SCOPE VIOLATION: actor_user_id=${session.userId ?? 0} leave_request_id=${leaveId} req_employee_id=${leaveReq.employee_id} actor_subordinates=[${subordinateIds.join(',')}] action=supervisor-${isApprove ? 'approve' : 'reject'}`,
      })
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    const [actorEmpRow] = await runReviewDbQuery<EmployeeRow>(
      `SELECT id, user_id, supervisor_id, full_name FROM hr_employees WHERE user_id = ? AND is_active = 1 LIMIT 1`,
      [session.userId ?? 0],
    )
    const actorEmpId = actorEmpRow?.id ?? 0

    try {
      await validateSupervisorChainNoCircularAndNoSelf(leaveReq.employee_id, actorEmpId)
    } catch (chainErr) {
      const chainDetail = chainErr instanceof Error ? chainErr.message : String(chainErr)
      await recordHrAudit({
        actionType: 'LEAVE_SUPERVISOR_SCOPE_VIOLATION',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `LEAVE_REQUEST-${leaveId}`,
        detail: `CIRCULAR/SELF chain: ${chainDetail} leave_request_id=${leaveId} actor_emp_id=${actorEmpId} req_emp_id=${leaveReq.employee_id}`,
      })
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    if (Number(leaveReq.employee_id) === Number(actorEmpId)) {
      await recordHrAudit({
        actionType: 'LEAVE_SUPERVISOR_SCOPE_VIOLATION',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `LEAVE_REQUEST-${leaveId}`,
        detail: `SELF APPROVE FORBIDDEN: actor_emp_id=${actorEmpId} req_emp_id=${leaveReq.employee_id} leave_request_id=${leaveId}`,
      })
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    if (leaveReq.status !== 'PENDING_SUPERVISOR') {
      return Response.json(
        { message: `Status leave request saat ini ${leaveReq.status}. Supervisor hanya dapat memproses status PENDING_SUPERVISOR.` },
        { status: 400 },
      )
    }

    const nextStatus: LeaveRequestStatus = isApprove ? 'APPROVED_SUPERVISOR' : 'REJECTED_SUPERVISOR'
    const auditActionType = isApprove ? 'LEAVE_REQUEST_SUPERVISOR_APPROVE' : 'LEAVE_REQUEST_SUPERVISOR_REJECT'

    const updateRes = await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_leave_requests
        SET status = ?,
            supervisor_reason = ?,
            updated_at = NOW()
        WHERE id = ?
          AND status = 'PENDING_SUPERVISOR'
        LIMIT 1
      `,
      [nextStatus, reason, leaveId],
    )

    if (Number(updateRes.affectedRows ?? 0) === 0) {
      return Response.json({ message: 'Gagal proses supervisor. Status mungkin sudah berubah.' }, { status: 409 })
    }

    await recordHrAudit({
      actionType: auditActionType,
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_REQUEST-${leaveId}`,
      detail: `Supervisor ${isApprove ? 'APPROVE' : 'REJECT'} leave_request_id=${leaveId} req_emp_id=${leaveReq.employee_id} new_status=${nextStatus} reason=${reason ?? 'NULL'}`,
    })

    return Response.json({
      id: leaveId,
      status: nextStatus,
      decision: decisionRaw,
      supervisor_reason: reason,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal supervisor proses leave: ${detail}` }, { status: 500 })
  }
}
