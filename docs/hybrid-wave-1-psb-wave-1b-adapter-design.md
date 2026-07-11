# Hybrid Wave 1 PSB Wave 1B Adapter Design

## Tujuan

Dokumen ini merinci langkah lanjut setelah `Wave 1A` tervalidasi pada review DB, dengan fokus pada tiga domain yang masih memerlukan adapter atau fondasi schema lanjutan:

1. `Ticket` legacy yang harus dipecah ke customer, address, order, subscription, dan work order
2. `CoveredArea` dan `MarketingActivity` yang perlu dipindahkan ke model sales ERP yang lebih rapi
3. `network_odp_ports` yang belum memiliki source production legacy langsung dan harus dibentuk native di ERP

Dokumen ini menjawab lima hal:

- tabel mana yang sudah bisa dipakai tanpa patch baru
- kolom staging mana yang cukup dan mana yang masih kurang
- aturan pecah row `Ticket` legacy ke entitas final ERP
- batas yang jelas antara `adapter` dan `schema-new`
- urutan batch paling aman setelah `Wave 1A`

## Dasar Acuan

- Mapping final production PSB: [hybrid-wave-1-psb-production-final-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-final-mapping.md)
- Desain dan validasi `Wave 1A`: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md), [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md)
- Staging review saat ini: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- Schema final review saat ini: [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql)

## Ringkasan Keputusan

### Wave 1B yang Bisa Langsung Digarap

- `Ticket` -> `staging_legacy_customer_records` + `staging_legacy_order_records`
- `Package` -> `sales_packages` lewat seed/mapping
- `TroubleTicketMaster` -> ditahan sebagai adapter master config support

Alasan:

- tabel staging customer dan order sudah ada
- tabel final customer, address, order, subscription, dan work order juga sudah ada
- `Wave 1A` sudah membuktikan jalur sample -> staging -> final table berjalan

### Masih Perlu Fondasi Schema Baru, Bukan Sekadar Adapter

- `CoveredArea` -> `sales_covered_areas`
- `MarketingActivity` -> `sales_marketing_activities` + relasi area
- `network_odp_ports`

Alasan:

- `sales_covered_areas` memang sudah ada, tetapi staging khususnya belum ada
- `sales_marketing_activities` belum ada di final review schema
- `network_odp_ports` ada di final review schema, tetapi belum punya source legacy detail port

Kesimpulan:

- `Ticket` adalah fokus utama `Wave 1B`
- `CoveredArea`, `MarketingActivity`, dan `network_odp_ports` disiapkan pada tahap `Wave 1B prep`, lalu dieksekusi sebagai `Wave 1C schema-new`

## Bagian A: Adapter `Ticket`

### Kenapa `Ticket` Perlu Adapter

Satu row `Ticket` production mencampur:

- identitas customer
- alamat dan titik lokasi
- permintaan pemasangan
- status order
- paket layanan
- penanggung jawab marketing
- penanggung jawab teknisi
- bukti progres instalasi

Karena itu satu row source tidak boleh diimpor mentah ke satu tabel final.

### Target Final per Satu Row `Ticket`

Setiap row `Ticket` minimal dipecah menjadi:

1. `crm_customers`
2. `crm_customer_addresses`
3. `sales_orders`
4. `service_subscriptions`
5. `service_work_orders`

### Staging yang Sudah Tersedia

#### `staging_legacy_customer_records`

Sudah cukup untuk menampung:

- `legacy_id`
- `customer_name`
- `phone`
- `address_text`
- `maps_url`
- `latitude`
- `longitude`
- `marketing_name`
- `target_customer_id`
- `target_address_id`

Pemakaian untuk source `Ticket`:

- `legacy_id` diisi dengan `Ticket.id`
- `customer_name` diisi dari `customerName`
- `phone` diisi dari `phoneNumber`
- `address_text` diisi dari alamat customer jika tersedia
- `maps_url` diisi dari `locationMap`
- `marketing_name` diisi dari `marketingName`

#### `staging_legacy_order_records`

Sudah cukup untuk menampung:

- `legacy_id`
- `legacy_customer_id`
- `legacy_package_name`
- `order_no`
- `order_type`
- `order_status`
- `request_date`
- `scheduled_installation_at`
- `installed_date`
- `marketing_name`
- `teknisi_name`
- `location_map`
- `target_order_id`
- `target_subscription_id`
- `target_work_order_id`

Pemakaian untuk source `Ticket`:

- `legacy_id` diisi dengan `Ticket.id`
- `legacy_customer_id` diisi dengan `Ticket.id` yang sama agar mudah dikaitkan ke row customer hasil split
- `legacy_package_name` diisi dari `package`
- `order_no` diisi dari nomor ticket/order legacy bila ada
- `order_status` diisi dari `statusOrder`
- `request_date` diisi dari `requestDate`
- `installed_date` diisi dari `installedDate`
- `marketing_name` diisi dari `marketingName`
- `teknisi_name` diisi dari `teknisi`
- `location_map` diisi dari `locationMap`

### Gap Minimum yang Masih Direkomendasikan

Meski staging saat ini sudah cukup untuk batch adapter awal, ada beberapa kolom yang direkomendasikan agar import nyata lebih aman:

1. pada `staging_legacy_customer_records`
   - `legacy_root_type`
   - `legacy_branch_name`
   - `customer_code_source`
2. pada `staging_legacy_order_records`
   - `legacy_root_type`
   - `service_status_candidate`
   - `payment_status_text`
   - `priority_name`
   - `legacy_marketing_ref`
   - `legacy_teknisi_ref`

Status rekomendasi:

- tidak wajib untuk sample adapter awal
- sangat direkomendasikan sebelum import produksi penuh

### Aturan Split `Ticket` ke Final ERP

#### Customer

- buat atau match `crm_customers` berdasarkan kunci normalisasi nama + phone
- bila source punya kode customer yang stabil, simpan sebagai referensi utama
- jangan gunakan `Ticket.id` langsung sebagai `customer_code` final tanpa prefix ERP

#### Address

- buat `crm_customer_addresses` dari alamat + koordinat + `locationMap`
- satu customer cukup memiliki satu alamat utama pada batch awal
- duplicate address harus dicegah dengan normalisasi customer + address text

#### Order

- buat `sales_orders` dari row `Ticket`
- `order_type` default `NEW_INSTALL` bila tidak ada sinyal lain
- `status` final ERP diisi dari translasi `statusOrder`, bukan copy mentah

#### Subscription

- buat `service_subscriptions` hanya jika ada sinyal layanan benar-benar terbentuk
- kandidat sinyal:
  - `installedDate` terisi
  - `status` sudah mendekati `ACTIVE`
  - paket layanan valid
- jika belum aktif, subscription boleh tetap `PENDING`

#### Work Order

- buat `service_work_orders` bila row menunjukkan pekerjaan lapangan aktif atau selesai
- `work_type` default `INSTALLATION`
- `technician_name`, `scheduled_at`, `completed_at`, dan `notes` diisi dari data legacy yang tersedia

### Translasi Status Minimal

Batch adapter awal wajib memiliki mapping minimal:

- `statusOrder` -> `sales_orders.status`
- `status` ticket -> `service_subscriptions.status`
- `installedDate` ada/tidak ada -> `service_work_orders.status`

Rekomendasi translasi konservatif:

- order belum selesai -> `REGISTERED`
- order terjadwal -> `REGISTERED`
- instalasi sudah berjalan -> `OPEN`
- instalasi selesai -> `DONE`
- service aktif -> `ACTIVE`
- service belum terpasang -> `PENDING`

### Batch Eksekusi yang Direkomendasikan

#### Batch 1B-1: Package dan Mapping Pendukung

Tujuan:

- pastikan `sales_packages` punya mapping untuk nama paket legacy
- siapkan translasi status order dan status service

Output minimum:

- package mapping siap
- nilai default branch/role pemilik batch siap

#### Batch 1B-2: Ticket Split ke Customer + Order Staging

Tujuan:

- pecah row `Ticket` production ke dua staging:
  - `staging_legacy_customer_records`
  - `staging_legacy_order_records`

Output minimum:

- satu row source menghasilkan jejak staging yang bisa ditelusuri
- `normalized_key` customer dan order konsisten

#### Batch 1B-3: Transform Stage 2 + Stage 3

Tujuan:

- jalankan transform customer, address, order, subscription
- lanjutkan work order bila aturan split sudah memenuhi syarat

Output minimum:

- `target_customer_id`
- `target_address_id`
- `target_order_id`
- `target_subscription_id`
- `target_work_order_id` bila applicable

## Bagian B: `CoveredArea` dan `MarketingActivity`

### Posisi Saat Ini

- `sales_covered_areas` sudah ada di review schema
- staging coverage belum ada
- `sales_marketing_activities` belum ada di final schema
- source `MarketingActivity` memakai `areaId`, `areaId2`, `areaId3`, `areaId4`

Kesimpulan:

- `CoveredArea` bisa disiapkan sebagai `Wave 1B prep`
- `MarketingActivity` harus masuk `Wave 1C schema-new`

### Desain Target yang Direkomendasikan

#### `CoveredArea`

Source field yang ada:

- `id`
- `name`
- `description`

Target final:

- `sales_covered_areas.area_code`
- `sales_covered_areas.area_name`
- `sales_covered_areas.notes`

Aturan:

- `area_code` jangan memakai angka source mentah tanpa prefix
- gunakan format seperti `PSB-AREA-{legacy_id}` pada tahap awal
- `description` masuk ke `notes`

#### `MarketingActivity`

Target final yang direkomendasikan:

1. tabel utama `sales_marketing_activities`
2. tabel child `sales_marketing_activity_areas`

Kolom minimal tabel utama:

- `id`
- `branch_id`
- `activity_date`
- `marketing_name`
- `activity_type`
- `notes`
- `source_system`
- `legacy_id`
- `created_at`
- `updated_at`

Kolom minimal tabel child:

- `id`
- `activity_id`
- `covered_area_id`
- `sort_order`
- `created_at`

Kenapa perlu tabel child:

- source legacy memakai 4 kolom area terpisah
- model ERP lebih rapi bila jumlah area tidak dibatasi 4 kolom

### Staging yang Direkomendasikan

Tambahkan staging khusus:

1. `staging_legacy_sales_coverage_records`
2. `staging_legacy_marketing_activity_records`
3. `staging_legacy_marketing_activity_area_records`

Kolom minimum coverage staging:

- `batch_id`
- `source_system`
- `legacy_id`
- `area_code`
- `area_name`
- `notes`
- `target_covered_area_id`
- `import_status`

Kolom minimum marketing activity staging:

- `batch_id`
- `source_system`
- `legacy_id`
- `activity_date`
- `marketing_name`
- `activity_type`
- `notes`
- `target_activity_id`
- `import_status`

Kolom minimum relasi area activity staging:

- `batch_id`
- `source_system`
- `legacy_activity_id`
- `legacy_area_id`
- `sort_order`
- `target_activity_id`
- `target_covered_area_id`
- `import_status`

## Bagian C: Fondasi `network_odp_ports`

### Posisi Saat Ini

- final table `network_odp_ports` sudah ada
- source production hanya punya `psb_odp` header
- tidak ada tabel port detail legacy yang bisa diimport langsung

Kesimpulan:

- `network_odp_ports` bukan target import copy-first
- `network_odp_ports` harus dibentuk native oleh ERP

### Prinsip Desain Port ERP

Satu row `network_odp_ports` harus mewakili slot port nyata, bukan ringkasan header.

Kolom yang sudah ada dan tepat untuk dipakai:

- `odp_id`
- `port_no`
- `port_status`
- `splitter_slot`
- `core_label`
- `subscription_id`
- `customer_id`
- `installed_at`
- `notes`

### Cara Bootstrap Awal yang Direkomendasikan

Setelah `network_odp` berhasil diisi dari `psb_odp`, bootstrap awal `network_odp_ports` dilakukan dengan aturan:

1. buat port `1..total_ports` untuk setiap ODP aktif
2. set seluruh port awal menjadi `AVAILABLE`
3. jangan langsung menandai `USED` berdasarkan angka `terpakai` tanpa evidence port-by-port
4. simpan selisih occupancy awal hanya di level header ODP atau catatan bootstrap

Alasan:

- angka `terpakai` di source legacy hanya menunjukkan agregat
- tidak ada data yang memberi tahu port nomor berapa yang sudah dipakai

### Pilihan Fase Eksekusi

#### Opsi Aman

- bootstrap semua port sebagai `AVAILABLE`
- operator ERP kemudian mengisi slot riil saat penugasan pelanggan berikutnya

#### Opsi Semi-Otomatis

- bootstrap seluruh port
- tandai sejumlah `terpakai` pertama sebagai `USED`
- beri catatan `bootstrap occupancy only`

Catatan:

- opsi ini cepat, tetapi berisiko menimbulkan asumsi palsu bila posisi port sebenarnya berbeda

Rekomendasi:

- pakai `Opsi Aman`

## Urutan Batch Setelah `Wave 1A`

### Wave 1B: Adapter Existing Schema

1. siapkan mapping package dan translasi status `Ticket`
2. siapkan sample/import `Ticket split`
3. jalankan transform stage 2
4. validasi customer, address, order, subscription, dan work order

### Wave 1C: Schema-New Sales dan ODP Port

1. patch staging untuk `CoveredArea`
2. patch final schema untuk `sales_marketing_activities`
3. patch staging relasi area marketing activity
4. siapkan bootstrap native `network_odp_ports`

## Kriteria Lulus Batch Berikutnya

### Untuk `Ticket`

- satu row source menghasilkan customer final
- alamat utama terbentuk
- order final terbentuk
- subscription final terbentuk bila syarat aktif terpenuhi
- work order final terbentuk bila ada sinyal pekerjaan lapangan

### Untuk `CoveredArea`

- setiap area punya `area_code` stabil dan idempotent
- tidak ada duplikasi area karena nama yang sama

### Untuk `MarketingActivity`

- satu activity bisa membawa lebih dari satu area
- tidak ada desain yang membatasi hanya 4 area permanen di final ERP

### Untuk `network_odp_ports`

- setiap ODP memiliki slot `1..total_ports`
- tidak ada asumsi port `USED` palsu tanpa bukti port-by-port

## Next Step

Langkah paling natural setelah dokumen ini:

1. siapkan sample batch `Ticket split` ke staging customer dan order
2. siapkan query review `Wave 1B Ticket`
3. tentukan patch schema `Wave 1C` untuk:
   - `staging_legacy_sales_coverage_records`
   - `staging_legacy_marketing_activity_records`
   - `staging_legacy_marketing_activity_area_records`
   - `sales_marketing_activities`
   - `sales_marketing_activity_areas`
4. siapkan draft bootstrap native untuk `network_odp_ports`
