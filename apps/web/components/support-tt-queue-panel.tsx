import Link from 'next/link'
import { SupportActionQuickLinks } from '@/components/support-action-quick-links'
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

function getQueueReasonTone(reason: string) {
  const normalized = reason.trim().toUpperCase()
  if (normalized === 'READY_CLOSE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (normalized.includes('OVERDUE') || normalized.includes('ESCALATION')) {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  if (normalized.includes('TODAY')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (normalized.includes('SCHEDULED') || normalized.includes('WAITING')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
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

function getRecommendedActionTone(reason: string) {
  const normalized = reason.trim().toUpperCase()
  if (normalized === 'READY_CLOSE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (normalized.includes('ESCALATION') || normalized.includes('OVERDUE')) {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  if (normalized.includes('TODAY')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (normalized.includes('SCHEDULED') || normalized.includes('WAITING')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
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
  const byPriority = new Map<string, number>()
  for (const row of rows) {
    const status = row.status?.trim() || 'UNKNOWN'
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)

    const priority = pickMeta(row.meta, 'Queue Priority: ')
    if (priority !== '-') {
      byPriority.set(priority, (byPriority.get(priority) ?? 0) + 1)
    }
  }

  const statusItems = Array.from(byStatus.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([status, count]) => ({ status, count }))

  const priorityItems = Array.from(byPriority.entries())
    .sort((left, right) => getPriorityRank(left[0]) - getPriorityRank(right[0]))
    .slice(0, 4)
    .map(([priority, count]) => ({ priority, count }))

  return {
    total: rows.length,
    priorityItems,
    statusItems,
  }
}

function buildOperationalTicketStats(rows: DomainReviewRow[]) {
  let overdueCount = 0
  let dueTodayCount = 0
  let escalationCount = 0
  let readyCloseCount = 0

  for (const row of rows) {
    const queueReason = pickMeta(row.meta, 'Queue Reason: ').trim().toUpperCase()
    const slaState = pickMeta(row.meta, 'SLA State: ').trim().toUpperCase()

    if (queueReason === 'READY_CLOSE') {
      readyCloseCount += 1
    }
    if (queueReason.includes('ESCALATION')) {
      escalationCount += 1
    }
    if (queueReason.includes('OVERDUE') || slaState === 'OVERDUE') {
      overdueCount += 1
    }
    if (queueReason.includes('TODAY') || slaState === 'DUE_TODAY') {
      dueTodayCount += 1
    }
  }

  return {
    overdueCount,
    dueTodayCount,
    escalationCount,
    readyCloseCount,
  }
}

function getQueueReasonActionCopy(reason: string) {
  const normalized = reason.trim().toUpperCase()

  if (normalized === 'ESCALATION_PENDING') {
    return {
      primaryLabel: 'Lanjutkan Eskalasi Pending',
      secondaryLabel: 'Catat Progress Pasca Eskalasi',
      tertiaryLabel: 'Cek SLA Tipe Ini',
      focusLabel: 'Butuh tindak lanjut eskalasi sebelum ticket tertahan lebih lama.',
    }
  }

  if (normalized === 'FOLLOW_UP_OVERDUE') {
    return {
      primaryLabel: 'Kejar Follow Up Overdue',
      secondaryLabel: 'Eskalasi Jika Customer Tidak Respons',
      tertiaryLabel: 'Cek SLA Tipe Ini',
      focusLabel: 'Follow-up sudah lewat jadwal dan perlu dikejar lebih dulu.',
    }
  }

  if (normalized === 'SLA_OVERDUE') {
    return {
      primaryLabel: 'Amankan SLA Overdue',
      secondaryLabel: 'Update Progress Penanganan',
      tertiaryLabel: 'Cek SLA Tipe Ini',
      focusLabel: 'SLA sudah terlewati dan perlu tindakan cepat operator.',
    }
  }

  if (normalized === 'FOLLOW_UP_TODAY') {
    return {
      primaryLabel: 'Jalankan Follow Up Hari Ini',
      secondaryLabel: 'Update Hasil Kontak',
      tertiaryLabel: 'Cek SLA Tipe Ini',
      focusLabel: 'Ticket ini dijadwalkan ditindak hari ini.',
    }
  }

  if (normalized === 'SLA_DUE_TODAY') {
    return {
      primaryLabel: 'Amankan SLA Hari Ini',
      secondaryLabel: 'Update Progress Hari Ini',
      tertiaryLabel: 'Cek SLA Tipe Ini',
      focusLabel: 'SLA jatuh hari ini dan perlu diamankan sebelum overdue.',
    }
  }

  if (normalized === 'FOLLOW_UP_SCHEDULED') {
    return {
      primaryLabel: 'Siapkan Follow Up Terjadwal',
      secondaryLabel: 'Review Peluang Ready Close',
      focusLabel: 'Follow-up sudah terjadwal dan perlu dipantau sesuai slot berikutnya.',
    }
  }

  if (normalized === 'WAITING_PROGRESS') {
    return {
      primaryLabel: 'Input Progress Baru',
      secondaryLabel: 'Eskalasi Jika Masih Buntu',
      focusLabel: 'Belum ada dorongan operasional baru sehingga progress berikutnya perlu dicatat.',
    }
  }

  if (normalized === 'READY_CLOSE') {
    return {
      primaryLabel: 'Tutup Ticket Prioritas',
      secondaryLabel: 'Review Progress Terakhir',
      focusLabel: 'Ticket ini sudah matang untuk close formal.',
    }
  }

  return {
    primaryLabel: 'Update Progress',
    secondaryLabel: 'Review Ticket',
    focusLabel: 'Ticket ini perlu ditinjau ulang oleh operator.',
  }
}

function getRowActionButtonClass(isPrimary: boolean) {
  if (isPrimary) {
    return 'rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
  }

  return 'rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
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

  if (normalized === 'READY_CLOSE') {
    return actionKey === 'close' || actionKey === 'progress'
  }

  if (normalized === 'ESCALATION_PENDING') {
    return actionKey === 'escalate' || actionKey === 'progress' || actionKey === 'sla'
  }

  if (normalized === 'SLA_OVERDUE' || normalized === 'SLA_DUE_TODAY') {
    return actionKey === 'progress' || actionKey === 'escalate' || actionKey === 'sla'
  }

  if (normalized === 'FOLLOW_UP_OVERDUE' || normalized === 'FOLLOW_UP_TODAY') {
    return actionKey === 'progress' || actionKey === 'escalate'
  }

  if (normalized === 'FOLLOW_UP_SCHEDULED') {
    return actionKey === 'progress'
  }

  if (normalized === 'WAITING_PROGRESS') {
    return actionKey === 'progress' || actionKey === 'escalate'
  }

  return actionKey !== 'close'
}

function getRowActionCatalogCount(type: string) {
  return type !== '-' ? 4 : 3
}

function getRowActionLabel(reason: string, actionKey: string) {
  const normalized = reason.trim().toUpperCase()
  const actionCopy = getQueueReasonActionCopy(reason)

  if (actionKey === 'sla') {
    return actionCopy.tertiaryLabel ?? 'Cek SLA Tipe Ini'
  }

  if (normalized === 'READY_CLOSE') {
    if (actionKey === 'close') return actionCopy.primaryLabel
    if (actionKey === 'progress') return actionCopy.secondaryLabel
  }

  if (normalized === 'ESCALATION_PENDING') {
    if (actionKey === 'escalate') return actionCopy.primaryLabel
    if (actionKey === 'progress') return actionCopy.secondaryLabel
  }

  if (normalized === 'FOLLOW_UP_OVERDUE' || normalized === 'FOLLOW_UP_TODAY') {
    if (actionKey === 'progress') return actionCopy.primaryLabel
    if (actionKey === 'escalate') return actionCopy.secondaryLabel
  }

  if (normalized === 'SLA_OVERDUE' || normalized === 'SLA_DUE_TODAY') {
    if (actionKey === 'progress') return actionCopy.primaryLabel
    if (actionKey === 'escalate') return 'Naikkan Eskalasi SLA'
  }

  if (normalized === 'FOLLOW_UP_SCHEDULED') {
    if (actionKey === 'progress') return actionCopy.primaryLabel
    if (actionKey === 'close') return actionCopy.secondaryLabel
  }

  if (normalized === 'WAITING_PROGRESS') {
    if (actionKey === 'progress') return actionCopy.primaryLabel
    if (actionKey === 'escalate') return actionCopy.secondaryLabel
  }

  if (actionKey === 'progress') return actionCopy.primaryLabel
  if (actionKey === 'escalate') return 'Eskalasi Ticket'
  if (actionKey === 'close') return 'Tutup Ticket'

  return 'Tindak Lanjut Ticket'
}

function getRowActionSimplificationHint(reason: string, hiddenCount: number) {
  if (hiddenCount <= 0) {
    return null
  }

  const normalized = reason.trim().toUpperCase()

  if (normalized === 'READY_CLOSE') {
    return `${hiddenCount} aksi lain disederhanakan agar operator fokus ke close formal dan review progress terakhir.`
  }

  if (normalized === 'ESCALATION_PENDING') {
    return `${hiddenCount} aksi lain disederhanakan sampai tindak lanjut eskalasi dan kontrol SLA selesai diamankan.`
  }

  if (normalized === 'SLA_OVERDUE' || normalized === 'SLA_DUE_TODAY') {
    return `${hiddenCount} aksi lain disederhanakan agar operator fokus ke progress, eskalasi, dan kontrol SLA lebih dulu.`
  }

  if (normalized === 'FOLLOW_UP_OVERDUE' || normalized === 'FOLLOW_UP_TODAY') {
    return `${hiddenCount} aksi lain disederhanakan agar follow-up customer dan progres lapangan ditangani lebih dulu.`
  }

  if (normalized === 'FOLLOW_UP_SCHEDULED') {
    return `${hiddenCount} aksi lain disederhanakan karena ticket masih menunggu slot follow-up terjadwal.`
  }

  if (normalized === 'WAITING_PROGRESS') {
    return `${hiddenCount} aksi lain disederhanakan agar operator fokus menggerakkan progress ticket kembali.`
  }

  return `${hiddenCount} aksi lain disederhanakan sesuai konteks ticket saat ini.`
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
  ]
    .filter((action) => shouldShowRowAction(params.queueReason, action.key))

  return actions.sort((left, right) => {
    const leftRank = left.key === recommendedKey ? 0 : 1
    const rightRank = right.key === recommendedKey ? 0 : 1
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.key.localeCompare(right.key)
  })
}

function getSectionHeaderActions(
  section: DomainReviewSection,
  params: {
    canUpdate: boolean
    canApprove: boolean
  },
) {
  const topRow = section.rows[0]
  if (!topRow) {
    return []
  }

  const type = pickMeta(topRow.meta, 'Type: ')
  const queueReason = pickMeta(topRow.meta, 'Queue Reason: ')
  return getRowActionItems({
    queueReason,
    ticket: topRow.primary,
    type,
    canUpdate: params.canUpdate,
    canApprove: params.canApprove,
  }).map((action) => ({
    key: `${section.title}-${action.key}`,
    label: action.label,
    href: action.href,
  }))
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
  const totalTickets = visibleSections.reduce((sum, section) => sum + section.rows.length, 0)
  const allRows = visibleSections.flatMap((section) => section.rows)
  const summary = buildTicketSummary(allRows)
  const operationalStats = buildOperationalTicketStats(allRows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Trouble Ticket</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Ticket terbuka yang perlu diproses cepat
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Ringkasan ini membantu operator melihat ticket mana yang masih open, jenis gangguan, dan
            konteks pembukaan sebelum mengeksekusi aksi close/update.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{totalTickets} ticket</span>
          {summary.priorityItems.map((item) => (
            <span key={item.priority} className={`badge ${getPriorityTone(item.priority)}`}>
              {item.priority}: {item.count}
            </span>
          ))}
          {summary.statusItems.map((item) => (
            <span key={item.status} className="badge border-slate-200 bg-white text-slate-600">
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <article className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Open Ticket</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-orange-950">
            {totalTickets}
          </p>
          <p className="mt-2 text-sm text-orange-700">Backlog trouble ticket aktif yang sedang dibaca lane ini.</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Perlu Eskalasi</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-rose-950">
            {operationalStats.escalationCount}
          </p>
          <p className="mt-2 text-sm text-rose-700">Kasus yang tertahan dan butuh naik level penanganan.</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">SLA Hari Ini</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-amber-950">
            {operationalStats.dueTodayCount + operationalStats.overdueCount}
          </p>
          <p className="mt-2 text-sm text-amber-700">
            {operationalStats.overdueCount} overdue dan {operationalStats.dueTodayCount} jatuh tempo hari ini.
          </p>
        </article>
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Siap Close</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-emerald-950">
            {operationalStats.readyCloseCount}
          </p>
          <p className="mt-2 text-sm text-emerald-700">Ticket yang sudah paling dekat ke close formal operator.</p>
        </article>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/support/tt?focus=OPEN_TICKETS"
          className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:opacity-90"
        >
          Fokus Ticket Open
        </Link>
        <Link
          href="/support/sla?focus=SLA_OVERDUE"
          className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:opacity-90"
        >
          Amankan SLA Overdue
        </Link>
        <Link
          href="/customers/cs-admin?queue=Trouble+Ticket"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:opacity-90"
        >
          Buka Supervisor CS
        </Link>
      </div>

      <SupportActionQuickLinks
        links={actionLinks}
        description="Lompat ke form create, update, atau kontrol SLA yang memang diprioritaskan untuk lane Trouble Ticket."
      />

      {!canUpdate ? (
        <div className="mt-6 rounded-2xl border border-line bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">Mode baca saja</p>
          <p className="mt-2 text-sm leading-6 text-mute">
            Role aktif tidak memiliki permission untuk update progress, eskalasi, atau close ticket dari lane ini.
          </p>
        </div>
      ) : null}

      {visibleSections.length > 0 ? (
        <div className="mt-6 space-y-3">
          {visibleSections.map((section) => {
            const sectionActions = getSectionHeaderActions(section, { canUpdate, canApprove })
            const topQueueReason = section.rows[0] ? pickMeta(section.rows[0].meta, 'Queue Reason: ') : '-'
            const focusCopy = getQueueReasonActionCopy(topQueueReason)

            return (
              <div key={section.title} className="space-y-3">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{section.title}</p>
                    <p className="mt-1 text-sm text-mute">{section.description}</p>
                    {section.rows[0] ? (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Fokus cepat untuk {section.rows[0].primary}: {focusCopy.focusLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge border-slate-200 bg-slate-50 text-slate-700">
                      {section.rows.length} ticket
                    </span>
                    {sectionActions.map((action) => (
                      <Link
                        key={action.key}
                        href={action.href}
                        className="rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
                </div>
              <div className="hidden overflow-hidden rounded-3xl border border-line bg-white lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/90">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        <th className="px-4 py-3">Ticket</th>
                        <th className="px-4 py-3">Customer & Type</th>
                        <th className="px-4 py-3">Priority & SLA</th>
                        <th className="px-4 py-3">PIC & Follow Up</th>
                        <th className="px-4 py-3">Queue Context</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {section.rows.map((row) => {
                        const type = pickMeta(row.meta, 'Type: ')
                        const opened = pickMeta(row.meta, 'Opened: ')
                        const slaDays = pickMeta(row.meta, 'SLA Days: ')
                        const slaDue = pickMeta(row.meta, 'SLA Due: ')
                        const slaState = pickMeta(row.meta, 'SLA State: ')
                        const customerUser = pickMeta(row.meta, 'Customer User: ')
                        const owner = pickMeta(row.meta, 'PIC: ')
                        const followUp = pickMeta(row.meta, 'Next Follow Up: ')
                        const followUpState = pickMeta(row.meta, 'Follow Up State: ')
                        const progressUpdated = pickMeta(row.meta, 'Progress Updated: ')
                        const escalationTarget = pickMeta(row.meta, 'Escalation Target: ')
                        const escalationLevel = pickMeta(row.meta, 'Escalation Level: ')
                        const escalatedAt = pickMeta(row.meta, 'Escalated At: ')
                        const queuePriority = pickMeta(row.meta, 'Queue Priority: ')
                        const queueReason = pickMeta(row.meta, 'Queue Reason: ')
                        const closeCandidate = pickMeta(row.meta, 'Close Candidate: ')
                        const actionCopy = getQueueReasonActionCopy(queueReason)
                        const recommendedActionKey = getRecommendedRowActionKey(queueReason)
                        const rowActions = getRowActionItems({
                          queueReason,
                          ticket: row.primary,
                          type,
                          canUpdate,
                          canApprove,
                        })
                        const hiddenActionCount = getRowActionCatalogCount(type) - rowActions.length
                        const actionSimplificationHint = getRowActionSimplificationHint(queueReason, hiddenActionCount)

                        return (
                          <tr key={row.id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold text-slate-950">{row.primary}</p>
                                  <p className="text-sm text-mute">{row.secondary}</p>
                                </div>
                                <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                                <p className="text-sm text-slate-600">Opened: {opened}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <span className="badge border-slate-200 bg-white text-slate-600">Type: {type}</span>
                                <p className="text-sm text-slate-600">User: {customerUser}</p>
                                <p className="max-w-xs text-sm leading-6 text-mute">{row.detail}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex max-w-xs flex-wrap gap-2">
                                <span className={`badge ${getPriorityTone(queuePriority)}`}>Priority: {queuePriority}</span>
                                <span className={`badge ${getSlaTone(slaState)}`}>SLA: {slaState}</span>
                                <span className="badge border-slate-200 bg-white text-slate-600">SLA Days: {slaDays}</span>
                                <span className="badge border-slate-200 bg-white text-slate-600">SLA Due: {slaDue}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2 text-sm text-slate-600">
                                <p>PIC: {owner}</p>
                                <p>Follow Up: {followUp}</p>
                                <span className="badge border-slate-200 bg-white text-slate-600">
                                  Follow State: {followUpState}
                                </span>
                                <span className="badge border-slate-200 bg-white text-slate-600">
                                  Progress: {progressUpdated}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <span className={`badge ${getQueueReasonTone(queueReason)}`}>Reason: {queueReason}</span>
                                  <span className={`badge ${getRecommendedActionTone(queueReason)}`}>
                                    Aksi: {actionCopy.primaryLabel}
                                  </span>
                                  <span className="badge border-slate-200 bg-white text-slate-600">
                                    Close Candidate: {closeCandidate}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">Escalation: {escalationTarget}</p>
                                <p className="text-sm text-slate-600">Esc Level: {escalationLevel}</p>
                                <p className="text-sm text-slate-600">Esc At: {escalatedAt}</p>
                                <p className="max-w-sm text-xs font-medium text-slate-600">
                                  Langkah saat ini: {actionCopy.focusLabel}
                                </p>
                                {actionSimplificationHint ? (
                                  <p className="max-w-sm text-xs text-slate-500">{actionSimplificationHint}</p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {canUpdate || canApprove ? (
                                <div className="flex flex-col items-end gap-2">
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
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 lg:hidden">
                {section.rows.map((row) => {
                  const type = pickMeta(row.meta, 'Type: ')
                  const opened = pickMeta(row.meta, 'Opened: ')
                  const slaDays = pickMeta(row.meta, 'SLA Days: ')
                  const slaDue = pickMeta(row.meta, 'SLA Due: ')
                  const slaState = pickMeta(row.meta, 'SLA State: ')
                  const customerUser = pickMeta(row.meta, 'Customer User: ')
                  const owner = pickMeta(row.meta, 'PIC: ')
                  const followUp = pickMeta(row.meta, 'Next Follow Up: ')
                  const followUpState = pickMeta(row.meta, 'Follow Up State: ')
                  const progressUpdated = pickMeta(row.meta, 'Progress Updated: ')
                  const escalationTarget = pickMeta(row.meta, 'Escalation Target: ')
                  const escalationLevel = pickMeta(row.meta, 'Escalation Level: ')
                  const escalatedAt = pickMeta(row.meta, 'Escalated At: ')
                  const queuePriority = pickMeta(row.meta, 'Queue Priority: ')
                  const queueReason = pickMeta(row.meta, 'Queue Reason: ')
                  const closeCandidate = pickMeta(row.meta, 'Close Candidate: ')
                  const actionCopy = getQueueReasonActionCopy(queueReason)
                  const recommendedActionKey = getRecommendedRowActionKey(queueReason)
                  const rowActions = getRowActionItems({
                    queueReason,
                    ticket: row.primary,
                    type,
                    canUpdate,
                    canApprove,
                  })
                  const hiddenActionCount = getRowActionCatalogCount(type) - rowActions.length
                  const actionSimplificationHint = getRowActionSimplificationHint(queueReason, hiddenActionCount)

                  return (
                    <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                          <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                        </div>
                        <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-mute">{row.detail}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="badge border-slate-200 bg-white text-slate-600">Type: {type}</span>
                        <span className={`badge ${getPriorityTone(queuePriority)}`}>Priority: {queuePriority}</span>
                        <span className={`badge ${getQueueReasonTone(queueReason)}`}>Reason: {queueReason}</span>
                        <span className={`badge ${getRecommendedActionTone(queueReason)}`}>
                          Aksi Disarankan: {actionCopy.primaryLabel}
                        </span>
                        <span className="badge border-slate-200 bg-white text-slate-600">
                          Close Candidate: {closeCandidate}
                        </span>
                        <span className={`badge ${getSlaTone(slaState)}`}>SLA: {slaState}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">SLA Days: {slaDays}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">SLA Due: {slaDue}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Opened: {opened}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">User: {customerUser}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">PIC: {owner}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Follow Up: {followUp}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">State: {followUpState}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Progress: {progressUpdated}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Escalation: {escalationTarget}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Esc Level: {escalationLevel}</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">Esc At: {escalatedAt}</span>
                      </div>
                      <p className="mt-3 text-xs font-medium text-slate-600">
                        Langkah saat ini: {actionCopy.focusLabel}
                      </p>
                      {canUpdate || canApprove ? (
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
                      {actionSimplificationHint ? (
                        <p className="mt-2 text-xs text-slate-500">{actionSimplificationHint}</p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada trouble ticket terbuka untuk direview.</p>
      )}
    </section>
  )
}
