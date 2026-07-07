import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, parseSessionToken, type AppSession } from '@/lib/auth-session'
import { primeAccessControlCache } from '@/lib/access-control-server'

export const AUTH_COOKIE_NAME = 'perkasa_session'

function getCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
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
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(session), getCookieOptions())
}

export function clearSessionCookie(response: CookieWritableResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', getCookieOptions(0))
}
