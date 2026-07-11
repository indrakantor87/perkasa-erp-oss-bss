# Hybrid Wave 1 PSB Production Final Mapping

## Tujuan

Dokumen ini mengunci mapping final `Web PSB production` ke:

1. tabel staging ERP
2. tabel final ERP
3. aturan normalisasi yang wajib dipakai
4. keputusan apa yang dicopy dari legacy dan apa yang harus dibentuk ulang di ERP

Dokumen ini dibuat berdasarkan:

- audit repo `web-psb-perkasa`
- schema production nyata dari Coolify
- hasil constraint audit
- sample row production untuk `Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`, dan `psb_odp`

## Ringkasan Eksekutif

### Yang Sudah Pasti dari Production

- `Isolation` adalah queue isolir aktif dan tidak selalu punya relasi `ticketId`
- `DismantleTickets` adalah queue terminate aktif berbasis snapshot, dengan jembatan utama `sourceIsolationId`
- `DismantleHistory` adalah histori close terminate dan mendukung dua pola:
  - histori baru yang punya `sourceIsolationId`
  - histori lama yang hanya bertumpu pada `ticketDismantle`
- `TroubleTicket` memuat dua lane sekaligus:
  - `TT` untuk emergency
  - `PV` untuk preventive
- `psb_odp` hanya menyimpan header ODP, bukan port detail

### Implikasi Final

- `DB production PSB` layak menjadi sumber data wave 1
- `repo legacy` tetap dipakai untuk UI, query, dan workflow
- `ERP baru` tidak boleh menyalin mentah struktur legacy yang longgar
- `network_odp_ports` harus menjadi desain ERP baru karena tidak ada sumber tabel production terpisah

## Sumber Audit

- Tabel/matrix awal: [hybrid-wave-1-psb-table-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-table-matrix.md)
- Checklist akses DB production: [hybrid-wave-1-psb-production-db-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-db-checklist.md)
- Repo source: [web-psb-perkasa](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa)

## Arti Status

- `ready`: siap masuk wave 1 dengan aturan normalisasi yang sudah jelas
- `adapter`: bisa dipakai, tetapi perlu adaptor transform khusus
- `schema-new`: data source ada, tetapi target final ERP harus dibentuk baru
- `defer`: penting, tetapi bukan blocker wave 1 operasional

## Mapping Final Production ke ERP

| Production Table | Staging ERP | Final ERP | Status | Aturan Normalisasi | Catatan Penting |
|---|---|---|---|---|---|
| `User` | `staging_legacy_user_records` | `auth_users`, `auth_roles`, `org_divisions` | ready | map `role` dan `division` ke capability ERP, jangan bawa auth lama mentah | source user legacy valid, tapi role harus dinormalisasi |
| `Ticket` | `staging_legacy_customer_records`, `staging_legacy_order_records` | `crm_customers`, `crm_customer_addresses`, `sales_orders`, `service_subscriptions`, `service_work_orders` | adapter | pecah satu row source menjadi customer + order + service + work order | source mencampur data pelanggan, order, instalasi, dan lapangan |
| `Isolation` | `staging_legacy_support_records` (`ISOLATION`) | `support_isolations` | ready | relasi ke customer/service jangan hanya bergantung pada `ticketId`; `ticketDismantle` harus disimpan sebagai fallback legacy | sample production menunjukkan mayoritas row aktif punya `ticketId = null` |
| `DismantleTickets` | `staging_legacy_support_records` (`DISMANTLE_QUEUE`) | `support_dismantle_queue` | ready | `sourceIsolationId` jadi anchor utama bila ada; `ticketNumber` dan `customerName` tetap harus disimpan sebagai fallback display | queue aktif terminate nyata dan konsisten berstatus `OPEN` |
| `DismantleHistory` | `staging_legacy_support_records` (`DISMANTLE_HISTORY`) | `support_dismantle_history` | ready | history harus mendukung dua mode: linked (`sourceIsolationId`) dan legacy fallback (`ticketDismantle`, `customerName`, `closedAt`) | sample production menunjukkan campuran histori baru dan histori lama |
| `TroubleTicket` | `staging_legacy_support_records` (`TROUBLE_TICKET`) | `support_trouble_tickets` | ready | `category = TT` dan `category = PV` tetap satu source transaksi, tetapi UI lane ERP boleh dipisah | `OPEN` vs `CLOSE`, `problemCategory`, dan `resolutionAction` valid untuk filter operasional |
| `TroubleTicketPhoto` | `staging_legacy_support_records` (`TROUBLE_TICKET_PHOTO`) | `support_trouble_ticket_photos` | ready | validasi `ticketId` manual saat import karena FK database tidak terlihat di audit constraint | lebih dapat diandalkan daripada hanya array `closePhotos` |
| `TroubleTicketSla` | `staging_legacy_support_records` (`TROUBLE_TICKET_SLA`) | `support_trouble_ticket_sla` | ready | perlakukan sebagai master/config, bukan transaksi | cocok untuk lane SLA dan dashboard aging |
| `TroubleTicketMaster` | `staging_legacy_support_records` (`TROUBLE_TICKET_MASTER`) | tabel master support baru atau config service | adapter | pisahkan `kind` sebagai namespace master | berguna untuk dropdown/problem/resolution catalog |
| `CoveredArea` | staging master coverage baru | `sales_covered_areas` | schema-new | map `name` dan `description` langsung; tetap siapkan idempotent import | source sederhana dan stabil |
| `MarketingActivity` | staging marketing activity baru | `sales_marketing_activities` + relasi area | schema-new | ubah `areaId..areaId4` menjadi relasi child/pivot, jangan pertahankan model denormalized | UI legacy boleh dicopy, data final ERP harus lebih rapi |
| `Package` | staging master package baru | `sales_packages` | ready | seed dari production lalu sinkronkan code/price dari rule bisnis ERP | source hanya menyimpan nama paket |
| `Priority` | staging master priority baru | master priority ERP / enum helper | adapter | normalisasi `name` + `color` ke format badge ERP | relevan untuk sales dan support filter |
| `WhatsappTemplate` | staging helper template baru | helper template / config service ERP | adapter | pertahankan `isDefault`, tapi jangan campur dengan auth/setting lama | penting untuk parity UX `Ticket List` dan CS |
| `psb_odp` | batch staging ODP header | `network_odp` | ready | map `nama_odp`, `wilayah`, `lokasi`, `kapasitas`, `terpakai`, `status_tiang`, `latitude`, `longitude` | sample production valid dan cukup kaya untuk inventory header |
| `network_odp_ports` (target ERP) | belum ada source legacy | `network_odp_ports` | schema-new | bentuk tabel ERP baru berbasis occupancy/slot, bukan hasil copy langsung dari production PSB | audit production mengonfirmasi tidak ada tabel port detail terpisah |
| `SecurityLogs` | staging audit opsional | `system_audits` / `auth_audits` | defer | import hanya bila dibutuhkan untuk histori migrasi | bukan blocker operasional wave 1 |

## Aturan Normalisasi Wajib

### 1. `Ticket` Tidak Boleh Dipindah Mentah

Satu row `Ticket` production harus dibaca sebagai campuran:

- identitas customer
- permintaan pemasangan
- paket layanan
- progres instalasi
- penanggung jawab marketing/teknisi

Karena itu, import final harus dipecah menjadi:

1. `crm_customers`
2. `crm_customer_addresses`
3. `sales_orders`
4. `service_subscriptions`
5. `service_work_orders`

### 2. `Isolation` Harus Mendukung Relasi Longgar

Temuan sample production:

- banyak isolir aktif punya `ticketId = null`
- `ticketDismantle` juga sering kosong

Implikasi:

- join ke customer/service tidak boleh hanya bertumpu pada FK
- fallback matching perlu memakai:
  - nama customer
  - phone
  - marketing
  - radboox
  - tanggal isolir

### 3. `DismantleHistory` Harus Dual Mode

Temuan sample production:

- sebagian row punya `sourceIsolationId`
- sebagian row lama punya `sourceIsolationId = null`
- `ticketDismantle` tetap konsisten sebagai identifier

Implikasi:

- histori ERP harus menyimpan:
  - foreign key bila ada
  - identifier legacy bila tidak ada
- `closedBy` wajib dipertahankan karena mengandung ownership nyata (`Team Dismantle`, `Customer Service`)

### 4. `TroubleTicket` Tetap Satu Source, UI Boleh Dipisah

Temuan sample production:

- `category = TT` untuk emergency
- `category = PV` untuk preventive

Implikasi:

- staging bisa tetap satu source
- final ERP boleh tetap satu tabel transaksi
- tetapi workspace/UI ERP boleh memisahkan lane:
  - trouble ticket aktif
  - preventive / SLA / maintenance

### 5. `MarketingActivity` Harus Dinormalisasi

Temuan schema production:

- satu row memiliki `areaId`, `areaId2`, `areaId3`, `areaId4`

Implikasi:

- target final ERP jangan meniru model 4 kolom area
- gunakan:
  - tabel utama activity
  - tabel relasi area per activity

### 6. `psb_odp` Adalah Header, Bukan Slot Port

Temuan schema dan sample production:

- hanya ada tabel `psb_odp`
- tidak ada tabel port/detail lain yang terdeteksi

Implikasi:

- `network_odp` bisa diisi dari production PSB
- `network_odp_ports` harus menjadi model ERP baru
- occupancy awal bisa dihitung dari `kapasitas` dan `terpakai`
- detail slot per port memerlukan UI dan write-path ERP tersendiri

## Bukti Data Nyata yang Mengubah Keputusan

### Isolation

Sample production menunjukkan:

- status dominan `OPEN`
- banyak row baru
- mayoritas row aktif tidak punya `ticketId`

Kesimpulan:

- lifecycle isolir lebih dekat ke queue operasional daripada relasi sales murni

### DismantleTickets

Sample production menunjukkan:

- queue aktif terminate benar-benar terpisah
- `sourceIsolationId` sering ada
- `ticketNumber` bisa kosong

Kesimpulan:

- ERP harus menyimpan nomor tiket sebagai opsional
- queue aktif tetap bisa hidup meskipun belum ada nomor tiket final

### DismantleHistory

Sample production menunjukkan:

- histori baru: linked ke isolir
- histori lama: tidak linked
- ownership nyata tersimpan di `closedBy`

Kesimpulan:

- history ERP tidak boleh rigid terhadap FK

### TroubleTicket

Sample production menunjukkan:

- `TT` dan `PV` hidup dalam satu tabel
- `resolutionAction` lazimnya baru ada setelah close

Kesimpulan:

- rule ERP dapat menganggap `resolutionAction` sebagai evidence close, bukan syarat open

### psb_odp

Sample production menunjukkan:

- data header valid
- kapasitas dan terpakai real
- koordinat dan wilayah siap dipakai

Kesimpulan:

- `network_odp` wave 1 bisa memakai source production ini tanpa menunggu port detail

## Prioritas Implementasi Berdasarkan Audit Production

### Wave 1A: Langsung Bisa Dijalankan

- `Isolation` -> `support_isolations`
- `DismantleTickets` -> `support_dismantle_queue`
- `DismantleHistory` -> `support_dismantle_history`
- `TroubleTicket` -> `support_trouble_tickets`
- `TroubleTicketPhoto` -> `support_trouble_ticket_photos`
- `TroubleTicketSla` -> `support_trouble_ticket_sla`
- `psb_odp` -> `network_odp`

### Wave 1B: Perlu Adapter, Tetapi Siap Digarap

- `Ticket` -> customer/order/subscription/work order
- `TroubleTicketMaster` -> support master config
- `Priority` -> master priority ERP
- `WhatsappTemplate` -> helper template ERP

### Wave 1C: Butuh Schema Baru ERP

- `CoveredArea` -> `sales_covered_areas`
- `MarketingActivity` -> `sales_marketing_activities` + relasi area
- `network_odp_ports`

## Dampak ke Workspace ERP yang Sudah Ada

### Sudah Selaras dengan Temuan Production

- `/support/isolations`
- `/support/dismantle`
- `/support/tt`
- `/support/sla`
- `/inventory` untuk header ODP

### Perlu Penguatan Berdasarkan Data Nyata

- workspace `Dismantle` harus tetap mendukung kasus tanpa link isolir sempurna
- workspace `Trouble Ticket` perlu membaca `TT` dan `PV` sebagai dua lane UI dari satu source transaksi
- workspace `Inventory ODP` harus fokus ke header ODP dulu, lalu ERP menambahkan slot port secara native

### Perlu Patch Schema sebelum Sinkron Data Penuh

- `sales_covered_areas`
- `sales_marketing_activities`
- relasi area marketing activity
- `network_odp_ports`

## Keputusan Final Wave 1

1. gunakan `Web PSB production DB` sebagai source of truth data
2. gunakan repo `web-psb-perkasa` sebagai source of truth UI dan logic legacy
3. gunakan ERP baru sebagai target schema final yang lebih rapi
4. jangan copy mentah struktur data yang longgar jika ERP bisa menormalkannya
5. pertahankan fallback legacy pada domain support untuk menjaga kompatibilitas data lapangan

## Next Step

Langkah paling natural setelah dokumen ini:

1. sinkronkan matriks awal `Web PSB` dengan temuan production final
2. siapkan batch import staging wave 1A untuk:
   - `Isolation`
   - `DismantleTickets`
   - `DismantleHistory`
   - `TroubleTicket`
   - `TroubleTicketPhoto`
   - `TroubleTicketSla`
   - `psb_odp`
3. siapkan patch schema ERP untuk:
   - `sales_covered_areas`
   - `sales_marketing_activities`
   - relasi area marketing
   - `network_odp_ports`
4. lanjutkan parity workspace copy-first dengan berpatokan ke data production nyata yang sudah diaudit
