import { redirect } from 'next/navigation'
import { BillingDomainWorkspace } from '@/components/billing-domain-workspace'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDomainPageData } from '@/lib/services/domain-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function resolveFinanceDrilldown(focus: string | undefined) {
  const normalized = String(focus ?? '').trim().toUpperCase()
  if (!normalized) {
    return undefined
  }

  if (normalized === 'OVERDUE_INVOICES') {
    return {
      key: normalized,
      label: 'Fokus KPI: Invoice Overdue',
      detail: 'Daftar finance dipersempit ke invoice overdue agar follow up, suspend, dan reconnect lebih cepat diprioritaskan.',
      clearHref: '/finance',
    }
  }
  if (normalized === 'BILLING_OVERDUE_AMOUNT') {
    return {
      key: normalized,
      label: 'Fokus KPI: Nominal Overdue',
      detail: 'Daftar finance dipersempit ke invoice overdue dengan outstanding terbesar agar prioritas collection mengikuti nominal tagihan yang paling berat.',
      clearHref: '/finance',
    }
  }
  if (normalized === 'PARTIAL_INVOICES' || normalized === 'PARTIAL_PAYMENTS') {
    return {
      key: normalized,
      label: 'Fokus KPI: Payment Parsial',
      detail: 'Daftar finance dipersempit ke invoice parsial agar tim bisa mengamankan pembayaran yang masih menggantung.',
      clearHref: '/finance',
    }
  }
  if (normalized === 'SUSPEND_CANDIDATES') {
    return {
      key: normalized,
      label: 'Fokus KPI: Suspend Candidates',
      detail: 'Daftar finance dipersempit ke antrean suspend-ready agar eksekusi suspend dan kontrol dampaknya lebih fokus.',
      clearHref: '/finance',
    }
  }

  return undefined
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    invoice?: string | string[]
    service?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/finance')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDomainPageData('billing', session, {
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    redirect('/dashboard')
  }

  return (
    <BillingDomainWorkspace
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      basePath="/finance"
      workspaceLabel="Finance Workspace"
      shortLabel="Finance"
      domainPrefill={{
        invoice: resolveSearchParam(resolvedSearchParams.invoice),
        service: resolveSearchParam(resolvedSearchParams.service),
      }}
      domainDrilldown={resolveFinanceDrilldown(resolveSearchParam(resolvedSearchParams.focus))}
    />
  )
}
