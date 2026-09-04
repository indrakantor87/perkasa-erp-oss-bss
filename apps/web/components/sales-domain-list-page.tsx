'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { AppRole } from '@/lib/types'

type SalesEntityKey =
  | 'leads'
  | 'orders'
  | 'quotations'
  | 'contracts'
  | 'subscriptions'
  | 'surveys'
  | 'covered-areas'
  | 'corporate-deliveries'
  | 'corporate-acceptances'

type SalesEntityPageConfig = {
  key: SalesEntityKey
  title: string
  subtitle: string
  accentTone: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate'
  breadcrumb: string
  workspaceAnchor?: string
  primaryHint: string
  emptyHint: string
}

const SALES_ENTITY_CONFIG: Record<SalesEntityKey, SalesEntityPageConfig> = {
  leads: {
    key: 'leads',
    title: 'Manajemen Sales Leads',
    subtitle: 'Pantau dan kelola pipeline prospek dari entry sampai konversi.',
    accentTone: 'sky',
    breadcrumb: 'Leads',
    workspaceAnchor: 'sales-action-lead-create',
    primaryHint: 'Lead baru masuk ke pipeline dan siap diproses ke coverage/survey.',
    emptyHint: 'Belum ada lead. Buat lead pertama melalui workspace penjualan.',
  },
  orders: {
    key: 'orders',
    title: 'Manajemen Sales Orders',
    subtitle: 'Order penjualan siap operasional (instalasi / delivery).',
    accentTone: 'emerald',
    breadcrumb: 'Orders',
    workspaceAnchor: 'sales-action-order-create',
    primaryHint: 'Order yang sudah teregistrasi siap diturunkan menjadi WO / aktivasi.',
    emptyHint: 'Belum ada order aktif. Konversi lead / survey menjadi order.',
  },
  quotations: {
    key: 'quotations',
    title: 'Corporate Quotations',
    subtitle: 'Penawaran harga corporate, approval internal, dan revisi.',
    accentTone: 'amber',
    breadcrumb: 'Quotations',
    workspaceAnchor: 'sales-action-corporate-quotation-create',
    primaryHint: 'Quotation corporate melibatkan approval sebelum ditandatangani kontrak.',
    emptyHint: 'Belum ada quotation corporate. Buat melalui workspace sales corporate.',
  },
  contracts: {
    key: 'contracts',
    title: 'Corporate Contracts',
    subtitle: 'Kontrak corporate yang sudah ditandatangani sebagai acuan delivery.',
    accentTone: 'violet',
    breadcrumb: 'Contracts',
    workspaceAnchor: 'sales-action-corporate-contract-create',
    primaryHint: 'Kontrak terkunci menjadi baseline milestone delivery dan acceptance.',
    emptyHint: 'Belum ada kontrak corporate. Tandatangani kontrak dari quotation yang approved.',
  },
  subscriptions: {
    key: 'subscriptions',
    title: 'Service Subscriptions',
    subtitle: 'Layanan pelanggan aktif (recurring, status, perangkat, SLA).',
    accentTone: 'emerald',
    breadcrumb: 'Subscriptions',
    workspaceAnchor: 'sales-action-subscription-activate',
    primaryHint: 'Subscription aktif = billing recurring + support ticketing + WO maintenance.',
    emptyHint: 'Belum ada subscription aktif. Aktivasi dari order / instalasi selesai.',
  },
  surveys: {
    key: 'surveys',
    title: 'Survey Lapangan',
    subtitle: 'Jadwal survey teknis, catatan lokasi, dan hasil survey.',
    accentTone: 'amber',
    breadcrumb: 'Surveys',
    workspaceAnchor: 'sales-action-survey-create',
    primaryHint: 'Survey teknis menentukan kesiapan instalasi dan material yang dibutuhkan.',
    emptyHint: 'Belum ada survey terjadwal. Jadwalkan dari lead yang lolos coverage.',
  },
  'covered-areas': {
    key: 'covered-areas',
    title: 'Coverage Area Validasi',
    subtitle: 'Pengecekan cakupan jaringan, kapasitas port, dan ketersediaan ODP.',
    accentTone: 'sky',
    breadcrumb: 'Covered Areas',
    workspaceAnchor: 'sales-action-coverage-create',
    primaryHint: 'Validasi coverage adalah gate sebelum survey teknis dijadwalkan.',
    emptyHint: 'Belum ada coverage yang tervalidasi. Mulai dengan input coverage dari lead.',
  },
  'corporate-deliveries': {
    key: 'corporate-deliveries',
    title: 'Corporate Delivery Milestones',
    subtitle: 'Pantau milestone delivery corporate (perangkat, circuit, UAT).',
    accentTone: 'violet',
    breadcrumb: 'Corporate Deliveries',
    workspaceAnchor: 'sales-action-corporate-delivery-create',
    primaryHint: 'Delivery corporate mengikuti milestone kontrak sampai acceptance.',
    emptyHint: 'Belum ada delivery milestone. Catat dari kontrak corporate yang aktif.',
  },
  'corporate-acceptances': {
    key: 'corporate-acceptances',
    title: 'Corporate Acceptance & UAT',
    subtitle: 'Hasil testing/UAT, tanda terima, dan sign-off sebelum go-live.',
    accentTone: 'emerald',
    breadcrumb: 'Corporate Acceptances',
    workspaceAnchor: 'sales-action-corporate-acceptance-create',
    primaryHint: 'Acceptance corporate adalah gate terakhir sebelum aktivasi layanan penuh.',
    emptyHint: 'Belum ada acceptance corporate. Catat setelah semua milestone delivery selesai.',
  },
}

function getToneClasses(tone: SalesEntityPageConfig['accentTone']) {
  switch (tone) {
    case 'sky':
      return {
        badge: 'bg-sky-100 text-sky-700 border-sky-200',
        accent: 'bg-sky-600 hover:bg-sky-700 text-white',
        subtle: 'bg-sky-50 border-sky-200 text-sky-800',
        ring: 'ring-sky-100',
      }
    case 'emerald':
      return {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        accent: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        subtle: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        ring: 'ring-emerald-100',
      }
    case 'amber':
      return {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        accent: 'bg-amber-600 hover:bg-amber-700 text-white',
        subtle: 'bg-amber-50 border-amber-200 text-amber-800',
        ring: 'ring-amber-100',
      }
    case 'rose':
      return {
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        accent: 'bg-rose-600 hover:bg-rose-700 text-white',
        subtle: 'bg-rose-50 border-rose-200 text-rose-800',
        ring: 'ring-rose-100',
      }
    case 'violet':
      return {
        badge: 'bg-violet-100 text-violet-700 border-violet-200',
        accent: 'bg-violet-600 hover:bg-violet-700 text-white',
        subtle: 'bg-violet-50 border-violet-200 text-violet-800',
        ring: 'ring-violet-100',
      }
    case 'slate':
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        accent: 'bg-slate-700 hover:bg-slate-800 text-white',
        subtle: 'bg-slate-50 border-slate-200 text-slate-800',
        ring: 'ring-slate-100',
      }
  }
}

const SalesLeadCreateForm = dynamic(
  () => import('@/components/sales-lead-create-form').then((mod) => mod.SalesLeadCreateForm),
  { ssr: false, loading: () => <SalesFormSkeleton label="Sales Lead Create Form" /> },
)
const SalesOrderCreateForm = dynamic(
  () => import('@/components/sales-order-create-form').then((mod) => mod.SalesOrderCreateForm),
  { ssr: false, loading: () => <SalesFormSkeleton label="Sales Order Create Form" /> },
)
const SalesCorporateQuotationCreateForm = dynamic(
  () =>
    import('@/components/sales-corporate-quotation-create-form').then(
      (mod) => mod.SalesCorporateQuotationCreateForm,
    ),
  { ssr: false, loading: () => <SalesFormSkeleton label="Corporate Quotation Create Form" /> },
)
const SalesCorporateQuotationApprovalForm = dynamic(
  () =>
    import('@/components/sales-corporate-quotation-approval-form').then(
      (mod) => mod.SalesCorporateQuotationApprovalForm,
    ),
  { ssr: false, loading: () => <SalesFormSkeleton label="Quotation Approval Form" /> },
)
const SalesCorporateContractCreateForm = dynamic(
  () =>
    import('@/components/sales-corporate-contract-create-form').then(
      (mod) => mod.SalesCorporateContractCreateForm,
    ),
  { ssr: false, loading: () => <SalesFormSkeleton label="Corporate Contract Create Form" /> },
)
const SalesSubscriptionActivateForm = dynamic(
  () =>
    import('@/components/sales-subscription-activate-form').then(
      (mod) => mod.SalesSubscriptionActivateForm,
    ),
  { ssr: false, loading: () => <SalesFormSkeleton label="Subscription Activate Form" /> },
)
const SalesSurveyCreateForm = dynamic(
  () => import('@/components/sales-survey-create-form').then((mod) => mod.SalesSurveyCreateForm),
  { ssr: false, loading: () => <SalesFormSkeleton label="Survey Create Form" /> },
)
const SalesCoverageCreateForm = dynamic(
  () => import('@/components/sales-coverage-create-form').then((mod) => mod.SalesCoverageCreateForm),
  { ssr: false, loading: () => <SalesFormSkeleton label="Coverage Create Form" /> },
)
const SalesCorporateDeliveryCreateForm = dynamic(
  () =>
    import('@/components/sales-corporate-delivery-create-form').then(
      (mod) => mod.SalesCorporateDeliveryCreateForm,
    ),
  { ssr: false, loading: () => <SalesFormSkeleton label="Corporate Delivery Create Form" /> },
)
const SalesCorporateAcceptanceCreateForm = dynamic(
  () =>
    import('@/components/sales-corporate-acceptance-create-form').then(
      (mod) => mod.SalesCorporateAcceptanceCreateForm,
    ),
  { ssr: false, loading: () => <SalesFormSkeleton label="Corporate Acceptance Create Form" /> },
)

function SalesFormSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <p className="mt-2 text-xs text-slate-500">Memuat {label}…</p>
    </div>
  )
}

type SalesDomainListPageProps = {
  entityKey: SalesEntityKey
  role: AppRole
  displayName: string
  username: string
  canCreate: boolean
  canUpdate: boolean
  canApprove: boolean
  canExport: boolean
  reviewDbReady: boolean
  isLoading?: boolean
  errorMessage?: string | null
  rows?: Array<{ id: string; primary: string; secondary: string; status: string; updatedAt: string }>
}

const EMPTY_ROWS: NonNullable<SalesDomainListPageProps['rows']> = []

function isStatusClosed(status: string): boolean {
  const s = status.trim().toUpperCase()
  return s.includes('CLOSE') || s.includes('COMPLETED') || s.includes('SIGNED') || s.includes('ACTIVE') || s.includes('CANCELLED') || s.includes('REJECTED') || s.includes('VOID') || s.includes('CONVERTED') || s.includes('DONE') || s.includes('ARCHIVED')
}

function isQuotationApprovable(status: string): boolean {
  const s = status.trim().toUpperCase()
  return s.includes('PENDING') || s.includes('DRAFT') || s.includes('REVIEW') || s.includes('SUBMITTED') || status.trim() === ''
}

type SalesStageLink = {
  label: string
  href: string
  accentTone: SalesEntityPageConfig['accentTone']
}

function buildRowNextStageLinks(
  entityKey: SalesEntityKey,
  row: { id: string; primary: string; secondary: string; status: string },
): SalesStageLink[] {
  if (isStatusClosed(row.status)) return []
  const idQp = encodeURIComponent(row.id)
  const primaryQp = encodeURIComponent(row.primary)
  const secondaryQp = encodeURIComponent(row.secondary)
  const prefill = (anchorId: string, extras: string = '') =>
    `/sales#${anchorId}?fromEntity=${entityKey}&fromId=${idQp}&fromPrimary=${primaryQp}&fromSecondary=${secondaryQp}${extras}`

  switch (entityKey) {
    case 'leads':
      return [
        {
          label: 'Validasi Coverage',
          href: prefill('sales-action-coverage-create'),
          accentTone: 'sky',
        },
      ]
    case 'covered-areas':
      return [
        {
          label: 'Jadwalkan Survey',
          href: prefill('sales-action-survey-create'),
          accentTone: 'amber',
        },
      ]
    case 'surveys':
      return [
        {
          label: 'Buat Order',
          href: prefill('sales-action-order-create'),
          accentTone: 'emerald',
        },
      ]
    case 'orders':
      return [
        {
          label: 'Buat Work Order',
          href: prefill('sales-action-work-order-create'),
          accentTone: 'sky',
        },
        {
          label: 'Aktivasi Subscription',
          href: prefill('sales-action-subscription-activate', `&serviceNo=${primaryQp}`),
          accentTone: 'emerald',
        },
      ]
    case 'quotations':
      return [
        {
          label: 'Buat Kontrak',
          href: prefill('sales-action-corporate-contract-create'),
          accentTone: 'violet',
        },
      ]
    case 'contracts':
      return [
        {
          label: 'Catat Delivery Milestone',
          href: prefill('sales-action-corporate-delivery-create'),
          accentTone: 'violet',
        },
      ]
    case 'corporate-deliveries':
      return [
        {
          label: 'Catat Acceptance / UAT',
          href: prefill('sales-action-corporate-acceptance-create'),
          accentTone: 'emerald',
        },
      ]
    case 'subscriptions':
      return [
        {
          label: 'Buka Customer Profile',
          href: `/[domain]?focus=customer&q=${primaryQp}`.replace('/[domain]', '/customers'),
          accentTone: 'emerald',
        },
      ]
    case 'corporate-acceptances':
    default:
      return []
  }
}

export function SalesDomainListPage(props: SalesDomainListPageProps) {
  const {
    entityKey,
    role,
    displayName,
    username,
    canCreate,
    canUpdate,
    canApprove,
    canExport,
    reviewDbReady,
    isLoading = false,
    errorMessage = null,
    rows = EMPTY_ROWS,
  } = props

  const config = SALES_ENTITY_CONFIG[entityKey]
  const tone = useMemo(() => getToneClasses(config.accentTone), [config.accentTone])

  const [showCreate, setShowCreate] = useState<boolean>(Boolean(canCreate))
  const hasWriteAny = canCreate || canUpdate || canApprove
  const hasViewAny = canExport || canCreate || canUpdate || canApprove

  const defaultSalesOwner = `${displayName} (${username})`
  const workspaceHref = config.workspaceAnchor ? `/sales#${config.workspaceAnchor}` : '/sales'

  function renderFormByEntity() {
    const canSignContract = canUpdate || canApprove
    switch (entityKey) {
      case 'leads':
        return (
          <SalesLeadCreateForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            marketingSuggestions={[]}
          />
        )
      case 'orders':
        return (
          <SalesOrderCreateForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            leadSuggestions={[]}
            marketingSuggestions={[]}
            initialLeadValue=""
          />
        )
      case 'quotations':
        return (
          <div id="sales-page-action-corporate-quotation-approval" className="space-y-6">
            <SalesCorporateQuotationCreateForm
              canCreate={canCreate}
              reviewDbReady={reviewDbReady}
              leadSuggestions={[]}
              initialLeadValue=""
            />
            <SalesCorporateQuotationApprovalForm
              canApprove={canApprove}
              reviewDbReady={reviewDbReady}
            />
          </div>
        )
      case 'contracts':
        return (
          <SalesCorporateContractCreateForm
            canSign={canSignContract}
            reviewDbReady={reviewDbReady}
          />
        )
      case 'subscriptions':
        return (
          <SalesSubscriptionActivateForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            orderSuggestions={[]}
            initialOrderValue=""
          />
        )
      case 'surveys':
        return (
          <SalesSurveyCreateForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            leadSuggestions={[]}
            initialLeadValue=""
          />
        )
      case 'covered-areas':
        return (
          <SalesCoverageCreateForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            leadSuggestions={[]}
            initialLeadValue=""
          />
        )
      case 'corporate-deliveries':
        return (
          <SalesCorporateDeliveryCreateForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
          />
        )
      case 'corporate-acceptances':
        return (
          <SalesCorporateAcceptanceCreateForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
          />
        )
    }
  }

  function renderStateBody() {
    if (isLoading) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto h-3 w-48 animate-pulse rounded-full bg-amber-200" />
          <p className="mt-3 text-sm font-medium text-amber-800">Memuat data {config.breadcrumb}…</p>
          <p className="mt-1 text-xs text-amber-700/80">Tunggu sebentar, menyiapkan list dan formulir.</p>
        </div>
      )
    }
    if (errorMessage) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">Gagal memuat data {config.breadcrumb}</h3>
          <p className="mt-2 text-sm text-rose-700/90">{errorMessage}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/sales"
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${tone.accent}`}
            >
              Kembali ke Workspace Penjualan
            </Link>
          </div>
        </div>
      )
    }
    if (!hasViewAny) {
      return (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-8 text-center">
          <p className="text-sm font-semibold text-sky-800">Akses terbatas</p>
          <p className="mt-2 text-sm text-sky-700/90">
            Role <span className="font-mono">{role}</span> tidak memiliki izin untuk mengelola {config.breadcrumb}.
          </p>
          <p className="mt-3 text-xs text-sky-700/75">
            Hubungi admin jika menurut Anda ini kesalahan konfigurasi permission matrix.
          </p>
        </div>
      )
    }
    if (rows.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-700">{config.emptyHint}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {canCreate ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${tone.accent}`}
              >
                Buat Entri Pertama
              </button>
            ) : null}
            <Link
              href={workspaceHref}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Buka Workspace Penjualan
            </Link>
          </div>
        </div>
      )
    }
    return (
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-inset ${tone.ring}`}>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">ID</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Primary</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Keterangan</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Diperbarui</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const nextStages = buildRowNextStageLinks(entityKey, row)
              const hasNext = nextStages.length > 0
              const allowTransition = !isStatusClosed(row.status) && (canCreate || canUpdate || canApprove)
              const showApproval = entityKey === 'quotations' && canApprove && isQuotationApprovable(row.status)
              return (
                <tr key={row.id} className="hover:bg-slate-50/60 align-top">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.primary}</td>
                  <td className="px-4 py-3 text-slate-600">{row.secondary}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone.badge}`}>
                      {row.status || '—'}
                    </span>
                    {hasNext && allowTransition ? (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                        Next action tersedia
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.updatedAt || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {nextStages.map((stage) => {
                        const stageTone = getToneClasses(stage.accentTone)
                        const enabled = allowTransition && (canCreate || canUpdate || canApprove)
                        return (
                          <Link
                            key={stage.label}
                            href={enabled ? stage.href : '#'}
                            aria-disabled={!enabled}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-inset transition ${
                              enabled
                                ? `${stageTone.accent}`
                                : 'pointer-events-none cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                            title={
                              !enabled
                                ? 'Aksi tidak tersedia: status sudah tutup atau role belum izin create/update/approve.'
                                : `Lanjutkan ${config.breadcrumb} ke ${stage.label} — prefill dari row ${row.id}.`
                            }
                          >
                            → {stage.label}
                          </Link>
                        )
                      })}
                      {showApproval ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreate(true)
                            setTimeout(() => {
                              const el = document.getElementById(
                                'sales-page-action-corporate-quotation-approval',
                              )
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }, 50)
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-inset transition ${getToneClasses('amber').accent}`}
                          title={`Buka panel approval untuk quotation ${row.id}.`}
                        >
                          ✓ Proses Approval
                        </button>
                      ) : null}
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreate(true)
                            setTimeout(() => {
                              const anchor = document.getElementById(
                                config.workspaceAnchor?.replace(/^sales-action-/, 'sales-page-action-') ??
                                  'sales-page-form',
                              )
                              if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }, 50)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          title="Buka formulir pada halaman ini untuk entri / revisi lanjutan (prefill secara manual dari row ID)."
                        >
                          ⇅ Buka Formulir Halaman
                        </button>
                      ) : null}
                      <Link
                        href={workspaceHref}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        title="Lihat konteks kerja lengkap dan seluruh alur pipeline di Workspace Penjualan."
                      >
                        ↗ Workspace
                      </Link>
                      {!allowTransition && nextStages.length === 0 && !showApproval && !canUpdate ? (
                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                          Read-only / Final
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/sales"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              ← Workspace Penjualan
            </Link>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone.badge}`}>
              {config.breadcrumb}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{config.title}</h1>
          <p className="max-w-3xl text-sm text-slate-600">{config.subtitle}</p>
          <p className={`inline-flex rounded-xl border px-3 py-1.5 text-xs font-medium ${tone.subtle}`}>
            {config.primaryHint}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${tone.accent}`}
            >
              {showCreate ? 'Sembunyikan Form' : 'Tampilkan Form Entri'}
            </button>
          ) : null}
          {canExport ? (
            <button
              type="button"
              disabled={!reviewDbReady}
              title={!reviewDbReady ? 'Review DB belum siap — export dinonaktifkan.' : undefined}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export Excel
            </button>
          ) : null}
          {!hasWriteAny ? (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
              Read-only
            </span>
          ) : null}
        </div>
      </header>

      <section className="space-y-4">
        {renderStateBody()}
      </section>

      {showCreate && hasWriteAny ? (
        <section
          id={config.workspaceAnchor?.replace(/^sales-action-/, 'sales-page-action-') ?? undefined}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Formulir {config.breadcrumb}</h2>
              <p className="text-xs text-slate-500">
                Menggunakan formulir existing — tidak dibuat duplikat modul baru.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {canCreate ? (
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  CAN CREATE
                </span>
              ) : null}
              {canUpdate ? (
                <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
                  CAN UPDATE
                </span>
              ) : null}
              {canApprove ? (
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                  CAN APPROVE
                </span>
              ) : null}
              <span
                className={`rounded-lg border px-2.5 py-1 font-medium ${
                  reviewDbReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                DB: {reviewDbReady ? 'READY' : 'STAGING FALLBACK'}
              </span>
            </div>
          </div>
          {renderFormByEntity()}
        </section>
      ) : null}
    </div>
  )
}

export type { SalesEntityKey, SalesDomainListPageProps, SalesEntityPageConfig }
export { SALES_ENTITY_CONFIG, getToneClasses }
