# Checklist PRD Web Utama

## Tujuan

Dokumen ini menjadi tracker implementasi antara PRD aplikasi web utama dan status aktual `apps/web`.

Status dipakai dengan arti:

- `SUDAH`: requirement inti sudah hidup di web
- `PARSIAL`: fondasi sudah ada, tetapi alur belum lengkap
- `BELUM`: baru berupa rencana, shell kosong, atau belum muncul di web

## Ringkasan Cepat

| Area | Status | Catatan |
|---|---|---|
| Login tunggal | SUDAH | Auth hybrid + session cookie sudah hidup |
| Dashboard utama | SUDAH | KPI, module shortcut, status sumber data sudah ada |
| Daily Activity | SUDAH | Menu khusus plan pagi per divisi/sub-divisi dan level Manager/SPV/Leader, closing sore, approval manager, performa harian-mingguan-bulanan, kalender plan, dan export CSV sudah ada |
| Navigasi shell | SUDAH | Sidebar, topbar, RBAC menu sudah aktif |
| Import center | PARSIAL | Read-side kuat, pipeline inti hidup, dan upload ulang destruktif sudah dikunci; parser fleksibel dan revision flow formal belum penuh |
| Detail batch | SUDAH | Row review dan summary batch sudah ada |
| Sales | PARSIAL | Lead review, coverage, sales survey, sales order, work order, dan aktivasi subscription awal sudah bisa create, workflow belum lengkap |
| Customers | PARSIAL | Customer master sudah bisa create, lifecycle belum lengkap |
| Support | PARSIAL | TT review sudah bisa create, update progress non-destruktif, prioritisasi follow-up, prioritisasi SLA due/overdue, eskalasi ticket non-destruktif, close dengan konteks progress terakhir, kelola SLA dasar, tambah isolir aktif, restorasi isolir, dan dismantle history |
| Billing | PARSIAL | Generate invoice recurring single dan batch dari daftar billing-ready, pembatalan invoice unpaid, suspend/reconnect invoice single dan batch, collection action single dan batch dengan antrean batch berbasis jenis aksi, collection follow-up queue, promise to pay queue, resolve follow-up collection, serta payment entry dengan konteks tagihan dan auto-close follow-up sudah bisa create, invoice lifecycle penuh belum |
| Inventory | PARSIAL | Review section operasional, item master, movement, ODP, port, device assignment, return perangkat, update status port awal, konteks operasional ODP/maps dasar, workflow request barang teknisi, alur barang pinjam-kembali inventory, dan jalur barang masuk yang lebih mudah untuk gudang sudah bisa create |
| HR | PARSIAL | Review section operasional, employee master, attendance, loan, payroll awal, archive employee, reactivate employee non-destruktif, fondasi geofence/radius attendance web, fondasi face attendance web, capture kamera browser dasar, workflow review verifikasi wajah, scoring placeholder review wajah, confidence band, jalur auto-review aman, policy auto-verify berbasis threshold, analytics outcome verifikasi wajah untuk backlog/status final/quality sample, baseline referensi wajah per employee untuk fondasi matching engine, auto-suggest baseline dari capture VERIFIED terbaru, matching recommendation berbasis baseline aktif (`MATCH/REVIEW_MANUAL/RETAKE`), feedback loop reinforce baseline + antrean retake side-car operasional, baseline history dan scoring trend per employee, deteksi drift baseline (`STABLE/WATCHLIST/DRIFTING`), serta priority queue operasional untuk retake pending dan employee drifting sudah hidup; recognition engine wajah penuh masih berikutnya |
| Settings access | SUDAH | Permission master dinamis, role-permissions, dan audit perubahan permission sudah hidup di review DB |
| Settings users | SUDAH | List, create, edit, reset password, deactivate/reactivate, dan audit perubahan user sudah ada |
| Mobile readiness | PARSIAL | Shell adaptif, mode detail mobile belum merata |
| Prisma target | BELUM | Saat ini masih memakai `mysql2` langsung |

## Checklist Detail

| Requirement PRD | Status | Implementasi Saat Ini | Gap Utama | Prioritas |
|---|---|---|---|---|
| Login username/password tunggal | SUDAH | Halaman login, session cookie, logout, redirect per role | Belum ada reset password dan full auth admin | Tinggi |
| Role user `SUPER_ADMIN`, `ADMIN_DIVISI`, `OPERATOR` | SUDAH | RBAC route, sidebar, shortcut, action matrix | Permission sudah bisa dikelola via settings/access saat review DB aktif, namun audit lintas seluruh write action belum terpusat | Tinggi |
| Dashboard KPI lintas domain | SUDAH | KPI customer, order, TT, isolir, inventory, employee, overdue invoice | KPI per proses detail belum lengkap | Tinggi |
| Daily activity plan pagi dan closing sore | SUDAH | Menu `Daily Activity` di `/dashboard/daily-activity`, tabel `daily_activity_items`, form plan pagi per divisi/sub-divisi dan level `Manager/SPV/Leader`, form closing sore, approval manager (approve/reject) per divisi/sub-divisi, status `PLANNED/DONE/PENDING`, alasan pending, aksi lanjut, performa harian-mingguan-bulanan berbasis approval, kalender plan bulanan, dan export CSV sudah hidup | Belum ada export XLSX/PDF, rekap KPI formal lintas periode, serta approval multi-level (SPV -> Manager) bila dibutuhkan | Tinggi |
| Sidebar domain + topbar context | SUDAH | Shell aplikasi dan active state sudah ada | Quick search modul belum nyata | Sedang |
| Pusat import sebagai modul kelas satu | PARSIAL | Halaman daftar batch, detail batch, create batch, upload file sumber, parser ke row staging, validasi, trigger transform, histori aksi batch, serta guard non-destruktif agar batch yang sudah berisi staging tidak bisa di-upload ulang sudah hidup | Parser format bebas per domain dan revision flow formal per batch belum aktif penuh | Sangat Tinggi |
| Pipeline transform tahap 1-4 | PARSIAL | Tombol eksekusi transform tahap 1-4 dari web sudah ada + histori transform per batch | Scope per batch sudah ditambah, namun perlu audit menyeluruh setiap statement stage agar semua domain 100% aman dan idempotent | Sangat Tinggi |
| Filter review batch dan row bermasalah | SUDAH | Detail row sudah ada + filter interaktif (status, domain, pencarian) | - | Sedang |
| Sales shell: lead, coverage, survey, order | PARSIAL | Lead review, coverage create, survey create, sales order create, work order create, aktivasi subscription, dan review coverage/survey/order/work order/subscription sudah ada | Workflow corporate lanjut, quotation/contract, dan otomasi pasca-aktivasi belum hidup | Sangat Tinggi |
| Customer shell: master, address, subscription, histori | PARSIAL | Create customer + primary address sudah ada | Subscription lifecycle dan histori layanan belum lengkap | Tinggi |
| Support shell: TT, isolir, dismantle, SLA | PARSIAL | TT open review sudah ada, create TT, update progress non-destruktif dengan PIC/follow-up side-car, prioritas queue berbasis follow-up overdue/terdekat, prioritas queue berbasis SLA due/overdue, eskalasi ticket non-destruktif dengan side-car log, close ticket dengan snapshot progress terakhir, kelola SLA dasar, tambah isolir aktif, restorasi isolir, dan dismantle flow dasar sudah ada | SLA penuh dan otomasi workflow support lanjutan belum ada | Sangat Tinggi |
| Inventory shell: item, stock movement, ODP, device assignment | PARSIAL | Review item inventory, review stock movement, review ODP/port, review device assignment, review port bermasalah, review device return, review request inventory teknisi, review pinjaman inventory, create item master, create stock movement, create ODP, assign port, update status port, device assignment, return perangkat, panel operasional ODP/maps awal, request barang teknisi, update status request sampai selesai, tagging sub-divisi teknisi pada request inventory, panel antrean request per sub-divisi/status, pembuatan pinjaman barang, proses pengembalian sebagian/penuh, pemulihan stok otomatis saat barang kembali, serta form/panel khusus barang masuk yang lebih mudah untuk gudang sudah ada | Device return lanjutan (return sebagian/serial per perangkat), port reserve per order, accessories kit yang lebih detail, integrasi assignment penuh ke work order, dan alur request multi-item seperti cart/checkout masih perlu diperdalam | Tinggi |
| HR shell: employee, attendance, salary, loan | PARSIAL | Review employee, attendance, loan, salary slip, create employee master, archive/reactivate employee non-destruktif, create attendance, create loan, create payroll awal, release payroll, void payroll, update status loan, void loan, penguatan suggestion/prefill aman untuk correction attendance, update/void loan, release/void payroll, guard backend agar slip payroll yang sudah `VOIDED` tidak bisa dirilis kembali, konfigurasi geofence attendance, capture lokasi browser saat check-in, validasi radius opsional/wajib, log lokasi attendance, konfigurasi face attendance, referensi verifikasi wajah/manual review saat check-in, capture kamera browser dasar yang mengisi `faceCaptureRef` otomatis, workflow review operasional wajah dengan status `PENDING_REVIEW`/`VERIFIED`/`REJECTED`, scoring placeholder dengan rekomendasi keputusan dan alasan review, confidence band `HIGH/MEDIUM/LOW`, tombol `Auto-Verify Aman`, serta policy admin untuk toggle auto-verify dan minimum score threshold sudah ada | Recognition engine wajah penuh dan perhitungan otomatis lebih detail belum hidup | Tinggi |
| Billing shell: invoice, payment, collection, overdue | PARSIAL | Generate invoice recurring dari subscription aktif, batch recurring invoice dari daftar billing-ready, pembatalan invoice unpaid, suspend/reconnect invoice dari form status secara single dan batch, collection action single dan batch dari antrean yang menyesuaikan jenis aksi, collection follow-up queue dengan state prioritas, `promise to pay queue`, resolve follow-up collection, antrean `suspend ready` dan `reconnect ready`, payment entry dengan konteks remaining/follow-up/action terakhir dan auto-close follow-up OPEN, review invoice, invoice suspended, subscription billing-ready, review invoice dibatalkan, dan review payment terbaru sudah ada | Lifecycle invoice penuh, penyesuaian non-recurring yang lebih kaya, dan otomasi billing lanjutan belum lengkap | Sangat Tinggi |
| Settings access dan permission | SUDAH | Permission master dinamis + audit permission + set role-permissions sudah tersedia di `settings/access` | - | Tinggi |
| Settings users internal | SUDAH | Direktori user, create user, edit profil, reset password, deactivate/reactivate, dan panel audit perubahan sudah ada | Audit masih terfokus pada user internal, belum lintas seluruh modul write action | Tinggi |
| Audit log dasar | PARSIAL | Audit perubahan import batch, user internal, permission, role-permission, write action support utama, write action inventory utama, write action billing utama, write action sales utama, serta create action HR utama, archive/reactivate employee HR, correction attendance HR, konfigurasi geofence attendance HR, konfigurasi face attendance HR, review verifikasi wajah HR, update status loan HR, void loan HR, release slip gaji HR, dan void slip gaji HR sudah bisa dibaca terpusat di dashboard | Delete/approval HR lanjutan dan modul lain belum tercakup secara menyeluruh | Tinggi |
| Kompatibilitas mobile web | PARSIAL | Shell dan login cukup aman di layar kecil | Tabel review/detail belum punya pola card/stacked merata | Tinggi |
| Android wrapper readiness | PARSIAL | Arsitektur mengarah ke sana dan shell aman sebagai basis | Integrasi wrapper dan pengujian jalur mobile belum formal | Sedang |
| Prisma sebagai target data layer | BELUM | Service layer sudah ada | Implementasi masih memakai `mysql2/promise` langsung | Sedang |

## Evidence Implementasi

### Auth

- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/api/auth/login/route.ts`
- `apps/web/app/api/auth/logout/route.ts`
- `apps/web/lib/auth.ts`
- `apps/web/lib/auth-session.ts`
- `apps/web/lib/access-control.ts`

### Dashboard

- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/lib/services/dashboard-service.ts`
- `apps/web/components/data-source-status.tsx`

### Import

- `apps/web/app/import/page.tsx`
- `apps/web/app/import/[batchId]/page.tsx`
- `apps/web/lib/services/import-service.ts`
- `apps/web/app/api/import/batches/route.ts`
- `apps/web/app/api/import/batches/[id]/route.ts`

### Domain

- `apps/web/app/[domain]/page.tsx`
- `apps/web/components/domain-shell.tsx`
- `apps/web/lib/services/domain-service.ts`
- `apps/web/lib/mock-domains.ts`

### Settings

- `apps/web/app/settings/access/page.tsx`
- `apps/web/app/settings/users/page.tsx`
- `apps/web/components/auth-user-create-form.tsx`
- `apps/web/app/api/settings/users/route.ts`
- `apps/web/lib/services/auth-user-service.ts`

## Prioritas Implementasi Berikutnya

1. Hidupkan inventory dan HR:
   review section operasional + write action awal.
2. Rapikan mobile behavior:
   pola card/stacked row untuk tabel sempit dan form panjang.
3. Perluas audit perubahan lintas modul:
   bawa pola audit formal dari `settings/users` ke import, sales, support, dan billing.
4. Perluas parser legacy per domain:
   dukung format input yang lebih longgar di luar JSON/XLSX terstruktur.

## Catatan

- Dokumen ini adalah checklist implementasi web, bukan pengganti PRD.
- Status dapat berubah cepat seiring iterasi fitur, jadi file ini sebaiknya diperbarui setiap kali milestone web bertambah.
