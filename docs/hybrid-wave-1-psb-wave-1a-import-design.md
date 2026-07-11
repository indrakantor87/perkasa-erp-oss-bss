# Hybrid Wave 1 PSB Wave 1A Import Design

## Tujuan

Dokumen ini merinci desain `wave 1A staging/import` untuk source production `Web PSB`, dengan fokus pada domain:

1. `Isolation`
2. `DismantleTickets`
3. `DismantleHistory`
4. `TroubleTicket`
5. `TroubleTicketPhoto`
6. `TroubleTicketSla`
7. `psb_odp`

Dokumen ini menjawab empat hal:

- batch mana yang bisa langsung memakai schema staging yang sudah ada
- batch mana yang membutuhkan patch schema staging
- aturan normalisasi minimum yang harus dipakai saat import
- urutan eksekusi yang paling aman untuk review DB ERP

## Dasar Acuan

- Staging saat ini: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- Transform support saat ini: [staging-transform-stage-3.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-transform-stage-3.md)
- Mapping final production PSB: [hybrid-wave-1-psb-production-final-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-final-mapping.md)

## Ringkasan Keputusan

### Bisa Langsung Memakai Struktur Saat Ini

- `Isolation`
- `DismantleHistory`
- `TroubleTicket`

Alasan:

- `staging_legacy_support_records` sudah ada
- `support_type` saat ini sudah mencakup:
  - `TROUBLE_TICKET`
  - `ISOLATION`
  - `DISMANTLE_HISTORY`
- `database/xampp_review_transform_stage_3.sql` juga sudah punya jalur transform untuk ketiganya

### Perlu Patch Minimum Sebelum Masuk Batch Resmi

- `DismantleTickets`
- `TroubleTicketPhoto`
- `TroubleTicketSla`
- `psb_odp`

Alasan:

- `DismantleTickets` belum punya `support_type` resmi di staging
- `TroubleTicketPhoto` di production berasal dari tabel detail, sedangkan transform saat ini hanya membaca `photo_list_text`
- `TroubleTicketSla` belum punya target mapping field yang eksplisit di staging
- `psb_odp` bukan `inventory item` biasa, sehingga memakai `staging_legacy_inventory_item_records` hanya cocok sebagai solusi sementara

## Kondisi Schema Saat Ini

### 1. `staging_legacy_support_records`

Struktur saat ini mendukung:

- `support_type`
- `ticket_code`
- `customer_name`
- `customer_user`
- `category`
- `trouble_type`
- `support_status`
- `opened_at`
- `closed_at`
- `reason_text`
- `problem_category`
- `resolution_action`
- `photo_list_text`
- `raw_payload`
- `normalized_key`
- `target_subscription_id`
- `target_trouble_ticket_id`
- `target_isolation_id`
- `target_dismantle_history_id`

Keterbatasan untuk wave 1A:

- belum ada `DISMANTLE_QUEUE`
- belum ada `target_dismantle_queue_id`
- belum ada tempat eksplisit untuk:
  - `sourceIsolationId`
  - `fieldNote`
  - `ticketNumber` dismantle
  - `closedBy`
  - `customerAddress`
  - `customerPhone`
  - `marketing`
  - `radboox`

### 2. `staging_legacy_inventory_item_records`

Tabel ini lebih cocok untuk:

- inventory GA
- item master gudang

Keterbatasannya untuk `psb_odp`:

- field target finalnya menuju `inventory_items`, bukan `network_odp`
- struktur source `psb_odp` adalah asset jaringan/header node, bukan item gudang

Kesimpulan:

- `psb_odp` sebaiknya memakai staging khusus

## Patch Minimum yang Direkomendasikan

### Patch A: Perluasan `staging_legacy_support_records`

Tambahan minimal yang direkomendasikan:

1. perluas `support_type` dengan nilai:
   - `DISMANTLE_QUEUE`
   - `TROUBLE_TICKET_PHOTO`
   - `TROUBLE_TICKET_SLA`
   - `TROUBLE_TICKET_MASTER`
2. tambah kolom:
   - `legacy_parent_id`
   - `legacy_reference_code`
   - `customer_address`
   - `customer_phone`
   - `marketing_name`
   - `radbox_name`
   - `actor_name`
   - `note_text`
   - `target_dismantle_queue_id`
   - `target_trouble_ticket_sla_id`
3. pertahankan `raw_payload` sebagai tempat fallback bila patch kolom belum lengkap

Kenapa patch ini cukup:

- masih menjaga satu staging support terpadu
- tetap konsisten dengan arsitektur transform tahap 3
- tidak memaksa pembuatan banyak tabel baru sekaligus

### Patch B: Tambah staging khusus `psb_odp`

Rekomendasi:

- buat tabel baru `staging_legacy_network_odp_records`

Kolom minimum:

- `batch_id`
- `source_system`
- `legacy_id`
- `odp_code`
- `odp_name`
- `region_name`
- `location_text`
- `latitude`
- `longitude`
- `total_ports`
- `active_ports`
- `pole_status`
- `is_active`
- `raw_payload`
- `normalized_key`
- `target_odp_id`
- `import_status`
- `validation_notes`
- `imported_at`

Kenapa tidak memakai staging inventory umum:

- target finalnya `network_odp`
- source-nya network header, bukan inventory item/gudang
- occupancy ODP lebih relevan sebagai kapasitas port, bukan stok item

## Desain Batch Wave 1A

### Batch 1A-1: Support Core Existing Schema

Source:

- `Isolation`
- `TroubleTicket`
- `DismantleHistory`

Staging:

- `staging_legacy_support_records`

Transform:

- lanjutkan memakai `database/xampp_review_transform_stage_3.sql`

Target final:

- `support_isolations`
- `support_trouble_tickets`
- `support_trouble_ticket_photos` dari `photo_list_text` bila source array tersedia
- `support_dismantle_history`

Catatan:

- batch ini bisa dijalankan paling cepat karena struktur dasarnya sudah ada

### Batch 1A-2: Support Extended Patch

Source:

- `DismantleTickets`
- `TroubleTicketPhoto`
- `TroubleTicketSla`
- `TroubleTicketMaster`

Staging:

- `staging_legacy_support_records` setelah patch A

Transform:

- stage 3 diperluas atau buat `stage_3_support_extension.sql`

Target final:

- `support_dismantle_queue`
- `support_trouble_ticket_photos`
- `support_trouble_ticket_sla`
- master support config baru

Catatan:

- `DismantleTickets` tidak cocok dipaksa masuk sebagai `DISMANTLE_HISTORY`
- `TroubleTicketPhoto` dari production sebaiknya diperlakukan sebagai source utama evidence, bukan hanya fallback dari `closePhotos[]`

### Batch 1A-3: Network ODP Header

Source:

- `psb_odp`

Staging:

- `staging_legacy_network_odp_records` setelah patch B

Transform:

- script baru khusus `network_odp`

Target final:

- `network_odp`

Catatan:

- `network_odp_ports` belum diisi dari legacy production
- initial occupancy dihitung dari:
  - `kapasitas` -> `total_ports`
  - `terpakai` -> `active_ports`

## Aturan Mapping per Source

### 1. `Isolation`

Source field penting:

- `id`
- `customerName`
- `customerAddress`
- `customerPhone`
- `marketing`
- `radboox`
- `price`
- `isolationDate`
- `reason`
- `status`
- `restorationDate`
- `closeNote`
- `ticketId`
- `ticketDismantle`

Masuk staging:

- `legacy_id` = `id`
- `support_type` = `ISOLATION`
- `customer_name` = `customerName`
- `reason_text` = `reason`
- `support_status` = `status`
- `opened_at` = `isolationDate`
- `closed_at` = `restorationDate`
- `raw_payload` menyimpan semua field

Aturan khusus:

- `ticketId` hanya helper, bukan kewajiban relasi
- `ticketDismantle` simpan di `raw_payload` atau `legacy_reference_code` setelah patch A

### 2. `DismantleTickets`

Source field penting:

- `id`
- `sourceIsolationId`
- `customerName`
- `customerAddress`
- `customerPhone`
- `marketing`
- `radboox`
- `isolationDate`
- `reason`
- `fieldNote`
- `status`
- `ticketNumber`

Masuk staging:

- `legacy_id` = `id`
- `support_type` = `DISMANTLE_QUEUE`
- `legacy_parent_id` = `sourceIsolationId`
- `customer_name` = `customerName`
- `support_status` = `status`
- `opened_at` = `isolationDate`
- `legacy_reference_code` = `ticketNumber`
- `note_text` = `fieldNote`
- `raw_payload` = seluruh row source

Aturan khusus:

- `ticketNumber` boleh null
- bila `sourceIsolationId` tidak cocok ke final isolation, queue tetap boleh masuk dengan fallback legacy

### 3. `DismantleHistory`

Source field penting:

- `id`
- `sourceIsolationId`
- `customerName`
- `ticketDismantle`
- `closedAt`
- `closedBy`
- `closeNote`

Masuk staging:

- `legacy_id` = `id`
- `support_type` = `DISMANTLE_HISTORY`
- `legacy_parent_id` = `sourceIsolationId`
- `customer_name` = `customerName`
- `closed_at` = `closedAt`
- `legacy_reference_code` = `ticketDismantle`
- `actor_name` = `closedBy`
- `note_text` = `closeNote`
- `raw_payload` = seluruh row source

Aturan khusus:

- jika `sourceIsolationId` kosong, tetap import history sebagai row valid
- uniqueness lebih aman memakai kombinasi:
  - `customer_name`
  - `closed_at`
  - `legacy_reference_code`

### 4. `TroubleTicket`

Source field penting:

- `id`
- `ticketCode`
- `customerName`
- `user`
- `category`
- `type`
- `status`
- `problemCategory`
- `resolutionAction`
- `openedAt`
- `closedAt`
- `closeNotes`

Masuk staging:

- `legacy_id` = `id`
- `support_type` = `TROUBLE_TICKET`
- `ticket_code` = `ticketCode`
- `customer_name` = `customerName`
- `customer_user` = `user`
- `category` = `category`
- `trouble_type` = `type`
- `support_status` = `status`
- `opened_at` = `openedAt`
- `closed_at` = `closedAt`
- `problem_category` = `problemCategory`
- `resolution_action` = `resolutionAction`
- `reason_text` atau `note_text` = `closeNotes` bila perlu

Aturan khusus:

- status source `CLOSE` harus dipetakan ke final `CLOSED` bila final schema menghendaki
- `category = PV` tetap valid dan jangan dibuang

### 5. `TroubleTicketPhoto`

Source field penting:

- `id`
- `ticketId`
- `filePath`
- `mimeType`
- `sizeBytes`

Masuk staging:

- `legacy_id` = `id`
- `support_type` = `TROUBLE_TICKET_PHOTO`
- `legacy_parent_id` = `ticketId`
- `photo_list_text` bisa diisi single-item JSON array untuk kompatibilitas sementara
- `raw_payload` = seluruh row source

Aturan khusus:

- jangan hanya mengandalkan `TroubleTicket.closePhotos[]`
- source tabel detail photo harus diprioritaskan bila ada

### 6. `TroubleTicketSla`

Source field penting:

- `id`
- `type`
- `durationDays`

Masuk staging:

- `legacy_id` = `id`
- `support_type` = `TROUBLE_TICKET_SLA`
- `trouble_type` = `type`
- `raw_payload` menyimpan `durationDays`

Aturan khusus:

- `durationDays` perlu masuk ke kolom eksplisit patch atau dibaca dari `raw_payload` pada transform pertama

### 7. `psb_odp`

Source field penting:

- `id`
- `nama_odp`
- `wilayah`
- `lokasi`
- `kapasitas`
- `terpakai`
- `status_tiang`
- `is_active`
- `latitude`
- `longitude`

Masuk staging:

- `legacy_id` = `id`
- `odp_code` = `nama_odp`
- `odp_name` = `nama_odp`
- `region_name` = `wilayah`
- `location_text` = `lokasi`
- `total_ports` = `kapasitas`
- `active_ports` = `terpakai`
- `pole_status` = `status_tiang`
- `is_active` = `is_active`
- `latitude` = `latitude`
- `longitude` = `longitude`

Aturan khusus:

- gunakan `nama_odp` sebagai code unik awal
- port detail jangan diimprovisasi di batch import ini

## Urutan Eksekusi yang Direkomendasikan

1. patch schema staging minimum:
   - extend `staging_legacy_support_records`
   - tambah `staging_legacy_network_odp_records`
2. siapkan `staging_import_batches` untuk:
   - `PSB_SUPPORT_CORE`
   - `PSB_SUPPORT_EXT`
   - `PSB_ODP_HEADER`
3. upload/dump source ke staging:
   - `Isolation`
   - `TroubleTicket`
   - `DismantleHistory`
   - `DismantleTickets`
   - `TroubleTicketPhoto`
   - `TroubleTicketSla`
   - `psb_odp`
4. jalankan transform:
   - existing stage 3 untuk support core
   - extension script untuk queue, photo detail, SLA, dan ODP
5. review hasil pada final tables
6. baru lanjut ke schema baru wave 1C:
   - `sales_covered_areas`
   - `sales_marketing_activities`
   - `network_odp_ports`

## Review Query Pasca Import

### Support

```sql
SELECT customer_name, status, isolation_date
FROM support_isolations
ORDER BY id DESC;
```

```sql
SELECT isolation_id, transferred_at, transfer_note
FROM support_dismantle_queue
ORDER BY id DESC;
```

```sql
SELECT customer_name, closed_at, close_note
FROM support_dismantle_history
ORDER BY id DESC;
```

```sql
SELECT ticket_code, category, type, status, problem_category, resolution_action
FROM support_trouble_tickets
ORDER BY id DESC;
```

```sql
SELECT trouble_ticket_id, photo_path
FROM support_trouble_ticket_photos
ORDER BY id DESC;
```

```sql
SELECT trouble_type, duration_days
FROM support_trouble_ticket_sla
ORDER BY id DESC;
```

### ODP

```sql
SELECT code, name, total_ports, active_ports, latitude, longitude
FROM network_odp
ORDER BY id DESC;
```

## Keputusan Final Wave 1A

1. jalankan `Isolation`, `TroubleTicket`, dan `DismantleHistory` lebih dulu karena jalur staging/final sudah tersedia
2. tambahkan patch minimum untuk `DismantleTickets`, `TroubleTicketPhoto`, dan `TroubleTicketSla` agar tidak dipaksa masuk lewat jalur yang salah
3. buat staging khusus `psb_odp` agar domain network tidak bercampur dengan inventory gudang
4. tunda `network_odp_ports` sampai schema ERP baru siap

## Next Step

Status sesudah batch patch schema minimum:

1. patch schema staging minimum sudah diterapkan di [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql)
2. draft transform support extension sudah tersedia di [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql)
3. draft transform ODP header sudah tersedia di [xampp_review_transform_wave_1a_network_odp.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_network_odp.sql)
4. sample batch staging `PSB_SUPPORT_EXT` dan `PSB_ODP_HEADER` sudah tersedia di [xampp_review_sample_import_wave_1a.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1a.sql)
5. langkah berikutnya adalah menjalankan sample batch tersebut di review DB, lalu memeriksa hasil transform pada tabel final
