'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TableQuickActionModal, type TableQuickActionPayload } from '@/components/table-quick-action-modal'
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { buildSupportActionHref } from '@/lib/support-action-links'
import { canProcessSupportDismantle } from '@/lib/support-lanes'
import type { AppRole, DomainReviewSection, DomainReviewRow, SupportActionLink, SupportDrilldownContext } from '@/lib/types'

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
      note: 'Kasus sudah masuk antrean dismantle dan diperlakukan sebagai terminate permanen.',
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
    copyLabel: 'Salin detail isolir',
    copyText: [
      `Nama Pelanggan: ${params.row.primary}`,
      `Radboox: ${params.row.secondary}`,
      `Status Suspend: ${params.row.status}`,
      `No HP: ${phone}`,
      `Marketing: ${marketing}`,
      `Tanggal Isolir: ${isolasiAt}`,
      `Ticket Dismantle: ${dismantleTicket}`,
      `Owner: ${ownership.owner}`,
      `Jalur: ${ownership.label}`,
      `Keterangan: ${params.row.detail}`,
    ].join('\n'),
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

function buildCsvCell(value: string) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

function exportIsolationCsv(rows: DomainReviewRow[]) {
  const headers = [
    'No',
    'Nama Pelanggan',
    'Active Date',
    'User',
    'No HP',
    'Marketing',
    'Radboox',
    'Suspend',
    'Harga',
    'Keterangan',
    'Ticket',
  ]

  const lines = [headers.map(buildCsvCell).join(',')]
  rows.forEach((row, index) => {
    const activeDate = pickMeta(row.meta, 'Isolasi: ')
    const customerUser = pickMeta(row.meta, 'Customer User: ')
    const phone = pickMeta(row.meta, 'Phone: ')
    const marketing = pickMeta(row.meta, 'Marketing: ')
    const ticket = pickMeta(row.meta, 'Ticket Dismantle: ')

    lines.push(
      [
        String(index + 1),
        row.primary,
        activeDate,
        customerUser,
        phone,
        marketing,
        row.secondary,
        row.status,
        '-',
        row.detail,
        ticket,
      ]
        .map(buildCsvCell)
        .join(','),
    )
  })

  const content = `\uFEFF${lines.join('\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const filename = `isolir-${new Date().toISOString().slice(0, 10)}.csv`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 500)
}

export function SupportIsolationQueuePanel({
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
  const isolationSection =
    sections.find((section) => section.title.toUpperCase().includes('ISOLIR')) ?? null

  if (!isolationSection) {
    return null
  }

  const canTransferToDismantle = canProcessSupportDismantle(role, canApprove)
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [radboxFilter, setRadboxFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  function buildIsolationPrefillValue(row: DomainReviewRow) {
    return `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`
  }

  const radboxOptions = Array.from(
    new Set(
      isolationSection.rows
        .map((row) => row.secondary.trim())
        .filter((value) => value && !value.toLowerCase().includes('belum terpetakan')),
    ),
  ).sort((left, right) => left.localeCompare(right))

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleRows = isolationSection.rows.filter((row) => {
    if (radboxFilter && row.secondary.trim() !== radboxFilter) return false
    if (!normalizedSearch) return true

    const customerUser = pickMeta(row.meta, 'Customer User: ')
    const phone = pickMeta(row.meta, 'Phone: ')
    const marketing = pickMeta(row.meta, 'Marketing: ')

    return [row.primary, row.secondary, row.detail, row.status, customerUser, phone, marketing].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  })

  const selectedCount = selectedIds.size
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id))

  function toggleRow(rowId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        visibleRows.forEach((row) => next.delete(row.id))
        return next
      }
      visibleRows.forEach((row) => next.add(row.id))
      return next
    })
  }

  return (
    <section className="panel p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink">
            <span className="text-mute">Cari</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari Nama / User / No HP / Marketing..."
              className="w-[260px] bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </div>
          <select
            value={radboxFilter}
            onChange={(event) => setRadboxFilter(event.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          >
            <option value="">Semua Radboox</option>
            {radboxOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-line surface-soft text-mute">{visibleRows.length} baris tampil</span>
            <span className="badge border-line surface-soft text-mute">{selectedCount} terpilih</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportIsolationCsv(visibleRows)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Terpilih ({selectedCount})
          </button>
          {canCreate ? (
            <Link
              href={buildSupportActionHref('isolation-create')}
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950"
            >
              <Plus className="h-4 w-4" />
              Tambah Isolir
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border-line surface-soft px-4 py-3 text-sm text-ink">
        {supportDrilldown?.detail ||
          'Fokus ke pelanggan isolir aktif untuk keputusan restore atau transfer terminate.'}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <th className="w-[44px] px-3 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                </th>
                <th className="w-[60px] px-3 py-3">No</th>
                <th className="w-[220px] px-3 py-3">Nama Pelanggan</th>
                <th className="w-[220px] px-3 py-3">User</th>
                <th className="w-[160px] px-3 py-3">No. HP</th>
                <th className="w-[120px] px-3 py-3">Marketing</th>
                <th className="w-[120px] px-3 py-3">Radboox</th>
                <th className="w-[110px] px-3 py-3">Suspend</th>
                <th className="px-3 py-3">Keterangan</th>
                <th className="w-[180px] px-3 py-3">Ticket</th>
                <th className="w-[70px] px-3 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {visibleRows.map((row, index) => {
                const activeDate = pickMeta(row.meta, 'Isolasi: ')
                const customerUser = pickMeta(row.meta, 'Customer User: ')
                const phone = pickMeta(row.meta, 'Phone: ')
                const marketing = pickMeta(row.meta, 'Marketing: ')
                const dismantleTicket = pickMeta(row.meta, 'Ticket Dismantle: ')
                const isSelected = selectedIds.has(row.id)
                const canTransfer = dismantleTicket !== 'Sudah' && canTransferToDismantle

                return (
                  <tr key={row.id} className="align-top transition-colors hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm text-slate-700">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row.id)} />
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">{index + 1}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">{row.primary}</p>
                      <p className="mt-1 text-xs text-mute">Aktif isolir: {activeDate || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">{customerUser || '-'}</td>
                    <td className="px-3 py-2 text-sm text-sky-700">{phone || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{marketing || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{row.secondary}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      <p className="line-clamp-2">{row.detail}</p>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {dismantleTicket === 'Sudah' ? (
                        <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Sudah</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="badge border-amber-200 bg-amber-50 text-amber-700">Belum</span>
                          {canTransfer ? (
                            <Link
                              href={buildSupportActionHref('dismantle-approve', { isolation: buildIsolationPrefillValue(row) })}
                              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Transfer
                            </Link>
                          ) : (
                            <span className="text-xs text-mute">-</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setQuickActionItem(
                            buildIsolationQuickActionPayload({
                              row,
                              canUpdate,
                              canTransferToDismantle,
                              canOpenBillingDecision: false,
                            }),
                          )
                        }
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-950 p-2 text-white transition hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!visibleRows.length ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-sm text-mute">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <TableQuickActionModal
        item={quickActionItem}
        onClose={() => setQuickActionItem(null)}
        heading="Aksi cepat dari tabel isolir"
      />
    </section>
  )
}
