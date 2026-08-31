'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  normalizeUiTheme,
  UI_THEME_COOKIE_KEY,
  UI_THEME_STORAGE_KEY,
  type UiTheme,
} from '@/lib/ui-theme'

type UiThemeContextValue = {
  theme: UiTheme
  setTheme: (theme: UiTheme) => void
}

declare global {
  interface Window {
    __perkasa_setTheme?: (t: UiTheme | string) => void
  }
  type PerkasaThemeEventDetail = { theme: UiTheme }
  interface WindowEventMap {
    'perkasa:ui:themechange': CustomEvent<PerkasaThemeEventDetail>
  }
}

const UiThemeContext = createContext<UiThemeContextValue | null>(null)

function writeThemePersistence(theme: UiTheme, opts?: { skipDispatch?: boolean }) {
  if (typeof window === 'undefined') return
  const normalized = normalizeUiTheme(theme)
  try { window.localStorage.setItem(UI_THEME_STORAGE_KEY, normalized) } catch {}
  try {
    document.cookie = `${UI_THEME_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
  } catch {}
  let mutated = false
  try {
    const docEl = document.documentElement
    if (docEl.getAttribute('data-theme') !== normalized) {
      docEl.setAttribute('data-theme', normalized)
      mutated = true
    }
    if ((docEl.style.colorScheme || '') !== normalized) {
      docEl.style.colorScheme = normalized
      mutated = true
    }
  } catch {}
  if (!opts?.skipDispatch) {
    try {
      const ev = new CustomEvent('perkasa:ui:themechange', {
        bubbles: true,
        cancelable: true,
        detail: { theme: normalized },
      })
      window.dispatchEvent(ev)
    } catch {}
  }
  return normalized
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme: UiTheme
}) {
  const normalizedInitial = normalizeUiTheme(initialTheme)
  const [theme, setThemeState] = useState<UiTheme>(normalizedInitial)

  const setTheme = useCallback((nextTheme: UiTheme | string) => {
    const normalized = normalizeUiTheme(nextTheme)
    if (typeof window !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme') as UiTheme | null
      if (docTheme === normalized) return
      writeThemePersistence(normalized)
    }
    setThemeState((prev) => (prev === normalized ? prev : normalized))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let target: UiTheme = normalizedInitial
    try {
      const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
      if (stored) {
        const n = normalizeUiTheme(stored)
        if (n) target = n
      }
    } catch {}
    try {
      const cks = (`; ${document.cookie}`).split(`; ${UI_THEME_COOKIE_KEY}=`)
      if (cks.length === 2) {
        const raw = cks.pop()?.split(';').shift() ?? ''
        if (raw) {
          const n = normalizeUiTheme(raw)
          if (n) target = n
        }
      }
    } catch {}
    try {
      const docAttr = (document.documentElement.getAttribute('data-theme') ?? '').trim().toLowerCase()
      if (docAttr === 'light' || docAttr === 'dark') {
        target = docAttr
      }
    } catch {}
    const finalTarget = writeThemePersistence(target, { skipDispatch: true }) || target
    if (finalTarget !== theme) setThemeState(finalTarget)

    // Global window function (bisa dipanggil dari mana saja tanpa context)
    window.__perkasa_setTheme = (t) => setTheme(t)

    const listener = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent<{ theme: UiTheme }>).detail
        if (!detail || !detail.theme) return
        const incoming = normalizeUiTheme(detail.theme)
        const current = document.documentElement.getAttribute('data-theme') as UiTheme | null
        if (current === incoming) return
        setThemeState((prev) => (prev === incoming ? prev : incoming))
        writeThemePersistence(incoming, { skipDispatch: true })
      } catch {}
    }
    window.addEventListener('perkasa:ui:themechange', listener as EventListener)
    return () => {
      window.removeEventListener('perkasa:ui:themechange', listener as EventListener)
      if (window.__perkasa_setTheme) delete window.__perkasa_setTheme
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const docTheme = document.documentElement.getAttribute('data-theme') as UiTheme | null
    if (docTheme === theme) return
    writeThemePersistence(theme, { skipDispatch: true })
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>
}

export function useUiTheme() {
  const context = useContext(UiThemeContext)
  if (!context) {
    throw new Error('useUiTheme must be used within ThemeProvider')
  }
  return context
}

export function dispatchThemeChange(theme: UiTheme | string): UiTheme {
  const normalized = normalizeUiTheme(theme)
  if (typeof window !== 'undefined') {
    const docTheme = document.documentElement.getAttribute('data-theme') as UiTheme | null
    if (docTheme === normalized) return normalized
    if (window.__perkasa_setTheme) {
      try {
        window.__perkasa_setTheme(normalized)
        return normalized
      } catch {}
    }
    writeThemePersistence(normalized)
  }
  return normalized
}
