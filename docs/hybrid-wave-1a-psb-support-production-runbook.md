# Hybrid Wave 1A Support Production Runbook

Runbook ini dipakai untuk memuat file JSON production support inti `Web PSB` ke review DB lokal `erp_isp_review`, lalu menjalankan transform production untuk:

1. `Isolation`
2. `DismantleTickets`
3. `DismantleHistory`
4. `TroubleTicket`

## Prasyarat

- MySQL atau MariaDB review DB aktif.
- Database target tersedia, default: `erp_isp_review`.
- `mysql.exe` tersedia di `PATH` atau diberikan lewat `-MysqlPath`.
- Batch `Wave 1B Ticket production` idealnya sudah pernah dijalankan pada review DB yang sama agar link `subscription_id` lebih kaya.

Artefak yang dipakai:

- Generator: [generate-wave1a-support-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1a-support-production-loader.mjs)
- Runner: [run-review-wave1a-support-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-support-production.ps1)
- Transform: [xampp_review_transform_wave1a_support_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_support_production.sql)
- Review query: [xampp_review_wave1a_support_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_support_production_review_queries.sql)
- Assertion query: [xampp_review_wave1a_support_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_support_production_assertions.sql)
- Extraction pack: [hybrid-wave-1a-psb-support-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-support-production-extraction-pack.md)

## Folder Input Lokal

Simpan empat file JSON production di folder berikut:

```text
production-data/
  web-psb-wave1a-support/
    isolation.production.json
    dismantle-tickets.production.json
    dismantle-history.production.json
    trouble-ticket.production.json
```

## Langkah 1: Jalankan Runner

Dari `CMD` Windows:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-support-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-support"
```

Jika root MySQL memakai password:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-support-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-support" -Password "PASSWORD_ANDA"
```

## Langkah 2: Review Hasil

Runner akan:

1. generate SQL loader dari JSON production
2. patch compatibility `Wave 1A` bila review DB lama belum lengkap
3. muat staging `PSB_SUPPORT_CORE`
4. jalankan transform production support
5. jalankan review query
6. jalankan assertion query

## Acceptance Minimum

- batch `PROD-WEBPSB-SUPPORT-CORE-001` terbentuk di `staging_import_batches`
- semua row `TroubleTicket` production berstatus `IMPORTED` dan punya `target_trouble_ticket_id`
- semua row `Isolation` production berstatus `IMPORTED` dan punya `target_isolation_id`
- semua row `DismantleTickets` production berstatus `IMPORTED`, punya `target_isolation_id`, dan `target_dismantle_queue_id`
- semua row `DismantleHistory` production berstatus `IMPORTED` dan punya `target_dismantle_history_id`
- assertion query tidak menyisakan status `BLOCKED`

## Catatan Praktis

- link `subscription_id` support bersifat best-effort karena data support production nyata longgar; row tetap boleh masuk final support meskipun subscription belum terhubung.
- `DismantleHistory` production sengaja mendukung mode linked maupun legacy fallback, sehingga `isolation_id` final boleh `NULL` untuk histori lama bila anchor isolasi tidak ditemukan.
- `DismantleTickets` tetap membutuhkan `target_isolation_id` karena `support_dismantle_queue` final mewajibkan foreign key ke `support_isolations`.
- jangan commit file JSON production mentah maupun file `.sql` hasil generate dari folder lokal.
