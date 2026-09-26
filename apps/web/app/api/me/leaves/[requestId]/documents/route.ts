import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type LeaveRequestRow = {
  id: number
  employee_id: number
  leave_type_id: number
  status: string
}

type LeaveTypeRow = {
  id: number
  needs_docs: number
}

type InsertResult = { insertId?: number; affectedRows?: number; changedRows?: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parsePositiveBigInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number.parseFloat(String(value).trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: requestIdLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR documents hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  await ensureHrBatch02b()

  const me = await requireEmployeeByAuthUserId(session.userId)
  const canonicalTrustedEmpId = me.id

  const requestId = parsePositiveInt(requestIdLocal)
  if (!requestId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  try {
    const payload = (await request.json()) as {
      file_name?: unknown
      storage_path_ref?: unknown
      file_size_bytes?: unknown
    }

    const fileName = String(payload.file_name ?? '').trim()
    const storagePathRef = String(payload.storage_path_ref ?? '').trim()
    const fileSizeBytes = parsePositiveBigInt(payload.file_size_bytes)

    if (!fileName) return Response.json({ message: 'file_name wajib diisi.' }, { status: 400 })
    if (!storagePathRef) return Response.json({ message: 'storage_path_ref wajib diisi.' }, { status: 400 })

    const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
      `SELECT id, employee_id, leave_type_id, status FROM hr_leave_requests WHERE id = ? LIMIT 1`,
      [requestId],
    )

    if (!leaveReq || leaveReq.employee_id !== canonicalTrustedEmpId) {
      await recordHrAudit({
        actionType: 'LEAVE_IDOR_ATTEMPT',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `LEAVE_REQUEST-${requestId}`,
        detail: `IDOR attempt employee_id=${canonicalTrustedEmpId} access request_id=${requestId} owned_by=${leaveReq?.employee_id ?? 'NOT_FOUND'}`,
      })
      return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
    }

    const [leaveType] = await runReviewDbQuery<LeaveTypeRow>(
      `SELECT id, needs_docs FROM hr_leave_types WHERE id = ? LIMIT 1`,
      [leaveReq.leave_type_id],
    )

    if (!leaveType) {
      return Response.json({ message: 'Leave type tidak ditemukan.' }, { status: 404 })
    }

    const insertRes = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_leave_request_documents (
          leave_request_id,
          file_name,
          file_path_storage,
          file_size_bytes,
          uploaded_by_employee_id
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [requestId, fileName, storagePathRef, fileSizeBytes, canonicalTrustedEmpId],
    )

    const docId = Number(insertRes.insertId ?? 0)

    await recordHrAudit({
      actionType: 'LEAVE_REQUEST_CREATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_REQUEST-${requestId}`,
      detail: `Document uploaded for leave_request_id=${requestId} doc_id=${docId} file_name=${fileName} size=${fileSizeBytes} bytes uploaded_by_emp_id=${canonicalTrustedEmpId}`,
    })

    return Response.json(
      {
        id: docId,
        leave_request_id: requestId,
        file_name: fileName,
        storage_path_ref: storagePathRef,
        file_size_bytes: fileSizeBytes,
        uploaded_by_employee_id: canonicalTrustedEmpId,
      },
      { status: 201 },
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal upload dokumen leave: ${detail}` }, { status: 500 })
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId: requestIdLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  await ensureHrBatch02b()

  const me = await requireEmployeeByAuthUserId(session.userId)
  const canonicalTrustedEmpId = me.id

  const requestId = parsePositiveInt(requestIdLocal)
  if (!requestId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
    `SELECT id, employee_id, leave_type_id, status FROM hr_leave_requests WHERE id = ? LIMIT 1`,
    [requestId],
  )

  if (!leaveReq || leaveReq.employee_id !== canonicalTrustedEmpId) {
    return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })
  }

  const rows = await runReviewDbQuery<{
    id: number
    leave_request_id: number
    file_name: string
    file_path_storage: string
    file_size_bytes: number
    uploaded_by_employee_id: number | null
    created_at: string
  }>(
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
      WHERE leave_request_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [requestId],
  )

  return Response.json({
    self: true,
    leave_request_id: requestId,
    documents: rows.map((r) => ({
      id: r.id,
      file_name: r.file_name,
      storage_path_ref: r.file_path_storage,
      file_size_bytes: r.file_size_bytes,
      uploaded_by_employee_id: r.uploaded_by_employee_id,
      created_at: r.created_at,
    })),
    total: rows.length,
  })
}
