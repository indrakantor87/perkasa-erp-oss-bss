# ERP PRD Alignment Master

## Tujuan

Dokumen ini menjadi acuan pusat untuk menyelaraskan implementasi web ERP dengan PRD dan dokumen turunan yang aktif di repo.

Dokumen ini merangkum:

- rule global dari PRD utama
- status alignment per modul
- extension operasional yang diperbolehkan
- guardrail lintas modul
- modul yang masih pending audit detail

Dokumen ini melengkapi:

- [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md)
- [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md)
- [inventory-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/inventory-prd-alignment.md)
- [support-sales-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/support-sales-prd-alignment.md)
- [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
- [web-list-kerja-terpadu-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-implementation-spec.md)

## Rule Global PRD

### 1. Satu shell aplikasi

ERP harus tetap berjalan sebagai:

- satu website
- satu shell navigasi
- modul operasional lintas domain yang saling terhubung

Artinya:

- extension UI tidak boleh membentuk aplikasi paralel
- seluruh flow utama tetap kembali ke domain resmi seperti `/sales`, `/support`, `/inventory`, `/billing`, `/hr`, `/customers`, `/import`, `/dashboard`

### 2. Capability-based rendering

PRD mewajibkan:

- role read-only tetap bisa membaca konteks
- form, CTA, approval, dan action write-side hanya tampil bila role memiliki capability yang sesuai

Artinya:

- semua extension operasional wajib tunduk pada capability matrix
- quick action, popup, export, dan import tidak boleh mem-bypass permission

### 3. Query parameter harus deterministik

PRD dan spesifikasi worklist mewajibkan:

- contextual prefill tetap stabil
- filter dapat dibagikan melalui URL
- queue / focus / period tidak boleh bergantung pada state tersembunyi

Artinya:

- query seperti `lead`, `order`, `request`, `loan`, `invoice`, `service`, `attendance`, `employee`, `payroll`, `itemCode` harus tetap diperlakukan sebagai token terkontrol

### 4. Worklist dan dashboard tetap menjadi pusat konteks

PRD utama dan PRD `List Kerja Terpadu` menegaskan:

- dashboard adalah ringkasan lintas domain
- worklist adalah ruang kerja lintas domain yang actionable

Artinya:

- domain tetap boleh punya UX yang makin operasional
- tetapi link dari dashboard/worklist ke domain harus tetap stabil dan dapat dijelaskan

### 5. Pisahkan migrasi data dan operasional harian

PRD membedakan:

- jalur `batch -> staging -> mapping -> transform -> review`
- jalur operasional harian via domain modul

Artinya:

- fitur operasional tidak boleh diam-diam menggantikan flow migrasi resmi
- import operasional internal harus diberi guardrail yang jelas

## Status Alignment Per Modul

### Dashboard

Status: `Reviewed`

Rujukan detail:

- [dashboard-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/dashboard-prd-alignment.md)

Kesimpulan:

- dashboard sebagai ringkasan KPI lintas domain, shortcut modul, worklist, next action, alert silang domain, approval queue, dan KPI proses sudah selaras
- KPI manager diterima sebagai extension operasional yang tetap tunduk pada scope manager dan review-db only

### Import Center

Status: `Reviewed`

Rujukan detail:

- [import-center-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/import-center-prd-alignment.md)

Kesimpulan:

- daftar batch, create batch, upload source, detail batch, row review, validasi, transform tahap 01-04, dan histori batch sudah selaras
- guardrail paling penting tetap terjaga: write-side review-db only, upload non-destruktif, dan audit trail action/transform run

### Sales

Status: `Reviewed`

Rujukan detail:

- [support-sales-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/support-sales-prd-alignment.md)

Kesimpulan:

- shell sales, review inti, action priority, capability-based CTA, dan contextual prefill sudah selaras
- quick action modal dan KPI drilldown diterima sebagai extension operasional

### Customers

Status: `Reviewed`

Rujukan detail:

- [customers-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/customers-prd-alignment.md)

Kesimpulan:

- shell customers, review customer/subscription, form create customer + address utama, dan capability-based access sudah selaras
- constraint yang masih ada bersifat wajar: form belum langsung membentuk subscription awal dan review shell masih sample terbaru

### Support

Status: `Reviewed`

Rujukan detail:

- [support-sales-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/support-sales-prd-alignment.md)

Kesimpulan:

- shell support, lane operasional, CTA role-aware, write-side support, dan integrasi worklist sudah selaras
- popup action modal, TT board ala operasional CS, recurring badge, dan export TT diterima sebagai extension operasional

### Inventory

Status: `Reviewed`

Rujukan detail:

- [inventory-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/inventory-prd-alignment.md)

Kesimpulan:

- shell inventory, review inti, ODP/port, request, loan, write-side utama, dan gating role sudah selaras
- barcode/scan, prefill `itemCode`, dan import Excel ODP operasional diterima sebagai extension dengan constraint

### HR

Status: `Reviewed`

Rujukan detail:

- [hr-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hr-prd-alignment.md)

Kesimpulan:

- shell HR, review employee/attendance/face/loan/payroll, write-side utama, dan contextual prefill sudah selaras
- guardrail paling penting adalah kejujuran positioning face attendance: saat ini masih fondasi capture/review, belum recognition engine penuh

### Billing

Status: `Reviewed`

Rujukan detail:

- [billing-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/billing-prd-alignment.md)

Kesimpulan:

- shell billing, review invoice/collection/suspend-reconnect, write-side invoice/payment/collection/status, dan contextual prefill sudah selaras
- quick action dan panel aksi prioritas diterima sebagai extension operasional yang tetap tunduk pada capability matrix

### Akses

Status: `Reviewed`

Rujukan detail:

- [access-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/access-prd-alignment.md)

Kesimpulan:

- ringkasan role aktif
- matrix permission
- permission master
- assign role-permission
- audit perubahan permission
- dynamic permission tetap dijaga dengan capability guard, review-db gating, audit log, dan invalidasi cache akses

### User Internal

Status: `Reviewed`

Rujukan detail:

- [user-internal-prd-alignment.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/user-internal-prd-alignment.md)

Kesimpulan:

- ringkasan user
- tabel user
- form user
- audit user
- panel profil daily activity
- create/edit/reset/deactivate-reactivate via status dan mapping profil daily activity sudah selaras dengan guard `user_settings` dan `review-db`

## Extension Operasional Yang Diterima

Extension berikut diterima selama tetap mematuhi guardrail PRD:

- quick action modal pada tabel domain
- popup form/action untuk support
- TT board yang lebih mudah dipindai operasional
- KPI drilldown berbasis query parameter
- barcode dan scan inventory
- relative-path barcode untuk kembali ke domain resmi
- import operasional internal yang dibatasi role, mode, dan ukuran input

## Extension Yang Harus Tetap Dibatasi

Extension berikut boleh ada, tetapi harus dijaga ketat:

- import Excel ODP langsung dari Inventory
- export berbasis `xlsx`
- scan kamera browser
- shortcut prefill tambahan seperti `itemCode`

Batasnya:

- tidak mengganti flow migrasi resmi
- tidak mengubah sumber kebenaran utama domain
- tidak boleh mem-bypass capability matrix
- tetap dapat dijelaskan oleh query parameter yang stabil

## Guardrail Lintas Modul

### 1. Jangan ubah sumber kebenaran inti

- Sales tetap bertumpu pada entitas lead/order/work order/subscription
- Support tetap bertumpu pada ticket/isolation/dismantle/SLA
- Inventory tetap bertumpu pada item code, request, loan, movement, ODP
- Billing tetap bertumpu pada invoice/service/follow-up resmi

### 2. Jangan buat action liar di luar lane atau form resmi

- modal hanya pembungkus UX
- submit, validasi, dan write tetap harus masuk ke endpoint atau service resmi

### 3. Jaga konsistensi URL

- query prefill harus eksplisit
- hash action harus stabil
- link dari worklist/dashboard tidak boleh rapuh

### 4. Role non-admin tidak boleh mendapatkan konteks yang bukan haknya

- teks, link, CTA, dan export tetap harus mengikuti akses role
- fallback href harus aman per role

### 5. UI operasional boleh makin “task-first”, tetapi logika tetap harus resmi

- tampilan tabel-first
- toolbar rapat
- popup action
- board kerja

semuanya boleh, selama tidak mengubah rule domain inti

## Prioritas Audit Lanjutan

Urutan yang disarankan setelah batch ini:

1. `Tidak ada audit governance yang tertinggal pada batch ini`

Alasan:

- `Customers`, `Billing`, `HR`, `Import Center`, `Dashboard`, `Akses`, dan `User Internal` sudah memiliki audit detail
- batch audit governance inti untuk settings sekarang sudah lengkap

## Keputusan Final

### Sudah terdokumentasi alignment detail

- `Sales`
- `Support`
- `Inventory`
- `Customers`
- `Billing`
- `HR`
- `Import Center`
- `Dashboard`
- `Akses`
- `User Internal`

### Sudah diketahui scope PRD, tetapi belum diaudit detail

- tidak ada

### Prinsip pusat yang harus dipertahankan

- satu shell ERP
- capability-based rendering
- contextual prefill yang deterministik
- pemisahan migrasi vs operasional
- worklist/dashboard sebagai konteks lintas domain
- extension UI boleh, tetapi tidak boleh melanggar rule domain inti
