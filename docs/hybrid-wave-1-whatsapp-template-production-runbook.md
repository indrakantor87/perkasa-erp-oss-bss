# Hybrid Wave 1 WhatsappTemplate Production Runbook

Runbook ini dipakai untuk memuat `whatsapp-templates.production.json` hasil extraction `Web PSB` ke review DB lokal dan menghubungkannya ke tabel final `helper_whatsapp_templates`.

## Prasyarat

- review DB lokal aktif di XAMPP
- file JSON production sudah tersedia di lokal:

```text
production-data\web-psb-wave1-whatsapp-template\whatsapp-templates.production.json
```

- repo aktif:

```text
d:\trae_projects\perkasa-erp-oss-bss
```

## Bentuk Data yang Diimpor

- `name`
- `content`
- `isDefault`

Transform akan:

- trim `name`
- trim `content`
- menjaga `isDefault` sebagai penanda template utama
- memastikan final helper tidak punya lebih dari satu default aktif

## Jalankan Runner

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-whatsapp-template-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-whatsapp-template"
```

Jika MySQL root memakai password:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-whatsapp-template-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-whatsapp-template" -Password "PASSWORD_ANDA"
```

## Acceptance Minimum

- batch `PROD-WEBPSB-WATPL-001` terbentuk di `staging_import_batches`
- row valid `WhatsappTemplate production` tidak menyisakan status `INVALID`
- semua row valid linked ke `helper_whatsapp_templates`
- helper final tidak memiliki lebih dari satu default aktif
- assertion query tidak menyisakan status `BLOCKED`

## Catatan Desain

- tabel final memakai `helper_whatsapp_templates`
- pasangan data final yang disimpan:
  - `template_name`
  - `template_content`
  - `is_default`
- unique key final ada di `template_name`, mengikuti pola template manager legacy

## Guardrail

- file JSON production mentah tidak boleh di-commit
- bila ditemukan lebih dari satu row source bertanda `isDefault = true`, tetap lanjut review tetapi verifikasi bahwa hanya satu template final yang aktif sebagai default
- batch ini membuka helper `WhatsappTemplate`; setelah lulus, backlog adapter master/helper `Web PSB` praktis habis
