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
- Reverse proxy verifier: `apps/web/scripts/verify-reverse-proxy.mjs`
- Runtime verifier: `apps/web/scripts/verify-server-runtime.mjs`
- Server proof pack orchestrator: `apps/web/scripts/capture-server-proof-pack.mjs`
- Runtime report renderer: `apps/web/scripts/render-server-runtime-report.mjs`
- Rehearsal env helper: `apps/web/scripts/prepare-production-rehearsal-env.mjs`
- Evidence collector: `apps/web/scripts/collect-go-live-evidence.mjs`
- Rehearsal helper: `apps/web/scripts/rehearse-production.mjs`
- Health check: `/api/health`
- Checklist final: `docs/web-hosting-readiness-checklist.md`
- Checklist hari-H: `docs/web-go-live-cutover-checklist.md`
- Checklist rehearsal: `docs/web-deploy-rehearsal-checklist.md`
- Command sheet server-side: `docs/web-server-side-command-sheet.md`
- Template backup/rollback: `docs/web-backup-rollback-proof-template.md`

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
2. Catat `commit deploy` dan `commit rollback` dari `git log -1 --oneline` / release sebelumnya.
3. Buat backup DB dan backup `.env` terlebih dahulu, lalu isi [web-backup-rollback-proof-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-backup-rollback-proof-template.md).
4. Salin env production ke `apps/web/.env`.
5. Jalankan `npm install` di `apps/web`.
6. Jalankan `npm run verify:production-env -- .env`.
7. Jalankan `npm run check`.
8. Jalankan `npm run test:smoke`.
9. Jalankan `npm run build`.
10. Jalankan `pm2 start ecosystem.config.cjs`.
11. Simpan config PM2 dengan `pm2 save`.
12. Arahkan Nginx ke port app (`3000`) memakai `docs/nginx/perkasa-erp-web.conf`.
13. Jalankan `npm run verify:reverse-proxy -- --config /etc/nginx/sites-available/perkasa-erp-web.conf --server-name <domain-final> --expected-upstream http://127.0.0.1:3000 --test-command "sudo nginx -t" --reload-command "sudo systemctl reload nginx" --output docs/web-reverse-proxy-check.json`.
14. Jalankan `npm run verify:health -- http://127.0.0.1:3000/api/health`.
15. Verifikasi domain final.

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
npm run verify:reverse-proxy -- --config /etc/nginx/sites-available/perkasa-erp-web.conf --server-name <domain-final> --expected-upstream http://127.0.0.1:3000 --test-command "sudo nginx -t" --reload-command "sudo systemctl reload nginx" --output docs/web-reverse-proxy-check.json
npm run verify:health -- http://127.0.0.1:3000/api/health
npm run prepare:production-rehearsal-env -- --source .env --target .env.rehearsal.local --port 3011
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

Jika `.env` utama belum memiliki `AUTH_SESSION_SECRET` yang aman untuk rehearsal lokal, buat env sementara:

```bash
cd /path/to/perkasa-erp-oss-bss/apps/web
npm run prepare:production-rehearsal-env -- --source .env --target .env.rehearsal.local --port 3011
npm run rehearse:production -- .env.rehearsal.local --port 3011
rm -f .env.rehearsal.local
```

Gunakan helper ini hanya untuk rehearsal. Production final tetap wajib memakai `.env` nyata yang dikelola operator server.

## Contoh Nginx

- File siap-tempel tersedia di `docs/nginx/perkasa-erp-web.conf`.
- Ganti `server_name` sesuai domain final sebelum dipasang di server.

## Verifikasi Pasca Deploy

- `npm run capture:server-proof-pack -- --type hari-H --server "$(hostname)" --domain <domain-final> --rollback-commit <commit-rollback> --health-url http://127.0.0.1:3000/api/health --stamp "$(date +"%Y%m%d-%H%M%S")" --output-dir docs/go-live --reverse-proxy-config /etc/nginx/sites-available/perkasa-erp-web.conf --reverse-proxy-server-name <domain-final> --reverse-proxy-upstream http://127.0.0.1:3000 --reverse-proxy-test-command "sudo nginx -t" --reverse-proxy-reload-command "sudo systemctl reload nginx"`
- `npm run verify:reverse-proxy -- --config /etc/nginx/sites-available/perkasa-erp-web.conf --server-name <domain-final> --expected-upstream http://127.0.0.1:3000 --test-command "sudo nginx -t" --reload-command "sudo systemctl reload nginx" --output docs/web-reverse-proxy-check.json`
- `npm run verify:health -- http://127.0.0.1:3000/api/health`
- `npm run verify:server-runtime -- --pm2-app perkasa-erp-web --health-url http://127.0.0.1:3000/api/health --domain <domain-final> --output docs/web-server-runtime-check.json`
- `npm run render:server-runtime-report -- --input docs/web-server-runtime-check.json --output docs/web-server-runtime-report.md`
- `npm run collect:go-live-evidence -- --type hari-H --server "$(hostname)" --domain <domain-final> --health-url http://127.0.0.1:3000/api/health --rollback-commit <commit-rollback> --output docs/web-go-live-evidence-generated.md`
- Login `admin.perkasa` berhasil
- Login `support.ops` berhasil
- Dashboard terbuka
- Modul `sales`, `support`, `billing`, `inventory`, dan `hr` bisa diakses
- Logout kembali ke `/login`

Catatan:

- `capture:server-proof-pack` adalah jalur tercepat untuk mengumpulkan paket bukti server-side karena ia menjalankan `verify:reverse-proxy`, `verify:server-runtime`, `render:server-runtime-report`, dan `collect:go-live-evidence` secara berurutan.
- Gunakan `--stamp` dan `--output-dir docs/go-live` agar artefak rehearsal / hari-H tersimpan terpisah dan tidak saling menimpa.
- Jika `docs/web-reverse-proxy-check.json` dan `docs/web-server-runtime-check.json` sudah dibuat di lokasi default, `collect:go-live-evidence` akan otomatis menyerap keduanya ke markdown evidence.

## Rollback Plan

1. Siapkan minimal satu commit kandidat stabil sebelum deploy dan tulis di [web-backup-rollback-proof-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-backup-rollback-proof-template.md).
2. Jika deploy gagal, `git checkout <commit-stabil>`.
3. Jalankan ulang `npm install` bila lockfile/dependency berubah.
4. Jalankan `npm run build`.
5. Jalankan `pm2 restart perkasa-erp-web`.
6. Jalankan `npm run verify:health -- http://127.0.0.1:3000/api/health`.
7. Ulangi login admin.
8. Jalankan ulang `npm run verify:reverse-proxy -- --config /etc/nginx/sites-available/perkasa-erp-web.conf --server-name <domain-final> --expected-upstream http://127.0.0.1:3000 --test-command "sudo nginx -t" --skip-reload --output docs/web-reverse-proxy-check.json`.
9. Catat hasil rollback, timestamp, health pasca-rollback, dan output reverse proxy ke template backup/rollback.

## Catatan Penting

- App production memakai `node .next/standalone/server.js`, bukan `next start`.
- Auth redirect sudah mengandalkan host request nyata, jadi reverse proxy wajib meneruskan header `Host`, `X-Forwarded-Host`, dan `X-Forwarded-Proto`.
- Jangan pakai secret session default development saat production.
