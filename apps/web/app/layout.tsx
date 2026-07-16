import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { getServerUiTheme } from '@/lib/ui-theme-server'

const FONT_STACK_BODY =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
const FONT_STACK_HEADING =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"

export const metadata: Metadata = {
  title: 'Perkasa ERP OSS BSS',
  description: 'Satu website operasional ISP untuk sales, support, inventory, HR, dan billing.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const initialTheme = await getServerUiTheme()

  return (
    <html lang="id" data-theme={initialTheme} suppressHydrationWarning>
      <body
        style={
          {
            ['--font-body']: FONT_STACK_BODY,
            ['--font-heading']: FONT_STACK_HEADING,
          } as Record<string, string>
        }
        className="font-[family-name:var(--font-body)] antialiased"
      >
        {children}
      </body>
    </html>
  )
}
