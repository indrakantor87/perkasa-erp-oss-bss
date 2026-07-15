import { NextResponse } from 'next/server'
import { canAccessPath } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import type { DomainKey } from '@/lib/types'

function resolveSearchParam(value: string | null) {
  const normalized = String(value ?? '').trim()
  return normalized || undefined
}

function resolvePositiveIntegerParam(value: string | null) {
  const normalized = resolveSearchParam(value)
  if (!normalized) {
    return undefined
  }

  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(
  request: Request,
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

  const url = new URL(request.url)
  const payload = await getDomainPageData(domain as DomainKey, session, {
    supportLane: normalizeSupportLane(url.searchParams.get('lane') ?? undefined),
    focus: resolveSearchParam(url.searchParams.get('focus')),
    month: resolvePositiveIntegerParam(url.searchParams.get('month')),
    year: resolvePositiveIntegerParam(url.searchParams.get('year')),
  })
  if (!payload) {
    return NextResponse.json({ message: 'Domain tidak ditemukan.' }, { status: 404 })
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
