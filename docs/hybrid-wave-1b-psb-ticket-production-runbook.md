# Wave 1B Ticket Production Runbook

Runbook ini dipakai untuk menyiapkan dan menjalankan jalur production `Wave 1B Ticket split` setelah batch sample `Wave 1B` sudah tervalidasi.

## Scope

- source production `Ticket`
- `staging_legacy_customer_records`
- `staging_legacy_order_records`
- `crm_customers`
- `crm_customer_addresses`
- `sales_orders`
- `service_subscriptions`
- `service_work_orders`

## File Yang Dipakai

- generator loader JSON -> SQL staging: [generate-wave1b-ticket-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1b-ticket-production-loader.mjs)
- transform production: [xampp_review_transform_wave1b_ticket_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1b_ticket_production.sql)
- review query: [xampp_review_wave1b_ticket_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_production_review_queries.sql)
- assertion query: [xampp_review_wave1b_ticket_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_production_assertions.sql)
- audit rerun tahap 2: [xampp_review_wave1b_ticket_stage2_rerun_audit.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_stage2_rerun_audit.sql)
- runner Windows: [run-review-wave1b-ticket-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1b-ticket-production.ps1)

## Input JSON

Simpan hasil extraction production sebagai:

```text
production-data/
  web-psb-wave1b/
    ticket.production.json
```

## Field Minimum JSON

Generator production Ticket toleran terhadap field opsional, tetapi field minimal yang sebaiknya ada pada setiap row adalah:

- `id`
- `customerName`
- `phoneNumber`
- `package`
- `requestDate`
- `installedDate`
- `marketingName`
- `teknisi`
- `locationMap`
- `status`
- `statusOrder`

Field opsional yang akan dipakai jika tersedia:

- `orderNo`
- `ticketCode`
- `ticketNumber`
- `scheduledInstallationAt`
- `email`
- `identityNo`
- `addressText`
- `latitude`
- `longitude`

## Guardrail

- jangan commit file JSON production mentah ke repository
- batch production Ticket memakai namespace terpisah:
  - `PROD-WEBPSB-TICKET-001`
  - `PROD-TICKET-*`
  - `PSB-CUST-*`
  - `PSB-SVC-*`
  - `PSB-WO-*`
- transform production melakukan deduplikasi customer berbasis `nama + phone`
- order, subscription, dan work order tetap dibentuk satu row per ticket/order production
- asumsi package awal production:
  - `HOME BASIC -> HOME-10M`
  - `HOME STREAM -> HOME-20M`
- translasi awal status production:
  - `statusOrder = 1` diperlakukan sebagai order aktif/selesai
  - `status = CLOSE/CLOSED` dengan `installedDate` terisi akan berujung ke subscription `ACTIVE`

## Jalankan Generator Saja

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
node .\scripts\generate-wave1b-ticket-production-loader.mjs --input-dir ".\production-data\web-psb-wave1b" --output-file ".\database\generated\web_psb_wave1b_ticket_production_loader.sql"
```

## Jalankan Runner Production

Tanpa password MySQL:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1b-ticket-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1b"
```

Dengan password MySQL:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1b-ticket-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1b" -Password "PASSWORD_ANDA"
```

## Review Hasil

File review query:

```text
database/xampp_review_wave1b_ticket_production_review_queries.sql
```

File assertion query:

```text
database/xampp_review_wave1b_ticket_production_assertions.sql
```

Jika tahap 2 / transform ticket tanpa sengaja dijalankan ulang dan muncul dugaan
duplikat, audit dulu dengan:

```text
database/xampp_review_wave1b_ticket_stage2_rerun_audit.sql
```

Panduan interpretasi dan recovery tersedia di:

```text
docs/hybrid-wave1b-ticket-stage2-rerun-recovery.md
```

## Acceptance Minimum

- batch production Ticket terbentuk di `staging_import_batches`
- semua row customer production punya `target_customer_id` dan `target_address_id`
- semua row order production yang valid punya:
  - `target_order_id`
  - `target_subscription_id`
  - `target_work_order_id`
- row `INVALID` diperbolehkan bila hanya berasal dari exception paket production yang sudah disetujui:
  - `PAKET CAFÉ`
  - `PAKET KBB`
  - `-`
- jumlah `sales_orders` final sama dengan jumlah row order production yang berhasil diimpor

## Catatan Praktis

- bila ada beberapa ticket untuk customer yang sama, transform production akan link ke satu customer final yang sama selama `nama + phone` cocok
- bila package legacy belum termasuk mapping otomatis seperti `HOME BASIC`, `HOME STREAM`, `HOME-20M`, atau `HOME-30M`, row order akan jatuh ke status `INVALID` dan harus ditambah mapping package dulu
- untuk batch production yang sudah divalidasi saat ini, `PAKET CAFÉ`, `PAKET KBB`, dan `-` sengaja tetap `INVALID` agar tidak masuk ke package ERP yang salah
- order number final memakai fallback `PSB-TICKET-{id}` bila source tidak memberi nomor order/ticket yang stabil
