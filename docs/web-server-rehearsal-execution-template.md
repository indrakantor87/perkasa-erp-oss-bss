# Template Eksekusi Rehearsal Server

## Tujuan

Dokumen ini dipakai oleh PIC deploy untuk mencatat urutan eksekusi rehearsal server
secara real-time. Fokusnya bukan menggantikan checklist go-live, tetapi memastikan
command, durasi, hasil, dan keputusan per langkah tercatat rapi sebelum hari-H.

Dokumen ini melengkapi:

1. [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md)
2. [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md)
3. [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)

## Metadata

| Item | Isi |
|---|---|
| tanggal | `................` |
| host rehearsal | `................` |
| domain rehearsal | `................` |
| branch | `main / lainnya` |
| commit kandidat | `................` |
| rollback commit | `................` |
| PIC deploy | `................` |
| PIC validasi | `................` |

## Urutan Eksekusi

| No | Langkah | Command | Mulai | Selesai | Status | Catatan |
|---|---|---|---|---|---|---|
| 1 | masuk direktori app | `cd /path/to/perkasa-erp-oss-bss/apps/web` | `........` | `........` | `pass / fail` | `................` |
| 2 | validasi env | `npm run verify:production-env -- .env` | `........` | `........` | `pass / fail` | `................` |
| 3 | static check | `npm run check` | `........` | `........` | `pass / fail` | `................` |
| 4 | smoke test | `npm run test:smoke` | `........` | `........` | `pass / fail` | `................` |
| 5 | build | `npm run build` | `........` | `........` | `pass / fail` | `................` |
| 6 | start / restart PM2 | `pm2 startOrReload ecosystem.config.cjs --only perkasa-erp-web` | `........` | `........` | `pass / fail` | `................` |
| 7 | runtime validator | `npm run verify:server-runtime -- --pm2-app perkasa-erp-web --health-url http://127.0.0.1:3000/api/health --domain <domain> --output docs/web-server-runtime-check.json` | `........` | `........` | `pass / fail` | `................` |
| 8 | runtime report | `npm run render:server-runtime-report -- --input docs/web-server-runtime-check.json --output docs/web-server-runtime-report.md` | `........` | `........` | `pass / fail` | `................` |
| 9 | evidence collector | `npm run collect:go-live-evidence -- --type rehearsal --server "$(hostname)" --domain <domain> --health-url http://127.0.0.1:3000/api/health --rollback-commit <rollback-commit> --output docs/web-go-live-evidence-generated.md` | `........` | `........` | `pass / fail` | `................` |

## Artefak Yang Harus Tersedia

| Artefak | Lokasi | Status | Catatan |
|---|---|---|---|
| runtime JSON | `docs/web-server-runtime-check.json` | `ada / tidak` | `................` |
| runtime report markdown | `docs/web-server-runtime-report.md` | `ada / tidak` | `................` |
| evidence markdown | `docs/web-go-live-evidence-generated.md` | `ada / tidak` | `................` |
| screenshot login | `................` | `ada / tidak` | `................` |
| screenshot dashboard admin | `................` | `ada / tidak` | `................` |
| screenshot dashboard support | `................` | `ada / tidak` | `................` |

## Ringkasan Hasil

| Area | Status | Catatan |
|---|---|---|
| env | `pass / fail` | `................` |
| build | `pass / fail` | `................` |
| PM2 | `pass / fail` | `................` |
| health | `pass / fail` | `................` |
| localhost `/login` | `pass / fail` | `................` |
| domain `/login` | `pass / fail` | `................` |
| browser admin | `pass / fail` | `................` |
| browser support | `pass / fail` | `................` |
| keputusan rehearsal | `siap / ulang / tunda` | `................` |

## Temuan

| Kategori | Isi |
|---|---|
| blocker | `................` |
| temuan minor | `................` |
| tindakan ulang | `................` |

## Sign-Off

| Peran | Nama | Status | Catatan |
|---|---|---|---|
| PIC deploy | `................` | `setuju / tunda / tolak` | `................` |
| PIC validasi | `................` | `setuju / tunda / tolak` | `................` |
| PIC keputusan | `................` | `setuju / tunda / tolak` | `................` |
