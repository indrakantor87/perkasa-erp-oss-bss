import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import { createReadStream } from 'node:fs'
import { headers } from 'next/headers'
import { basename, extname, resolve, join } from 'node:path'

type InsertResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

type DocWithJoinRow = {
  id: number
  employeeId: number | null
  storageRefInternal: string | null
  originalFilename: string | null
  mimeType: string | null
  active: number | null
}

function sanitizeFilename(original: string): string {
  const base = basename(original)
  return base.replace(/[^A-Za-z0-9._-]/g, '_')
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

function pathTraversalSafe(storageRef: string | null): string | null {
  if (!storageRef) return null
  const base = resolveStorageBase()
  const resolved = resolve(storageRef)
  if (!resolved.startsWith(base)) {
    return null
  }
  return resolved
}

function resolveStorageBase(): string {
  const projectRoot = process.cwd()
  return resolve(projectRoot, 'storage', 'hr_documents')
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

export async function GET(_request: Request, { params }: { params: ParamsPromise }) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Download HR documents hanya aktif saat review DB benar-benar tersedia.' },
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

    const rows = await runReviewDbQuery<DocWithJoinRow>(
      `
        SELECT
          d.id,
          he.id AS employeeId,
          d.storage_ref_internal AS storageRefInternal,
          d.original_filename AS originalFilename,
          d.mime_type AS mimeType,
          d.active
        FROM hr_documents d
        INNER JOIN hr_employees he
          ON he.id = d.employee_id
        WHERE d.id = ?
          AND d.active = 1
        LIMIT 1
      `,
      [documentId],
    )

    const row = rows[0]
    if (!row || !row.employeeId || !row.storageRefInternal || !row.originalFilename) {
      await insertDocumentAccessLog(
        documentId,
        'ACCESS_DENIED',
        actorUserId,
        actorIp,
        clientUserAgent,
        `IDOR generic 404 response untuk document_id=${documentId}.`,
      )
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    const safePath = pathTraversalSafe(row.storageRefInternal)
    if (!safePath) {
      await insertDocumentAccessLog(
        documentId,
        'ACCESS_DENIED',
        actorUserId,
        actorIp,
        clientUserAgent,
        `Path traversal terdeteksi untuk document_id=${documentId}.`,
      )
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_documents
        SET last_accessed_at = NOW()
        WHERE id = ?
      `,
      [documentId],
    )

    await insertDocumentAccessLog(
      documentId,
      'DOWNLOAD',
      actorUserId,
      actorIp,
      clientUserAgent,
      `Download dokumen ${row.originalFilename} (${row.mimeType}) untuk employee_id=${row.employeeId}. IP=${actorIp ?? 'unknown'}`,
    )

    await recordHrAudit({
      actionType: 'EMPLOYEE_DOC_DOWNLOAD',
      actor: actorRef,
      targetRef: `DOC-${documentId}:EMP-${row.employeeId}`,
      detail: `Dokumen ${row.originalFilename} (${row.mimeType}) didownload. IP=${actorIp ?? 'unknown'}, UA=${clientUserAgent ?? 'n/a'}`,
    })

    const originalFilename = sanitizeFilename(row.originalFilename)
    const mimeType = row.mimeType || 'application/octet-stream'

    try {
      const { stat } = await import('node:fs/promises')
      await stat(safePath)
    } catch {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    const stream = createReadStream(safePath)

    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', mimeType)
    responseHeaders.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalFilename)}"`,
    )
    responseHeaders.set('X-Content-Type-Options', 'nosniff')

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
