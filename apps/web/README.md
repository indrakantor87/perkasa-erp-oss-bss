# Apps Web

Folder ini sekarang berisi bootstrap aplikasi web utama berbasis `Next.js`, `React`, `TypeScript`, dan `Tailwind CSS`.

## Cakupan Bootstrap Saat Ini

- halaman `login`
- halaman `dashboard`
- halaman `import`
- halaman detail batch `import/[batchId]`
- shell domain `sales`, `customers`, `support`, `inventory`, `hr`, `billing`
- halaman `settings/access`
- auth mock dengan cookie session, guard halaman, dan logout
- role-based access untuk sidebar, shortcut, guard route halaman, dan guard API yang bisa mengikuti permission master dinamis saat review DB aktif
- permission matrix + permission master dinamis + audit perubahan permission di halaman akses (`settings/access`)
- service layer untuk `dashboard`, `import`, dan shell domain dengan adapter MySQL review dan fallback eksplisit ke mock
- route handler mock:
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/dashboard/summary`
  - `/api/import/batches`
  - `/api/import/batches/[id]`
  - `/api/domains/[domain]`

## Tujuan Tahap Berikutnya

1. ganti auth mock ke auth internal/real session store
2. sambungkan service layer dashboard, import, dan domain ke Prisma/MySQL review
3. hubungkan permission matrix ke service layer dan data domain nyata
4. siapkan wrapper Android setelah route inti stabil

## Integrasi Review DB Saat Ini

- `dashboard` sudah bisa membaca agregat dari tabel final review seperti `crm_customers`, `sales_orders`, `support_trouble_tickets`, `support_isolations`, `inventory_items`, `hr_employees`, dan `billing_invoices`
- `import center` sudah bisa membaca `staging_import_batches` dan detail row lintas tabel staging
- `import center` sekarang memiliki write action awal untuk membuat batch baru langsung ke `staging_import_batches` saat mode `review-db` aktif
- detail batch import sekarang memiliki upload file sumber yang menyimpan file lokal ke `apps/web/storage/import-batches`
- upload file sumber sekarang bisa otomatis memuat row ke tabel `staging_*` dari `JSON` terstruktur atau workbook `XLSX/XLS` multi-sheet sesuai scope batch
- detail batch import sekarang memiliki tombol validasi batch dan trigger transform tahap 1-4 dari web untuk role yang memiliki izin approve
- detail batch import sekarang juga menampilkan histori aksi terstruktur untuk create, upload, validasi, dan transform
- shell domain `sales`, `customers`, `support`, `inventory`, `hr`, dan `billing` sudah bisa mengganti angka summary dari query review DB
- `settings/users` sekarang mendukung create user, edit profil inti, ubah role/divisi/cabang/status, dan reset password review dari web
- `settings/users` sekarang juga menampilkan audit perubahan user internal dan mencatat event create, update, serta reset password ke `auth_user_audit_logs`
- shell domain `sales` sudah menampilkan review operasional awal berupa daftar `lead terbaru` dan `survey/order berjalan` dari review DB, lalu fallback ke sampel mock saat koneksi tidak siap
- domain `sales` sudah memiliki write action awal berupa form `lead review` yang menulis prospek baru ke `sales_leads` saat mode `review-db` aktif
- domain `sales` sekarang juga memiliki write action coverage area awal dari lead yang valid ke tabel `sales_covered_areas` dengan `area_code` otomatis
- domain `sales` sekarang juga memiliki write action survey awal dari lead yang valid ke tabel `sales_surveys` dengan `survey_no` otomatis
- domain `support` sudah memiliki write action awal berupa form `trouble ticket review` yang menulis ticket open baru ke `support_trouble_tickets` saat mode `review-db` aktif
- domain `support` sekarang juga memiliki close flow awal untuk menutup trouble ticket aktif langsung ke `support_trouble_tickets` saat mode `review-db` aktif
- domain `support` sekarang juga memiliki pengaturan SLA dasar per tipe ticket melalui tabel `support_trouble_ticket_sla` untuk role yang memiliki izin approve
- domain `support` sekarang juga memiliki write action awal untuk menambah pelanggan isolir aktif ke tabel `support_isolations`
- domain `support` sekarang juga memiliki write action restorasi isolir untuk menutup data isolir aktif melalui `restoration_date` dan `close_note`
- domain `support` sekarang juga memiliki flow dismantle yang memindahkan data ke `support_dismantle_history` dan mengarsipkan sumber isolir
- domain `billing` sekarang juga memiliki payment entry yang menulis ke `billing_payments` dan menyelaraskan `paid_amount` serta `invoice_status`
- domain `billing` sekarang juga memiliki generate invoice dari subscription `ACTIVE` yang menulis ke `billing_invoices` dan `billing_invoice_items` dengan proteksi duplikasi recurring per periode
- domain `billing` sekarang juga memiliki pembatalan invoice unpaid yang mengubah `invoice_status` menjadi `CANCELLED` tanpa menghapus histori billing
- domain `sales` sekarang juga memiliki sales order create dari lead yang valid dengan `order_no` otomatis
- domain `sales` sekarang juga memiliki work order create dari sales order aktif dengan `work_order_no` otomatis
- domain `sales` sekarang juga memiliki aktivasi subscription dari sales order yang valid dengan `service_no` otomatis serta pembentukan customer master bila diperlukan
- domain `inventory` sekarang juga memiliki write action awal untuk membuat item master baru ke `inventory_items` dengan `item_code` otomatis
- domain `inventory` sekarang juga memiliki write action stock movement untuk mencatat IN/OUT/ADJUSTMENT dan menyelaraskan `current_stock`
- domain `inventory` sekarang juga memiliki write action ODP untuk membuat master `network_odp` dan generate port awal pada `network_odp_ports`
- domain `inventory` sekarang juga memiliki write action assign port ODP agar `port_status` dan `active_ports` terselaraskan dengan layanan yang terpasang
- domain `inventory` sekarang juga memiliki write action device assignment untuk menautkan `inventory_items` ke subscription/work order/customer dan mencatat stok keluar
- domain `inventory` sekarang juga memiliki write action update status port ODP untuk `AVAILABLE/RESERVED/FAULTY/DISABLED` agar kontrol port tidak hanya bergantung pada assign
- domain `inventory` sekarang juga memiliki write action return perangkat untuk menutup assignment dan memulihkan stok otomatis saat status `RETURNED`
- domain `hr` sekarang juga memiliki write action awal untuk membuat employee master baru ke `hr_employees` dengan `employee_code` otomatis
- domain `hr` sekarang juga memiliki write action attendance harian untuk employee valid pada `hr_attendance`
- domain `hr` sekarang juga memiliki write action loan atau kasbon awal untuk employee valid pada `hr_loans`
- domain `hr` sekarang juga memiliki write action slip gaji bulanan untuk employee valid pada `hr_salary_slips`
- domain `customers` sudah memiliki write action awal berupa form `customer review` yang menulis customer master baru beserta alamat utama ke `crm_customers` dan `crm_customer_addresses`
- auth login sekarang memakai mode hybrid: memprioritaskan `auth_users/auth_roles` dari review DB saat tersedia, lalu fallback ke akun bootstrap mock bila user review belum siap
- seed review DB untuk akun internal sekarang disiapkan di `database/xampp_review_auth_seed.sql` agar mode hybrid bisa diuji tanpa menunggu import user legacy
- halaman `settings/users` sekarang menampilkan direktori user internal dari `auth_users` atau fallback mock agar fondasi manajemen user mulai terlihat di UI
- halaman `settings/users` sekarang juga memiliki write action awal untuk membuat user baru langsung ke `auth_users` saat mode `review-db` aktif
- shell domain `billing` sudah menampilkan review operasional awal berupa daftar `invoice perlu tindak lanjut` dan `collection action terbaru` dari review DB, lalu fallback ke sampel mock saat koneksi tidak siap
- shell domain `billing` sekarang juga menampilkan `subscription billing-ready` dan `invoice terbaru` agar proses generate invoice bisa dipantau langsung dari halaman billing
- shell domain `billing` sekarang juga menampilkan `invoice dibatalkan terbaru` agar koreksi invoice unpaid tetap terlihat dari review operasional
- domain `billing` sudah memiliki write action awal berupa form `collection action` yang menulis histori reminder / promise to pay / suspend ke review DB saat mode `review-db` aktif
- shell domain `customers` sudah menampilkan review operasional awal berupa daftar `customer terbaru` dan `subscription aktif` dari review DB, lalu fallback ke sampel mock saat koneksi tidak siap
- shell domain `support` sudah menampilkan review operasional awal berupa daftar `TT open` dan `isolir aktif` dari review DB, lalu fallback ke sampel mock saat koneksi tidak siap
- bila koneksi/query MySQL review gagal, service layer otomatis kembali ke mock dan menampilkan status fallback di UI

## Konfigurasi Data Mode

Gunakan file `.env.local` berdasarkan [`.env.example`](file:///c:/Users/user/Documents/trae_projects/perkasa-erp-oss-bss/apps/web/.env.example).
Untuk hosting, gunakan template [`.env.production.example`](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.example) sebagai baseline agar mode data, secret session, dan koneksi DB production tidak tertinggal.

- `APP_DATA_MODE=mock` akan memakai data bootstrap lokal.
- `APP_DATA_MODE=review-db` akan menandai service layer untuk mode review database.
- Jika `APP_DATA_MODE=review-db` tetapi `DATABASE_URL` belum diisi, aplikasi akan fallback ke `mock` dan menampilkan status fallback di UI.
- `AUTH_SESSION_SECRET` wajib diisi pada environment production agar session cookie tidak memakai secret default development.
- Untuk bootstrap mock auth lokal yang terkontrol, isi `BOOTSTRAP_MOCK_AUTH_CREDENTIALS` di `.env.local` dan jangan commit password tersebut ke repo.

## Health Check

- Endpoint readiness dasar tersedia di `/api/health`.
- Endpoint ini dipakai untuk verifikasi pasca-deploy bahwa proses Next.js hidup, mode data terbaca, dan secret session production sudah terpasang.
- Untuk hasil build production dengan `output: standalone`, jalankan app memakai `npm run start` yang sekarang mengeksekusi `node .next/standalone/server.js`.

## Verifikasi Sandbox

Sandbox workspace ini memblokir operasi pada `node_modules` di dalam project, jadi verifikasi penuh perlu dijalankan lewat salinan temp yang writable.

Gunakan script berikut dari root `apps/web`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sandbox-verify.ps1
```

Script tersebut akan:

1. menyalin `apps/web` ke `%TEMP%\perkasa-web-runner`
2. menjalankan `npm install` di runner temp
3. menjalankan `npm run check`
4. menjalankan `npm run test:smoke`
