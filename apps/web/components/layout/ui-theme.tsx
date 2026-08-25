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

const UiThemeContext = createContext<UiThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme: UiTheme
}) {
  const normalizedInitial = normalizeUiTheme(initialTheme)
  const [theme, setThemeState] = useState<UiTheme>(normalizedInitial)

  const setTheme = useCallback((nextTheme: UiTheme) => {
    const normalized = normalizeUiTheme(nextTheme)
    setThemeState(normalized)
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(UI_THEME_STORAGE_KEY, normalized) } catch {}
    try {
      document.cookie = `${UI_THEME_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
    } catch {}
    try {
      const docEl = document.documentElement
      docEl.setAttribute('data-theme', normalized)
      docEl.style.colorScheme = normalized
    } catch {}
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
      const docEl = document.documentElement
      const docAttr = (docEl.getAttribute('data-theme') ?? '').trim().toLowerCase()
      if (docAttr === 'light' || docAttr === 'dark') {
        target = docAttr
      }
    } catch {}
    if (target !== theme) setThemeState(target)
    try {
      const docEl = document.documentElement
      docEl.setAttribute('data-theme', target)
      docEl.style.colorScheme = target
    } catch {}
    try { window.localStorage.setItem(UI_THEME_STORAGE_KEY, target) } catch {}
    try {
      document.cookie = `${UI_THEME_COOKIE_KEY}=${target}; path=/; max-age=31536000; samesite=lax`
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const docEl = document.documentElement
      docEl.setAttribute('data-theme', theme)
      docEl.style.colorScheme = theme
    } catch {}
    try { window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme) } catch {}
    try {
      document.cookie = `${UI_THEME_COOKIE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
    } catch {}
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
