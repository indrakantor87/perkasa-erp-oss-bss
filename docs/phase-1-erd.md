# ERD Phase 1

## Tujuan

Dokumen ini menerjemahkan `database/xampp_review_schema.sql` menjadi relasi domain yang lebih mudah direview sebelum eksekusi ke XAMPP.

Phase 1 masih fokus pada fondasi operasional:

- auth dan organisasi
- customer, order, subscription
- work order dan inventory movement
- support
- HR dasar

## Ringkasan Domain dan Relasi

```text
org_branches
  ├─< auth_users
  ├─< crm_customers
  └─< hr_employees

org_divisions
  ├─< auth_users
  └─< hr_employees

auth_roles
  └─< auth_users

auth_permissions
  └─< auth_role_permissions >─ auth_roles

crm_customers
  ├─< crm_customer_addresses
  ├─< sales_orders
  └─< service_subscriptions

sales_leads
  └─< sales_orders

sales_packages
  ├─< sales_orders
  └─< service_subscriptions

sales_orders
  ├─< service_subscriptions
  └─< service_work_orders

service_subscriptions
  ├─< service_work_orders
  ├─< support_trouble_tickets
  └─< support_isolations

service_work_orders
  └─< inventory_stock_movements

inventory_categories
  └─< inventory_items

inventory_units
  └─< inventory_items

inventory_items
  └─< inventory_stock_movements

support_trouble_tickets
  └─< support_trouble_ticket_photos

hr_employees
  ├─< hr_attendance
  ├─< hr_salary_slips
  └─< hr_loans
```

## Entitas Inti

### 1. Organisasi dan Akses

- `org_branches`
- `org_divisions`
- `auth_roles`
- `auth_permissions`
- `auth_role_permissions`
- `auth_users`

Fungsi:

- menjadi master struktur organisasi
- menyatukan user dari tiga sistem lama
- memisahkan role akses dari domain data

Catatan review:

- phase 1 masih memakai `role_id` tunggal di `auth_users`
- jika nanti satu user perlu multi-role, tambahkan tabel `auth_user_roles`

### 2. CRM, Sales, dan Aktivasi

- `crm_customers`
- `crm_customer_addresses`
- `sales_leads`
- `sales_packages`
- `sales_orders`
- `service_subscriptions`
- `service_work_orders`

Fungsi:

- memecah model campuran dari sistem lama menjadi lifecycle yang lebih jelas
- membedakan lead, order, subscription, dan pelaksanaan teknis

Alur relasi:

1. prospek masuk ke `sales_leads`
2. customer final masuk ke `crm_customers`
3. order pemasangan/perubahan masuk ke `sales_orders`
4. layanan aktif dicatat di `service_subscriptions`
5. pekerjaan teknis dicatat di `service_work_orders`

Catatan review:

- `sales_orders.marketing_name` dan `teknisi_name` masih berupa text
- pada iterasi berikutnya sebaiknya diarahkan ke user/employee relation

### 3. Inventory dan Network

- `inventory_categories`
- `inventory_units`
- `inventory_items`
- `inventory_stock_movements`
- `network_odp`

Fungsi:

- menyatukan logika GA inventory
- menyiapkan hubungan material ke work order
- menampung master ODP untuk operasional ISP

Catatan review:

- `network_odp` masih level header, belum punya detail port
- `inventory_stock_movements` belum punya actor/user pencatat
- assignment device ke pelanggan belum punya tabel khusus

### 4. Support dan Service Assurance

- `support_trouble_tickets`
- `support_trouble_ticket_photos`
- `support_trouble_ticket_sla`
- `support_isolations`
- `support_dismantle_history`

Fungsi:

- menampung TT operasional dan preventive
- memisahkan data isolir aktif dari histori dismantle closed
- menjaga konsistensi pendekatan data aktif vs histori

Catatan review:

- `support_dismantle_history` sengaja berdiri sebagai histori snapshot
- pola ini mengikuti kebutuhan agar data closed aman dari perubahan massal data aktif

### 5. HR dan Internal Control

- `hr_employees`
- `hr_attendance`
- `hr_salary_slips`
- `hr_loans`

Fungsi:

- memindahkan fondasi HR dari `finance-repo`
- menjadi basis payroll, attendance, dan kasbon

Catatan review:

- leave, warning letter, notification, dan loan payment masih di luar phase 1 schema
- payroll component detail masih disederhanakan di slip

## Hubungan Kunci yang Perlu Dijaga

### Customer Lifecycle

```text
sales_leads
  -> sales_orders
  -> service_subscriptions
  -> support_trouble_tickets / support_isolations
```

Makna:

- satu customer bisa memiliki banyak order
- satu order bisa menghasilkan satu atau lebih subscription dalam skenario tertentu
- subscription menjadi anchor untuk data support

### Material ke Eksekusi Teknis

```text
service_work_orders
  -> inventory_stock_movements
```

Makna:

- pengeluaran material idealnya bisa ditelusuri ke work order
- ini penting untuk audit penggunaan perangkat saat instalasi, repair, atau dismantle

### HR ke Akses Sistem

Relasi `auth_users` dan `hr_employees` belum diikat langsung pada schema phase 1.

Keputusan sementara:

- user aplikasi dan pegawai tetap boleh berasal dari sumber berbeda
- penyatuan identitas dilakukan nanti lewat tabel relasi atau kolom referensi employee

## Batasan ERD Phase 1

ERD ini belum mencakup:

1. billing dan collection
2. coverage dan survey
3. digital marketing suite
4. ODP port detail
5. device assignment ke subscription
6. procurement dan vendor
7. finance accounting integration

## Output Lanjutan dari ERD Ini

Dokumen ini dipakai untuk:

1. review relasi antar tabel di XAMPP
2. menyusun schema gap phase 1.1
3. menjadi dasar script staging/import legacy
