import { cookies } from 'next/headers'
import { normalizeUiLanguage, UI_LANGUAGE_COOKIE_KEY } from '@/lib/ui-language'

function isMissingRequestScopeError(error: unknown) {
  return error instanceof Error && /outside a request scope/i.test(error.message)
}

export async function getServerUiLanguage() {
  try {
    const cookieStore = await cookies()
    return normalizeUiLanguage(cookieStore.get(UI_LANGUAGE_COOKIE_KEY)?.value)
  } catch (error) {
    // Service/test paths may run without Next request context; default to Indonesian.
    if (isMissingRequestScopeError(error)) {
      return normalizeUiLanguage(undefined)
    }

    throw error
  }
}
