import Link from 'next/link'
import { buildSupportActionHref } from '@/lib/support-action-links'
import type { DomainReviewSection, DomainReviewRow, SupportActionLink } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OPEN') || normalized === 'NEW') {
    return 'border-orange-200 bg-orange-50 text-orange-800'
  }
  if (normalized.includes('PROGRESS') || normalized.includes('FOLLOW')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
  }
  if (normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function getSlaTone(state: string) {
  const normalized = state.trim().toUpperCase()
  if (normalized === 'OVERDUE') {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  if (normalized === 'DUE_TODAY') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (normalized === 'ON_TRACK') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-slate-200 bg-white text-slate-600'
}

function getPriorityTone(priority: string) {
  const normalized = priority.trim().toUpperCase()
  if (normalized === 'P1') {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  if (normalized === 'P2') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (normalized === 'P3') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function getPriorityRank(priority: string) {
  const normalized = priority.trim().toUpperCase()
  if (normalized === 'P1') return 1
  if (normalized === 'P2') return 2
  if (normalized === 'P3') return 3
  if (normalized === 'P4') return 4
  return 5
}

function getSectionPriorityRank(section: DomainReviewSection) {
  if (!section.rows.length) {
    return Number.MAX_SAFE_INTEGER
  }

  return section.rows.reduce((lowestRank, row) => {
    const priority = pickMeta(row.meta, 'Queue Priority: ')
    return Math.min(lowestRank, getPriorityRank(priority))
  }, Number.MAX_SAFE_INTEGER)
}

function buildTicketSummary(rows: DomainReviewRow[]) {
  const byStatus = new Map<string, number>()
  for (const row of rows) {
    const status = row.status?.trim() || 'UNKNOWN'
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }

  const statusItems = Array.from(byStatus.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([status, count]) => ({ status, count }))

  return { statusItems }
}

function buildOperationalTicketStats(rows: DomainReviewRow[]) {
  let overdueCount = 0
  let dueTodayCount = 0
  let escalationCount = 0
  let readyCloseCount = 0
  let priorityOneCount = 0

  for (const row of rows) {
    const queueReason = pickMeta(row.meta, 'Queue Reason: ').trim().toUpperCase()
    const slaState = pickMeta(row.meta, 'SLA State: ').trim().toUpperCase()
    const queuePriority = pickMeta(row.meta, 'Queue Priority: ').trim().toUpperCase()

    if (queueReason === 'READY_CLOSE') readyCloseCount += 1
    if (queueReason.includes('ESCALATION')) escalationCount += 1
    if (queueReason.includes('OVERDUE') || slaState === 'OVERDUE') overdueCount += 1
    if (queueReason.includes('TODAY') || slaState === 'DUE_TODAY') dueTodayCount += 1
    if (queuePriority === 'P1') priorityOneCount += 1
  }

  return {
    overdueCount,
    dueTodayCount,
    escalationCount,
    readyCloseCount,
    priorityOneCount,
  }
}

function getQueueReasonActionCopy(reason: string) {
  const normalized = reason.trim().toUpperCase()

  if (normalized === 'ESCALATION_PENDING') return 'Lanjutkan Eskalasi'
  if (normalized === 'FOLLOW_UP_OVERDUE') return 'Kejar Follow Up'
  if (normalized === 'SLA_OVERDUE') return 'Amankan SLA'
  if (normalized === 'FOLLOW_UP_TODAY') return 'Follow Up Hari Ini'
  if (normalized === 'SLA_DUE_TODAY') return 'Jaga SLA Hari Ini'
  if (normalized === 'FOLLOW_UP_SCHEDULED') return 'Tunggu Slot Follow Up'
  if (normalized === 'WAITING_PROGRESS') return 'Dorong Progress'
  if (normalized === 'READY_CLOSE') return 'Tutup Ticket'
  return 'Update Progress'
}

function getRowActionButtonClass(isPrimary: boolean) {
  if (isPrimary) {
    return 'rounded-md border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800'
  }

  return 'rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
}

function getRecommendedRowActionKey(reason: string) {
  const normalized = reason.trim().toUpperCase()

  if (normalized === 'READY_CLOSE') return 'close'
  if (normalized === 'ESCALATION_PENDING') return 'escalate'
  if (normalized.includes('OVERDUE')) return 'progress'
  if (normalized.includes('TODAY')) return 'progress'
  if (normalized.includes('SCHEDULED')) return 'progress'
  if (normalized.includes('WAITING')) return 'progress'

  return 'progress'
}

function shouldShowRowAction(reason: string, actionKey: string) {
  const normalized = reason.trim().toUpperCase()

  if (normalized === 'READY_CLOSE') return actionKey === 'close' || actionKey === 'progress'
  if (normalized === 'ESCALATION_PENDING') return actionKey === 'escalate' || actionKey === 'progress' || actionKey === 'sla'
  if (normalized === 'SLA_OVERDUE' || normalized === 'SLA_DUE_TODAY') return actionKey === 'progress' || actionKey === 'escalate' || actionKey === 'sla'
  if (normalized === 'FOLLOW_UP_OVERDUE' || normalized === 'FOLLOW_UP_TODAY') return actionKey === 'progress' || actionKey === 'escalate'
  if (normalized === 'FOLLOW_UP_SCHEDULED') return actionKey === 'progress'
  if (normalized === 'WAITING_PROGRESS') return actionKey === 'progress' || actionKey === 'escalate'

  return actionKey !== 'close'
}

function getRowActionLabel(reason: string, actionKey: string) {
  const normalized = reason.trim().toUpperCase()

  if (actionKey === 'sla') return 'Cek SLA'
  if (normalized === 'READY_CLOSE' && actionKey === 'close') return 'Tutup Ticket'
  if (normalized === 'READY_CLOSE' && actionKey === 'progress') return 'Review Progress'
  if (normalized === 'ESCALATION_PENDING' && actionKey === 'escalate') return 'Lanjutkan Eskalasi'
  if (normalized === 'ESCALATION_PENDING' && actionKey === 'progress') return 'Update Progress'
  if ((normalized === 'FOLLOW_UP_OVERDUE' || normalized === 'FOLLOW_UP_TODAY') && actionKey === 'progress') return 'Update Follow Up'
  if ((normalized === 'FOLLOW_UP_OVERDUE' || normalized === 'FOLLOW_UP_TODAY') && actionKey === 'escalate') return 'Eskalasi Ticket'
  if ((normalized === 'SLA_OVERDUE' || normalized === 'SLA_DUE_TODAY') && actionKey === 'progress') return 'Amankan Progress'
  if ((normalized === 'SLA_OVERDUE' || normalized === 'SLA_DUE_TODAY') && actionKey === 'escalate') return 'Naikkan Eskalasi'

  if (actionKey === 'progress') return 'Update Progress'
  if (actionKey === 'escalate') return 'Eskalasi'
  if (actionKey === 'close') return 'Close'
  return 'Tindak Lanjut'
}

function getRowActionItems(params: {
  queueReason: string
  ticket: string
  type: string
  canUpdate: boolean
  canApprove: boolean
}) {
  const recommendedKey = getRecommendedRowActionKey(params.queueReason)
  const actions = [
    ...(params.canUpdate
      ? ([
          {
            key: 'progress',
            label: getRowActionLabel(params.queueReason, 'progress'),
            href: buildSupportActionHref('ticket-progress', {
              ticket: params.ticket,
            }),
          },
          {
            key: 'escalate',
            label: getRowActionLabel(params.queueReason, 'escalate'),
            href: buildSupportActionHref('ticket-escalate', {
              ticket: params.ticket,
            }),
          },
          {
            key: 'close',
            label: getRowActionLabel(params.queueReason, 'close'),
            href: buildSupportActionHref('ticket-close', {
              ticket: params.ticket,
            }),
          },
        ] satisfies Array<{ key: string; label: string; href: string }>)
      : []),
    ...(params.canApprove && params.type !== '-'
      ? [
          {
            key: 'sla',
            label: getRowActionLabel(params.queueReason, 'sla'),
            href: buildSupportActionHref('sla-manage', {
              type: params.type,
            }),
          },
        ]
      : []),
  ].filter((action) => shouldShowRowAction(params.queueReason, action.key))

  return actions.sort((left, right) => {
    const leftRank = left.key === recommendedKey ? 0 : 1
    const rightRank = right.key === recommendedKey ? 0 : 1
    if (leftRank !== rightRank) return leftRank - rightRank
    return left.key.localeCompare(right.key)
  })
}

export function SupportTroubleTicketQueuePanel({
  sections,
  actionLinks = [],
  canUpdate = true,
  canApprove = true,
}: {
  sections: DomainReviewSection[]
  actionLinks?: SupportActionLink[]
  canUpdate?: boolean
  canApprove?: boolean
}) {
  const ttSections = sections
    .filter((section) => section.title.toUpperCase().includes('TROUBLE TICKET'))
    .sort((left, right) => {
      const rankDiff = getSectionPriorityRank(left) - getSectionPriorityRank(right)
      if (rankDiff !== 0) {
        return rankDiff
      }
      return right.rows.length - left.rows.length
    })

  if (!ttSections.length) {
    return null
  }

  const visibleSections = ttSections.filter((section) => section.rows.length > 0)
  const allRows = visibleSections.flatMap((section) => section.rows)
  const totalTickets = allRows.length
  const summary = buildTicketSummary(allRows)
  const operationalStats = buildOperationalTicketStats(allRows)
  const sectionCounts = visibleSections.map((section) => ({
    title: section.title.replace(/^Trouble Ticket\s+/i, ''),
    count: section.rows.length,
  }))

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Trouble Ticket</p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Ticket terbuka yang perlu diproses
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionCounts.map((section) => (
            <span key={section.title} className="badge border-slate-200 bg-white text-slate-600">
              {section.title}: {section.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
        <article className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">Trouble Open</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-orange-950">{totalTickets}</p>
        </article>
        <article className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">P1 / Prioritas</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-sky-950">
            {operationalStats.priorityOneCount}
          </p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Close Ready</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-emerald-950">
            {operationalStats.readyCloseCount}
          </p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Due Today</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-amber-950">
            {operationalStats.dueTodayCount}
          </p>
        </article>
        <article className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Overdue / Esc</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-rose-950">
            {operationalStats.overdueCount + operationalStats.escalationCount}
          </p>
        </article>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-slate-50 p-2.5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {actionLinks.map((action) => (
              <Link
                key={action.key}
                href={action.href}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                {action.label}
              </Link>
            ))}
            <Link
              href="/support/sla?focus=SLA_OVERDUE"
              className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700 transition hover:opacity-90"
            >
              SLA Overdue
            </Link>
            <Link
              href="/customers/cs-admin?queue=Trouble+Ticket"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Supervisor CS
            </Link>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            {summary.statusItems.map((item) => `${item.status}: ${item.count}`).join(' • ') || 'Semua ticket aktif terbaca.'}
          </div>
        </div>
      </div>

      {!canUpdate ? (
        <div className="mt-4 rounded-2xl border border-line bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">Mode baca saja</p>
          <p className="mt-2 text-sm leading-6 text-mute">
            Role aktif tidak memiliki permission untuk update progress, eskalasi, atau close ticket dari lane ini.
          </p>
        </div>
      ) : null}

      {allRows.length ? (
        <>
          <div className="mt-3 hidden overflow-hidden rounded-xl border border-line bg-white lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/90">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-3 py-3">ID Ticket</th>
                    <th className="px-3 py-3">Pelanggan</th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Gangguan</th>
                    <th className="px-3 py-3">Priority / SLA</th>
                    <th className="px-3 py-3">PIC / Follow Up</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRows.map((row) => {
                    const type = pickMeta(row.meta, 'Type: ')
                    const opened = pickMeta(row.meta, 'Opened: ')
                    const slaDue = pickMeta(row.meta, 'SLA Due: ')
                    const slaState = pickMeta(row.meta, 'SLA State: ')
                    const customerUser = pickMeta(row.meta, 'Customer User: ')
                    const owner = pickMeta(row.meta, 'PIC: ')
                    const followUp = pickMeta(row.meta, 'Next Follow Up: ')
                    const progressUpdated = pickMeta(row.meta, 'Progress Updated: ')
                    const queuePriority = pickMeta(row.meta, 'Queue Priority: ')
                    const queueReason = pickMeta(row.meta, 'Queue Reason: ')
                    const rowActions = getRowActionItems({
                      queueReason,
                      ticket: row.primary,
                      type,
                      canUpdate,
                      canApprove,
                    })
                    const recommendedActionKey = getRecommendedRowActionKey(queueReason)

                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3.5">
                          <div className="space-y-1.5">
                            <p className="font-semibold text-slate-950">{row.primary}</p>
                            <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                            <p className="text-xs text-slate-500">{opened}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{row.secondary}</p>
                            <p className="text-xs text-slate-500">{queueReason}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-sm text-slate-600">{customerUser}</td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-1.5">
                            <span className="badge border-slate-200 bg-white text-slate-600">{type}</span>
                            <p className="max-w-sm text-sm leading-5 text-mute">{row.detail}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex max-w-[220px] flex-wrap gap-1.5">
                            <span className={`badge ${getPriorityTone(queuePriority)}`}>{queuePriority}</span>
                            <span className={`badge ${getSlaTone(slaState)}`}>{slaState}</span>
                            <span className="badge border-slate-200 bg-white text-slate-600">{slaDue}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>{owner}</p>
                            <p className="text-xs text-slate-500">{followUp}</p>
                            <p className="text-xs text-slate-500">Progress: {progressUpdated}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {(canUpdate || canApprove) && rowActions.length ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="badge border-slate-200 bg-white text-slate-600">
                                {getQueueReasonActionCopy(queueReason)}
                              </span>
                              {rowActions.map((action) => (
                                <Link
                                  key={`${row.id}-${action.key}`}
                                  href={action.href}
                                  className={getRowActionButtonClass(action.key === recommendedActionKey)}
                                >
                                  {action.label}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span className="badge border-slate-200 bg-white text-slate-600">
                              {getQueueReasonActionCopy(queueReason)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 space-y-3 lg:hidden">
            {allRows.map((row) => {
              const type = pickMeta(row.meta, 'Type: ')
              const opened = pickMeta(row.meta, 'Opened: ')
              const slaState = pickMeta(row.meta, 'SLA State: ')
              const customerUser = pickMeta(row.meta, 'Customer User: ')
              const followUp = pickMeta(row.meta, 'Next Follow Up: ')
              const queuePriority = pickMeta(row.meta, 'Queue Priority: ')
              const queueReason = pickMeta(row.meta, 'Queue Reason: ')
              const rowActions = getRowActionItems({
                queueReason,
                ticket: row.primary,
                type,
                canUpdate,
                canApprove,
              })
              const recommendedActionKey = getRecommendedRowActionKey(queueReason)

              return (
                <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                      <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                    </div>
                    <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`badge ${getPriorityTone(queuePriority)}`}>{queuePriority}</span>
                    <span className={`badge ${getSlaTone(slaState)}`}>{slaState}</span>
                    <span className="badge border-slate-200 bg-white text-slate-600">{type}</span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-mute">{row.detail}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>User: {customerUser}</p>
                    <p>Open: {opened}</p>
                    <p>Follow Up: {followUp}</p>
                    <p>Reason: {queueReason}</p>
                  </div>
                  {(canUpdate || canApprove) && rowActions.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {rowActions.map((action) => (
                        <Link
                          key={`${row.id}-${action.key}`}
                          href={action.href}
                          className={getRowActionButtonClass(action.key === recommendedActionKey)}
                        >
                          {action.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada trouble ticket terbuka untuk direview.</p>
      )}
    </section>
  )
}
