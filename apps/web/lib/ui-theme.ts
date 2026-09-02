export type UiTheme = 'light' | 'dark' | 'system'

export const UI_THEME_STORAGE_KEY = 'perkasa.ui-theme'
export const UI_THEME_COOKIE_KEY = 'perkasa-ui-theme'
export const UI_THEME_SYSTEM_RESOLVED_COOKIE_KEY = 'perkasa-ui-theme-system-resolved'

export function normalizeUiTheme(value: string | undefined | null): UiTheme {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw
  return 'system'
}

export function resolveEffectiveTheme(
  theme: UiTheme | string | undefined | null,
  prefersDark: boolean,
): 'light' | 'dark' {
  const normalized = normalizeUiTheme(theme)
  if (normalized === 'system') return prefersDark ? 'dark' : 'light'
  return normalized
}
