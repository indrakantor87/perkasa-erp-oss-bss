'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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

function applyLanguageDom(language: UiLanguage) {
  if (typeof document === 'undefined' || !document.documentElement) return
  try {
    const docEl = document.documentElement
    if (docEl.getAttribute('lang') !== language) {
      docEl.setAttribute('lang', language)
    }
  } catch {
    /* ignore DOM access errors */
  }
}

function readStoredLanguage(defaultValue: UiLanguage): UiLanguage {
  if (typeof window === 'undefined') return defaultValue
  try {
    const stored = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)
    if (stored) {
      return normalizeUiLanguage(stored)
    }
  } catch {
    /* ignore storage read errors */
  }
  try {
    const cks = (`; ${document.cookie}`).split(`; ${UI_LANGUAGE_COOKIE_KEY}=`)
    if (cks.length === 2) {
      const raw = cks.pop()?.split(';').shift() ?? ''
      if (raw) return normalizeUiLanguage(raw)
    }
  } catch {
    /* ignore cookie read errors */
  }
  return defaultValue
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode
  initialLanguage: UiLanguage
}) {
  const normalizedInitial = normalizeUiLanguage(initialLanguage)
  const [language, setLanguageState] = useState<UiLanguage>(normalizedInitial)
  const userInteractedRef = useRef(false)
  const mountedRef = useRef(false)

  const persistLanguage = useCallback((nextLanguage: UiLanguage) => {
    const normalized = normalizeUiLanguage(nextLanguage)
    try {
      window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalized)
    } catch {
      /* ignore storage write errors */
    }
    try {
      document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
    } catch {
      /* ignore cookie write errors */
    }
    applyLanguageDom(normalized)
  }, [])

  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    const normalized = normalizeUiLanguage(nextLanguage)
    userInteractedRef.current = true
    setLanguageState((prev) => {
      if (prev === normalized) return prev
      return normalized
    })
    persistLanguage(normalized)
  }, [persistLanguage])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      if (userInteractedRef.current) return
      const fromStorage = readStoredLanguage(normalizedInitial)
      if (fromStorage !== normalizedInitial) {
        setLanguageState(fromStorage)
        applyLanguageDom(fromStorage)
      } else {
        applyLanguageDom(fromStorage)
      }
      return
    }
    applyLanguageDom(language)
  }, [language, normalizedInitial])

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
