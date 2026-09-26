import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import { createHash } from 'node:crypto'
import { mkdir, stat, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, extname, basename, resolve } from 'node:path'
import { headers } from 'next/headers'

type InsertResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
}

type DocFullRow = {
  id: number
  employeeId: number
  docCategory: string
  originalFilename: string
  storageRefInternal: string
  mimeType: string
  active: number
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
])

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_CATEGORIES = new Set([
  'KTP',
  'KK',
  'IJAZAH_TERAKHIR',
  'KONTRAK_KERJA',
  'LAINNYA',
])

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

function resolveStorageBase(): string {
  const projectRoot = process.cwd()
  return resolve(projectRoot, 'storage', 'hr_documents')
}

async function ensureDirRecursive(dirPath: string): Promise<void> {
  try {
    await access(dirPath, constants.F_OK)
  } catch {
    await mkdir(dirPath, { mode: 0o700, recursive: true })
  }
}

async function computeFileHash(
  employeeId: number,
  originalName: string,
  timestamp: number,
): Promise<string> {
  const hash = createHash('sha256')
  hash.update(`${employeeId}|${originalName}|${timestamp}`)
  return hash.digest('hex').toLowerCase()
}

async function computeSha256Buffer(buffer: Buffer): Promise<string> {
  const hash = createHash('sha256')
  hash.update(buffer)
  return hash.digest('hex').toLowerCase()
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

export async function POST(request: Request, { params }: { params: ParamsPromise }) {
  const { id: idLocal } = await params
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
      { message: 'Replace HR documents hanya aktif saat review DB benar-benar tersedia.' },
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
    const oldDocumentId = Number.parseInt(String(idLocal ?? '').trim(), 10)
    if (!Number.isInteger(oldDocumentId) || oldDocumentId <= 0) {
      return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
    }

    const formData = await request.formData()

    const docCategoryOverrideRaw = formData.get('doc_category')
    const fileEntry = formData.get('file')

    if (!fileEntry || !(fileEntry instanceof File)) {
      return Response.json({ message: 'Upload file dokumen baru wajib dikirim untuk replace.' }, { status: 400 })
    }

    const existingRows = await runReviewDbQuery<DocFullRow>(
      `
        SELECT
          id,
          employee_id AS employeeId,
          doc_category AS docCategory,
          original_filename AS originalFilename,
          storage_ref_internal AS storageRefInternal,
          mime_type AS mimeType,
          active
        FROM hr_documents
        WHERE id = ?
        LIMIT 1
      `,
      [oldDocumentId],
    )

    const existing = existingRows[0]
    if (!existing || existing.active !== 1) {
      return Response.json({ message: 'Dokumen lama tidak ditemukan atau sudah tidak aktif.' }, { status: 404 })
    }

    if (session.role === 'KARYAWAN') {
      try {
        const me = await requireEmployeeByAuthUserId(session.userId)
        if (existing.employeeId !== me.id) {
          await insertDocumentAccessLog(
            oldDocumentId,
            'ACCESS_DENIED',
            actorUserId,
            actorIp,
            clientUserAgent,
            `IDOR attempt REPLACE: KARYAWAN user_id=${session.userId} mencoba replace dokumen employee_id=${existing.employeeId} (bukan miliknya).`,
          )
          return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
        }
      } catch {
        return Response.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 })
      }
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
    if (!employee) {
      return Response.json({ message: 'Employee tidak ditemukan di review DB.' }, { status: 404 })
    }

    const file = fileEntry as File
    const mimeType = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME.has(mimeType)) {
      return Response.json(
        { message: `Tipe file ${mimeType} tidak diizinkan. Hanya image/jpeg, image/png, application/pdf yang diterima.` },
        { status: 400 },
      )
    }

    const fileSize = file.size
    if (fileSize > MAX_FILE_SIZE) {
      return Response.json(
        { message: `Ukuran file melebihi batas 5MB (${fileSize} bytes).` },
        { status: 400 },
      )
    }

    let finalDocCategory = existing.docCategory
    if (docCategoryOverrideRaw !== undefined && docCategoryOverrideRaw !== null) {
      const override = String(docCategoryOverrideRaw).trim().toUpperCase()
      if (ALLOWED_CATEGORIES.has(override)) {
        finalDocCategory = override
      }
    }

    const originalFilename = sanitizeFilename(file.name || 'document')
    const extension = extname(originalFilename) || ''

    const timestamp = Date.now()
    const fileHash = await computeFileHash(employeeId, originalFilename, timestamp)

    const storageBase = resolveStorageBase()
    const employeeDir = join(storageBase, String(employeeId))
    await ensureDirRecursive(employeeDir)
    try {
      await stat(employeeDir)
    } catch {
      await mkdir(employeeDir, { mode: 0o700, recursive: true })
    }

    const storageFileName = `${fileHash}${extension}`
    const storageRefInternal = join(employeeDir, storageFileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const checksumSha256 = await computeSha256Buffer(buffer)

    await writeFile(storageRefInternal, buffer, { mode: 0o600 })

    const newInsertResult = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_documents (
          employee_id,
          doc_category,
          original_filename,
          storage_ref_internal,
          file_size_bytes,
          mime_type,
          uploaded_by_user_id,
          uploaded_at,
          checksum_sha256,
          active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)
      `,
      [
        employeeId,
        finalDocCategory,
        originalFilename,
        storageRefInternal,
        fileSize,
        mimeType,
        actorUserId,
        checksumSha256,
      ],
    )

    const newDocumentId = Number(newInsertResult.insertId ?? 0)

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE hr_documents
        SET active = 0
        WHERE id = ?
          AND active = 1
      `,
      [oldDocumentId],
    )

    await insertDocumentAccessLog(
      oldDocumentId,
      'MARK_INACTIVE',
      actorUserId,
      actorIp,
      clientUserAgent,
      `Versi lama doc=${oldDocumentId} (${existing.originalFilename}) di-set inactive karena replace dengan versi baru doc=${newDocumentId}.`,
    )

    if (newDocumentId > 0) {
      await insertDocumentAccessLog(
        newDocumentId,
        'REPLACE_NEW_VERSION',
        actorUserId,
        actorIp,
        clientUserAgent,
        `Versi baru doc=${newDocumentId} menggantikan doc=${oldDocumentId}, kategori ${finalDocCategory} - ${originalFilename}.`,
      )
    }

    await recordHrAudit({
      actionType: 'EMPLOYEE_DOC_INACTIVE',
      actor: actorRef,
      targetRef: `${employee.employeeCode}:DOC-${oldDocumentId}->${newDocumentId}`,
      detail: `Dokumen di-replace: versi lama DOC-${oldDocumentId} (${existing.originalFilename}) di-set inactive, versi baru DOC-${newDocumentId} (${originalFilename}, ${fileSize} bytes) untuk employee ${employee.employeeCode} - ${employee.fullName}.`,
    })

    return Response.json({
      message: `Dokumen berhasil di-replace untuk ${employee.employeeCode}.`,
      new_document_id: newDocumentId,
      old_document_id: oldDocumentId,
      sanitized_filename: originalFilename,
      doc_category: finalDocCategory,
      file_size_bytes: fileSize,
      mime_type: mimeType,
      uploaded_at: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
