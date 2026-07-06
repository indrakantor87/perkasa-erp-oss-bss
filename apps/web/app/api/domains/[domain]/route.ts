import { NextResponse } from 'next/server'
import { canAccessPath } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { DomainKey } from '@/lib/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { domain } = await params
  if (!canAccessPath(session.role, `/${domain}`)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const payload = await getDomainPageData(domain as DomainKey, session.role)
  if (!payload) {
    return NextResponse.json({ message: 'Domain tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
