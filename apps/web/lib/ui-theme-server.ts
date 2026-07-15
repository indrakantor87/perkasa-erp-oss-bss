import { cookies } from 'next/headers'
import { normalizeUiTheme } from '@/lib/ui-theme'

export async function getServerUiTheme() {
  const cookieStore = await cookies()
  return normalizeUiTheme(cookieStore.get('perkasa-ui-theme')?.value)
}
