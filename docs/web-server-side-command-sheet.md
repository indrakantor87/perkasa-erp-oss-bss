# Server-Side Command Sheet

## Tujuan

Dokumen ini adalah lembar eksekusi ringkas untuk rehearsal server-side atau hari-H
agar PIC deploy bisa menyalin command tanpa harus meloncat antara runbook,
checklist readiness, dan checklist cutover.

Dokumen ini melengkapi:

1. [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md)
2. [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md)
3. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
4. [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)

## Sebelum Mulai

Isi placeholder berikut dulu:

```bash
export APP_DIR=/path/to/perkasa-erp-oss-bss/apps/web
export DOMAIN=erp.example.com
export HEALTH_URL=http://127.0.0.1:3000/api/health
export ROLLBACK_COMMIT=<isi-commit-stabil>
```

Catatan kandidat saat dokumen ini diperbarui:

1. kandidat release saat ini: `975cbfe`
2. kandidat aplikasi fondasi lokal 100%: `32dc210`
3. rollback stabil: `11baf11`

Pastikan:

1. file env production nyata sudah siap di server
2. PM2 dan Nginx sudah terpasang
3. database target bisa diakses dari server

## 1. Validasi Kandidat Rilis

```bash
cd "$APP_DIR"
git status --short
git log -1 --oneline
git rev-parse --abbrev-ref HEAD
```

Checklist cepat:

1. working tree bersih
2. branch dan commit sesuai kandidat rilis
3. rollback commit sudah dicatat

## 2. Pasang Env Production

```bash
cd "$APP_DIR"
cp .env.production.final.template .env
nano .env
cat .env | grep -E '^(APP_DATA_MODE|PORT|REVIEW_DB_CONNECT_TIMEOUT_MS)='
```

Checklist cepat:

1. `APP_DATA_MODE=review-db`
2. `AUTH_SESSION_SECRET` sudah diisi secret nyata
3. `DATABASE_URL` sudah mengarah ke DB target
4. `PORT=3000`

## 3. Preflight Aplikasi

```bash
cd "$APP_DIR"
npm install
npm run verify:production-env -- .env
npm run check
npm run test:smoke
npm run build
```

Jika ingin satu command yang lebih ringkas:

```bash
cd "$APP_DIR"
npm run rehearse:production -- .env --port 3011
```

Catatan:

1. command rehearsal otomatis cocok untuk preflight tambahan
2. PM2 dan Nginx tetap harus diverifikasi manual

Jika ingin rehearsal aman tanpa mengubah `.env` utama:

```bash
cd "$APP_DIR"
npm run prepare:production-rehearsal-env -- --source .env --target .env.rehearsal.local --port 3011
npm run rehearse:production -- .env.rehearsal.local --port 3011
rm -f .env.rehearsal.local
```

Checklist cepat:

1. file `.env.rehearsal.local` hanya dipakai sementara untuk rehearsal
2. `AUTH_SESSION_SECRET` generated tidak dipakai untuk production final
3. `.env` utama tetap dipertahankan untuk PM2 / deploy asli

## 4. Start PM2

```bash
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs perkasa-erp-web --lines 100
pm2 save
```

Checklist cepat:

1. status `online`
2. tidak ada loop restart
3. log awal tidak menunjukkan error fatal

## 5. Pasang / Reload Nginx

Contoh file: [perkasa-erp-web.conf](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/nginx/perkasa-erp-web.conf)

```bash
sudo cp "$APP_DIR/../../docs/nginx/perkasa-erp-web.conf" /etc/nginx/sites-available/perkasa-erp-web.conf
sudo nano /etc/nginx/sites-available/perkasa-erp-web.conf
sudo ln -sf /etc/nginx/sites-available/perkasa-erp-web.conf /etc/nginx/sites-enabled/perkasa-erp-web.conf
sudo nginx -t
sudo systemctl reload nginx
```

Checklist cepat:

1. `server_name` sudah diganti ke domain final
2. `proxy_pass` tetap ke `127.0.0.1:3000`
3. `nginx -t` lulus

## 6. Health Check Teknis

```bash
cd "$APP_DIR"
npm run verify:health -- "$HEALTH_URL"
curl -I "http://127.0.0.1:3000/login"
curl -I "https://$DOMAIN/login"
```

Checklist cepat:

1. `verify:health` lulus
2. login page merespons dari localhost
3. login page merespons dari domain final

## 6A. Kumpulkan Bukti Cepat

```bash
cd "$APP_DIR"
git status --short
git log -1 --oneline
pm2 status
pm2 logs perkasa-erp-web --lines 50
curl -s "$HEALTH_URL"
curl -I "https://$DOMAIN/login"
```

Simpan hasilnya ke dokumen:

1. [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)
2. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)

Jika ingin snapshot teknis otomatis dalam satu file:

```bash
cd "$APP_DIR"
npm run collect:go-live-evidence -- \
  --type hari-H \
  --server "$(hostname)" \
  --domain "$DOMAIN" \
  --health-url "$HEALTH_URL" \
  --rollback-commit "$ROLLBACK_COMMIT" \
  --output docs/web-go-live-evidence-generated.md
```

Checklist cepat:

1. file output berhasil dibuat
2. status `git`, `PM2`, `health`, dan probe `/login` terisi
3. hasil otomatis tetap dilengkapi dengan screenshot browser dan sign-off PIC

## 7. Smoke Browser Minimum

Urutan validasi minimum:

1. login `admin.perkasa`
2. buka dashboard admin
3. login `support.ops`
4. buka support dashboard / lane
5. logout kembali ke `/login`

Simpan bukti:

1. screenshot login
2. screenshot dashboard admin
3. screenshot dashboard support
4. output `verify:health`

Template pencatatan lengkap tersedia di:

- [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)

## 8. Rollback Cepat

Jika muncul blocker kritis:

```bash
cd "$APP_DIR"
git checkout "$ROLLBACK_COMMIT"
npm install
npm run build
pm2 restart perkasa-erp-web
npm run verify:health -- "$HEALTH_URL"
```

Rollback trigger utama:

1. login gagal
2. `/api/health` gagal
3. dashboard blank/crash
4. queue support teknis kosong total tanpa sebab

## 9. Catatan Eksekusi

Isi saat rehearsal / hari-H:

| Item | Isi |
|---|---|
| tanggal | `................` |
| server | `................` |
| domain | `................` |
| commit deploy | `................` |
| rollback commit | `................` |
| hasil PM2 | `pass / fail` |
| hasil Nginx | `pass / fail` |
| hasil health | `pass / fail` |
| hasil browser smoke | `pass / partial / fail` |
| keputusan | `go / pilot / rollback` |
