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
- Health check path: `/api/health`
- Container start command: default dari `Dockerfile`

## Required Environment Variables

Ambil baseline dari `apps/web/.env.production.example`.

- `APP_DATA_MODE=review-db`
- `AUTH_SESSION_SECRET=<secret-production-yang-kuat>`
- `DATABASE_URL=<mysql-connection-string-production>`
- `REVIEW_DB_CONNECT_TIMEOUT_MS=3000`
- `PORT=3000`

## Optional Environment Variables

- `BOOTSTRAP_MOCK_AUTH_CREDENTIALS=`
  - Kosongkan untuk production.
  - Jangan dipakai pada environment live kecuali benar-benar untuk mode review terbatas.

## Coolify Form Reference

- Application Type: `Dockerfile`
- Port Exposes: `3000`
- Health Check Path: `/api/health`
- Docker Build Location: `./Dockerfile`
- Base Directory / Build Context: repository root `.`
- Branch: `main`

## Field-by-Field

Isi form Coolify dengan urutan berikut:

1. **Repository**
   - pilih GitHub repo `perkasa-erp-oss-bss`
2. **Branch**
   - isi `main`
3. **Build Pack**
   - pilih `Dockerfile`
4. **Dockerfile Location**
   - isi `./Dockerfile`
5. **Base Directory**
   - isi `.`
6. **Port Exposes**
   - isi `3000`
7. **Health Check Path**
   - isi `/api/health`
8. **Environment Variables**
   - copy dari `apps/web/.env.production.example`
9. **Domain**
   - isi setelah deploy awal berhasil bila ingin pakai domain custom

## Deploy Steps

1. Buat project baru di Coolify.
2. Pilih source dari GitHub dan arahkan ke repo `perkasa-erp-oss-bss`.
3. Pilih branch `main`.
4. Pilih build pack `Dockerfile`.
5. Set `Dockerfile Location` ke `./Dockerfile`.
6. Set health check ke `/api/health`.
7. Isi environment variables production mengikuti `apps/web/.env.production.example`.
8. Deploy pertama.

## Notes

- Aplikasi dijalankan dari `apps/web` dengan output Next.js `standalone`.
- `Dockerfile` sudah melakukan:
  - `npm ci`
  - `npm run build`
  - menjalankan `node server.js` dari hasil standalone build
- Image juga sudah memiliki `HEALTHCHECK` internal ke `/api/health`
- Jika nanti butuh domain custom atau reverse proxy rules, konfigurasi itu dilakukan di level Coolify, bukan di repo ini.
- Health endpoint production akan gagal (`503`) bila:
  - `AUTH_SESSION_SECRET` belum valid
  - mode data masih fallback/mock
  - review DB belum siap

## Pre-Deploy Env Checklist

- `AUTH_SESSION_SECRET` harus secret acak yang kuat, bukan placeholder.
- `DATABASE_URL` harus menunjuk MySQL production/review yang benar.
- `APP_DATA_MODE` harus `review-db`.
- `BOOTSTRAP_MOCK_AUTH_CREDENTIALS` harus tetap kosong di production.
- Jika perlu, validasi file env lebih dulu dengan:

```bash
cd apps/web
node ./scripts/verify-production-env.mjs .env.production
```

## After First Deploy

- Buka `/api/health` dan pastikan `ok: true`.
- Verifikasi login/session cookie berjalan normal.
- Verifikasi koneksi MySQL production dari `DATABASE_URL`.
- Cek route utama:
  - `/dashboard`
  - `/inventory`
  - `/support`
  - `/billing`
- Kalau domain sudah siap, jalankan verifikasi runtime:

```bash
cd apps/web
node ./scripts/verify-server-runtime.mjs --health-url https://<domain-anda>/api/health --skip-pm2 --skip-local-login
```
