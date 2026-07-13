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
    const errorCode = authResult.reason === 'unavailable' ? 'auth_unavailable' : 'invalid_credentials'
    return NextResponse.redirect(buildRequestUrl(request, `/login?error=${errorCode}`))
  }

  const response = NextResponse.redirect(buildRequestUrl(request, getDefaultLandingPath(session.role)))
  applySessionCookie(response, session)

  return response
}
