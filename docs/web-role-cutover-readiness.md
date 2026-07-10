# Matriks Readiness Cutover Per Role

## Tujuan

Dokumen ini melanjutkan PRD dan inventaris web dengan fokus yang lebih operasional:

1. menilai kesiapan cutover per role/divisi berdasarkan implementasi web yang hidup saat ini
2. memisahkan role yang sudah cukup kuat untuk pilot dari role yang masih `partial` atau `no-go`
3. merangkum blocker paling penting agar urutan pengerjaan parity lebih presisi

Dokumen ini melengkapi:

1. [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md)
2. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
3. [web-psb-module-gap-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-module-gap-plan.md)
4. [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md)

## Keputusan Dasar Fase Awal

Cutover awal ERP dipusatkan terlebih dahulu pada Divisi `Pemasaran dan Pelayanan` sebagai payung
operasional dari `web-psb-perkasa`.

Fase ini memprioritaskan:

1. `SALES_MARKETING`
2. `CS_OPERATOR`
3. `CS_ADMIN`
4. `NOC_OPERATOR`
5. `TT_OPERATOR`
6. `DIGITAL_CREATOR`
7. `DISMANTLE_OPERATOR`

Sedangkan divisi lain diperlakukan sebagai integrasi tahap berikutnya, termasuk role
`FIELD_TECHNICIAN`.

## Cara Baca Status

Status readiness yang dipakai:

1. `GO` = role sudah bisa dipindah penuh tanpa bergantung pada web lama untuk flow utama
2. `PILOT` = role sudah cukup kuat untuk uji terbatas atau cutover bertahap, tetapi masih ada gap yang harus diawasi
3. `PARTIAL` = role sudah punya fondasi dan beberapa flow utama, tetapi masih ada gap besar untuk operasi harian
4. `NO-GO` = role belum layak cutover karena flow penting belum ada atau perspektif role belum cukup presisi

## Prinsip Penilaian

Satu role dinilai dari 5 lapisan:

1. sidebar dan menu yang terlihat sudah sesuai perspektif role
2. data baca yang tampil sudah sesuai divisi/sub-divisi
3. tombol, form, dan CTA write-side sudah mengikuti capability role
4. flow harian bisa selesai tanpa kembali ke web lama
5. blocker terbesar role tersebut sudah cukup kecil untuk ditangani saat operasional berjalan

## Ringkasan Portofolio Role

| Role | Divisi | Menu Utama | Kekuatan Saat Ini | Blocker Utama | Readiness | Gelombang Disarankan |
|---|---|---|---|---|---|---|
| `SUPER_ADMIN` | Lintas Divisi | dashboard, daily activity, import, seluruh domain, settings | akses lintas modul paling lengkap, settings hidup, import center hidup | audit lintas semua write action belum 100% merata | `PILOT` | Gelombang 0 |
| `SALES_MARKETING` | Pemasaran dan Pelayanan / Penjualan | dashboard, daily activity, sales, customers, monitoring support dan inventory | flow lead dan onboarding awal sudah hidup, ditopang `List Kerja` lintas lead/customer/coverage/order | parity `marketing-activities`, ritme campaign harian, dan bukti UAT lapangan marketing belum lengkap | `PARTIAL` | Gelombang 2 |
| `CS_OPERATOR` | Pemasaran dan Pelayanan / CS | dashboard, daily activity, sales, customers, support, inventory | bisa bekerja lintas sales-support-inventory untuk operasi dasar dan kini punya `List Kerja` operator | UAT end-to-end lintas domain, presisi triage, dan pembuktian ritme kerja harian masih perlu diperdalam | `PARTIAL` | Gelombang 2 |
| `CS_ADMIN` | Pemasaran dan Pelayanan / Admin CS | dashboard, daily activity, sales, customers, support, inventory | approval daily activity, queue koreksi, restore, dan backlog risiko supervisor sudah mulai nyata | bukti UAT untuk koreksi supervisor, keputusan restore/transfer, dan audit aksi berisiko masih perlu diperdalam | `PARTIAL` | Gelombang 2 |
| `NOC_OPERATOR` | Pemasaran dan Pelayanan / NOC | dashboard, daily activity, support, inventory | support TT teknis dan inventory/ODP sudah paling dekat ke parity teknis di dalam rumpun Pemasaran dan Pelayanan | pembeda yang lebih tajam dari teknisi lapangan masih perlu dirapikan | `PILOT` | Gelombang 1 |
| `FIELD_TECHNICIAN` | Teknis dan Expan | dashboard, daily activity, inventory, support | update lapangan, request barang, dan queue teknis dasar sudah ada | masih berada di luar fokus fondasi fase awal karena integrasi divisi Teknis dan Expan baru dilakukan setelah Pemasaran dan Pelayanan stabil | `PARTIAL` | Integrasi Lanjutan |
| `TT_OPERATOR` | Pemasaran dan Pelayanan / Troubleshoots | dashboard, daily activity, support | domain sempit TT sudah nyata dan CTA support cukup matang | guard role mikro dan flow close/eskalasi masih harus divalidasi UAT | `PILOT` | Gelombang 1 |
| `DIGITAL_CREATOR` | Pemasaran dan Pelayanan / Creator Digital | dashboard, daily activity, sales | workspace awal creator di dashboard dan `List Kerja` sudah ada untuk lead/order/survey digital | content calendar, campaigns, write-side creator, dan analytics parity masih belum hidup sebagai suite penuh | `NO-GO` | Gelombang 3 |
| `DISMANTLE_OPERATOR` | Pemasaran dan Pelayanan / Dismantle | dashboard, daily activity, support | flow dismantle dasar dan guard mikro-role di support sudah lebih presisi | UAT queue khusus dismantle, finalisasi close, dan bukti role-sempit masih perlu dipertegas | `PARTIAL` | Gelombang 2 |

## Detail Per Role

### `SUPER_ADMIN`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | seluruh menu utama dan pengaturan sudah terlihat | kuat |
| write-side | create/update/approve/manage lintas domain sudah tersedia | kuat |
| monitoring | dashboard, audit, import, settings sudah hidup | kuat |
| blocker | audit write action belum 100% seragam di semua modul | sedang |
| keputusan | layak jadi role kontrol utama untuk pilot lintas domain | `PILOT` |

Catatan:

1. role ini paling siap untuk memimpin tahap validasi operasional
2. sebelum `GO` penuh, audit terpusat lintas domain masih sebaiknya diperluas

### `SALES_MARKETING`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | `sales` dan `customers` aktif, `support` dan `inventory` sudah bisa dibaca | kuat |
| write-side | lead, coverage, survey, order, work order, aktivasi awal sudah ada | kuat |
| perspektif data | dashboard sudah terkunci ke divisi role | kuat |
| blocker | parity `marketing-activities`, ritme campaign harian, dan bukti UAT lapangan marketing masih belum lengkap | sedang |
| keputusan | fondasi kerja harian membaik berkat `List Kerja`, tetapi belum cukup untuk pilot bisnis penuh | `PARTIAL` |

Catatan:

1. role ini sudah punya ruang kerja awal yang lebih menyatu lewat `List Kerja`
2. kenaikan status berikutnya bergantung pada parity aktivitas marketing harian dan bukti UAT lapangan

### `CS_OPERATOR`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | `sales`, `customers`, `support`, dan `inventory` sudah tersedia | kuat |
| write-side | create/update dasar pada sales, support, dan inventory sudah hidup | kuat |
| perspektif data | role-aware rendering dan divisi default sudah berjalan | kuat |
| blocker | UAT end-to-end lintas domain dan pembuktian ritme kerja operator masih perlu diperdalam | sedang |
| keputusan | fondasi bagus dan workspace sudah lebih menyatu, tetapi belum cukup kuat untuk pilot tanpa UAT peran yang rapi | `PARTIAL` |

Catatan:

1. role ini sudah menjadi penerima manfaat utama `List Kerja Terpadu`
2. fokus berikutnya bukan lagi membangun layar, tetapi membuktikan bahwa ritme kerja operator benar-benar selesai dari workspace tersebut

### `CS_ADMIN`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | menu lintas sales-customers-support-inventory sudah tersedia | kuat |
| write-side | approval, koreksi, restore, dan keputusan backlog risiko sudah mulai nyata | sedang |
| perspektif data | dashboard supervisor, queue `Perlu Approval`, `Perlu Koreksi`, `Transfer atau Restore`, dan `Queue Risiko Tinggi` sudah tampak | kuat |
| blocker | audit dan bukti UAT untuk aksi supervisor berisiko masih perlu diperdalam | sedang |
| keputusan | cukup kuat sebagai supervisor awal, tetapi belum layak pilot bisnis tanpa bukti UAT yang lebih tegas | `PARTIAL` |

Catatan:

1. secara struktur role ini kini sudah terasa sebagai supervisor, bukan sekadar operator senior
2. kekurangannya ada pada pembuktian UAT flow administratif berisiko tinggi, bukan pada ketersediaan queue dasar

### `NOC_OPERATOR`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | `support` dan `inventory` sudah fokus dan bersih dari domain yang tidak relevan | kuat |
| write-side | update TT teknis, ODP, port, dan ekspor dasar sudah ada | kuat |
| perspektif data | dashboard dan domain teknis sudah cukup sesuai role | kuat |
| blocker | pemisahan tegas terhadap scope teknisi lapangan belum sepenuhnya matang | sedang |
| keputusan | role paling dekat ke pilot operasional teknis | `PILOT` |

Catatan:

1. role ini cocok menjadi salah satu pilot awal bersama teknisi dan TT operator
2. UAT perlu memastikan queue NOC tidak bercampur terlalu jauh dengan queue teknisi

### `FIELD_TECHNICIAN`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | fokus ke `inventory` dan `support` sudah sesuai kerja lapangan | kuat |
| write-side | request inventory, update teknis, dan tindak lapangan dasar sudah ada | kuat |
| perspektif data | data teknis sudah cukup relevan untuk kerja lapangan | sedang |
| blocker | queue lapangan khusus, worklist yang lebih sempit, dan pembeda presisi dari NOC masih perlu dirapikan | sedang |
| keputusan | belum menjadi fokus cutover awal karena berada di gelombang integrasi lintas divisi berikutnya | `PARTIAL` |

Catatan:

1. readiness role ini sangat bergantung pada kualitas queue teknis yang diberikan
2. role ini baru diprioritaskan setelah fondasi `Pemasaran dan Pelayanan` stabil

### `TT_OPERATOR`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | fokus sempit ke `support` sudah sesuai karakter role mikro | kuat |
| write-side | TT create/update/close dan CTA rekomendasi sudah matang | kuat |
| perspektif data | lane TT sudah paling kaya konteks urgensi dan blocker | kuat |
| blocker | validasi guard role mikro dan scope aksi masih perlu pembuktian UAT | sedang |
| keputusan | cukup kuat untuk pilot role sempit trouble ticket | `PILOT` |

Catatan:

1. role ini diuntungkan oleh kematangan panel TT yang sudah cukup tinggi
2. risiko utamanya lebih ke pembatasan akses, bukan kekurangan fitur inti

### `DIGITAL_CREATOR`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | sudah punya dashboard/worklist awal, tetapi domain creator masih menumpang di `sales` | lemah |
| write-side | belum ada suite creator digital yang eksplisit | lemah |
| perspektif data | dashboard dan `List Kerja` awal sudah ada untuk funnel digital | sedang |
| blocker | `content-calendar`, `campaigns`, write-side creator, dan analytics parity belum hidup | sangat tinggi |
| keputusan | belum layak pilot maupun cutover | `NO-GO` |

Catatan:

1. role ini tidak lagi sepenuhnya placeholder karena sudah punya workspace awal untuk funnel digital
2. parity penuh baru masuk akal setelah modul creator digital dibangun sebagai domain yang nyata

### `DISMANTLE_OPERATOR`

| Area Penilaian | Kondisi Aktual | Status |
|---|---|---|
| menu | `support` sudah menjadi rumah flow dismantle dasar dengan lane mikro-role lebih presisi | sedang |
| write-side | update hasil dismantle dan histori dasar sudah ada | sedang |
| perspektif data | role mikro sudah lebih sempit, tetapi queue kerja khusus masih perlu dibuktikan dalam UAT | sedang |
| blocker | bukti UAT untuk queue dismantle, finalisasi close, dan role-sempit masih perlu dipertegas | sedang |
| keputusan | fondasi makin baik, tetapi belum cukup untuk pilot sebelum UAT role mikro dinyatakan stabil | `PARTIAL` |

Catatan:

1. role ini berpotensi naik cepat karena blocker yang tersisa lebih banyak di sisi UAT dan presisi queue
2. blocker terbesarnya bukan volume fitur, tetapi pembuktian workflow mikro-role yang stabil

## Ringkasan Menu Parity

| Area | Kondisi Aktual | Dampak ke Readiness |
|---|---|---|
| dashboard per role/divisi | sudah kuat | membantu `NOC_OPERATOR`, `FIELD_TECHNICIAN`, `TT_OPERATOR` naik ke `PILOT` |
| daily activity | sudah hidup di semua role | menutup kebutuhan plan/closing lintas divisi |
| support TT | paling matang | menjadi pendorong utama pilot role teknis support |
| inventory teknis | sudah cukup kuat | mendukung pilot NOC pada fase awal dan teknisi pada fase integrasi berikutnya |
| sales onboarding | sudah cukup kuat | belum cukup untuk cutover marketing/CS tanpa list terpadu |
| list kerja terpadu | sudah hidup sebagai workspace awal lintas role | menaikkan fondasi `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN`, tetapi belum otomatis menaikkan status tanpa UAT |
| creator digital suite | baru punya workspace awal, domain penuh belum ada | membuat `DIGITAL_CREATOR` tetap `NO-GO` |
| queue mikro role | sudah lebih presisi | membantu `NOC_OPERATOR` dan `TT_OPERATOR`, tetapi `DISMANTLE_OPERATOR` masih tertahan bukti UAT |

## Rekomendasi Gelombang Cutover

### Gelombang 0

1. `SUPER_ADMIN`

Tujuan:

1. memastikan pengawasan, settings, import, dan validasi lintas domain berjalan dari ERP baru

### Gelombang 1

1. `NOC_OPERATOR`
2. `TT_OPERATOR`
3. `DISMANTLE_OPERATOR` setelah queue mikro dasar cukup stabil

Alasan:

1. seluruh role ini masih berada di bawah payung `Pemasaran dan Pelayanan`
2. domain `support` dan `inventory` sudah paling dekat ke parity teknis untuk scope legacy
3. role-role ini sudah mendapat manfaat dari dashboard per role, panel TT, dan queue teknis yang lebih matang

### Gelombang 2

1. `SALES_MARKETING`
2. `CS_OPERATOR`
3. `CS_ADMIN`
4. `DIGITAL_CREATOR` bila domain creator digital mulai nyata

Alasan:

1. role-role ini sudah punya fondasi workspace yang lebih operasional, tetapi masih butuh pembuktian UAT dan parity lanjutan
2. blocker utamanya kini bergeser ke ritme kerja harian, audit supervisor, dan modul creator digital

### Integrasi Lanjutan Divisi Lain

1. `FIELD_TECHNICIAN`

Alasan:

1. keputusan fase awal saat ini adalah menuntaskan `Pemasaran dan Pelayanan` dulu sebagai dasar
2. integrasi ke divisi `Teknis dan Expan` dilakukan setelah fondasi legacy stabil di ERP

## Prioritas PRD Berikutnya

Urutan pengerjaan yang paling berdampak ke readiness cutover:

1. jalankan UAT terarah untuk `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN` dengan `List Kerja` sebagai workspace utama
2. pertegas bukti UAT queue mikro dan guard role untuk `NOC_OPERATOR`, `TT_OPERATOR`, dan `DISMANTLE_OPERATOR`
3. formalkan bukti audit supervisor `CS_ADMIN` pada flow koreksi, restore/transfer, dan backlog risiko
4. putuskan roadmap `DIGITAL_CREATOR` sebagai domain penuh, bukan sekadar funnel awal di `sales`
5. setelah fondasi ini stabil, baru buka tahap integrasi ke `FIELD_TECHNICIAN` dan divisi lain

## Kesimpulan

Kondisi web saat ini belum merata untuk semua role, tetapi sudah cukup jelas untuk dibagi ke beberapa gelombang cutover:

1. fondasi awal harus berpusat pada `Pemasaran dan Pelayanan`
2. role teknis dan operasional di dalam rumpun tersebut paling siap dipilotkan lebih dulu
3. role bisnis lintas domain sudah terbantu oleh `List Kerja`, tetapi masih tertahan oleh pembuktian UAT dan parity flow harian lanjutan
4. integrasi ke divisi lain dilakukan setelah dasar ini stabil

## Versioning

Dokumen ini dirilis pada:

- `0.64.66` untuk matriks readiness yang diselaraskan dengan implementasi `List Kerja`, parity supervisor `CS_ADMIN`, dan workspace awal `DIGITAL_CREATOR`
