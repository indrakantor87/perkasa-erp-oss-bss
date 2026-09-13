# G23.75 — Spesifikasi Implementasi Inventory Opsi A: 12 Fitur Layar Kartu Stok, Rekap Harian, Asset Register, Kendaraan Oprasional, & Ceklis Alat Teknisi DALAM MENU EXISTING (0 Menu Baru / 0 Route Baru)

## Problem Statement (Latar Belakang)

User (PT Mega Data Perkasa) memiliki 12 lembar screenshot dokumen inventory fisik (format Excel/cetak manual) yang selama ini dikelola di luar ERP OSS BSS. User ingin memasukkan SEMUA 12 fitur dokumen ini ke **dalam menu Inventory yang SUDAH ADA** di web ERP, **TANPA PERLU MENAMBAHKAN SATU PUN MENU / ROUTE BARU** (Opsi A) guna:
1. Menghindari menambah kerumitan sidebar inventory yang sudah panjang 15 submenu.
2. Menghindari perubahan routing / access control (ACL) untuk mencegah regress permission role.
3. Menjaga integrasi antar menu existing (Receipts/Movements/Damaged/PSB/Support TT/Toko/Networks/ODP) 100% tidak terganggu.
4. Setiap halaman yang di-isi wajib mendukung **Export Excel** kolom 100% sesuai struktur dokumen screenshot fisik.

Dokumen 12 screens yang harus masuk ke ERP dikelompokkan jadi **5 kategori fitur**:
- **A. Kartu Stok Per Item (8 screens)**: 1 barang = 1 kartu in/out/sisa (Adaptor 1A/1.5A/2A, Modem Dismantle/F670L/F680L/F613/ZTE 100Mbps Up).
- **B. Rekap Stok Barang Harian (Matrix Per Tanggal) (1 screen)**: 1 baris per barang, 1 kolom per tanggal September 2026 (33 kolom), kolom hari Minggu berlabel "MINGGU".
- **C. Data Asset Tetap / Fixed Asset Register Tahunan (1 screen)**: Per barang aset tetap (Modem GPON/DJI Drone dll) ada 9 kolom (Kode/Nama/Tgl Beli/Tgl Keluar/PIC/Lokasi/Ket/Harga/Unit).
- **D. Daftar Penggunaan Kendaraan Oprasional (Pool Mobil/Motor) (1 screen)**: 7 kolom (No/Hari-Tanggal/Nama Pengguna/Jenis Kendaraan/Jam Ambil/Nominal/Keterangan Kegunaan).
- **E. Form Ceklis Pemeriksaan Mingguan Alat Teknisi (1 screen)**: 3 alat (Splicer/OTDR/OPM). Tiap alat punya 6 butir pemeriksaan Ya/Tidak + Catatan. Header per minggu (Nomor Minggu + Tanggal + Petugas).

Bersamaan dengan fitur 5 kategori di atas, **harus sekaligus memperbaiki 5 bug kartu stok historis** yang muncul di dokumen fisik (No duplikat/tanggal kosong/format tanggal separator hilang/urut tanggal terbalik/kode .0011 awalan titik).

## Tujuan (Goals)

- **G1**: Semua 5 kategori fitur dari 12 screens BISA diakses DALAM MENU INVENTORY EXISTING (items/reports/stock/assets/kantor). 0 route baru. 0 submenu baru di sidebar.
- **G2**: Setiap kategori fitur BISA export ke file `.xlsx` dengan struktur kolom, merge cell header, dan footer total SAMA PERSIS dokumen fisik user (sesuai screenshot).
- **G3**: Bug 5 kartu stok historis (B1 s/d B5) TIDAK muncul lagi di UI & file Excel hasil export.
- **G4**: Integrasi dengan 6 menu existing yang sering menulis ke inventory (Receipts/Movements/Damaged/PSB/Support-TT/Finance) = 100% tidak berubah behavior save/POST API.
- **G5**: Role access control (ACL) setiap menu existing TIDAK berubah (tidak ada role yang kehilangan akses atau dapat akses tambahan yang tidak seharusnya).
- **G6**: Setiap UI tabel 10+ kolom menggunakan pattern `overflow-x-auto` persis seperti tabel PSB list / Import batch, sehingga kolom tidak terpotong.

## Non-Goals (Diluar Scope — TIDAK dikerjakan phase ini)

- **NG1**: Menambah / mengubah schema database (table baru / migration baru). Semua data yang ditampilkan berasal dari tabel inventory YANG SUDAH ADA (inventory_items / inventory_movements / inventory_receipts / inventory_damaged / inventory_assets / device_lifecycle_logs) DENGAN CARA di-aggregate di level browser / client / pure function `buildKartuStokRows()` TANPA menambah API endpoint baru. Jika nanti butuh performance di masa depan, tambah server API = phase terpisah.
- **NG2**: Menambah menu / sidebar item baru / route folder baru di `/inventory/*`. (Ini justru yang dihindari user = Opsi B).
- **NG3**: Menambah Print PDF engine. Button cetak PDF sementara = `window.print()` dengan style media print sederhana. Engine PDF real (Puppeteer / PDFMake) = phase terpisah.
- **NG4**: Import data dari file Excel dokumen fisik ke DB. User hanya ingin MEMBACA / MEMVIEW / EXPORT ULANG dokumen dalam format web + excel, TIDAK meminta bulk import dokumen 12 screens.
- **NG5**: KASBON OPERASIONAL / Tagihan Listrik / BBM di TAB 3 Kantor = Cuma dijadikan placeholder link untuk nanti, TIDAK dikembangkan di spec ini.
- **NG6**: Menambah / mengubah workflow approval untuk transaksi keluar/masuk.

## Users & Peran Akses

User yang memakai 5 kategori fitur ini:
| Role | Akses Apa Saja di Opsi A? | Catatan |
|---|---|---|
| SUPER_ADMIN | Semua 4 page (items/reports/stock/assets/kantor) semua 5 kategori semua 9 TAB sub. | Default. |
| INVENTORY_ADMIN / GUDANG | items (4 TAB) + reports/stock (2 mode) + assets (2 TAB) + TIDAK BISA akses kantor? → Ikuti ACL existing `canAccessPath(session.role, '/inventory/kantor')` yang saat ini cuma SUPER_ADMIN. Phase 1 5 tidak mengubah ACL. Kalau inventory admin butuh akses kantor = nanti PR terpisah set `organization-workspace-access.ts`. | Hanya ubah ACL jika user explicit minta. Spec ini TIDAK UBAH ACL. |
| FINANCE_ADMIN | reports/stock (2 mode) + assets (TAB 2 Register Asset) → sesuai ACL existing. | Tidak ubah ACL. |
| NOC_OPERATOR | assets TAB 2 (Register) + items TAB 4 (Ceklis Maintenance untuk Splicer/OTDR/OPM) + kantor TAB 2 (Kendaraan). | Access cuma jika parent route di-allow ACL existing. |
| FIELD_TECHNICIAN / SALES / MARKETING / CS_ADMIN | Cuma bisa lihat TAB di route parent yang memang sudah di-allow ACL existing. Spec ini TIDAK memaksa akses untuk role ini. | Default mengikuti parent route access. |

## Functional Requirements (FR)

### FR1 — `/inventory/items` 4 TAB Panel Detail Item (Target Kategori A + E)
- **FR1.1**: Saat user klik 1 baris item di tabel kiri list item, panel detail kanan terbuka persis seperti existing. DI ATAS panel detail (sebelum judul "Kode Item") ditambahkan **Tab Bar Horizontal 4 tab**: `[① Info Dasar] [② Kartu Stok] [③ Riwayat Mutasi] [④ Ceklis Maintenance]`.
- **FR1.2**: Tab `① Info Dasar` = 100% sama persis UI existing (form edit data item: categoryCode/unitCode/itemName/barcode/rackCode/defaultPrice/minimumStock/currentStock/status). TIDAK ada perubahan function save / PUT / api — behavior save harus SAMA PERSIS tanpa ada bug baru.
- **FR1.3**: Tab `② Kartu Stok` — Isi:
  - **FR1.3.1**: Filter Bulan (dropdown bulan 1..12) + Tahun (number 2025..2030) default bulan berjalan tahun berjalan. Filter berlaku ke UI tabel dan ke Excel export.
  - **FR1.3.2**: 2 Tombol Export & Print di atas tabel: `[📥 Export Excel Kartu Stok]` & `[🖨️ Cetak PDF]`.
  - **FR1.3.3**: Tabel 7 kolom: `No | Hari/Tanggal | Kode | Nama | In | Out | Keterangan`. Kolom sticky No & Keterangan boleh wrap.
  - **FR1.3.4**: Data = gabung dari inventory_receipts (kolom In) + inventory_movements (kolom In/Out sesuai type) + inventory_damaged (kolom Out, baris background merah = retur/rusak) diurut tanggal ASC.
  - **FR1.3.5**: Satu Footer baris dengan background hijau muda bold: `TOTAL SISA` menampilkan `Σ In` / `Σ Out` / `Sisa Akhir = ΣIn - ΣOut`.
  - **FR1.3.6**: Export Excel (pattern copy dari `marketing-activity-manager.tsx:L363-L367`)
    - Nama file: `kartu-stok-${itemCode}-${year}-${month2digit}.xlsx`
    - 1 Sheet per item bernama `Kartu Stok - ${itemName}` (truncate name jika >31 char)
    - Row 1 (merge A1:G1 bold 14): `Nama Item : ${itemName}`
    - Row 2 (merge A2:G2 kecil): `Periode Bulan ${namaBulan} ${year}`
    - Row 4 = 7 kolom header tabel.
    - Row terakhir = total sisa sama persis UI footer.
- **FR1.4**: Tab `③ Riwayat Mutasi` (Simple, tanpa footer total):
  - Tabel 7 kolom sama seperti FR1.3.3 TAPI TIDAK ADA filter Bulan/Tahun (TAMPILKAN SEMUA sepanjang masa) & TIDAK ADA footer Total Sisa.
  - Cuma buat memudahkan teknisi trace kapan barang keluar masuk tanpa hitung sisa.
- **FR1.5**: Tab `④ Ceklis Maintenance` — HANYA VISIBLE & enabled JIKA item dalam kategori alat teknisi (categoryCode match list: `ALAT_TEKNISI`, `ALAT_UKUR`, `SPLICER`, `OTDR`, `OPM`, `TESTER`). Jika item bukan kategori tersebut, Tab 4 **DISABLED (abu-abu) / hidden** dan ketika user hover menampilkan tooltip "Hanya untuk kategori Alat Teknis / Alat Ukur.".
  - **FR1.5.1**: Form Header: `Minggu ke-` (nomor 1..9), `Bulan/Tahun`, `Tanggal Pengecekan` (date picker), `Petugas` (text / dropdown user).
  - **FR1.5.2**: Table checklist: `Poin Pemeriksaan (text)` | `Ya/Tidak (boolean radio button)` | `Catatan (text 1 line)`. Butir poin per kategori alat disimpan constant di `inventory-maintenance-checklist-items.ts`:
    - **Splicer** (6 butir: kondisi fisik, baterai&charger, mata pisau tajam, elektroda bersih, proses splicing stabil, dibersihkan setelah pakai).
    - **OTDR** (6 butir: layar&tombol, baterai cukup/charger, kalibrasi sesuai standar, hasil ukur loss&jarak sesuai ekspektasi, konektor port bersih tidak longgar, disimpan box pelindung).
    - **OPM** (5 butir: layar&tombol normal, pembacaan sinyal akurat, probe/kabel baik, mode dBm/mW sesuai kebutuhan, dibersihkan sehabis pakai).
    - Default fallback 4 butir generik untuk category lain yang match list tapi tidak punya spesifik butir.
  - **FR1.5.3**: Tombol `[💾 Simpan Ceklis Mingguan]` POST ke `/api/inventory/items/${code}/maintenance-checks`. API endpoint **BAIKNYA dibuat simple di phase 2 jika memang butuh persist.** Untuk phase awal scope minimal — boleh disimpan ke localStorage + button export. (Catatan: nanti di tasks.md diputuskan apakah endpoint baru dijadikan task optional).
  - **FR1.5.4**: Tombol `[📥 Export Rekap Ceklis Bulanan]` export 1 sheet per alat.

### FR2 — `/inventory/reports/stock` Mode View Ganda (Target Kategori B)
- **FR2.1**: Section panel table "Stok Aktif" existing di L108 `inventory-report-page.tsx`. DI ATAS section header panel ditambahkan **2 Button Segment Mode View**: `[① Ringkasan Stok (Default)]` & `[② Rekap Harian (Matrix Periode)]`. Default aktif = mode ① persis existing.
- **FR2.2**: Filter `Bulan/Tahun` di kanan segment mode, hanya muncul ketika mode ② aktif.
- **FR2.3**: Mode ② Rekap Harian (Matrix Per Tanggal):
  - **FR2.3.1**: Header 2 baris besar di atas tabel (merge di web & di Excel): "REKAP STOK BARANG" + "PT MEGA DATA PERKASA — BULAN {namaBulan} TAHUN {year}".
  - **FR2.3.2**: 2 tombol Export + Cetak.
  - **FR2.3.3**: Tabel matrix kolom: `Nama Barang (fixed kiri)` | `Satuan` | `01/mm/yyyy` | `02/mm/yyyy` | ... sampai tanggal terakhir di bulan itu.
  - **FR2.3.4**: Jika hari = Minggu `(new Date(y,m-1,d).getDay() === 0)` → header kolom di tabel web TULIS `MINGGU (06/09)` BUKAN cuma tanggal. SAMA PERSIS seperti screenshot user kolom "MINGGU".
  - **FR2.3.5**: Wrapper tabel `div.overflow-x-auto` agar 33 kolom untuk September tidak terpotong.
  - **FR2.3.6**: Export Excel pattern dari `support-tt-queue-panel.tsx:L278-L287` `aoa_to_sheet` merge cell header. Nama file `rekap-stok-harian-${namaBulan}-${year}.xlsx`, sheet = `Rekap ${namaBulan} ${year}`.
- **FR2.4**: Mode ① Ringkasan Stok existing TIDAK ADA PERUBAHAN APAPUN kecuali tombol mode di atasnya (hanya tampilan, data yang di-load untuk table ringkasan = SAMA PERSIS props.items).

### FR3 — `/inventory/assets` 2 TAB (Target Kategori C)
- **FR3.1**: Section tengah (bawah 3 kartu summary) di component `InventoryAssetsPage` ditambahkan Tab Bar horizontal 2 TAB: `[① Ringkasan Akumulasi (Default)]` & `[② Daftar Asset Tetap (Register)]`. Default TAB ① = konten existing persis tanpa perubahan.
- **FR3.2**: TAB ② Daftar Asset Tetap:
  - **FR3.2.1**: Filter Tahun (default tahun berjalan) di kiri, kanan atas: `[+ Tambah Asset Baru]` + `[📥 Export Excel Register Asset Tahunan]`.
  - **FR3.2.2**: Table 9 kolom = `Nama Barang | Kode Barang | Unit | Tanggal Pembelian | Tanggal Pengeluaran | PIC | Lokasi | Ket (Keterangan) | Harga (Rp)`.
  - **FR3.2.3**: Format tanggal SERAGAM di UI & Excel = `dd/mm/yyyy`. Jangan lagi campur `03-Jan-26` vs `01/09/2026` (bug dari dokumen fisik user = kita perbaiki tampilkan konsisten).
  - **FR3.2.4**: Required field Kode Barang ketika `[+ Tambah Asset Baru]`. Form tidak boleh submit tanpa Kode Barang (fix bug screenshot user: Kode Barang KOSONG semua 3 row).
  - **FR3.2.5**: Footer table total harga total perolehan = sum kolom Harga (tampilkan Rupiah format id-ID).
  - **FR3.2.6**: Export Excel file = `data-asset-tetap-${year}.xlsx`, Sheet "Asset ${year}", merge header "DATA ASSET TAHUN ${year} — PT MEGA DATA PERKASA". Isi kolom persis 9 kolom UI + footer total harga.
  - **FR3.2.7 (NG dipatuhi)**: Data persistence = pakai table inventory_assets YANG SUDAH ADA (tidak buat table / migration baru). Kalau schema existing kurang kolom (Tanggal Pengeluaran / PIC / Lokasi / Kode Barang), kita tambahkan via existing domain-service payload shape (jika field sudah ada di prisma schema tinggal tambah display). Spec ini TIDAK memaksa buat prisma migration baru. (Cek saat implementasi).

### FR4 — `/inventory/kantor` 3 TAB Workspace (Target Kategori D)
- **FR4.1**: Route `/inventory/kantor` menggunakan organization workspace pattern (kantorWorkspace di `organization-workspaces.ts`). Di dalam page workspace, TIDAK MENGHAPUS / MENGGANTI konten existing yang ditampilkan sekarang (Ritme Kantor / Antrean Inventory / Distribusi Internal / etc). Sebaliknya, kita **bungkus konten existing ke TAB ① dan tambah 2 TAB lagi**.
- **FR4.2**: Layout menggunakan **TAB VERTICAL SISI KIRI** (agar tidak memakan lebar header workspace) berisi 3 TAB:
  - **TAB ① `Ritme Kantor` (Default aktif)**: Konten existing `kantorWorkspace.sections` SAMA PERSIS. 100% tanpa perubahan teks / link / button CTA. Button CTA di ATAS page workspace existing (Antrean Inventory Kantor / Daily Activity) TETAP DILUAR tab, bisa diakses di SEMUA tab (tidak hilang).
  - **TAB ② 🆕 `Kendaraan Oprasional`**: Isinya sesuai Kategori D — Penggunaan Kendaraan Oprasional:
    - Filter Bulan & Tahun.
    - 2 Dropdown kecil: `Jenis Kendaraan` (Semua / Mobil / Motor), `Pengguna` (opsional).
    - Kiri atas `[+ Tambah Catatan Penggunaan Kendaraan]`, kanan atas `[📥 Export Excel Bulanan]`.
    - Tabel 7 kolom: `No | Hari/Tanggal | Nama Pengguna | Jenis Mobil/Motor | Jam Pengambilan | Nominal (Rp BBM/TOL) | Ket (Kegunaan)`.
    - Footer Total Nominal (SUM seluruh nominal bulan itu) format Rupiah.
    - Export Excel 2 Sheet: Sheet "Motor" & Sheet "Mobil" (difilter dari jenis). Header merge: "DAFTAR PENGGUNAAN KENDARAAN OPRASIONAL — BULAN ... TAHUN ...". Footer total nominal per sheet.
    - ACL existing untuk `/inventory/kantor` tetap. Jika NOC_OPERATOR / FINANCE tidak bisa akses route ini = karena ACL existing memang tidak allow. Spec ini tidak ubah ACL.
  - **TAB ③ `Kasbon & Utilitas (Rencana)`**: Placeholder sederhana: Tulisan "Fitur Kasbon Operasional & Utilitas (Listrik/Internet/BBM) direncanakan hadir di update berikutnya. Sementara ini gunakan TAB Kendaraan Oprasional untuk logistik harian." Button link ke `/finance` jika role allow. Jangan dikembangkan fitur ini di spec (NG5).
- **FR4.3**: TAB ③ placeholder tetap simpan walau tidak ada fitur → agar struktur 3 tab jelas untuk user mengetahui rencana update berikutnya & tidak bingung mengapa cuma 2 tab.

### FR5 — Fix Bug 5 Kartu Stok Historis (Fix di Semua Tempat yang Render List Transaksi)
Semua 5 bug B1..B5 terjadi di level rendering list rows transaksi (TAB 2 Kartu Stok & TAB 3 Riwayat Mutasi). Fix diletakkan DI DALAM pure function `buildKartuStokRows(rawRows)` di dalam `inventory-items-workspace-page.tsx` dan dipanggil sebelum rows masuk tabel UI dan sebelum rows masuk export xlsx. **TIDAK mengubah original state.items / original rawRows di API — hanya transform local copy.**
- **FR5.1 B1 No Numbering Bug**: Fix DUPLIKAT No=1 dua baris (case Modem F613 di screenshot) dan juga fix No KOSONG (sisa 12 screens lainnya). Logic: **Selalu iterate index mulai dari 0, write col `No = String(index + 1)`**. TIDAK BOLEH bergantung ke field existing `row.no` dari DB. Selalu nomor ulang 1..N berurutan.
- **FR5.2 B2 Tanggal Out Kosong**: Untuk baris yang field tanggal keluar `== null / "" / undefined` → render di kolom Hari/Tanggal text abu-abu italic: `"Belum diisi tanggal"` & highlight cell border kuning muda di UI. Di file Excel, tulis string `"Belum diisi tanggal"` agar jelas mana yang perlu user perbaiki data entry nanti.
- **FR5.3 B3 Format Tanggal Separator Hilang (bug `01/092026` tanpa `/` di tengah bulan dan tahun)**: Buat function `normalizeTanggalDisplay(raw)`:
  - Jika raw match regex `/^(\d{2})\/?(\d{2})\/?(\d{4})$/` → gabung paksa dengan `/` selalu.
  - Jika raw `Date` object → format ulang ke `dd/mm/yyyy`.
  - Hasil untuk UI & export Excel = SELALU ada 2 slash.
- **FR5.4 B4 Urutan Tanggal Terbalik (Agustus muncul SETELAH September di kartu stok)**: Logic sort `buildKartuStokRows` = **Selalu sort ascending oleh tanggal setelah dinormalisasi FR5.3**. Jika sama tanggal → sort oleh receipt terlebih dahulu, lalu movement keluar, lalu damaged.
- **FR5.5 B5 Kode Barang `.0011` Awalan Titik (konversi ke float secara tidak sengaja)**: `normalizeKodeDisplay(raw)` jika raw bertipe number / match regex `/^\.[0-9]+$/` → prepend `0` di depan atau jika aslinya seharusnya integer tanpa desimal → tangani parse explicit stringify tanpa parseFloat. Jika raw string `".0011"` hasil parse number → tampilkan sebagai `"0011"` (tanpa titik) & tampilkan tooltip hover cell bahwa kode terkonversi dari format number, disarankan perbaiki entry master.

## Non-Functional Requirements (NFR)

- **NFR1 Isolasi (Zero Integrasi Antar Menu Regress)**: Semua state baru untuk TAB & filter = HANYA local `useState` di component. TIDAK BOLEH menambahkan variable / update ke global context / domain-store / zustand / prisma client middleware.
- **NFR2 Zero Routing / ACL Change**: Tidak menambah folder baru di app/(app)/inventory. Tidak mengubah `access-control.ts`, `access-control-server.ts`, `organization-workspace-access.ts` di phase ini. (Jika user minta tambah akses role, dibuat PR terpisah).
- **NFR3 Zero API Contract Change Existing**: Endpoint `/api/inventory/items`, `/api/inventory/items/:code`, `/api/inventory/receipts` dll = contract request & response TIDAK DIUBAH. Jika butuh endpoint baru (contoh: POST maintenance checklist), hanya tambah file route BARU di folder `/api/inventory/items/:code/maintenance-checks` (file baru tidak merusak yang existing). Endpoint BARU TIDAK BOLEH mengubah skema response endpoint LAMA.
- **NFR4 Type Safety**: Semua komponen dan util lulus `apps/web $ npm run check` (tsc --noEmit) exit code 0 sebelum commit.
- **NFR5 Performance**: Untuk <= 300 transaksi per item, Kartu Stok tabel & export Excel load < 800ms di browser (tanpa loading skeleton jika memang <100 rows). Di mode matrix rekap harian 33 kolom 100 item <= 2000ms render.
- **NFR6 Konsistensi Pattern UI**: Pattern button `[📥 Export Excel]` styling = SAMA PERSIS dengan button export di `marketing-activity-manager.tsx` / `psb-list-workspace.tsx`. Jangan buat style tombol baru.
- **NFR7 Scroll Tabel**: Tabel > 8 kolom = WAJIB wrapper `overflow-x-auto` sticky top header, persis seperti `/imports` / `/psb/list`. TIDAK BOLEH kolom terpotong / layout hancur di viewport 1280px.
- **NFR8 Konsistensi Format Tanggal SERAGAM dd/mm/yyyy untuk semua tanggal baru di 5 kategori TAB di UI & export Excel. (Kecuali di ceklis maintenance ada label Minggu ke-n untuk tampilan ringkas saja, tetap field tanggal masuk ke string dd/mm/yyyy).

## Constraints, Dependencies, & Assumptions

- **C1 Constraint**: Scope perubahan TIDAK boleh keluar dari 4 file component inti + 1 util lib workspace definition:
  - `apps/web/components/inventory-items-workspace-page.tsx` (FR1 & FR5 paling besar)
  - `apps/web/components/inventory-report-page.tsx` (FR2)
  - `apps/web/components/inventory-assets-page.tsx` (FR3)
  - `apps/web/lib/organization-workspaces.ts` (FR4.2 isi content TAB 2 & TAB 3)
  - `apps/web/components/organization-workspace-page.tsx` (jika perlu inject vertical tab wrapper untuk FR4)
  - 1-2 komponen helper BARU kecil (misal `inventory-kartu-stok-table.tsx`, `inventory-maintenance-checklist-form.tsx`, `kantor-kendaraan-panel.tsx`) — BOLEH ditambahkan file baru TAPI HANYA component murni, TANPA routing & TANPA API server action.
- **C2 Constraint**: Tidak boleh install npm package baru. Excel export sudah menggunakan `xlsx: 0.18.5` yang existing.
- **D1 Dependency**: Existing API `GET /api/inventory/items` + receipts list + movements list + damaged list harus tetap available untuk browser aggregasi row kartu stok.
- **D2 Dependency**: Library `xlsx` yang sudah ada di package.json L38 web app.
- **A1 Asumsi**: Data asset tetap (Kategori C) field Tanggal Pengeluaran / PIC / Lokasi sudah tersedia (atau minimal bisa disimpan di JSON `metadata` field dalam table inventory_assets) tanpa migration prisma. Kalau ternyata schema prisma inventory_assets TIDAK punya kolom ini, implementasi TAB 2 asset register untuk 3 field tersebut = sementara disimpan di localStorage browser selama user belum explicit minta migration (ini akan ditandai task pending terpisah di tasks.md jika terbukti).
- **A2 Asumsi**: User nanti bersedia test visual Phase 1 s/d 5 satu per satu di environment preview sebelum di-merge ke main (untuk menghindari deploy langsung).
- **A3 Asumsi**: Saat maintenance checklist TAB 4 — user menyetujui jika fitur save ke DB dibuat optional endpoint baru di task terpisah dari UI; minimal UI form berjalan + export excel duluan.

## Open Questions (Dijawab Sebelum Approve Spec)

Sebenarnya 3 pertanyaan user sudah dijawab (sudah setuju Opsi A & setuju jalankan semua). Namun untuk implementasi tasks, 1 open question kecil yang akan di-putuskan saat melihat schema prisma di fase implementasi Task 0:
- **OQ1**: Apakah table Prisma `InventoryAsset` SUDAH punya kolom `purchaseDate` / `dispositionDate` / `picUser` / `location` / `kodeBarang`? Jika TIDAK punya, apakah kita:
  - **(a)** Sementara simpan di field JSON `metadata` existing (tanpa migration)
  - **(b)** Tambah migration prisma schema (karena memang data permanen harus persist)
  - **(c)** Sementara simpan di localStorage hanya di browser user login saja (tidak permanen)
  → Default spec ini pilih **(a)** jika memungkinkan (lihat schema di task 0). Kalau tidak bisa baru **(b)** PR migration.

---

## Acceptance Criteria (WAJIB PASS SEMUA)

AC = Daftar kriteria Acceptance yang harus tercapai di AKHIR implementasi. Semua bertipe `rule` (biner) atau `rubric` (skala).

| ID | Tipe | Criterion |
|---|---|---|
| AC1 | rule | Panel detail item `/inventory/items` — user klik 1 barang → panel kanan terbuka & ada 4 TAB horizontal di atasnya. TAB ① Info Dasar Default aktif & bisa submit edit Save (update) tanpa error message. |
| AC2 | rule | TAB ② Kartu Stok — Filter September 2026 untuk barang "Adaptor 1,5 A" → tabel 7 kolom menampilkan transaksi In = 100, Out = 3 (retur merah) + Out = 5 Terpakai PSB. Footer Total Sisa = 92. |
| AC3 | rule | Bug 5 kartu stok (B1..B5) TIDAK muncul di TAB 2 & TAB 3. Artinya (1) No berurut 1..N tidak duplikat, (2) Transaksi tanpa tanggal tertulis "Belum diisi tanggal" bukan cell kosong, (3) Semua tanggal format `dd/mm/yyyy` tidak pernah "01/092026" tanpa slash, (4) Urutan tanggal 2 transaksi selalu lama duluan (Agustus sebelum September), (5) Kode barang `.0011` tertulis `0011` tanpa titik. |
| AC4 | rule | Export Excel dari TAB ② Kartu Stok → File terbuka di MS Excel/Google Sheets, baris 1 merge A1:G1 tertulis "Nama Item : Adaptor 1,5 A", baris terakhir footer tertulis ΣIn = 100, ΣOut = 8, Sisa Akhir = 92. Semua 7 kolom ada & sesuai. |
| AC5 | rule | TAB ④ Ceklis Maintenance → barang kategori `OTDR` → Tab enabled & butir 6 pemeriksaan OTDR muncul (Layar & tombol / Baterai / Kalibrasi / Hasil ukur / Konektor / Box pelindung). Item Adaptor 1,5 A (bukan alat teknisi) → TAB 4 DISABLED / HIDDEN. |
| AC6 | rule | `/inventory/reports/stock` → Tombol segment mode view ① & ② muncul. Klik mode ② → filter bulan September 2026 → Table kolom header tanggal 06/09/2026 tertulis **MINGGU (06/09)** bukan angka 06/09 saja. Total 33 kolom bisa horizontal scroll. |
| AC7 | rule | Export Excel mode ② Rekap Harian → Sheet "Rekap September 2026" → Row 1 merge tertulis REKAP STOK BARANG PT MEGA DATA PERKASA. Header kolom tanggal Minggu juga tertulis MINGGU (06/09) seperti UI. Data Klem 6mm tanggal 01/09 = 50 sesuai dokumen. |
| AC8 | rule | `/inventory/assets` TAB ② Daftar Asset Tetap → tambah 1 asset baru MODAL tanpa Kode Barang → tombol submit tidak bisa (required = true). Form baru di-submit hanya jika Kode Barang terisi. Table 9 kolom muncul, footer SUM Harga = total Rupiah sesuai. |
| AC9 | rule | Export Excel TAB 2 Asset → file sheet "Asset 2026" 9 kolom persis UI, semua tanggal format `dd/mm/yyyy` TIDAK ADA lagi `03-Jan-26`. |
| AC10 | rule | `/inventory/kantor` → TAB vertical 3 muncul: Ritme Kantor (default) / Kendaraan Oprasional / Kasbon & Utilitas (placeholder). Konten TAB 1 lama: 3 steps + Fokus Kontrol Kantor Links SAMA PERSIS teks & href seperti sebelum diubah. Tidak ada link yang hilang / rusak. |
| AC11 | rule | TAB 2 Kendaraan Oprasional → Tambah 1 baris penggunaan lalu Export Excel. File punya 2 sheet Motor & Mobil. Nominal bulan yang sama di footer dijumlahkan dengan benar SUM. |
| AC12 | rule | Zero Regress 6 menu integrasi. Skenario: (a) PSB list → update status Installed. (b) Inventory movements list → stok barang berkurang 1 unit. (c) Klik item di inventory items → current stock di TAB 1 Info Dasar berkurang 1, di TAB 2 Kartu Stok tertambah 1 transaksi Out dengan No urut benar. Semua flow di atas TIDAK ADA error / crash / warning console. |
| AC13 | rule | Type Safety. Command `cd apps/web && npm run check` (tsc --noEmit) → Exit code 0. 0 error. |
| AC14 | rubric | Workflow fidelity / Isolasi. Scale 0-2. Pass threshold ≥2. 2 = Semua constraint C1/C2/NFR1..NFR3 diikuti 100%. Tidak ada route baru, tidak ada ACL baru, tidak ada package npm baru, tidak ada perubahan global store. 1 = Ada 1 pelanggaran ringan, misal install 1 package util kecil yang memang umum. 0 = Ada route baru di bawah /inventory dibuat, atau ACL access-control di-ubah, atau API contract existing berubah. |
| AC15 | rubric | Kesamaan Visual dengan 12 Screens. Scale 0-2. Pass threshold ≥2. 2 = Header merge row, nama kolom, warna baris merah rusak, footer total sisa, label "MINGGU" di tanggal Minggu = ≥90% mirip persis screenshot user. 1 = Ada sekitar 20% perbedaan urutan kolom / missing 1 field kecil, tapi core data ada. 0 = Struktur beda jauh tidak sesuai user. |
