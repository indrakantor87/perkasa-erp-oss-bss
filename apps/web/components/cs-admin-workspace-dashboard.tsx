'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DataSourceStatus } from '@/components/data-source-status'
import { WorklistDetailPanel } from '@/components/worklist/worklist-detail-panel'
import { WorklistQuickActionModal } from '@/components/worklist/worklist-quick-action-modal'
import { getRoleMeta } from '@/lib/role-meta'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import type { WorklistBucketData } from '@/lib/services/worklist-service'
import type { AppRole, DataSourceSnapshot, WorklistItem } from '@/lib/types'

type CsAdminWorkspaceDashboardProps = {
  role: AppRole
  source: DataSourceSnapshot
  baseCount: number
  buckets: WorklistBucketData[]
  selectedQueue: string
  selectedItemId?: string
}

const queueDescriptions: Record<string, string> = {
  'Perlu Approval': 'Approval supervisor untuk aktivitas harian dan konteks support yang belum final.',
  'Perlu Koreksi': 'Koreksi input customer, ODP/port, dan item review yang masih perlu dibenahi tim.',
  'Transfer atau Restore':
    'Restore tetap dibaca sebagai ownership Billing, sedangkan terminate dan close dismantle dibaca sebagai ownership CS & Admin CS.',
  'Queue Risiko Tinggi': 'Ticket dan backlog berisiko tinggi yang berpotensi menahan SLA pelayanan.',
}

const queueTone: Record<string, string> = {
  'Perlu Approval': 'border-sky-200 bg-sky-50 text-sky-900',
  'Perlu Koreksi': 'border-amber-200 bg-amber-50 text-amber-900',
  'Transfer atau Restore': 'border-rose-200 bg-rose-50 text-rose-900',
  'Queue Risiko Tinggi': 'border-slate-900 bg-slate-950 text-white',
}

const queueShortLabel: Record<string, string> = {
  'Perlu Approval': 'approval',
  'Perlu Koreksi': 'koreksi',
  'Transfer atau Restore': 'transfer',
  'Queue Risiko Tinggi': 'risiko',
}

const priorityTone: Record<WorklistItem['priority'], string> = {
  tinggi: 'bg-rose-50 text-rose-700',
  sedang: 'bg-amber-50 text-amber-700',
  rendah: 'bg-emerald-50 text-emerald-700',
}

function buildWorkspaceHref(params: { queue?: string; selected?: string }) {
  const searchParams = new URLSearchParams()
  if (params.queue) searchParams.set('queue', params.queue)
  if (params.selected) searchParams.set('selected', params.selected)
  const query = searchParams.toString()
  return query ? `/customers/cs-admin?${query}` : '/customers/cs-admin'
}

function pickActiveBucket(buckets: WorklistBucketData[], selectedQueue: string) {
  return (
    buckets.find((bucket) => bucket.queue === selectedQueue) ??
    buckets.find((bucket) => bucket.items.length > 0) ??
    buckets[0] ??
    null
  )
}

function getSelectedItem(bucket: WorklistBucketData | null, selectedItemId?: string) {
  if (!bucket) return null
  const requestedId = String(selectedItemId ?? '').trim()
  return bucket.items.find((item) => item.id === requestedId) ?? bucket.items[0] ?? null
}

export function CsAdminWorkspaceDashboard({
  role,
  source,
  baseCount,
  buckets,
  selectedQueue,
  selectedItemId,
}: CsAdminWorkspaceDashboardProps) {
  const roleMeta = getRoleMeta(role)
  const activeBucket = pickActiveBucket(buckets, selectedQueue)
  const selectedItem = getSelectedItem(activeBucket, selectedItemId)
  const focusedBacklog = buckets.reduce((total, bucket) => total + bucket.totalCount, 0)
  const criticalCount = buckets.reduce((total, bucket) => total + bucket.summary.criticalCount, 0)
  const waitingCount = buckets.reduce((total, bucket) => total + bucket.summary.waitingCount, 0)
  const approvalCount = buckets.find((bucket) => bucket.queue === 'Perlu Approval')?.totalCount ?? 0
  const [quickActionItem, setQuickActionItem] = useState<WorklistItem | null>(null)

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Workspace Supervisor CS</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Queue hidup untuk approval, koreksi, transfer, dan risiko tinggi
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Halaman ini menggantikan landing statis `CS & Admin CS` dengan pembacaan supervisor yang langsung
              menarik antrean lintas customer, support, inventory, dan daily activity dari scope role aktif.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.label}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">
              {roleMeta.division} / {roleMeta.subdivision}
            </span>
            {activeBucket ? <span className="badge border-slate-200 bg-white text-slate-600">{activeBucket.queue}</span> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fokus Supervisor</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{focusedBacklog}</p>
            <p className="mt-2 text-sm text-mute">Dari {baseCount} item scope CS Admin lintas domain.</p>
          </article>
          <article className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Perlu Approval</p>
            <p className="mt-3 text-3xl font-semibold text-sky-900">{approvalCount}</p>
            <p className="mt-2 text-sm text-sky-700">Supervisor perlu memberi keputusan agar alur tim lanjut.</p>
          </article>
          <article className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Kritikal</p>
            <p className="mt-3 text-3xl font-semibold text-rose-900">{criticalCount}</p>
            <p className="mt-2 text-sm text-rose-700">Backlog yang berisiko menahan SLA atau keputusan tim.</p>
          </article>
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Menunggu</p>
            <p className="mt-3 text-3xl font-semibold text-amber-900">{waitingCount}</p>
            <p className="mt-2 text-sm text-amber-700">Item yang masih menunggu validasi, monitoring, atau handoff.</p>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/customers"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Buka Customer Master
          </Link>
          <Link
            href="/inventory"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Cek ODP dan Port
          </Link>
          <Link
            href="/support/isolations"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Buka Isolir
          </Link>
          <Link
            href="/support/dismantle"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Buka Dismantle
          </Link>
          <Link
            href={buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Buka TT Aktif
          </Link>
          <Link
            href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Buka SLA Kritis
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {buckets.map((bucket) => {
          const active = activeBucket?.queue === bucket.queue
          const href = buildWorkspaceHref({ queue: bucket.queue })
          const tone = queueTone[bucket.queue] ?? 'border-slate-200 bg-white text-slate-900'

          return (
            <Link
              key={bucket.queue}
              href={href}
              className={`rounded-3xl border p-5 transition hover:-translate-y-0.5 ${active ? tone : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  {queueShortLabel[bucket.queue] ?? 'queue'}
                </span>
                <span className={`badge ${active ? 'border-white/20 bg-white/10 text-current' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {bucket.totalCount} item
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{bucket.queue}</h2>
              <p className={`mt-2 text-sm leading-6 ${active ? 'text-current/90' : 'text-mute'}`}>
                {queueDescriptions[bucket.queue] ?? 'Bucket supervisor untuk tindak lanjut operasional CS.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`badge ${active ? 'border-white/20 bg-white/10 text-current' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  kritikal {bucket.summary.criticalCount}
                </span>
                <span className={`badge ${active ? 'border-white/20 bg-white/10 text-current' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  menunggu {bucket.summary.waitingCount}
                </span>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Queue Aktif</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {activeBucket ? activeBucket.queue : 'Belum ada queue supervisor'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
                {activeBucket
                  ? queueDescriptions[activeBucket.queue] ?? 'Pilih item untuk melihat detail dan CTA lintas domain.'
                  : 'Belum ada antrean supervisor yang tampil dari scope role aktif.'}
              </p>
            </div>
            {activeBucket ? <span className="badge border-slate-200 bg-white text-slate-600">{activeBucket.totalCount} item</span> : null}
          </div>

          {activeBucket && activeBucket.items.length ? (
            <>
              <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-4 py-3">Prioritas</th>
                      <th className="px-4 py-3">Domain</th>
                      <th className="px-4 py-3">Judul</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {activeBucket.items.map((item) => {
                      const active = item.id === selectedItem?.id
                      const selectHref = buildWorkspaceHref({ queue: activeBucket.queue, selected: item.id })

                      return (
                        <tr key={item.id} className={active ? 'bg-slate-50' : ''}>
                          <td className="px-4 py-4 align-top">
                            <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
                          </td>
                          <td className="px-4 py-4 align-top text-sm font-medium text-slate-700">{item.domain}</td>
                          <td className="px-4 py-4 align-top">
                            <Link href={selectHref} className="block space-y-1 hover:opacity-90">
                              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                              <p className="text-sm text-slate-600">{item.subtitle}</p>
                              <p className="text-sm leading-6 text-mute">{item.detail}</p>
                            </Link>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className="badge border-transparent bg-slate-950 text-white">{item.status}</span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-2">
                              <Link
                                href={selectHref}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                              >
                                Lihat detail
                              </Link>
                              <button
                                type="button"
                                onClick={() => setQuickActionItem(item)}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                              >
                                Aksi cepat
                              </button>
                              <Link
                                href={item.href}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                {item.actionLabel}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 xl:hidden">
                {activeBucket.items.map((item) => {
                  const active = item.id === selectedItem?.id
                  const selectHref = buildWorkspaceHref({ queue: activeBucket.queue, selected: item.id })

                  return (
                    <article
                      key={item.id}
                      className={`rounded-3xl border p-5 ${active ? 'border-slate-950 bg-slate-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge border-slate-200 bg-white text-slate-600">{item.domain}</span>
                        <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
                        <span className="badge border-transparent bg-slate-950 text-white">{item.status}</span>
                      </div>
                      <p className="mt-4 text-base font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{item.subtitle}</p>
                      <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={selectHref}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                        >
                          Lihat detail
                        </Link>
                        <button
                          type="button"
                          onClick={() => setQuickActionItem(item)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                        >
                          Aksi cepat
                        </button>
                        <Link
                          href={item.href}
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          {item.actionLabel}
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-mute">
              Queue ini belum memiliki item aktif. Pilih bucket lain atau lanjut ke modul terkait untuk melihat scope detail.
            </div>
          )}
        </section>

        <WorklistDetailPanel item={selectedItem} />
      </section>

      <WorklistQuickActionModal
        item={quickActionItem}
        onClose={() => setQuickActionItem(null)}
        title="Aksi cepat supervisor dari tabel queue"
      />
    </div>
  )
}
