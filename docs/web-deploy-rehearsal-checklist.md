# Checklist Rehearsal Deploy

## Tujuan

Dokumen ini dipakai untuk latihan deploy sebelum hari Senin agar tim mengetahui:

1. urutan command yang benar di server
2. titik gagal yang paling mungkin muncul
3. durasi realistis dari build, boot, dan verifikasi awal

Dokumen ini melengkapi:

1. [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md)
2. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)

## Persiapan

- siapkan server uji atau slot deploy yang paling mendekati production
- siapkan file `.env` dari [`.env.production.final.template`](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.final.template)
- siapkan koneksi database target uji
- siapkan domain/subdomain sementara bila ada

## Command Rehearsal

```bash
cd /path/to/perkasa-erp-oss-bss/apps/web
npm install
npm run verify:production-env -- .env
npm run check
npm run test:smoke
npm run build
pm2 start ecosystem.config.cjs
pm2 status
npm run verify:health -- http://127.0.0.1:3000/api/health
```

## Checklist Teknis

- `npm install` selesai tanpa error (server)
- `npm run verify:production-env -- .env` lulus (server)
- `npm run check` lulus
- `npm run test:smoke` lulus
- `npm run build` lulus
- PM2 status `online` (server)
- `npm run verify:health -- http://127.0.0.1:3000/api/health` lulus (server)
- halaman login terbuka dari browser (server)

## Checklist Browser Minimum

- login `admin.perkasa` berhasil
- login `support.ops` berhasil
- dashboard admin terbuka
- dashboard support/NOC terbuka
- logout berhasil kembali ke `/login`

## Data yang Dicatat Saat Rehearsal

Isi catatan berikut setiap kali latihan:

| Item | Hasil |
|---|---|
| tanggal rehearsal | `................` |
| commit yang diuji | `................` |
| durasi `npm install` | `................` |
| durasi `npm run build` | `................` |
| durasi boot PM2 | `................` |
| hasil health check | `pass / fail` |
| hasil smoke browser | `pass / partial / fail` |
| isu yang ditemukan | `................` |
| keputusan | `siap / perlu perbaikan` |

### Catatan Rehearsal Lokal (Windows)

| Item | Hasil |
|---|---|
| tanggal rehearsal | `2026-07-13` |
| commit yang diuji | `bd0b6e3 (release: 0.65.94)` |
| durasi `npm install` | `N/A (tidak dijalankan di lokal)` |
| durasi `npm run build` | `compile 32.8s; TypeScript 29.9s; static pages 1.7s` |
| durasi boot PM2 | `N/A (pakai node standalone; Ready in 0ms)` |
| hasil health check | `pass (NODE_ENV=production; PORT=3011; verify-health lulus)` |
| hasil smoke browser | `N/A (belum diuji browser pada mode standalone)` |
| isu yang ditemukan | `N/A` |
| keputusan | `siap untuk lanjut rehearsal server (PM2 + Nginx)` |

## Kriteria Rehearsal Berhasil

Rehearsal dianggap berhasil jika:

1. seluruh checklist teknis lulus
2. login admin dan support lulus
3. tidak ada blocker kritis yang memaksa rollback

## Jika Rehearsal Gagal

- catat command dan error terakhir
- tentukan apakah masalah ada di env, database, build, PM2, atau Nginx
- perbaiki hanya blocker yang relevan
- ulangi rehearsal dari awal, bukan dari tengah
