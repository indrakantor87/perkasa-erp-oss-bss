# Master Mapping

## Tujuan

Dokumen ini menjelaskan template mapping master untuk menyatukan nilai legacy dari tiga sistem lama ke master tunggal project baru.

File SQL yang dipakai:

- `database/xampp_review_master_mapping.sql`

Urutan eksekusi review:

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_master_mapping_seed.sql`

## Kenapa Perlu Master Mapping

Karena target akhirnya adalah:

- `1 database`
- `1 domain`
- `1 website`

maka semua nilai legacy tidak boleh dibiarkan hidup sendiri-sendiri di aplikasi baru.

Contoh masalah jika mapping tidak dibuat:

1. role `ADMIN`, `SUPERADMIN`, `admin_cs`, `operator` bisa diperlakukan berbeda padahal maknanya beririsan
2. division `CS`, `Customer Service`, `ADM CS` bisa pecah ke dashboard yang tidak konsisten
3. package lama bisa tertulis berbeda tetapi sebenarnya menunjuk layanan yang sama
4. status legacy seperti `Close`, `CLOSED`, `Selesai`, `done` bisa memecah summary

## Tabel yang Disediakan

### `mapping_legacy_roles`

Untuk menyatukan role dari:

- `web-psb-perkasa`
- `finance-repo`
- `ga-web-app`

Ke target:

- `auth_roles.code`

### `mapping_legacy_divisions`

Untuk menyatukan nama divisi lama ke:

- `org_divisions.code`

### `mapping_legacy_branches`

Untuk menyatukan nama cabang lama ke:

- `org_branches.code`

### `mapping_legacy_packages`

Untuk mengarahkan nama paket lama ke:

- `sales_packages.code`

### `mapping_legacy_inventory_categories`

Untuk mengarahkan kategori barang lama ke:

- `inventory_categories.code`

### `mapping_legacy_inventory_units`

Untuk mengarahkan satuan barang lama ke:

- `inventory_units.code`

### `mapping_legacy_status_values`

Untuk normalisasi status lintas domain, misalnya:

- support
- HR
- inventory
- billing

## Prinsip Mapping

### 1. Target selalu ke master tunggal

Mapping tidak boleh diarahkan ke nama bebas. Harus ke code master yang dipakai sistem baru.

### 2. Source system tetap dicatat

Nilai yang sama dari dua aplikasi berbeda tetap boleh punya row terpisah bila konteksnya berbeda.

### 3. Gunakan code stabil, bukan label tampilan

Contoh yang benar:

- `ADMIN_CS`
- `CS`
- `HOME-20M`

Bukan label UI seperti:

- `Admin CS`
- `Customer Service`
- `Paket Home 20 Mbps`

### 4. Status domain dipisah

Status `OPEN` di support tidak selalu sama artinya dengan status `ACTIVE` di HR atau inventory.

Karena itu `mapping_legacy_status_values` memakai kolom:

- `source_system`
- `domain_name`
- `legacy_status_value`
- `target_status_value`

## Contoh Pemakaian

### Role

```text
source_system: WEB_PSB
legacy_role_value: admin_cs
target_role_code: ADMIN_CS
```

### Division

```text
source_system: FINANCE
legacy_division_value: HR & GA
target_division_code: HR_GA
```

### Package

```text
source_system: WEB_PSB
legacy_package_name: Home 20 Mbps
target_package_code: HOME-20M
```

## Hubungan dengan Staging Import

Tabel staging akan membaca hasil mapping ini untuk mengisi kolom seperti:

- `mapped_role_code`
- `mapped_division_code`
- `mapped_package_code`

Artinya:

- staging menyimpan data mentah
- master mapping menyimpan aturan translasi
- tabel final hanya menerima hasil yang sudah bersih

## Dampak ke Arsitektur

Karena project ini akan menjadi satu platform terpadu, master mapping adalah pagar penting agar:

1. satu user tidak punya identitas berbeda antar modul
2. satu divisi tidak punya nama ganda
3. dashboard lintas domain tetap konsisten
4. migrasi bertahap tetap berakhir pada model data yang sama

## Langkah Berikutnya

Setelah template mapping ini ada, langkah paling logis adalah:

1. review seed awal role, division, branch, package, category, unit, dan status
2. jalankan sample import batch kecil
3. validasi hasil mapping ke tabel staging
4. lanjut ke modul web import/review di satu aplikasi utama
