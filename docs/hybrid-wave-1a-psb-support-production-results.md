# Hybrid Wave 1A PSB Support Production Results

Dokumen ini merangkum hasil riil eksekusi batch production support inti `Web PSB` pada review DB lokal.

## Metadata

- Tanggal validasi: `2026-07-11`
- Batch code: `PROD-WEBPSB-SUPPORT-CORE-001`
- Database: `erp_isp_review`
- Runner: [run-review-wave1a-support-production.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a-support-production.ps1)
- Transform: [xampp_review_transform_wave1a_support_production.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave1a_support_production.sql)
- Assertion: [xampp_review_wave1a_support_production_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1a_support_production_assertions.sql)

## Ringkasan Akhir

- Keputusan akhir: `GO`
- Status assertion: `PASS` penuh
- `INVALID`: `0`
- Catatan utama:
  - loader perlu diperkecil agar lolos `max_allowed_packet` XAMPP lokal
  - `DismantleHistory` production mengandung duplikasi natural key dan perlu dedupe saat transform
  - terdapat `1` queue orphan (`FEBRIAN RIZKY`) yang perlu isolation sintetis minimum agar `support_dismantle_queue` tetap konsisten terhadap FK

## Hasil Staging

| Lane | Total | Imported | Catatan |
|---|---:|---:|---|
| `TROUBLE_TICKET` | 1233 | 1233 | `736` row berhasil linked ke subscription |
| `ISOLATION` | 491 | 491 | `182` row berhasil linked ke subscription |
| `DISMANTLE_QUEUE` | 52 | 52 | seluruh row linked ke isolation dan queue final |
| `DISMANTLE_HISTORY` | 293 | 293 | `290` row linked ke isolation, `3` fallback legacy |

## Hasil Final

- `support_trouble_tickets`: `1233` linkage row dari staging imported
- `support_isolations`: `491` linkage row dari staging imported
- `support_dismantle_queue`: `52` row final, `52` distinct isolation
- `support_dismantle_history`: `289` row final
  - linked ke isolation: `286`
  - fallback legacy tanpa isolation: `3`

## Temuan Penting

### Temuan 1: Packet Size XAMPP Lokal Ketat

- Status: `fixed`
- Detail: loader awal gagal karena statement terlalu besar untuk `max_allowed_packet`
- Fix:
  - chunk `INSERT` diperkecil
  - `raw_payload` dipangkas menjadi ringkasan audit
  - runner MySQL diberi `--max_allowed_packet=64M`

### Temuan 2: Dedupe DismantleHistory Production Diperlukan

- Status: `fixed`
- Detail: source production memiliki duplikasi pada pasangan `customer_name + closed_at/opened_at`
- Fix:
  - transform memilih satu row staging representatif untuk insert final
  - assertion menghitung linkage staging ke final, bukan `id` final unik

### Temuan 3: Queue Orphan Masih Ada di Production

- Status: `fixed`
- Detail: terdapat `1` row `DismantleTickets` orphan untuk `FEBRIAN RIZKY` yang tidak memiliki source `Isolation`
- Fix:
  - transform membuat `support_isolation` sintetis minimum
  - queue tetap bisa masuk final tanpa melanggar FK `support_dismantle_queue`

### Temuan 4: Residual Radbox Histori Memang Tipis di Source

- Status: `validated`
- Detail:
  - audit lanjutan pada `production-data/web-psb-wave1a-support/dismantle-history.production.json` menunjukkan hanya `4` dari `293` row source yang memiliki nilai `radboox`
  - empat row source yang punya `radboox` tersebut sudah terwakili di tabel final, termasuk `ARI AGUNG DARMAWAN`, `Aulia Chairunnisa`, dan dua histori `Yohanes Wahyu Tri Bayu S.`
  - sisa histori final yang masih `Radbox belum terpetakan` karena memang source production juga tidak menyimpan `radboox`, bukan karena bug transform atau backfill yang terlewat
- Dampak:
  - residual `radbox_name` kosong pada `support_dismantle_history` harus diperlakukan sebagai keterbatasan source data
  - fallback UI tetap dipertahankan sebagai narasi jujur sampai ada artefak source lain yang lebih kaya

## Keputusan Lanjut

- Batch support core production dinyatakan siap menjadi parent resolver untuk batch lanjutan support extension.
- Batch paling natural berikutnya: `TroubleTicketPhoto production`.
- `TroubleTicketSla` tidak perlu dibuka ulang pada jalur ini karena production path-nya sudah tertangani di `Wave 2`.
