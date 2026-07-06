import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDashboardSummary } from '@/lib/services/dashboard-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getDashboardSummary()

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
