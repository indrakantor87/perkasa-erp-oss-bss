# Schema Phase 1.1

## Tujuan

Dokumen ini menjelaskan penambahan schema review tahap `1.1` yang berada di file:

- `database/xampp_review_schema_phase_1_1.sql`

File ini adalah patch lanjutan dari schema dasar:

- `database/xampp_review_schema.sql`

Urutan eksekusi review:

1. jalankan `xampp_review_schema.sql`
2. jalankan `xampp_review_schema_phase_1_1.sql`

Catatan:

- patch ini diasumsikan dijalankan sekali pada database review yang sudah berasal dari schema dasar

## Cakupan Phase 1.1

Phase ini menutup gap paling penting yang sebelumnya belum masuk schema awal:

1. coverage dan survey
2. billing dan collection
3. ODP port detail
4. device assignment
5. relasi employee ke user aplikasi

## Tabel yang Ditambahkan

### Coverage dan Survey

- `sales_covered_areas`
- `sales_surveys`
- `sales_survey_photos`

Peran:

- mencatat area coverage per cabang
- menyimpan request survey sebelum order final
- membedakan status survey dengan hasil feasibility
- menyimpan foto survey lapangan

### Billing dan Collection

- `billing_invoices`
- `billing_invoice_items`
- `billing_payments`
- `billing_collection_actions`

Peran:

- membentuk lifecycle tagihan dari terbit sampai lunas
- memungkinkan status overdue dan collection action
- menjadi dasar aturan suspend atau reconnect

### ODP Port Detail

- `network_odp_ports`

Peran:

- menurunkan `network_odp` dari level header ke detail port
- memetakan port terpakai ke customer/subscription

### Device Assignment

- `service_device_assignments`

Peran:

- mencatat serial number perangkat yang terpasang
- menghubungkan device ke subscription, customer, dan work order
- menyimpan histori return atau kerusakan perangkat

## Perubahan pada Tabel Existing

### `auth_users`

Ditambahkan:

- `employee_id`

Tujuan:

- menyatukan user aplikasi dengan data pegawai bila diperlukan
- memudahkan penelusuran admin, teknisi, finance, atau HR ke `hr_employees`

## Catatan Desain

### 1. Coverage dipisah dari survey

Alasannya:

- satu area coverage bisa dipakai banyak prospek
- survey adalah aktivitas per calon customer atau per kebutuhan layanan

### 2. Billing dipisah menjadi header, item, payment, dan collection

Alasannya:

- satu invoice bisa punya banyak komponen
- pembayaran bisa parsial
- tindakan collection perlu histori terpisah

### 3. ODP port dibuat sebagai tabel anak

Alasannya:

- metrik `total port` dan `port aktif` tidak cukup aman jika hanya disimpan agregat
- detail port dibutuhkan untuk audit pemasangan

### 4. Assignment device tidak digabung ke inventory movement

Alasannya:

- stock movement mencatat perpindahan stok
- device assignment mencatat perangkat yang benar-benar terpasang ke layanan/customer
- keduanya berhubungan, tetapi fungsi auditnya berbeda

## Dampak ke Langkah Berikutnya

Setelah schema `1.1` ini, project review sudah punya fondasi untuk:

1. alur lead -> survey -> order
2. alur aktivasi -> invoice -> payment -> collection
3. alur ODP header -> port -> subscription
4. alur item stock -> device assignment -> histori perangkat

## Hal yang Masih Belum Masuk

Masih ditunda ke iterasi berikutnya:

1. marketing activities
2. digital marketing suite
3. leave request
4. warning letter
5. loan payment
6. notification
7. staging import tables
8. procurement dan vendor
9. corporate quotation dan contract
