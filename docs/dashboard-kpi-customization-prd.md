# PRD Kustomisasi KPI Dashboard Per Divisi

## Tujuan

Dokumen ini mendefinisikan fitur kustomisasi KPI dashboard agar item KPI dapat:

1. ditambah
2. diubah
3. dihapus
4. diurutkan ulang

oleh `Manager` pada scope divisi dan sub-divisinya masing-masing.

Fitur ini dibutuhkan agar dashboard ERP tidak berhenti sebagai KPI statis hasil hardcode engineer, tetapi menjadi
workspace manajerial yang bisa menyesuaikan indikator per kebutuhan operasional divisi.

## Prinsip Utama

1. KPI default sistem tetap ada sebagai baseline
2. manager bisa membuat KPI custom tanpa merusak baseline global
3. kustomisasi dibatasi per `division + subdivision`
4. manager hanya boleh mengubah KPI pada scope organisasinya sendiri
5. `SUPER_ADMIN` boleh melihat dan mengelola seluruh definisi KPI lintas divisi

## Scope Pengguna

Pengguna yang boleh mengelola KPI:

1. `SUPER_ADMIN`
2. user dengan profil organisasi `planningLevel = MANAGER`

Catatan:

1. fase awal memakai fondasi `daily_activity_user_profiles` yang sudah menyimpan `division_name`, `subdivision_name`, dan `planning_level`
2. `SPV` dan `LEADER` tetap membaca KPI, tetapi belum boleh mengubah definisi KPI pada fase awal

## Cakupan Fitur

Manager per divisi/sub-divisi bisa:

1. menambah item KPI baru
2. mengubah label KPI
3. mengubah target atau query logic yang dipilih dari template sistem
4. mengubah urutan tampil
5. menonaktifkan KPI default tertentu dari tampilan divisinya
6. menghapus KPI custom yang dibuat sendiri

Manager tidak boleh:

1. mengubah KPI divisi lain
2. membuat query SQL bebas
3. menghapus baseline global sistem secara permanen

## Model Fungsional

Tampilan KPI dashboard dibaca dari dua lapisan:

1. `KPI sistem` sebagai baseline global
2. `KPI custom manager` sebagai override per scope divisi/sub-divisi

Urutan resolusi:

1. baca KPI baseline untuk sub-divisi aktif
2. baca override custom pada `division + subdivision`
3. gabungkan hasil
4. hormati urutan tampil dan status aktif/nonaktif

## Bentuk Kustomisasi

### 1. KPI Baseline

KPI baseline disediakan oleh sistem, contohnya:

1. `Lead Aktif`
2. `Work Order Aktif`
3. `Invoice Overdue`
4. `Absensi Hari Ini`
5. `Request Pending`

### 2. KPI Custom

KPI custom dibuat manager dari template yang aman, contohnya:

1. `Promise to Pay Hari Ini`
2. `ODP Perlu Cek Area Barat`
3. `Attendance Team Gudang`
4. `Closing Dismantle Mingguan`

## Tipe KPI

Fase awal hanya mengizinkan KPI berbasis template aman:

1. `COUNT`
2. `SUM`
3. `PERCENTAGE`

Sumber data juga dibatasi dari template sistem, misalnya:

1. `billing_overdue`
2. `billing_partial`
3. `hr_attendance_today`
4. `inventory_pending_requests`
5. `support_open_tickets`
6. `sales_active_leads`

Catatan:

1. manager tidak menulis SQL
2. manager memilih `template key`, filter aman, label, dan urutan

## Hak Akses

Aturan otorisasi:

1. `SUPER_ADMIN` bisa CRUD semua KPI custom
2. `MANAGER` hanya bisa CRUD KPI untuk `division_name` dan `subdivision_name` miliknya
3. user tanpa planning level `MANAGER` hanya bisa melihat

Sumber validasi scope:

1. `resolveDailyActivityOrgContext(session)`

## Struktur Data yang Dibutuhkan

Tabel baru yang disarankan:

### `dashboard_kpi_definitions`

Menyimpan definisi KPI baseline dan custom.

Kolom minimum:

1. `id`
2. `scope_type` = `SYSTEM` | `DIVISION`
3. `division_name`
4. `subdivision_name`
5. `dashboard_key`
6. `metric_key`
7. `metric_label`
8. `metric_type`
9. `template_key`
10. `display_order`
11. `is_active`
12. `is_default`
13. `created_by`
14. `updated_by`
15. `created_at`
16. `updated_at`

### `dashboard_kpi_definition_audits`

Menyimpan histori add/edit/delete KPI custom.

Kolom minimum:

1. `id`
2. `definition_id`
3. `action_type`
4. `actor`
5. `detail_json`
6. `created_at`

## Dashboard Key

`dashboard_key` mengikat KPI ke kartu sub-divisi tertentu, misalnya:

1. `SALES`
2. `CS`
3. `NOC`
4. `TT`
5. `DISMANTLE`
6. `DIGITAL`
7. `BILLING`
8. `HR`
9. `INVENTORY`

## Alur UI

### Tampilan baca

Pada kartu KPI dashboard:

1. user biasa melihat angka KPI
2. manager melihat tombol `Kelola KPI`
3. `SUPER_ADMIN` melihat mode lintas divisi

### Modal atau drawer `Kelola KPI`

Isi minimum:

1. daftar KPI aktif untuk scope saat ini
2. tombol `Tambah KPI`
3. aksi `Edit`
4. aksi `Nonaktifkan`
5. aksi `Hapus` untuk KPI custom
6. kontrol urutan tampil

### Form tambah atau edit KPI

Field minimum:

1. `label KPI`
2. `dashboard key`
3. `template KPI`
4. `urutan tampil`
5. `aktif / nonaktif`

Field lanjutan:

1. `filter preset`
2. `warna badge`
3. `drilldown target`

## Integrasi Backend

Service baru yang disarankan:

1. `apps/web/lib/services/dashboard-kpi-service.ts`

API baru yang disarankan:

1. `GET /api/dashboard/kpi-definitions`
2. `POST /api/dashboard/kpi-definitions`
3. `PATCH /api/dashboard/kpi-definitions/:id`
4. `DELETE /api/dashboard/kpi-definitions/:id`

## Integrasi Dashboard

Dashboard operasional saat membangun `metrics` pada `DashboardOperationalCard` harus:

1. ambil KPI baseline dari service
2. ambil override custom sesuai scope manager/divisi
3. render urutan akhir hasil merge

Catatan:

1. implementasi saat ini masih hardcoded di `dashboard-service.ts`
2. fase berikutnya harus memindahkan definisi metrik ke service kustomisasi ini

## Aturan Merge KPI

Urutan merge:

1. load baseline system
2. load custom definitions untuk scope aktif
3. jika `metric_key` custom sama dengan baseline, custom menimpa label/urutan/status
4. jika `metric_key` baru, append sebagai KPI custom
5. jika baseline ditandai nonaktif oleh scope, sembunyikan dari hasil akhir

## Audit

Semua aksi manager wajib tercatat:

1. add KPI
2. edit KPI
3. delete KPI
4. activate/deactivate KPI
5. reorder KPI

Audit ini penting karena KPI akan menjadi artefak kontrol kerja divisi.

## Tahap Implementasi

### Tahap 1

1. buat tabel definisi KPI dan audit
2. buat service backend untuk load dan CRUD definisi KPI
3. validasi akses `SUPER_ADMIN` dan `MANAGER`

### Tahap 2

1. sambungkan dashboard operasional ke definisi KPI dinamis
2. manager bisa edit KPI baseline secara aman lewat override
3. hidupkan UI `Kelola KPI`

### Tahap 3

1. tambah preset filter dan target drilldown per KPI
2. tambah import/export konfigurasi KPI per divisi
3. tambah template KPI baru tanpa perlu mengubah UI manager

## Dampak Ke PRD Saat Ini

Fitur ini menjadi pengembangan dari `Dashboard utama` dan harus dicatat sebagai:

1. dashboard menjadi configurable per divisi
2. manager per divisi menjadi pemilik definisi KPI operasional
3. KPI tidak lagi sepenuhnya statis di source code

## Versioning

Dokumen ini dirilis pada:

- `0.64.45` untuk PRD kustomisasi KPI dashboard oleh manager per divisi
