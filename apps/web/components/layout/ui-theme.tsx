'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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
  const [theme, setTheme] = useState<UiTheme>(initialTheme)

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
    if (!stored) {
      document.documentElement.dataset.theme = initialTheme
      document.documentElement.style.colorScheme = initialTheme
      return
    }

    const normalized = normalizeUiTheme(stored)
    if (normalized !== theme) {
      setTheme(normalized)
    }
  }, [initialTheme])

  useEffect(() => {
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme)
    document.cookie = `${UI_THEME_COOKIE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>
}

export function useUiTheme() {
  const context = useContext(UiThemeContext)
  if (!context) {
    throw new Error('useUiTheme must be used within ThemeProvider')
  }
  return context
}
