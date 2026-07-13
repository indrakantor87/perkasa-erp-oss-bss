# Web Hosting Readiness Checklist

## Tujuan

Dokumen ini dipakai sebagai checklist final sebelum mulai hosting web ERP pada hari Senin. Fokusnya adalah memastikan aplikasi web sudah stabil, environment production jelas, dan langkah deploy bisa dijalankan tanpa improvisasi besar.

## Scope

- App web Next.js di `apps/web`
- Database review/final yang dipakai web
- Environment variable production
- Build, runtime, akses role, dan smoke test pasca-deploy

## 1. Freeze Scope

- [ ] Tidak ada fitur besar baru yang masuk setelah kandidat rilis final Minggu malam
- [ ] Hanya bug fix, polishing ringan, atau penyesuaian deploy yang masih diperbolehkan
- [ ] `VERSION`, `CHANGELOG.md`, dan `docs/prd-web-checklist.md` sudah sinkron dengan batch terakhir

## 2. Code Readiness

- [x] `npm run check` lulus di `apps/web`
- [x] `npm run test:smoke` lulus di `apps/web`
- [x] `npm run build` lulus di `apps/web`
- [ ] Tidak ada diagnostics TypeScript/lint blocker pada file inti
- [x] Dashboard utama, domain pages, auth, dan KPI custom sudah diverifikasi manual

## 3. Environment Readiness

- [ ] Semua env production sudah diinventaris
- [ ] URL aplikasi production sudah ditentukan
- [ ] Konfigurasi auth/session production sudah disiapkan
- [ ] Konfigurasi koneksi database production sudah disiapkan
- [x] Secret sensitif tidak disimpan di repo
- [ ] File env production berada di lokasi aman dan hanya bisa diakses pihak yang berwenang

## 4. Database Readiness

- [ ] Database target hosting sudah aktif dan bisa diakses dari server app
- [ ] Schema yang dibutuhkan web sudah tersedia
- [ ] Tabel KPI custom dan audit terkait sudah tersedia
- [ ] User DB production memiliki permission minimum yang diperlukan
- [ ] Backup database sebelum cutover sudah disiapkan
- [ ] Template bukti backup/rollback sudah siap diisi
- [ ] Query dashboard dan domain review sudah diuji pada data target

## 5. Infra Readiness

- [ ] Server hosting sudah ditentukan
- [ ] Node.js version target sudah sesuai dengan kebutuhan app
- [x] Process manager sudah dipilih, misalnya PM2 atau service manager lain
- [x] Reverse proxy sudah ditentukan, misalnya Nginx
- [ ] Domain/subdomain sudah disiapkan
- [ ] SSL/TLS sudah siap
- [ ] Folder log dan strategi rotasi log sudah ditentukan

## 6. Deploy Readiness

- [ ] Strategi deploy sudah dipilih: staging dulu atau langsung production
- [x] Script install, build, start, dan restart service sudah jelas
- [x] Command start production dikunci ke mode standalone (`node .next/standalone/server.js`)
- [x] Health check endpoint atau halaman verifikasi pasca-deploy sudah ditentukan (`/api/health`)
- [x] Validator env production, script reverse proxy verification, dan script health verification sudah tersedia
- [x] Rollback plan sudah disiapkan jika deploy gagal
- [ ] PIC deploy dan PIC validasi bisnis sudah ditentukan

## 7. Functional Validation

- [x] Login berhasil untuk role utama
- [x] Dashboard utama terbuka tanpa error
- [ ] `Dashboard Operasional` dan `KPI Proses` menampilkan data serta hint KPI dengan benar
- [x] Modul Sales dapat dibuka dan landing role `SALES_MARKETING` sudah terverifikasi
- [x] Modul Support dapat dibuka dan focus lane berjalan
- [ ] Modul Billing dapat dibuka dan focus overdue/nominal berjalan
- [ ] Modul HR dapat dibuka dan attendance drilldown berjalan
- [x] Modul Inventory dapat dibuka dan request/movement drilldown berjalan
- [ ] Panel KPI custom manager dapat dibuka untuk role yang berwenang

## 8. Security and Access

- [ ] RBAC diuji minimal untuk `SUPER_ADMIN`, manager, dan operator domain utama
- [ ] Route sensitif tidak bisa diakses tanpa session
- [x] Action/menu khusus yang misleading untuk workspace `CS & Admin CS`, `Digital Creator`, `Teknisi *`, `Legal`, `Kantor`, dan `Toko` sudah dipersempit ke role target pada batch `0.65.99`
- [ ] Session timeout dan cookie setting production sudah diverifikasi

## 9. Post-Deploy Checks

- [ ] Aplikasi bisa dibuka dari domain final
- [ ] Tidak ada error fatal pada server log setelah boot
- [ ] Tidak ada error fatal pada browser console untuk halaman utama
- [ ] Response awal dashboard masih dalam batas yang dapat diterima
- [ ] Smoke flow pasca-deploy lulus
- [ ] PIC bisnis menyetujui bahwa aplikasi siap dipakai lanjut

## 10. Go-Live Decision

- [ ] Semua checklist wajib di atas sudah hijau
- [ ] Risiko yang tersisa sudah dicatat
- [ ] Keputusan `go / no-go` disepakati sebelum switch penuh

## Catatan Verifikasi Saat Ini

- `npm run start` berhasil menyalakan server standalone lokal dan endpoint `/api/health` merespons normal.
- Rehearsal lokal juga memverifikasi mode `NODE_ENV=production` untuk standalone server dan memastikan `verify-health` tetap lulus saat `AUTH_SESSION_SECRET` terisi, sehingga health benar-benar merepresentasikan readiness hosting production.
- Helper `npm run prepare:production-rehearsal-env -- --source .env --target .env.rehearsal.local --port 3011` kini tersedia agar rehearsal bisa memakai secret sementara yang valid tanpa mengubah `.env` utama.
- Helper `npm run collect:go-live-evidence -- ...` kini tersedia untuk mengumpulkan snapshot teknis server-side ke file markdown sebelum PIC melengkapi screenshot dan sign-off.
- Helper `npm run verify:server-runtime -- ...` kini tersedia untuk memberi status tegas `pass/fail` pada PM2, `verify:health`, dan probe `/login` localhost/domain sebelum evidence hari-H dikumpulkan.
- Helper `npm run verify:reverse-proxy -- ...` kini tersedia untuk membuktikan file config Nginx aktif memakai `server_name` yang benar, `proxy_pass` ke `127.0.0.1:3000`, header proxy inti tersedia, serta `nginx -t` dan reload dapat direkam ke JSON.
- Helper `npm run collect:go-live-evidence -- ...` kini juga dapat menyerap otomatis output `web-reverse-proxy-check.json` dan `web-server-runtime-check.json`, sehingga evidence markdown hari-H tidak lagi perlu merangkum ulang dua file tersebut secara manual.
- Helper `npm run render:server-runtime-report -- ...` dan template [web-server-rehearsal-execution-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-rehearsal-execution-template.md) kini tersedia agar hasil runtime JSON langsung berubah menjadi report markdown yang siap dibaca PIC deploy.
- Template [web-backup-rollback-proof-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-backup-rollback-proof-template.md) kini tersedia agar bukti backup DB, backup env, dan rollback pasca-failover tidak lagi hanya berupa catatan lepas.
- Smoke browser `admin.perkasa` dan `support.ops` berhasil login, masuk dashboard, dan logout tanpa lagi terkena redirect `0.0.0.0`.
- Scope dashboard KPI untuk role `NOC` sudah kembali sinkron ke `Pemasaran dan Pelayanan / NOC`, tidak jatuh ke default `Penjualan`.
- Runbook hosting, PM2 config, dan contoh reverse proxy kini tersedia di `docs/web-hosting-runbook.md` dan `apps/web/ecosystem.config.cjs`.
- Validator `npm run verify:production-env -- .env` dan checker `npm run verify:health -- http://127.0.0.1:3000/api/health` sudah tersedia untuk tahap deploy.
- Checklist hari-H untuk keputusan `go / pilot / rollback` kini tersedia di `docs/web-go-live-cutover-checklist.md`.
- Template env final dan checklist rehearsal deploy kini tersedia di `apps/web/.env.production.final.template` dan `docs/web-deploy-rehearsal-checklist.md`.
- Bootstrap mock auth tidak lagi menyimpan password plaintext di source; jalur review lokal kini memakai `BOOTSTRAP_MOCK_AUTH_CREDENTIALS` dari environment sehingga repo lebih aman untuk cutover.
- UAT role prioritas terbaru mengonfirmasi `DISMANTLE_OPERATOR`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, dan `SALES_MARKETING` lulus pada scope fondasi lokal; blocker query supervisor ambigu untuk `CS_ADMIN` dan blocker auth `NOC_OPERATOR` sudah tertutup.

## Catatan Eksekusi Senin

- Jalankan deploy pada jam yang dampaknya paling aman
- Siapkan 1 sesi khusus untuk verifikasi teknis
- Siapkan 1 sesi khusus untuk verifikasi bisnis cepat setelah deploy
- Hindari perubahan scope saat proses hosting sedang berlangsung
