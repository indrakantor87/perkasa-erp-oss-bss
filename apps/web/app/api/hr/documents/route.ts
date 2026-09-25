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

type DocRow = {
  id: number
  employeeId: number
  docCategory: string
  originalFilename: string
  fileSizeBytes: number | null
  mimeType: string
  uploadedByUserId: number
  uploadedAt: string
  lastAccessedAt: string | null
  checksumSha256: string | null
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

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action HR documents hanya aktif saat review DB benar-benar tersedia.' },
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
    const formData = await request.formData()

    const employeeIdRaw = formData.get('employee_id')
    const docCategoryRaw = formData.get('doc_category')
    const fileEntry = formData.get('file')

    if (!docCategoryRaw) {
      return Response.json({ message: 'doc_category wajib diisi.' }, { status: 400 })
    }
    if (!fileEntry || !(fileEntry instanceof File)) {
      return Response.json({ message: 'Upload file dokumen wajib dikirim.' }, { status: 400 })
    }

    let employeeId: number
    if (session.role === 'KARYAWAN') {
      const me = await requireEmployeeByAuthUserId(session.userId)
      employeeId = me.id
    } else {
      if (!employeeIdRaw) {
        return Response.json({ message: 'employee_id wajib diisi.' }, { status: 400 })
      }
      employeeId = Number.parseInt(String(employeeIdRaw).trim(), 10)
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return Response.json({ message: 'employee_id tidak valid.' }, { status: 400 })
      }
    }

    const docCategory = String(docCategoryRaw).trim().toUpperCase()
    if (!ALLOWED_CATEGORIES.has(docCategory)) {
      return Response.json(
        { message: 'doc_category harus salah satu: KTP, KK, IJAZAH_TERAKHIR, KONTRAK_KERJA, LAINNYA.' },
        { status: 400 },
      )
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

    const insertResult = await runReviewDbExecute<InsertResult>(
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
        docCategory,
        originalFilename,
        storageRefInternal,
        fileSize,
        mimeType,
        actorUserId,
        checksumSha256,
      ],
    )

    const documentId = Number(insertResult.insertId ?? 0)

    if (documentId > 0) {
      await insertDocumentAccessLog(
        documentId,
        'UPLOAD',
        actorUserId,
        actorIp,
        clientUserAgent,
        `Upload ${docCategory} - ${originalFilename} untuk employee ${employee.employeeCode}.`,
      )
    }

    await recordHrAudit({
      actionType: 'EMPLOYEE_DOC_UPLOAD',
      actor: actorRef,
      targetRef: `${employee.employeeCode}:DOC-${documentId}`,
      detail: `Dokumen ${docCategory} (${originalFilename}) di-upload untuk employee ${employee.employeeCode} - ${employee.fullName}. Ukuran ${fileSize} bytes, mime ${mimeType}.`,
    })

    return Response.json({
      message: `Dokumen ${docCategory} untuk ${employee.employeeCode} berhasil di-upload.`,
      document_id: documentId,
      sanitized_filename: originalFilename,
      doc_category: docCategory,
      file_size_bytes: fileSize,
      mime_type: mimeType,
      uploaded_at: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function GET(request: Request) {
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
      { message: 'List HR documents hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch01Schema()

  const requestHeaders = await headers()
  const actorIp = getClientIp(requestHeaders)
  const clientUserAgent = getUserAgent(requestHeaders)
  const actorUserId = Number(session.userId ?? 0)

  try {
    const { searchParams } = new URL(request.url)
    const employeeIdRaw = searchParams.get('employee_id')

    let employeeId: number
    if (session.role === 'KARYAWAN') {
      const me = await requireEmployeeByAuthUserId(session.userId)
      employeeId = me.id
    } else {
      if (!employeeIdRaw) {
        return Response.json({ message: 'employee_id wajib dikirim sebagai query parameter.' }, { status: 400 })
      }
      employeeId = Number.parseInt(String(employeeIdRaw).trim(), 10)
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return Response.json({ message: 'employee_id tidak valid.' }, { status: 400 })
      }
    }

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

    const rows = await runReviewDbQuery<DocRow>(
      `
        SELECT
          id,
          employee_id AS employeeId,
          doc_category AS docCategory,
          original_filename AS originalFilename,
          file_size_bytes AS fileSizeBytes,
          mime_type AS mimeType,
          uploaded_by_user_id AS uploadedByUserId,
          uploaded_at AS uploadedAt,
          last_accessed_at AS lastAccessedAt,
          checksum_sha256 AS checksumSha256,
          active
        FROM hr_documents
        WHERE employee_id = ?
        ORDER BY uploaded_at DESC, id DESC
      `,
      [employeeId],
    )

    await insertDocumentAccessLog(
      rows[0]?.id ?? 0,
      'VIEW_METADATA',
      actorUserId,
      actorIp,
      clientUserAgent,
      `List metadata ${rows.length} dokumen untuk employee_id=${employeeId} (${employee.employeeCode}).`,
    )

    return Response.json({
      employee_code: employee.employeeCode,
      employee_name: employee.fullName,
      total_documents: rows.length,
      documents: rows.map((row) => ({
        id: row.id,
        doc_category: row.docCategory,
        original_filename: sanitizeFilename(row.originalFilename),
        file_size_bytes: row.fileSizeBytes,
        mime_type: row.mimeType,
        uploaded_by_user_id: row.uploadedByUserId,
        uploaded_at: row.uploadedAt,
        last_accessed_at: row.lastAccessedAt,
        checksum_sha256: row.checksumSha256,
        active: row.active === 1,
      })),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
