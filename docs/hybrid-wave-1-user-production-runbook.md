# Hybrid Wave 1 User Production Runbook

Runbook ini dipakai untuk memuat `users.production.json` hasil extraction `Web PSB` ke review DB lokal dan menghubungkannya ke `auth_roles`, `org_divisions`, dan `auth_users`.

## Prasyarat

- review DB lokal aktif di XAMPP
- file JSON production sudah tersedia di lokal:

```text
production-data\web-psb-wave1-user\users.production.json
```

- repo aktif:

```text
d:\trae_projects\perkasa-erp-oss-bss
```

## Jalankan Runner

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-user-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-user"
```

Jika MySQL root memakai password:

```bat
cd /d d:\trae_projects\perkasa-erp-oss-bss
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-user-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-user" -Password "PASSWORD_ANDA"
```

## Acceptance Minimum

- batch `PROD-WEBPSB-USER-001` terbentuk di `staging_import_batches`
- semua row `User production` yang valid berhasil masuk ke `auth_users`
- role final yang dipakai review DB sesuai kode auth web:
  - `ADMIN`
  - `MARKETING`
  - `CS`
  - `NOC`
  - `TROUBLESHOOTS`
  - `CREATOR_DIGITAL`
  - `DISMANTLE`
- assertion query tidak menyisakan status `BLOCKED`

## Catatan Mapping

- `legacy_role` dipertahankan sedekat mungkin ke kode auth yang memang dibaca `auth-session`
- `legacy_division` source yang aktif dipertahankan ke bucket:
  - `PENJUALAN`
  - `CS_ADMIN`
  - `NOC_TROUBLESHOOTS`
  - `CREATOR_DIGITAL`
- jika `division` kosong:
  - `MARKETING` diarahkan ke `PENJUALAN`
  - `CS` dan `DISMANTLE` diarahkan ke `CS_ADMIN`
  - `NOC` dan `TROUBLESHOOTS` diarahkan ke `NOC_TROUBLESHOOTS`
  - `CREATOR_DIGITAL` diarahkan ke `CREATOR_DIGITAL`
  - `ADMIN` dibiarkan `NULL` agar tidak memaksakan lane yang belum pasti

## Guardrail

- file JSON production mentah tidak boleh di-commit
- bila ditemukan role legacy baru di luar distribusi saat ini, hentikan import final dan perbarui mapping dulu
- jangan ubah password hash hasil import; login review DB mengandalkan pola hash `sha256:`
