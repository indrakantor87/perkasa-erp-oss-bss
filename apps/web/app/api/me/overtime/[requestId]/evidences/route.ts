import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

type OtRequestRow = {
  id: number
  employee_id: number
  overtime_date: string
  status: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId: requestIdLocal } = await params
const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action overtime evidence hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch02b()

  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const otRequestId = Number.parseInt(String(requestIdLocal ?? '').trim(), 10)

    if (!Number.isInteger(otRequestId) || otRequestId <= 0) {
      return Response.json({ message: 'ID permohonan overtime tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      file_name?: unknown
      storage_path_ref?: unknown
      file_size_bytes?: unknown
    }

    const fileName = String(payload.file_name ?? '').trim()
    const storagePathRef = String(payload.storage_path_ref ?? '').trim()
    const fileSizeBytesRaw = payload.file_size_bytes
    const fileSizeBytes = Number(fileSizeBytesRaw ?? 0)

    if (!fileName) {
      return Response.json({ message: 'file_name wajib diisi.' }, { status: 400 })
    }
    if (!storagePathRef) {
      return Response.json({ message: 'storage_path_ref wajib diisi.' }, { status: 400 })
    }
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes < 0) {
      return Response.json({ message: 'file_size_bytes wajib angka positif.' }, { status: 400 })
    }

    const rows = await runReviewDbQuery<OtRequestRow>(
      `
        SELECT id, employee_id, CAST(overtime_date AS CHAR) AS overtime_date, status
        FROM hr_overtime_requests
        WHERE id = ?
        LIMIT 1
      `,
      [otRequestId],
    )

    const req = rows[0]
    if (!req || Number(req.employee_id) !== Number(me.id)) {
      return Response.json({ message: 'Permohonan overtime tidak ditemukan.' }, { status: 404 })
    }

    const insertResult = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_overtime_request_evidences (
          overtime_request_id,
          file_name,
          file_path_storage,
          file_size_bytes,
          uploaded_by_employee_id
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [otRequestId, fileName, storagePathRef, fileSizeBytes, me.id],
    )

    const evidenceId = Number(insertResult.insertId ?? 0)

    await recordHrAudit({
      actionType: 'OVERTIME_REQUEST_CREATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `OT-${otRequestId}:EVI-${evidenceId}`,
      detail: `Evidence overtime ID=${otRequestId} di-upload oleh ${me.employee_code} - ${me.full_name}. file=${fileName} size=${fileSizeBytes} bytes path_ref=${storagePathRef}.`,
    })

    return Response.json({
      message: 'Evidence overtime berhasil disimpan.',
      evidence_id: evidenceId,
      overtime_request_id: otRequestId,
      file_name: fileName,
      storage_path_ref: storagePathRef,
      file_size_bytes: fileSizeBytes,
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
