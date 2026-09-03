'use client'

import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { SupportActionFormModal } from '@/components/support-action-form-modal'
import { SupportSlaForm } from '@/components/support-sla-form'
import { SupportSlaQueuePanel } from '@/components/support-sla-queue-panel'
import { SupportWorkspaceHelperNote } from '@/components/support-workspace-helper-note'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportLaneActionHref, buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
import { canAccessSupportLane, canUseSupportAction } from '@/lib/support-lanes'
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
  const totalQueueItems = reviewSections.reduce((sum, s) => sum + (s.rows?.length ?? 0), 0)
  const queueNoCapabilities = capabilities.length === 0 || capabilities.every((c) => !c.enabled)
  const canOpenTicketLane = canAccessSupportLane(role, 'tt')
  const canOpenSupervisorWorkspace = canAccessPath(role, '/customers/cs-admin')
  const canOpenBillingDecision = canAccessPath(role, '/billing')
  const ttProgressHref = buildSupportLaneActionHref('tt', 'ticket-progress', { focus: 'OPEN_TICKETS' })
  const ttEscalationHref = buildSupportLaneActionHref('tt', 'ticket-escalate', { focus: 'OPEN_TICKETS' })
  const ttPrimaryHref = canUseSupportAction({ role, actionKey: 'ticket-progress', canCreate, canUpdate, canApprove })
    ? ttProgressHref
    : buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })

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
  const slaRows = reviewSections
    .filter((section) => section.title.toUpperCase().includes('SLA'))
    .flatMap((section) => section.rows)

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
      href: ttProgressHref,
    },
    {
      key: 'ticket-escalate',
      label: 'Eskalasi TT',
      description: 'Naikkan kasus yang rawan overdue.',
      href: ttEscalationHref,
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
  const supportActionModalItems = canUseSupportAction({ role, actionKey: 'sla-manage', canCreate, canUpdate, canApprove })
    ? [
        {
          key: 'sla-manage' as const,
          title: 'Kelola SLA trouble ticket',
          description: 'Gunakan form ini untuk memperbarui durasi SLA per tipe trouble saat kebutuhan lapangan atau target layanan berubah.',
          element: (
            <SupportSlaForm
              canApprove={canApprove}
              reviewDbReady={reviewDbReady}
              typeSuggestions={troubleTypeSuggestions}
              initialTroubleType={supportPrefill?.type}
            />
          ),
        },
      ]
    : []

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
              Lane kontrol durasi layanan untuk rule SLA, ticket berisiko, dan keputusan eskalasi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenTicketLane ? (
              <Link
                href={ttPrimaryHref}
                className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
              >
                {canUseSupportAction({ role, actionKey: 'ticket-progress', canCreate, canUpdate, canApprove })
                  ? 'Update TT Aktif'
                  : 'Buka TT Aktif'}
              </Link>
            ) : null}
            {canOpenSupervisorWorkspace ? (
              <Link
                href="/customers/cs-admin?queue=Queue+Risiko+Tinggi"
                className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
              >
                Supervisor CS
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{slaRows.length} aturan SLA</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{troubleTypeSuggestions.length} tipe trouble</span>
          {!reviewDbReady ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review DB belum aktif</span>
          ) : null}
        </div>
      </section>

      <SupportWorkspaceHelperNote
        title="Pastikan rule SLA mencerminkan realita lapangan sebelum backlog ticket menjadi overdue."
        detail="Lane ini dipakai untuk menjaga target durasi per tipe trouble tetap sehat. Perbarui rule SLA lebih dulu, lalu dorong progress atau eskalasi ticket yang terlihat paling berisiko dari panel yang sama."
        badges={[
          { label: `${slaRows.length} aturan SLA`, tone: 'neutral' },
          { label: `${troubleTypeSuggestions.length} tipe trouble`, tone: 'info' },
          { label: 'Fokus: overdue & risiko', tone: 'warning' },
        ]}
      />

      <DataSourceStatus source={source} />

      <section className="rounded-xl border border-line bg-slate-50 p-3">
        <form action="/support/sla" className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus Antrian</span>
            <select
              name="focus"
              defaultValue={supportPrefill?.focus ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua SLA</option>
              <option value="SLA_OVERDUE">SLA Terlewati</option>
              <option value="OVERDUE_RATE">Rasio Overdue</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tipe Trouble</span>
            <select
              name="type"
              defaultValue={supportPrefill?.type ?? ''}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua Tipe</option>
              {troubleTypeSuggestions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Pelanggan</span>
            <input
              name="customer"
              defaultValue={supportPrefill?.customer ?? ''}
              placeholder="Nama pelanggan / layanan"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-[1.2] flex-col gap-1 text-sm text-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Layanan / Konteks</span>
            <input
              name="service"
              defaultValue={supportPrefill?.service ?? ''}
              placeholder="User, detail ticket, atau layanan"
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

      {queueNoCapabilities ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Akses Terbatas</p>
          <h3 className="mt-3 text-lg font-semibold text-rose-950">Tidak ada izin untuk lane SLA</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-800">
            Role aktif tidak memiliki kemampuan mengelola rule SLA. Hubungi admin untuk membuka izin
            <code className="mx-1 rounded border border-rose-200 bg-white px-1.5 py-0.5">support:manage</code> atau
            <code className="mx-1 rounded border border-rose-200 bg-white px-1.5 py-0.5">support:update</code>.
          </p>
        </section>
      ) : !reviewDbReady && totalQueueItems === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            Memuat rule SLA
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">Menyiapkan koneksi ke Review DB</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Rule SLA, daftar tipe trouble, dan status overdue akan muncul segera setelah koneksi siap. Coba refresh
            jika indikator di atas tidak berubah dalam 10 detik.
          </p>
        </section>
      ) : totalQueueItems === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aturan SLA Kosong</p>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Belum ada rule SLA untuk kriteria ini</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Coba ubah fokus overdue, tipe trouble, atau reset filter. Untuk menambah atau memperbarui durasi SLA,
            gunakan{' '}
            <span className="inline-flex rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold">
              Kelola SLA
            </span>{' '}
            di panel atas.
          </p>
        </section>
      ) : (
        <SupportSlaQueuePanel
          sections={reviewSections}
          actionLinks={visibleActionLinks}
          role={role}
          canOpenBillingDecision={canOpenBillingDecision}
        />
      )}

      <SupportActionFormModal items={supportActionModalItems} heading="Form aksi lane SLA" />
    </div>
  )
}
