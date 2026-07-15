# Support and Sales PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `Support` dan `Sales` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- `/docs/web-list-kerja-terpadu-prd.md`
- `/docs/web-list-kerja-terpadu-implementation-spec.md`

Dokumen ini membedakan:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang mendukung kerja lapangan/CS, tetapi bukan requirement inti awal

## Ringkasan Acuan PRD

### PRD utama

PRD utama menetapkan:

- `Sales` sebagai shell operasional untuk lead, coverage, order, survey, dan status order
- `Support` sebagai shell operasional untuk trouble ticket, isolir, dismantle history, dan SLA ringkas
- seluruh modul berada di satu shell aplikasi
- form, CTA, dan approval hanya tampil bila role memiliki capability yang sesuai

### Katalog fitur web

#### Sales

Katalog fitur menetapkan area:

- shell domain
- aksi prioritas sesuai capability
- review lead
- review coverage
- review survey
- review sales order
- review work order
- review aktivasi
- contextual prefill dengan query `lead` dan `order`

#### Support

Katalog fitur menetapkan area:

- shell domain
- queue TT utama
- kolom SLA
- kolom ownership
- kolom closure
- lane operasional
- CTA role-aware
- form write-side:
  - create TT
  - update progress
  - eskalasi
  - close
  - isolir aktif
  - restorasi isolir
  - dismantle history

### PRD List Kerja Terpadu

PRD `List Kerja Terpadu` menambahkan constraint penting untuk Sales dan Support:

- queue harus actionable
- contextual prefill wajib dipertahankan
- role read-only tetap bisa membaca, tetapi tidak boleh melihat CTA write-side
- queue per role harus eksplisit
- klik item harus membawa user ke domain atau lane yang tepat

## Alignment Modul Sales

### 1. Shell domain Sales

Status: `Core PRD - aligned`

Implementasi Sales saat ini sudah memakai shell domain khusus yang:

- menampilkan header domain dan highlights
- memetakan section review menjadi aksi prioritas
- memisahkan area quick action dari review list

Sumber:

- `apps/web/components/sales-domain-workspace.tsx`

### 2. Aksi prioritas dan CTA contextual

Status: `Core PRD - aligned`

Implementasi saat ini:

- membaca section review
- memetakan action per section
- membangun href berbasis query parameter dan anchor form

Contoh action yang sudah ada:

- `Tambah Lead`
- `Input Coverage`
- `Jadwalkan Survey`
- `Buat Order`
- `Buat Work Order`
- `Aktivasi Subscription`

Keputusan alignment:

- ini selaras dengan requirement `aksi prioritas` pada katalog fitur
- ini juga selaras dengan rule `contextual prefill` untuk `lead` dan `order`

### 3. Review lead, coverage, survey, order, work order, aktivasi

Status: `Core PRD - aligned`

Implementasi review di Sales saat ini sudah menutupi area PRD:

- lead
- coverage
- survey
- order
- work order
- activation / subscription

Catatan:

- data review dipetakan menjadi row operasional yang dapat langsung ditindak
- status tone dan action berbeda mengikuti section dan row status

### 4. Quick action modal pada Sales

Status: `Operational Extension - allowed`

Implementasi saat ini menambah `TableQuickActionModal` untuk row Sales.

Ini tidak tertulis eksplisit pada PRD, tetapi tidak bertentangan karena:

- tetap memakai capability-based rendering
- tetap mengarahkan ke form/domain yang sama
- hanya mempersingkat interaksi operator

Guardrail:

- modal tidak boleh menggantikan validasi server-side
- modal tidak boleh mem-bypass query prefill inti

### 5. KPI drilldown dan month/year context

Status: `Operational Extension - allowed`

Implementasi Sales sudah menerima:

- `focus`
- `month`
- `year`

untuk menyelaraskan kartu KPI dengan daftar row yang dibuka.

Ini konsisten dengan prinsip dashboard PRD dan spesifikasi worklist karena:

- link tetap dapat dibagikan via query parameter
- filter periode tetap deterministik

### 6. Kesimpulan alignment Sales

#### Sudah selaras core PRD

- shell domain sales
- review lead/coverage/survey/order/work order/aktivasi
- capability-based action
- contextual prefill `lead` dan `order`

#### Diterima sebagai extension operasional

- quick action modal
- KPI drilldown period-aware

## Alignment Modul Support

### 1. Shell domain Support

Status: `Core PRD - aligned`

Implementasi support saat ini memecah domain menjadi lane operasional:

- `tt`
- `isolations`
- `dismantle`
- `sla`

Ini konsisten dengan katalog fitur yang memang mensyaratkan:

- queue TT utama
- lane operasional
- CTA role-aware

### 2. Lane operasional dan role-aware access

Status: `Core PRD - aligned`

Implementasi saat ini:

- lane yang bisa dibuka mengikuti role
- action yang bisa dipakai mengikuti capability create/update/approve
- fallback href pada worklist juga menjaga lane yang aman per role

Sumber:

- `apps/web/lib/support-lanes.ts`
- `apps/web/lib/services/worklist-service.ts`

### 3. CTA role-aware

Status: `Core PRD - aligned`

CTA support yang sekarang sudah selaras dengan PRD:

- update progress
- eskalasi
- close
- restore isolir
- action dismantle
- SLA management

Rule penting yang sudah berjalan:

- CTA dicek lagi saat parsing worklist href
- role yang tidak berhak tidak boleh membuka CTA hash support

### 4. Form write-side Support

Status: `Core PRD - aligned`

Form yang sudah tersedia:

- create ticket
- progress ticket
- eskalasi ticket
- close ticket
- isolir
- restore isolir
- dismantle approve / close / reopen
- SLA form

Ini sesuai dengan requirement katalog fitur untuk write-side support.

### 5. Popup action / modal support

Status: `Operational Extension - allowed`

Implementasi `SupportActionFormModal` memindahkan pola aksi dari scroll panel bawah menjadi popup/modal.

Ini tidak tertulis eksplisit di PRD, tetapi masih sejalan karena:

- tidak mengubah alur bisnis
- tidak mengubah capability matrix
- justru meningkatkan sifat `actionable` yang diminta PRD worklist

Guardrail:

- hash action tetap harus stabil
- modal hanya pembungkus UI, bukan logic baru terpisah

### 6. Trouble Ticket board ala operasional CS

Status: `Operational Extension - allowed`

Implementasi TT sekarang bergerak ke pola board yang lebih mudah dibaca operasional, termasuk:

- ringkasan status
- recurring ticket detection
- SLA state
- prioritas queue
- close label
- export Excel

Ini tidak ada sebagai requirement eksplisit dalam PRD utama, tetapi tetap kompatibel karena:

- kolom PRD tetap tercakup: nomor ticket, SLA, ownership, closure
- tambahan hanya memperjelas cara baca operasional

### 7. Export TT Excel

Status: `Operational Extension - constrained`

Export TT ke Excel memakai `xlsx` sebagai extension operasional.

Keputusan alignment:

- boleh dipakai sebagai alat kerja harian
- bukan requirement inti PRD awal
- harus mengikuti constraint keamanan dependency dan role access

### 8. Support dalam konteks Worklist

Status: `Core PRD - aligned`

Support sudah tersambung baik dengan `List Kerja Terpadu` karena:

- queue per role sudah ada
- fallback href per lane sudah eksplisit
- CTA label disesuaikan per role

Contoh:

- `TT_OPERATOR` -> `Update ticket`
- `NOC_OPERATOR` -> `Kontrol SLA` / `Monitor isolir`
- `DISMANTLE_OPERATOR` -> `Buka dismantle`

Ini selaras dengan PRD worklist yang meminta queue per role dan CTA actionable.

### 9. Kesimpulan alignment Support

#### Sudah selaras core PRD

- shell support
- lane operasional
- CTA role-aware
- write-side support
- queue dan fallback worklist
- SLA / ownership / closure context

#### Diterima sebagai extension operasional

- popup action modal
- TT board ala grup CS
- recurring ticket badge
- export Excel TT

## Guardrail Lanjutan

### Sales

- prefill utama tetap hanya memakai token domain resmi seperti `lead` dan `order`
- quick action tidak boleh membuat flow baru di luar form resmi
- KPI drilldown harus tetap deterministik via query parameter

### Support

- semua action hash support harus tetap bisa dipetakan ke capability role
- modal popup tidak boleh menjadi satu-satunya jalan logic; submit tetap ke API/domain service yang sama
- extension TT board tidak boleh menghapus kolom inti PRD: SLA, ownership, closure

### Worklist lintas domain

- Sales dan Support harus tetap bisa dibuka dari worklist dengan link yang stabil
- queue mapping per role harus tetap eksplisit, bukan heuristik bebas
- role read-only tetap bisa baca queue, tetapi tidak boleh mendapat CTA write-side

## Keputusan Final

### Sales

- `Core PRD` sudah selaras
- quick action dan drilldown period-aware diterima sebagai extension operasional

### Support

- `Core PRD` sudah selaras
- modal action dan TT board operasional diterima sebagai extension operasional

### Prinsip umum

- extension UI boleh ditambah selama:
  - tidak melanggar capability matrix
  - tidak membuat flow bisnis paralel
  - tetap membawa user ke form/lane yang benar
  - tetap kompatibel dengan worklist dan query parameter resmi

