# Staging Import

## Tujuan

Dokumen ini menjelaskan struktur staging import untuk review migrasi data dari:

- `web-psb-perkasa`
- `finance-repo`
- `ga-web-app`

File SQL yang dipakai:

- `database/xampp_review_staging_import.sql`

Urutan eksekusi review:

1. jalankan `database/xampp_review_schema.sql`
2. jalankan `database/xampp_review_schema_phase_1_1.sql`
3. jalankan `database/xampp_review_staging_import.sql`

## Kenapa Perlu Staging

Import langsung ke tabel final terlalu berisiko karena:

1. tiga sistem lama punya format id, status, dan relasi yang berbeda
2. ada data yang perlu dinormalisasi sebelum jadi foreign key final
3. ada kemungkinan duplikasi, data kosong, atau status legacy yang tidak konsisten
4. target akhirnya adalah satu database dan satu website, jadi data legacy tidak boleh masuk tanpa penyatuan model

Dengan staging, alurnya menjadi:

```text
source lama
-> upload / dump ke staging
-> mapping dan validasi
-> review hasil cleansing
-> import ke tabel final
```

## Tabel Inti

### `staging_import_batches`

Fungsi:

- mencatat satu sesi import
- menampung sumber sistem, file asal, scope import, dan ringkasan jumlah row

Ini menjadi anchor untuk seluruh tabel staging lainnya.

## Tabel Staging per Domain

### 1. User dan Akses

- `staging_legacy_user_records`

Dipakai untuk:

- user dari `web-psb-perkasa`
- user dari `finance-repo`
- user dari `ga-web-app`

Field penting:

- `legacy_role`
- `legacy_division`
- `mapped_role_code`
- `mapped_division_code`
- `employee_legacy_id`

### 2. Customer dan Address

- `staging_legacy_customer_records`

Dipakai untuk menampung calon customer/customer dari flow lama sebelum diarahkan ke:

- `crm_customers`
- `crm_customer_addresses`

### 3. Order, Subscription, dan Work Order

- `staging_legacy_order_records`

Dipakai untuk menampung model campuran dari ticket/order lama sebelum dipecah ke:

- `sales_orders`
- `service_subscriptions`
- `service_work_orders`

### 4. Support

- `staging_legacy_support_records`

Menyatukan tiga tipe data support lama:

- `TROUBLE_TICKET`
- `ISOLATION`
- `DISMANTLE_HISTORY`

Alasannya:

- ketiganya berasal dari domain support yang sama
- semua butuh review status legacy dan relasi ke subscription/customer

### 5. Billing

- `staging_legacy_billing_invoice_records`
- `staging_legacy_billing_item_records`
- `staging_legacy_billing_payment_records`
- `staging_legacy_billing_collection_records`

Dipakai untuk:

- invoice
- item invoice
- pembayaran
- histori collection

### 6. Inventory

- `staging_legacy_inventory_item_records`
- `staging_legacy_inventory_movement_records`

Dipakai untuk:

- item master
- barang masuk
- barang keluar
- hubungan ke work order jika nanti sudah ditemukan mapping yang valid

### 7. HR

- `staging_legacy_employee_records`
- `staging_legacy_attendance_records`
- `staging_legacy_salary_records`
- `staging_legacy_loan_records`

Dipakai untuk:

- pegawai
- absensi
- slip gaji
- kasbon

## Pola Kolom yang Diseragamkan

Sebagian besar tabel staging memakai pola kolom berikut:

- `legacy_id`
- `raw_payload`
- `normalized_key`
- `target_*_id`
- `import_status`
- `validation_notes`
- `imported_at`

Maknanya:

- `raw_payload`: menyimpan data mentah agar jejak source tidak hilang
- `normalized_key`: kunci bantu untuk deduplikasi dan pencarian
- `target_*_id`: id target setelah mapping/import
- `import_status`: status progres per row
- `validation_notes`: catatan kenapa row valid, invalid, atau di-skip

## Status yang Dipakai

Status per row di tabel staging:

- `PENDING`
- `MAPPED`
- `VALID`
- `INVALID`
- `IMPORTED`
- `SKIPPED`

Status batch:

- `DRAFT`
- `UPLOADED`
- `MAPPED`
- `VALIDATED`
- `IMPORTED`
- `FAILED`

## Aturan Praktis Import

### 1. Jangan hapus data mentah terlalu cepat

`raw_payload` tetap dipertahankan selama review agar transform bisa diaudit ulang.

### 2. Mapping master dilakukan lebih dulu

Yang perlu dimapping di awal:

- role
- division
- branch
- package
- category
- unit

Template mapping ini disiapkan di:

- `database/xampp_review_master_mapping.sql`

### 3. Import final hanya dilakukan dari row valid

Row yang masih `INVALID` atau `PENDING` tidak boleh masuk tabel final.

### 4. Gunakan batch terpisah per domain bila perlu

Contoh:

- batch user
- batch customer dan order
- batch billing
- batch inventory
- batch HR

Ini membuat review error lebih mudah.

## Langkah Setelah Staging

Setelah tabel staging tersedia, langkah berikutnya paling logis adalah:

1. siapkan seed master mapping role/division/package/status
2. buat sample batch untuk domain inti termasuk billing
3. uji transform bertahap ke tabel final
4. baru siapkan bootstrap aplikasi web untuk modul import/review
