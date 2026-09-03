'use client'

import Link from 'next/link'
import { useState } from 'react'
import { canAccessPath } from '@/lib/access-control'
import { TableQuickActionModal, type TableQuickActionPayload } from '@/components/table-quick-action-modal'
import { buildSupportActionHref } from '@/lib/support-action-links'
import { canAccessSupportLane, getSupportLaneSections } from '@/lib/support-lanes'
import type { AppRole, DomainReviewSection, DomainReviewRow, SupportActionLink } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRecurringKey(row: DomainReviewRow) {
  const serviceNo = pickMeta(row.meta, 'Service No: ').trim()
  if (serviceNo && serviceNo !== '-' && serviceNo.toLowerCase() !== 'belum ada') return `SVC:${serviceNo}`

  const customerUser = pickMeta(row.meta, 'Customer User: ').trim()
  if (customerUser && customerUser !== '-' && customerUser.toLowerCase() !== 'belum ada') return `USR:${customerUser}`

  const customerCode = pickMeta(row.meta, 'Customer Code: ').trim()
  if (customerCode && customerCode !== '-' && customerCode.toLowerCase() !== 'belum ada') return `CUST:${customerCode}`

  const customerName = row.secondary?.trim()
  if (customerName && customerName !== '-' && customerName.toLowerCase() !== 'belum ada') return `NAME:${customerName}`

  return null
}

function getCloseLabel(meta: string[]) {
  const closed = pickMeta(meta, 'Closed: ')
  if (closed !== '-') {
    return formatCompactDateTime(closed)
  }

  const closeCandidate = pickMeta(meta, 'Close Candidate: ').trim().toUpperCase()
  if (closeCandidate === 'YA') {
    return 'Siap close'
  }

  return '-'
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

function normalizeCellValue(value: string) {
  const normalized = String(value ?? '').trim()
  return normalized && normalized !== '-' ? normalized : 'Belum ada'
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

function formatCompactDateTime(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized === '-') {
    return '-'
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return normalized
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function formatTicketAging(openedAt: string, referenceValue?: string) {
  const opened = new Date(openedAt)
  if (Number.isNaN(opened.getTime())) {
    return '-'
  }

  const reference = referenceValue && referenceValue !== '-' ? new Date(referenceValue) : new Date()
  if (Number.isNaN(reference.getTime())) {
    return '-'
  }

  const diffMs = Math.max(0, reference.getTime() - opened.getTime())
  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}H ${hours}J`
  }
  if (hours > 0) {
    return `${hours}J ${minutes}M`
  }
  return `${minutes}M`
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
  let recurringTicketCount = 0
  const repeatMap = new Map<string, number>()

  for (const row of rows) {
    const queueReason = pickMeta(row.meta, 'Queue Reason: ').trim().toUpperCase()
    const slaState = pickMeta(row.meta, 'SLA State: ').trim().toUpperCase()
    const queuePriority = pickMeta(row.meta, 'Queue Priority: ').trim().toUpperCase()
    const repeatKey = getRecurringKey(row)

    if (queueReason === 'READY_CLOSE') readyCloseCount += 1
    if (queueReason.includes('ESCALATION')) escalationCount += 1
    if (queueReason.includes('OVERDUE') || slaState === 'OVERDUE') overdueCount += 1
    if (queueReason.includes('TODAY') || slaState === 'DUE_TODAY') dueTodayCount += 1
    if (queuePriority === 'P1') priorityOneCount += 1
    if (repeatKey) {
      repeatMap.set(repeatKey, (repeatMap.get(repeatKey) ?? 0) + 1)
    }
  }

  for (const count of repeatMap.values()) {
    if (count > 1) {
      recurringTicketCount += count
    }
  }

  return {
    overdueCount,
    dueTodayCount,
    escalationCount,
    readyCloseCount,
    priorityOneCount,
    recurringTicketCount,
    repeatMap,
  }
}

async function exportTroubleTicketExcel(rows: DomainReviewRow[], repeatMap: Map<string, number>) {
  const xlsxModule = await import('xlsx')
  const XLSX = (xlsxModule as unknown as { default?: any }).default ?? (xlsxModule as any)

  const headers = [
    'ID Ticket',
    'Nama Pelanggan',
    'User',
    'No WA',
    'Service No',
    'Kode Customer',
    'Type',
    'Gangguan',
    'Tindakan Terakhir',
    'PIC',
    'Open',
    'Close',
    'Target SLA',
    'SLA State',
    'Prioritas',
    'Queue',
    'Gangguan Berulang',
  ]

  const lines: string[][] = [headers]
  for (const row of rows) {
    const type = pickMeta(row.meta, 'Type: ')
    const customerUser = pickMeta(row.meta, 'Customer User: ')
    const phone = pickMeta(row.meta, 'Phone: ')
    const serviceNo = pickMeta(row.meta, 'Service No: ')
    const customerCode = pickMeta(row.meta, 'Customer Code: ')
    const latestProgress = pickMeta(row.meta, 'Latest Progress: ')
    const owner = pickMeta(row.meta, 'PIC: ')
    const opened = pickMeta(row.meta, 'Opened: ')
    const closeLabel = getCloseLabel(row.meta)
    const slaDue = pickMeta(row.meta, 'SLA Due: ')
    const slaState = pickMeta(row.meta, 'SLA State: ')
    const priority = pickMeta(row.meta, 'Queue Priority: ')
    const queueReason = getQueueReasonLabel(pickMeta(row.meta, 'Queue Reason: '))
    const recurringKey = getRecurringKey(row)
    const recurringCount = recurringKey ? repeatMap.get(recurringKey) ?? 0 : 0
    lines.push(
      [
        row.primary,
        row.secondary,
        customerUser,
        phone,
        serviceNo,
        customerCode,
        type,
        row.detail,
        latestProgress !== '-' ? latestProgress : getQueueReasonActionCopy(pickMeta(row.meta, 'Queue Reason: ')),
        owner,
        opened,
        closeLabel,
        slaDue,
        slaState,
        priority,
        queueReason,
        recurringCount > 1 ? `Ya (${recurringCount})` : 'Tidak',
      ].map((value) => String(value ?? '').trim()),
    )
  }

  const worksheet = XLSX.utils.aoa_to_sheet(lines)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trouble Ticket')
  const content = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([content], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const filename = `trouble-ticket-${new Date().toISOString().slice(0, 10)}.xlsx`

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 500)
}

function getQueueRowClass(queueReason: string, priority: string, slaState: string) {
  const normalizedReason = queueReason.trim().toUpperCase()
  const normalizedPriority = priority.trim().toUpperCase()
  const normalizedSla = slaState.trim().toUpperCase()

  if (normalizedReason === 'ESCALATION_PENDING' || normalizedSla === 'OVERDUE' || normalizedPriority === 'P1') {
    return 'bg-rose-50/60'
  }
  if (normalizedReason === 'READY_CLOSE') {
    return 'bg-emerald-50/60'
  }
  if (normalizedReason.includes('TODAY') || normalizedSla === 'DUE_TODAY') {
    return 'bg-amber-50/60'
  }

  return 'bg-white'
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

function getQueueReasonLabel(reason: string) {
  const normalized = reason.trim().toUpperCase()

  if (normalized === 'ESCALATION_PENDING') return 'Menunggu Eskalasi'
  if (normalized === 'FOLLOW_UP_OVERDUE') return 'Follow-up Terlambat'
  if (normalized === 'SLA_OVERDUE') return 'SLA Terlewati'
  if (normalized === 'FOLLOW_UP_TODAY') return 'Follow-up Hari Ini'
  if (normalized === 'SLA_DUE_TODAY') return 'SLA Jatuh Tempo Hari Ini'
  if (normalized === 'FOLLOW_UP_SCHEDULED') return 'Follow-up Terjadwal'
  if (normalized === 'WAITING_PROGRESS') return 'Menunggu Progress'
  if (normalized === 'READY_CLOSE') return 'Siap Close'

  return reason || '-'
}

function getRowActionButtonClass(isPrimary: boolean) {
  if (isPrimary) {
    return 'rounded-md border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800'
  }

  return 'rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
}

function getTypeTone(type: string) {
  const normalized = type.trim().toUpperCase()
  if (normalized === 'EMERGENCY') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized === 'PREVENTIVE') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600'
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

function buildTroubleTicketQuickActionPayload(params: {
  row: DomainReviewRow
  canUpdate: boolean
  canApprove: boolean
}): TableQuickActionPayload {
  const type = pickMeta(params.row.meta, 'Type: ')
  const opened = pickMeta(params.row.meta, 'Opened: ')
  const slaDue = pickMeta(params.row.meta, 'SLA Due: ')
  const slaState = pickMeta(params.row.meta, 'SLA State: ')
  const customerUser = pickMeta(params.row.meta, 'Customer User: ')
  const owner = pickMeta(params.row.meta, 'PIC: ')
  const followUp = pickMeta(params.row.meta, 'Next Follow Up: ')
  const progressUpdated = pickMeta(params.row.meta, 'Progress Updated: ')
  const queuePriority = pickMeta(params.row.meta, 'Queue Priority: ')
  const queueReason = pickMeta(params.row.meta, 'Queue Reason: ')
  const serviceNo = pickMeta(params.row.meta, 'Service No: ')
  const phone = pickMeta(params.row.meta, 'Phone: ')
  const linkedWoIdsRaw = pickMeta(params.row.meta, 'Linked Work Order IDs: ')
  const linkedWoCodesRaw = pickMeta(params.row.meta, 'Linked Work Order Codes: ')
  const linkedWoIds =
    linkedWoIdsRaw && linkedWoIdsRaw !== '-' && linkedWoIdsRaw.trim()
      ? linkedWoIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  const linkedWoCodes =
    linkedWoCodesRaw && linkedWoCodesRaw !== '-' && linkedWoCodesRaw.trim()
      ? linkedWoCodesRaw.split('|||').map((s) => s.trim()).filter(Boolean)
      : []
  const rowActions = getRowActionItems({
    queueReason,
    ticket: params.row.primary,
    type,
    canUpdate: params.canUpdate,
    canApprove: params.canApprove,
  })
  const recommendedActionKey = getRecommendedRowActionKey(queueReason)

  return {
    id: params.row.id,
    title: params.row.primary,
    subtitle: params.row.secondary,
    description: params.row.detail,
    draftLabel: 'Ticket',
    copyLabel: 'Salin detail ticket',
    copyText: [
      `ID Ticket: ${params.row.primary}`,
      `Pelanggan: ${params.row.secondary}`,
      `User: ${customerUser}`,
      `Gangguan: ${type}`,
      `Status: ${params.row.status}`,
      `Queue: ${getQueueReasonLabel(queueReason)}`,
      `No WA: ${phone}`,
      `Layanan: ${serviceNo}`,
      `PIC: ${owner}`,
      `Follow-up: ${followUp}`,
      `Update terakhir: ${progressUpdated}`,
      `Prioritas: ${queuePriority}`,
      `SLA: ${slaState}`,
      `Opened: ${opened}`,
      `Keterangan: ${params.row.detail}`,
      linkedWoIds.length ? `Work Orders: ${linkedWoCodes.join(', ') || linkedWoIds.join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    draftSeed: [
      `Queue: ${getQueueReasonLabel(queueReason)}`,
      `Follow-up: ${followUp}`,
      `PIC: ${owner}`,
      `Update terakhir: ${progressUpdated}`,
    ].join('\n'),
    badges: [
      { label: params.row.status, tone: getRowTone(params.row.status) },
      { label: queuePriority, tone: getPriorityTone(queuePriority) },
      { label: slaState, tone: getSlaTone(slaState) },
      { label: getQueueReasonLabel(queueReason) },
    ],
    sections: [
      {
        title: 'Pelanggan / User',
        value: [params.row.secondary, customerUser].filter(Boolean).join('\n'),
      },
      {
        title: 'Gangguan',
        value: [type, params.row.detail].filter(Boolean).join('\n'),
      },
      {
        title: 'PIC / Follow Up',
        value: [`PIC: ${owner}`, `Follow-up: ${followUp}`, `Update: ${progressUpdated}`, `Opened: ${opened}`].join('\n'),
      },
      {
        title: 'Prioritas / SLA',
        value: [`Prioritas: ${queuePriority}`, `SLA: ${slaState}`, `Due: ${slaDue}`].join('\n'),
      },
      ...(linkedWoIds.length
        ? [
            {
              title: `Work Order Turunan (${linkedWoIds.length})`,
              value: linkedWoIds
                .map((woId, idx) => `${linkedWoCodes[idx] || `WO #${woId}`} — /dashboard/tracking/work-orders/${woId}`)
                .join('\n'),
            },
          ]
        : []),
    ],
    actions: rowActions.map((action) => ({
      label: action.label,
      href: action.href,
      tone: action.key === recommendedActionKey ? 'primary' : 'secondary',
    })),
  }
}

export function SupportTroubleTicketQueuePanel({
  sections,
  role,
  canUpdate = true,
  canApprove = true,
  preventiveOpenCount = 0,
}: {
  sections: DomainReviewSection[]
  role: AppRole
  canUpdate?: boolean
  canApprove?: boolean
  preventiveOpenCount?: number
}) {
  const ttSections = getSupportLaneSections(sections, 'tt')
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
  const operationalStats = buildOperationalTicketStats(allRows)
  const canOpenSlaLane = canAccessSupportLane(role, 'sla')
  const canOpenSupervisorWorkspace = canAccessPath(role, '/customers/cs-admin')
  const sectionCounts = visibleSections.map((section) => ({
    title: section.title.replace(/^Trouble Ticket\s+/i, ''),
    count: section.rows.length,
  }))
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Antrean Trouble Ticket</p>
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
        <article className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Trouble Open</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-rose-950">{totalTickets}</p>
        </article>
        <article className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Preventive Open</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-sky-950">
            {preventiveOpenCount}
          </p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Siap Close</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-emerald-950">
            {operationalStats.readyCloseCount}
          </p>
        </article>
        <article className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">Overdue</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-orange-950">
            {operationalStats.overdueCount}
          </p>
        </article>
        <article className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">Ticket Berulang</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-violet-950">
            {operationalStats.recurringTicketCount}
          </p>
        </article>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-slate-50 p-2.5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {canOpenSlaLane ? (
              <Link
                href="/support/sla?focus=SLA_OVERDUE"
                className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700 transition hover:opacity-90"
              >
                SLA Overdue
              </Link>
            ) : null}
            {canOpenSupervisorWorkspace ? (
              <Link
                href="/customers/cs-admin?queue=Trouble+Ticket"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Supervisor CS
              </Link>
            ) : null}
            <button
              type="button"
              disabled={isExporting}
              onClick={async () => {
                try {
                  setIsExporting(true)
                  await exportTroubleTicketExcel(allRows, operationalStats.repeatMap)
                } finally {
                  setIsExporting(false)
                }
              }}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Menyiapkan...' : 'Export Excel'}
            </button>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            P1: {operationalStats.priorityOneCount} • Due today: {operationalStats.dueTodayCount} • Eskalasi: {operationalStats.escalationCount}
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
              <table className="min-w-[1260px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100/90">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-3 py-3">ID Ticket</th>
                    <th className="px-3 py-3">Pelanggan</th>
                    <th className="px-3 py-3">User / Kontak</th>
                    <th className="px-3 py-3">Gangguan</th>
                    <th className="px-3 py-3">Tindakan / PIC</th>
                    <th className="px-3 py-3">Target / SLA</th>
                    <th className="px-3 py-3">Waktu Ticket</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRows.map((row) => {
                    const type = pickMeta(row.meta, 'Type: ')
                    const opened = pickMeta(row.meta, 'Opened: ')
                    const closeLabel = getCloseLabel(row.meta)
                    const slaDue = pickMeta(row.meta, 'SLA Due: ')
                    const slaState = pickMeta(row.meta, 'SLA State: ')
                    const customerUser = pickMeta(row.meta, 'Customer User: ')
                    const serviceNo = pickMeta(row.meta, 'Service No: ')
                    const customerCode = pickMeta(row.meta, 'Customer Code: ')
                    const phone = pickMeta(row.meta, 'Phone: ')
                    const owner = pickMeta(row.meta, 'PIC: ')
                    const followUp = pickMeta(row.meta, 'Next Follow Up: ')
                    const progressUpdated = pickMeta(row.meta, 'Progress Updated: ')
                    const latestProgress = pickMeta(row.meta, 'Latest Progress: ')
                    const queuePriority = pickMeta(row.meta, 'Queue Priority: ')
                    const queueReason = pickMeta(row.meta, 'Queue Reason: ')
                    const rowActions = getRowActionItems({
                      queueReason,
                      ticket: row.primary,
                      type,
                      canUpdate,
                      canApprove,
                    })
                    const aging = formatTicketAging(opened, progressUpdated !== '-' ? progressUpdated : undefined)
                    const recurringKey = getRecurringKey(row)
                    const recurringCount = recurringKey ? operationalStats.repeatMap.get(recurringKey) ?? 0 : 0
                    const isRecurring = recurringCount > 1
                    const rowLinkedWoIdsRaw = pickMeta(row.meta, 'Linked Work Order IDs: ')
                    const rowLinkedWoCodesRaw = pickMeta(row.meta, 'Linked Work Order Codes: ')
                    const rowLinkedWoIds =
                      rowLinkedWoIdsRaw && rowLinkedWoIdsRaw !== '-' && rowLinkedWoIdsRaw.trim()
                        ? rowLinkedWoIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
                        : []
                    const rowLinkedWoCodes =
                      rowLinkedWoCodesRaw && rowLinkedWoCodesRaw !== '-' && rowLinkedWoCodesRaw.trim()
                        ? rowLinkedWoCodesRaw.split('|||').map((s) => s.trim()).filter(Boolean)
                        : []

                    return (
                      <tr key={row.id} className={`align-top ${getQueueRowClass(queueReason, queuePriority, slaState)}`}>
                        <td className="px-3 py-3.5">
                          <div className="space-y-2">
                            {(() => {
                              const code = row.primary
                              const numericMatch = code.match(/(\d+)/)
                              const trackingId = numericMatch ? numericMatch[1] : encodeURIComponent(code)
                              return (
                                <Link
                                  href={`/dashboard/tracking/trouble-tickets/${trackingId}`}
                                  className="transition hover:underline"
                                >
                                  <p className="font-mono text-[13px] font-semibold leading-5 text-slate-950">{code}</p>
                                </Link>
                              )
                            })()}
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                              <span className="badge border-slate-200 bg-white text-slate-600">{getQueueReasonLabel(queueReason)}</span>
                              {rowLinkedWoIds.length ? (
                                <span className="badge border-indigo-200 bg-indigo-50 text-indigo-700">
                                  WO x{rowLinkedWoIds.length}
                                </span>
                              ) : null}
                            </div>
                            {rowLinkedWoIds.length ? (
                              <div className="flex flex-wrap gap-1">
                                {rowLinkedWoIds.slice(0, 3).map((woId, idx) => {
                                  const woCode = rowLinkedWoCodes[idx]
                                  const woNumericMatch = (woCode || String(woId)).match(/(\d+)/)
                                  const woTrackingId = woNumericMatch ? woNumericMatch[1] : encodeURIComponent(woCode || String(woId))
                                  return (
                                    <Link
                                      key={`tt-row-${row.id}-wo-${woId}`}
                                      href={`/dashboard/tracking/work-orders/${woTrackingId}`}
                                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition"
                                    >
                                      {woCode || `WO#${woId}`}
                                    </Link>
                                  )
                                })}
                                {rowLinkedWoIds.length > 3 ? (
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                    +{rowLinkedWoIds.length - 3}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-1.5">
                            <p className="font-medium leading-5 text-slate-900">{row.secondary}</p>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Kode customer</p>
                              <p className="mt-0.5 text-xs text-slate-500">{normalizeCellValue(customerCode)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">User</p>
                              <p className="mt-0.5 break-all text-sm leading-5 text-slate-700">{normalizeCellValue(customerUser)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Kontak / Layanan</p>
                              <p className="mt-0.5 font-mono text-xs text-slate-500">{normalizeCellValue(phone)}</p>
                              <p className="mt-1 font-mono text-xs text-slate-500">{normalizeCellValue(serviceNo)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`badge ${getTypeTone(type)}`}>{type}</span>
                              {isRecurring ? (
                                <span className="badge border-violet-200 bg-violet-50 text-violet-700">
                                  Gangguan berulang x{recurringCount}
                                </span>
                              ) : null}
                            </div>
                            <p className="max-w-[260px] text-sm leading-5 text-slate-700">{row.detail}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Aksi berikutnya</p>
                              <p className="mt-0.5 max-w-[240px] text-sm font-medium leading-5 text-slate-900">
                                {latestProgress !== '-' ? latestProgress : getQueueReasonActionCopy(queueReason)}
                              </p>
                            </div>
                            <div className="space-y-1 text-xs text-slate-500">
                              <p>PIC: {normalizeCellValue(owner)}</p>
                              <p>Follow-up: {formatCompactDateTime(followUp)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`badge ${getPriorityTone(queuePriority)}`}>{queuePriority}</span>
                              <span className={`badge ${getSlaTone(slaState)}`}>{slaState}</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Target SLA</p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatCompactDateTime(slaDue)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Dibuka</p>
                              <p className="mt-0.5 text-sm text-slate-700">{formatCompactDateTime(opened)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Update terakhir</p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatCompactDateTime(progressUpdated)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Durasi / Close</p>
                              <p className="mt-0.5 text-sm font-medium text-slate-900">{aging}</p>
                              <p className="mt-1 text-xs text-slate-500">{closeLabel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {(canUpdate || canApprove) && rowActions.length ? (
                            <div className="flex flex-col items-end gap-2">
                              <p className="max-w-[140px] text-right text-[11px] font-medium leading-4 text-slate-500">
                                {getQueueReasonActionCopy(queueReason)}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuickActionItem(
                                    buildTroubleTicketQuickActionPayload({
                                      row,
                                      canUpdate,
                                      canApprove,
                                    }),
                                  )
                                }
                                className={getRowActionButtonClass(true)}
                              >
                                Aksi cepat
                              </button>
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
              const serviceNo = pickMeta(row.meta, 'Service No: ')
              const phone = pickMeta(row.meta, 'Phone: ')
              const latestProgress = pickMeta(row.meta, 'Latest Progress: ')
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
              const openedLabel = formatCompactDateTime(opened)
              const followUpLabel = formatCompactDateTime(followUp)
              const closeLabel = getCloseLabel(row.meta)
              const recurringKey = getRecurringKey(row)
              const recurringCount = recurringKey ? operationalStats.repeatMap.get(recurringKey) ?? 0 : 0
              const isRecurring = recurringCount > 1
              const rowMobileWoIdsRaw = pickMeta(row.meta, 'Linked Work Order IDs: ')
              const rowMobileWoCodesRaw = pickMeta(row.meta, 'Linked Work Order Codes: ')
              const rowMobileWoIds =
                rowMobileWoIdsRaw && rowMobileWoIdsRaw !== '-' && rowMobileWoIdsRaw.trim()
                  ? rowMobileWoIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
                  : []
              const rowMobileWoCodes =
                rowMobileWoCodesRaw && rowMobileWoCodesRaw !== '-' && rowMobileWoCodesRaw.trim()
                  ? rowMobileWoCodesRaw.split('|||').map((s) => s.trim()).filter(Boolean)
                  : []

              return (
                <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {(() => {
                        const code = row.primary
                        const numericMatch = code.match(/(\d+)/)
                        const trackingId = numericMatch ? numericMatch[1] : encodeURIComponent(code)
                        return (
                          <Link
                            href={`/dashboard/tracking/trouble-tickets/${trackingId}`}
                            className="transition hover:underline"
                          >
                            <p className="text-sm font-semibold text-slate-950">{code}</p>
                          </Link>
                        )
                      })()}
                      <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                    </div>
                    <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`badge ${getPriorityTone(queuePriority)}`}>{queuePriority}</span>
                    <span className={`badge ${getSlaTone(slaState)}`}>{slaState}</span>
                    <span className={`badge ${getTypeTone(type)}`}>{type}</span>
                    {isRecurring ? (
                      <span className="badge border-violet-200 bg-violet-50 text-violet-700">
                        Gangguan berulang x{recurringCount}
                      </span>
                    ) : null}
                    {rowMobileWoIds.length ? (
                      <span className="badge border-indigo-200 bg-indigo-50 text-indigo-700">
                        WO x{rowMobileWoIds.length}
                      </span>
                    ) : null}
                  </div>
                  {rowMobileWoIds.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rowMobileWoIds.map((woId, idx) => {
                        const woCode = rowMobileWoCodes[idx]
                        const woMatch = (woCode || String(woId)).match(/(\d+)/)
                        const woTrackingId = woMatch ? woMatch[1] : encodeURIComponent(woCode || String(woId))
                        return (
                          <Link
                            key={`mobile-wo-${row.id}-${woId}`}
                            href={`/dashboard/tracking/work-orders/${woTrackingId}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition"
                          >
                            {woCode || `WO #${woId}`}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                  <p className="mt-3 text-sm leading-5 text-slate-700">{row.detail}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">User</p>
                        <p className="mt-0.5 break-all text-sm text-slate-700">{normalizeCellValue(customerUser)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Layanan</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">{normalizeCellValue(serviceNo)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">No WA</p>
                        <p className="mt-0.5 font-mono text-sm text-slate-700">{normalizeCellValue(phone)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Dibuka</p>
                        <p className="mt-0.5 text-sm text-slate-700">{openedLabel}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Follow-up</p>
                        <p className="mt-0.5 text-sm text-slate-700">{followUpLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Aksi berikutnya</p>
                        <p className="mt-0.5 text-sm font-medium leading-5 text-slate-900">
                          {latestProgress !== '-' ? latestProgress : getQueueReasonActionCopy(queueReason)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Queue</p>
                        <p className="mt-0.5 text-sm text-slate-700">{getQueueReasonLabel(queueReason)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Close</p>
                        <p className="mt-0.5 text-sm text-slate-700">{closeLabel}</p>
                      </div>
                    </div>
                  </div>
                  {(canUpdate || canApprove) && rowActions.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setQuickActionItem(
                            buildTroubleTicketQuickActionPayload({
                              row,
                              canUpdate,
                              canApprove,
                            }),
                          )
                        }
                        className={getRowActionButtonClass(true)}
                      >
                        Aksi cepat
                      </button>
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

      <TableQuickActionModal
        item={quickActionItem}
        onClose={() => setQuickActionItem(null)}
        heading="Aksi cepat dari tabel trouble ticket"
      />
    </section>
  )
}
