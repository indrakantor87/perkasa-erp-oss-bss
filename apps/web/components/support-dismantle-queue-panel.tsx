import Link from 'next/link'
import { SupportActionQuickLinks } from '@/components/support-action-quick-links'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportActionHref, buildSupportLaneHref } from '@/lib/support-action-links'
import { canAccessSupportLane, canProcessSupportDismantle } from '@/lib/support-lanes'
import type { AppRole, DomainReviewSection, DomainReviewRow, SupportActionLink } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (normalized.includes('OPEN') || normalized.includes('PENDING')) {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function buildDismantleSummary(rows: DomainReviewRow[]) {
  const marketingNames = Array.from(
    new Set(
      rows
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter((item) => item && item !== '-'),
    ),
  ).slice(0, 4)

  const lastClosed = rows
    .map((row) => pickMeta(row.meta, 'Closed: '))
    .filter((value) => value && value !== '-')
    .slice(0, 1)[0]

  return {
    total: rows.length,
    marketingNames,
    lastClosed,
  }
}

function countPickupPending(rows: DomainReviewRow[]) {
  return rows.filter((row) => {
    const pickupStatus = pickMeta(row.meta, 'Pickup Status: ').trim().toUpperCase()
    return Boolean(pickupStatus) && pickupStatus !== '-' && !pickupStatus.includes('DONE') && !pickupStatus.includes('SELESAI')
  }).length
}

function getActionButtonClass(isPrimary: boolean) {
  if (isPrimary) {
    return 'rounded-md border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800'
  }

  return 'rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
}

function getOpenRowActionItems(params: {
  row: DomainReviewRow
  canProcessDismantle: boolean
  canUpdate: boolean
  canOpenBillingDecision: boolean
}) {
  const queueId = params.row.id.replace(/^DISMANTLE-QUEUE-/, '')
  const queuePrefillValue = `${queueId} | ${params.row.primary} | ${params.row.secondary}`
  const isolationId = pickMeta(params.row.meta, 'Isolation ID: ')
  const isolationPrefillValue = `${isolationId} | ${params.row.primary} | ${params.row.secondary}`

  const actions = [
    ...(params.canProcessDismantle
      ? [
          {
            key: 'close',
            label: 'Tutup ke Histori',
            href: buildSupportActionHref('dismantle-close', {
              dismantle: queuePrefillValue,
            }),
          },
        ]
      : []),
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

  const recommendedKey = params.canProcessDismantle ? 'close' : params.canUpdate ? 'restore' : 'billing'

  return actions.sort((left, right) => {
    const leftRank = left.key === recommendedKey ? 0 : 1
    const rightRank = right.key === recommendedKey ? 0 : 1
    if (leftRank !== rightRank) return leftRank - rightRank
    return left.key.localeCompare(right.key)
  })
}

function getHistoryRowActionItems(params: {
  row: DomainReviewRow
  canProcessDismantle: boolean
  canOpenBillingDecision: boolean
}) {
  const historyId = params.row.id.replace(/^DIS-/, '')
  const historyPrefillValue = `${historyId} | ${params.row.primary} | ${params.row.secondary}`

  const actions = [
    ...(params.canProcessDismantle
      ? [
          {
            key: 'reopen',
            label: 'Reopen ke Queue Aktif',
            href: buildSupportActionHref('dismantle-reopen', {
              dismantleHistory: historyPrefillValue,
            }),
          },
        ]
      : []),
    ...(params.canOpenBillingDecision
      ? [
          {
            key: 'billing',
            label: 'Cek Billing',
            href: '/billing',
          },
        ]
      : []),
  ]

  const recommendedKey = params.canProcessDismantle ? 'reopen' : 'billing'

  return actions.sort((left, right) => {
    const leftRank = left.key === recommendedKey ? 0 : 1
    const rightRank = right.key === recommendedKey ? 0 : 1
    if (leftRank !== rightRank) return leftRank - rightRank
    return left.key.localeCompare(right.key)
  })
}

export function SupportDismantleQueuePanel({
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
  const openSection =
    sections.find((section) => section.title.toUpperCase().includes('QUEUE DISMANTLE OPEN')) ?? null
  const historySection =
    sections.find((section) => section.title.toUpperCase().includes('HISTORI DISMANTLE')) ?? null

  if (!openSection && !historySection) {
    return null
  }

  const historySummary = buildDismantleSummary(historySection?.rows ?? [])
  const openCount = openSection?.rows.length ?? 0
  const pickupPendingCount = countPickupPending(historySection?.rows ?? [])
  const canOpenBillingDecision = canAccessPath(role, '/billing')
  const canOpenIsolationLane = canAccessSupportLane(role, 'isolations')
  const canOpenSupervisorWorkspace = canAccessPath(role, '/customers/cs-admin')
  const canProcessDismantle = canProcessSupportDismantle(role, canApprove)
  function buildQueuePrefillValue(row: DomainReviewRow) {
    const queueId = row.id.replace(/^DISMANTLE-QUEUE-/, '')
    return `${queueId} | ${row.primary} | ${row.secondary}`
  }

  function buildHistoryPrefillValue(row: DomainReviewRow) {
    const historyId = row.id.replace(/^DIS-/, '')
    return `${historyId} | ${row.primary} | ${row.secondary}`
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Dismantle</p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Kandidat terminasi aktif dan histori penutupan layanan
          </h3>
          <p className="mt-1 text-sm leading-5 text-mute">
            Queue terminate aktif, histori penutupan, dan pickup pending dalam satu panel kerja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{openCount} aktif</span>
          <span className="badge border-slate-200 bg-white text-slate-600">{historySummary.total} histori</span>
          {historySummary.lastClosed ? (
            <span className="badge border-slate-200 bg-white text-slate-600">Ditutup: {historySummary.lastClosed}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <article className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Queue Aktif</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-rose-950">
            {openCount}
          </p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Histori Penutupan</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-emerald-950">
            {historySummary.total}
          </p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Pickup Pending</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-amber-950">
            {pickupPendingCount}
          </p>
        </article>
        <article className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">Marketing Aktif</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-violet-950">
            {historySummary.marketingNames.length}
          </p>
        </article>
      </div>

      {historySummary.marketingNames.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">Marketing:</span>
          {historySummary.marketingNames.map((name) => (
            <span key={name} className="badge border-slate-200 bg-white text-slate-600">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <SupportActionQuickLinks
        links={actionLinks}
        description="Tim dismantle bisa langsung melompat ke form transfer, close, reopen, atau restore tanpa keluar dari workspace terminasi."
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {canOpenBillingDecision ? (
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-violet-700 transition hover:opacity-90"
          >
            Sinkron Billing
          </Link>
        ) : null}
        {canOpenIsolationLane ? (
          <Link
            href={buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' })}
            className="inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 transition hover:opacity-90"
          >
            Kembali ke Isolir
          </Link>
        ) : null}
        {canOpenSupervisorWorkspace ? (
          <Link
            href="/customers/cs-admin?queue=Transfer+atau+Restore"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:opacity-90"
          >
            Buka Supervisor CS
          </Link>
        ) : null}
      </div>

      {openSection ? (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Queue Aktif</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Kandidat terminate dari isolir aktif</h4>
            </div>
            <span className="badge border-rose-200 bg-rose-50 text-rose-700">{openCount} kandidat</span>
          </div>

          {openSection.rows.length ? (
            <>
              <div className="mt-4 hidden overflow-hidden rounded-xl border border-line bg-white lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/90">
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Kontak & Konteks</th>
                        <th className="px-4 py-3">Transfer</th>
                        <th className="px-4 py-3">Kepemilikan Proses</th>
                        <th className="px-4 py-3">Catatan</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {openSection.rows.map((row) => {
                        const phone = pickMeta(row.meta, 'Phone: ')
                        const marketing = pickMeta(row.meta, 'Marketing: ')
                        const transferredAt = pickMeta(row.meta, 'Transferred: ')
                        const aging = pickMeta(row.meta, 'Aging: ')
                        const rowActions = getOpenRowActionItems({
                          row,
                          canProcessDismantle,
                          canUpdate,
                          canOpenBillingDecision,
                        })
                        const recommendedActionKey = rowActions[0]?.key ?? 'close'

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
                                <p>Marketing: {marketing}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2 text-sm text-slate-600">
                                <p>Transferred: {transferredAt}</p>
                                <span className="badge border-rose-200 bg-rose-50 text-rose-700">Aging: {aging}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                                  Owner Close: CS & Admin CS
                                </span>
                                <span className="badge border-sky-200 bg-sky-50 text-sky-700">
                                  Owner Restore: Billing
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="max-w-sm text-sm leading-6 text-mute">{row.detail}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-end gap-2">
                                {rowActions.map((action) => (
                                  <Link
                                    key={`${row.id}-${action.key}`}
                                    href={action.href}
                                    className={getActionButtonClass(action.key === recommendedActionKey)}
                                  >
                                    {action.label}
                                  </Link>
                                ))}
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
                {openSection.rows.map((row) => {
                  const phone = pickMeta(row.meta, 'Phone: ')
                  const marketing = pickMeta(row.meta, 'Marketing: ')
                  const transferredAt = pickMeta(row.meta, 'Transferred: ')
                  const aging = pickMeta(row.meta, 'Aging: ')
                  const rowActions = getOpenRowActionItems({
                    row,
                    canProcessDismantle,
                    canUpdate,
                    canOpenBillingDecision,
                  })
                  const recommendedActionKey = rowActions[0]?.key ?? 'close'

                  return (
                    <article key={`${row.id}-mobile`} className="rounded-2xl border border-line bg-rose-50/50 p-5">
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
                        <span className="badge border-slate-200 bg-white text-slate-600">Transferred: {transferredAt}</span>
                        <span className="badge border-rose-200 bg-rose-50 text-rose-700">Aging: {aging}</span>
                        <span className="badge border-rose-200 bg-rose-50 text-rose-700">Close: CS & Admin CS</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {rowActions.map((action) => (
                          <Link
                            key={`${row.id}-${action.key}-mobile`}
                            href={action.href}
                            className={getActionButtonClass(action.key === recommendedActionKey)}
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Belum ada kandidat dismantle dari isolir aktif.</p>
          )}
        </div>
      ) : null}

      {historySection ? (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Histori Penutupan</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Jejak terminasi yang sudah selesai</h4>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{historySummary.total} histori</span>
          </div>

          {historySection.rows.length ? (
            <>
              <div className="mt-4 hidden overflow-hidden rounded-3xl border border-line bg-white lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/90">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Audit Penutupan</th>
                        <th className="px-4 py-3">Field Metadata</th>
                        <th className="px-4 py-3">Billing</th>
                        <th className="px-4 py-3">Ringkasan</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historySection.rows.map((row) => {
                        const phone = pickMeta(row.meta, 'Phone: ')
                        const marketing = pickMeta(row.meta, 'Marketing: ')
                        const closedAt = pickMeta(row.meta, 'Closed: ')
                        const fieldPic = pickMeta(row.meta, 'Field PIC: ')
                        const deviceStatus = pickMeta(row.meta, 'Device Status: ')
                        const pickupStatus = pickMeta(row.meta, 'Pickup Status: ')
                        const closeOutcome = pickMeta(row.meta, 'Close Outcome: ')
                        const billingDisposition = pickMeta(row.meta, 'Billing Disposition: ')
                        const closedBy = pickMeta(row.meta, 'Closed By: ')
                        const rowActions = getHistoryRowActionItems({
                          row,
                          canProcessDismantle,
                          canOpenBillingDecision,
                        })
                        const recommendedActionKey = rowActions[0]?.key ?? 'reopen'

                        return (
                          <tr key={row.id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold text-slate-950">{row.primary}</p>
                                  <p className="text-sm text-mute">{row.secondary}</p>
                                </div>
                                <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                                <p className="text-sm text-slate-600">Phone: {phone}</p>
                                <p className="text-sm text-slate-600">Marketing: {marketing}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2 text-sm text-slate-600">
                                <p>Closed: {closedAt}</p>
                                <p>Closed By: {closedBy}</p>
                                <span className="badge border-slate-200 bg-white text-slate-600">Field PIC: {fieldPic}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex max-w-xs flex-wrap gap-2">
                                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                                  Device: {deviceStatus}
                                </span>
                                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                                  Pickup: {pickupStatus}
                                </span>
                                <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                                  Outcome: {closeOutcome}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <span className="badge border-violet-200 bg-violet-50 text-violet-700">
                                  Billing: {billingDisposition}
                                </span>
                                <span className="badge border-slate-200 bg-white text-slate-600">
                                  Owner Histori: CS & Admin CS
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="max-w-sm text-sm leading-6 text-mute">{row.detail}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-end gap-2">
                                {rowActions.map((action) => (
                                  <Link
                                    key={`${row.id}-${action.key}`}
                                    href={action.href}
                                    className={getActionButtonClass(action.key === recommendedActionKey)}
                                  >
                                    {action.label}
                                  </Link>
                                ))}
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
                {historySection.rows.map((row) => {
                  const phone = pickMeta(row.meta, 'Phone: ')
                  const marketing = pickMeta(row.meta, 'Marketing: ')
                  const closedAt = pickMeta(row.meta, 'Closed: ')
                  const fieldPic = pickMeta(row.meta, 'Field PIC: ')
                  const deviceStatus = pickMeta(row.meta, 'Device Status: ')
                  const pickupStatus = pickMeta(row.meta, 'Pickup Status: ')
                  const closeOutcome = pickMeta(row.meta, 'Close Outcome: ')
                  const billingDisposition = pickMeta(row.meta, 'Billing Disposition: ')
                  const closedBy = pickMeta(row.meta, 'Closed By: ')
                  const rowActions = getHistoryRowActionItems({
                    row,
                    canProcessDismantle,
                    canOpenBillingDecision,
                  })
                  const recommendedActionKey = rowActions[0]?.key ?? 'reopen'

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
                        <span className="badge border-slate-200 bg-white text-slate-600">Closed: {closedAt}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">PIC: {fieldPic}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Closed By: {closedBy}</span>
                        <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                          Device: {deviceStatus}
                        </span>
                        <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                          Pickup: {pickupStatus}
                        </span>
                        <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                          Outcome: {closeOutcome}
                        </span>
                        <span className="badge border-violet-200 bg-violet-50 text-violet-700">
                          Billing: {billingDisposition}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {rowActions.map((action) => (
                          <Link
                            key={`${row.id}-${action.key}-mobile`}
                            href={action.href}
                            className={getActionButtonClass(action.key === recommendedActionKey)}
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Belum ada histori dismantle untuk direview.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
