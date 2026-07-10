import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'
import { buildRequestUrl } from '@/lib/request-url'

export async function POST(request: Request) {
  const response = NextResponse.redirect(buildRequestUrl(request, '/login'))
  clearSessionCookie(response)

  return response
}
