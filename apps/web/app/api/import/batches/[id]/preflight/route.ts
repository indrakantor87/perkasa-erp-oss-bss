import { NextResponse } from 'next/server'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getImportWriteErrorMessage, preflightOdpOnlyImportBatch } from '@/lib/services/import-write-service'

export async function GET(
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
      { message: 'Preflight batch hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const url = new URL(request.url)
    const stage = String(url.searchParams.get('stage') ?? '')
      .trim()
      .padStart(2, '0')

    if (stage !== '05') {
      return NextResponse.json({ message: 'Stage preflight tidak valid.' }, { status: 400 })
    }

    const result = await preflightOdpOnlyImportBatch(id)
    return NextResponse.json(
      {
        stage,
        batchId: id,
        ...result,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return NextResponse.json({ message: getImportWriteErrorMessage(error) }, { status: 400 })
  }
}
