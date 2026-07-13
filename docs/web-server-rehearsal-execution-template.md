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
| 7 | proof pack orchestrator | `npm run capture:server-proof-pack -- --type rehearsal --server "$(hostname)" --domain <domain> --rollback-commit <rollback-commit> --health-url http://127.0.0.1:3000/api/health --stamp <YYYYMMDD-HHMMSS> --output-dir docs/go-live --reverse-proxy-config /etc/nginx/sites-available/perkasa-erp-web.conf --reverse-proxy-server-name <domain> --reverse-proxy-upstream http://127.0.0.1:3000 --reverse-proxy-test-command "sudo nginx -t" --reverse-proxy-reload-command "sudo systemctl reload nginx"` | `........` | `........` | `pass / fail` | `jalur utama` |
| 8 | evaluator keputusan teknis | `npm run evaluate:server-readiness -- --proof-dir docs/go-live --stamp <YYYYMMDD-HHMMSS>` | `........` | `........` | `ready / partial / rollback-recommended` | `baca sebelum sign-off` |
| 8 | reverse proxy validator manual | `npm run verify:reverse-proxy -- --config /etc/nginx/sites-available/perkasa-erp-web.conf --server-name <domain> --expected-upstream http://127.0.0.1:3000 --test-command "sudo nginx -t" --reload-command "sudo systemctl reload nginx" --output docs/web-reverse-proxy-check.json` | `........` | `........` | `pass / fail` | `opsional bila tidak memakai jalur utama` |
| 9 | runtime validator manual | `npm run verify:server-runtime -- --pm2-app perkasa-erp-web --health-url http://127.0.0.1:3000/api/health --domain <domain> --output docs/web-server-runtime-check.json` | `........` | `........` | `pass / fail` | `opsional bila tidak memakai jalur utama` |
| 10 | runtime report manual | `npm run render:server-runtime-report -- --input docs/web-server-runtime-check.json --output docs/web-server-runtime-report.md` | `........` | `........` | `pass / fail` | `opsional bila tidak memakai jalur utama` |
| 11 | evidence collector manual | `npm run collect:go-live-evidence -- --type rehearsal --server "$(hostname)" --domain <domain> --health-url http://127.0.0.1:3000/api/health --rollback-commit <rollback-commit> --output docs/web-go-live-evidence-generated.md` | `........` | `........` | `pass / fail` | `opsional bila tidak memakai jalur utama` |

## Artefak Yang Harus Tersedia

| Artefak | Lokasi | Status | Catatan |
|---|---|---|---|
| reverse proxy JSON | `docs/go-live/web-reverse-proxy-check.<stamp>.json` | `ada / tidak` | `................` |
| runtime JSON | `docs/go-live/web-server-runtime-check.<stamp>.json` | `ada / tidak` | `................` |
| runtime report markdown | `docs/go-live/web-server-runtime-report.<stamp>.md` | `ada / tidak` | `................` |
| evidence markdown | `docs/go-live/web-go-live-evidence-generated.<stamp>.md` | `ada / tidak` | `................` |
| keputusan teknis JSON | `docs/go-live/web-server-technical-decision.<stamp>.json` | `ada / tidak` | `................` |
| keputusan teknis markdown | `docs/go-live/web-server-technical-decision.<stamp>.md` | `ada / tidak` | `................` |
| screenshot login | `................` | `ada / tidak` | `................` |
| screenshot dashboard admin | `................` | `ada / tidak` | `................` |
| screenshot dashboard support | `................` | `ada / tidak` | `................` |

## Ringkasan Hasil

| Area | Status | Catatan |
|---|---|---|
| env | `pass / fail` | `................` |
| build | `pass / fail` | `................` |
| PM2 | `pass / fail` | `................` |
| reverse proxy | `pass / fail` | `................` |
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
