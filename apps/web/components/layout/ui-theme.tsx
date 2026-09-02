'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  normalizeUiTheme,
  resolveEffectiveTheme,
  UI_THEME_COOKIE_KEY,
  UI_THEME_STORAGE_KEY,
  UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY,
  type UiTheme,
} from '@/lib/ui-theme'

type UiThemeContextValue = {
  theme: UiTheme
  resolvedTheme: 'light' | 'dark'
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

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`
  } catch {
    // ignore unavailable cookies
  }
}

function applyEffectiveTheme(effective: 'light' | 'dark') {
  try {
    const docEl = document.documentElement
    if (docEl.getAttribute('data-theme') !== effective) {
      docEl.setAttribute('data-theme', effective)
    }
    if ((docEl.style.colorScheme || '') !== effective) {
      docEl.style.colorScheme = effective
    }
  } catch {
    // ignore DOM access errors
  }
}

function writeThemePersistence(theme: UiTheme, opts?: { skipDispatch?: boolean }) {
  if (typeof window === 'undefined') return { normalized: theme, effective: resolveEffectiveTheme(theme, false) }
  const normalized = normalizeUiTheme(theme)
  try { window.localStorage.setItem(UI_THEME_STORAGE_KEY, normalized) } catch {}
  writeCookie(UI_THEME_COOKIE_KEY, normalized)

  const mediaDark = (() => {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    } catch {
      return false
    }
  })()
  const effective = resolveEffectiveTheme(normalized, mediaDark)
  writeCookie(UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY, effective)
  applyEffectiveTheme(effective)

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
  return { normalized, effective }
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
  const [resolvedTheme, setResolvedThemeState] = useState<'light' | 'dark'>(
    resolveEffectiveTheme(normalizedInitial, false),
  )

  const setTheme = useCallback((nextTheme: UiTheme | string) => {
    const normalized = normalizeUiTheme(nextTheme)
    const mediaDark = (() => {
      if (typeof window === 'undefined') return false
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      } catch {
        return false
      }
    })()
    const nextEffective = resolveEffectiveTheme(normalized, mediaDark)
    if (typeof window !== 'undefined') {
      const docEffective = document.documentElement.getAttribute('data-theme')
      if (docEffective === nextEffective && theme === normalized) return
      const result = writeThemePersistence(normalized)
      if (result.effective !== resolvedTheme) setResolvedThemeState(result.effective)
    } else if (nextEffective !== resolvedTheme) {
      setResolvedThemeState(nextEffective)
    }
    setThemeState((prev) => (prev === normalized ? prev : normalized))
  }, [theme, resolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const readPrefersDark = () => {
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      } catch {
        return false
      }
    }

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

    const prefersDark = readPrefersDark()
    const { normalized, effective } = writeThemePersistence(target, { skipDispatch: true })
    setThemeState((prev) => (prev === normalized ? prev : normalized))
    setResolvedThemeState((prev) => (prev === effective ? prev : effective))

    window.__perkasa_setTheme = (t) => setTheme(t)

    const mediaListener = () => {
      setThemeState((current) => {
        if (normalizeUiTheme(current) !== 'system') return current
        const dark = readPrefersDark()
        const nextEffective = dark ? 'dark' : 'light'
        writeCookie(UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY, nextEffective)
        applyEffectiveTheme(nextEffective)
        setResolvedThemeState((prev) => (prev === nextEffective ? prev : nextEffective))
        return current
      })
    }
    let mql: MediaQueryList | null = null
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', mediaListener)
      } else if (typeof mql.addListener === 'function') {
        mql.addListener(mediaListener)
      }
    } catch {}

    const listener = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent<{ theme: UiTheme }>).detail
        if (!detail || !detail.theme) return
        const incoming = normalizeUiTheme(detail.theme)
        const dark = readPrefersDark()
        const nextEffective = resolveEffectiveTheme(incoming, dark)
        writeCookie(UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY, nextEffective)
        applyEffectiveTheme(nextEffective)
        setThemeState((prev) => (prev === incoming ? prev : incoming))
        setResolvedThemeState((prev) => (prev === nextEffective ? prev : nextEffective))
      } catch {}
    }
    window.addEventListener('perkasa:ui:themechange', listener as EventListener)
    return () => {
      window.removeEventListener('perkasa:ui:themechange', listener as EventListener)
      if (window.__perkasa_setTheme) delete window.__perkasa_setTheme
      try {
        if (mql && typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', mediaListener)
        } else if (mql && typeof mql.removeListener === 'function') {
          mql.removeListener(mediaListener)
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersDark = (() => {
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      } catch {
        return false
      }
    })()
    const expectedEffective = resolveEffectiveTheme(theme, prefersDark)
    if (expectedEffective === resolvedTheme) return
    writeCookie(UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY, expectedEffective)
    applyEffectiveTheme(expectedEffective)
    setResolvedThemeState(expectedEffective)
  }, [theme, resolvedTheme])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])
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
