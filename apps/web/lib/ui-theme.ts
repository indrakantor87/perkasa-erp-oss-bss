export type UiTheme = 'light' | 'dark'

export const UI_THEME_STORAGE_KEY = 'perkasa.ui-theme'
export const UI_THEME_COOKIE_KEY = 'perkasa-ui-theme'

export function normalizeUiTheme(value: string | undefined | null): UiTheme {
  return value === 'dark' ? 'dark' : 'light'
}
