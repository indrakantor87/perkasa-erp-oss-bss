import { NextResponse } from 'next/server'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getImportWriteErrorMessage,
  validateImportBatch,
} from '@/lib/services/import-write-service'

export async function POST(
  _request: Request,
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
      { message: 'Validasi batch hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const result = await validateImportBatch(id, `${session.displayName} (${session.username})`)

    return NextResponse.json({
      message: `Validasi batch ${result.batchCode} selesai: ${result.validRows} valid, ${result.invalidRows} invalid, ${result.duplicateRows} duplikat.`,
      result,
    })
  } catch (error) {
    return NextResponse.json({ message: getImportWriteErrorMessage(error) }, { status: 400 })
  }
}
