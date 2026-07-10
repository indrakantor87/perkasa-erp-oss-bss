# Baseline Divisi dan Sub-Divisi

## Tujuan

Dokumen ini mengunci baseline struktur divisi bisnis-operasional yang menjadi acuan pengembangan
`perkasa-erp-oss-bss` agar desain role, dashboard, permission, dan modul mengikuti organisasi nyata.

## Struktur Divisi

### 1. Pemasaran dan Pelayanan

Sub-divisi:

1. Penjualan
2. CS
3. Admin CS
4. NOC
5. Troubleshoots
6. Creator Digital
7. Dismantle

## Prinsip Migrasi Tahap 1

Untuk baseline migrasi dari `web-psb-perkasa`, seluruh flow dan menu legacy diperlakukan terlebih dahulu sebagai
fondasi Divisi `Pemasaran dan Pelayanan`.

Artinya, fase awal ERP memprioritaskan:

1. `Penjualan`
2. `CS`
3. `Admin CS`
4. `NOC`
5. `Troubleshoots`
6. `Creator Digital`
7. `Dismantle`

Sedangkan divisi lain diposisikan sebagai tahap integrasi berikutnya:

1. `Teknis dan Expan`
2. `General Affair`
3. `Finance dan HR`
4. `Operasional`

Catatan:

1. keputusan ini dipakai untuk menjaga paritas organisasi kerja legacy selama cutover awal
2. domain ERP tetap modular, tetapi dasar organisasi migrasi tahap 1 berpusat pada `Pemasaran dan Pelayanan`
3. integrasi ke divisi lain dilakukan setelah flow inti `web-psb-perkasa` stabil di ERP

### 2. Teknis dan Expan

Sub-divisi:

1. Teknisi PSB
2. Teknisi Jalur & Expan
3. Teknisi Jointer

### 3. General Affair

Sub-divisi:

1. Inventory
2. Legal

### 4. Finance dan HR

Sub-divisi:

1. Billing
2. HR

### 5. Operasional

Sub-divisi:

1. Kantor
2. Toko

## Mapping Ke Role ERP Saat Ini

| Struktur organisasi | Role ERP saat ini | Catatan |
|---|---|---|
| Pemasaran dan Pelayanan > Penjualan | `SALES_MARKETING` | sudah aktif |
| Pemasaran dan Pelayanan > CS | `CS_OPERATOR` | sudah aktif |
| Pemasaran dan Pelayanan > Admin CS | `CS_ADMIN` | sudah aktif |
| Pemasaran dan Pelayanan > NOC | `NOC_OPERATOR` | sudah aktif |
| Pemasaran dan Pelayanan > Troubleshoots | `TT_OPERATOR` | sudah aktif |
| Pemasaran dan Pelayanan > Creator Digital | `DIGITAL_CREATOR` | sudah aktif |
| Pemasaran dan Pelayanan > Dismantle | `DISMANTLE_OPERATOR` | sudah aktif sebagai role mikro support |
| Teknis dan Expan > Teknisi PSB / Teknisi Jalur & Expan / Teknisi Jointer | `FIELD_TECHNICIAN` | masih agregat, belum dipisah menjadi role mikro, dan belum menjadi fokus migrasi tahap 1 |
| General Affair > Inventory | belum jadi role terpisah | sementara masih ditangani lewat resource `inventory` oleh role operasional terkait |
| General Affair > Legal | belum ada role khusus | masih gap |
| Finance dan HR > Billing / HR | belum dipisah ke role mikro | domain `hr` dan `billing` sudah ada, tetapi role operasional detail belum dipisah |
| Operasional > Kantor / Toko | belum ada role khusus | masih gap untuk pengembangan berikutnya |

## Implikasi Ke ERP

1. desain role tidak boleh lepas dari pembagian divisi nyata
2. `FIELD_TECHNICIAN` saat ini masih payung gabungan untuk tiga sub-divisi teknisi
3. `General Affair`, `Finance dan HR`, dan `Operasional` perlu role dan dashboard yang lebih spesifik pada tahap berikutnya
4. modul inventory request teknisi saat ini sudah sejalan dengan struktur `Teknis dan Expan` yang berinteraksi ke `General Affair > Inventory`
5. request inventory teknisi idealnya menyimpan tag sub-divisi (`Teknisi PSB`, `Teknisi Jalur & Expan`, `Teknisi Jointer`) agar proses gudang dan pelacakan kebutuhan harian lebih akurat
6. workflow lintas divisi perlu tetap satu website agar perpindahan kerja antar-divisi tidak memecah aplikasi
7. baseline cutover awal harus dibaca sebagai `Pemasaran dan Pelayanan` terlebih dahulu, lalu diperluas ke divisi lain

## Prioritas Lanjutan

1. matangkan seluruh flow `Pemasaran dan Pelayanan` sebagai fondasi cutover awal
2. pecah `FIELD_TECHNICIAN` menjadi role mikro jika kebutuhan operasional per sub-divisi teknisi mulai berbeda jauh
3. definisikan role untuk `General Affair > Inventory` dan `General Affair > Legal`
4. definisikan struktur role untuk `Finance dan HR`
5. siapkan dashboard dan antrian kerja untuk `Operasional > Kantor` dan `Operasional > Toko`
