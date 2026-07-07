'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import type { AppSession } from '@/lib/auth-session'

export function AppShell({
  children,
  session,
  allowedPrefixes,
}: {
  children: ReactNode
  session: AppSession | null
  allowedPrefixes: string[]
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar session={session} allowedPrefixes={allowedPrefixes} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Topbar pathname={pathname} session={session} allowedPrefixes={allowedPrefixes} />
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
