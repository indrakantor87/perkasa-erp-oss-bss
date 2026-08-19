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
  const [theme, setThemeState] = useState<UiTheme>(initialTheme)
  const userInteractedRef = useRef(false)
  const mountedRef = useRef(false)

  const setTheme = useCallback((nextTheme: UiTheme) => {
    const normalized = normalizeUiTheme(nextTheme)
    userInteractedRef.current = true
    setThemeState(normalized)
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
      document.documentElement.dataset.theme = normalized
      document.documentElement.style.colorScheme = normalized
    }
  }, [])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    if (userInteractedRef.current) return
    try {
      const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
      if (!stored) {
        if (document.documentElement) {
          if (!document.documentElement.dataset.theme) {
            document.documentElement.dataset.theme = initialTheme
          }
          if (!document.documentElement.style.colorScheme) {
            document.documentElement.style.colorScheme = initialTheme
          }
        }
        return
      }
      const normalized = normalizeUiTheme(stored)
      if (normalized !== initialTheme) {
        setThemeState(normalized)
        if (document.documentElement) {
          document.documentElement.dataset.theme = normalized
          document.documentElement.style.colorScheme = normalized
        }
      }
    } catch {
      /* ignore storage read errors */
      if (document.documentElement && !document.documentElement.dataset.theme) {
        document.documentElement.dataset.theme = initialTheme
        document.documentElement.style.colorScheme = initialTheme
      }
    }
  }, [initialTheme])

  useEffect(() => {
    if (!document.documentElement) return
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
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
