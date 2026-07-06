# Roadmap Phase 1

## Target Phase 1

Menyatukan alur inti operasional ISP ke satu sistem review yang bisa diuji di XAMPP.

## Modul Prioritas

1. Auth, role, division, permission
2. Customer master
3. Package dan product
4. Lead dan registration
5. Sales order
6. Work order teknisi
7. Inventory item dan stock movement
8. ODP dan port registry
9. Trouble ticket
10. Isolir
11. Dismantle history
12. Employee master
13. Attendance
14. Payroll dasar
15. Dashboard ringkas

## Urutan Pengerjaan

### Sprint 1 - Foundation

- user
- role
- division
- branch
- permission
- audit log

### Sprint 2 - Customer & Sales

- customer
- address
- package
- lead
- sales order
- survey / coverage
- patch schema phase 1.1 untuk coverage dan survey

### Sprint 3 - Delivery & Support

- work order
- inventory issue
- ODP
- ODP port registry
- device assignment
- trouble ticket
- isolir
- dismantle history

### Sprint 3.5 - Billing & Collection

- invoice
- payment
- collection action
- overdue control

### Sprint 4 - HR & Internal

- employee
- attendance
- leave
- payroll period
- salary slip
- loan

### Sprint 4.5 - Staging Import

- import batch registry
- staging user
- staging customer dan order
- staging support
- staging inventory
- staging HR

### Sprint 4.6 - Master Mapping

- mapping role legacy ke role master
- mapping division legacy ke division master
- mapping branch legacy ke branch master
- mapping package legacy ke package master
- mapping status legacy ke status target

### Sprint 4.7 - Sample Import Review

- seed awal master mapping
- sample batch web psb
- sample batch inventory
- sample batch HR
- validasi hasil mapping di staging

### Sprint 4.8 - Transform Tahap 1

- transform inventory item ke final
- transform inventory movement ke final
- transform employee ke final
- transform attendance ke final
- transform salary slip ke final
- transform loan ke final

### Sprint 4.9 - Transform Tahap 2

- transform customer ke final
- transform customer address ke final
- transform sales order ke final
- transform subscription ke final

### Sprint 4.10 - Transform Tahap 3

- transform work order ke final
- transform trouble ticket ke final
- transform isolation ke final
- transform dismantle history ke final
- siapkan tahap staging billing sebagai kelanjutan

### Sprint 4.11 - Transform Tahap 4

- staging billing
- transform invoice ke final
- transform invoice item ke final
- transform payment ke final
- transform collection action ke final

### Sprint 5 - Reporting

- dashboard penjualan
- dashboard CS
- dashboard NOC
- dashboard inventory
- dashboard HR

### Sprint 5.1 - Bootstrap Aplikasi Web Utama

- shell login dan dashboard utama
- shell import center dan detail batch
- shell domain sales, customer, support, inventory, HR, dan billing
- route handler mock untuk dashboard dan import
- fondasi layout tunggal desktop-first yang tetap aman untuk mobile web dan Android wrapper

## Output Minimum Review

Sistem review dianggap siap bila sudah bisa menunjukkan:

1. lead sampai aktivasi
2. trouble ticket sampai close
3. isolir dan dismantle history
4. stok masuk, keluar, dan pemakaian ke work order
5. attendance sampai salary slip dasar
6. invoice, payment, dan collection dasar

## Risiko yang Perlu Dijaga

1. tabel terlalu mengikuti sistem lama
2. auth dan permission dibuat terpisah per domain
3. histori tercampur dengan data aktif
4. inventory tidak terhubung ke work order
5. KPI dashboard tidak sinkron dengan data detail
