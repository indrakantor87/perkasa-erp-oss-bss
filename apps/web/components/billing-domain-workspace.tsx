'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { DataSourceStatus } from '@/components/data-source-status'
import type {
  AppRole,
  DataSourceSnapshot,
  DomainCapability,
  DomainFormPrefill,
  DomainPageContent,
  DomainReviewRow,
  DomainReviewSection,
} from '@/lib/types'

function FormModalSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 p-6 dark:border-slate-700/70 dark:bg-slate-900/60">
      <div className="mb-4 h-8 w-1/3 rounded-xl bg-slate-200/70 dark:bg-slate-700/70" />
      <div className="space-y-3">
        <div className="h-12 w-full rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
        <div className="h-12 w-2/3 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
        <div className="h-32 w-full rounded-lg bg-slate-200/50 dark:bg-slate-700/50" />
        <div className="flex justify-end gap-3">
          <div className="h-11 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
          <div className="h-11 w-36 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
        </div>
      </div>
    </div>
  )
}

const BillingCollectionActionForm = dynamic(
  () => import('@/components/billing-collection-action-form').then((mod) => mod.BillingCollectionActionForm),
  { ssr: false, loading: FormModalSkeleton },
)
const BillingCollectionResolveForm = dynamic(
  () => import('@/components/billing-collection-resolve-form').then((mod) => mod.BillingCollectionResolveForm),
  { ssr: false, loading: FormModalSkeleton },
)
const BillingInvoiceGenerateForm = dynamic(
  () => import('@/components/billing-invoice-generate-form').then((mod) => mod.BillingInvoiceGenerateForm),
  { ssr: false, loading: FormModalSkeleton },
)
const BillingInvoiceStatusForm = dynamic(
  () => import('@/components/billing-invoice-status-form').then((mod) => mod.BillingInvoiceStatusForm),
  { ssr: false, loading: FormModalSkeleton },
)
const BillingPaymentForm = dynamic(
  () => import('@/components/billing-payment-form').then((mod) => mod.BillingPaymentForm),
  { ssr: false, loading: FormModalSkeleton },
)
const TableQuickActionModal = dynamic(
  () => import('@/components/table-quick-action-modal').then((mod) => mod.TableQuickActionModal),
  { ssr: false, loading: FormModalSkeleton },
)
import type { TableQuickActionPayload } from '@/components/table-quick-action-modal'

type BillingActionKey =
  | 'invoice-generate'
  | 'invoice-status'
  | 'collection-action'
  | 'collection-resolve'
  | 'payment-entry'

function getBillingActionAnchorId(key: BillingActionKey) {
  return `billing-action-${key}`
}

function buildPrefillHref(anchorId: string, params: Record<string, string | undefined>, basePath: string) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) {
      searchParams.set(key, normalized)
    }
  })
  const queryText = searchParams.toString()
  return `${basePath}${queryText ? `?${queryText}` : ''}#${anchorId}`
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.replace(prefix, '').trim() || ''
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OVERDUE') || normalized.includes('FAILED') || normalized.includes('BLOCKED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized.includes('OPEN') || normalized.includes('ACTIVE') || normalized.includes('READY')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (normalized.includes('PENDING') || normalized.includes('PROMISE') || normalized.includes('DUE')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('CLOSE') || normalized.includes('PAID') || normalized.includes('DONE') || normalized.includes('SUCCESS')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function getSectionAction(params: { sectionTitle: string; canCreate: boolean; canUpdate: boolean }) {
  const title = params.sectionTitle.trim().toUpperCase()

  if (title.includes('SUBSCRIPTION BILLING-READY') && params.canCreate) {
    return { key: 'invoice-generate' as const, label: 'Generate Invoice' }
  }
  if ((title.includes('SUSPEND READY QUEUE') || title.includes('RECONNECT READY QUEUE')) && params.canUpdate) {
    return { key: 'invoice-status' as const, label: 'Proses Status' }
  }
  if (title.includes('COLLECTION FOLLOW UP QUEUE') && params.canUpdate) {
    return { key: 'collection-resolve' as const, label: 'Resolve Follow Up' }
  }
  if ((title.includes('PROMISE TO PAY QUEUE') || title.includes('WRITE OFF QUEUE')) && (params.canCreate || params.canUpdate)) {
    return { key: 'collection-action' as const, label: 'Tindak Collection' }
  }
  if (title.includes('PAYMENT') && params.canCreate) {
    return { key: 'payment-entry' as const, label: 'Input Payment' }
  }
  if (title.includes('INVOICE') && params.canCreate) {
    return { key: 'collection-action' as const, label: 'Tindak Invoice' }
  }
  return null
}

function isSectionAction(
  value: ReturnType<typeof getSectionAction>,
): value is NonNullable<ReturnType<typeof getSectionAction>> {
  return value !== null
}

function getRowAction(params: {
  sectionTitle: string
  row: DomainReviewRow
  canCreate: boolean
  canUpdate: boolean
  basePath: string
}) {
  const title = params.sectionTitle.trim().toUpperCase()
  const invoice = params.row.primary.trim()
  const service = pickMeta(params.row.meta, 'Service: ')

  if (title.includes('SUBSCRIPTION BILLING-READY') && params.canCreate) {
    return {
      label: 'Generate',
      href: buildPrefillHref(getBillingActionAnchorId('invoice-generate'), {
        service,
      }, params.basePath),
    }
  }
  if ((title.includes('SUSPEND READY QUEUE') || title.includes('RECONNECT READY QUEUE')) && params.canUpdate) {
    return {
      label: 'Status',
      href: buildPrefillHref(getBillingActionAnchorId('invoice-status'), {
        invoice,
      }, params.basePath),
    }
  }
  if (title.includes('COLLECTION FOLLOW UP QUEUE') && params.canUpdate) {
    return {
      label: 'Resolve',
      href: buildPrefillHref(getBillingActionAnchorId('collection-resolve'), {
        invoice,
      }, params.basePath),
    }
  }
  if ((title.includes('PROMISE TO PAY QUEUE') || title.includes('WRITE OFF QUEUE')) && (params.canCreate || params.canUpdate)) {
    return {
      label: 'Collection',
      href: buildPrefillHref(getBillingActionAnchorId('collection-action'), {
        invoice,
      }, params.basePath),
    }
  }
  if (title.includes('PAYMENT') && params.canCreate) {
    return {
      label: 'Payment',
      href: buildPrefillHref(getBillingActionAnchorId('payment-entry'), {
        invoice,
      }, params.basePath),
    }
  }
  if (title.includes('INVOICE') && params.canCreate) {
    return {
      label: 'Tindak',
      href: buildPrefillHref(getBillingActionAnchorId('collection-action'), {
        invoice,
      }, params.basePath),
    }
  }
  return null
}

function buildBillingQuickActionPayload(params: {
  sectionTitle: string
  row: DomainReviewRow
  canCreate: boolean
  canUpdate: boolean
  basePath: string
}): TableQuickActionPayload {
  const action = getRowAction({
    sectionTitle: params.sectionTitle,
    row: params.row,
    canCreate: params.canCreate,
    canUpdate: params.canUpdate,
    basePath: params.basePath,
  })
  const service = pickMeta(params.row.meta, 'Service: ')
  const invoiceType = pickMeta(params.row.meta, 'Invoice Type: ')
  const remaining = pickMeta(params.row.meta, 'Remaining: ')
  const invoiceDue = pickMeta(params.row.meta, 'Invoice Due: ')
  const followUp = pickMeta(params.row.meta, 'Follow Up: ')
  const collectionStatus = pickMeta(params.row.meta, 'Collection Status: ')

  return {
    id: params.row.id,
    title: params.row.primary,
    subtitle: params.row.secondary,
    description: params.row.detail,
    draftLabel: 'Invoice',
    copyLabel: 'Salin detail invoice',
    copyText: [
      `Invoice: ${params.row.primary}`,
      `Customer: ${params.row.secondary}`,
      service ? `Service: ${service}` : null,
      `Status: ${params.row.status}`,
      invoiceType ? `Invoice Type: ${invoiceType}` : null,
      remaining ? `Remaining: ${remaining}` : null,
      invoiceDue ? `Due: ${invoiceDue}` : null,
      followUp ? `Follow Up: ${followUp}` : null,
      collectionStatus ? `Collection: ${collectionStatus}` : null,
      `Section Billing: ${params.sectionTitle}`,
      `Keterangan: ${params.row.detail}`,
    ]
      .filter(Boolean)
      .join('\n'),
    draftSeed: [
      service ? `Service: ${service}` : null,
      remaining ? `Remaining: ${remaining}` : null,
      invoiceDue ? `Due: ${invoiceDue}` : null,
      followUp ? `Follow Up: ${followUp}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    badges: [
      { label: params.sectionTitle },
      { label: params.row.status, tone: getStatusTone(params.row.status) },
      ...(invoiceType ? [{ label: invoiceType }] : []),
    ],
    sections: [
      {
        title: 'Customer / Service',
        value: [params.row.secondary, service || '-'].filter(Boolean).join('\n'),
      },
      {
        title: 'Tagihan / Follow Up',
        value: [
          remaining ? `Remaining: ${remaining}` : null,
          invoiceDue ? `Due: ${invoiceDue}` : null,
          followUp ? `Follow Up: ${followUp}` : null,
          collectionStatus ? `Collection: ${collectionStatus}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      },
      {
        title: 'Section Billing',
        value: params.sectionTitle,
      },
      {
        title: 'Keterangan',
        value: params.row.detail,
      },
    ],
    actions: action
      ? [
          {
            label: action.label,
            href: action.href,
            tone: 'primary',
          },
        ]
      : [],
  }
}

function buildBillingStats(sections: DomainReviewSection[]) {
  const rows = sections.flatMap((section) => section.rows)
  const sectionRowCount = (patterns: string[]) =>
    sections
      .filter((section) => {
        const title = section.title.toUpperCase()
        return patterns.some((pattern) => title.includes(pattern))
      })
      .reduce((total, section) => total + section.rows.length, 0)

  return {
    total: rows.length,
    overdue:
      sectionRowCount(['OVERDUE INVOICE', 'PERLU TINDAK LANJUT']) ||
      rows.filter((row) => row.status.toUpperCase().includes('OVERDUE')).length,
    promiseToPay:
      sectionRowCount(['PROMISE TO PAY QUEUE']) ||
      rows.filter((row) => row.detail.toUpperCase().includes('JANJI BAYAR')).length,
    suspendReady:
      sectionRowCount(['SUSPEND READY QUEUE']) ||
      rows.filter((row) => row.detail.toUpperCase().includes('SUSPEND')).length,
    reconnect:
      sectionRowCount(['RECONNECT READY QUEUE']) ||
      rows.filter((row) => row.detail.toUpperCase().includes('RECONNECT')).length,
  }
}

export function BillingDomainWorkspace({
  content,
  source,
  capabilities,
  role,
  domainPrefill,
  domainDrilldown,
  basePath = '/billing',
  workspaceLabel = 'Billing / Collection Workspace',
  shortLabel = 'Billing',
}: {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
  role: AppRole
  domainPrefill?: DomainFormPrefill
  domainDrilldown?: {
    key: string
    label: string
    detail: string
    clearHref: string
    month?: number
    year?: number
  }
  basePath?: string
  workspaceLabel?: string
  shortLabel?: string
}) {
  const reviewSections = content.reviewSections ?? []
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)
  const allRows = reviewSections.flatMap((section) => section.rows)
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback

  const billingInvoiceSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('INVOICE'))
        .flatMap((section) => section.rows)
        .map((row) => row.primary.trim())
        .filter(Boolean),
    ),
  )
  const billingCollectionSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('PERLU TINDAK LANJUT'))
        .flatMap((section) => section.rows)
        .map((row) => row.primary.trim())
        .filter(Boolean),
    ),
  )
  const billingCollectionFollowUpSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('COLLECTION FOLLOW UP QUEUE'))
        .flatMap((section) => section.rows)
        .map((row) => {
          const invoice = row.primary.trim()
          const invoiceStatus = pickMeta(row.meta, 'Invoice Status: ') || '-'
          const total = pickMeta(row.meta, 'Total: ') || 'Rp0'
          const paid = pickMeta(row.meta, 'Paid: ') || 'Rp0'
          const remaining = pickMeta(row.meta, 'Remaining: ') || 'Rp0'
          const invoiceDue = pickMeta(row.meta, 'Invoice Due: ') || '-'
          const followUp = pickMeta(row.meta, 'Follow Up: ') || '-'
          const followUpState = pickMeta(row.meta, 'Follow Up State: ') || 'UNSET'
          const actionType = pickMeta(row.meta, 'Action Type: ') || '-'
          const collectionStatus = pickMeta(row.meta, 'Collection Status: ') || '-'
          const suspendCandidate = pickMeta(row.meta, 'Suspend Candidate: ') || 'Tidak'
          const actionNotes = pickMeta(row.meta, 'Action Notes: ') || '-'
          return invoice
            ? `${invoice} | ${row.secondary} | ${invoiceStatus} | ${total} | ${paid} | ${remaining} | ${invoiceDue} | ${followUp} | ${followUpState} | ${actionType} | ${collectionStatus} | ${suspendCandidate} | ${actionNotes}`
            : ''
        })
        .filter(Boolean),
    ),
  )
  const billingSuspendReadySuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('SUSPEND READY QUEUE'))
        .flatMap((section) => section.rows)
        .map((row) => row.primary.trim())
        .filter(Boolean),
    ),
  )
  const billingPromiseToPaySuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('PROMISE TO PAY QUEUE'))
        .flatMap((section) => section.rows)
        .map((row) => row.primary.trim())
        .filter(Boolean),
    ),
  )
  const billingReconnectReadySuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('RECONNECT READY QUEUE'))
        .flatMap((section) => section.rows)
        .map((row) => row.primary.trim())
        .filter(Boolean),
    ),
  )
  const billingReconnectContextSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('RECONNECT READY QUEUE'))
        .flatMap((section) => section.rows)
        .map((row) => {
          const invoice = row.primary.trim()
          const invoiceStatus = pickMeta(row.meta, 'Invoice Status: ') || '-'
          const collectionStatus = pickMeta(row.meta, 'Collection Status: ') || '-'
          const total = pickMeta(row.meta, 'Total: ') || 'Rp0'
          const paid = pickMeta(row.meta, 'Paid: ') || 'Rp0'
          const remaining = pickMeta(row.meta, 'Remaining: ') || 'Rp0'
          const invoiceDue = pickMeta(row.meta, 'Invoice Due: ') || '-'
          const updated = pickMeta(row.meta, 'Updated: ') || '-'
          return invoice
            ? `${invoice} | ${row.secondary} | ${invoiceStatus} | ${total} | ${paid} | ${remaining} | ${invoiceDue} | ${updated} | READY_RECONNECT | RECONNECT | ${collectionStatus} | Tidak | ${row.detail}`
            : ''
        })
        .filter(Boolean),
    ),
  )
  const billingStatusInvoiceSuggestions = Array.from(
    new Set([...billingCollectionSuggestions, ...billingSuspendReadySuggestions, ...billingReconnectReadySuggestions]),
  )
  const billingSubscriptionSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('SUBSCRIPTION BILLING-READY'))
        .flatMap((section) => section.rows)
        .map((row) => row.primary.trim())
        .filter(Boolean),
    ),
  )

  const sectionActions = reviewSections
    .map((section) => getSectionAction({ sectionTitle: section.title, canCreate, canUpdate }))
    .filter(isSectionAction)
    .filter((item, index, array) => array.findIndex((entry) => entry.key === item.key) === index)

  const stats = buildBillingStats(reviewSections)

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <p className="section-title">{content.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {workspaceLabel}
            </h2>
            <p className="mt-1 text-sm leading-5 text-mute">
              Invoice overdue, follow-up collection, suspend, reconnect, dan payment dalam satu layar kerja yang ringkas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={content.primaryAction.href} className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
              {content.primaryAction.label}
            </Link>
            <Link href={content.secondaryAction.href} className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
              {content.secondaryAction.label}
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{stats.total} baris billing</span>
          <span className="badge border-rose-200 bg-rose-50 text-rose-700">Overdue: {stats.overdue}</span>
          <span className="badge border-amber-200 bg-amber-50 text-amber-700">PTP: {stats.promiseToPay}</span>
          <span className="badge border-sky-200 bg-sky-50 text-sky-700">Suspend: {stats.suspendReady}</span>
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Reconnect: {stats.reconnect}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <article className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Invoice Overdue</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-rose-950">{stats.overdue}</p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Promise To Pay</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-amber-950">{stats.promiseToPay}</p>
        </article>
        <article className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Suspend Ready</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-sky-950">{stats.suspendReady}</p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Reconnect</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-emerald-950">{stats.reconnect}</p>
        </article>
      </section>

      {content.summaries.length ? (
        <section className="rounded-xl border border-line bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {content.summaries.map((item) => (
              <span key={item.label} className="badge border-slate-200 bg-white text-slate-600">
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <DataSourceStatus source={source} />

      {domainDrilldown ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-900">{domainDrilldown.label}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-800">{domainDrilldown.detail}</p>
            </div>
            <Link
              href={domainDrilldown.clearHref}
              className="rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Toolbar {shortLabel}</p>
            <p className="mt-1 text-sm text-mute">Shortcut overdue, nominal besar, parsial, dan suspend candidate.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${basePath}?focus=OVERDUE_INVOICES`} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">
              Overdue
            </Link>
            <Link href={`${basePath}?focus=BILLING_OVERDUE_AMOUNT`} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
              Nominal Besar
            </Link>
            <Link href={`${basePath}?focus=PARTIAL_INVOICES`} className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
              Partial
            </Link>
            <Link href={`${basePath}?focus=SUSPEND_CANDIDATES`} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
              Suspend
            </Link>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Console {shortLabel}</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Tabel antrean invoice dan collection
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-5 text-mute">
              Tabel jadi pusat baca. Form aksi dipindah ke panel sekunder agar operator fokus ke invoice yang sedang perlu tindakan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-200 bg-white text-slate-600">{reviewSections.length} section</span>
            <span className="badge border-slate-200 bg-white text-slate-600">Role: {role}</span>
          </div>
        </div>

        {sectionActions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {sectionActions.map((item) => (
              <Link
                key={item.key}
                href={`#${getBillingActionAnchorId(item.key)}`}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}

        {reviewSections.map((section) => (
          <div key={section.title} className="mt-4 rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{section.title}</p>
                  <p className="mt-1 text-sm text-mute">{section.description}</p>
                </div>
                <span className="badge border-slate-200 bg-slate-50 text-slate-600">{section.rows.length} baris</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-4 py-3">Invoice / Service</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3">Tagihan / Follow Up</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {section.rows.map((row) => {
                    const action = getRowAction({
                      sectionTitle: section.title,
                      row,
                      canCreate,
                      canUpdate,
                      basePath,
                    })
                    const service = pickMeta(row.meta, 'Service: ')
                    const invoiceType = pickMeta(row.meta, 'Invoice Type: ')
                    const remaining = pickMeta(row.meta, 'Remaining: ')
                    const invoiceDue = pickMeta(row.meta, 'Invoice Due: ')
                    const followUp = pickMeta(row.meta, 'Follow Up: ')
                    const collectionStatus = pickMeta(row.meta, 'Collection Status: ')

                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                            <p className="text-xs text-slate-500">{service || '-'}</p>
                            {invoiceType ? <span className="badge border-slate-200 bg-white text-slate-600">{invoiceType}</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-900">{row.secondary}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="max-w-lg text-sm leading-6 text-slate-700">{row.detail}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex max-w-sm flex-wrap gap-2">
                            {remaining ? <span className="badge border-rose-200 bg-rose-50 text-rose-700">Remaining: {remaining}</span> : null}
                            {invoiceDue ? <span className="badge border-slate-200 bg-white text-slate-600">Due: {invoiceDue}</span> : null}
                            {followUp ? <span className="badge border-amber-200 bg-amber-50 text-amber-700">Follow Up: {followUp}</span> : null}
                            {collectionStatus ? (
                              <span className="badge border-slate-200 bg-white text-slate-600">{collectionStatus}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {action ? (
                            <button
                              type="button"
                              onClick={() =>
                                setQuickActionItem(
                                  buildBillingQuickActionPayload({
                                    sectionTitle: section.title,
                                    row,
                                    canCreate,
                                    canUpdate,
                                    basePath,
                                  }),
                                )
                              }
                              className="inline-flex items-center justify-center rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800"
                            >
                              Aksi cepat
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">Monitor</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {(canCreate || canUpdate) ? (
        <section className="space-y-4">
          <div>
            <p className="section-title">Aksi {shortLabel}</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Form operasional
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
              Default layar tetap fokus ke antrean billing. Buka panel ini hanya saat operator perlu menulis aksi.
            </p>
          </div>
          <details className="group rounded-2xl border border-line bg-white p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
              Buka panel aksi {shortLabel.toLowerCase()}
            </summary>
            <p className="mt-2 text-sm text-mute">
              Berisi `Generate Invoice`, `Update Status`, `Collection Action`, `Resolve Follow Up`, dan `Payment Entry`.
            </p>
            <div className="mt-4 grid gap-6 xl:grid-cols-2">
              {canCreate ? (
                <div id={getBillingActionAnchorId('invoice-generate')} className="scroll-mt-24">
                  <Suspense fallback={<FormModalSkeleton />}>
                    <BillingInvoiceGenerateForm
                      canCreate={canCreate}
                      reviewDbReady={reviewDbReady}
                      subscriptionSuggestions={billingSubscriptionSuggestions}
                      initialServiceNo={domainPrefill?.service}
                    />
                  </Suspense>
                </div>
              ) : null}
              {canUpdate ? (
                <div id={getBillingActionAnchorId('invoice-status')} className="scroll-mt-24">
                  <Suspense fallback={<FormModalSkeleton />}>
                    <BillingInvoiceStatusForm
                      canUpdate={canUpdate}
                      reviewDbReady={reviewDbReady}
                      invoiceSuggestions={billingStatusInvoiceSuggestions}
                      followUpSuggestions={billingCollectionFollowUpSuggestions}
                      reconnectSuggestions={billingReconnectContextSuggestions}
                      suspendBatchSuggestions={billingSuspendReadySuggestions}
                      reconnectBatchSuggestions={billingReconnectReadySuggestions}
                      initialInvoiceNo={domainPrefill?.invoice}
                    />
                  </Suspense>
                </div>
              ) : null}
              {canCreate ? (
                <div id={getBillingActionAnchorId('collection-action')} className="scroll-mt-24">
                  <Suspense fallback={<FormModalSkeleton />}>
                    <BillingCollectionActionForm
                      canCreate={canCreate}
                      reviewDbReady={reviewDbReady}
                      invoiceSuggestions={billingInvoiceSuggestions}
                      batchInvoiceSuggestions={billingCollectionSuggestions}
                      followUpSuggestions={billingCollectionFollowUpSuggestions}
                      promiseToPayBatchSuggestions={billingPromiseToPaySuggestions}
                      suspendBatchSuggestions={billingSuspendReadySuggestions}
                      reconnectBatchSuggestions={billingReconnectReadySuggestions}
                      initialInvoiceNo={domainPrefill?.invoice}
                    />
                  </Suspense>
                </div>
              ) : null}
              {canUpdate ? (
                <div id={getBillingActionAnchorId('collection-resolve')} className="scroll-mt-24">
                  <Suspense fallback={<FormModalSkeleton />}>
                    <BillingCollectionResolveForm
                      canUpdate={canUpdate}
                      reviewDbReady={reviewDbReady}
                      followUpSuggestions={billingCollectionFollowUpSuggestions}
                      initialInvoiceNo={domainPrefill?.invoice}
                    />
                  </Suspense>
                </div>
              ) : null}
              {canCreate ? (
                <div id={getBillingActionAnchorId('payment-entry')} className="scroll-mt-24">
                  <Suspense fallback={<FormModalSkeleton />}>
                    <BillingPaymentForm
                      canCreate={canCreate}
                      reviewDbReady={reviewDbReady}
                      invoiceSuggestions={billingInvoiceSuggestions}
                      followUpSuggestions={billingCollectionFollowUpSuggestions}
                      initialInvoiceNo={domainPrefill?.invoice}
                    />
                  </Suspense>
                </div>
              ) : null}
            </div>
          </details>
        </section>
      ) : null}

      <Suspense fallback={<FormModalSkeleton />}>
        <TableQuickActionModal
          item={quickActionItem}
          onClose={() => setQuickActionItem(null)}
          heading="Aksi cepat dari tabel billing"
        />
      </Suspense>

      {content.highlights.length ? (
        <details className="rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Buka info integrasi ERP / OSS / BSS
          </summary>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {content.highlights.map((item) => (
              <article key={item.title} className="rounded-xl border border-line bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {capabilities.map((item) => (
              <span
                key={item.action}
                className={`badge ${
                  item.enabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
