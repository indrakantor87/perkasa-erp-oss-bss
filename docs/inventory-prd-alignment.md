# Inventory PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `Inventory` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- `/docs/hybrid-wave-1-psb-wave-1a-import-design.md`
- `/docs/staging-import.md`
- `/docs/hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md`

Dokumen ini juga menandai mana yang termasuk:

- `Core PRD`: bagian yang memang diwajibkan oleh PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang tidak bertentangan dengan PRD, tetapi bukan requirement inti awal

## Ringkasan Acuan PRD

### PRD utama

Modul `Inventory` pada PRD utama mencakup:

- item
- stock movement
- ODP/port
- device assignment

Prinsip UI dan alur yang relevan:

- satu shell domain operasional
- toolbar filter dan area konten modular
- write-side hanya tampil sesuai capability role
- operasional harian tetap berada pada website yang sama dengan modul lain

### Katalog fitur web

Katalog fitur Inventory menetapkan area berikut:

- review item: `item`, `category`, `unit`, `current stock`, `minimum stock`
- review movement: `movement qty`, `jenis mutasi`, `harga`, `catatan mutasi`
- review ODP dan port: `ODP`, `port`, `status port`, `maps atau konteks lokasi`
- review assignment: `service`, `work order`, `serial number`, `assignment status`
- review request teknisi: `requester`, `divisi`, `sub-divisi`, `item diminta`, `status request`
- review loan inventory: `borrower`, `divisi`, `sub-divisi`, `due date`, `remaining item`
- form write-side:
  - item master
  - stock movement
  - ODP
  - assign port
  - request status
  - loan create
  - return perangkat
- CTA contextual prefill: query `request` dan `loan`

### Dokumen migrasi ODP

Dokumen migrasi dan staging menegaskan:

- import legacy `psb_odp` masuk ke `staging_legacy_network_odp_records`
- target final header adalah `network_odp`
- `network_odp_ports` tidak diambil langsung dari legacy
- bootstrap port dilakukan native di ERP setelah header tervalidasi
- okupansi awal mengikuti:
  - `kapasitas -> total_ports`
  - `terpakai -> active_ports`

## Alignment Implementasi Saat Ini

### 1. Shell domain Inventory

Status: `Core PRD - aligned`

Sudah tersedia:

- shell domain inventory di `DomainShell`
- panel ODP
- panel request
- panel loan
- panel receipt / movement
- form write-side sesuai capability role

Catatan alignment:

- write-side sudah mengikuti gating role dan mode data source
- area operasional masih berada dalam satu domain `/inventory`

## 2. Review item inventory

Status: `Core PRD - aligned`

Review item terbaru saat ini sudah menampilkan:

- item code
- item name
- category
- unit
- current stock
- minimum stock

Sumber:

- `apps/web/lib/services/domain-service.ts`

## 3. Review stock movement

Status: `Core PRD - aligned`

Review movement saat ini sudah menampilkan:

- qty
- movement type
- harga
- catatan

Sumber:

- `apps/web/lib/services/domain-service.ts`
- `apps/web/components/inventory-stock-receipt-panel.tsx`

## 4. Review ODP dan port

Status: `Core PRD - aligned`

Sudah tersedia:

- daftar ODP
- indikator kapasitas
- peta lokasi
- status dan konteks port
- route mode dan kontrol visual peta

Catatan:

- implementasi peta memakai Leaflet + OpenStreetMap, sejalan dengan keputusan operasional biaya
- ini tetap kompatibel dengan PRD karena PRD hanya mensyaratkan `maps atau konteks lokasi`, bukan vendor peta tertentu

## 5. Review request teknisi

Status: `Core PRD - aligned`

Sudah tersedia:

- requester / requested for
- division / subdivision
- item diminta
- status request

Sumber:

- `apps/web/components/inventory-request-ops-panel.tsx`
- `apps/web/lib/services/domain-service.ts`

## 6. Review loan inventory

Status: `Core PRD - aligned`

Sudah tersedia:

- borrower
- division
- subdivision
- due date
- remaining item

Sumber:

- `apps/web/components/inventory-loan-ops-panel.tsx`
- `apps/web/lib/services/domain-service.ts`

## 7. Form write-side inventory

Status: `Core PRD - aligned`

Sudah tersedia form:

- item master
- stock movement
- ODP create
- assign port
- request status
- loan create
- return perangkat

Catatan:

- gating write-side mengikuti capability dan `review-db ready`
- ini sesuai arahan PRD bahwa form dan CTA harus tersembunyi bila capability role tidak memenuhi

## 8. CTA contextual prefill

Status: `Core PRD - aligned`

PRD / katalog fitur meminta contextual prefill untuk query:

- `request`
- `loan`

Implementasi saat ini sudah mengikuti pola tersebut di domain inventory.

## 9. Barcode item inventory

Status: `Operational Extension - allowed`

Fitur barcode bukan requirement eksplisit pada PRD utama maupun katalog fitur. Namun fitur ini tidak bertentangan dengan PRD karena:

- tidak mengubah skema inti item inventory
- tidak mengubah alur request / loan / movement
- hanya mempercepat pemilihan item dan generate label operasional

Scope implementasi yang sudah terverifikasi di kode:

- panel `Barcode Inventory` tampil di domain `/inventory`
- generate PNG untuk:
  - QR Code
  - Code128
- isi barcode memakai relative path `/inventory?itemCode=...`
- item dapat digenerate dari daftar item terbaru maupun input manual kode item
- field `barcode` pada form create item tetap dipakai untuk barcode vendor / serial asli, bukan barcode operasional ERP

Guardrail alignment:

- barcode memakai relative URL `/inventory?itemCode=...`
- scan mengarah kembali ke domain inventory yang sama
- scan hanya menjadi layer input, bukan sumber kebenaran data
- validasi final tetap dilakukan oleh API berdasarkan `item_code`

Keputusan alignment:

- barcode diperlakukan sebagai `Operational Extension`
- bukan pengganti field `barcode` vendor / serial pada item master

## 10. Prefill dari barcode scan

Status: `Operational Extension - allowed`

PRD hanya mewajibkan contextual prefill untuk `request` dan `loan`. Implementasi sekarang menambah query `itemCode` untuk:

- request
- receipt
- loan
- stock movement

Scope input yang sudah terverifikasi:

- scan assist scanner USB / input manual tersedia pada:
  - loan
  - stock movement
- scan kamera berbasis `BarcodeDetector` tersedia pada:
  - loan
  - stock movement
- query `itemCode` dari barcode atau URL relative diparsing di shell inventory lalu diprefill ke:
  - request
  - receipt
  - loan
  - stock movement

Ini diterima sebagai extension karena:

- tidak merusak prefill inti `request` dan `loan`
- tetap menjaga satu alur kerja di `/inventory`
- membuat scan barcode benar-benar operasional, bukan sekadar demo

Guardrail:

- `itemCode` tidak boleh menggantikan prefill entitas lain seperti `request` atau `loan`
- `itemCode` hanya boleh dipakai untuk memilih item target

## 11. Import Excel ODP langsung dari modul Inventory

Status: `Operational Extension - constrained`

PRD migrasi legacy ODP menegaskan jalur utama migrasi adalah:

- legacy -> staging -> review -> transform -> final

Sedangkan fitur `Import Excel ODP` di modul Inventory saat ini adalah write-side operasional langsung ke `network_odp`.

Agar tidak bertentangan dengan PRD, fitur ini diposisikan sebagai:

- jalur operasional internal untuk entry / bootstrap ODP baru
- bukan pengganti jalur migrasi legacy wave

Guardrail wajib:

- hanya aktif untuk role yang punya capability create
- hanya aktif saat `review-db` benar-benar tersedia
- dibatasi file size dan jumlah row
- tidak boleh dipakai untuk mengklaim jalur migrasi legacy sudah mengikuti staging

## 12. Bootstrap port ODP

Status: `Core PRD - aligned`

Implementasi create ODP saat ini:

- membuat header `network_odp`
- set `active_ports = 0`
- generate `network_odp_ports` status `AVAILABLE` bila dipilih

Ini konsisten dengan runbook ODP karena:

- port tidak diimpor satu per satu dari legacy
- port dibootstrap native di ERP

## Area yang Masih Harus Dijaga

### A. Jangan campur jalur migrasi dan jalur operasional

- migrasi legacy ODP tetap lewat staging/import center
- entry ODP baru secara harian boleh lewat write-side inventory

### B. Jangan jadikan barcode sebagai primary identity baru

- primary identity item tetap `item_code`
- barcode operasional hanya representasi / shortcut

### C. Jangan batasi scan ke daftar 5 item terbaru

- scan boleh membaca kode item di luar daftar review terbaru
- validasi tetap dilakukan lewat API

### D. Jangan tampilkan CTA write-side ke role yang tidak berhak

- semua tombol create/import harus ikut capability matrix

## Keputusan Final

### Sudah selaras dengan PRD

- shell inventory
- review item
- review movement
- review ODP/port
- review request
- review loan
- form write-side utama
- gating role dan `review-db`
- bootstrap port native ERP

### Diterima sebagai extension operasional

- barcode inventory
- scan USB / kamera
- query `itemCode` untuk prefill item
- import Excel ODP langsung dari modul inventory

### Batas extension

- tidak boleh mengganti alur migrasi staging
- tidak boleh mengubah sumber kebenaran item selain `item_code`
- tidak boleh melewati permission gating
