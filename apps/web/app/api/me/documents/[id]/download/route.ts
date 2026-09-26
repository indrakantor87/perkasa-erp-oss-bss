import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import { createReadStream } from 'node:fs'
import { headers } from 'next/headers'
import { basename, resolve } from 'node:path'

type DocSelfRow = {
  id: number
  employee_id: number
  storage_ref_internal: string | null
  original_filename: string | null
  mime_type: string | null
  active: number
}

function sanitizeFilename(original: string): string {
  const base = basename(original)
  return base.replace(/[^A-Za-z0-9._-]/g, '_')
}
function getClientIp(requestHeaders: Headers): string | null {
  const fwd = requestHeaders.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return requestHeaders.get('x-real-ip')?.trim() ?? null
}
function getUserAgent(requestHeaders: Headers): string | null {
  const ua = requestHeaders.get('user-agent')
  return ua ? ua.slice(0, 255) : null
}
function pathTraversalSafe(storageRef: string | null): string | null {
  if (!storageRef) return null
  const base = resolve(process.cwd(), 'storage', 'hr_documents')
  const resolved = resolve(storageRef)
  return resolved.startsWith(base) ? resolved : null
}

type ParamsPromise = Promise<{ id: string }>

export async function GET(_request: Request, { params }: { params: ParamsPromise }) {
  const { id: idLocal } = await params
const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'KARYAWAN' && session.role !== 'HR' && session.role !== 'SUPER_ADMIN' && session.role !== 'OWNER' && session.role !== 'ADMIN') {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Download documents hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch01Schema()
  const requestHeaders = await headers()
  const actorIp = getClientIp(requestHeaders)
  const ua = getUserAgent(requestHeaders)
  const actorUserId = Number(session.userId ?? 0)
  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const documentId = Number.parseInt(String(idLocal ?? '').trim(), 10)
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }
    const rows = await runReviewDbQuery<DocSelfRow>(
      `SELECT d.id, d.employee_id, d.storage_ref_internal, d.original_filename, d.mime_type, d.active FROM hr_documents d WHERE d.id = ? AND d.active = 1 LIMIT 1`,
      [documentId],
    )
    const doc = rows[0]
    if (!doc || !doc.storage_ref_internal || !doc.original_filename) {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }
    if (doc.employee_id !== me.id) {
      await runReviewDbExecute(
        `INSERT INTO hr_document_access_logs (document_id, action_type, actor_user_id, actor_ip, client_user_agent, detail_text) VALUES (?, 'ACCESS_DENIED', ?, ?, ?, ?)`,
        [documentId, actorUserId, actorIp, ua, `SELF IDOR attempt document_id=${documentId} employee_owner=${doc.employee_id} accessor_employee=${me.id}.`],
      )
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }
    const safePath = pathTraversalSafe(doc.storage_ref_internal)
    if (!safePath) {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }
    await runReviewDbExecute(`UPDATE hr_documents SET last_accessed_at = NOW() WHERE id = ?`, [documentId])
    await runReviewDbExecute(
      `INSERT INTO hr_document_access_logs (document_id, action_type, actor_user_id, actor_ip, client_user_agent, detail_text) VALUES (?, 'DOWNLOAD', ?, ?, ?, ?)`,
      [documentId, actorUserId, actorIp, ua, `SELF download doc=${documentId} name=${doc.original_filename}`],
    )
    await recordHrAudit({
      actionType: 'SELF_DOC_DOWNLOAD',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `DOC-${documentId}:EMP-${me.id}`,
      detail: `Self download ${doc.original_filename} (${doc.mime_type}). IP=${actorIp ?? 'unknown'}`,
    })
    const originalFilename = sanitizeFilename(doc.original_filename)
    const mimeType = doc.mime_type || 'application/octet-stream'
    try {
      const { stat } = await import('node:fs/promises')
      await stat(safePath)
    } catch {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }
    const stream = createReadStream(safePath)
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', mimeType)
    responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`)
    responseHeaders.set('X-Content-Type-Options', 'nosniff')
    return new Response(stream as unknown as ReadableStream, { status: 200, headers: responseHeaders })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = status === 500 ? getReviewDbErrorDetail(error) : (error instanceof Error ? error.message : 'Forbidden')
    return Response.json({ message }, { status })
  }
}
