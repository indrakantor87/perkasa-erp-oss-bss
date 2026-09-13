# G23.75 — TASKS.md (Implementasi Queue)
Spec Acuan: [spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/specs/g23-75-inventory-12screens-opsi-a/spec.md)

---

## TASK 0 (PREFLIGHT) — Pemeriksaan Schema Prisma Inventory Asset & Komponen Existing Wrapper
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | high |
| AC Coverage | OQ1 spec (Open Question schema asset); NFR4 type safety; |
| Keterangan | Jalankan sebelum Phase 1. Cek 3 hal tanpa mengubah kode: (1) Buka Prisma schema table InventoryAsset ada kolom apa saja (purchaseDate? dispositionDate? pic? location? kodeBarang?). (2) Cek component OrganizationWorkspacePage saat ini support TAB vertical atau kita perlu wrap manual. (3) Cek signature InventoryReportPage & InventoryAssetsPage ada prop extendable untuk inject TAB. |
| Scope File / Path yang disentuh (READ-ONLY, 0 edit): | prisma/schema.prisma (table InventoryAsset & InventoryMovement); components/organization-workspace-page.tsx; components/inventory-report-page.tsx signature props; |
| Hasil Preflight yang harus dicatat sebelum Task 1 jalan: | (a) Strategy simpan field Asset yang tidak ada di schema: metadata JSON / migration? (b) Perlu / tidak perlu membuat subcomponent TAB wrapper, atau inline div button sudah cukup. |
| TR0.1 | rule — Jalankan `apps/web $ npm run check` → exit 0 sebelum edit code apapun. Tercatat SHA commit baseline. |
| TR0.2 | rule — Baca Prisma schema table InventoryAsset, InventoryMovement, InventoryReceipt, InventoryDamaged. Catat semua field name & type untuk dipakai di pure function aggregation buildKartuStokRows(). TIDAK BOLEH salah nama field (case-sensitive!). |
| TR0.3 | rule — Cek apakah OrganizationWorkspacePage SUDAH support slot children untuk inject TAB. Jika TIDAK support → catat perlu edit wrapper signature component menambahkan prop opsional `verticalTabs?: {key:string;label:string;content:ReactNode}[]` default empty array (non breaking). |
| Completion Evidence | |

---

## TASK 1 — Phase 1: UI TAB 4 Panel Detail Item `/inventory/items` (FR1.1, FR1.2)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | high |
| AC Coverage | AC1, AC13 (type safety), NFR1 (isolasi state TAB useState local) |
| Scope File Edit: | `apps/web/components/inventory-items-workspace-page.tsx` |
| Keterangan | TAMBAHKAN TAB 4 horizontal DI ATAS panel detail selectedItem (sebelum judul "Kode Item"). State tab local useState<'info'|'kartu'|'mutasi'|'ceklis'>('info'). Default TAB ① Info Dasar = render konten existing selectedItem persis 100% tanpa mengubah function save / PUT / handleDeactivate. TIDAK boleh rusak save/edit existing. TAB ② ③ ④ = sementara isi "Coming Soon" / component kosong, hanya untuk memastikan struktur TAB berfungsi & bisa switch tanpa re-render berat / state hilang. |
| TR1.1 | rule — Klik 5 item berbeda di tabel kiri → panel kanan terbuka dengan TAB 4 selalu muncul di atas. |
| TR1.2 | rule — TAB ① Info Dasar Default aktif. Submit 1 edit perubahan minimumStock = 5 → save sukses, toast success muncul, table kiri refresh, panel detail minimumStock = 5 PERSIS seperti behavior existing SEBELUM TAB ditambahkan (TIDAK BOLEH ada regression edit). |
| TR1.3 | rule — Klik TAB ② ③ ④ → konten placeholder muncul. Klik kembali ke TAB ① → state edit form (value yang diketik user di kolom minimumStock text input) TIDAK hilang / ke-reset. (Gunakan key atau letakkan form component di luar conditional render TAB untuk preserve state DOM). |
| TR1.4 | rubric — Isolasi state TAB. Scale 0..2. Pass threshold ≥2. 2 = state TAB disimpan HANYA di useState lokal component InventoryItemsWorkspacePage (tidak ada global context). Unmount component (pindah route ke /dashboard lalu kembali) → state TAB reset ke default info (benar). 1 = 1 small global leak minor. 0 = state TAB bocor ke global store / semua item share state (salah). |
| Completion Evidence | |

---

## TASK 2 — Phase 2: Kartu Stok UI + Fix Bug 5 Historis + Export Excel (FR1.3 + FR5.1..FR5.5)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | high |
| AC Coverage | AC2, AC3, AC4, AC13 |
| Scope File: | `apps/web/components/inventory-items-workspace-page.tsx` (inject TAB 2) + tambah file baru `apps/web/components/inventory/kartu-stok-table.tsx` (hanya table murni pure) + util function baru di workspace untuk buildKartuStokRows() + normalizeTanggalDisplay() + normalizeKodeDisplay() |
| Keterangan | Implementasi TAB ② Kartu Stok: Filter Bulan/Tahun, Tombol Export Excel, 7 kolom tabel, footer Total Sisa hijau. PENTING: Semua 5 bug B1-B5 di-fix dalam 1 pure function `buildKartuStokRows(rawRows)` sebelum masuk table & sebelum masuk export xlsx. Pattern export xlsx copy persis dari marketing-activity-manager.tsx L363-L367. Jangan buat logic baru. |
| TR2.1 | rule — Item `Adaptor 1,5 A` (code: contoh ADAPTOR-1.5A atau sesuai DB). TAB 2 filter Bulan 9 / 2026. In=100, Out=8 (3 retur merah + 5 syamsul). Sisa Akhir = 92 di footer. (sesuai screenshot user). |
| TR2.2 | rule — B5 FIX: Test mock object `{movementCode: 0.0011, movementType: 'OUT'}`. normalizeKodeDisplay() hasil = "0011" (tanpa dot di depan). |
| TR2.3 | rule — B3 FIX: Mock `tanggal = "01/092026"` → normalizeTanggalDisplay() = "01/09/2026" selalu ada 2 slash. |
| TR2.4 | rule — B4 FIX: Array row tanggal `['01/09/2026','02/08/2026']` setelah sort buildKartuStokRows → urutan output = [02/08 dulu, 01/09 kemudian]. (Agustus sebelum September ASC). |
| TR2.5 | rule — B1 FIX: Loop 12 rows tanpa field `no` → col No UI = 1..12 berurutan. Jika row asli ada field `no` yang sama (duplikat 2 row = 1) → harusnya TIDAK dipakai, tetap overwrite jadi urutan index+1. |
| TR2.6 | rule — B2 FIX: Row dengan tanggal null → cell UI = italic abu "Belum diisi tanggal", cell background kuning muda. Export Excel kolom Hari/Tanggal juga tertulis string "Belum diisi tanggal" (bukan string kosong). |
| TR2.7 | rule — Klik `[📥 Export Excel]` → Download file < 3000ms. Buka di Excel: Merge A1:G1 baris 1 = "Nama Item : Adaptor 1,5 A". Baris terakhir footer hijau di-export dengan background hijau (jika xlsx bisa cell fill, jika tidak minimal bold). Σ In = 100, Σ Out = 8, Sisa Akhir = 92. |
| TR2.8 | rule — TAB ③ Riwayat Mutasi juga memakai function buildKartuStokRows yang SAMA (TAPI HANYA tanpa footer TOTAL SISA & tanpa filter Bulan/Tahun). Nomor urut B1 FIX, tanggal B3, sort B4 juga berlaku di TAB 3 ini. |
| Completion Evidence | |

---

## TASK 3 — Phase 3: Ceklis Maintenance TAB 4 (Kategori E)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | medium |
| AC Coverage | AC5 (visible/hidden by category) |
| Scope File: | `apps/web/components/inventory-items-workspace-page.tsx` (inject TAB 4) + file baru `apps/web/components/inventory/maintenance-checklist-form.tsx` |
| Keterangan | Implementasi TAB ④ Ceklis Maintenance: Butir poin per kategori constant file baru. Export rekap bulanan. Save persistence = sementara localStorage dulu dengan key `maint-checklist-${itemCode}-W${minggu}-${YYYY-MM}`. Endpoint POST = task 3b opsional nanti jika user butuh share antar user. |
| TR3.1 | rule — Adaptor 1,5 A (category ALAT_TIDAK = false). TAB 4 tombol disabled / tidak muncul. Hover jika ada = tooltip. |
| TR3.2 | rule — Klik item OTDR (category = OTDR). TAB 4 enabled. Table 6 butir OTDR muncul. |
| TR3.3 | rule — 3 button Ya/Tidak/Radio per butir bisa dipilih, catatan diisi. Simpan localStorage → refresh page → state checklist masih ada (auto-load dari localStorage). |
| TR3.4 | rule — Export rekap → 1 sheet per alat untuk September 2026. |
| Completion Evidence | |

---

## TASK 4 — Phase 4: `/inventory/reports/stock` 2 Mode View (Kategori B)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | high |
| AC Coverage | AC6, AC7, NFR7 scroll tabel |
| Scope File: | `apps/web/components/inventory-report-page.tsx` (inject segment mode + render mode 2 matrix) |
| Keterangan | 2 button segment view di atas panel "Stok Aktif". Default mode ① = persis existing. Mode ② = Filter Bulan/Tahun, header 2 baris besar rekap stok barang, matrix 33 kolom tanggal September, kolom Minggu label MINGGU, export excel aoa_to_sheet pattern support-tt-queue L278-L287. |
| TR4.1 | rule — Default refresh page → segment mode ① aktif. Table existing "Stok item berdasarkan item master" muncul persis. Tidak ada perubahan query / data props. |
| TR4.2 | rule — Klik segment ② → Filter Bulan/Tahun muncul. Tabel header kolom tanggal "06/09/2026 (Minggu)" = tertulis "MINGGU (06/09)". |
| TR4.3 | rule — Horizontal scroll viewport 1280px: 33 kolom bisa discroll ke kanan tanpa terpotong (overflow-x-auto). |
| TR4.4 | rule — Export Excel. Row 1 merge: "REKAP STOK BARANG PT MEGA DATA PERKASA". Row 2 merge = bulan & tahun. Kolom tanggal Minggu (06/09) di header tertulis "MINGGU (06/09)". Data Klem 6mm 01/09 = 50 sesuai. |
| Completion Evidence | |

---

## TASK 5 — Phase 5: `/inventory/assets` 2 TAB Daftar Asset Register (Kategori C)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | high |
| AC Coverage | AC8, AC9, OQ1 |
| Scope File: | `apps/web/components/inventory-assets-page.tsx` |
| Keterangan | Tambah 2 TAB horizontal bawah ringkasan summary kartu. TAB 2 = table 9 kolom, filter tahun, button tambah asset (required kode barang). Format tanggal dd/mm/yyyy konsisten. Strategy OQ1 simpan field tidak ada di schema Prisma: pilih (a) JSON metadata field jika ada, (b) migration, atau (c) localStorage dulu. Lihat hasil Task 0 preflight. Export Excel pattern marketing-activity-manager. |
| TR5.1 | rule — TAB 1 default = konten existing ringkasan akumulasi nilai asset persis. Tidak ada regression. |
| TR5.2 | rule — TAB 2 daftar asset. Tombol "+ Tambah Asset Baru" membuka modal. Submit tanpa Kode Barang → required error. Submit dengan Kode Barang → row baru muncul di table. |
| TR5.3 | rule — Semua tanggal Tampilkan format dd/mm/yyyy. TIDAK ada format dd-Mon-yy. |
| TR5.4 | rule — Footer table total harga = sum Rupiah sesuai data. |
| TR5.5 | rule — Export excel. Sheet Asset 2026, kolom 9 persis UI, merge header row. Tanggal format dd/mm/yyyy. |
| Completion Evidence | |

---

## TASK 6 — Phase 6: `/inventory/kantor` TAB 2 Kendaraan Oprasional (Kategori D)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | medium |
| AC Coverage | AC10, AC11 |
| Scope File: | `apps/web/lib/organization-workspaces.ts` (update kantorWorkspace.sections / buat field baru verticalTabs di OrganizationWorkspaceDefinition type). Atau `apps/web/components/organization-workspace-page.tsx` inject TAB vertical wrapper. |
| Keterangan | 3 TAB vertical sisi kiri. TAB 1 default = konten existing kantorWorkspace persis (3 steps + Fokus Kontrol Kantor Links TETAP ADA). TAB 2 = Daftar Penggunaan Kendaraan 7 kolom. TAB 3 = Placeholder Kasbon. CTA di ATAS page workspace (Antrean Inventory Kantor / Daily Activity) TETAP ADA DAN BISA DIKLIK di SEMUA TAB. |
| TR6.1 | rule — TAB 1 Default aktif. Link "Antrean Inventory Kantor" & "Inventory Aktif" dll = SAMA PERSIS href dan teks. Tidak rusak. |
| TR6.2 | rule — TAB 2 Kendaraan Oprasional: Tambah 1 baris No=1, Jenis=Mobil, Nominal=150000. Export Excel → Sheet Mobil ada row itu. Sheet Motor kosong. Footer Total Nominal = 150.000 Rupiah. |
| TR6.3 | rule — TAB 3 Placeholder: text rencana update, link ke finance jika role allow. |
| Completion Evidence | |

---

## TASK 7 — Integrasi & Type Safety Final + Zero Regress (FR5 Global / NFR)
| Detail | Nilai |
|---|---|
| Status | pending |
| Priority | high |
| AC Coverage | AC12 (zero regress 6 menu), AC13 (tsc --noEmit 0 errors), AC14 workflow fidelity, AC15 visual |
| Scope File: | SELURUH file yang sudah di-edit Task 1-6 + npm run check full. |
| Keterangan | Test manual 6 skenario regress: (1) Edit item save, (2) Create Receipt barang masuk, (3) Create Movement keluar, (4) Create damaged retur, (5) PSB install trigger movement, (6) Support TT replace. Semua 6 skenario = TIDAK ADA error / crash / state rusak. |
| TR7.1 | rule — cd apps/web && npm run check. Exit 0. 0 errors tsc. |
| TR7.2 | rule — Manual test 1: Inventory items klik barang → Edit minimum stock → Save. Sukses. TAB 1 Info Dasar + handleDeactivate masih bekerja. |
| TR7.3 | rule — Manual test 2: Receipt page (jika ada akses) buat Receipt Qty 5 for Adaptor 1,5A. Back to TAB 2 Kartu Stok → In bertambah 5, No urut bertambah, Sisa Akhir bertambah 5. |
| TR7.4 | rule — Manual test 3: Movement Out 1 unit. Tab 2 kartu stok → row bertambah Out 1, warna normal, Sisa Akhir berkurang 1. |
| TR7.5 | rule — Manual test 4: Inventory damaged create retur. Tab 2 kartu stok → row Out tambah, warna merah, keterangan retur. |
| TR7.6 | rubric — Workflow fidelity AC14. Score ≥2. Checklist constraint: (a) No route baru? (b) No package npm baru? (c) No global context / store baru? (d) No ACL access-control diubah? 2 = Semua 4 checklist YES. 1 = 1 NO. 0 = 2+ NO. |
| TR7.7 | rubric — Visual kesesuaian AC15. Score ≥2. Compare 12 screens asli vs UI + export excel. 2 = Header merge, nama kolom, warna retur merah, footer total sisa hijau, tulisan MINGGU = 90% mirip. 1 = 70-80% mirip, ada 1-2 perbedaan minor. 0 = struktur beda. |
| Completion Evidence | |

---

## TASK QUEUE RINGKAS PRIORITAS
1. Task 0 PREFLIGHT → Jalankan PERTAMA (agar tidak membatalkan Task 5 nanti ketika schema tidak sesuai).
2. Task 1 (TAB 4 items) → Task 2 (Kartu Stok + Bug Fix) → Task 3 (Ceklis Maintenance).
3. Parallel boleh jalan Task 4 (Reports/stock matrix) + Task 5 (Assets 2 TAB) + Task 6 (Kantor TAB Kendaraan) karena tidak saling bergantung file.
4. Task 7 Final = SELALU TERAKHIR.
