# Master Mapping Seed

## Tujuan

Dokumen ini menjelaskan seed awal untuk tabel master mapping.

File SQL yang dipakai:

- `database/xampp_review_master_mapping_seed.sql`

## Fungsi Seed Awal

Seed ini dipakai untuk memberi baseline translasi awal dari nilai legacy ke master tunggal, terutama untuk:

- role
- division
- branch
- package
- inventory category
- inventory unit
- status lintas domain

Ini penting karena sample import dan import nyata tidak seharusnya memulai mapping dari nol.

## Sifat Seed

Seed ini:

1. adalah baseline awal, bukan daftar final
2. boleh ditambah saat ditemukan variasi nilai legacy baru
3. memakai pola `ON DUPLICATE KEY UPDATE` agar aman untuk review berulang

## Contoh Isi

### Role

- `admin_cs -> ADMIN_CS`
- `SUPERADMIN -> SUPER_ADMIN`
- `operator -> WAREHOUSE`

### Division

- `ADM CS -> CS`
- `Customer Service -> CS`
- `Marketing -> PENJUALAN`
- `HR & GA -> HR_GA`

### Package

- `Home 20 Mbps -> HOME-20M`
- `Dedicated 1:1 -> DEDICATED-1-1`

### Status

- `CLOSE -> CLOSED`
- `Selesai -> CLOSED`
- `aktif -> ACTIVE`
- `nonaktif -> INACTIVE`

## Cara Pakai

Urutan normal:

1. buat tabel mapping di `xampp_review_master_mapping.sql`
2. jalankan `xampp_review_core_master_seed.sql`
3. jalankan seed di `xampp_review_master_mapping_seed.sql`
4. baru jalankan sample import atau import nyata

## Dampak ke Import

Dengan seed ini:

- staging bisa langsung mengisi `mapped_role_code`
- staging bisa langsung mengisi `mapped_division_code`
- order bisa langsung mengisi `mapped_package_code`
- normalisasi status punya baseline sejak awal

## Batasan

Seed ini belum mencakup seluruh variasi data real dari ketiga sistem lama. Karena itu, setelah review batch nyata pertama, daftar seed hampir pasti perlu ditambah.
