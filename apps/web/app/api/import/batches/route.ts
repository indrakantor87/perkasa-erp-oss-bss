import { NextResponse } from 'next/server'
import { canAccessPath } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
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
