'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AppSession } from '@/lib/auth-session'
import { navigationItems } from '@/lib/navigation'

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function Sidebar({
  session,
  allowedPrefixes,
}: {
  session: AppSession | null
  allowedPrefixes: string[]
}) {
  const pathname = usePathname()
  const items = navigationItems.filter((item) =>
    allowedPrefixes.some((prefix) => matchesPrefix(item.href, prefix))
  )

  return (
    <>
      <aside className="hidden w-80 flex-col border-r border-slate-800 bg-slate-950 px-6 py-8 text-slate-100 lg:flex">
        <Link href="/dashboard" className="space-y-3">
          <span className="badge border-slate-700 text-slate-300">Perkasa Platform</span>
          <div>
            <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
              ERP OSS BSS
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Satu website operasional untuk migrasi data, kontrol divisi, dan modul bisnis ISP.
            </p>
          </div>
        </Link>

        <nav className="mt-10 space-y-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl border px-4 py-4 transition ${
                  active
                    ? 'border-slate-600 bg-slate-900 shadow-lg'
                    : 'border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`rounded-xl p-2 ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs leading-5 text-slate-400">{item.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Review DB
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Bootstrap ini disiapkan untuk membaca schema review MySQL XAMPP terlebih dulu, lalu
            dipindah ke production setelah struktur valid.
          </p>
        </div>
      </aside>

      <nav className="sticky top-0 z-30 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.title}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
