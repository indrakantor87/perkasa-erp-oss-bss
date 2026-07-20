import type { TechnicianWorkspaceConfig } from '@/components/technician-workspace-page'

export const teknisiPsbWorkspaceConfig: TechnicianWorkspaceConfig = {
  eyebrow: 'Teknisi & PSB',
  title: 'Teknisi PSB',
  description:
    'Tampilan kerja ini memfokuskan teknisi PSB ke work order pemasangan baru, assignment pribadi, serta material yang terkait langsung dengan aktivasi pelanggan baru.',
  workOrderJobCategory: 'PSB',
  inventoryReferenceType: 'WORK_ORDER',
  primaryActionLabel: 'Buka WO PSB Saya',
  primaryActionDescription: 'Masuk ke daftar work order PSB dengan filter job category dan pencarian nama login teknisi Anda.',
  steps: [
    {
      title: 'Lihat Assignment PSB',
      detail: 'Fokus ke work order pasang baru yang relevan dengan identitas login Anda.',
    },
    {
      title: 'Siapkan Material',
      detail: 'Pastikan movement barang dan request material yang berhubungan dengan PSB sudah siap di lapangan.',
    },
    {
      title: 'Kembalikan Validasi',
      detail: 'Setelah pemasangan, kembalikan hasil lapangan ke NOC agar validasi perangkat dan status bisa ditutup.',
    },
  ],
  sections: [
    {
      title: 'Pekerjaan utama',
      description: 'Shortcut kerja inti untuk teknisi PSB.',
      links: [
        {
          label: 'Work Order PSB Saya',
          href: '__AUTO_WORK_ORDERS__',
          description: 'Tracking work order PSB yang paling dekat dengan identitas login Anda.',
          badge: 'psb',
        },
        {
          label: 'Movement Barang WO',
          href: '__AUTO_MOVEMENTS__',
          description: 'Pantau movement barang yang terkait work order pemasangan baru.',
          badge: 'barang',
        },
        {
          label: 'Request Material',
          href: '/inventory/requests?inventoryAction=item-request&requestType=WO_MATERIAL#inventory-action-item-request',
          description: 'Ajukan material tambahan bila item di lapangan belum lengkap.',
          badge: 'material',
        },
      ],
    },
    {
      title: 'Kontrol lapangan',
      description: 'Jalur pendukung agar pekerjaan PSB tidak putus saat butuh verifikasi teknis atau data customer.',
      links: [
        {
          label: 'Queue Ticketing PSB',
          href: '/dashboard/tracking/noc-queue?ticketType=PSB',
          description: 'Buka queue ticketing PSB untuk membaca sumber kerja dari jalur CS/NOC.',
          badge: 'ticket',
        },
        {
          label: 'Customer / List PSB',
          href: '/list-psb',
          description: 'Buka domain List PSB untuk membaca konteks data pemasangan baru.',
          badge: 'customer',
        },
      ],
    },
  ],
}

export const teknisiTroubleshootsWorkspaceConfig: TechnicianWorkspaceConfig = {
  eyebrow: 'Teknisi & Troubleshoots',
  title: 'Teknisi Troubleshoots',
  description:
    'Tampilan kerja ini memfokuskan teknisi trouble ke job gangguan, assignment pribadi, dan jalur tindak lanjut dari NOC tanpa tercampur pekerjaan PSB.',
  workOrderJobCategory: 'TROUBLE',
  queueTicketType: 'TROUBLESHOOTS',
  inventoryReferenceType: 'TROUBLE_TICKET',
  primaryActionLabel: 'Buka WO Trouble Saya',
  primaryActionDescription: 'Masuk ke daftar work order trouble dengan filter job category dan pencarian nama login teknisi Anda.',
  secondaryActionLabel: 'Buka Queue Trouble',
  secondaryActionDescription: 'Masuk ke queue ticketing trouble untuk melihat sumber kerja dari NOC.',
  steps: [
    {
      title: 'Lihat Assignment Trouble',
      detail: 'Fokus ke pekerjaan gangguan yang sudah dekat dengan identitas login Anda.',
    },
    {
      title: 'Eksekusi dan Replace',
      detail: 'Pastikan perangkat lama dan pengganti terekam saat pekerjaan trouble berlangsung.',
    },
    {
      title: 'Kembalikan Evidence',
      detail: 'Serahkan hasil kerja dan barcode terkait agar NOC bisa melanjutkan validasi dan close ticket.',
    },
  ],
  sections: [
    {
      title: 'Pekerjaan utama',
      description: 'Shortcut kerja inti untuk teknisi trouble.',
      links: [
        {
          label: 'Work Order Trouble Saya',
          href: '__AUTO_WORK_ORDERS__',
          description: 'Tracking work order trouble yang paling dekat dengan identitas login Anda.',
          badge: 'trouble',
        },
        {
          label: 'Queue Trouble',
          href: '__AUTO_QUEUE__',
          description: 'Masuk ke queue ticketing trouble agar sumber gangguan tetap terlihat.',
          badge: 'ticket',
        },
        {
          label: 'Movement Barang Trouble',
          href: '__AUTO_MOVEMENTS__',
          description: 'Pantau movement item yang terkait proses replace atau penanganan gangguan.',
          badge: 'barang',
        },
      ],
    },
    {
      title: 'Kontrol lapangan',
      description: 'Jalur pendukung untuk menjaga SLA dan data ticket tetap sinkron.',
      links: [
        {
          label: 'Support TT',
          href: '/support/tt',
          description: 'Masuk ke lane support ticket bila perlu membaca konteks ticket secara penuh.',
          badge: 'support',
        },
        {
          label: 'SLA Kritis',
          href: '/support/sla',
          description: 'Cek backlog trouble yang mendekati atau melewati target SLA.',
          badge: 'sla',
        },
      ],
    },
  ],
}

export const teknisiDismantleWorkspaceConfig: TechnicianWorkspaceConfig = {
  eyebrow: 'Teknisi & Dismantle',
  title: 'Teknisi Dismantle',
  description:
    'Tampilan kerja ini memfokuskan teknisi dismantle ke pembongkaran perangkat, return inventory, dan histori close support tanpa tercampur pekerjaan lain.',
  workOrderJobCategory: 'DISMANTLE',
  inventoryReferenceType: 'WORK_ORDER',
  primaryActionLabel: 'Buka WO Dismantle Saya',
  primaryActionDescription: 'Masuk ke daftar work order dismantle dengan filter job category dan pencarian nama login teknisi Anda.',
  steps: [
    {
      title: 'Lihat Assignment Dismantle',
      detail: 'Fokus ke pekerjaan bongkar perangkat yang sudah dekat dengan identitas login Anda.',
    },
    {
      title: 'Scan Barang Return',
      detail: 'Pastikan barcode perangkat yang diambil tercatat agar histori support dan inventory tidak putus.',
    },
    {
      title: 'Tutup Loop Return',
      detail: 'Pastikan hasil lapangan kembali ke support close dan inventory barcode.',
    },
  ],
  sections: [
    {
      title: 'Pekerjaan utama',
      description: 'Shortcut kerja inti untuk teknisi dismantle.',
      links: [
        {
          label: 'Work Order Dismantle Saya',
          href: '__AUTO_WORK_ORDERS__',
          description: 'Tracking work order dismantle yang paling dekat dengan identitas login Anda.',
          badge: 'dismantle',
        },
        {
          label: 'Movement Barang Return',
          href: '__AUTO_MOVEMENTS__',
          description: 'Pantau movement perangkat return yang terkait pembongkaran.',
          badge: 'barang',
        },
        {
          label: 'Inventory Barcode Audit',
          href: '/inventory/barcodes',
          description: 'Buka histori barcode untuk memastikan perangkat return benar-benar kembali.',
          badge: 'barcode',
        },
      ],
    },
    {
      title: 'Kontrol lapangan',
      description: 'Jalur pendukung untuk menjaga histori support dan close dismantle tetap sinkron.',
      links: [
        {
          label: 'Support Dismantle',
          href: '/support/dismantle',
          description: 'Buka lane support dismantle untuk cek histori close dan referensi ticketing.',
          badge: 'support',
        },
        {
          label: 'List Dismantle',
          href: '/dashboard/worklist?queue=Transfer+atau+Restore&domain=Support',
          description: 'Masuk ke area monitoring yang paling dekat dengan sumber kerja dismantle dari CS.',
          badge: 'cs',
        },
      ],
    },
  ],
}
