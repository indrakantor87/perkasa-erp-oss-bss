import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { SupportDismantleWorkspace } from '@/components/support-dismantle-workspace'
import { SupportIsolationWorkspace } from '@/components/support-isolation-workspace'
import { SupportSlaWorkspace } from '@/components/support-sla-workspace'
import { SupportTroubleTicketWorkspace } from '@/components/support-tt-workspace'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { canAccessSupportLane, getPreferredSupportLane, normalizeSupportLane } from '@/lib/support-lanes'
import type { SupportDrilldownContext, SupportLaneKey } from '@/lib/types'

type SupportLaneParams = {
  lane: string
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeCaseToken(value: string | undefined) {
  return String(value ?? '').trim()
}

function normalizeStatusFilter(value: string | undefined) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function filterSupportFocusSections(
  sections: NonNullable<Awaited<ReturnType<typeof getDomainPageData>>>['content']['reviewSections'],
  lane: SupportLaneKey,
  focus: string | undefined,
) {
  const normalizedFocus = String(focus ?? '')
    .trim()
    .toUpperCase()

  if (!normalizedFocus) {
    return sections
  }

  return (sections ?? []).filter((section) => {
    const title = section.title.trim().toUpperCase()

    if (lane === 'tt') {
      if (normalizedFocus === 'READY_CLOSE') return title.includes('READY CLOSE')
      if (normalizedFocus === 'OPEN_TICKETS' || normalizedFocus === 'MONTHLY_OPENED') {
        return title.includes('TROUBLE TICKET') && !title.includes('READY CLOSE')
      }
      if (normalizedFocus === 'SLA_OVERDUE') return title.includes('SLA TICKET OVERDUE')
      if (normalizedFocus === 'OVERDUE_RATE') {
        return title.includes('SLA TICKET OPEN AKTIF') || title.includes('SLA TICKET OVERDUE')
      }
    }

    if (lane === 'sla') {
      if (normalizedFocus === 'SLA_OVERDUE') return title.includes('SLA TICKET OVERDUE')
      if (normalizedFocus === 'OVERDUE_RATE') {
        return title.includes('SLA TICKET OPEN AKTIF') || title.includes('SLA TICKET OVERDUE')
      }
    }

    if (lane === 'isolations') {
      if (normalizedFocus === 'ACTIVE_ISOLATIONS') return title.includes('ISOLIR AKTIF')
    }

    if (lane === 'dismantle') {
      if (normalizedFocus === 'OPEN_QUEUE' || normalizedFocus === 'FIELD_FOLLOW_UP' || normalizedFocus === 'DISMANTLE_OPEN') {
        return title.includes('QUEUE DISMANTLE OPEN')
      }
      if (
        normalizedFocus === 'RECENT_DISMANTLE' ||
        normalizedFocus === 'CLOSED_THIS_PERIOD' ||
        normalizedFocus === 'MONTHLY_DISMANTLES'
      ) {
        return title.includes('HISTORI DISMANTLE')
      }
    }

    return true
  })
}

function filterSupportReviewSections(
  sections: NonNullable<Awaited<ReturnType<typeof getDomainPageData>>>['content']['reviewSections'],
  customer: string | undefined,
  service: string | undefined,
  type: string | undefined,
  status: string | undefined,
) {
  const normalizedCustomer = normalizeCaseToken(customer).toUpperCase()
  const normalizedService = normalizeCaseToken(service).toUpperCase()
  const normalizedType = normalizeCaseToken(type).toUpperCase()
  const normalizedStatus = normalizeStatusFilter(status)

  if (!normalizedCustomer && !normalizedService && !normalizedType && !normalizedStatus) {
    return sections
  }

  return (sections ?? [])
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => {
        const haystack = [row.primary, row.secondary, row.detail, ...row.meta].join(' ').toUpperCase()
        const customerMatched = !normalizedCustomer || haystack.includes(normalizedCustomer)
        const serviceMatched = !normalizedService || haystack.includes(normalizedService)
        const rowType = row.meta
          .find((item) => item.startsWith('Type: '))
          ?.replace('Type: ', '')
          .trim()
          .toUpperCase()
        const rowStatus = String(row.status ?? '').trim().toUpperCase()
        const typeMatched = !normalizedType || rowType === normalizedType
        const statusMatched = !normalizedStatus || rowStatus === normalizedStatus
        return customerMatched && serviceMatched && typeMatched && statusMatched
      }),
    }))
    .filter((section) => section.rows.length > 0)
}

function resolveSupportDrilldown(
  lane: SupportLaneKey,
  focus: string | undefined,
  customer: string | undefined,
  service: string | undefined,
): SupportDrilldownContext | undefined {
  const normalizedCustomer = normalizeCaseToken(customer)
  const normalizedService = normalizeCaseToken(service)

  if (normalizedCustomer || normalizedService) {
    const scope = [normalizedCustomer ? `Customer ${normalizedCustomer}` : null, normalizedService ? `Service ${normalizedService}` : null]
      .filter(Boolean)
      .join(' • ')

    return {
      key: 'CASE_MAPPING',
      label: `Fokus Kasus: ${scope}`,
      detail:
        'Lane ini difilter dari keputusan Billing agar operator membaca antrean support yang paling dekat dengan customer dan service yang sama, bukan backlog umum seluruh lane.',
      clearHref: `/support/${lane}`,
    }
  }

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

  if (lane === 'tt' && normalized === 'READY_CLOSE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Siap Close',
      detail: 'Lane ini dipersempit ke ticket yang sudah punya progress valid dan siap masuk ke jalur close formal.',
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

  if (lane === 'dismantle' && normalized === 'OPEN_QUEUE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Queue Dismantle Open',
      detail: 'Lane ini dipersempit ke kandidat terminate yang masih aktif di queue dismantle dan belum masuk histori close.',
      clearHref: '/support/dismantle',
    }
  }

  if (lane === 'dismantle' && normalized === 'FIELD_FOLLOW_UP') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Follow Up Lapangan',
      detail: 'Lane ini menyorot antrean dismantle open yang masih menunggu tindak lanjut lapangan sebelum bisa ditutup permanen.',
      clearHref: '/support/dismantle',
    }
  }

  if (lane === 'dismantle' && (normalized === 'CLOSED_THIS_PERIOD' || normalized === 'MONTHLY_DISMANTLES')) {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Dismantle Close Periode Ini',
      detail: 'Lane ini dipersempit ke histori dismantle yang benar-benar ditutup pada periode aktif agar sinkron dengan KPI dashboard.',
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
  searchParams: Promise<{
    ticket?: string | string[]
    isolation?: string | string[]
    dismantle?: string | string[]
    dismantleHistory?: string | string[]
    type?: string | string[]
    status?: string | string[]
    focus?: string | string[]
    customer?: string | string[]
    service?: string | string[]
  }>
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
  if (!canAccessSupportLane(session.role, normalizedLane)) {
    redirect(`/support/${getPreferredSupportLane(session.role)}`)
  }

  const customerFilter = resolveSearchParam(resolvedSearchParams.customer)
  const serviceFilter = resolveSearchParam(resolvedSearchParams.service)
  const typeFilter = resolveSearchParam(resolvedSearchParams.type)
  const statusFilter = resolveSearchParam(resolvedSearchParams.status)
  const focusFilter = resolveSearchParam(resolvedSearchParams.focus)
  const payload = await getDomainPageData('support', session.role, {
    supportLane: normalizedLane as SupportLaneKey,
    focus: focusFilter,
  })

  if (!payload) {
    notFound()
  }

  const focusFilteredSections = filterSupportFocusSections(
    payload.content.reviewSections,
    normalizedLane as SupportLaneKey,
    focusFilter,
  )
  const filteredReviewSections = filterSupportReviewSections(
    focusFilteredSections,
    customerFilter,
    serviceFilter,
    typeFilter,
    statusFilter,
  )
  const filteredContent =
    customerFilter || serviceFilter || typeFilter || statusFilter
      ? {
          ...payload.content,
          reviewSections: filteredReviewSections,
        }
      : payload.content

  const resolvedSupportDrilldown = resolveSupportDrilldown(
    normalizedLane as SupportLaneKey,
    focusFilter,
    customerFilter,
    serviceFilter,
  )

  if ((normalizedLane as SupportLaneKey) === 'isolations') {
    return (
      <SupportIsolationWorkspace
        content={filteredContent}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        supportPrefill={{
          ticket: resolveSearchParam(resolvedSearchParams.ticket),
          isolation: resolveSearchParam(resolvedSearchParams.isolation),
          dismantle: resolveSearchParam(resolvedSearchParams.dismantle),
          dismantleHistory: resolveSearchParam(resolvedSearchParams.dismantleHistory),
          type: resolveSearchParam(resolvedSearchParams.type),
          status: statusFilter,
          focus: resolveSearchParam(resolvedSearchParams.focus),
          customer: customerFilter,
          service: serviceFilter,
        }}
        supportDrilldown={resolvedSupportDrilldown}
      />
    )
  }

  if ((normalizedLane as SupportLaneKey) === 'tt') {
    return (
      <SupportTroubleTicketWorkspace
        content={filteredContent}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        supportPrefill={{
          ticket: resolveSearchParam(resolvedSearchParams.ticket),
          type: resolveSearchParam(resolvedSearchParams.type),
          status: statusFilter,
          focus: resolveSearchParam(resolvedSearchParams.focus),
          customer: customerFilter,
          service: serviceFilter,
        }}
        supportDrilldown={resolvedSupportDrilldown}
      />
    )
  }

  if ((normalizedLane as SupportLaneKey) === 'dismantle') {
    return (
      <SupportDismantleWorkspace
        content={filteredContent}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        supportPrefill={{
          isolation: resolveSearchParam(resolvedSearchParams.isolation),
          dismantle: resolveSearchParam(resolvedSearchParams.dismantle),
          dismantleHistory: resolveSearchParam(resolvedSearchParams.dismantleHistory),
          status: statusFilter,
          focus: resolveSearchParam(resolvedSearchParams.focus),
          customer: customerFilter,
          service: serviceFilter,
        }}
        supportDrilldown={resolvedSupportDrilldown}
      />
    )
  }

  if ((normalizedLane as SupportLaneKey) === 'sla') {
    return (
      <SupportSlaWorkspace
        content={filteredContent}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        supportPrefill={{
          type: resolveSearchParam(resolvedSearchParams.type),
          focus: resolveSearchParam(resolvedSearchParams.focus),
          customer: customerFilter,
          service: serviceFilter,
        }}
        supportDrilldown={resolvedSupportDrilldown}
      />
    )
  }

  return (
    <DomainShell
      content={filteredContent}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      supportFocus={payload.supportFocus}
      supportPageMode="lane"
      supportPrefill={{
        ticket: resolveSearchParam(resolvedSearchParams.ticket),
        isolation: resolveSearchParam(resolvedSearchParams.isolation),
        dismantle: resolveSearchParam(resolvedSearchParams.dismantle),
        dismantleHistory: resolveSearchParam(resolvedSearchParams.dismantleHistory),
        type: resolveSearchParam(resolvedSearchParams.type),
      }}
      supportDrilldown={resolvedSupportDrilldown}
    />
  )
}
