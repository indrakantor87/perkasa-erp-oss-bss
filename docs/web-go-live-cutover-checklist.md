# Checklist Go-Live Senin

## Tujuan

Dokumen ini menjadi panduan hari-H untuk deploy dan cutover web ERP pada hari Senin agar:

1. urutan deploy teknis tidak bercampur dengan validasi bisnis
2. scope fase awal tetap disiplin pada Divisi `Pemasaran dan Pelayanan`
3. keputusan `go / no-go / rollback` bisa diambil cepat dengan dasar yang jelas

Dokumen ini melengkapi:

1. [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md)
2. [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
3. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
4. [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)
5. [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md)
6. [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)

## Scope Hari-H

Cutover Senin hanya mengejar scope berikut:

1. web ERP dapat diakses stabil dari domain/host production
2. login dan logout berjalan normal
3. dashboard dan domain inti terbuka untuk role fondasi
4. validasi bisnis minimum lulus untuk role inti `Pemasaran dan Pelayanan`

Role prioritas validasi:

1. `SUPER_ADMIN`
2. `NOC_OPERATOR`
3. `TT_OPERATOR`
4. `DISMANTLE_OPERATOR`
5. `SALES_MARKETING`
6. `CS_OPERATOR`
7. `CS_ADMIN`

Catatan:

1. `DIGITAL_CREATOR` tetap dicatat, tetapi bukan penentu `go-live`
2. `FIELD_TECHNICIAN` tetap berada di gelombang integrasi berikutnya

## PIC Minimum

Sebelum mulai, isi peran berikut:

| Peran | Tanggung Jawab | Nama PIC |
|---|---|---|
| PIC Deploy | jalankan build, PM2, Nginx, dan rollback teknis | `................` |
| PIC Database | verifikasi koneksi DB, backup, dan akses query dasar | `................` |
| PIC Validasi Admin | login admin, dashboard, settings, dan smoke lintas domain | `................` |
| PIC Validasi Support | login support/NOC/TT/dismantle dan cek queue teknis | `................` |
| PIC Validasi Sales-CS | login marketing/CS dan cek flow dasar lintas domain | `................` |
| PIC Keputusan | putuskan `go / no-go / rollback` final | `................` |

## Snapshot Readiness Sebelum Hari-H

Status teknis repo per `0.66.12`:

- `npm run check`, `npm run test:smoke`, `npm run build`, `verify:production-env`, dan `verify:health` sudah tersedia dan dipakai sebagai baseline readiness.
- Sidebar/workspace khusus kini dipersempit ke role target agar audit menu tidak misleading.
- Flow write-side prioritas `restore isolir`, `transfer`, `reopen`, `TT teknis`, dan `port/ODP` sudah memiliki mutation proof terkontrol pada review DB.
- Helper terjaga `reset:review-auth-password` tersedia untuk penyelarasan lokal `auth_users.password_hash` di review DB tanpa melemahkan auth aplikasi.
- Proof lokal `prove:cs-admin-supervisor-flow` tersedia untuk mengisi bucket `Perlu Approval` dan `Perlu Koreksi` pada workspace supervisor tanpa suntikan manual data.
- UAT browser terbaru:
  - `DISMANTLE_OPERATOR`: `pass` pada login dan landing lane dismantle
  - `CS_OPERATOR`: `pass` pada login dan landing `List Kerja`
  - `CS_ADMIN`: `pass`, termasuk bucket `Perlu Approval`, `Perlu Koreksi`, `Transfer atau Restore`, `Queue Risiko Tinggi`, serta deep-link lintas domain
  - `TT_OPERATOR`: `pass`, source `Review DB`, dan lane `Trouble Open` tampil berisi
  - `NOC_OPERATOR`: `pass`, login `support.ops` berhasil, source `Review DB`, lane `Trouble Ticket` berisi (`4`), dan menu `support/inventory` terbuka
  - `SALES_MARKETING`: `pass`, login `chalis@perkasa.net.id` berhasil, create lead awal berjalan, dan monitoring `support/inventory` terbuka sesuai role

## T-1 Hari Minggu Malam

Checklist ini harus selesai sebelum tidur:

- branch `main` sudah memuat commit kandidat rilis terakhir
- `docs/web-hosting-readiness-checklist.md` sudah dibaca ulang
- `.env` production final sudah disiapkan di server
- backup database sebelum cutover sudah disiapkan
- domain, reverse proxy, dan PM2 config sudah siap
- commit rollback stabil sudah dicatat
- akun uji per role sudah dikonfirmasi masih valid

## Timeline Hari-H

### 08:00 - 08:30

- aktifkan channel komunikasi deploy
- konfirmasi semua PIC online
- umumkan freeze perubahan aplikasi selama proses go-live
- pastikan tidak ada commit baru yang masuk di luar scope deploy

### 08:30 - 09:00

- backup database final
- verifikasi akses SSH/server
- salin `.env` production ke `apps/web/.env`
- jalankan `npm run verify:production-env -- .env`

### 09:00 - 09:30

- jalankan `npm install`
- jalankan `npm run check`
- jalankan `npm run test:smoke`
- jalankan `npm run build`

### 09:30 - 10:00

- start/restart PM2 dengan `ecosystem.config.cjs`
- aktifkan Nginx/reload config
- jalankan `npm run verify:health -- http://127.0.0.1:3000/api/health`
- cek domain final dari browser

### 10:00 - 11:00

- validasi admin
- validasi support teknis
- validasi sales/CS
- kumpulkan screenshot bukti lulus/gagal

### 11:00 - 11:30

- rapat keputusan cepat
- putuskan salah satu:
  - `GO` jika semua kriteria minimum lulus
  - `PILOT TERBATAS` jika hanya role fondasi teknis yang lulus
  - `ROLLBACK` jika blocker kritis masih ada

## Checklist Teknis Minimum

Semua poin ini harus lulus sebelum validasi bisnis:

- `npm run verify:production-env -- .env` lulus
- `npm run build` lulus
- PM2 status `online`
- `npm run verify:health -- http://127.0.0.1:3000/api/health` lulus
- domain final membuka halaman login
- login tidak lagi melempar redirect host salah
- logout kembali ke `/login`

## Checklist Validasi Bisnis Minimum

### 1. `SUPER_ADMIN`

- berhasil login
- dashboard terbuka
- `sales`, `support`, `billing`, `inventory`, dan `hr` bisa dibuka
- logout berhasil

### 2. `NOC_OPERATOR`

- berhasil login
- dashboard menampilkan scope `Pemasaran dan Pelayanan / NOC`
- menu `support` terbuka
- queue teknis support dapat dilihat
- panel KPI tidak jatuh ke default `Penjualan`

### 3. `TT_OPERATOR`

- berhasil login
- landing `support` terbuka
- lane TT tampil
- aksi TT dasar bisa diakses sesuai role

### 4. `DISMANTLE_OPERATOR`

- berhasil login
- flow `support` yang memuat dismantle terbuka
- queue/riwayat dismantle dasar dapat dibaca
- guard aksi role tidak menampilkan menu asing

### 5. `SALES_MARKETING`

- berhasil login
- `sales` dan `customers` terbuka
- dashboard sesuai perspektif role
- `List Kerja` marketing menampilkan queue lead/customer/coverage/order
- tidak melihat menu teknis yang tidak relevan

### 6. `CS_OPERATOR`

- berhasil login
- `sales`, `customers`, `support`, dan `inventory` terbuka
- dashboard sesuai perspektif role
- `List Kerja` operator menampilkan queue lintas input/order/support/ODP
- perpindahan lintas domain utama tetap lancar

### 7. `CS_ADMIN`

- berhasil login
- dashboard supervisor terbuka
- domain lintas sales/customers/support/inventory bisa dibuka
- queue `Perlu Approval`, `Perlu Koreksi`, atau `Transfer atau Restore` terbaca dari perspektif supervisor
- capability admin yang terlihat sesuai role

## Kriteria Go-Live

Status `GO` hanya dipilih jika:

1. checklist teknis minimum lulus seluruhnya
2. `SUPER_ADMIN`, `NOC_OPERATOR`, dan `TT_OPERATOR` lulus
3. tidak ada blocker login, logout, dashboard, atau health check
4. tidak ada error kritis yang memaksa user kembali ke sistem lama untuk flow utama teknis

Status `PILOT TERBATAS` dipilih jika:

1. teknis stabil
2. role support teknis lulus
3. role sales/CS masih punya gap yang bisa ditahan sementara

Status `ROLLBACK` dipilih jika salah satu terjadi:

1. login gagal untuk admin atau support utama
2. health check gagal
3. domain inti tidak bisa dibuka
4. session/auth tidak stabil
5. data/queue inti tidak tampil untuk role fondasi

## Trigger Rollback Cepat

Rollback tidak perlu menunggu diskusi panjang bila muncul:

- blank page atau crash saat login
- redirect auth salah host
- `/api/health` gagal setelah deploy
- queue support teknis hilang atau kosong total tanpa sebab
- role melihat menu/aksi yang jelas salah dan berisiko

## Catatan Bukti

Saat validasi, simpan bukti minimum:

1. screenshot halaman login
2. screenshot dashboard admin
3. screenshot dashboard `NOC`
4. screenshot landing `support`
5. screenshot `/api/health` atau output `verify:health`
6. catatan timestamp keputusan `GO / PILOT / ROLLBACK`

Gunakan template siap-isi berikut agar bukti teknis, validasi per role, dan sign-off PIC tercatat dalam satu dokumen:

- [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)

## Penutup

Prinsip Senin:

1. jangan tambah scope baru saat hari-H
2. prioritaskan kestabilan `Pemasaran dan Pelayanan`
3. bila ragu antara `GO` dan `ROLLBACK`, pilih stabilitas lebih dulu
