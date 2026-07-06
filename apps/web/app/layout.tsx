import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'
import type { ReactNode } from 'react'
import { ShellBoundary } from '@/components/layout/shell-boundary'
import { getSession } from '@/lib/auth'
import './globals.css'

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

const headingFont = Sora({
  subsets: ['latin'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  title: 'Perkasa ERP OSS BSS',
  description: 'Satu website operasional ISP untuk sales, support, inventory, HR, dan billing.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await getSession()

  return (
    <html lang="id">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        <ShellBoundary session={session}>{children}</ShellBoundary>
      </body>
    </html>
  )
}
