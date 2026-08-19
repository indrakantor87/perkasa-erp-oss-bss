'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { AppSession } from '@/lib/auth-session'
import { useUiLanguage } from '@/components/layout/ui-language'
import { navigationItems } from '@/lib/navigation'
import { canAccessSupportLane, getSupportLaneOrder, getSupportLanePath } from '@/lib/support-lanes'
import type { AppRole } from '@/lib/types'
import { translateUiText } from '@/lib/ui-language'

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

const rolePreferredOrder: Partial<Record<AppRole, string[]>> = {
  SALES_MARKETING: ['/dashboard/worklist', '/dashboard/tracking', '/sales', '/list-psb', '/customers', '/support', '/dashboard/daily-activity', '/dashboard', '/import'],
  CS_OPERATOR: ['/dashboard/worklist', '/dashboard/tracking', '/list-psb', '/list-dismantle', '/support', '/customers', '/inventory', '/dashboard/daily-activity', '/dashboard', '/billing'],
  CS_ADMIN: ['/customers/cs-admin', '/dashboard/worklist', '/dashboard/tracking', '/list-psb', '/list-dismantle', '/support', '/customers', '/dashboard/daily-activity', '/dashboard', '/billing'],
  FINANCE: ['/billing', '/list-dismantle', '/support', '/customers', '/dashboard/worklist', '/dashboard/daily-activity', '/dashboard'],
  NOC_OPERATOR: ['/support', '/dashboard/worklist', '/dashboard/tracking', '/inventory', '/dashboard/daily-activity', '/dashboard'],
  TT_OPERATOR: ['/support', '/dashboard/worklist', '/dashboard/tracking', '/dashboard/daily-activity', '/dashboard'],
  DIGITAL_CREATOR: ['/dashboard/worklist', '/dashboard/tracking', '/sales', '/customers', '/dashboard/daily-activity', '/dashboard'],
  FIELD_TECHNICIAN: ['/support', '/dashboard/worklist', '/dashboard/tracking', '/inventory', '/dashboard/daily-activity', '/dashboard'],
  DISMANTLE_OPERATOR: ['/list-dismantle', '/support', '/dashboard/worklist', '/dashboard/tracking', '/dashboard/daily-activity', '/dashboard'],
}

const controlCenterOrder = ['/dashboard/worklist', '/dashboard/tracking', '/dashboard/daily-activity', '/dashboard', '/import']

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

type SidebarNavItem = (typeof navigationItems)[number] & {
  key: string
  requiredPath: string
  allowedRoles?: AppRole[]
  assignHrefs?: string[]
  matchPrefixes?: string[]
  excludePrefixes?: string[]
  matchFocusPrefix?: string
  excludeFocusPrefix?: string
  matchQueryParams?: Record<string, string | string[]>
  children?: SidebarNavItem[]
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
    allowedRoles?: AppRole[]
    assignHrefs?: string[]
    matchPrefixes?: string[]
    excludePrefixes?: string[]
    matchFocusPrefix?: string
    excludeFocusPrefix?: string
    matchQueryParams?: Record<string, string | string[]>
    children?: SidebarNavItem[]
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
    allowedRoles: options?.allowedRoles,
    assignHrefs: options?.assignHrefs ?? [options?.href ?? base.href],
    matchPrefixes: options?.matchPrefixes,
    excludePrefixes: options?.excludePrefixes,
    matchFocusPrefix: options?.matchFocusPrefix,
    excludeFocusPrefix: options?.excludeFocusPrefix,
    matchQueryParams: options?.matchQueryParams,
    children: options?.children,
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

type SidebarSectionData = {
  title: string
  items: SidebarNavItem[]
}

function buildSalesMainItem(role: AppRole | null) {
  return buildSidebarNavItem('/sales', {
    key: 'sales-main',
    title: 'Penjualan',
    href: role === 'PENJUALAN' ? '/sales/input-psb' : undefined,
    description:
      role === 'PENJUALAN'
        ? 'Input prospek lapangan ke Data PSB sampai siap diproses CS'
        : 'Input PSB, monitoring komersial, dan progres aktivasi',
    excludeFocusPrefix: 'DIGITAL_',
    children: buildSalesSubmenuItems(role),
  })
}

function buildSalesSubmenuItems(role: AppRole | null) {
  if (!role) {
    return []
  }

  if (role === 'PENJUALAN') {
    return [
      buildSidebarNavItem('/sales', {
        key: 'sales-sub-workspace',
        title: 'Workspace Penjualan',
        description: 'Ringkasan input PSB, antrean PSB, dan shortcut monitoring komersial.',
        href: '/sales',
        matchPrefixes: ['/sales'],
        excludePrefixes: [
          '/sales/digital-creator',
          '/sales/campaigns',
          '/sales/digital-leads',
          '/sales/content-calendar',
          '/sales/content-analytics',
          '/sales/marketing-activities',
          '/sales/input-psb',
        ],
      }),
      buildSidebarNavItem('/sales', {
        key: 'sales-sub-input-psb',
        title: 'Input PSB',
        description: 'Form input prospek lapangan yang langsung masuk ke Data PSB.',
        href: '/sales/input-psb',
        matchPrefixes: ['/sales/input-psb'],
      }),
      buildSidebarNavItem('/list-psb', {
        key: 'sales-sub-list-psb',
        title: 'Data PSB',
        description: 'Data PSB milik user login untuk dipantau sampai diproses CS.',
        href: '/list-psb',
        matchPrefixes: ['/list-psb'],
      }),
      buildSidebarNavItem('/sales', {
        key: 'sales-sub-marketing-activities',
        title: 'Aktivitas Tim',
        description: 'Aktivitas tim penjualan/marketing milik user login pada periode aktif.',
        href: '/sales/marketing-activities',
        matchPrefixes: ['/sales/marketing-activities'],
      }),
      buildSidebarNavItem('/dashboard/tracking', {
        key: 'sales-sub-ticketing',
        title: 'Ticketing',
        description: 'Ticketing milik user login untuk memantau progres operasional.',
        href: '/sales/ticketing',
        requiredPath: '/sales',
        assignHrefs: ['/sales/ticketing'],
        matchPrefixes: ['/sales/ticketing'],
      }),
      buildSidebarNavItem('/support', {
        key: 'sales-sub-isolations',
        title: 'List Data Isolir',
        description: 'Data isolir sesuai user login untuk tindak lanjut customer prospek berjalan.',
        href: '/sales/isolations',
        requiredPath: '/sales',
        assignHrefs: ['/sales/isolations'],
        matchPrefixes: ['/sales/isolations'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'sales-sub-odp-port',
        title: 'Port ODP',
        description: 'Cek coverage area, sisa port ODP, dan pembacaan area prospek terdekat.',
        href: '/sales/port-odp',
        requiredPath: '/sales',
        assignHrefs: ['/sales/port-odp'],
        matchPrefixes: ['/sales/port-odp'],
      }),
    ]
  }

  const items: SidebarNavItem[] = []

  items.push(
    buildSidebarNavItem('/sales', {
      key: 'sales-sub-workspace',
      title: 'Workspace Penjualan',
      description: 'Ringkasan input PSB, antrean PSB, dan shortcut monitoring komersial.',
      href: '/sales',
      matchPrefixes: ['/sales'],
      excludePrefixes: [
        '/sales/digital-creator',
        '/sales/campaigns',
        '/sales/digital-leads',
        '/sales/content-calendar',
        '/sales/content-analytics',
        '/sales/marketing-activities',
        '/sales/input-psb',
      ],
    }),
  )

  if (['SUPER_ADMIN', 'ADMIN', 'OWNER', 'PENJUALAN', 'SALES_MARKETING'].includes(role)) {
    items.push(
      buildSidebarNavItem('/sales', {
        key: 'sales-sub-input-psb',
        title: 'Input PSB',
        description: 'Form input prospek lapangan yang langsung masuk ke Data PSB.',
        href: '/sales/input-psb',
        matchPrefixes: ['/sales/input-psb'],
      }),
    )
  }

  if (['SUPER_ADMIN', 'ADMIN', 'OWNER', 'PENJUALAN', 'SALES_MARKETING'].includes(role)) {
    items.push(
      buildSidebarNavItem('/list-psb', {
        key: 'sales-sub-list-psb',
        title: 'Data PSB',
        description: 'Antrean validasi PSB sebelum diteruskan ke ticketing operasional.',
        href: '/list-psb',
        matchPrefixes: ['/list-psb'],
      }),
      buildSidebarNavItem('/sales', {
        key: 'sales-sub-marketing-activities',
        title: 'Aktivitas Tim',
        description: 'Agenda canvassing, covered area, dan ritme aktivitas tim.',
        href: '/sales/marketing-activities',
        matchPrefixes: ['/sales/marketing-activities'],
      }),
    )
  }

  return items
}

function buildSupportMainItem(role: AppRole | null) {
  return buildSidebarNavItem('/support', {
    key: 'support-noc-tt',
    title: role === 'NOC_OPERATOR' ? 'NOC & Ticketing' : 'Support Teknis',
    description:
      role === 'NOC_OPERATOR'
        ? 'Antrean ticket teknis, prioritas SLA, monitoring isolir, dan tindak lanjut operasional NOC'
        : 'Antrean teknis, TT, monitoring ticket, dan kontrol SLA operasional',
    excludePrefixes: ['/support/isolations', '/support/dismantle'],
    children: buildSupportSubmenuItems(role),
  })
}

function buildSupportSubmenuItems(role: AppRole | null) {
  if (!role) {
    return []
  }

  const supportLaneItems: Record<
    'tt' | 'isolations' | 'dismantle' | 'sla',
    {
      key: string
      title: string
      description: string
    }
  > = {
    tt: {
      key: 'support-sub-tt',
      title: role === 'NOC_OPERATOR' ? 'Ticketing NOC' : 'Trouble Ticket',
      description:
        role === 'NOC_OPERATOR'
          ? 'Antrean ticket teknis aktif untuk intake, dispatch, update progres, dan validasi penutupan.'
          : 'Antrean ticket open, progress, ready close, dan tindak lanjut teknis.',
    },
    isolations: {
      key: 'support-sub-isolations',
      title: role === 'NOC_OPERATOR' ? 'Monitoring Isolir' : 'Isolir',
      description:
        role === 'NOC_OPERATOR'
          ? 'Pantau pelanggan suspend yang perlu awareness teknis, koordinasi restore, atau kandidat tindak lanjut.'
          : 'Monitoring pelanggan suspend, restore, dan sinkron support-billing.',
    },
    dismantle: {
      key: 'support-sub-dismantle',
      title: 'Dismantle',
      description: 'Antrean pembongkaran perangkat dan tindak lanjut terminasi lapangan.',
    },
    sla: {
      key: 'support-sub-sla',
      title: role === 'NOC_OPERATOR' ? 'Prioritas SLA' : 'Kontrol SLA',
      description:
        role === 'NOC_OPERATOR'
          ? 'Pantau overdue, disiplin progres, dan ticket teknis yang perlu eskalasi cepat.'
          : 'Pantau overdue, kedisiplinan progres, dan ticket yang perlu eskalasi.',
    },
  }

  const orderedLanes = getSupportLaneOrder(role)
  const items = orderedLanes
    .filter((lane) => canAccessSupportLane(role, lane))
    .map((item) =>
      buildSidebarNavItem('/support', {
        key: supportLaneItems[item].key,
        title: supportLaneItems[item].title,
        description: supportLaneItems[item].description,
        href: getSupportLanePath(item),
        matchPrefixes: [getSupportLanePath(item)],
      }),
    )

  if (['SUPER_ADMIN', 'ADMIN', 'OWNER', 'FINANCE', 'CS_OPERATOR', 'CS_ADMIN', 'DISMANTLE_OPERATOR'].includes(role)) {
    items.unshift(
      buildSidebarNavItem('/list-dismantle', {
        key: 'support-sub-list-dismantle',
        title: 'List Dismantle',
        description: 'Antrean validasi dismantle sebelum diteruskan ke ticket operasional.',
        href: '/list-dismantle',
        matchPrefixes: ['/list-dismantle'],
      }),
    )
  }

  return items
}

function buildCsAdminItem() {
  return buildSidebarNavItem('/customers', {
    key: 'customers-cs-admin',
    title: 'CS & Admin CS',
    description: 'Approval, koreksi, restore, dan backlog risiko CS',
    href: '/customers/cs-admin',
    matchPrefixes: ['/customers/cs-admin', '/customers/cs-admin/odp-port', '/support/dismantle'],
    allowedRoles: ['SUPER_ADMIN', 'CS_ADMIN'],
    assignHrefs: ['/customers/cs-admin', '/customers/cs-admin/odp-port', '/support/dismantle'],
  })
}

function buildCustomersMainItem(role: AppRole | null) {
  const children = buildCustomersSubmenuItems(role)
  return buildSidebarNavItem('/customers', {
    key: 'customers-main',
    title: 'Customer',
    description: 'Data pelanggan, langganan aktif, dan tindak lanjut layanan.',
    children: children.length > 1 ? children : undefined,
  })
}

function buildCustomersSubmenuItems(role: AppRole | null) {
  if (role !== 'SUPER_ADMIN') {
    return []
  }

  return [
    buildSidebarNavItem('/customers', {
      key: 'customers-sub-workspace',
      title: 'Workspace Customer',
      description: 'Data pelanggan, layanan aktif, dan tindak lanjut operasional CS.',
      href: '/customers',
      matchPrefixes: ['/customers'],
      excludePrefixes: ['/customers/cs-admin'],
    }),
    buildSidebarNavItem('/customers', {
      key: 'customers-sub-cs-admin',
      title: 'CS & Admin CS',
      description: 'Approval, koreksi, restore, dan backlog risiko customer service.',
      href: '/customers/cs-admin',
      matchPrefixes: ['/customers/cs-admin', '/customers/cs-admin/odp-port'],
    }),
  ]
}

function buildDigitalCreatorItem() {
  return buildSidebarNavItem('/sales', {
    key: 'sales-digital-creator',
    title: 'Digital Creator',
    description: 'Campaign, lead digital, konten, dan analytics creator',
    href: '/sales/digital-creator',
    requiredPath: '/sales/digital-creator',
    allowedRoles: ['SUPER_ADMIN', 'DIGITAL_CREATOR'],
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
    children: buildDigitalCreatorSubmenuItems(),
  })
}

function buildDigitalCreatorSubmenuItems() {
  return [
    buildSidebarNavItem('/sales', {
      key: 'sales-sub-digital-creator-home',
      title: 'Workspace Creator',
      description: 'Landing workspace campaign, lead digital, dan aktivitas konten.',
      href: '/sales/digital-creator',
      matchPrefixes: ['/sales/digital-creator'],
    }),
    buildSidebarNavItem('/sales', {
      key: 'sales-sub-campaigns',
      title: 'Campaign',
      description: 'Kelola campaign dan jalur akuisisi digital.',
      href: '/sales/campaigns',
      matchPrefixes: ['/sales/campaigns'],
    }),
    buildSidebarNavItem('/sales', {
      key: 'sales-sub-digital-leads',
      title: 'Lead Digital',
      description: 'Monitor lead masuk, funnel, dan tindak lanjut digital sales.',
      href: '/sales/digital-leads',
      matchPrefixes: ['/sales/digital-leads'],
    }),
    buildSidebarNavItem('/sales', {
      key: 'sales-sub-content-calendar',
      title: 'Kalender Konten',
      description: 'Atur jadwal produksi dan publikasi konten marketing.',
      href: '/sales/content-calendar',
      matchPrefixes: ['/sales/content-calendar'],
    }),
    buildSidebarNavItem('/sales', {
      key: 'sales-sub-content-analytics',
      title: 'Analytics Konten',
      description: 'Pantau performa konten, reach, dan engagement.',
      href: '/sales/content-analytics',
      matchPrefixes: ['/sales/content-analytics'],
    }),
  ]
}

function buildBillingMainItem(role: AppRole | null) {
  return buildSidebarNavItem('/finance', {
    key: 'billing-main',
    title: 'Finance',
    description: 'Workspace finance untuk invoice, payment, collection, dan kontrol suspend',
    matchPrefixes: ['/finance', '/billing', '/customers', '/support/isolations'],
    assignHrefs: ['/finance', '/billing', '/customers', '/support/isolations'],
    children: buildBillingSubmenuItems(role),
  })
}

function buildCompactBillingItem() {
  return buildSidebarNavItem('/finance', {
    key: 'billing-compact',
    title: 'Finance',
    description: 'Workspace finance untuk invoice, payment, collection, dan kontrol suspend',
    matchPrefixes: ['/finance', '/billing'],
    assignHrefs: ['/finance', '/billing'],
  })
}

function buildBillingSubmenuItems(role: AppRole | null) {
  if (!role) {
    return []
  }

  const items: SidebarNavItem[] = [
    buildSidebarNavItem('/billing', {
      key: 'billing-sub-workspace',
      title: 'Workspace Finance',
      description: 'Invoice, payment, collection, dan kontrol operasional finance.',
      href: '/finance',
      matchPrefixes: ['/finance', '/billing'],
    }),
  ]

  if (['SUPER_ADMIN', 'ADMIN', 'OWNER', 'FINANCE'].includes(role)) {
    items.push(
      buildSidebarNavItem('/customers', {
        key: 'billing-sub-customers',
        title: 'Customer Billing',
        description: 'Data pelanggan dan langganan untuk tindak lanjut invoice serta tagihan.',
        href: '/customers',
        matchPrefixes: ['/customers'],
      }),
      buildSidebarNavItem('/support', {
        key: 'billing-sub-isolations',
        title: 'Isolir Pelanggan',
        description: 'Monitoring suspend aktif yang terkait penagihan dan restore.',
        href: '/support/isolations',
        matchPrefixes: ['/support/isolations'],
      }),
      buildSidebarNavItem('/list-dismantle', {
        key: 'billing-sub-list-dismantle',
        title: 'List Dismantle',
        description: 'Antrean pelanggan isolir yang siap direview sebelum jadi ticket dismantle.',
        href: '/list-dismantle',
        matchPrefixes: ['/list-dismantle'],
      }),
    )
  }

  return items
}

function buildHrMainItem() {
  return buildSidebarNavItem('/hr', {
    key: 'hr-main',
    title: 'HR',
    description: 'Employee, attendance, payroll, dan pinjaman karyawan',
    excludePrefixes: ['/hr/employees', '/hr/attendance', '/hr/salary', '/hr/loans', '/hr/permissions', '/hr/disciplinary'],
    children: buildHrSubmenuItems(),
  })
}

function buildHrSubmenuItems() {
  return [
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-overview',
      title: 'HR Overview',
      description: 'Ringkasan HR dan jalur masuk ke workspace utama.',
      href: '/hr',
      matchPrefixes: ['/hr'],
      excludePrefixes: ['/hr/employees', '/hr/attendance', '/hr/salary', '/hr/loans', '/hr/permissions', '/hr/disciplinary'],
    }),
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-employees',
      title: 'Data Karyawan',
      description: 'Master employee, arsip, face reference, dan KPI.',
      href: '/hr/employees',
      matchPrefixes: ['/hr/employees'],
    }),
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-attendance',
      title: 'Absensi',
      description: 'Input attendance, koreksi, geofence, dan face review.',
      href: '/hr/attendance',
      matchPrefixes: ['/hr/attendance'],
    }),
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-salary',
      title: 'Gaji',
      description: 'Buat payroll, rilis slip gaji, dan void slip.',
      href: '/hr/salary',
      matchPrefixes: ['/hr/salary'],
    }),
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-loans',
      title: 'Pinjaman',
      description: 'Buat loan, update status, dan void pinjaman.',
      href: '/hr/loans',
      matchPrefixes: ['/hr/loans'],
    }),
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-permissions',
      title: 'Perizinan',
      description: 'Kelola pengajuan izin, cuti, dan approval HR.',
      href: '/hr/permissions',
      matchPrefixes: ['/hr/permissions'],
    }),
    buildSidebarNavItem('/hr', {
      key: 'hr-sub-disciplinary',
      title: 'Sanksi',
      description: 'Kelola surat peringatan dan tindak lanjut disiplin.',
      href: '/hr/disciplinary',
      matchPrefixes: ['/hr/disciplinary'],
    }),
  ]
}

function buildCompactTicketingItem() {
  return buildSidebarNavItem('/dashboard/tracking', {
    key: 'tracking-ticketing-compact',
    title: 'Ticketing',
    description: 'Tabel kombinasi ticket PSB, trouble ticket, dismantle, dan trouble jalur',
    href: '/dashboard/tracking/noc-queue',
    requiredPath: '/dashboard/tracking',
    assignHrefs: ['/dashboard/tracking/noc-queue'],
    matchPrefixes: ['/dashboard/tracking/noc-queue'],
  })
}

function buildCompactIsolirItem() {
  return buildSidebarNavItem('/support', {
    key: 'support-isolir-compact',
    title: 'Isolir',
    description: 'Monitoring pelanggan suspend, restore, dan sinkron billing operasional',
    href: '/support/isolations',
    requiredPath: '/support',
    assignHrefs: ['/support', '/support/isolations'],
    matchPrefixes: ['/support/isolations'],
  })
}

function buildCompactSlaItem() {
  return buildSidebarNavItem('/support', {
    key: 'support-sla-compact',
    title: 'Prioritas SLA',
    description: 'Pantau ticket overdue, warning, dan disiplin progres operasional.',
    href: '/support/sla',
    requiredPath: '/support',
    assignHrefs: ['/support/sla'],
    matchPrefixes: ['/support/sla'],
  })
}

function buildCompactPsbListItem() {
  return buildSidebarNavItem('/list-psb', {
    key: 'list-psb-compact',
    title: 'Data PSB',
    description: 'Antrean PSB untuk review, jadwal, dan transfer ke ticketing.',
    href: '/list-psb',
    matchPrefixes: ['/list-psb'],
  })
}

function buildCompactDismantleListItem() {
  return buildSidebarNavItem('/list-dismantle', {
    key: 'list-dismantle-compact',
    title: 'List Dismantle',
    description: 'Antrean validasi dismantle sebelum diteruskan ke tiket operasional.',
    href: '/list-dismantle',
    matchPrefixes: ['/list-dismantle'],
  })
}

function buildCompactOdpPortItem() {
  return buildSidebarNavItem('/dashboard/tracking', {
    key: 'tracking-odp-port-compact',
    title: 'Port ODP',
    description: 'Baca kapasitas ODP, status port, peta marker, dan coverage area operasional.',
    href: '/inventory/network',
    requiredPath: '/inventory',
    assignHrefs: ['/inventory/network'],
    matchPrefixes: ['/inventory/network'],
  })
}

function buildCompactCsCustomerItem(role: AppRole) {
  return buildSidebarNavItem('/customers', {
    key: role === 'CS_ADMIN' ? 'customers-cs-admin-compact' : 'customers-cs-compact',
    title: role === 'CS_ADMIN' ? 'CS & Admin CS' : 'Customer',
    description:
      role === 'CS_ADMIN'
        ? 'Approval, koreksi, restore, dan pembacaan customer service.'
        : 'Data pelanggan, layanan aktif, dan tindak lanjut customer service.',
    href: role === 'CS_ADMIN' ? '/customers/cs-admin' : '/customers',
    requiredPath: '/customers',
    assignHrefs: role === 'CS_ADMIN' ? ['/customers/cs-admin', '/customers/cs-admin/odp-port'] : ['/customers'],
    matchPrefixes: role === 'CS_ADMIN' ? ['/customers/cs-admin', '/customers/cs-admin/odp-port'] : ['/customers'],
    excludePrefixes: role === 'CS_ADMIN' ? undefined : ['/customers/cs-admin'],
  })
}

function buildCompactInventoryItem() {
  return buildSidebarNavItem('/inventory', {
    key: 'inventory-compact',
    title: 'Inventory',
    description: 'Ringkasan stok, request, pinjaman, rack, dan network inventory',
    href: '/inventory',
    matchPrefixes: ['/inventory'],
    excludePrefixes: ['/inventory/legal', '/inventory/kantor', '/inventory/toko'],
    assignHrefs: ['/inventory', '/inventory/network'],
  })
}

function buildCompactCustomerItem() {
  return buildSidebarNavItem('/customers', {
    key: 'customers-compact',
    title: 'Customer',
    description: 'Data pelanggan, langganan aktif, dan tindak lanjut layanan',
    matchPrefixes: ['/customers'],
    excludePrefixes: ['/customers/cs-admin'],
    assignHrefs: ['/customers'],
  })
}

function buildCompactHrItem() {
  return buildSidebarNavItem('/hr', {
    key: 'hr-compact',
    title: 'HR',
    description: 'Employee, attendance, payroll, dan pinjaman karyawan',
    matchPrefixes: ['/hr'],
    assignHrefs: ['/hr'],
  })
}

function buildInventoryMainItem(role: AppRole | null) {
  return buildSidebarNavItem('/inventory', {
    key: 'inventory-main',
    title: 'Inventory',
    description: 'Ringkasan stok, request, pinjaman, rack, dan network inventory',
    href: role === 'SUPER_ADMIN' ? '/inventory' : '/inventory/network',
    excludePrefixes: ['/inventory/legal', '/inventory/kantor', '/inventory/toko'],
    assignHrefs: ['/inventory', '/inventory/network'],
    children: buildInventorySubmenuItems(role),
  })
}

function buildInventorySubmenuItems(role: AppRole | null) {
  const canCreate = role != null && ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'GA', 'CS_ADMIN'].includes(role)
  const canUpdate =
    role != null &&
    ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'GA', 'CS_ADMIN', 'CS_OPERATOR', 'NOC_OPERATOR', 'FIELD_TECHNICIAN'].includes(role)

  const items: SidebarNavItem[] = []

  if (role === 'FIELD_TECHNICIAN') {
    items.push(
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-request-technician',
        title: 'Request Barang',
        description: 'Ajukan request barang untuk kebutuhan lapangan.',
        href: '/inventory/requests?inventoryAction=item-request',
        matchPrefixes: ['/inventory/requests'],
      }),
    )

    return items
  }

  if (canCreate) {
    items.push(
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-items',
        title: 'Data Barang',
        description: 'Master item inventory dan generate barcode item.',
        href: '/inventory/items',
        matchPrefixes: ['/inventory/items'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-receipt',
        title: 'Barang Masuk',
        description: 'Fokus ke receipt stok gudang.',
        href: '/inventory/receipts',
        matchPrefixes: ['/inventory/receipts'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-stock-movement',
        title: 'Barang Keluar',
        description: 'Fokus ke barang keluar, retur, dan adjustment stok.',
        href: '/inventory/movements',
        matchPrefixes: ['/inventory/movements'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-damaged-items',
        title: 'Barang Rusak',
        description: 'Catatan barang rusak beserta harga beli, harga jual, dan keterangannya.',
        href: '/inventory/damaged',
        matchPrefixes: ['/inventory/damaged'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-assets',
        title: 'Total Asset',
        description: 'Akumulasi nilai asset elektronik, operasional, dan perlengkapan teknisi.',
        href: '/inventory/assets',
        matchPrefixes: ['/inventory/assets'],
      }),
    )
  }

  if (canUpdate) {
    items.push(
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-request',
        title: 'Request Barang',
        description: 'Antrean request teknisi dan proses pengambilan barang.',
        href: '/inventory/requests',
        matchPrefixes: ['/inventory/requests'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-loans',
        title: 'Pinjaman Barang',
        description: 'Pinjamkan barang dan proses pengembalian dalam satu workspace.',
        href: '/inventory/loans',
        matchPrefixes: ['/inventory/loans'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-rack-layout',
        title: 'Penataan Rak',
        description: 'Kelola rak, barcode rak, dan struktur lokasi barang.',
        href: '/inventory/racks',
        matchPrefixes: ['/inventory/racks'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-logs',
        title: 'Log Aktivitas',
        description: 'Fokus ke log request barang dan pergerakan stok inventory.',
        href: '/inventory/logs',
        matchPrefixes: ['/inventory/logs'],
      }),
      buildSidebarNavItem('/inventory', {
        key: 'inventory-sub-network',
        title: 'Networks & ODP',
        description: 'Kelola ODP, port, assignment, dan return perangkat.',
        href: '/inventory/network',
        matchPrefixes: ['/inventory/network'],
      }),
    )
  }

  return items
}

function buildInventoryLegalItem() {
  return buildSidebarNavItem('/inventory', {
    key: 'inventory-legal',
    title: 'Legal',
    description: 'Dokumen, administrasi, dan tindak lanjut legal',
    href: '/inventory/legal',
    allowedRoles: ['SUPER_ADMIN'],
    matchPrefixes: ['/inventory/legal'],
  })
}

function buildInventoryKantorItem() {
  return buildSidebarNavItem('/inventory', {
    key: 'inventory-kantor',
    title: 'Kantor',
    description: 'Operasional kantor untuk stok aktif dan ritme kerja harian',
    href: '/inventory/kantor',
    allowedRoles: ['SUPER_ADMIN'],
    matchPrefixes: ['/inventory/kantor'],
  })
}

function buildInventoryTokoItem() {
  return buildSidebarNavItem('/inventory', {
    key: 'inventory-toko',
    title: 'Toko (Segera)',
    description: 'Business di luar ISP yang disiapkan bertahap',
    href: '/inventory/toko',
    allowedRoles: ['SUPER_ADMIN'],
    matchPrefixes: ['/inventory/toko'],
  })
}

function buildTeknisiLapanganItem() {
  return buildSidebarNavItem('/support', {
    key: 'support-teknisi-lapangan',
    title: 'Teknisi Lapangan',
    description: 'PSB, trouble, dismantle, expan, dan jointer',
    href: '/support/teknisi-psb',
    requiredPath: '/support/teknisi-psb',
    allowedRoles: ['SUPER_ADMIN', 'FIELD_TECHNICIAN'],
    assignHrefs: [
      '/support/teknisi-psb',
      '/support/teknisi-troubleshoots',
      '/support/teknisi-dismantle',
      '/support/teknisi-expan',
      '/support/teknisi-jointer',
    ],
    matchPrefixes: [
      '/support/teknisi-psb',
      '/support/teknisi-troubleshoots',
      '/support/teknisi-dismantle',
      '/support/teknisi-expan',
      '/support/teknisi-jointer',
    ],
    children: buildTeknisiLapanganSubmenuItems(),
  })
}

function buildTeknisiLapanganSubmenuItems() {
  return [
    buildSidebarNavItem('/support', {
      key: 'support-sub-teknisi-psb',
      title: 'PSB',
      description: 'Pekerjaan pasang baru dan aktivasi pelanggan baru.',
      href: '/support/teknisi-psb',
      matchPrefixes: ['/support/teknisi-psb'],
    }),
    buildSidebarNavItem('/support', {
      key: 'support-sub-teknisi-troubleshoots',
      title: 'Troubleshoots',
      description: 'Pekerjaan gangguan lapangan yang bersumber dari NOC dan ticketing.',
      href: '/support/teknisi-troubleshoots',
      matchPrefixes: ['/support/teknisi-troubleshoots'],
    }),
    buildSidebarNavItem('/support', {
      key: 'support-sub-teknisi-dismantle',
      title: 'Dismantle',
      description: 'Pembongkaran perangkat yang bersumber dari CS (isolir 1 bulan).',
      href: '/support/teknisi-dismantle',
      matchPrefixes: ['/support/teknisi-dismantle'],
    }),
    buildSidebarNavItem('/support', {
      key: 'support-sub-teknisi-expan',
      title: 'Expan',
      description: 'Ekspansi jaringan dan tindak lanjut teknis area baru.',
      href: '/support/teknisi-expan',
      matchPrefixes: ['/support/teknisi-expan'],
    }),
    buildSidebarNavItem('/support', {
      key: 'support-sub-teknisi-jointer',
      title: 'Jointer',
      description: 'Pekerjaan jointing dan penyambungan jaringan fiber.',
      href: '/support/teknisi-jointer',
      matchPrefixes: ['/support/teknisi-jointer'],
    }),
  ]
}

function buildTroubleTicketItem() {
  return buildSidebarNavItem('/support', {
    key: 'support-tt-only',
    title: 'Trouble Ticket',
    description: 'Queue TT open, progress, dan close',
    href: '/support/tt',
    requiredPath: '/support/tt',
    allowedRoles: ['SUPER_ADMIN', 'TT_OPERATOR'],
    assignHrefs: ['/support/tt'],
    matchPrefixes: ['/support/tt'],
  })
}

function buildDismantleItem() {
  return buildSidebarNavItem('/support', {
    key: 'support-dismantle-only',
    title: 'Dismantle',
    description: 'Antrean pembongkaran perangkat dan tindak lanjut lapangan',
    href: '/support/dismantle',
    requiredPath: '/support/dismantle',
    allowedRoles: ['SUPER_ADMIN', 'DISMANTLE_OPERATOR'],
    assignHrefs: ['/support/dismantle'],
    matchPrefixes: ['/support/dismantle'],
  })
}

function filterCustomItems(items: SidebarNavItem[], allowedPrefixes: string[], role: AppRole | null) {
  return items.filter(
    (item) =>
      allowedPrefixes.some((prefix) => matchesPrefix(item.requiredPath, prefix)) &&
      (!item.allowedRoles || (role != null && item.allowedRoles.includes(role))),
  )
}

function dedupeSidebarItems(items: SidebarNavItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

function getPrimaryNavHrefs(role: AppRole | null) {
  const base = ['/dashboard', '/dashboard/worklist', '/dashboard/tracking', '/dashboard/daily-activity']
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return [...base, '/import']
  }
  return base
}

function getSuperAdminPrimaryHrefs() {
  return ['/dashboard/worklist', '/dashboard/tracking', '/dashboard/daily-activity', '/dashboard', '/import']
}

function getWorkspaceCustomItems(role: AppRole | null) {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        buildCsAdminItem(),
        buildSupportMainItem(role),
        buildSalesMainItem(role),
        buildBillingMainItem(role),
        buildInventoryMainItem(role),
        buildHrMainItem(),
      ]
    case 'ADMIN':
      return [
        buildSalesMainItem(role),
        buildCustomersMainItem(role),
        buildSupportMainItem(role),
        buildBillingMainItem(role),
        buildInventoryMainItem(role),
      ]
    case 'OWNER':
      return [
        buildSalesMainItem(role),
        buildCustomersMainItem(role),
        buildSupportMainItem(role),
        buildBillingMainItem(role),
        buildInventoryMainItem(role),
      ]
    case 'FINANCE':
      return [buildBillingMainItem(role)]
    case 'HR':
      return [buildHrMainItem()]
    case 'GA':
      return [buildInventoryMainItem(role)]
    case 'PENJUALAN':
    case 'SALES_MARKETING':
      return [buildSalesMainItem(role)]
    case 'CS_OPERATOR':
      return [
        buildCompactCsCustomerItem(role),
        buildCompactPsbListItem(),
        buildCompactTicketingItem(),
        buildCompactIsolirItem(),
        buildCompactDismantleListItem(),
        buildCompactOdpPortItem(),
      ]
    case 'CS_ADMIN':
      return [
        buildCompactCsCustomerItem(role),
        buildCompactPsbListItem(),
        buildCompactTicketingItem(),
        buildCompactIsolirItem(),
        buildCompactDismantleListItem(),
        buildCompactOdpPortItem(),
      ]
    case 'NOC_OPERATOR':
      return [buildCompactTicketingItem(), buildCompactSlaItem(), buildCompactIsolirItem(), buildCompactOdpPortItem()]
    case 'FIELD_TECHNICIAN':
      return [buildTeknisiLapanganItem()]
    case 'TT_OPERATOR':
      return [buildTroubleTicketItem()]
    case 'DIGITAL_CREATOR':
      return [buildDigitalCreatorItem()]
    case 'DISMANTLE_OPERATOR':
      return [buildDismantleItem()]
    default:
      return []
  }
}

function getSuperAdminCompactWorkspaceItems() {
  return [
    buildCompactBillingItem(),
    buildCompactTicketingItem(),
    buildCompactIsolirItem(),
    buildCompactInventoryItem(),
    buildCompactCustomerItem(),
    buildCompactHrItem(),
  ]
}

function getSupportingCustomItems(role: AppRole | null) {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        buildCustomersMainItem(role),
        buildDigitalCreatorItem(),
        buildTeknisiLapanganItem(),
        buildInventoryLegalItem(),
        buildInventoryKantorItem(),
      ]
    case 'ADMIN':
    case 'OWNER':
      return []
    case 'PENJUALAN':
    case 'SALES_MARKETING':
      return [buildCustomersMainItem(role)]
    case 'NOC_OPERATOR':
      return []
    default:
      return []
  }
}

function buildSidebarSections(params: {
  allowedItems: typeof navigationItems
  allowedPrefixes: string[]
  role: AppRole | null
}) {
  const sortedItems = sortByPreferredOrder({ items: params.allowedItems, role: params.role })
  const coreItems = sortedItems.filter((item) => !item.href.startsWith('/settings'))
  const settingsItems = sortedItems
    .filter((item) => item.href.startsWith('/settings'))
    .map(mapNavigationItemToSidebarNavItem)

  const primaryHrefs = new Set(
    params.role === 'SUPER_ADMIN'
      ? getSuperAdminPrimaryHrefs()
      : getPrimaryNavHrefs(params.role),
  )
  const rawPrimaryItems = coreItems
    .filter((item) => primaryHrefs.has(item.href))
    .map(mapNavigationItemToSidebarNavItem)

  const utamaOrder = ['/dashboard', '/dashboard/daily-activity', '/dashboard/worklist', '/dashboard/tracking', '/import']
  const primaryItems =
    params.role === 'SUPER_ADMIN'
      ? rawPrimaryItems
      : utamaOrder
          .map((href) => rawPrimaryItems.find((item) => item.href === href))
          .filter((item): item is SidebarNavItem => Boolean(item))

  const rawWorkspaceItems =
    params.role === 'SUPER_ADMIN' ? getSuperAdminCompactWorkspaceItems() : getWorkspaceCustomItems(params.role)

  const workspaceItems = dedupeSidebarItems(
    filterCustomItems(rawWorkspaceItems, params.allowedPrefixes, params.role),
  )

  const supportingCustomItems =
    params.role === 'SUPER_ADMIN'
      ? []
      : dedupeSidebarItems(filterCustomItems(getSupportingCustomItems(params.role), params.allowedPrefixes, params.role))

  const assignedBaseHrefs = new Set(
    [...primaryItems, ...workspaceItems, ...supportingCustomItems].flatMap((item) =>
      (item.assignHrefs ?? [item.href]).map((href) => href.split('?')[0] ?? href),
    ),
  )

  const supportingBaseItems =
    params.role === 'SUPER_ADMIN'
      ? []
      : ['PENJUALAN', 'CS_OPERATOR', 'CS_ADMIN', 'NOC_OPERATOR'].includes(params.role ?? '')
        ? []
        : coreItems.filter((item) => !assignedBaseHrefs.has(item.href)).map(mapNavigationItemToSidebarNavItem)

  const primaryTitle =
    params.role === 'SUPER_ADMIN' ? 'Control Center' : 'Utama'
  const workspaceTitle =
    params.role === 'SUPER_ADMIN'
      ? 'Operasional Inti'
      : params.role === 'NOC_OPERATOR'
        ? 'Operasional'
      : 'Workspace'
  const supportingTitle =
    params.role === 'SUPER_ADMIN' ? 'Pengawasan' : 'Pendukung'

  const sections: SidebarSectionData[] = [
    { title: primaryTitle, items: primaryItems },
    { title: workspaceTitle, items: workspaceItems },
    { title: supportingTitle, items: dedupeSidebarItems([...supportingCustomItems, ...supportingBaseItems]) },
  ]

  return {
    coreSections: sections.filter((section) => section.items.length > 0),
    settingsItems,
  }
}

function isSidebarItemActive(
  item: SidebarNavItem,
  pathname: string,
  focus: string,
  currentQueryParams?: URLSearchParams,
) {
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

  if (item.matchQueryParams && currentQueryParams) {
    const matchesQuery = Object.entries(item.matchQueryParams).every(([key, value]) => {
      const currentValue = String(currentQueryParams.get(key) ?? '').trim().toLowerCase()
      const expectedValues = Array.isArray(value) ? value : [value]
      return expectedValues.map((item) => item.trim().toLowerCase()).includes(currentValue)
    })

    if (!matchesQuery) {
      return false
    }
  }

  return true
}

function SidebarBrand({
  collapsed,
  language,
  onNavigate,
}: {
  collapsed: boolean
  language: 'id' | 'en'
  onNavigate?: () => void
}) {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      className={collapsed ? 'flex flex-col items-center gap-2.5' : 'space-y-2'}
      onClick={onNavigate}
    >
      <div
        className={`overflow-hidden border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.24)] ${
          collapsed ? 'flex h-12 w-12 items-center justify-center rounded-xl p-2' : 'max-w-[11.5rem] rounded-xl px-2 py-0.5'
        }`}
      >
        <Image
          src="/branding/perkasa-networks-original.png"
          alt="Perkasa Networks"
          width={collapsed ? 34 : 176}
          height={collapsed ? 34 : 64}
          priority
          className={collapsed ? 'h-8 w-8 object-contain' : 'h-auto w-full object-contain'}
        />
      </div>
      <div className={collapsed ? 'text-center' : ''}>
        <p className="font-[family-name:var(--font-heading)] text-xl font-semibold leading-tight">
          {collapsed ? 'ERP' : 'ERP OSS BSS'}
        </p>
        {!collapsed ? (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {translateUiText(
              'Masuk ke queue, list kerja, dan modul harian tanpa perlu menebak alur dari awal.',
              language,
            )}
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
  currentQueryParams,
  collapsed,
  language,
  expandedItems = {},
  onToggleExpanded = () => {},
  onNavigate,
}: {
  title: string
  items: SidebarNavItem[]
  pathname: string
  focus: string
  currentQueryParams: URLSearchParams
  collapsed: boolean
  language: 'id' | 'en'
  expandedItems: Record<string, boolean>
  onToggleExpanded: (key: string, nextExpanded: boolean) => void
  onNavigate?: () => void
}) {
  if (!items.length) return null
  const isWorkspaceSection =
    title === 'Workspace' || title === 'Operasional Inti' || title === 'Lintas Divisi'
  const sectionTitleClass = isWorkspaceSection
    ? 'text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200'
    : 'text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'
  const sectionBadgeClass = isWorkspaceSection
    ? 'border border-slate-700 bg-slate-800 text-slate-200'
    : 'border border-slate-800 bg-slate-900 text-slate-400'

  return (
    <div className={collapsed ? 'space-y-2' : 'space-y-1.5'}>
      {!collapsed ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className={sectionTitleClass}>{translateUiText(title, language)}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sectionBadgeClass}`}>
            {items.length}
          </span>
        </div>
      ) : null}
      {items.map((item) => {
        const active = isSidebarItemActive(item, pathname, focus, currentQueryParams)
        const activeChild =
          item.children?.some((child) => isSidebarItemActive(child, pathname, focus, currentQueryParams)) ?? false
        const hasChildren = Boolean(item.children?.length)
        const expanded = hasChildren ? (expandedItems[item.key] ?? (active || activeChild)) : false
        const Icon = item.icon
        const itemHighlighted = active || activeChild
        const showDescription =
          !collapsed && (active || activeChild || (!hasChildren && isWorkspaceSection))
        const itemTitle = translateUiText(item.title, language)
        const itemDescription = translateUiText(item.description, language)

        const handleItemClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
          if (!hasChildren || collapsed) {
            onNavigate?.()
            return
          }

          if (active || activeChild) {
            event.preventDefault()
            onToggleExpanded(item.key, !expanded)
            return
          }

          onToggleExpanded(item.key, true)
          onNavigate?.()
        }

        return (
          <div key={item.key} className="space-y-1.5">
            <Link
              href={item.href}
              prefetch={false}
              onClick={handleItemClick}
              title={itemTitle}
              className={`relative block overflow-hidden rounded-xl border transition ${
                collapsed ? 'px-3 py-3' : 'px-3.5 py-2.5'
              } ${
                active
                  ? 'border-slate-600 bg-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.24)]'
                  : activeChild
                    ? 'border-slate-800 bg-slate-900/60 shadow-[0_8px_18px_rgba(15,23,42,0.16)]'
                  : 'border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900'
              }`}
            >
              {itemHighlighted ? (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-white/90" aria-hidden="true" />
              ) : null}
              <div className={`flex ${collapsed ? 'justify-center' : 'items-center gap-3'}`}>
                <span className={`shrink-0 rounded-lg ${collapsed ? 'p-2' : 'p-1.5'} ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {!collapsed ? (
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-semibold text-slate-100">{itemTitle}</p>
                      {showDescription ? (
                        <p className="truncate text-[11px] leading-4 text-slate-400">{itemDescription}</p>
                      ) : null}
                    </div>
                    {hasChildren ? (
                      <span className="mt-0.5 shrink-0 text-slate-400">
                        {expanded ? 'v' : '>'}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Link>

            {!collapsed && item.children?.length && expanded ? (
              <div
                className={`ml-4 space-y-1 border-l pl-3 ${
                  itemHighlighted ? 'border-slate-700' : 'border-slate-900'
                }`}
              >
                {item.children.map((child) => {
                  const childActive = isSidebarItemActive(child, pathname, focus, currentQueryParams)
                  const childTitle = translateUiText(child.title, language)
                  const childDescription = translateUiText(child.description, language)

                  return (
                    <Link
                      key={child.key}
                      href={child.href}
                      prefetch={false}
                      onClick={onNavigate}
                      title={childTitle}
                      className={`block rounded-lg border px-3 py-1.5 text-sm transition ${
                        childActive
                          ? 'border-slate-800 bg-slate-900 font-semibold text-white'
                          : 'border-transparent text-slate-400 hover:border-slate-900 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <p className="truncate">{childTitle}</p>
                      {childActive ? (
                        <p className="truncate text-[11px] leading-4 text-slate-500">{childDescription}</p>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
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
  const { language } = useUiLanguage()
  const pathname = usePathname()
  const role = session?.role ?? null

  const [currentQueryParams, setCurrentQueryParams] = useState(() => new URLSearchParams())
  const focus =
    String(currentQueryParams.get('focus') ?? '')
      .trim()
      .toUpperCase()

  const { coreSections, settingsItems, mobileQuickItems } = useMemo(() => {
    const allowedItems = navigationItems.filter((item) =>
      allowedPrefixes.some((prefix) => matchesPrefix(item.href, prefix))
    )
    const sections = buildSidebarSections({
      allowedItems,
      allowedPrefixes,
      role,
    })
    const quickItems = sections.coreSections.flatMap((section) => section.items).slice(0, 5)
    return {
      coreSections: sections.coreSections,
      settingsItems: sections.settingsItems,
      mobileQuickItems: quickItems,
    }
  }, [allowedPrefixes, role])

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCurrentQueryParams(new URLSearchParams(window.location.search))
  }, [pathname])

  useEffect(() => {
    const stored = window.localStorage.getItem('perkasa.sidebar.collapsed')
    if (stored === '1') {
      setCollapsed(true)
    }
    const storedExpandedItems = window.localStorage.getItem('perkasa.sidebar.expanded-items')
    if (storedExpandedItems) {
      try {
        const parsed = JSON.parse(storedExpandedItems) as Record<string, boolean>
        if (parsed && typeof parsed === 'object') {
          setExpandedItems(parsed)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('perkasa.sidebar.collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    window.localStorage.setItem('perkasa.sidebar.expanded-items', JSON.stringify(expandedItems))
  }, [expandedItems])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleToggleExpanded = (key: string, nextExpanded: boolean) => {
    setExpandedItems(nextExpanded ? { [key]: true } : { [key]: false })
  }

  const desktopWidthClass = collapsed ? 'w-24 px-3' : 'w-80 px-6'

  return (
    <>
      <aside
        className={`hidden flex-col py-8 transition-all duration-200 lg:flex ${desktopWidthClass}`}
        style={{
          borderRight: '1px solid var(--color-sidebar-line)',
          backgroundColor: 'var(--color-sidebar)',
          color: 'var(--color-sidebar-ink)',
        }}
        suppressHydrationWarning
      >
        <div className={`flex ${collapsed ? 'justify-center' : 'items-start justify-between gap-4'}`}>
          <SidebarBrand collapsed={collapsed} language={language} />

          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
              aria-label={translateUiText('Minimalkan sidebar', language)}
              title={translateUiText('Minimalkan sidebar', language)}
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
              aria-label={translateUiText('Tampilkan sidebar', language)}
              title={translateUiText('Tampilkan sidebar', language)}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                <span>{'>'}</span>
              </span>
            </button>
          </div>
        ) : null}

        <nav className="mt-10 space-y-6">
          {coreSections.map((section) => (
            <SidebarSection
              key={section.title}
              title={section.title}
              items={section.items}
              pathname={pathname}
              focus={focus}
              currentQueryParams={currentQueryParams}
              collapsed={collapsed}
              language={language}
              expandedItems={expandedItems}
              onToggleExpanded={handleToggleExpanded}
            />
          ))}
          <SidebarSection
            title="Pengaturan"
            items={settingsItems}
            pathname={pathname}
            focus={focus}
            currentQueryParams={currentQueryParams}
            collapsed={collapsed}
            language={language}
            expandedItems={expandedItems}
            onToggleExpanded={handleToggleExpanded}
          />
        </nav>
      </aside>

      <nav
        className="sticky top-0 z-30 border-b border-line px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:hidden"
        style={{ backgroundColor: 'var(--color-topbar)' }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:[border-color:var(--color-line-strong)]"
            aria-label={translateUiText('Tampilkan menu navigasi', language)}
            title={translateUiText('Menu Navigasi', language)}
          >
            <span aria-hidden="true" className="flex flex-col gap-[5px]">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1">
          {mobileQuickItems.map((item) => {
            const active = isSidebarItemActive(item, pathname, focus, currentQueryParams)

            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={false}
                className={`whitespace-nowrap inline-flex h-11 items-center rounded-full px-4 text-sm font-medium transition ${
                    active ? 'bg-panel text-surface shadow-[0_2px_12px_rgba(15,23,42,0.12)]' : 'text-mute'
                }`}
                style={active ? undefined : { backgroundColor: 'var(--color-card-subtle)' }}
              >
                {translateUiText(item.title, language)}
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
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label={translateUiText('Tutup menu', language)}
          />
          <aside
            className="relative flex h-full w-80 max-w-[88vw] flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
            style={{
              borderRight: '1px solid var(--color-sidebar-line)',
              backgroundColor: 'var(--color-sidebar)',
              color: 'var(--color-sidebar-ink)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <SidebarBrand collapsed={false} language={language} onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
                aria-label={translateUiText('Tutup menu', language)}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  x
                </span>
              </button>
            </div>

            <nav className="mt-8 space-y-6 overflow-y-auto pr-1 pb-6">
              {coreSections.map((section) => (
                <SidebarSection
                  key={section.title}
                  title={section.title}
                  items={section.items}
                  pathname={pathname}
                  focus={focus}
                  currentQueryParams={currentQueryParams}
                  collapsed={false}
                  language={language}
                  expandedItems={expandedItems}
                  onToggleExpanded={handleToggleExpanded}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
              <SidebarSection
                title="Pengaturan"
                items={settingsItems}
                pathname={pathname}
                focus={focus}
                currentQueryParams={currentQueryParams}
                collapsed={false}
                language={language}
                expandedItems={expandedItems}
                onToggleExpanded={handleToggleExpanded}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  )
}
