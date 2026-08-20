import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import './globals.css'
import { getServerUiTheme } from '@/lib/ui-theme-server'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: true,
  preload: true,
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
  ],
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-plus-jakarta',
  adjustFontFallback: true,
  preload: true,
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
  ],
})

const FONT_STACK_BODY =
  "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
const FONT_STACK_HEADING =
  "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      : new URL('http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  title: {
    default: 'Perkasa ERP OSS BSS',
    template: '%s | Perkasa ERP OSS BSS',
  },
  description: 'Satu website operasional ISP untuk sales, support, inventory, HR, dan billing.',
  applicationName: 'Perkasa ERP OSS BSS',
  keywords: [
    'Perkasa ERP',
    'ISP OSS BSS',
    'Perkasa Networks',
    'PSB Pelanggan Baru',
    'Aktivasi Radius',
    'Inventory ONT',
    'Billing ISP',
    'HR Payroll',
  ],
  authors: [{ name: 'Perkasa Networks', url: 'https://perkasa.net' }],
  creator: 'Perkasa Networks',
  publisher: 'Perkasa Networks',
  category: 'business',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: metadataBaseUrl.href,
    siteName: 'Perkasa ERP OSS BSS',
    title: 'Perkasa ERP OSS BSS',
    description:
      'Satu website operasional ISP untuk sales, support, inventory, HR, dan billing.',
    emails: ['support@perkasa.net'],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Perkasa ERP OSS BSS',
    description:
      'Satu website operasional ISP untuk sales, support, inventory, HR, dan billing.',
    creator: '@perkasanet',
  },

  appleWebApp: {
    capable: true,
    title: 'Perkasa ERP OSS BSS',
    statusBarStyle: 'default',
  },

  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }],
    apple: [{ url: '/favicon.ico', sizes: '180x180' }],
  },

  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-image-preview': 'none',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark',
}

const PRECONNECT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://nominatim.openstreetmap.org',
  'https://cdn.jsdelivr.net',
]

function LoadingSkeleton() {
  return (
    <div className="min-h-[70vh] w-full animate-pulse flex flex-col gap-6 p-6">
      <div className="h-12 w-1/3 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>
      <div className="h-96 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
    </div>
  )
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
      <head>
        {PRECONNECT_ORIGINS.map((origin) => (
          <link key={`preconnect-${origin}`} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
        {PRECONNECT_ORIGINS.map((origin) => (
          <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
        ))}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var keyLs='perkasa.ui-theme';
  var keyCk='perkasa-ui-theme';
  var pref='';
  try{
    pref=window.localStorage.getItem(keyLs)||'';
  }catch(e){pref='';}
  if(!pref){
    try{
      var cks=('; '+document.cookie).split('; '+keyCk+'=');
      if(cks.length===2){pref=cks.pop().split(';').shift()||'';}
    }catch(e){pref='';}
  }
  pref=(pref||'').trim().toLowerCase();
  if(pref!=='light'&&pref!=='dark'){pref='';}
  if(!pref){
    try{
      if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){pref='dark';}
      else{pref='light';}
    }catch(e){pref='light';}
  }
  var el=document.documentElement;
  if(el.getAttribute('data-theme')!==pref){el.setAttribute('data-theme',pref);}
  el.style.colorScheme=pref;
}catch(e){try{document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}catch(e2){}}})();`
          }}
        />
      </head>
      <body
        style={
          {
            ['--font-body']: FONT_STACK_BODY,
            ['--font-heading']: FONT_STACK_HEADING,
          } as Record<string, string>
        }
        className="font-[family-name:var(--font-body)] antialiased min-h-screen bg-surface text-ink selection:bg-accent/20"
      >
        <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
      </body>
    </html>
  )
}
