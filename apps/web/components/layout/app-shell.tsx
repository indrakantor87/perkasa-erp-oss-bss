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
        <div className="min-h-screen bg-bg text-ink lg:flex" suppressHydrationWarning>
          <Sidebar session={session} allowedPrefixes={allowedPrefixes} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-7xl px-compact py-compact sm:px-comfort sm:py-comfort lg:px-section lg:py-section xl:max-w-none xl:px-[2.5rem] xl:py-[2rem]">
              <Topbar pathname={pathname} session={session} allowedPrefixes={allowedPrefixes} />
              <div className="mt-4 sm:mt-5 lg:mt-6 xl:mt-8 content-fade-in">
                {children}
              </div>
            </div>
          </main>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
