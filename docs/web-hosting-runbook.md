# Web Hosting Runbook

## Tujuan

Dokumen ini menjadi panduan eksekusi hosting untuk web ERP agar proses deploy Senin bisa dilakukan dengan langkah yang konsisten, minim improvisasi, dan mudah di-rollback jika ada masalah.

## Artefak yang Dipakai

- App: `apps/web`
- Env template local/review: `apps/web/.env.example`
- Env template production: `apps/web/.env.production.example`
- Env template final: `apps/web/.env.production.final.template`
- PM2 config: `apps/web/ecosystem.config.cjs`
- Env validator: `apps/web/scripts/verify-production-env.mjs`
- Health verifier: `apps/web/scripts/verify-health.mjs`
- Rehearsal helper: `apps/web/scripts/rehearse-production.mjs`
- Health check: `/api/health`
- Checklist final: `docs/web-hosting-readiness-checklist.md`
- Checklist hari-H: `docs/web-go-live-cutover-checklist.md`
- Checklist rehearsal: `docs/web-deploy-rehearsal-checklist.md`

## Prasyarat Server

- Node.js 20 atau lebih baru
- PM2 terpasang global
- Nginx terpasang sebagai reverse proxy
- Database target sudah bisa diakses dari server aplikasi
- File env production nyata sudah tersedia di server dan tidak disimpan di repo

## Variabel Wajib Production

- `APP_DATA_MODE=review-db`
- `AUTH_SESSION_SECRET=<secret acak kuat>`
- `DATABASE_URL=<koneksi mysql target>`
- `REVIEW_DB_CONNECT_TIMEOUT_MS=3000`
- `PORT=3000`

## Langkah Deploy

1. Masuk ke folder project dan pastikan branch/commit kandidat rilis sudah benar.
2. Salin env production ke `apps/web/.env`.
3. Jalankan `npm install` di `apps/web`.
4. Jalankan `npm run verify:production-env -- .env`.
5. Jalankan `npm run check`.
6. Jalankan `npm run test:smoke`.
7. Jalankan `npm run build`.
8. Jalankan `pm2 start ecosystem.config.cjs`.
9. Simpan config PM2 dengan `pm2 save`.
10. Arahkan Nginx ke port app (`3000`) memakai `docs/nginx/perkasa-erp-web.conf`.
11. Jalankan `npm run verify:health -- http://127.0.0.1:3000/api/health`.
12. Verifikasi domain final.

## Command Operasional PM2

```bash
cd /path/to/perkasa-erp-oss-bss/apps/web
pm2 start ecosystem.config.cjs
pm2 restart perkasa-erp-web
pm2 status
pm2 logs perkasa-erp-web --lines 200
pm2 save
```

## Command Validasi

```bash
cd /path/to/perkasa-erp-oss-bss/apps/web
npm run verify:production-env -- .env
npm run verify:health -- http://127.0.0.1:3000/api/health
npm run rehearse:production -- .env --port 3011
```

## Command Rehearsal Otomatis

Gunakan command berikut bila ingin mengulang preflight production secara end-to-end tanpa menjalankan tiap langkah manual:

```bash
cd /path/to/perkasa-erp-oss-bss/apps/web
npm run rehearse:production -- .env --port 3011
```

Script ini akan menjalankan:

1. `verify:production-env`
2. `npm run check`
3. `npm run test:smoke`
4. `npm run build`
5. start `node .next/standalone/server.js` dalam mode production
6. `verify:health` ke port rehearsal

## Contoh Nginx

- File siap-tempel tersedia di `docs/nginx/perkasa-erp-web.conf`.
- Ganti `server_name` sesuai domain final sebelum dipasang di server.

## Verifikasi Pasca Deploy

- `npm run verify:health -- http://127.0.0.1:3000/api/health`
- Login `admin.perkasa` berhasil
- Login `support.ops` berhasil
- Dashboard terbuka
- Modul `sales`, `support`, `billing`, `inventory`, dan `hr` bisa diakses
- Logout kembali ke `/login`

## Rollback Plan

1. Siapkan minimal satu commit kandidat stabil sebelum deploy.
2. Jika deploy gagal, `git checkout <commit-stabil>`.
3. Jalankan ulang `npm install` bila lockfile/dependency berubah.
4. Jalankan `npm run build`.
5. Jalankan `pm2 restart perkasa-erp-web`.
6. Jalankan `npm run verify:health -- http://127.0.0.1:3000/api/health`.
7. Ulangi login admin.

## Catatan Penting

- App production memakai `node .next/standalone/server.js`, bukan `next start`.
- Auth redirect sudah mengandalkan host request nyata, jadi reverse proxy wajib meneruskan header `Host`, `X-Forwarded-Host`, dan `X-Forwarded-Proto`.
- Jangan pakai secret session default development saat production.
