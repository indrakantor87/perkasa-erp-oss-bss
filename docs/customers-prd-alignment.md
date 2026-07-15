# Customers PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `Customers` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- prinsip integrasi lintas domain Sales, Support, dan Billing pada shell ERP yang sama

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Constraint`: batasan implementasi saat ini yang masih valid secara PRD, tetapi belum selengkap target akhir

## Ringkasan Acuan PRD

### PRD utama

PRD utama menempatkan modul `Customer` sebagai:

- shell customer
- master customer
- address
- subscription
- histori layanan

Customer juga menjadi penghubung inti bagi:

- `Sales`
- `Support`
- `Billing`

### Katalog fitur web

Katalog fitur menetapkan area:

- shell domain: header, highlights, alur customer master, integrasi dengan Sales, Support, Billing
- review customer: `customer code`, `nama customer`, `tipe customer`, `phone`, `email`
- review layanan: `alamat utama`, `service`, `harga`, `status activated`
- form utama: create customer, address utama, konteks subscription awal
- CTA dan mode akses: create/update hanya untuk role yang memiliki capability, role lain tidak melihat form

## Alignment Implementasi Saat Ini

### 1. Shell domain Customers

Status: `Core PRD - aligned`

Implementasi shell Customers saat ini sudah:

- tampil sebagai domain resmi `/customers`
- berada dalam shell ERP yang sama
- diberi narasi integrasi ke Sales, Support, dan Billing melalui `DomainShell`

Catatan:

- domain ini memang diposisikan sebagai master customer tunggal untuk seluruh lifecycle layanan
- integrasi naratif antar domain sudah ditulis langsung di shell domain

Sumber:

- `apps/web/components/domain-shell.tsx`

### 2. Review customer

Status: `Core PRD - aligned`

Review customer yang tersedia saat ini sudah mencakup kolom inti PRD:

- `customer code`
- `nama customer`
- `customer type`
- `phone`
- `email`
- `alamat utama`

Implementasi saat ini mengambil:

- `crm_customers`
- `crm_customer_addresses` dengan `is_primary = 1`

Sumber:

- `apps/web/lib/services/domain-service.ts`

### 3. Review layanan / subscription

Status: `Core PRD - aligned`

Review layanan saat ini sudah menampilkan:

- `service`
- `customer`
- `package`
- `harga bulanan`
- `status layanan`
- `activated at`

Implementasi memakai:

- `service_subscriptions`
- join ke `crm_customers`
- join ke `sales_packages`

Ini sesuai dengan requirement PRD untuk review layanan dan hubungan customer ke layanan aktif.

### 4. Form utama create customer

Status: `Core PRD - aligned`

Form write-side yang tersedia saat ini sudah mencakup:

- create customer
- identity number
- phone
- email
- alamat utama
- label alamat
- maps URL

Form ini membuat:

- record `crm_customers`
- record `crm_customer_addresses` utama

Catatan alignment:

- ini sudah memenuhi requirement minimum `create customer` + `address utama`
- wording form juga sudah jujur bahwa ini adalah `customer review`

Sumber:

- `apps/web/components/customer-create-form.tsx`
- `apps/web/app/api/customers/route.ts`

### 5. CTA dan mode akses

Status: `Core PRD - aligned`

PRD meminta:

- create/update hanya untuk role yang memiliki capability
- role lain tidak melihat form write-side

Implementasi saat ini sudah mematuhi rule itu:

- form create hanya aktif bila `canCreate`
- write hanya aktif saat `review-db` benar-benar tersedia
- API melakukan pengecekan session dan permission lagi di server

Ini konsisten dengan capability-based rendering yang diwajibkan PRD.

### 6. Integrasi ke Sales, Support, Billing

Status: `Core PRD - aligned`

Secara konsep dan data, Customers sudah berada pada posisi penghubung domain:

- `Sales` membentuk customer setelah flow order tervalidasi
- `Support` membaca customer dan service yang sama untuk TT/isolir/dismantle
- `Billing` membaca customer dan subscription yang sama untuk invoice dan collection

Implementasi shell sudah menegaskan relasi ini di domain narrative.

Keputusan alignment:

- walau UI Customers saat ini belum sekompleks Sales/Support/Inventory, posisi domain sebagai master lintas lifecycle sudah benar

## Operational Constraint Saat Ini

### 1. Form belum mencakup subscription awal secara langsung

Status: `Operational Constraint - acceptable`

Katalog fitur menyebut `konteks subscription awal`.

Implementasi saat ini baru mencakup:

- customer master
- alamat utama

Belum mencakup langsung:

- pembuatan subscription awal di form customer

Ini masih dapat diterima karena:

- subscription aktif sudah direview di domain Customers
- flow pembentukan subscription utama saat ini tetap datang dari Sales / aktivasi

Guardrail:

- jangan memaksakan form customer menjadi form aktivasi sales
- bila nanti ditambah konteks subscription awal, harus tetap jelas perannya sebagai bridge, bukan duplikasi flow Sales

### 2. Review customer dan subscription masih berbasis sample terbaru

Status: `Operational Constraint - acceptable`

Saat ini section Customers menampilkan sample terbaru dengan `LIMIT 5`.

Ini masih cocok untuk mode review cepat domain shell, tetapi belum menjadi eksplorasi penuh semua customer.

Guardrail:

- shell domain boleh tetap ringkas
- bila dibutuhkan mode operasional besar, tambahkan filter/list penuh tanpa mengorbankan pola review cepat

### 3. Belum ada extension operasional besar seperti modal quick action

Status: `No conflict`

Berbeda dengan Support dan Inventory, domain Customers saat ini masih relatif konservatif.

Ini bukan kekurangan terhadap PRD, karena:

- requirement inti sudah tercakup
- belum ada extension yang berisiko menyalahi flow domain

## Guardrail Lanjutan untuk Customers

### A. Customers harus tetap menjadi master domain

- sumber kebenaran customer tetap `crm_customers`
- alamat utama tetap di `crm_customer_addresses`
- layanan aktif tetap dibaca dari `service_subscriptions`

### B. Jangan campur flow create customer dan flow sales activation

- create customer boleh tetap sederhana
- aktivasi layanan dan order tetap berada pada domain Sales

### C. Support dan Billing harus membaca customer yang sama

- jangan membuat identitas customer alternatif di domain lain
- linking customer-service harus tetap konsisten lintas Support dan Billing

### D. Capability matrix harus tetap ketat

- role read-only tetap boleh melihat customer dan layanan
- role tanpa capability create tidak boleh melihat atau memakai write-side

## Keputusan Final

### Sudah selaras core PRD

- shell Customers
- review customer
- review layanan aktif
- create customer + address utama
- capability-based access
- posisi domain sebagai penghubung Sales, Support, Billing

### Masih dalam constraint yang bisa diterima

- form belum langsung membentuk subscription awal
- review domain masih sample terbaru, belum list penuh

### Tidak ada konflik PRD yang terdeteksi

- implementasi Customers saat ini cenderung sederhana, tetapi tetap konsisten dengan PRD
- modul ini aman dijadikan pondasi untuk audit lanjutan Billing dan Support karena customer master yang dipakai sudah tunggal

