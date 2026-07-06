import { NextResponse } from 'next/server'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getImportWriteErrorMessage,
  transformImportBatch,
} from '@/lib/services/import-write-service'

const allowedStages = new Set(['01', '02', '03', '04'])

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
      { message: 'Transform batch hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const payload = (await request.json()) as { stage?: unknown }
    const stage = String(payload.stage ?? '').trim().padStart(2, '0')

    if (!allowedStages.has(stage)) {
      return NextResponse.json({ message: 'Stage transform tidak valid.' }, { status: 400 })
    }

    const result = await transformImportBatch(
      id,
      stage as '01' | '02' | '03' | '04',
      `${session.displayName} (${session.username})`
    )

    return NextResponse.json({
      message: `Transform tahap ${result.stage} selesai dijalankan untuk konteks batch ${result.batchCode}. ${result.executedStatements} statement SQL diproses.`,
      result,
    })
  } catch (error) {
    return NextResponse.json({ message: getImportWriteErrorMessage(error) }, { status: 400 })
  }
}
