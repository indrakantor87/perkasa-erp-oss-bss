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
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">{content.eyebrow}</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Dismantle
            </h2>
            <p className="mt-1 text-sm leading-5 text-mute">
              Queue terminate aktif, histori close, dan reopen bila keputusan berubah.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })}
              className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Kembali ke Isolir
            </Link>
            <Link
              href="/billing"
              className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
            >
              Sinkron Billing
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{supportDismantleQueueSuggestions.length} queue open</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{supportDismantleHistorySuggestions.length} histori close</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{supportIsolationSuggestions.length} kandidat transfer</span>
          {!reviewDbReady ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      <DataSourceStatus source={source} />

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <form action="/support/dismantle" className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus</span>
            <select
              name="focus"
              defaultValue={supportPrefill?.focus ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua Dismantle</option>
              <option value="OPEN_QUEUE">Queue Open</option>
              <option value="FIELD_FOLLOW_UP">Follow Up Lapangan</option>
              <option value="MONTHLY_DISMANTLES">Close Periode Ini</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <input
              name="status"
              defaultValue={supportPrefill?.status ?? ''}
              placeholder="OPEN / PENDING / CLOSE"
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
              placeholder="Service / pickup / catatan"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              Terapkan
            </button>
            <Link
              href="/support/dismantle"
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

      <SupportDismantleQueuePanel sections={reviewSections} actionLinks={visibleActionLinks} />

      <section className="space-y-4">
        <div>
          <p className="section-title">Aksi Dismantle</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Form tindak lanjut
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            Default layar tetap fokus ke antrean. Buka panel ini hanya saat operator perlu menulis aksi.
          </p>
          {!reviewDbReady ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mode review database belum aktif, sehingga form write-side dinonaktifkan agar tidak menulis ke mock.
            </div>
          ) : null}
        </div>
        <details className="group rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Buka panel aksi dismantle
          </summary>
          <p className="mt-2 text-sm text-mute">
            Berisi `Transfer Dismantle`, `Kembali ke Restore`, `Tutup ke Histori`, dan `Reopen Queue`.
          </p>
          <div className="mt-4 grid gap-6 xl:grid-cols-2">
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
        </details>
      </section>
    </div>
  )
}
