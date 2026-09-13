'use client'

import { useState, type ReactNode } from 'react'
import { ExpandableIconChevron } from './ui-expandable-table'

export type ExpandableCardRowProps = {
  id: string
  num?: number
  compactTop: ReactNode
  compactBottom?: ReactNode
  detail: ReactNode
  startOpen?: boolean
  onToggle?: (next: boolean) => void
}

export function ExpandableCardRow({
  id,
  num,
  compactTop,
  compactBottom,
  detail,
  startOpen = false,
  onToggle,
}: ExpandableCardRowProps) {
  const [expanded, setExpanded] = useState<boolean>(startOpen)
  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    onToggle?.(next)
  }

  return (
    <div
      id={`expandable-card-${id}`}
      className={
        'rounded-2xl border transition-all ' +
        (expanded ? 'border-lineStrong bg-slate-900/[0.02] shadow-sm' : 'border-line bg-white')
      }
      data-row-id={id}
    >
      <div className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <label className="mt-0.5 inline-flex cursor-pointer items-center shrink-0">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-lineStrong text-slate-900 focus-visible:ring-0"
                aria-label={num ? `Pilih baris nomor ${num}` : 'Pilih baris'}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => e.stopPropagation()}
              />
            </label>

            {num != null ? (
              <span className="mt-0.5 hidden w-10 shrink-0 rounded-lg border border-line bg-surface px-2 py-1 text-center text-sm font-bold tabular-nums text-slate-700 md:inline-block">
                {num}
              </span>
            ) : null}

            <div className="min-w-0 flex-1">{compactTop}</div>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Tutup detail baris' : 'Buka detail baris'}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-slate-600 transition hover:border-lineStrong hover:bg-white hover:text-slate-950"
          >
            <ExpandableIconChevron expanded={expanded} />
          </button>
        </div>

        {compactBottom ? (
          <div className="mt-3">{compactBottom}</div>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-line bg-surface/60 px-4 py-5 sm:px-5">
          {detail}
        </div>
      ) : null}
    </div>
  )
}
