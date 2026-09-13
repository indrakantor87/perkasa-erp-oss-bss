'use client'

import { useState, type ReactNode } from 'react'
import { ExpandableIconChevron } from './ui-expandable-table'

export type ExpandableCardRowProps = {
  id: string
  num?: number
  checkbox?: boolean
  compactTopRow: ReactNode
  compactBottomRow?: ReactNode
  statusBadge?: ReactNode
  actions?: {
    key: string
    label: string
    tone: 'default' | 'primary' | 'danger' | 'warning' | 'success'
    icon?: ReactNode
    onClick?: () => void
    href?: string
  }[]
  meta?: {
    label: string
    value: ReactNode
  }[]
  subSections?: {
    key: string
    title: string
    columns?: string[]
    rows?: ReactNode[][]
    content?: ReactNode
  }[]
  children?: ReactNode
  startOpen?: boolean
  onToggle?: (next: boolean) => void
}

export function ExpandableCardRow({
  id,
  num,
  checkbox = true,
  compactTopRow,
  compactBottomRow,
  statusBadge,
  actions,
  meta,
  subSections,
  children,
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
          <div className="flex items-start gap-3">
            {checkbox ? (
              <label className="mt-0.5 inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-lineStrong text-slate-900 focus-visible:ring-0"
                  aria-label={num ? `Pilih baris nomor ${num}` : 'Pilih baris'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => e.stopPropagation()}
                />
              </label>
            ) : null}

            {num != null ? (
              <span className="mt-0.5 hidden w-10 shrink-0 rounded-lg border border-line bg-surface px-2 py-1 text-center text-sm font-bold tabular-nums text-slate-700 md:inline-block">
                {num}
              </span>
            ) : null}

            <div className="min-w-0 flex-1">{compactTopRow}</div>

            {statusBadge ? (
              <div className="shrink-0 lg:ml-3">{statusBadge}</div>
            ) : null}
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

        {compactBottomRow ? (
          <div className="mt-3">{compactBottomRow}</div>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-line bg-surface/60 px-4 py-5 sm:px-5">
          {(actions && actions.length > 0) || (meta && meta.length > 0) ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {actions && actions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  {actions.map((action) => {
                    const toneClass =
                      action.tone === 'primary'
                        ? 'border-sky-300 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-sky-100'
                        : action.tone === 'danger'
                          ? 'border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100'
                          : action.tone === 'warning'
                            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100'
                            : action.tone === 'success'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100'
                              : 'border-line bg-white text-slate-700 hover:border-lineStrong hover:bg-surface'
                    if (action.href) {
                      return (
                        <a
                          key={action.key}
                          href={action.href}
                          className={
                            'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ' +
                            toneClass
                          }
                        >
                          {action.icon ?? null}
                          <span>{action.label}</span>
                        </a>
                      )
                    }
                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={action.onClick}
                        className={
                          'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ' +
                          toneClass
                        }
                      >
                        {action.icon ?? null}
                        <span>{action.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {meta && meta.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {meta.map((m, idx) => (
                    <div key={`m-${id}-${idx}`} className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-[0.14em] text-mute">
                        {m.label}
                      </span>
                      <span className="tabular-nums text-slate-900">{m.value}</span>
                      {idx < meta.length - 1 ? (
                        <span className="text-mute" aria-hidden>
                          •
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {subSections && subSections.length > 0 ? (
            <div className="mt-5 space-y-5">
              {subSections.map((section) => (
                <section key={section.key} className="space-y-2">
                  <h4 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-slate-950">
                    {section.title}
                  </h4>
                  {section.content ? <div>{section.content}</div> : null}
                  {section.columns && section.rows && section.rows.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {section.columns.map((col, cIdx) => (
                              <th key={`col-${section.key}-${cIdx}`} className="text-xs font-semibold uppercase tracking-wider text-mute">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row, rIdx) => (
                            <tr key={`row-${section.key}-${rIdx}`}>
                              {row.map((cell, cIdx) => (
                                <td key={`cell-${section.key}-${rIdx}-${cIdx}`} className="px-4 py-3 align-top text-sm text-slate-800">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          ) : null}

          {children ? <div className="mt-5">{children}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
