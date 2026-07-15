# Stabilkan Worklist Pasca Deploy Spec

## Why
Setelah deploy, aplikasi perlu diverifikasi ulang agar `dashboard/worklist` benar-benar membaca `Review DB` tanpa fallback akibat SQL syntax error. Pekerjaan penutup juga perlu jelas supaya folder sementara `.trae-temp/` hanya dibersihkan setelah verifikasi akhir berhasil.

## What Changes
- Tambahkan alur verifikasi pasca-deploy untuk `dashboard`, `dashboard/worklist`, `billing`, dan `import center`
- Pastikan fallback SQL syntax di `dashboard/worklist` hilang setelah patch terdeploy
- Definisikan syarat penyelesaian pekerjaan sebelum pembersihan `.trae-temp/`
- Tambahkan langkah cleanup yang hanya menghapus `.trae-temp/` setelah seluruh verifikasi lulus

## Impact
- Affected specs: verifikasi pasca-deploy, stabilitas worklist, cleanup artefak sementara
- Affected code: `apps/web/lib/services/support-dismantle-service.ts`, alur smoke test live, folder `.trae-temp/`

## ADDED Requirements
### Requirement: Verifikasi Worklist Pasca Deploy
Sistem SHALL menyediakan alur verifikasi pasca-deploy untuk memastikan `dashboard/worklist` tidak lagi jatuh ke fallback karena SQL syntax error.

#### Scenario: Deploy sukses dan worklist bersih
- **WHEN** patch terbaru sudah terdeploy ke environment live
- **THEN** pengguna dapat membuka `dashboard/worklist` tanpa banner `Mock Fallback` akibat SQL syntax error
- **AND** halaman tetap menggunakan sumber data `Review DB`

#### Scenario: Route utama diverifikasi ulang
- **WHEN** verifikasi pasca-deploy dijalankan
- **THEN** `dashboard`, `dashboard/worklist`, `billing`, dan `import center` diperiksa ulang untuk memastikan tidak ada fallback yang memblokir alur utama

### Requirement: Cleanup Artefak Sementara
Sistem SHALL menunda penghapusan `.trae-temp/` sampai pekerjaan dinyatakan selesai setelah verifikasi akhir.

#### Scenario: Verifikasi akhir lulus
- **WHEN** seluruh checkpoint verifikasi pasca-deploy sudah lulus
- **THEN** folder `.trae-temp/` boleh dihapus
- **AND** folder lain seperti `.db-backups/`, `.vscode/`, dan file debug lama tidak ikut disentuh

## MODIFIED Requirements
### Requirement: Penutupan Pekerjaan Pasca Deploy
Penutupan pekerjaan pasca-deploy hanya dianggap selesai setelah login live, `dashboard/worklist`, dan route target lain berhasil diverifikasi pada environment live.

#### Scenario: Pekerjaan belum selesai
- **WHEN** masih ada fallback, SQL syntax error, atau route target belum diverifikasi
- **THEN** `.trae-temp/` harus tetap dipertahankan untuk mendukung troubleshooting lanjutan

## REMOVED Requirements
### Requirement: Cleanup Segera Setelah Patch Lokal
**Reason**: Patch lokal belum cukup untuk menyatakan pekerjaan selesai tanpa retest di environment live.
**Migration**: Cleanup dipindahkan ke tahap penutupan setelah checklist verifikasi live lulus.
