import Link from 'next/link'
import { SupportActionFormModal, type SupportActionModalItem } from '@/components/support-action-form-modal'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportIsolationForm } from '@/components/support-isolation-form'
import { SupportIsolationQueuePanel } from '@/components/support-isolation-queue-panel'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportLaneActionHref, buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
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
  const supportActionModalItems: SupportActionModalItem[] = []
  if (canCreate) {
    supportActionModalItems.push({
      key: 'isolation-create',
      title: 'Tambah isolir',
      description: 'Gunakan form ini untuk mencatat suspend aktif baru sebelum kasus masuk ke jalur restore atau terminate.',
      element: (
        <SupportIsolationForm
          canCreate={canCreate}
          reviewDbReady={reviewDbReady}
          radboxSuggestions={supportRadboxSuggestions}
          marketingSuggestions={supportMarketingSuggestions}
          serviceSuggestions={supportServiceSuggestions}
        />
      ),
    })
  }
  if (canUpdate) {
    supportActionModalItems.push({
      key: 'isolation-restore',
      title: 'Restore billing',
      description: 'Pakai form ini saat kasus isolir masih layak dipulihkan dan keputusan billing sudah mengizinkan pembukaan layanan.',
      element: (
        <SupportIsolationRestoreForm
          canUpdate={canUpdate}
          reviewDbReady={reviewDbReady}
          isolationSuggestions={supportIsolationSuggestions}
          initialIsolationValue={supportPrefill?.isolation}
        />
      ),
    })
  }
  if (canProcessSupportDismantle(role, canApprove)) {
    supportActionModalItems.push({
      key: 'dismantle-approve',
      title: 'Transfer dismantle',
      description: 'Gunakan form ini saat kasus isolir harus keluar dari jalur restore dan diproses sebagai terminate permanen.',
      element: (
        <SupportDismantleForm
          canProcess={canProcessSupportDismantle(role, canApprove)}
          reviewDbReady={reviewDbReady}
          isolationSuggestions={supportIsolationSuggestions}
          initialIsolationValue={supportPrefill?.isolation}
        />
      ),
    })
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{content.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">
              Monitoring Isolir Pelanggan
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-200">Daftar pelanggan yang status layanannya sedang diisolir.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenBillingDecision ? (
              <Link href="/billing" className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-950">
                Billing Decision
              </Link>
            ) : null}
            {canOpenDismantleLane ? (
              <Link
                href={dismantleTransferHref}
                className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
              >
                {canProcessSupportDismantle(role, canApprove) ? 'Queue Dismantle' : 'Buka Dismantle'}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">{summary.total} data</span>
          <span className="badge border-red-500/60 bg-red-500/10 text-red-100">Open {summary.restoreCount}</span>
          <span className="badge border-blue-500/60 bg-blue-500/10 text-blue-100">On Progress {summary.terminateCount}</span>
          {!reviewDbReady ? (
            <span className="badge border-amber-500/60 bg-amber-500/10 text-amber-100">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      <SupportIsolationQueuePanel
        sections={reviewSections}
        actionLinks={visibleActionLinks}
        role={role}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canApprove={canApprove}
        supportDrilldown={supportDrilldown ?? null}
      />

      <SupportActionFormModal items={supportActionModalItems} heading="Form aksi lane isolir" />
    </div>
  )
}
