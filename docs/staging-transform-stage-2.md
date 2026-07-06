# Staging Transform Stage 2

## Tujuan

Dokumen ini menjelaskan transform tahap 2 dari tabel staging ke tabel final untuk domain komersial inti.

File SQL yang dipakai:

- `database/xampp_review_transform_stage_2.sql`

## Cakupan Tahap 2

Tahap ini menangani:

1. `crm_customers`
2. `crm_customer_addresses`
3. `sales_orders`
4. `service_subscriptions`

Tahap ini belum menangani:

1. `sales_leads`
2. `service_work_orders`
3. `support_trouble_tickets`
4. `support_isolations`
5. `support_dismantle_history`
6. `billing`

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

## Yang Dilakukan Script Ini

### Customer

- membuat row di `crm_customers`
- memakai fallback `customer_code` berbasis id staging
- mengisi `branch_id` dari `branch_code` di staging

### Customer Address

- membuat satu alamat utama di `crm_customer_addresses`
- mengisi `target_address_id` di staging customer

### Sales Order

- menyamakan `target_customer_id` di staging order dari `legacy_customer_id`
- insert order ke `sales_orders`
- lookup paket dari `mapped_package_code`
- mengisi `target_order_id` di staging order

### Subscription

- membuat `service_subscriptions` dari order yang sudah berhasil diimport
- memakai fallback `service_no` berbasis id staging order
- mengisi `target_subscription_id` di staging order

## Prinsip Transform

### 1. Customer lebih dulu dari order

Order tidak boleh diinsert sebelum `target_customer_id` valid.

### 2. Package harus sudah termapping

Order dan subscription hanya diproses jika `mapped_package_code` berhasil ditemukan di `sales_packages`.

### 3. Status subscription dibuat konservatif

Mapping status tahap ini:

- `ACTIVE -> ACTIVE`
- `TERMINATED -> TERMINATED`
- `SUSPENDED -> SUSPENDED`
- selain itu -> `PENDING`

### 4. Lead belum dipaksakan

Tahap ini belum mengisi `lead_id` pada `sales_orders`, karena review yang sedang kita bangun masih fokus ke entity utama customer sampai subscription.

## Cara Review Hasil Transform

```sql
SELECT customer_code, full_name, customer_type, phone
FROM crm_customers
ORDER BY id DESC;
```

```sql
SELECT customer_id, label, address, is_primary
FROM crm_customer_addresses
ORDER BY id DESC;
```

```sql
SELECT order_no, customer_id, package_id, status
FROM sales_orders
ORDER BY id DESC;
```

```sql
SELECT service_no, customer_id, order_id, package_id, status
FROM service_subscriptions
ORDER BY id DESC;
```

```sql
SELECT legacy_id, target_customer_id, target_order_id, target_subscription_id, import_status
FROM staging_legacy_order_records
ORDER BY id DESC;
```

## Batasan Tahap Ini

Masih ada area yang belum disentuh:

1. lead asli dari proses akuisisi
2. work order teknisi
3. trouble ticket, isolir, dan dismantle
4. billing dan collection

Alasannya:

- relasinya lebih panjang
- butuh keputusan status dan lifecycle yang lebih hati-hati

## Langkah Berikutnya

Setelah tahap 2 ini lolos review, langkah berikutnya paling logis adalah:

1. `database/xampp_review_transform_stage_3.sql` untuk work order dan domain support
2. setelah itu tambahkan staging billing
3. lanjut ke domain `billing`
