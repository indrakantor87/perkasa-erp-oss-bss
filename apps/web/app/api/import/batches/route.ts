import { NextResponse } from 'next/server'
import { canAccessPath, canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordImportBatchAction } from '@/lib/services/import-write-service'
import { getImportOverview } from '@/lib/services/import-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canAccessPath(session.role, '/import')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { source, overview } = await getImportOverview()

  return NextResponse.json(
    {
      source,
      items: overview.items,
      stages: overview.stages,
      total: overview.items.length,
      totalRows: overview.totalRows,
      importedBatches: overview.importedBatches,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type CountRow = {
  total: number
}

const allowedSourceSystems = new Set(['WEB_PSB', 'FINANCE', 'GA'])

function normalizeScope(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toBatchId(batchCode: string) {
  return batchCode.trim().toLowerCase()
}

async function generateBatchCode(sourceSystem: string) {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  const sourceCode = sourceSystem.replace(/[^A-Z0-9]/g, '')
  const prefix = `BATCH-${sourceCode}-${datePart}`

  const [row] = await runReviewDbQuery<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM staging_import_batches
      WHERE batch_code LIKE ?
    `,
    [`${prefix}%`]
  )

  const sequence = String(Number(row?.total ?? 0) + 1).padStart(3, '0')
  return `${prefix}-${sequence}`
}

export async function POST(request: Request) {
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
      { message: 'Create batch hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      sourceSystem?: unknown
      scope?: unknown
      sourceFileName?: unknown
      notes?: unknown
    }

    const sourceSystem = String(payload.sourceSystem ?? '').trim().toUpperCase()
    const scope = normalizeScope(payload.scope)
    const sourceFileName = String(payload.sourceFileName ?? '').trim()
    const notes = String(payload.notes ?? '').trim()

    if (!allowedSourceSystems.has(sourceSystem)) {
      return NextResponse.json({ message: 'Source system tidak valid.' }, { status: 400 })
    }
    if (!scope || scope.length < 3) {
      return NextResponse.json(
        { message: 'Import scope wajib diisi minimal 3 karakter.' },
        { status: 400 }
      )
    }

    const batchCode = await generateBatchCode(sourceSystem)

    const result = await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_import_batches (
          batch_code,
          source_system,
          import_scope,
          source_file_name,
          import_status,
          total_rows,
          valid_rows,
          invalid_rows,
          duplicate_rows,
          notes
        )
        VALUES (?, ?, ?, ?, 'DRAFT', 0, 0, 0, 0, ?)
      `,
      [
        batchCode,
        sourceSystem,
        scope,
        sourceFileName || null,
        notes || `Batch ${batchCode} dibuat dari web oleh ${session.displayName} (${session.username}).`,
      ]
    )

    if (typeof result.insertId === 'number') {
      try {
        await recordImportBatchAction({
          batchId: result.insertId,
          actionType: 'CREATE',
          status: 'SUCCESS',
          actor: `${session.displayName} (${session.username})`,
          detail: `Batch ${batchCode} dibuat untuk scope ${scope} dari source ${sourceSystem}.`,
        })
      } catch {
        // Histori aksi tidak boleh membatalkan create batch.
      }
    }

    return NextResponse.json({
      message: `Batch review ${batchCode} berhasil dibuat.`,
      batchId: toBatchId(batchCode),
    })
  } catch (error) {
    return NextResponse.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
