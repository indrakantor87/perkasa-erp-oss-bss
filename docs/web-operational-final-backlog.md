# Backlog Teknis Operasional Final

## Tujuan

Dokumen ini merangkum backlog teknis final lintas divisi berdasarkan mapping bisnis terbaru yang sudah
disepakati untuk web ERP aktif di `apps/web`.

Fokus utama backlog ini:

1. memisahkan `alur bisnis ideal` dari `status implementasi web saat ini`
2. menurunkan diskusi bisnis menjadi backlog teknis yang bisa langsung dibangun
3. menjaga ownership per divisi tetap jelas sebelum modul baru ditambahkan
4. memastikan changelog dan versioning punya jejak formal untuk backlog lintas divisi ini

Dokumen ini melengkapi:

1. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
2. [web-psb-module-gap-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-module-gap-plan.md)
3. [billing-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/billing-prd-alignment.md)
4. [hr-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hr-prd-alignment.md)

## Baseline Bisnis Final

### Alur besar end-to-end

```text
Penjualan -> List PSB -> CS -> Ticket PSB -> NOC/Teknisi
Billing -> Isolir 1 bulan -> List Dismantle -> CS -> Ticket Dismantle
Inventory/GA -> NOC atau Teknisi (sesuai jenis material)
Teknisi -> NOC Validation (hanya untuk jalur yang wajib validasi teknis)
Finance membaca omzet, biaya, pinjaman, dan kasbon lintas domain
HR berjalan paralel untuk employee, attendance, KPI, izin, SP, dan payroll
```

### Ownership final per divisi

| Divisi | Ownership final |
|---|---|
| `Penjualan` | input PSB, pengawalan, aktivitas |
| `CS` | validasi `List PSB`, validasi `List Dismantle`, ownership UI `ODP/Port`, distribusi ke ticketing |
| `NOC` | kontrol ticket teknis dan validasi device/material teknis |
| `Teknisi` | eksekusi lapangan PSB, TT, dismantle, dan jalur |
| `GA/Inventory` | stok, movement, pinjam-kembali, barcode audit, tracking material |
| `Billing` | isolir, tagihan, suspend candidate, restore |
| `Finance` | omzet, pembukuan harga barang, dampak isolir/dismantle, pinjaman, kasbon |
| `HR` | employee, attendance, KPI manual, izin, SP, payroll |

## Keputusan Final Yang Sudah Dikunci

1. `Finance` dipisah dari `Billing`
2. `Billing` tetap menangani tagihan, isolir, dan suspend candidate
3. `List PSB` menjadi domain sendiri
4. `List Dismantle` menjadi domain sendiri
5. `ODP/Port` secara UI utama dimiliki `CS`
6. `Inventory` hanya menjaga tracking material/network asset untuk area `ODP/Port`
7. `Payroll HR` memakai input KPI/kinerja/performa manual per karyawan
8. seluruh teknisi diperlakukan setara untuk evaluasi performa, walau sumber job berbeda

## Backlog Prioritas

### Prioritas 1 - Domain List PSB

**Tujuan**

Membentuk antrean operasional hasil input penjualan sebelum menjadi `Ticket PSB`.

**Route ideal**

- `/list-psb`

**Aktor**

- `PENJUALAN`
- `CS_OPERATOR`
- `CS_ADMIN`
- `SUPER_ADMIN`

**Input**

- form PSB dari `Penjualan`
- data pengawalan
- aktivitas terkait order pemasangan baru

**Status target**

1. `BARU`
2. `REVIEW_CS`
3. `PERLU_KOREKSI`
4. `DISETUJUI`
5. `DITOLAK`
6. `DITRANSFER_KE_TICKETING`

**Fitur minimum**

1. tabel `List PSB`
2. detail data PSB yang dipilih
3. filter status dan PIC CS
4. aksi `Setujui`, `Perlu Koreksi`, `Tolak`
5. aksi `Transfer ke Ticketing`
6. histori transfer ke `Ticket PSB`

**Integrasi data**

- source dari domain `Penjualan`
- sink ke ticketing `PSB`
- relasi ke `Customer`, `Work Order`, atau `Subscription` bila sudah terbentuk

**Gap web saat ini**

1. belum ada domain `List PSB` eksplisit
2. flow `Penjualan` masih terlalu generik
3. transfer `List PSB -> Ticket PSB` belum dibakukan sebagai write-side khusus

### Prioritas 2 - Domain List Dismantle

**Tujuan**

Membentuk antrean kandidat dismantle hasil transfer dari isolir 1 bulan sebelum menjadi `Ticket Dismantle`.

**Route ideal**

- `/list-dismantle`

**Aktor**

- `FINANCE` atau `Billing` sebagai sumber isolir
- `CS_OPERATOR`
- `CS_ADMIN`
- `SUPER_ADMIN`

**Status target**

1. `BARU`
2. `REVIEW_CS`
3. `PERLU_KOREKSI`
4. `DITRANSFER_KE_TICKETING`
5. `BATAL`

**Fitur minimum**

1. tombol `Transfer ke List Dismantle` dari data isolir 1 bulan
2. tabel `List Dismantle`
3. detail asal isolir
4. aksi `Transfer ke Ticketing`
5. histori perpindahan `Isolir -> List Dismantle -> Ticket Dismantle`

**Integrasi data**

- source dari `Billing/Isolir`
- review oleh `CS`
- sink ke ticketing label `DISMANTLE`

**Gap web saat ini**

1. `transfer ke dismantle` sudah ada di support, tetapi belum menjadi domain list terpisah
2. CS belum punya meja kerja `List Dismantle` yang eksplisit
3. histori perpindahan antar tahap belum dibaca sebagai alur bisnis final

### Prioritas 3 - Ownership UI ODP/Port ke CS

**Tujuan**

Memindahkan kontrol operasional `ODP/Port` ke `CS`, sementara `Inventory` tetap tracking material.

**Route ideal**

- `/customers/cs-admin`
- `/cs/odp-port` atau fokus khusus pada workspace CS

**Fitur minimum**

1. tambah port
2. kurangi atau nonaktifkan port
3. update status port
4. lihat relasi port ke customer dan ticket
5. quick action untuk screenshot operasional

**Peran Inventory**

1. tracking material ODP
2. tracking posisi barang/network asset
3. audit histori terkait port dan material

**Gap web saat ini**

1. `Inventory` masih terlalu dominan pada area `ODP/Port`
2. ownership `CS` belum ditegaskan penuh di route dan copy UI

### Prioritas 4 - Domain Finance Terpisah

**Tujuan**

Membentuk domain `Finance` terpisah dari `Billing`.

**Route ideal**

- `/finance`

**Output utama**

1. rekap harian
2. rekap mingguan
3. rekap bulanan
4. rekap tahunan

**Sumber data**

1. harga barang masuk dan keluar dari inventory
2. jumlah `PSB` berhasil dipasang
3. jumlah isolir aktif
4. jumlah dismantle `closed`
5. pinjaman
6. kasbon

**Fitur minimum**

1. ringkasan omzet PSB
2. pengurang omzet dari isolir aktif
3. dampak dismantle `closed`
4. pembukuan inventory cost in/out
5. rekap pinjaman
6. rekap kasbon

**Gap web saat ini**

1. role `FINANCE` masih mendarat di `/billing`
2. domain `Finance` belum ada
3. `Billing` masih menjadi penampung kebutuhan finance yang seharusnya dipisah

### Prioritas 5 - Penguatan HR

**Tujuan**

Menjadikan `HR` sebagai domain internal yang menghitung payroll per karyawan berbasis data nyata dan input manual.

**Route ideal**

- `/hr`

**Fokus final**

1. employee master
2. attendance mesin finger multi-IP
3. absensi wajah tetap dipertahankan
4. KPI/kinerja/performa manual per karyawan
5. izin
6. SP
7. payroll

**Integrasi penting**

1. histori job teknisi
2. hasil validasi NOC
3. pinjaman dan kasbon

**Gap web saat ini**

1. fondasi `HR` sudah ada, tetapi payroll belum dibaca dari KPI manual per karyawan
2. integrasi finger multi-IP belum dibakukan
3. relasi `performa teknisi -> HR payroll` belum dibangun

### Prioritas 6 - Pemisahan Workspace Teknisi

**Tujuan**

Membuat workspace teknisi lebih tegas per sumber kerja tanpa memecah standar evaluasi.

**Route ideal**

1. `/teknisi-psb`
2. `/teknisi-troubleshoots`
3. `/teknisi-dismantle`
4. `/teknisi-jalur`

**Sumber kerja**

1. `PSB` dari `CS`
2. `Troubleshoots` dari `NOC`
3. `Dismantle` dari `CS`
4. `Jalur` dari `NOC`

**Fitur minimum**

1. daftar job per jenis kerja
2. update status kerja
3. scan device atau material
4. histori job per teknisi
5. rekap performa per periode

**Gap web saat ini**

1. workspace teknisi masih lebih terasa sebagai cabang `Support/NOC`
2. pengaruh jumlah job ke evaluasi HR belum dibaca formal

## Dampak Ke Data Model

### Entitas baru yang perlu dipertimbangkan

1. `sales_psb_lists`
2. `sales_psb_list_audits`
3. `support_dismantle_lists`
4. `support_dismantle_list_audits`
5. `finance_daily_summaries`
6. `finance_period_summaries`
7. `hr_employee_kpi_inputs`
8. `field_job_performance_snapshots`

### Relasi penting

1. `sales_psb_lists -> support tickets`
2. `support_isolations -> support_dismantle_lists`
3. `inventory movements -> finance summaries`
4. `device lifecycle -> hr performance snapshots`
5. `work orders / trouble tickets / dismantle tickets -> technician performance`

## Backlog Teknis Per Layer

### 1. Route dan navigasi

1. tambah route `/list-psb`
2. tambah route `/list-dismantle`
3. tambah route `/finance`
4. revisi landing role `FINANCE`
5. revisi sidebar agar `ODP/Port` terlihat dimiliki `CS`

### 2. Service layer

1. service `List PSB`
2. service `List Dismantle`
3. service ringkasan `Finance`
4. service KPI manual `HR`
5. service agregasi performa teknisi

### 3. API

1. create/update/status API untuk `List PSB`
2. transfer API `List PSB -> Ticket PSB`
3. transfer API `Isolir -> List Dismantle`
4. transfer API `List Dismantle -> Ticket Dismantle`
5. summary API `Finance`
6. KPI input API `HR`

### 4. UI

1. workspace `List PSB`
2. workspace `List Dismantle`
3. kartu ringkasan `Finance`
4. panel KPI manual `HR`
5. rekap job teknisi untuk payroll dan evaluasi

## Urutan Implementasi Yang Disarankan

### Sprint 1

1. `List PSB`
2. `List Dismantle`

### Sprint 2

1. ownership `ODP/Port` ke `CS`
2. rapikan route teknisi

### Sprint 3

1. domain `Finance`
2. baseline integrasi `Inventory -> Finance`

### Sprint 4

1. KPI manual `HR`
2. payroll per karyawan
3. hubungan performa teknisi ke HR

## Status Implementasi Saat Ini

| Area | Status |
|---|---|
| `GA/Inventory` | kuat dan operasional |
| `NOC` | matang untuk ticketing gabungan |
| `CS` | hidup dan jelas sebagai workspace operasional |
| `Penjualan` | ada fondasi, perlu dipersempit ke `List PSB` |
| `Billing` | operasional, tetapi harus dipisah dari `Finance` |
| `Finance` | belum ada domain sendiri |
| `HR` | fondasi ada, model final belum lengkap |
| `Teknisi` | flow hidup, ownership sumber kerja belum tegas |

## Kesimpulan

Backlog teknis final paling aman untuk dilanjutkan sekarang adalah:

1. bentuk `List PSB`
2. bentuk `List Dismantle`
3. pindahkan ownership `ODP/Port` ke `CS`
4. pecah `Finance` dari `Billing`
5. kuatkan `HR` untuk KPI manual dan payroll per karyawan

## Versioning

Dokumen ini dirilis pada:

- `0.66.35` untuk baseline backlog teknis final lintas divisi setelah keputusan bisnis baru dikunci
