'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SalesCorporateAcceptanceCreateForm } from '@/components/sales-corporate-acceptance-create-form'
import { SalesCorporateContractCreateForm } from '@/components/sales-corporate-contract-create-form'
import { SalesCorporateDeliveryCreateForm } from '@/components/sales-corporate-delivery-create-form'
import { SalesCorporateQuotationApprovalForm } from '@/components/sales-corporate-quotation-approval-form'
import { SalesCorporateQuotationCreateForm } from '@/components/sales-corporate-quotation-create-form'
import { SalesCoverageCreateForm } from '@/components/sales-coverage-create-form'
import { SalesLeadCreateForm } from '@/components/sales-lead-create-form'
import { SalesOrderCreateForm } from '@/components/sales-order-create-form'
import { SalesSubscriptionActivateForm } from '@/components/sales-subscription-activate-form'
import { SalesSurveyCreateForm } from '@/components/sales-survey-create-form'
import { SalesWorkOrderCreateForm } from '@/components/sales-work-order-create-form'
import { TableQuickActionModal, type TableQuickActionPayload } from '@/components/table-quick-action-modal'
import type {
  AppRole,
  DataSourceSnapshot,
  DomainCapability,
  DomainFormPrefill,
  DomainPageContent,
  DomainReviewRow,
} from '@/lib/types'

function getSalesActionAnchorId(
  key:
    | 'lead-create'
    | 'coverage-create'
    | 'survey-create'
    | 'order-create'
    | 'work-order-create'
    | 'subscription-activate'
    | 'corporate-quotation-create'
    | 'corporate-quotation-approval'
    | 'corporate-contract-create'
    | 'corporate-delivery-create'
    | 'corporate-acceptance-create',
) {
  return `sales-action-${key}`
}

function buildPrefillHref(anchorId: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) {
      searchParams.set(key, normalized)
    }
  })
  const queryText = searchParams.toString()
  return `${queryText ? `?${queryText}` : ''}#${anchorId}`
}

function extractEntityValueFromRowId(rowId: string, prefix: string) {
  const normalizedPrefix = `${prefix.trim().toUpperCase()}-`
  const normalizedRowId = rowId.trim().toUpperCase()
  if (!normalizedRowId.startsWith(normalizedPrefix)) {
    return ''
  }
  return rowId.slice(normalizedPrefix.length).trim()
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.replace(prefix, '').trim() || ''
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OVERDUE') || normalized.includes('FAILED') || normalized.includes('BLOCKED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized.includes('ACTIVE') || normalized.includes('OPEN') || normalized.includes('PROGRESS')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (normalized.includes('PENDING') || normalized.includes('REVIEW') || normalized.includes('HOLD')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('DONE') || normalized.includes('CLOSE') || normalized.includes('PAID') || normalized.includes('SUCCESS')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

type SalesActionPermission = {
  canCreate: boolean
  canUpdate: boolean
}

function getSectionAction(sectionTitle: string, permission: SalesActionPermission) {
  const title = sectionTitle.trim().toUpperCase()
  if (!permission.canCreate && !permission.canUpdate) return null

  if (title.includes('ACCEPTANCE') && title.includes('CORPORATE')) {
    if (!permission.canUpdate) return null
    return {
      key: 'corporate-acceptance-create' as const,
      label: 'Catat Acceptance',
      description: 'Catat hasil testing/UAT corporate sebelum aktivasi dilakukan.',
    }
  }
  if (title.includes('DELIVERY') && title.includes('CORPORATE')) {
    if (!permission.canCreate) return null
    return {
      key: 'corporate-delivery-create' as const,
      label: 'Input Milestone',
      description: 'Catat milestone delivery corporate agar tidak bercampur dengan instalasi home.',
    }
  }
  if (title.includes('KONTRAK') && title.includes('CORPORATE')) {
    if (!permission.canUpdate) return null
    return {
      key: 'corporate-contract-create' as const,
      label: 'Tandatangani Kontrak',
      description: 'Kunci kontrak corporate sebagai guardrail sebelum delivery dimulai.',
    }
  }
  if (title.includes('QUOTATION') && title.includes('CORPORATE')) {
    if (!permission.canCreate) return null
    return {
      key: 'corporate-quotation-create' as const,
      label: 'Buat Quotation',
      description: 'Buat quotation corporate dan dorong ke approval internal.',
    }
  }
  if (title.includes('LEAD') && title.includes('COVERAGE')) {
    if (!permission.canCreate) return null
    return { key: 'coverage-create' as const, label: 'Input Coverage', description: 'Lanjutkan lead yang perlu validasi cakupan area.' }
  }
  if (title.includes('SURVEY')) {
    if (!permission.canCreate) return null
    return { key: 'survey-create' as const, label: 'Jadwalkan Survey', description: 'Dorong prospek yang sudah lolos coverage ke survey lapangan.' }
  }
  if (title.includes('WORK ORDER')) {
    if (!permission.canCreate) return null
    return { key: 'work-order-create' as const, label: 'Buat Work Order', description: 'Turunkan order siap instalasi menjadi work order lapangan.' }
  }
  if (title.includes('SUBSCRIPTION') || title.includes('AKTIVASI')) {
    if (!permission.canCreate) return null
    return { key: 'subscription-activate' as const, label: 'Aktivasi Subscription', description: 'Finalisasi order yang sudah siap masuk ke layanan aktif.' }
  }
  if (title.includes('ORDER')) {
    if (!permission.canCreate) return null
    return { key: 'order-create' as const, label: 'Buat Order', description: 'Konversi lead atau survey yang siap menjadi order operasional.' }
  }
  if (title.includes('LEAD')) {
    if (!permission.canCreate) return null
    return { key: 'lead-create' as const, label: 'Tambah Lead', description: 'Catat prospek baru agar pipeline penjualan tetap terisi.' }
  }
  return null
}

function isSectionAction(
  value: ReturnType<typeof getSectionAction>,
): value is NonNullable<ReturnType<typeof getSectionAction>> {
  return value !== null
}

function getRowAction(sectionTitle: string, row: DomainReviewRow, permission: SalesActionPermission) {
  const title = sectionTitle.trim().toUpperCase()
  const rowStatus = row.status.trim().toUpperCase()
  const orderId = pickMeta(row.meta, 'Order ID: ')
  const orderCode = pickMeta(row.meta, 'Order: ')

  if (!permission.canCreate && !permission.canUpdate) return null

  if (title.includes('ACCEPTANCE') && title.includes('CORPORATE')) {
    if (!permission.canUpdate) return null
    return {
      label: 'Catat Acceptance',
      href: buildPrefillHref(getSalesActionAnchorId('corporate-acceptance-create'), {}),
    }
  }
  if (title.includes('DELIVERY') && title.includes('CORPORATE')) {
    if (!permission.canCreate) return null
    return {
      label: 'Update Delivery',
      href: buildPrefillHref(getSalesActionAnchorId('corporate-delivery-create'), {}),
    }
  }
  if (title.includes('KONTRAK') && title.includes('CORPORATE')) {
    if (!permission.canUpdate) return null
    return {
      label: 'Update Kontrak',
      href: buildPrefillHref(getSalesActionAnchorId('corporate-contract-create'), {}),
    }
  }
  if (title.includes('QUOTATION') && title.includes('CORPORATE')) {
    const needsApproval = rowStatus.includes('INTERNAL') || rowStatus.includes('APPROVAL')
    if (needsApproval && permission.canUpdate) {
      return {
        label: 'Approve Quotation',
        href: buildPrefillHref(getSalesActionAnchorId('corporate-quotation-approval'), {}),
      }
    }
    if (!permission.canCreate) return null
    return {
      label: 'Update Quotation',
      href: buildPrefillHref(getSalesActionAnchorId('corporate-quotation-create'), {}),
    }
  }
  if (title.includes('WORK ORDER') || rowStatus.includes('WORK_ORDER')) {
    if (!permission.canCreate) return null
    return {
      label: 'Lanjutkan WO',
      href: buildPrefillHref(getSalesActionAnchorId('work-order-create'), {
        order: orderCode || orderId || row.primary,
      }),
    }
  }
  if (title.includes('SUBSCRIPTION') || title.includes('AKTIVASI') || rowStatus.includes('ACTIV')) {
    if (!permission.canCreate) return null
    return {
      label: 'Aktivasi',
      href: buildPrefillHref(getSalesActionAnchorId('subscription-activate'), {
        order: orderCode || orderId || row.primary,
      }),
    }
  }
  if (title.includes('ORDER') || rowStatus.includes('ORDER')) {
    if (!permission.canCreate) return null
    return {
      label: 'Proses Order',
      href: buildPrefillHref(getSalesActionAnchorId('order-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
        order: orderId || row.primary,
      }),
    }
  }
  if (title.includes('SURVEY') || rowStatus.includes('SURVEY')) {
    if (!permission.canCreate) return null
    return {
      label: 'Proses Survey',
      href: buildPrefillHref(getSalesActionAnchorId('survey-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
      }),
    }
  }
  if (title.includes('COVERAGE') || rowStatus.includes('COVERAGE')) {
    if (!permission.canCreate) return null
    return {
      label: 'Proses Coverage',
      href: buildPrefillHref(getSalesActionAnchorId('coverage-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
      }),
    }
  }
  if (title.includes('LEAD') || rowStatus.includes('LEAD')) {
    if (!permission.canCreate) return null
    return {
      label: 'Tindak Lead',
      href: buildPrefillHref(getSalesActionAnchorId('lead-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
      }),
    }
  }
  return null
}

function buildSalesQuickActionPayload(params: {
  sectionTitle: string
  row: DomainReviewRow
  permission: SalesActionPermission
}): TableQuickActionPayload {
  const action = getRowAction(params.sectionTitle, params.row, params.permission)
  const primaryMeta = params.row.meta.slice(0, 4)

  return {
    id: params.row.id,
    title: params.row.primary,
    subtitle: params.row.secondary,
    description: params.row.detail,
    draftLabel: 'Referensi',
    draftSeed: [params.sectionTitle, ...primaryMeta].filter(Boolean).join('\n'),
    badges: [
      { label: params.sectionTitle },
      { label: params.row.status, tone: getStatusTone(params.row.status) },
    ],
    sections: [
      {
        title: 'Status',
        value: params.row.status,
      },
      {
        title: 'Section',
        value: params.sectionTitle,
      },
      {
        title: 'Keterangan',
        value: params.row.detail,
      },
      {
        title: 'PIC / Konteks',
        value: primaryMeta.join('\n') || '-',
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

function getSectionRowsByKeyword(sections: DomainPageContent['reviewSections'], keyword: string) {
  return (sections ?? [])
    .filter((section) => section.title.toUpperCase().includes(keyword.toUpperCase()))
    .flatMap((section) => section.rows)
}

function buildSalesConsoleStats(sections: DomainPageContent['reviewSections']) {
  const categorizedSections = (sections ?? []).map((section) => ({
    title: section.title.toUpperCase(),
    rows: section.rows,
  }))
  const leadRows = categorizedSections
    .filter((section) => section.title.startsWith('LEAD '))
    .flatMap((section) => section.rows)
  const coverageRows = categorizedSections
    .filter((section) => section.title.startsWith('COVERAGE '))
    .flatMap((section) => section.rows)
  const flowRows = categorizedSections
    .filter(
      (section) =>
        section.title.startsWith('SURVEY ') ||
        (section.title.startsWith('ORDER ') && !section.title.startsWith('WORK ORDER ')),
    )
    .flatMap((section) => section.rows)
    .filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index)
  const workOrderRows = categorizedSections
    .filter((section) => section.title.startsWith('WORK ORDER '))
    .flatMap((section) => section.rows)
  const activationRows = categorizedSections
    .filter((section) => section.title.startsWith('SUBSCRIPTION AKTIVASI '))
    .flatMap((section) => section.rows)
  const marketingNames = Array.from(
    new Set(
      (sections ?? [])
        .flatMap((section) => section.rows)
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter(Boolean),
    ),
  )

  return {
    leadCount: leadRows.length,
    coverageCount: coverageRows.length,
    flowCount: flowRows.length,
    workOrderCount: workOrderRows.length,
    activationCount: activationRows.filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index).length,
    marketingCount: marketingNames.length,
  }
}

function classifySalesPipelineStatus(status: string, sectionTitle: string) {
  const normalizedStatus = status.trim().toUpperCase()
  const normalizedSection = sectionTitle.trim().toUpperCase()

  if (
    normalizedStatus.includes('DONE') ||
    normalizedStatus.includes('CLOSE') ||
    normalizedStatus.includes('PAID') ||
    normalizedStatus.includes('SUCCESS') ||
    normalizedStatus.includes('ACTIVE') ||
    normalizedSection.includes('AKTIVASI')
  ) {
    return 'CLOSE'
  }

  if (
    normalizedStatus.includes('PROGRESS') ||
    normalizedStatus.includes('WORK_ORDER') ||
    normalizedStatus.includes('SURVEY') ||
    normalizedStatus.includes('ORDER') ||
    normalizedSection.includes('SURVEY') ||
    normalizedSection.includes('ORDER') ||
    normalizedSection.includes('WORK ORDER')
  ) {
    return 'ON_PROGRESS'
  }

  return 'OPEN'
}

function buildSalesTicketListStats(sections: DomainPageContent['reviewSections']) {
  let openCount = 0
  let onProgressCount = 0
  let closeCount = 0

  for (const section of sections ?? []) {
    for (const row of section.rows) {
      const bucket = classifySalesPipelineStatus(row.status, section.title)
      if (bucket === 'OPEN') openCount += 1
      if (bucket === 'ON_PROGRESS') onProgressCount += 1
      if (bucket === 'CLOSE') closeCount += 1
    }
  }

  return { openCount, onProgressCount, closeCount }
}

function getSalesBucketRank(bucket: 'OPEN' | 'ON_PROGRESS' | 'CLOSE') {
  if (bucket === 'OPEN') return 1
  if (bucket === 'ON_PROGRESS') return 2
  return 3
}

function getSalesBucketTone(bucket: 'OPEN' | 'ON_PROGRESS' | 'CLOSE') {
  if (bucket === 'OPEN') return 'border-l-4 border-red-500/80'
  if (bucket === 'ON_PROGRESS') return 'border-l-4 border-blue-500/80'
  return 'border-l-4 border-green-500/80'
}

function getSalesBucketPillTone(bucket: 'OPEN' | 'ON_PROGRESS' | 'CLOSE') {
  if (bucket === 'OPEN') return 'border-red-500/60 bg-red-500/10 text-red-100'
  if (bucket === 'ON_PROGRESS') return 'border-blue-500/60 bg-blue-500/10 text-blue-100'
  return 'border-green-500/60 bg-green-500/10 text-green-100'
}

function getSalesBucketLabel(bucket: 'OPEN' | 'ON_PROGRESS' | 'CLOSE') {
  if (bucket === 'ON_PROGRESS') return 'ON PROGRESS'
  return bucket
}

function getSalesStageRank(sectionTitle: string) {
  const normalized = sectionTitle.trim().toUpperCase()
  if (normalized.includes('LEAD')) return 1
  if (normalized.includes('COVERAGE')) return 2
  if (normalized.includes('SURVEY')) return 3
  if (normalized.includes('QUOTATION') && normalized.includes('CORPORATE')) return 4
  if (normalized.includes('KONTRAK') && normalized.includes('CORPORATE')) return 5
  if (normalized.includes('DELIVERY') && normalized.includes('CORPORATE')) return 6
  if (normalized.includes('ACCEPTANCE') && normalized.includes('CORPORATE')) return 7
  if (normalized.includes('ORDER') && !normalized.includes('WORK ORDER')) return 8
  if (normalized.includes('WORK ORDER')) return 9
  if (normalized.includes('AKTIVASI') || normalized.includes('SUBSCRIPTION')) return 10
  return 99
}

function getSalesStageLabel(sectionTitle: string) {
  const normalized = sectionTitle.trim().toUpperCase()
  if (normalized.includes('LEAD')) return 'Lead'
  if (normalized.includes('COVERAGE')) return 'Coverage'
  if (normalized.includes('SURVEY')) return 'Survey'
  if (normalized.includes('QUOTATION') && normalized.includes('CORPORATE')) return 'Quotation'
  if (normalized.includes('KONTRAK') && normalized.includes('CORPORATE')) return 'Kontrak'
  if (normalized.includes('DELIVERY') && normalized.includes('CORPORATE')) return 'Delivery'
  if (normalized.includes('ACCEPTANCE') && normalized.includes('CORPORATE')) return 'Acceptance'
  if (normalized.includes('WORK ORDER')) return 'WO'
  if (normalized.includes('AKTIVASI') || normalized.includes('SUBSCRIPTION')) return 'Close'
  if (normalized.includes('ORDER')) return 'Order'
  return sectionTitle
}

function getSalesDateLabel(sectionTitle: string) {
  const normalized = sectionTitle.trim().toUpperCase()
  if (normalized.includes('QUOTATION') && normalized.includes('CORPORATE')) return 'Tgl Quotation'
  if (normalized.includes('KONTRAK') && normalized.includes('CORPORATE')) return 'Tgl Kontrak'
  if (normalized.includes('DELIVERY') && normalized.includes('CORPORATE')) return 'Jadwal Delivery'
  if (normalized.includes('ACCEPTANCE') && normalized.includes('CORPORATE')) return 'Tgl Acceptance'
  if (normalized.includes('SURVEY')) return 'Jadwal Survey'
  if (normalized.includes('WORK ORDER')) return 'Jadwal WO'
  if (normalized.includes('AKTIVASI') || normalized.includes('SUBSCRIPTION')) return 'Tgl Aktivasi'
  if (normalized.includes('ORDER')) return 'Tgl Order'
  return 'Update'
}

function getSalesDateValue(sectionTitle: string, meta: string[]) {
  const normalized = sectionTitle.trim().toUpperCase()
  if (normalized.includes('QUOTATION') && normalized.includes('CORPORATE')) return pickMeta(meta, 'Created: ')
  if (normalized.includes('KONTRAK') && normalized.includes('CORPORATE')) return pickMeta(meta, 'Signed: ')
  if (normalized.includes('DELIVERY') && normalized.includes('CORPORATE')) return pickMeta(meta, 'Planned: ') || pickMeta(meta, 'Completed: ')
  if (normalized.includes('ACCEPTANCE') && normalized.includes('CORPORATE'))
    return pickMeta(meta, 'Accepted: ') || pickMeta(meta, 'Tested: ')
  if (normalized.includes('WORK ORDER')) return pickMeta(meta, 'Scheduled: ')
  if (normalized.includes('AKTIVASI') || normalized.includes('SUBSCRIPTION')) return pickMeta(meta, 'Aktivasi: ')
  if (normalized.includes('ORDER') || normalized.includes('SURVEY')) return pickMeta(meta, 'At: ')
  return ''
}

function buildCsvCell(value: string) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

function exportSalesTicketList(
  rows: Array<{
    stageLabel: string
    bucket: 'OPEN' | 'ON_PROGRESS' | 'CLOSE'
    primary: string
    secondary: string
    marketingName: string
    phone: string
    dateLabel: string
    dateValue: string
    referenceValue: string
    detail: string
    status: string
  }>,
) {
  const headers = ['Tahap', 'Bucket', 'Referensi', 'Nama Pelanggan / Area', 'Marketing', 'No WA', 'Label Tanggal', 'Tanggal', 'Ref Lanjutan', 'Keterangan', 'Status']
  const lines = [headers.map(buildCsvCell).join(',')]

  for (const row of rows) {
    lines.push(
      [
        row.stageLabel,
        row.bucket.replace('_', ' '),
        row.primary,
        row.secondary,
        row.marketingName || '-',
        row.phone || '-',
        row.dateLabel,
        row.dateValue || '-',
        row.referenceValue || '-',
        row.detail,
        row.status,
      ]
        .map(buildCsvCell)
        .join(','),
    )
  }

  const content = `\uFEFF${lines.join('\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const filename = `sales-psb-list-${new Date().toISOString().slice(0, 10)}.csv`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 500)
}

export function SalesDomainWorkspace({
  content,
  source,
  capabilities,
  role,
  domainPrefill,
  domainDrilldown,
  initialActionPanelOpen = false,
  displayMode = 'full',
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
  initialActionPanelOpen?: boolean
  displayMode?: 'full' | 'input'
}) {
  const isInputOnly = displayMode === 'input'
  const reviewSections = content.reviewSections ?? []
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canExport = capabilities.some((item) => item.action === 'export' && item.enabled)
  const actionPermission = { canCreate, canUpdate }
  const [activeBucketFilter, setActiveBucketFilter] = useState<'ALL' | 'OPEN' | 'ON_PROGRESS' | 'CLOSE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const salesLeadSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('LEAD'))
        .flatMap((section) => section.rows)
        .map((row) => {
          const leadId = extractEntityValueFromRowId(row.id, 'LEAD')
          if (!leadId) return row.primary
          const leadType = row.secondary?.trim() ? row.secondary.trim() : 'HOME'
          const marketingName = pickMeta(row.meta, 'Marketing: ')
          const phone = pickMeta(row.meta, 'Phone: ')
          return [
            leadId,
            leadType,
            row.primary,
            marketingName ? `MKT: ${marketingName}` : null,
            phone ? `WA: ${phone}` : null,
          ]
            .filter(Boolean)
            .join(' | ')
        })
        .filter(Boolean),
    ),
  )
  const salesOrderSuggestions = Array.from(
    new Set(
      reviewSections
        .flatMap((section) => section.rows)
        .flatMap((row) => [pickMeta(row.meta, 'Order: '), pickMeta(row.meta, 'Order ID: '), row.id.startsWith('ORDER-') ? row.primary : ''])
        .filter(Boolean),
    ),
  )
  const salesMarketingSuggestions = Array.from(
    new Set(
      reviewSections
        .flatMap((section) => section.rows)
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter(Boolean),
    ),
  )
  const totalRows = reviewSections.reduce((sum, section) => sum + section.rows.length, 0)
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(initialActionPanelOpen)
  const openRows = reviewSections.reduce(
    (sum, section) =>
      sum +
      section.rows.filter((row) => {
        const status = row.status.toUpperCase()
        return status.includes('OPEN') || status.includes('ACTIVE') || status.includes('PENDING') || status.includes('REVIEW')
      }).length,
    0,
  )
  const sectionActions = reviewSections.map((section) => getSectionAction(section.title, actionPermission)).filter(isSectionAction)
  const consoleStats = buildSalesConsoleStats(reviewSections)
  const listStats = buildSalesTicketListStats(reviewSections)
  const consolidatedRows = reviewSections.flatMap((section) =>
    section.rows.map((row) => ({
      sectionTitle: section.title,
      row,
        action: getRowAction(section.title, row, actionPermission),
      primaryMeta: row.meta.slice(0, 3),
      marketingName: pickMeta(row.meta, 'Marketing: '),
      bucket: classifySalesPipelineStatus(row.status, section.title) as 'OPEN' | 'ON_PROGRESS' | 'CLOSE',
      phone: pickMeta(row.meta, 'Phone: '),
      referenceValue:
        pickMeta(row.meta, 'Order: ') ||
        pickMeta(row.meta, 'Order ID: ') ||
        pickMeta(row.meta, 'Contract: ') ||
        pickMeta(row.meta, 'Lead ID: ') ||
        pickMeta(row.meta, 'Work Order: ') ||
        pickMeta(row.meta, 'Source: ') ||
        pickMeta(row.meta, 'Type: ') ||
        '',
      dateLabel: getSalesDateLabel(section.title),
      dateValue: getSalesDateValue(section.title, row.meta),
      stageLabel: getSalesStageLabel(section.title),
    })),
  ).sort((left, right) => {
    const bucketRank = getSalesBucketRank(left.bucket) - getSalesBucketRank(right.bucket)
    if (bucketRank !== 0) return bucketRank

    const stageRank = getSalesStageRank(left.sectionTitle) - getSalesStageRank(right.sectionTitle)
    if (stageRank !== 0) return stageRank

    return left.row.primary.localeCompare(right.row.primary)
  })
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const visibleRows = consolidatedRows.filter((item) => {
    if (activeBucketFilter !== 'ALL' && item.bucket !== activeBucketFilter) {
      return false
    }

    if (!normalizedSearchQuery) {
      return true
    }

    const searchableParts = [
      item.stageLabel,
      item.sectionTitle,
      item.row.primary,
      item.row.secondary,
      item.row.status,
      item.row.detail,
      item.marketingName,
      item.phone,
      item.referenceValue,
      item.dateValue,
      ...item.primaryMeta,
    ]

    return searchableParts.some((value) => String(value ?? '').toLowerCase().includes(normalizedSearchQuery))
  })
  const visibleCountLabel = `${visibleRows.length.toLocaleString('id-ID')} dari ${consolidatedRows.length.toLocaleString('id-ID')} baris`

  return (
    <div className="space-y-3">
      {isInputOnly ? (
        <section className="rounded-[28px] border border-line bg-white p-5 shadow-sm">
          <p className="section-title">Input PSB</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Form input penjualan
              </h2>
              <p className="mt-2 text-sm leading-6 text-mute">
                Halaman ini khusus untuk input lead, coverage, survey, dan order awal PSB. Tabel monitoring dan ringkasan pipeline dipindahkan ke menu lain agar operator tetap fokus saat mengisi data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/list-psb" className="rounded-md border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100">
                Buka Data PSB
              </Link>
              <Link href="/sales/marketing-activities" className="rounded-md border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100">
                Aktivitas Marketing
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`#${getSalesActionAnchorId('lead-create')}`} className="badge border-sky-200 bg-sky-50 text-sky-700">
              Lead Baru
            </Link>
            <Link href={`#${getSalesActionAnchorId('coverage-create')}`} className="badge border-violet-200 bg-violet-50 text-violet-700">
              Coverage
            </Link>
            <Link href={`#${getSalesActionAnchorId('survey-create')}`} className="badge border-amber-200 bg-amber-50 text-amber-700">
              Survey
            </Link>
            <Link href={`#${getSalesActionAnchorId('order-create')}`} className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
              Order
            </Link>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{content.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">
              PSB Ticket List
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-200">Daftar kerja PSB untuk follow-up harian.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={content.primaryAction.href} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-950">
              {content.primaryAction.label}
            </Link>
            <Link href={content.secondaryAction.href} className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
              {content.secondaryAction.label}
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{totalRows.toLocaleString('id-ID')} baris pipeline</span>
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{openRows.toLocaleString('id-ID')} item aktif</span>
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{consoleStats.marketingCount} marketing</span>
        </div>
        </section>
      )}

      {!isInputOnly ? (
        <>
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-red-700/70 bg-[#7a0000] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-sm font-medium tracking-tight text-red-100">Open</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[2rem] font-bold leading-none text-white">{listStats.openCount}</p>
        </article>
        <article className="rounded-xl border border-blue-600/70 bg-[#1b2f78] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-sm font-medium tracking-tight text-blue-100">On Progress</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[2rem] font-bold leading-none text-white">{listStats.onProgressCount}</p>
        </article>
        <article className="rounded-xl border border-green-700/70 bg-[#004d1f] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-sm font-medium tracking-tight text-green-100">Close</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[2rem] font-bold leading-none text-white">{listStats.closeCount}</p>
        </article>
          </section>

          <section className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <article className="rounded-xl border border-slate-700 bg-[#132647] px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Lead</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">{consoleStats.leadCount}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-[#132647] px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Coverage</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">{consoleStats.coverageCount}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-[#132647] px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Survey / Order</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">{consoleStats.flowCount}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-[#132647] px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Work Order</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">{consoleStats.workOrderCount}</p>
        </article>
        <article className="rounded-xl border border-slate-700 bg-[#132647] px-3 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Aktivasi</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">{consoleStats.activationCount}</p>
        </article>
          </section>

          <section className="rounded-2xl border border-slate-600/80 bg-[#1c2b45] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Toolbar Ticket PSB</p>
            <p className="mt-1 text-sm text-slate-200">Filter cepat, pencarian, ekspor, dan shortcut kerja utama.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <button
                type="button"
                onClick={() =>
                  exportSalesTicketList(
                    visibleRows.map((item) => ({
                      stageLabel: item.stageLabel,
                      bucket: item.bucket,
                      primary: item.row.primary,
                      secondary: item.row.secondary,
                      marketingName: item.marketingName,
                      phone: item.phone,
                      dateLabel: item.dateLabel,
                      dateValue: item.dateValue,
                      referenceValue: item.referenceValue,
                      detail: item.row.detail,
                      status: item.row.status,
                    })),
                  )
                }
                className="rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
              >
                Ekspor List
              </button>
            ) : null}
            <Link
              href="/sales?focus=ACTIVE_LEADS"
              className="rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
            >
              Lead Aktif
            </Link>
            <Link
              href="/sales?focus=MONTHLY_ORDERS"
              className="rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
            >
              Order Periode Ini
            </Link>
            <Link
              href="/sales?focus=MONTHLY_ACTIVATIONS"
              className="rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
            >
              Aktivasi Periode Ini
            </Link>
            <Link
              href="/sales/marketing-activities"
              className="rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
            >
              Aktivitas Marketing
            </Link>
            {domainDrilldown ? (
              <Link
                href={domainDrilldown.clearHref}
                className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-500/20"
              >
                Reset Fokus
              </Link>
            ) : null}
          </div>
        </div>
        {domainDrilldown ? (
          <div className="mt-3 rounded-xl border border-slate-500/70 bg-slate-900/30 px-3 py-2 text-xs text-slate-100">
            <span className="font-semibold text-white">{domainDrilldown.label}:</span> {domainDrilldown.detail}
          </div>
        ) : null}
        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL' as const, label: 'Semua', count: consolidatedRows.length },
              { key: 'OPEN' as const, label: 'Open', count: listStats.openCount },
              { key: 'ON_PROGRESS' as const, label: 'On Progress', count: listStats.onProgressCount },
              { key: 'CLOSE' as const, label: 'Close', count: listStats.closeCount },
            ].map((item) => {
              const active = activeBucketFilter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveBucketFilter(item.key)}
                  className={
                    active
                      ? 'rounded-md border border-white bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-950'
                      : 'rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600'
                  }
                >
                  {item.label} ({item.count})
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama, no WA, order, marketing..."
              className="w-full rounded-md border border-slate-500/80 bg-slate-800/90 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-slate-300 sm:w-[320px]"
            />
            <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{visibleCountLabel}</span>
          </div>
        </div>
          </section>

          <section className="rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Console Ticket PSB</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">
              Daftar Ticket PSB
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{reviewSections.length} section</span>
            <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{visibleCountLabel}</span>
          </div>
        </div>

        {sectionActions.length ? (
          <details className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/20 px-3 py-2">
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-white">
              Aksi Input
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {sectionActions.map((item) => (
                <Link
                  key={item.key}
                  href={`#${getSalesActionAnchorId(item.key)}`}
                  className="rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#152643] shadow-[0_10px_30px_rgba(2,6,23,0.25)] lg:block hidden">
          <table className="min-w-[1280px] w-full border-collapse">
            <thead className="bg-[#162d66]">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-100">
                <th className="w-[120px] px-3 py-3">Tahap</th>
                <th className="w-[170px] px-3 py-3">Referensi</th>
                <th className="w-[220px] px-3 py-3">Nama Pelanggan / Area</th>
                <th className="w-[120px] px-3 py-3">Marketing</th>
                <th className="w-[140px] px-3 py-3">No WA</th>
                <th className="w-[150px] px-3 py-3">Tanggal</th>
                <th className="w-[150px] px-3 py-3">Ref Lanjutan</th>
                <th className="w-[110px] px-3 py-3">Status</th>
                <th className="px-3 py-3">Keterangan</th>
                <th className="w-[240px] px-3 py-3">PIC / Konteks</th>
                <th className="w-[110px] px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 bg-[#1c2b45]">
              {visibleRows.map(({ sectionTitle, row, action, primaryMeta, marketingName, bucket, phone, referenceValue, dateLabel, dateValue, stageLabel }) => (
                <tr key={`${sectionTitle}-${row.id}`} className={`align-top transition-colors hover:bg-[#24395c] ${getSalesBucketTone(bucket)}`}>
                  <td className="px-3 py-2 text-xs text-slate-200">
                    <p className="font-medium text-white">{stageLabel}</p>
                    <p className="mt-1 text-slate-300">{sectionTitle}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-200">
                    <p className="font-semibold text-white">{row.primary}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className={`badge ${getSalesBucketPillTone(bucket)}`}>{getSalesBucketLabel(bucket)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-100">
                    <p className="leading-5">{row.secondary}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-sky-300">{marketingName || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-100">{phone || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-100">
                    <p className="text-slate-300">{dateLabel}</p>
                    <p className="mt-1">{dateValue || '-'}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-100">{referenceValue || '-'}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-100">
                    <p className="line-clamp-2 leading-5">{row.detail}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-200">
                    <div className="flex max-w-sm flex-wrap gap-2">
                      {primaryMeta.map((item) => (
                        <span key={`${row.id}-${item}`} className="badge border-slate-500 bg-slate-800/70 text-slate-100">
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {action ? (
                      <button
                        type="button"
                        onClick={() =>
                          setQuickActionItem(
                            buildSalesQuickActionPayload({
                              sectionTitle,
                              row,
                              permission: actionPermission,
                            }),
                          )
                        }
                        className="inline-flex items-center justify-center rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
                      >
                        Aksi cepat
                      </button>
                    ) : (
                      <span className="text-slate-400">Monitor</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 lg:hidden">
          {visibleRows.map(({ sectionTitle, row, action, primaryMeta, marketingName, bucket, phone, referenceValue, dateLabel, dateValue, stageLabel }) => (
            <article
              key={`mobile-${sectionTitle}-${row.id}`}
              className={`rounded-2xl border p-3 shadow-[0_10px_30px_rgba(2,6,23,0.18)] ${getSalesBucketTone(bucket)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{row.primary}</p>
                  <p className="mt-1 text-sm text-slate-100">{row.secondary}</p>
                </div>
                <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{stageLabel}</span>
                <span className={`badge ${getSalesBucketPillTone(bucket)}`}>{getSalesBucketLabel(bucket)}</span>
                {marketingName ? <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{marketingName}</span> : null}
              </div>

              <p className="mt-3 text-sm leading-5 text-slate-100">{row.detail}</p>

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-100">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">No WA</p>
                    <p className="mt-1">{phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">{dateLabel}</p>
                    <p className="mt-1">{dateValue || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">Ref Lanjutan</p>
                    <p className="mt-1">{referenceValue || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">PIC / Konteks</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {primaryMeta.map((item) => (
                      <span key={`mobile-meta-${row.id}-${item}`} className="badge border-slate-500 bg-slate-800/70 text-slate-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                {action ? (
                  <button
                    type="button"
                    onClick={() =>
                      setQuickActionItem(
                        buildSalesQuickActionPayload({
                          sectionTitle,
                          row,
                          permission: actionPermission,
                        }),
                      )
                    }
                    className="inline-flex items-center justify-center rounded-md border border-slate-500/80 bg-slate-700/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-600"
                  >
                    Aksi cepat
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">Monitor</span>
                )}
              </div>
            </article>
          ))}
        </div>
          </section>
        </>
      ) : null}

      {canCreate || canUpdate ? (
        <section className="space-y-4">
          <div>
            <p className="section-title">Aksi Penjualan</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {isInputOnly ? 'Form input PSB' : 'Form operasional'}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
              {isInputOnly
                ? 'Halaman ini memang dikhususkan untuk penulisan data baru, jadi form tampil langsung tanpa panel monitoring lain.'
                : 'Default layar tetap fokus ke tabel. Buka panel ini hanya saat operator perlu menulis aksi.'}
            </p>
          </div>
          {isInputOnly ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div id={getSalesActionAnchorId('lead-create')} className="scroll-mt-24">
                <SalesLeadCreateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  marketingSuggestions={salesMarketingSuggestions}
                />
              </div>
              <div id={getSalesActionAnchorId('coverage-create')} className="scroll-mt-24">
                <SalesCoverageCreateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  leadSuggestions={salesLeadSuggestions}
                  initialLeadValue={domainPrefill?.lead}
                />
              </div>
              <div id={getSalesActionAnchorId('survey-create')} className="scroll-mt-24">
                <SalesSurveyCreateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  leadSuggestions={salesLeadSuggestions}
                  initialLeadValue={domainPrefill?.lead}
                />
              </div>
              <div id={getSalesActionAnchorId('order-create')} className="scroll-mt-24">
                <SalesOrderCreateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  leadSuggestions={salesLeadSuggestions}
                  marketingSuggestions={salesMarketingSuggestions}
                  initialLeadValue={domainPrefill?.lead}
                />
              </div>
            </div>
          ) : (
            <details
              className="group rounded-2xl border border-line bg-white p-4"
              open={isActionPanelOpen}
              onToggle={(event) => setIsActionPanelOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Buka panel aksi penjualan
              </summary>
              <p className="mt-2 text-sm text-mute">
                Berisi `Lead`, `Coverage`, `Survey`, `Order`, `Work Order`, `Aktivasi`, serta flow corporate (quotation, kontrak, delivery, acceptance).
              </p>
              <div className="mt-4 grid gap-6 xl:grid-cols-2">
                <div id={getSalesActionAnchorId('lead-create')} className="scroll-mt-24">
                  <SalesLeadCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    marketingSuggestions={salesMarketingSuggestions}
                  />
                </div>
                <div id={getSalesActionAnchorId('coverage-create')} className="scroll-mt-24">
                  <SalesCoverageCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    leadSuggestions={salesLeadSuggestions}
                    initialLeadValue={domainPrefill?.lead}
                  />
                </div>
                <div id={getSalesActionAnchorId('survey-create')} className="scroll-mt-24">
                  <SalesSurveyCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    leadSuggestions={salesLeadSuggestions}
                    initialLeadValue={domainPrefill?.lead}
                  />
                </div>
                <div id={getSalesActionAnchorId('order-create')} className="scroll-mt-24">
                  <SalesOrderCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    leadSuggestions={salesLeadSuggestions}
                    marketingSuggestions={salesMarketingSuggestions}
                    initialLeadValue={domainPrefill?.lead}
                  />
                </div>
                <div id={getSalesActionAnchorId('work-order-create')} className="scroll-mt-24">
                  <SalesWorkOrderCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    orderSuggestions={salesOrderSuggestions}
                    initialOrderValue={domainPrefill?.order}
                  />
                </div>
                <div id={getSalesActionAnchorId('subscription-activate')} className="scroll-mt-24">
                  <SalesSubscriptionActivateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    orderSuggestions={salesOrderSuggestions}
                    initialOrderValue={domainPrefill?.order}
                  />
                </div>
                <div id={getSalesActionAnchorId('corporate-quotation-create')} className="scroll-mt-24">
                  <SalesCorporateQuotationCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                    leadSuggestions={salesLeadSuggestions}
                    initialLeadValue={domainPrefill?.lead}
                  />
                </div>
                <div id={getSalesActionAnchorId('corporate-quotation-approval')} className="scroll-mt-24">
                  <SalesCorporateQuotationApprovalForm
                    canApprove={capabilities.some((item) => item.action === 'update' && item.enabled)}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  />
                </div>
                <div id={getSalesActionAnchorId('corporate-contract-create')} className="scroll-mt-24">
                  <SalesCorporateContractCreateForm
                    canSign={capabilities.some((item) => item.action === 'update' && item.enabled)}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  />
                </div>
                <div id={getSalesActionAnchorId('corporate-delivery-create')} className="scroll-mt-24">
                  <SalesCorporateDeliveryCreateForm
                    canCreate={canCreate}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  />
                </div>
                <div id={getSalesActionAnchorId('corporate-acceptance-create')} className="scroll-mt-24">
                  <SalesCorporateAcceptanceCreateForm
                    canUpdate={capabilities.some((item) => item.action === 'update' && item.enabled)}
                    reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  />
                </div>
              </div>
            </details>
          )}
        </section>
      ) : null}

      {!isInputOnly ? (
        <TableQuickActionModal
          item={quickActionItem}
          onClose={() => setQuickActionItem(null)}
          heading="Aksi cepat dari tabel PSB"
        />
      ) : null}

      {!isInputOnly && content.highlights.length ? (
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
          <p className="mt-3 text-sm leading-6 text-mute">
            Role aktif: {role}. Write-side tetap tunduk pada capability ERP dan fondasi PRD.
          </p>
        </details>
      ) : null}
    </div>
  )
}
