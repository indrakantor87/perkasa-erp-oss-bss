# Staging Transform Stage 3

## Tujuan

Dokumen ini menjelaskan transform tahap 3 dari tabel staging ke tabel final untuk domain operasional lapangan dan support.

File SQL yang dipakai:

- `database/xampp_review_transform_stage_3.sql`

## Cakupan Tahap 3

Tahap ini menangani:

1. `service_work_orders`
2. `support_trouble_tickets`
3. `support_trouble_ticket_photos`
4. `support_isolations`
5. `support_dismantle_history`

Tahap ini belum menangani:

1. `billing_invoices`
2. `billing_invoice_items`
3. `billing_payments`
4. `billing_collection_actions`

## Kenapa Billing Belum Masuk

Schema billing sudah tersedia sejak phase `1.1`, tetapi tabel staging khusus billing belum ada. Karena itu, tahap ini sengaja hanya mengerjakan transform yang sudah punya sumber staging yang jelas.

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

## Yang Dilakukan Script Ini

### Work Order

- membuat `service_work_orders` dari `staging_legacy_order_records`
- mengisi `target_work_order_id` di staging order
- memakai fallback `work_order_no` berbasis id staging order

### Trouble Ticket

- membuat `support_trouble_tickets` dari `staging_legacy_support_records`
- normalisasi status `OPEN/CLOSED`
- mengisi `target_trouble_ticket_id` di staging support

### Trouble Ticket Photos

- memecah `photo_list_text` berbentuk array JSON sederhana
- membuat row di `support_trouble_ticket_photos`

### Isolation

- membuat `support_isolations` dari staging support tipe `ISOLATION`
- memakai alamat, phone, dan marketing dari staging customer bila tersedia
- mengisi `target_isolation_id` di staging support

### Dismantle History

- membuat `support_dismantle_history` dari staging support tipe `DISMANTLE_HISTORY`
- mencoba menghubungkan ke isolation yang relevan bila ada
- mengisi `target_dismantle_history_id` di staging support

## Prinsip Transform

### 1. Work order diturunkan dari order

Tahap ini menganggap jalur paling aman adalah membuat work order dari order yang sudah lolos transform tahap 2.

### 2. Support boleh berdiri dengan atau tanpa subscription

Jika subscription sudah ditemukan dari customer/order, relasi akan diisi. Jika belum, data support tetap bisa masuk sebagai histori operasional dengan relasi nullable.

### 3. Status dibuat konservatif

- trouble ticket: `OPEN` atau `CLOSED`
- isolation: `OPEN` atau `CLOSED`
- work order: `OPEN` atau `DONE`

### 4. Billing belum dipaksa

Tidak ada insert ke domain billing di tahap ini karena belum ada staging source yang bersih untuk ditransform.

## Cara Review Hasil Transform

```sql
SELECT work_order_no, work_type, status, subscription_id
FROM service_work_orders
ORDER BY id DESC;
```

```sql
SELECT ticket_code, customer_name, status, subscription_id
FROM support_trouble_tickets
ORDER BY id DESC;
```

```sql
SELECT trouble_ticket_id, photo_path
FROM support_trouble_ticket_photos
ORDER BY id DESC;
```

```sql
SELECT customer_name, status, isolation_date, restoration_date
FROM support_isolations
ORDER BY id DESC;
```

```sql
SELECT customer_name, closed_at, close_note
FROM support_dismantle_history
ORDER BY id DESC;
```

```sql
SELECT support_type, legacy_id, target_subscription_id, target_trouble_ticket_id, target_isolation_id, target_dismantle_history_id, import_status
FROM staging_legacy_support_records
ORDER BY id DESC;
```

## Langkah Berikutnya

Setelah tahap 3 ini, langkah paling logis adalah:

1. `database/xampp_review_transform_stage_4.sql` untuk domain billing
2. review invoice, payment, dan collection hasil transform
3. setelah itu baru mulai bootstrap modul web import/review utama
