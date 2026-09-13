'use client'

import Link from 'next/link'
import { Camera, Download, Link2, Map, Pencil, Plus, ScanLine, Upload } from 'lucide-react'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'
import { NocQueueQuickActions } from '@/components/noc-queue-quick-actions'
import { NocQueueSupportActions } from '@/components/noc-queue-support-actions'
import { NocQueueWorkOrderActions } from '@/components/noc-queue-work-order-actions'
import type { NocQueueItem, NocQueueQuery, NocQueueStatus, NocTicketType } from '@/lib/services/noc-queue-service'

type TicketType = NocTicketType
type QueueStatus = NocQueueStatus

const ticketTypeOptions: TicketType[] = ['PSB', 'TROUBLESHOOTS', 'DISMANTLE', 'JALUR']
const queueStatusOptions: QueueStatus[] = ['OPEN', 'ON_PROGRESS', 'TEMPORARY', 'CLOSE']
const slaStateOptions = ['BREACHED', 'WARNING', 'ON_TRACK'] as const

type SuggestionItem = {
  id: string | number
  label: string
  code?: string
}

type NocQueuePageClientProps = {
  q: string
  ticketType: string
  queueStatus: string
  slaState: string
  mine: boolean
  canCreateDeviceLifecycle: boolean
  canUpdateSupport: boolean
  canUpdateWorkOrder: boolean
  reviewDbReady: boolean
  totalTickets: number
  activeTickets: number
  riskTickets: number
  mineTickets: number
  typeCounts: Record<TicketType, number>
  items: NocQueueItem[]
  otherItems: NocQueueItem[]
  itemSuggestions: SuggestionItem[]
  error: string | null
  buildFilterHref: (patch: Partial<{ ticketType: string; queueStatus: string; slaState: string; mine: string }>) => string
  workspaceLabel: string
}

function getTicketTypeIcon(ticketType: NocTicketType) {
  if (ticketType === 'PSB') return Plus
  if (ticketType === 'TROUBLESHOOTS') return Pencil
  if (ticketType === 'DISMANTLE') return Download
  if (ticketType === 'JALUR') return Map
  return Link2
}

function getTypeBadgeClass(ticketType: NocTicketType) {
  if (ticketType === 'PSB') return 'bg-info/15 text-info border-info/40 border'
  if (ticketType === 'TROUBLESHOOTS') return 'bg-warning/15 text-warning border-warning/40 border'
  if (ticketType === 'DISMANTLE') return 'bg-danger/15 text-danger border-danger/40 border'
  if (ticketType === 'JALUR') return 'border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400 border'
  return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
}

function getStatusBadgeClass(queueStatus: NocQueueStatus) {
  if (queueStatus === 'OPEN') return 'bg-info/15 text-info border-info/40 border'
  if (queueStatus === 'ON_PROGRESS') return 'bg-warning/15 text-warning border-warning/40 border'
  if (queueStatus === 'TEMPORARY') return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/40'
  if (queueStatus === 'CLOSE') return 'bg-success/15 text-success border-success/40 border'
  return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
}

function getQueueStatusIcon(queueStatus: NocQueueStatus) {
  if (queueStatus === 'OPEN') return Plus
  if (queueStatus === 'ON_PROGRESS') return ScanLine
  if (queueStatus === 'TEMPORARY') return Camera
  if (queueStatus === 'CLOSE') return Upload
  return Plus
}

function getSlaBadgeClass(slaState: NocQueueItem['slaState']) {
  if (slaState === 'BREACHED') return 'bg-danger/15 text-danger border-danger/40 border'
  if (slaState === 'WARNING') return 'bg-warning/15 text-warning border-warning/40 border'
  if (slaState === 'ON_TRACK') return 'bg-success/15 text-success border-success/40 border'
  return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
}

function getOperationalBadgeClass(label: string) {
  if (label.includes('VALIDASI')) return 'border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400 border'
  if (label.includes('MATERIAL')) return 'border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border'
  if (label.includes('REPLACE') || label.includes('RUSAK')) return 'bg-danger/15 text-danger border-danger/40 border'
  if (label.includes('FOLLOW')) return 'bg-warning/15 text-warning border-warning/40 border'
  return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
}

function getLifecycleBadgeClass(status: string | null | undefined) {
  const value = String(status ?? '').trim().toUpperCase()
  if (!value) return 'border border-line bg-surfaceMuted px-3 py-1 text-mute'
  if (value === 'INVENTORY') return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
  if (value === 'NOC') return 'bg-info/15 text-info border-info/40 border'
  if (value.startsWith('TEAM_')) return 'bg-warning/15 text-warning border-warning/40 border'
  if (value === 'PENDING_NOC_VALIDATION') return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/40'
  if (value === 'INSTALLED') return 'bg-success/15 text-success border-success/40 border'
  if (value === 'DAMAGED') return 'bg-danger/15 text-danger border-danger/40 border'
  if (value === 'RETURNED') return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
  if (value.startsWith('REPLACE')) return 'border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400 border'
  return 'border border-line bg-surfaceMuted px-3 py-1 text-muteStrong'
}

function getValidationBadgeClass(status: string | null | undefined) {
  const value = String(status ?? '').trim().toUpperCase()
  if (value === 'APPROVED') return 'bg-success/15 text-success border-success/40 border'
  if (value === 'PENDING') return 'bg-warning/15 text-warning border-warning/40 border'
  if (value === 'REJECTED') return 'bg-danger/15 text-danger border-danger/40 border'
  return 'border border-line bg-surfaceMuted px-3 py-1 text-mute'
}

function renderTicketMeta(item: NocQueueItem) {
  if (item.sourceType === 'WORK_ORDER') {
    return (
      <>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mute">Work Order</p>
        {item.troubleTicketId ? <p className="mt-1 text-xs text-mute">TT terkait: #{item.troubleTicketId}</p> : null}
      </>
    )
  }
  return (
    <>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mute">Trouble Ticket</p>
      {item.workOrderId ? <p className="mt-1 text-xs text-mute">WO terkait: #{item.workOrderId}</p> : null}
    </>
  )
}

function getQueueItemBarcodeHref(item: NocQueueItem) {
  const label = item.deviceItemLabel ?? ''
  const codeMatch = String(label).match(/([A-Z]{2,}-[A-Z0-9-]+|[A-Z]{2,}\d+)/i)
  const itemCode = codeMatch ? codeMatch[1] : null
  if (!itemCode) return null
  return `/inventory/items?q=${encodeURIComponent(itemCode)}`
}

export default function NocQueuePageClient(props: NocQueuePageClientProps) {
  const {
    q, ticketType, queueStatus, slaState, mine,
    canCreateDeviceLifecycle, canUpdateSupport, canUpdateWorkOrder,
    reviewDbReady, totalTickets, activeTickets, riskTickets, mineTickets,
    typeCounts, items, otherItems, itemSuggestions, error, buildFilterHref, workspaceLabel,
  } = props

  const mainTotalCols = 9
  const otherTotalCols = 6

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">{workspaceLabel}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Ticketing Perkasa</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Tabel ini memusatkan ticket PSB, Troubleshoots, Dismantle, dan Jalur dalam satu antrean
              operasional yang tetap ringkas. Detail penuh tetap dibuka dari menu ticket masing-masing.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-line bg-surface px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Total Ticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{totalTickets}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Semua ticket yang muncul pada kombinasi filter saat ini.</p>
          </article>
          <article className="rounded-2xl border border-info/40 bg-info/10 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Masih Berjalan</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{activeTickets}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Ticket open atau on progress yang masih perlu dikawal.</p>
          </article>
          <article className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Perlu Perhatian</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{riskTickets}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Ticket dengan SLA warning atau breached.</p>
          </article>
          <article className="rounded-2xl border-violet-500/40 bg-violet-500/10 px-4 py-4 border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Pekerjaan Saya</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{mineTickets}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Jumlah ticket yang terkait PIC user login.</p>
          </article>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-6" action="/dashboard/tracking/noc-queue" method="get">
          <label className="flex flex-col gap-2 text-sm text-muteStrong lg:col-span-2">
            <span className="font-semibold text-inkStrong">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="WO- / TT- / nama customer / teknisi"
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Jenis Ticket</span>
            <select
              name="ticketType"
              defaultValue={ticketType}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {ticketTypeOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Status Antrean</span>
            <select
              name="queueStatus"
              defaultValue={queueStatus}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {queueStatusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">SLA</span>
            <select
              name="slaState"
              defaultValue={slaState}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {slaStateOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Shortcut</span>
            <Link
              href="/support/tt"
              className="surface-soft inline-flex h-[52px] items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Buka Lane TT
            </Link>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4" />
              Pekerjaan saya
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              Terapkan Filter
            </button>
            <Link
              href="/dashboard/tracking/noc-queue"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Reset
            </Link>
            <span className="solid-chip">{items.length} ticket</span>
            {ticketType || queueStatus || slaState || mine ? (
              <span className="rounded-full border border-line bg-surfaceMuted px-3 py-1.5 text-xs font-semibold text-muteStrong">
                Filter aktif
              </span>
            ) : null}
          </div>
        </form>

        <div className="mt-4 rounded-2xl border border-line bg-surfaceSoft p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
              <span className="rounded-full border border-line bg-surface px-3 py-1.5">Jenis Cepat</span>
              <Link
                href={buildFilterHref({ ticketType: '' })}
                className={`rounded-full px-3 py-1.5 ${ticketType ? 'border border-line bg-surface text-muteStrong hover:bg-surfaceElevated' : 'bg-accent text-accentInk'}`}
              >
                Semua
              </Link>
              {ticketTypeOptions.map((item) => (
                <Link
                  key={item}
                  href={buildFilterHref({ ticketType: item })}
                  className={`rounded-full px-3 py-1.5 ${ticketType === item ? 'bg-accent text-accentInk' : 'border border-line bg-surface text-muteStrong hover:bg-surfaceElevated hover:text-inkStrong'}`}
                >
                  {item} {typeCounts[item]}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
              <span className="rounded-full border border-line bg-surface px-3 py-1.5">Status Cepat</span>
              <Link
                href={buildFilterHref({ queueStatus: '' })}
                className={`rounded-full px-3 py-1.5 ${queueStatus ? 'border border-line bg-surface text-muteStrong hover:bg-surfaceElevated' : 'bg-accent text-accentInk'}`}
              >
                Semua
              </Link>
              {queueStatusOptions.map((item) => (
                <Link
                  key={item}
                  href={buildFilterHref({ queueStatus: item })}
                  className={`rounded-full px-3 py-1.5 ${queueStatus === item ? 'bg-accent text-accentInk' : 'border border-line bg-surface text-muteStrong hover:bg-surfaceElevated hover:text-inkStrong'}`}
                >
                  {item}
                </Link>
              ))}
              {slaStateOptions.map((item) => (
                <Link
                  key={item}
                  href={buildFilterHref({ slaState: item })}
                  className={`rounded-full px-3 py-1.5 ${slaState === item ? 'bg-accent text-accentInk' : 'border border-line bg-surface text-muteStrong hover:bg-surfaceElevated hover:text-inkStrong'}`}
                >
                  SLA {item}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl border border-warning/40 bg-warning/10 px-5 py-4 text-warning">
            <p className="text-sm font-semibold text-inkStrong">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                <ExpandableHeaderLeftCells />
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer / Site</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Status Antrean</th>
                <th className="px-4 py-3">PIC / Teknisi</th>
                <th className="px-4 py-3">Keterangan Operasional</th>
                <th className="px-4 py-3">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {items.map((item, idx) => {
                const barcodeHref = getQueueItemBarcodeHref(item)

                const compactRow = (
                  <>
                    <td className="px-4 py-4 align-top">
                      <Link
                        href={item.href}
                        className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90"
                      >
                        {item.ticketNo ?? `#${item.sourceId}`}
                      </Link>
                      {renderTicketMeta(item)}
                    </td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      <p className="font-semibold text-[var(--color-ink-strong)]">{item.customerName ?? '-'}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-mute">{item.customerUser ?? 'CUSTOMER / SITE BELUM TERHUBUNG'}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClass(item.ticketType)}`}>
                        {(() => {
                          const Icon = getTicketTypeIcon(item.ticketType)
                          return <Icon className="h-3.5 w-3.5" />
                        })()}
                        {item.ticketType}
                      </span>
                      {item.priority ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mute">Priority {item.priority}</p> : null}
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mute">{item.supportLaneLabel}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(item.queueStatus)}`}>
                        {(() => {
                          const Icon = getQueueStatusIcon(item.queueStatus)
                          return <Icon className="h-3.5 w-3.5" />
                        })()}
                        {item.queueStatus}
                      </span>
                      {item.rawStatus ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mute">Raw: {item.rawStatus}</p> : null}
                      {item.slaLabel ? (
                        <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getSlaBadgeClass(item.slaState)}`}>
                          SLA {item.slaLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      <p className="font-semibold text-[var(--color-ink-strong)]">{item.technicianName ?? '-'}</p>
                      <p>{item.picName ? `PIC: ${item.picName}` : item.supportLaneLabel}</p>
                      {item.picUsername ? <p className="text-xs uppercase tracking-[0.18em] text-mute">@{item.picUsername}</p> : null}
                    </td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      <p className="font-semibold text-[var(--color-ink-strong)]">{item.requestCode ?? item.deviceState ?? '-'}</p>
                      <p>{item.requestStatus ?? item.supportLaneLabel}</p>
                      <p>{item.requestRequestedFor ?? item.deviceLocationLabel ?? ''}</p>
                      {item.operationalBadges.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.operationalBadges.map((badge) => (
                            <span
                              key={`${item.queueKey}-request-${badge}`}
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getOperationalBadgeClass(badge)}`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {item.deviceLifecycleStatus ? (
                        <p className="mt-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getLifecycleBadgeClass(item.deviceLifecycleStatus)}`}>
                            {item.deviceLifecycleStatus}
                          </span>
                        </p>
                      ) : null}
                      {item.deviceValidationStatus && item.deviceValidationStatus !== 'NOT_REQUIRED' ? (
                        <p className="mt-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getValidationBadgeClass(item.deviceValidationStatus)}`}>
                            {item.deviceValidationStatus}
                          </span>
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                      <p>{item.lastUpdateAt ?? '-'}</p>
                      {item.ageLabel ? <p>Umur: {item.ageLabel}</p> : null}
                    </td>
                  </>
                )

                const detail = (
                  <div className="space-y-5">
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Detil Data</h4>
                      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Ticket</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Customer</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Device</th>
                              <th className="text-xs font-semibold uppercase tracking-wider text-mute">Lokasi / Ref</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{item.ticketNo ?? `#${item.sourceId}`}</p>
                                <p className="text-xs text-mute">{item.sourceType}</p>
                                <p className="mt-1 text-xs text-mute">Status Lane: {item.supportLaneLabel}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p className="font-semibold">{item.customerName ?? '-'}</p>
                                <p className="text-xs text-mute">{item.customerUser ?? '-'}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>{item.deviceState ?? '-'}</p>
                                <p className="text-xs text-mute">{item.deviceItemLabel ?? '-'}</p>
                                <p className="mt-1 text-xs text-mute">{item.deviceLocationLabel ?? ''}</p>
                                <p className="mt-1 text-xs text-mute">
                                  {item.deviceHandoverFrom || item.deviceHandoverTo
                                    ? `Handover: ${item.deviceHandoverFrom ?? '-'} -> ${item.deviceHandoverTo ?? '-'}`
                                    : ''}
                                </p>
                                {item.deviceHandoverProofType ? <p className="text-xs text-mute">Proof: {item.deviceHandoverProofType}</p> : null}
                                {item.deviceHandoverProofRef ? <p className="text-xs text-mute">Ref Proof: {item.deviceHandoverProofRef}</p> : null}
                                {item.deviceTicketRef ? <p className="text-xs text-mute">Ref: {item.deviceTicketRef}</p> : null}
                                {item.deviceLastActor ? <p className="text-xs text-mute">Actor: {item.deviceLastActor}</p> : null}
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-slate-800">
                                <p>Request: {item.requestCode ?? '-'}</p>
                                <p className="text-xs text-mute">Status: {item.requestStatus ?? '-'}</p>
                                <p className="mt-1 text-xs text-mute">Untuk: {item.requestRequestedFor ?? '-'}</p>
                                <p className="mt-1 text-xs text-mute">TT: {item.troubleTicketId ?? '-'}</p>
                                <p className="text-xs text-mute">WO: {item.workOrderId ?? '-'}</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="space-y-2">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Jenis</span>
                          <span className="tabular-nums text-slate-900">{item.ticketType}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Priority</span>
                          <span className="tabular-nums text-slate-900">{item.priority ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status Queue</span>
                          <span className="tabular-nums text-slate-900">{item.queueStatus}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">SLA</span>
                          <span className="tabular-nums text-slate-900">{item.slaLabel ?? item.slaState ?? '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Umur Ticket</span>
                          <span className="tabular-nums text-slate-900">{item.ageLabel ?? '-'}</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 pt-3 border-t border-line">
                      <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                      <div className="flex flex-wrap gap-3 items-center">
                        <Link
                          href={item.href}
                          className="inline-flex items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                          Buka Detail
                        </Link>
                        {barcodeHref ? (
                          <Link
                            href={barcodeHref}
                            className="inline-flex items-center justify-center rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lineStrong hover:bg-surface"
                          >
                            Buka Barcode
                          </Link>
                        ) : null}
                        <NocQueueQuickActions
                          canCreate={canCreateDeviceLifecycle}
                          reviewDbReady={reviewDbReady}
                          itemSuggestions={itemSuggestions as any}
                          workOrderId={item.workOrderId}
                          troubleTicketId={item.troubleTicketId}
                          ticketType={item.ticketType}
                          deviceState={item.deviceState}
                        />
                        {item.sourceType === 'WORK_ORDER' && item.workOrderId ? (
                          <NocQueueWorkOrderActions
                            canUpdate={canUpdateWorkOrder}
                            reviewDbReady={reviewDbReady}
                            workOrderId={item.workOrderId}
                            queueStatus={item.queueStatus}
                            supportLaneLabel={item.supportLaneLabel}
                            detailHref={item.href}
                          />
                        ) : null}
                        {item.sourceType === 'TROUBLE_TICKET' && item.ticketNo ? (
                          <NocQueueSupportActions
                            canUpdate={canUpdateSupport}
                            reviewDbReady={reviewDbReady}
                            ticketCode={item.ticketNo}
                            rawStatus={item.rawStatus}
                            supportLaneLabel={item.supportLaneLabel}
                            detailHref={item.href}
                          />
                        ) : null}
                      </div>
                    </section>
                  </div>
                )

                return (
                  <ExpandableRow
                    key={item.queueKey}
                    id={item.queueKey || `${idx}`}
                    num={idx + 1}
                    totalCols={mainTotalCols}
                    compactRow={compactRow}
                    detail={detail}
                  />
                )
              })}
              {!items.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-mute" colSpan={mainTotalCols}>
                    Tidak ada ticket pada kombinasi filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {otherItems.length > 0 ? (
        <section className="mt-6 rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-violet-200 dark:border-violet-800">
            <div>
              <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-100 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
                  REVIEW MANUAL
                </span>
                Bucket Review: Ticket Tidak Terklasifikasi ({otherItems.length})
              </h2>
              <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                Ticket dengan jenis <code className="rounded bg-white/60 px-1.5 py-0.5 dark:bg-violet-900/40 font-mono">OTHER</code> memerlukan klasifikasi manual oleh NOC Supervisor sebelum diproses ke alur kerja standar.
              </p>
            </div>
            <Link
              href={buildFilterHref({ ticketType: 'OTHER' })}
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-200"
            >
              Filter Tipe = OTHER
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-violet-100/60 dark:bg-violet-900/20 text-violet-900 dark:text-violet-200">
                <tr>
                  <ExpandableHeaderLeftCells />
                  <th className="px-4 py-2.5 font-medium">Kode Ticket</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-200 dark:divide-violet-800/60">
                {otherItems.map((item, idx) => {
                  const compactRow = (
                    <>
                      <td className="px-4 py-2.5 font-mono">
                        <Link href={item.href} className="text-violet-800 dark:text-violet-200 hover:underline font-medium">
                          {item.ticketNo}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-violet-700 dark:text-violet-300">
                        <span className="inline-flex items-center rounded border border-violet-200 bg-white px-2 py-0.5 dark:bg-violet-950/40 dark:border-violet-800">
                          {item.sourceType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-violet-800 dark:text-violet-200">
                        {item.customerName ?? <span className="text-violet-500 italic">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-violet-700 dark:text-violet-300">
                        <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">
                          {item.rawStatus}
                        </span>
                      </td>
                    </>
                  )

                  const detail = (
                    <div className="space-y-5">
                      <section className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Detil Data</h4>
                        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Ticket</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Source</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Customer</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 align-top text-sm text-slate-800 font-semibold">{item.ticketNo ?? '-'}</td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">{item.sourceType}</td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">{item.customerName ?? '-'}</td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">{item.rawStatus ?? '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Source</span>
                            <span className="tabular-nums text-slate-900">{item.sourceType}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Queue Key</span>
                            <span className="tabular-nums text-slate-900">{item.queueKey}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Support Lane</span>
                            <span className="tabular-nums text-slate-900">{item.supportLaneLabel}</span>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-2 pt-3 border-t border-line">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                        <div className="flex flex-wrap gap-3 items-center">
                          <Link
                            href={item.href}
                            className="inline-flex items-center justify-center rounded-2xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
                          >
                            Detail
                          </Link>
                        </div>
                      </section>
                    </div>
                  )

                  return (
                    <ExpandableRow
                      key={item.queueKey}
                      id={item.queueKey || `other-${idx}`}
                      num={idx + 1}
                      totalCols={otherTotalCols}
                      compactRow={compactRow}
                      detail={detail}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
