# Coolify Deploy Guide

Panduan ini menyiapkan `perkasa-erp-oss-bss` agar bisa dideploy ke Coolify memakai `Dockerfile` di root repo.

## Source

- Repository: `https://github.com/indrakantor87/perkasa-erp-oss-bss.git`
- Branch: `main`
- Build method: `Dockerfile`
- Dockerfile path: `./Dockerfile`
- Build context: `.`

## Runtime

- Exposed port container: `3000`
- Public port di Coolify: biarkan otomatis
- Health check path: `/`

## Required Environment Variables

Ambil baseline dari `apps/web/.env.example`.

- `APP_DATA_MODE=review-db`
- `AUTH_SESSION_SECRET=<secret-production-yang-kuat>`
- `DATABASE_URL=<mysql-connection-string-production>`
- `REVIEW_DB_CONNECT_TIMEOUT_MS=1500`

## Optional Environment Variables

- `BOOTSTRAP_MOCK_AUTH_CREDENTIALS=`
  - Kosongkan untuk production.
  - Jangan dipakai pada environment live kecuali benar-benar untuk mode review terbatas.

## Deploy Steps

1. Buat project baru di Coolify.
2. Pilih source dari GitHub dan arahkan ke repo `perkasa-erp-oss-bss`.
3. Pilih branch `main`.
4. Pilih build pack `Dockerfile`.
5. Set `Dockerfile Location` ke `./Dockerfile`.
6. Isi environment variables production.
7. Deploy pertama.

## Notes

- Aplikasi dijalankan dari `apps/web` dengan output Next.js `standalone`.
- `Dockerfile` sudah melakukan:
  - `npm ci`
  - `npm run build`
  - menjalankan `node server.js` dari hasil standalone build
- Jika nanti butuh domain custom atau reverse proxy rules, konfigurasi itu dilakukan di level Coolify, bukan di repo ini.

## After First Deploy

- Verifikasi login/session cookie berjalan normal.
- Verifikasi koneksi MySQL production dari `DATABASE_URL`.
- Cek route utama:
  - `/dashboard`
  - `/inventory`
  - `/support`
  - `/billing`
- Kalau dibutuhkan, langkah berikutnya adalah menambahkan:
  - health endpoint khusus
  - checklist go-live env production
  - proof script pasca deploy
