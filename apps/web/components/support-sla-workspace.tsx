'use client'

import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { SupportSlaForm } from '@/components/support-sla-form'
import { SupportSlaQueuePanel } from '@/components/support-sla-queue-panel'
import { getSupportActionAnchorId } from '@/lib/support-action-links'
import { canUseSupportAction } from '@/lib/support-lanes'
import type {
  AppRole,
  DataSourceSnapshot,
  DomainCapability,
  DomainPageContent,
  SupportActionLink,
  SupportDrilldownContext,
} from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

export function SupportSlaWorkspace({
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
    type?: string
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

  const troubleTypeSuggestions = Array.from(
    new Set(
      reviewSections
        .flatMap((section) =>
          section.rows.flatMap((row) => {
            const typeFromMeta = pickMeta(row.meta, 'Type: ')
            const base = [typeFromMeta]
            if (section.title.toUpperCase().includes('SLA')) {
              base.push(row.primary.trim())
            }
            return base.filter(Boolean)
          }),
        ),
    ),
  )

  const actionLinks = [
    {
      key: 'sla-manage',
      label: 'Kelola SLA',
      description: 'Tambah atau ubah durasi SLA per tipe trouble.',
      href: `#${getSupportActionAnchorId('sla-manage')}`,
    },
    {
      key: 'ticket-progress',
      label: 'Update Progress',
      description: 'Buka tindak lanjut ticket yang terkait dengan SLA.',
      href: '/support/tt?focus=OPEN_TICKETS',
    },
    {
      key: 'ticket-escalate',
      label: 'Eskalasi TT',
      description: 'Naikkan kasus yang rawan overdue.',
      href: '/support/tt?focus=OPEN_TICKETS',
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
              SLA Trouble Ticket
            </h2>
            <p className="mt-1 text-sm leading-5 text-mute">
              Rule SLA, ticket aktif, dan kontrol eskalasi dalam layar kerja yang ringkas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/support/tt?focus=OPEN_TICKETS"
              className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Buka TT Aktif
            </Link>
            <Link
              href="/customers/cs-admin?queue=Queue+Risiko+Tinggi"
              className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
            >
              Supervisor CS
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{troubleTypeSuggestions.length} tipe trouble</span>
          {!reviewDbReady ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      <DataSourceStatus source={source} />

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <form action="/support/sla" className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus</span>
            <select
              name="focus"
              defaultValue={supportPrefill?.focus ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua SLA</option>
              <option value="SLA_OVERDUE">SLA Overdue</option>
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
              {troubleTypeSuggestions.map((type) => (
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
              placeholder="Nama customer / service"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Konteks</span>
            <input
              name="service"
              defaultValue={supportPrefill?.service ?? ''}
              placeholder="User / detail ticket / service"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              Terapkan
            </button>
            <Link
              href="/support/sla"
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

      <SupportSlaQueuePanel sections={reviewSections} actionLinks={visibleActionLinks} />

      {canUseSupportAction({ role, actionKey: 'sla-manage', canCreate, canUpdate, canApprove }) ? (
        <section className="space-y-4">
          <div>
            <p className="section-title">Aksi SLA</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Form pengaturan SLA
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
              Default layar tetap fokus ke tabel SLA. Buka panel ini hanya saat aturan perlu diubah.
            </p>
          </div>
          <details className="group rounded-2xl border border-line bg-white p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
              Buka panel aksi SLA
            </summary>
            <p className="mt-2 text-sm text-mute">
              Berisi pengaturan durasi SLA per tipe trouble.
            </p>
            <div id={getSupportActionAnchorId('sla-manage')} className="mt-4 scroll-mt-24">
              <SupportSlaForm
                canApprove={canApprove}
                reviewDbReady={reviewDbReady}
                typeSuggestions={troubleTypeSuggestions}
                initialTroubleType={supportPrefill?.type}
              />
            </div>
          </details>
        </section>
      ) : null}
    </div>
  )
}
