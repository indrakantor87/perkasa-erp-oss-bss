# Matriks Parity Role, Menu, dan Aksi

## Tujuan

Dokumen ini memecah parity operasional ke level yang lebih rinci:

1. role lama apa saja
2. menu yang dipakai role lama
3. aksi yang boleh dilakukan role lama
4. padanan modul ERP saat ini
5. gap yang harus ditutup sebelum cutover

Dokumen ini melengkapi [web-psb-parity-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-parity-matrix.md).

## Acuan

Referensi role dan aturan lama:

1. [access.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/lib/access.ts)

Referensi role dan navigasi ERP saat ini:

1. [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
2. [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts)
3. [access-control-server.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control-server.ts)

## Ringkasan ERP Saat Ini

Role ERP baru yang aktif saat ini masih:

1. `SUPER_ADMIN`
2. `ADMIN_DIVISI`
3. `OPERATOR`

Menu ERP baru yang sudah ada:

1. `Dashboard`
2. `Import Center`
3. `Penjualan`
4. `Customer`
5. `Support`
6. `Inventory`
7. `HR`
8. `Billing`
9. `Akses`
10. `User Internal`

Kesimpulan awal:

1. role ERP saat ini belum cukup granular untuk meniru role lama
2. parity harus dibangun lewat kombinasi role baru, permission matrix, dan screen/flow yang lebih spesifik

## Matriks Per Role

### 1. `ADMIN`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | akses semua menu | paling dekat `SUPER_ADMIN` | parsial |
| aksi | mutate semua area | `SUPER_ADMIN` sudah paling dekat | parsial |
| flow | end-to-end lintas divisi | domain ERP tersebar per modul | parsial |
| gap utama | parity list lintas divisi, creator digital, flow kerja lama | perlu dashboard operasional lintas flow | gap |

### 2. `MARKETING`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | `dashboard`, `input`, `list`, `marketing-activities`, `isolir`, `dismantle`, `odp` | paling dekat `ADMIN_DIVISI` pada `sales/customers/support/inventory` | gap |
| aksi | mutate `input`, baca/monitor area lain | belum ada role khusus marketing | gap |
| flow | input lead/ticket awal dan kerja penjualan | `sales` sudah ada, tapi belum parity penuh | parsial |
| gap utama | belum ada role marketing spesifik dan menu `marketing-activities` | perlu role dan layar operasional marketing | gap |

### 3. `CS`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | `dashboard`, `input`, `list`, `isolir`, `dismantle`, `odp`, `trouble-ticket` | paling dekat `ADMIN_DIVISI` untuk `sales/support/inventory` | gap |
| aksi | mutate `input`, `list`, `isolir`, `dismantle`, `odp`, `trouble-ticket` | sebagian tercermin di `support` dan `inventory` | parsial |
| flow | kerja harian CS lintas lead, isolir, dismantle, support | domain ERP masih terpisah | gap |
| gap utama | belum ada role CS spesifik dan list kerja terpadu | perlu role, queue, dan flow lintas modul | gap |

### 4. `ADMIN_CS`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | sama dengan `CS` dengan kewenangan lebih tinggi | belum ada padanan spesifik | gap |
| aksi | semua aksi `CS` + kontrol lebih tinggi | bisa didekati `ADMIN_DIVISI`, tapi belum tepat | gap |
| flow | kontrol operasional CS/Admin | belum ada level otoritas khusus | gap |
| gap utama | pemisahan otoritas `CS` vs `ADMIN_CS` | perlu role hirarki domain support/sales | gap |

### 5. `NOC`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | `dashboard`, `list`, `odp`, `trouble-ticket` | paling dekat `OPERATOR` untuk `support/inventory` | parsial |
| aksi | mutate `list`, `odp`, `trouble-ticket` | support dan inventory sudah punya write-side | parsial |
| flow | troubleshooting dan operasional jaringan | sebagian sudah ada di `support` dan `inventory` | parsial |
| gap utama | belum ada role NOC spesifik dan pembatasan presisi | perlu permission khusus | gap |

### 6. `TEKNISI`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | `dashboard`, `list`, `odp`, `trouble-ticket` | paling dekat `OPERATOR` | parsial |
| aksi | mutate `list`, `odp`, `trouble-ticket` | sebagian sudah ada | parsial |
| flow | kerja teknis lapangan | belum ada pembeda jelas dari NOC | gap |
| gap utama | role teknisi masih menyatu secara konsep dengan operator umum | perlu queue dan hak akses lapangan | gap |

### 7. `TROUBLESHOOTS`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | hanya `trouble-ticket` | paling dekat `OPERATOR` ke `support` | parsial |
| aksi | mutate `trouble-ticket` | sebagian sudah ada | parsial |
| flow | fokus sangat sempit pada TT | ERP belum punya role sesempit ini | gap |
| gap utama | role mikro khusus TT belum ada | perlu role support khusus | gap |

### 8. `CREATOR_DIGITAL`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | `dashboard`, `input`, `list`, `isolir`, `dismantle`, `odp`, `content-calendar`, `campaigns`, `digital-leads`, `analytics` | belum ada domain marketing digital eksplisit | gap besar |
| aksi | mutate area creator digital | belum ada modul parity | gap besar |
| flow | content planning, campaign, lead digital, analytics | belum tersedia | gap besar |
| gap utama | domain creator digital hampir belum ada | perlu modul dan role dari nol | gap besar |

### 9. `DISMANTLE`

| Area | Kondisi `web-psb-perkasa` | Padanan ERP saat ini | Status |
|---|---|---|---|
| menu | hanya `dismantle` | paling dekat `support` | parsial |
| aksi | mutate `dismantle` | alur dasar ada di support | parsial |
| flow | fokus kerja khusus pembongkaran | workflow khusus role belum lengkap | gap |
| gap utama | role `DISMANTLE` khusus belum ada | perlu queue dan hak akses sempit | gap |

## Matriks Menu dan Aksi Lama

| Menu lama | Role akses | Role mutate | Padanan ERP | Status |
|---|---|---|---|---|
| `dashboard` | hampir semua role | `ADMIN` dominan | `Dashboard` | parsial |
| `input` | `ADMIN`, `MARKETING`, `CS`, `ADMIN_CS`, `CREATOR_DIGITAL` | `ADMIN`, `MARKETING`, `CS`, `ADMIN_CS` | `Penjualan` | gap |
| `list` | banyak role operasional | `ADMIN`, `CS`, `ADMIN_CS`, `NOC`, `TEKNISI` | campuran `sales/customers/support` | gap |
| `marketing-activities` | `ADMIN`, `MARKETING` | `ADMIN` | belum ada | gap |
| `isolir` | `ADMIN`, `MARKETING`, `CS`, `ADMIN_CS`, `CREATOR_DIGITAL` | `ADMIN`, `CS`, `ADMIN_CS` | `Support` | parsial |
| `dismantle` | `ADMIN`, `MARKETING`, `CS`, `ADMIN_CS`, `CREATOR_DIGITAL`, `DISMANTLE` | `ADMIN`, `CS`, `ADMIN_CS`, `DISMANTLE` | `Support` | parsial |
| `odp` | banyak role operasional | `ADMIN`, `CS`, `ADMIN_CS`, `NOC`, `TEKNISI` | `Inventory` | parsial |
| `trouble-ticket` | `ADMIN`, `CS`, `ADMIN_CS`, `NOC`, `TEKNISI`, `TROUBLESHOOTS` | role yang sama | `Support` | parsial |
| `content-calendar` | `ADMIN`, `CREATOR_DIGITAL` | `ADMIN`, `CREATOR_DIGITAL` | belum ada | gap |
| `campaigns` | `ADMIN`, `CREATOR_DIGITAL` | `ADMIN`, `CREATOR_DIGITAL` | belum ada | gap |
| `digital-leads` | `ADMIN`, `CREATOR_DIGITAL` | `ADMIN`, `CREATOR_DIGITAL` | belum ada | gap |
| `analytics` | `ADMIN`, `CREATOR_DIGITAL` | `ADMIN`, `CREATOR_DIGITAL` | belum ada | gap |
| `settings` | `ADMIN` | `ADMIN` | `Akses`, `User Internal` | parsial |

## Gap Implementasi Prioritas

### Prioritas Sangat Tinggi

1. tambah role ERP yang setara dengan role operasional lama
2. buat `list kerja terpadu` yang menggantikan `list` di web lama
3. buat role parity untuk `CS`, `ADMIN_CS`, `NOC`, `TEKNISI`, `DISMANTLE`
4. rapikan flow `isolir`, `dismantle`, `trouble-ticket`, dan `ODP`

### Prioritas Tinggi

1. parity `input` dan `ticket` end-to-end
2. parity `marketing-activities`
3. pembeda jelas antara `NOC`, `TEKNISI`, dan `TROUBLESHOOTS`

### Prioritas Menengah

1. parity creator digital suite
2. parity analytics dan campaign management

## Definisi Lulus Per Role

Sebuah role dinyatakan lulus parity jika:

1. bisa login dengan role padanan
2. menu yang terlihat sama atau lebih tepat dari sistem lama
3. aksi mutasi yang dibutuhkan tersedia
4. flow harian bisa selesai tanpa pindah ke web lama
5. data yang tampil sesuai perspektif divisinya

## Versioning

Dokumen ini dirilis pada:

- `0.62.6` untuk baseline parity detail per role, menu, dan aksi
