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
  setLanguage: (language: UiLanguage | string) => void
}

declare global {
  interface Window {
    __perkasa_setLang?: (l: UiLanguage | string) => boolean
  }
  type PerkasaLangEventDetail = { language: UiLanguage }
  interface WindowEventMap {
    'perkasa:ui:langchange': CustomEvent<PerkasaLangEventDetail>
  }
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null)

function writeLanguagePersistence(
  language: UiLanguage,
  reloadPage = false,
  opts?: { skipDispatch?: boolean; reloadQueuedRef?: { current: boolean } },
) {
  if (typeof window === 'undefined') return { normalized: normalizeUiLanguage(language) }
  const normalized = normalizeUiLanguage(language)
  try { window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalized) } catch {}
  try {
    document.cookie = `${UI_LANGUAGE_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`
  } catch {}
  try {
    document.documentElement.lang = normalized
  } catch {}
  if (!opts?.skipDispatch) {
    try {
      const ev = new CustomEvent('perkasa:ui:langchange', {
        bubbles: true,
        cancelable: true,
        detail: { language: normalized },
      })
      window.dispatchEvent(ev)
    } catch {}
  }
  if (reloadPage) {
    try {
      if (opts?.reloadQueuedRef) {
        if (!opts.reloadQueuedRef.current) {
          opts.reloadQueuedRef.current = true
          window.setTimeout(() => {
            opts.reloadQueuedRef && (opts.reloadQueuedRef.current = false)
            window.location.reload()
          }, 50)
        }
      } else {
        window.setTimeout(() => window.location.reload(), 50)
      }
    } catch {}
  }
  return { normalized }
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

  const _internalLangDispatchInFlight = useRef<boolean>(false)
  const _reloadQueued = useRef<boolean>(false)

  const setLanguage = useCallback((nextLanguage: UiLanguage | string) => {
    const normalized = normalizeUiLanguage(nextLanguage)
    if (typeof window !== 'undefined' && _internalLangDispatchInFlight.current) {
      return
    }
    if (typeof window !== 'undefined') {
      try {
        _internalLangDispatchInFlight.current = true
        writeLanguagePersistence(normalized, true, { reloadQueuedRef: _reloadQueued })
      } finally {
        _internalLangDispatchInFlight.current = false
      }
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
    const result = writeLanguagePersistence(target, false)
    const finalTarget = result.normalized
    if (finalTarget !== language) setLanguageState(finalTarget)

    // Global window function (bisa dipanggil tanpa context)
    window.__perkasa_setLang = (l) => {
      setLanguage(l)
      return true
    }

    const listener = (ev: Event) => {
      try {
        if (_internalLangDispatchInFlight.current) return
        const detail = (ev as CustomEvent<{ language: UiLanguage }>).detail
        if (detail && detail.language) {
          const normalized = normalizeUiLanguage(detail.language)
          setLanguageState((prev) => (prev === normalized ? prev : normalized))
        }
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
    writeLanguagePersistence(language, false, { skipDispatch: true })
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
        const handled = window.__perkasa_setLang(normalized)
        if (handled === true) {
          return normalized
        }
      } catch {}
    }
    writeLanguagePersistence(normalized, reloadPage)
  }
  return normalized
}
