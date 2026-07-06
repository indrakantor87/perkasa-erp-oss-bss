import { NextResponse } from 'next/server'
import { getDefaultLandingPath } from '@/lib/access-control'
import { applySessionCookie } from '@/lib/auth'
import { authenticateUser } from '@/lib/auth-session'

export async function POST(request: Request) {
  const formData = await request.formData()
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')
  const authResult = await authenticateUser(username, password)
  const session = authResult.session

  if (!session) {
    return NextResponse.redirect(new URL('/login?error=invalid_credentials', request.url))
  }

  const response = NextResponse.redirect(new URL(getDefaultLandingPath(session.role), request.url))
  applySessionCookie(response, session)

  return response
}
