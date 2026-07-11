# Hybrid Wave 1 Inventory

## Tujuan

Dokumen ini merangkum inventaris awal tiga repo legacy lokal yang akan dipakai sebagai sumber `hybrid migration`:

- `web-psb-perkasa`
- `finance-repo`
- `ga-web-app`

Tujuan gelombang 1 bukan memindahkan semua modul sekaligus, tetapi:

1. memastikan sumber repo yang akan dipakai memang ada dan bisa diaudit
2. mengidentifikasi menu kerja dan logic yang paling layak dicopy
3. memetakan modul legacy ke target modul ERP baru
4. menentukan urutan porting yang paling cepat memberi parity operasional

## Sumber Lokal yang Sudah Tersedia

### 1. Web PSB

- Path lokal: [web-psb-perkasa](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa)
- Fungsi utama: operasi `Penjualan`, `CS & Admin CS`, `NOC & Troubleshoots`, `Creator Digital`
- Nilai utama untuk ERP:
  - baseline UI/UX tabel operasional
  - workflow PSB, isolir, dismantle, trouble ticket, ODP
  - mapping role dan visibility menu legacy

### 2. Web Finance

- Path lokal: [finance-repo](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo)
- Fungsi utama: `HR`, absensi, gaji, pinjaman, perizinan, sanksi, settings operasional
- Nilai utama untuk ERP:
  - baseline domain `HR + payroll ops`
  - logic payroll, attendance, leave, loan
  - referensi UI CRUD dan table-first untuk domain HR

### 3. Web GA

- Path lokal: [ga-web-app](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app)
- Fungsi utama: `Inventory GA`, transaksi barang masuk/keluar, laporan stok, master item
- Nilai utama untuk ERP:
  - baseline inventory operasional sederhana
  - logic stock movement
  - referensi UI tabel + export + modal CRUD untuk gudang/GA

## Ringkasan Audit Cepat

### Web PSB

Menu dan halaman kerja inti yang paling bernilai:

- `Dashboard`
- `Input PSB`
- `List Data / Ticket List`
- `Aktivitas Marketing`
- `Isolir`
- `Dismantle Perangkat`
- `PORT ODP`
- `Trouble Ticket`
- `Creator Digital`

Tabel/model utama yang terlihat dari schema dan layer runtime:

- `User`
- `Ticket`
- `Isolation`
- `Priority`
- `Package`
- `WhatsappTemplate`
- `CoveredArea`
- `MarketingActivity`
- `TroubleTicket`
- `ContentCalendar`
- `Campaign`
- `DigitalLead`
- `ContentAnalytics`
- tabel runtime non-Prisma seperti `psb_odp`, `DismantleTickets`, `DismantleHistory`, `TroubleTicketSla`, `SecurityLogs`

File prioritas untuk copy-first:

- [TicketList.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/components/TicketList.tsx)
- [IsolationView.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/components/IsolationView.tsx)
- [DismantleView.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/components/DismantleView.tsx)
- [TroubleTicketView.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/components/TroubleTicketView.tsx)
- [OdpManager.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/components/OdpManager.tsx)
- [MarketingActivityView.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/components/MarketingActivityView.tsx)
- [access.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/src/lib/access.ts)
- [schema.prisma](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/prisma/schema.prisma)

### Web Finance

Menu dan halaman kerja inti yang paling bernilai:

- `Dashboard`
- `Data Karyawan`
- `Sanksi`
- `Absensi`
- `Gaji`
- `Laporan`
- `Pinjaman`
- `Perizinan`
- `Master Data`
- `Settings`

Tabel/model utama:

- `Employee`
- `Attendance`
- `SalarySlip`
- `Loan`
- `LoanPayment`
- `LeaveRequest`
- `SystemSetting`
- `User`
- `Notification`
- `WarningLetter`

File prioritas untuk copy-first:

- [employees/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/(dashboard)/employees/page.tsx)
- [attendance/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/(dashboard)/attendance/page.tsx)
- [salary/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/(dashboard)/salary/page.tsx)
- [loans/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/(dashboard)/loans/page.tsx)
- [permissions/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/(dashboard)/permissions/page.tsx)
- [generate/route.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/api/salary-slip/generate/route.ts)
- [attendance/route.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/api/attendance/route.ts)
- [loans/route.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/src/app/api/loans/route.ts)
- [schema.prisma](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/finance-repo/prisma/schema.prisma)

### Web GA

Menu dan halaman kerja inti yang paling bernilai:

- `Dashboard`
- `Barang Masuk`
- `Barang Keluar`
- `Log Aktivitas`
- `Laporan Stok`
- `Laporan Barang Masuk`
- `Laporan Barang Keluar`
- `Jenis Barang`
- `Satuan`
- `Data Barang`
- `Settings`
- `Manajemen User`

Tabel/model utama:

- `tbl_barang`
- `tbl_barang_masuk`
- `tbl_barang_keluar`
- `tbl_jenis`
- `tbl_satuan`
- `users`
- `settings`

File prioritas untuk copy-first:

- [master/items/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/master/items/page.tsx)
- [transactions/in/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/transactions/in/page.tsx)
- [transactions/out/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/transactions/out/page.tsx)
- [transactions/logs/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/transactions/logs/page.tsx)
- [reports/stock/page.tsx](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/reports/stock/page.tsx)
- [api/master/items/route.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/api/master/items/route.ts)
- [api/transactions/in/route.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/api/transactions/in/route.ts)
- [api/transactions/out/route.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/app/api/transactions/out/route.ts)
- [schema.prisma](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/ga-web-app/prisma/schema.prisma)

## Mapping Awal Legacy ke ERP Baru

### Jalur Web PSB -> ERP

- `Input PSB` -> domain `Sales` (`lead`, `survey`, `order`, `work order`)
- `Ticket List` -> workspace `Sales` berbasis tabel
- `Marketing Activities` -> `/sales/marketing-activities`
- `Isolir` -> `/support/isolations` dengan ownership `Billing` untuk restore
- `Dismantle` -> `/support/dismantle` dengan ownership `CS & Admin CS`
- `Trouble Ticket` -> `/support/tt` dan `/support/sla`
- `ODP / Port` -> domain `Inventory` dengan capability `inventory:update`
- `Creator Digital` -> `/sales/digital-creator`, `/sales/campaigns`, `/sales/digital-leads`, `/sales/content-calendar`, `/sales/content-analytics`

### Jalur Web Finance -> ERP

- `Data Karyawan` -> domain `HR / Employees`
- `Absensi` -> domain `HR / Attendance`
- `Gaji` -> domain `HR / Salary Slips`
- `Pinjaman` -> domain `HR / Loans`
- `Perizinan` -> domain `HR / Leave / Permission`
- `Sanksi` -> domain `HR / Warning Letters`
- `Master Data` -> pecah ke `HR settings` dan master payroll, jangan dibawa mentah
- `Settings` -> integrasikan ke settings ERP, jangan copy auth/setting lama mentah

### Jalur Web GA -> ERP

- `Data Barang` -> `Inventory Items`
- `Barang Masuk` -> `Inventory Receipts`
- `Barang Keluar` -> `Inventory Stock Movements / Requests`
- `Log Aktivitas` -> `Inventory Audit / Activity`
- `Laporan Stok` -> `Inventory Reporting`
- `Jenis Barang` + `Satuan` -> master inventory ERP
- `Settings` + `Users` -> tidak dipindah mentah; map ke settings/auth ERP baru

## Prioritas Porting Gelombang 1

### Prioritas 1

Modul yang paling besar dampaknya ke parity operasional:

- `PSB Ticket List`
- `Monitoring Isolir`
- `Dismantle`
- `Trouble Ticket`
- `Aktivitas Marketing`

Alasan:

- paling dekat dengan kebutuhan parity saat ini
- paling sering dibandingkan langsung dengan `web-psb-perkasa`
- sudah menjadi pusat kerja operator harian

### Prioritas 2

Modul lintas domain berikutnya yang penting untuk ERP:

- `Data Karyawan`
- `Absensi`
- `Gaji`
- `Pinjaman`
- `Perizinan`
- `Data Barang`
- `Barang Masuk`
- `Barang Keluar`

### Prioritas 3

Modul yang bisa menyusul setelah fondasi parity kuat:

- chart/report lama yang sifatnya display
- settings legacy
- auth system lama
- helper technical yang perlu direwrite ke service ERP

## Prinsip Porting yang Dipakai

Setiap modul hasil inventaris ini harus mengikuti aturan:

1. copy `workflow dan UI tabel`, bukan copy arsitektur repo lama
2. copy `query dan business rule`, lalu pindahkan ke service ERP
3. baca `schema nyata` dari DB source, tapi arahkan ke target final `1 database`
4. map role lama ke capability ERP, bukan pertahankan auth lama
5. pakai ownership ERP baru walaupun ritme halaman mengikuti legacy

## Risiko yang Sudah Terlihat

### Web PSB

- ada tabel runtime yang belum semua resmi di schema Prisma
- ada raw SQL dan helper akses yang perlu dinormalisasi
- beberapa modul sudah kita porting sebagian, jadi perlu hati-hati agar tidak divergen dari baseline

### Web Finance

- logic bisnis banyak hidup di page dan route, belum service layer yang rapi
- ada indikasi mismatch antara Prisma schema dan kolom nyata untuk `SystemSetting`
- repo lebih tepat disebut `HR-finance ops`, jadi migrasi harus memilah mana yang murni HR dan mana yang finance

### Web GA

- auth dan user management masih sederhana
- ada raw SQL dan hardcode user pada beberapa transaksi
- ada tabel sisa legacy yang tidak perlu dibawa ke target final

## Output yang Diharapkan Setelah Inventaris Ini

Setelah dokumen ini, batch implementasi berikutnya seharusnya bisa berjalan lebih cepat karena kita sudah punya:

1. daftar repo sumber yang nyata
2. daftar file prioritas yang layak dibaca/copy
3. mapping awal modul legacy ke modul ERP
4. urutan porting yang selaras dengan target parity dan target ERP/OSS/BSS

## Next Step

Langkah operasional yang paling tepat setelah dokumen ini:

1. buat `source table -> staging -> final table -> ERP module` untuk `Web PSB`
2. audit schema dan dump nyata dari production `Web PSB`
3. lanjutkan parity workspace `Trouble Ticket` dan `Dismantle` berbasis file legacy yang sudah teridentifikasi
4. setelah lane PSB lebih stabil, lanjutkan inventaris mapping detail `Web Finance`
5. susulkan baseline `Web GA` ke domain inventory yang sudah ada
