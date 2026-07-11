# Hybrid PSB Production Readiness 2026-07-11

Dokumen ini merangkum status readiness hybrid migration `Web PSB` setelah jalur support production inti dan `TroubleTicketPhoto` berhasil divalidasi nyata di review DB lokal.

## Ringkasan Eksekutif

- Status umum: `PARTIAL-GO`
- Makna:
  - fondasi support production inti sudah tervalidasi nyata
  - sales/coverage/ODP production path utama sudah pernah dibuka
  - jalur berikutnya paling bernilai untuk cutover adalah `User production`
- Risiko utama yang tersisa:
  - translasi `legacy_role` dan `legacy_division` user belum dikunci dari data production nyata
  - beberapa adapter master legacy (`TroubleTicketMaster`, `Priority`, `WhatsappTemplate`) belum dibuka

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

## Jalur yang Sudah Punya Bukti Cukup untuk Cutover Bertahap

- `Ticket` production ke domain customer/order/service
- `Isolation`, `Dismantle`, `TroubleTicket`, `TroubleTicketPhoto`
- `TroubleTicketSla`
- `CoveredArea`
- `MarketingActivity`
- `network_odp`
- `network_odp_ports`

## Jalur yang Masih Menjadi Gap

### Gap 1. User Production

- Status mapping: `siap dibuka`, tetapi distribusi role/division production nyata belum dibekukan
- Target final:
  - `auth_roles`
  - `org_divisions`
  - `auth_users`
- Alasan menjadi prioritas berikutnya:
  - paling dekat ke kesiapan cutover operator nyata
  - low-risk secara data shape
  - langsung berdampak ke auth internal review DB

### Gap 2. Master Support Adapter

- `TroubleTicketMaster`
- `Priority`
- `WhatsappTemplate`
- Status:
  - bernilai untuk parity UX dan dropdown operasional
  - tidak sepenting `User production` untuk cutover awal

## Keputusan Batch Berikutnya

### Batch Berikutnya yang Direkomendasikan: User Production

Alasan:

1. paling langsung meningkatkan kesiapan operasional user nyata
2. schema staging dan transform final dasarnya sudah tersedia
3. dependency ke domain lain rendah
4. bisa dieksekusi setelah distribusi `role` dan `division` production diverifikasi dari data nyata

### Guardrail User Production

- jangan langsung memaksakan mapping `legacy_role` dan `legacy_division`
- lakukan extraction discovery lebih dulu
- kunci mapping berdasarkan distribusi nyata production
- setelah itu baru buka loader/transform/import user

## Urutan Kerja yang Disarankan Setelah Dokumen Ini

1. extraction discovery `User production`
2. audit distribusi `role` dan `division`
3. kunci mapping legacy -> ERP
4. buka batch `User production`
5. setelah user stabil, lanjut ke `TroubleTicketMaster` atau adapter master support lain
