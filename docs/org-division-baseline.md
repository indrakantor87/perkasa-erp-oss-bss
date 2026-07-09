# Baseline Divisi dan Sub-Divisi

## Tujuan

Dokumen ini mengunci baseline struktur divisi bisnis-operasional yang menjadi acuan pengembangan
`perkasa-erp-oss-bss` agar desain role, dashboard, permission, dan modul mengikuti organisasi nyata.

## Struktur Divisi

### 1. Pemasaran & Pelayanan

Sub-divisi:

1. Penjualan
2. CS
3. Admin CS
4. NOC
5. Troubleshoots
6. Digital Creator

### 2. Teknisi

Sub-divisi:

1. Teknisi PSB
2. Teknisi Jalur dan Expan
3. Teknisi Jointer

### 3. General Affair

Sub-divisi:

1. Inventory
2. Legal

### 4. Finance & HR

Divisi ini saat ini masih diperlakukan sebagai satu payung bersama untuk fungsi finance dan HR sampai
role mikro dan workflow-nya dipisah lebih detail.

### 5. Operasional

Sub-divisi:

1. Kantor
2. Toko

## Mapping Ke Role ERP Saat Ini

| Struktur organisasi | Role ERP saat ini | Catatan |
|---|---|---|
| Pemasaran & Pelayanan > Penjualan | `SALES_MARKETING` | sudah aktif |
| Pemasaran & Pelayanan > CS | `CS_OPERATOR` | sudah aktif |
| Pemasaran & Pelayanan > Admin CS | `CS_ADMIN` | sudah aktif |
| Pemasaran & Pelayanan > NOC | `NOC_OPERATOR` | sudah aktif |
| Pemasaran & Pelayanan > Troubleshoots | `TT_OPERATOR` | sudah aktif |
| Pemasaran & Pelayanan > Digital Creator | `DIGITAL_CREATOR` | sudah aktif |
| Teknisi > Teknisi PSB / Jalur dan Expan / Jointer | `FIELD_TECHNICIAN` | masih agregat, belum dipisah menjadi role mikro |
| General Affair > Inventory | belum jadi role terpisah | sementara masih ditangani lewat resource `inventory` oleh role operasional terkait |
| General Affair > Legal | belum ada role khusus | masih gap |
| Finance & HR | belum dipisah ke role mikro | domain `hr` dan `billing` sudah ada, tetapi role operasional detail belum dipisah |
| Operasional > Kantor / Toko | belum ada role khusus | masih gap untuk pengembangan berikutnya |

## Implikasi Ke ERP

1. desain role tidak boleh lepas dari pembagian divisi nyata
2. `FIELD_TECHNICIAN` saat ini masih payung gabungan untuk tiga sub-divisi teknisi
3. `General Affair`, `Finance & HR`, dan `Operasional` perlu role dan dashboard yang lebih spesifik pada tahap berikutnya
4. modul inventory request teknisi saat ini sudah sejalan dengan struktur `Teknisi` yang berinteraksi ke `General Affair > Inventory`
5. request inventory teknisi idealnya menyimpan tag sub-divisi (`Teknisi PSB`, `Teknisi Jalur dan Expan`, `Teknisi Jointer`) agar proses gudang dan pelacakan kebutuhan harian lebih akurat
6. workflow lintas divisi perlu tetap satu website agar perpindahan kerja antar-divisi tidak memecah aplikasi

## Prioritas Lanjutan

1. pecah `FIELD_TECHNICIAN` menjadi role mikro jika kebutuhan operasional per sub-divisi teknisi mulai berbeda jauh
2. definisikan role untuk `General Affair > Inventory` dan `General Affair > Legal`
3. definisikan struktur role untuk `Finance & HR`
4. siapkan dashboard dan antrian kerja untuk `Operasional > Kantor` dan `Operasional > Toko`
