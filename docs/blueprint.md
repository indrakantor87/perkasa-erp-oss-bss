# Blueprint ERP + OSS/BSS ISP Terintegrasi

## Tujuan

Dokumen ini menjadi acuan untuk project baru yang menggabungkan logika dari:

- `web-psb-perkasa`
- `finance-repo`
- `ga-web-app`

Tahap awal memakai MySQL XAMPP untuk review. Setelah struktur disetujui, database dipindahkan ke environment production.

Constraint platform:

- target akhir adalah `1 database`, `1 domain`, dan `1 website`
- tiga aplikasi lama diperlakukan sebagai source logic dan source data, bukan sebagai tiga aplikasi yang tetap dipertahankan terpisah

## Domain Sistem

### Commercial / Sales

- lead dan registrasi
- coverage dan survey
- package catalog
- order acquisition
- marketing activities
- digital leads, campaign, content, analytics

### Service Delivery

- sales order
- work order
- assignment teknisi
- issue material
- input serial/device
- activation subscription

### Support & Service Assurance

- trouble ticket
- SLA
- overdue monitoring
- repeated ticket
- isolir
- dismantle
- histori closed data

### Customer & Subscription

- customer master
- service address
- package aktif
- subscription aktif
- histori perubahan layanan

### Inventory & Network Asset

- item master
- category
- unit
- stock in
- stock out
- stock movement log
- ODP
- ODP port
- device assignment

### HR & Internal Control

- employee master
- attendance
- machine sync
- leave
- payroll
- salary slip
- loan / kasbon
- warning letter
- notification

### Procurement & Operational Cost

- vendor
- purchase request
- purchase approval
- receiving
- biaya operasional
- biaya upstream

### Dashboard & Reporting

- dashboard Penjualan
- dashboard CS
- dashboard NOC
- dashboard Inventory
- dashboard HR
- dashboard Finance

## Mapping Sistem Lama

### Dari `web-psb-perkasa`

- `Input`, `List`, `Tickets` -> lead, registration, order
- `Packages` -> package catalog
- `Covered Areas` -> coverage
- `ODP` -> network point registry
- `Isolir` -> suspension control
- `Dismantle` -> termination control + history
- `Trouble Ticket` -> support SLA
- `Marketing Activities` -> sales activity tracking
- `Digital Leads`, `Campaign`, `Content Calendar`, `Analytics` -> digital marketing CRM

### Dari `finance-repo`

- `Employees` -> employee master
- `Attendance` -> attendance dan workforce control
- `Salary` -> payroll
- `Loans` -> kasbon
- `Warning Letters` -> disciplinary control

### Dari `ga-web-app`

- `Items`, `Categories`, `Units` -> inventory master
- `Barang Masuk` -> stock in
- `Barang Keluar` -> stock out
- `Stock / In / Out Reports` -> inventory reporting

## Workflow Inti

### Home Broadband

```text
Lead
-> Coverage
-> Registrasi
-> Sales Order
-> Work Order
-> Material Issue
-> Instalasi
-> Aktivasi
-> Billing
-> Support / Isolir / Dismantle
```

### Dedicated Corporate

```text
Lead
-> Feasibility
-> Quotation
-> Approval
-> Contract
-> Delivery
-> Aktivasi
-> Billing
-> SLA Support
```

### HR & Payroll

```text
Employee
-> Attendance
-> Leave / Permit
-> Overtime / incentive
-> Loan deduction
-> Salary calculation
-> Salary slip release
```

## Aturan Desain

1. data aktif dan histori dipisahkan
2. KPI dashboard dan tabel detail harus memakai definisi backend yang sama
3. role akses dipisah dari domain data
4. UI operasional wajib aman untuk mobile web dan Android
5. desain database review tidak boleh mengikuti keterbatasan aplikasi lama secara mentah
6. target implementasi akhir tetap satu platform web terpadu, bukan multi-domain atau multi-website

## Catatan Database XAMPP

Karena review awal memakai MySQL, field array dari sistem lama harus dipecah menjadi tabel relasi. Contoh:

- `support_trouble_ticket_photos`
- `marketing_content_tags`
- `marketing_campaign_objectives`
- `marketing_campaign_platforms`

## Langkah Lanjut

1. finalisasi tabel phase 1
2. mapping field dari tiga aplikasi lama
3. buat ERD
4. siapkan master mapping untuk satu model data bersama
5. bootstrap aplikasi web baru
