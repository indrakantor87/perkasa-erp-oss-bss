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
| commit kandidat saat snapshot | `batch 0.66.12 pada branch main` |
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
| UAT role prioritas | `pass` | `TT_OPERATOR`, `NOC_OPERATOR`, `DISMANTLE_OPERATOR`, `CS_OPERATOR`, `CS_ADMIN`, dan `SALES_MARKETING` seluruhnya sudah positif pada scope fondasi lokal |
| keputusan lokal | `fondasi lokal 100%` | teknis lokal kuat, seluruh role fondasi sudah lulus, dan sisa pekerjaan bergeser penuh ke cutover infra production serta rehearsal server-side |

## Bukti Teknis

### Kandidat Rilis

| Item | Hasil |
|---|---|
| `git status --short` | kosong |
| `git log -1 --oneline` | `lihat commit kandidat batch 0.66.12 terbaru pada branch main` |
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
| `NOC_OPERATOR` | `pass` | login `support.ops` berhasil, landing `/support/tt`, source `Review DB`, lane `Trouble Ticket` berisi `4`, dan menu `support/inventory` terbuka | password review DB lokal disejajarkan ulang secara terjaga; evidence reset tersimpan di [reset-review-auth-support-ops.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/reset-review-auth-support-ops.json) |
| `CS_OPERATOR` | `pass` | `List Kerja` menjadi landing utama dan lintas domain utama terbuka | proof write-side supervisor bukan scope role ini |
| `CS_ADMIN` | `pass` | login `cs.review` berhasil, workspace supervisor terbuka, bucket risiko tinggi/approval/koreksi terbaca, dan deep-link lintas domain berjalan | proof lokal supervisor tersedia di [cs-admin-supervisor-proof.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/docs/proofs/cs-admin-supervisor-proof.json) |
| `SALES_MARKETING` | `pass` | login `chalis@perkasa.net.id` berhasil, landing sales stabil, create lead awal berhasil, dan monitoring `support/inventory` berjalan sesuai role | batasan write inventory tetap read-only sesuai RBAC |

## Temuan dan Risiko

| Kategori | Isi |
|---|---|
| blocker utama | tidak ada blocker role fondasi pada instance lokal; fokus tersisa bergeser ke eksekusi cutover infra production (`PM2`, `Nginx`, backup DB, PIC keputusan) |
| minor | beberapa area cutover infra production masih berupa checklist operasional hari-H (`PM2`, `Nginx`, backup DB, PIC keputusan) |
| workaround | evidence reset auth lokal tersedia bila password seed review DB perlu disejajarkan ulang tanpa melemahkan auth aplikasi |
| backlog pasca-go-live | role di luar scope fondasi seperti `DIGITAL_CREATOR` dan business `Toko` tetap dicatat sebagai gelombang berikutnya |

## Keputusan Snapshot

| Opsi | Status | Alasan |
|---|---|---|
| `GO` | `belum` | cutover infra production belum dijalankan dan bukti server-side belum dikumpulkan |
| `PILOT TERBATAS` | `siap kuat` | fondasi lokal sudah penuh, write-side prioritas sudah punya proof, dan seluruh role fondasi lulus tanpa blocker auth |
| `TAHAN` | `opsional konservatif` | dipilih bila organisasi ingin menunggu rehearsal server-side lengkap meski blocker auth lokal sudah tertutup |

## Rekomendasi Lanjut

1. salin ringkasan ini ke [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md) saat rehearsal server-side atau hari-H
2. finalisasi checklist deploy production: `PM2`, `Nginx`, backup DB, rollback commit, dan PIC keputusan
3. lanjutkan pengayaan bukti role non-inti dan approval supervisor bila dibutuhkan sebelum `GO` penuh
