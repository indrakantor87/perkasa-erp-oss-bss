# Hybrid Wave 1 PSB Wave 1B Ticket Runbook

## Tujuan

Runbook ini dipakai untuk menguji batch `Wave 1B Ticket split`, yaitu jalur:

- `Ticket` legacy
- `staging_legacy_customer_records`
- `staging_legacy_order_records`
- `crm_customers`
- `crm_customer_addresses`
- `sales_orders`
- `service_subscriptions`
- `service_work_orders`

Scope runbook ini hanya untuk review DB lokal, bukan import production penuh.

## File yang Dipakai

- sample batch: [xampp_review_sample_import_wave_1b_ticket.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1b_ticket.sql)
- transform khusus batch ticket: [xampp_review_transform_wave_1b_ticket.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1b_ticket.sql)
- review query: [xampp_review_wave_1b_ticket_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_review_queries.sql)
- assertion query: [xampp_review_wave_1b_ticket_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_assertions.sql)
- runner Windows: [run-review-wave1b-ticket.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1b-ticket.ps1)

## Prasyarat

1. review DB `erp_isp_review` sudah ada
2. schema dasar dan staging import sudah pernah dijalankan
3. master seed minimum sudah tersedia:
   - `org_branches`
   - `sales_packages`
   - mapping package legacy
4. `mysql.exe` tersedia dan path-nya diketahui

## Mode Eksekusi

### Mode Paling Aman untuk DB Review yang Sudah Ada

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1b-ticket.ps1 -Mode Wave1BTicketOnly -MysqlPath "D:\xampp\mysql\bin\mysql.exe"
```

Jika MySQL memakai password:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1b-ticket.ps1 -Mode Wave1BTicketOnly -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -Password "PASSWORD_ANDA"
```

### Mode Bootstrap Penuh

Gunakan hanya jika review DB baru atau kosong:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1b-ticket.ps1 -Mode Full -MysqlPath "D:\xampp\mysql\bin\mysql.exe"
```

## Urutan SQL Manual

Jika tidak memakai runner, jalankan urutan ini:

1. `database/xampp_review_sample_import_wave_1b_ticket.sql`
2. `database/xampp_review_transform_wave_1b_ticket.sql`
3. `database/xampp_review_wave_1b_ticket_review_queries.sql`
4. `database/xampp_review_wave_1b_ticket_assertions.sql`

## Hasil yang Diharapkan

### Batch

- `SAMPLE-WEBPSB-TICKET-001` ada di `staging_import_batches`
- `import_scope = PSB_TICKET_SPLIT`
- `valid_rows = 4`

### Staging Customer

- ada 2 row customer
- masing-masing memiliki:
  - `target_customer_id`
  - `target_address_id`
  - `import_status = IMPORTED`

### Staging Order

- ada 2 row order
- masing-masing memiliki:
  - `target_customer_id`
  - `target_order_id`
  - `target_subscription_id`
  - `target_work_order_id`
  - `import_status = IMPORTED`

### Final Table

- `crm_customers` menerima 2 row baru
- `crm_customer_addresses` menerima 2 alamat utama
- `sales_orders` menerima 2 order
- `service_subscriptions` menerima:
  - 1 row `ACTIVE`
  - 1 row `PENDING`
- `service_work_orders` menerima:
  - 1 row `DONE`
  - 1 row `OPEN`

## Query Review

Review query lengkap sudah ada di:

- [xampp_review_wave_1b_ticket_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_review_queries.sql)

Query ini memeriksa:

- batch sample
- staging customer
- staging order
- final customer
- final address
- final order
- final subscription
- final work order

## Catatan

- sample ini sengaja memakai dua pola `Ticket`:
  - ticket yang sudah terpasang
  - ticket yang masih terjadwal
- tujuan utamanya adalah membuktikan bahwa satu source `Ticket` bisa dipecah ke banyak tabel final ERP tanpa jalur manual `@batch_id`
- runbook ini belum menyentuh `CoveredArea`, `MarketingActivity`, atau `network_odp_ports`, karena ketiganya berada pada tahap sesudah adapter `Ticket`

## Next Step

Setelah runbook ini lulus, langkah paling natural adalah:

1. jalankan assertion query `Wave 1B Ticket`
2. siapkan patch schema `Wave 1C` untuk coverage dan marketing activity
3. siapkan bootstrap native `network_odp_ports`
