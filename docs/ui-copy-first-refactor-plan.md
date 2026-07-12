# UI Copy-First Refactor Plan

Tanggal: `2026-07-12`
Status: `ACTIVE`
Strategi: `Copy-first UI, PRD-first backend`

## 1. Tujuan

Dokumen ini mengunci arah baru pengembangan UI ERP:

- UI operasional tidak lagi dibangun dengan pola `dashboard/card-heavy` generik.
- UI operasional mengikuti baseline yang sudah terbukti nyaman dipakai pada repo legacy:
  - `web-psb-perkasa`
  - `finance-repo`
  - `ga-web-app`
- Backend, role ownership, validasi, alur approval, dan data contract tetap mengikuti PRD dan arsitektur ERP baru.

## 2. Masalah Yang Dihentikan

Pola berikut dianggap tidak cocok untuk menu operasional:

- terlalu banyak kartu ringkasan yang menggeser fokus dari tabel kerja
- terlalu banyak panel konteks yang memaksa operator membaca blok demi blok
- shell generik yang membuat semua menu terasa sama walau kebutuhan operasional berbeda
- aksi penting terlalu jauh dari data utama
- user perlu membaca layout baru di setiap menu, bukan bekerja dengan pola yang familiar

## 3. Prinsip Wajib

Semua refactor UI baru harus mematuhi prinsip berikut:

1. `Table-first`
2. `Filter-first`
3. `Action-near-data`
4. `Minimal cognitive load`
5. `Copy proven UX, not generic dashboard style`

Turunan praktisnya:

- tabel kerja harus terlihat pada viewport utama tanpa perlu melewati banyak kartu
- filter dan quick action harus berada di atas tabel
- ringkasan hanya 2-4 item bila benar-benar membantu keputusan
- badge dipakai untuk status, owner, aging, priority, dan signal penting, bukan dekorasi
- form write-side ditempatkan di bawah atau di samping area kerja, bukan memecah fokus baca utama

## 4. Source Of Truth

### 4.1 UI / UX Source Of Truth

- `web-psb-perkasa`
  - baseline utama untuk `PSB`, `Trouble Ticket`, `Isolir`, `Dismantle`, `PORT ODP`
- `finance-repo`
  - baseline utama untuk `Billing`, `Collection`, `Finance ops`, dan form-heavy workflow yang harus tetap sederhana
- `ga-web-app`
  - baseline utama untuk `Inventory / General Affair` berupa sidebar sederhana, table-first, nested menu praktis, dan form input yang langsung ke tugas

### 4.2 Logic / System Source Of Truth

- `PRD` dan keputusan bisnis ERP baru
- role ownership ERP baru
- data model ERP baru
- API, review DB, dan flow approval ERP baru

### 4.3 Larangan

Yang tidak boleh dilakukan:

- meng-copy backend legacy apa adanya tanpa menyesuaikan PRD
- mengorbankan ownership baru hanya demi meniru layout lama
- membangun halaman operasional baru dari shell generik bila baseline legacy untuk menu itu sudah jelas

## 5. Mapping Menu ERP Ke Baseline Legacy

| Cluster ERP | Menu ERP | Baseline UI | Catatan |
|---|---|---|---|
| Support | `Trouble Ticket` | `web-psb-perkasa / TroubleTicketView` | fokus queue, filter status/type/divisi, aksi progress-escalate-close |
| Support | `Isolir` | `web-psb-perkasa / IsolationView` | fokus monitoring, restore vs transfer, bulk action bila relevan |
| Support | `Dismantle` | `web-psb-perkasa / DismantleView` | fokus queue aktif, histori, close-reopen |
| Support | `SLA` | turunan `Trouble Ticket` + kebutuhan ERP | bukan dashboard terpisah yang penuh kartu |
| Sales / PSB | `Ticket PSB` | `web-psb-perkasa / TicketList` | filter bulan/tahun/status/divisi/marketing, tabel padat, bulk action |
| Sales / PSB | `Input / Survey / Order` | `web-psb-perkasa / InputForm` | form flow, bukan kartu analitik |
| Inventory / Network Ops | `PORT ODP` | `web-psb-perkasa / OdpManager` | tabel port, kapasitas, maps, aksi port per baris |
| Billing / Collection | `Invoice / Collection` | `finance-repo` | review-first, action-second, form jelas, minimal dekorasi |
| General Affair | `Inventory / Asset / Office Flow` | `ga-web-app` | sidebar sederhana, nested menu, tabel transaksi, laporan, master |
| Legal / Office / Store | `Kantor / Toko / Legal` | kombinasi `ga-web-app` + workspace organisasi ERP | landing singkat, tabel kerja langsung, CTA seperlunya |

## 6. Pola Layout Final Yang Diinginkan

Urutan default untuk menu operasional:

1. judul halaman + deskripsi singkat
2. filter bar + quick action
3. ringkasan kecil bila perlu
4. tabel kerja utama
5. form write-side / panel tindak lanjut

Urutan default untuk menu supervisi:

1. judul + scope role/divisi
2. filter
3. tabel antrean keputusan
4. detail / evidence / next action secara kontekstual

Urutan default untuk menu master atau transaksi sederhana:

1. judul
2. search/filter
3. tabel
4. modal/form input

## 7. Komponen Yang Perlu Dikurangi

Komponen berikut tidak boleh menjadi elemen dominan pada menu operasional:

- summary card berlapis
- panel insight dekoratif
- explanatory card yang mengulang isi tabel
- hero section terlalu tinggi
- kombinasi terlalu banyak badge yang tidak memicu aksi

Masih boleh dipakai bila benar-benar perlu:

- `DataSourceStatus`
- 2-4 KPI ringkas
- warning mode review DB
- evidence/status panel yang spesifik ke kasus

## 8. Strategi Implementasi

Refactor dilakukan per cluster, bukan acak per halaman.

### Wave 1: Support Core

Target:

- `Trouble Ticket`
- `SLA`
- `Isolir`
- `Dismantle`

Aturan:

- ikuti baseline `web-psb-perkasa`
- prioritaskan queue, filter, dan action per baris
- singkirkan blok kartu yang tidak membantu operator

### Wave 2: PSB / Sales Ops

Target:

- `Ticket PSB`
- `Input / Survey / Order`
- `Work Order / Aktivasi`

Aturan:

- ikuti baseline `TicketList` dan `InputForm`
- pakai tabel operasional dan filter periode/divisi/marketing
- dashboard analitik dipisahkan dari layar kerja utama

### Wave 3: Inventory / Network Ops / GA

Target:

- `PORT ODP`
- `Inventory`
- `Kantor`
- `Toko`
- `Legal`

Aturan:

- gunakan baseline `OdpManager` dan `ga-web-app`
- sidebar/navigasi sederhana
- transaksi, laporan, master, settings harus jelas secara mental model

### Wave 4: Billing / Finance

Target:

- `Invoice`
- `Collection`
- `Payment`
- `Suspend / Reconnect Decision`

Aturan:

- gunakan baseline `finance-repo`
- review queue dulu, form aksi kedua
- pertahankan keterbacaan dan kedisiplinan form

## 9. Aturan Implementasi Teknis

Dalam implementasi kode:

- UI boleh meniru ritme visual legacy
- endpoint, service, dan data adapter tetap dari ERP baru
- prefill form boleh dibangun dari queue ERP
- ownership role tetap mengikuti ERP baru, bukan legacy
- semua copy UI baru harus memakai bahasa operasional yang pendek dan jelas

## 10. Definition Of Done Per Halaman

Satu halaman dianggap selesai bila:

- user bisa langsung melihat tabel kerja utama
- filter utama tersedia di atas tabel
- aksi paling sering berada dekat data
- tidak ada kartu yang hanya “cantik” tetapi tidak berguna
- mobile fallback tetap terbaca
- role/permission ERP tetap benar
- `npm run check` lulus

## 11. Output Yang Diharapkan

Hasil akhir yang dituju bukan “ERP dengan tampilan dashboard modern”, tetapi:

- ERP dengan pengalaman pakai yang familiar
- ERP yang cepat dibaca operator
- ERP yang konsisten lintas divisi
- ERP yang memakai backend baru tetapi terasa nyaman seperti aplikasi lama yang sudah terbukti

## 12. Keputusan Kerja

Mulai dokumen ini dibuat:

- pola `card-heavy` untuk menu operasional dibekukan
- semua refactor UI baru harus merujuk ke baseline legacy yang jelas
- PRD tetap menjadi sumber kebenaran untuk logic, ownership, dan backend behavior
