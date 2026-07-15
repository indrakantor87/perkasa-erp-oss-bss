import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function shouldSuppressViteNoise(pathname: string) {
  return (
    pathname.startsWith('/@vite/') ||
    pathname.startsWith('/@react-refresh/') ||
    pathname === '/__vite_ping' ||
    pathname.startsWith('/__vite_ping/')
  )
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (shouldSuppressViteNoise(pathname)) {
    return new NextResponse(null, { status: 204 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/@vite/:path*', '/@react-refresh/:path*', '/__vite_ping', '/__vite_ping/:path*'],
}

