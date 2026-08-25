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
  setLanguage: (language: UiLanguage | string) => void
}

declare global {
  interface Window {
    __perkasa_setLang?: (l: UiLanguage | string) => void
  }
  type PerkasaLangEventDetail = { language: UiLanguage }
  interface WindowEventMap {
    'perkasa:ui:langchange': CustomEvent<PerkasaLangEventDetail>
  }
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null)

function writeLanguagePersistence(language: UiLanguage, reloadPage = false) {
  if (typeof window === 'undefined') return
  const normalized = normalizeUiLanguage(language)
  try { window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalized) } catch {}
  try {
    document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
  } catch {}
  try {
    document.documentElement.lang = normalized
  } catch {}
  try {
    const ev = new CustomEvent('perkasa:ui:langchange', {
      bubbles: true,
      cancelable: true,
      detail: { language: normalized },
    })
    window.dispatchEvent(ev)
  } catch {}
  if (reloadPage) {
    try {
      window.setTimeout(() => window.location.reload(), 50)
    } catch {}
  }
  return normalized
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

  const setLanguage = useCallback((nextLanguage: UiLanguage | string) => {
    const normalized = normalizeUiLanguage(nextLanguage)
    if (typeof window !== 'undefined') {
      writeLanguagePersistence(normalized, true)
    }
    setLanguageState(normalized)
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
    const finalTarget = writeLanguagePersistence(target, false) || target
    if (finalTarget !== language) setLanguageState(finalTarget)

    // Global window function (bisa dipanggil tanpa context)
    window.__perkasa_setLang = (l) => setLanguage(l)

    const listener = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent<{ language: UiLanguage }>).detail
        if (detail && detail.language) setLanguage(detail.language)
      } catch {}
    }
    window.addEventListener('perkasa:ui:langchange', listener as EventListener)
    return () => {
      window.removeEventListener('perkasa:ui:langchange', listener as EventListener)
      if (window.__perkasa_setLang) delete window.__perkasa_setLang
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    writeLanguagePersistence(language, false)
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

export function dispatchLanguageChange(language: UiLanguage | string, reloadPage = true): UiLanguage {
  const normalized = normalizeUiLanguage(language)
  if (typeof window !== 'undefined') {
    if (window.__perkasa_setLang) {
      try {
        window.__perkasa_setLang(normalized)
        return normalized
      } catch {}
    }
    writeLanguagePersistence(normalized, reloadPage)
    try {
      const ev = new CustomEvent('perkasa:ui:langchange', {
        bubbles: true,
        cancelable: true,
        detail: { language: normalized },
      })
      window.dispatchEvent(ev)
    } catch {}
  }
  return normalized
}
