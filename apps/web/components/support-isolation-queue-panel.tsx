'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SupportActionQuickLinks } from '@/components/support-action-quick-links'
import { TableQuickActionModal, type TableQuickActionPayload } from '@/components/table-quick-action-modal'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportActionHref, buildSupportLaneHref } from '@/lib/support-action-links'
import { canAccessSupportLane, canProcessSupportDismantle } from '@/lib/support-lanes'
import type { AppRole, DomainReviewSection, DomainReviewRow, SupportActionLink } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OPEN') || normalized === 'ACTIVE') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (normalized.includes('PENDING') || normalized.includes('FOLLOW')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
  }
  if (normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function buildIsolationSummary(rows: DomainReviewRow[]) {
  const byStatus = new Map<string, number>()
  for (const row of rows) {
    const status = row.status?.trim() || 'UNKNOWN'
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }

  const statusItems = Array.from(byStatus.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([status, count]) => ({ status, count }))

  const marketingNames = Array.from(
    new Set(
      rows
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter((item) => item && item !== '-'),
    ),
  ).slice(0, 4)

  const terminateCount = rows.filter((row) => pickMeta(row.meta, 'Ticket Dismantle: ') === 'Sudah').length
  const restoreCount = rows.length - terminateCount

  return {
    total: rows.length,
    statusItems,
    marketingNames,
    restoreCount,
    terminateCount,
  }
}

function getOwnershipState(row: DomainReviewRow) {
  const dismantleTicket = pickMeta(row.meta, 'Ticket Dismantle: ')
  if (dismantleTicket === 'Sudah') {
    return {
      label: 'Jalur Dismantle',
      owner: 'CS & Admin CS',
      note: 'Kasus sudah masuk queue dismantle dan diperlakukan sebagai terminate permanen.',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      nextLabel: 'Buka Form Dismantle',
      nextHref: buildSupportActionHref('dismantle-approve', {
        isolation: `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`,
      }),
    }
  }

  return {
    label: 'Jalur Restore',
    owner: 'Billing',
    note: 'Kasus masih berada di jalur restore dan menunggu keputusan Billing.',
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    nextLabel: 'Lanjut ke Dismantle',
    nextHref: buildSupportActionHref('dismantle-approve', {
      isolation: `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`,
    }),
  }
}

function getActionButtonClass(isPrimary: boolean) {
  if (isPrimary) {
    return 'rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
  }

  return 'rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
}

function getIsolationRowActionItems(params: {
  row: DomainReviewRow
  canUpdate: boolean
  canTransferToDismantle: boolean
  canOpenBillingDecision: boolean
}) {
  const isolationPrefillValue = `${params.row.id.replace(/^ISO-/, '')} | ${params.row.primary} | ${params.row.secondary}`
  const ownership = getOwnershipState(params.row)
  const isDismantleTrack = pickMeta(params.row.meta, 'Ticket Dismantle: ') === 'Sudah'

  const actions = [
    ...(params.canUpdate
      ? [
          {
            key: 'restore',
            label: 'Buka Form Restore',
            href: buildSupportActionHref('isolation-restore', {
              isolation: isolationPrefillValue,
            }),
          },
        ]
      : []),
    ...(params.canTransferToDismantle
      ? [
          {
            key: 'dismantle',
            label: ownership.nextLabel,
            href: ownership.nextHref,
          },
        ]
      : []),
    ...(params.canOpenBillingDecision
      ? [
          {
            key: 'billing',
            label: 'Buka Billing',
            href: '/billing',
          },
        ]
      : []),
  ]

  const recommendedKey = isDismantleTrack
    ? params.canTransferToDismantle
      ? 'dismantle'
      : params.canUpdate
        ? 'restore'
        : 'billing'
    : params.canUpdate
      ? 'restore'
      : params.canTransferToDismantle
        ? 'dismantle'
        : 'billing'

  return actions.sort((left, right) => {
    const leftRank = left.key === recommendedKey ? 0 : 1
    const rightRank = right.key === recommendedKey ? 0 : 1
    if (leftRank !== rightRank) return leftRank - rightRank
    return left.key.localeCompare(right.key)
  })
}

function buildIsolationQuickActionPayload(params: {
  row: DomainReviewRow
  canUpdate: boolean
  canTransferToDismantle: boolean
  canOpenBillingDecision: boolean
}): TableQuickActionPayload {
  const phone = pickMeta(params.row.meta, 'Phone: ')
  const marketing = pickMeta(params.row.meta, 'Marketing: ')
  const isolasiAt = pickMeta(params.row.meta, 'Isolasi: ')
  const dismantleTicket = pickMeta(params.row.meta, 'Ticket Dismantle: ')
  const ownership = getOwnershipState(params.row)
  const rowActions = getIsolationRowActionItems(params)

  return {
    id: params.row.id,
    title: params.row.primary,
    subtitle: params.row.secondary,
    description: params.row.detail,
    draftLabel: 'Isolir',
    draftSeed: [
      `Marketing: ${marketing}`,
      `Isolasi: ${isolasiAt}`,
      `Kepemilikan: ${ownership.owner}`,
      `Jalur: ${ownership.label}`,
    ].join('\n'),
    badges: [
      { label: params.row.status, tone: getRowTone(params.row.status) },
      {
        label: `Ticket Dismantle: ${dismantleTicket}`,
        tone:
          dismantleTicket === 'Sudah'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-slate-200 bg-white text-slate-600',
      },
      { label: ownership.label, tone: ownership.tone },
    ],
    sections: [
      {
        title: 'Kontak & Radbox',
        value: [`Phone: ${phone}`, `Radbox: ${params.row.secondary}`].join('\n'),
      },
      {
        title: 'Marketing & Isolasi',
        value: [`Marketing: ${marketing}`, `Isolasi: ${isolasiAt}`].join('\n'),
      },
      {
        title: 'Kepemilikan Proses',
        value: [`Owner: ${ownership.owner}`, ownership.note].join('\n'),
      },
      {
        title: 'Ringkasan Kasus',
        value: params.row.detail,
      },
    ],
    actions: rowActions.map((action, index) => ({
      label: action.label,
      href: action.href,
      tone: index === 0 ? 'primary' : 'secondary',
    })),
  }
}

export function SupportIsolationQueuePanel({
  sections,
  actionLinks = [],
  role,
  canUpdate = true,
  canApprove = false,
}: {
  sections: DomainReviewSection[]
  actionLinks?: SupportActionLink[]
  role: AppRole
  canUpdate?: boolean
  canApprove?: boolean
}) {
  const isolationSection =
    sections.find((section) => section.title.toUpperCase().includes('ISOLIR')) ?? null

  if (!isolationSection) {
    return null
  }

  const summary = buildIsolationSummary(isolationSection.rows)
  const canOpenBillingDecision = canAccessPath(role, '/billing')
  const canOpenSlaLane = canAccessSupportLane(role, 'sla')
  const canOpenSupervisorWorkspace = canAccessPath(role, '/customers/cs-admin')
  const canTransferToDismantle = canProcessSupportDismantle(role, canApprove)
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)

  function buildIsolationPrefillValue(row: DomainReviewRow) {
    return `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Isolir</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Suspend aktif yang perlu follow up dan recovery
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Fokuskan identitas pelanggan, mapping radbox, marketing owner, dan tanggal isolir sebelum
            memutuskan apakah kasus tetap menjadi jalur restore milik Billing atau diteruskan ke terminate milik CS & Admin CS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{summary.total} isolir</span>
          <span className="badge border-sky-200 bg-sky-50 text-sky-700">
            Restore Billing: {summary.restoreCount}
          </span>
          <span className="badge border-rose-200 bg-rose-50 text-rose-700">
            Queue Dismantle: {summary.terminateCount}
          </span>
          {summary.statusItems.map((item) => (
            <span key={item.status} className="badge border-slate-200 bg-white text-slate-600">
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Isolir Aktif</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-amber-950">
            {summary.total}
          </p>
          <p className="mt-2 text-sm text-amber-700">Backlog pelanggan suspend yang masih menunggu keputusan.</p>
        </article>
        <article className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Jalur Restore</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-sky-950">
            {summary.restoreCount}
          </p>
          <p className="mt-2 text-sm text-sky-700">Kasus yang masih sehat dibaca sebagai recovery Billing.</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Jalur Terminate</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-rose-950">
            {summary.terminateCount}
          </p>
          <p className="mt-2 text-sm text-rose-700">Kasus yang sudah bergerak ke queue Dismantle CS & Admin CS.</p>
        </article>
        <article className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Marketing Aktif</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-violet-950">
            {summary.marketingNames.length}
          </p>
          <p className="mt-2 text-sm text-violet-700">Nama marketing dominan yang masih muncul di backlog isolir.</p>
        </article>
      </div>

      {summary.marketingNames.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">Marketing:</span>
          {summary.marketingNames.map((name) => (
            <span key={name} className="badge border-slate-200 bg-white text-slate-600">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <SupportActionQuickLinks
        links={actionLinks}
        description="Restore tetap dibaca sebagai keputusan Billing, sedangkan terminate diteruskan ke queue Dismantle milik CS & Admin CS."
      />

      <div className="mt-4 flex flex-wrap gap-3">
        {canOpenBillingDecision ? (
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:opacity-90"
          >
            Buka Billing
          </Link>
        ) : null}
        {canOpenSlaLane ? (
          <Link
            href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
            className="inline-flex items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:opacity-90"
          >
            Kontrol SLA Terkait
          </Link>
        ) : null}
        {canOpenSupervisorWorkspace ? (
          <Link
            href="/customers/cs-admin?queue=Transfer+atau+Restore"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:opacity-90"
          >
            Buka Supervisor CS
          </Link>
        ) : null}
      </div>

      {isolationSection.rows.length ? (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-3xl border border-line bg-white lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/90">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Kontak & Radbox</th>
                    <th className="px-4 py-3">Marketing & Isolasi</th>
                    <th className="px-4 py-3">Kepemilikan Proses</th>
                    <th className="px-4 py-3">Ringkasan Kasus</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isolationSection.rows.map((row) => {
                    const phone = pickMeta(row.meta, 'Phone: ')
                    const marketing = pickMeta(row.meta, 'Marketing: ')
                    const isolasiAt = pickMeta(row.meta, 'Isolasi: ')
                    const dismantleTicket = pickMeta(row.meta, 'Ticket Dismantle: ')
                    const ownership = getOwnershipState(row)
                    const rowActions = getIsolationRowActionItems({
                      row,
                      canUpdate,
                      canTransferToDismantle,
                      canOpenBillingDecision,
                    })
                    const recommendedActionKey =
                      rowActions[0]?.key ??
                      (dismantleTicket === 'Sudah' ? 'dismantle' : 'restore')

                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <div>
                              <p className="font-semibold text-slate-950">{row.primary}</p>
                              <p className="text-sm text-mute">{row.secondary}</p>
                            </div>
                            <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2 text-sm text-slate-600">
                            <p>Phone: {phone}</p>
                            <p>Radbox: {row.secondary}</p>
                            <span
                              className={`badge ${
                                dismantleTicket === 'Sudah'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              Ticket Dismantle: {dismantleTicket}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2 text-sm text-slate-600">
                            <p>Marketing: {marketing}</p>
                            <p>Isolasi: {isolasiAt}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <span className={`badge ${ownership.tone}`}>
                              {ownership.label} • {ownership.owner}
                            </span>
                            <p className="max-w-xs text-sm leading-6 text-mute">{ownership.note}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="max-w-sm text-sm leading-6 text-mute">{row.detail}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setQuickActionItem(
                                  buildIsolationQuickActionPayload({
                                    row,
                                    canUpdate,
                                    canTransferToDismantle,
                                    canOpenBillingDecision,
                                  }),
                                )
                              }
                              className={getActionButtonClass(true)}
                            >
                              Aksi cepat
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 space-y-3 lg:hidden">
            {isolationSection.rows.map((row) => {
              const phone = pickMeta(row.meta, 'Phone: ')
              const marketing = pickMeta(row.meta, 'Marketing: ')
              const isolasiAt = pickMeta(row.meta, 'Isolasi: ')
              const ownership = getOwnershipState(row)
              const rowActions = getIsolationRowActionItems({
                row,
                canUpdate,
                canTransferToDismantle,
                canOpenBillingDecision,
              })
              const recommendedActionKey = rowActions[0]?.key ?? 'restore'

              return (
                <article key={`${row.id}-mobile`} className="rounded-2xl border border-line bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                      <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                    </div>
                    <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-mute">{row.detail}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="badge border-slate-200 bg-white text-slate-600">Phone: {phone}</span>
                    <span className="badge border-slate-200 bg-white text-slate-600">Marketing: {marketing}</span>
                    <span className="badge border-slate-200 bg-white text-slate-600">Isolasi: {isolasiAt}</span>
                    <span className={`badge ${ownership.tone}`}>
                        {ownership.owner} • {ownership.label}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuickActionItem(
                          buildIsolationQuickActionPayload({
                            row,
                            canUpdate,
                            canTransferToDismantle,
                            canOpenBillingDecision,
                          }),
                        )
                      }
                      className={getActionButtonClass(true)}
                    >
                      Aksi cepat
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada data isolir aktif untuk direview.</p>
      )}

      <TableQuickActionModal
        item={quickActionItem}
        onClose={() => setQuickActionItem(null)}
        heading="Aksi cepat dari tabel isolir"
      />
    </section>
  )
}
