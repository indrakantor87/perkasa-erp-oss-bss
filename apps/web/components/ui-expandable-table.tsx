'use client'

import { useState, type ReactNode } from 'react'

export type ExpandableRowActionItem = {
  key: string
  label: string
  tone: 'default' | 'primary' | 'danger' | 'warning' | 'success'
  icon?: ReactNode
  onClick?: () => void
  href?: string
}

export type ExpandableRowMetaItem = {
  label: string
  value: ReactNode
}

export type ExpandableRowSubSection = {
  key: string
  title: string
  columns?: string[]
  rows?: ReactNode[][]
  content?: ReactNode
}

export function ExpandableTableWrapper({
  children,
  minWidthPx = 980,
  ariaLabel,
}: {
  children: ReactNode
  minWidthPx?: number
  ariaLabel?: string
}) {
  return (
    <div
      className="data-table-wrapper hidden overflow-x-auto lg:block"
      role="region"
      aria-label={ariaLabel}
    >
      <table className="data-table" style={{ minWidth: `${minWidthPx}px` }}>
        {children}
      </table>
    </div>
  )
}

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

export function ExpandableHeaderLeftCells({
  headerCheckbox,
  colSpanNumber = 2,
}: {
  headerCheckbox?: ReactNode
  colSpanNumber?: number
}) {
  return (
    <>
      <th className="w-[3.25rem]">
        <div className="flex items-center justify-center">{headerCheckbox ?? null}</div>
      </th>
      <th className="w-[3.5rem]">
        <div className="flex items-center justify-start text-center">#</div>
      </th>
    </>
  )
}

export function ExpandableRow({
  id,
  num,
  compactCells,
  totalCols,
  checkbox,
  actions,
  meta,
  subSections,
  children,
  onToggle,
  startOpen = false,
  tone = 'default',
}: {
  id: string
  num: number
  compactCells: ReactNode[]
  totalCols: number
  checkbox?: ReactNode
  actions?: ExpandableRowActionItem[]
  meta?: ExpandableRowMetaItem[]
  subSections?: ExpandableRowSubSection[]
  children?: ReactNode
  onToggle?: (next: boolean) => void
  startOpen?: boolean
  tone?: 'default' | 'muted'
}) {
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
      <tr
        className={toneClass}
        aria-expanded={expanded}
        data-row-id={id}
      >
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
        {compactCells.map((cell, idx) => (
          <td key={`c-${id}-${idx}`} className="px-3 py-3 align-middle text-sm text-slate-800">
            {cell}
          </td>
        ))}
      </tr>

      {expanded ? (
        <tr id={`expandable-row-${id}`} className="bg-slate-900/[0.02]">
          <td colSpan={totalCols} className="p-0">
            <div className="border-t border-line bg-surface px-5 py-5">
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
          </td>
        </tr>
      ) : null}
    </>
  )
}
