import Link from 'next/link'
import { SupportActionPanelContainer } from '@/components/support-action-panel-container'
import { SupportActionPanelIntro } from '@/components/support-action-panel-intro'
import { SupportActionPanelSlot } from '@/components/support-action-panel-slot'
import { DataSourceStatus } from '@/components/data-source-status'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportIsolationForm } from '@/components/support-isolation-form'
import { SupportIsolationQueuePanel } from '@/components/support-isolation-queue-panel'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { SupportWorkspaceHelperNote } from '@/components/support-workspace-helper-note'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportActionHref, buildSupportLaneActionHref, buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
import { canAccessSupportLane, canProcessSupportDismantle, canUseSupportAction } from '@/lib/support-lanes'
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
  const canOpenBillingDecision = canAccessPath(role, '/billing')
  const canOpenDismantleLane = canAccessSupportLane(role, 'dismantle')
  const canOpenSlaLane = canAccessSupportLane(role, 'sla')
  const canOpenSupervisorWorkspace = canAccessPath(role, '/customers/cs-admin')
  const dismantleTransferHref = canUseSupportAction({ role, actionKey: 'dismantle-approve', canCreate, canUpdate, canApprove })
    ? buildSupportLaneActionHref('dismantle', 'dismantle-approve')
    : buildSupportLaneHref('dismantle')

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

  const visibleActionLinks = actionLinks.filter((item) =>
    canUseSupportAction({
      role,
      actionKey: item.key,
      canCreate,
      canUpdate,
      canApprove,
    }),
  )

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
              Lane keputusan suspend aktif untuk restore billing atau transfer terminate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenBillingDecision ? (
              <Link href="/billing" className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                Buka Billing Decision
              </Link>
            ) : null}
            {canOpenDismantleLane ? (
              <Link
                href={dismantleTransferHref}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
              >
                {canProcessSupportDismantle(role, canApprove) ? 'Transfer Dismantle' : 'Queue Dismantle'}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{summary.total} isolir</span>
          <span className="badge border-sky-200 bg-sky-50 text-sky-700">Restore: {summary.restoreCount}</span>
          <span className="badge border-rose-200 bg-rose-50 text-rose-700">Terminate: {summary.terminateCount}</span>
          {summary.marketingCount ? (
            <span className="badge border-slate-200 bg-white text-slate-600">{summary.marketingCount} marketing terlibat</span>
          ) : null}
          {!reviewDbReady ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      <SupportWorkspaceHelperNote
        title="Pisahkan cepat kasus yang masih layak dipulihkan dari kasus yang harus diteruskan ke terminate."
        detail="Gunakan lane ini sebagai gerbang keputusan. Restore tetap berada di jalur billing, sedangkan kasus yang tidak layak dibuka kembali harus segera dipindahkan ke dismantle agar tidak menggantung di backlog isolir."
        badges={[
          { label: `${summary.total} backlog isolir`, tone: 'neutral' },
          { label: `${summary.restoreCount} jalur restore`, tone: 'info' },
          { label: `${summary.terminateCount} jalur terminate`, tone: 'danger' },
        ]}
      />

      {summary.topStatuses.length ? (
        <section className="rounded-xl border border-line bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-200 bg-white text-slate-600">Status dominan:</span>
            {summary.topStatuses.map(([status, count]) => (
              <span key={status} className="badge border-slate-200 bg-white text-slate-600">
                {status}: {count}
              </span>
            ))}
            {canOpenSlaLane ? (
              <Link
                href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
                className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:opacity-90"
              >
                Kontrol SLA Terkait
              </Link>
            ) : null}
            {canOpenSupervisorWorkspace ? (
              <Link
                href="/customers/cs-admin?queue=Transfer+atau+Restore"
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:opacity-90"
              >
                Buka Supervisor CS
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <DataSourceStatus source={source} />

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <form action="/support/isolations" className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus Antrian</span>
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status Kerja</span>
            <input
              name="status"
              defaultValue={supportPrefill?.status ?? ''}
              placeholder="ACTIVE, PENDING, atau status lain"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Pelanggan</span>
            <input
              name="customer"
              defaultValue={supportPrefill?.customer ?? ''}
              placeholder="Nama pelanggan / kode pelanggan"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Layanan / Konteks</span>
            <input
              name="service"
              defaultValue={supportPrefill?.service ?? ''}
              placeholder="Radbox, layanan, atau catatan kasus"
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

      <SupportIsolationQueuePanel
        sections={reviewSections}
        actionLinks={visibleActionLinks}
        role={role}
        canUpdate={canUpdate}
        canApprove={canApprove}
      />

      <section className="space-y-4">
        <SupportActionPanelIntro
          laneLabel="Isolir"
          detail="Default workspace tetap fokus ke backlog suspend aktif. Buka panel ini hanya saat operator perlu menulis kasus isolir baru, restore billing, atau transfer terminate."
          reviewDbReady={reviewDbReady}
        />
        <SupportActionPanelContainer
          title="Buka panel aksi lane Isolir"
          description="Panel ini berisi form write-side untuk `Tambah Isolir`, `Restore Billing`, dan `Transfer Dismantle`."
          actionIds={[
            getSupportActionAnchorId('isolation-create'),
            getSupportActionAnchorId('isolation-restore'),
            getSupportActionAnchorId('dismantle-approve'),
          ]}
          itemCount={3}
          defaultOpen={Boolean(supportPrefill?.isolation)}
        >
          <div className="mt-4 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {canCreate ? (
              <SupportActionPanelSlot
                id={getSupportActionAnchorId('isolation-create')}
                title="Tambah isolir"
                description="Gunakan form ini untuk mencatat suspend aktif baru sebelum kasus masuk ke jalur restore atau terminate."
              >
                <SupportIsolationForm
                  canCreate={canCreate}
                  reviewDbReady={reviewDbReady}
                  radboxSuggestions={supportRadboxSuggestions}
                  marketingSuggestions={supportMarketingSuggestions}
                  serviceSuggestions={supportServiceSuggestions}
                />
              </SupportActionPanelSlot>
            ) : null}
            {canUpdate ? (
              <SupportActionPanelSlot
                id={getSupportActionAnchorId('isolation-restore')}
                title="Restore billing"
                description="Pakai form ini saat kasus isolir masih layak dipulihkan dan keputusan billing sudah mengizinkan pembukaan layanan."
                defaultOpen={Boolean(supportPrefill?.isolation)}
              >
                <SupportIsolationRestoreForm
                  canUpdate={canUpdate}
                  reviewDbReady={reviewDbReady}
                  isolationSuggestions={supportIsolationSuggestions}
                  initialIsolationValue={supportPrefill?.isolation}
                />
              </SupportActionPanelSlot>
            ) : null}
            {canProcessSupportDismantle(role, canApprove) ? (
              <SupportActionPanelSlot
                id={getSupportActionAnchorId('dismantle-approve')}
                title="Transfer dismantle"
                description="Gunakan form ini saat kasus isolir harus keluar dari jalur restore dan diproses sebagai terminate permanen."
                defaultOpen={Boolean(supportPrefill?.isolation)}
              >
                <SupportDismantleForm
                  canProcess={canProcessSupportDismantle(role, canApprove)}
                  reviewDbReady={reviewDbReady}
                  isolationSuggestions={supportIsolationSuggestions}
                  initialIsolationValue={supportPrefill?.isolation}
                />
              </SupportActionPanelSlot>
            ) : null}
          </div>
        </SupportActionPanelContainer>
      </section>
    </div>
  )
}
