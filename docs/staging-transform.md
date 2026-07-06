# Staging Transform

## Tujuan

Dokumen ini menjelaskan script transform dari tabel staging ke tabel final untuk tahap awal review.

File SQL yang dipakai:

- `database/xampp_review_transform_stage_1.sql`

## Cakupan Tahap 1

Transform ini sengaja dibatasi ke domain yang paling sederhana untuk diverifikasi:

1. inventory item
2. inventory movement
3. employee
4. attendance
5. salary slip
6. loan

Domain berikut belum masuk tahap ini:

- customer
- address
- sales order
- subscription
- work order
- support

## Urutan Eksekusi

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_master_mapping_seed.sql`
7. `database/xampp_review_sample_import.sql`
8. `database/xampp_review_transform_stage_1.sql`

## Yang Dilakukan Script Ini

### Inventory

- insert `staging_legacy_inventory_item_records` ke `inventory_items`
- update `target_item_id` di staging
- insert `staging_legacy_inventory_movement_records` ke `inventory_stock_movements`
- update `target_movement_id` di staging

### HR

- insert `staging_legacy_employee_records` ke `hr_employees`
- update `target_employee_id` di staging
- insert `staging_legacy_attendance_records` ke `hr_attendance`
- insert `staging_legacy_salary_records` ke `hr_salary_slips`
- insert `staging_legacy_loan_records` ke `hr_loans`
- update seluruh target id yang relevan di staging

## Prinsip Transform

### 1. Hanya row yang sudah siap

Script hanya memproses row staging dengan status:

- `MAPPED`
- `VALID`

### 2. Tidak memaksa insert duplikat

Setiap insert memakai pengecekan `NOT EXISTS` terhadap key target yang paling masuk akal.

### 3. Staging tetap menjadi sumber audit

Setelah insert berhasil:

- `target_*_id` di staging diisi
- `import_status` diubah menjadi `IMPORTED`
- `imported_at` diisi

### 4. Fallback code tetap disediakan

Jika `item_code` atau `employee_code` kosong, script membuat fallback code berbasis id staging agar review tetap bisa lanjut.

## Cara Review Hasil Transform

Contoh query:

```sql
SELECT item_code, item_name, current_stock, status
FROM inventory_items
ORDER BY id DESC;
```

```sql
SELECT reference_no, movement_type, qty, item_id
FROM inventory_stock_movements
ORDER BY id DESC;
```

```sql
SELECT employee_code, full_name, position_name, employment_status
FROM hr_employees
ORDER BY id DESC;
```

```sql
SELECT attendance_date, status, overtime_hours
FROM hr_attendance
ORDER BY id DESC;
```

```sql
SELECT payroll_month, payroll_year, net_salary
FROM hr_salary_slips
ORDER BY id DESC;
```

```sql
SELECT loan_type, amount, status
FROM hr_loans
ORDER BY id DESC;
```

## Batasan Tahap Ini

Transform ini belum menangani:

1. relasi customer ke order
2. subscription
3. work order teknisi
4. support ticket, isolir, dan dismantle
5. billing

Alasannya sederhana: domain-domain itu lebih sensitif karena relasinya lebih panjang dan lebih mudah salah jika belum direview satu per satu.

## Langkah Berikutnya

Setelah transform tahap 1 tersedia, lanjutan yang sekarang sudah disiapkan adalah:

1. `database/xampp_review_transform_stage_2.sql` untuk customer, address, order, dan subscription
2. setelah itu baru tangani work order, support, dan billing
