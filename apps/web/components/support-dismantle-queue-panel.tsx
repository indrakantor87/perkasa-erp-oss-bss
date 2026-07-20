'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TableQuickActionModal, type TableQuickActionPayload } from '@/components/table-quick-action-modal'
import { Download, Pencil, Trash2, Upload } from 'lucide-react'
import { canAccessPath } from '@/lib/access-control'
import { buildInventoryBarcodeDetailPath } from '@/lib/inventory-barcode-utils'
import { buildSupportActionHref, buildSupportLaneHref } from '@/lib/support-action-links'
import { canAccessSupportLane, canProcessSupportDismantle } from '@/lib/support-lanes'
import type { AppRole, DomainReviewSection, DomainReviewRow, SupportActionLink, SupportDrilldownContext } from '@/lib/types'

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

function parseReturnedItemCodes(meta: string[]) {
  const raw = pickMeta(meta, 'Returned Item Codes: ')
  if (!raw || raw === '-') {
    return [] as string[]
  }

  return Array.from(
    new Set(
      raw
        .split(/[\r\n,;]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
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

function buildOpenDismantleQuickActionPayload(params: {
  row: DomainReviewRow
  canProcessDismantle: boolean
  canUpdate: boolean
  canOpenBillingDecision: boolean
}): TableQuickActionPayload {
  const phone = pickMeta(params.row.meta, 'Phone: ')
  const marketing = pickMeta(params.row.meta, 'Marketing: ')
  const transferredAt = pickMeta(params.row.meta, 'Transferred: ')
  const aging = pickMeta(params.row.meta, 'Aging: ')
  const rowActions = getOpenRowActionItems(params)

  return {
    id: params.row.id,
    title: params.row.primary,
    subtitle: params.row.secondary,
    description: params.row.detail,
    draftLabel: 'Dismantle',
    draftSeed: [
      `Transferred: ${transferredAt}`,
      `Aging: ${aging}`,
      `Marketing: ${marketing}`,
      'Owner Close: CS & Admin CS',
    ].join('\n'),
    badges: [
      { label: params.row.status, tone: getRowTone(params.row.status) },
      { label: `Aging ${aging}`, tone: 'border-rose-200 bg-rose-50 text-rose-700' },
      { label: 'Owner Close: CS & Admin CS', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
    ],
    sections: [
      {
        title: 'Kontak & Konteks',
        value: [`Phone: ${phone}`, `Marketing: ${marketing}`].join('\n'),
      },
      {
        title: 'Transfer',
        value: [`Transferred: ${transferredAt}`, `Aging: ${aging}`].join('\n'),
      },
      {
        title: 'Kepemilikan Proses',
        value: ['Owner Close: CS & Admin CS', 'Owner Restore: Billing'].join('\n'),
      },
      {
        title: 'Catatan',
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

function buildHistoryDismantleQuickActionPayload(params: {
  row: DomainReviewRow
  canProcessDismantle: boolean
  canOpenBillingDecision: boolean
}): TableQuickActionPayload {
  const phone = pickMeta(params.row.meta, 'Phone: ')
  const marketing = pickMeta(params.row.meta, 'Marketing: ')
  const closedAt = pickMeta(params.row.meta, 'Closed: ')
  const fieldPic = pickMeta(params.row.meta, 'Field PIC: ')
  const deviceStatus = pickMeta(params.row.meta, 'Device Status: ')
  const pickupStatus = pickMeta(params.row.meta, 'Pickup Status: ')
  const closeOutcome = pickMeta(params.row.meta, 'Close Outcome: ')
  const billingDisposition = pickMeta(params.row.meta, 'Billing Disposition: ')
  const returnedItemCodes = parseReturnedItemCodes(params.row.meta)
  const closedBy = pickMeta(params.row.meta, 'Closed By: ')
  const rowActions = getHistoryRowActionItems(params)

  return {
    id: params.row.id,
    title: params.row.primary,
    subtitle: params.row.secondary,
    description: params.row.detail,
    draftLabel: 'Histori dismantle',
    draftSeed: [
      `Closed: ${closedAt}`,
      `Closed By: ${closedBy}`,
      `Field PIC: ${fieldPic}`,
      `Billing: ${billingDisposition}`,
    ].join('\n'),
    badges: [
      { label: params.row.status, tone: getRowTone(params.row.status) },
      { label: `Billing: ${billingDisposition}`, tone: 'border-violet-200 bg-violet-50 text-violet-700' },
      { label: `Pickup: ${pickupStatus}`, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    ],
    sections: [
      {
        title: 'Audit Penutupan',
        value: [`Closed: ${closedAt}`, `Closed By: ${closedBy}`, `Field PIC: ${fieldPic}`].join('\n'),
      },
      {
        title: 'Field Metadata',
        value: [`Device: ${deviceStatus}`, `Pickup: ${pickupStatus}`, `Outcome: ${closeOutcome}`].join('\n'),
      },
      {
        title: 'Billing',
        value: [`Billing: ${billingDisposition}`, 'Owner Histori: CS & Admin CS'].join('\n'),
      },
      {
        title: 'Barang Kembali',
        value: returnedItemCodes.length ? returnedItemCodes.join('\n') : 'Belum ada item code return yang tercatat.',
      },
      {
        title: 'Ringkasan',
        value: [`Phone: ${phone}`, `Marketing: ${marketing}`, params.row.detail].join('\n'),
      },
    ],
    actions: [
      ...returnedItemCodes.slice(0, 3).map((itemCode, index) => ({
        label: `Histori Barang ${index + 1}`,
        href: buildInventoryBarcodeDetailPath(itemCode),
        tone: index === 0 ? ('primary' as const) : ('secondary' as const),
      })),
      ...rowActions.map((action, index) => ({
        label: action.label,
        href: action.href,
        tone:
          !returnedItemCodes.length && index === 0
            ? ('primary' as const)
            : ('secondary' as const),
      })),
    ],
  }
}

function buildCsvCell(value: string) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

function exportDismantleCsv(rows: DomainReviewRow[]) {
  const headers = ['Nomor Ticket', 'Nama', 'User', 'No. HP', 'Marketing', 'Keterangan', 'Problem', 'Status']
  const lines = [headers.map(buildCsvCell).join(',')]
  rows.forEach((row) => {
    const ticketNo = pickMeta(row.meta, 'Queue ID: ')
    const user = pickMeta(row.meta, 'Customer Code: ')
    const phone = pickMeta(row.meta, 'Phone: ')
    const marketing = pickMeta(row.meta, 'Marketing: ')
    lines.push([ticketNo, row.primary, user, phone, marketing, row.detail, row.secondary, row.status].map(buildCsvCell).join(','))
  })

  const content = `\uFEFF${lines.join('\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const filename = `dismantle-${new Date().toISOString().slice(0, 10)}.csv`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 500)
}

export function SupportDismantleQueuePanel({
  sections,
  actionLinks = [],
  role,
  canCreate = true,
  canUpdate = true,
  canApprove = false,
  supportDrilldown = null,
}: {
  sections: DomainReviewSection[]
  actionLinks?: SupportActionLink[]
  role: AppRole
  canCreate?: boolean
  canUpdate?: boolean
  canApprove?: boolean
  supportDrilldown?: SupportDrilldownContext | null
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
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [radboxFilter, setRadboxFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('Open')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  function buildQueuePrefillValue(row: DomainReviewRow) {
    const queueId = row.id.replace(/^DISMANTLE-QUEUE-/, '')
    return `${queueId} | ${row.primary} | ${row.secondary}`
  }

  function buildHistoryPrefillValue(row: DomainReviewRow) {
    const historyId = row.id.replace(/^DIS-/, '')
    return `${historyId} | ${row.primary} | ${row.secondary}`
  }

  const openRows = openSection?.rows ?? []
  const radboxOptions = Array.from(new Set(openRows.map((row) => row.secondary.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleRows = openRows.filter((row) => {
    if (radboxFilter && row.secondary.trim() !== radboxFilter) return false
    if (statusFilter && statusFilter.toLowerCase() === 'open' && row.status.trim().toUpperCase() !== 'OPEN') return false
    if (!normalizedSearch) return true
    const phone = pickMeta(row.meta, 'Phone: ')
    const marketing = pickMeta(row.meta, 'Marketing: ')
    const ticketNo = pickMeta(row.meta, 'Queue ID: ')
    return [ticketNo, row.primary, row.secondary, row.detail, phone, marketing].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  })

  const selectedCount = selectedIds.size

  function toggleRow(rowId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  return (
    <section className="rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/20 p-4">
          <p className="text-xs font-semibold text-slate-300">Total Data</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white">{openCount + historySummary.total}</p>
          <p className="mt-2 text-sm text-slate-300">Data isolir aktif dengan ticket dismantle status open.</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-slate-900/20 p-4">
          <p className="text-xs font-semibold text-slate-300">Sudah Ada Ticket</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white">{openCount}</p>
          <p className="mt-2 text-sm text-slate-300">Jumlah seluruh data sesuai filter yang sudah memiliki nomor ticket.</p>
        </article>
        <article className="rounded-2xl border border-slate-700 bg-slate-900/20 p-4">
          <p className="text-xs font-semibold text-slate-300">Belum Ada Ticket</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white">0</p>
          <p className="mt-2 text-sm text-slate-300">Data tanpa ticket tetap dipantau dari menu Isolir.</p>
        </article>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-slate-100">
            <span className="text-slate-300">Cari</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nama pelanggan / alamat / nomor WA"
              className="w-[260px] bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Status Ticket</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none"
            >
              <option>Sudah Ada Ticket</option>
              <option>Open</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Radboox</span>
            <select
              value={radboxFilter}
              onChange={(event) => setRadboxFilter(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Semua Radboox</option>
              {radboxOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Divisi</span>
            <select className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none">
              <option>CS & Admin CS</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Status Data</span>
            <select className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none">
              <option>Open</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-400"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Terpilih ({selectedCount})
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-400"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => exportDismantleCsv(visibleRows)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/20 px-4 py-3 text-sm text-slate-100">
        {supportDrilldown?.detail ||
          'Menu open membaca data isolir aktif yang sudah berticket. Data suspend bulanan yang belum punya ticket tetap berada di menu isolir dengan indikator “Belum”.'}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-[#152643] shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse">
            <thead className="bg-[#162d66]">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-100">
                <th className="w-[44px] px-3 py-3"></th>
                <th className="w-[210px] px-3 py-3">Nomor Ticket</th>
                <th className="w-[220px] px-3 py-3">Nama</th>
                <th className="w-[240px] px-3 py-3">User</th>
                <th className="w-[160px] px-3 py-3">No. HP</th>
                <th className="w-[80px] px-3 py-3">Maps</th>
                <th className="w-[120px] px-3 py-3">Marketing</th>
                <th className="px-3 py-3">Keterangan</th>
                <th className="w-[140px] px-3 py-3">Problem</th>
                <th className="w-[120px] px-3 py-3">Status</th>
                <th className="w-[240px] px-3 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 bg-[#1c2b45]">
              {visibleRows.map((row) => {
                const ticketNo = pickMeta(row.meta, 'Queue ID: ')
                const user = pickMeta(row.meta, 'Customer Code: ')
                const phone = pickMeta(row.meta, 'Phone: ')
                const marketing = pickMeta(row.meta, 'Marketing: ')
                const queuePrefill = buildQueuePrefillValue(row)
                const isSelected = selectedIds.has(row.id)

                return (
                  <tr key={row.id} className="align-top transition-colors hover:bg-[#24395c]">
                    <td className="px-3 py-2 text-sm text-slate-100">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row.id)} />
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                        {ticketNo || row.id.replace(/^DISMANTLE-QUEUE-/, '')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-white">{row.primary}</td>
                    <td className="px-3 py-2 text-sm text-slate-100">{user || '-'}</td>
                    <td className="px-3 py-2 text-sm text-white">{phone || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-300">-</td>
                    <td className="px-3 py-2 text-sm text-slate-100">{marketing || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-100">
                      <p className="line-clamp-2">{row.detail}</p>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-100">{row.secondary}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className="badge border-red-500/60 bg-red-500/10 text-red-100">OPEN</span>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setQuickActionItem(
                              buildOpenDismantleQuickActionPayload({
                                row,
                                canProcessDismantle,
                                canUpdate,
                                canOpenBillingDecision,
                              }),
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit Ticket
                        </button>
                        {canProcessDismantle ? (
                          <Link href={buildSupportActionHref('dismantle-close', { dismantle: queuePrefill })} className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                            Close
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!visibleRows.length ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-sm text-slate-300">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {historySection?.rows.length ? (
        <details className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/20 px-4 py-3 text-sm text-slate-100">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Histori Penutupan ({historySummary.total})
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={buildSupportLaneHref('dismantle', { focus: 'MONTHLY_DISMANTLES' })} className="rounded-md border border-slate-500 bg-slate-700/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-600">
              Buka Histori
            </Link>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {historySection.rows.map((row) => {
              const closedAt = pickMeta(row.meta, 'Closed: ')
              const fieldPic = pickMeta(row.meta, 'Field PIC: ')
              const billingDisposition = pickMeta(row.meta, 'Billing Disposition: ')
              const returnedItemCodes = parseReturnedItemCodes(row.meta)
              const rowActions = getHistoryRowActionItems({
                row,
                canProcessDismantle,
                canOpenBillingDecision,
              })

              return (
                <article key={row.id} className="rounded-2xl border border-slate-700 bg-[#152643] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.18)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge border-emerald-400/40 bg-emerald-500/10 text-emerald-100">{row.status}</span>
                    <span className="badge border-slate-600 bg-slate-800 text-slate-100">{closedAt || '-'}</span>
                    <span className="badge border-violet-400/40 bg-violet-500/10 text-violet-100">{billingDisposition || '-'}</span>
                  </div>
                  <p className="mt-3 text-base font-semibold text-white">{row.primary}</p>
                  <p className="mt-1 text-sm text-slate-300">{row.secondary}</p>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-100">{row.detail}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300">
                    <p>Field PIC: {fieldPic || '-'}</p>
                    <p>Returned Item Codes: {returnedItemCodes.length ? returnedItemCodes.join(', ') : '-'}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuickActionItem(
                          buildHistoryDismantleQuickActionPayload({
                            row,
                            canProcessDismantle,
                            canOpenBillingDecision,
                          }),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Pencil className="h-4 w-4" />
                      Detail Histori
                    </button>
                    {rowActions.map((action, index) => (
                      <Link key={`${row.id}-${action.key}`} href={action.href} className={getActionButtonClass(index === 0)}>
                        {action.label}
                      </Link>
                    ))}
                    {returnedItemCodes.slice(0, 3).map((itemCode) => (
                      <Link
                        key={`${row.id}-${itemCode}`}
                        href={buildInventoryBarcodeDetailPath(itemCode)}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Histori Barang {itemCode}
                      </Link>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </details>
      ) : null}

      <TableQuickActionModal item={quickActionItem} onClose={() => setQuickActionItem(null)} heading="Aksi cepat dari tabel dismantle" />
    </section>
  )
}
