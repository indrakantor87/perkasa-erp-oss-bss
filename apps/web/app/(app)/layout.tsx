import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getAllowedPrefixes } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'
import { getServerUiLanguage } from '@/lib/ui-language-server'
import { getServerUiTheme } from '@/lib/ui-theme-server'

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await getSession()
  const initialLanguage = await getServerUiLanguage()
  const initialTheme = await getServerUiTheme()
  const allowedPrefixes = getAllowedPrefixes(session?.role ?? 'TT_OPERATOR')
  return (
    <AppShell
      session={session}
      allowedPrefixes={allowedPrefixes}
      initialLanguage={initialLanguage}
      initialTheme={initialTheme}
    >
      {children}
    </AppShell>
  )
}
