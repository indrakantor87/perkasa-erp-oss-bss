# PRD List Kerja Terpadu

## Tujuan

Dokumen ini mendefinisikan modul `List Kerja Terpadu` sebagai pengganti menu legacy `list` di `web-psb-perkasa`.

Target utamanya:

1. menyatukan item kerja lintas `sales`, `customers`, `support`, dan `inventory` ke dalam satu layar operasional
2. memberi perspektif queue yang berbeda per role tanpa membuat user harus bolak-balik domain
3. tetap menjaga `capability-based rendering` dan pola `contextual prefill` yang sudah dipakai di ERP saat ini

Dokumen ini melengkapi:

1. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
2. [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md)
3. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
4. [web-psb-role-action-parity.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-role-action-parity.md)

## Keputusan Scope Fase Awal

Modul ini diprioritaskan terlebih dahulu sebagai workspace Divisi `Pemasaran dan Pelayanan`, karena
`web-psb-perkasa` diposisikan sebagai fondasi fase awal ERP.

Itu berarti fase implementasi pertama memusatkan queue untuk:

1. `SALES_MARKETING`
2. `CS_OPERATOR`
3. `CS_ADMIN`
4. `NOC_OPERATOR`
5. `TT_OPERATOR`
6. `DISMANTLE_OPERATOR`
7. `DIGITAL_CREATOR` jika suite creator digital mulai aktif

Role di luar `Pemasaran dan Pelayanan`, seperti `FIELD_TECHNICIAN`, disiapkan sebagai tahap integrasi
berikutnya setelah fondasi modul ini stabil.

## Latar Belakang

Di sistem legacy, menu `list` berfungsi sebagai ruang kerja lintas domain yang dibaca dari perspektif divisi:

1. `PENJUALAN`
2. `CS_ADMIN`
3. `NOC_TROUBLESHOOTS`
4. `CREATOR_DIGITAL`

Di ERP baru, fondasi `worklist` sudah ada sebagai panel ringkas di dashboard, tetapi belum menjadi modul kerja penuh.

Akibatnya:

1. `SALES_MARKETING` masih harus berpindah antara `sales` dan `customers`
2. `CS_OPERATOR` dan `CS_ADMIN` masih harus berpindah antara `sales`, `support`, dan `inventory`
3. keputusan harian belum terasa menyatu seperti pola kerja legacy

## Status Saat Ini

Yang sudah ada:

1. `Dashboard` sudah punya panel `List Kerja Terpadu`
2. item `worklist` sudah memiliki struktur dasar: `domain`, `title`, `subtitle`, `status`, `priority`, `detail`, `href`
3. dashboard sudah role-aware dan divisi-aware
4. domain-domain target sudah punya CTA dan prefill yang bisa dipakai ulang

Yang belum ada:

1. route khusus untuk modul `List Kerja Terpadu`
2. filter kerja lintas domain yang bisa dioperasikan penuh
3. queue/tab yang berbeda jelas untuk `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN`
4. bulk triage, SLA kerja, dan state operasional yang konsisten lintas domain

## Target Route dan Navigasi

### Route utama

Route yang disarankan:

- `/dashboard/worklist`

Alasan:

1. menjaga kesinambungan dengan dashboard yang sudah menjadi pusat kendali ERP
2. memudahkan penguncian perspektif role/divisi dengan policy yang sama
3. menghindari penambahan domain baru yang sebenarnya bersifat lintas domain

### Posisi Navigasi

Tahap 1:

1. modul dibuka dari panel `List Kerja Terpadu` di dashboard
2. shortcut tambahan muncul di `Tindakan Berikutnya` bila ada item kritis

Tahap 2:

1. tambahkan item sidebar `List Kerja` di `Menu Utama` hanya untuk role yang membutuhkan:
2. `SALES_MARKETING`
3. `CS_OPERATOR`
4. `CS_ADMIN`
5. `NOC_OPERATOR`
6. `FIELD_TECHNICIAN`
7. `TT_OPERATOR`
8. `DISMANTLE_OPERATOR`

## Role Target

| Role | Kebutuhan utama | Scope modul |
|---|---|---|
| `SALES_MARKETING` | follow up lead, rapikan customer awal, monitor kesiapan teknis | queue bisnis akuisisi |
| `CS_OPERATOR` | input, tindak follow up, koordinasi support dan inventory | queue lintas sales-support-inventory |
| `CS_ADMIN` | supervisi worklist CS, approval, koreksi, eskalasi operasional | queue supervisor |
| `NOC_OPERATOR` | lihat queue teknis yang relevan dari perspektif jaringan | queue teknis |
| `TT_OPERATOR` | fokus pada worklist TT yang bisa langsung ditindak | queue TT |
| `DISMANTLE_OPERATOR` | fokus pada queue dismantle sempit | queue dismantle |
| `SUPER_ADMIN` | monitoring lintas semua queue untuk validasi | mode observasi lintas role |

Catatan:

1. `DIGITAL_CREATOR` belum masuk gelombang awal karena modul parity creator digital belum hidup
2. `FIELD_TECHNICIAN` tidak menjadi pusat fase awal karena integrasi divisi `Teknis dan Expan` dilakukan setelah fondasi `Pemasaran dan Pelayanan` stabil
3. setelah suite creator digital tersedia, modul ini bisa ditambah perspektif `creator`

## Prinsip Desain

Modul ini harus mengikuti prinsip berikut:

1. satu layar, banyak queue, tetapi tetap fokus per role
2. item kerja harus actionable, bukan hanya ringkasan baca
3. klik item harus membawa user ke form atau lane yang tepat dengan `contextual prefill`
4. role read-only tetap bisa melihat item, tetapi tidak melihat CTA write-side
5. item harus bisa disortir berdasarkan urgensi, bukan hanya tanggal terbaru
6. data antar domain harus terlihat menyatu tanpa mengorbankan batas capability

## Struktur Halaman

Layar `List Kerja Terpadu` dibagi menjadi 6 blok:

1. header konteks role
2. filter global
3. tab queue per perspektif
4. daftar item kerja
5. panel ringkas item aktif
6. CTA tindak lanjut

## Header Konteks

Header harus menampilkan:

1. role aktif
2. divisi dan sub-divisi aktif
3. jumlah item `kritikal`, `perlu follow up`, `menunggu pihak lain`, `siap ditutup`
4. badge `mode baca saja` bila role tidak punya capability write pada queue aktif

## Filter Global

Filter global minimum:

1. `queue`
2. `domain`
3. `priority`
4. `status kerja`
5. `PIC`
6. `tanggal target`
7. `customer atau keyword`
8. `hanya item saya`
9. `hanya item overdue`

Aturan:

1. role non-admin memakai divisi default yang terkunci
2. `SUPER_ADMIN` boleh mengganti perspektif role/divisi dari filter
3. filter harus tersimpan di query parameter agar link bisa dibagikan

## Tab Queue Per Role

### `SALES_MARKETING`

Tab minimum:

1. `Lead Follow Up`
2. `Customer Belum Lengkap`
3. `Coverage dan Survey`
4. `Order Siap Aktivasi`
5. `Monitoring Support/ODP`

### `CS_OPERATOR`

Tab minimum:

1. `Input dan Follow Up`
2. `Order dan Aktivasi`
3. `Isolir dan Dismantle`
4. `TT Dasar`
5. `ODP dan Port`

### `CS_ADMIN`

Tab minimum:

1. `Queue CS Tim`
2. `Perlu Approval`
3. `Perlu Koreksi`
4. `Transfer atau Restore`
5. `Queue Risiko Tinggi`

### `NOC_OPERATOR`

Tab minimum:

1. `TT Teknis`
2. `SLA Kritis`
3. `ODP dan Port`
4. `Monitoring Isolir`

### `TT_OPERATOR`

Tab minimum:

1. `Ticket Baru`
2. `Follow Up Overdue`
3. `Siap Eskalasi`
4. `Siap Close`

### `DISMANTLE_OPERATOR`

Tab minimum:

1. `Siap Dismantle`
2. `On Progress`
3. `Perlu Catatan Close`

## Struktur Item Kerja

Setiap item kerja minimum memiliki:

| Kolom | Fungsi |
|---|---|
| `id` | id unik lintas modul |
| `domain` | sumber domain seperti `Sales`, `Customers`, `Support`, `Inventory` |
| `queue` | nama queue aktif |
| `title` | judul kerja utama |
| `subtitle` | identitas customer, lead, WO, atau ticket |
| `status` | status operasional saat ini |
| `priority` | `tinggi`, `sedang`, `rendah` |
| `reason` | alasan item muncul di queue |
| `dueLabel` | deadline atau target follow up |
| `owner` | PIC saat ini |
| `nextAction` | langkah berikut yang direkomendasikan |
| `blockingInfo` | blocker bila ada |
| `href` | tautan ke domain target |
| `prefillToken` | context query untuk safety UX |

## Kolom Tabel Utama

Kolom tampilan default pada daftar item:

1. prioritas
2. domain
3. queue
4. judul kerja
5. entitas utama
6. status
7. PIC
8. target follow up
9. aksi berikutnya
10. blocker
11. aksi

Aturan responsif:

1. desktop memakai tabel padat
2. mobile memakai stacked card
3. prioritas, status, dan aksi berikutnya harus tetap terlihat tanpa expand

## Panel Detail Item Aktif

Saat satu item dipilih, panel detail harus menampilkan:

1. identitas item utama
2. kronologi ringkas
3. relasi lintas domain
4. data prefill yang akan dikirim ke form target
5. CTA utama
6. CTA pendukung

Contoh relasi lintas domain:

1. `lead -> customer draft -> order -> work order`
2. `customer -> isolir -> ticket -> dismantle`
3. `order -> cek ODP -> penugasan teknisi`

## CTA dan Safety UX

Setiap item wajib punya `CTA utama` dan boleh punya `CTA pendukung`.

Aturan CTA:

1. CTA utama harus mengikuti `queue`, `status`, dan `capability role`
2. CTA utama membuka domain target dengan query prefill seperti:
3. `?lead=...`
4. `?order=...`
5. `?invoice=...`
6. `?request=...`
7. `?loan=...`
8. `?attendance=...`

Contoh CTA:

1. `Buat Survey`
2. `Lengkapi Customer`
3. `Update Progress`
4. `Eskalasi`
5. `Close Ticket`
6. `Cek ODP`
7. `Proses Dismantle`

## Aturan Penyusunan Prioritas

Prioritas item ditentukan dari kombinasi:

1. SLA atau deadline
2. blocker lintas domain
3. status overdue follow up
4. kesiapan close atau handoff
5. kebutuhan approval supervisor

Urutan prioritas awal:

1. `kritikal`
2. `butuh tindakan hari ini`
3. `menunggu validasi`
4. `monitoring`

## Sumber Data Per Queue

Queue modul ini menarik data dari domain yang sudah ada:

| Queue | Sumber utama |
|---|---|
| lead dan survey | `sales_leads`, review `sales` |
| order dan work order | `sales_orders`, `service_work_orders` |
| customer belum lengkap | `crm_customers` dan relasi address/subscription |
| isolir dan dismantle | `support_isolations`, `support_dismantle_history` |
| TT | `support_trouble_tickets` dan queue support |
| ODP dan port | `inventory_odp`, `inventory_ports`, assignment inventory |
| request barang | queue request inventory teknisi |

## Hubungan Dengan Dashboard Saat Ini

Modul ini adalah evolusi langsung dari:

1. panel `List Kerja Terpadu` di dashboard
2. `DashboardNextActions`
3. `RoleQueueGrid`

Aturan integrasi:

1. `dashboard` tetap menampilkan 2-5 item teratas sebagai ringkasan
2. tombol `lihat semua` harus membuka `/dashboard/worklist` dengan filter yang sesuai
3. item dari dashboard dan modul penuh harus memakai kontrak data yang sama agar konsisten

## State dan Empty State

State minimum:

1. `loading`
2. `empty`
3. `read-only`
4. `error`
5. `filtered-empty`

Empty state harus menjelaskan:

1. apakah queue memang kosong
2. apakah filter terlalu sempit
3. apakah role tidak punya item pada queue itu

## Audit dan Jejak Perubahan

Modul ini tidak membuat tabel audit baru sendiri, tetapi harus:

1. membawa user ke form domain yang memang menyimpan audit write action
2. menampilkan ringkasan `updated by`, `updated at`, dan status terakhir bila tersedia

## Kriteria Lulus Tahap 1

Tahap 1 dianggap lulus jika:

1. `SALES_MARKETING` melihat queue akuisisi tanpa membuka lebih dari 2 modul untuk pekerjaan harian
2. `CS_OPERATOR` bisa menjalankan kerja lintas `sales/support/inventory` dari satu layar kerja
3. `CS_ADMIN` punya tab `approval` dan `koreksi` yang jelas
4. dashboard dapat membuka modul ini dengan filter yang konsisten
5. CTA utama selalu membawa prefill yang benar ke form target

## Rekomendasi Implementasi Bertahap

### Tahap 1

1. bangun route `/dashboard/worklist`
2. tampilkan queue untuk `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, dan `DISMANTLE_OPERATOR`
3. pakai kontrak `DashboardWorkItem` sebagai basis awal lalu perluas

### Tahap 2

1. perdalam perspektif teknis dan supervisor di dalam `Pemasaran dan Pelayanan`
2. tambahkan tab queue dan filter yang lebih presisi
3. siapkan perspektif `DIGITAL_CREATOR` bila modul parity digital mulai hidup

### Tahap 3

1. tambah sidebar `List Kerja`
2. tambah bulk triage, handoff, dan supervisor review
3. mulai integrasikan role di luar `Pemasaran dan Pelayanan` seperti `FIELD_TECHNICIAN`

## Dampak Ke Readiness Cutover

Jika modul ini hidup dengan benar:

1. `SALES_MARKETING` dapat naik dari `PARTIAL` ke `PILOT`
2. `CS_OPERATOR` dapat naik dari `PARTIAL` ke `PILOT`
3. `CS_ADMIN` mendapatkan dasar yang lebih kuat untuk supervisor cutover
4. fondasi kerja `Pemasaran dan Pelayanan` menjadi stabil sebelum integrasi ke divisi lain dimulai

## Versioning

Dokumen ini dirilis pada:

- `0.64.42` untuk PRD `List Kerja Terpadu` yang diselaraskan dengan struktur divisi dashboard terbaru
