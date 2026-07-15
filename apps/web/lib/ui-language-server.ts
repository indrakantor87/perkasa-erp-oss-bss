import { cookies } from 'next/headers'
import { normalizeUiLanguage } from '@/lib/ui-language'

export async function getServerUiLanguage() {
  const cookieStore = await cookies()
  return normalizeUiLanguage(cookieStore.get('perkasa-ui-language')?.value)
}
