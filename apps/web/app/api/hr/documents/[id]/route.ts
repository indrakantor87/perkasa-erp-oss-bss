import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import { headers } from 'next/headers'

type InsertResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

type DocRow = {
  id: number
  employeeId: number
  docCategory: string
  originalFilename: string
  active: number
}

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
}

function getClientIp(requestHeaders: Headers): string | null {
  const forwardedFor = requestHeaders.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = requestHeaders.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}

function getUserAgent(requestHeaders: Headers): string | null {
  const ua = requestHeaders.get('user-agent')
  if (!ua) return null
  return ua.slice(0, 255)
}

async function insertDocumentAccessLog(
  documentId: number,
  actionType:
    | 'UPLOAD'
    | 'VIEW_METADATA'
    | 'DOWNLOAD'
    | 'REPLACE_NEW_VERSION'
    | 'MARK_INACTIVE'
    | 'ACCESS_DENIED',
  actorUserId: number,
  actorIp: string | null,
  clientUserAgent: string | null,
  detailText: string | null,
): Promise<void> {
  await runReviewDbExecute<InsertResult>(
    `
      INSERT INTO hr_document_access_logs (
        document_id,
        action_type,
        actor_user_id,
        actor_ip,
        client_user_agent,
        detail_text
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [documentId, actionType, actorUserId, actorIp, clientUserAgent, detailText],
  )
}

type ParamsPromise = Promise<{ id: string }>

export async function DELETE(_request: Request, { params }: { params: ParamsPromise }) {
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
      { message: 'Delete HR documents hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch01Schema()

  const requestHeaders = await headers()
  const actorIp = getClientIp(requestHeaders)
  const clientUserAgent = getUserAgent(requestHeaders)
  const actorUserId = Number(session.userId ?? 0)
  const actorRef = `${session.displayName} (${session.username})`

  try {
    const { id } = await params
    const documentId = Number.parseInt(String(id ?? '').trim(), 10)
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    const existingRows = await runReviewDbQuery<DocRow>(
      `
        SELECT
          id,
          employee_id AS employeeId,
          doc_category AS docCategory,
          original_filename AS originalFilename,
          active
        FROM hr_documents
        WHERE id = ?
        LIMIT 1
      `,
      [documentId],
    )

    const existing = existingRows[0]
    if (!existing) {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    if (session.role === 'KARYAWAN') {
      try {
        const me = await requireEmployeeByAuthUserId(session.userId)
        if (existing.employeeId !== me.id) {
          await insertDocumentAccessLog(
            documentId,
            'ACCESS_DENIED',
            actorUserId,
            actorIp,
            clientUserAgent,
            `IDOR attempt MARK_INACTIVE: KARYAWAN user_id=${session.userId} mencoba nonaktifkan dokumen employee_id=${existing.employeeId} (bukan miliknya).`,
          )
          return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
        }
      } catch {
        return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
      }
    }

    if (existing.active !== 1) {
      return Response.json(
        { message: 'Dokumen sudah tidak aktif sebelumnya.' },
        { status: 409 },
      )
    }

    const employeeId = existing.employeeId

    const [employee] = await runReviewDbQuery<EmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          full_name AS fullName
        FROM hr_employees
        WHERE id = ?
        LIMIT 1
      `,
      [employeeId],
    )

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_documents
        SET active = 0
        WHERE id = ?
          AND active = 1
      `,
      [documentId],
    )

    await insertDocumentAccessLog(
      documentId,
      'MARK_INACTIVE',
      actorUserId,
      actorIp,
      clientUserAgent,
      `Soft delete / MARK_INACTIVE doc=${documentId} kategori ${existing.docCategory} - ${existing.originalFilename}. File di-disk TIDAK dihapus.`,
    )

    const employeeCodeRef = employee ? `${employee.employeeCode} - ${employee.fullName}` : `employee_id=${employeeId}`
    await recordHrAudit({
      actionType: 'EMPLOYEE_DOC_INACTIVE',
      actor: actorRef,
      targetRef: `DOC-${documentId}:EMP-${employeeId}`,
      detail: `Dokumen ${existing.docCategory} (${existing.originalFilename}) di-soft delete (active=0) untuk ${employeeCodeRef}. File fisik tidak dihapus dari disk storage.`,
    })

    return Response.json({
      message: `Dokumen DOC-${documentId} berhasil di-nonaktifkan (soft delete).`,
      document_id: documentId,
      active: false,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
