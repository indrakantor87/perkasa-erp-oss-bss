import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportIsolationForm } from '@/components/support-isolation-form'
import { SupportIsolationQueuePanel } from '@/components/support-isolation-queue-panel'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { buildSupportActionHref, buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
import { canProcessSupportDismantle } from '@/lib/support-lanes'
import type { AppRole, DataSourceSnapshot, DomainCapability, DomainPageContent, DomainReviewRow, SupportActionLink, SupportDrilldownContext } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function buildIsolationWorkspaceSummary(rows: DomainReviewRow[]) {
  const statusCounts = new Map<string, number>()
  const marketing = new Set<string>()
  let terminateCount = 0

  rows.forEach((row) => {
    const status = row.status?.trim() || 'UNKNOWN'
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)

    const marketingName = pickMeta(row.meta, 'Marketing: ')
    if (marketingName && marketingName !== '-') {
      marketing.add(marketingName)
    }

    if (pickMeta(row.meta, 'Ticket Dismantle: ') === 'Sudah') {
      terminateCount += 1
    }
  })

  return {
    total: rows.length,
    terminateCount,
    restoreCount: rows.length - terminateCount,
    marketingCount: marketing.size,
    topStatuses: Array.from(statusCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3),
  }
}

export function SupportIsolationWorkspace({
  content,
  source,
  capabilities,
  role,
  supportPrefill,
  supportDrilldown,
}: {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
  role: AppRole
  supportPrefill?: {
    ticket?: string
    isolation?: string
    dismantle?: string
    dismantleHistory?: string
    type?: string
    status?: string
    focus?: string
    customer?: string
    service?: string
  }
  supportDrilldown?: SupportDrilldownContext
}) {
  const reviewSections = content.reviewSections ?? []
  const isolationSection =
    reviewSections.find((section) => section.title.toUpperCase().includes('ISOLIR')) ?? null
  const isolationRows = isolationSection?.rows ?? []
  const summary = buildIsolationWorkspaceSummary(isolationRows)

  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback

  const supportRadboxSuggestions = Array.from(
    new Set(
      isolationRows
        .map((row) => row.secondary.trim())
        .filter((item) => item && !item.toLowerCase().includes('belum terpetakan')),
    ),
  )
  const supportMarketingSuggestions = Array.from(
    new Set(
      isolationRows
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter((item) => item && item !== '-'),
    ),
  )
  const supportServiceSuggestions = Array.from(
    new Set(
      isolationRows
        .flatMap((row) => [pickMeta(row.meta, 'Service No: '), pickMeta(row.meta, 'Customer Code: ')])
        .filter((item) => item && item !== '-'),
    ),
  )
  const supportIsolationSuggestions = isolationRows.map((row) => `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`)

  const actionLinks = [
    {
      key: 'isolation-create',
      label: 'Tambah Isolir',
      description: 'Catat suspend aktif baru ke review DB.',
      href: `#${getSupportActionAnchorId('isolation-create')}`,
    },
    {
      key: 'isolation-restore',
      label: 'Restore Billing',
      description: 'Pulihkan pelanggan yang sudah aman di-restore.',
      href: `#${getSupportActionAnchorId('isolation-restore')}`,
    },
    {
      key: 'dismantle-approve',
      label: 'Transfer Dismantle',
      description: 'Teruskan terminate ke queue CS & Admin CS.',
      href: `#${getSupportActionAnchorId('dismantle-approve')}`,
    },
  ] satisfies SupportActionLink[]

  const visibleActionLinks = actionLinks.filter((item) => {
    if (item.key === 'isolation-create') return canCreate
    if (item.key === 'isolation-restore') return canUpdate
    return canProcessSupportDismantle(role, canApprove)
  })

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">{content.eyebrow}</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Monitoring Isolir Pelanggan
            </h2>
            <p className="mt-1 text-sm leading-5 text-mute">
              Monitoring backlog isolir, restore, dan transfer ke dismantle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/billing" className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
              Buka Billing Decision
            </Link>
            <Link
              href={buildSupportLaneHref('dismantle')}
              className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
            >
              Queue Dismantle
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{summary.total} isolir</span>
          <span className="badge border-sky-200 bg-sky-50 text-sky-700">Restore: {summary.restoreCount}</span>
          <span className="badge border-rose-200 bg-rose-50 text-rose-700">Dismantle: {summary.terminateCount}</span>
          {summary.marketingCount ? (
            <span className="badge border-slate-200 bg-white text-slate-600">{summary.marketingCount} marketing terlibat</span>
          ) : null}
          {!reviewDbReady ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      {summary.topStatuses.length ? (
        <section className="rounded-xl border border-line bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-200 bg-white text-slate-600">Status dominan:</span>
            {summary.topStatuses.map(([status, count]) => (
              <span key={status} className="badge border-slate-200 bg-white text-slate-600">
                {status}: {count}
              </span>
            ))}
            <Link
              href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
              className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:opacity-90"
            >
              Kontrol SLA Terkait
            </Link>
            <Link
              href="/customers/cs-admin?queue=Transfer+atau+Restore"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:opacity-90"
            >
              Buka Supervisor CS
            </Link>
          </div>
        </section>
      ) : null}

      <DataSourceStatus source={source} />

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <form action="/support/isolations" className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus</span>
            <select
              name="focus"
              defaultValue={supportPrefill?.focus ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua Isolir</option>
              <option value="ACTIVE_ISOLATIONS">Isolir Aktif</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <input
              name="status"
              defaultValue={supportPrefill?.status ?? ''}
              placeholder="ACTIVE / PENDING / lainnya"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Customer</span>
            <input
              name="customer"
              defaultValue={supportPrefill?.customer ?? ''}
              placeholder="Nama customer / kode"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Service</span>
            <input
              name="service"
              defaultValue={supportPrefill?.service ?? ''}
              placeholder="Radbox / service / catatan"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              Terapkan
            </button>
            <Link
              href="/support/isolations"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {supportDrilldown ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-900">{supportDrilldown.label}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-800">{supportDrilldown.detail}</p>
            </div>
            <Link
              href={supportDrilldown.clearHref}
              className="rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

      <SupportIsolationQueuePanel sections={reviewSections} actionLinks={visibleActionLinks} />

      <section className="space-y-4">
        <div>
          <p className="section-title">Aksi Isolir</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Form tindak lanjut
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            Default layar tetap fokus ke tabel. Buka panel ini hanya saat operator perlu menulis aksi.
          </p>
          {!reviewDbReady ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mode review database belum aktif, sehingga form write-side dinonaktifkan agar tidak menulis ke mock.
            </div>
          ) : null}
        </div>
        <details className="group rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Buka panel aksi isolir
          </summary>
          <p className="mt-2 text-sm text-mute">
            Berisi `Tambah Isolir`, `Restore Billing`, dan `Transfer Dismantle`.
          </p>
          <div className="mt-4 grid gap-6 xl:grid-cols-3">
            {canCreate ? (
              <div id={getSupportActionAnchorId('isolation-create')} className="scroll-mt-24">
                <SupportIsolationForm
                  canCreate={canCreate}
                  reviewDbReady={reviewDbReady}
                  radboxSuggestions={supportRadboxSuggestions}
                  marketingSuggestions={supportMarketingSuggestions}
                  serviceSuggestions={supportServiceSuggestions}
                />
              </div>
            ) : null}
            {canUpdate ? (
              <div id={getSupportActionAnchorId('isolation-restore')} className="scroll-mt-24">
                <SupportIsolationRestoreForm
                  canUpdate={canUpdate}
                  reviewDbReady={reviewDbReady}
                  isolationSuggestions={supportIsolationSuggestions}
                  initialIsolationValue={supportPrefill?.isolation}
                />
              </div>
            ) : null}
            {canProcessSupportDismantle(role, canApprove) ? (
              <div id={getSupportActionAnchorId('dismantle-approve')} className="scroll-mt-24">
                <SupportDismantleForm
                  canProcess={canProcessSupportDismantle(role, canApprove)}
                  reviewDbReady={reviewDbReady}
                  isolationSuggestions={supportIsolationSuggestions}
                  initialIsolationValue={supportPrefill?.isolation}
                />
              </div>
            ) : null}
          </div>
        </details>
      </section>
    </div>
  )
}
