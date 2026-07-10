# Versioning Guide

## Tujuan

Dokumen ini menjadi aturan versioning dan changelog untuk project `perkasa-erp-oss-bss` agar rapi sejak fase awal.

## Skema Versi

Project memakai `Semantic Versioning`:

```text
MAJOR.MINOR.PATCH
```

Contoh:

- `0.1.0`
- `0.2.0`
- `0.2.1`
- `1.0.0`

## Aturan Fase Awal

Selama sistem masih tahap fondasi dan belum stabil production, gunakan seri `0.x.y`.

Artinya:

- `0.MINOR.0` untuk penambahan besar pada blueprint, schema, atau modul utama
- `0.MINOR.PATCH` untuk perbaikan terbatas, sinkronisasi dokumen, atau koreksi schema

## Kapan Naik Versi

### Naik PATCH

Naik `PATCH` jika perubahan bersifat kecil dan tidak mengubah arah sistem, misalnya:

- perbaikan schema
- koreksi relasi tabel
- sinkronisasi dokumentasi
- perbaikan query atau bug kecil

Contoh:

- `0.1.0 -> 0.1.1`

### Naik MINOR

Naik `MINOR` jika ada penambahan domain atau milestone penting, misalnya:

- field mapping selesai
- ERD phase 1 selesai
- bootstrap app selesai
- modul auth selesai
- modul customer/order selesai

Contoh:

- `0.1.0 -> 0.2.0`

### Naik MAJOR

Naik `MAJOR` jika sistem sudah mencapai baseline stabil dan siap menjadi fondasi resmi production atau terjadi perubahan besar yang mematahkan struktur sebelumnya.

Contoh:

- `0.9.0 -> 1.0.0`

## File yang Wajib Dijaga

### `VERSION`

Berisi satu baris versi aktif project.

Contoh:

```text
0.1.0
```

### `CHANGELOG.md`

Berisi riwayat perubahan penting project.

Format yang dipakai:

- bagian `Unreleased`
- bagian versi rilis
- kategori seperti `Added`, `Changed`, `Fixed`, `Removed`

## Aturan Penulisan Changelog

### `Added`

Untuk modul, dokumen, tabel, atau flow baru.

### `Changed`

Untuk perubahan perilaku, struktur, atau keputusan desain yang mengganti pendekatan lama.

### `Fixed`

Untuk perbaikan bug, mismatch data, atau error schema.

### `Removed`

Untuk penghapusan modul, field, atau pendekatan yang tidak lagi dipakai.

## Pola Kerja yang Disarankan

Setiap kali ada perubahan berarti:

1. update file `VERSION`
2. pindahkan item yang relevan dari `Unreleased` ke versi baru di `CHANGELOG.md`
3. tambahkan ringkasan perubahan
4. baru commit

## Baseline Saat Ini

- versi aktif: `0.64.34`
- status: fondasi review database, transform tahap 1-4, bootstrap web utama, write-side domain utama, penguatan RBAC server, playbook integrasi 1 minggu non-intrusive, matriks field operasional minggu pertama, keputusan formal bahwa `web-psb-perkasa` menjadi baseline bisnis-operasional, target end-state satu web di ERP dengan cutover bertahap, requirement parity penuh sebelum web lama bisa ditinggalkan, baseline matriks parity role-menu-aksi-flow-logic, detail parity operasional per role-menu-aksi, desain role ERP target, checklist flow parity per role, permission matrix target, gap implementasi per modul, baseline implementasi kode untuk 9 role ERP target, dashboard role-aware dengan queue per role dan list kerja terpadu awal, dashboard operasional lintas divisi pada landing `/dashboard` dengan filter bulan/tahun/divisi (filter divisi otomatis mengikuti role dan dikunci untuk non-admin), pusat kendali ERP pada landing `/dashboard` dengan lapisan monitor -> drilldown proses -> identifikasi blocker -> tindakan berikutnya -> kontrol -> audit, kartu fokus role aktif, jumlah queue/list kerja/shortcut/approval, panel `KPI Proses` yang merinci metrik per divisi ke level proses dan kini membawa focus context ke lane support, panel alert silang domain untuk hambatan lintas modul yang kini juga menjelaskan modul terdampak, dampak lintas domain, dan langkah berikutnya, panel `Tindakan Berikutnya` yang merangkum alert, list kerja, dan queue role aktif menjadi CTA prioritas langsung, navigasi shell yang kini memprioritaskan menu berdasarkan role/divisi serta memisahkan `Menu Utama` dan `Pengaturan`, serta query dashboard yang lebih tahan variasi schema review DB, landing operasional per menu domain dengan navigasi antarmodul langsung di header, blok alur utama tiap domain, dan panel integrasi ERP lintas menu, kontrak data `supportFocus` di service/API, workspace lane aktif dengan checklist dan peta aksi, subpage dedicated `/support/[lane]` untuk flow `TT`, `isolir`, `dismantle`, dan `SLA`, optimasi query review DB agar halaman lane hanya mengambil section yang relevan, perapihan layout halaman lane agar header dan aksi utama lebih fokus, panel operasional dedicated untuk `/support/tt`, `/support/isolations`, `/support/dismantle`, dan `/support/sla`, drilldown KPI support berbasis `focus` context yang kini menampilkan banner fokus operasional dan menyaring section/row relevan seperti `SLA_OVERDUE` dan `OPEN_TICKETS`, shortcut aksi cepat per lane yang melompat langsung ke form support terkait, flow prefill dari panel ke form support sehingga operator bisa menindak row TT dan isolir tanpa mengetik ulang data pilihan, update progress TT non-destruktif dengan side-car PIC/follow-up/catatan progres langsung dari shell support, prioritisasi queue TT berbasis follow-up overdue/terdekat, context card aman pada form close ticket, konteks `SLA Due/State` langsung di queue dan form TT, jalur eskalasi TT non-destruktif dengan side-car escalation log dan snapshot eskalasi terakhir di queue/form, guard backend yang kini mewajibkan progress aktif sebelum close trouble ticket, guard level SLA yang kini membatasi eskalasi `OVERDUE/DUE_TODAY` hanya untuk ticket yang memang sesuai `sla_due_at`, guard anti-duplikasi agar eskalasi identik butuh progress baru atau context baru, lane `trouble ticket ready close` untuk memisahkan ticket yang sudah punya progress valid, tidak punya follow-up aktif, dan tidak sedang menunggu eskalasi yang lebih baru, panel TT yang kini merender lane `ready close`, `critical attention`, `planned follow up`, dan `waiting progress` secara terpisah, indikator `queue reason`, `queue priority`, dan `close candidate` pada panel TT agar operator cepat membaca blocker close, kandidat close formal, dan urutan urgensi ticket, urutan section panel TT yang kini mengikuti prioritas antrean tertinggi agar lane berisi `P1/P2` muncul lebih dulu daripada lane yang lebih aman ditutup, ringkasan distribusi `P1-P4` di header panel agar beban ticket kritis langsung terlihat, penyembunyian lane kosong agar segmentasi support tetap ringkas dan fokus, CTA rekomendasi pada header tiap lane untuk mendorong aksi paling relevan dari ticket teratas seperti update progress, eskalasi, close, dan cek SLA, pelabelan CTA yang kini membaca `queue reason` ticket teratas agar niat aksi operasional lebih spesifik sesuai blocker nyata, badge `aksi disarankan` dan helper `langkah saat ini` pada tiap row TT agar operator mendapat arahan langsung di level ticket, urutan dan styling tombol aksi per row yang kini mengikuti rekomendasi tindakan utama, penyaringan aksi pendukung per row agar opsi yang tampil lebih relevan dengan queue reason ticket, helper tambahan saat aksi disederhanakan agar operator memahami fokus operasional yang sedang diprioritaskan, serta konsistensi bahasa CTA lane dan row agar prioritas operasional terasa sama dari panel ringkas sampai detail ticket, batch collection action billing dari queue tindak lanjut, guard billing yang kini menolak collection action pada invoice tidak layak tindak dan membatasi action strategis ke status `OPEN`, collection follow-up queue billing dengan context aman untuk collection/payment yang kini dipisah antara `recurring` dan `one-time`, `promise to pay queue` dan `suspend ready queue` billing yang kini juga dipisah antara `recurring` dan `one-time`, histori `collection action terbaru`, `reconnect ready queue`, dan `write off queue` billing yang kini juga dipisah antara `recurring` dan `one-time`, resolve collection follow-up billing yang kini ikut menyelaraskan status koleksi invoice sesuai action aktif termasuk penutupan formal `WRITE_OFF`, antrean umum billing yang kini hanya memuat invoice collectible, segmentasi review billing untuk membedakan invoice `recurring` dan `one-time` pada lane tindak lanjut serta invoice terbaru, meta antrean collection yang kini membawa `invoice type` agar operator tidak salah membaca charge bulanan vs charge one-time, auto-close follow-up saat payment diterima, jalur suspend/reconnect invoice di shell billing, batch suspend/reconnect dari antrean operasional billing, auto-escalation read-side dari `promise to pay` overdue ke `suspend ready`, pembersihan jalur suspend otomatis saat payment billing mulai masuk, reconnect queue billing yang kini hanya membaca invoice dengan `collection_status = RECONNECT`, aksi collection `RECONNECT` yang kini menulis status koleksi konsisten ke jalur reconnect, aktivasi ulang invoice suspend ke `OVERDUE` yang kini otomatis keluar dari antrean reconnect ke jalur follow-up normal, penutupan formal action `RECONNECT` terbuka saat pemulihan layanan selesai, helper resolve billing yang kini menjelaskan efek tiap action untuk operator, generate invoice non-recurring yang kini memakai nominal/deskripsi custom alih-alih harga bulanan subscription, prefill kontekstual dari CTA row review ke form target Billing/Sales/Inventory/HR melalui query `lead`, `order`, `invoice`, `request`, `attendance`, dan `loan`, serta perluasan prefill Billing/HR untuk query `service`, `employee`, dan `payroll` agar generate invoice, archive/reactivate employee, create payroll, dan release payroll bisa langsung membuka item yang dipilih dari review row; batch collection action berbasis antrean yang sesuai jenis aksi, panel operasional inventory untuk ODP/maps/port/accessories, penegasan roadmap attendance wajah + radius sebagai target ERP berikutnya, workflow request barang teknisi dengan status proses dan pengurangan stok otomatis saat request selesai, pemisahan hak akses agar teknisi bisa submit request barang tanpa membuka write action inventory admin, baseline divisi/sub-divisi organisasi yang kini ditautkan ke metadata role aktif dan dokumentasi desain role ERP, tagging sub-divisi teknisi pada request inventory agar proses gudang dan pelacakan kebutuhan harian lebih terarah, panel antrean request inventory per sub-divisi/status untuk membantu prioritisasi proses gudang, alur barang pinjam-kembali yang memisahkan stok habis pakai dari stok alat yang wajib kembali ke gudang, jalur barang masuk khusus yang lebih mudah dipakai gudang tanpa memilih tipe movement secara manual, menu `Daily Activity` untuk plan pagi dan closing sore per aktivitas dengan status selesai atau pending yang transparan, penguatan daily activity ke level divisi/sub-divisi dan `Manager`/`SPV`/`Leader` dengan performa harian-mingguan-bulanan dan kalender plan bulanan, approval manager dan export CSV untuk rekap terstruktur, Daily Activity profile per username (via Settings Users) untuk auto-fill & scope approval yang konsisten, feed audit dashboard terpusat untuk Import Center, Settings Users, Settings Access, write action support utama, write action inventory utama, write action billing utama, write action sales utama, serta create action HR utama, archive employee HR, reactivate employee HR, correction attendance HR, update status loan HR, void loan HR, release slip gaji HR, void slip gaji HR, prefill safety correction attendance, penguatan suggestion dan prefill aman pada update/void loan HR, penguatan suggestion dan ringkasan aman pada release/void payroll HR, guard backend agar slip payroll yang sudah `VOIDED` tidak bisa dirilis kembali, fondasi geofence/radius attendance non-intrusive melalui konfigurasi titik kerja, capture lokasi browser, log lokasi attendance, audit `ATTENDANCE_GEOFENCE_CONFIG`, fondasi face attendance non-intrusive melalui konfigurasi mode verifikasi wajah, referensi capture/manual review di attendance web, log verifikasi wajah terpisah, audit `ATTENDANCE_FACE_CONFIG`, capture kamera browser langsung di form attendance untuk menghasilkan `faceCaptureRef` otomatis pada mode `CAMERA_CAPTURE`, workflow review operasional wajah dengan status `PENDING_REVIEW`/`VERIFIED`/`REJECTED` dan audit `ATTENDANCE_FACE_REVIEW`, scoring placeholder yang memberi `match score`, rekomendasi keputusan, dan alasan rekomendasi sebelum matching otomatis penuh hadir, confidence band `HIGH/MEDIUM/LOW` dan indikator `auto-review aman` untuk membantu keputusan cepat operator HR, policy auto-verify yang bisa diatur admin lewat toggle dan minimum score, analytics outcome verifikasi wajah untuk backlog/final decision/confidence sample/adopsi camera capture, baseline referensi wajah per employee untuk fondasi matching engine, auto-suggest baseline dari capture `VERIFIED` terbaru di shell/form HR, matching recommendation berbasis baseline employee aktif untuk hasil `MATCH/REVIEW_MANUAL/RETAKE`, feedback loop untuk reinforce baseline yang terkontrol dan antrean retake side-car operasional, history baseline wajah dan scoring trend per employee untuk membaca kualitas referensi secara bertahap, deteksi drift baseline agar operator cepat tahu referensi mulai melemah, priority queue operasional untuk retake pending dan employee drifting, guard non-destruktif Import Center agar batch berisi staging tidak bisa di-upload ulang, serta batch recurring invoice generation dari daftar billing-ready di shell web, plus status payroll `VOIDED` non-destruktif via `hr_salary_slip_voids`, dan formatter waktu dashboard yang kini tahan terhadap variasi tipe tanggal dari driver review DB
