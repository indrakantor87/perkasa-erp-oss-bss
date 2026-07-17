import type { DashboardOperationalDivisionKey } from '@/lib/types'

type DivisionMenuCardKey = Exclude<DashboardOperationalDivisionKey, 'ALL'>

export type DashboardDivisionMenuItem = {
  label: string
  aliases?: string[]
  cardKeys?: DivisionMenuCardKey[]
}

export type DashboardDivisionCluster = {
  title: string
  tone: string
  wide?: boolean
  items: DashboardDivisionMenuItem[]
  cardKeys: DivisionMenuCardKey[]
}

export const DASHBOARD_DIVISION_CLUSTERS: DashboardDivisionCluster[] = [
  {
    title: 'Pemasaran dan Pelayanan',
    tone: 'border-sky-200 bg-sky-50 text-sky-900',
    wide: true,
    items: [
      {
        label: 'NOC & Troubleshoots',
        aliases: ['NOC', 'Troubleshoots', 'Troubleshoot', 'TT'],
        cardKeys: ['NOC', 'TT'],
      },
      {
        label: 'Penjualan',
        aliases: ['Penjualan', 'Sales'],
        cardKeys: ['SALES'],
      },
      {
        label: 'CS & Admin CS',
        aliases: ['CS', 'Admin CS', 'Dismantle', 'ODP', 'Port ODP', 'ODP dan Port'],
        cardKeys: ['CS', 'DISMANTLE'],
      },
      {
        label: 'Digital Creator',
        aliases: ['Digital Creator', 'Creator Digital'],
        cardKeys: ['DIGITAL'],
      },
    ],
    cardKeys: ['SALES', 'CS', 'NOC', 'TT', 'DISMANTLE', 'DIGITAL'],
  },
  {
    title: 'Teknisi & Ekspan',
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    items: [
      {
        label: 'Teknisi PSB',
        aliases: ['Teknisi PSB'],
      },
      {
        label: 'Teknisi Expan',
        aliases: ['Teknisi Expan', 'Teknisi Jalur & Expan', 'Teknisi Jalur dan Expan'],
      },
      {
        label: 'Teknisi Jointer',
        aliases: ['Teknisi Jointer'],
      },
    ],
    cardKeys: [],
  },
  {
    title: 'Finance dan HR',
    tone: 'border-violet-200 bg-violet-50 text-violet-900',
    items: [
      {
        label: 'Billing',
        aliases: ['Billing', 'Customer', 'Isolir'],
        cardKeys: ['BILLING'],
      },
      {
        label: 'HR',
        aliases: ['HR'],
        cardKeys: ['HR'],
      },
    ],
    cardKeys: ['BILLING', 'HR'],
  },
  {
    title: 'General Affair',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    items: [
      {
        label: 'Inventory',
        aliases: ['Inventory'],
        cardKeys: ['INVENTORY'],
      },
      {
        label: 'Legal',
        aliases: ['Legal'],
      },
    ],
    cardKeys: ['INVENTORY'],
  },
  {
    title: 'Operasional',
    tone: 'border-slate-200 bg-slate-50 text-slate-900',
    items: [
      {
        label: 'Kantor',
        aliases: ['Kantor'],
      },
      {
        label: 'Toko',
        aliases: ['Toko'],
      },
    ],
    cardKeys: [],
  },
]

export const SUPER_ADMIN_OPERASIONAL_INTI_CLUSTERS: DashboardDivisionCluster[] = [
  {
    title: 'Operasional Inti',
    tone: 'border-slate-200 bg-slate-50 text-slate-900',
    wide: true,
    items: [
      {
        label: 'Billing',
        aliases: ['Billing'],
        cardKeys: ['BILLING'],
      },
      {
        label: 'Ticketing',
        aliases: ['Ticketing', 'PSB', 'Trouble Ticket', 'Dismantle', 'Trouble Jalur', 'NOC Queue'],
        cardKeys: ['NOC', 'TT', 'DISMANTLE'],
      },
      {
        label: 'Isolir',
        aliases: ['Isolir', 'Suspend', 'Restore'],
        cardKeys: ['CS'],
      },
      {
        label: 'Inventory',
        aliases: ['Inventory'],
        cardKeys: ['INVENTORY'],
      },
      {
        label: 'Customer',
        aliases: ['Customer', 'Pelanggan'],
        cardKeys: ['CS'],
      },
      {
        label: 'HR',
        aliases: ['HR'],
        cardKeys: ['HR'],
      },
    ],
    cardKeys: ['BILLING', 'NOC', 'TT', 'DISMANTLE', 'CS', 'INVENTORY', 'HR'],
  },
]

export function matchesDivisionMenuItem(activeValue: string, item: DashboardDivisionMenuItem) {
  const normalized = activeValue.trim().toLowerCase()
  if (!normalized) return false

  const candidates = [item.label, ...(item.aliases ?? [])].map((value) => value.trim().toLowerCase())
  return candidates.some((candidate) => normalized === candidate || normalized.includes(candidate))
}

export function isDivisionMenuItemIntegrated(
  item: DashboardDivisionMenuItem,
  activeCardKeys: Set<DivisionMenuCardKey>,
) {
  const keys = item.cardKeys ?? []
  return keys.some((key) => activeCardKeys.has(key))
}
