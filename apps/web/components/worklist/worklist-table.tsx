'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { memo, useDeferredValue, useState } from 'react'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
import type { WorklistItem } from '@/lib/types'
import { buildWorklistQueryHref, type WorklistQueryState } from '@/components/worklist/worklist-query'

const WorklistQuickActionModal = dynamic(
  () => import('@/components/worklist/worklist-quick-action-modal').then((module) => module.WorklistQuickActionModal),
  {
    ssr: false,
    loading: () => null,
  },
)

type WorklistTableProps = {
  items: WorklistItem[]
  selectedItemId?: string
  state: WorklistQueryState
}

function resolvePriorityTone(priority: WorklistItem['priority']): StatusTone {
  if (priority === 'tinggi') return 'danger'
  if (priority === 'sedang') return 'warning'
  return 'success'
}

function resolvePriorityLabel(priority: WorklistItem['priority']): string {
  if (priority === 'tinggi') return 'URGENT'
  if (priority === 'sedang') return 'NORMAL'
  return 'RENDAH'
}

function resolveStatusTone(status: string): StatusTone {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (['CLOSED', 'DONE', 'COMPLETED', 'READY'].includes(normalized)) return 'success'
  if (['ACCEPTED', 'ON_PROGRESS', 'PROCESS', 'ASSIGNED'].includes(normalized)) return 'in_progress'
  if (['OPEN', 'OVERDUE'].includes(normalized)) return 'danger'
  if (['PENDING', 'REVIEW', 'WAITING', 'MONITOR', 'HOLD'].includes(normalized)) return 'pending'
  return 'neutral'
}

const WorklistTableRows = memo(function WorklistTableRows({
  items,
  selectedItemId,
  state,
  setQuickActionItem,
}: {
  items: WorklistItem[]
  selectedItemId?: string
  state: WorklistQueryState
  setQuickActionItem: (item: WorklistItem) => void
}) {
  return (
    <tbody>
      {items.map((item) => {
        const active = item.id === selectedItemId
        const selectHref = buildWorklistQueryHref({
          ...state,
          selected: item.id,
        })
        const priorityLabel = resolvePriorityLabel(item.priority)
        const priorityTone = resolvePriorityTone(item.priority)
        const statusTone = resolveStatusTone(item.status)

        return (
          <tr
            key={item.id}
            className={`transition-colors duration-fast ${active ? 'bg-accentSoft' : 'hover:bg-surfaceSoft/60'}`}
            aria-selected={active}
          >
            <td className="px-3 py-3 align-top">
              <StatusBadge
                tone={priorityTone}
                label={priorityLabel}
                size="sm"
                uppercase
                ariaLabel={`Prioritas item ${item.id}: ${priorityLabel}`}
              />
            </td>
            <td className="px-3 py-3 align-top text-xs font-medium text-muteStrong">{item.domain}</td>
            <td className="px-3 py-3 align-top text-xs text-mute">{item.queue}</td>
            <td className="px-3 py-3 align-top">
              <Link href={selectHref} className="block space-y-0.5 focus-visible:shadow-focus rounded-control px-0.5 -mx-0.5 py-0.5 hover:opacity-90" aria-label={`Pilih item ${item.title}`}>
                <p className="text-sm font-semibold text-inkStrong">{item.title}</p>
                <p className="text-xs text-mute">{item.subtitle || item.owner || '-'}</p>
              </Link>
            </td>
            <td className="px-3 py-3 align-top">
              <StatusBadge
                tone={statusTone}
                label={item.status}
                size="sm"
                uppercase
                ariaLabel={`Status item ${item.id}: ${item.status}`}
              />
            </td>
            <td className="px-3 py-3 align-top max-w-[22rem]">
              <p className="text-xs leading-5 text-mute line-clamp-2">{item.nextAction || item.detail}</p>
            </td>
            <td className="px-3 py-3 align-top">
              <div className="text-xs text-muteStrong">{item.dueLabel || item.owner || '-'}</div>
            </td>
            <td className="px-3 py-3 align-top">
              <div className="flex flex-col items-stretch gap-1.5 lg:flex-row lg:flex-wrap lg:items-center">
                <Link
                  href={item.href}
                  aria-label={`${item.actionLabel}: ${item.title}`}
                  className="btn-base btn-primary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-3 text-xs font-semibold transition hover:opacity-90"
                >
                  {item.actionLabel}
                </Link>
                <Link
                  href={selectHref}
                  aria-label={`Lihat detail worklist item ${item.title}`}
                  className="btn-base btn-secondary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-3 text-xs font-medium transition hover:border-lineStrong"
                >
                  Lihat detail
                </Link>
                <button
                  type="button"
                  onClick={() => setQuickActionItem(item)}
                  aria-label={`Buka aksi cepat untuk ${item.title}`}
                  className="btn-base btn-ghost focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control border border-line bg-surfaceSoft px-3 text-xs font-medium text-ink transition hover:border-lineStrong hover:text-inkStrong"
                >
                  Aksi cepat
                </button>
              </div>
            </td>
          </tr>
        )
      })}
    </tbody>
  )
})

const WorklistCardList = memo(function WorklistCardList({
  items,
  selectedItemId,
  state,
  setQuickActionItem,
}: {
  items: WorklistItem[]
  selectedItemId?: string
  state: WorklistQueryState
  setQuickActionItem: (item: WorklistItem) => void
}) {
  return (
    <div className="grid gap-3 lg:hidden" aria-label="Daftar item worklist format kartu untuk layar kecil">
      {items.map((item) => {
        const active = item.id === selectedItemId
        const selectHref = buildWorklistQueryHref({
          ...state,
          selected: item.id,
        })
        const priorityLabel = resolvePriorityLabel(item.priority)
        const priorityTone = resolvePriorityTone(item.priority)
        const statusTone = resolveStatusTone(item.status)

        return (
          <article
            key={item.id}
            aria-selected={active}
            className={`rounded-control border p-4 transition-colors ${
              active
                ? 'border-accent bg-surfaceSoft'
                : 'border-line bg-card'
            }`}
          >
            <header className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={priorityTone}
                label={priorityLabel}
                size="sm"
                uppercase
                ariaLabel={`Prioritas item ${item.id}: ${priorityLabel}`}
              />
              <StatusBadge
                tone="info"
                label={item.domain}
                size="sm"
                ariaLabel={`Domain item ${item.id}: ${item.domain}`}
              />
              <StatusBadge
                tone={statusTone}
                label={item.status}
                size="sm"
                uppercase
                ariaLabel={`Status item ${item.id}: ${item.status}`}
              />
              {item.owner ? (
                <StatusBadge tone="neutral" label={item.owner} size="sm" ariaLabel={`PIC: ${item.owner}`} />
              ) : null}
            </header>

            <div className="mt-3 space-y-1.5">
              <Link
                href={selectHref}
                className="block focus-visible:shadow-focus rounded-control -mx-1 px-1 py-0.5"
                aria-label={`Pilih item ${item.title} untuk lihat detail`}
              >
                <h3 className="text-base font-semibold text-inkStrong leading-snug">{item.title}</h3>
              </Link>
              {item.subtitle ? (
                <p className="text-sm font-medium text-muteStrong">{item.subtitle}</p>
              ) : null}
              <p className="text-xs uppercase tracking-[0.18em] text-mute">{item.queue}</p>
            </div>

            <div className="mt-3 space-y-2">
              {item.nextAction ? (
                <dl className="grid gap-1 rounded-control border border-line bg-cardSubtle px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Langkah Berikut</dt>
                  <dd className="text-sm leading-5 text-ink">{item.nextAction}</dd>
                </dl>
              ) : null}
              {item.detail ? (
                <p className="text-sm leading-5 text-mute line-clamp-3">{item.detail}</p>
              ) : null}
              {item.dueLabel || item.blockingInfo ? (
                <dl className="grid gap-1">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Target</dt>
                    <dd className="text-sm leading-5 text-ink">{item.dueLabel || 'Monitoring'}</dd>
                  </div>
                  {item.blockingInfo ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Blocker</dt>
                      <dd className="text-sm leading-5 text-mute">{item.blockingInfo}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                href={item.href}
                aria-label={`${item.actionLabel}: ${item.title}`}
                className="btn-base btn-primary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-3 text-sm font-semibold transition hover:opacity-90"
              >
                {item.actionLabel}
              </Link>
              <Link
                href={selectHref}
                aria-label={`Lihat detail worklist item ${item.title}`}
                className="btn-base btn-secondary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-3 text-sm font-medium transition hover:border-lineStrong"
              >
                Lihat detail
              </Link>
              <button
                type="button"
                onClick={() => setQuickActionItem(item)}
                aria-label={`Buka aksi cepat untuk ${item.title}`}
                className="btn-base btn-ghost focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control border border-line bg-surfaceSoft px-3 text-sm font-medium text-ink transition hover:border-lineStrong hover:text-inkStrong"
              >
                Aksi cepat
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
})

export function WorklistTable({ items, selectedItemId, state }: WorklistTableProps) {
  const [quickActionItem, setQuickActionItem] = useState<WorklistItem | null>(null)
  const deferredItems = useDeferredValue(items)

  if (!items.length) {
    return (
      <section aria-label="Worklist empty state" className="card-tier-2 border border-line p-6 text-center">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surfaceSoft text-muteStrong" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-inkStrong">Tidak ada item pada kombinasi filter ini</h3>
          <p className="text-sm leading-6 text-mute">
            Coba longgarkan filter antrean, domain, atau keyword. Jika hasil tetap kosong, memang belum ada item yang masuk ke antrean tersebut.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Worklist items table and mobile card list" className="card-tier-3 border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-title">Daftar Item</p>
          <h3 className="mt-1 text-lg font-semibold text-inkStrong">Tabel kerja yang bisa dipilih satu per satu</h3>
        </div>
        <StatusBadge tone="neutral" label={`${items.length} item`} size="sm" ariaLabel={`Jumlah item ditampilkan: ${items.length}`} />
      </div>

      <div className="mt-5 data-table-wrapper hidden overflow-x-auto lg:block" role="region" aria-label="Tabel worklist untuk desktop">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              <th className="w-[8rem]">Prioritas</th>
              <th className="w-[8rem]">Domain</th>
              <th className="w-[10rem]">Antrean</th>
              <th>Judul / PIC</th>
              <th className="w-[9rem]">Status</th>
              <th>Next Action</th>
              <th className="w-[10rem]">Target / PIC</th>
              <th className="w-[18rem]">Aksi</th>
            </tr>
          </thead>
          <WorklistTableRows
            items={deferredItems}
            selectedItemId={selectedItemId}
            state={state}
            setQuickActionItem={setQuickActionItem}
          />
        </table>
      </div>

      <WorklistCardList
        items={deferredItems}
        selectedItemId={selectedItemId}
        state={state}
        setQuickActionItem={setQuickActionItem}
      />

      {quickActionItem ? (
        <WorklistQuickActionModal item={quickActionItem} onClose={() => setQuickActionItem(null)} />
      ) : null}
    </section>
  )
}
