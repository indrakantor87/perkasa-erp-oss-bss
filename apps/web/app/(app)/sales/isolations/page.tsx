import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import SalesIsolationsPageClient from '@/components/sales-isolations-page-client'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { resolveSalesOwnerAliasesIncludingSpvTeam } from '@/lib/services/sales-team-membership-service'
import type { AppRole, DomainReviewRow, SupportLaneKey } from '@/lib/types'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const BYPASS_MARKETING_OWNER_FILTER_ROLES: ReadonlySet<AppRole> = new Set([
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'CS_ADMIN',
])

function filterRowsByMarketingOwner(rows: DomainReviewRow[], ownerCandidates: string[]) {
  const normalizedCandidates = ownerCandidates
    .map((item) => String(item ?? '').trim().toUpperCase())
    .filter(Boolean)

  if (!normalizedCandidates.length) {
    return rows
  }

  return rows.filter((row) => {
    const marketingName =
      row.meta
        .find((item) => item.startsWith('Marketing: '))
        ?.replace('Marketing: ', '')
        .trim()
        .toUpperCase() ?? ''

    return marketingName ? normalizedCandidates.includes(marketingName) : false
  })
}

async function resolveIsolationOwnerCandidates(session: {
  role: AppRole | null
  displayName?: string | null
  username?: string | null
  userId?: number | null
}): Promise<string[] | null> {
  const role = (session.role ?? '').trim().toUpperCase() as AppRole
  if (BYPASS_MARKETING_OWNER_FILTER_ROLES.has(role)) {
    return null
  }
  if (role === 'SPV_SALES') {
    return resolveSalesOwnerAliasesIncludingSpvTeam(session as any)
  }
  if (role === 'PENJUALAN' || role === 'SALES_MARKETING') {
    return [session.displayName ?? '', session.username ?? '']
  }
  return [session.displayName ?? '', session.username ?? '']
}

function pickMeta(row: DomainReviewRow, prefix: string) {
  return (
    row.meta
      .find((item) => item.startsWith(prefix))
      ?.replace(prefix, '')
      .trim() ?? ''
  )
}

export default async function SalesIsolationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string | string[]
    radboox?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/isolations')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDomainPageData('support', session, {
    supportLane: 'isolations' as SupportLaneKey,
    focus: 'ACTIVE_ISOLATIONS',
  })

  if (!payload) {
    notFound()
  }

  const reviewSections = payload.content.reviewSections ?? []
  const isolationSection = reviewSections.find((section) => section.title.trim().toUpperCase().includes('ISOLIR AKTIF'))
  const ownerCandidates = await resolveIsolationOwnerCandidates(session)
  const scopedRows = ownerCandidates === null
    ? (isolationSection?.rows ?? [])
    : filterRowsByMarketingOwner(isolationSection?.rows ?? [], ownerCandidates)
  const q = String(resolveSearchParam(resolvedSearchParams.q) ?? '').trim().toUpperCase()
  const radboox = String(resolveSearchParam(resolvedSearchParams.radboox) ?? '').trim().toUpperCase()

  const radbooxOptions = Array.from(
    new Set(
      scopedRows
        .map((row) => row.secondary)
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))

  const filteredRows = scopedRows.filter((row) => {
    const rowRadboox = String(row.secondary ?? '').trim().toUpperCase()
    const haystack = [row.primary, row.secondary, row.detail, ...row.meta].join(' ').toUpperCase()
    const qMatched = !q || haystack.includes(q)
    const radbooxMatched = !radboox || rowRadboox === radboox
    return qMatched && radbooxMatched
  })

  const totalRows = filteredRows.length
  const withTicket = filteredRows.filter((row) => pickMeta(row, 'Ticket Dismantle: ').toUpperCase() === 'SUDAH').length
  const withoutTicket = filteredRows.filter((row) => pickMeta(row, 'Ticket Dismantle: ').toUpperCase() !== 'SUDAH').length

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />
      <SalesIsolationsPageClient
        q={String(resolveSearchParam(resolvedSearchParams.q) ?? '')}
        radboox={String(resolveSearchParam(resolvedSearchParams.radboox) ?? '')}
        radbooxOptions={radbooxOptions}
        filteredRows={filteredRows as any}
        totalRows={totalRows}
        withTicket={withTicket}
        withoutTicket={withoutTicket}
      />
    </div>
  )
}
