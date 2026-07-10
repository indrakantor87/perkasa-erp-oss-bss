# Desain Role ERP Target

## Tujuan

Dokumen ini mendefinisikan desain role target di `perkasa-erp-oss-bss` agar seluruh role operasional penting dari `web-psb-perkasa` memiliki padanan yang jelas sebelum cutover penuh.

Dokumen ini tidak mengubah implementasi role yang sedang aktif sekarang. Dokumen ini menjadi target desain untuk:

1. pemecahan role ERP yang saat ini masih terlalu generik
2. penyusunan permission matrix yang lebih presisi
3. perencanaan cutover bertahap per role

## Keputusan Fase Awal

Untuk fase implementasi terdekat, `web-psb-perkasa` diperlakukan sebagai fondasi Divisi
`Pemasaran dan Pelayanan` di ERP.

Artinya:

1. role legacy yang berasal dari `web-psb-perkasa` menjadi prioritas utama migrasi
2. fokus tahap 1 adalah menyelesaikan flow kerja `Pemasaran dan Pelayanan`
3. integrasi penuh ke divisi lain dilakukan setelah flow inti legacy stabil di ERP

## Acuan

Referensi role lama:

1. [access.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/lib/access.ts)

Referensi role ERP saat ini:

1. [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
2. [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts)
3. [access-control-server.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control-server.ts)
4. [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md)

## Kondisi Saat Ini

Role ERP aktif saat ini masih:

1. `SUPER_ADMIN`
2. `ADMIN_DIVISI`
3. `OPERATOR`

Model ini cukup untuk bootstrap, tetapi belum cukup untuk parity operasional terhadap `web-psb-perkasa`.

## Prinsip Desain Role Baru

Role target harus mengikuti prinsip berikut:

1. satu role mewakili fungsi kerja nyata, bukan label generik
2. akses menu dipisah dari aksi mutasi
3. role per divisi boleh melihat domain tertentu, tetapi aksi harus tetap dibatasi
4. role mikro seperti `DISMANTLE` dan `TROUBLESHOOTS` harus tetap bisa dibuat sempit
5. `SUPER_ADMIN` tetap ada sebagai role override global

## Baseline Divisi Organisasi

Struktur organisasi yang menjadi acuan ERP saat ini:

1. `Pemasaran dan Pelayanan`
   - `Penjualan`
   - `CS`
   - `Admin CS`
   - `NOC`
   - `Troubleshoots`
   - `Creator Digital`
   - `Dismantle`
2. `Teknis dan Expan`
   - `Teknisi PSB`
   - `Teknisi Jalur & Expan`
   - `Teknisi Jointer`
3. `General Affair`
   - `Inventory`
   - `Legal`
4. `Finance dan HR`
   - `Billing`
   - `HR`
5. `Operasional`
   - `Kantor`
   - `Toko`

Catatan:

1. baseline detail ada di [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md)
2. role ERP aktif saat ini baru menutup sebagian struktur organisasi ini
3. `FIELD_TECHNICIAN` saat ini masih agregat untuk tiga sub-divisi teknisi
4. untuk fase awal, fokus migrasi tetap pada rumpun `Pemasaran dan Pelayanan`

## Role ERP Target

Role target yang disarankan:

1. `SUPER_ADMIN`
2. `SALES_MARKETING`
3. `CS_OPERATOR`
4. `CS_ADMIN`
5. `NOC_OPERATOR`
6. `TT_OPERATOR`
7. `DISMANTLE_OPERATOR`

Catatan:

1. fokus tahap 1 adalah role yang langsung berada di bawah `Pemasaran dan Pelayanan`
2. `FIELD_TECHNICIAN` tetap valid sebagai target desain ERP, tetapi tidak menjadi pusat fase cutover awal
9. `DISMANTLE_OPERATOR`

Catatan fase:

1. role `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, `DIGITAL_CREATOR`, dan `DISMANTLE_OPERATOR` adalah inti fase awal
2. `FIELD_TECHNICIAN` tetap dipertahankan sebagai role target, tetapi integrasi penuhnya diposisikan setelah fondasi `Pemasaran dan Pelayanan` stabil
## Mapping Role Lama ke Role ERP Target

| Role `web-psb-perkasa` | Role ERP target | Status |
|---|---|---|
| `ADMIN` | `SUPER_ADMIN` | langsung |
| `MARKETING` | `SALES_MARKETING` | langsung |
| `CS` | `CS_OPERATOR` | langsung |
| `ADMIN_CS` | `CS_ADMIN` | langsung |
| `NOC` | `NOC_OPERATOR` | langsung |
| `TEKNISI` | `FIELD_TECHNICIAN` | langsung |
| `TROUBLESHOOTS` | `TT_OPERATOR` | langsung |
| `CREATOR_DIGITAL` | `DIGITAL_CREATOR` | langsung |
| `DISMANTLE` | `DISMANTLE_OPERATOR` | langsung |

## Mapping Role ERP Ke Divisi

| Role ERP target | Divisi | Sub-divisi | Catatan |
|---|---|---|---|
| `SUPER_ADMIN` | Lintas Divisi | Kontrol Global | override semua area |
| `SALES_MARKETING` | Pemasaran dan Pelayanan | Penjualan | sudah sejajar |
| `CS_OPERATOR` | Pemasaran dan Pelayanan | CS | sudah sejajar |
| `CS_ADMIN` | Pemasaran dan Pelayanan | Admin CS | sudah sejajar |
| `NOC_OPERATOR` | Pemasaran dan Pelayanan | NOC | sudah sejajar |
| `TT_OPERATOR` | Pemasaran dan Pelayanan | Troubleshoots | sudah sejajar |
| `DIGITAL_CREATOR` | Pemasaran dan Pelayanan | Creator Digital | sudah sejajar |
| `FIELD_TECHNICIAN` | Teknis dan Expan | Teknisi PSB / Teknisi Jalur & Expan / Teknisi Jointer | masih payung gabungan |
| `DISMANTLE_OPERATOR` | Pemasaran dan Pelayanan | Dismantle | role mikro support yang kini sudah masuk struktur divisi aktif |

## Definisi Per Role

### `SUPER_ADMIN`

Tujuan:

1. override global lintas domain
2. admin penuh untuk akses, user, import, monitoring, dan koreksi

Hak minimum:

1. akses semua menu
2. mutate semua domain
3. approve/import/export/manage semua resource

### `SALES_MARKETING`

Tujuan:

1. menggantikan role `MARKETING`
2. fokus pada prospek, input awal, area coverage, dan aktivitas marketing

Hak minimum:

1. akses `dashboard`, `sales`, `customers`, `support` terbatas baca, `inventory` terbatas baca
2. create/update pada lead, survey awal, dan activity marketing
3. tidak punya hak admin akses dan user

Catatan:

1. perlu modul parity untuk `marketing-activities`
2. akses ke `isolir`, `dismantle`, dan `odp` lebih tepat sebagai monitoring, bukan mutate penuh

### `CS_OPERATOR`

Tujuan:

1. menggantikan role `CS`
2. menjadi operator harian untuk input, list, isolir, dismantle, ODP, dan ticket support dasar

Hak minimum:

1. akses `sales`, `customers`, `support`, `inventory`
2. create/update pada input ticket, isolation, dismantle, odp terbatas, trouble ticket dasar
3. tidak bisa mengatur permission dan user internal

Catatan:

1. perlu `list kerja terpadu` lintas `sales/customers/support`
2. perlu pembeda tegas dari `CS_ADMIN`

### `CS_ADMIN`

Tujuan:

1. menggantikan role `ADMIN_CS`
2. menjadi supervisor operasional CS

Hak minimum:

1. semua hak `CS_OPERATOR`
2. approve/mutate lebih luas pada support dan inventory tertentu
3. kontrol lebih tinggi untuk restore, transfer, dan koreksi data operasional CS

### `NOC_OPERATOR`

Tujuan:

1. menggantikan role `NOC`
2. fokus pada monitoring jaringan, ODP, dan trouble ticket

Hak minimum:

1. akses `support` dan `inventory`
2. update TT, status teknis, dan ODP operasional
3. tidak punya hak admin domain sales/customers

### `FIELD_TECHNICIAN`

Tujuan:

1. menggantikan role `TEKNISI`
2. fokus pada pekerjaan lapangan

Hak minimum:

1. akses queue lapangan, TT teknis, ODP, work order yang relevan
2. update hasil lapangan, status pengerjaan, status port/perangkat yang relevan
3. tidak punya hak persetujuan admin
4. boleh submit request barang teknisi ke inventory, tetapi tidak memproses status akhir request

Catatan:

1. harus dibedakan dari `NOC_OPERATOR`
2. fokus pada eksekusi lapangan, bukan pengawasan penuh

### `TT_OPERATOR`

Tujuan:

1. menggantikan role `TROUBLESHOOTS`
2. fokus mikro pada trouble ticket

Hak minimum:

1. akses hanya ke `support`
2. create/update/close TT sesuai scope
3. tidak punya hak inventory umum, sales, atau user management

### `DIGITAL_CREATOR`

Tujuan:

1. menggantikan role `CREATOR_DIGITAL`
2. fokus pada konten, campaign, lead digital, dan analytics marketing

Hak minimum:

1. akses domain marketing digital
2. create/update konten, campaign, digital leads, analytics notes
3. tidak otomatis mewarisi hak operasional CS/NOC

Catatan:

1. domain ini belum hidup penuh di ERP
2. parity role ini baru bisa aktif setelah modul creator digital dibuat

### `DISMANTLE_OPERATOR`

Tujuan:

1. menggantikan role `DISMANTLE`
2. fokus sempit pada pekerjaan dismantle

Hak minimum:

1. akses hanya ke flow dismantle dan data terkait
2. update hasil dismantle, note lapangan, status penyelesaian
3. tidak punya hak global ke support lain

## Matrix Domain Akses Target

| Role ERP target | Dashboard | Import | Sales | Customers | Support | Inventory | HR | Billing | Access | Users |
|---|---|---|---|---|---|---|---|---|---|---|
| `SUPER_ADMIN` | penuh | penuh | penuh | penuh | penuh | penuh | penuh | penuh | penuh | penuh |
| `SALES_MARKETING` | lihat | tidak | penuh | terbatas | terbatas | terbatas | tidak | tidak | tidak | tidak |
| `CS_OPERATOR` | lihat | tidak | parsial | parsial | penuh | parsial | tidak | tidak | tidak | tidak |
| `CS_ADMIN` | lihat | parsial | parsial | parsial | penuh | parsial | tidak | tidak | tidak | tidak |
| `NOC_OPERATOR` | lihat | tidak | tidak | tidak | penuh | penuh | tidak | tidak | tidak | tidak |
| `FIELD_TECHNICIAN` | lihat | tidak | tidak | tidak | parsial | parsial | tidak | tidak | tidak | tidak |
| `TT_OPERATOR` | lihat | tidak | tidak | tidak | terbatas | tidak | tidak | tidak | tidak | tidak |
| `DIGITAL_CREATOR` | lihat | tidak | parsial | tidak | tidak | tidak | tidak | tidak | tidak | tidak |
| `DISMANTLE_OPERATOR` | lihat | tidak | tidak | tidak | terbatas | tidak | tidak | tidak | tidak | tidak |

## Tahapan Implementasi Role

### Tahap 1

1. pertahankan `SUPER_ADMIN`
2. pecah `ADMIN_DIVISI` menjadi `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`
3. pecah `OPERATOR` menjadi `NOC_OPERATOR`, `FIELD_TECHNICIAN`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`

### Tahap 2

1. tambah `DIGITAL_CREATOR` saat modul parity marketing digital mulai dibangun
2. sesuaikan permission matrix per resource dan action
3. tambahkan guard UI per role baru
4. mulai menyiapkan integrasi lintas divisi setelah fondasi `Pemasaran dan Pelayanan` stabil

### Tahap 3

1. uji parity per role
2. validasi menu, aksi, flow, dan perspektif data
3. baru izinkan cutover domain per role

## Aturan Cutover Role

Role lama tidak boleh dimatikan sebelum:

1. role ERP target sudah tersedia
2. permission matrix sudah aktif
3. menu parity untuk role tersebut sudah tersedia
4. flow parity untuk role tersebut lolos uji
5. user acceptance test role tersebut selesai

## Kesimpulan

Desain role target ini memastikan migrasi ke ERP baru tetap mengikuti struktur kerja nyata di `web-psb-perkasa`.

Inti keputusannya:

1. jangan bertahan dengan 3 role generik
2. pecah role ERP sesuai fungsi kerja lama
3. cutover dilakukan per role dan per flow, bukan hanya per tabel

## Versioning

Dokumen ini dirilis pada:

- `0.64.42` untuk desain role target yang diselaraskan dengan struktur dashboard divisi terbaru
