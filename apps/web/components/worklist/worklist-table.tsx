'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { memo, useDeferredValue, useState } from 'react'
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

const priorityTone: Record<WorklistItem['priority'], string> = {
  tinggi: 'status-chip-danger',
  sedang: 'status-chip-warning',
  rendah: 'status-chip-success',
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

        return (
          <tr key={item.id} style={active ? { backgroundColor: 'var(--color-accent-soft)' } : undefined}>
            <td className="px-4 py-4 align-top">
              <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
            </td>
            <td className="px-4 py-4 align-top text-sm font-medium text-[var(--color-mute-strong)]">{item.domain}</td>
            <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{item.queue}</td>
            <td className="px-4 py-4 align-top">
              <Link href={selectHref} className="block space-y-1 hover:opacity-90">
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.title}</p>
                <p className="text-sm text-mute">{item.subtitle}</p>
              </Link>
            </td>
            <td className="px-4 py-4 align-top">
              <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>{item.status}</span>
            </td>
            <td className="px-4 py-4 align-top text-sm leading-6 text-mute">{item.detail}</td>
            <td className="px-4 py-4 align-top">
              <div className="flex flex-col gap-2">
                <Link
                  href={selectHref}
                  className="surface-soft inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
                >
                  Lihat detail
                </Link>
                <button
                  type="button"
                  onClick={() => setQuickActionItem(item)}
                  className="surface-soft inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:bg-surface hover:text-[var(--color-ink-strong)]"
                >
                  Aksi cepat
                </button>
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
                >
                  {item.actionLabel}
                </Link>
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
    <div className="mt-6 grid gap-4 sm:hidden">
      {items.map((item) => {
        const active = item.id === selectedItemId
        const selectHref = buildWorklistQueryHref({
          ...state,
          selected: item.id,
        })

        return (
          <article
            key={item.id}
            className="rounded-xl border p-5"
            style={
              active
                ? { borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-surface-soft)' }
                : { borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface)' }
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="solid-chip">{item.domain}</span>
              <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
              <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>{item.status}</span>
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--color-ink-strong)]">{item.title}</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-mute-strong)]">{item.subtitle}</p>
            <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-mute">{item.queue}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={selectHref}
                className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
              >
                Lihat detail
              </Link>
              <button
                type="button"
                onClick={() => setQuickActionItem(item)}
                className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:bg-surface hover:text-[var(--color-ink-strong)]"
              >
                Aksi cepat
              </button>
              <Link
                href={item.href}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
              >
                {item.actionLabel}
              </Link>
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
      <section className="panel p-6">
        <p className="section-title">Daftar Item</p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">Tidak ada item pada kombinasi filter ini</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">
          Coba longgarkan filter antrean, domain, atau keyword. Jika hasil tetap kosong, memang belum ada item yang masuk ke antrean tersebut.
        </p>
      </section>
    )
  }

  return (
    <section className="panel p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Daftar Item</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">Tabel kerja yang bisa dipilih satu per satu</h3>
        </div>
        <span className="solid-chip">{items.length} item</span>
      </div>

      <div className="mt-6 data-table-wrapper hidden overflow-x-auto sm:block">
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>Prioritas</th>
              <th>Domain</th>
              <th>Queue</th>
              <th>Judul</th>
              <th>Status</th>
              <th>Detail</th>
              <th>Aksi</th>
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
