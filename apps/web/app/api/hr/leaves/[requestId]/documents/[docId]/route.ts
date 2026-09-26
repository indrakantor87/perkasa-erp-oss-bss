import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { resolveDirectSubordinateEmployeeIds } from '@/lib/services/supervisor-scope.service'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

type LeaveRequestRow = {
  id: number
  employee_id: number
  leave_type_id: number
  status: string
}

type DocRow = {
  id: number
  leave_request_id: number
  file_name: string
  file_path_storage: string
  file_size_bytes: number
  uploaded_by_employee_id: number | null
  created_at: string
}

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string; docId: string }> },
) {
  const { requestId: requestIdLocal, docId: docIdLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  await ensureHrBatch02b()

  const requestId = parsePositiveInt(requestIdLocal)
  const docId = parsePositiveInt(docIdLocal)
  if (!requestId || !docId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  const isHrOrAdmin =
    canPerformAction(session.role, 'hr', 'view') ||
    canPerformAction(session.role, 'leave_requests', 'approve') ||
    session.role === 'SUPER_ADMIN' ||
    session.role === 'OWNER'

  if (!isHrOrAdmin && session.role !== 'KARYAWAN') {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
    `SELECT id, employee_id, leave_type_id, status FROM hr_leave_requests WHERE id = ? LIMIT 1`,
    [requestId],
  )

  if (!leaveReq) {
    return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
  }

  let allowedAccess = false

  if (isHrOrAdmin) {
    allowedAccess = true
  } else if (session.role === 'KARYAWAN') {
    const subordinateIds = await resolveDirectSubordinateEmployeeIds(session.userId ?? 0)
    allowedAccess = subordinateIds.includes(Number(leaveReq.employee_id))
  }

  if (!allowedAccess) {
    await recordHrAudit({
      actionType: 'LEAVE_IDOR_ATTEMPT',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_REQUEST-${requestId}:DOC-${docId}`,
      detail: `IDOR attempt access leave_request doc_id=${docId} request_id=${requestId} owned_by_emp=${leaveReq.employee_id} actor_user_id=${session.userId ?? 0}`,
    })
    return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
  }

  const [doc] = await runReviewDbQuery<DocRow>(
    `
      SELECT
        id,
        leave_request_id,
        file_name,
        file_path_storage,
        file_size_bytes,
        uploaded_by_employee_id,
        created_at
      FROM hr_leave_request_documents
      WHERE id = ? AND leave_request_id = ?
      LIMIT 1
    `,
    [docId, requestId],
  )

  if (!doc) {
    return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
  }

  return Response.json({
    id: doc.id,
    leave_request_id: doc.leave_request_id,
    file_name: doc.file_name,
    storage_path_ref: doc.file_path_storage,
    file_size_bytes: doc.file_size_bytes,
    uploaded_by_employee_id: doc.uploaded_by_employee_id,
    created_at: doc.created_at,
  })
}
