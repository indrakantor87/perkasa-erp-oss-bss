# Spesifikasi Implementasi List Kerja Terpadu

## Tujuan

Dokumen ini adalah spesifikasi implementasi untuk membangun modul `List Kerja Terpadu` sebagai route
`/dashboard/worklist` di ERP.

Fokus spesifikasi ini:

1. menurunkan PRD menjadi bentuk implementasi yang dapat langsung dikerjakan pada codebase
2. menjaga konsistensi dengan fondasi fase awal Divisi `Pemasaran dan Pelayanan`
3. memastikan `capability-based rendering` dan `contextual prefill` tetap menjadi pola wajib

Dokumen ini melengkapi:

1. [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
2. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
3. [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)

## Scope Fase Implementasi

Fase awal modul ini harus melayani role di bawah payung `Pemasaran dan Pelayanan`:

1. `SALES_MARKETING`
2. `CS_OPERATOR`
3. `CS_ADMIN`
4. `NOC_OPERATOR`
5. `TT_OPERATOR`
6. `DISMANTLE_OPERATOR`
7. `SUPER_ADMIN` sebagai mode observasi

Catatan:

1. `DIGITAL_CREATOR` tidak wajib masuk tahap implementasi awal modul ini karena suite creator digital belum hidup
2. `FIELD_TECHNICIAN` berada pada tahap integrasi divisi berikutnya

## Output Implementasi Minimum (MVP)

MVP dianggap selesai bila:

1. route `/dashboard/worklist` bisa dibuka oleh role fase awal
2. dashboard panel `List Kerja Terpadu` memiliki tombol `lihat semua` menuju route ini dengan filter yang konsisten
3. modul menampilkan daftar item kerja lintas domain yang sudah tersedia di dataset dashboard saat ini
4. filter berbasis query parameter bekerja dan bisa dibagikan melalui URL
5. setiap item memiliki CTA `Buka modul` yang membawa user ke domain terkait
6. CTA write-side mengikuti `capability-based rendering`

## Lokasi Implementasi yang Disarankan

### Route

- `apps/web/app/(app)/dashboard/worklist/page.tsx`

### Service layer

Tambahkan service baru agar modul tidak menambah kompleksitas pada `dashboard-service.ts`:

- `apps/web/lib/services/worklist-service.ts`

### UI components

Komponen UI disarankan dipisah agar reusable:

- `apps/web/components/worklist/worklist-header.tsx`
- `apps/web/components/worklist/worklist-filters.tsx`
- `apps/web/components/worklist/worklist-tabs.tsx`
- `apps/web/components/worklist/worklist-table.tsx`
- `apps/web/components/worklist/worklist-detail-panel.tsx`

Catatan:

1. styling mengikuti pola `panel`, `badge`, dan grid yang sudah dipakai dashboard
2. `WorklistBoard` pada dashboard tetap dipertahankan sebagai ringkasan

## Kontrak Data

### Kontrak saat ini (dashboard)

Tipe yang sudah ada:

- `DashboardWorkItem` di `apps/web/lib/types.ts`

Struktur ringkas:

1. `id`
2. `domain`
3. `title`
4. `subtitle`
5. `status`
6. `priority`
7. `detail`
8. `href`

### Kontrak baru (worklist module)

Tambahkan tipe baru sebagai superset:

- `WorklistItem`

Struktur minimal fase awal:

1. `id`
2. `domain`
3. `queue` (wajib)
4. `title`
5. `subtitle`
6. `status`
7. `priority`
8. `detail`
9. `href`
10. `actionLabel`

Struktur opsional untuk fase berikutnya:

1. `reason`
2. `dueLabel`
3. `owner`
4. `nextAction`
5. `blockingInfo`
6. `prefillToken`

Aturan:

1. fase awal boleh mengisi `queue` dari mapping deterministik berbasis role dan domain
2. item dari dashboard harus bisa di-upgrade menjadi `WorklistItem` tanpa mengubah query lama

## Query Parameter

Route `/dashboard/worklist` wajib menerima query parameter berikut:

1. `queue` = tab queue aktif
2. `domain` = filter domain (`Sales`, `Customers`, `Support`, `Inventory`, `Import`)
3. `priority` = `tinggi|sedang|rendah`
4. `status` = string status domain
5. `q` = keyword customer atau kode (ticket/work order/lead)
6. `mine` = `1|0` (hanya item saya)
7. `overdue` = `1|0` (hanya item overdue)

Aturan:

1. seluruh filter harus bersifat idempotent dan dapat dibagikan via URL
2. jika query param tidak valid, fallback ke default role
3. `SUPER_ADMIN` boleh melihat semua queue, role lain dikunci ke default queue role

## Tab Queue

### Default queue per role

Default queue yang dipakai saat query `queue` kosong:

1. `SALES_MARKETING` -> `Lead Follow Up`
2. `CS_OPERATOR` -> `Input dan Follow Up`
3. `CS_ADMIN` -> `Queue CS Tim`
4. `NOC_OPERATOR` -> `TT Teknis`
5. `TT_OPERATOR` -> `Ticket Baru`
6. `DISMANTLE_OPERATOR` -> `Siap Dismantle`
7. `SUPER_ADMIN` -> `All`

### Mapping awal queue dari dataset dashboard

Karena dataset `DashboardWorkItem` belum memiliki `queue`, fase awal harus memetakan `queue` dari kombinasi:

1. `role`
2. `domain`
3. `status`
4. prefix `id` (contoh: `lead-`, `wo-`, `iso-`, `dismantle-`)

Contoh mapping:

1. `lead-*` -> `Lead Follow Up`
2. `wo-*` -> `Order dan Aktivasi`
3. `iso-*` -> `Isolir dan Dismantle`
4. `ticketCode` atau `Support` dengan status belum close -> `Ticket Baru`
5. `dismantle-*` -> `Siap Dismantle`
6. `batch-*` -> `Import Review`

Aturan:

1. mapping harus eksplisit, bukan hasil parsing bebas
2. jika item tidak cocok mapping, masukkan ke queue `Lainnya`

## UI dan Interaksi

### Layout

Halaman `/dashboard/worklist` dibagi menjadi:

1. header konteks role
2. filter global
3. tab queue
4. tabel daftar item
5. panel detail item terpilih

### Tabel daftar item

Kolom fase awal:

1. `priority`
2. `domain`
3. `queue`
4. `title`
5. `subtitle`
6. `status`
7. `detail`
8. `aksi`

Aturan:

1. desktop memakai tabel padat
2. mobile memakai card stack
3. klik row memilih item dan membuka panel detail
4. tombol `Buka modul` membuka `href` pada item

### Panel detail

Panel detail fase awal menampilkan:

1. identitas item (domain, status, priority)
2. judul + subtitle
3. detail ringkas
4. CTA utama: `Buka modul`

Panel detail fase berikutnya menambahkan:

1. `nextAction` dan `blockingInfo`
2. informasi prefill yang akan dikirim
3. CTA pendukung

## Permission dan Capability

Aturan rendering:

1. semua role boleh melihat item yang termasuk scope queue mereka
2. CTA write-side hanya tampil jika `canPerformAction(role, resource, action)` true
3. `SUPER_ADMIN` selalu boleh mengakses modul dan membaca seluruh queue, tetapi tetap mengikuti guard untuk aksi write bila implementasi memerlukan pembatasan khusus

Mapping resource/action disarankan mengikuti domain:

1. `Sales` -> `sales_lead`, `sales_order`, `work_order`
2. `Customers` -> `customer`
3. `Support` -> `trouble_ticket`, `isolation`, `dismantle`
4. `Inventory` -> `inventory_odp`, `inventory_port`

## Contextual Prefill

Fase awal minimal:

1. item `href` tetap membawa user ke modul domain (contoh: `/sales`, `/support`)
2. prefill boleh kosong jika target form belum punya entry point yang cocok

Fase berikutnya wajib:

1. setiap item memiliki `prefillToken` agar klik CTA mengisi form target otomatis
2. query param mengikuti kontrak `DomainFormPrefill` yang sudah dipakai di domain shell
3. parsing prefill wajib type-safe agar tidak memunculkan error TypeScript pada form

## Integrasi dengan Dashboard

Perubahan pada dashboard:

1. panel `WorklistBoard` menambahkan CTA `Lihat semua`
2. CTA membuka `/dashboard/worklist` dengan parameter yang sesuai role (minimal `queue` default)

Aturan:

1. item yang tampil di dashboard dan di worklist module berasal dari dataset yang sama pada fase awal
2. setelah service worklist matang, dashboard tetap mengambil subset 2-5 item teratas dari service worklist agar konsisten

## Rencana Implementasi Bertahap

### Tahap 1 (MVP)

1. tambah route `/dashboard/worklist`
2. bangun `worklist-service` yang meng-upgrade `DashboardWorkItem` menjadi `WorklistItem`
3. tambah filter query parameter dan tab queue dasar
4. integrasikan tombol `Lihat semua` dari dashboard

### Tahap 2 (Queue presisi)

1. ganti mapping heuristik dengan query lintas domain per queue
2. tambah `reason`, `owner`, `dueLabel`, `nextAction`, `blockingInfo`
3. tambah CTA pendukung dan prefill token

### Tahap 3 (Worklist sebagai pusat kerja)

1. gunakan worklist sebagai sumber tunggal ringkasan dashboard
2. tambah sidebar menu `List Kerja` untuk role fase awal
3. tambah bulk triage dan supervisor review untuk `CS_ADMIN`

## Dampak ke UAT

Checklist UAT yang terdampak:

1. `SALES_MARKETING` -> validasi `List Kerja` sebagai pengganti ruang kerja harian
2. `CS_OPERATOR` -> validasi queue lintas domain di satu layar
3. `CS_ADMIN` -> validasi tab supervisor dan approval

Acuan UAT:

- [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)

## Versioning

Dokumen ini dirilis pada:

- `0.64.40` untuk spesifikasi implementasi route `/dashboard/worklist`
