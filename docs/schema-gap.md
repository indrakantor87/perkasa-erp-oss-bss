# Schema Gap Review

## Tujuan

Dokumen ini mencatat gap antara kebutuhan bisnis gabungan dan schema review awal di `database/xampp_review_schema.sql`.

Status terbaru:

- gap prioritas tinggi sudah diturunkan ke patch `database/xampp_review_schema_phase_1_1.sql`
- staging import dasar sudah diturunkan ke `database/xampp_review_staging_import.sql`
- dokumen ini tetap dipakai sebagai catatan keputusan desain dan gap lanjutan

Fokusnya adalah menentukan apa yang:

- sudah cukup untuk review awal
- perlu ditambah pada iterasi schema berikutnya
- sebaiknya ditunda agar phase 1 tetap terkendali

## Gap Prioritas Tinggi

Status umum:

- sudah masuk patch schema `phase 1.1`

### 1. Coverage dan Survey

Kondisi saat ini:

- baru ada di blueprint dan data mapping
- belum ada tabel khusus

Dampak:

- alur `Lead -> Coverage -> Survey -> Order` belum bisa dimodelkan penuh
- dedicated corporate dan home broadband belum bisa dibedakan dengan baik pada tahap pra-order

Rekomendasi tabel:

- `sales_covered_areas`
- `sales_surveys`
- `sales_survey_photos`

Field minimum:

- kode area / cluster
- alamat / koordinat
- status coverage
- hasil feasible / not feasible
- assigned surveyor
- tanggal survey
- catatan teknis

### 2. Billing dan Collection

Kondisi saat ini:

- subscription sudah ada
- billing, invoice, payment, overdue, dan collection belum ada

Dampak:

- lifecycle pelanggan berhenti di aktivasi
- belum bisa menurunkan aturan suspend dari tagihan

Rekomendasi tabel:

- `billing_invoices`
- `billing_invoice_items`
- `billing_payments`
- `billing_collection_actions`

Field minimum:

- invoice number
- billing period
- due date
- paid amount
- payment channel
- collection status
- suspend / reconnect marker

### 3. ODP Port Detail

Kondisi saat ini:

- `network_odp` baru level header

Dampak:

- dashboard port ODP belum bisa dihitung akurat dari detail port
- assignment pelanggan ke port belum terlacak

Rekomendasi tabel:

- `network_odp_ports`

Field minimum:

- `odp_id`
- port number
- port status
- splitter/core info bila diperlukan
- subscription/customer reference bila port terpakai

### 4. Device Assignment

Kondisi saat ini:

- work order dan item movement sudah ada
- belum ada tabel assignment perangkat ke subscription/customer

Dampak:

- serial number ONU/router belum punya rumah data yang stabil
- histori perangkat terpasang dan ditarik kembali belum rapi

Rekomendasi tabel:

- `service_device_assignments`

Field minimum:

- subscription_id
- inventory_item_id
- serial_number
- assigned_at
- returned_at
- assignment_status

## Gap Prioritas Menengah

### 5. Marketing Activities

Kondisi saat ini:

- sudah penting untuk dashboard Penjualan
- belum ada tabel di schema awal

Rekomendasi tabel:

- `sales_marketing_activities`

Catatan:

- ini dibutuhkan agar performa marketing tidak bergantung penuh pada order saja

### 6. Digital Marketing Suite

Kondisi saat ini:

- ada pada blueprint
- belum dimodelkan di schema

Rekomendasi tabel:

- `marketing_digital_leads`
- `marketing_campaigns`
- `marketing_campaign_platforms`
- `marketing_content_calendars`
- `marketing_content_tags`
- `marketing_content_analytics`

Catatan:

- domain ini bisa masuk setelah core sales/support stabil

### 7. HR Internal Control Lanjutan

Kondisi saat ini:

- employee, attendance, salary slip, loan sudah ada
- leave, warning letter, notification, loan payment belum ada

Rekomendasi tabel:

- `hr_leave_requests`
- `hr_warning_letters`
- `hr_loan_payments`
- `system_notifications`

Catatan:

- sebaiknya ditambahkan sebelum payroll final diproduksikan

## Gap Prioritas Rendah atau Bisa Ditunda

### 8. Procurement dan Vendor

Masuk blueprint, tetapi belum wajib untuk validasi domain inti phase 1.

Rekomendasi tabel:

- `procurement_vendors`
- `procurement_purchase_requests`
- `procurement_purchase_orders`
- `procurement_receipts`

### 9. Corporate Workflow Formal

Kondisi saat ini:

- package, lead, order sudah ada
- quotation, contract, approval, dan BAST belum ada

Rekomendasi tabel:

- `corp_accounts`
- `corp_quotations`
- `corp_contracts`
- `corp_delivery_projects`

Catatan:

- domain ini penting, tetapi bisa masuk setelah alur home broadband stabil

## Perubahan Struktur yang Disarankan Pada Schema Saat Ini

### 1. Tambahkan referensi pegawai pada user aplikasi

Usulan:

- tambahkan `employee_id` nullable di `auth_users`

Alasan:

- user dari HR, teknisi, finance, dan admin akan lebih mudah ditelusuri ke master pegawai

### 2. Kurangi ketergantungan field nama bebas

Kondisi saat ini:

- `sales_orders.marketing_name`
- `sales_orders.teknisi_name`
- `service_work_orders.technician_name`

Usulan:

- pada iterasi berikutnya pindah ke FK seperti `marketing_user_id`, `technician_employee_id`

### 3. Tambahkan tabel staging import

Usulan:

- `staging_legacy_users`
- `staging_legacy_customers`
- `staging_legacy_orders`
- `staging_legacy_inventory`

Alasan:

- import dari tiga aplikasi lama tidak akan bersih jika langsung ke tabel final

## Rekomendasi Iterasi Schema Berikutnya

### Phase 1.1

Sudah ditambahkan ke patch schema:

1. coverage dan survey
2. billing dan collection
3. ODP port detail
4. device assignment
5. relasi employee pada user

### Phase 1.2

Status terbaru:

- staging import dasar sudah dibuat lebih awal

Tambahkan:

1. marketing activities
2. HR internal control lanjutan
3. template mapping master dan flow import sample

### Phase 2

Tambahkan:

1. digital marketing suite
2. procurement dan vendor
3. corporate quotation, contract, dan project delivery

## Keputusan Praktis

Untuk review awal di XAMPP, schema saat ini sudah cukup untuk:

- auth dasar
- CRM dan order dasar
- subscription dan work order dasar
- support inti
- inventory inti
- HR dasar

Tetapi schema ini belum cukup untuk disebut end-to-end ERP ISP. Karena itu, setelah review tabel awal selesai, fokus tambahan paling masuk akal adalah `billing`, `coverage/survey`, dan `ODP port detail`.
