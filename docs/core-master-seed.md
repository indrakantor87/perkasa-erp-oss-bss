# Core Master Seed

## Tujuan

Dokumen ini menjelaskan seed minimum untuk master utama yang dibutuhkan oleh:

- master mapping
- sample import

File SQL yang dipakai:

- `database/xampp_review_core_master_seed.sql`

## Kenapa Diperlukan

Tabel mapping seperti:

- `mapping_legacy_roles`
- `mapping_legacy_divisions`
- `mapping_legacy_branches`
- `mapping_legacy_packages`
- `mapping_legacy_inventory_categories`
- `mapping_legacy_inventory_units`

memiliki foreign key ke tabel master final. Artinya, seed mapping tidak aman dijalankan bila master minimum belum ada.

## Master Minimum yang Disiapkan

Seed ini menyiapkan data awal untuk:

1. `org_branches`
2. `org_divisions`
3. `auth_roles`
4. `sales_packages`
5. `inventory_categories`
6. `inventory_units`

## Urutan Eksekusi yang Benar

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_master_mapping_seed.sql`
7. `database/xampp_review_sample_import.sql`

## Prinsip

Seed ini:

1. hanya baseline minimum
2. bukan master final production
3. dipakai agar review database bisa berjalan tanpa error foreign key
4. boleh diperluas saat kebutuhan domain makin lengkap

## Contoh Master yang Disiapkan

### Branch

- `PATI`

### Division

- `PENJUALAN`
- `CS`
- `NOC`
- `CREATOR_DIGITAL`
- `HR_GA`
- `FINANCE`
- `WAREHOUSE`

### Role

- `SUPER_ADMIN`
- `OPERATOR`
- `ADMIN`
- `ADMIN_CS`
- `NOC`
- `SALES`
- `HR_GA`
- `FINANCE`
- `WAREHOUSE`

### Package

- `HOME-10M`
- `HOME-20M`
- `HOME-30M`
- `DEDICATED-1-1`
- `RESELLER-BASIC`

## Catatan

Kalau nanti ditemukan package, branch, role, atau division lain saat import nyata, tambahkan dulu ke master seed atau ke master final sebelum menambah mapping legacy-nya.
