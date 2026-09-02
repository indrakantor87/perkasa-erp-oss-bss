import { cookies, headers } from 'next/headers'
import {
  normalizeUiTheme,
  resolveEffectiveTheme,
  UI_THEME_COOKIE_KEY,
  UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY,
} from '@/lib/ui-theme'

export async function getServerUiTheme(): Promise<'light' | 'dark'> {
  const cookieStore = await cookies()
  const cookieRaw = cookieStore.get(UI_THEME_COOKIE_KEY)?.value
  const normalized = normalizeUiTheme(cookieRaw)
  if (normalized !== 'system') return normalized

  const resolvedCookie = cookieStore.get(UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY)?.value
  if (resolvedCookie === 'light' || resolvedCookie === 'dark') return resolvedCookie

  try {
    const headerStore = await headers()
    const prefersColorScheme = String(headerStore.get('sec-ch-prefers-color-scheme') ?? '').toLowerCase()
    return resolveEffectiveTheme('system', prefersColorScheme.includes('dark'))
  } catch {
    return 'light'
  }
}
