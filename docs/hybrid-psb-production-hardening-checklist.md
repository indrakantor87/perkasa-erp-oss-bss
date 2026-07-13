# Hybrid PSB Production Hardening Checklist

Dokumen ini dipakai setelah batch production inti `Web PSB` berhasil `PASS` di review DB lokal. Fokusnya bukan lagi membuka adapter baru, tetapi memastikan hasil migration, workspace web, dan alur operator benar-benar cukup stabil sebelum cutover bertahap dilakukan.

Dokumen ini melengkapi:

1. [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
2. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
3. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)

## Scope Hardening

- hasil migration production `Web PSB` yang sudah lulus
- workspace web yang akan memakai data hasil migration
- role operator fondasi `Pemasaran dan Pelayanan`
- deploy, smoke test, rollback, dan guardrail operasional

## Batch Production yang Wajib Sudah Lulus

Semua item ini harus punya bukti `PASS` sebelum hardening dinyatakan boleh lanjut ke cutover:

- [x] `PROD-WEBPSB-TICKET-001`
- [x] `PROD-WEBPSB-SUPPORT-CORE-001`
- [x] `PROD-WEBPSB-TTPHOTO-001`
- [x] `Wave 2 production mini-batch`
- [x] `PROD-WEBPSB-USER-001`
- [x] `PROD-WEBPSB-TTMASTER-001`
- [x] `PROD-WEBPSB-PRIORITY-001`
- [x] `PROD-WEBPSB-WATPL-001`

## 1. Hardening Data Migration

- [ ] jumlah row staging, imported, dan linked final untuk batch production terakhir sudah direkap di dokumen readiness
- [ ] known exception source production sudah tercatat eksplisit, termasuk orphan `ticketId=3008` pada `TroubleTicketPhoto`
- [ ] master/helper final yang baru tidak menyisakan row `INVALID`
- [ ] helper `WhatsappTemplate` final hanya memiliki satu default aktif
- [ ] master `Priority` final konsisten dengan badge warna operasional yang dipakai web
- [ ] katalog `TroubleTicketMaster` final konsisten untuk `ONT`, `PROBLEM_CATEGORY`, dan `RESOLUTION_ACTION`
- [ ] role/division hasil `User production` tidak menghasilkan scope dashboard yang salah

## 2. Hardening Workspace dan Flow Web

### Fokus Role

Role yang wajib di-hardening lebih dulu:

1. `SUPER_ADMIN`
2. `NOC_OPERATOR`
3. `TT_OPERATOR`
4. `DISMANTLE_OPERATOR`
5. `SALES_MARKETING`
6. `CS_OPERATOR`
7. `CS_ADMIN`

### Checklist Inti

- [x] dashboard per role membaca scope divisi yang benar untuk role fondasi yang sudah diverifikasi (`SUPER_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, `SALES_MARKETING`, `CS_OPERATOR`)
- [x] `List Kerja` menjadi workspace utama role, bukan sekadar pelengkap
- [ ] deep-link lintas `billing -> isolation -> TT/SLA -> dismantle -> supervisor` tetap konsisten
- [x] lane support tidak menampilkan action yang salah untuk mikro-role
- [x] queue `Transfer atau Restore`, `Perlu Koreksi`, dan `Queue Risiko Tinggi` terbaca benar oleh `CS_ADMIN`
- [x] queue `TT`, `SLA`, `Isolir`, dan `Dismantle` tetap konsisten setelah data production dimuat
- [x] fallback error dan hint operator tetap informatif saat data tertentu kosong atau belum sinkron

## 3. Hardening Write-Side dan Guardrail

- [x] write action penting minimal sudah diuji manual untuk:
  - restore isolir
  - transfer ke dismantle
  - reopen dismantle
- [x] mutation proof terkontrol sudah dijalankan untuk `update TT teknis` (progress/escalate/close) pada review DB.
- [x] mutation proof terkontrol sudah dijalankan untuk `update port/ODP` (assign/status) pada review DB.
- [x] role tanpa capability tidak melihat tombol write-side sensitif
- [x] audit trail minimal untuk keputusan berisiko tinggi sudah punya proof executable untuk `restore/transfer/reopen` melalui note builder dan smoke guard
- [ ] tidak ada aksi yang masih memaksa operator kembali ke web lama untuk flow fondasi

## 4. Hardening UAT Operasional

- [x] checklist UAT `Pemasaran dan Pelayanan` diulang dengan data review DB terbaru
- [x] bukti UAT `SALES_MARKETING` mencakup login, landing `/sales`, sidebar role, dan guard CTA utama
- [x] bukti UAT `CS_OPERATOR` mencakup login, landing `List Kerja`, dan perpindahan lintas sales/customers/support/inventory
- [ ] bukti UAT `CS_ADMIN` mencakup koreksi, approval, restore, dan handoff supervisor
- [ ] bukti UAT `NOC_OPERATOR` dan `TT_OPERATOR` mencakup queue teknis yang benar-benar berisi
- [x] bukti UAT `DISMANTLE_OPERATOR` mencakup login, landing lane dismantle, queue aktif, histori, dan guard role sempit
- [ ] semua temuan UAT dibedakan menjadi:
  - blocker cutover
  - aman ditahan untuk pilot
  - backlog pasca-go-live

## 5. Hardening Deploy dan Observability

- [x] `npm run check`
- [x] `npm run test:smoke`
- [x] `npm run build`
- [x] `npm run verify:production-env -- .env`
- [x] `npm run verify:health -- http://127.0.0.1:3000/api/health`
- [ ] PM2, reverse proxy, dan env final sudah sesuai runbook hosting
- [ ] backup DB, commit rollback, dan smoke log pasca-deploy sudah dipersiapkan
- [ ] owner validasi bisnis dan owner keputusan `go / pilot / rollback` sudah ditunjuk

## 5A. Bukti UAT Role Prioritas 2026-07-13

| Role | Hasil UAT | Bukti Positif | Blocker / Catatan |
|---|---|---|---|
| `DISMANTLE_OPERATOR` | `pass` | login berhasil, landing ke `/support/dismantle`, queue dan histori terlihat, guard lane mikro-role tampak benar | finalisasi close/reopen masih perlu bukti write-side formal |
| `CS_OPERATOR` | `pass` | login berhasil, landing ke `List Kerja`, sidebar sesuai role, lintas `sales/customers/support/inventory` terbuka | bukti write-side end-to-end masih perlu diformalisasi |
| `CS_ADMIN` | `pass` | login berhasil, workspace supervisor `/customers/cs-admin` terbuka, bucket `Perlu Approval`, `Perlu Koreksi`, `Transfer atau Restore`, dan `Queue Risiko Tinggi` terbaca valid | bukti write-side koreksi/approval/restore masih perlu diformalisasi, tetapi blocker query ambigu sudah tertutup |
| `SALES_MARKETING` | `partial` | login berhasil, landing ke `/sales`, sidebar sesuai role, monitoring `support/inventory` tetap baca-saja | CTA `Import Center` sebelumnya misleading; sudah dihapus dari shell sales agar sinkron dengan guard route |

## 6. Keputusan Hardening

### Siap ke Cutover

Masuk status ini bila:

1. seluruh batch production inti sudah `PASS`
2. role fondasi tidak lagi punya blocker data migration
3. UAT ulang hanya menyisakan gap minor yang bisa dipantau saat pilot
4. deploy checklist dan rollback checklist sudah siap

### Tahan di Hardening

Tetap di status ini bila:

1. ada mismatch data final vs workspace web
2. queue role fondasi masih kosong/tidak terbaca dengan benar
3. write-side berisiko tinggi belum teruji
4. rollback plan belum cukup jelas

## 7. Output Wajib Sebelum Cutover

Sebelum pindah ke cutover, pastikan artefak ini sudah ada dan terbarui:

1. [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
2. [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
3. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
4. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
5. [web-support-write-side-proof-2026-07-13.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-support-write-side-proof-2026-07-13.md)
