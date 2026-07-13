'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

function normalizeHash(value: string) {
  return value.replace(/^#/, '').trim()
}

export function SupportActionPanelSlot({
  id,
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  id?: string
  title: string
  description: string
  children: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  if (collapsible) {
    const getHashMatchedState = () => {
      if (typeof window === 'undefined' || !id) {
        return false
      }

      return normalizeHash(window.location.hash) === normalizeHash(id)
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
    }, [id])

    return (
      <details
        id={id}
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className={`rounded-2xl border bg-slate-50 p-4 scroll-mt-24 xl:self-start ${
          open || hasHashMatch || defaultOpen
            ? 'border-slate-300 ring-1 ring-slate-200'
            : 'border-line'
        }`}
      >
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">{title}</summary>
        <p className="mt-2 text-sm leading-6 text-mute">{description}</p>
        <div className="mt-4">{children}</div>
      </details>
    )
  }

  return (
    <div id={id} className="rounded-2xl border border-line bg-slate-50 p-4 scroll-mt-24 xl:self-start">
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-mute">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
