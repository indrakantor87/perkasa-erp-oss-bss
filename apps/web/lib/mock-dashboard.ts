import type { ActivityItem, DashboardMetric, DashboardSummary, ModuleCard } from '@/lib/types'

export const dashboardSummary: DashboardSummary = {
  customers: 10284,
  orders: 512,
  troubleTickets: 48,
  isolations: 93,
  inventoryItems: 1248,
  employees: 86,
  overdueInvoices: 173,
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: 'Customer Aktif',
    value: dashboardSummary.customers.toLocaleString('id-ID'),
    change: '+124 bulan ini',
    note: 'Digabung dari customer, subscription, dan hasil import review.',
  },
  {
    label: 'Order Berjalan',
    value: dashboardSummary.orders.toLocaleString('id-ID'),
    change: '36 perlu follow up',
    note: 'Mencakup order baru, relokasi, dan upgrade yang belum selesai.',
  },
  {
    label: 'Trouble Ticket Open',
    value: dashboardSummary.troubleTickets.toLocaleString('id-ID'),
    change: '12 overdue',
    note: 'Ringkasan awal support yang nanti membaca definisi backend yang sama.',
  },
  {
    label: 'Invoice Overdue',
    value: dashboardSummary.overdueInvoices.toLocaleString('id-ID'),
    change: '23 suspend candidate',
    note: 'Disiapkan untuk billing dan collection lintas divisi.',
  },
]

export const moduleCards: ModuleCard[] = [
  {
    title: 'Import Center',
    href: '/import',
    description: 'Review batch staging, mapping, validasi, dan trigger transform tahap 1-4.',
    status: 'Siap untuk review data migrasi',
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    title: 'Support',
    href: '/support',
    description: 'Shell modul trouble ticket, isolir, dismantle history, dan SLA operasional.',
    status: 'Siap untuk pengisian API nyata',
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    description: 'Titik awal item, stock movement, ODP, port, dan device assignment.',
    status: 'Terhubung ke roadmap fase operasional',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Billing',
    href: '/billing',
    description: 'Invoice, pembayaran, collection, dan overdue control dalam satu panel.',
    status: 'Sudah punya fondasi staging dan transform',
    accent: 'bg-rose-50 text-rose-700',
  },
]

export const dashboardActivities: ActivityItem[] = [
  {
    title: 'Transform Tahap 4 selesai disiapkan',
    detail: 'Invoice, item, payment, dan collection sekarang sudah punya artefak review.',
    at: 'Baru saja',
  },
  {
    title: 'Sample batch WEB_PSB billing aktif',
    detail: 'Batch sample terpisah untuk uji jalur invoice dan payment.',
    at: 'Hari ini',
  },
  {
    title: 'Constraint platform tunggal sudah dikunci',
    detail: 'Semua modul diarahkan ke satu website, satu domain, dan satu database.',
    at: 'Hari ini',
  },
]
