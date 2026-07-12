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

- [ ] `PROD-WEBPSB-TICKET-001`
- [ ] `PROD-WEBPSB-SUPPORT-CORE-001`
- [ ] `PROD-WEBPSB-TTPHOTO-001`
- [ ] `Wave 2 production mini-batch`
- [ ] `PROD-WEBPSB-USER-001`
- [ ] `PROD-WEBPSB-TTMASTER-001`
- [ ] `PROD-WEBPSB-PRIORITY-001`
- [ ] `PROD-WEBPSB-WATPL-001`

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

- [ ] dashboard per role membaca scope divisi yang benar
- [ ] `List Kerja` menjadi workspace utama role, bukan sekadar pelengkap
- [ ] deep-link lintas `billing -> isolation -> TT/SLA -> dismantle -> supervisor` tetap konsisten
- [ ] lane support tidak menampilkan action yang salah untuk mikro-role
- [ ] queue `Transfer atau Restore`, `Perlu Koreksi`, dan `Queue Risiko Tinggi` terbaca benar oleh `CS_ADMIN`
- [ ] queue `TT`, `SLA`, `Isolir`, dan `Dismantle` tetap konsisten setelah data production dimuat
- [ ] fallback error dan hint operator tetap informatif saat data tertentu kosong atau belum sinkron

## 3. Hardening Write-Side dan Guardrail

- [ ] write action penting minimal sudah diuji manual:
  - restore isolir
  - transfer ke dismantle
  - reopen dismantle
  - update TT teknis
  - update port/ODP
- [ ] role tanpa capability tidak melihat tombol write-side sensitif
- [ ] audit trail minimal untuk keputusan berisiko tinggi masih terbaca
- [ ] tidak ada aksi yang masih memaksa operator kembali ke web lama untuk flow fondasi

## 4. Hardening UAT Operasional

- [ ] checklist UAT `Pemasaran dan Pelayanan` diulang dengan data review DB terbaru
- [ ] bukti UAT `SALES_MARKETING` mencakup lead, customer, coverage, order, dan queue marketing harian
- [ ] bukti UAT `CS_OPERATOR` mencakup perpindahan lintas sales/customers/support/inventory
- [ ] bukti UAT `CS_ADMIN` mencakup koreksi, approval, restore, dan handoff supervisor
- [ ] bukti UAT `NOC_OPERATOR` dan `TT_OPERATOR` mencakup queue teknis yang benar-benar berisi
- [ ] bukti UAT `DISMANTLE_OPERATOR` mencakup queue aktif, close, histori, dan reopen
- [ ] semua temuan UAT dibedakan menjadi:
  - blocker cutover
  - aman ditahan untuk pilot
  - backlog pasca-go-live

## 5. Hardening Deploy dan Observability

- [ ] `npm run check`
- [ ] `npm run test:smoke`
- [ ] `npm run build`
- [ ] `npm run verify:production-env -- .env`
- [ ] `npm run verify:health -- http://127.0.0.1:3000/api/health`
- [ ] PM2, reverse proxy, dan env final sudah sesuai runbook hosting
- [ ] backup DB, commit rollback, dan smoke log pasca-deploy sudah dipersiapkan
- [ ] owner validasi bisnis dan owner keputusan `go / pilot / rollback` sudah ditunjuk

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
