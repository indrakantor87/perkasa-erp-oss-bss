# Changelog

All notable changes to this project will be documented in this file.

Format mengikuti prinsip `Keep a Changelog`, dan versi mengikuti `Semantic Versioning`.

## [Unreleased]

### Planned

- penguatan query domain dan action backend setelah MySQL review dipakai penuh

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
