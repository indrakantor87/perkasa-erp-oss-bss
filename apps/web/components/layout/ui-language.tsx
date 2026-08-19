'use client'

import { useRouter } from 'next/navigation'
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

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode
  initialLanguage: UiLanguage
}) {
  const router = useRouter()
  const [language, setLanguageState] = useState<UiLanguage>(initialLanguage)
  const userInteractedRef = useRef(false)
  const mountedRef = useRef(false)

  const persistLanguage = useCallback((nextLanguage: UiLanguage) => {
    try {
      window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage)
    } catch {
      /* ignore storage errors */
    }
    try {
      document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`
    } catch {
      /* ignore cookie write errors */
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = nextLanguage
    }
  }, [])

  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    const normalized = normalizeUiLanguage(nextLanguage)
    userInteractedRef.current = true
    setLanguageState((prev) => {
      if (prev === normalized) return prev
      persistLanguage(normalized)
      void router.refresh()
      return normalized
    })
  }, [persistLanguage, router])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    if (userInteractedRef.current) return
    try {
      const stored = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)
      if (!stored) {
        if (document.documentElement && !document.documentElement.lang) {
          document.documentElement.lang = initialLanguage
        }
        return
      }
      const normalized = normalizeUiLanguage(stored)
      if (normalized !== initialLanguage) {
        setLanguageState(normalized)
        persistLanguage(normalized)
      } else if (document.documentElement && !document.documentElement.lang) {
        document.documentElement.lang = initialLanguage
      }
    } catch {
      /* ignore storage read errors */
      if (document.documentElement && !document.documentElement.lang) {
        document.documentElement.lang = initialLanguage
      }
    }
  }, [initialLanguage, persistLanguage])

  useEffect(() => {
    if (typeof document === 'undefined' || !document.documentElement) return
    document.documentElement.lang = language
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
