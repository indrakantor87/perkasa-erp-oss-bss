'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { getSupportActionAnchorId } from '@/lib/support-action-links'
import type { SupportLaneActionKey } from '@/lib/types'

export type SupportActionModalItem = {
  key: SupportLaneActionKey
  title: string
  description: string
  element: ReactNode
}

function normalizeHash(value: string) {
  return value.replace(/^#/, '').trim()
}

function resolveNormalizedHash(href: string) {
  try {
    const url = new URL(href, window.location.href)
    return normalizeHash(url.hash)
  } catch {
    return normalizeHash(href)
  }
}

export function SupportActionFormModal({
  items,
  heading = 'Form aksi support',
  helperText = 'Klik aksi dari tabel atau lane aktif untuk membuka form input, progress, close, atau edit tanpa perlu scroll ke bawah.',
}: {
  items: SupportActionModalItem[]
  heading?: string
  helperText?: string
}) {
  const itemMap = useMemo(() => {
    const entries = items.map((item) => [getSupportActionAnchorId(item.key), item] as const)
    return new Map(entries)
  }, [items])

  const [activeHash, setActiveHash] = useState<string | null>(null)

  useEffect(() => {
    const syncFromHash = () => {
      const normalizedHash = normalizeHash(window.location.hash)
      setActiveHash(itemMap.has(normalizedHash) ? normalizedHash : null)
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [itemMap])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }

      const rawHref = anchor.getAttribute('href')?.trim()
      if (!rawHref) {
        return
      }

      const normalizedHash = resolveNormalizedHash(rawHref)
      if (!itemMap.has(normalizedHash)) {
        return
      }

      const resolvedUrl = new URL(rawHref, window.location.href)
      const samePath = resolvedUrl.pathname === window.location.pathname
      const sameSearch = resolvedUrl.search === window.location.search
      if (!samePath || !sameSearch) {
        return
      }

      event.preventDefault()
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${normalizedHash}`)
      setActiveHash(normalizedHash)
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [itemMap])

  const activeItem = activeHash ? itemMap.get(activeHash) ?? null : null

  function handleClose() {
    setActiveHash(null)
    if (typeof window === 'undefined') {
      return
    }

    const nextUrl = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(null, '', nextUrl)
  }

  if (!activeItem) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Tutup form aksi support" className="absolute inset-0" onClick={handleClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-line bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">{heading}</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {activeItem.title}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">{activeItem.description}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{helperText}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Tutup
            </button>
          </div>
        </div>
        <div className="px-6 py-6">{activeItem.element}</div>
      </div>
    </div>
  )
}
