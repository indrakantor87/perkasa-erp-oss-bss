import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { SupportDismantleWorkspace } from '@/components/support-dismantle-workspace'
import { SupportIsolationWorkspace } from '@/components/support-isolation-workspace'
import { SupportSlaWorkspace } from '@/components/support-sla-workspace'
import { SupportTroubleTicketWorkspace } from '@/components/support-tt-workspace'
import { requireSession } from '@/lib/auth'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
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

function filterSupportReviewSectionsByMarketingOwner(
  sections: NonNullable<Awaited<ReturnType<typeof getDomainPageData>>>['content']['reviewSections'],
  ownerCandidates: string[],
) {
  const normalizedCandidates = ownerCandidates
    .map((item) => String(item ?? '').trim().toUpperCase())
    .filter(Boolean)

  if (!normalizedCandidates.length) {
    return sections
  }

  return (sections ?? [])
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => {
        const marketingName =
          row.meta
            .find((item) => item.startsWith('Marketing: '))
            ?.replace('Marketing: ', '')
            .trim()
            .toUpperCase() ?? ''

        return marketingName ? normalizedCandidates.includes(marketingName) : false
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
      label: 'Fokus KPI Proses: Antrean Dismantle Open',
      detail: 'Lane ini dipersempit ke kandidat terminate yang masih aktif di antrean dismantle dan belum masuk histori close.',
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

type TTCodeIdRow = { id: number | string; ticket_code: string }
type TTCurrentHandlerRow = {
  trouble_ticket_id: number | string
  assignment_status: string
  assigned_at: string | null
  accepted_at: string | null
  assigned_display_name: string | null
  assigned_username: string | null
  assigned_user_id: number | string | null
}

function buildTTUserFallback(display: string | null, username: string | null, id: number | string | null) {
  if (display && String(display).trim()) return String(display).trim()
  if (username && String(username).trim()) return String(username).trim()
  return id != null && String(id).trim() ? `User #${id}` : '-'
}

async function enrichTroubleTicketRowsWithCurrentHandler(
  sections: NonNullable<Awaited<ReturnType<typeof getDomainPageData>>>['content']['reviewSections'],
) {
  if (!sections || !sections.length) return sections
  const ttTitles = ['TROUBLE TICKET', 'SLA TICKET OVERDUE', 'SLA TICKET OPEN AKTIF', 'READY CLOSE']
  const ttSections = (sections ?? []).filter((section) =>
    ttTitles.some((prefix) => section.title.trim().toUpperCase().includes(prefix)),
  )
  const allTicketCodes = Array.from(
    new Set(
      ttSections
        .flatMap((section) => section.rows)
        .map((row) => String(row.primary ?? '').trim())
        .filter(Boolean),
    ),
  )
  if (!allTicketCodes.length) return sections

  try {
    const hasTT = await hasReviewDbColumn('support_trouble_tickets', 'ticket_code')
    const hasAssign = await hasReviewDbColumn('service_trouble_ticket_assignments', 'trouble_ticket_id')
    if (!hasTT || !hasAssign) return sections

    const placeholders = allTicketCodes.map(() => '?').join(',')
    const ttIdRows = await runReviewDbQuery<TTCodeIdRow>(
      `SELECT id, ticket_code FROM support_trouble_tickets WHERE ticket_code IN (${placeholders}) LIMIT 1000`,
      allTicketCodes,
    )
    if (!ttIdRows || !ttIdRows.length) return sections
    const ticketIds = ttIdRows.map((r) => String(r.id)).filter(Boolean)
    const codeToId = new Map<string, string>()
    ttIdRows.forEach((r) => {
      if (r.ticket_code) codeToId.set(String(r.ticket_code).trim(), String(r.id))
    })

    const assignPlaceholders = ticketIds.map(() => '?').join(',')
    const handlerRows = await runReviewDbQuery<TTCurrentHandlerRow>(
      `SELECT
          a.trouble_ticket_id,
          a.assignment_status,
          a.assigned_at,
          a.accepted_at,
          au.display_name AS assigned_display_name,
          au.username AS assigned_username,
          au.id AS assigned_user_id
        FROM service_trouble_ticket_assignments a
        LEFT JOIN auth_users au ON au.id = a.assigned_user_id
        WHERE a.trouble_ticket_id IN (${assignPlaceholders})
          AND a.assignment_role = 'FIELD_TECHNICIAN'
          AND a.assignment_status IN ('ASSIGNED','ACCEPTED')
          AND a.released_at IS NULL
          AND a.is_primary = 1
        ORDER BY a.assigned_at DESC LIMIT 500`,
      ticketIds,
    )
    const ticketToHandler = new Map<string, { label: string; status: string }>()
    if (handlerRows && handlerRows.length) {
      handlerRows.forEach((row) => {
        const key = String(row.trouble_ticket_id)
        if (!ticketToHandler.has(key)) {
          ticketToHandler.set(key, {
            label: buildTTUserFallback(row.assigned_display_name, row.assigned_username, row.assigned_user_id),
            status: String(row.assignment_status ?? '').trim().toUpperCase(),
          })
        }
      })
    }

    return (sections ?? []).map((section) => {
      const isTT = ttTitles.some((prefix) => section.title.trim().toUpperCase().includes(prefix))
      if (!isTT) return section
      return {
        ...section,
        rows: section.rows.map((row) => {
          const code = String(row.primary ?? '').trim()
          const ticketId = codeToId.get(code)
          const authoritative = ticketId ? ticketToHandler.get(ticketId) : undefined
          const cleanedMeta = row.meta.filter((item) => {
            const s = String(item)
            if (s.startsWith('PIC: ')) return false
            if (s.startsWith('Historis PIC: ')) return false
            if (s.startsWith('Last Progress: ')) return false
            return true
          })
          const legacyOwnerRaw = (row.meta ?? [])
            .map((item) => String(item))
            .find((s) => s.startsWith('PIC: '))
          const legacyOwner = legacyOwnerRaw ? legacyOwnerRaw.slice(5).trim() : null

          if (authoritative) {
            const picLabel =
              authoritative.status === 'ACCEPTED'
                ? `${authoritative.label} (ONGOING)`
                : authoritative.status === 'ASSIGNED'
                  ? `${authoritative.label} (WAITING)`
                  : authoritative.label
            const nextMeta = [...cleanedMeta, `PIC: ${picLabel}`]
            if (legacyOwner && legacyOwner.toLowerCase() !== authoritative.label.toLowerCase()) {
              nextMeta.push(`Historis PIC: ${legacyOwner}`)
            }
            return {
              ...row,
              meta: nextMeta,
            }
          }

          return {
            ...row,
            meta: [...cleanedMeta, 'PIC: Belum ada PIC'],
          }
        }),
      }
    })
  } catch (_err) {
    return sections
  }
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
  const payload = await getDomainPageData('support', session, {
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
  const roleScopedContent =
    session.role === 'PENJUALAN' && (normalizedLane as SupportLaneKey) === 'isolations'
      ? {
          ...filteredContent,
          reviewSections: filterSupportReviewSectionsByMarketingOwner(filteredContent.reviewSections, [
            session.displayName,
            session.username,
          ]),
        }
      : filteredContent

  const resolvedSupportDrilldown = resolveSupportDrilldown(
    normalizedLane as SupportLaneKey,
    focusFilter,
    customerFilter,
    serviceFilter,
  )

  if ((normalizedLane as SupportLaneKey) === 'isolations') {
    return (
      <SupportIsolationWorkspace
        content={roleScopedContent}
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
    const enrichedSections = await enrichTroubleTicketRowsWithCurrentHandler(roleScopedContent.reviewSections)
    const enrichedTTContent = { ...roleScopedContent, reviewSections: enrichedSections }
    return (
      <SupportTroubleTicketWorkspace
        content={enrichedTTContent}
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
        content={roleScopedContent}
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
        content={roleScopedContent}
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
      content={roleScopedContent}
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
