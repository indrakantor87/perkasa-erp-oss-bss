import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { SalesCoverageCreateForm } from '@/components/sales-coverage-create-form'
import { SalesLeadCreateForm } from '@/components/sales-lead-create-form'
import { SalesOrderCreateForm } from '@/components/sales-order-create-form'
import { SalesSubscriptionActivateForm } from '@/components/sales-subscription-activate-form'
import { SalesSurveyCreateForm } from '@/components/sales-survey-create-form'
import { SalesWorkOrderCreateForm } from '@/components/sales-work-order-create-form'
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
    | 'subscription-activate',
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

function getSectionAction(sectionTitle: string, canCreate: boolean) {
  const title = sectionTitle.trim().toUpperCase()
  if (!canCreate) return null

  if (title.includes('LEAD') && title.includes('COVERAGE')) {
    return { key: 'coverage-create' as const, label: 'Input Coverage', description: 'Lanjutkan lead yang perlu validasi cakupan area.' }
  }
  if (title.includes('SURVEY')) {
    return { key: 'survey-create' as const, label: 'Jadwalkan Survey', description: 'Dorong prospek yang sudah lolos coverage ke survey lapangan.' }
  }
  if (title.includes('WORK ORDER')) {
    return { key: 'work-order-create' as const, label: 'Buat Work Order', description: 'Turunkan order siap instalasi menjadi work order lapangan.' }
  }
  if (title.includes('SUBSCRIPTION') || title.includes('AKTIVASI')) {
    return { key: 'subscription-activate' as const, label: 'Aktivasi Subscription', description: 'Finalisasi order yang sudah siap masuk ke layanan aktif.' }
  }
  if (title.includes('ORDER')) {
    return { key: 'order-create' as const, label: 'Buat Order', description: 'Konversi lead atau survey yang siap menjadi order operasional.' }
  }
  if (title.includes('LEAD')) {
    return { key: 'lead-create' as const, label: 'Tambah Lead', description: 'Catat prospek baru agar pipeline penjualan tetap terisi.' }
  }
  return null
}

function isSectionAction(
  value: ReturnType<typeof getSectionAction>,
): value is NonNullable<ReturnType<typeof getSectionAction>> {
  return value !== null
}

function getRowAction(sectionTitle: string, row: DomainReviewRow, canCreate: boolean) {
  const title = sectionTitle.trim().toUpperCase()
  const rowStatus = row.status.trim().toUpperCase()
  const orderId = pickMeta(row.meta, 'Order ID: ')
  const orderCode = pickMeta(row.meta, 'Order: ')

  if (!canCreate) return null

  if (title.includes('WORK ORDER') || rowStatus.includes('WORK_ORDER')) {
    return {
      label: 'Lanjutkan WO',
      href: buildPrefillHref(getSalesActionAnchorId('work-order-create'), {
        order: orderCode || orderId || row.primary,
      }),
    }
  }
  if (title.includes('SUBSCRIPTION') || title.includes('AKTIVASI') || rowStatus.includes('ACTIV')) {
    return {
      label: 'Aktivasi',
      href: buildPrefillHref(getSalesActionAnchorId('subscription-activate'), {
        order: orderCode || orderId || row.primary,
      }),
    }
  }
  if (title.includes('ORDER') || rowStatus.includes('ORDER')) {
    return {
      label: 'Proses Order',
      href: buildPrefillHref(getSalesActionAnchorId('order-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
        order: orderId || row.primary,
      }),
    }
  }
  if (title.includes('SURVEY') || rowStatus.includes('SURVEY')) {
    return {
      label: 'Proses Survey',
      href: buildPrefillHref(getSalesActionAnchorId('survey-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
      }),
    }
  }
  if (title.includes('COVERAGE') || rowStatus.includes('COVERAGE')) {
    return {
      label: 'Proses Coverage',
      href: buildPrefillHref(getSalesActionAnchorId('coverage-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
      }),
    }
  }
  if (title.includes('LEAD') || rowStatus.includes('LEAD')) {
    return {
      label: 'Tindak Lead',
      href: buildPrefillHref(getSalesActionAnchorId('lead-create'), {
        lead: extractEntityValueFromRowId(row.id, 'LEAD') || row.primary,
      }),
    }
  }
  return null
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

export function SalesDomainWorkspace({
  content,
  source,
  capabilities,
  role,
  domainPrefill,
  domainDrilldown,
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
}) {
  const reviewSections = content.reviewSections ?? []
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const salesLeadSuggestions = Array.from(
    new Set(
      reviewSections
        .filter((section) => section.title.toUpperCase().includes('LEAD'))
        .flatMap((section) => section.rows)
        .map((row) => extractEntityValueFromRowId(row.id, 'LEAD') || row.primary)
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
  const openRows = reviewSections.reduce(
    (sum, section) =>
      sum +
      section.rows.filter((row) => {
        const status = row.status.toUpperCase()
        return status.includes('OPEN') || status.includes('ACTIVE') || status.includes('PENDING') || status.includes('REVIEW')
      }).length,
    0,
  )
  const sectionActions = reviewSections.map((section) => getSectionAction(section.title, canCreate)).filter(isSectionAction)
  const consoleStats = buildSalesConsoleStats(reviewSections)

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <p className="section-title">{content.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Ticket PSB / Pipeline Penjualan
            </h2>
            <p className="mt-1 text-sm leading-5 text-mute">
              Lead, coverage, survey, order, work order, dan aktivasi dalam satu layar kerja yang ringkas.
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
          <span className="badge border-slate-200 bg-white text-slate-600">{totalRows.toLocaleString('id-ID')} baris pipeline</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{openRows.toLocaleString('id-ID')} item aktif</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{consoleStats.marketingCount} marketing</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <article className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Lead</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-sky-950">
            {consoleStats.leadCount}
          </p>
        </article>
        <article className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">Coverage</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-violet-950">
            {consoleStats.coverageCount}
          </p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Survey / Order</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-amber-950">
            {consoleStats.flowCount}
          </p>
        </article>
        <article className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Work Order</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-rose-950">
            {consoleStats.workOrderCount}
          </p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Aktivasi</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-emerald-950">
            {consoleStats.activationCount}
          </p>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Toolbar Ticket PSB</p>
            <p className="mt-1 text-sm text-mute">Shortcut funnel utama dan jalur kerja marketing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales?focus=ACTIVE_LEADS"
              className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-700 transition hover:opacity-90"
            >
              Lead Aktif
            </Link>
            <Link
              href="/sales?focus=MONTHLY_ORDERS"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 transition hover:opacity-90"
            >
              Order Periode Ini
            </Link>
            <Link
              href="/sales?focus=MONTHLY_ACTIVATIONS"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:opacity-90"
            >
              Aktivasi Periode Ini
            </Link>
            <Link
              href="/sales/marketing-activities"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:opacity-90"
            >
              Aktivitas Marketing
            </Link>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Console Ticket PSB</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Tabel pipeline dan aktivitas kerja PSB
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-5 text-mute">
              Tabel jadi pusat baca. Form aksi dipindah ke panel sekunder agar layar tetap fokus ke pipeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-200 bg-white text-slate-600">{reviewSections.length} section</span>
            <Link href="/sales/marketing-activities" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
              Aktivitas Marketing
            </Link>
          </div>
        </div>

        {sectionActions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {sectionActions.map((item) => (
              <Link
                key={item.key}
                href={`#${getSalesActionAnchorId(item.key)}`}
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
                <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                  {section.rows.length.toLocaleString('id-ID')} baris
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-4 py-3">Referensi</th>
                    <th className="px-4 py-3">Customer / Area</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3">PIC / Konteks</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {section.rows.map((row) => {
                    const action = getRowAction(section.title, row, canCreate)
                    const primaryMeta = row.meta.slice(0, 3)
                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                          <p className="mt-1 text-xs text-slate-500">{section.title}</p>
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
                            {primaryMeta.map((item) => (
                              <span key={`${row.id}-${item}`} className="badge border-slate-200 bg-white text-slate-600">
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {action ? (
                            <Link
                              href={action.href}
                              className="inline-flex items-center justify-center rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800"
                            >
                              {action.label}
                            </Link>
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

      {canCreate ? (
        <section className="space-y-4">
          <div>
            <p className="section-title">Aksi Penjualan</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Form operasional
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
              Default layar tetap fokus ke tabel. Buka panel ini hanya saat operator perlu menulis aksi.
            </p>
          </div>
          <details className="group rounded-2xl border border-line bg-white p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
              Buka panel aksi penjualan
            </summary>
            <p className="mt-2 text-sm text-mute">
              Berisi `Lead`, `Coverage`, `Survey`, `Order`, `Work Order`, dan `Aktivasi`.
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
            </div>
          </details>
        </section>
      ) : null}

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
          <p className="mt-3 text-sm leading-6 text-mute">
            Role aktif: {role}. Write-side tetap tunduk pada capability ERP dan fondasi PRD.
          </p>
        </details>
      ) : null}
    </div>
  )
}
