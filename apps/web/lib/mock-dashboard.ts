import type {
  ActivityItem,
  AppRole,
  DashboardMetric,
  DashboardQueueItem,
  DashboardSummary,
  DashboardWorkItem,
  ModuleCard,
} from '@/lib/types'

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
    title: 'Daily Activity',
    href: '/dashboard/daily-activity',
    description: 'Plan aktivitas pagi dan closing sore dengan status selesai atau pending.',
    status: 'Siap dipakai untuk kontrol kerja harian',
    accent: 'bg-cyan-50 text-cyan-700',
  },
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

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

function buildQueueItem(
  title: string,
  href: string,
  count: number,
  description: string,
  accent: string
): DashboardQueueItem {
  return {
    title,
    href,
    count: formatNumber(count),
    description,
    accent,
  }
}

export function getMockRoleQueues(role: AppRole, summary: DashboardSummary): DashboardQueueItem[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        buildQueueItem('Validasi Import', '/import', 3, 'Batch yang perlu direview sebelum transform.', 'bg-blue-50 text-blue-700'),
        buildQueueItem('TT Open', '/support', summary.troubleTickets, 'Ticket teknis aktif lintas divisi.', 'bg-amber-50 text-amber-700'),
        buildQueueItem('Invoice Overdue', '/billing', summary.overdueInvoices, 'Tagihan yang butuh tindak lanjut cepat.', 'bg-rose-50 text-rose-700'),
      ]
    case 'SALES_MARKETING':
      return [
        buildQueueItem('Lead Follow Up', '/sales', summary.orders, 'Prospek dan order awal yang masih aktif.', 'bg-sky-50 text-sky-700'),
        buildQueueItem('Customer Baru', '/customers', 18, 'Calon pelanggan yang perlu verifikasi data.', 'bg-indigo-50 text-indigo-700'),
        buildQueueItem('Coverage Siap Cek', '/sales', 9, 'Area yang perlu dipastikan kesiapan layanan.', 'bg-emerald-50 text-emerald-700'),
      ]
    case 'CS_OPERATOR':
    case 'CS_ADMIN':
      return [
        buildQueueItem('Input Dan Follow Up', '/sales', summary.orders, 'Order aktif dan input baru yang perlu diproses.', 'bg-blue-50 text-blue-700'),
        buildQueueItem('Isolir Aktif', '/support', summary.isolations, 'Pelanggan suspend yang perlu tindak lanjut.', 'bg-amber-50 text-amber-700'),
        buildQueueItem('ODP Operasional', '/inventory', Math.max(8, Math.round(summary.inventoryItems / 80)), 'ODP dan port yang perlu cek cepat.', 'bg-emerald-50 text-emerald-700'),
      ]
    case 'NOC_OPERATOR':
      return [
        buildQueueItem('TT Teknis', '/support', summary.troubleTickets, 'Ticket teknis yang menunggu penanganan.', 'bg-emerald-50 text-emerald-700'),
        buildQueueItem('Isolir Monitoring', '/support', summary.isolations, 'Suspend aktif untuk monitoring jaringan.', 'bg-amber-50 text-amber-700'),
        buildQueueItem('ODP Perlu Cek', '/inventory', Math.max(6, Math.round(summary.inventoryItems / 100)), 'ODP dan port yang butuh review kondisi.', 'bg-slate-100 text-slate-700'),
      ]
    case 'FIELD_TECHNICIAN':
      return [
        buildQueueItem('Kunjungan Lapangan', '/support', 7, 'Pekerjaan lapangan yang menunggu update teknisi.', 'bg-amber-50 text-amber-700'),
        buildQueueItem('Work Order Aktif', '/sales', 6, 'Order atau aktivasi yang sudah masuk tahap eksekusi.', 'bg-sky-50 text-sky-700'),
        buildQueueItem('ODP Di Lokasi', '/inventory', 5, 'Titik ODP yang relevan untuk pekerjaan hari ini.', 'bg-emerald-50 text-emerald-700'),
      ]
    case 'TT_OPERATOR':
      return [
        buildQueueItem('Trouble Ticket Open', '/support', summary.troubleTickets, 'Fokus ke ticket yang belum close.', 'bg-orange-50 text-orange-700'),
        buildQueueItem('SLA Perlu Dicek', '/support', 4, 'Ticket yang mendekati batas SLA.', 'bg-rose-50 text-rose-700'),
      ]
    case 'DIGITAL_CREATOR':
      return [
        buildQueueItem('Campaign Draft', '/sales', 5, 'Campaign yang perlu finalisasi konten.', 'bg-fuchsia-50 text-fuchsia-700'),
        buildQueueItem('Lead Digital', '/sales', 12, 'Lead digital yang siap diteruskan ke marketing.', 'bg-sky-50 text-sky-700'),
        buildQueueItem('Analytics Review', '/dashboard', 3, 'Ringkasan performa konten dan funnel.', 'bg-slate-100 text-slate-700'),
      ]
    case 'DISMANTLE_OPERATOR':
      return [
        buildQueueItem('Queue Dismantle', '/support', Math.max(5, Math.round(summary.isolations / 3)), 'Daftar pelanggan yang masuk tindak lanjut dismantle.', 'bg-rose-50 text-rose-700'),
        buildQueueItem('Catatan Lapangan', '/support', 4, 'Ticket yang butuh update hasil kunjungan.', 'bg-amber-50 text-amber-700'),
      ]
  }
}

export function getMockWorklist(role: AppRole): DashboardWorkItem[] {
  switch (role) {
    case 'SALES_MARKETING':
      return [
        {
          id: 'sales-lead-1',
          domain: 'Sales',
          title: 'Follow up lead area Kayen',
          subtitle: 'Prospek FTTH baru dari campaign Juli',
          status: 'OPEN',
          priority: 'tinggi',
          detail: 'Perlu verifikasi area coverage dan jadwalkan survey awal.',
          href: '/sales',
        },
        {
          id: 'sales-lead-2',
          domain: 'Customers',
          title: 'Lengkapi data customer baru',
          subtitle: 'Nomor HP dan alamat belum final',
          status: 'REVIEW',
          priority: 'sedang',
          detail: 'Data awal masuk dari lead, perlu dirapikan sebelum diteruskan.',
          href: '/customers',
        },
      ]
    case 'CS_OPERATOR':
    case 'CS_ADMIN':
      return [
        {
          id: 'cs-order-1',
          domain: 'Sales',
          title: 'Input order PSB baru',
          subtitle: 'Masuk dari marketing, perlu cek kelengkapan',
          status: 'PENDING',
          priority: 'tinggi',
          detail: 'Pastikan paket, jadwal, dan data customer sudah cocok.',
          href: '/sales',
        },
        {
          id: 'cs-iso-1',
          domain: 'Support',
          title: 'Review pelanggan isolir aktif',
          subtitle: 'Perlu keputusan follow up atau transfer lanjut',
          status: 'OPEN',
          priority: 'tinggi',
          detail: 'Cek status suspend dan kelengkapan informasi ticket terkait.',
          href: '/support',
        },
        {
          id: 'cs-odp-1',
          domain: 'Inventory',
          title: 'Cek ketersediaan ODP untuk pemasangan',
          subtitle: 'Queue teknis untuk order yang siap dijadwalkan',
          status: 'READY',
          priority: 'sedang',
          detail: 'Validasi port kosong sebelum konfirmasi ke tim lapangan.',
          href: '/inventory',
        },
      ]
    case 'NOC_OPERATOR':
    case 'TT_OPERATOR':
      return [
        {
          id: 'noc-tt-1',
          domain: 'Support',
          title: 'Trouble ticket fiber down',
          subtitle: 'Perlu analisis teknis awal',
          status: 'OPEN',
          priority: 'tinggi',
          detail: 'Cek histori gangguan dan koordinasikan eskalasi bila perlu.',
          href: '/support',
        },
        {
          id: 'noc-odp-1',
          domain: 'Inventory',
          title: 'ODP overload candidate',
          subtitle: 'Port aktif hampir penuh',
          status: 'MONITOR',
          priority: 'sedang',
          detail: 'Pastikan kapasitas port masih aman untuk order aktif.',
          href: '/inventory',
        },
      ]
    case 'FIELD_TECHNICIAN':
      return [
        {
          id: 'tech-wo-1',
          domain: 'Sales',
          title: 'Kunjungan instalasi siang ini',
          subtitle: 'Work order perlu update hasil lapangan',
          status: 'SCHEDULED',
          priority: 'tinggi',
          detail: 'Lengkapi catatan hasil teknis setelah kunjungan selesai.',
          href: '/sales',
        },
        {
          id: 'tech-tt-1',
          domain: 'Support',
          title: 'Follow up trouble ticket onsite',
          subtitle: 'Gangguan butuh pengecekan perangkat pelanggan',
          status: 'ON_PROGRESS',
          priority: 'sedang',
          detail: 'Sinkronkan hasil lapangan ke ticket agar tim NOC bisa menutup loop.',
          href: '/support',
        },
      ]
    case 'DISMANTLE_OPERATOR':
      return [
        {
          id: 'dis-1',
          domain: 'Support',
          title: 'Queue dismantle pelanggan suspend',
          subtitle: 'Perlu cek ticket dan note lapangan',
          status: 'READY',
          priority: 'tinggi',
          detail: 'Pastikan pelanggan yang masuk queue sudah lolos review administrasi.',
          href: '/support',
        },
        {
          id: 'dis-2',
          domain: 'Support',
          title: 'Lengkapi catatan close dismantle',
          subtitle: 'Ada hasil kunjungan yang belum sinkron',
          status: 'REVIEW',
          priority: 'sedang',
          detail: 'Tambahkan kendala lapangan dan hasil penarikan perangkat.',
          href: '/support',
        },
      ]
    case 'DIGITAL_CREATOR':
      return [
        {
          id: 'creator-1',
          domain: 'Sales',
          title: 'Review campaign awareness',
          subtitle: 'Materi promosi perlu finalisasi',
          status: 'DRAFT',
          priority: 'sedang',
          detail: 'Siapkan aset dan copy agar lead bisa diteruskan ke marketing.',
          href: '/sales',
        },
      ]
    case 'SUPER_ADMIN':
      return [
        {
          id: 'admin-import-1',
          domain: 'Import',
          title: 'Review batch import terbaru',
          subtitle: 'Validasi sebelum transform tahap lanjut',
          status: 'VALIDATE',
          priority: 'tinggi',
          detail: 'Pastikan mapping dan duplicate handling sudah sesuai.',
          href: '/import',
        },
        {
          id: 'admin-access-1',
          domain: 'Access',
          title: 'Audit role dan permission',
          subtitle: 'Pastikan parity role tetap konsisten',
          status: 'REVIEW',
          priority: 'sedang',
          detail: 'Cek perubahan permission matrix setelah penambahan role baru.',
          href: '/settings/access',
        },
      ]
  }
}
