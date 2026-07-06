'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import type { AppSession } from '@/lib/auth-session'

export function ShellBoundary({
  children,
  session,
}: {
  children: ReactNode
  session: AppSession | null
}) {
  const pathname = usePathname()

  if (pathname.startsWith('/login')) {
    return <>{children}</>
  }

  return <AppShell session={session}>{children}</AppShell>
}
