import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  SquareKanban,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NavItem } from '@/lib/types'

export const navigationItems: Array<NavItem & { icon: LucideIcon }> = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    description: 'Ringkasan platform dan shortcut operasional',
    tone: 'bg-slate-950 text-white',
    icon: LayoutDashboard,
  },
  {
    title: 'Import Center',
    href: '/import',
    description: 'Batch staging, review, dan transform',
    tone: 'bg-blue-600 text-white',
    icon: SquareKanban,
  },
  {
    title: 'Penjualan',
    href: '/sales',
    description: 'Lead, survey, dan order',
    tone: 'bg-sky-500 text-white',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Customer',
    href: '/customers',
    description: 'Customer master dan subscription',
    tone: 'bg-indigo-600 text-white',
    icon: Users,
  },
  {
    title: 'Support',
    href: '/support',
    description: 'TT, isolir, dan dismantle',
    tone: 'bg-amber-500 text-slate-950',
    icon: Wrench,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    description: 'Item, stock movement, dan ODP',
    tone: 'bg-emerald-600 text-white',
    icon: Warehouse,
  },
  {
    title: 'HR',
    href: '/hr',
    description: 'Employee, attendance, dan salary',
    tone: 'bg-violet-600 text-white',
    icon: ClipboardList,
  },
  {
    title: 'Billing',
    href: '/billing',
    description: 'Invoice, payment, dan collection',
    tone: 'bg-rose-600 text-white',
    icon: BadgeDollarSign,
  },
  {
    title: 'Akses',
    href: '/settings/access',
    description: 'Role, permission, dan pengaturan akses',
    tone: 'bg-slate-700 text-white',
    icon: ShieldCheck,
  },
  {
    title: 'User Internal',
    href: '/settings/users',
    description: 'Daftar user auth internal dan status review',
    tone: 'bg-slate-800 text-white',
    icon: Users,
  },
]

export function findNavigationItem(pathname: string) {
  return (
    navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
    navigationItems[0]
  )
}
