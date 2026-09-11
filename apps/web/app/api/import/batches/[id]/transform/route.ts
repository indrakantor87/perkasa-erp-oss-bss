import { NextResponse } from 'next/server'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getImportWriteErrorMessage,
  preflightOdpOnlyImportBatch,
  TRANSFORM_STAGE_ORDER,
  type TransformStage,
  transformImportBatch,
} from '@/lib/services/import-write-service'

const allowedStages = new Set(TRANSFORM_STAGE_ORDER)

function isTransformStage(value: string): value is TransformStage {
  return allowedStages.has(value as TransformStage)
}

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
    const payload = (await request.json()) as { stage?: unknown; odp05NonCumulative?: unknown }
    const rawStage = String(payload.stage ?? '').trim().padStart(2, '0')
    const odp05NonCumulativeRaw = payload.odp05NonCumulative === true

    if (!isTransformStage(rawStage)) {
      return NextResponse.json({ message: 'Stage transform tidak valid.' }, { status: 400 })
    }

    const stage = rawStage

    if (odp05NonCumulativeRaw && stage !== '05') {
      return NextResponse.json(
        { message: 'Mode non-cumulative hanya diperbolehkan hanya untuk tahap 05 ODP saja.' },
        { status: 400 },
      )
    }

    let odp05NonCumulative = false
    if (stage === '05') {
      await preflightOdpOnlyImportBatch(id)
      odp05NonCumulative = odp05NonCumulativeRaw
    }

    const result = await transformImportBatch(
      id,
      stage,
      `${session.displayName} (${session.username})`,
      odp05NonCumulative ? { odp05NonCumulative: true } : undefined,
    )

    return NextResponse.json({
      message: `Transform tahap ${result.stage} selesai dijalankan untuk konteks batch ${result.batchCode}. ${result.executedStatements} statement SQL diproses.`,
      result,
    })
  } catch (error) {
    return NextResponse.json({ message: getImportWriteErrorMessage(error) }, { status: 400 })
  }
}
