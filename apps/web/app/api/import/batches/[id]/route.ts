import { NextResponse } from 'next/server'
import { canAccessPath } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
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
