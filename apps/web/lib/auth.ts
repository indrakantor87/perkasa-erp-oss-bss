import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, parseSessionToken, type AppSession } from '@/lib/auth-session'
import { primeAccessControlCache } from '@/lib/access-control-server'

export const AUTH_COOKIE_NAME = 'perkasa_session'

function resolveSecureCookieSetting() {
  const override = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase()
  if (override === 'true' || override === '1' || override === 'yes' || override === 'on') {
    return true
  }
  if (override === 'false' || override === '0' || override === 'no' || override === 'off') {
    return false
  }

  return process.env.NODE_ENV === 'production'
}

function getCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: resolveSecureCookieSetting(),
    path: '/',
    maxAge,
  }
}

export async function getSession() {
  await primeAccessControlCache()
  const cookieStore = await cookies()
  return parseSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value)
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    redirect('/login?error=auth_required')
  }

  return session
}

type CookieWritableResponse = {
  cookies: {
    set: (name: string, value: string, options: ReturnType<typeof getCookieOptions>) => void
  }
}

export function applySessionCookie(response: CookieWritableResponse, session: AppSession) {
  const token = createSessionToken(session)
  if (!token) {
    return false
  }
  response.cookies.set(AUTH_COOKIE_NAME, token, getCookieOptions())
  return true
}

export function clearSessionCookie(response: CookieWritableResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', getCookieOptions(0))
}
