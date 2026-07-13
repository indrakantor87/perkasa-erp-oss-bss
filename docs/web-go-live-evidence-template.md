# Template Bukti Eksekusi Go-Live

## Tujuan

Dokumen ini dipakai untuk mencatat hasil rehearsal server-side atau hari-H dalam
format yang konsisten, sehingga PIC deploy, PIC validasi, dan pengambil keputusan
bisa membaca bukti yang sama sebelum menetapkan `GO`, `PILOT TERBATAS`, atau
`ROLLBACK`.

Dokumen ini melengkapi:

1. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
2. [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md)
3. [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md)

Catatan:

- Untuk snapshot teknis awal, gunakan `npm run collect:go-live-evidence` lalu tempel/ringkas hasilnya ke template ini.

## Metadata Eksekusi

| Item | Isi |
|---|---|
| tanggal | `................` |
| waktu mulai | `................` |
| waktu selesai | `................` |
| tipe kegiatan | `rehearsal / hari-H` |
| server / host | `................` |
| domain | `................` |
| commit deploy | `................` |
| rollback commit | `................` |
| PIC deploy | `................` |
| PIC database | `................` |
| PIC validasi admin | `................` |
| PIC validasi support | `................` |
| PIC validasi sales-CS | `................` |
| PIC keputusan | `................` |

## Ringkasan Status

| Area | Status | Catatan Singkat |
|---|---|---|
| env production | `pass / fail` | `................` |
| build | `pass / fail` | `................` |
| PM2 | `pass / fail` | `................` |
| Nginx / domain | `pass / fail` | `................` |
| health check | `pass / fail` | `................` |
| login admin | `pass / fail` | `................` |
| login support | `pass / fail` | `................` |
| validasi sales-CS | `pass / partial / fail` | `................` |
| keputusan akhir | `go / pilot / rollback` | `................` |

## Bukti Teknis

### 1. Kandidat Rilis

| Item | Hasil |
|---|---|
| `git status --short` | `................` |
| `git log -1 --oneline` | `................` |
| branch aktif | `................` |
| working tree bersih | `ya / tidak` |

### 2. Env Production

| Item | Hasil |
|---|---|
| `APP_DATA_MODE=review-db` | `ya / tidak` |
| `AUTH_SESSION_SECRET` terisi | `ya / tidak` |
| `DATABASE_URL` mengarah ke target benar | `ya / tidak` |
| `PORT=3000` | `ya / tidak` |
| helper env rehearsal dipakai | `ya / tidak` |
| `verify:production-env` | `pass / fail` |

### 3. Build dan Runtime

| Item | Hasil |
|---|---|
| `npm install` | `pass / fail` |
| `npm run check` | `pass / fail` |
| `npm run test:smoke` | `pass / fail` |
| `npm run build` | `pass / fail` |
| PM2 status | `online / fail` |
| restart loop | `ya / tidak` |
| error fatal di log awal | `ya / tidak` |

### 4. Reverse Proxy dan Health

| Item | Hasil |
|---|---|
| `nginx -t` | `pass / fail` |
| reload Nginx | `pass / fail` |
| `verify:server-runtime` | `pass / fail` |
| localhost `/login` | `pass / fail` |
| domain `/login` | `pass / fail` |
| `verify:health` | `pass / fail` |
| ringkasan output health | `................` |

## Bukti Browser Minimum

| Bukti | Lokasi / Catatan |
|---|---|
| screenshot halaman login | `................` |
| screenshot dashboard admin | `................` |
| screenshot dashboard NOC / support | `................` |
| screenshot landing support | `................` |
| output `web-server-runtime-check.json` | `................` |
| output `verify:health` | `................` |
| bukti write-side support | `lihat web-support-write-side-proof-2026-07-13.md / catatan mutation proof hari-H` |

## Validasi Per Role

### `SUPER_ADMIN`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| dashboard terbuka | `pass / fail` | `................` |
| `sales` terbuka | `pass / fail` | `................` |
| `support` terbuka | `pass / fail` | `................` |
| `billing` terbuka | `pass / fail` | `................` |
| `inventory` terbuka | `pass / fail` | `................` |
| `hr` terbuka | `pass / fail` | `................` |
| logout berhasil | `pass / fail` | `................` |

### `NOC_OPERATOR`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| dashboard scope NOC benar | `pass / fail` | `................` |
| menu support terbuka | `pass / fail` | `................` |
| queue teknis tampil | `pass / fail` | `................` |
| KPI tidak jatuh ke Penjualan | `pass / fail` | `................` |

### `TT_OPERATOR`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| landing support terbuka | `pass / fail` | `................` |
| lane TT tampil | `pass / fail` | `................` |
| aksi TT dasar dapat diakses | `pass / fail` | `................` |

### `DISMANTLE_OPERATOR`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| flow support dismantle terbuka | `pass / fail` | `................` |
| queue / riwayat terbaca | `pass / fail` | `................` |
| guard role sesuai | `pass / fail` | `................` |
| bukti `close / reopen` tersedia | `pass / partial / fail` | `................` |

### `SALES_MARKETING`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| `sales` dan `customers` terbuka | `pass / fail` | `................` |
| dashboard sesuai role | `pass / fail` | `................` |
| list kerja marketing tampil | `pass / fail` | `................` |

### `CS_OPERATOR`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| domain lintas utama terbuka | `pass / fail` | `................` |
| dashboard sesuai role | `pass / fail` | `................` |
| list kerja operator tampil | `pass / fail` | `................` |

### `CS_ADMIN`

| Check | Hasil | Catatan |
|---|---|---|
| login berhasil | `pass / fail` | `................` |
| dashboard supervisor terbuka | `pass / fail` | `................` |
| domain lintas utama terbuka | `pass / fail` | `................` |
| queue supervisor terbaca | `pass / fail` | `................` |
| bukti `restore / transfer / reopen` supervisor | `pass / partial / fail` | `................` |

## Temuan, Risiko, dan Tindakan

| Kategori | Isi |
|---|---|
| blocker kritis | `................` |
| temuan minor | `................` |
| workaround sementara | `................` |
| keputusan tindak lanjut | `................` |

## Keputusan Akhir

| Opsi | Dipilih | Alasan |
|---|---|---|
| `GO` | `ya / tidak` | `................` |
| `PILOT TERBATAS` | `ya / tidak` | `................` |
| `ROLLBACK` | `ya / tidak` | `................` |

## Sign-Off PIC

| Peran | Nama | Status | Catatan |
|---|---|---|---|
| PIC Deploy | `................` | `setuju / tunda / tolak` | `................` |
| PIC Database | `................` | `setuju / tunda / tolak` | `................` |
| PIC Validasi Admin | `................` | `setuju / tunda / tolak` | `................` |
| PIC Validasi Support | `................` | `setuju / tunda / tolak` | `................` |
| PIC Validasi Sales-CS | `................` | `setuju / tunda / tolak` | `................` |
| PIC Keputusan | `................` | `setuju / tunda / tolak` | `................` |
