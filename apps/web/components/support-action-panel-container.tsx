'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

function normalizeHash(value: string) {
  return value.replace(/^#/, '').trim()
}

export function SupportActionPanelContainer({
  title,
  description,
  actionIds,
  itemCount,
  defaultOpen = false,
  children,
}: {
  title: string
  description: string
  actionIds: string[]
  itemCount: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const normalizedActionIds = useMemo(
    () => actionIds.map((item) => normalizeHash(item)).filter(Boolean),
    [actionIds],
  )

  const getHashMatchedState = () => {
    if (typeof window === 'undefined') {
      return false
    }

    const currentHash = normalizeHash(window.location.hash)
    return currentHash ? normalizedActionIds.includes(currentHash) : false
  }

  const [hasHashMatch, setHasHashMatch] = useState(getHashMatchedState)
  const [open, setOpen] = useState(defaultOpen || getHashMatchedState())

  useEffect(() => {
    const syncHashState = () => {
      const matched = getHashMatchedState()
      setHasHashMatch(matched)
      if (matched) {
        setOpen(true)
      }
    }

    syncHashState()
    window.addEventListener('hashchange', syncHashState)
    return () => window.removeEventListener('hashchange', syncHashState)
  }, [normalizedActionIds])

  const isEmphasized = open || hasHashMatch || defaultOpen

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={`group rounded-2xl border bg-white p-4 transition ${
        isEmphasized
          ? 'border-slate-300 shadow-sm ring-1 ring-slate-200'
          : 'border-line'
      }`}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-sm font-semibold text-slate-950">{title}</span>
        <span
          className={`badge ${
            hasHashMatch || defaultOpen
              ? 'border-slate-950 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          {hasHashMatch || defaultOpen ? 'Panel prioritas' : `${itemCount} form`}
        </span>
      </summary>
      <p className="mt-2 text-sm leading-6 text-mute">{description}</p>
      <div className="mt-4">{children}</div>
    </details>
  )
}
