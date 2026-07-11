# Wave 2 Local Loader Runbook

Runbook ini dipakai setelah file JSON production `Wave 2` berhasil diekstrak dari terminal app `Web PSB` di Coolify.

Scope batch pertama:

- `CoveredArea`
- `MarketingActivity`
- `psb_odp`
- `TroubleTicketSla`
- bootstrap native `network_odp_ports`

## Prasyarat

- review DB lokal `erp_isp_review` sudah tersedia di MySQL XAMPP
- `mysql.exe` tersedia, misalnya di `D:\xampp\mysql\bin\mysql.exe`
- `node.exe` tersedia di Windows
- file JSON production sudah disalin ke mesin lokal dan tidak di-commit ke Git

Folder input yang direkomendasikan:

```text
production-data/
  web-psb-wave2/
    covered-area.production.json
    marketing-activity.production.json
    psb-odp.production.json
    trouble-ticket-sla.production.json
```

## Guardrail

- jangan commit file JSON production mentah ke repository
- loader memakai namespace produksi yang berbeda dari sample:
  - `PROD-AREA-*`
  - `PSB-PROD-AREA-*`
  - `PROD-MA-*`
  - `PROD-ODP-*`
  - `PROD-SLA-*`
- transform sales production tidak lagi memakai batch code sample `Wave 1C`
- transform ODP dan TT SLA production tidak lagi memakai batch code sample `Wave 1A`

## Step 1: Salin JSON Production ke Repo Lokal

Salin empat file hasil extraction ke:

```text
d:\trae_projects\perkasa-erp-oss-bss\production-data\web-psb-wave2
```

## Step 2: Generate SQL Loader

Di `CMD` atau `PowerShell`, masuk ke repo:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
```

Jalankan generator:

```bat
node .\scripts\generate-wave2-production-loader.mjs --input-dir ".\production-data\web-psb-wave2" --output-file ".\database\generated\web_psb_wave2_production_loader.sql"
```

Optional:

- pakai status coverage eksplisit:

```bat
node .\scripts\generate-wave2-production-loader.mjs --input-dir ".\production-data\web-psb-wave2" --output-file ".\database\generated\web_psb_wave2_production_loader.sql" --coverage-status "AVAILABLE"
```

- pakai metadata wilayah default bila memang sudah diputuskan:

```bat
node .\scripts\generate-wave2-production-loader.mjs --input-dir ".\production-data\web-psb-wave2" --output-file ".\database\generated\web_psb_wave2_production_loader.sql" --city "Pati" --province "Jawa Tengah"
```

## Step 3: Jalankan Runner Mini-Batch Production

Tanpa password MySQL:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave2-production-mini-batch.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave2"
```

Dengan password MySQL:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave2-production-mini-batch.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave2" -Password "PASSWORD_ANDA"
```

Runner akan menjalankan urutan berikut:

1. patch kompatibilitas `Wave 1A` untuk review DB lama
2. patch kompatibilitas `Wave 1C` untuk review DB lama
3. SQL hasil generator production
4. transform production `CoveredArea` dan `MarketingActivity`
5. transform production `psb_odp` dan `TroubleTicketSla`
6. bootstrap native `network_odp_ports`
7. review query hasil mini-batch

## Step 4: Review Manual Jika Diperlukan

File review query ada di:

```text
database/xampp_review_wave2_production_review_queries.sql
```

Area yang harus dicek:

- ringkasan batch production
- row imported pada staging coverage
- row imported pada staging marketing activity
- row imported pada staging area link
- row imported pada staging ODP
- row imported pada staging TT SLA
- sample final:
  - `sales_covered_areas`
  - `sales_marketing_activities`
  - `sales_marketing_activity_areas`
  - `network_odp`
  - `network_odp_ports`
  - `support_trouble_ticket_sla`

## Acceptance Minimum

- batch production coverage berstatus `MAPPED` dengan `total_rows = 65`
- batch production marketing berstatus `MAPPED` dengan `total_rows = 528`
- batch production ODP berstatus `MAPPED` dengan `total_rows = 7879`
- batch production TT SLA berstatus `MAPPED` dengan `total_rows = 4`
- staging coverage punya `target_covered_area_id`
- staging marketing punya `target_activity_id`
- staging marketing area punya `target_activity_id` dan `target_covered_area_id`
- staging ODP punya `target_odp_id`
- staging TT SLA punya `target_trouble_ticket_sla_id`
- final `network_odp_ports` terbentuk untuk ODP production yang belum punya port native

## Catatan Praktis

- `psb_odp` production nyata bisa memiliki duplikasi atau inkonsistensi header legacy; transform ODP memakai `odp_code` sebagai anchor final
- loader staging ODP membentuk `legacy_id` dari kombinasi `id + nama_odp`, supaya jejak batch tetap stabil walau source production memiliki `id` legacy yang duplikat
- sample review lama seperti `TRKL/07 - 16` boleh tetap ada; loader production akan link ke code yang sama, bukan menggandakan header
- coverage production tidak dipaksa mengisi `city` dan `province` bila source nyata memang tidak menyediakannya
