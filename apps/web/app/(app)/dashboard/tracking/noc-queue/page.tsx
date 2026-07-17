import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Camera, Download, Link2, Map, Pencil, Plus, ScanLine, Upload } from 'lucide-react'
import { DataSourceStatus } from '@/components/data-source-status'
import { NocQueueQuickActions } from '@/components/noc-queue-quick-actions'
import { NocQueueSupportActions } from '@/components/noc-queue-support-actions'
import { NocQueueWorkOrderActions } from '@/components/noc-queue-work-order-actions'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryDeviceLifecycleItemSuggestions } from '@/lib/services/device-lifecycle-service'
import { getNocQueueList, type NocQueueItem, type NocQueueQuery, type NocQueueStatus, type NocTicketType } from '@/lib/services/noc-queue-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const ticketTypeOptions: NocTicketType[] = ['PSB', 'TROUBLESHOOTS', 'DISMANTLE', 'JALUR']
const queueStatusOptions: NocQueueStatus[] = ['OPEN', 'ON_PROGRESS', 'TEMPORARY', 'CLOSE']
const slaStateOptions = ['BREACHED', 'WARNING', 'ON_TRACK'] as const

function getTicketTypeIcon(ticketType: NocTicketType) {
  if (ticketType === 'PSB') return Plus
  if (ticketType === 'TROUBLESHOOTS') return Pencil
  if (ticketType === 'DISMANTLE') return Download
  if (ticketType === 'JALUR') return Map
  return Link2
}

function getTypeBadgeClass(ticketType: NocTicketType) {
  if (ticketType === 'PSB') return 'bg-sky-100 text-sky-700'
  if (ticketType === 'TROUBLESHOOTS') return 'bg-amber-100 text-amber-800'
  if (ticketType === 'DISMANTLE') return 'bg-rose-100 text-rose-700'
  if (ticketType === 'JALUR') return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-700'
}

function getStatusBadgeClass(queueStatus: NocQueueStatus) {
  if (queueStatus === 'OPEN') return 'bg-sky-100 text-sky-700'
  if (queueStatus === 'ON_PROGRESS') return 'bg-amber-100 text-amber-800'
  if (queueStatus === 'TEMPORARY') return 'bg-orange-100 text-orange-700'
  if (queueStatus === 'CLOSE') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

function getQueueStatusIcon(queueStatus: NocQueueStatus) {
  if (queueStatus === 'OPEN') return Plus
  if (queueStatus === 'ON_PROGRESS') return ScanLine
  if (queueStatus === 'TEMPORARY') return Camera
  if (queueStatus === 'CLOSE') return Upload
  return Plus
}

function getSlaBadgeClass(slaState: NocQueueItem['slaState']) {
  if (slaState === 'BREACHED') return 'bg-rose-100 text-rose-700'
  if (slaState === 'WARNING') return 'bg-amber-100 text-amber-800'
  if (slaState === 'ON_TRACK') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

function getOperationalBadgeClass(label: string) {
  if (label.includes('VALIDASI')) return 'bg-violet-100 text-violet-700'
  if (label.includes('MATERIAL')) return 'bg-cyan-100 text-cyan-700'
  if (label.includes('REPLACE') || label.includes('RUSAK')) return 'bg-rose-100 text-rose-700'
  if (label.includes('FOLLOW')) return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
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

export default async function NocQueuePage({
  searchParams,
}: {
  searchParams?: Promise<NocQueueQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const [payload, itemSuggestions] = await Promise.all([
    getNocQueueList(query),
    getInventoryDeviceLifecycleItemSuggestions(200),
  ])
  const q = resolveSearchParam(query.q) ?? ''
  const ticketType = resolveSearchParam(query.ticketType)?.toUpperCase() ?? ''
  const queueStatus = resolveSearchParam(query.queueStatus)?.toUpperCase() ?? ''
  const slaState = resolveSearchParam(query.slaState)?.toUpperCase() ?? ''
  const canCreateDeviceLifecycle =
    session.role === 'FIELD_TECHNICIAN' ||
    canPerformAction(session.role, 'inventory', 'update') ||
    canPerformAction(session.role, 'inventory', 'create') ||
    canPerformAction(session.role, 'support', 'update')
  const canUpdateSupport = canPerformAction(session.role, 'support', 'update')
  const canUpdateWorkOrder = canPerformAction(session.role, 'support', 'update')
  const reviewDbReady = payload.source.effectiveMode === 'review-db' && !payload.source.isFallback

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">NOC Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Meja Queue Gabungan</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Tabel ini menyatukan ticket PSB, Troubleshoots, Dismantle, dan Jalur dalam satu antrean
              NOC. Status device sekarang memprioritaskan lifecycle scan terbaru, lalu fallback ke
              movement/request barang jika log lifecycle belum ada.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-6" action="/dashboard/tracking/noc-queue" method="get">
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="WO- / TT- / nama customer / teknisi"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Jenis Ticket</span>
            <select
              name="ticketType"
              defaultValue={ticketType}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua</option>
              {ticketTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status Queue</span>
            <select
              name="queueStatus"
              defaultValue={queueStatus}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua</option>
              {queueStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">SLA</span>
            <select
              name="slaState"
              defaultValue={slaState}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">Semua</option>
              {slaStateOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Shortcut</span>
            <Link
              href="/support/tt"
              className="surface-soft inline-flex h-[52px] items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Buka Lane TT
            </Link>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
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
            <span className="solid-chip">{payload.items.length} ticket</span>
            {ticketType ? <span className="solid-chip">Jenis: {ticketType}</span> : null}
            {queueStatus ? <span className="solid-chip">Status: {queueStatus}</span> : null}
            {slaState ? <span className="solid-chip">SLA: {slaState}</span> : null}
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
          {ticketTypeOptions.map((item) => (
            <Link
              key={item}
              href={`/dashboard/tracking/noc-queue?ticketType=${item}`}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${getTypeBadgeClass(item)}`}
            >
              {(() => {
                const Icon = getTicketTypeIcon(item)
                return <Icon className="h-3.5 w-3.5" />
              })()}
              {item}
            </Link>
          ))}
          {queueStatusOptions.map((item) => (
            <Link
              key={item}
              href={`/dashboard/tracking/noc-queue?queueStatus=${item}`}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${getStatusBadgeClass(item)}`}
            >
              {(() => {
                const Icon = getQueueStatusIcon(item)
                return <Icon className="h-3.5 w-3.5" />
              })()}
              {item}
            </Link>
          ))}
          {slaStateOptions.map((item) => (
            <Link
              key={item}
              href={`/dashboard/tracking/noc-queue?slaState=${item}`}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${getSlaBadgeClass(item)}`}
            >
              {item}
            </Link>
          ))}
        </div>

        {payload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{payload.error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer / Site</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Status Queue</th>
                <th className="px-4 py-3">PIC / Teknisi</th>
                <th className="px-4 py-3">Request Barang</th>
                <th className="px-4 py-3">Status Device</th>
                <th className="px-4 py-3">Update</th>
                <th className="px-4 py-3">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {payload.items.map((item) => (
                <tr key={item.queueKey}>
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
                    <p className="text-xs uppercase tracking-[0.2em] text-mute">{item.customerUser ?? ''}</p>
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
                    <p>{item.supportLaneLabel}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                    <p className="font-semibold text-[var(--color-ink-strong)]">{item.requestCode ?? '-'}</p>
                    <p>{item.requestStatus ?? 'Belum ada request'}</p>
                    <p>{item.requestRequestedFor ?? ''}</p>
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
                  </td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                    <p className="font-semibold text-[var(--color-ink-strong)]">{item.deviceState ?? '-'}</p>
                    <p>{item.deviceItemLabel ?? ''}</p>
                    <p>{item.deviceLocationLabel ?? ''}</p>
                    <p>{item.deviceLastActor ?? ''}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                    <p>{item.lastUpdateAt ?? '-'}</p>
                    {item.ageLabel ? <p>Umur: {item.ageLabel}</p> : null}
                    {item.troubleTicketId ? <p>TT: {item.troubleTicketId}</p> : null}
                    {item.workOrderId ? <p>WO: {item.workOrderId}</p> : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={item.href}
                        className="surface-soft inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
                      >
                        Buka Detail
                      </Link>
                      <NocQueueQuickActions
                        canCreate={canCreateDeviceLifecycle}
                        reviewDbReady={reviewDbReady}
                        itemSuggestions={itemSuggestions}
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
                  </td>
                </tr>
              ))}
              {!payload.items.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-mute" colSpan={9}>
                    Tidak ada ticket pada kombinasi filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
