# Sample Import

## Tujuan

Dokumen ini menjelaskan file sample import kecil untuk menguji alur:

- staging import
- master mapping
- review data legacy sebelum masuk tabel final

File SQL yang dipakai:

- `database/xampp_review_sample_import.sql`

## Urutan Eksekusi

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_master_mapping_seed.sql`
7. `database/xampp_review_sample_import.sql`

## Isi Sample

Sample ini sengaja kecil dan hanya dipakai untuk review:

1. satu batch `WEB_PSB`
2. satu batch `WEB_PSB` untuk billing
3. satu batch `GA`
4. satu batch `FINANCE`
5. sample user, customer, order, trouble ticket, isolation, dan dismantle history
6. sample invoice, item, payment, dan collection
7. sample inventory item dan movement
8. sample employee, attendance, salary, dan loan

Tujuannya bukan menguji volume, tetapi menguji:

- mapping role
- mapping division
- mapping package
- hubungan customer dan order
- alur status staging sampai `MAPPED`

## Batch yang Dibuat

Batch code:

- `SAMPLE-WEBPSB-USER-001`
- `SAMPLE-WEBPSB-BILLING-001`
- `SAMPLE-GA-INVENTORY-001`
- `SAMPLE-FINANCE-HR-001`

Scope:

- `USER_AND_ORDER_SAMPLE`
- `BILLING_SAMPLE`
- `INVENTORY_SAMPLE`
- `HR_SAMPLE`

## Hasil yang Diharapkan

Setelah file sample dijalankan:

1. `staging_import_batches` punya satu batch sample
2. `staging_legacy_user_records` berisi satu row role/division yang sudah dimapping
3. `staging_legacy_customer_records` berisi satu customer sample
4. `staging_legacy_order_records` berisi satu order dengan `mapped_package_code`
5. `staging_legacy_support_records` berisi satu TT sample
6. `staging_legacy_support_records` juga berisi satu isolation sample dan satu dismantle history sample
7. `staging_legacy_billing_invoice_records`, `staging_legacy_billing_item_records`, `staging_legacy_billing_payment_records`, dan `staging_legacy_billing_collection_records` berisi sample billing
8. `staging_legacy_inventory_item_records` berisi satu item sample dengan category/unit yang sudah dimapping
9. `staging_legacy_inventory_movement_records` berisi satu movement sample
10. `staging_legacy_employee_records`, `staging_legacy_attendance_records`, `staging_legacy_salary_records`, dan `staging_legacy_loan_records` berisi sample HR

## Cara Review

Contoh query sederhana:

```sql
SELECT * FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-USER-001';
```

```sql
SELECT legacy_id, legacy_role, mapped_role_code, legacy_division, mapped_division_code
FROM staging_legacy_user_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-USER-001'
);
```

```sql
SELECT legacy_id, legacy_package_name, mapped_package_code, import_status
FROM staging_legacy_order_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-USER-001'
);
```

```sql
SELECT legacy_id, mapped_category_code, mapped_unit_code, import_status
FROM staging_legacy_inventory_item_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-GA-INVENTORY-001'
);
```

```sql
SELECT legacy_id, mapped_division_code, import_status
FROM staging_legacy_employee_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-FINANCE-HR-001'
);
```

```sql
SELECT legacy_id, invoice_no, total_amount, invoice_status, import_status
FROM staging_legacy_billing_invoice_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-BILLING-001'
);
```

## Catatan Penting

1. sample ini bukan data operasional
2. sample ini hanya untuk membuktikan alur review staging pada satu platform tunggal
3. row sample sengaja dibuat dengan `NOT EXISTS` agar lebih aman saat diulang
4. data final tetap belum terisi, karena sample ini berhenti di area staging

## Langkah Berikutnya

Setelah sample ini lolos review, langkah berikutnya paling masuk akal adalah:

1. tambah variasi sample untuk status legacy yang lebih berantakan
2. mulai buat script transform dari staging ke tabel final
3. mulai siapkan modul web import/review di satu website utama
