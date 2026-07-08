# Integrasi `web-psb-perkasa` Minggu 1

## Tujuan

Dokumen ini menjadi playbook integrasi 1 minggu untuk menarik domain operasional dari `web-psb-perkasa` ke `perkasa-erp-oss-bss` tanpa mengganggu sistem lama yang masih aktif dipakai harian.

Prinsip utama:

1. `web-psb-perkasa` tetap menjadi source of truth operasional
2. ERP hanya membaca, menampung staging, dan mentransform batch
3. tidak ada `direct DB write` dari ERP ke database operasional lama
4. auth, session, dan role sistem lama tidak disentuh pada minggu pertama
5. setiap perubahan wajib tercatat di `CHANGELOG.md` dan `VERSION`

## Keputusan Baseline

Ya, untuk fase integrasi ini `web-psb-perkasa` menjadi baseline operasional.

Arti baseline pada konteks ini:

1. proses bisnis harian tetap mengikuti alur yang sudah berjalan di `web-psb-perkasa`
2. struktur data ERP menyesuaikan hasil mapping dari domain operasional `web-psb-perkasa`, bukan memaksa web lama mengikuti ERP baru pada minggu pertama
3. ERP diposisikan sebagai lapisan integrasi, audit, staging, dan transform bertahap
4. setiap modul yang ditarik ke ERP harus tetap bisa ditelusuri kembali ke perilaku dan data sumber di `web-psb-perkasa`

Arti baseline yang bukan:

1. bukan berarti semua schema lama disalin mentah ke ERP
2. bukan berarti semua kekurangan lama ikut dibawa apa adanya
3. bukan berarti ERP tidak boleh punya struktur domain yang lebih rapi

Jadi keputusan arsitekturnya adalah:

1. `web-psb-perkasa` menjadi baseline bisnis-operasional
2. `perkasa-erp-oss-bss` menjadi baseline integrasi target
3. migrasi dilakukan per domain, bukan big bang

## Target End-State

Target akhirnya memang satu web utama berada di `perkasa-erp-oss-bss`.

Artinya pada end-state:

1. operasi harian pindah ke modul yang sudah stabil di ERP
2. dashboard, support, sales, inventory, dan billing tidak lagi tersebar di dua aplikasi
3. `web-psb-perkasa` berubah fungsi dari aplikasi utama menjadi referensi legacy, lalu bisa dipensiunkan

Tetapi itu bukan keputusan untuk saat ini.

Status saat ini:

1. `web-psb-perkasa` masih dipakai sebagai aplikasi utama
2. `perkasa-erp-oss-bss` masih dipakai sebagai target konsolidasi
3. perpindahan dilakukan per domain, bukan sekaligus

Jadi jawaban yang tepat adalah:

1. ya, target akhirnya satu web di `perkasa-erp-oss-bss`
2. tidak, `web-psb-perkasa` belum ditinggalkan sekarang
3. `web-psb-perkasa` baru boleh ditinggalkan setelah domain-domain inti lolos kriteria cutover

## Kriteria Cutover Dari `web-psb-perkasa`

Sebuah domain baru boleh dipindah dari `web-psb-perkasa` ke ERP jika seluruh syarat di bawah ini terpenuhi:

1. mapping field domain sudah final
2. staging dan transform domain sudah stabil
3. hasil rekonsiliasi data konsisten
4. UI ERP untuk domain tersebut sudah siap dipakai harian
5. role dan hak akses domain itu sudah aman
6. rollback plan domain tersedia
7. ada masa paralel uji tanpa gangguan operasional

## Syarat Parity Sebelum Pindah Penuh

Karena tujuan akhirnya adalah semua kerja operasional pindah ke `perkasa-erp-oss-bss`, maka cutover penuh tidak boleh hanya melihat data berhasil dipindahkan. ERP baru harus mencapai parity dengan `web-psb-perkasa` pada tiga lapisan:

1. role parity
2. logic parity
3. flow parity

### 1. Role Parity

Seluruh role utama yang aktif di `web-psb-perkasa` harus punya padanan hak akses yang setara di ERP:

1. `ADMIN`
2. `MARKETING`
3. `CS`
4. `ADMIN_CS`
5. `NOC`
6. `TEKNISI`
7. `TROUBLESHOOTS`
8. `CREATOR_DIGITAL`
9. `DISMANTLE`

Paritas role berarti:

1. role bisa login dan melihat modul yang seharusnya terlihat
2. role hanya bisa mengubah data yang memang boleh diubah di sistem lama
3. role read-only tetap read-only
4. pembatasan menu, tindakan, dan perspektif data per divisi tetap konsisten

### 2. Logic Parity

Logic bisnis di ERP baru harus menyalin perilaku penting dari `web-psb-perkasa`, bukan hanya menyalin tabel. Minimal yang harus setara:

1. pembagian perspektif data per divisi
2. aturan mutasi data per role
3. filtering dan status pada `Ticket`, `Isolation`, `Dismantle`, `TroubleTicket`, dan `ODP`
4. relasi antara `Isolation` dan `Dismantle`
5. aturan close, restore, archive, dan transfer
6. perhitungan serta normalisasi status yang memengaruhi dashboard dan list
7. perilaku fallback atau review manual untuk data ambigu

### 3. Flow Parity

Flow utama yang dipakai tim saat ini harus bisa dijalankan penuh di ERP baru sebelum cutover total:

1. `input` dan `list` ticket
2. `marketing-activities`
3. `isolir`
4. `dismantle`
5. `odp`
6. `trouble-ticket`
7. `content-calendar`
8. `campaigns`
9. `digital-leads`
10. `analytics`
11. `settings` yang memang dibutuhkan oleh admin

Artinya, pengguna dari tiap role tidak boleh kehilangan alur kerja penting saat pindah ke ERP.

## Checklist Parity Wajib

Sebelum `web-psb-perkasa` ditinggalkan penuh, ERP baru harus lulus checklist berikut:

1. semua role utama berhasil diuji
2. semua menu utama yang dipakai harian tersedia
3. semua aksi mutasi penting bisa dijalankan oleh role yang benar
4. hasil output dashboard dan list penting konsisten dengan web lama
5. tidak ada flow kritis yang hanya masih hidup di `web-psb-perkasa`
6. ada hasil uji paralel untuk setiap divisi utama
7. user acceptance test per role dinyatakan lolos

## Definisi Sukses Migrasi

Migrasi ke `perkasa-erp-oss-bss` baru dianggap sukses jika:

1. user bisa bekerja penuh dari ERP baru
2. role lama tidak kehilangan hak dan alur penting
3. logika inti operasional tetap sama atau lebih baik
4. tim tidak perlu kembali ke `web-psb-perkasa` untuk pekerjaan harian

## Urutan Transisi Yang Disarankan

Urutan keluar dari `web-psb-perkasa` tidak boleh dimulai dari modul paling sensitif.

Urutan aman:

1. `ODP` dan inventory jaringan
2. `Isolation summary`
3. `Trouble Ticket summary`
4. `Ticket` ke sales/customer/subscription
5. billing

Urutan paling akhir:

1. auth dan user management lintas sistem
2. sinkronisasi penuh role/permission
3. penutupan total `web-psb-perkasa`

## Kapan `web-psb-perkasa` Boleh Ditinggalkan

`web-psb-perkasa` baru boleh ditinggalkan jika:

1. domain inti `Ticket`, `Isolation`, `TroubleTicket`, dan `ODP` sudah stabil di ERP
2. billing dan reporting dasar sudah tersedia
3. tidak ada gap operasional yang membuat tim harus kembali ke web lama
4. user acceptance test internal lolos
5. ada periode paralel yang sukses tanpa insiden mayor

Sebelum syarat itu tercapai, strategi yang benar adalah:

1. `web-psb-perkasa` tetap aktif
2. ERP dibangun di sampingnya
3. cutover dilakukan per domain

## Ruang Lingkup Minggu 1

Target minggu pertama bukan migrasi penuh. Target minggu pertama adalah fondasi integrasi yang aman dan bisa diuji cepat.

Output minimum:

1. peta modul sumber ke modul ERP
2. mapping tabel sumber ke tabel target ERP
3. field kunci untuk rekonsiliasi data
4. urutan implementasi 7 hari
5. aturan changelog dan versioning untuk paket integrasi
6. daftar fitur yang aman digabung dulu tanpa risiko operasional tinggi

## Guardrail Non-Intrusive

Yang boleh dilakukan:

1. read-only query dari ERP ke data review atau hasil export dari sistem lama
2. staging import batch ke `staging_legacy_*`
3. validasi, mapping, dan transform ke tabel final ERP
4. dashboard summary dan audit perbandingan data

Yang tidak boleh dilakukan pada minggu pertama:

1. mengubah flow create, update, delete di `web-psb-perkasa`
2. menggabungkan auth atau session dua aplikasi
3. membuat sinkronisasi dua arah real-time
4. menulis balik dari ERP ke database operasional lama
5. mengubah schema lama hanya untuk memaksa kebutuhan ERP baru

## Peta Modul

| Modul `web-psb-perkasa` | Domain ERP target | Pola minggu 1 | Risiko | Catatan |
|---|---|---|---|---|
| `Ticket` | `sales_leads`, `sales_orders`, `service_subscriptions` | mapping + staging draft | sedang | data ticket lama bercampur lead, customer, order, dan instalasi |
| `MarketingActivity` | `sales` activity layer | mapping saja | rendah | belum perlu write operasional |
| `CoveredArea` | `sales_covered_areas` | mapping + read-only | rendah | aman untuk reporting wilayah |
| `Isolation` | `support_isolations` | staging + transform awal | rendah | kandidat paling aman untuk batch |
| `DismantleTickets` / `DismantleHistory` | `support_dismantle_history` | mapping + histori batch | sedang | jaga agar alur kerja lama tidak berubah |
| `TroubleTicket` | `support_trouble_tickets`, `support_trouble_ticket_sla`, `support_trouble_ticket_photos` | read-only + staging summary | rendah | cocok untuk review operasional awal |
| `psb_odp` | `network_odp`, `network_odp_ports` | staging + transform awal | rendah | master data jaringan paling aman digabung dulu |
| `DigitalLead` / `Campaign` / `ContentCalendar` / `ContentAnalytics` | domain marketing lanjutan | tunda | sedang | belum prioritas minggu 1 |
| `User` / `SecurityLogs` | `auth_users`, `auth_roles`, audit | tunda | tinggi | jangan mengganggu login sistem lama |

## Tabel Sumber ke Tabel Target

### Domain aman minggu 1

| Sumber | Target ERP | Kunci identitas | Mode minggu 1 |
|---|---|---|---|
| `psb_odp` | `network_odp` | `code`, `name` | staging -> transform |
| kapasitas/port ODP lama | `network_odp_ports` | `odp_id`, `port_no` | mapping draft |
| `Isolation` | `support_isolations` | `radboox`, `email`, `customerPhone`, `customerName` | staging -> transform |
| `TroubleTicket` | `support_trouble_tickets` | `ticketCode` | read-only + staging summary |
| `TroubleTicketSla` | `support_trouble_ticket_sla` | `type` | read-only + mapping |
| `DismantleHistory` | `support_dismantle_history` | `customerName`, `customerPhone`, `closedAt` | mapping draft |

### Domain disiapkan tapi belum cutover

| Sumber | Target ERP | Kunci identitas | Mode minggu 1 |
|---|---|---|---|
| `Ticket` | `crm_customers` | `customerName`, `phoneNumber` | mapping draft |
| `Ticket` | `crm_customer_addresses` | `locationMap`, `customerName` | mapping draft |
| `Ticket` | `sales_orders` | `requestDate`, `package`, `marketingName` | staging draft |
| `Ticket` | `service_subscriptions` | `installedDate`, paket, customer identity | mapping draft |
| `MarketingActivity` | sales activity layer | `tanggal`, `marketingName` | mapping draft |
| `CoveredArea` | `sales_covered_areas` | `area`, `marketingName` | mapping draft |

## Field Kunci Rekonsiliasi

Gunakan field berikut sebagai anchor rekonsiliasi agar batch import tidak mengandalkan satu ID lama saja:

1. `ticketCode` untuk trouble ticket
2. `radboox` untuk isolir
3. `email` bila tersedia
4. `customerPhone`
5. `customerName`
6. `requestDate` atau `openedAt` untuk tie-breaker waktu
7. `package`
8. `odp code` atau `odp name`

Aturan prioritas pencocokan:

1. pakai ID bisnis eksplisit bila ada, misalnya `ticketCode`
2. jika tidak ada, pakai kombinasi `radboox + phone`
3. jika masih tidak ada, pakai kombinasi `customerName + phone + tanggal`
4. simpan hasil pencocokan ambigu ke area review, jangan auto transform

## Urutan Implementasi 7 Hari

### Hari 1

1. finalkan peta modul dan tabel sumber ke target
2. kunci field identitas per domain
3. tetapkan scope minggu pertama: `ODP`, `Isolation`, `Trouble Ticket summary`
4. catat baseline di `CHANGELOG.md`

### Hari 2

1. finalkan master mapping untuk `status`, `package`, `marketing`, `area`, dan `branch`
2. tandai field yang belum punya pasangan langsung
3. definisikan daftar row yang harus masuk review manual

### Hari 3

1. aktifkan pembacaan read-only untuk summary `support` dan `inventory`
2. tampilkan rekap `source count`, `last sync`, dan `unmapped count`
3. pastikan tidak ada write balik ke sistem lama

### Hari 4

1. siapkan batch staging untuk `ODP`
2. siapkan batch staging untuk `Isolation`
3. tambahkan validasi `duplicate`, `missing required field`, dan `identity conflict`

### Hari 5

1. siapkan draft staging `Ticket -> customer/order/subscription`
2. fokus pada transform preview, belum aktivasi penuh
3. verifikasi kebutuhan master mapping paket dan status

### Hari 6

1. jalankan rekonsiliasi jumlah data
2. cocokkan `source count`, `staging valid`, `transformed`, `failed`, `unmapped`
3. siapkan rollback notes bila hasil tidak sesuai

### Hari 7

1. review hasil minggu pertama
2. tentukan domain yang siap masuk fase minggu kedua
3. rilis dokumen dan changelog versi baru
4. pastikan `web-psb-perkasa` tetap berjalan tanpa perubahan operasional

## Fitur Yang Aman Digabung Dulu

Prioritas aman:

1. `ODP` dan inventory jaringan
2. `Isolation summary`
3. `Trouble Ticket summary`
4. `CoveredArea` untuk reporting wilayah
5. dashboard audit lintas domain

Tunda dulu:

1. auth dan role lintas aplikasi
2. billing live
3. write-back ERP ke sistem lama
4. sinkronisasi real-time dua arah
5. domain creator digital

## Deliverable Minggu 1

1. dokumen mapping final per domain awal
2. batch staging `ODP`
3. batch staging `Isolation`
4. preview mapping `Ticket`
5. dashboard audit jumlah data
6. changelog dan versioning terbarui
7. rollback notes per domain awal

## Versioning Paket Integrasi

Paket integrasi ini mengikuti `Semantic Versioning` dan aturan global di `docs/versioning.md`.

Skema minggu pertama:

- `0.62.0` baseline playbook integrasi 1 minggu non-intrusive
- `0.62.1` koreksi mapping dokumen atau catatan eksekusi batch
- `0.63.0` saat staging awal `ODP` dan `Isolation` stabil

Aturan naik versi:

1. naik `PATCH` untuk koreksi field mapping, query audit, atau rollback note
2. naik `MINOR` untuk milestone domain baru yang siap diuji
3. tahan `MAJOR` sampai ada baseline produksi yang stabil

## Changelog Paket Integrasi

Setiap iterasi integrasi wajib mencatat minimal:

### Added

- domain baru yang mulai dipetakan
- staging baru yang diaktifkan
- audit summary baru

### Changed

- perubahan aturan transform
- perubahan prioritas domain
- perubahan anchor identitas

### Fixed

- koreksi mismatch mapping
- koreksi duplikasi atau false match
- koreksi query audit

### Removed

- aturan mapping lama yang tidak lagi dipakai
- field transisi yang dibatalkan

### Migration Notes

- urutan import
- dependency master mapping
- prasyarat review manual

### Rollback Notes

- cara membatalkan batch
- domain yang harus dikosongkan ulang
- dampak ke dashboard audit

## Checklist Review Sebelum Eksekusi

1. `web-psb-perkasa` tetap berjalan normal
2. tidak ada perubahan auth di sistem lama
3. tidak ada write balik dari ERP ke sistem lama
4. semua batch punya jejak versi
5. semua domain awal punya rollback notes
6. hasil audit jumlah data bisa dibandingkan dengan sumber

## Keputusan Minggu 1

Jika seluruh deliverable minggu pertama selesai, maka fase berikutnya boleh fokus ke:

1. `Ticket -> customer/order/subscription`
2. penguatan dashboard audit
3. review billing setelah anchor customer dan subscription stabil

Jika belum selesai, ulangi minggu pertama pada domain aman dulu dan jangan memperluas scope.
