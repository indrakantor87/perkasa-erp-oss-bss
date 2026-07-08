# Matriks Parity `web-psb-perkasa` ke ERP

## Tujuan

Dokumen ini menjadi acuan untuk memastikan `perkasa-erp-oss-bss` benar-benar bisa menggantikan `web-psb-perkasa` saat cutover penuh dilakukan.

Fokus parity:

1. parity role
2. parity menu
3. parity aksi
4. parity flow
5. parity logic

Dokumen ini tidak mengubah sistem lama. Dokumen ini dipakai untuk:

1. mengukur gap ERP baru terhadap `web-psb-perkasa`
2. menentukan prioritas implementasi
3. menilai kesiapan cutover per domain dan per role

## Prinsip Parity

ERP baru dianggap setara hanya jika:

1. role lama punya padanan akses yang jelas
2. menu penting tersedia
3. aksi penting bisa dijalankan oleh role yang benar
4. flow utama bisa dikerjakan tanpa kembali ke web lama
5. logic bisnis yang memengaruhi hasil kerja tetap konsisten

## Sumber Acuan

Parity ini mengacu pada:

1. role, divisi, dan akses menu di `web-psb-perkasa`
2. baseline role, route prefix, dan permission matrix di ERP baru

Referensi utama:

1. [access.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/lib/access.ts)
2. [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
3. [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts)
4. [access-control-server.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control-server.ts)
5. [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts)

## Ringkasan Gap Saat Ini

Kondisi saat ini:

1. `web-psb-perkasa` punya role operasional detail
2. ERP baru masih memakai role baseline generik
3. `web-psb-perkasa` punya menu kerja yang lebih granular
4. ERP baru sudah punya domain besar, tetapi belum memecah seluruh flow per role seperti sistem lama

Kesimpulan:

1. parity belum tercapai
2. role parity masih menjadi gap terbesar
3. flow parity pada `isolir`, `dismantle`, `creator digital`, dan sebagian `ticket` masih perlu dikejar

## 1. Matriks Role Parity

| Role `web-psb-perkasa` | Divisi lama | Role ERP saat ini | Status parity | Catatan |
|---|---|---|---|---|
| `ADMIN` | `ALL` | `SUPER_ADMIN` | parsial | akses global sudah mendekati, tapi masih perlu parity flow penuh |
| `MARKETING` | `PENJUALAN` | belum ada padanan spesifik | gap | saat ini paling dekat ke `ADMIN_DIVISI`, tetapi belum cukup presisi |
| `CS` | `CS_ADMIN` | belum ada padanan spesifik | gap | perlu role ERP khusus operasional CS |
| `ADMIN_CS` | `CS_ADMIN` | belum ada padanan spesifik | gap | perlu level persetujuan dan akses yang lebih tinggi dari CS |
| `NOC` | `NOC_TROUBLESHOOTS` | sebagian masuk `OPERATOR` | gap | butuh pemisahan support operasional dan akses inventory/ODP |
| `TEKNISI` | `NOC_TROUBLESHOOTS` | sebagian masuk `OPERATOR` | gap | perlu pembatasan yang berbeda dari NOC |
| `TROUBLESHOOTS` | `NOC_TROUBLESHOOTS` | belum ada padanan spesifik | gap | di web lama sangat sempit, di ERP belum ada padanan langsung |
| `CREATOR_DIGITAL` | `CREATOR_DIGITAL` | belum ada padanan spesifik | gap | modul marketing digital belum punya role parity |
| `DISMANTLE` | `CS_ADMIN` | belum ada padanan spesifik | gap | akses menu sangat spesifik, belum ada bentuknya di ERP |

## 2. Matriks Menu Parity

| Menu `web-psb-perkasa` | Kondisi di ERP baru | Status parity | Catatan |
|---|---|---|---|
| `dashboard` | ada `Dashboard` | parsial | dashboard ada, tetapi perspektif per role/divisi harus disetarakan |
| `input` | sebagian di `sales` | parsial | perlu parity penuh untuk input operasional PSB |
| `list` | tersebar di `sales`, `customers`, `support` | gap | belum ada satu list kerja seperti web lama |
| `marketing-activities` | belum ada modul eksplisit | gap | harus ditambahkan atau dipetakan jelas |
| `isolir` | ada di `support` | parsial | struktur ada, tetapi flow parity harus diverifikasi |
| `dismantle` | ada di `support` | parsial | histori ada, workflow spesifik role belum penuh |
| `odp` | ada di `inventory` | parsial | basis sudah ada, parity aksi dan filter belum final |
| `trouble-ticket` | ada di `support` | parsial | domain ada, parity role dan action masih perlu ditutup |
| `content-calendar` | belum ada modul eksplisit | gap | domain creator digital belum hidup |
| `campaigns` | belum ada modul eksplisit | gap | domain creator digital belum hidup |
| `digital-leads` | belum ada modul eksplisit | gap | domain creator digital belum hidup |
| `analytics` | belum ada modul eksplisit | gap | domain creator digital belum hidup |
| `settings` | ada `Akses` dan `User Internal` | parsial | admin settings sudah ada, tapi parity seluruh kebutuhan admin belum final |

## 3. Matriks Aksi Parity

### Aksi lintas modul

| Area | Aksi di `web-psb-perkasa` | Kondisi ERP saat ini | Status parity |
|---|---|---|---|
| akses menu | granular per role | masih baseline 3 role | gap |
| read-only vs mutate | cukup detail per menu | ada permission matrix, tapi resource masih generik | parsial |
| delete/import ticket | ada helper khusus | belum dimodelkan setara | gap |
| mutate isolation | ada helper khusus per role | belum dipetakan setara per role lama | gap |
| mutate ODP | ada helper khusus | sebagian tercakup `inventory` | parsial |
| creator digital mutate | role khusus | belum ada modul parity | gap |

### Aksi kritis per modul

| Modul | Aksi kritis lama | Kondisi ERP saat ini | Status parity |
|---|---|---|---|
| `Ticket` | input, edit, manage list, import, delete tertentu | domain sales sudah ada, tetapi parity aksi belum lengkap | gap |
| `Isolation` | mutate, delete, restore, transfer scope admin | support ada, tetapi parity tindakan detail belum final | parsial |
| `Dismantle` | akses khusus role `DISMANTLE` dan CS/Admin | workflow ada sebagian | parsial |
| `ODP` | mutate oleh role tertentu | inventory sudah punya write-side | parsial |
| `TroubleTicket` | create, update, close, SLA | support sudah cukup maju | parsial |
| `Creator Digital` | create/update konten, campaign, lead, analytics | belum ada modul parity | gap |

## 4. Matriks Flow Parity

| Flow lama | Domain ERP target | Status parity | Catatan |
|---|---|---|---|
| input PSB | `sales` + `customers` | gap | perlu flow end-to-end, bukan hanya form terpisah |
| list ticket lintas divisi | `sales/customers/support` | gap | perlu satu perspektif kerja yang setara |
| marketing activities | `sales` tambahan | gap | belum ada modul parity |
| isolir operasional | `support` | parsial | perlu parity filter, mutate, delete, dan restore |
| dismantle operasional | `support` | parsial | perlu parity role `DISMANTLE` dan flow transfer |
| ODP operasional | `inventory` | parsial | struktur ada, parity kerja harian belum final |
| trouble ticket operasional | `support` | parsial | paling dekat parity, tapi belum penuh |
| creator digital suite | domain marketing digital | gap | belum tersedia |
| settings admin | `settings/access`, `settings/users` | parsial | sebagian sudah ada |

## 5. Matriks Logic Parity

| Logic lama | Status di ERP saat ini | Prioritas |
|---|---|---|
| pembagian perspektif data per divisi | belum eksplisit setara | tinggi |
| pembatasan mutate per role | masih baseline generik | tinggi |
| filter list berdasar role/divisi | belum penuh | tinggi |
| relasi `Isolation` ke `Dismantle` | baru sebagian tertangkap | tinggi |
| status `OPEN/CLOSED` dan turunannya | sebagian ada | tinggi |
| transfer dan restore flow | baru sebagian ada | tinggi |
| helper khusus delete/import ticket | belum setara | sedang |
| creator digital permission model | belum ada | tinggi |

## 6. Prioritas Implementasi Parity

### Prioritas 1

1. role parity untuk `ADMIN`, `CS`, `ADMIN_CS`, `NOC`, `TEKNISI`, `DISMANTLE`
2. flow parity `Isolation`, `Dismantle`, `TroubleTicket`, dan `ODP`
3. list kerja per divisi

### Prioritas 2

1. parity `Ticket` end-to-end dari input sampai list dan subscription
2. parity import/delete/manage tertentu
3. parity admin settings

### Prioritas 3

1. parity `MARKETING`
2. parity `marketing-activities`
3. parity creator digital suite

## 7. Checklist Cutover Per Role

Sebelum pindah penuh, setiap role harus lolos checklist:

1. dapat login
2. melihat menu yang benar
3. tidak melihat menu yang tidak berhak
4. dapat menjalankan aksi harian yang dibutuhkan
5. tidak kehilangan data atau perspektif kerja
6. tidak perlu balik ke `web-psb-perkasa` untuk menyelesaikan flow utamanya

## 8. Status Parity Saat Ini

| Area | Status umum |
|---|---|
| role parity | gap besar |
| menu parity | gap sedang-besar |
| action parity | gap sedang-besar |
| flow parity | gap besar |
| logic parity | gap besar |

Kesimpulan saat ini:

1. ERP baru belum siap menggantikan `web-psb-perkasa`
2. baseline dan target end-state sudah jelas
3. langkah berikutnya harus fokus ke parity, bukan hanya migrasi data

## Versioning

Dokumen ini pertama kali dirilis pada:

- `0.62.5` untuk baseline matriks parity role, menu, aksi, flow, dan logic
