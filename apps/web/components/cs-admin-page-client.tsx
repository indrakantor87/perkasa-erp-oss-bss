'use client'

import Link from 'next/link'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'
import type { WorklistItem } from '@/lib/types'

type CsFollowUpRow = WorklistItem & { bucketQueue: string }

type CsSummary = {
  customerBacklog: number
  correctionCount: number
  transferCount: number
  transferWaitingCount: number
  riskCount: number
  customerCount: number
  orderCount: number
  isolationCount: number
  troubleTicketCount: number
  inventoryCount: number
}

type CsBucketItem = {
  queue: string
  totalCount: number
  summary: {
    criticalCount: number
    waitingCount: number
  }
  items: WorklistItem[]
  href: string
}

type CsAdminPageClientProps = {
  summary: CsSummary
  buckets: CsBucketItem[]
  baseCount: number
  followUpRows: CsFollowUpRow[]
  worklistHref: string
  worklistCorrectionHref: string
  isolationCount: number
  troubleTicketCount: number
  inventoryCount: number
  transferWaitingCount: number
  transferCount: number
  correctionCount: number
  riskCount: number
}

function normalizeDomain(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
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

function formatCount(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.max(0, Number(value) || 0))
}

export default function CsAdminPageClient(props: CsAdminPageClientProps) {
  const {
    buckets, baseCount, followUpRows, worklistCorrectionHref,
    isolationCount, troubleTicketCount, inventoryCount, transferWaitingCount,
    transferCount, correctionCount, riskCount,
    summary,
  } = props
  const totalCols = 8

  return (
    <div className="space-y-4">
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
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Arah Kerja CS</p>
              <h2 className="mt-2 text-xl font-semibold text-inkStrong">Menu inti yang dipakai bergantian</h2>
            </div>
            <span className="badge border-line bg-surfaceMuted text-muteStrong">{baseCount} item scope</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link href="/support/isolations" className="rounded-2xl border border-warning/40 bg-warning/10 p-4 transition hover:border-warning/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Isolir</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(isolationCount)}</p>
              <p className="mt-2 text-sm leading-6 text-muteStrong">Pelanggan suspend aktif untuk follow up dan keputusan layanan.</p>
            </Link>
            <Link href="/dashboard/tracking/noc-queue" className="rounded-2xl border border-info/40 bg-info/10 p-4 transition hover:border-info/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Ticketing</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(troubleTicketCount)}</p>
              <p className="mt-2 text-sm leading-6 text-muteStrong">Ticket gabungan untuk kontrol PSB, TT, dismantle, dan jalur.</p>
            </Link>
            <Link href="/customers/cs-admin/odp-port" className="rounded-2xl border border-success/40 bg-success/10 p-4 transition hover:border-success/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-success">ODP dan Port</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(inventoryCount)}</p>
              <p className="mt-2 text-sm leading-6 text-muteStrong">Baca kapasitas ODP dan status port tanpa masuk ke shell inventory penuh.</p>
            </Link>
            <Link href="/list-dismantle" className="rounded-2xl border border-line bg-surfaceSoft p-4 transition hover:bg-surface hover:border-lineStrong">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">List Dismantle</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(transferWaitingCount)}</p>
              <p className="mt-2 text-sm leading-6 text-mute">Validasi terminasi dan pekerjaan cabut sebelum masuk tiket operasional.</p>
            </Link>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Ringkasan Antrean</p>
              <h2 className="mt-2 text-xl font-semibold text-inkStrong">Koreksi, keputusan, dan risiko aktif</h2>
            </div>
            <span className="badge border-line bg-surfaceMuted text-muteStrong">{buckets.length} bucket</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {buckets.map((bucket) => (
              <Link
                key={bucket.queue}
                href={bucket.href}
                className="rounded-2xl border border-line bg-surfaceSoft p-4 transition hover:bg-surface hover:border-lineStrong"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">{bucket.queue}</p>
                <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(bucket.totalCount)}</p>
                <p className="mt-2 text-xs leading-5 text-muteStrong">
                  Kritikal {formatCount(bucket.summary.criticalCount)} • Menunggu {formatCount(bucket.summary.waitingCount)}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Perlu Koreksi</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(correctionCount)}</p>
            </div>
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-danger">Risiko Tinggi</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(riskCount)}</p>
            </div>
            <div className="rounded-2xl border border-info/40 bg-info/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Keputusan Menunggu</p>
              <p className="mt-2 text-2xl font-semibold text-inkStrong">{formatCount(transferWaitingCount)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Antrean CS Aktif</p>
            <h2 className="mt-2 text-xl font-semibold text-inkStrong">Daftar tindak lanjut yang paling sering dibaca CS</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
              Tabel ini sengaja dipadatkan agar cepat dibaca dan mudah di-screenshot. Detail penuh tetap dibuka dari
              modul tujuan masing-masing.
            </p>
          </div>
          <Link
            href={worklistCorrectionHref}
            className="inline-flex items-center justify-center rounded-2xl border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
          >
            Buka Worklist Lengkap
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surfaceElevated shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full">
              <thead className="bg-surfaceStrong">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  <ExpandableHeaderLeftCells />
                  <th className="px-4 py-3">Antrean</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {followUpRows.map((item, idx) => {
                  const normDomain = normalizeDomain(item.domain)
                  const customerRelevant = new Set(['CUSTOMERS', 'SALES', 'SUPPORT', 'LAYANAN', 'FIELD OPS'])
                  const identifier = item.title?.trim()
                  let customerLink: string | null = null
                  if (customerRelevant.has(normDomain) && identifier) {
                    const encoded = encodeURIComponent(identifier)
                    customerLink = `/customers/${encoded}?name=${encoded}`
                  }

                  const compactRow = (
                    <>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[14ch]">
                        <p className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis max-w-[14ch]" title={item.bucketQueue}>
                          {item.bucketQueue}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[24ch]">
                        {customerLink ? (
                          <Link
                            href={customerLink}
                            className="font-semibold text-inkStrong transition hover:underline hover:text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis block max-w-[24ch]"
                            title={item.title}
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis max-w-[24ch]" title={item.title}>
                            {item.title}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[12ch]">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap max-w-[12ch] overflow-hidden text-ellipsis ${getDomainBadgeTone(item.domain)}`} title={item.domain}>
                          {item.domain}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[12ch]">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap max-w-[12ch] overflow-hidden text-ellipsis ${getStatusBadgeTone(item.status)}`} title={item.status}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[16ch]">
                        <p className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis max-w-[16ch]" title={item.owner || '-'}>
                          {item.owner || '-'}
                        </p>
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
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Antrean</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Item</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Status / Target</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Arah</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p className="font-semibold">{item.bucketQueue}</p>
                                  <p className="text-xs text-mute">Queue: {item.queue}</p>
                                  <p className="text-xs text-mute">Domain: {item.domain}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p className="font-semibold">{item.title}</p>
                                  <p className="text-xs text-mute">{item.subtitle ?? '-'}</p>
                                  <p className="mt-1 text-xs leading-5 text-mute">{item.detail ?? '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p>{item.status}</p>
                                  <p className="text-xs text-mute">Target: {item.dueLabel ?? '-'}</p>
                                  <p className="text-xs text-mute">PIC: {item.owner ?? '-'}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <p className="font-semibold">{item.actionLabel}</p>
                                  <p className="text-xs text-mute leading-5">{item.nextAction || item.reason || '-'}</p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Domain</span>
                            <span className="tabular-nums text-slate-900">{item.domain}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
                            <span className="tabular-nums text-slate-900">{item.status}</span>
                            <span className="text-mute" aria-hidden>•</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold uppercase tracking-[0.14em] text-mute">Target</span>
                            <span className="tabular-nums text-slate-900">{item.dueLabel ?? '-'}</span>
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
                            Buka
                          </Link>
                        </div>
                      </section>
                    </div>
                  )

                  return (
                    <ExpandableRow
                      key={`${item.bucketQueue}-${item.id}`}
                      id={`${item.bucketQueue}-${item.id}` || `${idx}`}
                      num={idx + 1}
                      totalCols={totalCols}
                      compactRow={compactRow}
                      detail={detail}
                    />
                  )
                })}
                {!followUpRows.length ? (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-6 text-sm text-mute">
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
