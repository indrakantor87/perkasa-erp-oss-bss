import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import type { SupportDrilldownContext, SupportLaneKey } from '@/lib/types'

type SupportLaneParams = {
  lane: string
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolveSupportDrilldown(lane: SupportLaneKey, focus: string | undefined): SupportDrilldownContext | undefined {
  const normalized = String(focus ?? '')
    .trim()
    .toUpperCase()

  if (!normalized) {
    return undefined
  }

  if (lane === 'sla' && normalized === 'SLA_OVERDUE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Overdue',
      detail: 'Lane ini difokuskan ke ticket dengan SLA yang sudah overdue agar operator bisa langsung mengamankan backlog kritis.',
      clearHref: '/support/sla',
    }
  }

  if (lane === 'sla' && normalized === 'OVERDUE_RATE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Rasio Overdue',
      detail:
        'Lane ini dibuka dari KPI rasio overdue agar ticket aktif ber-SLA dan subset yang sudah overdue terbaca dalam konteks yang sama.',
      clearHref: '/support/sla',
    }
  }

  if (lane === 'tt' && normalized === 'OPEN_TICKETS') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Trouble Ticket Open',
      detail: 'Lane ini difokuskan ke ticket aktif yang masih membutuhkan progress, follow-up, atau eskalasi operasional.',
      clearHref: '/support/tt',
    }
  }

  if (lane === 'tt' && normalized === 'MONTHLY_OPENED') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Periode Ini',
      detail: 'Lane ini dibuka dari KPI periode berjalan agar operator cepat membaca antrean trouble ticket terbaru pada bulan aktif.',
      clearHref: '/support/tt',
    }
  }

  if (lane === 'isolations' && normalized === 'ACTIVE_ISOLATIONS') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Isolir Aktif',
      detail: 'Lane ini difokuskan ke kasus isolir aktif yang perlu sinkron billing, restore, atau keputusan lanjut lapangan.',
      clearHref: '/support/isolations',
    }
  }

  if (lane === 'dismantle' && normalized === 'RECENT_DISMANTLE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Dismantle Periode Ini',
      detail: 'Lane ini dibuka untuk meninjau kebutuhan persetujuan dan penutupan dismantle terbaru pada periode aktif.',
      clearHref: '/support/dismantle',
    }
  }

  return undefined
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
  searchParams,
}: {
  params: Promise<SupportLaneParams>
  searchParams: Promise<{ ticket?: string | string[]; isolation?: string | string[]; type?: string | string[]; focus?: string | string[] }>
}) {
  const session = await requireSession()
  const { lane } = await params
  const resolvedSearchParams = await searchParams

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
    focus: resolveSearchParam(resolvedSearchParams.focus),
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
      supportPrefill={{
        ticket: resolveSearchParam(resolvedSearchParams.ticket),
        isolation: resolveSearchParam(resolvedSearchParams.isolation),
        type: resolveSearchParam(resolvedSearchParams.type),
      }}
      supportDrilldown={resolveSupportDrilldown(normalizedLane as SupportLaneKey, resolveSearchParam(resolvedSearchParams.focus))}
    />
  )
}
