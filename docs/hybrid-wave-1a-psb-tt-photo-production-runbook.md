# Hybrid Wave 1A PSB TT Photo Production Runbook

Runbook ini dipakai untuk memuat file JSON production `TroubleTicketPhoto` dari `Web PSB` ke review DB lokal `erp_isp_review`, lalu menjalankan transform production evidence photo.

## Prasyarat

- MySQL atau MariaDB review DB aktif.
- Batch `PROD-WEBPSB-SUPPORT-CORE-001` sudah pernah dijalankan sukses pada review DB yang sama.
- `mysql.exe` tersedia di `PATH` atau diberikan lewat `-MysqlPath`.

Artefak yang dipakai:

- Generator: [generate-wave1a-tt-photo-production-loader.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/generate-wave1a-tt-photo-production-loader.mjs)
- Runner: [run-review-wave1a-tt-photo-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-tt-photo-production.ps1)
- Transform: [xampp_review_transform_wave1a_tt_photo_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_tt_photo_production.sql)
- Review query: [xampp_review_wave1a_tt_photo_production_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_photo_production_review_queries.sql)
- Assertion query: [xampp_review_wave1a_tt_photo_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_tt_photo_production_assertions.sql)
- Extraction pack: [hybrid-wave-1a-psb-tt-photo-production-extraction-pack.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-tt-photo-production-extraction-pack.md)

## Folder Input Lokal

Simpan file JSON production di folder berikut:

```text
production-data/
  web-psb-wave1a-tt-photo/
    trouble-ticket-photo.production.json
```

## Langkah 1: Jalankan Runner

Dari `CMD` Windows:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-tt-photo-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-tt-photo"
```

Jika root MySQL memakai password:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-tt-photo-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-tt-photo" -Password "PASSWORD_ANDA"
```

## Langkah 2: Review Hasil

Runner akan:

1. generate SQL loader dari JSON production TT photo
2. patch compatibility `Wave 1A` bila review DB lama belum lengkap
3. muat staging `PSB_SUPPORT_TT_PHOTO`
4. resolve parent ticket dari batch support core production
5. muat `support_trouble_ticket_photos`
6. jalankan review query
7. jalankan assertion query

## Acceptance Minimum

- batch `PROD-WEBPSB-TTPHOTO-001` terbentuk di `staging_import_batches`
- semua row `TroubleTicketPhoto` production berstatus `IMPORTED`
- semua row `TroubleTicketPhoto` production punya `target_trouble_ticket_id`
- assertion query tidak menyisakan status `BLOCKED`

## Catatan Praktis

- batch ini sengaja hanya membuka evidence photo detail dan tidak menyentuh `TroubleTicketSla` karena jalur produksinya sudah ditangani di `Wave 2`
- jika ada row `INVALID`, penyebab paling mungkin adalah `ticketId` kosong di source atau parent ticket belum tersedia di batch support core production
- jangan commit file JSON production mentah maupun file `.sql` hasil generate dari folder lokal
