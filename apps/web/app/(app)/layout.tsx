import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getSession } from '@/lib/auth'

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await getSession()
  return <AppShell session={session}>{children}</AppShell>
}

