# Hybrid PSB Production Readiness 2026-07-11

Dokumen ini merangkum status readiness hybrid migration `Web PSB` setelah jalur support production inti, `TroubleTicketPhoto`, `User`, `TroubleTicketMaster`, `Priority`, dan `WhatsappTemplate` berhasil divalidasi nyata di review DB lokal.

## Ringkasan Eksekutif

- Status umum: `GO-HARDENING`
- Makna:
  - jalur operasional inti `Web PSB` yang paling penting untuk cutover bertahap sudah punya bukti production path nyata
  - adapter auth, master support, dan helper template yang sebelumnya menjadi gap sudah berhasil ditutup
  - pekerjaan berikutnya paling bernilai bukan membuka batch baru, tetapi hardening operasional, rekap cutover, dan disiplin release
- Risiko utama yang tersisa:
  - UAT lintas divisi dan validasi alur operator riil masih perlu dipadatkan ke checklist cutover
  - beberapa perubahan UI/domain workspace di repo masih berjalan paralel, sehingga commit migration harus tetap terisolasi
  - deploy, rollback, backup, dan guardrail pasca-go-live masih perlu difinalkan per lingkungan

## Jalur Production yang Sudah Tervalidasi Nyata

### 1. Ticket Split Production

- Batch: `PROD-WEBPSB-TICKET-001`
- Status: `PASS`
- Target final:
  - `crm_customers`
  - `crm_customer_addresses`
  - `sales_orders`
  - `service_subscriptions`
  - `service_work_orders`
- Catatan:
  - package exception production diketahui dan sudah didokumentasikan
  - dedupe customer memakai `nama + phone`

### 2. Support Core Production

- Batch: `PROD-WEBPSB-SUPPORT-CORE-001`
- Status: `PASS`
- Target final:
  - `support_trouble_tickets`
  - `support_isolations`
  - `support_dismantle_queue`
  - `support_dismantle_history`
- Catatan:
  - `DismantleHistory` perlu dedupe natural key
  - terdapat `1` queue orphan yang ditutup aman lewat isolation sintetis minimum

### 3. TroubleTicketPhoto Production

- Batch: `PROD-WEBPSB-TTPHOTO-001`
- Status: `PASS`
- Target final:
  - `support_trouble_ticket_photos`
- Catatan:
  - `3673` row imported
  - `8` row orphan `ticketId=3008` didokumentasikan sebagai known source exception

### 4. Wave 2 Production Mini-Batch

- Status: `PASS`
- Domain:
  - `CoveredArea`
  - `MarketingActivity`
  - `psb_odp`
  - bootstrap `network_odp_ports`
  - `TroubleTicketSla`
- Makna:
  - jalur sales coverage, activity, ODP header, ODP port, dan SLA TT sudah punya bukti production path

### 5. User Production

- Batch: `PROD-WEBPSB-USER-001`
- Status: `PASS`
- Target final:
  - `auth_roles`
  - `org_divisions`
  - `auth_users`
- Catatan:
  - `31` row imported
  - mapping konservatif `legacy_role` dan `legacy_division` sudah dibekukan dari data production nyata
  - semua assertion linkage final lulus

### 6. TroubleTicketMaster Production

- Batch: `PROD-WEBPSB-TTMASTER-001`
- Status: `PASS`
- Target final:
  - `support_trouble_ticket_masters`
- Catatan:
  - `47` row imported
  - distribusi final: `ONT=11`, `PROBLEM_CATEGORY=22`, `RESOLUTION_ACTION=14`
  - katalog `kind/value` final sudah siap dipakai untuk parity dropdown support

### 7. Priority Production

- Batch: `PROD-WEBPSB-PRIORITY-001`
- Status: `PASS`
- Target final:
  - `master_priorities`
- Catatan:
  - `3` row imported
  - seluruh warna badge final tervalidasi nyata dari source production

### 8. WhatsappTemplate Production

- Batch: `PROD-WEBPSB-WATPL-001`
- Status: `PASS`
- Target final:
  - `helper_whatsapp_templates`
- Catatan:
  - `3` row imported
  - `1` template default aktif berhasil dipertahankan di final helper

## Jalur yang Sudah Punya Bukti Cukup untuk Cutover Bertahap

- `Ticket` production ke domain customer/order/service
- `Isolation`, `Dismantle`, `TroubleTicket`, `TroubleTicketPhoto`
- `TroubleTicketSla`
- `User`
- `TroubleTicketMaster`
- `Priority`
- `WhatsappTemplate`
- `CoveredArea`
- `MarketingActivity`
- `network_odp`
- `network_odp_ports`

## Gap yang Masih Tersisa

### Gap 1. Hardening Operasional

- satukan acceptance checklist lintas support, billing, sales, dan supervisor
- validasi ulang alur operator nyata pada workspace baru yang sedang berkembang paralel di repo
- pastikan fallback error, audit trail, dan handoff antar-lane konsisten pada web baru

### Gap 2. Cutover dan Deploy

- tetapkan checklist backup, rollback, dan smoke test pasca-deploy
- sinkronkan release note final dengan batch production yang sudah lulus
- pastikan strategi go-live bertahap per divisi tetap realistis terhadap kapasitas tim operator

## Keputusan Tahap Berikutnya

### Fokus Berikutnya yang Direkomendasikan: Hardening dan Cutover

Alasan:

1. jalur batch produksi yang paling bernilai sudah tervalidasi nyata
2. risiko terbesar sekarang berpindah dari data migration ke kesiapan operasional dan deployment
3. penguatan UI/workspace lintas divisi sedang aktif, sehingga perlu dipastikan sinkron dengan hasil import production yang sudah lulus
4. release berikutnya akan lebih bernilai bila membawa rekap readiness dan commit migration yang rapi

## Urutan Kerja yang Disarankan Setelah Dokumen Ini

1. rekap final semua batch production yang sudah `PASS`
2. commit/push terisolasi batch `TroubleTicketMaster + Priority + WhatsappTemplate`
3. turunkan checklist hardening operasional lintas divisi
4. susun checklist cutover dan smoke test production bertahap

## Dokumen Pelaksana Berikutnya

- [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
- [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
- [hybrid-psb-role-hardening-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-role-hardening-plan.md)
- [hybrid-psb-go-live-timeline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-go-live-timeline.md)
- [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
- [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
