# Web Hosting Runbook

## Tujuan

Dokumen ini menjadi panduan eksekusi hosting untuk web ERP agar proses deploy Senin bisa dilakukan dengan langkah yang konsisten, minim improvisasi, dan mudah di-rollback jika ada masalah.

## Artefak yang Dipakai

- App: `apps/web`
- Env template local/review: `apps/web/.env.example`
- Env template production: `apps/web/.env.production.example`
- PM2 config: `apps/web/ecosystem.config.cjs`
- Health check: `/api/health`
- Checklist final: `docs/web-hosting-readiness-checklist.md`

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
4. Jalankan `npm run check`.
5. Jalankan `npm run test:smoke`.
6. Jalankan `npm run build`.
7. Jalankan `pm2 start ecosystem.config.cjs`.
8. Simpan config PM2 dengan `pm2 save`.
9. Arahkan Nginx ke port app (`3000`).
10. Verifikasi `http://127.0.0.1:3000/api/health` dan domain final.

## Command Operasional PM2

```bash
cd /path/to/perkasa-erp-oss-bss/apps/web
pm2 start ecosystem.config.cjs
pm2 restart perkasa-erp-web
pm2 status
pm2 logs perkasa-erp-web --lines 200
pm2 save
```

## Contoh Nginx

```nginx
server {
    listen 80;
    server_name erp.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

## Verifikasi Pasca Deploy

- `curl http://127.0.0.1:3000/api/health`
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
6. Ulangi verifikasi `/api/health` dan login admin.

## Catatan Penting

- App production memakai `node .next/standalone/server.js`, bukan `next start`.
- Auth redirect sudah mengandalkan host request nyata, jadi reverse proxy wajib meneruskan header `Host`, `X-Forwarded-Host`, dan `X-Forwarded-Proto`.
- Jangan pakai secret session default development saat production.
