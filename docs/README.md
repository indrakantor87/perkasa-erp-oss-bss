# Docs Index

## Dokumen Utama

- `xampp-setup.md`  
  Langkah setup MySQL XAMPP sebagai review DB agar web bisa langsung membaca data nyata.

- `blueprint.md`  
  Arah besar modul, domain, dan workflow sistem baru.

- `phase-1-roadmap.md`  
  Urutan implementasi phase 1 dan output minimum review.

- `data-mapping.md`  
  Mapping field dan entitas dari tiga aplikasi lama ke schema baru.

- `hybrid-migration-playbook.md`  
  Playbook keputusan kerja untuk migrasi hybrid dari `Web PSB`, `Web Finance`, dan `Web GA`, dengan pembagian jelas antara peran database production, repo legacy, dan target akhir ERP/OSS/BSS.

- `hybrid-wave-1-inventory.md`  
  Inventaris gelombang 1 repo legacy lokal yang sudah tersedia, termasuk menu kerja inti, tabel/model utama, file prioritas untuk copy-first, dan mapping awal ke modul ERP baru.

- `hybrid-wave-1-psb-table-matrix.md`  
  Matriks tabel `Web PSB` yang memetakan source table/model legacy ke tabel staging, tabel final ERP, modul target, dan status kesiapan transform.

- `hybrid-wave-1-psb-production-db-checklist.md`  
  Checklist akses database production `Web PSB` di Coolify, termasuk opsi kredensial yang dibutuhkan, query inventaris minimum, tabel prioritas, dan guardrail read-only sebelum penarikan schema/data nyata.

- `hybrid-wave-1-psb-production-final-mapping.md`  
  Mapping final `Web PSB production` ke staging, tabel final ERP, aturan normalisasi, dan keputusan mana yang harus tetap copy-first versus dibentuk ulang di ERP berdasarkan hasil audit schema, constraint, dan sample data nyata.

- `hybrid-wave-1-psb-wave-1a-import-design.md`  
  Desain batch `wave 1A staging/import` untuk `Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`, `TroubleTicketPhoto`, `TroubleTicketSla`, dan `psb_odp`, termasuk patch schema minimum serta urutan eksekusi yang direkomendasikan.

- `hybrid-wave-1-psb-wave-1a-runbook.md`  
  Runbook eksekusi sample dan transform `Wave 1A` `Web PSB`, termasuk runner PowerShell, urutan SQL manual, dan query review hasil final table.

- `hybrid-wave-1-psb-wave-1a-execution-checklist.md`  
  Checklist pasca-eksekusi `Wave 1A` untuk menilai hasil batch support extension dan ODP header secara cepat, konsisten, dan terdokumentasi.

- `hybrid-wave-1-psb-wave-1a-result-template.md`  
  Template laporan hasil run `Wave 1A` untuk menempelkan output runner, hasil query review, hasil assertion query, dan keputusan lanjut tanpa perlu merangkum manual.

- `hybrid-wave-1-psb-wave-1b-adapter-design.md`  
  Desain langkah lanjut setelah `Wave 1A`, dengan fokus pada adapter `Ticket` ke customer/order/subscription/work order, persiapan schema `CoveredArea` dan `MarketingActivity`, serta fondasi native ERP untuk `network_odp_ports`.

- `hybrid-wave-1-psb-wave-1b-ticket-runbook.md`  
  Runbook eksekusi `Wave 1B Ticket split` untuk menguji jalur `Ticket -> staging customer/order -> customer/address/order/subscription/work order` pada review DB lokal.

- `phase-1-erd.md`  
  Ringkasan relasi antar tabel phase 1 berdasarkan schema review XAMPP.

- `platform-architecture.md`  
  Constraint arsitektur satu database, satu domain, dan satu website untuk platform final.

- `schema-phase-1-1.md`  
  Penjelasan patch schema lanjutan untuk coverage, billing, ODP port, dan device assignment.

- `staging-import.md`  
  Struktur tabel staging, status import, dan alur review migrasi dari sistem lama.

- `master-mapping.md`  
  Template mapping master untuk menyatukan role, division, branch, package, dan status legacy.

- `core-master-seed.md`  
  Seed minimum untuk master utama agar mapping dan sample import punya referensi valid.

- `auth-review-seed.md`  
  Seed user review minimum untuk menguji auth internal pada `auth_users` dan `auth_roles`.

- `master-mapping-seed.md`  
  Seed awal translasi nilai legacy agar sample import bisa langsung diuji.

- `sample-import.md`  
  Contoh batch kecil untuk menguji staging, mapping, dan sample `Wave 1A` support extension/ODP header sebelum import nyata.

- `staging-transform.md`  
  Transform tahap awal dari staging ke tabel final untuk domain inventory dan HR.

- `staging-transform-stage-2.md`  
  Transform tahap 2 dari staging ke tabel final untuk customer, address, order, dan subscription.

- `staging-transform-stage-3.md`  
  Transform tahap 3 dari staging ke tabel final untuk work order dan domain support.

- `staging-transform-stage-4.md`  
  Transform tahap 4 dari staging ke tabel final untuk invoice, payment, dan collection.

- `schema-gap.md`  
  Daftar gap schema, prioritas iterasi berikutnya, dan rekomendasi tabel tambahan.

- `prd-web-checklist.md`  
  Checklist status implementasi web terhadap requirement PRD aplikasi web utama.

- `import-file-format.md`  
  Format file JSON/XLSX/XLS/CSV yang didukung Import Center web untuk memuat row staging otomatis.

- `versioning.md`  
  Aturan versioning, changelog, dan pola release project.

- `web-psb-integration-week-1.md`  
  Playbook integrasi 1 minggu untuk menarik domain aman dari `web-psb-perkasa` ke ERP tanpa mengganggu sistem lama.

- `web-psb-field-matrix-week-1.md`  
  Matriks field-by-field untuk `Ticket`, `Isolation`, `TroubleTicket`, dan `ODP` sebagai dasar staging, validasi, dan rekonsiliasi minggu pertama.

- `web-psb-parity-matrix.md`  
  Matriks parity role, menu, aksi, flow, dan logic antara `web-psb-perkasa` dan ERP baru sebagai syarat sebelum cutover penuh.

- `web-psb-role-action-parity.md`  
  Matriks detail parity per role, menu, dan aksi untuk mengukur kesiapan operasional ERP baru menggantikan web lama.

- `web-psb-target-role-design.md`  
  Desain role ERP target untuk menggantikan role generik bootstrap dan menyamai struktur kerja operasional `web-psb-perkasa`.

- `web-psb-flow-checklist.md`  
  Checklist flow parity per role untuk validasi go/no-go cutover dari web lama ke ERP baru.

- `web-psb-target-permission-matrix.md`  
  Permission matrix target untuk role ERP baru sebagai dasar perubahan akses, guard, dan menu ERP.

- `web-psb-module-gap-plan.md`  
  Gap implementasi per modul untuk menentukan prioritas pengerjaan parity setelah role dan permission matrix target dikunci.

- `web-role-division-menu-feature-catalog.md`  
  Inventaris aktual role aktif, divisi, menu sidebar, fitur domain, dan kolom layar web untuk membaca ERP dari perspektif operasional per role.

- `web-role-cutover-readiness.md`  
  Matriks keputusan readiness `GO/PILOT/PARTIAL/NO-GO` per role/divisi untuk menentukan gelombang pilot dan cutover berdasarkan implementasi web aktual.

- `web-list-kerja-terpadu-prd.md`  
  PRD detail modul `List Kerja Terpadu` sebagai pengganti menu legacy `list`, termasuk route, queue per role, kolom, filter, dan CTA lintas domain.

- `org-division-baseline.md`  
  Baseline struktur divisi ERP, termasuk keputusan bahwa fase awal migrasi berpusat pada Divisi `Pemasaran dan Pelayanan` sebelum integrasi ke divisi lain.

- `web-pemasaran-pelayanan-uat-checklist.md`  
  Checklist UAT khusus fase awal Divisi `Pemasaran dan Pelayanan`, berisi flow wajib, bukti lulus, dan urutan uji per role inti legacy.

- `web-go-live-cutover-checklist.md`  
  Checklist hari-H untuk deploy Senin, mencakup timeline cutover, PIC minimum, kriteria `go / pilot / rollback`, dan validasi bisnis minimum per role fondasi.

- `web-deploy-rehearsal-checklist.md`  
  Checklist latihan deploy sebelum hari-H, termasuk command rehearsal, data durasi yang harus dicatat, dan kriteria rehearsal berhasil.

- `web-list-kerja-terpadu-implementation-spec.md`  
  Spesifikasi implementasi route `/dashboard/worklist` untuk modul `List Kerja Terpadu`, termasuk kontrak data, query param, tab queue, layout, dan integrasi dashboard.

- `dashboard-kpi-customization-prd.md`  
  PRD kustomisasi KPI dashboard agar manager per divisi dapat menambah, mengubah, menghapus, dan mengurutkan KPI secara aman per scope divisi/sub-divisi.

## Dokumen Aplikasi Web

- `.trae/documents/prd-aplikasi-web-utama.md`  
  Kebutuhan produk untuk shell aplikasi web utama.

- `.trae/documents/arsitektur-teknis-aplikasi-web-utama.md`  
  Arah teknis bootstrap aplikasi web, route utama, dan API dasar.
