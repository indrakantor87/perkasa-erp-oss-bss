# Staging Transform Stage 4

## Tujuan

Dokumen ini menjelaskan transform tahap 4 dari tabel staging ke tabel final untuk domain billing.

File SQL yang dipakai:

- `database/xampp_review_transform_stage_4.sql`

## Cakupan Tahap 4

Tahap ini menangani:

1. `billing_invoices`
2. `billing_invoice_items`
3. `billing_payments`
4. `billing_collection_actions`

## Prasyarat

Tahap ini bergantung pada hasil sebelumnya:

1. customer, order, dan subscription sudah masuk melalui transform tahap 2
2. staging billing sudah tersedia di `database/xampp_review_staging_import.sql`
3. sample billing atau data billing nyata sudah dimasukkan ke staging

## Urutan Eksekusi

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_master_mapping_seed.sql`
7. `database/xampp_review_sample_import.sql`
8. `database/xampp_review_transform_stage_1.sql`
9. `database/xampp_review_transform_stage_2.sql`
10. `database/xampp_review_transform_stage_3.sql`
11. `database/xampp_review_transform_stage_4.sql`

## Yang Dilakukan Script Ini

### Invoice

- mencari `target_subscription_id` dari order/subscription hasil tahap 2
- membuat row di `billing_invoices`
- mengisi `target_invoice_id` di staging invoice

### Invoice Item

- menyamakan `target_invoice_id` dari `legacy_invoice_id`
- membuat row di `billing_invoice_items`
- mengisi `target_item_id` di staging item

### Payment

- menyamakan `target_invoice_id` dari `legacy_invoice_id`
- membuat row di `billing_payments`
- mencoba menghubungkan `received_by_legacy_user` ke `auth_users` bila transform user sudah ada
- mengisi `target_payment_id` di staging payment

### Collection Action

- menyamakan `target_invoice_id` dari `legacy_invoice_id`
- membuat row di `billing_collection_actions`
- mencoba menghubungkan `handled_by_legacy_user` ke `auth_users` bila tersedia
- mengisi `target_collection_action_id` di staging collection

## Prinsip Transform

### 1. Invoice lebih dulu dari komponen lainnya

Item, payment, dan collection action tidak diproses sebelum invoice target sudah ada.

### 2. Billing mengikuti subscription

Invoice hanya dibuat jika `target_subscription_id` berhasil ditemukan.

### 3. User operasional bersifat opsional

Kolom `received_by_user_id` dan `handled_by_user_id` nullable, jadi billing tetap bisa ditransform walaupun user legacy belum dimigrasikan ke `auth_users`.

### 4. Status dibuat konservatif

- invoice status dibatasi ke enum schema billing
- collection status dibatasi ke enum schema billing
- payment method dibatasi ke enum schema billing

## Cara Review Hasil Transform

```sql
SELECT invoice_no, subscription_id, total_amount, paid_amount, invoice_status, collection_status
FROM billing_invoices
ORDER BY id DESC;
```

```sql
SELECT invoice_id, item_type, description, line_total
FROM billing_invoice_items
ORDER BY id DESC;
```

```sql
SELECT invoice_id, payment_no, amount, payment_method
FROM billing_payments
ORDER BY id DESC;
```

```sql
SELECT invoice_id, action_type, action_status, action_at
FROM billing_collection_actions
ORDER BY id DESC;
```

```sql
SELECT legacy_id, target_subscription_id, target_invoice_id, import_status
FROM staging_legacy_billing_invoice_records
ORDER BY id DESC;
```

## Langkah Berikutnya

Setelah tahap 4 ini, fondasi review migrasi sudah mencakup domain utama operasional, support, dan billing. Langkah berikutnya paling masuk akal adalah mulai bootstrap modul web import/review utama pada satu website.
