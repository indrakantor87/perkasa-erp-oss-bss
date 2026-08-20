'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  const [theme, setThemeState] = useState<UiTheme>(() => {
    if (typeof window === 'undefined') {
      return initialTheme
    }
    try {
      const docEl = document.documentElement
      const dataTheme = (docEl?.getAttribute('data-theme') ?? '').trim().toLowerCase()
      if (dataTheme === 'light' || dataTheme === 'dark') {
        try {
          if (docEl && docEl.style.colorScheme !== dataTheme) {
            docEl.style.colorScheme = dataTheme
          }
        } catch {
          /* ignore style errors */
        }
        return dataTheme
      }
      const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
      if (stored) {
        const normalized = normalizeUiTheme(stored)
        if (docEl && docEl.getAttribute('data-theme') !== normalized) {
          docEl.setAttribute('data-theme', normalized)
        }
        if (docEl && docEl.style.colorScheme !== normalized) {
          docEl.style.colorScheme = normalized
        }
        return normalized
      }
    } catch {
      /* ignore storage read errors */
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      if (!document.documentElement.getAttribute('data-theme')) {
        document.documentElement.setAttribute('data-theme', initialTheme)
      }
      if (!document.documentElement.style.colorScheme) {
        document.documentElement.style.colorScheme = initialTheme
      }
    }
    return initialTheme
  })
  const userInteractedRef = useRef(false)
  const mountedRef = useRef(false)

  const setTheme = useCallback((nextTheme: UiTheme) => {
    const normalized = normalizeUiTheme(nextTheme)
    userInteractedRef.current = true

    try {
      window.localStorage.setItem(UI_THEME_STORAGE_KEY, normalized)
    } catch {
      /* ignore storage errors (e.g. Safari private mode) */
    }
    try {
      document.cookie = `${UI_THEME_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
    } catch {
      /* ignore cookie write errors */
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', normalized)
      document.documentElement.style.colorScheme = normalized
    }

    setThemeState(normalized)
  }, [])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      if (userInteractedRef.current) return
    }
    try {
      const docEl = document.documentElement
      if (!docEl) return
      const current = docEl.getAttribute('data-theme')
      if (current !== theme) {
        docEl.setAttribute('data-theme', theme)
      }
      if (docEl.style.colorScheme !== theme) {
        docEl.style.colorScheme = theme
      }
    } catch {
      /* ignore dom access errors */
    }
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
