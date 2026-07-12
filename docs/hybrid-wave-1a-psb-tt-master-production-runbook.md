# Hybrid Wave 1A TroubleTicketMaster Production Runbook

Runbook ini dipakai untuk memuat `trouble-ticket-master.production.json` hasil extraction `Web PSB` ke review DB lokal dan menghubungkannya ke katalog final `support_trouble_ticket_masters`.

## Prasyarat

- review DB lokal aktif di XAMPP
- file JSON production sudah tersedia di lokal:

```text
production-data\web-psb-wave1a-tt-master\trouble-ticket-master.production.json
```

- repo aktif:

```text
d:\trae_projects\perkasa-erp-oss-bss
```

## Bentuk Data yang Diimpor

- `kind`
  - `PROBLEM_CATEGORY`
  - `RESOLUTION_ACTION`
  - `ONT`
- `value`

Transform akan menormalkan:

- `kind` -> uppercase
- `value` -> trim spasi ganda + uppercase

## Jalankan Runner

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-tt-master-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-tt-master"
```

Jika MySQL root memakai password:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-tt-master-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-tt-master" -Password "PASSWORD_ANDA"
```

## Acceptance Minimum

- batch `PROD-WEBPSB-TTMASTER-001` terbentuk di `staging_import_batches`
- row valid `TroubleTicketMaster production` tidak menyisakan status `INVALID`
- semua row valid linked ke `support_trouble_ticket_masters`
- assertion query tidak menyisakan status `BLOCKED`

## Catatan Desain

- tabel final sengaja dipisah menjadi `support_trouble_ticket_masters`
- nilai final memakai pasangan unik:
  - `kind`
  - `master_value`
- satu nilai final dapat mewakili lebih dari satu row staging bila source production memuat duplikasi yang identik

## Guardrail

- file JSON production mentah tidak boleh di-commit
- bila ditemukan `kind` baru di luar:
  - `PROBLEM_CATEGORY`
  - `RESOLUTION_ACTION`
  - `ONT`
  hentikan import final dan perluas adapter dulu
- batch ini hanya membuka katalog `TroubleTicketMaster`; `Priority` dan `WhatsappTemplate` tetap menjadi jalur adapter terpisah
