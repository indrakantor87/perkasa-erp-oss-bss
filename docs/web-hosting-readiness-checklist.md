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

- [ ] `npm run check` lulus di `apps/web`
- [ ] `npm run test:smoke` lulus di `apps/web`
- [ ] `npm run build` lulus di `apps/web`
- [ ] Tidak ada diagnostics TypeScript/lint blocker pada file inti
- [ ] Dashboard utama, domain pages, auth, dan KPI custom sudah diverifikasi manual

## 3. Environment Readiness

- [ ] Semua env production sudah diinventaris
- [ ] URL aplikasi production sudah ditentukan
- [ ] Konfigurasi auth/session production sudah disiapkan
- [ ] Konfigurasi koneksi database production sudah disiapkan
- [ ] Secret sensitif tidak disimpan di repo
- [ ] File env production berada di lokasi aman dan hanya bisa diakses pihak yang berwenang

## 4. Database Readiness

- [ ] Database target hosting sudah aktif dan bisa diakses dari server app
- [ ] Schema yang dibutuhkan web sudah tersedia
- [ ] Tabel KPI custom dan audit terkait sudah tersedia
- [ ] User DB production memiliki permission minimum yang diperlukan
- [ ] Backup database sebelum cutover sudah disiapkan
- [ ] Query dashboard dan domain review sudah diuji pada data target

## 5. Infra Readiness

- [ ] Server hosting sudah ditentukan
- [ ] Node.js version target sudah sesuai dengan kebutuhan app
- [ ] Process manager sudah dipilih, misalnya PM2 atau service manager lain
- [ ] Reverse proxy sudah ditentukan, misalnya Nginx
- [ ] Domain/subdomain sudah disiapkan
- [ ] SSL/TLS sudah siap
- [ ] Folder log dan strategi rotasi log sudah ditentukan

## 6. Deploy Readiness

- [ ] Strategi deploy sudah dipilih: staging dulu atau langsung production
- [ ] Script install, build, start, dan restart service sudah jelas
- [ ] Health check endpoint atau halaman verifikasi pasca-deploy sudah ditentukan
- [ ] Rollback plan sudah disiapkan jika deploy gagal
- [ ] PIC deploy dan PIC validasi bisnis sudah ditentukan

## 7. Functional Validation

- [ ] Login berhasil untuk role utama
- [ ] Dashboard utama terbuka tanpa error
- [ ] `Dashboard Operasional` dan `KPI Proses` menampilkan data serta hint KPI dengan benar
- [ ] Modul Sales dapat dibuka dan drilldown KPI berjalan
- [ ] Modul Support dapat dibuka dan focus lane berjalan
- [ ] Modul Billing dapat dibuka dan focus overdue/nominal berjalan
- [ ] Modul HR dapat dibuka dan attendance drilldown berjalan
- [ ] Modul Inventory dapat dibuka dan request/movement drilldown berjalan
- [ ] Panel KPI custom manager dapat dibuka untuk role yang berwenang

## 8. Security and Access

- [ ] RBAC diuji minimal untuk `SUPER_ADMIN`, manager, dan operator domain utama
- [ ] Route sensitif tidak bisa diakses tanpa session
- [ ] Action yang dibatasi permission tidak bocor di UI role yang salah
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

## Catatan Eksekusi Senin

- Jalankan deploy pada jam yang dampaknya paling aman
- Siapkan 1 sesi khusus untuk verifikasi teknis
- Siapkan 1 sesi khusus untuk verifikasi bisnis cepat setelah deploy
- Hindari perubahan scope saat proses hosting sedang berlangsung
