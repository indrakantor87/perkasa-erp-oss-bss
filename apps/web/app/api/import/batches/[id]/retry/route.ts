import { NextResponse } from 'next/server'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getImportWriteErrorMessage,
  retryImportBatch,
} from '@/lib/services/import-write-service'

const allowedStages = new Set(['01', '02', '03', '04', '05'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'import_center', 'approve')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return NextResponse.json(
      { message: 'Retry batch hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const payload = (await request.json().catch(() => ({}))) as { stage?: unknown }
    let stageOverride: undefined | '01' | '02' | '03' | '04' | '05'

    if (payload.stage !== undefined && payload.stage !== null) {
      const stage = String(payload.stage).trim().padStart(2, '0')
      if (!allowedStages.has(stage)) {
        return NextResponse.json({ message: 'Stage transform tidak valid untuk retry.' }, { status: 400 })
      }
      stageOverride = stage as '01' | '02' | '03' | '04' | '05'
    }

    const result = await retryImportBatch(
      id,
      `${session.displayName} (${session.username})`,
      stageOverride
    )

    const baseMessage =
      result.mode === 'validate'
        ? `Retry validasi batch ${result.batchCode} selesai: ${result.validRows} valid, ${result.invalidRows} invalid.`
        : `Retry transform tahap ${result.stage} batch ${result.batchCode} selesai: ${result.executedStatements} statement diproses.`

    return NextResponse.json({
      message: baseMessage,
      result,
    })
  } catch (error) {
    return NextResponse.json({ message: getImportWriteErrorMessage(error) }, { status: 400 })
  }
}
