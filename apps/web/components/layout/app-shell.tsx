'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { LanguageProvider } from '@/components/layout/ui-language'
import { ThemeProvider } from '@/components/layout/ui-theme'
import type { AppSession } from '@/lib/auth-session'
import type { UiLanguage } from '@/lib/ui-language'
import type { UiTheme } from '@/lib/ui-theme'

export function AppShell({
  children,
  session,
  allowedPrefixes,
  initialLanguage,
  initialTheme,
}: {
  children: ReactNode
  session: AppSession | null
  allowedPrefixes: string[]
  initialLanguage: UiLanguage
  initialTheme: UiTheme
}) {
  const pathname = usePathname()

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <LanguageProvider initialLanguage={initialLanguage}>
        <div className="min-h-screen lg:flex" suppressHydrationWarning>
          <Sidebar session={session} allowedPrefixes={allowedPrefixes} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
              <Topbar pathname={pathname} session={session} allowedPrefixes={allowedPrefixes} />
              <div className="mt-10">{children}</div>
            </div>
          </main>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
