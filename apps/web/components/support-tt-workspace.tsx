'use client'

import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { SupportSlaForm } from '@/components/support-sla-form'
import { SupportTicketCloseForm } from '@/components/support-ticket-close-form'
import { SupportTicketCreateForm } from '@/components/support-ticket-create-form'
import { SupportTicketEscalateForm } from '@/components/support-ticket-escalate-form'
import { SupportTicketProgressForm } from '@/components/support-ticket-progress-form'
import { SupportTroubleTicketQueuePanel } from '@/components/support-tt-queue-panel'
import {
  buildSupportActionHref,
  buildSupportLaneHref,
  getSupportActionAnchorId,
} from '@/lib/support-action-links'
import { canUseSupportAction } from '@/lib/support-lanes'
import type {
  AppRole,
  DataSourceSnapshot,
  DomainCapability,
  DomainPageContent,
  DomainReviewRow,
  SupportActionLink,
  SupportDrilldownContext,
} from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.replace(prefix, '').trim() || ''
}

function buildTicketSuggestion(
  row: DomainReviewRow,
  includeEscalation: boolean,
) {
  const ticketCode = row.primary.trim()
  if (!ticketCode) {
    return ''
  }

  const slaDays = pickMeta(row.meta, 'SLA Days: ') || '-'
  const slaDue = pickMeta(row.meta, 'SLA Due: ') || '-'
  const slaState = pickMeta(row.meta, 'SLA State: ') || 'UNSET'
  const owner = pickMeta(row.meta, 'PIC: ') || '-'
  const followUp = pickMeta(row.meta, 'Next Follow Up: ') || '-'
  const latestProgress = pickMeta(row.meta, 'Latest Progress: ') || '-'
  const type = pickMeta(row.meta, 'Type: ') || '-'

  if (!includeEscalation) {
    return `${ticketCode} | ${row.secondary} | ${row.status} | ${type} | ${slaDays} | ${slaDue} | ${slaState} | ${owner} | ${followUp} | ${latestProgress}`
  }

  const escalationTarget = pickMeta(row.meta, 'Escalation Target: ') || '-'
  const escalationLevel = pickMeta(row.meta, 'Escalation Level: ') || '-'
  const escalationAt = pickMeta(row.meta, 'Escalated At: ') || '-'
  const escalationReason = pickMeta(row.meta, 'Escalation Reason: ') || '-'

  return `${ticketCode} | ${row.secondary} | ${row.status} | ${type} | ${slaDays} | ${slaDue} | ${slaState} | ${owner} | ${followUp} | ${latestProgress} | ${escalationTarget} | ${escalationLevel} | ${escalationAt} | ${escalationReason}`
}

export function SupportTroubleTicketWorkspace({
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
    type?: string
    status?: string
    focus?: string
    customer?: string
    service?: string
  }
  supportDrilldown?: SupportDrilldownContext
}) {
  const reviewSections = content.reviewSections ?? []
  const troubleRows = reviewSections
    .filter((section) => section.title.toUpperCase().includes('TROUBLE'))
    .flatMap((section) => section.rows)

  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback

  const supportTypeSuggestions = Array.from(
    new Set(
      reviewSections
        .flatMap((section) => section.rows)
        .flatMap((row) =>
          row.meta
            .filter((item) => item.startsWith('Type: '))
            .map((item) => item.replace('Type: ', '').trim())
            .filter(Boolean),
        ),
    ),
  )
  const supportTicketSuggestions = troubleRows
    .map((row) => buildTicketSuggestion(row, false))
    .filter(Boolean)
  const supportTicketEscalationSuggestions = troubleRows
    .map((row) => buildTicketSuggestion(row, true))
    .filter(Boolean)
  const statusOptions = Array.from(
    new Set(
      troubleRows
        .map((row) => String(row.status ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))

  const actionLinks = [
    {
      key: 'ticket-create',
      label: 'Tambah Ticket',
      description: 'Catat trouble ticket baru ke review DB.',
      href: `#${getSupportActionAnchorId('ticket-create')}`,
    },
    {
      key: 'ticket-progress',
      label: 'Update Progress',
      description: 'Dorong progress dan follow-up ticket aktif.',
      href: `#${getSupportActionAnchorId('ticket-progress')}`,
    },
    {
      key: 'ticket-escalate',
      label: 'Eskalasi',
      description: 'Naikkan kasus yang tertahan atau melewati SLA.',
      href: `#${getSupportActionAnchorId('ticket-escalate')}`,
    },
    {
      key: 'ticket-close',
      label: 'Tutup Ticket',
      description: 'Finalisasi ticket yang sudah ready close.',
      href: `#${getSupportActionAnchorId('ticket-close')}`,
    },
    {
      key: 'sla-manage',
      label: 'Kelola SLA',
      description: 'Atur SLA trouble type untuk lane TT.',
      href: `#${getSupportActionAnchorId('sla-manage')}`,
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
              Trouble Ticket
            </h2>
            <p className="mt-1 text-sm leading-5 text-mute">
              Queue utama, tindak lanjut cepat, dan kontrol SLA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
              className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Kontrol SLA
            </Link>
            <Link
              href="/customers/cs-admin?queue=Trouble+Ticket"
              className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
            >
              Supervisor CS
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{troubleRows.length} ticket</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{supportTypeSuggestions.length} type</span>
          {!reviewDbReady ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      <DataSourceStatus source={source} />

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <form action="/support/tt" className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus</span>
            <select
              name="focus"
              defaultValue={supportPrefill?.focus ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua Ticket</option>
              <option value="OPEN_TICKETS">Open Tickets</option>
              <option value="MONTHLY_OPENED">Periode Ini</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select
              name="status"
              defaultValue={supportPrefill?.status ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Type</span>
            <select
              name="type"
              defaultValue={supportPrefill?.type ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua Type</option>
              {supportTypeSuggestions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Customer</span>
            <input
              name="customer"
              defaultValue={supportPrefill?.customer ?? ''}
              placeholder="Nama customer / kode yang ingin difokuskan"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Service</span>
            <input
              name="service"
              defaultValue={supportPrefill?.service ?? ''}
              placeholder="User / service / petunjuk kasus"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Terapkan
            </button>
            <Link
              href="/support/tt"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {supportDrilldown ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-900">{supportDrilldown.label}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-800">{supportDrilldown.detail}</p>
            </div>
            <Link
              href={supportDrilldown.clearHref}
              className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

      <SupportTroubleTicketQueuePanel
        sections={reviewSections}
        actionLinks={visibleActionLinks}
        canUpdate={canUpdate}
        canApprove={canApprove}
      />

      <section className="space-y-4">
        <div>
          <p className="section-title">Aksi Trouble Ticket</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Form tindak lanjut
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            Default halaman tetap fokus ke tabel. Buka panel ini hanya saat operator perlu menulis aksi.
          </p>
          {!reviewDbReady ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mode review database belum aktif, sehingga form write-side dinonaktifkan agar tidak menulis ke mock.
            </div>
          ) : null}
        </div>
        <details className="group rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Buka panel aksi TT
          </summary>
          <p className="mt-2 text-sm text-mute">
            Berisi `Tambah Ticket`, `Update Progress`, `Eskalasi`, `Close Ticket`, dan `Kelola SLA`.
          </p>
          <div className="mt-4 space-y-4">
          {canUseSupportAction({ role, actionKey: 'ticket-create', canCreate, canUpdate, canApprove }) ? (
            <details id={getSupportActionAnchorId('ticket-create')} className="rounded-2xl border border-line bg-slate-50 p-4 scroll-mt-24">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Tambah trouble ticket
              </summary>
              <div className="mt-4">
                <SupportTicketCreateForm
                  canCreate={canCreate}
                  reviewDbReady={reviewDbReady}
                  typeSuggestions={supportTypeSuggestions}
                />
              </div>
            </details>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'ticket-progress', canCreate, canUpdate, canApprove }) ? (
            <details id={getSupportActionAnchorId('ticket-progress')} className="rounded-2xl border border-line bg-slate-50 p-4 scroll-mt-24">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Update progress ticket
              </summary>
              <div className="mt-4">
                <SupportTicketProgressForm
                  canUpdate={canUpdate}
                  reviewDbReady={reviewDbReady}
                  ticketSuggestions={supportTicketSuggestions}
                  initialTicketCode={supportPrefill?.ticket}
                />
              </div>
            </details>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'ticket-escalate', canCreate, canUpdate, canApprove }) ? (
            <details id={getSupportActionAnchorId('ticket-escalate')} className="rounded-2xl border border-line bg-slate-50 p-4 scroll-mt-24">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Eskalasi ticket
              </summary>
              <div className="mt-4">
                <SupportTicketEscalateForm
                  canUpdate={canUpdate}
                  reviewDbReady={reviewDbReady}
                  ticketSuggestions={supportTicketEscalationSuggestions}
                  initialTicketCode={supportPrefill?.ticket}
                />
              </div>
            </details>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'ticket-close', canCreate, canUpdate, canApprove }) ? (
            <details id={getSupportActionAnchorId('ticket-close')} className="rounded-2xl border border-line bg-slate-50 p-4 scroll-mt-24">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Close ticket
              </summary>
              <div className="mt-4">
                <SupportTicketCloseForm
                  canUpdate={canUpdate}
                  reviewDbReady={reviewDbReady}
                  ticketSuggestions={supportTicketSuggestions}
                  initialTicketCode={supportPrefill?.ticket}
                />
              </div>
            </details>
          ) : null}
          {canUseSupportAction({ role, actionKey: 'sla-manage', canCreate, canUpdate, canApprove }) ? (
            <details id={getSupportActionAnchorId('sla-manage')} className="rounded-2xl border border-line bg-slate-50 p-4 scroll-mt-24">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Kelola SLA trouble ticket
              </summary>
              <div className="mt-4">
                <SupportSlaForm
                  canApprove={canApprove}
                  reviewDbReady={reviewDbReady}
                  typeSuggestions={supportTypeSuggestions}
                  initialTroubleType={supportPrefill?.type}
                />
              </div>
            </details>
          ) : null}
          </div>
        </details>
      </section>
    </div>
  )
}
