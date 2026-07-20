import type { DashboardMetric, DashboardOperationalCard } from '@/lib/types'

function findCard(
  cards: DashboardOperationalCard[],
  key: DashboardOperationalCard['key'],
) {
  return cards.find((card) => card.key === key)
}

function findMetric(
  card: DashboardOperationalCard | undefined,
  labelIncludes: string,
) {
  if (!card) return undefined
  const needle = labelIncludes.trim().toUpperCase()
  return card.metrics.find((metric) => metric.label.trim().toUpperCase().includes(needle))
}

function findDashboardMetric(
  metrics: DashboardMetric[],
  labelIncludes: string,
) {
  const needle = labelIncludes.trim().toUpperCase()
  return metrics.find((metric) => metric.label.trim().toUpperCase().includes(needle))
}

export function buildSuperAdminCoreOperationalCards(params: {
  cards: DashboardOperationalCard[]
  metrics: DashboardMetric[]
}): DashboardOperationalCard[] {
  const salesCard = findCard(params.cards, 'SALES')
  const csCard = findCard(params.cards, 'CS')
  const nocCard = findCard(params.cards, 'NOC')
  const ttCard = findCard(params.cards, 'TT')
  const dismantleCard = findCard(params.cards, 'DISMANTLE')
  const billingCard = findCard(params.cards, 'BILLING')
  const hrCard = findCard(params.cards, 'HR')
  const inventoryCard = findCard(params.cards, 'INVENTORY')

  const customerMetric = findDashboardMetric(params.metrics, 'CUSTOMER')
  const orderMetric = findDashboardMetric(params.metrics, 'ORDER')
  const troubleMetric = findDashboardMetric(params.metrics, 'TROUBLE TICKET')

  const fallbackCards = [billingCard, inventoryCard, hrCard].filter(Boolean) as DashboardOperationalCard[]

  return [
    billingCard,
    {
      key: 'NOC',
      title: 'Ticketing',
      description: 'Tabel kombinasi operasional untuk PSB, trouble ticket, dismantle, dan trouble jalur dalam satu pembacaan NOC.',
      badge: 'Ticketing',
      href: '/dashboard/tracking/noc-queue',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-900',
      metrics: [
        {
          label: 'PSB',
          value: findMetric(salesCard, 'PSB')?.value ?? '0',
          href: '/dashboard/tracking/work-orders?jobCategory=PSB',
          hint: 'Membaca PSB dari work order operasional yang masuk ke jalur lapangan.',
        },
        {
          label: 'Trouble Ticket',
          value: findMetric(nocCard, 'TROUBLE TICKET')?.value ?? findMetric(ttCard, 'TT OPEN')?.value ?? '0',
          href: '/dashboard/tracking/trouble-tickets',
          hint: 'Jumlah trouble ticket teknis yang masih aktif pada pembacaan dashboard.',
        },
        {
          label: 'Dismantle',
          value: findMetric(dismantleCard, 'QUEUE DISMANTLE')?.value ?? findMetric(csCard, 'DISMANTLE')?.value ?? '0',
          href: '/support/dismantle?focus=OPEN_QUEUE',
          hint: 'Antrean pembongkaran yang masih perlu tindak lanjut lapangan dan penutupan catatan.',
        },
        {
          label: 'Trouble Jalur',
          value: findMetric(nocCard, 'TICKET PERIODE')?.value ?? '0',
          href: '/dashboard/tracking/noc-queue?ticketType=JALUR',
          hint: 'Pembacaan jalur mengikuti antrean teknis gabungan pada antrean NOC agar operator tidak berpindah layar.',
        },
      ],
    },
    {
      key: 'CS',
      title: 'Isolir',
      description: 'Monitoring suspend aktif, restore, dan tindak lanjut pelanggan yang masih tertahan pada lane isolir.',
      badge: 'Isolir',
      href: '/support/isolations',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      metrics: [
        {
          label: 'Isolir Aktif',
          value: findMetric(csCard, 'ISOLIR')?.value ?? '0',
          href: '/support/isolations?focus=ACTIVE_ISOLATIONS',
          hint: 'Jumlah pelanggan yang masih berada pada jalur suspend aktif.',
        },
        {
          label: 'Suspend Candidate',
          value: findMetric(billingCard, 'SUSPEND')?.value ?? '0',
          href: '/billing?focus=SUSPEND_CANDIDATES',
          hint: 'Calon pelanggan yang berpotensi masuk ke proses suspend dari sisi billing.',
        },
        {
          label: 'Dismantle Periode Ini',
          value: findMetric(csCard, 'DISMANTLE')?.value ?? '0',
          href: '/support/dismantle?focus=RECENT_DISMANTLE',
          hint: 'Aktivitas pembongkaran periode berjalan yang masih berkaitan dengan isolir dan terminasi.',
        },
      ],
    },
    inventoryCard,
    {
      key: 'SALES',
      title: 'Customer',
      description: 'Ringkasan data pelanggan aktif, order berjalan, dan tekanan tiket yang berdampak ke pengalaman layanan customer.',
      badge: 'Customer',
      href: '/customers',
      tone: 'border-sky-200 bg-sky-50 text-sky-900',
      metrics: [
        {
          label: customerMetric?.label ?? 'Customer Aktif',
          value: customerMetric?.value ?? '0',
          href: '/customers',
          hint: customerMetric?.note ?? 'Master pelanggan aktif yang terbaca pada dashboard.',
        },
        {
          label: orderMetric?.label ?? 'Order Berjalan',
          value: orderMetric?.value ?? '0',
          href: '/sales?focus=MONTHLY_ORDERS',
          hint: orderMetric?.note ?? 'Order yang masih aktif dan berdampak ke pergerakan layanan customer.',
        },
        {
          label: troubleMetric?.label ?? 'Trouble Ticket Open',
          value: troubleMetric?.value ?? '0',
          href: '/support/tt?focus=OPEN_TICKETS',
          hint: troubleMetric?.note ?? 'Trouble ticket aktif yang masih memengaruhi pengalaman pelanggan.',
        },
      ],
    },
    hrCard,
    ...fallbackCards.filter((card) => ![billingCard?.key, inventoryCard?.key, hrCard?.key].includes(card.key)),
  ].filter((card): card is DashboardOperationalCard => Boolean(card))
}
