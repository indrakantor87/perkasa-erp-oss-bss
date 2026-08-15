import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { getServerUiTheme } from '@/lib/ui-theme-server'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
})

const FONT_STACK_BODY =
  "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
const FONT_STACK_HEADING =
  "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"

export const metadata: Metadata = {
  title: 'Perkasa ERP OSS BSS',
  description: 'Satu website operasional ISP untuk sales, support, inventory, HR, dan billing.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const initialTheme = await getServerUiTheme()

  return (
    <html
      lang="id"
      data-theme={initialTheme}
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable}`}
    >
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
