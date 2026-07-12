'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AppSession } from '@/lib/auth-session'
import { navigationItems } from '@/lib/navigation'
import { DASHBOARD_DIVISION_CLUSTERS } from '@/lib/dashboard-division-structure'
import { getRoleMeta } from '@/lib/role-meta'
import type { AppRole } from '@/lib/types'

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

const rolePreferredOrder: Partial<Record<AppRole, string[]>> = {
  SALES_MARKETING: ['/dashboard', '/dashboard/worklist', '/sales', '/customers', '/support', '/billing', '/dashboard/daily-activity', '/import'],
  CS_OPERATOR: ['/dashboard', '/dashboard/worklist', '/support', '/customers', '/inventory', '/billing', '/dashboard/daily-activity'],
  CS_ADMIN: ['/dashboard', '/dashboard/worklist', '/support', '/customers', '/billing', '/inventory', '/dashboard/daily-activity'],
  NOC_OPERATOR: ['/dashboard', '/dashboard/worklist', '/support', '/inventory', '/dashboard/daily-activity'],
  TT_OPERATOR: ['/dashboard', '/dashboard/worklist', '/support', '/dashboard/daily-activity'],
  DIGITAL_CREATOR: ['/dashboard', '/dashboard/worklist', '/sales', '/customers', '/dashboard/daily-activity'],
  FIELD_TECHNICIAN: ['/dashboard', '/dashboard/worklist', '/inventory', '/support', '/dashboard/daily-activity'],
  DISMANTLE_OPERATOR: ['/dashboard', '/dashboard/worklist', '/support', '/dashboard/daily-activity'],
}

const controlCenterOrder = ['/dashboard', '/dashboard/daily-activity', '/import', '/dashboard/worklist']

function sortByPreferredOrder(params: { items: typeof navigationItems; role: AppRole | null }) {
  const order = params.role ? rolePreferredOrder[params.role] ?? [] : []
  const getRank = (href: string) => {
    const controlCenterIndex = controlCenterOrder.indexOf(href)
    if (controlCenterIndex >= 0) {
      return controlCenterIndex
    }

    const index = order.indexOf(href)
    return index >= 0 ? controlCenterOrder.length + index : controlCenterOrder.length + order.length + 10
  }

  return [...params.items].sort((left, right) => {
    const rankDiff = getRank(left.href) - getRank(right.href)
    if (rankDiff !== 0) return rankDiff
    return left.title.localeCompare(right.title)
  })
}

type SidebarGroup = {
  title: string
  items?: SidebarNavItem[]
  hrefs?: string[]
  emptyHint?: string
}

type SidebarNavItem = (typeof navigationItems)[number] & {
  key: string
  requiredPath: string
  assignHrefs?: string[]
  matchPrefixes?: string[]
  excludePrefixes?: string[]
  matchFocusPrefix?: string
  excludeFocusPrefix?: string
}

function getNavigationItemByHref(href: string) {
  return navigationItems.find((item) => item.href === href)
}

function buildSidebarNavItem(
  href: string,
  options?: {
    key?: string
    href?: string
    title?: string
    description?: string
    requiredPath?: string
    assignHrefs?: string[]
    matchPrefixes?: string[]
    excludePrefixes?: string[]
    matchFocusPrefix?: string
    excludeFocusPrefix?: string
  },
): SidebarNavItem {
  const base = getNavigationItemByHref(href)
  if (!base) {
    throw new Error(`Navigation item not found for href: ${href}`)
  }

  return {
    ...base,
    key: options?.key ?? href,
    href: options?.href ?? base.href,
    title: options?.title ?? base.title,
    description: options?.description ?? base.description,
    requiredPath: options?.requiredPath ?? base.href,
    assignHrefs: options?.assignHrefs,
    matchPrefixes: options?.matchPrefixes,
    excludePrefixes: options?.excludePrefixes,
    matchFocusPrefix: options?.matchFocusPrefix,
    excludeFocusPrefix: options?.excludeFocusPrefix,
  }
}

function mapNavigationItemToSidebarNavItem(item: (typeof navigationItems)[number]): SidebarNavItem {
  return {
    ...item,
    key: item.href,
    requiredPath: item.href,
    assignHrefs: [item.href],
  }
}

const sidebarCoreGroups: SidebarGroup[] = [
  {
    title: 'Pusat Kendali',
    hrefs: ['/dashboard', '/dashboard/worklist', '/dashboard/daily-activity', '/import'],
  },
  {
    title: 'Pemasaran dan Pelayanan',
    items: [
      buildSidebarNavItem('/support', {
        key: 'support-noc-tt',
        title: 'NOC & Troubleshoots',
        description: 'Queue teknis NOC, TT, monitoring ticket, dan kontrol SLA operasional',
        excludePrefixes: ['/support/isolations', '/support/dismantle'],
      }),
      buildSidebarNavItem('/sales', {
        key: 'sales-main',
        title: 'Penjualan',
        description: 'Lead, survey, order, dan aktivasi komersial',
        excludeFocusPrefix: 'DIGITAL_',
      }),
      buildSidebarNavItem('/customers', {
        key: 'customers-cs-admin',
        title: 'CS & Admin CS',
        description: 'Port ODP, approval CS, dan dismantle dibaca dalam satu workspace pelayanan',
        href: '/customers/cs-admin',
        matchPrefixes: ['/customers/cs-admin', '/support/dismantle'],
        assignHrefs: ['/customers/cs-admin', '/support/dismantle'],
      }),
      buildSidebarNavItem('/sales', {
        key: 'sales-digital-creator',
        title: 'Digital Creator',
        description: 'Campaign, lead digital, content calendar, dan analytics Creator Digital',
        href: '/sales/digital-creator',
        requiredPath: '/sales/digital-creator',
        assignHrefs: [
          '/sales/digital-creator',
          '/sales/campaigns',
          '/sales/digital-leads',
          '/sales/content-calendar',
          '/sales/content-analytics',
        ],
        matchPrefixes: [
          '/sales/digital-creator',
          '/sales/campaigns',
          '/sales/digital-leads',
          '/sales/content-calendar',
          '/sales/content-analytics',
        ],
      }),
    ],
    emptyHint: DASHBOARD_DIVISION_CLUSTERS[0]?.items.map((item) => item.label).join(', '),
  },
  {
    title: 'Finance dan HR',
    items: [
      buildSidebarNavItem('/billing', {
        key: 'billing-main',
        title: 'Billing',
        description: 'Invoice, customer, isolir, payment, dan collection',
        matchPrefixes: ['/billing', '/customers', '/support/isolations'],
        assignHrefs: ['/billing', '/customers', '/support/isolations'],
      }),
      buildSidebarNavItem('/hr', {
        key: 'hr-main',
        title: 'HR',
        description: 'Employee, attendance, payroll, dan pinjaman karyawan',
      }),
    ],
    emptyHint: DASHBOARD_DIVISION_CLUSTERS[2]?.items.map((item) => item.label).join(', '),
  },
  {
    title: 'General Affair',
    items: [
      buildSidebarNavItem('/inventory', {
        key: 'inventory-main',
        title: 'Inventory',
        description: 'Stok, ODP, assignment perangkat, dan request gudang',
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-legal',
        title: 'Legal',
        description: 'Workspace dokumen, administrasi, dan tindak lanjut legal',
        href: '/inventory/legal',
        matchPrefixes: ['/inventory/legal'],
      }),
    ],
    emptyHint: DASHBOARD_DIVISION_CLUSTERS[3]?.items.map((item) => item.label).join(', '),
  },
  {
    title: 'Teknisi & Ekspan',
    items: [
      buildSidebarNavItem('/support', {
        key: 'support-teknisi-psb',
        title: 'Teknisi PSB',
        description: 'Instalasi baru, kesiapan material, dan tindak lanjut lapangan PSB',
        href: '/support/teknisi-psb',
        matchPrefixes: ['/support/teknisi-psb'],
      }),
      buildSidebarNavItem('/support', {
        key: 'support-teknisi-expan',
        title: 'Teknisi Expan',
        description: 'Ekspan jaringan, ODP, port, dan kesiapan jalur lapangan',
        href: '/support/teknisi-expan',
        matchPrefixes: ['/support/teknisi-expan'],
      }),
      buildSidebarNavItem('/support', {
        key: 'support-teknisi-jointer',
        title: 'Teknisi Jointer',
        description: 'Sambungan jaringan, kualitas joint, dan follow up teknis backbone',
        href: '/support/teknisi-jointer',
        matchPrefixes: ['/support/teknisi-jointer'],
      }),
    ],
    emptyHint: DASHBOARD_DIVISION_CLUSTERS[1]?.items.map((item) => item.label).join(', '),
  },
  {
    title: 'Operasional',
    items: [
      buildSidebarNavItem('/inventory', {
        key: 'inventory-kantor',
        title: 'Kantor',
        description: 'Workspace operasional kantor untuk stok aktif dan ritme kerja harian',
        href: '/inventory/kantor',
        matchPrefixes: ['/inventory/kantor'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-toko',
        title: 'Toko',
        description: 'Workspace toko untuk stok display, pergerakan barang, dan tindak lanjut',
        href: '/inventory/toko',
        matchPrefixes: ['/inventory/toko'],
      }),
    ],
    emptyHint: DASHBOARD_DIVISION_CLUSTERS[4]?.items.map((item) => item.label).join(', '),
  },
]

function groupSidebarItems(items: typeof navigationItems, allowedPrefixes: string[]): Array<{
  title: string
  items: SidebarNavItem[]
  emptyHint?: string
}> {
  const grouped = sidebarCoreGroups.map((group) => ({
    ...group,
    items:
      group.items?.filter((item) =>
        allowedPrefixes.some((prefix) => matchesPrefix(item.requiredPath, prefix)),
      ) ??
      items.filter((item) => group.hrefs?.includes(item.href)).map(mapNavigationItemToSidebarNavItem),
  }))

  const assignedBaseHrefs = new Set(
    grouped.flatMap((group) =>
      group.items.flatMap((item) => (item.assignHrefs ?? [item.href]).map((href) => href.split('?')[0] ?? href)),
    ),
  )
  const remainingItems = items.filter((item) => !assignedBaseHrefs.has(item.href))

  if (remainingItems.length) {
    grouped[0]?.items.push(...remainingItems.map(mapNavigationItemToSidebarNavItem))
  }

  return grouped
}

function isSidebarItemActive(item: SidebarNavItem, pathname: string, focus: string) {
  const matchPrefixes = item.matchPrefixes ?? [item.href.split('?')[0] ?? item.href]
  const matchesPath = matchPrefixes.some((prefix) => matchesPrefix(pathname, prefix))
  if (!matchesPath) return false

  if (item.excludePrefixes?.some((prefix) => matchesPrefix(pathname, prefix))) {
    return false
  }

  if (item.matchFocusPrefix && !focus.startsWith(item.matchFocusPrefix)) {
    return false
  }

  if (item.excludeFocusPrefix && focus.startsWith(item.excludeFocusPrefix)) {
    return false
  }

  return true
}

function SidebarBrand({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href="/dashboard"
      className={collapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'}
      onClick={onNavigate}
    >
      <div
        className={`overflow-hidden border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.24)] ${
          collapsed ? 'flex h-14 w-14 items-center justify-center rounded-2xl p-2' : 'max-w-[13rem] rounded-2xl px-2 py-0.5'
        }`}
      >
        <Image
          src="/branding/perkasa-networks-original.png"
          alt="Perkasa Networks"
          width={collapsed ? 40 : 200}
          height={collapsed ? 40 : 74}
          priority
          className={collapsed ? 'h-10 w-10 object-contain' : 'h-auto w-full object-contain'}
        />
      </div>
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
  )
}

function SidebarSection({
  title,
  items,
  pathname,
  focus,
  collapsed,
  onNavigate,
}: {
  title: string
  items: SidebarNavItem[]
  pathname: string
  focus: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  if (!items.length) return null

  return (
    <div className="space-y-2">
      {!collapsed ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p> : null}
      {items.map((item) => {
        const active = isSidebarItemActive(item, pathname, focus)
        const Icon = item.icon

        return (
          <Link
            key={item.key}
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

function SidebarGroupSection({
  title,
  items,
  emptyHint,
  pathname,
  focus,
  collapsed,
  onNavigate,
}: {
  title: string
  items: SidebarNavItem[]
  emptyHint?: string
  pathname: string
  focus: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  if (items.length === 0) {
    if (collapsed) return null

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 px-4 py-4">
          <p className="text-sm font-semibold text-slate-200">Menunggu integrasi menu</p>
          {emptyHint ? <p className="mt-2 text-xs leading-5 text-slate-400">{emptyHint}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <SidebarSection
      title={title}
      items={items}
      pathname={pathname}
      focus={focus}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
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
  const focus =
    typeof window === 'undefined'
      ? ''
      : String(new URLSearchParams(window.location.search).get('focus') ?? '')
          .trim()
          .toUpperCase()
  const roleMeta = session ? getRoleMeta(session.role) : null
  const allowedItems = navigationItems.filter((item) =>
    allowedPrefixes.some((prefix) => matchesPrefix(item.href, prefix))
  )
  const sortedItems = sortByPreferredOrder({ items: allowedItems, role: session?.role ?? null })
  const coreItems = sortedItems.filter((item) => !item.href.startsWith('/settings'))
  const settingsItems = sortedItems.filter((item) => item.href.startsWith('/settings'))
  const groupedCoreItems = groupSidebarItems(coreItems, allowedPrefixes)
  const settingsSidebarItems = settingsItems.map(mapNavigationItemToSidebarNavItem)
  const mobileQuickItems = groupedCoreItems.flatMap((group) => group.items)
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
          <SidebarBrand collapsed={collapsed} />

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
          {groupedCoreItems.map((group) => (
            <SidebarGroupSection
              key={group.title}
              title={group.title}
              items={group.items}
              emptyHint={group.emptyHint}
              pathname={pathname}
              focus={focus}
              collapsed={collapsed}
            />
          ))}
          <SidebarSection
            title="Pengaturan"
            items={settingsSidebarItems}
            pathname={pathname}
            focus={focus}
            collapsed={collapsed}
          />
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
          {mobileQuickItems.map((item) => {
            const active = isSidebarItemActive(item, pathname, focus)

            return (
              <Link
                key={item.key}
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
              <SidebarBrand collapsed={false} onNavigate={() => setMobileOpen(false)} />
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
              {groupedCoreItems.map((group) => (
                <SidebarGroupSection
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  emptyHint={group.emptyHint}
                  pathname={pathname}
                  focus={focus}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
              <SidebarSection
                title="Pengaturan"
                items={settingsSidebarItems}
                pathname={pathname}
                focus={focus}
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
