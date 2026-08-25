import { NextResponse } from 'next/server'
import { getDefaultLandingPath } from '@/lib/access-control-server'
import { applySessionCookie } from '@/lib/auth'
import { authenticateUser } from '@/lib/auth-session'
import { buildRequestUrl } from '@/lib/request-url'

export async function POST(request: Request) {
  const formData = await request.formData()
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')
  const authResult = await authenticateUser(username, password)
  const session = authResult.session

  if (!session) {
    let errorCode = authResult.reason === 'unavailable' ? 'auth_unavailable' : 'invalid_credentials'
    if (authResult.reason === 'unavailable') {
      const authSecretEmpty = !process.env.AUTH_SESSION_SECRET?.trim()
      const dbUrlEmpty = !process.env.DATABASE_URL?.trim()
      if (authSecretEmpty || dbUrlEmpty) {
        errorCode = 'auth_config_missing'
      }
    }
    return NextResponse.redirect(buildRequestUrl(request, `/login?error=${errorCode}`))
  }

  const response = NextResponse.redirect(buildRequestUrl(request, getDefaultLandingPath(session.role)))
  const sessionApplied = applySessionCookie(response, session)
  if (!sessionApplied) {
    return NextResponse.redirect(buildRequestUrl(request, '/login?error=auth_config_missing'))
  }

  return response
}
