import type {
  OrganizationWorkspaceLink,
  OrganizationWorkspaceSection,
  OrganizationWorkspaceStep,
} from '@/components/organization-workspace-page'

function buildWorklistHref(params: {
  queue?: string
  domain?: string
  priority?: string
  status?: string
  q?: string
  overdue?: boolean
}) {
  const searchParams = new URLSearchParams()

  if (params.queue) searchParams.set('queue', params.queue)
  if (params.domain) searchParams.set('domain', params.domain)
  if (params.priority) searchParams.set('priority', params.priority)
  if (params.status) searchParams.set('status', params.status)
  if (params.q) searchParams.set('q', params.q)
  if (params.overdue) searchParams.set('overdue', '1')

  const query = searchParams.toString()
  return query ? `/dashboard/worklist?${query}` : '/dashboard/worklist'
}

export type OrganizationWorkspaceDefinition = {
  eyebrow: string
  title: string
  description: string
  primaryAction: OrganizationWorkspaceLink
  secondaryAction?: OrganizationWorkspaceLink
  steps: OrganizationWorkspaceStep[]
  sections: OrganizationWorkspaceSection[]
}

export const csAdminWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'Pemasaran dan Pelayanan',
  title: 'CS & Admin CS',
  description:
    'Workspace ini sekarang menjadi pembacaan tunggal untuk customer master, verifikasi data, port ODP, approval supervisor CS, dan jalur dismantle agar pelayanan tidak terpisah di sidebar.',
  primaryAction: {
    label: 'Buka Customer',
    href: '/customers',
    description: 'Masuk ke master customer dan subscription aktif.',
  },
  secondaryAction: {
    label: 'Buka Port ODP',
    href: '/inventory',
    description: 'Tinjau ODP, port, dan assignment jaringan yang terkait input customer.',
  },
  steps: [
    {
      title: 'Customer Intake',
      detail: 'Pastikan identitas pelanggan, alamat, dan layanan aktif masuk ke master yang sama.',
    },
    {
      title: 'Approval CS',
      detail: 'Gunakan worklist dan review customer untuk menangani koreksi, verifikasi, dan approval supervisor.',
    },
    {
      title: 'Validasi Port ODP',
      detail: 'Pastikan port dan ODP layanan terbaca sebelum pelanggan diteruskan ke instalasi atau tindak lanjut support.',
    },
    {
      title: 'Dismantle',
      detail: 'Teruskan kasus yang tidak bisa dipulihkan ke lane dismantle agar terminasi tetap tercatat rapi.',
    },
  ],
  sections: [
    {
      title: 'Workspace utama',
      description: 'Pintu kerja harian untuk tim CS, Admin CS, dan tindak lanjut pelayanan pelanggan.',
      links: [
        {
          label: 'Customer Master',
          href: '/customers',
          description: 'Kelola data customer, layanan aktif, dan identitas subscription dalam satu domain.',
          badge: 'utama',
        },
        {
          label: 'List Kerja Terpadu',
          href: '/dashboard/worklist',
          description: 'Baca antrean lintas approval dan tindak lanjut tanpa pindah modul satu per satu.',
          badge: 'lintas domain',
        },
        {
          label: 'ODP dan Port',
          href: '/inventory',
          description: 'Cek ODP terbaru, port terpakai, dan kapasitas layanan sebelum input customer difinalkan.',
          badge: 'port odp',
        },
        {
          label: 'Queue Dismantle',
          href: '/support/dismantle',
          description: 'Finalisasi terminasi, approval, dan penutupan layanan yang berasal dari isolir atau keputusan supervisor.',
          badge: 'terintegrasi',
        },
      ],
    },
    {
      title: 'Transisi layanan',
      description: 'Jalur pendukung agar CS dan Admin CS bisa membaca kasus yang bergerak dari support ke terminasi.',
      links: [
        {
          label: 'Queue Isolir',
          href: '/support/isolations',
          description: 'Cek kasus isolir aktif yang masih mungkin dipulihkan atau dipindah ke dismantle.',
        },
        {
          label: 'Support NOC & TT',
          href: '/support',
          description: 'Pantau ticket teknis yang masih memengaruhi pelayanan customer sebelum terminasi diputuskan.',
        },
      ],
    },
  ],
}

export const legalWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'General Affair',
  title: 'Legal',
  description:
    'Landing ini memunculkan Legal secara eksplisit di struktur ERP sambil tetap terhubung ke domain yang sudah hidup untuk administrasi dokumen, asset, dan tindak lanjut data pelanggan.',
  primaryAction: {
    label: 'Customer & Collection',
    href: '/billing?focus=OVERDUE_INVOICES',
    description: 'Masuk ke customer dan collection yang paling sering menuntut tindak lanjut legal.',
  },
  secondaryAction: {
    label: 'Buka Customer',
    href: '/customers',
    description: 'Baca customer aktif untuk kebutuhan dokumen atau tindak lanjut layanan.',
  },
  steps: [
    {
      title: 'Audit Dokumen',
      detail: 'Gunakan inventory aktif untuk membaca asset, perangkat, dan bukti operasional yang perlu terdokumentasi.',
    },
    {
      title: 'Validasi Customer',
      detail: 'Pastikan identitas customer, layanan, dan riwayat billing yang terkait dokumen tidak terpisah dari domain operasional.',
    },
    {
      title: 'Collection dan Terminasi',
      detail: 'Gunakan billing, worklist, dan support bila kasus legal berhubungan dengan collection, isolir, atau terminasi layanan.',
    },
  ],
  sections: [
    {
      title: 'Fokus legal dan collection',
      description: 'Landing Legal sekarang membaca customer, collection, dan terminasi sebagai alur kerja utama.',
      links: [
        {
          label: 'Billing Overdue',
          href: '/billing?focus=OVERDUE_INVOICES',
          description: 'Tinjau invoice overdue ketika dokumen atau kesepakatan layanan berhubungan dengan penagihan.',
          badge: 'collection',
        },
        {
          label: 'Customer',
          href: '/customers',
          description: 'Baca master customer dan layanan bila tindak lanjut legal terkait identitas atau status layanan.',
          badge: 'pelanggan',
        },
        {
          label: 'Queue Isolir',
          href: '/support/isolations',
          description: 'Pantau kasus isolir aktif yang berpotensi berujung ke keputusan legal, collection, atau terminasi.',
          badge: 'isolir',
        },
      ],
    },
    {
      title: 'Administrasi dan audit',
      description: 'Jalur pendukung untuk memastikan legal tetap terhubung ke dokumen, asset, dan antrean tindak lanjut.',
      links: [
        {
          label: 'Inventory Aktif',
          href: '/inventory?focus=ACTIVE_ITEMS',
          description: 'Audit item aktif, perangkat, dan stock yang berkaitan dengan dokumen operasional.',
          badge: 'aktif',
        },
        {
          label: 'Worklist Customer',
          href: buildWorklistHref({ domain: 'Customers', q: 'customer' }),
          description: 'Baca antrean customer yang membutuhkan koordinasi administrasi, identitas, atau validasi dokumen.',
          badge: 'worklist',
        },
        {
          label: 'Queue Dismantle',
          href: '/support/dismantle',
          description: 'Pantau terminasi layanan yang butuh jejak administrasi dan keputusan penutupan yang rapi.',
          badge: 'terminasi',
        },
      ],
    },
  ],
}

export const kantorWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'Operasional',
  title: 'Kantor',
  description:
    'Workspace organisasi untuk ritme kantor, stok aktif, dan tindak lanjut administrasi harian yang menopang divisi lain di ERP.',
  primaryAction: {
    label: 'Queue Inventory Kantor',
    href: buildWorklistHref({ domain: 'Inventory' }),
    description: 'Masuk ke antrean inventory dan request yang paling sering disentuh operasional kantor.',
  },
  secondaryAction: {
    label: 'Daily Activity',
    href: '/dashboard/daily-activity',
    description: 'Masuk ke plan dan closing aktivitas harian kantor.',
  },
  steps: [
    {
      title: 'Kontrol Stok',
      detail: 'Pastikan item aktif dan mutasi kantor tetap sinkron dengan request dan pengeluaran barang.',
    },
    {
      title: 'Koordinasi Harian',
      detail: 'Gunakan daily activity dan worklist untuk menjaga ritme kerja kantor lintas divisi.',
    },
    {
      title: 'Distribusi Internal',
      detail: 'Teruskan kebutuhan ke gudang, teknisi, billing, atau toko sesuai antrean yang muncul.',
    },
  ],
  sections: [
    {
      title: 'Fokus kontrol kantor',
      description: 'Landing kantor sekarang diarahkan ke request inventory, ritme kerja harian, dan koordinasi internal.',
      links: [
        {
          label: 'Queue Inventory Kantor',
          href: buildWorklistHref({ domain: 'Inventory' }),
          description: 'Baca antrean inventory dan request yang sedang menyentuh kebutuhan operasional kantor.',
          badge: 'kantor',
        },
        {
          label: 'Inventory Aktif',
          href: '/inventory?focus=ACTIVE_ITEMS',
          description: 'Pantau item aktif dan kesiapan stok yang paling sering disentuh operasional kantor.',
          badge: 'stok',
        },
        {
          label: 'Mutasi Bulan Ini',
          href: '/inventory?focus=MONTHLY_MOVEMENTS',
          description: 'Baca pergerakan barang periode berjalan untuk audit internal dan distribusi.',
          badge: 'mutasi',
        },
        {
          label: 'Daily Activity',
          href: '/dashboard/daily-activity',
          description: 'Sinkronkan ritme kerja kantor dari plan pagi sampai closing sore.',
          badge: 'harian',
        },
      ],
    },
    {
      title: 'Koordinasi lintas divisi',
      description: 'Jalur pendukung untuk memastikan operasional kantor tidak terputus dari proses ERP lain.',
      links: [
        {
          label: 'Worklist Daily Activity',
          href: buildWorklistHref({ domain: 'Daily Activity' }),
          description: 'Baca antrean aktivitas harian yang perlu dibantu, dikoreksi, atau dipastikan closing-nya.',
          badge: 'aktivitas',
        },
        {
          label: 'Request Inventory',
          href: '/inventory?focus=PENDING_REQUESTS',
          description: 'Pantau request yang masih menunggu proses gudang atau persetujuan internal.',
          badge: 'request',
        },
        {
          label: 'Billing Customer',
          href: '/billing?focus=OVERDUE_INVOICES',
          description: 'Baca kasus collection yang perlu dikoordinasikan dari sisi kantor dan administrasi internal.',
          badge: 'billing',
        },
      ],
    },
  ],
}

export const tokoWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'Operasional',
  title: 'Toko',
  description:
    'Workspace toko memusatkan stok display, pergerakan barang, dan tindak lanjut operasional ringan tanpa harus membuka semua domain sekaligus.',
  primaryAction: {
    label: 'Mutasi & Stok Toko',
    href: '/inventory?focus=MONTHLY_MOVEMENTS',
    description: 'Masuk ke mutasi dan stok yang paling dekat dengan ritme operasional toko.',
  },
  secondaryAction: {
    label: 'Worklist Inventory',
    href: buildWorklistHref({ domain: 'Inventory' }),
    description: 'Masuk ke antrean inventory yang perlu direspon dari sisi toko.',
  },
  steps: [
    {
      title: 'Display & Stok',
      detail: 'Pantau item aktif dan ketersediaan barang yang sering disentuh operasional toko.',
    },
    {
      title: 'Movement',
      detail: 'Audit mutasi bulan berjalan agar keluar masuk barang tidak terlewat.',
    },
    {
      title: 'Follow Up Toko',
      detail: 'Terhubung ke worklist saat ada kebutuhan CS, sales, billing, atau gudang yang harus ditindak dari front operasional.',
    },
  ],
  sections: [
    {
      title: 'Fokus stok dan movement',
      description: 'Landing toko sekarang membaca stok display, movement, dan antrean inventory sebagai isi utama.',
      links: [
        {
          label: 'Mutasi Bulan Ini',
          href: '/inventory?focus=MONTHLY_MOVEMENTS',
          description: 'Tinjau perpindahan barang periode aktif agar toko cepat melihat perubahan stok.',
          badge: 'periode ini',
        },
        {
          label: 'Inventory Aktif',
          href: '/inventory?focus=ACTIVE_ITEMS',
          description: 'Gunakan fokus item aktif untuk membaca stok yang paling sering dipakai atau ditampilkan.',
          badge: 'aktif',
        },
        {
          label: 'Worklist Inventory',
          href: buildWorklistHref({ domain: 'Inventory' }),
          description: 'Baca antrean inventory yang perlu direspon toko untuk display, pergerakan barang, atau permintaan internal.',
          badge: 'worklist',
        },
      ],
    },
    {
      title: 'Koordinasi operasional toko',
      description: 'Jalur pendukung untuk memastikan toko tetap tersambung ke kerja lintas divisi.',
      links: [
        {
          label: 'Worklist Sales',
          href: buildWorklistHref({ domain: 'Sales' }),
          description: 'Pantau kebutuhan sales atau order yang menuntut koordinasi stok dan display dari sisi toko.',
          badge: 'sales',
        },
        {
          label: 'Customer Billing',
          href: '/billing?focus=OVERDUE_INVOICES',
          description: 'Lihat customer dan collection yang perlu dibantu follow-up dari titik layanan toko.',
          badge: 'customer',
        },
      ],
    },
  ],
}

export const teknisiPsbWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'Teknisi & Ekspan',
  title: 'Teknisi PSB',
  description:
    'Landing organisasi untuk instalasi baru, kesiapan material, dan tindak lanjut work order lapangan yang terkait proses PSB.',
  primaryAction: {
    label: 'Queue WO Lapangan',
    href: buildWorklistHref({ queue: 'Work Order Lapangan', domain: 'Sales' }),
    description: 'Masuk ke antrean work order lapangan yang paling dekat dengan instalasi baru.',
  },
  secondaryAction: {
    label: 'Order Aktivasi',
    href: '/sales?focus=MONTHLY_ACTIVATIONS',
    description: 'Masuk ke order aktivasi yang perlu ditutup loop bersama teknisi PSB.',
  },
  steps: [
    {
      title: 'Terima WO PSB',
      detail: 'Baca pekerjaan lapangan dari queue work order agar instalasi baru tidak tertinggal.',
    },
    {
      title: 'Siapkan Material',
      detail: 'Sinkronkan permintaan barang dan kesiapan perangkat dengan gudang atau inventory sebelum berangkat.',
    },
    {
      title: 'Aktivasi Layanan',
      detail: 'Pastikan hasil PSB terhubung kembali ke order aktivasi dan customer yang benar.',
    },
  ],
  sections: [
    {
      title: 'Fokus instalasi baru',
      description: 'Menu ini diperdalam untuk pekerjaan PSB, bukan sekadar pintu masuk teknisi generik.',
      links: [
        {
          label: 'Queue WO Lapangan',
          href: buildWorklistHref({ queue: 'Work Order Lapangan', domain: 'Sales' }),
          description: 'Prioritaskan antrian work order lapangan yang paling dekat dengan instalasi pelanggan baru.',
          badge: 'psb',
        },
        {
          label: 'Order Aktivasi',
          href: '/sales?focus=MONTHLY_ACTIVATIONS',
          description: 'Pantau order yang sudah siap atau sedang bergerak menuju aktivasi layanan.',
          badge: 'aktivasi',
        },
        {
          label: 'Request Inventory',
          href: '/inventory?focus=PENDING_REQUESTS',
          description: 'Tinjau permintaan barang yang masih menunggu proses agar instalasi tidak tertahan.',
          badge: 'material',
        },
      ],
    },
    {
      title: 'Kontrol lapangan PSB',
      description: 'Jalur pendukung untuk memastikan instalasi baru tetap sinkron dengan kualitas layanan.',
      links: [
        {
          label: 'Kontrol SLA',
          href: '/support/sla',
          description: 'Pantau prioritas lapangan dan ticket yang mendekati overdue setelah instalasi dibuka.',
          badge: 'prioritas',
        },
        {
          label: 'Customer Master',
          href: '/customers',
          description: 'Pastikan hasil instalasi kembali ke customer dan layanan yang benar.',
          badge: 'customer',
        },
      ],
    },
  ],
}

export const teknisiExpanWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'Teknisi & Ekspan',
  title: 'Teknisi Expan',
  description:
    'Landing ini memfokuskan pekerjaan ekspan jaringan, kesiapan jalur, dan kebutuhan ODP/port agar tim lapangan punya pintu kerja yang eksplisit.',
  primaryAction: {
    label: 'Queue ODP dan Port',
    href: buildWorklistHref({ queue: 'ODP dan Port', domain: 'Inventory' }),
    description: 'Masuk ke antrean ODP dan port yang paling relevan untuk penataan jalur expan.',
  },
  secondaryAction: {
    label: 'Mutasi Bulan Ini',
    href: '/inventory?focus=MONTHLY_MOVEMENTS',
    description: 'Masuk ke pergerakan stok periode berjalan yang menopang pekerjaan expan.',
  },
  steps: [
    {
      title: 'Baca Jalur',
      detail: 'Gunakan inventory untuk mengecek titik ODP, port, dan kesiapan material jaringan.',
    },
    {
      title: 'Eksekusi Expan',
      detail: 'Pantau movement dan request barang yang menjadi fondasi pekerjaan ekspan.',
    },
    {
      title: 'Sinkron Kapasitas',
      detail: 'Pastikan hasil expan kembali ke inventory dan SLA agar kapasitas baru langsung terbaca tim lain.',
    },
  ],
  sections: [
    {
      title: 'Fokus jalur dan kapasitas',
      description: 'Landing expan sekarang membaca jalur, port, dan movement sebagai isi utama operasionalnya.',
      links: [
        {
          label: 'Queue ODP dan Port',
          href: buildWorklistHref({ queue: 'ODP dan Port', domain: 'Inventory' }),
          description: 'Prioritaskan antrean inventory yang berhubungan langsung dengan ODP, port, dan kapasitas jaringan.',
          badge: 'expan',
        },
        {
          label: 'Inventory Network Ops',
          href: '/inventory',
          description: 'Kelola ODP, port, assignment perangkat, dan stok yang berkaitan dengan expan jaringan.',
          badge: 'jaringan',
        },
        {
          label: 'Mutasi Bulan Ini',
          href: '/inventory?focus=MONTHLY_MOVEMENTS',
          description: 'Audit barang keluar masuk yang mendukung pekerjaan ekspan periode berjalan.',
          badge: 'mutasi',
        },
      ],
    },
    {
      title: 'Kontrol teknis expan',
      description: 'Jalur pendukung untuk menjaga pekerjaan expan tetap sinkron dengan ticket prioritas.',
      links: [
        {
          label: 'Kontrol SLA',
          href: '/support/sla',
          description: 'Pastikan pekerjaan yang berhubungan dengan ticket teknis tetap mengikuti prioritas durasi.',
          badge: 'sla',
        },
        {
          label: 'Request Inventory',
          href: '/inventory?focus=PENDING_REQUESTS',
          description: 'Pantau kebutuhan material yang masih menunggu proses sebelum eksekusi expan dilanjutkan.',
          badge: 'request',
        },
      ],
    },
  ],
}

export const teknisiJointerWorkspace: OrganizationWorkspaceDefinition = {
  eyebrow: 'Teknisi & Ekspan',
  title: 'Teknisi Jointer',
  description:
    'Landing organisasi untuk pekerjaan joint, sambungan jaringan, dan tindak lanjut kualitas backbone yang terhubung ke support dan inventory.',
  primaryAction: {
    label: 'Queue TT Teknis',
    href: buildWorklistHref({ queue: 'TT Teknis', domain: 'Support', overdue: true }),
    description: 'Masuk ke antrean ticket teknis yang paling dekat dengan pekerjaan joint dan tindak lanjut backbone.',
  },
  secondaryAction: {
    label: 'Buka TT',
    href: '/support/tt',
    description: 'Masuk ke queue trouble ticket untuk tindak lanjut jaringan lapangan.',
  },
  steps: [
    {
      title: 'Cek Gangguan',
      detail: 'Gunakan queue TT untuk membaca kasus yang menuntut pekerjaan joint atau tindak lanjut backbone.',
    },
    {
      title: 'Validasi Jaringan',
      detail: 'Pastikan ODP, port, dan perangkat pendukung tersedia sebelum pekerjaan lapangan dilakukan.',
    },
    {
      title: 'Amankan SLA',
      detail: 'Hubungkan progres jointer ke kontrol SLA agar kasus kritis tidak tertinggal.',
    },
  ],
  sections: [
    {
      title: 'Fokus trouble dan sambungan',
      description: 'Landing jointer sekarang menonjolkan TT teknis dan SLA, bukan hanya link umum ke support.',
      links: [
        {
          label: 'Queue TT Teknis',
          href: buildWorklistHref({ queue: 'TT Teknis', domain: 'Support', overdue: true }),
          description: 'Baca ticket teknis yang masih aktif atau overdue untuk kebutuhan sambungan dan perbaikan jaringan.',
          badge: 'jointer',
        },
        {
          label: 'Queue Trouble Ticket',
          href: '/support/tt',
          description: 'Masuk ke lane TT untuk analisis gangguan dan tindak lanjut operasional.',
          badge: 'ticket',
        },
        {
          label: 'Kontrol SLA',
          href: '/support/sla',
          description: 'Prioritaskan kasus yang mendekati overdue agar owner lapangan tetap jelas.',
          badge: 'sla',
        },
      ],
    },
    {
      title: 'Pendukung jaringan jointer',
      description: 'Jalur inventory tetap tersedia saat pekerjaan sambungan membutuhkan data port dan perangkat.',
      links: [
        {
          label: 'Inventory Network Ops',
          href: '/inventory',
          description: 'Gunakan data ODP, port, dan perangkat untuk menutup kebutuhan pekerjaan jointer.',
          badge: 'ops',
        },
      ],
    },
  ],
}
