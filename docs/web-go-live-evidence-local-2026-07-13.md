# Bukti Go-Live Lokal 2026-07-13

## Tujuan

Dokumen ini merangkum snapshot evidence lokal terbaru sebelum rehearsal server-side
atau hari-H. Fokusnya adalah memberi bahan keputusan cepat untuk status `GO`,
`PILOT TERBATAS`, atau `TAHAN` berdasarkan bukti teknis, proof write-side, dan
UAT role prioritas yang sudah benar-benar dijalankan di instance lokal.

## Metadata Eksekusi

| Item | Isi |
|---|---|
| tanggal | `2026-07-13` |
| tipe kegiatan | `snapshot lokal pra-go-live` |
| host | `localhost:3000` |
| branch | `main` |
| commit kandidat saat snapshot | `ca8c4e7` |
| status repo | `working tree bersih` |
| sumber data | `Review DB` |

## Ringkasan Status

| Area | Status | Catatan Singkat |
|---|---|---|
| repo kandidat rilis | `pass` | `git status --short` bersih dan branch aktif `main` |
| check dan smoke | `pass` | `npm run check` dan `npm run test:smoke` lulus pada batch terakhir |
| health lokal | `pass` | `npm run verify:health -- http://127.0.0.1:3000/api/health` lulus |
| auth hybrid | `pass` | fallback mock sudah diperketat; UI tidak lagi mengekspos password bootstrap |
| write-side support prioritas | `pass` | seluruh flow prioritas sudah punya mutation proof before/after |
| UAT role prioritas | `partial` | `TT_OPERATOR`, `DISMANTLE_OPERATOR`, `CS_OPERATOR`, `CS_ADMIN` sudah positif; `NOC_OPERATOR` masih tertahan kredensial |
| keputusan lokal | `pilot-ready dengan blocker` | teknis lokal kuat, tetapi `NOC_OPERATOR` belum bisa dinyatakan lulus penuh |

## Bukti Teknis

### Kandidat Rilis

| Item | Hasil |
|---|---|
| `git status --short` | kosong |
| `git log -1 --oneline` | `ca8c4e7 Update technical role UAT evidence` |
| branch aktif | `main` |
| working tree bersih | `ya` |

### Health Lokal

| Item | Hasil |
|---|---|
| URL health | `http://127.0.0.1:3000/api/health` |
| `verify:health` | `pass` |
| env | `development` |
| effective data source | `review-db` |
| fallback | `tidak` |
| catatan | `AUTH_SESSION_SECRET` masih warning development, bukan blocker lokal |

## Bukti Write-Side Prioritas

Semua flow berisiko tinggi yang diprioritaskan pada fase ini sudah memiliki
mutation proof terkontrol dengan evidence before/after:

| Flow | Status | Bukti |
|---|---|---|
| `restore isolir` | `pass` | [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md) |
| `transfer ke dismantle` | `pass` | [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md) |
| `reopen dismantle` | `pass` | [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md) |
| `update TT teknis` | `pass` | [tt-progress-PV-PKN-07.2026-01.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/tt-progress-PV-PKN-07.2026-01.json), [tt-escalate-PV-PKN-07.2026-01.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/tt-escalate-PV-PKN-07.2026-01.json), [tt-close-PV-PKN-07.2026-01.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/tt-close-PV-PKN-07.2026-01.json) |
| `update port/ODP` | `pass` | [odp-assign-TRKL-07-15-8.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/odp-assign-TRKL-07-15-8.json), [odp-status-TRKL-07-15-8.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/odp-status-TRKL-07-15-8.json) |

## Validasi Role Prioritas

| Role | Status | Bukti Positif | Blocker / Catatan |
|---|---|---|---|
| `DISMANTLE_OPERATOR` | `pass` | login dan lane dismantle tampil, queue aktif dan histori terbaca | flow write-side sudah didukung mutation proof |
| `TT_OPERATOR` | `pass` | login via `tt.review`, landing `/support/tt`, source `Review DB`, lane `Trouble Open` berisi `4` | screenshot lokal tersedia pada sesi UAT |
| `NOC_OPERATOR` | `blocked` | akun `support.ops` terdeteksi ada pada seed review DB | login browser masih `invalid_credentials`, sehingga queue teknis belum bisa diverifikasi dari sesi role NOC |
| `CS_OPERATOR` | `pass` | `List Kerja` menjadi landing utama dan lintas domain utama terbuka | proof write-side supervisor bukan scope role ini |
| `CS_ADMIN` | `pass` | workspace supervisor terbuka, bucket risiko tinggi/approval/koreksi terbaca | bukti UAT approval formal masih bisa diperdalam |
| `SALES_MARKETING` | `partial` | landing sales dan sidebar role sesuai, CTA misleading sudah dibersihkan | masih belum menjadi role penentu `GO` penuh |

## Temuan dan Risiko

| Kategori | Isi |
|---|---|
| blocker utama | kredensial `NOC_OPERATOR` (`support.ops`) belum valid pada instance lokal, sehingga UAT browser role NOC belum bisa ditutup penuh |
| minor | beberapa area cutover infra production masih berupa checklist operasional hari-H (`PM2`, `Nginx`, backup DB, PIC keputusan) |
| workaround | gunakan paket evidence ini sebagai baseline `pilot-ready`, lalu tutup login NOC segera setelah password review DB valid tersedia |
| backlog pasca-go-live | role di luar scope fondasi seperti `DIGITAL_CREATOR` dan business `Toko` tetap dicatat sebagai gelombang berikutnya |

## Keputusan Snapshot

| Opsi | Status | Alasan |
|---|---|---|
| `GO` | `belum` | karena `NOC_OPERATOR` belum lulus browser UAT dan cutover infra production belum dijalankan |
| `PILOT TERBATAS` | `layak dipertimbangkan` | fondasi support dan CS sudah jauh lebih stabil, write-side prioritas sudah punya proof, dan TT/dismantle/CS sudah menunjukkan hasil positif |
| `TAHAN` | `masih valid bila disiplin` | dipilih jika password `support.ops` belum tersedia atau jika bukti deploy production belum lengkap |

## Rekomendasi Lanjut

1. tutup blocker `NOC_OPERATOR` dengan kredensial review DB yang valid lalu ulang UAT browser role NOC
2. salin ringkasan ini ke [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md) saat rehearsal server-side atau hari-H
3. finalisasi checklist deploy production: `PM2`, `Nginx`, backup DB, rollback commit, dan PIC keputusan
