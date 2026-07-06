# Data Mapping Phase 1

## Tujuan

Dokumen ini memetakan struktur data dari tiga aplikasi lama ke schema review baru di `database/xampp_review_schema.sql`.

Status terbaru:

- schema final review sudah diperluas melalui `database/xampp_review_schema_phase_1_1.sql`
- staging import sudah disiapkan di `database/xampp_review_staging_import.sql`
- template master mapping sudah disiapkan di `database/xampp_review_master_mapping.sql`
- dokumen ini tetap menjadi acuan mapping field, bukan file eksekusi import

Sumber data:

- `web-psb-perkasa`
- `finance-repo`
- `ga-web-app`

Target:

- `erp_isp_review` di MySQL XAMPP

## Prinsip Mapping

1. mapping dilakukan per domain, bukan per menu
2. data aktif dan histori dipisahkan
3. field yang tidak cocok 1:1 dipindahkan dengan aturan transformasi
4. field array dari PostgreSQL dipecah menjadi tabel relasi
5. data lama tetap dipertahankan, tetapi struktur target mengikuti domain baru

## 1. Mapping dari `web-psb-perkasa`

### 1.1. `User` -> `auth_users`

| Source | Target | Catatan |
|---|---|---|
| `User.id` | `auth_users.id` | untuk import awal lebih aman disimpan sebagai reference lama di staging, bukan dipaksa sama jika auto increment dipakai |
| `User.name` | `auth_users.full_name` | direct |
| `User.username` | `auth_users.username` | direct |
| `User.password` | `auth_users.password_hash` | direct sementara, nanti bisa direhash bila perlu |
| `User.role` | `auth_roles.code` / `auth_users.role_id` | harus dimapping ke master role |
| `User.division` | `org_divisions.code` / `auth_users.division_id` | harus dimapping ke master division |
| `User.avatar` | belum masuk schema phase 1 | bisa ditambah nanti bila dipakai |

### 1.2. `Package` -> `sales_packages`

| Source | Target | Catatan |
|---|---|---|
| `Package.name` | `sales_packages.name` | direct |
| `Package.name` | `sales_packages.code` | perlu generate slug/code |
| tidak ada price native di model ini | `sales_packages.price` | perlu sinkronisasi dari sumber paket/harga operasional |

### 1.3. `Ticket` -> `sales_orders` + `crm_customers` + `crm_customer_addresses`

Model `Ticket` di sistem lama memuat campuran data lead, customer, order, dan instalasi. Di sistem baru harus dipecah.

#### Ke `crm_customers`

| Source | Target | Catatan |
|---|---|---|
| `Ticket.customerName` | `crm_customers.full_name` | direct |
| `Ticket.phoneNumber` | `crm_customers.phone` | direct |
| `Ticket.customerName + phoneNumber` | `crm_customers.customer_code` | perlu generate code |

#### Ke `crm_customer_addresses`

| Source | Target | Catatan |
|---|---|---|
| `Ticket.locationMap` | `crm_customer_addresses.maps_url` | direct |
| `Ticket.locationMap` | `crm_customer_addresses.address` | jika belum ada alamat tekstual, simpan placeholder dan raw map URL |

#### Ke `sales_orders`

| Source | Target | Catatan |
|---|---|---|
| `Ticket.id` | referensi legacy | simpan di staging/import log |
| `Ticket.requestDate` | `sales_orders.request_date` | direct |
| `Ticket.installedDate` | proses ke `service_work_orders.completed_at` / `service_subscriptions.activated_at` | tidak langsung ke order |
| `Ticket.package` | `sales_packages.id` | perlu lookup paket |
| `Ticket.marketingName` | `sales_orders.marketing_name` | direct |
| `Ticket.teknisi` | `sales_orders.teknisi_name` | direct sementara |
| `Ticket.description` | `sales_orders.notes` | direct |
| `Ticket.status` | `sales_orders.status` | perlu normalisasi status |
| `Ticket.priority` | belum phase 1 | bisa jadi field tambahan atau referensi SLA/priority nanti |
| `Ticket.statusOrder` | belum dipakai langsung | bisa dipakai untuk normalisasi state lama |

### 1.4. `Isolation` -> `support_isolations`

| Source | Target | Catatan |
|---|---|---|
| `Isolation.customerName` | `support_isolations.customer_name` | direct |
| `Isolation.customerAddress` | `support_isolations.customer_address` | direct |
| `Isolation.customerPhone` | `support_isolations.customer_phone` | direct |
| `Isolation.marketing` | `support_isolations.marketing_name` | direct |
| `Isolation.radboox` | `support_isolations.radbox_name` | normalisasi nama field |
| `Isolation.price` | `support_isolations.package_price` | direct |
| `Isolation.isolationDate` | `support_isolations.isolation_date` | direct |
| `Isolation.reason` | `support_isolations.reason` | direct |
| `Isolation.status` | `support_isolations.status` | direct, pastikan enum `OPEN/CLOSED` |
| `Isolation.restorationDate` | `support_isolations.restoration_date` | direct |
| `Isolation.closeNote` | `support_isolations.close_note` | direct |
| `Isolation.isArchived` | `support_isolations.is_archived` | direct |
| `Isolation.archivedAt` | `support_isolations.archived_at` | direct |

### 1.5. Dismantle history lama -> `support_dismantle_history`

Sumber utama:

- tabel/flow `dismantle-history`
- snapshot close dari isolir

| Source | Target | Catatan |
|---|---|---|
| snapshot customer name | `support_dismantle_history.customer_name` | direct |
| snapshot address | `support_dismantle_history.customer_address` | direct |
| snapshot phone | `support_dismantle_history.customer_phone` | direct |
| snapshot marketing | `support_dismantle_history.marketing_name` | direct |
| snapshot radboox | `support_dismantle_history.radbox_name` | direct |
| closed timestamp | `support_dismantle_history.closed_at` | direct |
| close notes | `support_dismantle_history.close_note` | direct |
| isolation reference | `support_dismantle_history.isolation_id` | nullable karena histori lama bisa berdiri sendiri |

### 1.6. `TroubleTicket` -> `support_trouble_tickets` + `support_trouble_ticket_photos` + `support_trouble_ticket_sla`

#### Ke `support_trouble_tickets`

| Source | Target | Catatan |
|---|---|---|
| `TroubleTicket.ticketCode` | `support_trouble_tickets.ticket_code` | direct |
| `TroubleTicket.customerName` | `support_trouble_tickets.customer_name` | direct |
| `TroubleTicket.user` | `support_trouble_tickets.customer_user` | direct |
| `TroubleTicket.category` | `support_trouble_tickets.category` | direct |
| `TroubleTicket.type` | `support_trouble_tickets.type` | direct |
| `TroubleTicket.status` | `support_trouble_tickets.status` | normalisasi `OPEN/CLOSE/CLOSED` |
| `TroubleTicket.problemCategory` | `support_trouble_tickets.problem_category` | direct |
| `TroubleTicket.resolutionAction` | `support_trouble_tickets.resolution_action` | direct |
| `TroubleTicket.openedAt` | `support_trouble_tickets.opened_at` | direct |
| `TroubleTicket.closedAt` | `support_trouble_tickets.closed_at` | direct |
| `TroubleTicket.notes` | `support_trouble_tickets.notes` | direct |
| `TroubleTicket.closeNotes` | `support_trouble_tickets.close_notes` | direct |

#### Ke `support_trouble_ticket_photos`

| Source | Target | Catatan |
|---|---|---|
| `TroubleTicket.closePhotos[]` | `support_trouble_ticket_photos.photo_path` | satu row per foto |

#### Ke `support_trouble_ticket_sla`

Sumber:

- `TroubleTicketSla.type`
- `TroubleTicketSla.durationDays`

Mapping:

| Source | Target | Catatan |
|---|---|---|
| `type` | `trouble_type` | direct |
| `durationDays` | `duration_days` | direct |

### 1.7. `CoveredArea` -> belum masuk schema review phase 1

Status:

- penting untuk domain coverage
- belum dibuat tabel khusus pada schema awal

Rekomendasi tabel berikutnya:

- `sales_covered_areas`
- `sales_surveys`

### 1.8. `MarketingActivity` -> belum masuk schema review phase 1

Status:

- dibutuhkan untuk dashboard penjualan
- belum dibuat pada schema awal phase 1

Rekomendasi tabel berikutnya:

- `sales_marketing_activities`

### 1.9. `DigitalLead`, `Campaign`, `ContentCalendar`, `ContentAnalytics`

Status:

- sudah masuk blueprint
- belum masuk schema review awal

Alasan:

- phase 1 difokuskan ke core ISP dan internal control

Rekomendasi domain target:

- `marketing_digital_leads`
- `marketing_campaigns`
- `marketing_campaign_platforms`
- `marketing_content_calendars`
- `marketing_content_tags`
- `marketing_content_analytics`

### 1.10. `ODP` -> `network_odp`

| Source | Target | Catatan |
|---|---|---|
| code / name ODP lama | `network_odp.code` / `network_odp.name` | direct bila tersedia |
| maps/location | `network_odp.location_text`, `latitude`, `longitude` | normalisasi dari source lama |
| jumlah port | `network_odp.total_ports` | direct / hasil import |
| port aktif | `network_odp.active_ports` | hasil kalkulasi atau import |

## 2. Mapping dari `finance-repo`

### 2.1. `Employee` -> `hr_employees`

| Source | Target | Catatan |
|---|---|---|
| `Employee.id` | referensi legacy | simpan di staging bila perlu |
| `Employee.name` | `hr_employees.full_name` | direct |
| `Employee.department` | `org_divisions` / `hr_employees.division_id` | perlu mapping division |
| `Employee.status` | `hr_employees.employment_status` | direct |
| `Employee.joinDate` | `hr_employees.join_date` | direct |
| `Employee.baseSalary` | `hr_employees.base_salary` | direct |
| `Employee.whatsapp` | `hr_employees.whatsapp` | direct |
| `Employee.whatsapp` | `hr_employees.phone` | fallback jika phone belum ada |
| `Employee.role` | `hr_employees.position_name` | sementara bisa dipetakan ke jabatan/level internal |

### 2.2. `Attendance` -> `hr_attendance`

| Source | Target | Catatan |
|---|---|---|
| `Attendance.employeeId` | `hr_attendance.employee_id` | lookup ke employee hasil import |
| `Attendance.date` | `hr_attendance.attendance_date` | direct |
| `Attendance.checkIn` | `hr_attendance.check_in` | direct |
| `Attendance.checkOut` | `hr_attendance.check_out` | direct |
| `Attendance.status` | `hr_attendance.status` | direct |
| `Attendance.overtimeHours` | `hr_attendance.overtime_hours` | direct |
| `Attendance.lockedByAdmin` | `hr_attendance.locked_by_admin` | direct |

### 2.3. `SalarySlip` -> `hr_salary_slips`

| Source | Target | Catatan |
|---|---|---|
| `SalarySlip.employeeId` | `hr_salary_slips.employee_id` | direct via lookup employee |
| `SalarySlip.month` | `hr_salary_slips.payroll_month` | direct |
| `SalarySlip.year` | `hr_salary_slips.payroll_year` | direct |
| `SalarySlip.baseSalary` | `hr_salary_slips.base_salary` | direct |
| `SalarySlip.attendanceAllowance` | `hr_salary_slips.attendance_allowance` | direct |
| `SalarySlip.overtimeAmount` | `hr_salary_slips.overtime_amount` | direct |
| `SalarySlip.performanceBonus` | `hr_salary_slips.performance_bonus` | direct |
| `SalarySlip.positionAllowance` | `hr_salary_slips.position_allowance` | direct |
| `SalarySlip.loanDeduction` | `hr_salary_slips.loan_deduction` | direct |
| `SalarySlip.totalIncome` | `hr_salary_slips.total_income` | direct |
| `SalarySlip.totalDeduction` | `hr_salary_slips.total_deduction` | direct |
| `SalarySlip.netSalary` | `hr_salary_slips.net_salary` | direct |
| `SalarySlip.releaseDate` | `hr_salary_slips.released_at` | direct |

Catatan:

- field rinci insentif marketing dan teknisi belum semuanya ditampung di schema awal
- jika insentif detail ingin dipertahankan, perlu tabel tambahan seperti `hr_salary_components`

### 2.4. `Loan` -> `hr_loans`

| Source | Target | Catatan |
|---|---|---|
| `Loan.employeeId` | `hr_loans.employee_id` | direct via lookup |
| `Loan.type` | `hr_loans.loan_type` | direct |
| `Loan.amount` | `hr_loans.amount` | direct |
| `Loan.monthlyInstallment` | `hr_loans.monthly_installment` | direct |
| `Loan.description` | `hr_loans.description` | direct |
| `Loan.date` | `hr_loans.loan_date` | direct |
| `Loan.status` | `hr_loans.status` | direct |

### 2.5. `LoanPayment`, `LeaveRequest`, `WarningLetter`, `Notification`

Status:

- sudah ada di source
- belum seluruhnya masuk schema review awal

Rekomendasi tabel tambahan:

- `hr_loan_payments`
- `hr_leave_requests`
- `hr_warning_letters`
- `system_notifications`

### 2.6. `User` finance -> `auth_users`

| Source | Target | Catatan |
|---|---|---|
| `User.name` | `auth_users.full_name` | direct |
| `User.email` | `auth_users.email` | direct |
| `User.password` | `auth_users.password_hash` | direct |
| `User.role` | `auth_roles.code` / `auth_users.role_id` | perlu mapping |
| `User.employeeId` | reference ke `hr_employees` | tidak ada field dedicated di schema awal, bisa pakai staging/import table |

## 3. Mapping dari `ga-web-app`

### 3.1. `tbl_jenis` -> `inventory_categories`

| Source | Target | Catatan |
|---|---|---|
| `tbl_jenis.nama_jenis` | `inventory_categories.name` | direct |
| `tbl_jenis.nama_jenis` | `inventory_categories.code` | perlu generate code |

### 3.2. `tbl_satuan` / `satuan` -> `inventory_units`

| Source | Target | Catatan |
|---|---|---|
| `nama_satuan` | `inventory_units.name` | direct |
| `nama_satuan` | `inventory_units.code` | perlu generate code |

### 3.3. `tbl_barang` -> `inventory_items`

| Source | Target | Catatan |
|---|---|---|
| `tbl_barang.kd_barang` | `inventory_items.item_code` | direct |
| `tbl_barang.nama_barang` | `inventory_items.item_name` | direct |
| `tbl_barang.barcode` | `inventory_items.barcode` | direct |
| `tbl_barang.harga` | `inventory_items.default_price` | direct |
| `tbl_barang.stok_minimum` | `inventory_items.minimum_stock` | direct |
| `tbl_barang.stok` | `inventory_items.current_stock` | direct |
| `tbl_barang.foto` | `inventory_items.photo_path` | direct |
| `tbl_barang.id_jenis` | `inventory_categories.id` | lookup category |
| `tbl_barang.id_satuan` | `inventory_units.id` | lookup unit |
| `tbl_barang.is_active` | `inventory_items.status` | normalisasi `1/0` ke `ACTIVE/INACTIVE` |

### 3.4. `tbl_barang_masuk` -> `inventory_stock_movements`

| Source | Target | Catatan |
|---|---|---|
| `tbl_barang_masuk.id_barang` | `inventory_stock_movements.item_id` | lookup item |
| `tbl_barang_masuk.transaksi_id` | `inventory_stock_movements.reference_no` | direct |
| `tbl_barang_masuk.jumlah` | `inventory_stock_movements.qty` | direct |
| `tbl_barang_masuk.keterangan` | `inventory_stock_movements.notes` | direct |
| `tbl_barang_masuk.tanggal` | `inventory_stock_movements.movement_at` | direct |
| `IN` constant | `inventory_stock_movements.movement_type` | fixed transform |

### 3.5. `tbl_barang_keluar` -> `inventory_stock_movements`

| Source | Target | Catatan |
|---|---|---|
| `tbl_barang_keluar.id_barang` | `inventory_stock_movements.item_id` | lookup item |
| `tbl_barang_keluar.transaksi_id` | `inventory_stock_movements.reference_no` | direct |
| `tbl_barang_keluar.jumlah` | `inventory_stock_movements.qty` | direct |
| `tbl_barang_keluar.keterangan` | `inventory_stock_movements.notes` | direct |
| `tbl_barang_keluar.tanggal` | `inventory_stock_movements.movement_at` | direct |
| `OUT` constant | `inventory_stock_movements.movement_type` | fixed transform |
| `tbl_barang_keluar.teknisi` | belum ada field khusus | untuk phase 2 sebaiknya dihubungkan ke work order / assignee |

### 3.6. `users` GA -> `auth_users`

| Source | Target | Catatan |
|---|---|---|
| `users.firstname` | `auth_users.full_name` | direct |
| `users.email` | `auth_users.email` | direct |
| `users.password` | `auth_users.password_hash` | direct |
| `users.level` | `auth_roles.code` / `auth_users.role_id` | perlu mapping admin/operator |
| `users.nohape` | `auth_users.phone` | direct |
| `users.status` | `auth_users.status` | normalisasi `aktif/nonaktif` |

## 4. Transformasi yang Wajib Saat Import

### 4.1. Normalisasi status

Contoh yang harus dinormalisasi:

- `CLOSE`, `CLOSED` -> `CLOSED` atau status target yang setara
- `aktif`, `ACTIVE`, `1` -> `ACTIVE`
- `nonaktif`, `0` -> `INACTIVE`

### 4.2. Normalisasi division dan role

Semua sumber lama harus diarahkan ke master bersama:

- `org_divisions`
- `auth_roles`

Contoh division awal yang perlu distandardkan:

- `PENJUALAN`
- `CS`
- `NOC`
- `CREATOR_DIGITAL`
- `HR_GA`
- `FINANCE`
- `WAREHOUSE`

### 4.3. Generate code

Beberapa tabel target butuh code yang konsisten:

- `crm_customers.customer_code`
- `sales_packages.code`
- `inventory_categories.code`
- `inventory_units.code`

### 4.4. Lookup relasi

Import tidak bisa dilakukan acak. Harus ada urutan agar foreign key aman.

## 5. Urutan Import yang Disarankan

1. `org_branches`
2. `org_divisions`
3. `auth_roles`
4. `auth_permissions`
5. `auth_users`
6. `inventory_categories`
7. `inventory_units`
8. `inventory_items`
9. `crm_customers`
10. `crm_customer_addresses`
11. `sales_packages`
12. `sales_leads`
13. `sales_orders`
14. `service_subscriptions`
15. `service_work_orders`
16. `inventory_stock_movements`
17. `network_odp`
18. `support_trouble_ticket_sla`
19. `support_trouble_tickets`
20. `support_trouble_ticket_photos`
21. `support_isolations`
22. `support_dismantle_history`
23. `hr_employees`
24. `hr_attendance`
25. `hr_salary_slips`
26. `hr_loans`

## 6. Gap yang Masih Terbuka

Field atau modul berikut belum masuk schema review awal dan harus diputuskan pada iterasi berikutnya:

1. coverage area dan survey
2. marketing activities
3. digital marketing suite
4. leave request
5. warning letter
6. loan payment
7. notification
8. ODP port detail
9. device assignment
10. billing dan collection detail

## 7. Output Dokumen Ini

Dokumen ini menjadi dasar untuk:

1. membuat ERD phase 1
2. membuat schema staging/import dari sistem lama
3. menentukan field tambahan yang masih kurang di schema baru
