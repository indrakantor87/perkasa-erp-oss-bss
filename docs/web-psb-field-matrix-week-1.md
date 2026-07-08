# Matriks Field `web-psb-perkasa` Minggu 1

## Tujuan

Dokumen ini memecah mapping tingkat domain menjadi matriks field-by-field yang siap dipakai untuk:

1. staging import
2. validasi data
3. transform awal
4. rekonsiliasi hasil import
5. review manual pada row ambigu

Dokumen ini mengikuti guardrail di `docs/web-psb-integration-week-1.md`:

1. tidak mengganggu alur operasional `web-psb-perkasa`
2. tidak menulis balik ke sistem lama
3. fokus pada domain aman minggu pertama

## Aturan Umum

Kolom matriks:

- `Source Field`: nama field di sistem lama
- `Target Field`: tabel dan field tujuan di ERP
- `Rule`: direct, normalize, lookup, generate, split, atau review
- `Required`: `Y` bila wajib untuk transform otomatis
- `Week 1`: tindakan di minggu pertama
- `Notes`: catatan validasi atau alasan review manual

Arti `Week 1`:

- `read-only`: cukup dibaca dan dibandingkan
- `staging`: dibawa ke staging
- `transform`: boleh ditransform ke tabel final ERP
- `draft`: baru dipetakan, belum dieksekusi penuh
- `review`: wajib dicek manual

## Domain 1: `Ticket`

### Ringkasan

Model `Ticket` di `web-psb-perkasa` membawa campuran lead, customer, order, dan instalasi. Karena itu domain ini belum boleh ditransform penuh pada minggu pertama. Fokus minggu pertama hanya sampai `mapping draft` dan `staging draft`.

### `Ticket` -> `crm_customers`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `customerName` | `crm_customers.full_name` | direct | Y | draft | wajib ada untuk customer master |
| `phoneNumber` | `crm_customers.phone` | normalize | Y | draft | normalisasi spasi, `+62`, dan leading zero |
| `customerName + phoneNumber` | `crm_customers.customer_code` | generate | Y | draft | generate code, jangan pakai ID lama mentah |
| `description` | `crm_customers.notes` | direct | N | draft | jika field target notes dipakai |
| `status` | `crm_customers.customer_status` | review | N | review | jangan auto-map bila status ticket belum jelas menunjukkan status customer |

### `Ticket` -> `crm_customer_addresses`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `locationMap` | `crm_customer_addresses.maps_url` | direct | N | draft | simpan raw URL bila ada |
| `locationMap` | `crm_customer_addresses.address` | review | N | review | jika tidak ada alamat tekstual, isi placeholder dan tandai review |
| `customerName` | `crm_customer_addresses.contact_name` | direct | N | draft | opsional untuk memudahkan audit |
| `phoneNumber` | `crm_customer_addresses.contact_phone` | normalize | N | draft | opsional bila field tersedia |

### `Ticket` -> `sales_orders`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `id` | legacy reference di staging | direct | Y | staging | jangan dipakai sebagai PK final |
| `requestDate` | `sales_orders.request_date` | direct | Y | staging | anchor waktu order |
| `package` | `sales_orders.package_id` | lookup | Y | review | perlu master mapping package |
| `marketingName` | `sales_orders.marketing_name` | direct | N | staging | simpan nama legacy lebih dulu |
| `teknisi` | `sales_orders.teknisi_name` | direct | N | staging | sementara tanpa lookup employee |
| `description` | `sales_orders.notes` | direct | N | staging | catatan order |
| `status` | `sales_orders.status` | normalize | Y | review | wajib punya tabel normalisasi status |
| `statusOrder` | `sales_orders.status` | review | N | review | hanya dipakai bila membantu translasi status |
| `priority` | field tambahan / backlog | review | N | review | belum masuk target phase 1 |

### `Ticket` -> `service_subscriptions`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `installedDate` | `service_subscriptions.activated_at` | direct | N | draft | hanya jika instalasi benar-benar selesai |
| `package` | `service_subscriptions.package_id` | lookup | Y | review | harus konsisten dengan order |
| `customerName + phoneNumber` | `service_subscriptions.customer_id` | lookup | Y | review | harus lewat customer hasil mapping |
| `status` | `service_subscriptions.status` | normalize | Y | review | jangan auto-aktif bila status ticket belum pasti |

### Kunci Rekonsiliasi `Ticket`

Urutan prioritas:

1. legacy ticket reference di staging
2. `customerName + phoneNumber + requestDate`
3. `locationMap + phoneNumber`

Jika 1 customer punya lebih dari 1 ticket aktif dengan kombinasi serupa, tandai `review`.

## Domain 2: `Isolation`

### Ringkasan

Domain ini aman untuk minggu pertama karena struktur datanya relatif jelas dan target ERP sudah tersedia.

### `Isolation` -> `support_isolations`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `customerName` | `support_isolations.customer_name` | direct | Y | transform | wajib |
| `customerAddress` | `support_isolations.customer_address` | direct | N | transform | simpan apa adanya lebih dulu |
| `customerPhone` | `support_isolations.customer_phone` | normalize | Y | transform | normalisasi nomor telepon |
| `marketing` | `support_isolations.marketing_name` | direct | N | transform | mapping ke employee bisa ditunda |
| `radboox` | `support_isolations.radbox_name` | normalize | Y | transform | normalisasi typo `radboox` -> `radbox` hanya di target |
| `price` | `support_isolations.package_price` | direct | N | transform | validasi numeric |
| `isolationDate` | `support_isolations.isolation_date` | direct | Y | transform | anchor utama suspend |
| `reason` | `support_isolations.reason` | direct | N | transform | simpan raw text |
| `status` | `support_isolations.status` | normalize | Y | transform | pakai enum `OPEN` / `CLOSED` |
| `restorationDate` | `support_isolations.restoration_date` | direct | N | transform | null bila belum restore |
| `closeNote` | `support_isolations.close_note` | direct | N | transform | catatan penutupan |
| `isArchived` | `support_isolations.is_archived` | direct | Y | transform | boolean langsung |
| `archivedAt` | `support_isolations.archived_at` | direct | N | transform | null bila belum arsip |
| `email` | staging identity helper | direct | N | staging | bantu dedup walau belum semua row punya |
| `ticketDismantle` | staging helper | direct | N | staging | jangan langsung masuk final tanpa rule lanjutan |

### Kunci Rekonsiliasi `Isolation`

Urutan prioritas:

1. `radboox + customerPhone`
2. `customerName + customerPhone + isolationDate`
3. `email + isolationDate`

Jika hasil bentrok:

1. pilih row dengan `status = OPEN` sebagai data aktif
2. pindahkan sisanya ke review manual

## Domain 3: `TroubleTicket`

### Ringkasan

Domain ini aman dibaca dan dipersiapkan untuk staging summary. Untuk minggu pertama, target utamanya adalah read-only, validasi, dan import terkontrol tanpa mengubah flow ticket aktif di sistem lama.

### `TroubleTicket` -> `support_trouble_tickets`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `ticketCode` | `support_trouble_tickets.ticket_code` | direct | Y | transform | anchor utama |
| `customerName` | `support_trouble_tickets.customer_name` | direct | Y | transform | wajib |
| `user` | `support_trouble_tickets.customer_user` | direct | N | transform | bisa kosong |
| `category` | `support_trouble_tickets.category` | normalize | Y | transform | pastikan `TT` / `PV` konsisten |
| `type` | `support_trouble_tickets.type` | direct | Y | transform | cocokkan dengan master SLA |
| `status` | `support_trouble_tickets.status` | normalize | Y | transform | `OPEN`, `CLOSE`, `CLOSED` disatukan |
| `problemCategory` | `support_trouble_tickets.problem_category` | direct | N | transform | raw text boleh |
| `resolutionAction` | `support_trouble_tickets.resolution_action` | direct | N | transform | raw text boleh |
| `openedAt` | `support_trouble_tickets.opened_at` | direct | Y | transform | anchor waktu |
| `closedAt` | `support_trouble_tickets.closed_at` | direct | N | transform | null bila belum close |
| `notes` | `support_trouble_tickets.notes` | direct | N | transform | catatan awal |
| `closeNotes` | `support_trouble_tickets.close_notes` | direct | N | transform | catatan akhir |
| `customerWhatsApp` | staging helper | normalize | N | staging | bantu dedup dan contact audit |
| `locationMap` | staging helper | direct | N | staging | simpan untuk audit, belum wajib ke final |

### `TroubleTicket.closePhotos[]` -> `support_trouble_ticket_photos`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `closePhotos[]` | `support_trouble_ticket_photos.photo_path` | split | N | draft | satu row per foto, eksekusi boleh ditunda jika storage belum siap |
| `ticketCode` | `support_trouble_ticket_photos.ticket_id` | lookup | Y | draft | refer ke ticket hasil transform |

### `TroubleTicketSla` -> `support_trouble_ticket_sla`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `type` | `support_trouble_ticket_sla.trouble_type` | direct | Y | transform | master SLA |
| `durationDays` | `support_trouble_ticket_sla.duration_days` | direct | Y | transform | integer positif |

### Kunci Rekonsiliasi `TroubleTicket`

Urutan prioritas:

1. `ticketCode`
2. `customerName + openedAt + type`

Jika ada ticket tanpa `ticketCode`, row wajib masuk `review`.

## Domain 4: `ODP`

### Ringkasan

Domain ini adalah kandidat paling aman untuk minggu pertama karena relatif berupa master data jaringan.

### `psb_odp` -> `network_odp`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `code` atau `name` | `network_odp.code` | normalize | Y | transform | bila code tidak ada, generate dari name |
| `name` atau `code` | `network_odp.name` | direct | Y | transform | jangan kosong |
| `location` / `maps` | `network_odp.location_text` | direct | N | transform | raw text lokasi |
| `latitude` | `network_odp.latitude` | direct | N | transform | validasi numerik |
| `longitude` | `network_odp.longitude` | direct | N | transform | validasi numerik |
| `jumlah port` | `network_odp.total_ports` | direct | Y | transform | integer non-negatif |
| `port aktif` | `network_odp.active_ports` | direct | N | transform | jika tidak ada, hitung dari data turunan |
| `wilayah` | staging helper | direct | N | staging | berguna untuk reporting |
| `status tiang` | staging helper | direct | N | staging | belum perlu masuk final bila schema tidak menampung |

### `psb_odp` -> `network_odp_ports`

| Source Field | Target Field | Rule | Required | Week 1 | Notes |
|---|---|---|---|---|---|
| `odp code` | `network_odp_ports.odp_id` | lookup | Y | draft | lookup ke `network_odp` hasil transform |
| `port_no` | `network_odp_ports.port_no` | generate/review | Y | draft | generate urutan bila source hanya punya jumlah port |
| `status port` | `network_odp_ports.status` | normalize | N | draft | jika source belum detail, default `AVAILABLE` |
| `customer identity` | `network_odp_ports.customer_id` | review | N | review | jangan diisi otomatis tanpa anchor subscription |

### Kunci Rekonsiliasi `ODP`

Urutan prioritas:

1. `code`
2. `name`
3. `location_text + total_ports`

Jika code bentrok tetapi koordinat berbeda, wajib `review`.

## Normalisasi Wajib

### Status

| Nilai sumber | Nilai target |
|---|---|
| `CLOSE`, `CLOSED` | `CLOSED` |
| `OPEN`, `NEW` | `OPEN` |
| `1`, `ACTIVE`, `aktif` | `ACTIVE` |
| `0`, `INACTIVE`, `nonaktif` | `INACTIVE` |

### Nomor Telepon

1. hapus spasi, tanda minus, dan kurung
2. ubah awalan `08` menjadi format standar yang disepakati
3. pertahankan nilai asli di staging bila normalisasi gagal

### Package

1. jangan lookup langsung dari nama mentah
2. wajib lewat master mapping package
3. row tanpa hasil lookup masuk `review`

## Rule Review Manual

Row wajib `review` bila:

1. anchor identitas ganda
2. target lookup package gagal
3. status tidak bisa dinormalisasi
4. tanggal penting kosong
5. `Ticket` terlihat memuat lebih dari satu lifecycle dalam satu row
6. `ODP` memiliki `code` sama tapi lokasi berbeda

## Output Minggu 1 dari Matriks Ini

1. template staging domain `ODP`
2. template staging domain `Isolation`
3. daftar field `TroubleTicket` yang aman diimpor
4. draft pemecahan `Ticket` ke `customer`, `address`, `order`, dan `subscription`
5. daftar row yang harus masuk review manual

## Versioning

Dokumen ini pertama kali dirilis pada paket integrasi:

- `0.62.1` untuk matriks field operasional minggu pertama

Kenaikan berikutnya:

- `0.62.2` jika hanya ada koreksi field atau rule
- `0.63.0` jika sudah ada domain baru yang siap staging/transform penuh
