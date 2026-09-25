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
  leave_type_id: number
  status: LeaveRequestStatus
}

type LeaveTypeRow = {
  id: number
  needs_docs: number
  code: string
  name: string
}

type ExecuteResult = { affectedRows?: number; changedRows?: number }
type CountRow = { n: number }

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
    const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
      `SELECT id, employee_id, leave_type_id, status FROM hr_leave_requests WHERE id = ? LIMIT 1`,
      [leaveId],
    )

    if (!leaveReq || leaveReq.employee_id !== canonicalTrustedEmpId) {
      await recordHrAudit({
        actionType: 'LEAVE_IDOR_ATTEMPT',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `LEAVE_REQUEST-${leaveId}`,
        detail: `IDOR submit attempt emp_id=${canonicalTrustedEmpId} access req_id=${leaveId} owned_by=${leaveReq?.employee_id ?? 'NOT_FOUND'}`,
      })
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    if (leaveReq.status !== 'DRAFT') {
      return Response.json(
        { message: `Status leave request saat ini ${leaveReq.status}. Submit hanya dapat dilakukan dari status DRAFT.` },
        { status: 400 },
      )
    }

    const [leaveType] = await runReviewDbQuery<LeaveTypeRow>(
      `SELECT id, needs_docs, code, name FROM hr_leave_types WHERE id = ? LIMIT 1`,
      [leaveReq.leave_type_id],
    )
    if (!leaveType) {
      return Response.json({ message: 'Leave type tidak ditemukan.' }, { status: 404 })
    }

    if (leaveType.needs_docs === 1) {
      const [docCnt] = await runReviewDbQuery<CountRow>(
        `SELECT COUNT(*) AS n FROM hr_leave_request_documents WHERE leave_request_id = ?`,
        [leaveId],
      )
      const docCount = Number(docCnt?.n ?? 0)
      if (docCount === 0) {
        return Response.json(
          { message: 'Butuh lampiran dokumen pendukung (surat dokter/surat izin keluarga).' },
          { status: 400 },
        )
      }
    }

    const updateRes = await runReviewDbExecute<ExecuteResult>(
      `UPDATE hr_leave_requests SET status = 'PENDING_SUPERVISOR', updated_at = NOW() WHERE id = ? AND status = 'DRAFT' LIMIT 1`,
      [leaveId],
    )

    if (Number(updateRes.affectedRows ?? 0) === 0) {
      return Response.json({ message: 'Gagal submit leave request. Mungkin status sudah berubah.' }, { status: 409 })
    }

    await recordHrAudit({
      actionType: 'LEAVE_REQUEST_SUBMIT_SUPERVISOR',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_REQUEST-${leaveId}`,
      detail: `Leave request id=${leaveId} submitted to supervisor. emp_id=${canonicalTrustedEmpId} leave_type=${leaveType.code} (${leaveType.name})`,
    })

    return Response.json({
      id: leaveId,
      status: 'PENDING_SUPERVISOR' as LeaveRequestStatus,
      message: 'Leave request berhasil dikirim ke supervisor.',
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal submit leave request: ${detail}` }, { status: 500 })
  }
}
