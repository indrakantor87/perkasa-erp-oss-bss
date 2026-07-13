# Katalog Role, Divisi, Menu, Fitur, dan Kolom Web

## Tujuan

Dokumen ini melanjutkan PRD web dengan inventaris implementasi aktual di `apps/web` dari perspektif:

1. role dan divisi yang aktif sekarang
2. menu yang benar-benar muncul di sidebar per role
3. fitur operasional yang hidup pada tiap menu
4. kolom, kartu, filter, dan konteks data yang terlihat di web

Dokumen ini dipakai sebagai lampiran operasional untuk:

1. validasi parity PRD vs web yang sedang hidup
2. acuan cutover per role/divisi
3. dasar penyusunan flow UAT dan checklist per menu

## Scope Fase Awal

Untuk fase implementasi terdekat, `web-psb-perkasa` diperlakukan sebagai fondasi Divisi
`Pemasaran dan Pelayanan`.

Artinya:

1. pembacaan inventaris tahap awal berpusat pada role-role `Pemasaran dan Pelayanan`
2. menu dan flow role di divisi lain tetap dicatat, tetapi integrasinya dilakukan setelah fondasi awal stabil
3. `FIELD_TECHNICIAN` tetap tercatat sebagai role aktif ERP, namun bukan pusat gelombang fondasi tahap 1

## Sumber Kebenaran

Inventaris ini disusun dari implementasi aktif berikut:

1. `apps/web/lib/navigation.ts`
2. `apps/web/lib/role-meta.ts`
3. `apps/web/lib/access-control.ts`
4. `apps/web/components/layout/sidebar.tsx`
5. `apps/web/components/domain-shell.tsx`
6. `apps/web/lib/services/domain-service.ts`
7. `apps/web/app/(app)/dashboard/page.tsx`
8. `apps/web/app/(app)/dashboard/daily-activity/page.tsx`
9. `apps/web/app/(app)/settings/access/page.tsx`
10. `apps/web/app/(app)/settings/users/page.tsx`
11. `apps/web/components/import-batch-table.tsx`
12. `apps/web/components/import-batch-row-review.tsx`

## Katalog Menu Global

| Menu | Route | Grup Sidebar | Fungsi Ringkas | Role Yang Saat Ini Bisa Melihat |
|---|---|---|---|---|
| Dashboard | `/dashboard` | Menu Utama | KPI, alert silang domain, tindakan berikutnya, approval, shortcut, audit | Semua role |
| List Kerja | `/dashboard/worklist` | Menu Utama | Queue lintas domain untuk tindak lanjut harian dan approval | Semua role |
| Daily Activity | `/dashboard/daily-activity` | Menu Utama | Plan pagi, closing sore, approval, performa, kalender, export | Semua role |
| Import Center | `/import` | Menu Utama | Batch review, upload file sumber, validasi, transform, row review | `SUPER_ADMIN` |
| Penjualan | `/sales` | Menu Utama | Lead, coverage, survey, sales order, work order, aktivasi | `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `DIGITAL_CREATOR` |
| Customer | `/customers` | Menu Utama | Customer master, alamat utama, konteks subscription dasar | `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN` |
| Support | `/support` | Menu Utama | Trouble ticket, isolir, restorasi, dismantle, SLA, queue lane | `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `FIELD_TECHNICIAN`, `TT_OPERATOR`, `DISMANTLE_OPERATOR` |
| Inventory | `/inventory` | Menu Utama | Item, stock movement, ODP, port, device assignment, request, loan | `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `FIELD_TECHNICIAN` |
| HR | `/hr` | Menu Utama | Employee, attendance, loan, payroll, face review, geofence | `SUPER_ADMIN` |
| Billing | `/billing` | Menu Utama | Invoice, payment, collection, suspend, reconnect, write-off | `SUPER_ADMIN` |
| CS & Admin CS | `/customers/cs-admin` | Pemasaran dan Pelayanan | Workspace supervisor untuk approval, koreksi, restore, dan backlog risiko CS | `SUPER_ADMIN`, `CS_ADMIN` |
| Digital Creator | `/sales/digital-creator` | Pemasaran dan Pelayanan | Workspace funnel creator, campaign, digital lead, calendar, analytics | `SUPER_ADMIN`, `DIGITAL_CREATOR` |
| Teknisi PSB | `/support/teknisi-psb` | Teknisi & Ekspan | Workspace instalasi dan tindak lapangan PSB | `SUPER_ADMIN`, `FIELD_TECHNICIAN` |
| Teknisi Expan | `/support/teknisi-expan` | Teknisi & Ekspan | Workspace ekspan jaringan dan kesiapan jalur | `SUPER_ADMIN`, `FIELD_TECHNICIAN` |
| Teknisi Jointer | `/support/teknisi-jointer` | Teknisi & Ekspan | Workspace joint backbone dan follow up teknis sambungan | `SUPER_ADMIN`, `FIELD_TECHNICIAN` |
| Legal | `/inventory/legal` | General Affair | Workspace legal dan dokumen operasional | `SUPER_ADMIN` |
| Kantor | `/inventory/kantor` | Operasional | Workspace stok dan ritme operasional kantor | `SUPER_ADMIN` |
| Toko | `/inventory/toko` | Operasional | Workspace stok display dan ritme operasional toko | `SUPER_ADMIN` |
| Akses | `/settings/access` | Pengaturan | Matrix permission dan admin permission master | `SUPER_ADMIN` |
| User Internal | `/settings/users` | Pengaturan | Direktori user internal, create/edit/reset/deactivate/reactivate, audit | `SUPER_ADMIN` |

## Matrix Role dan Divisi Aktif

| Role | Divisi | Sub-divisi | Default Landing | Menu Yang Tampil | Pola Hak Akses |
|---|---|---|---|---|---|
| `SUPER_ADMIN` | Lintas Divisi | Kontrol Global | `/dashboard` | Dashboard, List Kerja, Daily Activity, Import Center, Penjualan, Customer, Support, Inventory, HR, Billing, CS & Admin CS, Digital Creator, Teknisi PSB, Teknisi Expan, Teknisi Jointer, Legal, Kantor, Toko, Akses, User Internal | lihat, buat, ubah, approve, export, manage lintas domain |
| `SALES_MARKETING` | Pemasaran dan Pelayanan | Penjualan | `/sales` | Dashboard, List Kerja, Daily Activity, Penjualan, Customer, Support, Inventory | tulis di `sales` dan `customers`, baca di `support` dan `inventory` |
| `CS_OPERATOR` | Pemasaran dan Pelayanan | CS | `/dashboard/worklist` | Dashboard, List Kerja, Daily Activity, Penjualan, Customer, Support, Inventory | tulis di `sales` dan `support`, update terbatas di `customers` dan `inventory` |
| `CS_ADMIN` | Pemasaran dan Pelayanan | Admin CS | `/customers/cs-admin` | Dashboard, List Kerja, Daily Activity, Penjualan, Customer, Support, Inventory, CS & Admin CS | supervisor CS: approve di `sales`, `customers`, `support`, `inventory` terbatas |
| `NOC_OPERATOR` | Pemasaran dan Pelayanan | NOC | `/support/tt` | Dashboard, List Kerja, Daily Activity, Support, Inventory | tulis di `support`, update dan export di `inventory` |
| `FIELD_TECHNICIAN` | Teknis dan Expan | Teknisi PSB / Teknisi Jalur & Expan / Teknisi Jointer | `/dashboard/worklist` | Dashboard, List Kerja, Daily Activity, Inventory, Support, Teknisi PSB, Teknisi Expan, Teknisi Jointer | update lapangan di `support` dan `inventory`, tanpa approval |
| `TT_OPERATOR` | Pemasaran dan Pelayanan | Troubleshoots | `/support/tt` | Dashboard, List Kerja, Daily Activity, Support | create/update di `support` dengan scope sempit TT |
| `DIGITAL_CREATOR` | Pemasaran dan Pelayanan | Creator Digital | `/sales/digital-creator` | Dashboard, List Kerja, Daily Activity, Penjualan, Digital Creator | create/update/export di `sales` untuk lead dan aktivitas marketing digital |
| `DISMANTLE_OPERATOR` | Pemasaran dan Pelayanan | Dismantle | `/support/dismantle` | Dashboard, List Kerja, Daily Activity, Support | update di `support` untuk flow dismantle dan tindak lapangan terkait |

## Katalog Kolom Per Menu

Bagian ini menjadi kamus kolom dan tampilan dasar yang dipakai ulang oleh seluruh role sesuai menu yang mereka miliki.

### Dashboard

| Area | Kolom atau Tampilan Utama |
|---|---|
| Filter konteks | bulan, tahun, divisi aktif |
| Pusat Kendali ERP | orientasi role aktif, status role, cakupan divisi, CTA domain prioritas |
| Dashboard Operasional | kartu performa per sub-divisi seperti Penjualan, CS, NOC, Creator Digital |
| KPI Proses | metrik proses per domain dan `focus` drilldown untuk membuka modul terkait |
| Alert Silang Domain | modul terdampak, dampak lintas domain, langkah berikutnya |
| Tindakan Berikutnya | antrean tindakan prioritas yang relevan untuk role aktif |
| Kontrol Lintas Domain | panel hubungan antar proses dan risiko blocker |
| List Kerja dan Approval | item kerja aktif, antrian approval yang sesuai capability role |
| Shortcut dan Audit | shortcut modul, histori aktivitas/audit terbaru |

### Daily Activity

| Area | Kolom atau Tampilan Utama |
|---|---|
| Filter | bulan, divisi, sub-divisi, level plan, status approval |
| Ringkasan | total plan, selesai, pending, belum di-close |
| Performa | completion rate, done, pending, open, total, breakdown divisi/sub-divisi, breakdown level |
| Kalender plan | tanggal, jumlah plan, performa harian, indikator hari ini |
| Aktivitas hari ini | kode aktivitas, judul tugas, planner, level, prioritas, status closing, status approval, divisi/sub-divisi, jam close, catatan hasil |
| Aktivitas terbaru | tanggal, planner, level, kode aktivitas, status, alasan pending, tindak lanjut |
| Form plan pagi | tanggal aktivitas, level plan, divisi, sub-divisi, prioritas, judul tugas, catatan target |
| Form closing sore | aktivitas yang di-close, status closing, hasil pekerjaan, alasan pending, langkah lanjut |
| Approval manager | aktivitas menunggu approval, keputusan approve/reject, catatan approval, bulk approval |
| Export | rentang tanggal, divisi, sub-divisi, format export |

### Import Center

| Area | Kolom atau Tampilan Utama |
|---|---|
| Tabel batch | batch, sumber, status, jumlah baris, jumlah valid, detail |
| Form create batch | source system, file sumber, catatan batch |
| Detail batch | valid row, invalid/skipped, finalisasi batch, kesehatan batch, target final terbentuk |
| Action panel | status batch, rekomendasi langkah berikutnya, validasi batch, transform tahap 01-04 |
| Row review | legacy id, normalized key, status, target, catatan |
| Filter row review | status row, domain row |
| Upload source | file upload, status lock batch, catatan review non-destruktif |
| Histori batch | histori aksi, histori transform run, hasil transform |

### Penjualan

| Area | Kolom atau Tampilan Utama |
|---|---|
| Shell domain | header domain, highlights, alur utama, integrasi dengan Customer, Inventory, Billing |
| Aksi prioritas | CTA create/update sesuai capability role, anchor langsung ke form relevan |
| Review lead | lead id/kode, nama prospek, sumber lead, marketing, nomor telepon |
| Review coverage | area coverage, alamat, status cakupan |
| Review survey | jadwal atau status survey, lead terkait, catatan survey |
| Review sales order | nomor order, lead atau customer terkait, status order |
| Review work order | nomor work order, item pekerjaan, status pelaksanaan |
| Review aktivasi | order atau subscription terkait, status aktivasi |
| CTA contextual prefill | query `lead` dan `order` untuk mengisi form target otomatis |

### Customer

| Area | Kolom atau Tampilan Utama |
|---|---|
| Shell domain | header domain, highlights, alur customer master, integrasi dengan Sales, Support, Billing |
| Review customer | customer code, nama customer, tipe customer, phone, email |
| Review layanan | alamat utama, service, harga, status activated |
| Form utama | create customer, address utama, konteks subscription awal |
| CTA dan mode akses | create/update hanya untuk role yang memiliki capability, role lain tidak melihat form |

### Support

| Area | Kolom atau Tampilan Utama |
|---|---|
| Shell domain | header domain, highlights, integrasi ke Customer, Billing, Inventory |
| Queue TT utama | nomor ticket, jenis ticket, customer atau user, tanggal buka |
| Kolom SLA | SLA days, SLA due state, overdue/due today/normal |
| Kolom ownership | PIC, next follow up, escalation, queue reason, queue priority |
| Kolom closure | close candidate, blocker close, progress terakhir |
| Lane operasional | critical attention, planned follow up, waiting progress, ready close |
| CTA role-aware | update progress, eskalasi, close, cek SLA, restore isolir, tindak dismantle |
| Form write-side | create TT, update progress, eskalasi, close, isolir aktif, restorasi isolir, dismantle history |

### Inventory

| Area | Kolom atau Tampilan Utama |
|---|---|
| Shell domain | header domain, highlights, alur stok, ODP, request, loan, integrasi ke Sales dan Support |
| Review item | item, category, unit, current stock, minimum stock |
| Review movement | movement qty, jenis mutasi, harga, catatan mutasi |
| Review ODP dan port | ODP, port, status port, maps atau konteks lokasi |
| Review assignment | service, work order, serial number, assignment status |
| Review request teknisi | requester, divisi, sub-divisi, item diminta, status request |
| Review loan inventory | borrower, divisi, sub-divisi, due date, remaining item |
| Form write-side | item master, stock movement, ODP, assign port, request status, loan create, return perangkat |
| CTA contextual prefill | query `request` dan `loan` untuk mengisi form target otomatis |

### HR

| Area | Kolom atau Tampilan Utama |
|---|---|
| Shell domain | header domain, highlights, alur employee, attendance, payroll, loan |
| Review employee | employee, division, branch, status employee |
| Review attendance | tanggal, check-in, check-out, overtime, status lock |
| Review face attendance | analytics status, score/confidence band, recommendation, baseline state |
| Review loan | loan amount, installment, status loan |
| Review payroll | income, deduction, total, release status, void status |
| Form write-side | employee master, attendance, geofence, face config, loan, payroll, archive/reactivate |
| CTA contextual prefill | query `attendance`, `loan`, `employee`, `payroll` untuk safety UX |

### Billing

| Area | Kolom atau Tampilan Utama |
|---|---|
| Shell domain | header domain, highlights, alur invoice, payment, collection, integrasi ke Customer dan Support |
| Review invoice | invoice number, invoice type, status, total, paid, remaining, due date |
| Review collection | follow-up state, action type, collection status |
| Review suspend dan reconnect | suspend candidate, reconnect ready, write-off queue |
| Segmentasi queue | recurring vs one-time untuk lane follow-up, promise to pay, suspend ready, reconnect ready, histori action |
| Form write-side | generate invoice, status invoice, payment entry, collection action, resolve follow-up |
| CTA contextual prefill | query `invoice` dan `service` untuk mengisi form billing target otomatis |

### Akses

| Area | Kolom atau Tampilan Utama |
|---|---|
| Ringkasan role aktif | jumlah resource, jumlah approval, jumlah manage, role aktif |
| Matrix permission | resource, aksi |
| Admin permission | permission master, assign role-permission, audit perubahan permission |

### User Internal

| Area | Kolom atau Tampilan Utama |
|---|---|
| Ringkasan user | total user, user aktif, admin users, operator users |
| Tabel user | user, role, divisi, cabang, status, sumber, aksi |
| Form user | create, edit, reset password, deactivate, reactivate |
| Audit user | histori perubahan user internal |
| Daily Activity profile | panel profil user untuk konteks approval dan organisasi |

## Perspektif Detail Per Role

### `SUPER_ADMIN`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | penuh | baca KPI global, baca alert silang domain, lihat approval, shortcut, audit | seluruh area `Dashboard` termasuk filter bulan, tahun, divisi |
| Daily Activity | penuh | create, close, approve, export | seluruh area `Daily Activity` |
| Import Center | penuh | create batch, upload, validasi, transform, review row | seluruh area `Import Center` |
| Penjualan | penuh | create/update/approve/export flow sales | seluruh area `Penjualan` |
| Customer | penuh | create/update/approve/export customer | seluruh area `Customer` |
| Support | penuh | create/update/approve/export support | seluruh area `Support` |
| Inventory | penuh | create/update/approve/export inventory | seluruh area `Inventory` |
| HR | penuh | create/update/approve/export HR | seluruh area `HR` |
| Billing | penuh | create/update/approve/export billing | seluruh area `Billing` |
| Akses | penuh | lihat matrix dan kelola permission | seluruh area `Akses` |
| User Internal | penuh | kelola user internal dan audit | seluruh area `User Internal` |

### `SALES_MARKETING`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | KPI sales/marketing, tindakan berikutnya, alert yang berdampak ke penjualan | area `Dashboard` dengan filter divisi terkunci ke divisi role |
| Daily Activity | create/update | plan pagi dan closing sore untuk scope marketing | seluruh area `Daily Activity`, tanpa approval manager bila role tidak punya capability |
| Penjualan | create/update/export | lead, coverage, survey awal, sales order awal, work order, aktivasi | seluruh area `Penjualan` dengan CTA/form write-side aktif |
| Customer | create/update | create customer dan address awal untuk hasil konversi sales | seluruh area `Customer` dengan form write-side aktif |
| Support | baca | melihat ticket pelanggan untuk konteks follow-up penjualan | area `Support` dalam mode baca; form dan CTA mutasi tersembunyi |
| Inventory | baca | memonitor ODP, port, dan kesiapan teknis sebelum closing order | area `Inventory` dalam mode baca; form dan CTA mutasi tersembunyi |

### `CS_OPERATOR`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | dashboard operasional CS, worklist, tindakan berikutnya | area `Dashboard` dengan divisi terkunci |
| Daily Activity | create/update | plan pagi, closing sore, monitoring performa divisi | area `Daily Activity`, tanpa approval/export |
| Penjualan | create/update | tindak lead/order yang bersinggungan dengan onboarding customer | seluruh area `Penjualan` dengan form yang relevan |
| Customer | update | update customer master dan address yang sudah ada | area `Customer`; aksi tulis mengikuti capability update |
| Support | create/update | create TT, update progress, tindak support dasar, isolir/dismantle dasar | seluruh area `Support` dengan CTA role-aware aktif |
| Inventory | update | update ODP terbatas, request atau assignment operasional CS | area `Inventory` dengan aksi update yang relevan, tanpa create penuh |

### `CS_ADMIN`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca/export | dashboard supervisor CS, approval dan audit yang relevan | area `Dashboard` dengan penekanan queue dan approval |
| Daily Activity | create/update/approve/export | plan, close, approve, export performa tim CS | seluruh area `Daily Activity` |
| Penjualan | create/update/approve/export | supervisi flow sales yang terkait onboarding customer | seluruh area `Penjualan` |
| Customer | create/update/approve/export | koreksi data customer dan approval operasional tertentu | seluruh area `Customer` |
| Support | create/update/approve/export | supervisor TT, restore, koreksi progres, kontrol lane support | seluruh area `Support` |
| Inventory | update/approve/export | persetujuan terbatas inventory untuk konteks CS | area `Inventory` dengan approval terbatas sesuai capability |

### `NOC_OPERATOR`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | dashboard NOC, alert silang domain yang memengaruhi jaringan, tindakan prioritas | area `Dashboard` dengan divisi terkunci ke NOC |
| Daily Activity | create/update | plan dan closing pekerjaan NOC | area `Daily Activity`, tanpa approval |
| Support | create/update/export | TT teknis, prioritas SLA, eskalasi, progress teknis | seluruh area `Support` dengan fokus lane teknis |
| Inventory | update/export | ODP, port, device assignment, request teknisi, monitoring stok relevan | area `Inventory` dengan aksi update dan export |

### `FIELD_TECHNICIAN`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | dashboard teknisi, antrian kerja lapangan, blocker teknis | area `Dashboard` dengan divisi terkunci ke teknisi |
| Daily Activity | create/update | plan lapangan dan closing kunjungan | area `Daily Activity`, tanpa approval |
| Inventory | update | request barang, update status request, loan return, cek assignment perangkat | area `Inventory` dengan fokus request, loan, port, assignment |
| Support | update | update hasil kunjungan, progress TT lapangan, status penanganan | area `Support` dalam scope eksekusi lapangan; create/approve tidak muncul |

### `TT_OPERATOR`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | dashboard TT, antrian ticket prioritas, tindakan berikutnya | area `Dashboard` dengan filter divisi terkunci |
| Daily Activity | create/update | plan harian dan closing pekerjaan TT | area `Daily Activity`, tanpa approval |
| Support | create/update | open ticket, update progress, eskalasi, close ticket sesuai scope | area `Support` dengan fokus penuh ke lane TT dan form TT |

### `DIGITAL_CREATOR`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | dashboard creator digital, KPI lead digital, tindakan marketing berikutnya | area `Dashboard` dengan divisi terkunci ke digital |
| Daily Activity | create/update | plan campaign harian dan closing pekerjaan konten | area `Daily Activity`, tanpa approval |
| Penjualan | create/update/export | lead digital, aktivitas marketing, monitoring funnel awal | area `Penjualan` dengan penekanan review lead dan CTA sales |

### `DISMANTLE_OPERATOR`

| Menu | Mode Akses | Fitur Yang Dipakai | Kolom Atau Tampilan Yang Terlihat |
|---|---|---|---|
| Dashboard | baca | dashboard dismantle, daftar tindak pembongkaran, blocker lapangan | area `Dashboard` dengan filter divisi terkunci |
| Daily Activity | create/update | plan dan closing pekerjaan dismantle | area `Daily Activity`, tanpa approval |
| Support | update | update hasil dismantle, note lapangan, status penyelesaian | area `Support` dengan fokus ticket dan history dismantle; create/approve umum tersembunyi |

## Aturan Baca Dokumen

1. jika role memiliki menu, maka role tersebut mewarisi seluruh kolom baca dari menu tersebut
2. form dan CTA mutasi hanya tampil jika role memiliki capability `create`, `update`, atau `approve`
3. bila role hanya punya `view`, web tetap menampilkan kartu review dan kolom baca, tetapi tombol aksi dan form ditutup
4. `Daily Activity` berada di bawah prefix `/dashboard`, sehingga semua role melihat submenu ini walau matrix route hanya mencantumkan `/dashboard`
5. dokumen ini menggambarkan implementasi web saat ini, bukan seluruh target masa depan yang masih direncanakan pada dokumen parity atau desain role target

## Kesimpulan

Web saat ini sudah memiliki fondasi role-aware yang nyata:

1. sidebar dipilah per role/divisi
2. dashboard dikunci ke divisi default role non-admin
3. domain shell menampilkan review, CTA, dan form berdasarkan capability
4. setiap role mewarisi kolom baca dari menu yang diizinkan, sementara write-side tetap dibatasi

## Versioning

Dokumen ini dirilis pada:

- `0.64.42` untuk inventaris role/divisi/menu yang diselaraskan dengan struktur dashboard divisi terbaru
