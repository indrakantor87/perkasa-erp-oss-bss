import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { canPerformAction } from '@/lib/access-control-server'
import { getDashboardSummary } from '@/lib/services/dashboard-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'dashboard', 'view')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const payload = await getDashboardSummary(session)

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
