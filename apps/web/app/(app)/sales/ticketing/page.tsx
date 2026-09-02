import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import {
  getNocQueueList,
  type NocQueueItem,
  type NocQueueQuery,
  type NocQueueStatus,
  type NocTicketType,
} from '@/lib/services/noc-queue-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const ticketTypeOptions: NocTicketType[] = ['PSB', 'TROUBLESHOOTS', 'DISMANTLE', 'JALUR']
const queueStatusOptions: NocQueueStatus[] = ['OPEN', 'ON_PROGRESS', 'TEMPORARY', 'CLOSE']

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

function getSlaBadgeClass(slaState: NocQueueItem['slaState']) {
  if (slaState === 'BREACHED') return 'bg-rose-100 text-rose-700'
  if (slaState === 'WARNING') return 'bg-amber-100 text-amber-800'
  if (slaState === 'ON_TRACK') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

function formatTicketTimestamp(value: string | null | undefined) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SalesTicketingPage({
  searchParams,
}: {
  searchParams?: Promise<NocQueueQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/ticketing')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const effectiveQuery: NocQueueQuery = {
    ...query,
    mine: '1',
  }
  const payload = await getNocQueueList(effectiveQuery, { session })
  const q = resolveSearchParam(effectiveQuery.q) ?? ''
  const ticketType = resolveSearchParam(effectiveQuery.ticketType)?.toUpperCase() ?? ''
  const queueStatus = resolveSearchParam(effectiveQuery.queueStatus)?.toUpperCase() ?? ''

  const totalTickets = payload.items.length
  const openTickets = payload.items.filter((item) => item.queueStatus === 'OPEN' || item.queueStatus === 'ON_PROGRESS').length
  const urgentTickets = payload.items.filter((item) => item.slaState === 'BREACHED' || item.slaState === 'WARNING').length

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
              Ticketing Perkasa
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muteStrong">
              Halaman ini memakai pola tabel NOC dari `web-psb-perkasa`, tetapi isi datanya menjadi ticket gabungan ERP: PSB, Troubleshoots, Dismantle, dan Jalur milik user login.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales"
              className="rounded-md border border-line bg-surfaceSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Kembali ke Penjualan
            </Link>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="rounded-xl border border-line bg-surfaceSoft px-4 py-3 text-sm text-muteStrong">
          Ticketing Perkasa di menu penjualan hanya menampilkan ticket yang terkait user login agar monitoring progres tetap fokus, ringan, dan tetap mengikuti pola tabel referensi NOC.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-surface px-4 py-4 text-muteStrong">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Total Ticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{totalTickets}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Semua ticket yang terhubung ke user login.</p>
          </article>
          <article className="rounded-2xl border border-info/40 bg-info/10 px-4 py-4 text-info">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Masih Berjalan</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{openTickets}</p>
            <p className="mt-2 text-sm leading-6 text-info/90">Ticket open atau on progress yang masih perlu dipantau.</p>
          </article>
          <article className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-4 text-warning">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Perlu Perhatian</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{urgentTickets}</p>
            <p className="mt-2 text-sm leading-6 text-warning/90">Ticket dengan SLA warning atau breached.</p>
          </article>
        </div>

        <form className="mt-4 grid gap-4 lg:grid-cols-4" action="/sales/ticketing" method="get">
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
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Status</span>
            <select
              name="queueStatus"
              defaultValue={queueStatus}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {queueStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="lg:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accentInk"
            >
              Terapkan Filter
            </button>
            <Link
              href="/sales/ticketing"
              className="inline-flex items-center justify-center rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Reset
            </Link>
          </div>
        </form>

        {payload.error ? (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            {payload.error}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surfaceElevated shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse">
              <thead className="bg-surfaceStrong">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muteStrong">
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">User / Site</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PIC / Teknisi</th>
                  <th className="px-4 py-3">Open</th>
                  <th className="px-4 py-3">Update</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {payload.items.map((item) => (
                  <tr key={item.queueKey} className="align-top transition-colors hover:bg-surfaceSoft">
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p className="font-semibold text-inkStrong">{item.ticketNo ?? `#${item.sourceId}`}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">{item.supportLaneLabel}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p className="font-semibold text-inkStrong">{item.customerName ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p>{item.customerUser ?? 'Customer / site belum terhubung'}</p>
                      {item.workOrderId ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">WO #{item.workOrderId}</p> : null}
                      {item.troubleTicketId ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">TT #{item.troubleTicketId}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getTypeBadgeClass(item.ticketType)}`}
                      >
                        {item.ticketType}
                      </span>
                      {item.priority ? <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mute">Priority {item.priority}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getStatusBadgeClass(item.queueStatus)}`}
                      >
                        {item.queueStatus}
                      </span>
                      {item.slaLabel ? (
                        <p className="mt-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getSlaBadgeClass(item.slaState)}`}
                          >
                            SLA {item.slaLabel}
                          </span>
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p className="font-semibold text-inkStrong">{item.technicianName ?? '-'}</p>
                      <p className="mt-1 text-mute">{item.picName ? `PIC: ${item.picName}` : item.supportLaneLabel}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p>{formatTicketTimestamp(item.queueStartedAt)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">{item.ageLabel ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p>{formatTicketTimestamp(item.lastUpdateAt ?? item.queueStartedAt)}</p>
                      {item.slaLabel ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">SLA {item.slaLabel}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p>{item.requestCode ?? item.deviceState ?? '-'}</p>
                      {item.operationalBadges.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.operationalBadges.slice(0, 2).map((badge) => (
                            <span
                              key={`${item.queueKey}-${badge}`}
                              className="inline-flex rounded-full bg-surfaceMuted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muteStrong"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-mute">{item.supportLaneLabel}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <Link
                        href={item.href}
                        className="inline-flex items-center justify-center rounded-md border border-line bg-surfaceSoft px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
                {!payload.items.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-sm text-muteStrong">
                      Belum ada ticket yang sesuai filter untuk user login.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
