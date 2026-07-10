'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AppSession } from '@/lib/auth-session'
import { findNavigationItem, navigationItems } from '@/lib/navigation'
import { getRoleMeta } from '@/lib/role-meta'
import type { AppRole } from '@/lib/types'

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

const rolePreferredOrder: Partial<Record<AppRole, string[]>> = {
  SALES_MARKETING: ['/dashboard', '/sales', '/customers', '/support', '/billing', '/dashboard/daily-activity', '/import'],
  CS_OPERATOR: ['/dashboard', '/support', '/customers', '/inventory', '/billing', '/dashboard/daily-activity'],
  CS_ADMIN: ['/dashboard', '/support', '/customers', '/billing', '/inventory', '/dashboard/daily-activity'],
  NOC_OPERATOR: ['/dashboard', '/support', '/inventory', '/dashboard/daily-activity'],
  TT_OPERATOR: ['/dashboard', '/support', '/dashboard/daily-activity'],
  DIGITAL_CREATOR: ['/dashboard', '/sales', '/customers', '/dashboard/daily-activity'],
  FIELD_TECHNICIAN: ['/dashboard', '/inventory', '/support', '/dashboard/daily-activity'],
  DISMANTLE_OPERATOR: ['/dashboard', '/support', '/dashboard/daily-activity'],
}

function sortByPreferredOrder(params: { items: typeof navigationItems; role: AppRole | null }) {
  const order = params.role ? rolePreferredOrder[params.role] ?? [] : []
  const getRank = (href: string) => {
    const index = order.indexOf(href)
    return index >= 0 ? index : order.length + 10
  }

  return [...params.items].sort((left, right) => {
    const rankDiff = getRank(left.href) - getRank(right.href)
    if (rankDiff !== 0) return rankDiff
    return left.title.localeCompare(right.title)
  })
}

function SidebarSection({
  title,
  items,
  activeHref,
  collapsed,
  onNavigate,
}: {
  title: string
  items: typeof navigationItems
  activeHref: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  if (!items.length) return null

  return (
    <div className="space-y-2">
      {!collapsed ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p> : null}
      {items.map((item) => {
        const active = activeHref === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={item.title}
            className={`block rounded-2xl border transition ${
              collapsed ? 'px-3 py-3' : 'px-4 py-4'
            } ${
              active
                ? 'border-slate-600 bg-slate-900 shadow-lg'
                : 'border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className={`flex ${collapsed ? 'justify-center' : 'items-start gap-3'}`}>
              <span className={`rounded-xl p-2 ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              {!collapsed ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs leading-5 text-slate-400">{item.description}</p>
                </div>
              ) : null}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function Sidebar({
  session,
  allowedPrefixes,
}: {
  session: AppSession | null
  allowedPrefixes: string[]
}) {
  const pathname = usePathname()
  const roleMeta = session ? getRoleMeta(session.role) : null
  const allowedItems = navigationItems.filter((item) =>
    allowedPrefixes.some((prefix) => matchesPrefix(item.href, prefix))
  )
  const sortedItems = sortByPreferredOrder({ items: allowedItems, role: session?.role ?? null })
  const coreItems = sortedItems.filter((item) => !item.href.startsWith('/settings'))
  const settingsItems = sortedItems.filter((item) => item.href.startsWith('/settings'))
  const activeItem = findNavigationItem(pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('perkasa.sidebar.collapsed')
    if (stored === '1') {
      setCollapsed(true)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('perkasa.sidebar.collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const desktopWidthClass = collapsed ? 'w-24 px-3' : 'w-80 px-6'

  return (
    <>
      <aside className={`hidden flex-col border-r border-slate-800 bg-slate-950 py-8 text-slate-100 transition-all duration-200 lg:flex ${desktopWidthClass}`}>
        <div className={`flex ${collapsed ? 'justify-center' : 'items-start justify-between gap-4'}`}>
          <Link href="/dashboard" className={collapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'}>
            <span className="badge border-slate-700 text-slate-300">{collapsed ? 'PP' : 'Perkasa Platform'}</span>
            <div className={collapsed ? 'text-center' : ''}>
              <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
                {collapsed ? 'ERP' : 'ERP OSS BSS'}
              </p>
              {!collapsed ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Satu website operasional untuk migrasi data, kontrol divisi, dan modul bisnis ISP.
                </p>
              ) : null}
            </div>
          </Link>

          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
              aria-label="Minimalkan sidebar"
              title="Minimalkan sidebar"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                <span>{'<'}</span>
              </span>
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
              aria-label="Tampilkan sidebar"
              title="Tampilkan sidebar"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                <span>{'>'}</span>
              </span>
            </button>
          </div>
        ) : null}

        <nav className="mt-10 space-y-6">
          <SidebarSection title="Menu Utama" items={coreItems} activeHref={activeItem.href} collapsed={collapsed} />
          <SidebarSection title="Pengaturan" items={settingsItems} activeHref={activeItem.href} collapsed={collapsed} />
        </nav>

        <div className={`mt-auto rounded-2xl border border-slate-800 bg-slate-900 ${collapsed ? 'p-3' : 'p-5'}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 ${collapsed ? 'text-center' : ''}`}>
            {session ? 'Role Aktif' : 'Review DB'}
          </p>
          {session && roleMeta ? (
            <div className={`mt-3 ${collapsed ? 'space-y-2 text-center' : 'space-y-3'}`}>
              <span className={`badge border-transparent ${roleMeta.tone}`}>{collapsed ? roleMeta.shortLabel : roleMeta.label}</span>
              {!collapsed ? (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {roleMeta.division} / {roleMeta.subdivision}
                  </p>
                  <p className="text-sm leading-6 text-slate-300">{roleMeta.scope}</p>
                </>
              ) : null}
            </div>
          ) : !collapsed ? (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Bootstrap ini disiapkan untuk membaca schema review MySQL XAMPP terlebih dulu, lalu
              dipindah ke production setelah struktur valid.
            </p>
          ) : null}
        </div>
      </aside>

      <nav className="sticky top-0 z-30 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            aria-label="Tampilkan menu"
          >
            Menu
          </button>
          <div className="flex gap-3 overflow-x-auto pb-1">
          {coreItems.map((item) => {
            const active = activeItem.href === item.href

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
        </div>
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          />
          <aside className="relative flex h-full w-80 max-w-[88vw] flex-col border-r border-slate-800 bg-slate-950 px-6 py-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <Link href="/dashboard" className="space-y-3" onClick={() => setMobileOpen(false)}>
                <span className="badge border-slate-700 text-slate-300">Perkasa Platform</span>
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold">ERP OSS BSS</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Satu website operasional untuk migrasi data, kontrol divisi, dan modul bisnis ISP.
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300"
                aria-label="Tutup menu"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  x
                </span>
              </button>
            </div>

            <nav className="mt-8 space-y-6 overflow-y-auto pr-1">
              <SidebarSection
                title="Menu Utama"
                items={coreItems}
                activeHref={activeItem.href}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
              <SidebarSection
                title="Pengaturan"
                items={settingsItems}
                activeHref={activeItem.href}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>

            <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {session ? 'Role Aktif' : 'Review DB'}
              </p>
              {session && roleMeta ? (
                <div className="mt-3 space-y-3">
                  <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.label}</span>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {roleMeta.division} / {roleMeta.subdivision}
                  </p>
                  <p className="text-sm leading-6 text-slate-300">{roleMeta.scope}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Bootstrap ini disiapkan untuk membaca schema review MySQL XAMPP terlebih dulu, lalu
                  dipindah ke production setelah struktur valid.
                </p>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
