import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getAllowedPrefixes } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await getSession()
  const allowedPrefixes = getAllowedPrefixes(session?.role ?? 'OPERATOR')
  return (
    <AppShell session={session} allowedPrefixes={allowedPrefixes}>
      {children}
    </AppShell>
  )
}
