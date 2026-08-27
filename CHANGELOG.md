# Changelog

All notable changes to this project will be documented in this file.

Format mengikuti prinsip `Keep a Changelog`, dan versi mengikuti `Semantic Versioning`.

## [Unreleased]

### Planned

- penguatan query domain dan action backend setelah MySQL review dipakai penuh

## [0.66.65] - 2026-08-27

### Added

- Deterministic unified tracking timeline ordering dengan tiebreak prioritas event type dan id untuk menghindari non-deterministic sorting ketika timestamp event sama.
- Assignment Log kolom `Assigned By` yang menampilkan informasi user/operator yang membuat assignment (full name → username → User #id fallback).
- Assignment Log kolom `Released Info` yang menampilkan tanggal release assignment untuk baris berstatus `RELEASED`.

### Tests

- Executable timeline regression coverage (`q3-p5-7-timeline.test.ts`) memverifikasi aturan timestamp per status (RELEASED=releasedAt walau acceptedAt ada, ACCEPTED=acceptedAt, ASSIGNED=assignedAt), acceptedBy label fallback, dan deterministic ordering event same-timestamp.

## [0.66.64] - 2026-08-26

### Added

- Field Technician dapat menerima assignment Work Order langsung dari Work Order Tracking Detail melalui tombol `Terima Tugas`.
- Ditambahkan client component `AssignmentAcceptButton` dengan server-side visibility gate agar hanya tampil untuk `FIELD_TECHNICIAN` yang memiliki assignment aktif berstatus `ASSIGNED`.
- Ditambahkan resolver `accepted_by_user_id` dan nama display penerima pada tracking assignment detail, sehingga UI dapat menampilkan informasi siapa yang menerima assignment beserta waktunya.

### Changed

- Assignment Tracking Log sekarang menampilkan visual status badge sesuai state assignment: `ASSIGNED` (amber), `ACCEPTED` (hijau), `RELEASED` (abu-abu), serta kolom `Acceptance` yang merangkum tanggal penerimaan dan nama penerima.
- Timeline assignment pada detail work order sekarang menggunakan timestamp yang sesuai state (`acceptedAt` untuk `ACCEPTED`, `releasedAt` untuk `RELEASED`, `assignedAt` untuk `ASSIGNED`), serta menuliskan label `Diterima oleh: <nama>` bila data tersedia.

### Security

- Accept action tetap menggunakan server-side session identity melalui `requireSession` pada route handler accept; enforcement otorisasi dan state machine backend `P5.3` (FIELD_TECHNICIAN SELF_ONLY, ASSIGNED → ACCEPTED saja, idempotent, deny resurrection released) **tidak diubah**.
- Client `AssignmentAcceptButton` **tidak mengirim** `userId`, `role`, `assigned_user_id`, atau credential lain dalam `request body`; identitas actor sepenuhnya ditetapkan server-side dari encrypted session cookie.
- Visibility tombol `Terima Tugas` dihitung server-side (RSC) dalam `canAcceptAssignment()` dan hanya dikirim sebagai prop boolean tunggal `canAccept` ke client, untuk menghindari asumsi otorisasi dari sisi client.

## [0.66.63] - 2026-07-20

### Fixed

- Role `NOC Operator` tidak lagi jatuh ke `Mock Fallback` hanya karena review DB belum memiliki kolom `network_odp_ports.port_status`; query dashboard sekarang mengecek schema lebih dulu dan mengosongkan bucket `ODP/Port issue` secara aman bila kolom itu belum tersedia: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- Helper query `ODP/Port issue` di dashboard sekarang juga menghindari ketergantungan langsung pada `network_odp_ports.updated_at`, sehingga pembacaan review DB lebih toleran terhadap variasi schema existing: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

## [0.66.62] - 2026-07-20

### Changed

- Sidebar role `NOC Operator` sekarang lebih spesifik ke operasional NOC dengan label workspace `NOC & Ticketing`, urutan submenu yang mengikuti prioritas lane NOC, serta penamaan submenu yang lebih kontekstual seperti `Ticketing NOC`, `Prioritas SLA`, dan `Monitoring Isolir`: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Workspace `Trouble Ticket` tidak lagi memakai wording yang mengacu ke board laporan CS; copy helper, deskripsi lane, dan ringkasan tindakan kini menyesuaikan konteks `NOC Operator` dan `TT Operator`: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx)
- Kartu ringkasan lane support dan metadata role aktif untuk `NOC Operator` kini memakai bahasa yang lebih selaras dengan ticketing teknis, kontrol SLA, dan monitoring jaringan operasional: [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx), [role-meta.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/role-meta.ts)

## [0.66.61] - 2026-07-20

### Added

- Ditambahkan panel `Konteks Saya` pada detail `Tracking Barang` dan `Request Barang` untuk menunjukkan apakah item/detail terkait langsung dengan akun login, sekaligus memberi shortcut balik cepat ke list personal: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/stock-movements/[id]/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/inventory-requests/[id]/page.tsx)

### Changed

- Tombol kembali di detail inventory tracking sekarang otomatis mengarah ke `Barang Saya` atau `Request Saya` bila konteks detail cocok dengan akun login, sehingga alur audit personal lebih cepat: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/stock-movements/[id]/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/inventory-requests/[id]/page.tsx)
- Detail `Inventory Request` sekarang membaca `requested_by_user_id` bila tersedia agar penentuan konteks personal lebih presisi dan tetap kompatibel dengan mock existing: [tracking-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/tracking-service.ts)

## [0.66.60] - 2026-07-20

### Added

- Ditambahkan filter personal eksplisit `Barang saya` pada halaman `Tracking Barang` dan `Request saya` pada halaman `Request Barang` agar operator bisa mempersempit layar inventory tracking ke konteks login mereka sendiri: [stock-movements/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/stock-movements/page.tsx), [inventory-requests/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/inventory-requests/page.tsx), [stock-movement-tracking-filters.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/stock-movement-tracking-filters.tsx), [inventory-request-tracking-filters.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-tracking-filters.tsx)

### Changed

- Service tracking inventory sekarang menerima konteks session login untuk menerapkan filter personal yang lebih presisi, memakai `technician_user_id` pada stock movements dan `requested_by_user_id` pada inventory requests bila kolom tersedia, dengan fallback aman ke pencocokan nama login: [tracking-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/tracking-service.ts)

## [0.66.59] - 2026-07-20

### Added

- Ditambahkan blok `Akses Cepat Saya` pada landing `Tracking` utama agar user langsung mendapat shortcut personal sesuai role dan session login: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/page.tsx)

### Changed

- Landing `Tracking` untuk `FIELD_TECHNICIAN` sekarang memprioritaskan tautan ke `WO Saya`, `Queue NOC Saya`, dan `Movement Barang Saya`, sehingga teknisi tidak harus mulai dari kartu tracking generik: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/page.tsx)
- Landing `Tracking` untuk `NOC_OPERATOR` dan `TT_OPERATOR` kini memprioritaskan `Queue NOC Saya`, `Queue Trouble Saya`, dan `WO Saya`, sedangkan role lain tetap melihat shortcut operasional umum: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/page.tsx)

## [0.66.58] - 2026-07-20

### Added

- Ditambahkan filter `Pekerjaan saya` pada `NOC Queue` agar operator bisa menyaring antrean gabungan ke item yang PIC-nya cocok dengan user login: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/noc-queue/page.tsx), [noc-queue-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/noc-queue-service.ts)

### Changed

- Shortcut `queue` dari landing workspace teknisi kini ikut membawa konteks personal (`mine=1` bila `userId` tersedia, atau fallback pencarian nama login) sehingga teknisi mendarat ke antrean NOC yang lebih relevan: [technician-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/technician-workspace-page.tsx)
- Penyaringan personal pada `NOC Queue` diterapkan aman di jalur mock dan review-db dengan memanfaatkan `picUsername/current_pic_user_id`, tanpa memaksa asumsi pada ticket yang belum punya relasi PIC eksplisit: [noc-queue-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/noc-queue-service.ts)

## [0.66.57] - 2026-07-20

### Added

- Ditambahkan filter `Pekerjaan saya` pada halaman tracking Work Order yang menggunakan `current_pic_user_id` (jika tersedia) untuk memfokuskan daftar work order ke PIC login: [work-orders/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/work-orders/page.tsx), [tracking-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/tracking-service.ts)
- Landing workspace teknisi kini menghasilkan shortcut status `OPEN` dan `ON_PROGRESS` berbasis placeholder link otomatis agar teknisi bisa langsung memilih status operasional utama per jenis kerja: [technician-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/technician-workspace-page.tsx), [technician-workspace-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/technician-workspace-config.ts)

### Changed

- Session auth kini menyertakan `userId` (jika tersedia dari review DB) supaya filter PIC/assignment bisa lebih presisi tanpa mengubah engine tracking lain: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts)

## [0.66.56] - 2026-07-20

### Added

- Ditambahkan landing kerja personal untuk `Teknisi PSB`, `Teknisi Troubleshoots`, dan `Teknisi Dismantle` yang merender workspace spesifik per jenis kerja langsung dari route `/support/teknisi-*`, sehingga teknisi tidak lagi langsung dilempar ke tracking generik: [technician-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/technician-workspace-page.tsx), [teknisi-psb/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-psb/page.tsx), [teknisi-troubleshoots/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-troubleshoots/page.tsx), [teknisi-dismantle/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-dismantle/page.tsx)
- Ditambahkan konfigurasi workspace teknisi terpisah untuk `PSB`, `Troubleshoots`, dan `Dismantle`, lengkap dengan langkah kerja ringkas dan shortcut aksi yang disesuaikan per sumber kerja: [technician-workspace-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/technician-workspace-config.ts)

### Changed

- Shortcut utama workspace teknisi sekarang otomatis membangun tautan work order berdasarkan `jobCategory` dan nama login teknisi, sehingga default filter lebih dekat ke assignment pribadi tanpa mengubah engine tracking yang ada: [technician-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/technician-workspace-page.tsx)
- Aksi pendukung per workspace diringkas agar teknisi PSB fokus ke List PSB dan material, teknisi Trouble fokus ke queue/SLA NOC, dan teknisi Dismantle fokus ke return inventory dan histori support: [technician-workspace-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/technician-workspace-config.ts)

## [0.66.55] - 2026-07-20

### Added

- Ditambahkan workspace teknisi terpisah untuk `Troubleshoots` dan `Dismantle` sebagai entry point khusus di bawah `/support`:
  - [teknisi-troubleshoots/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-troubleshoots/page.tsx)
  - [teknisi-dismantle/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-dismantle/page.tsx)
- Ditambahkan definisi workspace organisasi teknisi untuk `Troubleshoots` dan `Dismantle` (link tracking, queue ticketing, inventory, SLA): [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts)

### Changed

- Sidebar `Teknisi Lapangan` sekarang menampilkan submenu terpisah `PSB`, `Troubleshoots`, `Dismantle`, `Expan`, `Jointer` agar sumber kerja teknisi tidak tercampur: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Akses workspace organisasi ditambah untuk key baru `teknisi-troubleshoots` dan `teknisi-dismantle`: [organization-workspace-access.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspace-access.ts)
- Smoke test diperkuat untuk memastikan role `FIELD_TECHNICIAN` bisa mengakses route workspace baru: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)

## [0.66.54] - 2026-07-20

### Added

- Ditambahkan input `KPI manual` per employee per bulan untuk menjadi acuan bonus performa payroll: [HrEmployeeKpiForm](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-kpi-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employee-kpis/route.ts)
- Ditambahkan tabel review-db `hr_employee_kpis` dengan `score` dan `performance_bonus` (dibuat otomatis via `CREATE TABLE IF NOT EXISTS` pada write/read path HR): [hr-employee-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-employee-kpi-service.ts), [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql)

### Changed

- Write action `Buat slip gaji` sekarang akan mengambil default `bonus performa` dari KPI employee untuk bulan/tahun payroll bila kolom bonus dikosongkan: [salary-slips/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)
- Domain HR kini menampilkan section `KPI Bulanan Terbaru` pada read-side agar supervisor HR bisa memantau input KPI: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Smoke test HR diperbarui agar tidak bergantung urutan section fixed dan mengenali KPI section baru: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)

## [0.66.53] - 2026-07-20

### Added

- Ditambahkan route `Finance` baru di `/finance` sebagai entry point domain terpisah yang membungkus `BillingDomainWorkspace` existing tanpa memutus engine billing: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/finance/page.tsx)

### Changed

- `BillingDomainWorkspace` kini bisa dipakai ulang oleh `/billing` dan `/finance` melalui `basePath` serta label workspace yang dapat disesuaikan, sehingga toolbar, aksi cepat, dan fokus KPI tidak lagi memaksa kembali ke route lama: [billing-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-domain-workspace.tsx)
- Role `FINANCE` sekarang mendarat ke `/finance`, dan akses path untuk owner/admin/super admin turut mengenali route baru ini: [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts)
- Navigasi utama dan sidebar kini memakai label `Finance` sebagai pintu masuk utama, tetapi tetap menganggap `/billing` sebagai route engine pendukung agar transisi aman: [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Workspace organisasi yang sebelumnya masuk ke collection lewat `/billing` kini diarahkan ke `/finance` supaya pintu masuk UI lebih konsisten: [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts)
- Mock dashboard dan smoke test diperbarui untuk mengenali landing `Finance` baru dan akses role `FINANCE`: [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts), [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)

## [0.66.52] - 2026-07-20

### Added

- Ditambahkan route `CS & Admin CS -> ODP dan Port` di `/customers/cs-admin/odp-port` yang membungkus panel ODP/Port existing (`InventoryNetworkOpsPanel`) tanpa memutus engine inventory: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/odp-port/page.tsx)

### Changed

- Shortcut `ODP dan Port` pada rekap dan dashboard `CS & Admin CS` kini mendarat ke workspace CS (bukan lagi `/inventory`) agar ownership UI benar-benar berada di CS: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx)
- Workspace organisasi `CS & Admin CS` ikut diarahkan ke route baru untuk menjaga konsistensi pintu masuk: [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts)
- Sidebar kini menganggap `/customers/cs-admin/odp-port` sebagai bagian workspace CS agar highlight dan assignHrefs tetap konsisten: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Smoke test diperkuat untuk memastikan route CS ODP/Port bisa diakses role `CS_ADMIN`: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)

## [0.66.51] - 2026-07-20

### Added

- Detail `Trouble Ticket` sekarang membaca histori close support dismantle yang relevan berdasarkan item lifecycle pada ticket gangguan, lalu menampilkan section `Histori Support Dismantle` dengan tombol langsung kembali ke lane `/support/dismantle`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/trouble-tickets/[id]/page.tsx)
- Header aksi pada detail `Trouble Ticket` kini ikut menyediakan shortcut `Buka Histori Dismantle` bila ticket gangguan memiliki device return atau replace yang sudah muncul pada histori close support: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/trouble-tickets/[id]/page.tsx)

### Changed

- Navigasi flow dismantle sekarang konsisten dua arah pada empat konteks operasional utama: `support close`, `inventory barcode`, `work order`, dan `trouble ticket`.
- Versioning diselaraskan ke `0.66.51`; batch ini lolos diagnostics dan `npm run check`.

## [0.66.50] - 2026-07-19

### Added

- Detail `Work Order` sekarang membaca histori close support dismantle yang relevan berdasarkan item return di lifecycle work order, lalu menampilkan section `Histori Support Dismantle` dengan tombol langsung kembali ke lane `/support/dismantle`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/work-orders/[id]/page.tsx)
- Header aksi pada detail `Work Order` kini ikut menyediakan shortcut `Buka Histori Dismantle` bila work order punya jejak barang return yang sudah muncul pada histori close support: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/tracking/work-orders/[id]/page.tsx)

### Changed

- Navigasi flow dismantle kini benar-benar saling membuka dua arah antara tiga konteks utama: `support close`, `inventory barcode`, dan `work order/ticket`.
- Versioning diselaraskan ke `0.66.50`; batch ini lolos diagnostics dan `npm run check`, sedangkan `npm run build` di sandbox kembali berhenti pada fase `next build` tanpa error eksplisit sebelum dihentikan manual.

## [0.66.49] - 2026-07-19

### Added

- Histori close pada lane `/support/dismantle` kini membaca `Work Order`, `Work Order ID`, `Ticket Ref`, dan `Trouble Ticket ID` dari lifecycle item return, lalu menampilkan action langsung `Buka Work Order` atau `Buka Trouble Ticket` bila referensinya tersedia: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Halaman detail barcode inventory sekarang menyediakan tombol langsung ke `Work Order` atau `Trouble Ticket` dari audit lifecycle terbaru, sehingga operator bisa berpindah dari histori barang ke ticket operasional tanpa mencari manual: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/barcodes/[itemCode]/page.tsx)

### Changed

- Navigasi flow dismantle sekarang membentuk segitiga operasional yang lebih utuh: histori support close dapat membuka barcode dan work order, sedangkan barcode inventory dapat membuka histori support dan ticketing operasional yang sama.
- Versioning diselaraskan ke `0.66.49`; batch ini lolos diagnostics dan `npm run check`, sedangkan `npm run build` di sandbox kembali berhenti pada fase `next build` tanpa error eksplisit sebelum dihentikan manual.

## [0.66.48] - 2026-07-19

### Added

- Halaman detail barcode inventory sekarang menampilkan section `Histori Dismantle Terkait` yang membaca histori close support berdasarkan `returned_item_codes` atau fallback note terstruktur, lalu menyediakan backlink langsung ke lane `/support/dismantle` dengan konteks kasus yang sama: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/barcodes/[itemCode]/page.tsx)
- Lane `/support/dismantle` sekarang menerima konteks `dismantleHistory` dari backlink barcode, otomatis membuka panel histori, dan menyorot kartu kasus yang sama agar operator langsung mendarat pada histori close yang relevan: [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)

### Changed

- Navigasi histori barang untuk flow dismantle kini benar-benar dua arah: support close dapat membuka barcode inventory, dan barcode inventory dapat kembali membuka histori support close asalnya dengan filter dan highlight kasus.
- Versioning diselaraskan ke `0.66.48`; batch ini lolos diagnostics dan `npm run check`, sedangkan `npm run build` di sandbox kembali berhenti pada fase `next build` tanpa error eksplisit sebelum dihentikan manual.

## [0.66.47] - 2026-07-19

### Added

- Ditambahkan daftar histori close yang benar-benar tampil di panel histori lane `/support/dismantle`, lengkap dengan kartu kasus ringkas, tombol `Detail Histori`, `Reopen`, `Cek Billing`, dan tombol langsung ke halaman barcode inventory saat `Returned Item Codes` tersedia: [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Modal aksi cepat histori dismantle kini ikut membawa section `Barang Kembali` dan action `Histori Barang` sehingga operator bisa lompat ke audit barcode inventory langsung dari context histori close: [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)

### Changed

- Workspace support dismantle tidak lagi berhenti di ringkasan jumlah histori saja; operator sekarang bisa membaca kasus close per item dari lane yang sama tanpa pindah dulu ke domain lain untuk menemukan jejak perangkat return.
- Versioning diselaraskan ke `0.66.47`; batch ini lolos diagnostics, `npm run check`, dan `npm run build`.

## [0.66.46] - 2026-07-19

### Added

- Ditambahkan field `Item / Barcode Return` pada form close dismantle agar operator bisa menempel hasil scan atau `item_code` inventory yang benar-benar kembali saat kasus ditutup ke histori: [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx)
- Ditambahkan dukungan penyimpanan `returned_item_codes` pada `support_dismantle_history` beserta fallback metadata `Returned Item Codes` di `close_note`, sehingga histori close menyimpan referensi barang return secara eksplisit dan tidak lagi hanya mengandalkan pembacaan movement work order: [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [close route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts)

### Changed

- Enrichment `List Dismantle` kini memprioritaskan referensi item return langsung dari histori close sebelum fallback ke `inventory_stock_movements`, sehingga backlink histori inventory lebih presisi untuk kasus multi-device: [dismantle-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dismantle-list-service.ts)
- Lane histori support dismantle kini ikut menampilkan metadata `Returned Item Codes` dari `close_note` terstruktur agar jejak close barang tetap terbaca dari workspace support lama: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Versioning diselaraskan ke `0.66.46`; batch ini lolos diagnostics dan `npm run check`, sedangkan `npm run build` di sandbox kembali berhenti pada fase `next build` tanpa error eksplisit sebelum proses dihentikan manual.

## [0.66.45] - 2026-07-19

### Added

- Ditambahkan enrichment `List Dismantle` untuk membaca status histori close support berdasarkan `isolation_id` dan mengumpulkan kandidat `item_code` inventory dari `inventory_stock_movements` yang terhubung ke `transferred_work_order_id`, sehingga detail item bisa mengetahui kapan kasus sudah benar-benar masuk histori support dan barang mana yang relevan untuk ditelusuri: [dismantle-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dismantle-list-service.ts)
- Ditambahkan tombol `Histori Barang` pada panel detail `List Dismantle` yang hanya muncul ketika kasus sudah punya histori close support dan item code inventory nyata, lalu mengarah langsung ke halaman barcode inventory terkait: [dismantle-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dismantle-list-workspace.tsx)

### Changed

- Model shared `DismantleListItem` kini membawa metadata `supportHistoryId`, `supportClosedAt`, dan `inventoryItemCodes` agar boundary client/server tetap aman saat workspace perlu menampilkan backlink histori barang tanpa menarik service server-only ke client: [dismantle-list-shared.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dismantle-list-shared.ts)
- Versioning diselaraskan ke `0.66.45` untuk menandai batch backlink histori inventory pada flow dismantle; batch ini sudah lolos diagnostics dan `npm run check`, sementara `npm run build` di sandbox masuk ke fase `next build` namun penantian selesai penuh masih dibatasi eksekutor.

## [0.66.44] - 2026-07-19

### Added

- Ditambahkan sinkron read-side dari `support_dismantle_queue` ke domain `List Dismantle`, sehingga kandidat hasil transfer `Isolir -> Dismantle` dari billing kini otomatis muncul di `/list-dismantle` tanpa perlu seed/manual entry tambahan: [dismantle-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dismantle-list-service.ts)
- Ditambahkan backlink operator pada panel detail `List Dismantle` untuk melompat langsung ke lane `/support/dismantle` baik pada fokus queue open maupun histori close, memakai filter `customer/service` agar pembacaan kasus tetap linear: [dismantle-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dismantle-list-workspace.tsx)

### Changed

- Read-side `List Dismantle` kini menyerap queue aktif lebih dulu sebelum fallback seed review DB, lalu otomatis menyembunyikan item seed saat data riil sudah tersedia agar operator hanya melihat antrean dismantle nyata dari billing/support: [dismantle-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dismantle-list-service.ts)
- Versioning diselaraskan ke `0.66.44` untuk menandai batch integrasi `Isolir -> List Dismantle` dan backlink operator ke lane support yang sudah lolos diagnostics, `npm run check`, dan `npm run build`.

## [0.66.43] - 2026-07-19

### Changed

- Memperkuat Docker build/runtime production dengan mengganti seluruh stage dari `node:20-alpine` ke `node:20-slim`, mengubah instalasi paket runner dari `apk` ke `apt`, dan menambahkan `NODE_OPTIONS=--max-old-space-size=2048` pada builder agar fase `next build` khususnya saat `Running TypeScript ...` lebih stabil di environment deploy remote: [Dockerfile](file:///d:/trae_projects/perkasa-erp-oss-bss/Dockerfile)
- Memeringankan step dependency install di stage `deps` dengan `npm ci --no-audit --no-fund` agar output build lebih bersih dan mengurangi noise yang tidak relevan terhadap deploy production: [Dockerfile](file:///d:/trae_projects/perkasa-erp-oss-bss/Dockerfile)
- Versioning diselaraskan ke `0.66.43` untuk menandai batch hardening deploy production.

## [0.66.42] - 2026-07-19

### Added

- Ditambahkan cross-link dari `List PSB` yang sudah ditransfer ke jalur ticketing, sehingga operator bisa langsung membuka queue NOC berbasis ticket `PSB` atau masuk ke detail work order terkait saat `transferred_work_order_id` tersedia: [psb-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-workspace.tsx), [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts), [psb-list-shared.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/psb-list-shared.ts)
- Ditambahkan domain baru `List Dismantle` fase 1 dengan route `/list-dismantle`, akses role awal, item navigasi, service read-side/mock-reviewDB, workspace UI, form transisi review, dan endpoint write-side dasar untuk review serta transfer ke ticket operasional: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/list-dismantle/page.tsx), [dismantle-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dismantle-list-service.ts), [dismantle-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dismantle-list-workspace.tsx), [dismantle-list-transition-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dismantle-list-transition-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-lists/[id]/transition/route.ts)

### Changed

- Sidebar, route access, dan navigasi utama kini mengenali `List Dismantle` sebagai domain kerja tersendiri yang muncul di jalur Billing/CS/Dismantle sesuai role operasional: [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts), [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Versioning diselaraskan ke `0.66.42` untuk menandai batch cross-link `List PSB` dan implementasi `List Dismantle` fase 1.

## [0.66.41] - 2026-07-19

### Fixed

- Memisahkan tipe dan helper aksi `List PSB` ke modul shared yang aman untuk client agar `psb-list-transition-form.tsx` tidak lagi menarik `psb-list-service.ts` beserta dependency `mysql2` ke bundle browser, sehingga akar error build production `Module not found: Can't resolve 'net'` pada Turbopack terselesaikan: [psb-list-shared.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/psb-list-shared.ts), [psb-list-transition-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-transition-form.tsx), [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts)
- Memperbarui import route API transisi `List PSB` agar memakai tipe shared yang sama setelah boundary client/server dipisahkan, menjaga konsistensi antara build `tsc` dan build production Next.js: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/psb-lists/[id]/transition/route.ts)

### Changed

- Versioning diselaraskan ke `0.66.41` untuk menandai batch perbaikan deploy production pada domain `List PSB`.

## [0.66.40] - 2026-07-19

### Added

- Ditambahkan aksi `TRANSFER` pada flow `List PSB` sehingga item yang sudah `DISETUJUI` dapat langsung dibuatkan work order `INSTALLATION` kategori `PSB` dan masuk ke jalur ticket operasional/NOC: [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/psb-lists/[id]/transition/route.ts)
- Ditambahkan pengayaan skema review DB untuk `List PSB` berupa metadata transfer ticketing seperti `transferred_work_order_id`, `transferred_by`, dan `transferred_at`, agar histori perpindahan dari antrean CS ke ticket operasional tetap terbaca jelas pada satu domain: [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts)

### Changed

- Form aksi `List PSB` kini mengenali transfer ticketing dan memberi umpan balik yang lebih eksplisit ketika item disiapkan untuk masuk ke jalur work order PSB: [psb-list-transition-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-transition-form.tsx), [psb-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-workspace.tsx)
- Versioning diselaraskan ke `0.66.40` untuk menandai batch transfer `List PSB -> ticket operasional` yang sudah lolos diagnostics dan `tsc --noEmit`.

## [0.66.39] - 2026-07-19

### Added

- Ditambahkan write-side dasar `List PSB` berupa form aksi review di panel detail, route API transisi status, dan audit trail awal untuk aksi `Masuk Review CS`, `Minta Koreksi`, `Setujui`, dan `Tolak`: [psb-list-transition-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-transition-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/psb-lists/[id]/transition/route.ts)
- Ditambahkan fondasi tabel `sales_psb_lists` dan `sales_psb_list_audits` beserta seed baseline review DB agar domain `List PSB` bisa langsung dibaca dan diuji pada mode `review-db` tanpa menulis ke mock: [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts)

### Changed

- Read-side `List PSB` tidak lagi selalu dipaksa fallback saat `review-db` aktif; service kini membaca data dari review DB, menampilkan audit singkat item terpilih, dan tetap kembali aman ke mock bila query gagal: [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/list-psb/page.tsx), [psb-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-workspace.tsx)
- Versioning diselaraskan ke `0.66.39` untuk menandai batch write-side dasar `List PSB` yang sudah lolos pemeriksaan diagnostics dan `tsc --noEmit`.

## [0.66.38] - 2026-07-19

### Added

- Ditambahkan domain route `List PSB` fase 1 yang membuka halaman operasional baru di `/list-psb`, lengkap dengan penjagaan session server-side, pemeriksaan akses role, status sumber data, serta workspace awal untuk membaca antrean validasi PSB antara penjualan, CS, dan ticketing: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/list-psb/page.tsx), [psb-list-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/psb-list-workspace.tsx)
- Ditambahkan service read-side `List PSB` berbasis mock/fallback yang sudah menyediakan status domain, filter pencarian, opsi marketing, ringkasan summary, detail item terpilih, dan jalur aman saat mode `review-db` belum disambungkan: [psb-list-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/psb-list-service.ts)

### Changed

- Permission route dan navigasi utama kini sudah mengenali `/list-psb`, termasuk menu utama dan susunan sidebar yang lebih natural untuk peran `Penjualan`, `Sales Marketing`, `CS Operator`, dan `CS Admin`, sehingga domain baru bisa diakses tanpa mengganggu flow operasional lama: [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts), [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Versioning diselaraskan ke `0.66.38` untuk menandai batch implementasi kode `List PSB` fase 1 yang sudah lolos pemeriksaan TypeScript dasar.

## [0.66.37] - 2026-07-19

### Added

- Ditambahkan spesifikasi teknis implementasi `List Dismantle` sebagai domain baru yang memisahkan sumber kandidat `Billing/Isolir` dari ticket dismantle operasional, sekaligus merinci route, status, data model, service, API, permission, audit trail, strategi mock/review DB, dan fase implementasi: [web-list-dismantle-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-dismantle-implementation-spec.md)
- Indeks dokumentasi diperbarui agar spesifikasi `List Dismantle` langsung masuk ke jalur referensi utama untuk backlog implementasi lintas divisi: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Changed

- Panduan versioning diselaraskan ke baseline terbaru `0.66.37` dan kini menandai bahwa `List Dismantle` sudah memiliki desain teknis implementasi awal yang siap dipakai sebagai pegangan build: [versioning.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/versioning.md)
- Versioning diselaraskan ke `0.66.37` untuk menandai batch dokumentasi desain teknis `List Dismantle`, changelog, dan baseline release terkait.

## [0.66.36] - 2026-07-19

### Added

- Ditambahkan spesifikasi teknis implementasi `List PSB` sebagai domain baru yang memisahkan input `Penjualan` dari ticket operasional, sekaligus merinci route, status, data model, service, API, permission, audit trail, strategi mock/review DB, dan fase implementasi: [web-list-psb-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-psb-implementation-spec.md)
- Indeks dokumentasi diperbarui agar spesifikasi `List PSB` langsung masuk ke jalur referensi utama untuk backlog implementasi lintas divisi: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Changed

- Panduan versioning diselaraskan ke baseline terbaru `0.66.36` dan kini menandai bahwa `List PSB` sudah memiliki desain teknis implementasi awal yang siap dipakai sebagai pegangan build: [versioning.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/versioning.md)
- Versioning diselaraskan ke `0.66.36` untuk menandai batch dokumentasi desain teknis `List PSB`, changelog, dan baseline release terkait.

## [0.66.35] - 2026-07-19

### Added

- Ditambahkan dokumen backlog teknis final lintas divisi untuk menerjemahkan mapping bisnis terbaru ke backlog implementasi yang bisa langsung dieksekusi, dengan fokus pada `List PSB`, `List Dismantle`, ownership `ODP/Port` oleh `CS`, domain `Finance`, penguatan `HR`, dan pemisahan workspace teknisi: [web-operational-final-backlog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-operational-final-backlog.md)
- Indeks dokumentasi diperbarui agar backlog lintas divisi baru masuk ke daftar dokumen utama dan mudah ditemukan saat handoff atau perencanaan sprint: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Changed

- Panduan versioning diselaraskan ke baseline terbaru `0.66.35` dan ringkasan status proyek kini menandai bahwa backlog teknis final lintas divisi sudah dikunci sebagai arah implementasi berikutnya: [versioning.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/versioning.md)
- Versioning diselaraskan ke `0.66.35` untuk menandai batch sinkronisasi backlog teknis final, changelog, dan baseline release dokumentasi lintas divisi.

## [0.66.34] - 2026-07-14

### Improved

- Teks dalam tabel `Trouble Ticket` dirapikan agar lebih mudah dipindai: hierarki antara nilai utama dan metadata pendukung diperjelas, badge tidak lagi bertumpuk tanpa peran, dan sel yang berisi banyak konteks kini dibagi ke blok informasi yang lebih konsisten: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Area `User / Layanan`, `Tindakan / PIC`, `Open`, `Target / SLA`, `Durasi`, dan `Keterangan` kini memakai label kecil yang lebih tenang dengan isi utama yang lebih dominan, sehingga tabel terasa lebih operasional dan tidak lagi tampak seperti tumpukan teks yang setara.
- Kartu mobile `Trouble Ticket` juga dirapikan dengan pemisahan metadata ke dua grup agar informasi tidak menumpuk vertikal dalam satu blok panjang.
- Versioning diselaraskan ke `0.66.34` untuk menandai batch perapihan keterbacaan teks pada tabel Trouble Ticket.

## [0.66.33] - 2026-07-14

### Fixed

- CTA support yang memakai hash `#support-action-*` kini benar-benar membuka popup form pada halaman aktif, bukan hanya mengubah URL hash tanpa memunculkan modal. Perbaikan dipusatkan di host modal agar berlaku merata untuk lane `TT`, `Isolir`, `Dismantle`, `SLA`, dan shell support yang memakai pola CTA yang sama: [support-action-form-modal.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-form-modal.tsx)
- Audit runtime browser menegaskan bahwa CTA utama `Tambah Ticket`, `Update Progress`, `Eskalasi`, dan `Tutup Ticket` di lane `Trouble Ticket` sekarang aktif membuka popup, sehingga pola CTA ke popup kembali konsisten dengan `Aksi cepat` di tabel.
- CTA lintas lane yang memang dirancang sebagai navigasi tetap dibiarkan sebagai navigasi, misalnya `Kontrol SLA Terkait` dan `Buka TT Aktif`, sehingga audit membedakan dengan jelas mana tombol popup dan mana tombol pindah lane.
- Versioning diselaraskan ke `0.66.33` untuk menandai batch audit dan perbaikan aktivasi CTA popup support.

## [0.66.32] - 2026-07-14

### Improved

- Lane `Trouble Ticket` kini dirapikan agar lebih mirip board laporan CS harian: ringkasan angka utama dipindah ke kartu atas yang langsung terbaca untuk `Trouble Open`, `Preventive Open`, `Siap Close`, `Overdue`, dan indikator `Ticket Berulang` berbasis pengulangan layanan/pelanggan aktif: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Filter TT kini dibentuk seperti board operasional, dengan area info lane dan shortcut aksi langsung di bar yang sama sehingga CS tidak perlu berpindah fokus dari filter ke tabel untuk mulai input atau follow-up ticket: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx)
- Tabel TT dirapikan menjadi lebih padat dan lebih mudah di-scan dengan susunan yang lebih dekat ke format laporan grup CS, termasuk kolom tindakan terakhir, open/update, target SLA, durasi aktif, dan keterangan antrian agar operator lebih cepat membaca kondisi ticket sebelum membuka popup aksi: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `Support shell` disesuaikan agar lane TT baru tetap konsisten baik saat dibuka dari workspace khusus maupun dari shell support umum: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Versioning diselaraskan ke `0.66.32` untuk menandai batch perapihan board Trouble Ticket ala laporan CS.

## [0.66.31] - 2026-07-14

### Improved

- Form write-side support yang sebelumnya dirender sebagai panel besar di bawah tabel kini dipindah ke modal aksi, sehingga user tidak perlu scroll ke bagian `Aksi utama lane` untuk membuka input, progress, close, restore, transfer, reopen, atau pengelolaan SLA: [support-action-form-modal.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-form-modal.tsx)
- Workspace lane `TT`, `Isolir`, `Dismantle`, dan `SLA` sekarang memakai modal form yang dibuka dari aksi tabel atau shortcut lane aktif, sementara panel form besar di bawah dihapus agar ritme kerja benar-benar tetap menempel pada area queue: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx)
- `Support root shell` yang sebelumnya menampilkan blok `Form operasional yang diprioritaskan untuk lane aktif` di bawah sekarang ikut dialihkan ke modal form yang sama, sehingga hash action lama tetap kompatibel tetapi hasil akhirnya membuka popup, bukan mendorong user mencari form ke bawah halaman: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Versioning diselaraskan ke `0.66.31` untuk menandai batch pemindahan form lane support dari panel bawah ke popup operasional.

## [0.66.30] - 2026-07-14

### Improved

- Popup `Aksi cepat` kini disatukan lewat komponen reusable umum untuk tabel operasional, sehingga baris kerja bisa membuka konteks, draft tindak lanjut, dan CTA tanpa duplikasi implementasi per modul: [table-quick-action-modal.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/table-quick-action-modal.tsx)
- Console `Sales` dan `Billing` sekarang mengganti tombol aksi row langsung menjadi `Aksi cepat`, sehingga operator tetap fokus pada tabel sambil membawa detail item dan shortcut ke form sekunder melalui popup: [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx), [billing-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-domain-workspace.tsx)
- Tabel `ODP` pada `Inventory` kini memakai popup aksi cepat untuk membuka konteks lokasi, port, koordinat, dan shortcut `Buka Maps`, sehingga aksi lapangan tidak lagi menonjol sebagai tombol tunggal yang terpisah dari detail row: [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx)
- Panel `Support` yang sebelumnya masih memakai kumpulan tombol per row kini dipindahkan ke popup aksi cepat pada tabel `Trouble Ticket`, `Isolation`, dan `Dismantle` open/history, sehingga lane support lebih konsisten dengan pola table-first yang sudah dipakai di `List Kerja` dan `Supervisor CS`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Versioning diselaraskan ke `0.66.30` untuk menandai batch penerapan popup aksi cepat pada tabel operasional utama lintas domain.

## [0.66.29] - 2026-07-14

### Improved

- Popup `Aksi cepat` untuk item `WorklistItem` kini diekstrak menjadi komponen reusable sehingga pola yang sama bisa dipakai lintas tabel operasional tanpa duplikasi logika draft, shortcut, dan CTA: [worklist-quick-action-modal.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-quick-action-modal.tsx), [worklist-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-table.tsx)
- `Workspace Supervisor CS` sekarang menempelkan tombol `Aksi cepat` langsung di tabel queue aktif, baik desktop maupun mobile, sehingga supervisor bisa membuka konteks item dan draft tindak lanjut tanpa harus berpindah dulu ke panel detail atau modul lain: [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx)
- Judul popup untuk supervisor dibedakan menjadi konteks queue supervisor agar alur kerja lintas approval, koreksi, transfer, dan risiko tinggi terasa lebih natural tetapi tetap memakai struktur pop-up yang sama dengan `List Kerja`: [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx)
- Versioning diselaraskan ke `0.66.29` untuk menandai batch lanjutan popup aksi cepat lintas tabel operasional.

## [0.66.28] - 2026-07-14

### Improved

- Tabel `List Kerja` kini menempelkan tombol `Aksi cepat` langsung pada setiap baris, baik desktop maupun mobile, sehingga operator bisa membuka konteks kerja tanpa harus pindah halaman lebih dulu: [worklist-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-table.tsx)
- Popup `Aksi cepat` baru menampilkan konteks inti item kerja seperti alasan muncul, langkah berikut, PIC/target, blocker, konteks kasus, aksi rekomendasi, shortcut lanjutan, dan CTA utama ke modul terkait agar ritme kerja terasa lebih table-first: [worklist-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-table.tsx)
- Popup tersebut juga menyediakan form draft tindak lanjut cepat di browser untuk memilih status kerja, menulis catatan operator, lalu menyalin ringkasan sebelum pindah ke modul utama; alurnya sengaja jujur ditandai sebagai helper sesi browser dan belum mengklaim penyimpanan backend: [worklist-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-table.tsx)
- Versioning diselaraskan ke `0.66.28` untuk menandai batch popup aksi cepat pada tabel kerja.

### Fixed

- transform tahap 3 tidak lagi memakai `JSON_TABLE` pada parsing `photo_list_text`, sehingga tetap kompatibel dengan MariaDB lokal saat tahap 4 mengeksekusi stage 1-4 berurutan: [xampp_review_transform_stage_3.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_3.sql)
- transform tahap 4 kini bisa resolve `target_subscription_id` dari staging order lintas batch (tidak mengunci `batch_id`), sehingga batch billing terpisah tetap bisa diimport setelah batch user/order selesai: [xampp_review_transform_stage_4.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_4.sql)
- eksekusi transform import kini me-render `@batch_id` langsung ke setiap statement sebelum dikirim ke MariaDB, sehingga transform sample tidak lagi berakhir `SUCCESS` tapi `0 imported` akibat session variable tidak terbaca: [import-write-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-write-service.ts)
- audit rerun tahap 2 `Wave 1B Ticket` kini lebih aman dipakai di phpMyAdmin: file SQL tidak lagi mengandalkan `USE`, section invalid/exception ditampilkan lebih eksplisit, relasi downstream `support_dismantle_history` dibaca lewat `support_isolations`, dan dokumen recovery menjelaskan perbedaan jalur phpMyAdmin vs MySQL CLI agar operator tidak lagi terjebak error `SOURCE`: [xampp_review_wave1b_ticket_stage2_rerun_audit.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_stage2_rerun_audit.sql), [hybrid-wave1b-ticket-stage2-rerun-recovery.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave1b-ticket-stage2-rerun-recovery.md)

### Improved

- Import Center kini memakai ringkasan yang lebih operasional: batch `IMPORTED` ditampilkan sebagai row final vs row yang masih perlu review, bukan lagi sekadar `valid / invalid`, sehingga hasil batch final tidak lagi tampak gagal saat sebenarnya sudah selesai diproses: [import-batch-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-table.tsx), [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)
- Panel review row staging kini menjelaskan bahwa yang tampil hanyalah sampel row terbaru, sehingga operator tidak lagi salah paham ketika filter `INVALID` kosong padahal exception batch ada di luar sampel 40 row yang dimuat: [import-batch-row-review.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-row-review.tsx), [import-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-service.ts)
- Copy halaman login dan attendance HR dirapikan agar lebih jujur dan praktis: login menekankan akun aktif vs jalur mock lokal, sementara attendance wajah kini dijelaskan sebagai capture/reference workflow yang sudah bisa dipakai tanpa menyiratkan bahwa matching biometrik penuh sudah hidup: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(auth)/login/page.tsx), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx)
- halaman detail batch import sekarang menampilkan ringkasan operasional per row (`imported`, `valid`, `mapped/pending`, `invalid/skipped`), progres finalisasi batch, dan breakdown tabel target final yang sudah terbentuk agar operator lebih cepat membaca hasil transform: [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)
- daftar batch import kini menampilkan informasi duplikat secara lebih eksplisit di tabel dan kartu mobile agar review awal operator lebih cepat: [import-batch-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-table.tsx)
- transform tahap 2 kini juga mengimpor `staging_legacy_user_records` ke `auth_users` dan langsung menghubungkan `target_user_id`, sehingga row seperti `USR-001` tidak lagi tertinggal dalam status `VALID`: [xampp_review_transform_stage_2.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_2.sql)
- panel aksi batch import kini memberi rekomendasi langkah berikutnya berdasarkan status batch dan row yang masih belum final, sehingga operator tidak perlu menebak apakah harus validasi atau menjalankan tahap 01-04 tertentu: [import-batch-action-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-action-panel.tsx)

## [0.66.27] - 2026-07-14

### Improved

- Landing awal per role kini lebih work-first: `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, dan `DIGITAL_CREATOR` diarahkan ke `List Kerja`, sementara `FIELD_TECHNICIAN`, `TT_OPERATOR`, dan `DISMANTLE_OPERATOR` langsung masuk ke lane support yang paling relevan agar user tidak lagi tersangkut di dashboard generik: [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts)
- Shell navigasi kini lebih operasional: deskripsi menu diperjelas, topbar menghapus elemen generik yang tidak membantu (`search`/`notification` palsu), menampilkan `Fokus Kerja` per role, dan sidebar menaruh `Kerja Harian` di urutan teratas dengan quick link mobile yang lebih ringkas: [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts), [topbar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/topbar.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Dashboard utama kini menempatkan `List Kerja` sebagai fokus pertama, memindahkan KPI menjadi ringkasan sekunder, menambahkan panduan baca singkat, dan menaruh panel manajerial/analitik lanjutan ke dalam area tambahan agar layar awal terasa lebih ringan untuk operator harian: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [dashboard-command-center.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-command-center.tsx), [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx)
- Versioning diselaraskan ke `0.66.27` untuk menandai batch penyederhanaan landing role, shell, dan dashboard operasional.

## [0.65.96] - 2026-07-13

### Fixed

- Helper `rehearse:production` di Windows tidak lagi mengandalkan `shell=true` untuk memanggil `npm`, sehingga warning `DEP0190` hilang dari output rehearsal dan runner command menjadi lebih aman untuk dipakai berulang pada mesin Windows: [rehearse-production.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/rehearse-production.mjs)
- Verifikasi ulang menunjukkan helper tetap berjalan normal melalui tahap `verify:production-env`, `check`, `test:smoke`, dan masuk ke fase `build` tanpa warning shell Windows.
- Versioning diselaraskan ke `0.65.96` untuk menandai batch hardening runner rehearsal Windows.

## [0.65.97] - 2026-07-13

### Fixed

- Flow `authenticateUser()` tidak lagi fallback diam-diam ke bootstrap mock saat `review-db` sudah aktif non-fallback; mock auth kini hanya hidup di mode mock/fallback lokal atau bila dipaksa eksplisit lewat `ALLOW_BOOTSTRAP_MOCK_AUTH=1`, dan production selalu menolaknya: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts)
- Route login sekarang membedakan kegagalan kredensial vs layanan auth review yang sedang tidak tersedia, sehingga masalah koneksi `auth_users`/review DB saat cutover tidak lagi tersamarkan sebagai `invalid_credentials`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/auth/login/route.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(auth)/login/page.tsx)
- Halaman login tidak lagi menampilkan username/password bootstrap di UI, dan narasi mode auth diperjelas agar operator tahu kapan login benar-benar bergantung pada `auth_users` review DB: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(auth)/login/page.tsx)
- Copy pada settings user diselaraskan dengan perilaku auth baru agar fallback mock tetap diposisikan sebagai jalur review lokal tanpa mengekspos kredensial: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/settings/users/page.tsx)
- Smoke coverage auth ditambah untuk mengunci empat perilaku penting: fallback mock tetap hidup pada mode lokal, fallback mati saat review DB aktif, error `unavailable` muncul saat review DB tidak bisa dijangkau, dan override eksplisit tetap bisa dipakai untuk review terkontrol: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Versioning diselaraskan ke `0.65.97` untuk menandai batch hardening auth hybrid dan sanitasi kredensial bootstrap.

## [0.65.98] - 2026-07-13

### Improved

- Bootstrap mock auth tidak lagi menyimpan password plaintext di source code. Daftar akun mock tetap tersedia untuk review UI/service, tetapi password kini dibaca dari environment (`BOOTSTRAP_MOCK_AUTH_CREDENTIALS` atau env key per-user) saat runtime lokal: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts)
- Template environment diperluas agar reviewer lokal bisa mengisi kredensial bootstrap secara sadar tanpa membawanya ke repo, sementara template production menegaskan nilai ini harus tetap kosong: [.env.example](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.example), [.env.production.example](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.example)
- Dokumen setup auth/XAMPP dan README diperbarui agar password review/bootstrap tidak lagi ditulis plaintext dan operator diarahkan memakai catatan internal yang aman atau env lokal terkontrol: [auth-review-seed.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/auth-review-seed.md), [xampp-setup.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/xampp-setup.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/README.md)
- Smoke test auth kini membuat kredensial bootstrap dinamis saat runtime, sehingga repo tidak kembali menyimpan password tetap hanya demi kebutuhan verifikasi test: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Versioning diselaraskan ke `0.65.98` untuk menandai batch sanitasi residual kredensial bootstrap.

## [0.65.99] - 2026-07-13

### Fixed

- Sidebar dan route workspace khusus kini fail-closed ke role target agar menu tidak misleading: `CS & Admin CS` hanya untuk `SUPER_ADMIN/CS_ADMIN`, `Digital Creator` hanya untuk `SUPER_ADMIN/DIGITAL_CREATOR`, `Teknisi *` hanya untuk `SUPER_ADMIN/FIELD_TECHNICIAN`, serta `Legal`, `Kantor`, dan `Toko` ditahan ke `SUPER_ADMIN`: [organization-workspace-access.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspace-access.ts), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/sales/digital-creator/page.tsx)
- Workspace supervisor `CS_ADMIN` tidak lagi menampilkan shortcut `Buka Billing` yang bertentangan dengan RBAC dasar: [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx)
- Shell sales tidak lagi menampilkan CTA `Buka Import Center` untuk role marketing karena route `/import` memang terjaga untuk `SUPER_ADMIN`; CTA utama kini diarahkan ke `List Kerja`: [mock-domains.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-domains.ts)
- Validator env production kini mengenali placeholder `replace-with-strong-random-secret`, sehingga template env tidak bisa lolos false-green saat secret belum diganti: [verify-production-env.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-production-env.mjs)

### Improved

- Checklist readiness, rehearsal, cutover, dan UAT diselaraskan dengan hardening repo sampai `0.65.99`, termasuk bukti UAT role prioritas (`DISMANTLE_OPERATOR`, `CS_OPERATOR`, `CS_ADMIN`, `SALES_MARKETING`) dan snapshot blocker aktual menuju `GO`: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
- Katalog menu per role/divisi diperbarui agar mencerminkan sidebar aktual dan default landing yang benar, lalu dilengkapi artefak audit menu baru untuk menandai area yang sudah oke, misleading, dan masih perlu dibenahi: [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md), [web-role-menu-audit-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-menu-audit-2026-07-13.md)
- Versioning diselaraskan ke `0.65.99` untuk menandai batch audit menu per role, sinkronisasi readiness/cutover, dan pengetatan guard workspace khusus.

## [0.66.00] - 2026-07-13

### Fixed

- Query supervisor `CS_ADMIN` tidak lagi memakai `status` ambigu pada high-risk support ticket, sehingga landing `/customers/cs-admin` kembali membaca bucket supervisor dari review DB tanpa jatuh ke fallback `Column 'status' in field list is ambiguous`: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Improved

- Bukti UAT dan dokumen readiness diperbarui untuk menandai bahwa smoke login/landing `CS_ADMIN` kini sudah valid kembali, sementara blocker yang tersisa bergeser ke pembuktian write-side supervisor, bukan lagi query supervisor yang rusak: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Versioning diselaraskan ke `0.66.00` untuk menandai penutupan blocker readiness `CS_ADMIN`.

## [0.66.01] - 2026-07-13

### Improved

- Smoke proof write-side support ditambahkan agar guard dan audit trail untuk `restore isolir`, `transfer ke dismantle`, dan `reopen dismantle` bisa diverifikasi ulang tanpa melakukan mutasi review DB sembarangan: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Artefak bukti baru merangkum guard role, guard state/schema, format audit note, dan gap manual mutation proof untuk flow write-side support prioritas: [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md)
- Checklist hardening dan template evidence go-live kini menautkan bukti write-side support secara eksplisit, sementara audit menu role ikut diselaraskan agar tidak lagi menyebut blocker query `CS_ADMIN` yang sudah tertutup: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-role-menu-audit-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-menu-audit-2026-07-13.md)
- Versioning diselaraskan ke `0.66.01` untuk menandai batch proof write-side support dan sinkronisasi evidencenya.

## [0.66.02] - 2026-07-13

### Fixed

- Route `reopen dismantle` kini merelink lineage `staging_legacy_support_records` dari `target_dismantle_history_id` ke `target_dismantle_queue_id` baru sebelum menghapus histori, sehingga foreign key review DB tidak lagi memblokir reopen nyata pada data production review: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts)

### Improved

- Helper proof terkontrol ditambahkan untuk discovery kandidat, snapshot before/after, dan apply mode yang dipagari `--confirm-db/--confirm-host`, sehingga mutation proof support bisa dijalankan ulang tanpa raw SQL ad-hoc: [prove-support-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-support-write-side.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Mutation proof aktual sudah berhasil dijalankan untuk tiga flow support prioritas pada review DB: `restore isolir` (`271`), `transfer ke dismantle` (`272`), dan `reopen dismantle` (`321`), lengkap dengan before/after evidence yang kini diringkas di dokumen proof support: [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md)
- Checklist hardening kini menandai `restore / transfer / reopen` sebagai write action yang sudah diuji manual terkontrol, sehingga blocker write-side support bergeser ke `update TT teknis` dan `update port/ODP`: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
- Versioning diselaraskan ke `0.66.02` untuk menandai penutupan mutation proof support prioritas dan hardening reopen lineage staging.

## [0.66.04] - 2026-07-13

### Improved

- Menu `Operasional > Toko` kini ditandai sebagai business di luar scope ISP (fase ini) dan menampilkan placeholder “Workspace Toko belum tersedia” beserta tabel kerja dummy agar statusnya eksplisit sambil menunggu definisi proses yang valid: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/toko/page.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts)
- Domain workspace kini menampilkan empty-state “Tabel kerja” bila section review belum tersedia, sehingga menu domain tidak lagi terasa tanpa tabel kerja saat data/query belum siap: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Versioning diselaraskan ke `0.66.04`.

## [0.66.25] - 2026-07-13

### Improved

- Ditambahkan audit read-only [xampp_review_wave1b_ticket_stage2_rerun_audit.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_stage2_rerun_audit.sql) untuk memeriksa collision target customer/order/subscription/work order, duplicate final record, dan downstream reference ketika `Wave 1B Ticket` atau `transform tahap 2` terlanjur dijalankan ganda.
- Ditambahkan panduan [hybrid-wave1b-ticket-stage2-rerun-recovery.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave1b-ticket-stage2-rerun-recovery.md) agar tim bisa membedakan antara duplikat UI/metadata, duplicate final yang masih aman, dan duplicate final yang butuh cleanup terarah sebelum lanjut hosting.
- Runbook `Wave 1B Ticket production` dan snapshot readiness production kini menautkan jalur audit rerun tahap 2 supaya recovery tidak lagi mengandalkan hapus manual buta: [hybrid-wave-1b-psb-ticket-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1b-psb-ticket-production-runbook.md), [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
- Versioning diselaraskan ke `0.66.25` untuk menandai paket audit/recovery rerun tahap 2.

## [0.66.24] - 2026-07-13

### Improved

- Ditambahkan helper [evaluate-server-readiness.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/evaluate-server-readiness.mjs) dan script `npm run evaluate:server-readiness` untuk membaca bundle proof-pack bertimestamp di `docs/go-live/` lalu mengeluarkan keputusan teknis `ready`, `partial`, atau `rollback-recommended` beserta alasan dan warning.
- Handoff operator, command sheet server-side, runbook hosting, checklist hari-H, checklist rehearsal, template evidence, dan checklist readiness kini memasukkan langkah evaluator keputusan teknis agar urutan operasional menjadi `proof pack -> evaluate -> sign-off`: [web-server-operator-handoff.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-operator-handoff.md), [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-server-rehearsal-execution-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-rehearsal-execution-template.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Versioning diselaraskan ke `0.66.24` untuk menandai evaluator keputusan teknis server-side.

## [0.66.23] - 2026-07-13

### Improved

- Ditambahkan lembar [web-server-operator-handoff.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-operator-handoff.md) sebagai handoff paling ringkas untuk operator host nyata, berisi input wajib, command utama, output artefak, browser minimum, rollback cepat, dan sign-off final dalam satu dokumen.
- Command sheet server-side, runbook hosting, checklist hari-H, template evidence, dan checklist readiness kini menautkan handoff operator tersebut agar PIC deploy tidak perlu membuka terlalu banyak dokumen saat rehearsal / cutover nyata: [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Versioning diselaraskan ke `0.66.23` untuk menandai paket handoff operator host nyata.

## [0.66.22] - 2026-07-13

### Improved

- `capture:server-proof-pack` kini mendukung `--stamp` dan `--output-dir`, sehingga paket bukti server-side dapat menghasilkan artefak bertimestamp seperti `web-reverse-proxy-check.<stamp>.json` dan `web-go-live-evidence-generated.<stamp>.md` tanpa menimpa rehearsal / hari-H sebelumnya: [capture-server-proof-pack.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/capture-server-proof-pack.mjs)
- Command sheet, runbook hosting, checklist rehearsal/cutover, template evidence, dan checklist readiness kini mengarahkan operator memakai output bertimestamp di `docs/go-live/` agar jejak audit lebih rapi: [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-server-rehearsal-execution-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-rehearsal-execution-template.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Versioning diselaraskan ke `0.66.22` untuk menandai output proof-pack bertimestamp.

## [0.66.21] - 2026-07-13

### Improved

- Ditambahkan helper `npm run capture:server-proof-pack` untuk menjalankan paket bukti server-side secara berurutan: `verify:reverse-proxy`, `verify:server-runtime`, `render:server-runtime-report`, lalu `collect:go-live-evidence`, sehingga operator host target punya satu command utama yang lebih sulit melenceng urutannya: [capture-server-proof-pack.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/capture-server-proof-pack.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Command sheet, runbook hosting, checklist rehearsal/cutover, template evidence, dan checklist readiness kini menempatkan helper orkestrasi ini sebagai jalur cepat server-side dengan langkah manual tetap tersedia sebagai fallback: [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-server-rehearsal-execution-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-rehearsal-execution-template.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Versioning diselaraskan ke `0.66.21` untuk menandai orkestrasi paket bukti server-side.

## [0.66.20] - 2026-07-13

### Improved

- `collect:go-live-evidence` kini dapat menyerap otomatis output `docs/web-reverse-proxy-check.json` dan `docs/web-server-runtime-check.json` bila keduanya sudah dibuat lebih dulu, sehingga markdown evidence hari-H langsung memuat ringkasan reverse proxy, runtime, dan detail JSON tanpa rangkuman manual terpisah: [collect-go-live-evidence.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/collect-go-live-evidence.mjs)
- Runbook hosting, command sheet server-side, template evidence, dan checklist readiness kini menjelaskan bahwa collector otomatis membaca dua file JSON standar tersebut sebagai paket bukti teknis server-side: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Versioning diselaraskan ke `0.66.20` untuk menandai bundling evidence reverse proxy + runtime ke collector go-live.

## [0.66.19] - 2026-07-13

### Improved

- Ditambahkan helper `npm run verify:reverse-proxy` untuk membuktikan config reverse proxy/Nginx di server memakai `server_name` yang benar, `proxy_pass` ke `127.0.0.1:3000`, header proxy inti lengkap, serta merekam hasil `nginx -t` dan reload ke JSON yang siap dilampirkan sebagai evidence: [verify-reverse-proxy.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-reverse-proxy.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Runbook hosting, command sheet server-side, checklist rehearsal/cutover, template evidence, dan snapshot lokal kini menautkan helper reverse proxy agar gap `Nginx` pada rehearsal server-side tidak lagi hanya berupa checklist manual: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-server-rehearsal-execution-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-rehearsal-execution-template.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md), [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md)
- Versioning diselaraskan ke `0.66.19` untuk menandai penutupan gap bukti reverse proxy di paket production rehearsal/go-live.

## [0.66.18] - 2026-07-13

### Improved

- Ditambahkan template [web-backup-rollback-proof-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-backup-rollback-proof-template.md) agar bukti backup DB, backup `.env`, trigger rollback, dan hasil health pasca-rollback bisa dicatat dengan format siap-audit.
- Command sheet, runbook hosting, checklist readiness, checklist cutover web, dan checklist cutover hybrid kini mewajibkan pencatatan backup/rollback proof dan tidak lagi mengandalkan commit hash hardcoded lama: [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
- Snapshot lokal kini menandai kesiapan template backup/rollback dan menghindari referensi commit kandidat yang mudah stale: [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md)
- Versioning diselaraskan ke `0.66.18`.

## [0.66.17] - 2026-07-13

### Improved

- Ditambahkan helper `render:server-runtime-report` untuk mengubah output JSON dari `verify:server-runtime` menjadi report markdown yang siap ditempel ke evidence rehearsal / hari-H: [render-server-runtime-report.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/render-server-runtime-report.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Ditambahkan worksheet [web-server-rehearsal-execution-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-rehearsal-execution-template.md) agar PIC deploy dapat mencatat urutan command, durasi, artefak, dan keputusan rehearsal server secara real-time.
- Checklist rehearsal, cutover, runbook hosting, readiness hosting, dan template evidence kini memasukkan alur `verify:server-runtime -> render:server-runtime-report -> collect:go-live-evidence` sehingga bukti server-side lebih siap dibaca dan diaudit: [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)
- Renderer runtime sudah diverifikasi dalam mode aman lokal untuk memastikan report markdown benar-benar terbentuk sebelum dipakai di server nyata.
- Versioning diselaraskan ke `0.66.17`.

## [0.66.16] - 2026-07-13

### Improved

- Ditambahkan helper `verify:server-runtime` untuk memberi status `pass/fail` pada runtime server-side, mencakup PM2, `verify:health`, dan probe `/login` localhost maupun domain sebelum keputusan hari-H diambil: [verify-server-runtime.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-server-runtime.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Command sheet, runbook, checklist go-live, dan template evidence kini memasukkan langkah `verify:server-runtime` dan artefak `web-server-runtime-check.json` agar validasi runtime server tidak lagi murni manual: [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Helper runtime diverifikasi dalam mode aman lokal untuk memastikan output JSON dan exit behavior siap dipakai pada server nyata.
- Versioning diselaraskan ke `0.66.16`.

## [0.66.15] - 2026-07-13

### Improved

- Ditambahkan helper `collect:go-live-evidence` untuk mengumpulkan snapshot teknis server-side ke file markdown, mencakup kandidat rilis, status PM2, hasil `verify-health`, serta probe `/login` lokal/domain: [collect-go-live-evidence.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/collect-go-live-evidence.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Command sheet, runbook hosting, checklist go-live, dan template evidence kini mengarahkan PIC deploy memakai helper collector ini agar bukti teknis hari-H lebih konsisten dan cepat dibaca: [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- Helper collector sudah diuji dalam mode aman lokal untuk menghasilkan file evidence tanpa menyentuh server production, sehingga jalur eksekusi hari-H lebih siap dipakai.
- Versioning diselaraskan ke `0.66.15`.

## [0.66.14] - 2026-07-13

### Improved

- Ditambahkan helper `prepare:production-rehearsal-env` untuk membuat env rehearsal sementara dengan `AUTH_SESSION_SECRET` valid tanpa menyentuh `.env` utama, sehingga PIC deploy bisa menjalankan preflight production lebih aman: [prepare-production-rehearsal-env.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prepare-production-rehearsal-env.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Runbook hosting, command sheet server-side, checklist rehearsal, template evidence, dan checklist go-live kini memakai jalur yang sama untuk rehearsal aman dan pengumpulan bukti teknis hari-H: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Catatan readiness hosting diperbarui agar sinkron dengan status lokal terbaru, termasuk `SALES_MARKETING` yang sudah `pass` dan fokus tersisa yang kini murni berada pada eksekusi server-side: [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md)
- Versioning diselaraskan ke `0.66.14`.

## [0.66.13] - 2026-07-13

### Improved

- Dokumen cutover production kini mencatat commit kandidat rilis dan rollback stabil yang nyata, sehingga paket hari-H tidak lagi bergantung pada ingatan manual operator: [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Snapshot evidence lokal kini menunjuk commit kandidat terbaru `32dc210`, selaras dengan status worktree bersih setelah fondasi operasional lokal ditutup ke `100%`: [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md)
- Versioning diselaraskan ke `0.66.13`.

## [0.66.12] - 2026-07-13

### Improved

- Kesiapan fondasi operasional lokal ditutup ke `100%`: `SALES_MARKETING` kini `pass` dengan login akun review nyata, create lead awal, dan monitoring `support/inventory`, sedangkan `CS_ADMIN` kini `pass penuh` setelah bucket `Perlu Approval` dan `Perlu Koreksi` diisi lewat proof lokal supervisor: [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
- Ditambahkan helper proof `prove:cs-admin-supervisor-flow` untuk membuat bukti lokal queue supervisor `CS_ADMIN` melalui API resmi aplikasi, lengkap dengan evidence JSON: [prove-cs-admin-supervisor-flow.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-cs-admin-supervisor-flow.mjs), [cs-admin-supervisor-proof.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/cs-admin-supervisor-proof.json)
- Rantai handoff lintas divisi dari Billing ke isolir, TT, SLA, dismantle, dan supervisor CS terverifikasi penuh menggunakan akun `SUPER_ADMIN`, sekaligus UI operator-facing dibersihkan dari copy `web-psb-perkasa`/`legacy` yang menurunkan kepercayaan operasional: [billing-decision-handoff-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-decision-handoff-panel.tsx), [marketing-activity-manager.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/marketing-activity-manager.tsx), [inventory-odp-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-create-form.tsx), [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx), [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx)
- Snapshot readiness lokal dan checklist go-live kini menandai seluruh role fondasi lokal `pass`; fokus berikutnya bergeser penuh ke cutover infra production dan rehearsal server-side: [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Versioning diselaraskan ke `0.66.12`.

## [0.66.11] - 2026-07-13

### Improved

- Blocker `NOC_OPERATOR` ditutup melalui helper terjaga `reset:review-auth-password`, penyelarasan ulang `support.ops` pada review DB, dan evidence lokal tanpa hash sensitif: [reset-review-auth-password.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/reset-review-auth-password.mjs), [reset-review-auth-support-ops.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/reset-review-auth-support-ops.json)
- UAT browser `NOC_OPERATOR` kini `pass`: login `support.ops` berhasil ke `/support/tt`, source badge `Review DB` tampil benar, lane `Trouble Ticket` berisi, dan menu `support/inventory` terbuka: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
- Snapshot readiness dan checklist go-live kini menandai fondasi lokal tanpa blocker auth role inti; fokus tersisa bergeser ke cutover infra production dan pengayaan evidence server-side: [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Versioning diselaraskan ke `0.66.11`.

## [0.66.10] - 2026-07-13

### Improved

- Ditambahkan snapshot evidence lokal pra-go-live yang merangkum status repo, hasil health lokal, write-side proof prioritas, dan posisi role fondasi untuk keputusan `GO / PILOT / TAHAN`: [web-go-live-evidence-local-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-local-2026-07-13.md)
- Checklist go-live Senin kini memakai snapshot readiness terbaru `0.66.09`, termasuk status `TT_OPERATOR` yang sudah `pass`, `CS_ADMIN` yang sudah pulih dari blocker query ambigu, dan `NOC_OPERATOR` yang tersisa sebagai blocker kredensial: [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Versioning diselaraskan ke `0.66.10`.

## [0.66.09] - 2026-07-13

### Improved

- Bukti UAT role teknis diperbarui: `TT_OPERATOR` kini tercatat `pass` dengan lane `Trouble Open` yang berisi pada `Review DB`, sedangkan `NOC_OPERATOR` ditandai `blocked` karena kredensial `support.ops` yang tersedia di review DB belum bisa dipakai login pada instance lokal saat UAT browser: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
- Checklist cutover kini menandai validasi `TT_OPERATOR` sebagai lulus dan menyisakan `NOC_OPERATOR` sebagai blocker kredensial yang harus ditutup sebelum pilot teknis dianggap lengkap: [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
- Versioning diselaraskan ke `0.66.09`.

## [0.66.08] - 2026-07-13

### Improved

- Mutation proof terkontrol untuk `update port/ODP` sudah dijalankan pada review DB untuk `TRKL/07 - 15` port `8` (assign → revert ke `AVAILABLE` dengan `clearMapping`), lengkap dengan evidence before/after JSON: [odp-assign-TRKL-07-15-8.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/odp-assign-TRKL-07-15-8.json), [odp-status-TRKL-07-15-8.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/odp-status-TRKL-07-15-8.json)
- Checklist hardening dan dokumen proof support kini menandai `update port/ODP` sebagai `pass`, sehingga seluruh flow write-side support prioritas sudah memiliki bukti mutasi terkontrol: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md)
- Versioning diselaraskan ke `0.66.08`.

## [0.66.07] - 2026-07-13

### Improved

- Mutation proof terkontrol untuk `update TT teknis` (progress/escalate/close) sudah dijalankan pada review DB untuk tiket `PV/PKN/07.2026/01`, lengkap dengan evidence before/after JSON: [tt-progress-PV-PKN-07.2026-01.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/tt-progress-PV-PKN-07.2026-01.json), [tt-escalate-PV-PKN-07.2026-01.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/tt-escalate-PV-PKN-07.2026-01.json), [tt-close-PV-PKN-07.2026-01.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/tt-close-PV-PKN-07.2026-01.json)
- Dokumen proof support dan checklist hardening kini menandai `update TT teknis` sebagai `pass`, sehingga gap write-side support berikutnya tinggal `update port/ODP`: [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md), [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
- Versioning diselaraskan ke `0.66.07`.

## [0.66.06] - 2026-07-13

### Improved

- Helper mutation proof TT dan ODP kini dapat membaca credential login dari env lokal (`PROOF_USERNAME` / `PROOF_PASSWORD`) untuk mencegah password tercatat di command history/terminal log saat menjalankan mode `--apply`: [prove-tt-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-tt-write-side.mjs), [prove-odp-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-odp-write-side.mjs), [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md)
- Versioning diselaraskan ke `0.66.06`.

## [0.66.05] - 2026-07-13

### Improved

- Helper mutation proof baru ditambahkan untuk menutup gap write-side yang tersisa pada checklist hardening:
  - `update TT teknis` (progress / eskalasi / close): [prove-tt-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-tt-write-side.mjs)
  - `update port/ODP` (assign / status): [prove-odp-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-odp-write-side.mjs)
- Dokumen proof support diperluas dengan referensi route dan contoh command helper untuk TT dan ODP: [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md)
- Versioning diselaraskan ke `0.66.05`.

## [0.66.03] - 2026-07-13

### Improved

- Menu organisasi yang sebelumnya hanya berisi landing/steps kini otomatis diarahkan ke halaman bertabel (table-first) agar tidak ada menu yang terasa “kosong” untuk operasional harian: `Legal`, `Kantor`, `Toko`, `Teknisi PSB`, `Teknisi Expan`, `Teknisi Jointer`, dan `Digital Creator`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/legal/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/kantor/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/toko/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-psb/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-expan/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-jointer/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/sales/digital-creator/page.tsx)
- `Digital Creator` workspace kini menjadikan tabel campaign sebagai primary action agar jalur kerja kreator langsung terlihat tanpa harus masuk ke landing kosong: [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts)
- Versioning diselaraskan ke `0.66.03` untuk menandai batch table-first redirect pada menu organisasi.

## [0.65.95] - 2026-07-13

### Improved

- Ditambahkan helper `npm run rehearse:production` untuk menjalankan preflight production secara berurutan (`verify:production-env` → `check` → `test:smoke` → `build` → start standalone → `verify:health`) agar latihan deploy lebih konsisten dan tidak bergantung pada urutan manual operator: [rehearse-production.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/rehearse-production.mjs), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Runbook hosting dan checklist rehearsal diperluas agar command rehearsal otomatis ini bisa langsung dipakai saat server-side rehearsal berikutnya: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md)
- Versioning diselaraskan ke `0.65.95` untuk menandai batch otomasi preflight rehearsal production.

## [0.65.94] - 2026-07-13

### Improved

- Endpoint `/api/health` kini membedakan readiness development vs production secara eksplisit. Pada production, health akan gagal jika `AUTH_SESSION_SECRET` belum siap atau aplikasi masih berjalan pada data source mock/fallback, sehingga status tidak lagi “hijau” saat syarat cutover inti belum terpenuhi: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/health/route.ts)
- Payload health kini menyertakan status `auth.ready`, `dataSource.ready`, dan blok `deployment` berisi readiness serta warning yang lebih jelas, sehingga operator deployment lebih mudah membaca alasan hosting belum siap.
- Script `verify-health` kini memaksa `AUTH_SESSION_SECRET` dan mode `review-db` non-fallback pada environment production, tetapi tetap permisif di development agar alur lokal tidak terganggu: [verify-health.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-health.mjs)
- Versioning diselaraskan ke `0.65.94` untuk menandai batch hardening readiness health production.

## [0.65.92] - 2026-07-13

### Fixed

- Build production tidak lagi gagal karena modul server (`mysql2` via `review-db`) ikut ter-bundle ke komponen client; konstanta Digital Creator dipisah ke modul khusus dan `digital-creator-service` ditandai `server-only` untuk mencegah import lintas boundary: [digital-creator-manager.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/digital-creator-manager.tsx), [digital-creator-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/digital-creator-service.ts), [digital-creator-constants.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/digital-creator-constants.ts)
- Build production tidak lagi bergantung pada fetch Google Fonts (yang bisa gagal di CI/offline) karena layout memakai system font stack untuk `--font-body` dan `--font-heading`: [layout.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/layout.tsx)
- Versioning diselaraskan ke `0.65.92` untuk menandai batch hardening hosting/build.

## [0.65.93] - 2026-07-13

### Improved

- Pengembangan via `127.0.0.1` tidak lagi memblokir resource dev Next.js (HMR/webpack-hmr) karena host tersebut sudah di-whitelist pada `allowedDevOrigins`, mengurangi error `ERR_CONNECTION_*`/refresh saat preview memakai `127.0.0.1`: [next.config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/next.config.ts)
- `next-env.d.ts` mengikuti output type generator terbaru dari Next.js (`.next/types/routes.d.ts`) agar konsisten setelah build.
- Versioning diselaraskan ke `0.65.93` untuk menandai batch hardening dev ergonomics.

## [0.65.91] - 2026-07-13

### Improved

- Endpoint `/api/health` kini tidak lagi “false green”: saat mode efektif `review-db` dan bukan fallback, health akan melakukan ping DB (`SELECT 1`) dan validasi minimal schema (kolom inti seperti `support_isolations.status` dan `support_trouble_tickets.ticket_code`). Jika review DB tidak ready, response mengembalikan `ok=false` dan status `503`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/health/route.ts)
- Script `verify-health` kini ikut memvalidasi readiness review DB saat mode efektif `review-db`, sehingga pipeline/deploy tidak hanya lolos karena `ok=true` generik: [verify-health.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-health.mjs)
- Versioning diselaraskan ke `0.65.91` untuk menandai batch hardening guardrail deploy/operasional.

## [0.65.90] - 2026-07-13

### Improved

- Guardrail skrip backfill support diperketat: mode `--apply` sekarang wajib menyertakan konfirmasi target (`--confirm-db` atau `--confirm-host`) dan skrip menampilkan ringkasan target DB yang akan disentuh agar mengurangi risiko salah environment saat backfill: [backfill-support-legacy-context.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-legacy-context.mjs), [backfill-support-dismantle-history.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-dismantle-history.mjs)
- Produksi key matching pada production pack kini mendeteksi collision (duplicate key) dan otomatis menandai key ambigu sebagai `skip`, sehingga backfill tidak memaksa “first match wins” pada data legacy yang bisa punya nama + timestamp serupa.
- Versioning diselaraskan ke `0.65.90` untuk menandai batch hardening guardrail backfill.

## [0.65.89] - 2026-07-13

### Fixed

- Route `restore` untuk `support_isolations` kini schema-aware sejak fase baca awal, sehingga review DB parsial yang belum punya `customer_name` atau `restoration_date` tidak lagi gagal lebih dulu sebelum guard update sempat berjalan: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/restore/route.ts)
- Flow `reopen` dari `support_dismantle_history` kini memvalidasi state isolir asal sebelum mutasi lintas tabel, sehingga histori tidak bisa sembarang dibuka ulang saat isolir sebenarnya sudah aktif dan queue belum kosong: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts)
- Flow `close` untuk `support_dismantle_queue` kini memvalidasi kolom inti `isolation_id` dan state isolir asal sebelum insert histori + update isolir + delete queue, sehingga jalur penutupan lebih tahan terhadap schema drift maupun state data setengah konsisten: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts)
- Versioning diselaraskan ke `0.65.89` untuk menandai batch hardening write-side support prioritas tinggi.

## [0.65.88] - 2026-07-13

### Improved

- Skrip audit `support_isolations` dan `support_dismantle_queue` kini membaca langsung production pack `isolation.production.json` dan `dismantle-tickets.production.json`, lalu menghitung coverage kandidat enrichment untuk row hasil `Legacy Sanitizer`, sehingga keputusan sanitasi lane isolir/dismantle aktif bisa didasarkan pada angka source pack yang bisa diulang: [backfill-support-legacy-context.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-legacy-context.mjs)
- Audit final menunjukkan `132` row `support_isolations.reason` open dan `32` row `support_dismantle_queue.transfer_note` yang berasal dari `Legacy Sanitizer` tidak memiliki pasangan source-pack yang lebih kaya (`enrichable = 0` untuk keduanya), sehingga konteks generik yang tersisa saat ini dipastikan merupakan batas source data, bukan missed backfill baru.
- Versioning diselaraskan ke `0.65.88` untuk menandai batch audit final lane isolir dan dismantle queue berbasis production pack.

## [0.65.87] - 2026-07-13

### Fixed

- `support_dismantle_history.close_note` yang sebelumnya hanya berisi suffix `Closed By: ...` kini diperkaya menggunakan `reason` / `closeNote` dari production pack `dismantle-history.production.json` (matching by `customer_name + closed_at`), sehingga histori penutupan dismantle legacy lebih informatif untuk operator tanpa mengubah `Closed By`: [backfill-support-dismantle-history.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-dismantle-history.mjs)
- Batch backfill berhasil mengupdate `73` histori dismantle agar menampilkan kalimat alasan sebelum `Closed By:`. Residual `Closed By:` tanpa alasan dipertahankan karena memang source pack tidak memiliki note untuk pasangan tersebut.
- Versioning diselaraskan ke `0.65.87` untuk menandai batch enrichment close note histori dismantle berbasis production pack.

## [0.65.86] - 2026-07-13

### Improved

- Skrip audit `support_dismantle_history` kini membaca langsung production pack `dismantle-history.production.json` dan melaporkan coverage `radboox`, `reason`, `closeNote`, serta `sourceIsolationId`, sehingga batas maksimum pemulihan radbox histori bisa dibuktikan dari source production asli, bukan hanya dari review DB dan staging: [backfill-support-dismantle-history.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-dismantle-history.mjs)
- Audit final production pack mengonfirmasi hanya `4` dari `293` row `DismantleHistory` source yang memiliki `radboox`, dan tidak ada kandidat backfill baru untuk `271` histori residual yang masih kosong di final table; residual tersebut dipastikan memang berasal dari source data yang kosong.
- Dokumentasi hasil batch `Wave 1A support production` diperluas dengan temuan residual radbox histori agar keputusan mempertahankan fallback `Radbox belum terpetakan` tercatat resmi sebagai keterbatasan source data, bukan bug transform: [hybrid-wave-1a-psb-support-production-results.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-support-production-results.md)
- Versioning diselaraskan ke `0.65.86` untuk menandai batch audit final residual histori dismantle berbasis production pack.

## [0.65.85] - 2026-07-13

### Improved

- Skrip audit/backfill histori `support_dismantle_history` kini juga memeriksa fallback kedua dari `staging_legacy_support_records`, lalu menampilkan ringkasan cakupan sumber radbox (`support_isolations`, `staging`, atau benar-benar tanpa sumber`) agar keputusan sanitasi data legacy bisa didasarkan pada angka nyata, bukan asumsi: [backfill-support-dismantle-history.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-dismantle-history.mjs)
- Audit lanjutan mengonfirmasi bahwa `271` row histori dismantle yang radbox-nya masih kosong memang tidak punya sumber aman tambahan di review DB maupun staging legacy, sehingga residual `Radbox belum terpetakan` dipertahankan sebagai fallback jujur dan tidak lagi dipaksa backfill.
- Versioning diselaraskan ke `0.65.85` untuk menandai batch audit sumber residual histori dismantle.

## [0.65.84] - 2026-07-13

### Fixed

- Ditambahkan skrip reusable untuk audit dan backfill histori `support_dismantle_history`, dengan mode `dry-run` dan `--apply`, agar perbaikan `radbox_name` histori lama bisa dijalankan ulang secara aman bila nanti ada sumber data fallback tambahan: [backfill-support-dismantle-history.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-dismantle-history.mjs)
- Audit review DB mengonfirmasi `close_note` histori dismantle sebenarnya sudah terisi (`0` row kosong), sehingga batch ini difokuskan ke `radbox_name`; dari `286` row histori yang radbox-nya kosong, `15` row berhasil di-backfill aman dari `support_isolations.radbox_name`.
- Recheck browser pada `/support/dismantle` mengonfirmasi sebagian histori yang sebelumnya jatuh ke `Radbox belum terpetakan` kini kembali menampilkan radbox aktual, sementara residual row yang belum terisi tetap dipertahankan sebagai fallback jujur karena tidak ada sumber data aman.
- Versioning diselaraskan ke `0.65.84` untuk menandai batch sanitasi histori dismantle legacy pada review DB.

## [0.65.83] - 2026-07-13

### Fixed

- Ditambahkan skrip reusable untuk audit dan backfill konteks support legacy pada review DB, dengan mode `dry-run` dan `--apply`, sehingga sanitasi `support_isolations.reason` dan `support_dismantle_queue.transfer_note` bisa dijalankan ulang secara aman pada batch data lama berikutnya: [backfill-support-legacy-context.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/backfill-support-legacy-context.mjs)
- Backfill review DB berhasil mengisi `132` row kosong pada `support_isolations.reason` dan `32` row kosong pada `support_dismantle_queue.transfer_note`, sehingga lane `isolir` dan `dismantle` tidak lagi bergantung pada placeholder generik untuk mayoritas backlog legacy.
- Recheck browser mengonfirmasi placeholder `Belum ada alasan isolir yang tercatat.` dan `Belum ada catatan transfer untuk kandidat dismantle ini.` sudah hilang dari daftar utama UI setelah batch backfill dijalankan.
- Versioning diselaraskan ke `0.65.83` untuk menandai batch sanitasi data legacy support pada review DB.

## [0.65.82] - 2026-07-13

### Fixed

- Read-side `dismantle` kini mem-fallback `radbox` histori ke `support_isolations.radbox_name` saat `support_dismantle_history.radbox_name` kosong, sehingga histori terminate lama tidak lagi kehilangan konteks perangkat hanya karena kolom histori legacy belum lengkap: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Queue `dismantle` aktif kini mem-fallback detail utama ke `alasan isolir` saat `transfer_note` legacy kosong, sehingga panel operasional tidak lagi terlalu cepat jatuh ke placeholder generik pada antrean lama: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Audit DB review mengonfirmasi gap `isolation reason` dan `transfer_note` mayoritas berasal dari data legacy (`NULL`) alih-alih bug query, sementara recheck browser menunjukkan placeholder misleading di `/support/dismantle` turun signifikan setelah hardening fallback.
- Versioning diselaraskan ke `0.65.82` untuk menandai follow-up UAT support non-TT pada lane dismantle.

## [0.65.81] - 2026-07-13

### Fixed

- Alias lane support `/support/trouble-ticket` kini dinormalisasi ke lane `tt`, sehingga route lama tidak lagi berakhir blank dan kembali merender workspace Trouble Ticket yang sama dengan `/support/tt`: [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts)
- Hitungan lane `Queue Trouble Ticket` kini hanya mengambil section queue TT yang benar-benar operasional dan tidak lagi ikut menghitung master `SLA Trouble Ticket`, sehingga jumlah item di landing `/support` kembali sinkron dengan KPI dan daftar pada lane TT: [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Smoke coverage ditambah untuk alias `normalizeSupportLane('trouble-ticket')`, dan recheck browser mengonfirmasi angka TT kini sinkron `5` di `/support`, `/support/trouble-ticket`, dan `/support/tt`: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Versioning diselaraskan ke `0.65.81` untuk menandai follow-up final UAT support pada lane Trouble Ticket.

## [0.65.80] - 2026-07-12

### Fixed

- Statistik ringkas `sales` kini memetakan section pipeline secara eksplisit berdasarkan judul section, sehingga kartu `Survey / Order` tidak lagi ikut menghitung `Work Order` hanya karena substring `ORDER` muncul pada judul `Work Order Aktif`: [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx)
- Verifikasi browser pada `/sales` menunjukkan KPI kecil kini konsisten dengan section yang dirender: `Lead 0`, `Coverage 5`, `Survey / Order 5`, `Work Order 5`, dan `Aktivasi 5`.
- Versioning diselaraskan ke `0.65.80` untuk menandai follow-up hasil UAT sales.

## [0.65.79] - 2026-07-12

### Fixed

- Statistik ringkas di workspace `billing` kini membaca section queue yang benar-benar dirender, termasuk `Invoice ... Perlu Tindak Lanjut`, sehingga KPI kecil `Invoice Overdue` tidak lagi tertahan di `0` saat tabel operasional billing sudah menampilkan invoice yang perlu ditindaklanjuti: [billing-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-domain-workspace.tsx)
- Verifikasi browser pada `/billing` menunjukkan KPI `Invoice Overdue` kini sinkron dengan section invoice operasional yang tampil setelah reload halaman.
- Versioning diselaraskan ke `0.65.79` untuk menandai follow-up hasil UAT billing.

## [0.65.78] - 2026-07-12

### Fixed

- `getReviewDbOperationalCards()` di `dashboard-service.ts` kini schema-aware untuk blok operasional `sales`, `digital`, `billing`, dan `inventory`, sehingga filter periode, status, source digital, follow-up collection, serta request/movement inventory tidak lagi hard-assume kolom review DB selalu lengkap: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Kartu operasional dashboard non-support sekarang memakai fallback `best-effort` atau `1 = 0` saat kolom inti seperti `request_date`, `activated_at`, `source`, `due_date`, `billing_year`, `billing_month`, `movement_at`, atau `request_status` tidak tersedia, sehingga satu schema drift tidak lagi mematahkan seluruh query agregasi operasional: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Versioning diselaraskan ke `0.65.78` untuk menandai hardening residual operational dashboard terhadap review DB parsial.

## [0.65.77] - 2026-07-12

### Fixed

- `getReviewDbWorklist()` di `dashboard-service.ts` kini memakai helper schema-aware untuk relasi `crm_customers`, `crm_customer_addresses`, `sales_orders`, `sales_leads`, `sales_surveys`, `service_work_orders`, dan `service_subscriptions` pada role non-support seperti `SALES_MARKETING`, `CS_OPERATOR`, `FIELD_TECHNICIAN`, dan `DIGITAL_CREATOR`, sehingga worklist dashboard tidak lagi hard-fail saat review DB parsial: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `getReviewDbBillingAuditTimeline()` kini memakai join billing/customer yang schema-aware, sehingga audit timeline billing tetap aman meski relasi `billing_invoices -> service_subscriptions -> crm_customers` atau kolom `payment_method`, `payment_date`, `action_type`, dan `action_at` belum lengkap di review DB lama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Versioning diselaraskan ke `0.65.77` untuk menandai hardening residual dashboard/worklist non-support terhadap schema drift review DB.

## [0.65.76] - 2026-07-12

### Fixed

- Read-side `inventory` di `domain-service.ts` kini schema-aware untuk tabel `inventory_items`, `inventory_categories`, `inventory_units`, `inventory_stock_movements`, `network_odp`, `network_odp_ports`, `service_device_assignments`, `service_subscriptions`, `crm_customers`, `inventory_item_requests`, dan `inventory_item_loans`, sehingga join dan kolom opsional tidak lagi diasumsikan selalu lengkap pada review DB parsial: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Subsection `inventory` seperti `items`, `movements`, `ODP`, `used ports`, `device assignments`, `port issues`, `device returns`, `requests`, dan `loans` kini dimuat secara partial-safe per query, sehingga kegagalan schema pada satu blok tidak lagi menjatuhkan seluruh halaman domain inventory: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Versioning diselaraskan ke `0.65.76` untuk menandai hardening read-side domain inventory terhadap review DB parsial.

## [0.65.75] - 2026-07-12

### Fixed

- Read-side `sales` di `domain-service.ts` kini schema-aware untuk tabel `sales_leads`, `sales_covered_areas`, `sales_surveys`, `sales_orders`, `service_work_orders`, `service_subscriptions`, `crm_customers`, dan `sales_packages`, sehingga join/kolom opsional tidak lagi diasumsikan selalu lengkap di review DB parsial: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Subsection `sales` seperti `lead`, `coverage`, `survey/order flow`, `work order`, `activation`, dan agregat `activation rate` kini dimuat secara partial-safe per query, sehingga kegagalan pada satu blok tidak lagi menjatuhkan seluruh halaman domain sales: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Versioning diselaraskan ke `0.65.75` untuk menandai hardening read-side domain sales terhadap review DB parsial.

## [0.65.74] - 2026-07-12

### Fixed

- Read-side `billing` di `domain-service.ts` kini memakai helper schema-aware untuk relasi `service_subscriptions`, `crm_customers`, `sales_packages`, `billing_invoices`, `billing_collection_actions`, dan `billing_payments`, sehingga kolom/join opsional tidak lagi diasumsikan selalu lengkap pada review DB parsial: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Subsection `billing` seperti `ready subscriptions`, `invoice follow-up`, `latest invoice`, `cancelled`, `suspended`, `reconnect`, `collection actions`, `collection follow-ups`, dan `payments` kini dimuat secara partial-safe per query, sehingga error schema pada satu blok tidak lagi menjatuhkan seluruh halaman domain billing: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Versioning diselaraskan ke `0.65.74` untuk menandai hardening read-side domain billing terhadap review DB parsial.

## [0.65.73] - 2026-07-12

### Fixed

- Route `sales/surveys` kini schema-aware terhadap review DB parsial. Lookup `sales_leads`, insert `sales_surveys`, dan update status lead tidak lagi langsung mengasumsikan kolom seperti `address`, `survey_type`, `feasibility_status`, `requested_by_user_id`, `assigned_employee_id`, `scheduled_at`, `surveyed_at`, `site_address`, `technical_notes`, `customer_request_notes`, atau `updated_at` selalu tersedia: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/surveys/route.ts)
- Route `inventory/odp-ports/assign` kini membangun update `network_odp_ports` dan `network_odp` secara dinamis. Jalur assign port tidak lagi hard-assume kolom enrichment seperti `subscription_id`, `customer_id`, `installed_at`, `notes`, `active_ports`, dan `updated_at` selalu ada di review DB aktif: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/assign/route.ts)
- Route `inventory/device-assignments` kini schema-aware saat lookup subscription, insert `service_device_assignments`, insert `inventory_stock_movements`, dan update stok `inventory_items`, sehingga kolom opsional seperti `customer_id`, `serial_number`, `mac_address`, `assigned_at`, `returned_at`, `reference_no`, `unit_price`, `notes`, dan `updated_at` tidak lagi dipaksa selalu ada: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/device-assignments/route.ts)
- Versioning diselaraskan ke `0.65.73` untuk menandai hardening write-side sales survey dan inventory terhadap review DB parsial.

## [0.65.72] - 2026-07-12

### Fixed

- Route `sales/work-orders` kini schema-aware terhadap review DB parsial. Lookup sales order, insert `service_work_orders`, dan update `sales_orders` tidak lagi langsung mengasumsikan kolom seperti `lead_id`, `customer_id`, `work_type`, `subscription_id`, `technician_name`, `scheduled_at`, `started_at`, `completed_at`, `teknisi_name`, `scheduled_installation_at`, atau `updated_at` selalu tersedia: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/work-orders/route.ts)
- Route `billing/collection-actions` kini membangun insert action dan update `billing_invoices` secara dinamis. Jalur create collection action tidak lagi hard-assume kolom seperti `action_at`, `due_follow_up_at`, `handled_by_user_id`, `notes`, `collection_status`, `suspend_candidate`, dan `updated_at` selalu ada di review DB aktif: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts)
- Route `billing/invoices/status` kini schema-aware saat membaca invoice, mengubah status, dan menutup jalur reconnect. Join ke `service_subscriptions` dan `crm_customers` serta update ke `billing_invoices` dan `billing_collection_actions` tidak lagi memaksa relasi atau kolom seperti `subscription_id`, `customer_id`, `notes`, `collection_status`, `suspend_candidate`, `action_type`, dan `due_follow_up_at` selalu lengkap: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts)
- Versioning diselaraskan ke `0.65.72` untuk menandai hardening residual write-side sales dan billing terhadap review DB parsial.

## [0.65.71] - 2026-07-12

### Fixed

- Route `billing/payments` kini schema-aware terhadap review DB parsial. Jalur simpan payment, update invoice, dan auto-resolve `billing_collection_actions` tidak lagi langsung mengasumsikan kolom seperti `payment_method`, `reference_no`, `received_by_user_id`, `notes`, `collection_status`, `suspend_candidate`, `due_follow_up_at`, atau `updated_at` selalu tersedia: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/payments/route.ts)
- Route `billing/invoices/generate` kini membangun insert invoice dan invoice item secara dinamis. Lookup subscription/customer/package, recurring guard, serta insert ke `billing_invoices` dan `billing_invoice_items` sekarang hanya memakai kolom yang memang tersedia, sehingga batch generate tetap bisa berjalan pada schema billing yang parsial: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/generate/route.ts)
- Route `sales/subscriptions` kini schema-aware saat aktivasi subscription. Lookup order/package, pembuatan `crm_customers` dan `crm_customer_addresses`, insert `service_subscriptions`, update `sales_orders`, serta sinkronisasi `service_work_orders` tidak lagi hard-assume seluruh kolom opsional phase 1.1 sudah lengkap di review DB: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/subscriptions/route.ts)
- Versioning diselaraskan ke `0.65.71` untuk menandai hardening write-side billing dan aktivasi subscription terhadap review DB parsial.

## [0.65.70] - 2026-07-12

### Fixed

- Agregasi activity timeline super admin di `dashboard-service.ts` kini partial-safe per source. Query `import`, `support`, `inventory`, `billing`, `sales`, `HR`, dan `auth` tidak lagi saling menjatuhkan saat salah satu source audit gagal dibaca akibat schema drift atau tabel audit parsial: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Jalur activity untuk role non-`SUPER_ADMIN` juga kini memuat import activity secara best-effort, sehingga dashboard tetap turun ke `dashboardActivities` mock bila query import batch gagal alih-alih melempar error ke seluruh widget aktivitas.
- Versioning diselaraskan ke `0.65.70` untuk menandai hardening agregasi timeline dashboard terhadap kegagalan parsial per source audit.

## [0.65.69] - 2026-07-12

### Fixed

- Timeline audit lintas domain di `dashboard-service.ts` kini mengeraskan jalur inventory, billing, dan sales secara schema-aware. Query tidak lagi langsung mengasumsikan kolom `inventory_item_requests.request_notes`, `inventory_stock_movements.notes`, `billing_invoices.notes`, `billing_payments.notes`, `billing_collection_actions.notes`, `sales_leads.notes`, `sales_surveys.technical_notes`, `sales_orders.notes`, dan `service_work_orders.notes` selalu tersedia di review DB aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Jika review DB parsial belum memiliki kolom note/technical note pada salah satu lane inventory, billing, atau sales, subsection timeline terkait sekarang turun aman ke nol row tanpa memicu kegagalan seluruh activity timeline dashboard.
- Versioning diselaraskan ke `0.65.69` untuk menandai hardening audit timeline lintas domain terhadap schema review DB parsial.

## [0.65.68] - 2026-07-12

### Fixed

- Timeline audit support di `dashboard-service.ts` kini mengeraskan jalur `TT_CREATE` dan `TT_CLOSE` secara schema-aware. Query tidak lagi langsung mengasumsikan kolom `support_trouble_tickets.notes`, `support_trouble_tickets.close_notes`, dan `support_trouble_tickets.closed_at` selalu tersedia di review DB aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Jika review DB parsial belum memiliki kolom note/close pada trouble ticket, blok audit terkait sekarang turun aman ke nol row tanpa memicu kegagalan seluruh timeline support.
- Versioning diselaraskan ke `0.65.68` untuk menandai hardening audit timeline support terhadap schema review DB parsial.

## [0.65.67] - 2026-07-12

### Fixed

- `getReviewDbDashboardSummary()` di `dashboard-service.ts` kini menghitung total isolir secara schema-aware, sehingga summary dashboard tidak lagi mengasumsikan kolom `support_isolations.status` dan `support_isolations.is_archived` selalu tersedia di review DB aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Bila review DB parsial belum memiliki `is_archived`, summary isolir tetap memakai count `status = 'OPEN'`; bila kolom inti `status` sendiri tidak tersedia, count turun aman ke nol alih-alih memicu error SQL.
- Versioning diselaraskan ke `0.65.67` untuk menandai hardening summary dashboard support terhadap schema review DB parsial.

## [0.65.66] - 2026-07-12

### Fixed

- Query `highRiskTickets` di `dashboard-service.ts` kini memakai helper schema-aware untuk relasi `support_trouble_tickets -> service_subscriptions`, sehingga kartu dan rekomendasi TT/NOC tidak lagi mengasumsikan kolom `subscription_id`, `id`, dan `service_no` selalu tersedia di review DB aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Informasi `serviceNo` pada rekomendasi dashboard TT/NOC sekarang fallback aman ke `NULL` bila relasi subscription parsial, alih-alih memicu query gagal pada jalur `CS_ADMIN`.
- Versioning diselaraskan ke `0.65.66` untuk menandai hardening dashboard TT/NOC terhadap schema review DB parsial.

## [0.65.65] - 2026-07-12

### Fixed

- Query `Port ODP` di `dashboard-service.ts` kini memakai helper schema-aware bersama untuk jalur `CUSTOMER_SERVICE`, `CS_ADMIN`, dan `NOC_OPERATOR`. Join ke `service_subscriptions` dan `crm_customers` hanya diaktifkan bila kolom `subscription_id`, `customer_id`, `service_no`, dan `customer_code` memang tersedia di review DB aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Kartu dashboard lintas lane yang menampilkan `Port ODP` tidak lagi mengasumsikan `installed_at` selalu ada. Jika relasi subscription/customer atau timestamp instalasi belum lengkap, dashboard tetap tampil dengan fallback aman untuk `customerCode`, `serviceNo`, dan `installedAt`.
- Versioning diselaraskan ke `0.65.65` untuk menandai hardening dashboard `Port ODP` terhadap schema review DB parsial.

## [0.65.64] - 2026-07-12

### Fixed

- `dashboard-service.ts` kini mengeraskan jalur `Isolir` dan `Dismantle` pada dashboard. KPI CS, rekomendasi `CS_ADMIN`, kartu `NOC_OPERATOR`, kartu `DISMANTLE_OPERATOR`, dan timeline audit support tidak lagi mengasumsikan kolom seperti `is_archived`, `reason`, `isolation_date`, `subscription_id`, `service_no`, `transfer_note`, `transferred_at`, `close_note`, `restoration_date`, atau `closed_at` selalu tersedia: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Count dan timeline dashboard sekarang memakai fallback schema-aware sehingga partial review DB tidak lagi mudah memicu kegagalan baca pada kartu operasional support non-TT. Jika kolom opsional belum ada, dashboard tetap tampil dengan nilai kosong, sorting alternatif, atau count nol yang aman.
- Versioning diselaraskan ke `0.65.64` untuk menandai hardening dashboard support non-TT terhadap schema review DB parsial.

## [0.65.63] - 2026-07-12

### Fixed

- Read-side `Isolir` dan `Dismantle` di service layer kini membaca schema review DB secara adaptif. Query section `Isolir Aktif`, `Queue Dismantle Open`, dan `Histori Dismantle` tidak lagi langsung mengasumsikan kolom opsional seperti `service_no`, `customer_code`, `radbox_name`, `customer_phone`, `marketing_name`, `transfer_note`, atau `closed_at` selalu tersedia: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Join ke `service_subscriptions`, `crm_customers`, dan histori/queue dismantle sekarang hanya diaktifkan bila kolom kunci relasinya memang tersedia. Jika schema lama belum lengkap, subsection terkait tetap tampil dengan fallback nilai `NULL` atau sorting alternatif, alih-alih memicu fallback mock total untuk lane non-TT.
- Versioning diselaraskan ke `0.65.63` untuk menandai hardening read-side support non-TT terhadap review DB parsial.

## [0.65.62] - 2026-07-12

### Fixed

- Route support non-TT untuk `Restore Isolir`, `Transfer Dismantle`, `Close Dismantle`, dan `Reopen Dismantle` kini lebih tahan review DB parsial. Update ke `support_isolations` tidak lagi selalu mengasumsikan kolom `restoration_date`, `close_note`, `is_archived`, `archived_at`, atau `updated_at` wajib ada; route hanya menyentuh kolom yang memang tersedia sambil tetap mewajibkan kolom inti seperti `status`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/restore/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts)
- Jalur `Transfer Dismantle`, `Close Dismantle`, dan `Reopen Dismantle` juga kini membangun payload insert secara schema-aware untuk `support_dismantle_queue` dan `support_dismantle_history`, sekaligus membaca kolom pelanggan opsional dari `support_isolations` dengan fallback aman bila schema review DB lama belum lengkap: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/dismantle/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts)
- Versioning diselaraskan ke `0.65.62` untuk menandai hardening backend support non-TT terhadap schema review DB parsial.

## [0.65.61] - 2026-07-12

### Fixed

- Route `SLA Trouble Ticket` kini memeriksa schema inti `support_trouble_ticket_sla` sebelum melakukan create/update. Jika kolom wajib `trouble_type` atau `duration_days` belum siap di review DB aktif, route mengembalikan pesan operasional yang jelas alih-alih gagal dengan SQL error mentah: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-ticket-sla/route.ts)
- Update SLA juga tidak lagi mengasumsikan kolom `updated_at` selalu tersedia; field tersebut hanya disentuh bila memang ada pada schema aktif, sehingga review DB parsial tetap bisa memproses perubahan durasi SLA dengan aman.
- Versioning diselaraskan ke `0.65.61` untuk menandai hardening route master SLA trouble ticket terhadap review DB parsial.

## [0.65.60] - 2026-07-12

### Fixed

- Route `Update Progress Trouble Ticket` kini membentuk payload insert log secara schema-aware, sehingga review DB parsial yang belum memiliki kolom opsional seperti `owner_name`, `progress_notes`, `follow_up_at`, atau `updated_by` tidak lagi memutus update progress utama pada ticket: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/[ticketCode]/progress/route.ts)
- Jika kolom inti log `trouble_ticket_id` dan `progress_status` tersedia, route tetap mencatat log dengan subset kolom yang aman; jika kolom inti belum siap, update status ticket tetap berjalan tanpa hard-fail di insert log.
- Versioning diselaraskan ke `0.65.60` untuk menandai hardening route progress trouble ticket terhadap review DB parsial.

## [0.65.59] - 2026-07-12

### Fixed

- Route `Close Trouble Ticket` kini memvalidasi `resolution_action` ke master hanya bila schema `support_trouble_ticket_masters` memang tersedia lengkap, sehingga review DB parsial tidak lagi membuat close flow hard-fail hanya karena tabel master lama belum siap: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/[ticketCode]/close/route.ts)
- Validasi progress aktif pada jalur close juga dibuat lebih tahan schema drift. Bila log progress lengkap, route tetap memakai `support_trouble_ticket_progress_logs` seperti sebelumnya; bila schema log parsial belum lengkap, route jatuh ke fallback aman berbasis status ticket aktif (`ON_PROGRESS`/`FOLLOW_UP`) alih-alih memutus close flow karena query log tidak dapat dijalankan.
- Versioning diselaraskan ke `0.65.59` untuk menandai hardening route penutupan trouble ticket terhadap review DB parsial.

## [0.65.58] - 2026-07-12

### Fixed

- Route `Eskalasi Trouble Ticket` kini lebih tahan review DB parsial saat membaca konteks SLA. Query ticket tidak lagi mewajibkan tabel/kolom master SLA selalu lengkap; bila `support_trouble_ticket_sla` atau kolom `duration_days` belum tersedia, route tetap bisa membuka ticket dan hanya membatasi level SLA-driven (`DUE_TODAY`/`OVERDUE`) dengan pesan yang lebih tepat, sementara eskalasi `MANUAL` tetap bisa berjalan: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/[ticketCode]/escalate/route.ts)
- Perhitungan `slaDueAt` pada jalur eskalasi juga kini mengikuti pola fallback yang sama dengan dashboard support, termasuk pemakaian `support_trouble_tickets.sla_due_at` bila tersedia dan fallback ke `duration_days` bila master SLA lengkap.
- Versioning diselaraskan ke `0.65.58` untuk menandai hardening route eskalasi trouble ticket terhadap schema review DB parsial.

## [0.65.57] - 2026-07-12

### Fixed

- Route write-side `Tambah Isolir` kini membaca schema review DB lebih defensif sebelum melakukan join ke `crm_customer_addresses`, `sales_orders`, dan `sales_leads`, sehingga lookup alamat pelanggan dan marketing turun menjadi best-effort saat review DB lama belum memiliki kolom opsional seperti `is_primary`, `marketing_name`, atau `lead_id`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/route.ts), [review-db.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/review-db.ts)
- Route `Tambah Trouble Ticket` kini hanya memaksa validasi master SLA bila kolom `support_trouble_ticket_sla.trouble_type` memang tersedia pada review DB aktif; bila schema SLA lama belum lengkap, pembuatan ticket tidak lagi terhenti hanya karena query validasi master hard-fail: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/route.ts), [review-db.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/review-db.ts)
- Ditambahkan helper cache `hasReviewDbColumn(...)` di layer review DB agar hardening schema check pada jalur support bisa dipakai ulang tanpa query `information_schema` berulang untuk kolom yang sama.
- Versioning diselaraskan ke `0.65.57` untuk menandai hardening route write-side support terhadap review DB parsial.

## [0.65.56] - 2026-07-12

### Fixed

- KPI operasional `Support/NOC` di dashboard review DB kini memakai join SLA, progress log, dan escalation log yang lebih tahan schema drift. Bila tabel log tambahan atau kolom master SLA belum lengkap di review DB lama, query dashboard tetap berjalan dengan fallback join kosong alih-alih hard-fail seluruh kartu operasional: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Hardening ini menutup celah ketika `support_trouble_ticket_sla.trouble_type`, `duration_days`, atau kolom inti pada log progress/escalation belum tersedia penuh, sehingga metrik seperti `overdue`, `escalation pending`, dan `ready close` tidak lagi menjadi titik kegagalan utama jalur Support/NOC.
- Versioning diselaraskan ke `0.65.56` untuk menandai hardening query dashboard support terhadap schema review DB parsial.

## [0.65.55] - 2026-07-12

### Improved

- Panel aksi support kini memakai container bersama `SupportActionPanelContainer` yang dapat otomatis membuka panel induk saat URL hash mengarah ke salah satu action form di dalamnya, sehingga navigasi lintas-lane langsung jatuh ke area kerja yang relevan tanpa operator harus membuka panel manual: [support-action-panel-container.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-panel-container.tsx), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Slot form yang collapsible sekarang ikut membaca hash action dan konteks prefill untuk membuka dirinya sendiri, sehingga pola interaksi `TT`, `SLA`, `Isolir`, dan `Dismantle` menjadi lebih seragam saat operator datang dari CTA, queue action, atau deep-link support: [support-action-panel-slot.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-panel-slot.tsx), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Prefill `type` pada lane `TT` dan `SLA` kini juga ikut menandai panel prioritas sebagai terbuka secara default, sehingga transisi dari konteks kontrol SLA ke form pengaturan durasi tidak lagi terasa berbeda dibanding prefill ticket/isolir/dismantle.
- Versioning diselaraskan ke `0.65.55` untuk menandai parity state panel aksi support yang lebih konsisten antar lane.

## [0.65.54] - 2026-07-12

### Fixed

- Action create isolir pada review DB tidak lagi menggantungkan lookup subscription inti ke tabel `sales_orders` dan `sales_leads`; query utama sekarang hanya memakai tabel yang wajib untuk jalur support (`service_subscriptions`, `crm_customers`, dan `crm_customer_addresses`): [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/route.ts)
- Pengambilan `marketing_name` untuk isolir dipindahkan menjadi best-effort lookup terpisah, sehingga drift di domain sales tidak lagi ikut memutus write flow support/NOC saat operator membuat isolasi baru.
- Operational card dashboard kini di-sanitize di service layer per role, sehingga role non-`SUPER_ADMIN` tidak lagi bisa membuka kartu lintas domain hanya dengan memanipulasi filter `division=ALL`; kartu NOC, TT, CS, Digital, dan Dismantle kini terkunci pada scope operasionalnya masing-masing: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Shortcut href pada operational card support juga diarahkan ke lane yang lebih spesifik (`TT`, `Isolir`, `Dismantle`) agar dashboard lebih konsisten dengan pola workspace role-aware.
- Smoke test diperluas untuk memverifikasi bahwa role NOC dan TT hanya menerima operational card yang relevan dan tetap aman walau query dashboard diminta dengan `division=ALL`: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Helper schema support kini tidak lagi berhenti di `CREATE TABLE IF NOT EXISTS`; service sekarang juga menambahkan kolom yang mungkin hilang pada review DB lama untuk `support_dismantle_queue`, `support_trouble_ticket_progress_logs`, dan `support_trouble_ticket_escalation_logs`, sehingga route `reopen dismantle`, `progress`, dan `escalate` lebih tahan terhadap schema drift parsial: [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [support-ticket-progress-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-progress-service.ts), [support-ticket-escalation-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-escalation-service.ts)
- Shortcut pada header `DashboardCommandCenter` tidak lagi hardcoded ke `/support` dan `/billing`; link kini dibentuk dari server sesuai role aktif, default landing, dan lane support prioritas agar header dashboard tetap konsisten dengan RBAC dan landing parity: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [dashboard-command-center.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-command-center.tsx)
- Next actions dashboard kini dibentuk di service layer, bukan lagi di komponen, sehingga label aksi mengikuti konteks `href`, lane support, dan action key aktual; rekomendasi tidak lagi kembali ke label generik seperti `Masuk Queue`, `Kerjakan Sekarang`, atau `Buka Agenda`: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-next-actions.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-next-actions.tsx)
- Smoke test diperluas untuk memastikan next actions role `NOC_OPERATOR` dan `TT_OPERATOR` tetap spesifik, tidak mengarah ke `/support` generic, dan tidak memakai label aksi generik: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- CTA lintas-lane pada workspace support kini langsung mengarah ke form aksi yang relevan bila role memiliki capability yang sesuai, bukan lagi selalu jatuh ke lane generik; ini diterapkan pada workspace `TT`, `SLA`, `Isolir`, dan `Dismantle` agar operator bisa lompat langsung ke panel `SLA`, `Update Progress`, `Transfer Dismantle`, atau `Restore` sesuai otoritasnya: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Form utama support kini memakai blok konteks seragam `Tujuan`, `Sumber`, dan `Hasil`, sehingga panel `TT`, `SLA`, `Isolir`, `Restore`, `Transfer Dismantle`, `Close`, dan `Reopen` menjelaskan alur operasional dengan pola yang sama dan lebih mudah dipindai operator: [support-form-context-note.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-form-context-note.tsx), [support-ticket-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-create-form.tsx), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [support-sla-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-form.tsx), [support-isolation-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-form.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx), [support-dismantle-reopen-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-reopen-form.tsx)
- Section header form support juga diseragamkan ke pola `Form Action Support` agar perpindahan antar lane tidak terasa seperti modul yang berbeda-beda.
- Istilah pada baris queue support kini diseragamkan ke bahasa operasional yang sama dengan workspace dan form, termasuk label antrian `TT`, terminologi SLA, kepemilikan proses `Isolir`, dan status/aksi pada queue `Dismantle`, sehingga operator tidak lagi melihat campuran istilah Inggris, kode internal, dan label UI yang berbeda-beda: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Urutan aksi per baris pada queue `Isolir` dan `Dismantle` kini dibentuk dari helper rekomendasi yang mempertimbangkan konteks kasus dan capability role, sehingga tombol utama tidak lagi hardcoded sama untuk semua kondisi; kasus restore menonjolkan `Buka Form Restore`, kasus terminate aktif menonjolkan `Tutup ke Histori`, dan histori dismantle menonjolkan `Reopen ke Queue Aktif` bila role memang berwenang: [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Desktop dan mobile sekarang memakai sumber urutan aksi row yang sama, sehingga prioritas tombol antar breakpoint tidak lagi bisa berbeda.
- Workspace support kini memakai blok helper note seragam `Ringkasan Operasional` untuk `TT`, `SLA`, `Isolir`, dan `Dismantle`, sehingga bagian atas tiap lane selalu menjelaskan prioritas kerja, konteks lane, dan indikator kunci dengan pola yang sama: [support-workspace-helper-note.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-workspace-helper-note.tsx), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Istilah ringkasan atas juga dirapikan agar lebih seragam secara operasional, misalnya `tipe trouble`, `jalur restore`, `jalur terminate`, `queue aktif`, dan `histori penutupan`.
- Label filter workspace support kini diseragamkan ke pola `Fokus Antrian`, `Status Kerja`, `Tipe Trouble`, `Cari Pelanggan`, dan `Cari Layanan / Konteks`, lengkap dengan placeholder yang lebih konsisten di lane `TT`, `SLA`, `Isolir`, dan `Dismantle`, sehingga operator tidak lagi berpindah-pindah istilah saat menyaring data: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Pilihan fokus yang sebelumnya campur Inggris dan istilah internal juga dirapikan menjadi bahasa kerja yang lebih konsisten seperti `Ticket Aktif`, `SLA Terlewati`, `Queue Aktif`, dan `Follow-up Lapangan`.
- Panel aksi workspace support kini memakai intro bersama `SupportActionPanelIntro`, sehingga judul section, helper write-side, warning review DB, label `Buka panel aksi lane ...`, dan ringkasan isi panel menjadi seragam antara `TT`, `SLA`, `Isolir`, dan `Dismantle`: [support-action-panel-intro.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-panel-intro.tsx), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Istilah aksi di lane `TT` juga dirapikan agar konsisten dengan lane lain, misalnya `Tutup ticket` menggantikan label campuran `Close ticket`.
- Layout item di dalam panel aksi workspace support kini memakai slot seragam `SupportActionPanelSlot`, sehingga form write-side memiliki ritme visual, spacing, dan grouping yang lebih konsisten baik untuk lane yang collapsible seperti `TT` maupun lane grid seperti `SLA`, `Isolir`, dan `Dismantle`: [support-action-panel-slot.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-panel-slot.tsx), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx)
- Setiap slot panel aksi sekarang juga memiliki deskripsi singkat di level item, sehingga operator bisa membedakan kapan harus membuat ticket, restore, transfer terminate, close, atau reopen tanpa langsung membaca seluruh form.
- Versioning diselaraskan ke `0.65.54` untuk menandai parity layout panel aksi support yang lebih konsisten antar lane.

## [0.65.41] - 2026-07-12

### Improved

- Pembacaan review section pada workspace `support` kini dibuat `partial-safe`, sehingga satu subsection yang gagal dibaca dari review DB tidak lagi otomatis menjatuhkan seluruh halaman `NOC & Troubleshoots` ke `Mock Fallback`: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Query `Trouble Ticket`, `Isolir Aktif`, `SLA Trouble Ticket`, `Queue Dismantle Open`, dan `Histori Dismantle` sekarang dijalankan terpisah dengan guard error per subsection; subsection yang sehat tetap tampil dari DB, sedangkan subsection yang gagal akan muncul sebagai catatan `WARNING` pada review section support.
- Workspace `support` kini hanya fallback penuh ke mock bila seluruh subsection support gagal dimuat sekaligus, sehingga schema drift kecil tidak langsung memutus pengalaman operasional web secara total.
- Versioning diselaraskan ke `0.65.41` untuk menandai hardening koneksi review DB pada workspace support.

## [0.65.40] - 2026-07-12

### Fixed

- Halaman `support` tidak lagi jatuh ke `Mock Fallback` karena query histori dismantle salah mengasumsikan kolom `support_dismantle_history.subscription_id`; service kini mengikuti schema final yang benar dengan join `support_dismantle_history -> support_isolations -> service_subscriptions -> crm_customers`: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Patch ini menutup error SQL konkret `Unknown column 'dh.subscription_id' in 'on clause'` yang sempat memutus pembacaan review DB pada workspace `NOC & Troubleshoots, Ticket, dan Kontrol SLA`.
- Versioning diselaraskan ke `0.65.40` untuk menandai perbaikan koneksi DB pada jalur support workspace.

## [0.65.39] - 2026-07-12

### Fixed

- Metrik `NOC` dan `Troubleshoots` di dashboard tidak lagi memakai angka turunan semu seperti `overdue -> escalation` atau `monthly opened / 3 -> ready close`, tetapi sekarang dihitung langsung dari review DB dengan membaca `support_trouble_tickets`, `support_trouble_ticket_sla`, `support_trouble_ticket_progress_logs`, dan `support_trouble_ticket_escalation_logs`: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Hitungan `ticket overdue` untuk jalur `NOC` kini tetap bisa terbentuk walau kolom `support_trouble_tickets.sla_due_at` belum tersedia, karena service menurunkan due date dari master SLA trouble type secara langsung saat query dashboard dijalankan.
- Kartu `Troubleshoots` kini memakai count DB nyata untuk `Perlu Eskalasi` dan `Siap Close`, mengikuti logika operasional yang sama dengan workspace support: pending escalation/follow-up/SLA dan kandidat close dari progress terakhir tanpa follow-up aktif.
- Batch ini juga memastikan tabel progress dan escalation support di-bootstrap lebih dulu sebelum query dashboard dijalankan, sehingga metrik TT tidak kembali jatuh ke angka dummy saat tabel log belum tersentuh sebelumnya.
- Versioning diselaraskan ke `0.65.39` untuk menandai penutupan gap koneksi DB pada NOC dan Troubleshoots.

## [0.65.38] - 2026-07-12

### Changed

- `dashboard-service` kini menyaring `dashboardAlerts` dan `roleQueues` berdasarkan akses route aktual, lane support, action anchor, serta konteks domain yang benar-benar boleh dilihat role aktif, sehingga kartu queue dan alert dashboard tidak lagi terlalu global untuk role mikro: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Queue role yang sebelumnya masih menuju `/support` generik kini otomatis diturunkan ke lane yang lebih presisi seperti `TT`, `SLA`, `Isolir`, atau `Dismantle`, sehingga `NOC`, `TT Operator`, dan role support lain masuk ke queue operasional yang tepat sejak landing dashboard.
- Alert `Billing`, `Import`, dan `Daily Activity approval` kini dibuang total untuk role yang tidak punya konteks atau otoritas inti di area tersebut, sementara alert support yang masih relevan akan diturunkan ke narasi dan jalur aksi yang aman.
- Smoke test diperluas untuk memverifikasi bahwa `NOC` tidak lagi menerima alert billing/approval dan queue support generic, serta `TT Operator` langsung menerima queue lane-specific yang benar: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Artefak generated `.next/dev/types` yang korup dibersihkan agar verifikasi TypeScript kembali merefleksikan source code aktual.
- Versioning diselaraskan ke `0.65.38` untuk menandai batch hardening dashboard alert dan role queue card per role.

## [0.65.37] - 2026-07-12

### Changed

- `worklist-service` kini juga menyaring narasi panel detail seperti `reason`, `nextAction`, `owner`, `blockingInfo`, `healthSignal`, `correlationSummary`, `decisionTrail`, `evidencePanel`, dan `actionOutcomeSummary`, sehingga role mikro tidak lagi melihat konteks `Billing / Collection` atau `CS & Admin CS` yang berada di luar scope kerjanya: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)
- Saat sebagian konteks detail milik tim lain disembunyikan, service otomatis menurunkan narasi ke versi generik yang masih aman dan operasional, misalnya mengganti owner menjadi `Tim terkait` dan mengganti instruksi detail menjadi follow-up yang masih relevan untuk role aktif.
- Smoke test diperluas untuk memverifikasi sanitasi detail panel worklist, termasuk penyaringan blok `Billing`, penghapusan `healthSignal`/`actionOutcomeSummary` yang keluar dari scope role, serta penyisaan hanya evidence dan decision trail yang masih relevan: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Versioning diselaraskan ke `0.65.37` untuk menandai batch hardening detail panel worklist per role.

## [0.65.36] - 2026-07-12

### Changed

- `worklist-service` kini menyaring `href`, `actionLabel`, `handoffLinks`, dan `recommendedActions` berdasarkan akses route, lane support, serta action anchor yang benar-benar dimiliki role aktif, sehingga item worklist tidak lagi bisa menampilkan CTA lintas-domain atau lintas-lane yang secara operasional seharusnya tertutup: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)
- Saat CTA utama item worklist ternyata tidak layak diakses oleh role aktif, service kini otomatis menurunkannya ke fallback yang masih relevan seperti `TT`, `SLA`, `Isolir`, `Dismantle`, atau modul induk yang tetap sah, sehingga operator tetap punya jalur tindak lanjut yang aman tanpa dilempar ke area terlarang.
- Smoke test diperluas untuk memverifikasi sanitasi link worklist, termasuk pembuangan handoff `Billing`/`Dismantle` yang tidak boleh untuk `NOC`, fallback action ke lane `SLA`, serta filtering `recommendedActions` yang keluar dari scope role: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Versioning diselaraskan ke `0.65.36` untuk menandai batch hardening action dan handoff worklist per role.

## [0.65.35] - 2026-07-12

### Changed

- Feed worklist support kini dibedakan lebih tegas antara `NOC_OPERATOR` dan `TT_OPERATOR`, sehingga `NOC` mendapat campuran item `SLA Kritis`, `Monitoring Isolir`, dan `ODP/Port`, sedangkan `TT Operator` fokus ke bucket `Ticket Baru`, `Follow Up Overdue`, `Siap Eskalasi`, dan `Siap Close` dengan sinyal aging/status yang lebih relevan: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)
- Data mock dashboard/worklist kini ikut mencerminkan pemisahan queue support per role agar fallback mode dan smoke test tidak kembali ke perilaku generik yang sama untuk `NOC` dan `TT`: [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts), [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Smoke test diperluas untuk memverifikasi bucket `SLA Kritis`, `Monitoring Isolir`, `Follow Up Overdue`, dan `Siap Close`, sehingga hardening relevansi queue support punya guardrail otomatis saat service worklist atau dashboard berubah lagi.
- Versioning diselaraskan ke `0.65.35` untuk menandai batch hardening queue relevance per role pada dashboard/worklist support.

## [0.65.34] - 2026-07-12

### Changed

- Workspace dan queue panel support kini memfilter quick link lintas-domain sesuai akses role aktif, sehingga shortcut ke `Billing`, `Supervisor CS`, `SLA`, `TT`, `Isolir`, atau `Dismantle` tidak lagi bocor ke role mikro yang tidak berhak: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Row action pada panel `Isolir` dan `Dismantle` kini mengikuti guard role yang sama dengan form utama, sehingga aksi seperti transfer ke dismantle, close ke histori, reopen queue, dan sinkron billing tidak lagi tampil pada role yang hanya boleh membaca atau follow-up terbatas: [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Versioning diselaraskan ke `0.65.34` untuk menandai batch hardening action visibility dan CTA parity pada workspace support.

## [0.65.33] - 2026-07-12

### Changed

- Landing path default kini dibedakan per role operasional, sehingga `CS Operator`, `CS Admin`, `NOC`, `TT Operator`, `Dismantle`, dan `Digital Creator` langsung masuk ke workspace yang paling relevan setelah login, bukan selalu berhenti di dashboard global: [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts), [access-control-server.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control-server.ts), [login page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(auth)/login/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/page.tsx)
- Smoke test akses diperluas untuk memverifikasi redirect default tiap role prioritas, sehingga batch hardening ini punya guardrail otomatis saat login, root redirect, atau permission baseline berubah lagi: [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts)
- Versioning diselaraskan ke `0.65.33` untuk menandai batch hardening parity role pada jalur masuk workspace operasional.

## [0.65.32] - 2026-07-12

### Changed

- API `/api/domains/[domain]` kini meneruskan `focus`, `month`, `year`, dan `lane` dengan aturan parsing yang sama seperti halaman SSR, sehingga payload domain dari route dan render halaman tidak lagi bisa berbeda saat dibuka dari KPI atau drilldown periodik: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/domains/[domain]/route.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- Data source aplikasi kini memprioritaskan `review-db` sebagai mode default project, tetapi override `APP_DATA_MODE=mock` tetap didukung, sehingga dashboard/worklist/domain tidak lagi diam-diam boot ke mode mock saat integrasi review DB sebenarnya sudah tersedia: [data-source.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/data-source.ts), [.env.example](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.example)
- Versioning diselaraskan ke `0.65.32` untuk menandai pass integrasi yang menyamakan parity API domain dan mode data default berbasis review DB.

## [0.65.31] - 2026-07-12

### Changed

- Create flow `Trouble Ticket` dan `Isolir` kini wajib memakai anchor `Service No / Customer Code`, lalu API langsung menghubungkan row baru ke `service_subscriptions` aktif agar customer, billing, dan konteks layanan tidak lagi bergantung pada input teks bebas: [support-ticket-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-create-form.tsx), [support-isolation-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-form.tsx), [trouble-tickets route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/route.ts), [isolations route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/route.ts)
- Read-side support kini membawa metadata `Service No` dan `Customer Code`, serta drilldown `READY_CLOSE`, `OPEN_QUEUE`, `FIELD_FOLLOW_UP`, `CLOSED_THIS_PERIOD`, `MONTHLY_DISMANTLES`, dan `OVERDUE_RATE` sudah selaras dengan lane/filter nyata sehingga KPI dashboard tidak lagi jatuh ke queue umum yang salah: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx)
- Aktivasi subscription tidak lagi memakai daftar paket hardcoded; form kini mengambil suggestion langsung dari `sales_packages` aktif di review DB, dan KPI `Work Order Aktif` diarahkan ke domain sales agar drilldown lapangan sesuai sumber datanya: [sales-subscription-activate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-subscription-activate-form.tsx), [subscriptions route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/subscriptions/route.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Versioning diselaraskan ke `0.65.31` untuk menandai batch integrasi support-sales yang menutup anchor layanan, sinkronisasi drilldown, dan lookup paket dinamis dari review DB.

## [0.65.30] - 2026-07-12

### Added

- Ditambahkan workspace supervisor `CS & Admin CS`, komponen detail case worklist, serta landing organisasi baru untuk `Digital Creator`, sehingga queue approval, koreksi, transfer/restore, dan risiko tinggi kini punya pembacaan operasional yang menyatu dengan CTA lintas customer, support, inventory, dan billing: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx), [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/sales/digital-creator/page.tsx)
- Ditambahkan service, route, dan form write-side untuk `Digital Creator`, `Marketing Activities`, serta lifecycle `Support Dismantle` agar campaign, digital leads, content calendar, analytics, transfer-to-dismantle, close, dan reopen bisa dieksekusi dari ERP review DB tanpa placeholder: [marketing-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/marketing-activity-service.ts), [digital-creator-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/digital-creator-service.ts), [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx), [support-dismantle-reopen-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-reopen-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/%5Bid%5D/close/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/%5Bid%5D/reopen/route.ts)
- Ditambahkan perluasan schema staging import dan dokumentasi sample/import untuk `Wave 1C`, mencakup coverage sales, marketing activity, relasi area aktivitas, dan bootstrap network ODP agar jalur hybrid migration tetap konsisten dengan scope baru domain sales dan network: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql), [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql), [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md), [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md)

### Changed

- Sidebar, `DomainShell`, dashboard/worklist service, dan definisi tipe domain kini diperluas agar menu `CS & Admin CS`, `Digital Creator`, billing handoff, port ODP, isolir/restore, dan case intelligence terbaca sebagai jalur kerja nyata, bukan lagi sekadar placeholder menu: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts), [support-action-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-action-links.ts), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Form aksi collection, invoice, port ODP, isolir restore, dan dismantle dipadatkan agar write-side selaras dengan pola operasional terbaru, sementara asset branding `Perkasa` ikut dibawa ke repo untuk menutup dependensi file lokal yang sebelumnya masih membuat worktree kuning: [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [inventory-odp-port-assign-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-port-assign-form.tsx), [inventory-odp-port-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-port-status-form.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), [perkasa-networks-logo.svg](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/public/branding/perkasa-networks-logo.svg)
- Versioning diselaraskan ke `0.65.30` untuk menutup batch residual workspace, action backend, dan artefak staging/import sehingga worktree kembali bersih setelah refactor UI operasional utama selesai.

## [0.65.29] - 2026-07-12

### Added

- Ditambahkan workspace khusus `Billing / Collection` agar queue invoice overdue, promise to pay, suspend, reconnect, dan payment tidak lagi bergantung penuh pada `DomainShell`, tetapi memakai layout kerja yang lebih ringan dengan tabel sebagai fokus utama dan form write-side dipindah ke panel sekunder: [billing-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-domain-workspace.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)

### Changed

- Cluster support, sales, inventory, billing, dashboard, worklist, daily activity, dan landing organisasi dipadatkan ke pola `copy-first UI, PRD-first backend`, sehingga header lebih ringkas, summary cards lebih flat, toolbar lebih sederhana, dan form aksi dipindah ke panel sekunder agar tabel/queue menjadi pusat baca: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx), [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx), [organization-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/organization-workspace-page.tsx), [dashboard-command-center.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-command-center.tsx), [worklist-header.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-header.tsx), [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [daily-activity/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx)
- Urutan halaman kini diseragamkan agar ringkasan utama selalu berada di bagian atas sebelum `Data Source`, filter, drilldown, dan konten utama, sehingga operator tidak lagi menemukan summary yang terselip di tengah halaman pada workspace operasional utama: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [support-sla-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-workspace.tsx), [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx), [billing-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-domain-workspace.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [daily-activity/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx)
- Versioning diselaraskan ke `0.65.29` untuk menandai batch refactor UI operasional lintas workspace dan penertiban urutan ringkasan di bagian atas halaman.

## [0.65.28] - 2026-07-12

### Added

- Ditambahkan keputusan kerja aktif untuk refactor UI global ERP dengan strategi `copy-first UI, PRD-first backend`, termasuk sumber baseline tampilan dari `web-psb-perkasa`, `finance-repo`, dan `ga-web-app`, aturan anti-pattern `card-heavy`, mapping menu ERP ke baseline legacy, serta urutan eksekusi per cluster: [ui-copy-first-refactor-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/ui-copy-first-refactor-plan.md)

### Changed

- Docs index diperluas agar rencana refactor UI copy-first muncul eksplisit sebagai dokumen kerja aktif di jalur migrasi dan implementasi ERP: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.28` untuk menandai penguncian arah baru refactor UI operasional ERP.

## [0.65.27] - 2026-07-12

### Added

- Ditambahkan workspace khusus `Trouble Ticket` dan `Dismantle` pada lane support agar kedua menu ini tidak lagi bergantung penuh pada `DomainShell`, melainkan punya hero, CTA, queue panel, dan blok write-side form sendiri yang lebih dekat ke ritme operasional legacy: [support-tt-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-workspace.tsx), [support-dismantle-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-workspace.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx)

### Changed

- Console `Trouble Ticket`, `Monitoring Isolir`, `Dismantle`, `Ticket PSB`, dan `Port ODP` dipoles ke versi terang yang lebih mendekati baseline dark-mode legacy, dengan kartu ringkas di atas, shortcut tindakan cepat, dan tabel operasional sebagai fokus utama halaman: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx), [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx)
- Versioning diselaraskan ke `0.65.27` untuk menandai batch parity UI operasional versi terang pada menu kerja inti `Web PSB`.

## [0.65.26] - 2026-07-11

### Added

- Ditambahkan rencana hardening per role fondasi `Web PSB` agar checklist pasca-migration bisa langsung dieksekusi sebagai bukti kerja untuk `SUPER_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN`: [hybrid-psb-role-hardening-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-role-hardening-plan.md)
- Ditambahkan timeline go-live hybrid `Web PSB` yang memecah kerja ke fase mingguan sampai `pilot` dan `go-live bertahap`, termasuk freeze release, validasi teknis, validasi role fondasi, dan keputusan pasca-pilot: [hybrid-psb-go-live-timeline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-go-live-timeline.md)

### Changed

- Dokumen readiness hybrid production kini menunjuk langsung ke rencana hardening per role dan timeline go-live agar fase `GO-HARDENING` punya urutan kerja yang lebih operasional: [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
- Docs index diperluas agar dokumen role hardening dan timeline go-live muncul eksplisit di jalur dokumentasi hybrid migration yang aktif: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.26` untuk menandai transisi dari penyusunan checklist ke rencana eksekusi hardening dan go-live.

## [0.65.25] - 2026-07-11

### Added

- Ditambahkan paket pasca-migration `Web PSB` untuk fase `hardening` dan `cutover`, sehingga hasil seluruh batch production yang sudah lulus kini diterjemahkan ke checklist operasional lintas role, validasi write-side berisiko, freeze batch migration, validasi data minimum, trigger rollback, dan bukti minimum hari-H: [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md), [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)

### Changed

- Dokumen readiness hybrid production kini menunjuk langsung ke artefak pelaksana berikutnya untuk `hardening` dan `cutover`, sehingga status `GO-HARDENING` tidak berhenti di level ringkasan: [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
- Docs index diperluas agar checklist `hardening` dan `cutover` hybrid `Web PSB` muncul eksplisit di jalur dokumentasi migration yang aktif: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.25` untuk menandai transisi kerja dari pembukaan adapter production ke fase hardening dan cutover.

## [0.65.24] - 2026-07-11

### Added

- Ditambahkan jalur production `WhatsappTemplate` end-to-end yang mencakup patch schema review DB terisolasi, staging helper template, generator JSON ke staging, transform ke `helper_whatsapp_templates`, query review, assertion query, runner lokal, extraction pack, dan runbook untuk memuat `whatsapp-templates.production.json` dari `Web PSB`: [xampp_review_patch_wave1_whatsapp_template_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave1_whatsapp_template_existing_review_db.sql), [generate-wave1-whatsapp-template-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1-whatsapp-template-production-loader.mjs), [xampp_review_transform_wave1_whatsapp_template_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1_whatsapp_template_production.sql), [xampp_review_wave1_whatsapp_template_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1_whatsapp_template_production_review_queries.sql), [xampp_review_wave1_whatsapp_template_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1_whatsapp_template_production_assertions.sql), [run-review-wave1-whatsapp-template-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1-whatsapp-template-production.ps1), [hybrid-wave-1-whatsapp-template-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-whatsapp-template-production-extraction-pack.md), [hybrid-wave-1-whatsapp-template-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-whatsapp-template-production-runbook.md)

### Changed

- Docs index diperluas agar extraction pack dan runbook `WhatsappTemplate production` muncul eksplisit pada urutan kerja hybrid migration `Web PSB`: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.24` untuk menandai pembukaan helper template `WhatsappTemplate` dari production.

## [0.65.23] - 2026-07-11

### Added

- Ditambahkan jalur production `Priority` end-to-end yang mencakup patch schema review DB terisolasi, staging khusus master priority, generator JSON ke staging, transform ke `master_priorities`, query review, assertion query, runner lokal, extraction pack, dan runbook untuk memuat `priorities.production.json` dari `Web PSB`: [xampp_review_patch_wave1_priority_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave1_priority_existing_review_db.sql), [generate-wave1-priority-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1-priority-production-loader.mjs), [xampp_review_transform_wave1_priority_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1_priority_production.sql), [xampp_review_wave1_priority_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1_priority_production_review_queries.sql), [xampp_review_wave1_priority_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1_priority_production_assertions.sql), [run-review-wave1-priority-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1-priority-production.ps1), [hybrid-wave-1-priority-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-priority-production-extraction-pack.md), [hybrid-wave-1-priority-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-priority-production-runbook.md)

### Changed

- Docs index diperluas agar extraction pack dan runbook `Priority production` muncul eksplisit pada urutan kerja hybrid migration `Web PSB`: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.23` untuk menandai pembukaan adapter master `Priority` dari production.

## [0.65.22] - 2026-07-11

### Added

- Ditambahkan jalur production `TroubleTicketMaster` end-to-end yang mencakup patch schema review DB terisolasi, generator JSON ke staging, transform katalog `kind/value`, query review, assertion query, runner lokal, extraction pack, dan runbook untuk memuat `trouble-ticket-master.production.json` ke `support_trouble_ticket_masters`: [xampp_review_patch_wave1a_tt_master_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave1a_tt_master_existing_review_db.sql), [generate-wave1a-tt-master-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1a-tt-master-production-loader.mjs), [xampp_review_transform_wave1a_tt_master_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_tt_master_production.sql), [xampp_review_wave1a_tt_master_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_master_production_review_queries.sql), [xampp_review_wave1a_tt_master_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_master_production_assertions.sql), [run-review-wave1a-tt-master-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-tt-master-production.ps1), [hybrid-wave-1a-psb-tt-master-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-tt-master-production-extraction-pack.md), [hybrid-wave-1a-psb-tt-master-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-tt-master-production-runbook.md)

### Changed

- Docs index diperluas agar extraction pack dan runbook `TroubleTicketMaster production` muncul eksplisit pada urutan kerja hybrid migration `Web PSB`: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.22` untuk menandai pembukaan adapter master support `TroubleTicketMaster` dari production.

## [0.65.21] - 2026-07-11

### Added

- Ditambahkan jalur production `User` end-to-end yang mencakup generator JSON ke staging, transform role/division legacy ke auth master ERP, query review, assertion query, runner lokal, dan runbook untuk memuat `users.production.json` ke `auth_users`: [generate-wave1-user-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1-user-production-loader.mjs), [xampp_review_transform_wave1_user_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1_user_production.sql), [xampp_review_wave1_user_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1_user_production_review_queries.sql), [xampp_review_wave1_user_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1_user_production_assertions.sql), [run-review-wave1-user-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1-user-production.ps1), [hybrid-wave-1-user-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-user-production-runbook.md)
- Seed master minimum diperluas untuk mengakomodasi role dan division production nyata `Web PSB`, termasuk `CS_ADMIN`, `NOC_TROUBLESHOOTS`, `MARKETING`, `CS`, `TROUBLESHOOTS`, `CREATOR_DIGITAL`, dan `DISMANTLE`: [xampp_review_core_master_seed.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_core_master_seed.sql)

### Changed

- Docs index diperluas agar extraction pack dan runbook `User production` muncul eksplisit pada urutan kerja hybrid migration `Web PSB`: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.21` untuk menandai pembukaan jalur production `User`.

## [0.65.20] - 2026-07-11

### Added

- Ditambahkan rekap readiness hybrid migration `Web PSB` pasca-validasi `support core` dan `TroubleTicketPhoto` production agar status jalur production yang sudah lulus, gap yang tersisa, dan keputusan batch berikutnya terdokumentasi eksplisit: [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
- Ditambahkan paket extraction discovery `User production` untuk menarik source user nyata dari Coolify sekaligus menghitung distribusi `role` dan `division` sebagai dasar penguncian mapping ke `auth_users`, `auth_roles`, dan `org_divisions`: [hybrid-wave-1-user-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-user-production-extraction-pack.md)

### Changed

- Docs index diperluas agar rekap readiness hybrid terbaru dan discovery pack `User production` muncul eksplisit di urutan kerja migrasi `Web PSB`: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.20` untuk menandai penguncian keputusan batch berikutnya setelah `TT Photo production` lulus.

## [0.65.19] - 2026-07-11

### Fixed

- Assertion `Wave 1A TroubleTicketPhoto production` kini mengizinkan tepat `8` row orphan `ticketId=3008` tetap `INVALID`, karena parent `TroubleTicket` production-nya memang tidak tersedia di batch `PROD-WEBPSB-SUPPORT-CORE-001`, sementara seluruh row non-orphan tetap wajib linked ke `support_trouble_tickets` final: [xampp_review_wave1a_tt_photo_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_photo_production_assertions.sql)
- Runbook `TroubleTicketPhoto production` kini mencatat exception orphan `ticketId=3008` sebagai known production issue agar hasil review lokal konsisten dengan kondisi source nyata: [hybrid-wave-1a-psb-tt-photo-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-tt-photo-production-runbook.md)
- Versioning diselaraskan ke `0.65.19` untuk menandai patch pasca-eksekusi nyata batch `TroubleTicketPhoto production`.

## [0.65.18] - 2026-07-11

### Added

- Ditambahkan dokumen hasil riil batch `Wave 1A support production` agar angka final, anomali nyata, dan keputusan batch berikutnya terdokumentasi sebagai bukti eksekusi review DB lokal: [hybrid-wave-1a-psb-support-production-results.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-support-production-results.md)
- Ditambahkan jalur production khusus `TroubleTicketPhoto` berupa generator loader JSON, transform SQL, review query, assertion query, runner lokal, extraction pack, dan runbook agar evidence photo production bisa dimigrasikan dengan parent resolver dari batch `PROD-WEBPSB-SUPPORT-CORE-001`: [generate-wave1a-tt-photo-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1a-tt-photo-production-loader.mjs), [xampp_review_transform_wave1a_tt_photo_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_tt_photo_production.sql), [xampp_review_wave1a_tt_photo_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_photo_production_review_queries.sql), [xampp_review_wave1a_tt_photo_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_photo_production_assertions.sql), [run-review-wave1a-tt-photo-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-tt-photo-production.ps1), [hybrid-wave-1a-psb-tt-photo-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-tt-photo-production-extraction-pack.md), [hybrid-wave-1a-psb-tt-photo-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-tt-photo-production-runbook.md)

### Changed

- Docs index diperluas agar hasil riil support production dan jalur `TroubleTicketPhoto production` muncul eksplisit di urutan kerja hybrid migration Web PSB: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.18` untuk menandai batch lanjutan pasca-validasi penuh `Wave 1A support production`.

## [0.65.17] - 2026-07-11

### Fixed

- Transform `Wave 1A support production` kini membuat `support_isolation` sintetis minimum untuk row `DismantleTickets` production yang orphan dan tidak punya source `Isolation`, sehingga queue production seperti kasus `FEBRIAN RIZKY` tetap bisa masuk ke `support_dismantle_queue` tanpa menyisakan row `MAPPED`: [xampp_review_transform_wave1a_support_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_support_production.sql)
- Versioning diselaraskan ke `0.65.17` untuk menandai patch final pasca-validasi penuh batch production support inti `Web PSB`.

## [0.65.16] - 2026-07-11

### Fixed

- Loader `Wave 1A support production` kini memecah `INSERT` menjadi per-row statement dan mengecilkan `raw_payload` menjadi ringkasan audit field penting, sehingga batch production support tetap bisa dimuat pada XAMPP lokal yang memiliki batas `max_allowed_packet` ketat: [generate-wave1a-support-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1a-support-production-loader.mjs), [run-review-wave1a-support-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-support-production.ps1)
- Transform `Wave 1A support production` kini menahan string tanggal literal `null` dan men-dedupe `DismantleHistory` production berdasarkan pasangan `customer_name + closed_at/opened_at`, sehingga import support inti production bisa selesai tanpa bentrok unique key di `support_dismantle_history`: [xampp_review_transform_wave1a_support_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_support_production.sql)
- Assertion `Wave 1A support production` kini menghitung linkage `DismantleHistory` dari staging ke tabel final alih-alih menghitung `id` final unik, sehingga kasus dedupe production yang valid tetap dinilai `PASS` saat seluruh row staging sudah terhubung: [xampp_review_wave1a_support_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_support_production_assertions.sql)
- Versioning diselaraskan ke `0.65.16` untuk menandai patch pasca-eksekusi nyata batch support production `Web PSB`.

## [0.65.15] - 2026-07-11

### Added

- Ditambahkan generator production `Wave 1A support core` untuk mengubah empat file JSON production (`Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`) menjadi staging SQL idempotent dengan batch code `PROD-WEBPSB-SUPPORT-CORE-001`, lengkap dengan penyimpanan raw payload, fallback legacy parent/reference, dan normalized key per lane support: [generate-wave1a-support-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1a-support-production-loader.mjs)
- Ditambahkan transform production support inti `Wave 1A` yang memuat `support_isolations`, `support_trouble_tickets`, `support_dismantle_queue`, dan `support_dismantle_history` langsung dari `staging_legacy_support_records`, sambil mempertahankan fallback matching longgar yang memang dibutuhkan data support production nyata: [xampp_review_transform_wave1a_support_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_support_production.sql)
- Ditambahkan review query, assertion query, runner lokal, extraction pack, dan runbook production untuk membuka jalur eksekusi nyata batch support inti setelah `Wave 1B Ticket` dan `Wave 2` tervalidasi: [xampp_review_wave1a_support_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_support_production_review_queries.sql), [xampp_review_wave1a_support_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_support_production_assertions.sql), [run-review-wave1a-support-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-support-production.ps1), [hybrid-wave-1a-psb-support-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-support-production-extraction-pack.md), [hybrid-wave-1a-psb-support-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-support-production-runbook.md)
- Docs index diperluas agar jalur production support inti ini muncul berdampingan dengan jalur `Wave 1A`, `Wave 1B Ticket`, dan `Wave 2`, sehingga urutan kerja hybrid migration semakin eksplisit di repo: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Changed

- Versioning diselaraskan ke `0.65.15` untuk menandai batch baru persiapan production path support inti Web PSB.

## [0.65.14] - 2026-07-11

### Changed

- Assertion `Wave 1B Ticket production` disesuaikan agar batch tetap dinilai lulus bila hanya menyisakan tepat 6 row `INVALID` dari exception paket production yang sudah diketahui (`PAKET CAFÉ`, `PAKET KBB`, dan `-`), sehingga invalid anomali tetap terlihat tanpa memblokir jalur utama customer/order/subscription/work order: [xampp_review_wave1b_ticket_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_production_assertions.sql)
- Runbook `Wave 1B Ticket production` diperjelas agar exception paket anomali ini terdokumentasi sebagai pengecualian yang disengaja, bukan kegagalan mapping tersembunyi: [hybrid-wave-1b-psb-ticket-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1b-psb-ticket-production-runbook.md)
- Versioning diselaraskan ke `0.65.14` untuk menandai penyesuaian assertion pasca-validasi batch production `Ticket`.

## [0.65.13] - 2026-07-11

### Added

- Ditambahkan generator production `Wave 1B Ticket split` untuk mengubah `ticket.production.json` menjadi staging SQL yang idempotent, termasuk batch code khusus `PROD-WEBPSB-TICKET-001`, fallback nomor order, dan penandaan row `INVALID` bila package mapping otomatis belum tersedia: [generate-wave1b-ticket-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1b-ticket-production-loader.mjs)
- Ditambahkan transform production `Wave 1B Ticket` yang melakukan deduplikasi customer berbasis `nama + phone`, lalu membentuk `crm_customers`, `crm_customer_addresses`, `sales_orders`, `service_subscriptions`, dan `service_work_orders` dari staging production: [xampp_review_transform_wave1b_ticket_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1b_ticket_production.sql)
- Ditambahkan review query, assertion query, runner lokal, extraction pack, dan runbook production untuk menyiapkan jalur eksekusi nyata `Ticket split` setelah sample `Wave 1B` tervalidasi: [xampp_review_wave1b_ticket_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_production_review_queries.sql), [xampp_review_wave1b_ticket_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_production_assertions.sql), [run-review-wave1b-ticket-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1b-ticket-production.ps1), [hybrid-wave-1b-psb-ticket-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1b-psb-ticket-production-extraction-pack.md), [hybrid-wave-1b-psb-ticket-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1b-psb-ticket-production-runbook.md)
- Versioning diselaraskan ke `0.65.13` untuk menandai paket production path `Wave 1B Ticket` ini.

## [0.65.12] - 2026-07-11

### Changed

- Ditambahkan assertion query `Wave 2 production mini-batch` untuk merangkum status `PASS / BLOCKED` pada check utama coverage, marketing activity, relasi area, ODP header dedup, ODP port bootstrap, dan TT SLA setelah batch produksi selesai dijalankan di review DB: [xampp_review_wave2_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave2_production_assertions.sql)
- Runbook lokal `Wave 2` dan docs index diperbarui agar jalur validasi batch produksi sekarang mencakup review query dan assertion query, bukan hanya review manual: [hybrid-wave-2-psb-local-loader-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-local-loader-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- Versioning diselaraskan ke `0.65.12` untuk menandai paket assertion `Wave 2` ini.

## [0.65.11] - 2026-07-11

### Fixed

- Generator `Wave 2 production mini-batch` sekarang membulatkan latitude/longitude ODP ke 7 digit desimal agar staging review DB tidak lagi memberi warning `Data truncated` untuk koordinat production: [generate-wave2-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave2-production-loader.mjs)
- Transform ODP production kini melakukan deduplikasi per `odp_code` sebelum insert ke `network_odp`, sehingga batch production nyata yang punya header legacy ganda seperti `TRKL/01 - 01` tetap bisa diimpor ke satu header final tanpa melanggar unique key: [xampp_review_transform_wave2_odp_ttsla.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave2_odp_ttsla.sql)
- Versioning diselaraskan ke `0.65.11` untuk menandai patch bugfix deduplikasi ODP production ini.

## [0.65.10] - 2026-07-11

### Fixed

- Loader SQL `Wave 2 production mini-batch` tidak lagi memakai session variable `batch_code` yang memicu bentrok collation pada review DB lama; generator sekarang menulis literal `_utf8mb4 ... COLLATE utf8mb4_unicode_ci` agar lookup batch produksi berjalan stabil di lingkungan XAMPP yang collation-nya campuran: [generate-wave2-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave2-production-loader.mjs)
- Versioning diselaraskan ke `0.65.10` untuk menandai patch bugfix loader production ini.

## [0.65.09] - 2026-07-11

### Fixed

- Generator staging `Wave 2 production mini-batch` sekarang membentuk `legacy_id` ODP dari kombinasi `id + nama_odp`, sehingga sample dan batch production yang memiliki `id` legacy duplikat tetap bisa ditelusuri dengan aman pada staging tanpa ambigu: [generate-wave2-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave2-production-loader.mjs)
- Runbook lokal `Wave 2` kini mendokumentasikan guardrail anomali `psb_odp` production, termasuk alasan mengapa identitas staging ODP tidak lagi bergantung pada `id` legacy tunggal: [hybrid-wave-2-psb-local-loader-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-local-loader-runbook.md)
- `VERSION` dan versi `apps/web` diselaraskan ke `0.65.09` untuk menandai patch release loader production ini.

## [0.65.08] - 2026-07-11

### Changed

- Ditambahkan generator SQL `Wave 2 production mini-batch` yang membaca file JSON hasil extraction `CoveredArea`, `MarketingActivity`, `psb_odp`, dan `TroubleTicketSla`, lalu menghasilkan loader staging review DB dengan namespace produksi yang tidak bentrok dengan sample review lama: [generate-wave2-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave2-production-loader.mjs)
- Ditambahkan transform khusus batch production untuk domain sales serta domain ODP/TT SLA, sehingga mini-batch nyata tidak lagi bergantung pada batch code sample `Wave 1A` dan `Wave 1C`: [xampp_review_transform_wave2_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave2_sales.sql), [xampp_review_transform_wave2_odp_ttsla.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave2_odp_ttsla.sql)
- Ditambahkan runner lokal dan review query untuk `Wave 2 production mini-batch`, sehingga alur `JSON production -> staging -> transform -> review` kini bisa dijalankan end-to-end di XAMPP lokal: [run-review-wave2-production-mini-batch.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave2-production-mini-batch.ps1), [xampp_review_wave2_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave2_production_review_queries.sql)
- Ditambahkan runbook lokal `Wave 2` dan pembaruan docs index agar batch produksi pertama punya panduan operasional konkret setelah extraction dari Coolify: [hybrid-wave-2-psb-local-loader-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-local-loader-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Batch produksi pertama kini tidak lagi berhenti di level extraction JSON, karena loader staging, transform production, dan review query sudah tersedia dalam bentuk artefak runnable lokal.
- `VERSION` dinaikkan ke `0.65.08` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.07] - 2026-07-11

### Changed

- Artefak runnable `Wave 1C` yang sebelumnya masih lokal kini dirapikan untuk siap dipush bersama paket extraction production, mencakup patch review DB lama, sample import coverage/marketing activity, transform, bootstrap native ODP ports, review query, dan runner Windows: [xampp_review_patch_wave_1c_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave_1c_existing_review_db.sql), [xampp_review_sample_import_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1c_sales.sql), [xampp_review_transform_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1c_sales.sql), [xampp_review_bootstrap_wave_1c_odp_ports.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_bootstrap_wave_1c_odp_ports.sql), [xampp_review_wave_1c_sales_odp_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_review_queries.sql), [run-review-wave1c-sales-odp.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1c-sales-odp.ps1)
- Ditambahkan extraction pack production `Wave 2` yang read-only untuk `CoveredArea`, `MarketingActivity`, `psb_odp`, dan `TroubleTicketSla`, sehingga batch produksi pertama kini punya langkah operasional konkret dari terminal Coolify ke file JSON: [postgres_web_psb_wave2_extraction_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/postgres_web_psb_wave2_extraction_queries.sql), [hybrid-wave-2-psb-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-production-extraction-pack.md)
- Docs index diperbarui agar jalur `Wave 2 production extraction` terbaca langsung sesudah dokumen mini-batch: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Transisi dari sample review ke mini-batch production kini tidak lagi berhenti di level rencana, karena query pack extraction sudah tersedia dan sesuai batasan terminal Coolify yang mengandalkan `node + PrismaClient`.
- `VERSION` dinaikkan ke `0.65.07` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.06] - 2026-07-11

### Changed

- Ditambahkan assertion query `Wave 1B Ticket` dan `Wave 1C Sales + ODP`, sehingga validasi hasil sample review kini bisa diringkas otomatis ke status `PASS / BLOCKED` tanpa membaca seluruh blok review manual: [xampp_review_wave_1b_ticket_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_assertions.sql), [xampp_review_wave_1c_sales_odp_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_assertions.sql)
- Ditambahkan dokumen `Wave 2 production mini-batch` yang mengunci batch produksi pertama paling aman dari `Web PSB`, dengan prioritas `CoveredArea`, `MarketingActivity`, `psb_odp`, bootstrap native `network_odp_ports`, dan `TroubleTicketSla`: [hybrid-wave-2-psb-production-mini-batch.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-production-mini-batch.md)
- Runbook `Wave 1B` dan `Wave 1C` diperbarui agar memuat assertion query sebagai langkah resmi sesudah review query, dan docs index diselaraskan ke jalur kerja batch berikutnya: [hybrid-wave-1-psb-wave-1b-ticket-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1b-ticket-runbook.md), [hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur menuju import production kecil kini tidak lagi bergantung pada interpretasi lisan hasil review, karena threshold batch aman, batch yang ditunda, guardrail, dan acceptance criteria sudah tertulis eksplisit.
- `VERSION` dinaikkan ke `0.65.06` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.05] - 2026-07-11

### Changed

- Ditambahkan patch schema `Wave 1C` untuk domain sales dan network review DB, mencakup staging `CoveredArea`, staging `MarketingActivity`, relasi area activity, tabel final `sales_marketing_activities`, dan tabel final `sales_marketing_activity_areas`: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql), [xampp_review_patch_wave_1c_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave_1c_existing_review_db.sql)
- Ditambahkan sample import `Wave 1C`, transform coverage/activity, bootstrap native `network_odp_ports`, review query, dan runner Windows agar jalur schema-new pasca `Wave 1B` bisa diuji end-to-end di review DB lokal: [xampp_review_sample_import_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1c_sales.sql), [xampp_review_transform_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1c_sales.sql), [xampp_review_bootstrap_wave_1c_odp_ports.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_bootstrap_wave_1c_odp_ports.sql), [xampp_review_wave_1c_sales_odp_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_review_queries.sql), [run-review-wave1c-sales-odp.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1c-sales-odp.ps1)
- Ditambahkan runbook `Wave 1C` dan pembaruan docs index/sample import/staging import agar coverage, marketing activity, dan bootstrap ODP port masuk jalur kerja hybrid migration yang eksplisit: [hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md), [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)

### Fixed

- Batas antara data copy-first legacy dan data native ERP kini makin tegas, karena `network_odp_ports` tidak lagi diasumsikan bisa di-copy dari production lama dan sudah punya bootstrap aman berbasis header ODP tervalidasi.
- `VERSION` dinaikkan ke `0.65.05` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.04] - 2026-07-11

### Changed

- Ditambahkan sample batch `Wave 1B Ticket split` beserta transform khusus yang tidak lagi bergantung pada `@batch_id` manual, sehingga jalur `Ticket -> staging customer/order -> crm_customers/crm_customer_addresses/sales_orders/service_subscriptions/service_work_orders` kini bisa diuji secara utuh di review DB lokal: [xampp_review_sample_import_wave_1b_ticket.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1b_ticket.sql), [xampp_review_transform_wave_1b_ticket.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1b_ticket.sql)
- Ditambahkan review query dan runner Windows untuk `Wave 1B Ticket`, sehingga eksekusi dan audit hasil batch bisa dilakukan lebih mudah dari lingkungan XAMPP user: [xampp_review_wave_1b_ticket_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_review_queries.sql), [run-review-wave1b-ticket.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1b-ticket.ps1)
- Ditambahkan runbook dan pembaruan docs index/sample import agar `Wave 1B Ticket` langsung masuk ke jalur kerja hybrid migration setelah validasi `Wave 1A`: [hybrid-wave-1-psb-wave-1b-ticket-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1b-ticket-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md)

### Fixed

- Batch lanjut setelah `Wave 1A` kini tidak lagi berhenti di level desain, karena adapter `Ticket` sudah punya artefak sample, transform, review, dan runner yang siap dipakai.
- `VERSION` dinaikkan ke `0.65.04` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.03] - 2026-07-11

### Changed

- Ditambahkan dokumen desain `Wave 1B` pasca-validasi `Wave 1A` yang mengunci jalur adapter `Ticket` ke `crm_customers`, `crm_customer_addresses`, `sales_orders`, `service_subscriptions`, dan `service_work_orders`, sekaligus membedakan secara tegas domain yang masih `schema-new` seperti `CoveredArea`, `MarketingActivity`, dan `network_odp_ports`: [hybrid-wave-1-psb-wave-1b-adapter-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1b-adapter-design.md)
- Index docs diperbarui agar dokumen `Wave 1B` langsung masuk ke jalur kerja hybrid migration dan bisa dipakai sebagai acuan batch berikutnya: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Arah lanjut setelah `Wave 1A` kini tidak lagi abu-abu karena batas antara batch adapter existing schema dan batch schema ERP baru sudah terdokumentasi dengan jelas.
- `VERSION` dinaikkan ke `0.65.03` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.02] - 2026-07-11

### Fixed

- Transform `Wave 1A` untuk support extension dan ODP header kini mengambil batch sample secara eksplisit berdasarkan `batch_code`, sehingga runner tidak lagi berhenti pada kondisi semu di mana batch sample berhasil masuk ke staging tetapi semua target final tetap `NULL` karena variabel `@batch_id` tidak pernah terisi: [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql), [xampp_review_transform_wave_1a_network_odp.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_network_odp.sql)
- `VERSION` dinaikkan ke `0.65.02` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.01] - 2026-07-11

### Changed

- Ditambahkan assertion query `Wave 1A` yang merangkum status `PASS / BLOCKED` untuk batch support extension, link target staging, row final support, batch ODP header, dan row final `network_odp`, sehingga validasi pasca-eksekusi bisa dibaca lebih cepat tanpa menafsirkan seluruh output query mentah: [xampp_review_wave_1a_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_assertions.sql)
- Ditambahkan template laporan hasil run `Wave 1A` agar output runner, query review, assertion query, checklist, dan keputusan lanjut bisa ditempel dalam format yang konsisten untuk dianalisis bersama: [hybrid-wave-1-psb-wave-1a-result-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-result-template.md)
- Runbook dan docs index diperbarui untuk menghubungkan runner, review query, assertion query, checklist, dan template hasil menjadi satu paket validasi yang utuh: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Tahap handoff setelah eksekusi `Wave 1A` kini lebih rapi karena operator bisa langsung mengirim laporan hasil run dalam format standar, dan validasi utama sudah punya assertion SQL yang eksplisit.
- `VERSION` dinaikkan ke `0.65.01` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.00] - 2026-07-11

### Changed

- Ditambahkan file query review `Wave 1A` yang bisa dijalankan read-only setelah sample dan transform selesai, sehingga audit hasil staging/final table support extension dan ODP header tidak perlu merangkai query satu per satu secara manual: [xampp_review_wave_1a_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_review_queries.sql)
- Ditambahkan checklist eksekusi `Wave 1A` untuk mencatat status `PASS / FAIL / BLOCKED`, evidence, dan keputusan `GO / PARTIAL / BLOCKED` setelah runner dijalankan: [hybrid-wave-1-psb-wave-1a-execution-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-execution-checklist.md)
- Runbook dan docs index diperbarui agar runner, query review, dan checklist pasca-eksekusi sekarang saling terhubung dalam satu jalur kerja yang utuh: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Tahap validasi hasil `Wave 1A` kini lebih operasional karena ada artefak khusus untuk memeriksa batch support extension dan network ODP secara konsisten sesudah eksekusi, bukan hanya mengandalkan output runner mentah.
- `VERSION` dinaikkan ke `0.65.00` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.99] - 2026-07-11

### Changed

- Ditambahkan runner PowerShell `Wave 1A` agar urutan SQL review DB untuk support extension dan ODP header bisa dijalankan otomatis dari Windows, termasuk mode `Full` dan `Wave1AOnly`, pencarian `mysql.exe`, dan query review hasil akhir: [run-review-wave1a.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a.ps1)
- Ditambahkan runbook khusus `Wave 1A` yang merangkum prasyarat, urutan SQL manual, contoh command PowerShell, dan query review final table untuk memudahkan eksekusi di mesin XAMPP user: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md)
- Panduan XAMPP dan index docs diperbarui agar extension `Wave 1A` tidak lagi tersebar di beberapa file terpisah, tetapi punya jalur eksekusi yang eksplisit dari bootstrap sampai review hasil: [xampp-setup.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/xampp-setup.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur lanjut setelah sample dan draft transform `Wave 1A` kini lebih siap dipakai di lingkungan Windows/XAMPP, walau `mysql` belum ada di `PATH`, karena runner mendukung path eksplisit ke binary MySQL.
- `VERSION` dinaikkan ke `0.64.99` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.98] - 2026-07-11

### Changed

- Ditambahkan file sample `Wave 1A` terpisah untuk `PSB_SUPPORT_EXT` dan `PSB_ODP_HEADER`, sehingga queue dismantle, photo TT detail, SLA, master support config, dan header ODP bisa diuji di staging review tanpa mengganggu sample batch dasar yang sudah ada: [xampp_review_sample_import_wave_1a.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1a.sql)
- Dokumentasi sample import diperluas agar urutan eksekusi sekarang mencakup sample dan transform `Wave 1A`, lengkap dengan query review staging/final table untuk support extension dan network ODP: [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md)
- Desain `Wave 1A` dan index docs diperbarui untuk menandai bahwa sample batch SQL sudah tersedia dan siap dipakai untuk review DB berikutnya: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Draft transform support extension kini dapat mencari parent `Isolation` dan `TroubleTicket` lintas batch source yang sama, sehingga desain batch terpisah `PSB_SUPPORT_EXT` benar-benar bisa dijalankan sesuai rencana `Wave 1A`: [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql)
- `VERSION` dinaikkan ke `0.64.98` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.97] - 2026-07-11

### Changed

- Ditambahkan draft transform `wave 1A` untuk support extension agar `DismantleTickets`, `TroubleTicketPhoto`, dan `TroubleTicketSla` dapat dipindahkan dari staging ke tabel final review menggunakan pola yang konsisten dengan transform tahap 3 yang sudah ada: [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql)
- Ditambahkan draft transform khusus header ODP production `Web PSB` agar `staging_legacy_network_odp_records` dapat dipindahkan ke `network_odp` tanpa mencampur jalur network dengan inventory gudang: [xampp_review_transform_wave_1a_network_odp.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_network_odp.sql)
- Dokumen desain `wave 1A` diperbarui untuk menandai bahwa patch schema minimum dan draft transform SQL sudah tersedia, sehingga langkah berikutnya tinggal menyiapkan batch sample dan review hasil final table: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md)

### Fixed

- Jalur migrasi `Web PSB` untuk support extension dan ODP header kini tidak lagi berhenti di level desain, karena schema staging dan draft transform SQL sudah saling tersambung pada review DB.
- `VERSION` dinaikkan ke `0.64.97` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.96] - 2026-07-11

### Changed

- Schema review staging sekarang diperluas untuk `wave 1A Web PSB` dengan menambahkan tipe support `DISMANTLE_QUEUE`, `TROUBLE_TICKET_PHOTO`, `TROUBLE_TICKET_SLA`, dan `TROUBLE_TICKET_MASTER`, beserta kolom linkage/fallback seperti `legacy_parent_id`, `legacy_reference_code`, `note_text`, `actor_name`, `target_dismantle_queue_id`, dan `target_trouble_ticket_sla_id`: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql)
- Ditambahkan tabel staging baru `staging_legacy_network_odp_records` agar header ODP production `Web PSB` bisa di-review langsung ke jalur `network_odp` tanpa bercampur dengan staging inventory gudang: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql)
- Dokumentasi staging import diperbarui agar mencerminkan extension support `wave 1A` dan penambahan domain network ODP pada layer staging: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)

### Fixed

- Jalur eksekusi setelah desain `wave 1A` kini benar-benar siap dipakai untuk batch support extension dan ODP header, sehingga `DismantleTickets`, `TroubleTicketPhoto`, `TroubleTicketSla`, dan `psb_odp` tidak lagi menggantung tanpa landing zone staging yang eksplisit.
- `VERSION` dinaikkan ke `0.64.96` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.95] - 2026-07-11

### Changed

- Ditambahkan desain `wave 1A staging/import` untuk source production `Web PSB`, mencakup batch `Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`, `TroubleTicketPhoto`, `TroubleTicketSla`, dan `psb_odp`, beserta patch schema minimum dan urutan eksekusi review DB: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md)
- Index docs diperbarui agar desain `wave 1A` masuk ke baseline hybrid migration dan bisa langsung dipakai saat menyiapkan patch staging atau script transform berikutnya: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur lanjut setelah audit production `Web PSB` kini lebih konkret karena domain support dan ODP sudah dipisahkan antara yang bisa memakai schema staging saat ini dan yang wajib mendapat patch minimum lebih dulu.
- `VERSION` dinaikkan ke `0.64.95` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.94] - 2026-07-11

### Changed

- Ditambahkan mapping final `Web PSB production` ke staging, tabel final ERP, aturan normalisasi, dan keputusan transform berbasis schema, constraint, serta sample data nyata dari Coolify, sehingga wave 1 tidak lagi bergerak dari asumsi schema legacy: [hybrid-wave-1-psb-production-final-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-final-mapping.md)
- Index docs diperbarui agar hasil audit production final `Web PSB` masuk ke daftar dokumen utama bersama matriks awal, checklist akses DB, dan playbook hybrid migration: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Keputusan migrasi `Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`, dan `psb_odp` kini dikunci berdasarkan data production nyata, termasuk fallback untuk relasi longgar dan penegasan bahwa `network_odp_ports` harus dibentuk sebagai schema ERP baru.
- `VERSION` dinaikkan ke `0.64.94` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.93] - 2026-07-11

### Changed

- Ditambahkan checklist akses database production `Web PSB` di Coolify, termasuk opsi kredensial minimum, query inventaris schema, tabel prioritas audit, dan guardrail read-only agar penarikan DB production bisa dilakukan dengan aman dan terarah: [hybrid-wave-1-psb-production-db-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-db-checklist.md)
- Index docs diperbarui agar checklist akses production `Web PSB` masuk ke dokumen utama dan bisa dipakai langsung saat koneksi Coolify tersedia: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur lanjut dari audit repo lokal ke inventaris DB production kini lebih jelas karena kebutuhan akses Coolify dan langkah inventaris schema sudah terdokumentasi.
- `VERSION` dinaikkan ke `0.64.93` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.92] - 2026-07-11

### Changed

- Ditambahkan matriks tabel `Web PSB` yang memetakan model/tabel legacy ke staging, tabel final ERP, modul target, dan status kesiapan transform, sehingga penarikan schema/data production berikutnya punya jalur implementasi yang lebih konkret: [hybrid-wave-1-psb-table-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-table-matrix.md)
- Index docs diperbarui agar matriks tabel `Web PSB` masuk ke daftar dokumen utama bersama playbook dan inventaris hybrid gelombang 1: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Arah kerja setelah audit repo lokal kini lebih operasional karena sumber `Web PSB` sudah dipetakan sampai level staging/final table/modul ERP, bukan hanya level menu dan file referensi.
- `VERSION` dinaikkan ke `0.64.92` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.91] - 2026-07-11

### Changed

- Ditambahkan dokumen inventaris gelombang 1 untuk tiga repo legacy lokal (`web-psb-perkasa`, `finance-repo`, `ga-web-app`) agar tim punya daftar sumber yang nyata, menu kerja inti, model/tabel penting, file prioritas untuk copy-first, dan mapping awal ke modul ERP baru: [hybrid-wave-1-inventory.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-inventory.md)
- Index docs diperbarui agar inventaris hybrid gelombang 1 bisa langsung dipakai sebagai referensi batch porting berikutnya bersama playbook migrasi hybrid: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Keputusan untuk memakai repo lokal sebagai sumber audit tidak lagi hanya implisit, karena inventaris sumber legacy dan prioritas porting awal sekarang terdokumentasi secara eksplisit.
- `VERSION` dinaikkan ke `0.64.91` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.90] - 2026-07-11

### Changed

- Ditambahkan dokumen kerja baru `hybrid-migration-playbook.md` untuk mengunci keputusan bahwa percepatan parity dilakukan dengan model hybrid: database production dipakai sebagai sumber data nyata, repo legacy dipakai sebagai sumber logic/UI, dan `perkasa-erp-oss-bss` tetap menjadi target akhir `ERP/OSS/BSS` dengan constraint `1 database`, `1 domain`, `1 website`: [hybrid-migration-playbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-migration-playbook.md)
- Index dokumen proyek diperbarui agar playbook hybrid migration masuk ke daftar dokumen utama dan bisa langsung dipakai sebagai panduan batch berikutnya: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Arah kerja migrasi kini terdokumentasi lebih jelas sehingga keputusan `ambil DB`, `ambil repo`, dan `tetap ERP-first` tidak perlu ditebak ulang pada batch implementasi berikutnya.
- `VERSION` dinaikkan ke `0.64.90` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.89] - 2026-07-11

### Changed

- Route `/support/isolations` kini memakai workspace khusus `SupportIsolationWorkspace`, sehingga `Monitoring Isolir` tampil sebagai halaman kerja tersendiri dengan header operasional, KPI cepat, tabel isolir, dan blok form restore/transfer yang lebih dekat ke pola `web-psb-perkasa`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx)
- Workspace isolir baru tetap me-reuse `SupportIsolationQueuePanel`, `SupportIsolationForm`, `SupportIsolationRestoreForm`, dan `SupportDismantleForm`, sehingga parity UI bergerak ke pola legacy tanpa memecah service, API, permission, maupun ownership ERP yang sudah aktif: [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx)

### Fixed

- `Monitoring Isolir` tidak lagi terasa seperti lane support generik karena tabel dan aksi utama sekarang menjadi pusat baca halaman, sementara fokus kasus per customer/service tetap dipertahankan melalui drilldown yang sama.
- `VERSION` dinaikkan ke `0.64.89` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.88] - 2026-07-11

### Changed

- Halaman `Aktivitas Marketing` sekarang dibaca lebih seperti console operasional legacy dengan empat KPI cepat di atas, info strip mode aktif, dan dua mode yang sama-sama `table-first`, sehingga operator tidak lagi berpindah dari tabel ke tampilan kartu saat membaca performa marketing vs distribusi area: [marketing-activity-manager.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/marketing-activity-manager.tsx)
- Mode `Analisis Area` diubah dari daftar progress/bar menjadi tabel operasional yang menampilkan `Area`, `Kunjungan`, `Marketing Aktif`, `Persentase`, dan `PIC Area`, namun tetap memakai service aktivitas marketing yang sama agar fondasi ERP/OSS/BSS tidak berubah: [marketing-activity-manager.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/marketing-activity-manager.tsx)

### Fixed

- Ritme halaman Aktivitas Marketing kini lebih dekat ke baseline `web-psb-perkasa` karena pembacaan status cepat dan tabel utama langsung terbaca sebelum operator masuk ke modal tambah/edit aktivitas.
- `VERSION` dinaikkan ke `0.64.88` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.87] - 2026-07-11

### Changed

- Route `/sales` kini tidak lagi dirender penuh oleh `DomainShell` generik, tetapi memakai workspace khusus `SalesDomainWorkspace` yang memosisikan KPI, tabel pipeline penjualan, dan action form dalam ritme kerja yang lebih dekat ke `web-psb-perkasa`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx)
- Workspace `Penjualan` baru tetap memakai `getDomainPageData()` dan form/service sales yang sudah ada, sehingga parity UI bergerak ke pola legacy tanpa melepaskan fondasi ERP/OSS/BSS yang sudah terbangun: [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx)

### Fixed

- Gap ekspektasi pada menu `Penjualan` ditangani dengan memisahkan halaman kerja spesifik dari renderer domain generik, sehingga tabel kerja kini menjadi pusat baca dan CTA per baris lebih langsung seperti baseline operasional lama.
- `VERSION` dinaikkan ke `0.64.87` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.86] - 2026-07-11

### Changed

- `Tabel kerja utama menu` kini dipindahkan ke bagian atas `DomainShell`, sehingga saat user membuka menu Sales, Customer, Billing, Inventory, HR, dan domain lain, blok tabel langsung terlihat setelah header/drilldown tanpa harus melewati kartu summary, highlight, atau form terlebih dahulu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Judul section review lintas domain kini dipertegas menjadi `Tabel kerja utama menu` agar hierarki visualnya jelas sebagai pusat kerja, bukan blok review sekunder di bagian bawah halaman: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Keluhan bahwa tabel belum terlihat pada masing-masing menu ditangani dengan mengubah urutan layout halaman, bukan hanya bentuk row, sehingga pola `table-first` sekarang terasa langsung dari awal membuka menu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.86` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.85] - 2026-07-11

### Changed

- `Lembar kerja` lintas divisi pada renderer shared kini berubah menjadi `table-first`, sehingga review operasional di Sales, Customer, Billing, Inventory, HR, dan workspace domain lain tidak lagi tampil sebagai kartu per row tetapi sebagai tabel rapat dengan aksi per baris: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Layout section review lintas divisi kini dibuat satu kolom penuh agar tabel kerja lebih lebar dan lebih dekat dengan pola operasional sistem legacy dibanding grid kartu dua kolom sebelumnya: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Lane `SLA` di support juga kini mengikuti pola tabel, sehingga rule SLA tidak lagi card-only dan konsisten dengan panel operasional support lain yang sudah table-first: [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx)

### Fixed

- Detail kontekstual Billing seperti correlation summary, decision trail, evidence, health signal, recommended action, dan outcome summary tetap dipertahankan melalui row detail di bawah tabel agar perpindahan dari kartu ke tabel tidak menghilangkan konteks keputusan kasus: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.85` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.84] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Action Outcome Summary` setelah `Recommended Next Action`, sehingga operator bisa langsung membaca target hasil, sinyal berhasil, dan fallback pada kasus restore, terminate, serta TT/SLA kritis tanpa membuka lane lain lebih dulu: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-action-outcome-summary.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-action-outcome-summary.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Action Outcome Summary`, sehingga hasil yang dituju setelah reconnect, follow-up, suspend, atau terminate langsung terbaca pada level row review dan tidak berhenti di action recommendation saja: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `actionOutcomeSummary` agar outcome target dan fallback per kasus bisa dibawa konsisten bersama health signal, recommended actions, correlation summary, decision trail, dan evidence panel: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.84` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.83] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Recommended Next Action` untuk kasus restore, terminate, dan TT/SLA kritis, sehingga operator langsung melihat matriks 2-3 aksi prioritas yang bisa dijalankan per kasus tanpa menebak lane berikutnya: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-next-action-matrix.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-next-action-matrix.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Recommended Next Action` yang menerjemahkan health signal menjadi action primer, lane support terkait, dan audit Billing, sehingga keputusan reconnect/follow-up/terminate lebih operasional pada level customer-service yang sama: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `recommendedActions` agar matriks rekomendasi bisa dibawa konsisten bersama health signal, correlation summary, decision trail, dan evidence panel dalam satu konteks kasus: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.83` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.82] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Case Health Signal` pada kasus restore, terminate, dan ticket kritis, sehingga operator langsung mendapatkan sinyal keputusan cepat seperti `Butuh Follow-Up Billing`, `Siap Terminate`, atau `Masih Tertahan SLA` sebelum membaca detail lebih dalam: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-health-signal.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-health-signal.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Case Health Signal`, sehingga operator dapat langsung membaca apakah kasus cenderung aman direstore, masih butuh follow-up Billing, siap terminate, atau masih perlu review supervisor sebelum berpindah lane: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `healthSignal` agar ringkasan keputusan cepat dapat dibawa konsisten bersama correlation summary, decision trail, dan evidence panel dalam satu konteks kasus: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.82` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.81] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Evidence Terakhir` per kasus untuk jalur restore, terminate, dan ticket kritis, sehingga operator dapat membaca alasan isolir, catatan transfer, status ticket aktif, serta scope service yang terakhir terbaca tanpa keluar dari worklist: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-evidence-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-evidence-panel.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Evidence Billing / Kasus`, sehingga operator bisa melihat action notes, due atau follow-up terakhir, dan scope service yang relevan sebelum memutuskan handoff ke lane support: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `evidencePanel` agar supervisor dapat membawa bukti tindakan terakhir lintas Billing, Isolir, TT/SLA, dan Dismantle dalam satu panel yang reusable: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.81` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.80] - 2026-07-11

### Changed

- `Panel Detail` supervisor sekarang menampilkan `Decision Trail` per kasus untuk jalur restore, terminate, dan ticket kritis, sehingga supervisor dapat membaca fase penting terakhir seperti pembukaan isolir, transfer ke queue dismantle, atau pembukaan TT sebelum memutuskan aksi berikutnya: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-decision-trail.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-decision-trail.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Decision Trail Billing / Kasus`, sehingga operator bisa membaca urutan keputusan dari status invoice atau collection, kontrol follow-up aktif, hingga handoff lintas domain sebelum keluar dari Billing: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Query supervisor terminate kini ikut membawa `isolation_date` sehingga jejak keputusan pada kasus dismantle dapat menunjukkan fase isolir sebelum transfer ke queue dismantle secara lebih natural: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.80` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.79] - 2026-07-11

### Changed

- `Panel Detail` supervisor sekarang menampilkan `Ringkasan Korelasi Kasus` yang merangkum Billing, Isolir, TT/SLA, Dismantle, owner aktif, customer, dan service pada item support yang sedang diputuskan, sehingga supervisor tidak perlu lompat lane dulu hanya untuk memahami posisi kasus: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-correlation-summary.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-correlation-summary.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini menampilkan ringkasan korelasi customer/service langsung pada row yang relevan, sehingga operator bisa membaca posisi operasional kasus sebelum memutuskan tetap di Billing atau lompat ke Isolir, TT/SLA, maupun Dismantle: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Query supervisor untuk restore, terminate, dan ticket risiko tinggi kini ikut membawa `service_no` dari subscription agar ringkasan korelasi lintas domain tidak berhenti di customer name saja: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.79` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.78] - 2026-07-11

### Changed

- Lane support kini bisa dibuka dengan filter `customer/service` langsung dari query string, sehingga handoff dari Billing tidak lagi hanya memindahkan operator ke lane umum tetapi langsung menyusut ke kasus yang paling dekat dengan customer dan layanan yang sama: [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx)
- Review row pada domain Billing sekarang mendukung CTA sekunder ke lane support terkait, sehingga operator bisa tetap menjalankan aksi Billing sebagai tombol utama sambil membuka `Isolir`, `TT/SLA`, atau `Dismantle` yang sudah terfilter customer/service sebagai jalur tindak lanjut kasus: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Data row Billing kini membawa metadata `Service` pada invoice, collection follow-up, reconnect, write-off, collection action, dan payment terbaru agar pemetaan lintas domain tidak berhenti di invoice atau customer saja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.78` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.77] - 2026-07-11

### Changed

- Jalur `Billing decision -> Isolir -> TT/SLA -> Dismantle -> Supervisor CS_ADMIN` kini diperjelas lewat panel handoff lintas divisi yang tampil langsung di form `collection action`, `resolve`, dan `status invoice`, sehingga operator Billing tidak lagi berhenti di keputusan finansial saja tetapi langsung diarahkan ke lane operasional berikutnya: [billing-decision-handoff-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-decision-handoff-panel.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx)
- Panel `Isolir`, `SLA`, dan `Dismantle` kini menampilkan CTA sinkron Billing dan shortcut supervisor yang lebih eksplisit, sehingga operator support dapat membaca keputusan Billing sebagai bagian dari alur layanan, bukan konteks terpisah: [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)

### Fixed

- Alert dashboard untuk `Billing overdue`, `Ticket`, dan `Isolir` kini lebih tepat mengarahkan operator ke anchor atau queue keputusan yang sesuai, sehingga jalur handoff ke Billing, SLA, dan Supervisor tidak lagi berhenti di halaman umum: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.77` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.76] - 2026-07-11

### Changed

- Workspace `CS_ADMIN` kini memiliki quick access yang lebih eksplisit ke `TT Aktif`, `SLA Kritis`, dan `Billing`, sehingga supervisor bisa berpindah dari bucket kontrol ke lane operasional yang tepat tanpa lewat menu umum lagi: [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx)
- Item worklist support kini mendukung handoff link sekunder, sehingga panel detail tidak hanya memberi satu CTA utama tetapi juga jalur lintas divisi yang relevan untuk restore, terminate, progress TT, eskalasi, dan kontrol SLA: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx)

### Fixed

- Queue `Transfer atau Restore` dan `Queue Risiko Tinggi` di supervisor kini tidak lagi berhenti di link modul umum, karena kasus isolir, dismantle, dan ticket kritis langsung membuka lane dan action support yang sesuai dengan konteks prefill masing-masing: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [support-action-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-action-links.ts)
- Handoff lintas peran antara `Billing`, `CS & Admin CS`, `TT`, dan `SLA` kini lebih natural karena CTA utama dan sekunder pada item supervisor membawa operator ke jalur keputusan yang benar, bukan sekadar ke daftar halaman domain: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.76` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.75] - 2026-07-11

### Changed

- Panel `Trouble Ticket` kini dipadatkan mengikuti ritme console legacy per bucket queue: setiap section tetap mempertahankan kecerdasan prioritas dan aksi yang sudah ada, tetapi tabel desktop sekarang menampilkan ticket, customer, SLA, PIC, follow-up, konteks queue, dan aksi utama per baris secara lebih cepat dipindai; tampilan mobile tetap memakai kartu agar aman di layar kecil: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)

### Fixed

- Review operasional lane `TT` kini lebih mudah dibaca tanpa tenggelam di kumpulan badge panjang, karena detail SLA, follow-up, escalation, dan rekomendasi aksi dipisahkan ke kolom-kolom yang lebih natural untuk operator NOC/TT: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.75` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.74] - 2026-07-11

### Changed

- Panel `Dismantle` kini dipadatkan mengikuti ritme console legacy: queue open dan histori close ditampilkan dalam tabel operasional yang lebih rapat di desktop, tetap aman sebagai kartu di mobile, dan aksi utama per baris langsung terlihat tanpa harus membuka detail panjang lebih dulu: [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)

### Fixed

- Ownership dan audit lifecycle pada queue `Dismantle` kini lebih mudah dibaca lintas peran karena tabel open menegaskan jalur `Close Owner: CS & Admin CS` versus `Restore Owner: Billing`, sementara histori close merangkum metadata lapangan, billing disposition, dan aksi reopen dalam format review yang lebih cepat dipindai: [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.74` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.73] - 2026-07-11

### Changed

- Metadata close `Dismantle` kini jauh lebih kaya dan mendekati konteks lapangan: form close sekarang menangkap `Field PIC`, `Device Status`, `Pickup Status`, `Close Outcome`, dan `Billing Disposition`, lalu histori dismantle memecah metadata itu menjadi badge yang terbaca jelas saat review terminasi: [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx), [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Queue supervisor `Transfer atau Restore` kini membaca lifecycle isolir dan dismantle dengan ownership yang lebih tegas: kasus restore tetap dibaca sebagai jalur `Billing`, sedangkan terminate dan close histori dibaca sebagai jalur `CS & Admin CS`; narasi queue supervisor, item worklist, dan CTA panel support ikut diselaraskan agar handoff lintas peran tidak kabur: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [restore route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/restore/route.ts)

### Fixed

- Parser catatan support kini memprioritaskan ringkasan close final pada histori dismantle, sehingga panel histori tidak lagi berhenti pada transfer note lama ketika satu kasus menyimpan jejak transfer dan close sekaligus: [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts)
- `VERSION` dinaikkan ke `0.64.73` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.72] - 2026-07-11

### Changed

- Flow `Dismantle` sekarang benar-benar bertahap seperti baseline: `Approve Dismantle` hanya mentransfer isolir aktif ke `support_dismantle_queue`, `Close Dismantle` yang memindahkan queue aktif ke histori, dan `Reopen Dismantle` mengembalikan histori ke queue aktif lagi bila terminasi perlu dikoreksi; panel queue, action form, prefill search param, dan lane action workspace ikut diselaraskan agar lifecycle `Isolir -> Queue -> Histori -> Reopen` terbaca jelas: [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/dismantle/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx), [support-dismantle-reopen-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-reopen-form.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Read-side support dan dashboard kini membaca queue dismantle nyata, sehingga lane `Dismantle`, kartu operasional support, dan worklist `DISMANTLE_OPERATOR` tidak lagi hanya menebak dari jumlah isolir aktif atau histori close: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql)

### Fixed

- Queue isolir kini menandai apakah item sudah memiliki ticket dismantle, sehingga operator tidak lagi buta terhadap kasus yang sebenarnya sudah ditransfer ke lane terminasi: [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.72` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.71] - 2026-07-11

### Changed

- Lane `Dismantle` kini membaca dua lapisan operasional sekaligus: `Queue Dismantle Open` dari isolir aktif untuk kandidat terminasi yang masih perlu keputusan, dan `Histori Dismantle` untuk jejak close yang sudah final; panel workspace dan narasi lane ikut diselaraskan agar pola kerja lebih dekat ke baseline legacy yang table-first: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts)

### Fixed

- Proses `dismantle` sekarang menulis histori dan mengarsipkan isolir dalam satu transaksi review DB, sehingga tidak lagi berisiko meninggalkan snapshot histori yatim atau row isolir yang setengah tertutup jika salah satu query gagal: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/dismantle/route.ts)
- `VERSION` dinaikkan ke `0.64.71` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.70] - 2026-07-11

### Changed

- Workspace `CS & Admin CS` kini tidak lagi berhenti sebagai landing organisasi statis; halaman ini berubah menjadi dashboard supervisor hidup yang merangkum bucket `Perlu Approval`, `Perlu Koreksi`, `Transfer atau Restore`, dan `Queue Risiko Tinggi` dalam pola `table-first`, lengkap dengan detail panel dan CTA lintas customer/support/inventory: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx), [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)

### Fixed

- Write action `assign port` dan `update status port` pada inventory kini membaca permission `inventory:update` agar role operasional seperti `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, dan teknisi yang memang punya hak update tidak lagi tertolak hanya karena gate lama masih memaksa `inventory:create`; CTA domain inventory dan form port ikut diselaraskan ke capability yang benar: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/assign/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/status/route.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [inventory-odp-port-assign-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-port-assign-form.tsx), [inventory-odp-port-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-port-status-form.tsx)
- `VERSION` dinaikkan ke `0.64.70` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.69] - 2026-07-11

### Changed

- Struktur navigasi ERP kini benar-benar mengikuti pembagian organisasi yang ditetapkan bisnis: `Pusat Kendali` dipaksa berurutan `Dashboard -> Daily Activity -> Import Center -> List Kerja`, sidebar dikelompokkan per divisi besar, dan pembacaan ownership baru ditegaskan sehingga `Customer` dibaca lewat `Billing`, `isolir` dikelola `Finance/Billing`, `dismantle` dikelola `CS & Admin CS`, dan `NOC & Troubleshoots` fokus ke `TT` serta `SLA`: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts), [dashboard-division-structure.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-division-structure.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Dashboard dan landing organisasi kini memakai source of truth baru untuk lima kelompok bisnis serta route workspace nyata bagi `CS & Admin CS`, `Legal`, `Teknisi PSB`, `Teknisi Expan`, `Teknisi Jointer`, `Kantor`, dan `Toko`, sehingga struktur organisasi tidak lagi berhenti sebagai placeholder visual: [division-structure-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/division-structure-board.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [organization-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/organization-workspace-page.tsx), [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/legal/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/kantor/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/toko/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-psb/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-expan/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-jointer/page.tsx)
- `List Kerja Terpadu` dan workspace turunan kini diperdalam untuk role prioritas serta menu organisasi baru, mencakup queue supervisor `CS_ADMIN`, paritas `SALES_MARKETING`/`CS_OPERATOR`/`DIGITAL_CREATOR`, serta landing fokus operasional berbeda untuk `Teknisi PSB`, `Teknisi Expan`, `Teknisi Jointer`, `Kantor`, `Toko`, dan `Legal`: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx), [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Paket kesiapan deploy dan cutover ikut dilengkapi dengan template env production final, checklist deploy rehearsal, pembaruan readiness/UAT/go-live, serta dokumentasi hosting agar batch integrasi ERP ini siap diteruskan ke tahap push dan deployment: [.env.production.final.template](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.final.template), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [docs/README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Panel detail `List Kerja` tidak lagi mempertahankan item stale saat hasil filter kosong, lane support tidak lagi membocorkan review mock ketika data live valid tetapi kosong, parser identifier isolir restore/dismantle sudah membaca token penuh sebelum separator, dan item `Customer` tidak lagi tersisa sebagai menu mandiri di sidebar karena ownership-nya kini benar-benar diserap ke `Billing`: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- `VERSION` dinaikkan ke `0.64.69` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.68] - 2026-07-10

### Fixed

- Lane `support` tidak lagi mempertahankan `reviewSections` mock saat query review DB valid tetapi hasilnya kosong, sehingga KPI live dan queue support kini konsisten dan item mock stale seperti `ISO-2026-0042` tidak bocor lagi ke form restore/dismantle: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Panel detail `List Kerja` tidak lagi jatuh ke item dasar saat hasil filter kosong, sehingga queue seperti `Lainnya` atau queue kosong supervisor kini benar-benar menampilkan state kosong tanpa detail stale di sisi kanan: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)
- Parser identifier isolir pada form restore/dismantle kini mengambil token penuh sebelum separator `|`, sehingga prefill kode isolir tidak lagi terpotong hanya ke digit awal: [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx)
- `VERSION` dinaikkan ke `0.64.68`

## [0.64.67] - 2026-07-10

### Changed

- Fallback auth lokal kini menyediakan akun mock untuk `SALES_MARKETING`, `CS_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, `DIGITAL_CREATOR`, dan `FIELD_TECHNICIAN`, sehingga smoke UAT lintas role dapat dijalankan tanpa bergantung pada user review DB: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts)
- Sampling browser lokal di `localhost:3000` kini berhasil memverifikasi login, dashboard, `List Kerja`, dan halaman target untuk role mock `SUPER_ADMIN`, `NOC_OPERATOR`, `CS_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, dan `DIGITAL_CREATOR`; hasilnya dipakai sebagai bukti readiness berbasis UI awal untuk fase UAT berikutnya.
- `VERSION` dinaikkan ke `0.64.67`

## [0.64.66] - 2026-07-10

### Changed

- Matriks readiness cutover per role diperbarui agar mencerminkan kondisi terbaru `List Kerja`, supervisory flow `CS_ADMIN`, presisi mikro-role `DISMANTLE_OPERATOR`, dan workspace awal `DIGITAL_CREATOR`, sehingga status `PILOT / PARTIAL / NO-GO` tidak lagi memakai baseline lama sebelum batch readiness terbaru: [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
- Checklist UAT `Pemasaran dan Pelayanan` kini memasukkan validasi `List Kerja` untuk `SALES_MARKETING` dan `CS_OPERATOR`, queue supervisor `CS_ADMIN`, serta workspace awal `DIGITAL_CREATOR` agar bukti UAT mengikuti workflow yang benar-benar hidup saat ini: [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)
- Checklist go-live Senin diperbarui agar validasi bisnis minimum untuk `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN` juga memeriksa workspace `List Kerja` serta queue supervisor, bukan hanya kemampuan membuka domain: [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- `VERSION` dinaikkan ke `0.64.66`

## [0.64.39] - 2026-07-10

### Changed

- Fase awal Divisi `Pemasaran & Pelayanan` kini memiliki checklist UAT khusus di `docs/web-pemasaran-pelayanan-uat-checklist.md`, mencakup flow wajib, bukti lulus, aturan `pass/partial/fail`, dan urutan uji untuk `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, dan `DIGITAL_CREATOR`: [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)
- PRD utama, checklist PRD, indeks dokumentasi, dan baseline checklist parity kini menautkan checklist UAT tersebut agar pelaksanaan pilot fase awal tidak bercampur dengan scope integrasi divisi lain: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
- `VERSION` dinaikkan ke `0.64.39`

## [0.64.40] - 2026-07-10

### Changed

- PRD web kini memiliki spesifikasi implementasi teknis `List Kerja Terpadu` untuk route `/dashboard/worklist`, termasuk kontrak data `WorklistItem`, query parameter, tab queue per role fase awal `Pemasaran & Pelayanan`, layout tabel + panel detail, integrasi tombol `Lihat semua` dari dashboard, serta rencana implementasi bertahap: [web-list-kerja-terpadu-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-implementation-spec.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan spesifikasi implementasi tersebut agar siap langsung diturunkan ke coding batch `/dashboard/worklist`: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.40`

## [0.64.41] - 2026-07-10

### Changed

- Dashboard kini menampilkan panel `Struktur Divisi` yang memisahkan 5 cluster divisi (Pemasaran dan Pelayanan, Teknis dan Expan, Finance dan HR, General Affair, Operasional) beserta sub-divisinya, sehingga konteks organisasi terbaca jelas di landing utama ERP: [division-structure-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/division-structure-board.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Label filter dashboard operasional diselaraskan menjadi `Sub-divisi` agar tidak rancu dengan struktur divisi 5 cluster: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- Metadata role diperbarui agar menampilkan penamaan divisi/sub-divisi yang konsisten di dashboard: [role-meta.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/role-meta.ts)
- `VERSION` dinaikkan ke `0.64.41`

## [0.64.42] - 2026-07-10

### Changed

- Dokumen baseline organisasi, role target, readiness cutover, katalog role/menu, UAT, dan PRD worklist kini diselaraskan dengan struktur divisi dashboard terbaru: `Pemasaran dan Pelayanan`, `Teknis dan Expan`, `Finance dan HR`, `General Affair`, dan `Operasional`, termasuk penamaan sub-divisi `Creator Digital` dan `Dismantle`: [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md), [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md), [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
- README, checklist PRD, dan dokumen spesifikasi implementasi juga ikut disinkronkan agar referensi fase awal tidak lagi memakai istilah divisi lama: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [web-list-kerja-terpadu-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-implementation-spec.md)
- `VERSION` dinaikkan ke `0.64.42`

## [0.64.43] - 2026-07-10

### Changed

- Dashboard operasional kini dikelompokkan per 5 divisi besar dan menandai sub-divisi mana yang sudah memiliki kartu KPI operasional versus mana yang masih menunggu integrasi, sehingga pemisahan organisasi lebih jelas dari tampilan dashboard utama: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- Kartu KPI operasional kini menambah cakupan sub-divisi `Troubleshoots` dan `Dismantle`, dan panel `KPI Proses` ikut memahami drilldown untuk kedua sub-divisi tersebut: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Checklist PRD diperbarui untuk mencatat grouping dashboard operasional per divisi besar dan status integrasi sub-divisi: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.43`

## [0.64.44] - 2026-07-10

### Changed

- Dashboard operasional kini menghidupkan KPI awal untuk `Billing`, `HR`, dan `Inventory`, sehingga cluster `Finance dan HR` serta `General Affair` tidak lagi sepenuhnya placeholder di dashboard utama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Panel `KPI Proses` kini mendukung drilldown untuk `Billing`, `HR`, dan `Inventory`, dan filter sub-divisi dashboard ikut mengenali ketiga area tersebut: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Checklist PRD diperbarui agar cakupan KPI aktif dashboard mencatat sub-divisi baru yang sudah hidup: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.44`

## [0.64.45] - 2026-07-10

### Changed

- PRD dashboard kini memiliki spesifikasi fitur kustomisasi KPI agar manager per divisi dapat menambah, mengubah, menghapus, menonaktifkan, dan mengurutkan KPI dashboard secara aman per scope divisi/sub-divisi: [dashboard-kpi-customization-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/dashboard-kpi-customization-prd.md)
- Fondasi backend awal untuk kustomisasi KPI dashboard ditambahkan melalui service `dashboard-kpi-service`, mencakup pembuatan tabel definisi KPI dan audit, validasi hak `SUPER_ADMIN` dan `MANAGER` berbasis `daily_activity_user_profiles`, serta CRUD dasar definisi KPI custom per divisi/sub-divisi: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan pengembangan KPI custom manager tersebut agar batch dashboard berikutnya bisa langsung menurunkan UI dan API runtime-nya: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.45`

## [0.64.46] - 2026-07-10

### Changed

- Dashboard kini memiliki panel `Kelola KPI` yang tampil langsung di halaman utama untuk manager divisi dan super admin, sehingga definisi KPI custom dapat ditambah, diubah, diaktifkan/nonaktifkan, dan dihapus per scope divisi/sub-divisi: [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- API CRUD untuk definisi KPI dashboard sekarang hidup di `/api/dashboard/kpi-definitions` dan `/api/dashboard/kpi-definitions/[id]`, lengkap dengan validasi session, review DB, dan pembatasan scope manager: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/[id]/route.ts)
- Registry konfigurasi KPI dashboard kini dipusatkan di file terpisah untuk menjaga konsistensi opsi divisi, sub-divisi, dashboard key, metric type, dan template KPI antara service backend dan UI manager: [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Checklist PRD diperbarui agar status fitur KPI custom manager mencerminkan bahwa backend, API, dan panel dashboard sudah hidup, sementara merge nilai KPI custom ke runtime kartu operasional masih menjadi batch berikutnya: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.46`

## [0.64.47] - 2026-07-10

### Changed

- Dashboard operasional kini membaca definisi KPI custom aktif untuk scope divisi/sub-divisi user dan merender metrik kartu berdasarkan `template_key` serta urutan yang dikonfigurasi manager, sehingga add/edit/hapus KPI custom langsung memengaruhi angka yang tampil di dashboard: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Metrik KPI custom kini mendukung drilldown per item lewat `drilldown_href` sehingga angka KPI pada kartu dashboard bisa langsung diklik ke target modul yang relevan: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Checklist PRD diperbarui agar status runtime merge KPI custom tercatat sebagai sudah hidup, sementara baseline-override nonaktif KPI default masih menjadi tahap lanjutan: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.47`

## [0.64.48] - 2026-07-10

### Changed

- KPI dashboard kini memiliki baseline sistem (`scope_type=SYSTEM`, `is_default=1`) yang otomatis di-seed, lalu definisi KPI pada scope divisi/sub-divisi di-merge berbasis `metric_key` sehingga manager dapat mengoverride atau menonaktifkan KPI default tanpa menghapus baseline sistem: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/[id]/route.ts)
- Dashboard operasional kini merender metrik kartu dari definisi KPI baseline/custom ter-merge (menggunakan `metric_type` untuk formatting) dan template KPI diperluas agar paritas metrik default tetap konsisten: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts)
- SUPER_ADMIN kini dapat memilih scope KPI (divisi/sub-divisi) lewat query parameter `kpiDivisionName` dan `kpiSubdivisionName`, sehingga perubahan KPI scope langsung memengaruhi angka yang tampil pada kartu dashboard operasional: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx)
- Guard `server-only` dihapus dari beberapa helper server agar smoke test `tsx` dapat berjalan tanpa runtime error, sekaligus merapikan typing map kartu operasional yang sebelumnya menabrak union `ALL`: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [access-control-server.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control-server.ts), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.48`

## [0.64.49] - 2026-07-10

### Changed

- KPI dashboard kini menambah template berbasis `PERCENTAGE` (rasio aktivasi sales, rasio overdue support, rasio kehadiran HR) dan `SUM` (nominal overdue billing), sehingga manager bisa membuat KPI yang benar-benar berupa rasio/persen maupun total nominal tanpa manual hitung: [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Query dashboard billing kini menyediakan `overdueAmount` untuk mendukung KPI nominal overdue dan menjaga perhitungan tetap konsisten dengan definisi overdue invoice yang sudah dipakai di dashboard: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.49`

## [0.64.50] - 2026-07-10

### Changed

- Drilldown `focus` kini aktif untuk domain non-support (Sales/Billing/HR/Inventory) dengan banner “Reset Fokus” dan penyaringan section review berbasis focus key, sehingga klik KPI dari dashboard langsung membuka modul dengan konteks antrean yang relevan: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Panel `KPI Proses` kini memberi `focus` lebih spesifik untuk kartu Sales dan Creator Digital agar klik metrik tidak lagi selalu jatuh ke root `/sales`: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Standarisasi focus Billing untuk invoice parsial menggunakan `PARTIAL_INVOICES` (selaras dengan KPI proses dan drilldown domain), serta seed baseline baru mengikuti key tersebut: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- `VERSION` dinaikkan ke `0.64.50`

## [0.64.51] - 2026-07-10

### Changed

- Drilldown KPI non-support kini diperdalam ke level baris dengan `filterTags` internal pada review row, sehingga filtering tidak lagi hanya berdasarkan judul section tetapi juga membaca period, status invoice, remaining positive, suspend candidate, request status, dan tanggal aktivitas yang relevan: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Dashboard kini meneruskan `month` dan `year` ke URL drilldown dari panel `KPI Proses` maupun kartu operasional, sehingga fokus seperti order bulanan sales, movement inventory, attendance HR, dan overdue billing mengikuti periode dashboard yang sedang dipilih: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- Sidebar kini bisa diminimalkan/ditampilkan kembali pada desktop dan dibuka-tutup sebagai drawer pada mobile, sehingga area navigasi seperti pada screenshot tidak selalu memakan ruang penuh: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- `VERSION` dinaikkan ke `0.64.51`

## [0.64.54] - 2026-07-10

### Changed

- Drilldown KPI non-support kini lebih presisi terhadap template KPI: focus `MONTHLY_ORDERS`, `DIGITAL_ORDERS`, `DIGITAL_SURVEYS`, `MONTHLY_ACTIVATIONS`, `ACTIVE_LOANS`, dan `DIGITAL_LEADS` sekarang memakai basis SQL yang mengikuti field/tanggal/source yang sama dengan kartu dashboard, sehingga isi review tidak lagi bercampur dengan antrean generik: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- KPI HR dan Inventory di dashboard kini lebih selaras dengan definisi operasional: hitungan `Employee Aktif` mengecualikan employee `ARCHIVED`, sedangkan `Request Pending` kini membaca status `PENDING` yang sama dengan focus drilldown inventory: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Layout dashboard diperketat lagi dengan `items-start` pada kedua grid dua kolom utama agar panel kanan tidak ikut meregang tinggi kolom kiri dan tidak menyisakan gap visual di bagian bawah saat tinggi konten berbeda: [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [activity-feed.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/activity-feed.tsx)
- `VERSION` dinaikkan ke `0.64.54`

## [0.64.55] - 2026-07-10

### Changed

- Template KPI dashboard kini punya default `drilldownHref` terpusat, termasuk untuk template komposit seperti `SALES_ACTIVATION_RATE`, `SUPPORT_OVERDUE_RATE`, `HR_ATTENDANCE_RATE`, dan `BILLING_OVERDUE_AMOUNT`, sehingga KPI custom baru tetap punya arah drilldown yang konsisten walau manager tidak mengisi URL manual: [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Panel `Kelola KPI` kini melakukan prefill aman untuk `drilldown` dan `metric type` berdasarkan template yang dipilih, sehingga manager lebih cepat membuat KPI custom dan risiko salah arah drilldown untuk template standar berkurang: [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx)
- Drilldown komposit untuk KPI rasio kini lebih jujur terhadap definisi metrik: `ACTIVATION_RATE` menampilkan pembanding order periode aktif dan subscription aktivasi periode yang sama, `ATTENDANCE_RATE` menampilkan employee aktif dan attendance hari ini, serta focus support `OVERDUE_RATE` memiliki context banner khusus; selain itu `TODAY_ATTENDANCE` kini kembali membaca `CURRENT_DATE` agar tidak melenceng oleh parameter periode dashboard: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- `VERSION` dinaikkan ke `0.64.55`

## [0.64.56] - 2026-07-10

### Changed

- Lane `support/sla` kini membawa section turunan ticket yang relevan untuk KPI komposit, yaitu `SLA Ticket Open Aktif` sebagai penyebut dan `SLA Ticket Overdue` sebagai pembilang, sehingga focus `OVERDUE_RATE` dan `SLA_OVERDUE` tidak lagi berhenti di master SLA saja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Drilldown `BILLING_OVERDUE_AMOUNT` kini dipisahkan dari overdue count biasa dengan prioritas urut berdasarkan outstanding terbesar, title/description yang menegaskan nominal overdue, serta detail remaining amount pada row recurring dan one-time: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- Runtime dashboard kini lebih konsisten terhadap mapping template terbaru: KPI proses mengenali focus rasio/nominal untuk Support, Sales, Billing, dan HR, seed baseline SLA overdue diarahkan ke lane SLA, dan metric default sistem pada kartu operasional memprioritaskan mapping template terbaru agar tidak tersisa link lama dari baseline awal: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.56`

## [0.64.57] - 2026-07-10

### Changed

- `DomainReviewSection` kini mendukung summary agregat per section, dan `DomainShell` menampilkannya sebagai badge ringkas di header section agar pembacaan KPI komposit tidak berhenti di daftar row saja: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Focus komposit `OVERDUE_RATE` pada Support sekarang menampilkan ringkasan `Ticket Open SLA`, `Ticket Overdue`, dan `Rasio Overdue` langsung di section SLA, sehingga pembilang dan penyebut terlihat dalam satu layar bersama row detailnya: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Focus `BILLING_OVERDUE_AMOUNT` kini menampilkan summary agregat outstanding per section recurring dan one-time, termasuk total invoice, total nominal outstanding, dan rata-rata outstanding, sehingga nominal overdue lebih cepat dibaca sebelum masuk ke level invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.57`

## [0.64.58] - 2026-07-10

### Changed

- Focus `ACTIVATION_RATE` pada Sales kini menampilkan summary agregat yang dihitung dari query penuh, mencakup `Order Periode`, `Aktivasi`, dan `Rasio Aktivasi`, lalu ditempelkan pada section order pembanding dan subscription aktivasi agar pembilang-penyebut langsung terbaca bersama row detail: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Focus `ATTENDANCE_RATE` pada HR kini menampilkan summary agregat dari seluruh employee aktif dan attendance hari ini, mencakup `Employee Aktif`, `Attendance Hari Ini`, dan `Rasio Kehadiran`, sehingga ringkasan KPI tidak lagi bergantung pada jumlah row preview yang tampil: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.58`

## [0.64.65] - 2026-07-10

### Changed

- Paket kesiapan deploy production dilengkapi dengan template env final yang siap disalin ke server serta checklist rehearsal deploy untuk latihan pra go-live: [.env.production.final.template](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.final.template), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md)
- Runbook hosting, indeks dokumentasi, dan checklist readiness diselaraskan agar tim dapat bergerak dari template env final ke rehearsal lalu ke cutover hari-H tanpa improvisasi tambahan: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [docs/README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.65`

## [0.64.64] - 2026-07-10

### Changed

- Paket operasional hari-H kini dilengkapi checklist `go-live` khusus Senin yang merangkum timeline deploy, PIC minimum, validasi bisnis minimum per role fondasi, serta trigger `go / pilot / rollback`: [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Indeks dokumentasi dan runbook hosting diselaraskan agar jalur eksekusi berpindah rapi dari readiness teknis ke keputusan cutover hari-H: [docs/README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.64`

## [0.64.63] - 2026-07-10

### Changed

- Paket deploy Senin diperkuat dengan validator env production dan checker health endpoint yang dapat dijalankan manual saat preflight/pasca-deploy: [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json), [verify-production-env.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-production-env.mjs), [verify-health.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-health.mjs)
- Runbook hosting kini mengarahkan ke command validasi baru dan file reverse proxy siap-tempel, sedangkan checklist hosting mencatat ketersediaan validator deploy: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [perkasa-erp-web.conf](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/nginx/perkasa-erp-web.conf), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.63`

## [0.64.62] - 2026-07-10

### Changed

- Hardening hosting web ditingkatkan dengan guard `AUTH_SESSION_SECRET` untuk environment production, endpoint health check `/api/health`, template `.env.production.example`, dan command start production yang diselaraskan ke mode standalone Node server: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/health/route.ts), [.env.production.example](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.example), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Flow auth hosting diperkeras agar redirect login/logout mengikuti host request nyata saat standalone atau reverse proxy, sehingga bug redirect ke `0.0.0.0` hilang pada smoke browser: [request-url.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/request-url.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/auth/login/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/auth/logout/route.ts)
- Panel `Kelola KPI` dashboard kini lebih konsisten untuk role operasional: fallback scope KPI mengikuti role aktif (mis. `NOC` tidak lagi jatuh ke `Penjualan`), label field diperjelas, dan default domain KPI mengikuti sub-divisi aktif: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx)
- Artefak deploy nyata kini disiapkan lewat runbook hosting dan konfigurasi PM2, lalu checklist hosting dan PRD checklist ikut disinkronkan dengan evidence smoke test admin/support: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [ecosystem.config.cjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/ecosystem.config.cjs), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.62`

## [0.64.59] - 2026-07-10

### Changed

- Kartu `KPI Proses` di dashboard kini bisa menampilkan hint spesifik per metric, bukan hanya helper teks generik, sehingga KPI komposit bisa dibaca lebih cepat sebelum user masuk ke drilldown: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Runtime builder dashboard kini mengirim hint numerator-denominator atau nominal agregat untuk metric komposit utama, termasuk `SALES_MONTHLY_ACTIVATIONS`/`SALES_ACTIVATION_RATE`, `SUPPORT_SLA_OVERDUE`/`SUPPORT_OVERDUE_RATE`, `BILLING_OVERDUE`/`BILLING_OVERDUE_AMOUNT`, dan `HR_TODAY_ATTENDANCE`/`HR_ATTENDANCE_RATE`; hint ini juga berlaku untuk KPI custom berbasis template yang sama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.59`

## [0.64.60] - 2026-07-10

### Changed

- Panel `Dashboard Operasional` kini ikut menampilkan hint konteks pada metric card, sehingga pembacaan KPI komposit konsisten antara `Dashboard Operasional` dan `KPI Proses`: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Mode fallback/mock dashboard kini juga mengisi hint komposit untuk `Aktivasi`, `Ticket Overdue`, `Invoice Overdue`, dan `Absensi Hari Ini`, sehingga pengalaman baca tetap seragam saat review DB belum aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.60`

## [0.64.61] - 2026-07-10

### Changed

- Hint KPI komposit di dashboard kini dipoles menjadi lebih scanable dengan `hintBadges`, sehingga numerator-denominator atau nominal agregat bisa dibaca cepat sebagai mini badge sebelum membaca teks penjelasan lengkap: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- Ditambahkan dokumen `web-hosting-readiness-checklist.md` sebagai checklist final menuju hosting Senin, mencakup freeze scope, code readiness, environment, database, infra, deploy, validasi fungsional, security, dan post-deploy checks: [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.61`

## [0.64.53] - 2026-07-10

### Changed

- Drilldown non-support kini makin query-driven: `getReviewDbSalesSections`, `getReviewDbBillingSections`, `getReviewDbInventorySections`, dan `getReviewDbHrSections` menerima filter `focus/month/year` untuk mempersempit query SQL (mis. period filter untuk order/aktivasi sales, movement inventory, attendance HR; dan filter overdue/partial/suspend candidates billing): [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `getDomainPageData` kini meneruskan filter drilldown tersebut sampai ke fungsi query review section, sehingga hasil yang masuk ke UI sudah lebih presisi sejak query level: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.53`

## [0.64.52] - 2026-07-10

### Changed

- Filter drilldown non-support kini dipindahkan ke service layer `getDomainPageData`, sehingga section review Sales/Billing/HR/Inventory sudah disaring dari backend berdasarkan `focus`, `month`, dan `year` sebelum dikirim ke UI: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- `DomainShell` disederhanakan agar fokus pada rendering context/badge/banner drilldown, sementara filter data utama tetap diputuskan di service layer untuk mengurangi duplikasi logika frontend: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.52`

## [0.64.36] - 2026-07-10

### Changed

- PRD web kini memiliki matriks readiness cutover per role/divisi di `docs/web-role-cutover-readiness.md`, sehingga status `GO`, `PILOT`, `PARTIAL`, dan `NO-GO` untuk role aktif bisa dibaca langsung dari kondisi implementasi web saat ini beserta blocker dan gelombang cutovernya: [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan dokumen readiness cutover tersebut agar jalur dokumentasi role tidak berhenti pada inventaris menu/kolom, tetapi juga mencakup keputusan readiness operasional: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.36`

## [0.64.38] - 2026-07-10

### Changed

- PRD migrasi kini mengunci keputusan bahwa `web-psb-perkasa` menjadi fondasi fase awal Divisi `Pemasaran & Pelayanan`, sedangkan integrasi ke `Teknisi`, `General Affair`, `Finance & HR`, dan `Operasional` dilakukan setelah flow inti legacy stabil di ERP: [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md), [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md), [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md)
- Dokumen readiness cutover, katalog role/menu, dan PRD `List Kerja Terpadu` kini diselaraskan dengan scope fase awal tersebut, sehingga gelombang implementasi tidak lagi mengasumsikan seluruh divisi bergerak paralel dari awal: [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md), [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.38`

## [0.64.37] - 2026-07-10

### Changed

- PRD web kini memiliki spesifikasi detail modul `List Kerja Terpadu` di `docs/web-list-kerja-terpadu-prd.md`, mencakup route target `/dashboard/worklist`, target role, filter global, tab queue per role, struktur item kerja, kolom utama, panel detail, CTA contextual prefill, dan tahapan rollout untuk menggantikan menu legacy `list`: [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan PRD `List Kerja Terpadu` tersebut agar blocker terbesar role bisnis lintas domain sudah punya spesifikasi implementasi yang eksplisit: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.37`

## [0.64.35] - 2026-07-10

### Changed

- PRD web kini memiliki lampiran inventaris aktual role/divisi/menu/fitur/kolom melalui dokumen `docs/web-role-division-menu-feature-catalog.md`, sehingga pembacaan aplikasi dapat dilakukan langsung dari perspektif operasional tiap role aktif: [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan inventaris role/divisi tersebut agar proses review menu, capability, dan kolom layar tetap sinkron dengan implementasi web saat ini: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.35`

## [0.64.34] - 2026-07-10

### Changed

- CTA row `Subscription Billing-Ready` di Billing kini membawa `service number` ke form generate invoice, sehingga operator tidak perlu memilih ulang layanan saat menindak item billing-ready tertentu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)
- CTA row HR untuk `archive/reactivate employee` dan `release payroll` kini ikut membawa prefill `employee` atau `payroll` ke form target, dan form payroll create juga bisa dibuka dengan employee yang sudah terseleksi agar tindak lanjut lebih aman: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-archive-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-archive-form.tsx), [hr-employee-reactivate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-reactivate-form.tsx), [hr-salary-slip-release-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-release-form.tsx), [hr-salary-slip-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-form.tsx)
- Kontrak query prefill lintas domain kini diperluas dengan `service`, `employee`, dan `payroll` agar safety UX dari review card ke form target tetap type-safe pada Billing dan HR: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.34`

## [0.64.33] - 2026-07-10

### Changed

- CTA per-row pada kartu review `Sales`, `Billing`, `Inventory`, dan `HR` kini membentuk tautan `query + anchor`, sehingga klik dari row tidak lagi hanya melompat ke form, tetapi juga membawa context item seperti `lead`, `order`, `invoice`, `request`, `attendance`, atau `loan` ke halaman domain terkait: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Form write-side yang menjadi target CTA kini menerima `initial...` prefill agar operator langsung masuk dengan nilai item yang sudah terpilih untuk tindak lanjut invoice, lead, order, request inventory, attendance, dan loan HR: [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx), [sales-order-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-order-create-form.tsx), [sales-survey-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-survey-create-form.tsx), [sales-work-order-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-work-order-create-form.tsx), [sales-subscription-activate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-subscription-activate-form.tsx), [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx), [inventory-loan-return-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-return-form.tsx), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx), [hr-loan-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-status-form.tsx)
- `VERSION` dinaikkan ke `0.64.33`

## [0.64.32] - 2026-07-10

### Changed

- Kartu review generik pada `Sales`, `Inventory`, `HR`, dan `Billing` kini juga menampilkan CTA per-row yang membaca kombinasi domain, section, status row, dan meta operasional seperti `collection status`, `follow up state`, atau `suspend candidate`, sehingga tindakan yang muncul lebih spesifik dari sebelumnya: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Mapping CTA review kini turun sampai level row, jadi operator bisa melompat langsung dari item review ke form yang paling relevan tanpa hanya bergantung pada CTA section/header: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.32`

## [0.64.31] - 2026-07-10

### Changed

- Kartu review generik pada `Sales`, `Inventory`, `HR`, dan `Billing` kini menampilkan CTA per-section langsung di header card bila role aktif punya aksi yang relevan, sehingga operator bisa melompat dari review section ke form terkait tanpa kembali ke panel prioritas: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Mapping CTA review generik kini dipusatkan berdasarkan domain + section title agar perilaku action per role tetap konsisten antara panel prioritas dan kartu review bawah: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.31`

## [0.64.30] - 2026-07-10

### Changed

- `Sales`, `Inventory`, dan `HR` kini punya panel aksi prioritas yang membaca section review lalu mengarahkan operator ke form paling relevan sesuai role aktif, sehingga review domain tidak lagi pasif dan konsisten dengan pola `Support`/`Billing`: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Form pada `Sales`, `Inventory`, dan `HR` kini juga diberi anchor per aksi agar CTA dari panel prioritas bisa melompat langsung ke form yang sesuai: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.30`

## [0.64.29] - 2026-07-10

### Changed

- Billing kini punya panel `Aksi Billing Prioritas` yang membaca section review lalu menyiapkan CTA langsung ke form `generate invoice`, `status invoice`, `collection`, `resolve`, atau `payment` sesuai permission role aktif, sehingga antrean review tidak lagi pasif untuk operator: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Form billing juga kini memiliki anchor per aksi agar CTA dari panel prioritas bisa melompat langsung ke form yang relevan untuk role aktif: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.29`

## [0.64.28] - 2026-07-10

### Changed

- Tampilan Billing kini mengikuti capability role: form write-side (generate invoice, status invoice, payment, collection action/resolve) hanya dirender jika role memiliki permission create/update, dan role read-only melihat banner `Mode baca saja` agar tidak bingung mengapa aksi tidak tersedia: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.28`

## [0.64.27] - 2026-07-10

### Changed

- Tampilan lane Support kini lebih ketat per role: form aksi (create/progress/escalate/close/SLA/isolir/dismantle) hanya dirender jika role memiliki capability yang sesuai, dan quick links otomatis mengikuti form yang benar-benar tersedia: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Panel Trouble Ticket kini menyembunyikan tombol aksi update/escalate/close/SLA ketika role tidak memiliki permission yang diperlukan, dan menampilkan status `Mode baca saja` agar operator paham lane tersebut bersifat read-only: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.27`

## [0.64.26] - 2026-07-10

### Changed

- Sidebar kini memprioritaskan urutan menu berdasarkan role/divisi, memisahkan `Menu Utama` dan `Pengaturan`, serta menyederhanakan navigasi mobile agar lebih fokus pada menu operasional role aktif: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Dashboard kini otomatis memakai divisi default sesuai role (mis. Sales/CS/NOC/Digital) ketika query `division` belum diberikan, serta mengunci filter divisi untuk non-admin agar tampilan dan kontrol lebih konsisten per divisi: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.26`

## [0.64.25] - 2026-07-10

### Changed

- Panel `KPI Proses` kini membawa drilldown yang lebih spesifik ke lane support menggunakan query `focus`, sehingga metrik seperti `Ticket Overdue`, `Trouble Ticket Open`, `Isolir Aktif`, dan `Dismantle Periode Ini` tidak lagi hanya membuka halaman umum: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Halaman support lane dan support domain kini membaca context `focus` untuk menampilkan banner fokus operasional dan menyaring section/row yang relevan, terutama untuk backlog `SLA OVERDUE` dan ticket yang masih aktif terbuka: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Kontrak UI support kini memuat `SupportDrilldownContext` untuk menjaga context drilldown tetap type-safe dari halaman ke shell domain: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.25`

## [0.64.24] - 2026-07-10

### Changed

- Dashboard kini menambah panel `KPI Proses` untuk memecah metrik operasional per divisi (Sales/CS/NOC/Digital) menjadi metrik proses yang bisa langsung diklik ke lane atau modul terkait, sehingga gap `KPI per proses detail` di PRD semakin tertutup: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Landing `/dashboard` kini menyisipkan `KPI Proses` setelah `Dashboard Operasional` agar urutan monitor -> drilldown proses -> alert -> tindakan berikutnya terasa lebih lengkap: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- `VERSION` dinaikkan ke `0.64.24`

## [0.64.23] - 2026-07-10

### Changed

- Landing `/dashboard` kini menambah panel `Tindakan Berikutnya` di antara `Alert Silang Domain` dan blok KPI, sehingga alur baca operator menjadi monitor -> identifikasi blocker -> pilih aksi -> masuk ke modul yang tepat tanpa menebak langkah berikutnya: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Komponen baru `DashboardNextActions` merangkum alert, list kerja, dan queue role aktif menjadi kartu aksi prioritas dengan CTA langsung seperti `Review Import`, `Kerjakan Sekarang`, dan `Masuk Queue`, agar shortcut tindakan dashboard lebih tajam sesuai PRD: [dashboard-next-actions.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-next-actions.tsx)
- `VERSION` dinaikkan ke `0.64.23`

## [0.64.22] - 2026-07-10

### Changed

- Panel `Alert Silang Domain` kini menampilkan modul terdampak, ringkasan dampak lintas domain, dan `Langkah berikutnya` pada tiap alert, sehingga operator tidak lagi hanya melihat blocker tetapi juga korelasi operasional dan tindakan paling tepat setelah membuka dashboard: [cross-domain-alerts.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/cross-domain-alerts.tsx)
- Service dashboard kini memperkaya payload `dashboardAlerts` untuk mode review DB dan fallback dengan `impactSummary`, `nextStep`, dan `affectedModules`, sehingga alert import, billing, support, isolir, dan approval memberi konteks dampak ke modul lain secara lebih eksplisit: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Kontrak `DashboardAlertItem` kini membawa metadata korelasi silang domain yang lebih lengkap untuk menjaga type-safety antara service dashboard dan komponen UI alert: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.22`

## [0.64.21] - 2026-07-09

### Changed

- Dashboard utama kini memiliki panel `Alert Silang Domain` yang menonjolkan hambatan paling berdampak lintas modul seperti batch import tertahan, invoice overdue, trouble ticket aktif, isolir aktif, dan approval Daily Activity yang masih menunggu agar operator bisa langsung masuk ke tindakan prioritas: [cross-domain-alerts.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/cross-domain-alerts.tsx)
- Service dashboard kini menghitung `dashboardAlerts` untuk review DB maupun mode fallback, sehingga landing dashboard tidak lagi hanya memberi ringkasan pasif tetapi juga CTA prioritas ke modul yang tepat: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Landing `/dashboard` kini menyisipkan alert silang domain di antara ringkasan operasional dan blok eksekusi agar urutan baca operator menjadi monitor -> identifikasi blocker -> tindak lanjuti: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- `VERSION` dinaikkan ke `0.64.21`

## [0.64.20] - 2026-07-09

### Changed

- Landing `/dashboard` kini disusun ulang mengikuti konsep PRD sebagai pusat kendali ERP, dengan lapisan `Pusat Kendali ERP`, `Dashboard Operasional`, `Kontrol Lintas Domain`, serta blok `List Kerja`, `Approval`, `Shortcut Modul`, dan `Audit` agar alur monitor -> eksekusi -> audit terasa jelas di satu halaman: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Komponen baru `DashboardCommandCenter` menampilkan fokus role aktif, jumlah queue prioritas, list kerja terpadu, shortcut modul, dan approval pending supaya operator langsung memahami konteks kerjanya saat masuk ke dashboard: [dashboard-command-center.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-command-center.tsx)
- Query kartu operasional NOC kini tahan terhadap variasi schema review DB dengan pengecekan kolom `sla_due_at` terlebih dahulu, sehingga dashboard tidak lagi jatuh ke `Mock Fallback` hanya karena kolom SLA belum tersedia pada database aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Copy dashboard operasional kini mengacu langsung ke PRD dan tidak lagi memakai narasi baseline visual lama: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.20`

## [0.64.19] - 2026-07-09

### Changed

- `DomainShell` kini menjadi landing operasional lintas menu yang lebih selaras dengan PRD, dengan navigasi antardomain langsung di header setiap menu agar operator bisa berpindah antar modul tanpa terasa keluar dari satu ERP terintegrasi: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Setiap menu domain (`Sales`, `Customer`, `Support`, `Inventory`, `HR`, `Billing`) kini memiliki blok `Alur utama menu` yang menjelaskan workflow inti domain berdasarkan fokus PRD, sehingga tampilan tiap halaman tidak lagi hanya berupa shell generik dengan form dan review: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Setiap menu domain kini juga menampilkan panel `Integrasi ERP` yang mengarahkan operator ke modul terkait seperti Sales -> Customer/Billing, Support -> Billing/Inventory, dan HR -> Daily Activity/Settings Users, agar integrasi lintas domain terasa langsung pada UI masing-masing menu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.19`

## [0.64.18] - 2026-07-09

### Changed

- Dashboard utama ERP kini memprioritaskan blok `Dashboard Operasional` lintas divisi di bagian atas halaman agar lebih selaras dengan baseline `web-psb-perkasa` dan PRD yang menekankan integrasi operasional semua domain dalam satu landing page: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Service dashboard kini menyediakan kartu operasional untuk `Penjualan`, `CS`, `NOC`, dan `Creator Digital` dengan metrik lintas domain yang dibaca dari review DB berdasarkan filter periode aktif, sehingga dashboard ERP tidak lagi hanya bergantung pada ringkasan role-aware: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Dashboard operasional baru kini menyediakan filter `bulan`, `tahun`, dan `divisi`, serta kartu ringkas per divisi yang langsung melompat ke modul relevan agar alur landing dashboard lebih dekat ke ritme operasional legacy tanpa membuang komponen ERP yang sudah ada: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.18`

## [0.64.17] - 2026-07-09

### Changed

- CTA header lane dan tombol aksi per row pada `Queue Trouble Ticket` kini memakai kamus label yang sama berbasis `Queue Reason`, sehingga bahasa aksi utama dan aksi pendukung terasa konsisten dari level lane sampai level ticket: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Header lane TT kini juga memakai urutan aksi yang sama dengan row ticket teratas, sehingga prioritas klik operator tidak lagi berbeda antara panel ringkas dan detail row: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.17`

## [0.64.16] - 2026-07-09

### Changed

- Tiap row `Queue Trouble Ticket` kini menampilkan helper singkat saat aksi memang disederhanakan oleh konteks ticket, sehingga operator memahami kenapa kombinasi tombol pada `READY_CLOSE`, `ESCALATION_PENDING`, `SLA_OVERDUE`, `FOLLOW_UP_SCHEDULED`, dan konteks lain bisa berbeda: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Pesan helper penyederhanaan aksi kini juga menyebut fokus operasional yang diutamakan, misalnya close formal, tindak lanjut eskalasi, pengamanan SLA, atau follow-up terjadwal, agar UI tetap ringkas tetapi tidak terasa “menghilangkan” opsi tanpa penjelasan: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.16`

## [0.64.15] - 2026-07-09

### Changed

- Opsi aksi pendukung pada tiap row `Queue Trouble Ticket` kini disaring berdasarkan `Queue Reason`, sehingga ticket `READY_CLOSE`, `ESCALATION_PENDING`, `SLA_OVERDUE`, `FOLLOW_UP_OVERDUE`, dan reason lain tidak lagi dipenuhi tombol yang kurang relevan: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Ticket kritis kini menampilkan set aksi yang lebih fokus, misalnya `READY_CLOSE` hanya menonjolkan close/progress sementara jalur eskalasi dan SLA hanya muncul saat konteks ticket memang membutuhkannya: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.15`

## [0.64.14] - 2026-07-09

### Changed

- Tombol aksi pada tiap row `Queue Trouble Ticket` kini diurutkan mengikuti `Aksi Disarankan`, sehingga tindakan utama tampil paling depan dan tidak lagi tenggelam di antara aksi pendukung lain: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Aksi utama per row TT kini memakai styling yang lebih menonjol dibanding aksi pendukung, sehingga operator lebih cepat terdorong menekan tombol yang paling relevan sesuai `Queue Reason`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.14`

## [0.64.13] - 2026-07-09

### Changed

- Setiap row pada panel `Queue Trouble Ticket` kini menampilkan badge `Aksi Disarankan` yang membaca `Queue Reason`, sehingga operator bisa langsung melihat tindakan yang paling tepat untuk ticket tersebut tanpa bergantung pada CTA header lane saja: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Tiap row TT kini juga menampilkan helper `Langkah saat ini` untuk menjelaskan konteks tindakan yang disarankan, misalnya mengejar follow-up overdue, mengamankan SLA, melanjutkan eskalasi, atau menutup ticket yang sudah matang: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.13`

## [0.64.12] - 2026-07-09

### Changed

- CTA rekomendasi pada header lane `Queue Trouble Ticket` kini membaca `Queue Reason` ticket teratas, sehingga label aksi berubah lebih spesifik sesuai konteks nyata seperti `ESCALATION_PENDING`, `FOLLOW_UP_OVERDUE`, `SLA_DUE_TODAY`, `FOLLOW_UP_SCHEDULED`, atau `WAITING_PROGRESS`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Pesan `fokus cepat` pada header lane TT kini juga menjelaskan niat aksi untuk ticket teratas, bukan hanya menampilkan kode ticket, sehingga operator lebih cepat memahami kenapa lane itu harus ditindak duluan: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.12`

## [0.64.11] - 2026-07-09

### Changed

- Header tiap lane pada panel `Queue Trouble Ticket` kini membawa CTA rekomendasi yang menyesuaikan konteks lane aktif seperti `Critical Attention`, `Planned Follow Up`, `Waiting Progress`, dan `Ready Close`, sehingga operator bisa langsung meloncat ke aksi paling relevan dari ticket teratas di lane tersebut: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Header lane TT kini juga menampilkan penanda `Fokus cepat untuk ticket teratas`, agar CTA section jelas terbaca sebagai dorongan aksi untuk item paling mendesak di lane itu: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.11`

## [0.64.10] - 2026-07-09

### Changed

- Queue support sekarang memecah ticket aktif ke lane `Critical Attention`, `Planned Follow Up`, dan `Waiting Progress`, sehingga operator tidak lagi membaca kasus eskalasi/follow-up kritis bercampur dengan ticket yang masih terjadwal atau baru menunggu progress: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Panel `Queue Trouble Ticket` kini hanya merender lane yang benar-benar berisi ticket, sehingga segmentasi operasional baru tetap ringkas dan tidak dipenuhi section kosong: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.10`

## [0.64.9] - 2026-07-09

### Changed

- Panel `Queue Trouble Ticket` kini mengurutkan section berdasarkan urgensi `Queue Priority`, sehingga lane yang memuat ticket `P1/P2` tampil lebih dulu daripada lane yang lebih aman ditutup seperti `Ready Close`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Ringkasan header panel TT kini juga menampilkan distribusi `P1`-`P4`, sehingga operator bisa langsung membaca beban ticket paling kritis tanpa membuka setiap section: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.9`

## [0.63.81] - 2026-07-09

### Improved

- Support kini memprioritaskan queue TT berdasarkan `follow-up` terdekat atau yang sudah overdue, menampilkan `follow-up state` langsung di panel, dan memberi konteks progress terakhir pada form close agar operator tidak menutup ticket tanpa melihat PIC/follow-up/progress terbaru: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.81`

## [0.63.82] - 2026-07-09

### Improved

- Support kini membawa konteks `SLA Days`, `SLA Due`, dan `SLA State` langsung ke queue TT, prefill form progress, serta form close; ticket yang sudah `OVERDUE` atau paling dekat jatuh tempo juga diprioritaskan lebih dulu agar operator tidak perlu membuka master SLA terpisah saat menentukan aksi: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.82`

## [0.63.83] - 2026-07-09

### Improved

- Support kini punya jalur `eskalasi ticket` non-destruktif untuk kasus `SLA overdue` atau prioritas tinggi, lengkap dengan side-car escalation log, append note aman ke ticket, tombol aksi dari queue TT, dan form eskalasi dengan snapshot SLA/progress/eskalasi terakhir agar operator bisa mendorong kasus ke owner berikutnya tanpa keluar dari shell support: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts), [support-ticket-escalation-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-escalation-service.ts), [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.83`

## [0.63.84] - 2026-07-09

### Improved

- Billing collection kini mendukung mode `single` dan `batch` dari queue invoice tindak lanjut yang sedang tampil, sehingga operator bisa mencatat reminder/call/promise-to-pay/suspend massal secara aman tanpa membuka invoice satu per satu: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.84`

## [0.63.85] - 2026-07-09

### Improved

- Billing kini punya `Collection Follow Up Queue` berbasis action collection `OPEN` terbaru per invoice, lengkap dengan `remaining`, `follow-up state`, `collection status`, dan `suspend candidate`; context queue ini juga dipakai ulang oleh form collection dan payment untuk prefill aman serta ringkasan tagihan sebelum operator menindak invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.85`

## [0.63.86] - 2026-07-09

### Improved

- Billing kini punya jalur `resolve collection follow-up` dari queue aktif, sehingga operator bisa menutup action collection `OPEN` terbaru per invoice sebagai `DONE` atau `CANCELLED` dengan catatan formal tanpa harus membuat action baru: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Payment entry kini otomatis menutup action collection `OPEN` yang terkait invoice tersebut, sehingga lifecycle penagihan lebih rapi setelah pembayaran diterima: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/payments/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.86`

## [0.63.87] - 2026-07-09

### Improved

- Billing status kini mendukung jalur `SUSPENDED` dan `OVERDUE` selain `CANCELLED`, sehingga operator bisa menandai invoice belum lunas sebagai suspend candidate lalu mengaktifkannya kembali ke jalur overdue/reconnect langsung dari web dengan context follow-up yang aman: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Billing read-side kini menampilkan section `Invoice Suspended` agar antrean reconnect tidak hilang dari layar operator saat invoice sudah masuk jalur suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.87`

## [0.63.88] - 2026-07-09

### Improved

- Billing status kini mendukung mode `batch` untuk jalur `SUSPENDED` dan `OVERDUE`, sehingga operator bisa mengeksekusi suspend massal dari antrean siap suspend dan reconnect massal dari antrean invoice suspended tanpa memproses satu per satu: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Billing read-side kini menampilkan section `Suspend Ready Queue` dan `Reconnect Ready Queue` agar antrean keputusan suspend/reconnect lebih eksplisit dan tidak bercampur dengan follow-up umum: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.88`

## [0.63.89] - 2026-07-09

### Improved

- Billing read-side kini menampilkan section `Promise To Pay Queue` agar invoice dengan janji bayar aktif terpisah jelas dari antrean siap suspend, sehingga operator collection bisa membedakan invoice yang masih layak ditunggu dari invoice yang harus dinaikkan tindakannya: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Form collection action batch kini otomatis memakai antrean yang paling relevan berdasarkan `action type`, termasuk `promise to pay`, `siap suspend`, dan `siap reconnect`, sehingga batch action tidak lagi menembak antrean yang terlalu umum: [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.89`

## [0.63.90] - 2026-07-09

### Improved

- Billing read-side kini otomatis menaikkan `promise to pay` yang follow-up-nya sudah lewat ke `Suspend Ready Queue`, sehingga operator tidak perlu lagi memilah manual invoice janji bayar yang sudah jatuh tempo sebelum menjalankan batch suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `Promise To Pay Queue` kini hanya menampilkan janji bayar yang masih sehat untuk ditunggu, sehingga pemisahan antara antrean tunggu bayar dan antrean siap suspend menjadi lebih tegas: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.90`

## [0.63.91] - 2026-07-09

### Improved

- Payment entry billing kini otomatis menarik invoice keluar dari jalur suspend saat pembayaran mulai masuk, sehingga invoice yang tadinya `SUSPENDED` tidak lagi tertinggal di konteks suspend setelah operator menerima pembayaran parsial atau penuh: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/payments/route.ts)
- Form payment kini memberi konteks jelas saat invoice yang dibayar berasal dari jalur suspend, sehingga operator tahu bahwa pembayaran juga akan membersihkan sinyal suspend secara aman: [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.91`

## [0.64.8] - 2026-07-09

### Added

- Queue support sekarang menghitung `Queue Priority` (`P1`-`P4`) dari `Queue Reason`, sehingga ticket trouble ticket otomatis terurut dari yang paling mendesak sampai yang paling bisa ditunda: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Panel `Queue Trouble Ticket` kini menampilkan badge `Priority` di setiap row, jadi operator bisa langsung membaca urutan urgensi ticket tanpa memilah manual: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.8`

## [0.64.7] - 2026-07-09

### Added

- Queue support sekarang membawa `Queue Reason` dan `Close Candidate` pada trouble ticket, sehingga operator bisa langsung membaca apakah ticket tertahan karena follow-up, SLA, eskalasi, atau memang sudah siap close: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Panel `Queue Trouble Ticket` kini menampilkan badge alasan antrean (`Reason`) dan indikator `Close Candidate`, sehingga lane `ready close` dan `open` tidak hanya terpisah tetapi juga lebih tegas dibaca operator: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.7`

## [0.64.6] - 2026-07-09

### Added

- Support review sekarang menambahkan lane `Trouble Ticket Ready Close` untuk ticket yang sudah punya progress valid, tidak punya follow-up aktif, dan tidak sedang menunggu eskalasi yang lebih baru, sehingga kandidat close tidak lagi bercampur dengan antrean progress/escalation umum: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Panel `Queue Trouble Ticket` kini merender lebih dari satu section trouble ticket sekaligus, sehingga lane `Ready Close` dan `Open` bisa dibaca terpisah pada halaman support: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.6`

## [0.64.5] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Reconnect Ready Queue` dan `Write Off Queue` menjadi lane `Recurring` dan `One-Time`, sehingga jalur pemulihan layanan dan non-collectible juga tidak lagi bercampur antara tagihan bulanan dan charge khusus: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.5`

## [0.64.4] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Collection Action Terbaru` menjadi lane `Recurring` dan `One-Time`, sehingga histori action operator tidak lagi bercampur antara tagihan bulanan dan charge instalasi/adjustment/termination: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.4`

## [0.64.3] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Promise To Pay Queue` dan `Suspend Ready Queue` menjadi lane `Recurring` dan `One-Time`, sehingga operator collection bisa membaca negosiasi janji bayar dan eskalasi suspend sesuai tipe tagihan: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.3`

## [0.64.2] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Collection Follow Up Queue` menjadi lane `Recurring` dan `One-Time`, sehingga operator collection bisa membaca tindak lanjut tagihan bulanan terpisah dari charge instalasi, adjustment, atau terminasi: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.2`

## [0.64.1] - 2026-07-09

### Added

- Review billing sekarang menampilkan lane terpisah untuk `Invoice Recurring Perlu Tindak Lanjut`, `Invoice One-Time Perlu Tindak Lanjut`, `Invoice Recurring Terbaru`, dan `Invoice One-Time Terbaru`, sehingga operator bisa membedakan tagihan bulanan dari charge instalasi/adjustment/termination tanpa membaca campuran data: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Meta pada antrean collection billing kini ikut membawa `Invoice Type`, sehingga context follow-up, write-off, dan histori action lebih jelas saat menangani recurring vs one-time invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.1`

## [0.64.0] - 2026-07-09

### Added

- Review section billing sekarang punya `Write Off Queue` agar invoice yang sedang diajukan atau diproses write-off terpisah dari lane follow-up collection normal: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Read-side billing sekarang mengeluarkan invoice `WRITE_OFF/CLOSED` dari antrean umum seperti `Invoice Perlu Tindak Lanjut`, `Collection Follow Up Queue`, `Promise To Pay Queue`, dan `Suspend Ready Queue`, sehingga operator hanya melihat invoice yang masih collectible di lane utama: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Resolve collection untuk action `WRITE_OFF` sekarang menutup invoice ke `collection_status = CLOSED` saat selesai, sementara pembatalannya mengembalikan invoice ke lane `REMINDER`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts)
- `VERSION` dinaikkan ke `0.64.0`

## [0.63.99] - 2026-07-09

### Improved

- Form collection action billing sekarang otomatis membatasi action strategis seperti `PROMISE_TO_PAY`, `SUSPEND`, `RECONNECT`, dan `WRITE_OFF` ke status `OPEN`, serta mengarahkan operator memakai resolve/status invoice untuk penutupan formal jalur tersebut: [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx)

### Fixed

- Backend collection action billing sekarang menolak action baru pada invoice `PAID/CANCELLED`, memvalidasi bahwa `RECONNECT` hanya boleh dipakai pada invoice yang memang sudah berada di jalur suspend/reconnect, dan tidak lagi menggeser `collection_status` aktif saat operator hanya mencatat action non-OPEN: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.99`

## [0.63.98] - 2026-07-09

### Improved

- Form generate invoice billing sekarang menyediakan field `Nominal One-Time` dan `Deskripsi One-Time` untuk tipe `INSTALLATION`, `ADJUSTMENT`, dan `TERMINATION`, serta otomatis mengunci mode batch kembali ke `RECURRING` agar operator tidak membawa state yang nanti ditolak backend: [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)

### Fixed

- Backend generate invoice billing sekarang membedakan recurring vs non-recurring secara benar: recurring tetap memakai `monthly_price` subscription, sedangkan invoice one-time memakai nominal dan deskripsi custom serta item invoice yang sesuai tipe charge, sehingga `INSTALLATION/ADJUSTMENT/TERMINATION` tidak lagi salah terbentuk sebagai tagihan bulanan biasa: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/generate/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.98`

## [0.63.97] - 2026-07-09

### Improved

- Form eskalasi support sekarang memberi peringatan saat operator mencoba memakai target dan level yang sama dengan eskalasi terakhir, sehingga kebutuhan context baru terlihat sebelum submit: [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx)

### Fixed

- Backend eskalasi trouble ticket sekarang menolak eskalasi ulang yang identik bila belum ada progress baru sesudah eskalasi terakhir, sehingga jejak eskalasi tidak terduplikasi tanpa konteks operasional baru: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.97`

## [0.63.96] - 2026-07-09

### Improved

- Form eskalasi support sekarang membatasi pilihan level sesuai state SLA ticket dan menjelaskan kapan `OVERDUE`, `DUE_TODAY`, atau `MANUAL` boleh dipakai, sehingga operator tidak lagi menebak level eskalasi yang valid: [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx)

### Fixed

- Backend eskalasi trouble ticket sekarang memvalidasi kecocokan level `OVERDUE` dan `DUE_TODAY` terhadap `sla_due_at` ticket, sehingga jalur eskalasi SLA tidak bisa dipakai sembarang untuk ticket yang belum benar-benar due: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.96`

## [0.63.95] - 2026-07-09

### Improved

- Form `Close Ticket` support sekarang menampilkan indikator apakah ticket sudah memiliki progress aktif yang valid, sehingga operator mendapat peringatan dini sebelum mencoba menutup ticket yang belum melewati fase progress: [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx)

### Fixed

- Backend close trouble ticket sekarang mewajibkan adanya progress aktif `ON_PROGRESS` atau `FOLLOW_UP` sebelum ticket bisa ditutup, sehingga lifecycle support tidak bisa lagi lompat dari `OPEN` langsung ke `CLOSED`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/close/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.95`

## [0.63.94] - 2026-07-09

### Improved

- Form `Resolve Collection` billing sekarang memberi helper yang menyesuaikan action aktif seperti `PROMISE_TO_PAY`, `SUSPEND`, dan `RECONNECT`, sehingga operator lebih paham efek resolve terhadap jalur invoice sebelum menutup follow-up: [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx)

### Fixed

- Resolve collection billing sekarang ikut menyelaraskan `collection_status` dan `suspend_candidate` invoice secara aman berdasarkan action yang ditutup, sehingga janji bayar yang selesai/batal tidak tertinggal sebagai `PROMISE_TO_PAY`, suspend yang dibatalkan mencabut sinyal suspend, dan reconnect tetap tinggal di lane reconnect sampai invoice benar-benar diaktifkan lagi: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.94`

## [0.63.93] - 2026-07-09

### Improved

- Form `Status Invoice` billing sekarang ikut membaca konteks dari `Reconnect Ready Queue`, sehingga operator tetap melihat ringkasan invoice aktif yang sedang berada di jalur reconnect sebelum mengaktifkan layanan kembali: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx)

### Fixed

- Aksi collection `RECONNECT` billing sekarang mempertahankan `collection_status = RECONNECT`, sehingga antrean reconnect tetap merefleksikan invoice yang benar-benar sedang menunggu pemulihan layanan dan tidak langsung hilang saat operator baru mencatat action reconnect: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts)
- Aktivasi ulang invoice suspend ke `OVERDUE` sekarang otomatis mengeluarkan invoice dari jalur reconnect kembali ke follow-up normal dan sekaligus menutup action `RECONNECT` yang masih `OPEN`, sehingga invoice yang sudah dipulihkan tidak tertahan di antrean reconnect: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.93`

## [0.63.92] - 2026-07-09

### Improved

- `Reconnect Ready Queue` billing kini hanya membaca invoice yang benar-benar berada pada jalur `RECONNECT`, sehingga antrean reconnect tidak lagi tercampur dengan histori suspend lama dan lebih jujur terhadap invoice yang masih perlu dipulihkan: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Antrean reconnect sekarang ikut menampilkan `collection status` dan waktu update terakhir agar operator bisa melihat konteks pemulihan layanan tanpa menebak asal perpindahan invoice dari jalur suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.92`

## [0.63.80] - 2026-07-09

### Improved

- Support kini punya `update progress trouble ticket` non-destruktif dengan side-car progress log untuk PIC, status kerja, follow-up, dan catatan progres terbaru; queue TT dan shell support juga langsung menampilkan snapshot progress terakhir agar operator bisa lanjut dari open ticket tanpa menimpa data inti: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/progress/route.ts), [support-ticket-progress-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-progress-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.80`

## [0.63.79] - 2026-07-09

### Improved

- Billing kini mendukung `batch recurring invoice generation` dari daftar `Subscription Billing-Ready`, sehingga operator bisa membuat invoice bulanan massal langsung dari shell web sambil tetap memakai guard existing per subscription untuk menghindari duplikasi periode: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/generate/route.ts), [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.79`

## [0.63.78] - 2026-07-09

### Improved

- `Import Center` sekarang mengunci upload ulang batch yang sudah punya row staging, sehingga operator tidak lagi bisa menimpa review lama secara destruktif; form upload juga menampilkan guardrail yang mengarahkan operator membuat batch baru untuk file revisi: [import-file-loader.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-file-loader.ts), [import-batch-upload-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-upload-form.tsx), [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.78`

## [0.63.77] - 2026-07-09

### Improved

- HR sekarang punya section `Face Priority Queue` yang menyatukan capture `RETAKE` pending dan employee dengan baseline `DRIFTING/WATCHLIST`, lengkap dengan `priority score` agar operator bisa menindak item paling kritis lebih cepat tanpa analisis manual tambahan: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.77`

## [0.63.76] - 2026-07-09

### Improved

- HR kini punya deteksi drift baseline wajah per employee agar operasional lebih cepat membaca apakah kualitas referensi masih `STABLE`, masuk `WATCHLIST`, atau sudah `DRIFTING`; alert ini dihitung dari gap skor terbaru terhadap rata-rata dan skor terbaik, lalu ditampilkan langsung di section `Face Reference Trends` dan panel trend pada form baseline employee: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.76`

## [0.63.75] - 2026-07-09

### Improved

- baseline wajah HR kini punya history dan scoring trend per employee: setiap perubahan baseline manual maupun reinforce review disimpan ke tabel history side-car, HR shell menampilkan section `Face Reference History` dan `Face Reference Trends`, dan form baseline employee menampilkan ringkasan trend terpilih agar operator tahu kualitas referensi sebelum menimpa baseline aktif: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/face-reference/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.75`

## [0.63.74] - 2026-07-09

### Improved

- feedback loop review wajah HR kini non-destruktif dan lebih operasional: reviewer bisa memperkuat baseline employee secara terkontrol saat hasil `VERIFIED + MATCH`, sementara capture yang berakhir `REJECTED + RETAKE` otomatis masuk ke section `Face Retake Queue` untuk follow-up pengambilan ulang, lengkap dengan audit trail baru: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/review/route.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.74`

## [0.63.73] - 2026-07-09

### Improved

- review wajah HR kini mendapat matching recommendation berbasis baseline employee aktif, sehingga antrean review bisa melihat `Baseline Reference`, `Baseline Match Score`, `Baseline Match Outcome`, dan alasan `MATCH / REVIEW_MANUAL / RETAKE` sebelum operator menetapkan keputusan akhir: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.73`

## [0.63.72] - 2026-07-09

### Improved

- baseline referensi wajah employee sekarang bisa membaca kandidat otomatis dari capture yang sudah `VERIFIED`: shell HR menampilkan section `Verified Face Candidates`, form baseline wajah melakukan prefill aman saat baseline belum ada, dan operator bisa memakai kandidat terbaru dengan satu klik tanpa mengetik ulang `capture ref`: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.72`

## [0.63.71] - 2026-07-09

### Improved

- HR kini punya baseline referensi wajah per employee secara non-intrusive melalui tabel side-car, route write khusus, audit trail, section review `Employee Face References`, dan form safety UX yang bisa prefill referensi lama saat operator memilih employee aktif, sehingga fondasi matching engine tidak perlu menempel ke tabel `hr_employees` inti: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/face-reference/route.ts), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.71`

## [0.63.70] - 2026-07-09

### Improved

- shell HR kini menampilkan analytics outcome verifikasi wajah yang merangkum backlog `PENDING_REVIEW/VERIFIED/REJECTED`, distribusi confidence placeholder, rata-rata score sample terbaru, serta split adopsi `CAMERA_CAPTURE` vs mode manual agar operator bisa membaca kualitas outcome sebelum masuk ke recognition engine penuh: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.70`

## [0.63.69] - 2026-07-09

### Improved

- konfigurasi face attendance HR kini mendukung kebijakan `auto-verify` yang bisa diatur admin, termasuk sakelar aktivasi dan `minimum score` untuk confidence tinggi, sehingga jalur `Auto-Verify Aman` tidak lagi hardcoded dan bisa mengikuti kebijakan operasional tiap divisi: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/route.ts), [hr-attendance-face-config-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-config-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.69`

## [0.63.68] - 2026-07-09

### Improved

- review wajah HR kini punya `confidence band` (`HIGH`, `MEDIUM`, `LOW`) dan indikator `auto-review aman`, sehingga operator bisa melihat apakah capture cukup kuat untuk `Auto-Verify Aman` atau tetap perlu review manual mendalam: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.68`

## [0.63.67] - 2026-07-09

### Improved

- workflow review wajah HR kini dilengkapi scoring placeholder dan rekomendasi keputusan otomatis: shell HR menampilkan `match score`, `recommended decision`, dan alasan rekomendasi, sementara form review bisa langsung memakai saran `VERIFIED`, `PENDING_REVIEW`, atau `REJECTED` sebelum recognition engine otomatis penuh hadir: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.67`

## [0.63.66] - 2026-07-09

### Improved

- face attendance HR kini punya workflow review operasional: setiap capture wajah masuk ke status `PENDING_REVIEW`, tersedia antrean review terbaru di shell HR, operator bisa mengubah hasil menjadi `VERIFIED` atau `REJECTED`, dan audit review wajah ikut masuk ke dashboard terpusat: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/review/route.ts), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.66`

## [0.63.65] - 2026-07-09

### Improved

- form attendance HR sekarang sudah punya fondasi capture kamera browser langsung di web: operator bisa membuka kamera, mengambil snapshot wajah, melihat preview capture, dan menghasilkan `faceCaptureRef` otomatis untuk jalur verifikasi `CAMERA_CAPTURE` tanpa mengetik referensi manual: [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.65`

## [0.63.64] - 2026-07-09

### Improved

- fondasi face attendance HR kini hidup secara non-intrusive: ada konfigurasi mode verifikasi wajah terpisah, log referensi face capture/manual review terpisah, form attendance bisa mengirim referensi verifikasi wajah, dan mode wajib/opsional dapat diatur sebelum recognition engine penuh diaktifkan: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/route.ts), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx), [hr-attendance-face-config-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-config-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.64`

## [0.63.63] - 2026-07-09

### Improved

- fondasi geofence/radius attendance HR kini hidup secara non-intrusive: ada konfigurasi titik kerja + radius terpisah, capture lokasi browser di form attendance, validasi radius opsional/wajib saat check-in, log lokasi attendance terpisah, serta audit `ATTENDANCE_GEOFENCE_CONFIG` untuk perubahan konfigurasi geofence: [hr-attendance-geofence-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-geofence-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/geofence/route.ts), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx), [hr-attendance-geofence-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-geofence-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.63`

## [0.63.62] - 2026-07-09

### Improved

- flow payroll HR kini benar-benar lebih rapat: form void menampilkan ringkasan slip terpilih (periode, status, income, deduction) sebelum submit, dan backend release menolak slip yang sudah berstatus void agar operator tidak bisa merilis payroll yang sudah dibatalkan secara non-destruktif: [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.62`

## [0.63.61] - 2026-07-09

### Improved

- flow release dan void Payroll HR sekarang menampilkan suggestion yang lebih kaya (periode, status, income, deduction), lalu form release memperlihatkan ringkasan slip terpilih sebelum submit agar operator lebih aman saat merilis payroll: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-salary-slip-release-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-release-form.tsx), [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.61`

## [0.63.60] - 2026-07-09

### Improved

- flow update dan void Loan HR sekarang menampilkan suggestion yang lebih kaya (loan type, amount, installment) serta form update menampilkan status saat ini dan melakukan prefill status tujuan secara aman agar operator tidak salah ubah status: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-loan-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-status-form.tsx), [hr-loan-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-void-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.60`

## [0.63.59] - 2026-07-09

### Improved

- correction attendance HR kini lebih aman untuk operator karena suggestion review membawa metadata mentah `check in`, `check out`, `overtime`, dan `lock admin`, lalu form otomatis melakukan prefill saat row attendance dipilih sehingga koreksi tidak mudah mengosongkan nilai lama secara tidak sengaja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.59`

## [0.63.58] - 2026-07-09

### Improved

- HR kini mendukung reaktivasi employee non-destruktif dari status `ARCHIVED` ke status aktif yang dipilih operator, lengkap dengan validasi status aman di backend dan actor trail `EMPLOYEE_REACTIVATE`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/reactivate/route.ts), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts)
- halaman HR kini menyediakan form khusus untuk mengaktifkan kembali employee archived langsung dari review suggestion, sehingga siklus archive/reactivate menjadi lengkap tanpa membuat row employee baru: [hr-employee-reactivate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-reactivate-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- audit dashboard HR kini mengenali action `EMPLOYEE_REACTIVATE`, sehingga timeline `SUPER_ADMIN` menampilkan jejak unarchive/reactivate employee dengan label yang lebih operasional: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.63.58`

## [0.63.57] - 2026-07-09

### Improved

- Employee HR kini mendukung archive non-destruktif lewat route khusus yang mengubah `employment_status` menjadi `ARCHIVED`, sehingga data pegawai bisa ditutup tanpa menghapus histori attendance, loan, payroll, atau relasi lain yang sudah ada: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/archive/route.ts), [hr-employee-archive-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-archive-form.tsx)

### Changed

- audit dashboard HR kini mengenali action `EMPLOYEE_ARCHIVE`, dan halaman HR menyediakan form archive employee terpisah agar tidak tercampur dengan write-action create
- `VERSION` dinaikkan ke `0.63.57`

## [0.63.56] - 2026-07-09

### Improved

- Loan HR kini mendukung cancel/void non-destruktif lewat status `CANCELLED`, sehingga pinjaman bisa dibatalkan tanpa menghapus row `hr_loans`, histori tetap muncul di review HR, dan audit actor tercatat sebagai aksi terpisah: [void route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/loans/void/route.ts), [hr-loan-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-void-form.tsx)

### Changed

- review section HR untuk loan kini menampilkan histori terbaru termasuk status `CANCELLED`, dan dashboard audit HR mengenali action `LOAN_VOID`
- `VERSION` dinaikkan ke `0.63.56`

## [0.63.55] - 2026-07-09

### Improved

- Payroll HR kini mendukung `void` non-destruktif lewat tabel flag `hr_salary_slip_voids`, sehingga slip gaji bisa dibatalkan tanpa menghapus row payroll, status `VOIDED` tampil di review HR, dan audit actor tetap tercatat: [hr-salary-slip-void-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-salary-slip-void-service.ts), [void route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/void/route.ts), [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx)

### Changed

- audit dashboard HR kini mengenali action `SALARY_SLIP_VOID` dan review section HR menampilkan status payroll `VOIDED`
- `VERSION` dinaikkan ke `0.63.55`

## [0.63.54] - 2026-07-09

### Improved

- HR kini mendukung correction attendance langsung dari web dengan audit trail actor untuk perubahan status, jam masuk/keluar, overtime, dan lock admin, sehingga jejak audit HR tidak hanya berhenti di loan update dan payroll release: [attendance route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx)

### Changed

- label audit HR di dashboard diperluas agar correction attendance tampil lebih natural untuk operator dan admin
- `VERSION` dinaikkan ke `0.63.54`

## [0.63.53] - 2026-07-09

### Improved

- HR kini tidak hanya mencatat create audit, tetapi juga mendukung update status loan dan release slip gaji langsung dari web dengan actor trail yang tercatat ke `hr_audit_logs`, lengkap dengan dua form operasional baru di domain HR: [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [loans route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/loans/route.ts), [salary-slips route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)

### Changed

- dashboard HR audit kini menampilkan label action yang lebih operasional untuk create, update loan, dan release payroll
- `VERSION` dinaikkan ke `0.63.53`

## [0.63.52] - 2026-07-09

### Improved

- HR kini memiliki actor trail dasar via tabel `hr_audit_logs` untuk create employee, attendance, loan, dan salary slip, lalu feed audit dashboard `SUPER_ADMIN` ikut membaca jejak ini sehingga coverage audit lintas domain utama makin lengkap: [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- route write-side HR (`employees`, `attendance`, `loans`, `salary-slips`) kini mencatat snapshot actor setelah insert sukses tanpa mengubah tabel inti `hr_*`, sehingga jalur audit ditambah dengan risiko migrasi yang rendah
- `VERSION` dinaikkan ke `0.63.52`

## [0.63.51] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action sales dari lead, survey, sales order, work order, dan aktivasi subscription yang jejak aktornya sudah tersimpan di kolom notes, sehingga audit terpusat kini mencakup hampir seluruh domain operasional utama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.51`

## [0.63.50] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action billing dari pembuatan invoice, pembatalan invoice, payment entry, dan collection action, sehingga audit terpusat makin dekat ke operasi penagihan nyata: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.50`

## [0.63.49] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action inventory dari request barang, update status request, barang masuk, pinjaman, dan pengembalian berdasarkan tabel operasional yang sudah ada, sehingga audit terpusat makin dekat ke alur gudang/teknisi nyata: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.49`

## [0.63.48] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action domain support dari create ticket, close ticket, create isolir, restore isolir, dan dismantle yang jejak aktornya sudah tersimpan di tabel review, sehingga audit terpusat tidak lagi terbatas pada import dan settings: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.48`

## [0.63.47] - 2026-07-09

### Fixed

- formatter waktu activity feed dashboard kini aman menerima nilai tanggal dari review DB yang tidak selalu berbentuk string, sehingga dashboard tidak lagi jatuh ke `Mock Fallback` dengan error `value.includes is not a function`: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.47`

## [0.63.46] - 2026-07-09

### Improved

- feed dashboard kini membaca jejak aksi nyata secara terpusat untuk `SUPER_ADMIN` dengan menggabungkan audit Import Center, Settings Users, permission master, dan role-permission, sambil tetap menjaga fallback aman untuk role lain: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- panel aktivitas dashboard diperjelas sebagai feed audit hidup agar operator admin lebih mudah mengenali konteks jejak aksi terbaru: [activity-feed.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/activity-feed.tsx)
- checklist PRD audit diperbarui agar status implementasi mencerminkan audit terpusat lintas import dan settings yang kini sudah tampil di dashboard: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)

### Changed

- `VERSION` dinaikkan ke `0.63.46`

## [0.63.39] - 2026-07-09

### Added

- laporan korelasi duplikasi `inventory_stock_movements` ke staging inventory movement (batch/source/legacy/status) untuk memastikan sumber duplikasi sebelum cleanup: [xampp_review_schema_precheck_inventory_movements_correlate_0_63_39.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_inventory_movements_correlate_0_63_39.sql)

### Changed

- dokumentasi staging import menambahkan referensi laporan korelasi movement↔staging: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.39`

## [0.63.38] - 2026-07-09

### Added

- laporan precheck khusus duplikasi `inventory_stock_movements` per `reference_no` agar penanganan cleanup bisa lebih aman dan terarah: [xampp_review_schema_precheck_inventory_movements_by_ref_0_63_38.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_inventory_movements_by_ref_0_63_38.sql)

### Changed

- dokumentasi staging import menambahkan catatan investigasi duplikat movement per reference: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.38`

## [0.63.37] - 2026-07-09

### Added

- script dry-run untuk menampilkan kandidat row yang akan dibersihkan (tanpa mengubah data) sebelum autofix dan patch UNIQUE: [xampp_review_schema_autofix_dry_run_0_63_37.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_dry_run_0_63_37.sql)
- script autofix guarded (rollback default) untuk memastikan cleanup hanya terjadi jika `@confirm_apply = 1`: [xampp_review_schema_autofix_guarded_0_63_37.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_guarded_0_63_37.sql)

### Changed

- dokumentasi staging import diperbarui agar alur cleanup bersifat aman (precheck → dry-run → guarded apply → patch UNIQUE): [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.37`

## [0.63.36] - 2026-07-09

### Added

- script precheck detail yang menampilkan daftar `id` untuk setiap grup duplikat, agar cleanup sebelum UNIQUE lebih terarah: [xampp_review_schema_precheck_detail_0_63_36.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_detail_0_63_36.sql)

### Changed

- dokumentasi staging import kini menuliskan urutan patch aman (precheck → autofix → patch UNIQUE): [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.36`

## [0.63.35] - 2026-07-09

### Added

- script autofix terkontrol untuk membersihkan duplikasi paling aman sebelum penerapan UNIQUE business key transform (primary address ganda, duplikasi persis photos/invoice items/payments/collection actions): [xampp_review_schema_autofix_0_63_35.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_0_63_35.sql)

### Changed

- `VERSION` dinaikkan ke `0.63.35`

## [0.63.34] - 2026-07-09

### Added

- script precheck untuk mendeteksi duplikasi data existing sebelum menerapkan UNIQUE business key transform (menghindari kegagalan ALTER TABLE saat patch diterapkan ke DB yang sudah berisi data): [xampp_review_schema_precheck_0_63_34.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_0_63_34.sql)

### Changed

- `VERSION` dinaikkan ke `0.63.34`

## [0.63.33] - 2026-07-09

### Changed

- schema review DB ditambah UNIQUE index minimal untuk business key yang dipakai pipeline transform tahap 1-4 agar idempotent terhadap race dan aman saat re-run: [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql)
- disediakan patch schema yang bisa dijalankan aman berulang (cek `information_schema`) untuk installasi existing: [xampp_review_schema_patch_0_63_33.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_patch_0_63_33.sql)
- `VERSION` dinaikkan ke `0.63.33`

## [0.63.32] - 2026-07-09

### Changed

- eksekusi transaksi review DB kini memakai koneksi yang konsisten lewat helper `runReviewDbTransaction` agar transaksi benar-benar atomic: [review-db.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/review-db.ts)
- pipeline transform import tahap 1-4 kini berjalan dalam transaksi + lock batch untuk mencegah state setengah jalan dan double-run paralel: [import-write-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-write-service.ts)
- perbaikan pemakaian transaksi pada bulk approval Daily Activity, inventory loans/returns, inventory request status, dan bootstrap permission agar konsisten: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/return/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts), [access-permission-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/access-permission-service.ts)
- `VERSION` dinaikkan ke `0.63.32`

## [0.63.31] - 2026-07-09

### Changed

- form Plan Daily Activity kini auto-fill `planningLevel` dari profile user dan mengunci field org untuk non-superadmin: [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx)
- endpoint create & approval daily activity kini menegakkan scope org dari profile user (server-side), bukan dari input form: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts)
- approval queue dashboard kini menghitung scope berdasarkan session/profile (supaya konsisten dengan Daily Activity profile per username): [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.63.31`

## [0.63.30] - 2026-07-09

### Added

- bulk approve/reject pada halaman Daily Activity (Approval Manager) menggunakan endpoint bulk: [daily-activity-manager-approval-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-manager-approval-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.30`

## [0.63.29] - 2026-07-09

### Added

- endpoint bulk approval daily activity (maks 20 item per batch) untuk mempercepat proses manager/SPV: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts)
- bulk approve/reject dari dashboard Approval Queue dengan checkbox: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.29`

## [0.63.28] - 2026-07-09

### Added

- quick action approve/reject daily activity langsung dari panel Approval Queue dashboard: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) kini memuat daftar pending approval terbaru (maks 6) untuk diproses langsung dari dashboard
- `VERSION` dinaikkan ke `0.63.28`

## [0.63.27] - 2026-07-09

### Added

- panel `Approval Queue` daily activity di dashboard utama untuk role yang punya izin approve, dengan ringkasan pending approval dan shortcut ke halaman daily activity: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) kini memuat data pending approval daily activity (per divisi/sub-divisi) untuk dashboard
- [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan panel approval queue secara kondisional berdasarkan RBAC `daily_activity:approve`
- `VERSION` dinaikkan ke `0.63.27`

## [0.63.26] - 2026-07-09

### Added

- filter tambahan `Approval Status` (ALL/PENDING/APPROVED/REJECTED/NONE) pada [daily-activity-filter-bar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-filter-bar.tsx) agar manager bisa fokus ke item yang menunggu approval

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menerapkan filter approval status ke kalender/performa/riwayat sesuai pilihan user
- `VERSION` dinaikkan ke `0.63.26`

## [0.63.25] - 2026-07-09

### Added

- filter tampilan Daily Activity (divisi/sub-divisi/level) via query param pada [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan UI selector [daily-activity-filter-bar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-filter-bar.tsx)

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menghitung kalender/performa/riwayat berdasarkan filter divisi/sub-divisi/level yang dipilih
- navigasi kalender `prev/next month` kini menjaga filter agar tidak reset saat pindah bulan di [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx)
- `VERSION` dinaikkan ke `0.63.25`

## [0.63.24] - 2026-07-09

### Added

- navigasi kalender plan `prev/next month` lewat query `?month=YYYY-MM` pada [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx)

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menghitung rekap bulanan dan kalender berdasarkan bulan yang dipilih, serta memperluas window pembacaan data menjadi 370 hari
- `VERSION` dinaikkan ke `0.63.24`

## [0.63.23] - 2026-07-09

### Added

- permission resource `daily_activity` pada [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) dan baseline permission matrix di [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts) untuk mendukung aksi `approve` dan `export`
- endpoint approval manager [approval/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/route.ts) untuk approve/reject closing sore per divisi/sub-divisi
- endpoint export CSV [export/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/export/route.ts) untuk rekap daily activity berdasarkan rentang tanggal
- komponen [daily-activity-manager-approval-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-manager-approval-form.tsx) dan [daily-activity-export-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-export-form.tsx) pada halaman daily activity

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) menambah kolom `approval_status/approved_by/approved_at` dan performa dihitung dari aktivitas yang sudah `APPROVED`
- [status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/status/route.ts) kini mengubah closing menjadi `PENDING` approval dan mengizinkan resubmit bila sebelumnya `REJECTED`
- [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) kini mengikuti RBAC `daily_activity` untuk create/update/approve/export
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat approval manager dan export CSV daily activity sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.23`

## [0.63.22] - 2026-07-09

### Added

- helper baru [daily-activity-org.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/daily-activity-org.ts) untuk baseline divisi, sub-divisi, dan level plan `Manager`, `SPV`, `Leader` pada daily activity
- perhitungan performa otomatis harian, mingguan, dan bulanan di [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) beserta breakdown divisi/sub-divisi dan level plan
- kalender plan bulanan di [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) untuk memantau sebaran aktivitas per tanggal

### Changed

- [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts) sekarang mewajibkan pengisian level plan, divisi, dan sub-divisi sesuai baseline organisasi sebelum plan disimpan
- [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx) kini mendukung input plan per divisi/sub-divisi dan level `Manager`, `SPV`, `Leader`
- [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) kini menampilkan performa otomatis lintas periode dan kalender plan
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar daily activity tingkat divisi/sub-divisi beserta performa periode dan kalender plan tercatat sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.22`

## [0.63.21] - 2026-07-09

### Added

- menu baru [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts) untuk `Daily Activity` di path `/dashboard/daily-activity` agar user punya jalur khusus plan pagi dan closing sore
- halaman [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx), service [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts), dan endpoint [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts) serta [status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/status/route.ts) untuk workflow daily activity berbasis review DB
- komponen [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx), [daily-activity-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-close-form.tsx), dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) untuk input plan pagi, closing sore, dan transparansi progres harian

### Changed

- [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx) dan [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts) kini memakai active item paling spesifik agar menu `Daily Activity` tidak bentrok dengan `Dashboard`
- [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts) kini menampilkan shortcut `Daily Activity` di dashboard module cards
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat menu daily activity sebagai capability web yang sudah hidup
- `VERSION` dinaikkan ke `0.63.21`

## [0.63.20] - 2026-07-09

### Added

- endpoint baru [receipts/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/receipts/route.ts) untuk jalur `barang masuk` yang langsung menambah stok tanpa operator memilih tipe movement manual
- form [inventory-stock-receipt-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-stock-receipt-form.tsx) untuk pencatatan penerimaan barang yang lebih mudah dipakai gudang
- panel [inventory-stock-receipt-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-stock-receipt-panel.tsx) untuk merangkum transaksi barang masuk terbaru

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan panel dan form khusus barang masuk selain form stock movement umum
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar alur inbound gudang yang lebih mudah tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.20`

## [0.63.19] - 2026-07-09

### Added

- service baru [inventory-loan-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-loan-service.ts) untuk bootstrap tabel pinjaman inventory dan generate kode pinjaman otomatis
- endpoint [loans/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/route.ts) dan [loans/return/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/return/route.ts) untuk alur barang dipinjam lalu dikembalikan
- komponen [inventory-item-loan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-loan-form.tsx), [inventory-loan-return-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-return-form.tsx), dan [inventory-loan-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-ops-panel.tsx) untuk flow pinjam-kembali di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini memuat section `Pinjaman Inventory` dengan status `BORROWED`, `PARTIAL_RETURN`, `RETURNED`, dan indikator `OVERDUE`
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan panel operasional pinjaman inventory serta form pinjam dan pengembalian barang
- alur pinjam otomatis membuat movement `OUT` dan mengurangi stok, sedangkan alur pengembalian membuat movement `IN` dan menambah stok kembali
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar flow barang pinjam-kembali tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.19`

## [0.63.18] - 2026-07-09

### Added

- panel baru [inventory-request-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-ops-panel.tsx) untuk merangkum antrean request inventory per sub-divisi teknisi dan per status proses

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan panel operasional request inventory dan memperkaya suggestion form proses status dengan konteks sub-divisi dan status
- [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx) diperjelas agar petugas inventory langsung melihat konteks sub-divisi teknisi saat memproses request
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat antrean request inventory per sub-divisi/status sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.18`

## [0.63.17] - 2026-07-09

### Added

- helper baru [inventory-request-org.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/inventory-request-org.ts) untuk mengunci divisi `Teknisi` dan pilihan sub-divisi request inventory (`Teknisi PSB`, `Teknisi Jalur dan Expan`, `Teknisi Jointer`)

### Changed

- [inventory-request-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-request-service.ts) kini memastikan tabel `inventory_item_requests` memiliki kolom `requested_division` dan `requested_subdivision`
- [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) sekarang mewajibkan sub-divisi teknisi saat membuat request barang
- [inventory-item-request-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-request-form.tsx) kini menampilkan input divisi/sub-divisi teknisi agar request inventory lebih presisi sejak awal
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) menampilkan metadata divisi dan sub-divisi pada section `Request Inventory Teknisi`
- [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md) dan [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar tagging sub-divisi teknisi tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.17`

## [0.63.16] - 2026-07-09

### Added

- dokumen baru [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md) untuk mengunci struktur divisi dan sub-divisi organisasi sebagai baseline pengembangan ERP

### Changed

- [role-meta.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/role-meta.ts) sekarang menyimpan metadata divisi dan sub-divisi untuk seluruh role aktif ERP
- [topbar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/topbar.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), dan [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan konteks divisi/sub-divisi role aktif agar perspektif organisasi lebih jelas di UI
- [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md) dan [web-psb-target-permission-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-permission-matrix.md) diperbarui agar mapping role ERP selalu mengacu pada baseline divisi terbaru
- `VERSION` dinaikkan ke `0.63.16`

## [0.63.15] - 2026-07-09

### Changed

- [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) sekarang mengizinkan `FIELD_TECHNICIAN` membuat request barang meskipun role tersebut tidak memiliki `create` umum pada domain Inventory
- [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts) membatasi proses status request agar tidak bisa dijalankan oleh `FIELD_TECHNICIAN`, sehingga penyelesaian stok tetap dikendalikan tim inventory/operasional
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan screen Inventory yang lebih sesuai role: teknisi fokus ke form request barang, sedangkan form admin inventory tidak lagi ditampilkan untuk teknisi
- `VERSION` dinaikkan ke `0.63.15`

## [0.63.14] - 2026-07-09

### Added

- helper baru [inventory-request-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-request-service.ts) untuk bootstrap tabel request inventory teknisi dan generate kode request otomatis
- endpoint [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) dan [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts) untuk alur request barang harian teknisi dengan status `Request`, `On Progress`, `Pending`, dan `Selesai`
- komponen [inventory-item-request-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-request-form.tsx) dan [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx) untuk mensimulasikan pola marketplace internal di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini memuat section baru `Request Inventory Teknisi` agar request teknisi terbaca langsung di read-side inventory
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan form request barang teknisi dan form update status request di domain Inventory
- penyelesaian request inventory otomatis mencatat stock movement `OUT` dan mengurangi stok item secara transaksional di [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts)
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk memasukkan workflow request barang teknisi sebagai capability inventory yang sudah mulai hidup
- `VERSION` dinaikkan ke `0.63.14`

## [0.63.13] - 2026-07-09

### Added

- helper baru [map-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/map-links.ts) untuk membangun tautan Google Maps dari koordinat atau teks lokasi secara konsisten
- panel baru [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx) untuk merangkum ODP, port aktif/bermasalah, device assignment, dan indikasi accessories di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini membawa metadata koordinat ODP dan kategori item assignment agar konteks maps dan accessories bisa dipakai di read-side inventory
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan panel operasional inventory sebelum form write action
- [inventory-odp-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-create-form.tsx) kini menampilkan preview maps dan penegasan parity ODP/port/accessories dari legacy
- [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx) sekarang menampilkan roadmap resmi untuk face recognition, radius attendance, dan geofence titik kerja
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar gap Inventory dan HR secara eksplisit mencakup maps ODP, accessories detail, face recognition attendance, dan radius attendance
- `VERSION` dinaikkan ke `0.63.13`

## [0.63.12] - 2026-07-09

### Added

- helper baru [support-action-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-action-links.ts) untuk menghasilkan anchor dan query link aksi support yang konsisten lintas lane
- panel [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx) dan [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx) sekarang memiliki tombol aksi per row agar operator bisa langsung menindak item yang sedang direview

### Changed

- [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx) dan [[domain]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) meneruskan `searchParams` prefill ke `DomainShell` sehingga flow aksi tetap kompatibel dengan versi Next yang dipakai repo ini
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menyalurkan `supportPrefill` ke form close ticket, restore isolir, dismantle, dan SLA
- [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), dan [support-sla-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-form.tsx) sekarang mendukung nilai awal dari query prefill agar operator tidak perlu mengetik ulang item yang sudah dipilih di lane panel
- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportFormPrefill` untuk menjaga kontrak prefill form support tetap rapi
- `VERSION` dinaikkan ke `0.63.12`

## [0.63.11] - 2026-07-09

### Added

- komponen baru [support-action-quick-links.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-quick-links.tsx) untuk menyediakan shortcut aksi ringan dari lane support ke form yang relevan tanpa menambah fetch data baru

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memberi anchor stabil pada form support lane sehingga panel `/support/{lane}` dapat melompat langsung ke aksi utama yang diprioritaskan
- [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), dan [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx) sekarang menampilkan quick action link sesuai lane aktif agar operator lebih cepat masuk ke form kerja
- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportActionLink` untuk menjaga kontrak shortcut action tetap konsisten lintas panel support
- `VERSION` dinaikkan ke `0.63.11`

## [0.63.6] - 2026-07-09

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) mengoptimalkan query support review DB sehingga `/support/{lane}` hanya mengambil section yang relevan untuk lane tersebut
- `VERSION` dinaikkan ke `0.63.6`

## [0.63.7] - 2026-07-09

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) merapikan layout halaman `/support/{lane}` dengan header lane-specific dan menyembunyikan aksi pendukung agar fokus kerja lebih dedicated
- `VERSION` dinaikkan ke `0.63.7`

## [0.63.8] - 2026-07-09

### Added

- panel operasional [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx) untuk menampilkan queue Trouble Ticket di halaman `/support/tt` dengan ringkasan status dan detail meta yang lebih actionable

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel TT khusus saat membuka lane `tt`
- `VERSION` dinaikkan ke `0.63.8`

## [0.63.9] - 2026-07-09

### Added

- panel operasional [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx) untuk menampilkan queue Isolir di halaman `/support/isolations` dengan ringkasan status, marketing, dan meta isolir yang lebih siap diproses

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel isolir khusus saat membuka lane `isolations`
- `VERSION` dinaikkan ke `0.63.9`

## [0.63.10] - 2026-07-09

### Added

- panel operasional [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx) untuk menampilkan histori dismantle dan meta penutupan layanan di halaman `/support/dismantle`
- panel operasional [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx) untuk menampilkan aturan SLA trouble ticket di halaman `/support/sla`

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel operasional yang spesifik untuk lane `dismantle` dan `sla`
- `VERSION` dinaikkan ke `0.63.10`

## [0.63.5] - 2026-07-08

### Added

- route dedicated [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx) untuk screen kerja lane support seperti `/support/tt`, `/support/isolations`, `/support/dismantle`, dan `/support/sla`
- panel ringkasan lane [support-lane-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-lane-detail-panel.tsx) untuk menampilkan highlight operasional (item/section/status dominan) di halaman dedicated lane support

### Changed

- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) kini menyediakan helper `getSupportLanePath()` agar semua tautan lane support memakai path dedicated yang konsisten
- [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) sekarang mengarahkan kartu lane ke halaman dedicated, bukan query string fokus
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) mengganti chip navigasi lane ke path dedicated agar operator bisa berpindah antar workspace support lewat subpage yang stabil
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi helper path lane dan akses subroute `/support/tt`
- `VERSION` dinaikkan ke `0.63.5`

### Notes

- versi `0.63.5` memindahkan lane support dari sekadar mode fokus di halaman tunggal menjadi screen kerja dedicated yang lebih siap dipakai sebagai fondasi navigasi operasional

## [0.63.4] - 2026-07-08

### Added

- panel baru [support-lane-workspace-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-lane-workspace-panel.tsx) untuk menampilkan checklist, area review, dan catatan eskalasi lane support aktif

### Changed

- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) kini menambahkan `SupportLaneWorkspace`, `SupportLaneActionKey`, `activeLane`, dan `activeWorkspace` agar lane support punya struktur workspace yang lebih operasional
- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) diperluas dengan builder workspace per lane sehingga `TT`, `isolir`, `dismantle`, dan `SLA` punya checklist dan peta aksi yang konsisten
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) sekarang menghitung `activeLane` dan `activeWorkspace` di payload `supportFocus`
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memprioritaskan form berdasarkan `actionKeys` workspace lane aktif, termasuk default role ketika user belum memilih lane manual
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi `activeLane` dan `activeWorkspace`
- `VERSION` dinaikkan ke `0.63.4`

### Notes

- versi `0.63.4` mendorong parity support dari kontrak data ke pengalaman kerja yang lebih operasional, karena lane aktif sekarang punya checklist dan peta aksi yang siap dipakai tim support

## [0.63.3] - 2026-07-08

### Added

- payload `DomainPageData` sekarang mendukung `supportFocus` agar konteks lane support bisa dipakai ulang oleh page server, API, dan wrapper berikutnya

### Changed

- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportLaneKey`, `SupportLaneSnapshot`, dan `DomainSupportFocus` sebagai kontrak lane support lintas layer
- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) diperluas dengan builder snapshot lane agar service dan UI memakai metadata lane yang sama
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) sekarang menerima opsi `supportLane` dan menghasilkan `supportFocus` untuk domain `support`
- [domain API route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/domains/[domain]/route.ts) membaca query `lane` lalu meneruskannya ke service, sehingga mode fokus support tersedia juga di payload API
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) dan [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini membaca `supportFocus` dari service sebagai sumber tunggal lane aktif dan section yang terlihat
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi default lane, selected lane, dan visible sections pada payload support
- `VERSION` dinaikkan ke `0.63.3`

### Notes

- versi `0.63.3` mendorong parity support dari fokus UI ke kontrak data/service, sehingga lane `TT`, `isolir`, `dismantle`, dan `SLA` lebih siap dipakai ulang pada API dan mobile wrapper

## [0.63.2] - 2026-07-08

### Added

- helper [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) untuk menormalkan query `lane`, metadata lane support, dan pemetaan section review per jalur kerja

### Changed

- [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) sekarang menjadikan setiap kartu lane sebagai entry point ke mode fokus `support?lane=...`, lengkap dengan penanda lane default per role dan lane aktif
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) membaca query `lane` untuk domain `support` lalu meneruskannya ke shell halaman
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memprioritaskan form dan review section berdasarkan lane support aktif agar flow `TT`, `isolir`, `dismantle`, dan `SLA` tidak lagi tampil campur aduk
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi helper lane support baru
- `VERSION` dinaikkan ke `0.63.2`

### Notes

- versi `0.63.2` mendorong parity support dari sekadar micro queue visual menjadi mode kerja yang bisa difokuskan per lane tanpa mengganggu shell domain support yang sudah ada

## [0.63.1] - 2026-07-08

### Added

- panel `Micro Queue Support` di [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) untuk memecah jalur kerja support menjadi lane `TT`, `isolir`, `dismantle`, dan `SLA`

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menerima role aktif dan menampilkan queue mikro khusus saat membuka domain `Support`
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) meneruskan role session ke shell agar UI support bisa diurutkan sesuai role login
- `VERSION` dinaikkan ke `0.63.1`

### Notes

- versi `0.63.1` mendorong parity support dari level dashboard umum ke level domain kerja, khususnya untuk `NOC`, `TT`, `CS`, `FIELD_TECHNICIAN`, dan `DISMANTLE`

## [0.63.0] - 2026-07-08

### Added

- panel queue per role pada dashboard melalui [role-queue-grid.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/role-queue-grid.tsx) agar setiap role baru langsung melihat prioritas kerja utamanya
- panel list kerja terpadu melalui [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx) sebagai baseline pengalaman `list` lintas domain
- metadata item queue dan worklist baru di [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) sekarang menghasilkan `roleQueues` dan `worklist` berdasarkan role aktif, memakai review DB bila tersedia atau fallback mock bila belum ada data
- [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts) diperluas dengan template queue dan baseline worklist per role target
- [dashboard page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan perspektif role aktif, queue prioritas, dan list kerja terpadu
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperbarui untuk memverifikasi data dashboard role-aware

### Notes

- versi `0.63.0` menandai pergeseran dashboard dari shell generik ke shell yang mulai role-aware, terutama untuk parity `CS`, `MARKETING`, `NOC`, `TEKNISI`, dan `DISMANTLE`

## [0.62.9] - 2026-07-08

### Changed

- fondasi role ERP di `apps/web` diperluas dari 3 role bootstrap menjadi 9 role target: `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `FIELD_TECHNICIAN`, `TT_OPERATOR`, `DIGITAL_CREATOR`, dan `DISMANTLE_OPERATOR`
- baseline route prefix dan permission matrix di [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts) disesuaikan ke role baru agar guard akses dan capability domain mengikuti desain parity terbaru
- mapping auth di [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts) kini mengenali role legacy dan memetakkannya ke role ERP target baru
- layanan user dan bootstrap permission di [auth-user-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/auth-user-service.ts) serta [access-permission-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/access-permission-service.ts) diperbarui agar label, seed role, dan baseline permission konsisten dengan model role baru
- smoke test di [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperbarui untuk memverifikasi fondasi role baru

### Notes

- versi `0.62.9` adalah baseline implementasi kode pertama untuk parity role ERP, sehingga langkah berikutnya bisa fokus ke queue per role, list kerja terpadu, dan flow mikro per modul

## [0.62.8] - 2026-07-08

### Added

- dokumen `docs/web-psb-target-permission-matrix.md` untuk menerjemahkan role ERP target ke permission matrix yang lebih implementatif
- dokumen `docs/web-psb-module-gap-plan.md` untuk memetakan gap implementasi per modul setelah role dan permission matrix target dikunci

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen permission matrix target dan gap modul masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.8`

### Notes

- versi `0.62.8` menandai perpindahan dari desain role dan flow parity ke baseline akses yang lebih siap diimplementasikan, sekaligus menetapkan prioritas modul yang harus dibenahi lebih dulu

## [0.62.7] - 2026-07-08

### Added

- dokumen `docs/web-psb-target-role-design.md` untuk mendefinisikan role ERP target yang memetakan sembilan role operasional `web-psb-perkasa` ke struktur role ERP baru
- dokumen `docs/web-psb-flow-checklist.md` untuk menilai flow parity per role dengan status go/no-go sebelum cutover

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar artefak desain role target dan checklist flow parity masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.7`

### Notes

- versi `0.62.7` menandai pergeseran dari parity konseptual ke parity operasional yang bisa diuji per role setelah login review DB lokal berhasil digunakan

## [0.62.6] - 2026-07-08

### Added

- dokumen `docs/web-psb-role-action-parity.md` untuk memetakan parity detail per role, menu, dan aksi antara `web-psb-perkasa` dan ERP baru

### Changed

- `docs/xampp-setup.md` kini menegaskan bahwa XAMPP dipakai untuk MySQL review DB, sedangkan web `Next.js` dijalankan lewat `apps/web` dengan `npm run dev`
- `docs/README.md` dan `README.md` root diperbarui agar dokumen parity detail masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.6`

### Notes

- versi `0.62.6` menambahkan baseline parity operasional yang lebih detail dan memperjelas quick start lokal untuk menjalankan web ERP dengan MySQL XAMPP

## [0.62.5] - 2026-07-08

### Added

- dokumen `docs/web-psb-parity-matrix.md` sebagai baseline matriks parity role, menu, aksi, flow, dan logic antara `web-psb-perkasa` dan `perkasa-erp-oss-bss`

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen matriks parity masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.5` untuk menandai bahwa kesiapan cutover kini diukur dengan parity operasional, bukan hanya migrasi data

### Notes

- versi `0.62.5` menegaskan bahwa gap terbesar saat ini ada pada role parity, menu parity, action parity, flow parity, dan logic parity; ERP baru belum boleh menggantikan `web-psb-perkasa` sebelum gap tersebut ditutup

## [0.62.4] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menambahkan syarat parity sebelum cutover penuh: role parity, logic parity, flow parity, checklist parity wajib, dan definisi sukses migrasi dari `web-psb-perkasa` ke ERP baru
- `VERSION` dinaikkan ke `0.62.4` untuk mengunci requirement bahwa ERP baru harus mampu menjalankan seluruh role, logika, dan alur penting dari web lama sebelum pindah penuh

### Notes

- versi `0.62.4` memastikan arah migrasi tidak sekadar memindahkan data; ERP baru harus benar-benar bisa dipakai oleh seluruh role operasional dengan perilaku yang setara atau lebih baik dari `web-psb-perkasa`

## [0.62.3] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menegaskan target end-state bahwa web utama nantinya dikonsolidasikan ke `perkasa-erp-oss-bss`, sekaligus menambahkan kriteria cutover dan syarat kapan `web-psb-perkasa` baru boleh dipensiunkan
- `VERSION` dinaikkan ke `0.62.3` untuk mengunci keputusan transisi end-state secara formal

### Notes

- versi `0.62.3` memperjelas bahwa `web-psb-perkasa` tidak ditinggalkan sekarang; aplikasi itu tetap aktif sampai domain inti lolos mapping, staging, rekonsiliasi, kesiapan UI, hak akses, rollback, dan masa paralel operasional

## [0.62.2] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menegaskan keputusan arsitektur bahwa `web-psb-perkasa` menjadi baseline bisnis-operasional, sedangkan `perkasa-erp-oss-bss` menjadi baseline integrasi target
- `VERSION` dinaikkan ke `0.62.2` untuk mengunci keputusan baseline secara formal di artefak project

### Notes

- versi `0.62.2` menghilangkan ambiguitas arah integrasi: web lama tetap menjadi acuan proses harian, sementara ERP berkembang bertahap melalui mapping, staging, audit, dan transform per domain

## [0.62.1] - 2026-07-08

### Added

- dokumen `docs/web-psb-field-matrix-week-1.md` sebagai matriks field-by-field untuk `Ticket`, `Isolation`, `TroubleTicket`, dan `ODP`

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen matriks field minggu pertama masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.1` untuk menandai sinkronisasi dokumen operasional setelah baseline playbook `0.62.0`

### Notes

- versi `0.62.1` memperinci playbook integrasi minggu pertama ke level field, rule transform, dan rule review manual agar tim bisa langsung menyiapkan staging, validasi, dan rekonsiliasi tanpa menyentuh sistem lama

## [0.62.0] - 2026-07-08

### Added

- dokumen `docs/web-psb-integration-week-1.md` sebagai playbook integrasi 1 minggu yang memetakan modul `web-psb-perkasa` ke domain ERP dengan pola non-intrusive

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar playbook integrasi 1 minggu masuk ke indeks dokumentasi resmi project
- `VERSION` dinaikkan ke `0.62.0` sebagai baseline formal untuk paket integrasi minggu pertama

### Notes

- versi `0.62.0` mengunci pendekatan integrasi yang aman: `web-psb-perkasa` tetap menjadi sistem operasional utama, sedangkan ERP bergerak melalui read-only, staging, dan transform batch
- fokus minggu pertama dibatasi pada domain risiko rendah seperti `ODP`, `Isolation`, dan `Trouble Ticket summary`, serta menahan auth, billing live, dan write-back ke sistem lama

## [0.61.0] - 2026-07-07

### Added

- cache RBAC server kini ikut disegarkan setiap kali role-permissions diubah agar menu, guard halaman, dan guard API bisa segera mengikuti permission master dinamis

### Changed

- `apps/web/lib/access-control.ts` kini bersifat hybrid: tetap aman untuk client components, namun akan memakai snapshot permission DB bila tersedia di runtime server
- `apps/web/lib/services/access-permission-service.ts` memanggil invalidasi cache RBAC server setelah bootstrap/upsert/assign permission

## [0.60.0] - 2026-07-07

### Added

- filter interaktif pada detail batch import (status, domain, dan pencarian cepat) untuk mempercepat review row bermasalah sesuai PRD

## [0.59.0] - 2026-07-07

### Changed

- pipeline transform import tahap 1-4 sekarang ter-scope per batch dengan variabel `@batch_id` (mencegah transform lintas batch saat tombol transform dipicu dari web)
- `apps/web/lib/services/import-write-service.ts` sekarang mengeset `@batch_id` sebelum eksekusi SQL stage

### Added

- histori eksekusi transform per batch melalui tabel `staging_import_batch_transform_runs` (RUNNING/SUCCESS/FAILED, durasi, jumlah statement) dan ditampilkan pada detail batch import

## [0.58.1] - 2026-07-07

### Fixed

- merapikan struktur layout Next.js App Router dengan route group:
  - `(auth)` untuk `/login` tanpa `AppShell`
  - `(app)` untuk halaman aplikasi (dashboard/import/domain/settings) dengan `AppShell`
- menghapus `ShellBoundary` berbasis `usePathname()` yang berpotensi memicu hydration mismatch saat SSR/hydration

## [0.58.0] - 2026-07-07

### Added

- komponen `apps/web/components/billing-invoice-status-form.tsx` dan route `POST /api/billing/invoices/status` untuk membatalkan invoice unpaid langsung dari domain `billing`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action billing untuk pembatalan invoice selain generate invoice, collection action, dan payment entry
- `apps/web/lib/services/domain-service.ts` menambah review section billing: `Invoice Dibatalkan Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone pembatalan invoice tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.58.0` melengkapi lifecycle billing dengan pembatalan invoice yang aman tanpa penghapusan data
- pembatalan invoice tetap defensif: hanya role dengan izin update yang boleh menjalankan aksi, invoice yang sudah memiliki pembayaran ditolak untuk dibatalkan, dan status cancel otomatis menutup collection serta menonaktifkan suspend candidate

## [0.57.0] - 2026-07-07

### Added

- komponen `apps/web/components/billing-invoice-generate-form.tsx` dan route `POST /api/billing/invoices/generate` untuk membuat invoice dari subscription `ACTIVE` langsung dari domain `billing`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action billing: generate invoice, collection action, dan payment entry
- `apps/web/lib/services/domain-service.ts` menambah review section billing: `Subscription Billing-Ready` dan `Invoice Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone generate invoice tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.57.0` melengkapi fondasi invoice lifecycle billing: subscription aktif tanpa invoice recurring bulan berjalan sekarang bisa langsung digenerate dari web
- flow generate invoice tetap defensif: hanya untuk subscription `ACTIVE`, menolak duplikasi recurring per periode, membuat `invoice_no` otomatis, dan selalu menambah `billing_invoice_items` tipe `SUBSCRIPTION`

## [0.56.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-device-return-form.tsx` dan route `POST /api/inventory/device-assignments/status` untuk menyelesaikan assignment perangkat (RETURNED/DAMAGED/LOST) dengan pemulihan stok otomatis saat RETURNED
- komponen `apps/web/components/inventory-odp-port-status-form.tsx` dan route `POST /api/inventory/odp-ports/status` untuk mengubah status port (AVAILABLE/RESERVED/FAULTY/DISABLED) dan opsi mengosongkan mapping subscription/customer

### Changed

- `apps/web/components/domain-shell.tsx` menambah write action inventory untuk update status port ODP dan return perangkat
- `apps/web/lib/services/domain-service.ts` menambah review section inventory: `Port Bermasalah` dan `Device Return Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar flow return perangkat dan status port tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.56.0` melengkapi loop inventory jaringan: port ODP bisa di-reserve/faulty/disable, dan perangkat bisa direturn untuk memulihkan stok
- return perangkat bersifat defensif: hanya assignment dengan status ASSIGNED yang boleh ditutup, dan stok hanya bertambah saat status RETURNED

## [0.55.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-odp-create-form.tsx` dan route `POST /api/inventory/odps` untuk membuat master ODP beserta generate port otomatis
- komponen `apps/web/components/inventory-odp-port-assign-form.tsx` dan route `POST /api/inventory/odp-ports/assign` untuk assign port ODP ke subscription/customer
- komponen `apps/web/components/inventory-device-assignment-form.tsx` dan route `POST /api/inventory/device-assignments` untuk menautkan perangkat inventory ke subscription/work order/customer dan mencatat stok keluar

### Changed

- `apps/web/components/domain-shell.tsx` menambah write action inventory untuk ODP, assign port, dan device assignment
- `apps/web/lib/services/domain-service.ts` menambah review section inventory: `ODP Terbaru`, `Port Terpakai`, dan `Device Assignment Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui untuk mencerminkan flow ODP dan assignment inventory

### Notes

- versi `0.55.0` menutup gap inventory: dari item master + stock movement menjadi siap untuk pemetaan jaringan (ODP/port) dan assignment perangkat ke layanan
- flow baru tetap defensif: ODP code unik, port hanya bisa dipakai bila status AVAILABLE/RESERVED, movement stok keluar ditolak bila stok tidak cukup

## [0.54.0] - 2026-07-07

### Added

- komponen `apps/web/components/hr-salary-slip-form.tsx` dan route `POST /api/hr/salary-slips` untuk membuat slip gaji bulanan employee langsung dari domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action pada domain `hr`: employee, attendance, loan, dan salary slip
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Slip Gaji Terbaru` dari review DB untuk menutup loop payroll awal
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone payroll awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.54.0` melengkapi fondasi HR agar employee yang sudah memiliki attendance dan loan bisa langsung dibuatkan slip gaji dari web
- payroll tetap defensif: slip gaji menolak duplikasi employee per bulan/tahun, `loan_deduction` bisa otomatis mengambil cicilan loan aktif, dan `net_salary` tidak boleh negatif

## [0.53.0] - 2026-07-07

### Added

- komponen `apps/web/components/hr-attendance-form.tsx` dan route `POST /api/hr/attendance` untuk mencatat attendance harian employee langsung dari domain `hr`
- komponen `apps/web/components/hr-loan-create-form.tsx` dan route `POST /api/hr/loans` untuk mencatat loan atau kasbon employee langsung dari domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action pada domain `hr`: employee master, attendance, dan loan
- suggestion employee untuk form attendance dan loan diambil dari review section employee yang aktif pada halaman HR
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone attendance dan loan awal tercermin pada dokumentasi

### Notes

- versi `0.53.0` melengkapi fondasi HR agar employee yang sudah dibuat bisa langsung memiliki attendance dan loan dari web
- flow baru tetap defensif: attendance menolak duplikasi employee pada tanggal yang sama, validasi check-in/check-out dijaga, dan loan hanya bisa dibuat untuk employee yang valid dengan nominal yang masuk akal

## [0.52.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-stock-movement-form.tsx` dan route `POST /api/inventory/stock-movements` untuk mencatat histori pergerakan stok dari item inventory yang sudah ada
- komponen `apps/web/components/hr-employee-create-form.tsx` dan route `POST /api/hr/employees` untuk membuat employee master awal pada domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `inventory` dan satu write action awal pada domain `hr`
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section HR (`Employee Terbaru`, `Attendance Hari Ini`, `Loan Aktif`) dan memperkaya inventory dengan movement terbaru yang berasal dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone inventory movement dan HR awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.52.0` membuka fondasi write action awal untuk domain HR dan melengkapi inventory agar item master bisa langsung mempunyai histori movement
- flow baru tetap defensif: movement OUT menolak stok minus, employee code dibuat otomatis, dan cabang/divisi HR hanya ditautkan jika kode master valid

## [0.51.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-item-create-form.tsx` untuk membuat item master inventory langsung dari halaman domain `inventory`
- route `POST /api/inventory/items` di `apps/web/app/api/inventory/items/route.ts` untuk menyimpan item baru ke tabel `inventory_items` dengan `item_code` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action awal pada domain `inventory` untuk menambah item master langsung dari web
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section `Item Inventory Terbaru` dan `Stock Movement Terbaru` dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone inventory awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.51.0` membuka write action pertama pada domain inventory agar item master dan review movement tidak lagi hanya berupa shell summary
- item inventory saat ini tetap defensif: kategori dan satuan wajib ada di master review DB, `item_code` dibuat otomatis, dan angka stok divalidasi sebelum insert

## [0.50.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-subscription-activate-form.tsx` untuk mengaktifkan subscription langsung dari sales order pada halaman domain `sales`
- route `POST /api/sales/subscriptions` di `apps/web/app/api/sales/subscriptions/route.ts` untuk membuat `service_subscriptions`, melengkapi customer master bila belum ada, dan menautkan hasil aktivasi ke order/work order

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan enam write action pada domain `sales`: create lead, create coverage, create survey, create sales order, create work order, dan aktivasi subscription
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Subscription Aktivasi Terbaru` dari review DB untuk menutup loop sales ke layanan aktif
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone aktivasi subscription tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.50.0` menutup gap awal aktivasi subscription sehingga alur sales kini sudah bisa bergerak dari lead sampai layanan aktif
- aktivasi saat ini tetap defensif: order sumber wajib valid, paket wajib aktif, `service_no` dibuat otomatis, customer master dibentuk otomatis bila belum ada, dan work order instalasi terakhir ikut diselesaikan bila tersedia

## [0.49.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-coverage-create-form.tsx` untuk membuat coverage area awal dari lead langsung pada halaman domain `sales`
- route `POST /api/sales/covered-areas` di `apps/web/app/api/sales/covered-areas/route.ts` untuk menyimpan coverage area ke tabel `sales_covered_areas` dengan `area_code` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan lima write action pada domain `sales`: create lead, create coverage, create survey, create sales order, dan create work order
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Coverage Terbaru` dari review DB untuk memperlihatkan kesiapan area layanan
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone coverage flow tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.49.0` menutup gap awal coverage flow sehingga validasi area layanan bisa dicatat sebelum survey dan order dilanjutkan
- coverage saat ini tetap defensif: sumber wajib dari lead valid, `area_code` dibuat otomatis, dan lead sumber diselaraskan ke `QUALIFIED` atau `COVERAGE_CHECK` sesuai status coverage

## [0.48.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-survey-create-form.tsx` untuk membuat survey awal langsung dari lead pada halaman domain `sales`
- route `POST /api/sales/surveys` di `apps/web/app/api/sales/surveys/route.ts` untuk menyimpan survey ke tabel `sales_surveys` dengan `survey_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action pada domain `sales`: create lead, create survey, create sales order, dan create work order
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone sales survey flow tercermin pada dokumentasi implementasi web

### Notes

- versi `0.48.0` menutup gap awal write action survey sehingga proses coverage dan feasibility bisa mulai dicatat tanpa menunggu workflow sales lengkap
- survey saat ini tetap defensif: sumber wajib dari lead valid, `survey_no` dibuat otomatis, dan lead sumber didorong ke status `SURVEY_REQUEST` setelah survey dibuat

## [0.47.0] - 2026-07-06

### Added

- komponen `apps/web/components/sales-work-order-create-form.tsx` untuk membuat work order delivery dari sales order aktif langsung dari halaman domain `sales`
- route `POST /api/sales/work-orders` di `apps/web/app/api/sales/work-orders/route.ts` untuk menyimpan work order ke tabel `service_work_orders` dengan `work_order_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action pada domain `sales`: create lead, create sales order, dan create work order
- `apps/web/lib/services/domain-service.ts` sekarang menambahkan `Order ID` pada review queue order dan memuat review section baru `Work Order Aktif` dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone work order flow tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.47.0` menutup gap awal transisi order ke delivery lapangan tanpa menunggu aktivasi subscription penuh
- work order saat ini tetap defensif: sumber wajib dari sales order valid, nomor work order dibuat otomatis, dan order sumber didorong ke status `READY_INSTALL` atau `ON_PROCESS` sesuai status awal work order

## [0.46.0] - 2026-07-06

### Added

- komponen `apps/web/components/sales-order-create-form.tsx` untuk membuat sales order baru dari lead yang sudah ada langsung dari halaman domain `sales`
- route `POST /api/sales/orders` di `apps/web/app/api/sales/orders/route.ts` untuk menyimpan order ke tabel `sales_orders` dengan `order_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `sales`: create lead dan create sales order
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone sales order flow tercermin pada dokumentasi implementasi web

### Notes

- versi `0.46.0` menutup gap awal transisi lead ke order tanpa menunggu integrasi work order penuh
- sales order saat ini tetap defensif: sumber wajib berasal dari lead yang valid, `order_no` dibuat otomatis, dan jadwal instalasi masih opsional

## [0.45.0] - 2026-07-06

### Added

- komponen `apps/web/components/billing-payment-form.tsx` untuk menambah pembayaran invoice langsung dari halaman domain `billing`
- route `POST /api/billing/payments` di `apps/web/app/api/billing/payments/route.ts` untuk menyimpan payment entry ke `billing_payments`

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat daftar pembayaran terbaru dari review DB sebagai review section baru pada domain `billing`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `billing`: collection action dan payment entry
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone payment billing tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.45.0` menutup gap awal lifecycle invoice dengan menambahkan payment entry yang menyelaraskan `paid_amount` dan `invoice_status`
- payment entry bersifat defensif: overpayment ditolak, invoice `PAID` tidak bisa dibayar ulang, dan invoice lunas otomatis menutup `collection_status` serta membersihkan `suspend_candidate`

## [0.44.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-dismantle-form.tsx` untuk memindahkan pelanggan dari isolir aktif ke histori dismantle langsung dari halaman domain `support`
- route `POST /api/support/isolations/[id]/dismantle` di `apps/web/app/api/support/isolations/[id]/dismantle/route.ts` untuk menyimpan snapshot ke `support_dismantle_history` dan mengarsipkan sumber isolir

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat histori dismantle terbaru dari review DB sebagai review section baru pada domain `support`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan flow dismantle di samping create/close ticket, SLA, isolir aktif, dan restorasi isolir
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone dismantle support tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.44.0` melengkapi loop awal domain `support` dengan histori dismantle yang aman dan terpisah dari data aktif
- flow ini mengikuti prinsip arsip: data dengan histori dismantle dipindahkan ke `support_dismantle_history` dan sumber isolir ditandai `is_archived = 1`

## [0.43.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-isolation-restore-form.tsx` untuk menutup isolir aktif langsung dari halaman domain `support`
- route `POST /api/support/isolations/[id]/restore` di `apps/web/app/api/support/isolations/[id]/restore/route.ts` untuk menyimpan restorasi isolir ke tabel `support_isolations`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action restorasi isolir di samping create ticket, close ticket, kelola SLA, dan tambah isolir aktif
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone restorasi isolir tercermin pada dokumentasi implementasi web

### Notes

- versi `0.43.0` menutup loop dasar workflow isolir: web sekarang bisa menambah isolir aktif dan menutupnya kembali melalui restorasi
- cakupan support tetap parsial karena dismantle flow web dan automasi SLA penuh masih belum tersedia

## [0.42.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-isolation-form.tsx` untuk menambah pelanggan isolir aktif langsung dari halaman domain `support`
- route `POST /api/support/isolations` di `apps/web/app/api/support/isolations/route.ts` untuk menyimpan data isolir aktif ke tabel `support_isolations`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action awal pada domain `support`: create ticket, close ticket, kelola SLA, dan tambah isolir aktif
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone isolir support tercermin pada dokumentasi implementasi web

### Notes

- versi `0.42.0` memperluas domain `support` ke write action isolir dasar yang menjadi jembatan menuju workflow suspend, restorasi, dan dismantle
- cakupan support masih parsial karena close/open TT, SLA, dan isolir sudah hidup, tetapi restorasi isolir dan dismantle flow web masih belum tersedia

## [0.41.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-sla-form.tsx` untuk membuat atau memperbarui SLA trouble ticket langsung dari halaman domain `support`
- route `POST /api/support/trouble-ticket-sla` di `apps/web/app/api/support/trouble-ticket-sla/route.ts` untuk menyimpan SLA ke tabel `support_trouble_ticket_sla`

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat daftar SLA aktif dari review DB dan menampilkannya sebagai review section baru pada domain `support`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan form SLA support untuk role yang memiliki izin approve
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone SLA support tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.41.0` memperluas domain `support` dari open/close trouble ticket ke kontrol SLA dasar per tipe ticket
- cakupan support masih parsial karena isolir action dan dismantle flow web masih belum dihidupkan

## [0.40.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-ticket-close-form.tsx` untuk menutup trouble ticket open langsung dari halaman domain `support`
- route `POST /api/support/trouble-tickets/[ticketCode]/close` di `apps/web/app/api/support/trouble-tickets/[ticketCode]/close/route.ts` untuk menyimpan hasil close ke review DB

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua form write action pada domain `support`: create ticket dan close ticket
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone close flow support tercermin pada dokumentasi implementasi web

### Notes

- versi `0.40.0` menutup gap penting pada domain `support`: web review sekarang tidak hanya bisa membuat trouble ticket open, tetapi juga menutup ticket yang masih aktif langsung ke `support_trouble_tickets`
- cakupan support masih bersifat parsial karena SLA penuh, isolir action, dan dismantle flow belum dihidupkan dari web

## [0.39.0] - 2026-07-06

### Added

- service `apps/web/lib/services/auth-user-audit-service.ts` untuk ensure table, mencatat, dan membaca audit log perubahan user internal
- komponen `apps/web/components/auth-user-audit-list.tsx` untuk menampilkan jejak create, update, dan reset password di halaman `settings/users`
- tabel `auth_user_audit_logs` pada `database/xampp_review_schema.sql` sebagai fondasi audit formal user internal

### Changed

- `apps/web/app/api/settings/users/route.ts` sekarang mencatat audit saat user internal baru dibuat
- `apps/web/app/api/settings/users/[id]/route.ts` sekarang mencatat audit update profil dan reset password tanpa memblokir aksi utama
- `apps/web/app/settings/users/page.tsx`, `apps/web/lib/services/auth-user-service.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone audit user internal tercermin di UI, fallback mock, pengujian, dan tracker PRD

### Notes

- versi `0.39.0` menutup gap audit dasar pada modul `settings/users`, sehingga create, edit, change status, dan reset password kini punya jejak formal di web review
- audit tetap dirancang defensif: kegagalan pencatatan log tidak membatalkan aksi utama create/update/reset password

## [0.38.0] - 2026-07-06

### Added

- komponen `apps/web/components/auth-user-management-table.tsx` untuk mengelola user internal langsung dari halaman `settings/users`
- endpoint `PATCH /api/settings/users/[id]` di `apps/web/app/api/settings/users/[id]/route.ts` untuk update profil inti user dan reset password review

### Changed

- `apps/web/lib/services/auth-user-service.ts` diperluas agar list user membawa `roleId`, `roleCode`, `divisionId`, dan `branchId` sebagai basis form edit
- `apps/web/app/settings/users/page.tsx` sekarang menampilkan table manage user, bukan hanya direktori read-only
- `apps/web/README.md`, `docs/prd-web-checklist.md`, dan `VERSION` diperbarui untuk mencerminkan milestone manajemen user internal yang lebih lengkap

### Notes

- versi `0.38.0` menutup gap utama pada `settings/users`: user review sekarang bisa dibuat, diedit, dinonaktifkan/diaktifkan kembali, dan password-nya direset dari web
- username sengaja tetap dikunci pada tahap ini agar identitas login tidak berubah sembarangan saat fondasi auth internal masih distabilkan

## [0.37.0] - 2026-07-06

### Added

- tabel `staging_import_batch_actions` pada `database/xampp_review_staging_import.sql` untuk menyimpan histori aksi batch import secara terstruktur
- timeline histori aksi pada detail batch import melalui `apps/web/components/import-batch-detail-view.tsx`

### Changed

- `apps/web/lib/services/import-write-service.ts` sekarang menangani ensure table histori, pencatatan aksi, dan pembacaan action log per batch
- `apps/web/app/api/import/batches/route.ts`, `apps/web/app/api/import/batches/[id]/route.ts`, serta flow validasi/transform sekarang mencatat event `CREATE`, `UPLOAD`, `VALIDATE`, dan `TRANSFORM`
- `apps/web/lib/services/import-service.ts` dan `apps/web/lib/mock-import.ts` diperluas agar detail batch membawa histori aksi
- `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone histori aksi batch tercatat

### Notes

- versi `0.37.0` menutup gap histori aksi Import Center sehingga jejak create, upload, validasi, dan transform bisa direview langsung dari web
- pencatatan histori dirancang tidak memblokir aksi utama, jadi create/upload/validasi/transform tetap berjalan meskipun tabel histori belum bisa dibuat di database review

## [0.36.0] - 2026-07-06

### Added

- service `apps/web/lib/services/import-file-loader.ts` untuk mem-parse file upload dan memuat row ke tabel `staging_*` sesuai scope batch
- dokumentasi `docs/import-file-format.md` yang menjelaskan format JSON/XLSX/XLS/CSV yang didukung oleh Import Center web
- dependency `xlsx` pada `apps/web/package.json` untuk membaca workbook upload dari browser

### Changed

- `POST /api/import/batches/[id]` di `apps/web/app/api/import/batches/[id]/route.ts` sekarang tidak hanya menyimpan file lokal, tetapi juga otomatis mengisi row staging dan memperbarui total row batch
- `apps/web/components/import-batch-upload-form.tsx` dan `apps/web/README.md` diperbarui agar menjelaskan batasan format file yang aman untuk parser otomatis
- `docs/README.md`, `README.md`, dan `docs/prd-web-checklist.md` diperbarui agar status parser upload ke staging tercatat

### Notes

- versi `0.36.0` menutup gap terbesar pada Import Center web: file upload sekarang bisa langsung menjadi row staging yang siap divalidasi dan ditransform dari web
- parser saat ini paling kuat untuk `JSON` terstruktur dan workbook `XLSX/XLS` multi-sheet per scope, sedangkan `CSV` disarankan hanya untuk scope satu section

## [0.35.0] - 2026-07-06

### Added

- service `apps/web/lib/services/import-write-service.ts` untuk validasi row staging, rekap batch, dan eksekusi baseline SQL transform tahap 1-4
- endpoint `POST /api/import/batches/[id]/validate` untuk memvalidasi row staging batch dari web
- endpoint `POST /api/import/batches/[id]/transform` untuk menjalankan transform tahap 1-4 dari web
- komponen `apps/web/components/import-batch-action-panel.tsx` untuk tombol validasi dan transform pada detail batch

### Changed

- `apps/web/app/import/[batchId]/page.tsx` dan `apps/web/components/import-batch-detail-view.tsx` diperluas agar detail batch sekarang memuat area approval, validasi, dan trigger transform
- `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone approve/transform pada Import Center tercatat

### Notes

- versi `0.35.0` membuat Import Center jauh lebih utuh di web: alur create batch, upload file, validasi batch, lalu trigger transform tahap 1-4 sekarang sudah tersedia dari satu halaman detail batch
- transform saat ini menjalankan baseline SQL review yang ada di folder `database/`, sehingga eksekusi masih mengikuti model review global dan belum memiliki histori eksekusi terstruktur per batch

## [0.34.0] - 2026-07-06

### Added

- form `apps/web/components/import-batch-upload-form.tsx` untuk upload file sumber pada detail batch import
- dukungan `POST /api/import/batches/[id]` di `apps/web/app/api/import/batches/[id]/route.ts` untuk menerima file `xlsx`, `xls`, `csv`, atau `json`

### Changed

- `apps/web/lib/types.ts`, `apps/web/lib/services/import-service.ts`, dan `apps/web/lib/mock-import.ts` diperluas agar batch membawa metadata `sourceFileName`
- `apps/web/components/import-batch-detail-view.tsx` dan `apps/web/components/import-batch-table.tsx` sekarang menampilkan file sumber batch
- `.gitignore`, `apps/web/README.md`, `docs/prd-web-checklist.md`, dan `apps/web/tests/mock-data.test.ts` diperbarui untuk mencerminkan milestone upload file import

### Notes

- versi `0.34.0` menambahkan langkah kedua pada write-side Import Center: file sumber bisa diunggah ke storage lokal project dan metadata batch otomatis diperbarui ke status `UPLOADED`
- langkah berikutnya yang paling logis adalah validasi batch dan trigger transform tahap 1-4 dari web

## [0.33.0] - 2026-07-06

### Added

- form `apps/web/components/import-batch-create-form.tsx` untuk membuat batch review baru dari Import Center
- dukungan `POST /api/import/batches` di `apps/web/app/api/import/batches/route.ts` untuk menambah row baru ke `staging_import_batches`

### Changed

- halaman `apps/web/app/import/page.tsx` sekarang menampilkan write action awal Import Center untuk role yang memiliki izin create
- smoke test `apps/web/tests/mock-data.test.ts` diperluas agar memverifikasi izin create pada `import_center`
- dokumentasi `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar status Import Center mencerminkan create batch dari web

### Notes

- versi `0.33.0` menandai write-side pertama pada Import Center, dimulai dari pembuatan batch review tanpa menyentuh transform
- langkah berikutnya yang paling logis adalah upload file sumber, validasi batch, lalu trigger transform tahap 1-4 dari web

## [0.32.0] - 2026-07-06

### Added

- dokumen `docs/prd-web-checklist.md` sebagai tracker status implementasi web terhadap requirement PRD aplikasi web utama

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar checklist PRD web masuk ke indeks dokumen resmi project

### Notes

- versi `0.32.0` menambahkan artefak kendali implementasi agar gap antara PRD dan web bisa dipantau lebih objektif per iterasi
- checklist ini dirancang sebagai acuan fase berikutnya, terutama untuk import pipeline, inventory, HR, dan CRUD user internal lanjutan

## [0.31.0] - 2026-07-06

### Added

- form `apps/web/components/auth-user-create-form.tsx` untuk menambah user internal baru dari halaman `settings/users`
- route `POST /api/settings/users` di `apps/web/app/api/settings/users/route.ts` untuk menyimpan user baru ke `auth_users`
- lookup role, divisi, dan cabang pada service `apps/web/lib/services/auth-user-service.ts` agar create user memakai referensi master review DB

### Changed

- halaman `apps/web/app/settings/users/page.tsx` sekarang tidak lagi read-only; halaman ini sudah bisa dipakai untuk review sekaligus create user internal
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi lookup option user internal tetap tersedia
- dokumentasi `apps/web/README.md` diperbarui agar status auth internal mencakup write action awal user management

### Notes

- versi `0.31.0` menandai langkah awal CRUD user internal, dimulai dari create user langsung ke `auth_users`
- langkah berikutnya yang paling logis adalah edit user, reset password, dan deactivate/reactivate akun

## [0.30.0] - 2026-07-06

### Added

- halaman `apps/web/app/settings/users/page.tsx` untuk menampilkan direktori user auth internal di area settings
- service layer `apps/web/lib/services/auth-user-service.ts` untuk membaca `auth_users` dari review DB dengan fallback ke akun bootstrap mock
- navigasi `User Internal` khusus `SUPER_ADMIN` agar fondasi manajemen user mulai terlihat di shell aplikasi

### Changed

- matrix akses dan whitelist route diperluas agar `SUPER_ADMIN` dapat membuka `/settings/users`
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi akses route dan data directory user internal
- root project sekarang memiliki `.gitignore` dan repository lokal sudah diinisialisasi dengan `git init` agar siap dipublikasikan ke GitHub

### Notes

- versi `0.30.0` menandai bahwa auth internal tidak lagi hanya hidup di login resolver, tetapi mulai punya permukaan review di UI
- pembuatan repo GitHub private sudah dicoba, tetapi masih terblokir karena sesi browser GitHub belum login

## [0.29.0] - 2026-07-06

### Added

- file `database/xampp_review_auth_seed.sql` untuk menyiapkan akun review minimum di `auth_users`
- dokumen `docs/auth-review-seed.md` yang menjelaskan urutan eksekusi seed auth internal dan kredensial awal review
- role `OPERATOR` ke `database/xampp_review_core_master_seed.sql` agar role aplikasi web punya representasi langsung di review DB

### Changed

- smoke test `apps/web/tests/mock-data.test.ts` diperbaiki agar type-safe terhadap union result dari hybrid auth
- dokumentasi root, docs index, core seed, dan `apps/web/README.md` diperbarui agar langkah auth internal sekarang mencakup seed user review

### Notes

- versi `0.29.0` menandai transisi auth internal dari sekadar fallback-aware menjadi siap diuji end-to-end di MySQL review
- langkah berikutnya yang paling logis adalah menjalankan seed ini di XAMPP review lalu menambahkan manajemen user internal berbasis CRUD

## [0.28.0] - 2026-07-06

### Added

- mode auth hybrid yang memprioritaskan `auth_users/auth_roles` dari review DB saat tersedia
- fallback aman ke akun bootstrap mock bila review DB auth belum siap atau user review belum tersedia
- dukungan verifikasi password langsung dan `sha256` sederhana untuk fase transisi mapping user lama ke `auth_users.password_hash`

### Changed

- route login sekarang tidak lagi hard-coded ke mock, tetapi memakai resolver auth terpadu
- halaman login diperbarui agar menjelaskan status auth hybrid dan memisahkan istilah akun bootstrap mock dari auth internal
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi fallback auth tetap bekerja saat review DB belum aktif

### Notes

- versi `0.28.0` menandai awal transisi dari auth mock ke auth internal tanpa memutus akses development lokal
- langkah berikutnya yang disarankan adalah menyiapkan seed `auth_users` review DB atau layar manajemen user internal agar hybrid auth bisa dipakai penuh

## [0.27.0] - 2026-07-06

### Added

- route `POST /api/customers` untuk menambah customer master baru ke `crm_customers`
- penyimpanan alamat utama sekaligus ke `crm_customer_addresses` saat customer review dibuat
- form inline write action pada domain `customers` untuk input nama customer, tipe, identitas, kontak, alamat utama, dan maps URL

### Changed

- domain `customers` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat customer review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `customers` mencakup write action awal
- write-side ERP baru kini mencakup empat domain prioritas: `billing`, `sales`, `support`, dan `customers`

### Notes

- versi `0.27.0` melengkapi gelombang awal write-side pada empat domain prioritas tanpa mengubah flow import/transform yang sudah ada
- langkah berikutnya paling logis adalah memulai transisi auth internal atau memperdalam write action lanjutan per domain

## [0.26.0] - 2026-07-06

### Added

- route `POST /api/support/trouble-tickets` untuk menambah trouble ticket open baru ke `support_trouble_tickets`
- form inline write action pada domain `support` untuk input nama customer, customer user, kategori, tipe ticket, status awal, problem category, dan catatan
- generator `ticket_code` review dengan prefix kategori (`TT` / `PV`) dan urutan bulanan sederhana untuk menjaga keunikan ticket baru

### Changed

- domain `support` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat trouble ticket review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `support` mencakup write action awal
- write-side ERP baru kini mencakup tiga domain operasional awal: `billing`, `sales`, dan `support`

### Notes

- versi `0.26.0` memperluas write-side dari billing dan sales ke support tanpa menyentuh logika close ticket maupun histori dismantle
- langkah berikutnya paling logis adalah write action awal di `customers` atau mulai transisi dari auth mock ke auth internal

## [0.25.0] - 2026-07-06

### Added

- route `POST /api/sales/leads` untuk menambah lead baru langsung ke tabel `sales_leads` pada review DB
- form inline write action pada domain `sales` untuk input nama prospek, tipe lead, status awal, source, PIC marketing, alamat, dan catatan
- integrasi suggestion marketing pada halaman `sales` dari review queue yang sedang tampil agar input manual lebih konsisten

### Changed

- domain `sales` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat lead review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `sales` mencakup write action awal
- pola write action lintas domain kini dimulai dari `billing` dan `sales` sebagai fondasi form operasional berikutnya

### Notes

- versi `0.25.0` memperluas write-side ERP baru dari billing ke sales tanpa mengubah alur transform/import yang sudah ada
- langkah berikutnya paling logis adalah write action review di `support` atau `customers`, atau mulai mengganti auth mock ke auth internal

## [0.24.0] - 2026-07-06

### Added

- route `POST /api/billing/collection-actions` untuk menambah histori collection action langsung ke review DB
- form inline write action pada domain `billing` untuk input `invoice_no`, `action_type`, `action_status`, `follow up`, dan catatan
- helper `runReviewDbExecute()` pada adapter MySQL review agar service/route bisa menjalankan statement write dengan pool yang sama

### Changed

- domain `billing` sekarang tidak lagi read-only; modul ini sudah memiliki write action backend pertama yang aman untuk workflow review
- penyimpanan collection action ikut menyelaraskan `collection_status` invoice dan flag `suspend_candidate` ketika tipe aksi menuntutnya
- dokumentasi `apps/web/README.md` diperbarui agar status billing mencakup write action awal

### Notes

- versi `0.24.0` menjadi tonggak write action backend pertama di project ERP baru tanpa menyentuh data inti secara destruktif
- pola ini sengaja dipilih dari domain `billing` karena paling aman untuk memulai write-side sebelum form operasional besar lain dibuat

## [0.23.0] - 2026-07-06

### Added

- query review DB untuk daftar `lead terbaru` dari `sales_leads`
- query review DB untuk daftar `survey dan order berjalan` dari `sales_surveys` dan `sales_orders`
- fallback mock review operasional pada domain `sales` agar funnel akuisisi tetap dapat direview saat `review-db` belum siap

### Changed

- shell domain `sales` sekarang tidak hanya menampilkan KPI funnel, tetapi juga daftar lead dan alur delivery awal yang sedang bergerak
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `sales`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `sales`

### Notes

- versi `0.23.0` menyelesaikan gelombang awal review section untuk empat domain prioritas: `sales`, `support`, `customers`, dan `billing`
- sesudah ini fokus paling logis adalah domain `inventory`/`hr` atau mulai membuat write action backend pertama

## [0.22.0] - 2026-07-06

### Added

- query review DB untuk daftar `invoice perlu tindak lanjut` dari `billing_invoices` yang ditautkan ke customer subscription
- query review DB untuk daftar `collection action terbaru` dari `billing_collection_actions`
- fallback mock review operasional pada domain `billing` agar alur collection tetap bisa direview saat `review-db` belum siap

### Changed

- shell domain `billing` sekarang tidak berhenti di KPI overdue/partial, tetapi mulai menampilkan queue operasional invoice dan collection action
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `billing`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `billing`

### Notes

- versi `0.22.0` menyelesaikan gelombang awal review section untuk tiga domain prioritas: `support`, `customers`, dan `billing`
- langkah berikutnya paling logis adalah membawa domain `sales` ke pola yang sama atau mulai membuat write action backend pertama

## [0.21.0] - 2026-07-06

### Added

- query review DB untuk daftar `customer terbaru` dari `crm_customers` dan alamat utama `crm_customer_addresses`
- query review DB untuk daftar `subscription aktif` dari `service_subscriptions` yang ditautkan ke customer dan paket
- fallback mock review operasional pada domain `customers` agar lifecycle customer tetap dapat direview saat mode `review-db` belum siap

### Changed

- shell domain `customers` sekarang tidak hanya menampilkan KPI, tetapi juga review data operasional customer dan layanan aktif
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `customers`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `customers`

### Notes

- versi `0.21.0` memperluas pola review section dari domain `support` ke domain `customers`
- fondasi ini memudahkan iterasi berikutnya untuk membawa domain `billing` atau `sales` ke pola review data yang sama

## [0.20.0] - 2026-07-06

### Added

- review section reusable pada shell domain untuk menampilkan daftar operasional ringkas di bawah kartu summary
- query review DB untuk daftar `TT open` dan `isolir aktif` terbaru pada domain `support`
- sampel review operasional mock pada domain `support` agar fallback tetap informatif saat koneksi review DB belum siap

### Changed

- halaman domain `support` tidak lagi berhenti di KPI; sekarang mulai menampilkan daftar kerja operasional yang lebih dekat ke alur harian support
- smoke test `apps/web/tests/mock-data.test.ts` diperluas agar memverifikasi keberadaan review section pada domain `support`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup daftar operasional support

### Notes

- versi `0.20.0` menandai transisi shell domain dari summary-only menuju review data operasional nyata
- pola review section ini sengaja dibuat reusable agar domain lain seperti `sales`, `customers`, atau `billing` bisa mengikuti pendekatan yang sama pada iterasi berikutnya

## [0.19.0] - 2026-07-06

### Added

- adapter `apps/web/lib/review-db.ts` untuk koneksi MySQL review berbasis `DATABASE_URL`
- dependency `mysql2` dan env `REVIEW_DB_CONNECT_TIMEOUT_MS`
- query review DB untuk `dashboard`, `import center`, detail batch, dan summary shell domain

### Changed

- `dashboard-service`, `import-service`, dan `domain-service` sekarang mencoba membaca MySQL review saat `APP_DATA_MODE=review-db`
- service layer akan fallback ke mock dengan status sumber data eksplisit jika koneksi atau query review DB gagal
- tipe status import dan batch detail diperluas agar cocok dengan nilai staging riil seperti `DRAFT`, `FAILED`, `PENDING`, `INVALID`, dan `SKIPPED`
- smoke test diubah untuk memverifikasi jalur fallback `review-db` tanpa mensyaratkan MySQL aktif di sandbox

### Notes

- versi `0.19.0` menandai bahwa web baru sudah mulai membaca database review nyata, walaupun masih memakai fallback mock saat koneksi belum tersedia
- tahap berikutnya adalah memperdalam query domain, form operasional, dan write action ke backend review yang sama

## [0.18.0] - 2026-07-06

### Added

- service layer `apps/web/lib/services/domain-service.ts` untuk shell domain `sales`, `customers`, `support`, `inventory`, `hr`, dan `billing`
- route handler `GET /api/domains/[domain]` dengan guard session dan role access
- capability badge per domain untuk menampilkan aksi aktif hasil permission matrix pada UI

### Changed

- halaman `app/[domain]/page.tsx` tidak lagi membaca `mock-domains` secara langsung; sekarang memakai service layer domain
- komponen `apps/web/components/domain-shell.tsx` sekarang menampilkan status sumber data dan capability aktif per role
- kontrak tipe domain diperjelas melalui `DomainKey`, `DomainCapability`, dan `DomainPageData`
- smoke test diperluas untuk memverifikasi service layer domain dan capability per role

### Notes

- versi `0.18.0` menandai bahwa semua shell utama di `apps/web` sekarang sudah berada di pola data access layer yang seragam
- konektor database review untuk domain masih belum aktif, tetapi jalur integrasinya sekarang sudah konsisten dengan dashboard dan import

## [0.17.0] - 2026-07-06

### Added

- helper `apps/web/lib/data-source.ts` untuk menentukan mode sumber data `mock` vs `review-db`
- service layer `apps/web/lib/services/dashboard-service.ts` dan `apps/web/lib/services/import-service.ts`
- komponen `apps/web/components/data-source-status.tsx`
- file `apps/web/.env.example` untuk kontrak `APP_DATA_MODE` dan `DATABASE_URL`

### Changed

- halaman `dashboard`, `import`, `import/[batchId]`, dan API terkait sekarang membaca service layer, bukan mengimpor mock source langsung
- UI dashboard dan import sekarang menampilkan status sumber data efektif beserta fallback jika `review-db` belum siap
- smoke test diperluas agar memverifikasi data mode, fallback source, dan service layer

### Notes

- versi `0.17.0` menandai transisi dari mock source langsung ke data access layer yang siap diarahkan ke MySQL review
- koneksi database nyata belum diaktifkan pada tahap ini; `review-db` masih berupa kontrak konfigurasi dengan fallback eksplisit ke mock

## [0.16.0] - 2026-07-06

### Added

- script `apps/web/scripts/sandbox-verify.ps1` untuk menjalankan verifikasi lewat runner temp di luar workspace
- dokumentasi `Verifikasi Sandbox` pada `apps/web/README.md`

### Changed

- proses verifikasi `apps/web` sekarang punya jalur resmi yang kompatibel dengan sandbox tanpa membuat `node_modules` di dalam project

### Notes

- sandbox workspace memblokir operasi pada `apps/web/node_modules`, termasuk pembuatan junction ke folder temp
- jalur yang terbukti berhasil adalah menyalin `apps/web` ke `%TEMP%\perkasa-web-runner`, lalu menjalankan `npm install`, `npm run check`, dan `npm run test:smoke` di sana

## [0.15.0] - 2026-07-06

### Added

- permission matrix per role di `apps/web/lib/access-control.ts` untuk resource dan aksi domain
- komponen `apps/web/components/access/permission-matrix.tsx` untuk menampilkan matrix izin di UI
- ringkasan permission aktif pada halaman `settings/access`

### Changed

- `settings/access` tidak lagi memakai shell generik; halaman ini sekarang menampilkan role aktif, ringkasan izin, dan matrix aksi per resource
- pengujian di `apps/web/tests/mock-data.test.ts` diperluas agar mencakup permission matrix dan action check
- `apps/web/README.md` diperbarui agar milestone bootstrap mencakup permission matrix per role

### Notes

- versi `0.15.0` menandai bahwa fondasi authorization sekarang sudah naik dari pembatasan route ke model izin yang mulai mendekati kebutuhan operasional
- matrix pada tahap ini masih mock dan statis, tetapi bentuk kontraknya sudah cukup untuk dihubungkan ke auth internal dan master permission nyata pada iterasi berikutnya

## [0.14.0] - 2026-07-06

### Added

- helper role access di `apps/web/lib/access-control.ts` untuk menentukan landing page, navigasi, shortcut modul, dan izin route per role
- akun review `OPERATOR` tambahan untuk menguji pembatasan menu dan route
- pengujian role access pada `apps/web/tests/mock-data.test.ts`

### Changed

- sidebar dan shortcut dashboard sekarang hanya menampilkan menu yang sesuai role session
- halaman `import`, detail batch, shell domain, dan `settings/access` sekarang mengecek izin role, bukan sekadar status login
- API import dan topbar shortcut `Review Batch` sekarang mengikuti izin role yang sama
- `apps/web/README.md` diperbarui agar cakupan bootstrap mencakup role-based access awal

### Notes

- versi `0.14.0` menandai bahwa auth mock sekarang sudah punya lapisan authorization awal, sehingga struktur satu website mulai mencerminkan pembatasan akses per role
- model izin pada tahap ini masih sederhana dan berbasis prefix route, lalu bisa diperdalam ke level permission per data domain pada iterasi berikutnya

## [0.13.0] - 2026-07-06

### Added

- helper session di `apps/web/lib/auth-session.ts` untuk akun review, pembuatan token, dan verifikasi session cookie
- helper server auth di `apps/web/lib/auth.ts` untuk membaca cookie, guard halaman, dan mengelola cookie response
- route handler `POST /api/auth/login` dan `POST /api/auth/logout`
- pengujian auth mock pada `apps/web/tests/mock-data.test.ts`

### Changed

- halaman `login` sekarang benar-benar mengirim kredensial ke route auth mock dan menampilkan pesan error login
- `dashboard`, `import`, `import/[batchId]`, shell domain, dan API mock sekarang memerlukan session login
- topbar shell aplikasi sekarang menampilkan identitas session aktif dan tombol logout
- `apps/web/README.md` diperbarui agar cakupan bootstrap mencakup auth mock

### Notes

- versi `0.13.0` menandai bahwa bootstrap aplikasi web tidak lagi sekadar shell visual; jalur login, cookie session, dan guard akses awal sudah tersedia untuk review
- auth pada tahap ini masih mock dan sengaja sederhana agar kontrak UI, route, dan akses bisa diuji sebelum integrasi auth produksi

## [0.12.0] - 2026-07-06

### Added

- bootstrap `apps/web` berbasis `Next.js`, `React`, `TypeScript`, dan `Tailwind CSS`
- halaman `login`, `dashboard`, `import`, `import/[batchId]`, dan shell domain operasional awal
- route handler mock `/api/dashboard/summary`, `/api/import/batches`, dan `/api/import/batches/[id]`
- smoke test `apps/web/tests/mock-data.test.ts` untuk memeriksa konsistensi mock source utama

### Changed

- `apps/web/README.md` diperbarui agar mencerminkan bahwa aplikasi web utama sudah dibootstrap
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup shell aplikasi web utama

### Notes

- versi `0.12.0` menandai transisi dari artefak database review ke fondasi aplikasi web yang bisa dipakai untuk integrasi auth, Prisma, dan API domain nyata
- halaman dan API pada tahap ini masih memakai mock data yang disengaja agar struktur frontend dan kontrak awal backend bisa direview lebih cepat

## [0.11.0] - 2026-07-06

### Added

- tabel staging billing di `database/xampp_review_staging_import.sql` untuk invoice, item, payment, dan collection
- sample batch `SAMPLE-WEBPSB-BILLING-001` di `database/xampp_review_sample_import.sql`
- file `database/xampp_review_transform_stage_4.sql` untuk transform billing dari staging ke tabel final
- dokumen `docs/staging-transform-stage-4.md` untuk menjelaskan transform billing tahap 4

### Changed

- `docs/staging-import.md` dan `docs/sample-import.md` diperbarui agar mencakup domain billing
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup transform tahap 4
- `docs/staging-transform-stage-3.md` diperbarui agar langkah berikutnya mengarah ke tahap 4 yang sekarang sudah tersedia

### Notes

- versi `0.11.0` menandai bahwa fondasi review migrasi sekarang sudah mencakup domain billing, bukan hanya operasional dan support
- transform billing tetap mengikuti subscription hasil tahap 2 agar relasi invoice tidak berdiri tanpa layanan yang valid

## [0.10.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_3.sql` untuk transform work order, trouble ticket, isolation, dan dismantle history
- dokumen `docs/staging-transform-stage-3.md` untuk menjelaskan cakupan, urutan eksekusi, dan batas billing pada tahap 3
- sample `ISOLATION` dan `DISMANTLE_HISTORY` tambahan di `database/xampp_review_sample_import.sql`

### Changed

- `docs/sample-import.md` diperbarui agar sample review support tidak hanya mencakup trouble ticket
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup transform tahap 3

### Notes

- versi `0.10.0` menandai bahwa jalur operasional dari order ke work order dan histori support sudah punya artefak transform review
- billing masih sengaja ditahan karena schema billing sudah ada, tetapi staging billing sebagai sumber transform belum dibuat

## [0.9.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_2.sql` untuk transform customer, address, sales order, dan subscription dari staging ke tabel final
- dokumen `docs/staging-transform-stage-2.md` untuk menjelaskan cakupan, urutan eksekusi, dan query review tahap 2

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project sekarang mencakup transform tahap 2
- `docs/phase-1-roadmap.md` diperbarui untuk menambahkan sprint khusus transform customer, address, order, dan subscription

### Notes

- versi `0.9.0` menandai bahwa jalur komersial inti dari customer sampai subscription sudah punya artefak transform review
- `sales_leads`, `service_work_orders`, domain support, dan billing masih sengaja dipisahkan ke tahap berikutnya agar lifecycle operasionalnya tidak tercampur terlalu cepat

## [0.8.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_1.sql` untuk transform awal dari staging ke tabel final
- dokumen `docs/staging-transform.md` untuk menjelaskan cakupan, urutan eksekusi, dan cara review hasil transform

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project sekarang mencakup transform tahap 1
- `docs/phase-1-roadmap.md` diperbarui untuk menambahkan sprint khusus transform inventory dan HR

### Notes

- versi `0.8.0` menandai bahwa review migrasi sekarang sudah masuk tahap insert terkontrol ke tabel final, meskipun masih dibatasi pada domain inventory dan HR
- domain customer, order, subscription, support, dan billing sengaja belum dimasukkan ke tahap ini agar relasinya bisa direview lebih hati-hati

## [0.7.0] - 2026-07-06

### Added

- sample batch `GA` untuk `inventory item` dan `inventory movement` di `database/xampp_review_sample_import.sql`
- sample batch `FINANCE` untuk `employee`, `attendance`, `salary`, dan `loan` di `database/xampp_review_sample_import.sql`
- query review tambahan di `docs/sample-import.md` untuk domain inventory dan HR

### Changed

- `docs/sample-import.md` diperbarui agar cakupan sample sekarang lintas `WEB_PSB`, `GA`, dan `FINANCE`
- `docs/phase-1-roadmap.md` dan `README.md` diperbarui agar milestone berikutnya bergeser ke tahap transform staging ke tabel final

### Notes

- versi `0.7.0` menandai bahwa sample review sekarang sudah menyentuh tiga sumber legacy utama, bukan hanya domain web psb
- seluruh sample tetap berhenti di area staging agar konsistensi satu database bisa direview sebelum proses insert ke tabel final

## [0.6.1] - 2026-07-06

### Added

- file `database/xampp_review_core_master_seed.sql` untuk menyiapkan master minimum sebelum mapping seed dijalankan
- dokumen `docs/core-master-seed.md` untuk menjelaskan dependency foreign key pada master mapping

### Changed

- urutan eksekusi di `docs/master-mapping.md`, `docs/master-mapping-seed.md`, dan `docs/sample-import.md` diperbaiki agar memakai core master seed terlebih dahulu
- `README.md` dan `docs/README.md` diperbarui agar file seed master minimum ikut tercatat

### Notes

- versi `0.6.1` adalah patch yang memastikan sample review dan mapping seed bisa dijalankan dengan referensi master yang valid

## [0.6.0] - 2026-07-06

### Added

- file `database/xampp_review_master_mapping_seed.sql` sebagai baseline awal translasi nilai legacy
- file `database/xampp_review_sample_import.sql` sebagai sample batch kecil untuk uji staging dan mapping
- dokumen `docs/master-mapping-seed.md` untuk menjelaskan fungsi seed awal
- dokumen `docs/sample-import.md` untuk menjelaskan urutan eksekusi dan hasil yang diharapkan dari sample batch

### Changed

- `README.md`, `docs/README.md`, `docs/master-mapping.md`, `docs/staging-import.md`, dan `docs/phase-1-roadmap.md` diperbarui agar selaras dengan milestone seed dan sample import

### Notes

- versi `0.6.0` menandai bahwa fondasi migrasi sekarang sudah punya contoh baseline mapping dan contoh batch review, bukan hanya schema transit
- sample import tetap berhenti di area staging agar aman untuk review satu database sebelum import nyata

## [0.5.0] - 2026-07-05

### Added

- file `database/xampp_review_master_mapping.sql` untuk template mapping nilai legacy ke master tunggal
- dokumen `docs/master-mapping.md` untuk menjelaskan fungsi mapping role, division, branch, package, category, unit, dan status
- dokumen `docs/platform-architecture.md` untuk mengunci constraint `1 database`, `1 domain`, dan `1 website`

### Changed

- `README.md` diperbarui agar prinsip project secara eksplisit mengikuti arsitektur satu platform terpadu
- `docs/blueprint.md`, `docs/staging-import.md`, `docs/data-mapping.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar selaras dengan constraint arsitektur dan tahap master mapping

### Notes

- versi `0.5.0` menandai bahwa fondasi project sekarang tidak hanya punya schema dan staging, tetapi juga aturan penyatuan nilai legacy ke model data tunggal
- keputusan `1 database, 1 domain, 1 website` berarti modul baru harus tetap modular di dalam satu aplikasi, bukan dipecah menjadi situs terpisah

## [0.4.0] - 2026-07-05

### Added

- file `database/xampp_review_staging_import.sql` untuk tabel staging import dari tiga sistem lama
- dokumen `docs/staging-import.md` untuk menjelaskan pola staging, status import, dan alur review data mentah
- tabel batch import `staging_import_batches`
- tabel staging domain untuk user, customer, order, support, inventory, employee, attendance, salary, dan loan

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project mencakup staging import
- `docs/data-mapping.md`, `docs/schema-gap.md`, dan `docs/phase-1-roadmap.md` diperbarui agar konsisten dengan tahap staging

### Notes

- versi `0.4.0` menandai bahwa review database sekarang tidak hanya punya schema final, tetapi juga area aman untuk cleansing dan validasi data legacy
- staging import tetap diposisikan sebagai area transit, bukan sumber data operasional utama

## [0.3.0] - 2026-07-05

### Added

- file `database/xampp_review_schema_phase_1_1.sql` sebagai patch schema lanjutan setelah schema dasar
- dokumen `docs/schema-phase-1-1.md` untuk menjelaskan isi dan urutan eksekusi patch schema
- tabel coverage dan survey: `sales_covered_areas`, `sales_surveys`, `sales_survey_photos`
- tabel billing dan collection: `billing_invoices`, `billing_invoice_items`, `billing_payments`, `billing_collection_actions`
- tabel `network_odp_ports` untuk detail port ODP
- tabel `service_device_assignments` untuk assignment perangkat ke customer/subscription

### Changed

- `auth_users` direncanakan terhubung ke `hr_employees` melalui kolom `employee_id` pada patch schema phase 1.1
- `README.md`, `docs/README.md`, `docs/phase-1-roadmap.md`, dan `docs/schema-gap.md` diperbarui agar sinkron dengan milestone schema terbaru

### Notes

- versi `0.3.0` menandai transisi dari review struktur dasar ke schema operasional yang lebih dekat ke alur end-to-end ISP
- patch `phase 1.1` harus dijalankan setelah `database/xampp_review_schema.sql`

## [0.2.0] - 2026-07-05

### Added

- dokumen `docs/data-mapping.md` untuk mapping entitas dan field dari `web-psb-perkasa`, `finance-repo`, dan `ga-web-app`
- dokumen `docs/phase-1-erd.md` untuk merangkum relasi tabel phase 1
- dokumen `docs/schema-gap.md` untuk memetakan gap schema dan prioritas iterasi berikutnya

### Changed

- `README.md` diperbarui agar milestone saat ini mengarah ke schema phase 1.1 dan staging import
- `docs/README.md` diperbarui agar indeks dokumen mencakup ERD dan schema gap

### Notes

- versi `0.2.0` menandai milestone integrasi dokumen domain, field mapping, dan review relasi database
- schema review awal sudah cukup untuk validasi fondasi, tetapi belum lengkap untuk billing, coverage/survey, dan ODP port detail

## [0.1.0] - 2026-07-05

### Added

- inisialisasi folder project baru `perkasa-erp-oss-bss`
- dokumen blueprint gabungan di `docs/blueprint.md`
- roadmap phase 1 di `docs/phase-1-roadmap.md`
- schema awal MySQL XAMPP untuk review di `database/xampp_review_schema.sql`
- struktur awal `apps/web`
- file `VERSION`
- kebijakan versioning project

### Notes

- versi `0.1.0` menandai fase fondasi arsitektur dan database review
- belum ada bootstrap framework aplikasi utama
- belum ada eksekusi schema ke XAMPP
