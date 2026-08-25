'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  normalizeUiLanguage,
  UI_LANGUAGE_COOKIE_KEY,
  UI_LANGUAGE_STORAGE_KEY,
  type UiLanguage,
} from '@/lib/ui-language'

type UiLanguageContextValue = {
  language: UiLanguage
  setLanguage: (language: UiLanguage) => void
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null)

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode
  initialLanguage: UiLanguage
}) {
  const normalizedInitial = normalizeUiLanguage(initialLanguage)
  const [language, setLanguageState] = useState<UiLanguage>(normalizedInitial)

  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    const normalized = normalizeUiLanguage(nextLanguage)
    setLanguageState(normalized)
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalized) } catch {}
    try {
      document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
    } catch {}
    try {
      document.documentElement.lang = normalized
    } catch {}
    try { window.location.reload() } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let target: UiLanguage = normalizedInitial
    try {
      const stored = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)
      if (stored) {
        const n = normalizeUiLanguage(stored)
        if (n) target = n
      }
    } catch {}
    try {
      const cks = (`; ${document.cookie}`).split(`; ${UI_LANGUAGE_COOKIE_KEY}=`)
      if (cks.length === 2) {
        const raw = cks.pop()?.split(';').shift() ?? ''
        if (raw) {
          const n = normalizeUiLanguage(raw)
          if (n) target = n
        }
      }
    } catch {}
    try {
      const docAttr = (document.documentElement.getAttribute('lang') ?? '').trim().toLowerCase()
      if (docAttr === 'id' || docAttr === 'en') {
        target = docAttr
      }
    } catch {}
    if (target !== language) setLanguageState(target)
    try {
      document.documentElement.lang = target
    } catch {}
    try { window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, target) } catch {}
    try {
      document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${target}; path=/; max-age=31536000; samesite=lax`
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      document.documentElement.lang = language
    } catch {}
    try { window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language) } catch {}
    try {
      document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`
    } catch {}
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext)
  if (!context) {
    throw new Error('useUiLanguage must be used within LanguageProvider')
  }
  return context
}
