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

function applyThemeDom(theme: UiTheme) {
  if (typeof document === 'undefined' || !document.documentElement) return
  try {
    const docEl = document.documentElement
    if (docEl.getAttribute('data-theme') !== theme) {
      docEl.setAttribute('data-theme', theme)
    }
    if (docEl.style.colorScheme !== theme) {
      docEl.style.colorScheme = theme
    }
  } catch {
    /* ignore DOM access errors */
  }
}

function readStoredTheme(defaultValue: UiTheme): UiTheme {
  if (typeof window === 'undefined') return defaultValue
  try {
    const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
    if (stored) {
      return normalizeUiTheme(stored)
    }
  } catch {
    /* ignore storage read errors */
  }
  try {
    const cks = (`; ${document.cookie}`).split(`; ${UI_THEME_COOKIE_KEY}=`)
    if (cks.length === 2) {
      const raw = cks.pop()?.split(';').shift() ?? ''
      if (raw) return normalizeUiTheme(raw)
    }
  } catch {
    /* ignore cookie read errors */
  }
  return defaultValue
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
  const userInteractedRef = useRef(false)
  const mountedRef = useRef(false)

  const persistTheme = useCallback((nextTheme: UiTheme) => {
    const normalized = normalizeUiTheme(nextTheme)
    try {
      window.localStorage.setItem(UI_THEME_STORAGE_KEY, normalized)
    } catch {
      /* ignore storage write errors */
    }
    try {
      document.cookie = `${UI_THEME_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
    } catch {
      /* ignore cookie write errors */
    }
    applyThemeDom(normalized)
  }, [])

  const setTheme = useCallback((nextTheme: UiTheme) => {
    const normalized = normalizeUiTheme(nextTheme)
    userInteractedRef.current = true
    setThemeState((prev) => {
      if (prev === normalized) return prev
      return normalized
    })
    persistTheme(normalized)
  }, [persistTheme])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      if (userInteractedRef.current) return
      const fromStorage = readStoredTheme(normalizedInitial)
      if (fromStorage !== normalizedInitial) {
        setThemeState(fromStorage)
        applyThemeDom(fromStorage)
      } else {
        applyThemeDom(fromStorage)
      }
      return
    }
    applyThemeDom(theme)
  }, [theme, normalizedInitial])

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
