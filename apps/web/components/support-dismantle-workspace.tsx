'use client'

import Link from 'next/link'
import { SupportActionFormModal, type SupportActionModalItem } from '@/components/support-action-form-modal'
import { SupportDismantleCloseForm } from '@/components/support-dismantle-close-form'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportDismantleQueuePanel } from '@/components/support-dismantle-queue-panel'
import { SupportDismantleReopenForm } from '@/components/support-dismantle-reopen-form'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportLaneActionHref, buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
import { canAccessSupportLane, canProcessSupportDismantle, canUseSupportAction } from '@/lib/support-lanes'
import type {
  AppRole,
  DataSourceSnapshot,
  DomainCapability,
  DomainPageContent,
  SupportActionLink,
  SupportDrilldownContext,
} from '@/lib/types'

export function SupportDismantleWorkspace({
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
    isolation?: string
    dismantle?: string
    dismantleHistory?: string
    status?: string
    focus?: string
    customer?: string
    service?: string
  }
  supportDrilldown?: SupportDrilldownContext
}) {
  const reviewSections = content.reviewSections ?? []
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback
  const canProcess = canProcessSupportDismantle(role, canApprove)
  const canOpenIsolationLane = canAccessSupportLane(role, 'isolations')
  const canOpenBillingDecision = canAccessPath(role, '/billing')
  const isolationRecoveryHref = canUseSupportAction({ role, actionKey: 'isolation-restore', canCreate, canUpdate, canApprove })
    ? buildSupportLaneActionHref('isolations', 'isolation-restore', { focus: 'ACTIVE_ISOLATIONS' })
    : buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })

  const supportIsolationSuggestions = reviewSections
    .filter((section) => section.title.toUpperCase().includes('ISOLIR'))
    .flatMap((section) => section.rows)
    .map((row) => `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`)
  const supportDismantleQueueSuggestions = reviewSections
    .filter((section) => section.title.toUpperCase().includes('QUEUE DISMANTLE OPEN'))
    .flatMap((section) => section.rows)
    .map((row) => `${row.id.replace(/^DISMANTLE-QUEUE-/, '')} | ${row.primary} | ${row.secondary}`)
  const supportDismantleHistorySuggestions = reviewSections
    .filter((section) => section.title.toUpperCase().includes('HISTORI DISMANTLE'))
    .flatMap((section) => section.rows)
    .map((row) => `${row.id.replace(/^DIS-/, '')} | ${row.primary} | ${row.secondary}`)

  const actionLinks = [
    {
      key: 'isolation-restore',
      label: 'Kembali ke Restore',
      description: 'Kembalikan kasus ke Billing bila terminate belum final.',
      href: `#${getSupportActionAnchorId('isolation-restore')}`,
    },
    {
      key: 'dismantle-approve',
      label: 'Transfer Dismantle',
      description: 'Masukkan isolir aktif ke antrean dismantle.',
      href: `#${getSupportActionAnchorId('dismantle-approve')}`,
    },
    {
      key: 'dismantle-close',
      label: 'Tutup ke Histori',
      description: 'Finalisasi terminate ke histori close.',
      href: `#${getSupportActionAnchorId('dismantle-close')}`,
    },
    {
      key: 'dismantle-reopen',
      label: 'Reopen Antrean',
      description: 'Buka kembali histori ke antrean aktif.',
      href: `#${getSupportActionAnchorId('dismantle-reopen')}`,
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
  if (canUseSupportAction({ role, actionKey: 'dismantle-approve', canCreate, canUpdate, canApprove })) {
    supportActionModalItems.push({
      key: 'dismantle-approve',
      title: 'Transfer dismantle',
      description: 'Gunakan form ini untuk mendorong kandidat terminate dari isolir aktif ke antrean dismantle.',
      element: (
        <SupportDismantleForm
          canProcess={canProcess}
          reviewDbReady={reviewDbReady}
          isolationSuggestions={supportIsolationSuggestions}
          initialIsolationValue={supportPrefill?.isolation}
        />
      ),
    })
  }
  if (canUseSupportAction({ role, actionKey: 'isolation-restore', canCreate, canUpdate, canApprove })) {
    supportActionModalItems.push({
      key: 'isolation-restore',
      title: 'Kembali ke restore',
      description: 'Pakai form ini saat keputusan terminate berubah dan kasus perlu dikembalikan ke jalur pemulihan billing.',
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
  if (canUseSupportAction({ role, actionKey: 'dismantle-close', canCreate, canUpdate, canApprove })) {
    supportActionModalItems.push({
      key: 'dismantle-close',
      title: 'Tutup ke histori',
      description: 'Gunakan form ini untuk menutup antrean terminate aktif setelah bukti lapangan dan outcome sudah lengkap.',
      element: (
        <SupportDismantleCloseForm
          canProcess={canProcess}
          reviewDbReady={reviewDbReady}
          dismantleSuggestions={supportDismantleQueueSuggestions}
          initialDismantleValue={supportPrefill?.dismantle}
        />
      ),
    })
  }
  if (canUseSupportAction({ role, actionKey: 'dismantle-reopen', canCreate, canUpdate, canApprove })) {
    supportActionModalItems.push({
      key: 'dismantle-reopen',
      title: 'Reopen queue',
      description: 'Pakai form ini untuk membuka kembali histori terminate yang memang perlu dikoreksi atau ditinjau ulang.',
      element: (
        <SupportDismantleReopenForm
          canProcess={canProcess}
          reviewDbReady={reviewDbReady}
          historySuggestions={supportDismantleHistorySuggestions}
          initialHistoryValue={supportPrefill?.dismantleHistory}
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
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">Dismantle Perangkat</h2>
            <p className="mt-1 text-sm leading-5 text-slate-200">
              Pantau ticket dismantle aktif tanpa menarik otomatis seluruh data isolir bulanan ke menu ini.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenIsolationLane ? (
              <Link href={isolationRecoveryHref} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-950">
                {canUseSupportAction({ role, actionKey: 'isolation-restore', canCreate, canUpdate, canApprove }) ? 'Kembali ke Isolir' : 'Buka Isolir'}
              </Link>
            ) : null}
            {canOpenBillingDecision ? (
              <Link href="/billing" className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                Sinkron Billing
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">Total {supportIsolationSuggestions.length}</span>
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">Sudah Ada Ticket {supportDismantleQueueSuggestions.length}</span>
          <span className="badge border-slate-500 bg-slate-800/70 text-slate-100">
            Belum Ada Ticket {Math.max(supportIsolationSuggestions.length - supportDismantleQueueSuggestions.length, 0)}
          </span>
          {!reviewDbReady ? <span className="badge border-amber-500/60 bg-amber-500/10 text-amber-100">Review DB belum aktif</span> : null}
        </div>
      </section>

      <SupportDismantleQueuePanel
        sections={reviewSections}
        actionLinks={visibleActionLinks}
        role={role}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canApprove={canApprove}
        supportPrefill={supportPrefill}
        supportDrilldown={supportDrilldown ?? null}
      />

      <SupportActionFormModal items={supportActionModalItems} heading="Form aksi lane dismantle" />
    </div>
  )
}
