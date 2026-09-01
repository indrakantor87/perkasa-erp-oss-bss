import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { getDashboardPageData } from '@/lib/services/dashboard-service'
import { buildWorklistHref, getWorklistBucketsData } from '@/lib/services/worklist-service'
import type { DashboardSummary, WorklistItem } from '@/lib/types'
import type { WorklistBucketData } from '@/lib/services/worklist-service'

const trackedQueues = ['Perlu Approval', 'Perlu Koreksi', 'Transfer atau Restore', 'Queue Risiko Tinggi'] as const

function formatCount(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.max(0, Number(value) || 0))
}

function normalizeDomain(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function flattenBucketItems(buckets: WorklistBucketData[]) {
  return buckets.flatMap((bucket) => bucket.items)
}

function countItemsByDomains(items: WorklistItem[], domains: string[]) {
  const allowed = new Set(domains.map((domain) => normalizeDomain(domain)))
  return items.filter((item) => allowed.has(normalizeDomain(item.domain))).length
}

function findBucket(buckets: WorklistBucketData[], queue: string) {
  return buckets.find((bucket) => bucket.queue === queue) ?? null
}

function buildCsFollowUpRows(buckets: WorklistBucketData[]) {
  return buckets.flatMap((bucket) =>
    bucket.items.map((item) => ({
      ...item,
      bucketQueue: bucket.queue,
    })),
  )
}

function getDomainBadgeTone(domain: string) {
  const normalized = String(domain ?? '').trim().toUpperCase()
  if (normalized === 'CUSTOMERS') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (normalized === 'SALES') return 'border-indigo-200 bg-indigo-50 text-indigo-800'
  if (normalized === 'SUPPORT') return 'border-violet-200 bg-violet-50 text-violet-800'
  if (normalized === 'INVENTORY') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (normalized === 'BILLING') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function getStatusBadgeTone(status: string) {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized.includes('READY') || normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (normalized.includes('OVERDUE') || normalized.includes('FAILED') || normalized.includes('BLOCK')) {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  if (normalized.includes('REVIEW') || normalized.includes('WAIT') || normalized.includes('HOLD')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  return 'border-sky-200 bg-sky-50 text-sky-800'
}

function buildCsSummary(summary: DashboardSummary, buckets: WorklistBucketData[]) {
  const allItems = flattenBucketItems(buckets)
  const correctionBucket = findBucket(buckets, 'Perlu Koreksi')
  const transferBucket = findBucket(buckets, 'Transfer atau Restore')
  const riskBucket = findBucket(buckets, 'Queue Risiko Tinggi')

  return {
    customerBacklog: countItemsByDomains(allItems, ['Customers', 'Sales']),
    correctionCount: correctionBucket?.totalCount ?? 0,
    transferCount: transferBucket?.totalCount ?? 0,
    transferWaitingCount: transferBucket?.summary.waitingCount ?? 0,
    riskCount: riskBucket?.totalCount ?? 0,
    customerCount: summary.customers,
    orderCount: summary.orders,
    isolationCount: summary.isolations,
    troubleTicketCount: summary.troubleTickets,
    inventoryCount: summary.inventoryItems,
  }
}

export default async function CsAdminWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'cs-admin')) {
    redirect('/dashboard')
  }

  const [payload, dashboardPayload] = await Promise.all([
    getWorklistBucketsData(session, [...trackedQueues]),
    getDashboardPageData(session),
  ])
  const summary = buildCsSummary(dashboardPayload.summary, payload.buckets)
  const followUpRows = buildCsFollowUpRows(payload.buckets).slice(0, 12)

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">CS & Admin CS</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">
              Customer / CS & Admin CS
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
              Halaman ini difokuskan untuk pembacaan customer, order berjalan, koreksi data, dan keputusan
              CS harian. Menu lain tetap dibuka dari sidebar agar tiap modul berdiri sendiri dan tidak
              bercampur seperti workspace besar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/customers"
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-950"
            >
              Buka Customer
            </Link>
            <Link
              href="/list-psb"
              className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Buka Data PSB
            </Link>
            <Link
              href="/dashboard/tracking/noc-queue"
              className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Buka Ticketing
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Customer Aktif</p>
          <p className="mt-2 text-3xl font-semibold text-sky-950">{formatCount(summary.customerCount)}</p>
          <p className="mt-2 text-sm leading-6 text-sky-800">Basis pembacaan customer yang sedang ditangani tim CS.</p>
        </article>
        <article className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Order Bulan Ini</p>
          <p className="mt-2 text-3xl font-semibold text-indigo-950">{formatCount(summary.orderCount)}</p>
          <p className="mt-2 text-sm leading-6 text-indigo-800">PSB baru yang paling sering dibaca untuk follow up jadwal dan status.</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Perlu Follow Up</p>
          <p className="mt-2 text-3xl font-semibold text-amber-950">{formatCount(summary.customerBacklog)}</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">Backlog customer dan sales yang masih menunggu pembacaan CS.</p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Transfer / Restore</p>
          <p className="mt-2 text-3xl font-semibold text-rose-950">{formatCount(summary.transferCount)}</p>
          <p className="mt-2 text-sm leading-6 text-rose-800">Kasus yang butuh keputusan akhir sebelum diteruskan atau ditutup.</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Arah Kerja CS</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Menu inti yang dipakai bergantian</h2>
            </div>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">{payload.baseCount} item scope</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link href="/support/isolations" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Isolir</p>
              <p className="mt-2 text-2xl font-semibold text-amber-950">{formatCount(summary.isolationCount)}</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">Pelanggan suspend aktif untuk follow up dan keputusan layanan.</p>
            </Link>
            <Link href="/dashboard/tracking/noc-queue" className="rounded-2xl border border-violet-200 bg-violet-50 p-4 transition hover:border-violet-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Ticketing</p>
              <p className="mt-2 text-2xl font-semibold text-violet-950">{formatCount(summary.troubleTicketCount)}</p>
              <p className="mt-2 text-sm leading-6 text-violet-800">Ticket gabungan untuk kontrol PSB, TT, dismantle, dan jalur.</p>
            </Link>
            <Link href="/customers/cs-admin/odp-port" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">ODP dan Port</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-950">{formatCount(summary.inventoryCount)}</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">Baca kapasitas ODP dan status port tanpa masuk ke shell inventory penuh.</p>
            </Link>
            <Link href="/list-dismantle" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">List Dismantle</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCount(summary.transferWaitingCount)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Validasi terminasi dan pekerjaan cabut sebelum masuk tiket operasional.</p>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Ringkasan Antrean</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Koreksi, keputusan, dan risiko aktif</h2>
            </div>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">{payload.buckets.length} bucket</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {payload.buckets.map((bucket) => (
              <Link
                key={bucket.queue}
                href={buildWorklistHref(session.role, { queue: bucket.queue })}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{bucket.queue}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCount(bucket.totalCount)}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Kritikal {formatCount(bucket.summary.criticalCount)} • Menunggu {formatCount(bucket.summary.waitingCount)}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Perlu Koreksi</p>
              <p className="mt-2 text-2xl font-semibold text-amber-950">{formatCount(summary.correctionCount)}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Risiko Tinggi</p>
              <p className="mt-2 text-2xl font-semibold text-rose-950">{formatCount(summary.riskCount)}</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Keputusan Menunggu</p>
              <p className="mt-2 text-2xl font-semibold text-sky-950">{formatCount(summary.transferWaitingCount)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Antrean CS Aktif</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Daftar tindak lanjut yang paling sering dibaca CS</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
              Tabel ini sengaja dipadatkan agar cepat dibaca dan mudah di-screenshot. Detail penuh tetap dibuka dari
              modul tujuan masing-masing.
            </p>
          </div>
          <Link
            href={buildWorklistHref(session.role, { queue: 'Perlu Koreksi' })}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Buka Worklist Lengkap
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3">Antrean</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PIC</th>
                  <th className="px-4 py-3">Arah</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {followUpRows.map((item) => (
                  <tr key={`${item.bucketQueue}-${item.id}`} className="align-top">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">{item.bucketQueue}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.queue}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(() => {
                        const normDomain = normalizeDomain(item.domain)
                        const customerRelevant = new Set(['CUSTOMERS', 'SALES', 'SUPPORT', 'LAYANAN', 'FIELD OPS'])
                        const identifier = item.title?.trim()
                        if (customerRelevant.has(normDomain) && identifier) {
                          const encoded = encodeURIComponent(identifier)
                          return (
                            <>
                              <p className="font-semibold text-slate-950">
                                <Link
                                  href={`/customers/${encoded}?name=${encoded}`}
                                  className="transition hover:underline hover:text-slate-950"
                                >
                                  {item.title}
                                </Link>
                              </p>
                              <p className="mt-1">{item.subtitle}</p>
                              <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
                            </>
                          )
                        }
                        return (
                          <>
                            <p className="font-semibold text-slate-950">{item.title}</p>
                            <p className="mt-1">{item.subtitle}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
                          </>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getDomainBadgeTone(item.domain)}`}>
                        {item.domain}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${getStatusBadgeTone(item.status)}`}>
                        {item.status}
                      </span>
                      {item.dueLabel ? <p className="mt-2 text-xs text-slate-500">Target: {item.dueLabel}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">{item.owner || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">{item.actionLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.nextAction || item.reason || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <Link
                        href={item.href}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
                {!followUpRows.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-slate-500">
                      Belum ada antrean aktif pada scope CS saat ini.
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
