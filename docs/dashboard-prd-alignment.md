# Dashboard PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi `Dashboard` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- PRD dan spesifikasi `List Kerja Terpadu`

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang tetap sejalan dengan PRD
- `Operational Constraint`: batas implementasi yang masih dapat diterima untuk fase saat ini

## Ringkasan Acuan PRD

### PRD utama

PRD utama menetapkan Dashboard sebagai:

- ringkasan KPI lintas domain
- shortcut modul
- status operasional harian

Dashboard juga harus menjadi pintu masuk ke:

- modul operasional
- list kerja
- approval
- audit

### Katalog fitur web

Katalog fitur Dashboard menetapkan area:

- KPI, alert silang domain, tindakan berikutnya, approval, shortcut, audit
- kartu performa per sub-divisi
- KPI proses per domain dengan `focus` drilldown
- shortcut modul
- histori aktivitas / audit terbaru
- filter bulan, tahun, divisi
- pembatasan scope sesuai role

PRD `List Kerja Terpadu` menambahkan prinsip:

- dashboard adalah ringkasan
- worklist adalah ruang kerja lintas domain yang actionable
- link dari dashboard ke modul harus stabil dan deterministik

## Alignment Implementasi Saat Ini

### 1. Dashboard sebagai ringkasan masuk kerja

Status: `Core PRD - aligned`

Dashboard saat ini jelas diposisikan sebagai `ringkasan masuk kerja`, bukan pengganti workspace domain.

Ini terlihat dari:

- command center dengan role aktif, scope, queue aktif, item kerja, shortcut modul, approval pending
- narasi UI yang langsung mendorong user masuk ke worklist atau modul inti

Sumber:

- `apps/web/components/dashboard/dashboard-command-center.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`

### 2. KPI lintas domain

Status: `Core PRD - aligned`

Dashboard saat ini sudah menampilkan KPI lintas domain inti PRD:

- customer
- order
- trouble ticket
- isolir
- inventory
- attendance
- overdue billing

KPI diposisikan sebagai `angka cepat lintas domain`, bukan pengganti tabel kerja.

Sumber:

- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/lib/services/dashboard-service.ts`

### 3. Shortcut modul

Status: `Core PRD - aligned`

Shortcut modul sudah berjalan sesuai PRD:

- modul yang terlihat mengikuti role aktif
- shortcut menjadi pintu singkat dari dashboard ke domain resmi
- quick links command center juga role-aware

Ini selaras dengan requirement `shortcut modul` dan `akses sesuai role`.

Sumber:

- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/components/dashboard/dashboard-command-center.tsx`
- `apps/web/components/dashboard/module-grid.tsx`

### 4. Worklist sebagai pusat tindak lanjut

Status: `Core PRD - aligned`

Dashboard tidak berhenti di level KPI. Ia menurunkan konteks ke:

- `WorklistBoard` pada dashboard
- halaman penuh `/dashboard/worklist`

Worklist saat ini sudah:

- role-aware
- punya filter query deterministik
- punya fallback href aman
- melakukan sanitasi href, label, owner, dan teks agar tidak bocor lintas role

Ini sangat selaras dengan PRD `List Kerja Terpadu`.

Sumber:

- `apps/web/components/dashboard/worklist-board.tsx`
- `apps/web/app/(app)/dashboard/worklist/page.tsx`
- `apps/web/lib/services/worklist-service.ts`

### 5. Tindakan berikutnya

Status: `Core PRD - aligned`

Panel `Tindakan Berikutnya` saat ini merangkum:

- alert silang domain
- worklist
- role queue

Menjadi aksi prioritas yang bisa langsung dibuka ke modul terkait.

Ini sesuai dengan requirement `tindakan berikutnya` dan membuat dashboard benar-benar operasional.

Sumber:

- `apps/web/components/dashboard/dashboard-next-actions.tsx`
- `apps/web/lib/services/dashboard-service.ts`

### 6. Alert silang domain

Status: `Core PRD - aligned`

Dashboard saat ini memiliki panel `Alert Silang Domain` yang menampilkan:

- severity
- domain sumber
- affected modules
- impact summary
- next step
- CTA ke modul tujuan

Ini sangat sesuai dengan katalog fitur dashboard yang menekankan alert silang domain.

Sumber:

- `apps/web/components/dashboard/cross-domain-alerts.tsx`

### 7. Approval queue

Status: `Core PRD - aligned`

Dashboard saat ini sudah memuat approval queue untuk daily activity:

- pending approval
- approve / reject
- bulk approve / bulk reject
- catatan reject

Ini sesuai requirement dashboard untuk approval dan membantu ritme closing harian.

Sumber:

- `apps/web/components/dashboard/daily-activity-approval-queue.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`

### 8. Kartu operasional per sub-divisi

Status: `Core PRD - aligned`

Katalog fitur meminta dashboard operasional per sub-divisi.

Implementasi saat ini sudah memiliki:

- operational division board
- role queue grid
- kartu operasional per sub-divisi
- pembatasan division sesuai role non-super-admin

Sumber:

- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/lib/services/dashboard-service.ts`

### 9. KPI proses dengan drilldown `focus`

Status: `Core PRD - aligned`

Panel `KPI Proses` saat ini sudah:

- memecah ringkasan sub-divisi menjadi metrik detail
- mengubah metrik menjadi link drilldown ke modul resmi
- menambahkan `month` dan `year` ke URL
- memakai token `focus` yang deterministik

Contoh:

- `/support/tt?focus=OPEN_TICKETS`
- `/billing?focus=OVERDUE_INVOICES`
- `/inventory?focus=PENDING_REQUESTS`
- `/hr?focus=TODAY_ATTENDANCE`

Ini sangat selaras dengan rule global PRD tentang query deterministik dan modul resmi.

Sumber:

- `apps/web/components/dashboard/dashboard-process-kpis.tsx`

### 10. Audit / activity feed

Status: `Core PRD - aligned`

Dashboard saat ini juga menampilkan activity feed dan mengonsumsi audit lintas area:

- import actions
- HR audits
- permission audits
- role-permission audits
- auth user audits

Ini sesuai dengan requirement `histori aktivitas / audit terbaru`.

Sumber:

- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/lib/services/dashboard-service.ts`

### 11. KPI manager panel

Status: `Operational Extension - allowed`

Dashboard saat ini punya `KPI Manager Panel` untuk mengelola definisi KPI custom.

Ini tidak disebut eksplisit di PRD utama, tetapi tetap selaras karena:

- scope management mengikuti `managerScope`
- super admin dapat memilih division/subdivision
- role biasa terkunci pada scope sendiri
- write-side hanya aktif saat `review-db` nyata

Sumber:

- `apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx`
- `apps/web/app/api/dashboard/kpi-definitions/route.ts`

## Operational Constraint Saat Ini

### 1. Dashboard tetap ringkasan, bukan explorer penuh

Status: `Operational Constraint - intentional`

Dashboard sengaja tidak berusaha menjadi listing penuh semua domain.

Ini justru sesuai PRD:

- dashboard = ringkasan lintas domain
- worklist / modul domain = ruang tindak lanjut detail

### 2. Approval yang diangkat ke dashboard baru fokus daily activity

Status: `Operational Constraint - acceptable`

Saat ini approval queue yang paling formal di dashboard adalah daily activity.

Ini masih bisa diterima karena:

- requirement approval sudah terpenuhi
- approval domain lain masih diwakili oleh alert, next action, atau jalur domain masing-masing

### 3. KPI manager masih review-db only

Status: `Operational Constraint - intentional`

Pengelolaan KPI dashboard saat ini hanya aktif di review DB nyata.

Ini aman dan konsisten dengan guardrail write-side lain.

## Guardrail Lanjutan untuk Dashboard

### A. Dashboard harus tetap menuju modul resmi

- shortcut, action, dan drilldown harus tetap menuju `/sales`, `/support`, `/inventory`, `/hr`, `/billing`, `/customers`, `/import`, `/dashboard`
- jangan membuat workspace paralel tersembunyi

### B. Query harus tetap deterministik

- `month`, `year`, `division`, `focus`, dan query worklist lain harus tetap eksplisit di URL
- jangan mengandalkan state tersembunyi untuk drilldown utama

### C. Sanitasi role harus tetap ketat

- href, action hash, owner label, dan teks sensitif harus tetap disaring sesuai role
- dashboard tidak boleh menjadi titik kebocoran konteks lintas domain

### D. Dashboard tidak boleh menggantikan worklist

- dashboard memberi ringkasan dan prioritas
- worklist tetap menjadi tabel kerja lintas domain

## Keputusan Final

### Sudah selaras core PRD

- dashboard sebagai ringkasan platform
- KPI lintas domain
- shortcut modul
- worklist board dan halaman worklist
- tindakan berikutnya
- alert silang domain
- approval queue
- kartu operasional per sub-divisi
- KPI proses dengan drilldown `focus`
- activity feed / audit terbaru
- role-aware division locking

### Diterima sebagai extension operasional

- KPI manager panel

### Constraint yang masih bisa diterima

- dashboard tetap ringkasan, bukan explorer penuh
- approval formal di dashboard saat ini paling menonjol pada daily activity
- KPI manager hanya aktif di review DB

### Tidak ada konflik PRD yang terdeteksi

- implementasi Dashboard saat ini sangat konsisten dengan PRD utama dan PRD `List Kerja Terpadu`
- guardrail paling penting yang sudah berjalan baik adalah role-aware sanitization dan penggunaan URL drilldown yang deterministik

