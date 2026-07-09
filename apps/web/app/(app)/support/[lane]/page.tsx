import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import type { SupportLaneKey } from '@/lib/types'

type SupportLaneParams = {
  lane: string
}

export function generateStaticParams(): SupportLaneParams[] {
  return [
    { lane: 'tt' },
    { lane: 'isolations' },
    { lane: 'dismantle' },
    { lane: 'sla' },
  ]
}

export default async function SupportLanePage({
  params,
}: {
  params: Promise<SupportLaneParams>
}) {
  const session = await requireSession()
  const { lane } = await params

  const normalizedLane = normalizeSupportLane(lane)
  if (!normalizedLane) {
    notFound()
  }

  const pathname = `/support/${normalizedLane}`
  if (!canAccessPath(session.role, pathname)) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData('support', session.role, {
    supportLane: normalizedLane as SupportLaneKey,
  })

  if (!payload) {
    notFound()
  }

  return (
    <DomainShell
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      supportFocus={payload.supportFocus}
      supportPageMode="lane"
    />
  )
}
