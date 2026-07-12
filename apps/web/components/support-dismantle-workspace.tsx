'use client'

import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { SupportDismantleCloseForm } from '@/components/support-dismantle-close-form'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportDismantleQueuePanel } from '@/components/support-dismantle-queue-panel'
import { SupportDismantleReopenForm } from '@/components/support-dismantle-reopen-form'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
import { canProcessSupportDismantle, canUseSupportAction } from '@/lib/support-lanes'
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
  }
  supportDrilldown?: SupportDrilldownContext
}) {
  const reviewSections = content.reviewSections ?? []
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback
  const canProcess = canProcessSupportDismantle(role, canApprove)

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
      description: 'Masukkan isolir aktif ke queue dismantle.',
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
      label: 'Reopen Queue',
      description: 'Buka kembali histori ke queue aktif.',
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

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <p className="section-title">{content.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Dismantle Console
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-mute">
              Workspace ini memisahkan baca queue terminate, histori close, dan jalur reopen agar pola kerja
              CS & Admin CS lebih mendekati console legacy namun tetap memakai ownership ERP saat ini.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Kembali ke Isolir
            </Link>
            <Link
              href="/billing"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Sinkron Billing
            </Link>
          </div>
        </div>
      </section>

      {supportDrilldown ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-title">{supportDrilldown.label}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{supportDrilldown.detail}</p>
            </div>
            <Link
              href={supportDrilldown.clearHref}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

      <SupportDismantleQueuePanel sections={reviewSections} actionLinks={visibleActionLinks} />

      <section className="space-y-4">
        <div>
          <p className="section-title">Aksi Dismantle</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Form transfer, close, reopen, dan restore tetap hidup
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Jalur terminate tetap diawali dari queue dismantle aktif, lalu ditutup ke histori atau dibuka
            lagi bila keputusan lapangan berubah.
          </p>
          {!reviewDbReady ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mode review database belum aktif, sehingga form write-side dinonaktifkan agar tidak menulis ke mock.
            </div>
          ) : null}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {canUseSupportAction({ role, actionKey: 'dismantle-approve', canCreate, canUpdate, canApprove }) ? (
            <div id={getSupportActionAnchorId('dismantle-approve')} className="scroll-mt-24">
              <SupportDismantleForm
                canProcess={canProcess}
                reviewDbReady={reviewDbReady}
                isolationSuggestions={supportIsolationSuggestions}
                initialIsolationValue={supportPrefill?.isolation}
              />
            </div>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'isolation-restore', canCreate, canUpdate, canApprove }) ? (
            <div id={getSupportActionAnchorId('isolation-restore')} className="scroll-mt-24">
              <SupportIsolationRestoreForm
                canUpdate={canUpdate}
                reviewDbReady={reviewDbReady}
                isolationSuggestions={supportIsolationSuggestions}
                initialIsolationValue={supportPrefill?.isolation}
              />
            </div>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'dismantle-close', canCreate, canUpdate, canApprove }) ? (
            <div id={getSupportActionAnchorId('dismantle-close')} className="scroll-mt-24">
              <SupportDismantleCloseForm
                canProcess={canProcess}
                reviewDbReady={reviewDbReady}
                dismantleSuggestions={supportDismantleQueueSuggestions}
                initialDismantleValue={supportPrefill?.dismantle}
              />
            </div>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'dismantle-reopen', canCreate, canUpdate, canApprove }) ? (
            <div id={getSupportActionAnchorId('dismantle-reopen')} className="scroll-mt-24">
              <SupportDismantleReopenForm
                canProcess={canProcess}
                reviewDbReady={reviewDbReady}
                historySuggestions={supportDismantleHistorySuggestions}
                initialHistoryValue={supportPrefill?.dismantleHistory}
              />
            </div>
          ) : null}
        </div>
      </section>

      {content.highlights.length ? (
        <section className="panel p-6">
          <p className="section-title">Integrasi ERP / OSS / BSS</p>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {content.highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
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
          <p className="mt-4 text-sm leading-6 text-mute">
            Workspace ini menjaga batas ownership restore milik Billing dan terminate milik CS & Admin CS tetap terlihat jelas.
          </p>
        </section>
      ) : null}
    </div>
  )
}
