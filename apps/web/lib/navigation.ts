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
    description: 'Ringkasan singkat kesehatan operasi dan jalur masuk kerja',
    tone: 'bg-slate-950 text-white',
    icon: LayoutDashboard,
  },
  {
    title: 'List Kerja',
    href: '/dashboard/worklist',
    description: 'Antrean lintas domain untuk tindak lanjut harian',
    tone: 'bg-slate-700 text-white',
    icon: SquareKanban,
  },
  {
    title: 'Tracking',
    href: '/dashboard/tracking',
    description: 'Tracking pekerjaan lapangan dan pergerakan barang',
    tone: 'bg-slate-800 text-white',
    icon: ClipboardList,
  },
  {
    title: 'Daily Activity',
    href: '/dashboard/daily-activity',
    description: 'Plan pagi dan closing sore aktivitas harian',
    tone: 'bg-cyan-600 text-white',
    icon: ClipboardList,
  },
  {
    title: 'Import Center',
    href: '/import',
    description: 'Audit batch import, exception, dan finalisasi data',
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
    title: 'List PSB',
    href: '/list-psb',
    description: 'Antrean validasi PSB antara penjualan, CS, dan ticketing',
    tone: 'bg-cyan-700 text-white',
    icon: ClipboardList,
  },
  {
    title: 'List Dismantle',
    href: '/list-dismantle',
    description: 'Antrean validasi dismantle antara billing, CS, dan ticketing',
    tone: 'bg-rose-700 text-white',
    icon: ClipboardList,
  },
  {
    title: 'CS & Admin CS',
    href: '/customers/cs-admin',
    description: 'Workspace supervisor untuk approval, koreksi, transfer, dan backlog risiko CS',
    tone: 'bg-indigo-700 text-white',
    icon: Users,
  },
  {
    title: 'Customer',
    href: '/customers',
    description: 'Data pelanggan, layanan aktif, dan tindak lanjut CS',
    tone: 'bg-indigo-600 text-white',
    icon: Users,
  },
  {
    title: 'NOC & Troubleshoots',
    href: '/support',
    description: 'Lane kerja support teknis, TT, isolir, dismantle, dan SLA',
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
    title: 'Finance',
    href: '/finance',
    description: 'Workspace finance untuk invoice, collection, payment, dan kontrol suspend',
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
    navigationItems
      .filter((item) => {
        if (item.href === '/finance') {
          return pathname === '/finance' || pathname.startsWith('/finance/') || pathname === '/billing' || pathname.startsWith('/billing/')
        }
        return pathname === item.href || pathname.startsWith(`${item.href}/`)
      })
      .sort((left, right) => right.href.length - left.href.length)[0] ??
    navigationItems[0]
  )
}
