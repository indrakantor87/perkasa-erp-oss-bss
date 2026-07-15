# Import Center PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi `Import Center` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- prinsip pemisahan tegas antara jalur `migrasi/review staging` dan jalur `operasional harian`

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang tetap sejalan dengan PRD
- `Operational Constraint`: batas implementasi yang masih dapat diterima untuk fase saat ini

## Ringkasan Acuan PRD

### PRD utama

PRD utama menetapkan Import Center sebagai:

- pusat upload batch
- review staging
- mapping
- validasi
- transform per tahap
- detail row staging

Halaman yang ditekankan PRD:

- daftar batch
- pipeline transform
- halaman detail batch
- filter dan review row

### Katalog fitur web

Katalog fitur menetapkan area:

- tabel batch: batch, source, status, total row, valid row, detail
- form create batch: source system, file sumber, catatan batch
- detail batch: valid row, invalid/skipped, finalisasi batch, kesehatan batch, target final terbentuk
- action panel: status batch, rekomendasi langkah berikutnya, validasi batch, transform tahap 01-04
- row review: legacy id, normalized key, status, target, catatan
- filter row review: status row, domain row
- upload source: file upload, status lock batch, catatan review non-destruktif
- histori batch: histori aksi, histori transform run, hasil transform

## Alignment Implementasi Saat Ini

### 1. Daftar batch import

Status: `Core PRD - aligned`

Import Center saat ini sudah menampilkan daftar batch dengan elemen inti PRD:

- batch code
- source system
- scope
- status
- total rows
- valid rows
- invalid rows
- duplicate rows
- detail batch

Data diambil dari:

- `staging_import_batches`

Dengan fallback mock bila review DB tidak tersedia, tetapi write-side hanya aktif pada review DB nyata.

Sumber:

- `apps/web/lib/services/import-service.ts`
- `apps/web/components/import-batch-table.tsx`

### 2. Form create batch

Status: `Core PRD - aligned`

Form create batch saat ini sudah mencakup:

- source system
- import scope
- source file name
- notes

Guardrail inti:

- batch code dibuat otomatis
- create hanya aktif bila role punya capability `create`
- create hanya aktif saat `review-db` benar-benar tersedia

Ini sesuai dengan PRD dan rule review database.

Sumber:

- `apps/web/components/import-batch-create-form.tsx`
- `apps/web/app/api/import/batches/route.ts`

### 3. Upload source file

Status: `Core PRD - aligned`

Upload source file saat ini sudah sesuai requirement:

- lampir file sumber ke batch
- parser memuat row staging sesuai scope
- menulis metadata file sumber
- memperbarui batch menjadi `UPLOADED`

Guardrail penting:

- format file dibatasi ke `xlsx`, `xls`, `csv`, `json`
- ukuran maksimal 10MB
- upload terkunci bila batch sudah punya row staging / source file
- alur dibuat non-destruktif: revisi file harus masuk ke batch baru, bukan menimpa batch lama

Ini sangat selaras dengan PRD dan juga dengan lesson learned proyek.

Sumber:

- `apps/web/components/import-batch-upload-form.tsx`
- `apps/web/app/api/import/batches/[id]/route.ts`

### 4. Detail batch

Status: `Core PRD - aligned`

Detail batch saat ini sudah menampilkan area yang diminta PRD:

- status batch
- valid / invalid / skipped / imported
- progres finalisasi
- kesehatan batch
- target final terbentuk
- file sumber
- upload source
- action panel
- row review
- histori aksi
- histori transform run

Sumber:

- `apps/web/components/import-batch-detail-view.tsx`

### 5. Row review dan filter

Status: `Core PRD - aligned`

Row review saat ini sudah mendukung:

- legacy id
- normalized key
- status
- target
- catatan
- filter status
- filter domain
- query pencarian

Domain row sudah dipetakan ke:

- USER
- CUSTOMER
- SALES
- SUPPORT
- BILLING
- INVENTORY
- HR
- OTHER

Ini sesuai dengan requirement PRD untuk filter dan review row bermasalah.

Catatan kejujuran implementasi:

- UI secara eksplisit menyatakan bahwa tabel ini hanya menampilkan sampel row terbaru yang dimuat di halaman detail, bukan seluruh isi batch

Sumber:

- `apps/web/components/import-batch-row-review.tsx`

### 6. Validasi batch

Status: `Core PRD - aligned`

Validasi batch saat ini sudah berjalan sebagai action resmi:

- memeriksa rule per tabel staging
- mengubah row menjadi `VALID` atau `INVALID`
- memperbarui statistik batch
- mencatat hasil validasi

Rule validasi sudah mencakup area staging:

- user
- customer
- order
- support
- billing invoice/item/payment/collection
- inventory item/movement
- employee/attendance/salary/loan

Ini sesuai dengan PRD yang menempatkan validasi sebagai gate sebelum transform.

Sumber:

- `apps/web/components/import-batch-action-panel.tsx`
- `apps/web/app/api/import/batches/[id]/validate/route.ts`
- `apps/web/lib/services/import-write-service.ts`

### 7. Transform tahap 01-04

Status: `Core PRD - aligned`

Transform per tahap yang diminta PRD sudah tersedia:

- `01`: foundation, inventory, HR dasar
- `02`: customer, address, order, subscription
- `03`: work order dan support
- `04`: billing, payment, collection

Guardrail inti:

- hanya role dengan capability `approve` yang bisa menjalankan
- hanya aktif saat review DB nyata
- stage divalidasi lewat allowlist resmi
- eksekusi berjalan melalui baseline SQL stage files

Sumber:

- `apps/web/components/import-batch-action-panel.tsx`
- `apps/web/components/import-transform-stage-list.tsx`
- `apps/web/app/api/import/batches/[id]/transform/route.ts`
- `apps/web/lib/services/import-write-service.ts`

### 8. Rekomendasi langkah berikutnya

Status: `Operational Extension - allowed`

Action panel saat ini menambahkan guidance otomatis:

- validasi dulu
- review error terakhir
- batch sudah final
- tahap disarankan berdasarkan unresolved rows dan domain tersisa

Ini tidak tertulis eksplisit di PRD, tetapi sangat sejalan dengan semangat review operasional dan mengurangi kebingungan operator.

### 9. Histori aksi dan histori transform run

Status: `Core PRD - aligned`

PRD meminta histori batch dan histori transform.

Implementasi saat ini sudah memiliki audit trail yang jelas:

- `staging_import_batch_actions`
- `staging_import_batch_transform_runs`

Yang dicatat:

- CREATE
- UPLOAD
- VALIDATE
- TRANSFORM
- actor
- status
- detail
- durasi
- jumlah statement
- error text

Ini sangat selaras dengan kebutuhan audit dan recovery.

Sumber:

- `apps/web/lib/services/import-write-service.ts`
- `apps/web/components/import-batch-detail-view.tsx`

## Operational Constraint Saat Ini

### 1. Row review hanya sampel terbaru di UI

Status: `Operational Constraint - acceptable`

Shell detail batch belum menjadi explorer penuh semua row staging.

Yang tampil di UI:

- sampel row terbaru yang dimuat server
- filter hanya berlaku pada sampel yang sedang tampil

Ini masih dapat diterima untuk fase sekarang karena:

- UI sudah jujur menyatakannya
- audit mendalam tetap bisa dilakukan via query SQL saat dibutuhkan

Guardrail:

- jangan mengklaim filter UI sebagai pencarian penuh seluruh batch
- untuk investigasi final, SQL tetap menjadi jalur audit yang sah

### 2. Create batch dan upload masih review-db only

Status: `Operational Constraint - intentional`

Semua write-side Import Center hanya aktif di `review-db` nyata.

Ini bukan kekurangan, tetapi keputusan desain penting agar:

- mock/fallback tidak menerima write operasional palsu
- review migrasi tetap terkendali

### 3. Upload source terkunci setelah batch berisi row

Status: `Operational Constraint - intentional`

Ini adalah pembatasan yang sengaja dibuat untuk menjaga non-destruktif review.

Operator harus:

- membuat batch baru untuk revisi file
- bukan menimpa batch lama

Keputusan ini justru selaras dengan PRD dan histori audit proyek.

## Guardrail Lanjutan untuk Import Center

### A. Import Center harus tetap dipisah dari operasional harian

- modul ini untuk staging, review, validasi, dan transform
- jangan memindahkan write-side operasional domain ke Import Center

### B. Batch dan row harus tetap auditable

- histori aksi dan transform run tidak boleh dihilangkan
- error dan durasi run harus tetap bisa ditinjau

### C. Transform stage harus tetap formal

- stage 01-04 tetap menjadi stage resmi
- UX tambahan tidak boleh membuat stage informal di luar pipeline

### D. Non-destruktif review harus dipertahankan

- upload ulang ke batch yang sama tetap harus dilarang saat batch sudah berisi row
- revisi file harus masuk ke batch baru

## Keputusan Final

### Sudah selaras core PRD

- daftar batch
- form create batch
- upload source file
- detail batch
- row review
- filter row review
- validasi batch
- transform tahap 01-04
- histori batch
- histori transform run
- capability-based write-side
- review-db only write

### Diterima sebagai extension operasional

- rekomendasi langkah berikutnya di action panel

### Constraint yang masih bisa diterima

- row review UI masih sampel terbaru
- write-side sengaja hanya aktif di review DB
- upload batch dikunci setelah row ada untuk menjaga non-destruktif review

### Tidak ada konflik PRD yang terdeteksi

- Import Center saat ini sangat konsisten dengan PRD
- modul ini juga sudah menjaga garis pemisah yang sehat antara migrasi data dan operasional domain harian

