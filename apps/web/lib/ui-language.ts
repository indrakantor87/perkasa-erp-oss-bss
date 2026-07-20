export type UiLanguage = 'id' | 'en'

export const UI_LANGUAGE_STORAGE_KEY = 'perkasa.ui-language'
export const UI_LANGUAGE_COOKIE_KEY = 'perkasa-ui-language'

const englishTextMap: Record<string, string> = {
  Dashboard: 'Dashboard',
  'List Kerja': 'Worklist',
  'Daily Activity': 'Daily Activity',
  'Import Center': 'Import Center',
  Penjualan: 'Sales',
  'CS & Admin CS': 'CS & Admin CS',
  Customer: 'Customer',
  'NOC & Troubleshoots': 'NOC & Troubleshoots',
  Inventory: 'Inventory',
  HR: 'HR',
  Billing: 'Billing',
  Akses: 'Access',
  'User Internal': 'Internal Users',
  'Ringkasan singkat kesehatan operasi dan jalur masuk kerja': 'Brief summary of operation health and work entry points',
  'Antrean lintas domain untuk tindak lanjut harian': 'Cross-domain queue for daily follow-up',
  'Plan pagi dan closing sore aktivitas harian': 'Morning planning and afternoon closing for daily activities',
  'Audit batch import, exception, dan finalisasi data': 'Audit import batches, exceptions, and data finalization',
  'Lead, survey, dan order': 'Leads, surveys, and orders',
  'Workspace supervisor untuk approval, koreksi, transfer, dan backlog risiko CS':
    'Supervisor workspace for approvals, corrections, transfers, and CS risk backlog',
  'Data pelanggan, layanan aktif, dan tindak lanjut CS': 'Customer data, active services, and CS follow-up',
  'Lane kerja support teknis, TT, isolir, dismantle, dan SLA': 'Technical support lanes, TT, suspensions, dismantle, and SLA',
  'Item, stock movement, dan ODP': 'Items, stock movement, and ODP',
  'Employee, attendance, dan salary': 'Employees, attendance, and salary',
  'Invoice, customer, isolir, payment, dan collection': 'Invoices, customers, suspensions, payments, and collections',
  'Role, permission, dan pengaturan akses': 'Roles, permissions, and access settings',
  'Daftar user auth internal dan status review': 'Internal auth users and review status',
  'Workspace Sales': 'Sales Workspace',
  'Ringkasan lead, survey, order, dan progres aktivasi.': 'Lead, survey, order, and activation progress summary.',
  'Aktivitas Marketing': 'Marketing Activities',
  'Agenda canvassing, covered area, dan ritme aktivitas marketing.':
    'Canvassing schedule, covered area, and marketing activity rhythm.',
  'Support Teknis': 'Technical Support',
  'Antrean teknis, TT, monitoring ticket, dan kontrol SLA operasional':
    'Technical queue, TT, ticket monitoring, and operational SLA control',
  'Trouble Ticket': 'Trouble Ticket',
  'Antrean ticket open, progress, ready close, dan tindak lanjut teknis.':
    'Open, in-progress, and ready-to-close tickets with technical follow-up.',
  Isolir: 'Suspensions',
  'Monitoring pelanggan suspend, restore, dan sinkron support-billing.':
    'Monitor suspended customers, restores, and support-billing sync.',
  Dismantle: 'Dismantle',
  'Antrean pembongkaran perangkat dan tindak lanjut terminasi lapangan.':
    'Device dismantle queue and field termination follow-up.',
  'Kontrol SLA': 'SLA Control',
  'Pantau overdue, kedisiplinan progres, dan ticket yang perlu eskalasi.':
    'Track overdue items, progress discipline, and tickets that need escalation.',
  'Digital Creator': 'Digital Creator',
  'Campaign, lead digital, konten, dan analytics creator': 'Campaigns, digital leads, content, and creator analytics',
  'Workspace Creator': 'Creator Workspace',
  'Landing workspace campaign, lead digital, dan aktivitas konten.':
    'Landing workspace for campaigns, digital leads, and content activities.',
  Campaign: 'Campaign',
  'Kelola campaign dan jalur akuisisi digital.': 'Manage campaigns and digital acquisition channels.',
  'Lead Digital': 'Digital Leads',
  'Monitor lead masuk, funnel, dan tindak lanjut digital sales.':
    'Monitor incoming leads, funnel progress, and digital sales follow-up.',
  'Kalender Konten': 'Content Calendar',
  'Atur jadwal produksi dan publikasi konten marketing.': 'Manage production schedules and content publishing.',
  'Analytics Konten': 'Content Analytics',
  'Pantau performa konten, reach, dan engagement.': 'Track content performance, reach, and engagement.',
  'Workspace Billing': 'Billing Workspace',
  'Invoice, payment, collection, dan kontrol operasional billing.':
    'Invoices, payments, collections, and billing operational control.',
  'Customer Billing': 'Billing Customers',
  'Data pelanggan dan langganan untuk tindak lanjut invoice serta tagihan.':
    'Customer and subscription data for invoice and billing follow-up.',
  'Isolir Pelanggan': 'Customer Suspensions',
  'Monitoring suspend aktif yang terkait penagihan dan restore.':
    'Monitor active suspensions related to billing and restores.',
  'Employee, attendance, payroll, dan pinjaman karyawan': 'Employees, attendance, payroll, and staff loans',
  'Ringkasan stok, request, pinjaman, rack, dan network inventory':
    'Stock summary, requests, loans, racks, and network inventory',
  'Request Barang': 'Item Requests',
  'Ajukan request barang untuk kebutuhan lapangan.': 'Submit item requests for field operations.',
  'Antrean request teknisi dan proses pengambilan barang.':
    'Technician request queue and item picking process.',
  'Penataan Rak': 'Rack Layout',
  'Kelola rak, barcode rak, dan struktur lokasi barang.': 'Manage racks, rack barcodes, and item location structure.',
  Pinjaman: 'Loans',
  'Pinjamkan barang dan proses pengembalian dalam satu workspace.':
    'Issue items and handle returns in one workspace.',
  'Network & ODP': 'Network & ODP',
  'Kelola ODP, port, assignment, dan return perangkat.': 'Manage ODPs, ports, assignments, and device returns.',
  'Barang Masuk': 'Stock Receipts',
  'Fokus ke receipt stok gudang.': 'Focus on warehouse stock receipts.',
  'Stock Movement': 'Stock Movement',
  'Barang keluar dan adjustment stok.': 'Stock outflows and stock adjustments.',
  'Item Master': 'Item Master',
  'Master item inventory, barcode item, dan data stok dasar.': 'Inventory item master, item barcodes, and baseline stock data.',
  Legal: 'Legal',
  'Dokumen, administrasi, dan tindak lanjut legal': 'Documents, administration, and legal follow-up',
  Kantor: 'Office',
  'Operasional kantor untuk stok aktif dan ritme kerja harian': 'Office operations for active stock and daily work rhythm',
  'Toko (Segera)': 'Store (Soon)',
  'Business di luar ISP yang disiapkan bertahap': 'Non-ISP business prepared gradually',
  'Teknisi Lapangan': 'Field Technician',
  'PSB, expan, jointer, dan tindak lanjut lapangan': 'Installations, expansion, jointer, and field follow-up',
  PSB: 'Installation',
  'Pekerjaan pasang baru dan aktivasi pelanggan baru.': 'New installation and new customer activation work.',
  Expan: 'Expansion',
  'Ekspansi jaringan dan tindak lanjut teknis area baru.': 'Network expansion and technical follow-up for new areas.',
  Jointer: 'Jointer',
  'Pekerjaan jointing dan penyambungan jaringan fiber.': 'Fiber jointing and network splice work.',
  'Control Center': 'Control Center',
  Utama: 'Primary',
  Workspace: 'Workspace',
  'Operasional Inti': 'Core Operations',
  'Lintas Divisi': 'Cross Division',
  Pengawasan: 'Oversight',
  Pendukung: 'Supporting',
  Pengaturan: 'Settings',
  'ERP OSS BSS': 'ERP OSS BSS',
  'Masuk ke antrean, list kerja, dan modul harian tanpa perlu menebak alur dari awal.':
    'Access queues, worklists, and daily modules without guessing the flow from scratch.',
  'Mode Harian': 'Daily Mode',
  'Mode Kontrol': 'Control Mode',
  'Fokus ke antrean cepat, daily activity, dan workspace inti.':
    'Focus on quick queues, daily activity, and core workspaces.',
  'Tampilkan area lintas divisi dan menu pengawasan yang lebih lengkap.':
    'Show cross-division areas and a more complete oversight menu.',
  'Minimalkan sidebar': 'Collapse sidebar',
  'Tampilkan sidebar': 'Show sidebar',
  'Role Aktif': 'Active Role',
  'Peran Aktif': 'Active Role',
  'Shell review DB untuk uji alur harian sebelum hosting.':
    'Review DB shell for testing daily workflows before hosting.',
  'Shell ini dipakai untuk review DB dan uji alur harian sebelum masuk ke tahap hosting.':
    'This shell is used for Review DB and daily workflow testing before hosting.',
  Menu: 'Menu',
  'Tampilkan menu': 'Show menu',
  'Tutup menu': 'Close menu',
  'Buka Import': 'Open Import',
  Tema: 'Theme',
  Keluar: 'Logout',
  'Ringkasan performa lintas divisi dengan akses baca (read-only).':
    'Cross-division performance overview with read-only access.',
  'Akses penuh lintas domain, user, dan permission.': 'Full access across domains, users, and permissions.',
  'Kontrol operasional lintas divisi sesuai scope cabang yang diberikan.':
    'Cross-division operational control within assigned branch scope.',
  'Billing, collection, monitoring suspend, dan ringkasan PSB terkait cabang.':
    'Billing, collections, suspension monitoring, and branch-related installation summary.',
  'Absensi, payroll, dan operasional SDM sesuai cabang.': 'Attendance, payroll, and HR operations by branch.',
  'Inventory, aset, dan kebutuhan operasional umum sesuai cabang.':
    'Inventory, assets, and general operational needs by branch.',
  'Input PSB, list PSB, dan monitoring operasional terkait penjualan sesuai cabang.':
    'Installation inputs, installation lists, and sales-related operational monitoring by branch.',
  'Prospek, survey awal, customer awal, dan monitoring lintas domain.':
    'Prospects, initial surveys, early-stage customers, and cross-domain monitoring.',
  'Input operasional, list kerja, support dasar, dan ODP terbatas.':
    'Operational input, worklists, basic support, and limited ODP access.',
  'Supervisor operasional CS dengan approval dan koreksi data tertentu.':
    'CS operations supervisor with approval authority and specific data corrections.',
  'Trouble ticket teknis, monitoring jaringan, dan ODP operasional.':
    'Technical trouble tickets, network monitoring, and operational ODP.',
  'Eksekusi lapangan, hasil kunjungan, dan update teknis sesuai antrean.':
    'Field execution, visit outcomes, and technical updates by queue.',
  'Penanganan trouble ticket dengan scope support yang sempit.':
    'Trouble ticket handling with a narrow support scope.',
  'Campaign, lead digital, konten, dan analytics marketing.': 'Campaigns, digital leads, content, and marketing analytics.',
  'Antrean dismantle, catatan lapangan, dan penyelesaian pembongkaran.':
    'Dismantle queue, field notes, and dismantle completion.',
  'Antrean Trouble Ticket': 'Trouble Ticket Queue',
  'Antrean Isolir Aktif': 'Active Suspension Queue',
  'Dismantle Dan Terminasi': 'Dismantle and Termination',
  'Workspace Trouble Ticket': 'Trouble Ticket Workspace',
  'Workspace Monitoring Trouble Ticket': 'Trouble Ticket Monitoring Workspace',
  'Fokuskan ticket terbuka, cek jenis gangguan, dorong update status, lalu tutup loop setelah penanganan teknis selesai.':
    'Focus on open tickets, check issue types, push status updates, and close the loop after technical handling is complete.',
  'Validasi ticket baru dan pastikan jenis gangguan sudah jelas.':
    'Validate new tickets and make sure the issue type is clear.',
  'Pastikan tindak lanjut teknis atau eskalasi lapangan sudah dicatat.':
    'Ensure technical follow-up or field escalation has been recorded.',
  'Tutup ticket yang sudah selesai agar antrian operasional tetap bersih.':
    'Close completed tickets so the operational queue stays clean.',
  'Eskalasi ke lane SLA atau teknisi lapangan jika ticket berpotensi melewati target durasi.':
    'Escalate to the SLA lane or field technicians if the ticket risks exceeding the target duration.',
  'Workspace Isolir Dan Recovery': 'Suspension and Recovery Workspace',
  'Kelola suspend aktif, restore pelanggan yang sudah siap dipulihkan, dan siapkan kandidat yang perlu diteruskan ke proses dismantle.':
    'Manage active suspensions, restore customers ready for recovery, and prepare cases that need to move to dismantle.',
  'Cek identitas pelanggan, radbox, dan alasan isolir sebelum tindakan.':
    'Check customer identity, radbox, and suspension reasons before taking action.',
  'Pulihkan pelanggan yang sudah memenuhi syarat restore.':
    'Restore customers who already meet the recovery criteria.',
  'Tandai kasus yang perlu diteruskan ke terminasi permanen.':
    'Mark cases that need to move to permanent termination.',
  'Eskalasi ke lane dismantle bila status pelanggan tidak lagi bisa dipulihkan dan perlu terminasi penuh.':
    'Escalate to the dismantle lane if the customer can no longer be recovered and needs full termination.',
  'Workspace Dismantle': 'Dismantle Workspace',
  'Gunakan lane ini untuk membaca kandidat terminasi dari isolir aktif, memfinalkan keputusan dismantle, dan menjaga histori penutupan layanan tetap sinkron.':
    'Use this lane to review termination candidates from active suspensions, finalize dismantle decisions, and keep service closure history in sync.',
  'Pastikan kandidat dismantle berasal dari isolir atau keputusan terminasi yang valid.':
    'Ensure dismantle candidates come from suspensions or valid termination decisions.',
  'Verifikasi antrean open sebelum pelanggan dipindahkan ke histori dismantle.':
    'Verify the open queue before moving customers to dismantle history.',
  'Simpan close note atau reopen note sebagai jejak operasional.':
    'Save close notes or reopen notes as the operational audit trail.',
  'Kembalikan ke lane isolir bila kasus ternyata masih perlu recovery pelanggan, bukan terminasi.':
    'Return the case to the suspension lane if it still needs customer recovery, not termination.',
  'Workspace Prioritas Lapangan': 'Field Priority Workspace',
  'Workspace Kontrol SLA': 'SLA Control Workspace',
  'Pantau aturan durasi penanganan, samakan prioritas dengan ticket aktif, dan dorong tim support/lapangan menangani kasus yang mendekati overdue.':
    'Monitor handling duration rules, align priorities with active tickets, and push support/field teams to resolve cases approaching overdue.',
  'Review aturan SLA per tipe ticket yang sedang aktif.': 'Review SLA rules for each active ticket type.',
  'Cocokkan ticket prioritas dengan target durasi yang berlaku.':
    'Match priority tickets with the applicable duration targets.',
  'Eskalasi kasus yang mendekati atau melewati SLA ke operator terkait.':
    'Escalate cases that approach or exceed SLA to the relevant operators.',
  'Eskalasi ke lane TT jika problem teknis belum memiliki owner yang jelas atau update statusnya tertinggal.':
    'Escalate to the TT lane if the technical issue lacks a clear owner or status updates are lagging.',
  'Pemasaran dan Pelayanan': 'Marketing and Service',
  'General Affair': 'General Affairs',
  'Funnel utama': 'Main Funnel',
  'Urutan kerja Creator Digital dari perencanaan hingga evaluasi performa.':
    'Digital Creator workflow from planning to performance evaluation.',
  'Integrasi dengan penjualan': 'Sales Integration',
  'Jalur yang menghubungkan Creator Digital ke domain sales dan worklist ERP.':
    'Paths connecting Digital Creator to the sales domain and ERP worklist.',
  'Buka Campaign': 'Open Campaigns',
  'Masuk langsung ke tabel campaign aktif agar jalur kerja Creator Digital segera terlihat.':
    'Go directly to the active campaign table so the Digital Creator workflow is immediately visible.',
  'Buka Lead Digital': 'Open Digital Leads',
  'Masuk langsung ke database leads dari channel digital.':
    'Go directly to the lead database from digital channels.',
  'Workspace ini sekarang menjadi pintu nyata untuk campaign, digital leads, content calendar, dan analytics agar funnel akuisisi digital tidak lagi menumpang sebagai fokus sementara di domain sales.':
    'This workspace is now the real entry point for campaigns, digital leads, content calendar, and analytics so the digital acquisition funnel no longer rides as a temporary focus inside the sales domain.',
  'Susun objective, budget, status, dan platform campaign agar target funnel tertulis rapi sebelum distribusi konten dimulai.':
    'Set campaign objectives, budget, status, and platforms so funnel targets are clear before content distribution begins.',
  'Catat prospek yang masuk dari channel digital dan sambungkan ke campaign atau lead penjualan saat sudah qualified.':
    'Record prospects from digital channels and connect them to campaigns or sales leads once qualified.',
  'Kelola kalender konten per platform untuk memastikan ritme posting, publish date, dan status produksi tetap terjaga.':
    'Manage the content calendar per platform to maintain posting cadence, publish dates, and production status.',
  'Baca reach, impressions, engagement, click, dan follower gain agar keputusan optimasi tidak terlepas dari data.':
    'Review reach, impressions, engagement, clicks, and follower growth so optimization decisions stay data-driven.',
  'Kelola daftar campaign, objective, budget, dan platform aktif.':
    'Manage campaign lists, objectives, budgets, and active platforms.',
  'Catat lead digital dan pantau status funnel dari NEW sampai CONVERTED.':
    'Track digital leads and monitor funnel status from NEW to CONVERTED.',
  'Susun jadwal konten, status publish, tag, dan platform distribusi.':
    'Manage content schedule, publish status, tags, and distribution platforms.',
  'Review performa konten dan campaign berbasis metrik harian yang terakumulasi.':
    'Review content and campaign performance using accumulated daily metrics.',
  'Sales Funnel Digital': 'Digital Sales Funnel',
  'Baca KPI digital lead langsung dari domain sales utama.':
    'Read digital lead KPIs directly from the main sales domain.',
  'Order Digital': 'Digital Orders',
  'Tinjau order yang berasal dari sumber digital tanpa bercampur dengan source lain.':
    'Review orders originating from digital sources without mixing them with other sources.',
  'Survey Digital': 'Digital Surveys',
  'Lihat survey yang bersumber dari lead digital untuk mengukur kesiapan closing.':
    'View surveys originating from digital leads to measure closing readiness.',
  'Worklist Digital': 'Digital Worklist',
  'Pantau antrean lintas domain yang mengandung kata kunci digital, campaign, atau konten.':
    'Track cross-domain queues related to digital, campaign, or content keywords.',
  'List Kerja Terpadu': 'Unified Worklist',
  'Antrean lintas domain untuk role aktif': 'Cross-domain queue for the active role',
  'Penjualan, customer, support, inventory, dan import dibaca dari satu layar kerja.':
    'Sales, customers, support, inventory, and imports are reviewed from one workspace.',
  'Mode baca saja': 'Read-only mode',
  'Item Aktif': 'Active Items',
  Kritikal: 'Critical',
  Menunggu: 'Waiting',
  'Siap Ditutup': 'Ready to Close',
  'Access Control': 'Access Control',
  'Role, permission, dan matrix akses': 'Roles, permissions, and access matrix',
  'Halaman ini merangkum jalur akses per role agar fondasi satu website tetap bisa dibatasi secara tegas tanpa memecah aplikasi per divisi.':
    'This page summarizes access paths per role so the single-site foundation can still be tightly controlled without splitting the app per division.',
  'Kembali ke dashboard': 'Back to dashboard',
  'Resource aktif': 'Active Resources',
  'Akses approval': 'Approval Access',
  'Review akun auth internal': 'Review internal auth accounts',
  'Halaman ini menampilkan daftar akun yang akan menjadi fondasi auth internal lintas modul. Saat review DB belum siap atau mode fallback lokal masih aktif, tabel dapat menampilkan akun bootstrap mock agar jalur review tetap hidup tanpa mengekspos kredensial di UI.':
    'This page shows the account list that becomes the foundation of internal auth across modules. When Review DB is not ready or local fallback mode is still active, the table may show mock bootstrap accounts so the review flow stays alive without exposing credentials in the UI.',
  'Lihat matrix akses': 'View access matrix',
  'Total user': 'Total users',
}

export function normalizeUiLanguage(value: string | undefined | null): UiLanguage {
  return value === 'en' ? 'en' : 'id'
}

export function translateUiText(text: string, language: UiLanguage) {
  if (language === 'id') {
    return text
  }

  return englishTextMap[text] ?? text
}
