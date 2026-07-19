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

- `ui-copy-first-refactor-plan.md`  
  Keputusan kerja aktif untuk refactor UI global ERP dengan strategi `copy-first UI, PRD-first backend`, termasuk source of truth tampilan per repo legacy, mapping menu ERP ke baseline lama, dan urutan eksekusi per cluster.

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

- `hybrid-wave-1a-psb-support-production-extraction-pack.md`  
  Paket extraction read-only untuk menarik JSON production `Isolation`, `DismantleTickets`, `DismantleHistory`, dan `TroubleTicket` dari terminal app `Web PSB` di Coolify.

- `hybrid-wave-1a-psb-support-production-runbook.md`  
  Runbook lokal untuk memuat empat file JSON production support inti `Web PSB` ke review DB, menjalankan transform production `Wave 1A`, dan mereview hasil final support.

- `hybrid-wave-1a-psb-support-production-results.md`  
  Rekap hasil riil eksekusi batch production support inti `Web PSB` di review DB lokal, termasuk angka final, anomali nyata, dan keputusan batch berikutnya.

- `hybrid-wave-1a-psb-tt-photo-production-extraction-pack.md`  
  Paket extraction read-only untuk menarik source production `TroubleTicketPhoto` dari terminal app `Web PSB` di Coolify ke format JSON yang siap dipakai pada batch evidence photo production.

- `hybrid-wave-1a-psb-tt-photo-production-runbook.md`  
  Runbook lokal untuk memuat `trouble-ticket-photo.production.json` ke review DB, menjalankan transform production evidence photo, dan memverifikasi linkage ke `support_trouble_tickets` final.

- `hybrid-wave-1a-psb-tt-master-production-extraction-pack.md`  
  Paket extraction read-only untuk menarik source production `TroubleTicketMaster` dari terminal app `Web PSB` ke format JSON yang siap dipakai pada batch katalog master support production.

- `hybrid-wave-1a-psb-tt-master-production-runbook.md`  
  Runbook lokal untuk memuat `trouble-ticket-master.production.json` ke review DB, menjalankan transform katalog `kind/value`, dan memverifikasi linkage ke `support_trouble_ticket_masters`.

- `hybrid-wave-1-priority-production-extraction-pack.md`  
  Paket extraction read-only untuk menarik source production `Priority` dari terminal app `Web PSB` ke format JSON yang siap dipakai pada batch master priority production.

- `hybrid-wave-1-priority-production-runbook.md`  
  Runbook lokal untuk memuat `priorities.production.json` ke review DB, menjalankan transform ke `master_priorities`, dan memverifikasi linkage final priority master.

- `hybrid-wave-1-whatsapp-template-production-extraction-pack.md`  
  Paket extraction read-only untuk menarik source production `WhatsappTemplate` dari terminal app `Web PSB` ke format JSON yang siap dipakai pada batch helper template WhatsApp production.

- `hybrid-wave-1-whatsapp-template-production-runbook.md`  
  Runbook lokal untuk memuat `whatsapp-templates.production.json` ke review DB, menjalankan transform ke `helper_whatsapp_templates`, dan memverifikasi hanya satu template default aktif.

- `hybrid-psb-production-readiness-2026-07-11.md`  
  Rekap readiness hybrid migration `Web PSB` setelah support core, `TroubleTicketPhoto`, `User`, `TroubleTicketMaster`, `Priority`, dan `WhatsappTemplate` production lulus, termasuk fokus hardening dan cutover berikutnya.

- `hybrid-psb-production-hardening-checklist.md`  
  Checklist hardening pasca seluruh batch production inti `Web PSB` lulus, mencakup data migration, workspace operator, UAT, write-side berisiko, observability, dan syarat sebelum masuk cutover.

- `hybrid-psb-production-cutover-checklist.md`  
  Checklist cutover hybrid `Web PSB` yang mengikat batch production nyata ke freeze data, validasi role fondasi, keputusan `GO / PILOT / ROLLBACK`, dan bukti minimum hari-H.

- `hybrid-psb-role-hardening-plan.md`  
  Rencana hardening operasional per role fondasi yang menerjemahkan checklist menjadi bukti minimum, urutan uji lapangan, dan syarat naik status `PILOT` atau `GO`.

- `hybrid-psb-go-live-timeline.md`  
  Timeline kerja praktis minggu-ke-minggu sampai `pilot` dan `go-live bertahap`, termasuk urutan role, freeze release, validasi teknis, dan keputusan pasca-pilot.

- `hybrid-wave-1-user-production-extraction-pack.md`  
  Paket extraction discovery read-only untuk menarik `User` production sekaligus menghitung distribusi `role` dan `division` sebagai dasar penguncian mapping ke `auth_users`, `auth_roles`, dan `org_divisions`.

- `hybrid-wave-1-user-production-runbook.md`  
  Runbook lokal untuk memuat `users.production.json` ke review DB, memetakan role/division legacy, lalu mengimpor user ke `auth_users` dengan role auth yang selaras dengan web baru.

- `hybrid-wave-1-psb-wave-1a-execution-checklist.md`  
  Checklist pasca-eksekusi `Wave 1A` untuk menilai hasil batch support extension dan ODP header secara cepat, konsisten, dan terdokumentasi.

- `hybrid-wave-1-psb-wave-1a-result-template.md`  
  Template laporan hasil run `Wave 1A` untuk menempelkan output runner, hasil query review, hasil assertion query, dan keputusan lanjut tanpa perlu merangkum manual.

- `hybrid-wave-1-psb-wave-1b-adapter-design.md`  
  Desain langkah lanjut setelah `Wave 1A`, dengan fokus pada adapter `Ticket` ke customer/order/subscription/work order, persiapan schema `CoveredArea` dan `MarketingActivity`, serta fondasi native ERP untuk `network_odp_ports`.

- `hybrid-wave-1-psb-wave-1b-ticket-runbook.md`  
  Runbook eksekusi `Wave 1B Ticket split` untuk menguji jalur `Ticket -> staging customer/order -> customer/address/order/subscription/work order` pada review DB lokal.

- `hybrid-wave-1b-psb-ticket-production-extraction-pack.md`  
  Paket extraction read-only untuk menarik JSON production `Ticket` dari terminal app `Web PSB` di Coolify ke format yang siap dimuat ke review DB lokal.

- `hybrid-wave-1b-psb-ticket-production-runbook.md`  
  Runbook lokal untuk memuat `ticket.production.json` ke staging review DB, menjalankan transform production `Wave 1B Ticket`, dan mereview hasil final secara lokal di XAMPP.

- `hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md`  
  Runbook eksekusi `Wave 1C` untuk menguji jalur `CoveredArea` dan `MarketingActivity` ke model sales ERP baru, sekaligus bootstrap native `network_odp_ports` dari header ODP yang sudah tervalidasi.

- `hybrid-wave-2-psb-production-mini-batch.md`  
  Rencana mini-batch produksi pertama yang aman dari `Web PSB` setelah sample review `Wave 1A`, `Wave 1B`, dan `Wave 1C`, dengan scope prioritas coverage, marketing activity, ODP header, bootstrap ODP port, dan TT SLA.

- `hybrid-wave-2-psb-production-extraction-pack.md`  
  Paket query dan langkah read-only untuk menarik data production `CoveredArea`, `MarketingActivity`, `psb_odp`, dan `TroubleTicketSla` dari terminal app `Web PSB` di Coolify ke format JSON yang siap dipakai pada mini-batch produksi pertama.

- `hybrid-wave-2-psb-local-loader-runbook.md`  
  Runbook lokal untuk mengubah file JSON production `Wave 2` menjadi SQL staging review DB, menjalankan transform production mini-batch, dan mereview hasil final secara lokal di XAMPP.

- `xampp_review_wave2_production_assertions.sql`  
  Assertion query read-only untuk merangkum status `PASS / BLOCKED` batch production `Wave 2` setelah loader, transform, dan bootstrap ODP port selesai.

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

- `web-operational-final-backlog.md`  
  Backlog teknis final lintas divisi untuk `List PSB`, `List Dismantle`, ownership `ODP/Port`, domain `Finance`, penguatan `HR`, dan pemisahan workspace teknisi berdasarkan keputusan bisnis terbaru.

- `web-list-psb-implementation-spec.md`  
  Desain teknis implementasi `List PSB` sebagai domain baru di antara `Penjualan`, `CS`, dan `Ticketing`, lengkap dengan status, data model, service, API, permission, audit trail, dan fase implementasi.

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
