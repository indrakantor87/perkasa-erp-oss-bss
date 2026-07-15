'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  normalizeUiLanguage,
  translateUiText,
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
  const [language, setLanguage] = useState<UiLanguage>(initialLanguage)

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)
    const normalized = normalizeUiLanguage(stored)
    if (normalized !== language) {
      setLanguage(normalized)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language)
    document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = language
    if (language !== initialLanguage) {
      router.refresh()
    }
  }, [initialLanguage, language, router])

  const value = useMemo(() => ({ language, setLanguage }), [language])

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext)
  if (!context) {
    throw new Error('useUiLanguage must be used within LanguageProvider')
  }
  return context
}
