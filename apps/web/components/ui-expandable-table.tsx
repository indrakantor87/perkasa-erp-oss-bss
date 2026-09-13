'use client'

import { useState, type ReactNode } from 'react'

export function ExpandableIconChevron({
  expanded,
  className = '',
}: {
  expanded: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        'inline-block transition-transform duration-200 ' +
        (expanded ? 'rotate-180 text-slate-900' : 'rotate-0 text-slate-500') +
        ' ' +
        className
      }
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function ExpandableHeaderLeftCells() {
  return (
    <>
      <th className="w-[3.25rem]">
        <div className="flex items-center justify-center" aria-hidden />
      </th>
      <th className="w-[3.5rem]">
        <div className="flex items-center justify-start text-center">#</div>
      </th>
    </>
  )
}

export type ExpandableRowProps = {
  id: string
  num: number
  totalCols: number
  compactRow: ReactNode
  detail: ReactNode
  tone?: 'default' | 'muted'
  startOpen?: boolean
  onToggle?: (next: boolean) => void
}

export function ExpandableRow({
  id,
  num,
  totalCols,
  compactRow,
  detail,
  tone = 'default',
  startOpen = false,
  onToggle,
}: ExpandableRowProps) {
  const [expanded, setExpanded] = useState<boolean>(startOpen)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    onToggle?.(next)
  }

  const toneClass =
    tone === 'muted'
      ? expanded
        ? 'bg-slate-900/[0.02]'
        : ''
      : expanded
        ? 'bg-slate-900/[0.03]'
        : ''

  return (
    <>
      <tr className={toneClass} aria-expanded={expanded} data-row-id={id}>
        <td className="px-3 py-3 align-middle text-center">
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-lineStrong text-slate-900 focus-visible:ring-0"
              aria-label={`Pilih baris nomor ${num}`}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => e.stopPropagation()}
            />
          </label>
        </td>
        <td className="px-3 py-3 align-middle">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={expanded ? `Tutup detail baris nomor ${num}` : `Buka detail baris nomor ${num}`}
              aria-expanded={expanded}
              aria-controls={`expandable-row-${id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-600 transition hover:border-line hover:bg-surface hover:text-slate-950"
            >
              <ExpandableIconChevron expanded={expanded} />
            </button>
            <span className="tabular-nums text-sm font-semibold text-slate-950">
              {num}
            </span>
          </div>
        </td>
        {compactRow}
      </tr>

      {expanded ? (
        <tr id={`expandable-row-${id}`} className="bg-slate-900/[0.02]">
          <td colSpan={totalCols} className="p-0">
            <div className="border-t border-line bg-surface px-5 py-5">{detail}</div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
