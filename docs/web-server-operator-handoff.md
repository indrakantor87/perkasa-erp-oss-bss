# Handoff Operator Server

## Tujuan

Dokumen ini adalah lembar handoff paling ringkas untuk PIC deploy / operator host
nyata saat rehearsal server-side atau hari-H. Fokusnya hanya pada:

1. input yang wajib diisi
2. command utama yang perlu dijalankan
3. artefak output yang harus dicek
4. keputusan akhir `GO / PILOT / ROLLBACK`

Dokumen ini melengkapi:

1. [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md)
2. [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md)
3. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
4. [web-backup-rollback-proof-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-backup-rollback-proof-template.md)

## Isi Dulu

```bash
export APP_DIR=/path/to/perkasa-erp-oss-bss/apps/web
export DOMAIN=erp.example.com
export HEALTH_URL=http://127.0.0.1:3000/api/health
export ROLLBACK_COMMIT=<isi-commit-stabil>
export BACKUP_DIR=/var/backups/perkasa-erp
export PROOF_STAMP=$(date +"%Y%m%d-%H%M%S")
```

## Cek Cepat Sebelum Deploy

Pastikan semua ini sudah siap:

1. file `.env` production nyata sudah ada di server
2. DB target bisa diakses
3. backup DB dan backup `.env` sudah dibuat
4. commit deploy dan `ROLLBACK_COMMIT` sudah dicatat
5. PM2 dan Nginx sudah terpasang

## Command Utama

```bash
cd "$APP_DIR"
npm install
npm run verify:production-env -- .env
npm run check
npm run test:smoke
npm run build
pm2 start ecosystem.config.cjs
pm2 save

npm run capture:server-proof-pack -- \
  --type hari-H \
  --server "$(hostname)" \
  --domain "$DOMAIN" \
  --rollback-commit "$ROLLBACK_COMMIT" \
  --health-url "$HEALTH_URL" \
  --stamp "$PROOF_STAMP" \
  --output-dir docs/go-live \
  --reverse-proxy-config /etc/nginx/sites-available/perkasa-erp-web.conf \
  --reverse-proxy-server-name "$DOMAIN" \
  --reverse-proxy-upstream http://127.0.0.1:3000 \
  --reverse-proxy-test-command "sudo nginx -t" \
  --reverse-proxy-reload-command "sudo systemctl reload nginx"
```

## Output Wajib

Setelah command utama selesai, cek file berikut:

1. `docs/go-live/web-reverse-proxy-check.$PROOF_STAMP.json`
2. `docs/go-live/web-server-runtime-check.$PROOF_STAMP.json`
3. `docs/go-live/web-server-runtime-report.$PROOF_STAMP.md`
4. `docs/go-live/web-go-live-evidence-generated.$PROOF_STAMP.md`

Jika salah satu file tidak terbentuk, status teknis dianggap belum lengkap.

## Browser Minimum

Setelah paket bukti server-side selesai, jalankan validasi minimum:

1. login `admin.perkasa`
2. buka dashboard admin
3. login `support.ops`
4. buka support dashboard / lane
5. logout kembali ke `/login`

Simpan screenshot:

1. halaman login
2. dashboard admin
3. dashboard support / NOC
4. landing support

## Checklist Operator

| Item | Status | Catatan |
|---|---|---|
| backup DB dan `.env` selesai | `pass / fail` | `................` |
| `verify:production-env` lulus | `pass / fail` | `................` |
| `npm run build` lulus | `pass / fail` | `................` |
| PM2 `online` | `pass / fail` | `................` |
| `capture:server-proof-pack` exit `0` | `pass / fail` | `................` |
| domain `/login` terbuka | `pass / fail` | `................` |
| login admin lulus | `pass / fail` | `................` |
| login support lulus | `pass / fail` | `................` |
| screenshot minimum terkumpul | `pass / fail` | `................` |

## Keputusan Cepat

| Opsi | Kapan Dipilih |
|---|---|
| `GO` | semua check teknis lulus dan validasi role fondasi tidak punya blocker |
| `PILOT TERBATAS` | teknis lulus, support teknis lulus, tetapi sales/CS masih ada gap minor yang bisa ditahan |
| `ROLLBACK` | health gagal, domain gagal, login gagal, atau queue inti hilang / tidak terbaca |

## Jika Gagal

Jalankan rollback cepat:

```bash
cd "$APP_DIR"
git checkout "$ROLLBACK_COMMIT"
npm install
npm run build
pm2 restart perkasa-erp-web
npm run verify:health -- "$HEALTH_URL"
```

Lalu isi:

1. [web-backup-rollback-proof-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-backup-rollback-proof-template.md)
2. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)

## Sign-Off

| Peran | Nama | Status | Catatan |
|---|---|---|---|
| PIC Deploy | `................` | `setuju / tunda / tolak` | `................` |
| PIC Database | `................` | `setuju / tunda / tolak` | `................` |
| PIC Validasi Support | `................` | `setuju / tunda / tolak` | `................` |
| PIC Validasi Sales-CS | `................` | `setuju / tunda / tolak` | `................` |
| PIC Keputusan | `................` | `setuju / tunda / tolak` | `................` |
