import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { canAccessPath, canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { loadImportFileToStaging } from '@/lib/services/import-file-loader'
import { recordImportBatchAction } from '@/lib/services/import-write-service'
import { getImportBatchDetail } from '@/lib/services/import-service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canAccessPath(session.role, '/import')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { source, batch, detail } = await getImportBatchDetail(id)

  if (!batch || !detail) {
    return NextResponse.json({ message: 'Batch tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json(
    { source, batch, detail },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}

type BatchLookupRow = {
  id: number
  batchCode: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  scope: string
  status: string
}

const allowedFileExtensions = new Set(['.xlsx', '.xls', '.csv', '.json'])
const maxUploadSize = 10 * 1024 * 1024

function sanitizeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-')
}

async function getBatchLookup(batchId: string) {
  const [row] = await runReviewDbQuery<BatchLookupRow>(
    `
      SELECT
        id,
        batch_code AS batchCode,
        source_system AS sourceSystem,
        import_scope AS scope,
        import_status AS status
      FROM staging_import_batches
      WHERE LOWER(batch_code) = LOWER(?)
        OR CAST(id AS CHAR) = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [batchId, batchId]
  )

  return row ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'import_center', 'create')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return NextResponse.json(
      { message: 'Upload file hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const batch = await getBatchLookup(id)

    if (!batch) {
      return NextResponse.json({ message: 'Batch tidak ditemukan.' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'File sumber wajib dipilih.' }, { status: 400 })
    }
    if (file.size <= 0) {
      return NextResponse.json({ message: 'File sumber kosong.' }, { status: 400 })
    }
    if (file.size > maxUploadSize) {
      return NextResponse.json(
        { message: 'Ukuran file maksimal 10MB untuk tahap review ini.' },
        { status: 400 }
      )
    }

    const originalName = sanitizeFileName(file.name.trim())
    const extension = path.extname(originalName).toLowerCase()

    if (!allowedFileExtensions.has(extension)) {
      return NextResponse.json(
        { message: 'Format file belum didukung. Gunakan xlsx, xls, csv, atau json.' },
        { status: 400 }
      )
    }

    const storageDir = path.join(process.cwd(), 'storage', 'import-batches')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const loadResult = await loadImportFileToStaging(
      {
        id: batch.id,
        batchCode: batch.batchCode,
        sourceSystem: batch.sourceSystem,
        scope: batch.scope,
      },
      buffer,
      extension
    )

    await mkdir(storageDir, { recursive: true })
    const storedFileName = `${batch.batchCode.toLowerCase()}--source${extension}`
    const storedFilePath = path.join(storageDir, storedFileName)
    await writeFile(storedFilePath, buffer)

    await runReviewDbExecute(
      `
        UPDATE staging_import_batches
        SET
          source_file_name = ?,
          import_status = 'UPLOADED',
          total_rows = ?,
          valid_rows = 0,
          invalid_rows = 0,
          duplicate_rows = 0,
          notes = CONCAT_WS('\n', NULLIF(notes, ''), ?),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        originalName,
        loadResult.insertedRows,
        `File sumber ${originalName} diunggah dari web oleh ${session.displayName} (${session.username}) dan memuat ${loadResult.insertedRows} row staging dari section ${loadResult.sectionsLoaded.join(', ')}.`,
        batch.id,
      ]
    )
    try {
      await recordImportBatchAction({
        batchId: batch.id,
        actionType: 'UPLOAD',
        status: 'SUCCESS',
        actor: `${session.displayName} (${session.username})`,
        detail: `File ${originalName} diunggah dan memuat ${loadResult.insertedRows} row staging dari section ${loadResult.sectionsLoaded.join(', ')}.`,
      })
    } catch {
      // Histori aksi tidak boleh membatalkan upload utama.
    }

    return NextResponse.json({
      message: `File ${originalName} berhasil diunggah ke batch ${batch.batchCode} dan memuat ${loadResult.insertedRows} row staging.`,
    })
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      return NextResponse.json({ message: error.message.trim() }, { status: 400 })
    }

    return NextResponse.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
