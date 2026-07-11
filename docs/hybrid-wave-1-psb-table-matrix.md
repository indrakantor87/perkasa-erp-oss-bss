# Hybrid Wave 1 PSB Table Matrix

## Tujuan

Dokumen ini memetakan tabel dan model utama dari `web-psb-perkasa` ke:

1. tabel staging yang sudah tersedia
2. tabel final ERP yang sudah ada
3. modul ERP target yang akan memakainya
4. status kesiapan transform saat ini

Dokumen ini adalah jembatan antara:

- audit repo legacy
- field matrix minggu 1
- staging import
- transform stage 2 dan stage 3
- implementasi workspace ERP yang sedang berjalan

## Sumber Acuan

- Repo legacy: [web-psb-perkasa](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa)
- Matriks field: [web-psb-field-matrix-week-1.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-field-matrix-week-1.md)
- Mapping domain umum: [data-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/data-mapping.md)
- Struktur staging: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- Transform customer/order/subscription: [staging-transform-stage-2.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-transform-stage-2.md)
- Transform work order/support: [staging-transform-stage-3.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-transform-stage-3.md)
- Gap schema: [schema-gap.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/schema-gap.md)

## Arti Status

- `ready`: staging dan target final sudah ada, serta jalur transform sudah jelas
- `partial`: staging/final sebagian sudah ada, tetapi masih perlu mapping tambahan atau review manual
- `gap`: staging atau final table belum tersedia resmi, atau masih perlu patch schema
- `defer`: tidak diprioritaskan di gelombang 1 walaupun penting untuk parity penuh

## Matriks Inti

| Source Table / Model | Jenis Domain | Staging Table | Final Table ERP | Modul ERP Target | Transform | Status | Catatan |
|---|---|---|---|---|---|---|---|
| `User` | auth / access | `staging_legacy_user_records` | `auth_users`, `auth_roles`, `org_divisions` | `Settings / Access / Users` | mapping manual + import user | partial | role/division legacy harus dimapping ke capability ERP baru |
| `Package` | sales master | belum ada tabel staging khusus package; gunakan master mapping package | `sales_packages` | `Sales / Orders / Subscriptions` | master seed + lookup package | partial | perlu sinkron harga dan code paket dari sumber operasional nyata |
| `Ticket` | sales / order campuran | `staging_legacy_customer_records`, `staging_legacy_order_records` | `crm_customers`, `crm_customer_addresses`, `sales_orders`, `service_subscriptions` | `Sales`, `Billing`, `Support` | stage 2 | partial | model source mencampur lead, customer, order, dan instalasi |
| `Ticket` | field ops / instalasi | `staging_legacy_order_records` | `service_work_orders` | `Sales / Work Orders`, `Teknisi PSB` | stage 3 | partial | work order diturunkan dari order, belum dari lifecycle survey yang lengkap |
| `Isolation` | support suspend | `staging_legacy_support_records` (`ISOLATION`) | `support_isolations` | `Billing`, `Support / Isolations`, `CS_ADMIN` | stage 3 | ready | jalur restore dan terminate sudah cocok dengan ownership ERP saat ini |
| `DismantleTickets` | support terminate aktif | `staging_legacy_support_records` (`ISOLATION` + helper `ticketDismantle`) | `support_dismantle_queue` dan/atau `support_dismantle_history` | `CS & Admin CS`, `Support / Dismantle` | transform lanjutan custom | partial | queue aktif ERP sudah ada, tetapi jalur import dari legacy perlu aturan eksplisit per status open/closed |
| `DismantleHistory` | support history | `staging_legacy_support_records` (`DISMANTLE_HISTORY`) | `support_dismantle_history` | `CS & Admin CS`, `Supervisor` | stage 3 | ready | histori close sudah punya target final yang jelas |
| `TroubleTicket` | support ticket | `staging_legacy_support_records` (`TROUBLE_TICKET`) | `support_trouble_tickets` | `NOC & Troubleshoots`, `Support / TT` | stage 3 | ready | status dan photos sudah dipisah jelas di target |
| `TroubleTicket.closePhotos[]` | support evidence | `staging_legacy_support_records.photo_list_text` | `support_trouble_ticket_photos` | `NOC & Troubleshoots` | stage 3 | ready | storage path masih perlu review bila source production berbeda format |
| `TroubleTicketSla` | support SLA | `staging_legacy_support_records` atau master support seed | `support_trouble_ticket_sla` | `Support / SLA`, `Dashboard` | transform support master | partial | source SLA ada, tetapi import master sebaiknya dibatch terpisah |
| `psb_odp` | network inventory | `staging_legacy_inventory_item_records` atau batch inventory khusus ODP | `network_odp` | `Inventory / ODP`, `CS_ADMIN`, `NOC` | transform ODP custom | partial | header ODP sudah ada, tetapi staging item saat ini belum khusus untuk network asset |
| `psb_odp` port detail | network inventory | belum ada staging detail port resmi | `network_odp_ports` | `Inventory / ODP Port` | patch schema + transform baru | gap | sudah dikenal sebagai gap prioritas tinggi |
| `CoveredArea` | sales coverage | belum ada | `sales_covered_areas` | `Sales / Coverage`, `Marketing Activities` | schema patch baru | gap | perlu untuk alur `Lead -> Coverage -> Survey -> Order` |
| `MarketingActivity` | sales activity | belum ada staging khusus | `sales_marketing_activities` | `Sales / Marketing Activities` | schema patch baru | gap | UI workspace sudah ada, tetapi schema target final belum resmi |
| `Priority` | sales/support reference | master mapping / seed | tabel master baru atau field enum target | `Sales`, `Support` | seed konservatif | defer | belum wajib untuk gelombang 1 selama workflow inti berjalan |
| `WhatsappTemplate` | sales support helper | belum ada | tabel helper baru atau config service | `Sales / Ticket List`, `CS` | patch schema bila dipakai | defer | penting untuk parity UX, tetapi bukan blocker data core |
| `DigitalLead` | digital marketing | belum ada | `marketing_digital_leads` | `Sales / Digital Creator` | schema patch lanjutan | gap | sudah masuk blueprint tapi belum ke schema review awal |
| `Campaign` | digital marketing | belum ada | `marketing_campaigns`, `marketing_campaign_platforms` | `Sales / Digital Creator` | schema patch lanjutan | gap | domain ini masuk setelah core sales/support stabil |
| `ContentCalendar` | digital marketing | belum ada | `marketing_content_calendars`, `marketing_content_tags` | `Sales / Digital Creator` | schema patch lanjutan | gap | UI sudah ada, data final belum resmi |
| `ContentAnalytics` | digital marketing | belum ada | `marketing_content_analytics` | `Sales / Digital Creator / Analytics` | schema patch lanjutan | gap | lebih aman setelah campaign/content stabil |
| `SecurityLogs` | audit | belum ada staging audit khusus | `auth_audits` / `system_audits` atau tabel audit baru | `Settings / Access`, `Supervisor` | audit import lanjutan | defer | berguna untuk audit migrasi, bukan blocker operasional wave 1 |

## Jalur Transform Per Domain

### 1. Auth dan Akses

`User` dari legacy masuk ke:

- `staging_legacy_user_records`
- lalu dimapping ke:
  - `auth_roles`
  - `org_divisions`
  - `auth_users`

Fokus wave 1:

- pakai untuk seed user review
- jangan pertahankan auth lama mentah
- map intent role ke capability ERP baru

### 2. Sales Inti

`Ticket` tidak boleh dibaca sebagai satu entitas final.

Jalur targetnya:

1. customer -> `crm_customers`
2. address -> `crm_customer_addresses`
3. order -> `sales_orders`
4. subscription -> `service_subscriptions`
5. work order -> `service_work_orders`

Implikasi:

- `Ticket List` legacy adalah baseline workflow/UI
- tetapi data final ERP harus tetap dipisah per entity

### 3. Support

Domain support dari legacy paling siap untuk diangkat ke ERP karena target finalnya sudah tersedia.

Jalur staging:

- `TROUBLE_TICKET` -> `staging_legacy_support_records`
- `ISOLATION` -> `staging_legacy_support_records`
- `DISMANTLE_HISTORY` -> `staging_legacy_support_records`

Jalur final:

- `support_trouble_tickets`
- `support_trouble_ticket_photos`
- `support_isolations`
- `support_dismantle_history`
- `support_dismantle_queue` untuk queue aktif ERP saat ini

### 4. Inventory Jaringan

`psb_odp` adalah domain yang paling membutuhkan adapter khusus.

Kenapa:

- source-nya bukan item gudang biasa
- target ERP punya dua level:
  - header `network_odp`
  - detail `network_odp_ports`

Karena itu:

- header ODP bisa mulai dipetakan sekarang
- port detail harus masuk batch schema/transform tersendiri

### 5. Marketing dan Digital

Domain ini sudah mulai hidup di UI ERP, tetapi table final review belum resmi.

Artinya:

- copy-first UI/flow bisa jalan
- tetapi import/data final production belum boleh dianggap selesai
- perlu patch schema setelah core sales/support lebih stabil

## Prioritas Eksekusi Nyata

### Prioritas A: Bisa langsung dipakai untuk dump / import review

- `User`
- `Ticket` -> customer/order/subscription
- `Ticket` -> work order
- `Isolation`
- `TroubleTicket`
- `DismantleHistory`

### Prioritas B: Butuh adapter tambahan tapi sangat penting

- `DismantleTickets`
- `TroubleTicketSla`
- `psb_odp`
- `psb_odp` port detail

### Prioritas C: Schema patch sesudah core stabil

- `CoveredArea`
- `MarketingActivity`
- `DigitalLead`
- `Campaign`
- `ContentCalendar`
- `ContentAnalytics`
- `WhatsappTemplate`
- `SecurityLogs`

## Dampak ke Workspace ERP yang Sedang Dibangun

### Sudah Punya Target Final yang Jelas

- `/support/isolations`
- `/support/dismantle`
- `/support/tt`
- `/support/sla`
- `/sales` order/work order

### Sudah Punya Workspace, Tetapi Data Final Masih Menunggu Patch Schema

- `/sales/marketing-activities`
- `/sales/digital-creator`
- `/sales/campaigns`
- `/sales/digital-leads`
- `/sales/content-calendar`
- `/sales/content-analytics`

### Sudah Punya Domain, Tetapi Detail Data Masih Butuh Pengayaan

- `/inventory` untuk ODP port
- dashboard supervisor lintas customer/service

## Keputusan Praktis Saat Menarik DB Production Web PSB

Saat dump/schema production `Web PSB` sudah diambil, urutan kerja yang paling aman:

1. identifikasi tabel nyata yang sesuai dengan `User`, `Ticket`, `Isolation`, `TroubleTicket`, `DismantleTickets`, `DismantleHistory`, `psb_odp`, dan `TroubleTicketSla`
2. cocokkan kolom real terhadap [web-psb-field-matrix-week-1.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-field-matrix-week-1.md)
3. import lebih dulu ke staging:
   - `staging_legacy_user_records`
   - `staging_legacy_customer_records`
   - `staging_legacy_order_records`
   - `staging_legacy_support_records`
4. jalankan transform tahap 2 dan tahap 3 untuk domain yang sudah siap
5. sisihkan batch ODP port detail, marketing activity, dan digital suite sebagai patch schema berikutnya

## Next Step

Langkah paling natural setelah dokumen ini:

1. buat checklist `nama tabel nyata production Web PSB -> model legacy repo -> staging target`
2. siapkan template import batch untuk domain:
   - user
   - customer/order/subscription
   - support
   - ODP
3. lanjutkan parity workspace `Trouble Ticket` dan `Dismantle` dengan referensi file legacy yang sudah teridentifikasi
4. siapkan patch schema untuk:
   - `network_odp_ports`
   - `sales_marketing_activities`
   - `sales_covered_areas`
   - `sales_surveys`
