# Hybrid Wave 1 Priority Production Runbook

Runbook ini dipakai untuk memuat `priorities.production.json` hasil extraction `Web PSB` ke review DB lokal dan menghubungkannya ke tabel final `master_priorities`.

## Prasyarat

- review DB lokal aktif di XAMPP
- file JSON production sudah tersedia di lokal:

```text
production-data\web-psb-wave1-priority\priorities.production.json
```

- repo aktif:

```text
d:\trae_projects\perkasa-erp-oss-bss
```

## Bentuk Data yang Diimpor

- `name`
- `color`

Transform akan:

- trim `name`
- trim `color`
- menjaga nama prioritas sebagai display label
- menyelaraskan warna final bila priority name yang sama sudah pernah ada di review DB

## Jalankan Runner

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-priority-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-priority"
```

Jika MySQL root memakai password:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-priority-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-priority" -Password "PASSWORD_ANDA"
```

## Acceptance Minimum

- batch `PROD-WEBPSB-PRIORITY-001` terbentuk di `staging_import_batches`
- row valid `Priority production` tidak menyisakan status `INVALID`
- semua row valid linked ke `master_priorities`
- assertion query tidak menyisakan status `BLOCKED`

## Catatan Desain

- tabel final memakai `master_priorities`
- pasangan data final yang disimpan:
  - `priority_name`
  - `badge_color`
- unique key final ada di `priority_name`, mengikuti model legacy yang juga menjaga nama prioritas tetap unik

## Guardrail

- file JSON production mentah tidak boleh di-commit
- bila ditemukan row source tanpa `name` atau `color`, hentikan finalisasi dan review dulu apakah itu anomali source atau row placeholder
- batch ini hanya membuka adapter `Priority`; `WhatsappTemplate production` tetap menjadi jalur terpisah
