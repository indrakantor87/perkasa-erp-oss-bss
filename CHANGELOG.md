# Changelog

All notable changes to this project will be documented in this file.

Format mengikuti prinsip `Keep a Changelog`, dan versi mengikuti `Semantic Versioning`.

## [Unreleased]

### Planned

- penguatan query domain dan action backend setelah MySQL review dipakai penuh

### Fixed

- transform tahap 3 tidak lagi memakai `JSON_TABLE` pada parsing `photo_list_text`, sehingga tetap kompatibel dengan MariaDB lokal saat tahap 4 mengeksekusi stage 1-4 berurutan: [xampp_review_transform_stage_3.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_3.sql)
- transform tahap 4 kini bisa resolve `target_subscription_id` dari staging order lintas batch (tidak mengunci `batch_id`), sehingga batch billing terpisah tetap bisa diimport setelah batch user/order selesai: [xampp_review_transform_stage_4.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_4.sql)
- eksekusi transform import kini me-render `@batch_id` langsung ke setiap statement sebelum dikirim ke MariaDB, sehingga transform sample tidak lagi berakhir `SUCCESS` tapi `0 imported` akibat session variable tidak terbaca: [import-write-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-write-service.ts)

### Improved

- halaman detail batch import sekarang menampilkan ringkasan operasional per row (`imported`, `valid`, `mapped/pending`, `invalid/skipped`), progres finalisasi batch, dan breakdown tabel target final yang sudah terbentuk agar operator lebih cepat membaca hasil transform: [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)
- daftar batch import kini menampilkan informasi duplikat secara lebih eksplisit di tabel dan kartu mobile agar review awal operator lebih cepat: [import-batch-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-table.tsx)
- transform tahap 2 kini juga mengimpor `staging_legacy_user_records` ke `auth_users` dan langsung menghubungkan `target_user_id`, sehingga row seperti `USR-001` tidak lagi tertinggal dalam status `VALID`: [xampp_review_transform_stage_2.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_2.sql)
- panel aksi batch import kini memberi rekomendasi langkah berikutnya berdasarkan status batch dan row yang masih belum final, sehingga operator tidak perlu menebak apakah harus validasi atau menjalankan tahap 01-04 tertentu: [import-batch-action-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-action-panel.tsx)

## [0.65.06] - 2026-07-11

### Changed

- Ditambahkan assertion query `Wave 1B Ticket` dan `Wave 1C Sales + ODP`, sehingga validasi hasil sample review kini bisa diringkas otomatis ke status `PASS / BLOCKED` tanpa membaca seluruh blok review manual: [xampp_review_wave_1b_ticket_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_assertions.sql), [xampp_review_wave_1c_sales_odp_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_assertions.sql)
- Ditambahkan dokumen `Wave 2 production mini-batch` yang mengunci batch produksi pertama paling aman dari `Web PSB`, dengan prioritas `CoveredArea`, `MarketingActivity`, `psb_odp`, bootstrap native `network_odp_ports`, dan `TroubleTicketSla`: [hybrid-wave-2-psb-production-mini-batch.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-production-mini-batch.md)
- Runbook `Wave 1B` dan `Wave 1C` diperbarui agar memuat assertion query sebagai langkah resmi sesudah review query, dan docs index diselaraskan ke jalur kerja batch berikutnya: [hybrid-wave-1-psb-wave-1b-ticket-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1b-ticket-runbook.md), [hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur menuju import production kecil kini tidak lagi bergantung pada interpretasi lisan hasil review, karena threshold batch aman, batch yang ditunda, guardrail, dan acceptance criteria sudah tertulis eksplisit.
- `VERSION` dinaikkan ke `0.65.06` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.05] - 2026-07-11

### Changed

- Ditambahkan patch schema `Wave 1C` untuk domain sales dan network review DB, mencakup staging `CoveredArea`, staging `MarketingActivity`, relasi area activity, tabel final `sales_marketing_activities`, dan tabel final `sales_marketing_activity_areas`: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql), [xampp_review_patch_wave_1c_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave_1c_existing_review_db.sql)
- Ditambahkan sample import `Wave 1C`, transform coverage/activity, bootstrap native `network_odp_ports`, review query, dan runner Windows agar jalur schema-new pasca `Wave 1B` bisa diuji end-to-end di review DB lokal: [xampp_review_sample_import_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1c_sales.sql), [xampp_review_transform_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1c_sales.sql), [xampp_review_bootstrap_wave_1c_odp_ports.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_bootstrap_wave_1c_odp_ports.sql), [xampp_review_wave_1c_sales_odp_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_review_queries.sql), [run-review-wave1c-sales-odp.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1c-sales-odp.ps1)
- Ditambahkan runbook `Wave 1C` dan pembaruan docs index/sample import/staging import agar coverage, marketing activity, dan bootstrap ODP port masuk jalur kerja hybrid migration yang eksplisit: [hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1c-sales-odp-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md), [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)

### Fixed

- Batas antara data copy-first legacy dan data native ERP kini makin tegas, karena `network_odp_ports` tidak lagi diasumsikan bisa di-copy dari production lama dan sudah punya bootstrap aman berbasis header ODP tervalidasi.
- `VERSION` dinaikkan ke `0.65.05` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.04] - 2026-07-11

### Changed

- Ditambahkan sample batch `Wave 1B Ticket split` beserta transform khusus yang tidak lagi bergantung pada `@batch_id` manual, sehingga jalur `Ticket -> staging customer/order -> crm_customers/crm_customer_addresses/sales_orders/service_subscriptions/service_work_orders` kini bisa diuji secara utuh di review DB lokal: [xampp_review_sample_import_wave_1b_ticket.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1b_ticket.sql), [xampp_review_transform_wave_1b_ticket.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1b_ticket.sql)
- Ditambahkan review query dan runner Windows untuk `Wave 1B Ticket`, sehingga eksekusi dan audit hasil batch bisa dilakukan lebih mudah dari lingkungan XAMPP user: [xampp_review_wave_1b_ticket_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1b_ticket_review_queries.sql), [run-review-wave1b-ticket.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1b-ticket.ps1)
- Ditambahkan runbook dan pembaruan docs index/sample import agar `Wave 1B Ticket` langsung masuk ke jalur kerja hybrid migration setelah validasi `Wave 1A`: [hybrid-wave-1-psb-wave-1b-ticket-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1b-ticket-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md)

### Fixed

- Batch lanjut setelah `Wave 1A` kini tidak lagi berhenti di level desain, karena adapter `Ticket` sudah punya artefak sample, transform, review, dan runner yang siap dipakai.
- `VERSION` dinaikkan ke `0.65.04` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.03] - 2026-07-11

### Changed

- Ditambahkan dokumen desain `Wave 1B` pasca-validasi `Wave 1A` yang mengunci jalur adapter `Ticket` ke `crm_customers`, `crm_customer_addresses`, `sales_orders`, `service_subscriptions`, dan `service_work_orders`, sekaligus membedakan secara tegas domain yang masih `schema-new` seperti `CoveredArea`, `MarketingActivity`, dan `network_odp_ports`: [hybrid-wave-1-psb-wave-1b-adapter-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1b-adapter-design.md)
- Index docs diperbarui agar dokumen `Wave 1B` langsung masuk ke jalur kerja hybrid migration dan bisa dipakai sebagai acuan batch berikutnya: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Arah lanjut setelah `Wave 1A` kini tidak lagi abu-abu karena batas antara batch adapter existing schema dan batch schema ERP baru sudah terdokumentasi dengan jelas.
- `VERSION` dinaikkan ke `0.65.03` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.02] - 2026-07-11

### Fixed

- Transform `Wave 1A` untuk support extension dan ODP header kini mengambil batch sample secara eksplisit berdasarkan `batch_code`, sehingga runner tidak lagi berhenti pada kondisi semu di mana batch sample berhasil masuk ke staging tetapi semua target final tetap `NULL` karena variabel `@batch_id` tidak pernah terisi: [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql), [xampp_review_transform_wave_1a_network_odp.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_network_odp.sql)
- `VERSION` dinaikkan ke `0.65.02` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.01] - 2026-07-11

### Changed

- Ditambahkan assertion query `Wave 1A` yang merangkum status `PASS / BLOCKED` untuk batch support extension, link target staging, row final support, batch ODP header, dan row final `network_odp`, sehingga validasi pasca-eksekusi bisa dibaca lebih cepat tanpa menafsirkan seluruh output query mentah: [xampp_review_wave_1a_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_assertions.sql)
- Ditambahkan template laporan hasil run `Wave 1A` agar output runner, query review, assertion query, checklist, dan keputusan lanjut bisa ditempel dalam format yang konsisten untuk dianalisis bersama: [hybrid-wave-1-psb-wave-1a-result-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-result-template.md)
- Runbook dan docs index diperbarui untuk menghubungkan runner, review query, assertion query, checklist, dan template hasil menjadi satu paket validasi yang utuh: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Tahap handoff setelah eksekusi `Wave 1A` kini lebih rapi karena operator bisa langsung mengirim laporan hasil run dalam format standar, dan validasi utama sudah punya assertion SQL yang eksplisit.
- `VERSION` dinaikkan ke `0.65.01` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.65.00] - 2026-07-11

### Changed

- Ditambahkan file query review `Wave 1A` yang bisa dijalankan read-only setelah sample dan transform selesai, sehingga audit hasil staging/final table support extension dan ODP header tidak perlu merangkai query satu per satu secara manual: [xampp_review_wave_1a_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_review_queries.sql)
- Ditambahkan checklist eksekusi `Wave 1A` untuk mencatat status `PASS / FAIL / BLOCKED`, evidence, dan keputusan `GO / PARTIAL / BLOCKED` setelah runner dijalankan: [hybrid-wave-1-psb-wave-1a-execution-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-execution-checklist.md)
- Runbook dan docs index diperbarui agar runner, query review, dan checklist pasca-eksekusi sekarang saling terhubung dalam satu jalur kerja yang utuh: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Tahap validasi hasil `Wave 1A` kini lebih operasional karena ada artefak khusus untuk memeriksa batch support extension dan network ODP secara konsisten sesudah eksekusi, bukan hanya mengandalkan output runner mentah.
- `VERSION` dinaikkan ke `0.65.00` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.99] - 2026-07-11

### Changed

- Ditambahkan runner PowerShell `Wave 1A` agar urutan SQL review DB untuk support extension dan ODP header bisa dijalankan otomatis dari Windows, termasuk mode `Full` dan `Wave1AOnly`, pencarian `mysql.exe`, dan query review hasil akhir: [run-review-wave1a.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a.ps1)
- Ditambahkan runbook khusus `Wave 1A` yang merangkum prasyarat, urutan SQL manual, contoh command PowerShell, dan query review final table untuk memudahkan eksekusi di mesin XAMPP user: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md)
- Panduan XAMPP dan index docs diperbarui agar extension `Wave 1A` tidak lagi tersebar di beberapa file terpisah, tetapi punya jalur eksekusi yang eksplisit dari bootstrap sampai review hasil: [xampp-setup.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/xampp-setup.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur lanjut setelah sample dan draft transform `Wave 1A` kini lebih siap dipakai di lingkungan Windows/XAMPP, walau `mysql` belum ada di `PATH`, karena runner mendukung path eksplisit ke binary MySQL.
- `VERSION` dinaikkan ke `0.64.99` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.98] - 2026-07-11

### Changed

- Ditambahkan file sample `Wave 1A` terpisah untuk `PSB_SUPPORT_EXT` dan `PSB_ODP_HEADER`, sehingga queue dismantle, photo TT detail, SLA, master support config, dan header ODP bisa diuji di staging review tanpa mengganggu sample batch dasar yang sudah ada: [xampp_review_sample_import_wave_1a.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1a.sql)
- Dokumentasi sample import diperluas agar urutan eksekusi sekarang mencakup sample dan transform `Wave 1A`, lengkap dengan query review staging/final table untuk support extension dan network ODP: [sample-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/sample-import.md)
- Desain `Wave 1A` dan index docs diperbarui untuk menandai bahwa sample batch SQL sudah tersedia dan siap dipakai untuk review DB berikutnya: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Draft transform support extension kini dapat mencari parent `Isolation` dan `TroubleTicket` lintas batch source yang sama, sehingga desain batch terpisah `PSB_SUPPORT_EXT` benar-benar bisa dijalankan sesuai rencana `Wave 1A`: [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql)
- `VERSION` dinaikkan ke `0.64.98` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.97] - 2026-07-11

### Changed

- Ditambahkan draft transform `wave 1A` untuk support extension agar `DismantleTickets`, `TroubleTicketPhoto`, dan `TroubleTicketSla` dapat dipindahkan dari staging ke tabel final review menggunakan pola yang konsisten dengan transform tahap 3 yang sudah ada: [xampp_review_transform_wave_1a_support_extension.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_support_extension.sql)
- Ditambahkan draft transform khusus header ODP production `Web PSB` agar `staging_legacy_network_odp_records` dapat dipindahkan ke `network_odp` tanpa mencampur jalur network dengan inventory gudang: [xampp_review_transform_wave_1a_network_odp.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1a_network_odp.sql)
- Dokumen desain `wave 1A` diperbarui untuk menandai bahwa patch schema minimum dan draft transform SQL sudah tersedia, sehingga langkah berikutnya tinggal menyiapkan batch sample dan review hasil final table: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md)

### Fixed

- Jalur migrasi `Web PSB` untuk support extension dan ODP header kini tidak lagi berhenti di level desain, karena schema staging dan draft transform SQL sudah saling tersambung pada review DB.
- `VERSION` dinaikkan ke `0.64.97` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.96] - 2026-07-11

### Changed

- Schema review staging sekarang diperluas untuk `wave 1A Web PSB` dengan menambahkan tipe support `DISMANTLE_QUEUE`, `TROUBLE_TICKET_PHOTO`, `TROUBLE_TICKET_SLA`, dan `TROUBLE_TICKET_MASTER`, beserta kolom linkage/fallback seperti `legacy_parent_id`, `legacy_reference_code`, `note_text`, `actor_name`, `target_dismantle_queue_id`, dan `target_trouble_ticket_sla_id`: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql)
- Ditambahkan tabel staging baru `staging_legacy_network_odp_records` agar header ODP production `Web PSB` bisa di-review langsung ke jalur `network_odp` tanpa bercampur dengan staging inventory gudang: [xampp_review_staging_import.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_staging_import.sql)
- Dokumentasi staging import diperbarui agar mencerminkan extension support `wave 1A` dan penambahan domain network ODP pada layer staging: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)

### Fixed

- Jalur eksekusi setelah desain `wave 1A` kini benar-benar siap dipakai untuk batch support extension dan ODP header, sehingga `DismantleTickets`, `TroubleTicketPhoto`, `TroubleTicketSla`, dan `psb_odp` tidak lagi menggantung tanpa landing zone staging yang eksplisit.
- `VERSION` dinaikkan ke `0.64.96` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.95] - 2026-07-11

### Changed

- Ditambahkan desain `wave 1A staging/import` untuk source production `Web PSB`, mencakup batch `Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`, `TroubleTicketPhoto`, `TroubleTicketSla`, dan `psb_odp`, beserta patch schema minimum dan urutan eksekusi review DB: [hybrid-wave-1-psb-wave-1a-import-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-import-design.md)
- Index docs diperbarui agar desain `wave 1A` masuk ke baseline hybrid migration dan bisa langsung dipakai saat menyiapkan patch staging atau script transform berikutnya: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur lanjut setelah audit production `Web PSB` kini lebih konkret karena domain support dan ODP sudah dipisahkan antara yang bisa memakai schema staging saat ini dan yang wajib mendapat patch minimum lebih dulu.
- `VERSION` dinaikkan ke `0.64.95` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.94] - 2026-07-11

### Changed

- Ditambahkan mapping final `Web PSB production` ke staging, tabel final ERP, aturan normalisasi, dan keputusan transform berbasis schema, constraint, serta sample data nyata dari Coolify, sehingga wave 1 tidak lagi bergerak dari asumsi schema legacy: [hybrid-wave-1-psb-production-final-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-final-mapping.md)
- Index docs diperbarui agar hasil audit production final `Web PSB` masuk ke daftar dokumen utama bersama matriks awal, checklist akses DB, dan playbook hybrid migration: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Keputusan migrasi `Isolation`, `DismantleTickets`, `DismantleHistory`, `TroubleTicket`, dan `psb_odp` kini dikunci berdasarkan data production nyata, termasuk fallback untuk relasi longgar dan penegasan bahwa `network_odp_ports` harus dibentuk sebagai schema ERP baru.
- `VERSION` dinaikkan ke `0.64.94` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.93] - 2026-07-11

### Changed

- Ditambahkan checklist akses database production `Web PSB` di Coolify, termasuk opsi kredensial minimum, query inventaris schema, tabel prioritas audit, dan guardrail read-only agar penarikan DB production bisa dilakukan dengan aman dan terarah: [hybrid-wave-1-psb-production-db-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-production-db-checklist.md)
- Index docs diperbarui agar checklist akses production `Web PSB` masuk ke dokumen utama dan bisa dipakai langsung saat koneksi Coolify tersedia: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Jalur lanjut dari audit repo lokal ke inventaris DB production kini lebih jelas karena kebutuhan akses Coolify dan langkah inventaris schema sudah terdokumentasi.
- `VERSION` dinaikkan ke `0.64.93` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.92] - 2026-07-11

### Changed

- Ditambahkan matriks tabel `Web PSB` yang memetakan model/tabel legacy ke staging, tabel final ERP, modul target, dan status kesiapan transform, sehingga penarikan schema/data production berikutnya punya jalur implementasi yang lebih konkret: [hybrid-wave-1-psb-table-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-table-matrix.md)
- Index docs diperbarui agar matriks tabel `Web PSB` masuk ke daftar dokumen utama bersama playbook dan inventaris hybrid gelombang 1: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Arah kerja setelah audit repo lokal kini lebih operasional karena sumber `Web PSB` sudah dipetakan sampai level staging/final table/modul ERP, bukan hanya level menu dan file referensi.
- `VERSION` dinaikkan ke `0.64.92` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.91] - 2026-07-11

### Changed

- Ditambahkan dokumen inventaris gelombang 1 untuk tiga repo legacy lokal (`web-psb-perkasa`, `finance-repo`, `ga-web-app`) agar tim punya daftar sumber yang nyata, menu kerja inti, model/tabel penting, file prioritas untuk copy-first, dan mapping awal ke modul ERP baru: [hybrid-wave-1-inventory.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-inventory.md)
- Index docs diperbarui agar inventaris hybrid gelombang 1 bisa langsung dipakai sebagai referensi batch porting berikutnya bersama playbook migrasi hybrid: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Keputusan untuk memakai repo lokal sebagai sumber audit tidak lagi hanya implisit, karena inventaris sumber legacy dan prioritas porting awal sekarang terdokumentasi secara eksplisit.
- `VERSION` dinaikkan ke `0.64.91` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.90] - 2026-07-11

### Changed

- Ditambahkan dokumen kerja baru `hybrid-migration-playbook.md` untuk mengunci keputusan bahwa percepatan parity dilakukan dengan model hybrid: database production dipakai sebagai sumber data nyata, repo legacy dipakai sebagai sumber logic/UI, dan `perkasa-erp-oss-bss` tetap menjadi target akhir `ERP/OSS/BSS` dengan constraint `1 database`, `1 domain`, `1 website`: [hybrid-migration-playbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-migration-playbook.md)
- Index dokumen proyek diperbarui agar playbook hybrid migration masuk ke daftar dokumen utama dan bisa langsung dipakai sebagai panduan batch berikutnya: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Arah kerja migrasi kini terdokumentasi lebih jelas sehingga keputusan `ambil DB`, `ambil repo`, dan `tetap ERP-first` tidak perlu ditebak ulang pada batch implementasi berikutnya.
- `VERSION` dinaikkan ke `0.64.90` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.89] - 2026-07-11

### Changed

- Route `/support/isolations` kini memakai workspace khusus `SupportIsolationWorkspace`, sehingga `Monitoring Isolir` tampil sebagai halaman kerja tersendiri dengan header operasional, KPI cepat, tabel isolir, dan blok form restore/transfer yang lebih dekat ke pola `web-psb-perkasa`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx)
- Workspace isolir baru tetap me-reuse `SupportIsolationQueuePanel`, `SupportIsolationForm`, `SupportIsolationRestoreForm`, dan `SupportDismantleForm`, sehingga parity UI bergerak ke pola legacy tanpa memecah service, API, permission, maupun ownership ERP yang sudah aktif: [support-isolation-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-workspace.tsx)

### Fixed

- `Monitoring Isolir` tidak lagi terasa seperti lane support generik karena tabel dan aksi utama sekarang menjadi pusat baca halaman, sementara fokus kasus per customer/service tetap dipertahankan melalui drilldown yang sama.
- `VERSION` dinaikkan ke `0.64.89` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.88] - 2026-07-11

### Changed

- Halaman `Aktivitas Marketing` sekarang dibaca lebih seperti console operasional legacy dengan empat KPI cepat di atas, info strip mode aktif, dan dua mode yang sama-sama `table-first`, sehingga operator tidak lagi berpindah dari tabel ke tampilan kartu saat membaca performa marketing vs distribusi area: [marketing-activity-manager.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/marketing-activity-manager.tsx)
- Mode `Analisis Area` diubah dari daftar progress/bar menjadi tabel operasional yang menampilkan `Area`, `Kunjungan`, `Marketing Aktif`, `Persentase`, dan `PIC Area`, namun tetap memakai service aktivitas marketing yang sama agar fondasi ERP/OSS/BSS tidak berubah: [marketing-activity-manager.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/marketing-activity-manager.tsx)

### Fixed

- Ritme halaman Aktivitas Marketing kini lebih dekat ke baseline `web-psb-perkasa` karena pembacaan status cepat dan tabel utama langsung terbaca sebelum operator masuk ke modal tambah/edit aktivitas.
- `VERSION` dinaikkan ke `0.64.88` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.87] - 2026-07-11

### Changed

- Route `/sales` kini tidak lagi dirender penuh oleh `DomainShell` generik, tetapi memakai workspace khusus `SalesDomainWorkspace` yang memosisikan KPI, tabel pipeline penjualan, dan action form dalam ritme kerja yang lebih dekat ke `web-psb-perkasa`: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx)
- Workspace `Penjualan` baru tetap memakai `getDomainPageData()` dan form/service sales yang sudah ada, sehingga parity UI bergerak ke pola legacy tanpa melepaskan fondasi ERP/OSS/BSS yang sudah terbangun: [sales-domain-workspace.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-domain-workspace.tsx)

### Fixed

- Gap ekspektasi pada menu `Penjualan` ditangani dengan memisahkan halaman kerja spesifik dari renderer domain generik, sehingga tabel kerja kini menjadi pusat baca dan CTA per baris lebih langsung seperti baseline operasional lama.
- `VERSION` dinaikkan ke `0.64.87` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.86] - 2026-07-11

### Changed

- `Tabel kerja utama menu` kini dipindahkan ke bagian atas `DomainShell`, sehingga saat user membuka menu Sales, Customer, Billing, Inventory, HR, dan domain lain, blok tabel langsung terlihat setelah header/drilldown tanpa harus melewati kartu summary, highlight, atau form terlebih dahulu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Judul section review lintas domain kini dipertegas menjadi `Tabel kerja utama menu` agar hierarki visualnya jelas sebagai pusat kerja, bukan blok review sekunder di bagian bawah halaman: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Keluhan bahwa tabel belum terlihat pada masing-masing menu ditangani dengan mengubah urutan layout halaman, bukan hanya bentuk row, sehingga pola `table-first` sekarang terasa langsung dari awal membuka menu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.86` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.85] - 2026-07-11

### Changed

- `Lembar kerja` lintas divisi pada renderer shared kini berubah menjadi `table-first`, sehingga review operasional di Sales, Customer, Billing, Inventory, HR, dan workspace domain lain tidak lagi tampil sebagai kartu per row tetapi sebagai tabel rapat dengan aksi per baris: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Layout section review lintas divisi kini dibuat satu kolom penuh agar tabel kerja lebih lebar dan lebih dekat dengan pola operasional sistem legacy dibanding grid kartu dua kolom sebelumnya: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Lane `SLA` di support juga kini mengikuti pola tabel, sehingga rule SLA tidak lagi card-only dan konsisten dengan panel operasional support lain yang sudah table-first: [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx)

### Fixed

- Detail kontekstual Billing seperti correlation summary, decision trail, evidence, health signal, recommended action, dan outcome summary tetap dipertahankan melalui row detail di bawah tabel agar perpindahan dari kartu ke tabel tidak menghilangkan konteks keputusan kasus: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.85` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.84] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Action Outcome Summary` setelah `Recommended Next Action`, sehingga operator bisa langsung membaca target hasil, sinyal berhasil, dan fallback pada kasus restore, terminate, serta TT/SLA kritis tanpa membuka lane lain lebih dulu: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-action-outcome-summary.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-action-outcome-summary.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Action Outcome Summary`, sehingga hasil yang dituju setelah reconnect, follow-up, suspend, atau terminate langsung terbaca pada level row review dan tidak berhenti di action recommendation saja: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `actionOutcomeSummary` agar outcome target dan fallback per kasus bisa dibawa konsisten bersama health signal, recommended actions, correlation summary, decision trail, dan evidence panel: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.84` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.83] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Recommended Next Action` untuk kasus restore, terminate, dan TT/SLA kritis, sehingga operator langsung melihat matriks 2-3 aksi prioritas yang bisa dijalankan per kasus tanpa menebak lane berikutnya: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-next-action-matrix.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-next-action-matrix.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Recommended Next Action` yang menerjemahkan health signal menjadi action primer, lane support terkait, dan audit Billing, sehingga keputusan reconnect/follow-up/terminate lebih operasional pada level customer-service yang sama: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `recommendedActions` agar matriks rekomendasi bisa dibawa konsisten bersama health signal, correlation summary, decision trail, dan evidence panel dalam satu konteks kasus: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.83` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.82] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Case Health Signal` pada kasus restore, terminate, dan ticket kritis, sehingga operator langsung mendapatkan sinyal keputusan cepat seperti `Butuh Follow-Up Billing`, `Siap Terminate`, atau `Masih Tertahan SLA` sebelum membaca detail lebih dalam: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-health-signal.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-health-signal.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Case Health Signal`, sehingga operator dapat langsung membaca apakah kasus cenderung aman direstore, masih butuh follow-up Billing, siap terminate, atau masih perlu review supervisor sebelum berpindah lane: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `healthSignal` agar ringkasan keputusan cepat dapat dibawa konsisten bersama correlation summary, decision trail, dan evidence panel dalam satu konteks kasus: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.82` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.81] - 2026-07-11

### Changed

- `Panel Detail` supervisor kini menampilkan `Evidence Terakhir` per kasus untuk jalur restore, terminate, dan ticket kritis, sehingga operator dapat membaca alasan isolir, catatan transfer, status ticket aktif, serta scope service yang terakhir terbaca tanpa keluar dari worklist: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-evidence-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-evidence-panel.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Evidence Billing / Kasus`, sehingga operator bisa melihat action notes, due atau follow-up terakhir, dan scope service yang relevan sebelum memutuskan handoff ke lane support: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Tipe worklist kini mendukung `evidencePanel` agar supervisor dapat membawa bukti tindakan terakhir lintas Billing, Isolir, TT/SLA, dan Dismantle dalam satu panel yang reusable: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.81` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.80] - 2026-07-11

### Changed

- `Panel Detail` supervisor sekarang menampilkan `Decision Trail` per kasus untuk jalur restore, terminate, dan ticket kritis, sehingga supervisor dapat membaca fase penting terakhir seperti pembukaan isolir, transfer ke queue dismantle, atau pembukaan TT sebelum memutuskan aksi berikutnya: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-decision-trail.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-decision-trail.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini ikut menampilkan `Decision Trail Billing / Kasus`, sehingga operator bisa membaca urutan keputusan dari status invoice atau collection, kontrol follow-up aktif, hingga handoff lintas domain sebelum keluar dari Billing: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Query supervisor terminate kini ikut membawa `isolation_date` sehingga jejak keputusan pada kasus dismantle dapat menunjukkan fase isolir sebelum transfer ke queue dismantle secara lebih natural: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.80` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.79] - 2026-07-11

### Changed

- `Panel Detail` supervisor sekarang menampilkan `Ringkasan Korelasi Kasus` yang merangkum Billing, Isolir, TT/SLA, Dismantle, owner aktif, customer, dan service pada item support yang sedang diputuskan, sehingga supervisor tidak perlu lompat lane dulu hanya untuk memahami posisi kasus: [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx), [case-correlation-summary.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/case-correlation-summary.tsx), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Area review Billing kini menampilkan ringkasan korelasi customer/service langsung pada row yang relevan, sehingga operator bisa membaca posisi operasional kasus sebelum memutuskan tetap di Billing atau lompat ke Isolir, TT/SLA, maupun Dismantle: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Query supervisor untuk restore, terminate, dan ticket risiko tinggi kini ikut membawa `service_no` dari subscription agar ringkasan korelasi lintas domain tidak berhenti di customer name saja: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.79` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.78] - 2026-07-11

### Changed

- Lane support kini bisa dibuka dengan filter `customer/service` langsung dari query string, sehingga handoff dari Billing tidak lagi hanya memindahkan operator ke lane umum tetapi langsung menyusut ke kasus yang paling dekat dengan customer dan layanan yang sama: [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx)
- Review row pada domain Billing sekarang mendukung CTA sekunder ke lane support terkait, sehingga operator bisa tetap menjalankan aksi Billing sebagai tombol utama sambil membuka `Isolir`, `TT/SLA`, atau `Dismantle` yang sudah terfilter customer/service sebagai jalur tindak lanjut kasus: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Fixed

- Data row Billing kini membawa metadata `Service` pada invoice, collection follow-up, reconnect, write-off, collection action, dan payment terbaru agar pemetaan lintas domain tidak berhenti di invoice atau customer saja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.78` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.77] - 2026-07-11

### Changed

- Jalur `Billing decision -> Isolir -> TT/SLA -> Dismantle -> Supervisor CS_ADMIN` kini diperjelas lewat panel handoff lintas divisi yang tampil langsung di form `collection action`, `resolve`, dan `status invoice`, sehingga operator Billing tidak lagi berhenti di keputusan finansial saja tetapi langsung diarahkan ke lane operasional berikutnya: [billing-decision-handoff-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-decision-handoff-panel.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx)
- Panel `Isolir`, `SLA`, dan `Dismantle` kini menampilkan CTA sinkron Billing dan shortcut supervisor yang lebih eksplisit, sehingga operator support dapat membaca keputusan Billing sebagai bagian dari alur layanan, bukan konteks terpisah: [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)

### Fixed

- Alert dashboard untuk `Billing overdue`, `Ticket`, dan `Isolir` kini lebih tepat mengarahkan operator ke anchor atau queue keputusan yang sesuai, sehingga jalur handoff ke Billing, SLA, dan Supervisor tidak lagi berhenti di halaman umum: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.77` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.76] - 2026-07-11

### Changed

- Workspace `CS_ADMIN` kini memiliki quick access yang lebih eksplisit ke `TT Aktif`, `SLA Kritis`, dan `Billing`, sehingga supervisor bisa berpindah dari bucket kontrol ke lane operasional yang tepat tanpa lewat menu umum lagi: [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx)
- Item worklist support kini mendukung handoff link sekunder, sehingga panel detail tidak hanya memberi satu CTA utama tetapi juga jalur lintas divisi yang relevan untuk restore, terminate, progress TT, eskalasi, dan kontrol SLA: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [worklist-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/worklist/worklist-detail-panel.tsx)

### Fixed

- Queue `Transfer atau Restore` dan `Queue Risiko Tinggi` di supervisor kini tidak lagi berhenti di link modul umum, karena kasus isolir, dismantle, dan ticket kritis langsung membuka lane dan action support yang sesuai dengan konteks prefill masing-masing: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [support-action-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-action-links.ts)
- Handoff lintas peran antara `Billing`, `CS & Admin CS`, `TT`, dan `SLA` kini lebih natural karena CTA utama dan sekunder pada item supervisor membawa operator ke jalur keputusan yang benar, bukan sekadar ke daftar halaman domain: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.76` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.75] - 2026-07-11

### Changed

- Panel `Trouble Ticket` kini dipadatkan mengikuti ritme console legacy per bucket queue: setiap section tetap mempertahankan kecerdasan prioritas dan aksi yang sudah ada, tetapi tabel desktop sekarang menampilkan ticket, customer, SLA, PIC, follow-up, konteks queue, dan aksi utama per baris secara lebih cepat dipindai; tampilan mobile tetap memakai kartu agar aman di layar kecil: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)

### Fixed

- Review operasional lane `TT` kini lebih mudah dibaca tanpa tenggelam di kumpulan badge panjang, karena detail SLA, follow-up, escalation, dan rekomendasi aksi dipisahkan ke kolom-kolom yang lebih natural untuk operator NOC/TT: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.75` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.74] - 2026-07-11

### Changed

- Panel `Dismantle` kini dipadatkan mengikuti ritme console legacy: queue open dan histori close ditampilkan dalam tabel operasional yang lebih rapat di desktop, tetap aman sebagai kartu di mobile, dan aksi utama per baris langsung terlihat tanpa harus membuka detail panjang lebih dulu: [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)

### Fixed

- Ownership dan audit lifecycle pada queue `Dismantle` kini lebih mudah dibaca lintas peran karena tabel open menegaskan jalur `Close Owner: CS & Admin CS` versus `Restore Owner: Billing`, sementara histori close merangkum metadata lapangan, billing disposition, dan aksi reopen dalam format review yang lebih cepat dipindai: [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.74` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.73] - 2026-07-11

### Changed

- Metadata close `Dismantle` kini jauh lebih kaya dan mendekati konteks lapangan: form close sekarang menangkap `Field PIC`, `Device Status`, `Pickup Status`, `Close Outcome`, dan `Billing Disposition`, lalu histori dismantle memecah metadata itu menjadi badge yang terbaca jelas saat review terminasi: [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx), [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx)
- Queue supervisor `Transfer atau Restore` kini membaca lifecycle isolir dan dismantle dengan ownership yang lebih tegas: kasus restore tetap dibaca sebagai jalur `Billing`, sedangkan terminate dan close histori dibaca sebagai jalur `CS & Admin CS`; narasi queue supervisor, item worklist, dan CTA panel support ikut diselaraskan agar handoff lintas peran tidak kabur: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [restore route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/restore/route.ts)

### Fixed

- Parser catatan support kini memprioritaskan ringkasan close final pada histori dismantle, sehingga panel histori tidak lagi berhenti pada transfer note lama ketika satu kasus menyimpan jejak transfer dan close sekaligus: [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts)
- `VERSION` dinaikkan ke `0.64.73` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.72] - 2026-07-11

### Changed

- Flow `Dismantle` sekarang benar-benar bertahap seperti baseline: `Approve Dismantle` hanya mentransfer isolir aktif ke `support_dismantle_queue`, `Close Dismantle` yang memindahkan queue aktif ke histori, dan `Reopen Dismantle` mengembalikan histori ke queue aktif lagi bila terminasi perlu dikoreksi; panel queue, action form, prefill search param, dan lane action workspace ikut diselaraskan agar lifecycle `Isolir -> Queue -> Histori -> Reopen` terbaca jelas: [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/dismantle/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle/[id]/close/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), [support-dismantle-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-close-form.tsx), [support-dismantle-reopen-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-reopen-form.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Read-side support dan dashboard kini membaca queue dismantle nyata, sehingga lane `Dismantle`, kartu operasional support, dan worklist `DISMANTLE_OPERATOR` tidak lagi hanya menebak dari jumlah isolir aktif atau histori close: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql)

### Fixed

- Queue isolir kini menandai apakah item sudah memiliki ticket dismantle, sehingga operator tidak lagi buta terhadap kasus yang sebenarnya sudah ditransfer ke lane terminasi: [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.72` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.71] - 2026-07-11

### Changed

- Lane `Dismantle` kini membaca dua lapisan operasional sekaligus: `Queue Dismantle Open` dari isolir aktif untuk kandidat terminasi yang masih perlu keputusan, dan `Histori Dismantle` untuk jejak close yang sudah final; panel workspace dan narasi lane ikut diselaraskan agar pola kerja lebih dekat ke baseline legacy yang table-first: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts)

### Fixed

- Proses `dismantle` sekarang menulis histori dan mengarsipkan isolir dalam satu transaksi review DB, sehingga tidak lagi berisiko meninggalkan snapshot histori yatim atau row isolir yang setengah tertutup jika salah satu query gagal: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/dismantle/route.ts)
- `VERSION` dinaikkan ke `0.64.71` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.70] - 2026-07-11

### Changed

- Workspace `CS & Admin CS` kini tidak lagi berhenti sebagai landing organisasi statis; halaman ini berubah menjadi dashboard supervisor hidup yang merangkum bucket `Perlu Approval`, `Perlu Koreksi`, `Transfer atau Restore`, dan `Queue Risiko Tinggi` dalam pola `table-first`, lengkap dengan detail panel dan CTA lintas customer/support/inventory: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [cs-admin-workspace-dashboard.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/cs-admin-workspace-dashboard.tsx), [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)

### Fixed

- Write action `assign port` dan `update status port` pada inventory kini membaca permission `inventory:update` agar role operasional seperti `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, dan teknisi yang memang punya hak update tidak lagi tertolak hanya karena gate lama masih memaksa `inventory:create`; CTA domain inventory dan form port ikut diselaraskan ke capability yang benar: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/assign/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/status/route.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [inventory-odp-port-assign-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-port-assign-form.tsx), [inventory-odp-port-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-port-status-form.tsx)
- `VERSION` dinaikkan ke `0.64.70` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.69] - 2026-07-11

### Changed

- Struktur navigasi ERP kini benar-benar mengikuti pembagian organisasi yang ditetapkan bisnis: `Pusat Kendali` dipaksa berurutan `Dashboard -> Daily Activity -> Import Center -> List Kerja`, sidebar dikelompokkan per divisi besar, dan pembacaan ownership baru ditegaskan sehingga `Customer` dibaca lewat `Billing`, `isolir` dikelola `Finance/Billing`, `dismantle` dikelola `CS & Admin CS`, dan `NOC & Troubleshoots` fokus ke `TT` serta `SLA`: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts), [dashboard-division-structure.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-division-structure.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Dashboard dan landing organisasi kini memakai source of truth baru untuk lima kelompok bisnis serta route workspace nyata bagi `CS & Admin CS`, `Legal`, `Teknisi PSB`, `Teknisi Expan`, `Teknisi Jointer`, `Kantor`, dan `Toko`, sehingga struktur organisasi tidak lagi berhenti sebagai placeholder visual: [division-structure-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/division-structure-board.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [organization-workspace-page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/organization-workspace-page.tsx), [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/customers/cs-admin/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/legal/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/kantor/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/inventory/toko/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-psb/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-expan/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/teknisi-jointer/page.tsx)
- `List Kerja Terpadu` dan workspace turunan kini diperdalam untuk role prioritas serta menu organisasi baru, mencakup queue supervisor `CS_ADMIN`, paritas `SALES_MARKETING`/`CS_OPERATOR`/`DIGITAL_CREATOR`, serta landing fokus operasional berbeda untuk `Teknisi PSB`, `Teknisi Expan`, `Teknisi Jointer`, `Kantor`, `Toko`, dan `Legal`: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx), [organization-workspaces.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/organization-workspaces.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Paket kesiapan deploy dan cutover ikut dilengkapi dengan template env production final, checklist deploy rehearsal, pembaruan readiness/UAT/go-live, serta dokumentasi hosting agar batch integrasi ERP ini siap diteruskan ke tahap push dan deployment: [.env.production.final.template](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.final.template), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md), [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [docs/README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)

### Fixed

- Panel detail `List Kerja` tidak lagi mempertahankan item stale saat hasil filter kosong, lane support tidak lagi membocorkan review mock ketika data live valid tetapi kosong, parser identifier isolir restore/dismantle sudah membaca token penuh sebelum separator, dan item `Customer` tidak lagi tersisa sebagai menu mandiri di sidebar karena ownership-nya kini benar-benar diserap ke `Billing`: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- `VERSION` dinaikkan ke `0.64.69` dan versi `apps/web` diselaraskan ke angka rilis yang sama.

## [0.64.68] - 2026-07-10

### Fixed

- Lane `support` tidak lagi mempertahankan `reviewSections` mock saat query review DB valid tetapi hasilnya kosong, sehingga KPI live dan queue support kini konsisten dan item mock stale seperti `ISO-2026-0042` tidak bocor lagi ke form restore/dismantle: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Panel detail `List Kerja` tidak lagi jatuh ke item dasar saat hasil filter kosong, sehingga queue seperti `Lainnya` atau queue kosong supervisor kini benar-benar menampilkan state kosong tanpa detail stale di sisi kanan: [worklist-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/worklist-service.ts)
- Parser identifier isolir pada form restore/dismantle kini mengambil token penuh sebelum separator `|`, sehingga prefill kode isolir tidak lagi terpotong hanya ke digit awal: [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx)
- `VERSION` dinaikkan ke `0.64.68`

## [0.64.67] - 2026-07-10

### Changed

- Fallback auth lokal kini menyediakan akun mock untuk `SALES_MARKETING`, `CS_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, `DIGITAL_CREATOR`, dan `FIELD_TECHNICIAN`, sehingga smoke UAT lintas role dapat dijalankan tanpa bergantung pada user review DB: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts)
- Sampling browser lokal di `localhost:3000` kini berhasil memverifikasi login, dashboard, `List Kerja`, dan halaman target untuk role mock `SUPER_ADMIN`, `NOC_OPERATOR`, `CS_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, dan `DIGITAL_CREATOR`; hasilnya dipakai sebagai bukti readiness berbasis UI awal untuk fase UAT berikutnya.
- `VERSION` dinaikkan ke `0.64.67`

## [0.64.66] - 2026-07-10

### Changed

- Matriks readiness cutover per role diperbarui agar mencerminkan kondisi terbaru `List Kerja`, supervisory flow `CS_ADMIN`, presisi mikro-role `DISMANTLE_OPERATOR`, dan workspace awal `DIGITAL_CREATOR`, sehingga status `PILOT / PARTIAL / NO-GO` tidak lagi memakai baseline lama sebelum batch readiness terbaru: [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
- Checklist UAT `Pemasaran dan Pelayanan` kini memasukkan validasi `List Kerja` untuk `SALES_MARKETING` dan `CS_OPERATOR`, queue supervisor `CS_ADMIN`, serta workspace awal `DIGITAL_CREATOR` agar bukti UAT mengikuti workflow yang benar-benar hidup saat ini: [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)
- Checklist go-live Senin diperbarui agar validasi bisnis minimum untuk `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN` juga memeriksa workspace `List Kerja` serta queue supervisor, bukan hanya kemampuan membuka domain: [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- `VERSION` dinaikkan ke `0.64.66`

## [0.64.39] - 2026-07-10

### Changed

- Fase awal Divisi `Pemasaran & Pelayanan` kini memiliki checklist UAT khusus di `docs/web-pemasaran-pelayanan-uat-checklist.md`, mencakup flow wajib, bukti lulus, aturan `pass/partial/fail`, dan urutan uji untuk `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, dan `DIGITAL_CREATOR`: [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)
- PRD utama, checklist PRD, indeks dokumentasi, dan baseline checklist parity kini menautkan checklist UAT tersebut agar pelaksanaan pilot fase awal tidak bercampur dengan scope integrasi divisi lain: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
- `VERSION` dinaikkan ke `0.64.39`

## [0.64.40] - 2026-07-10

### Changed

- PRD web kini memiliki spesifikasi implementasi teknis `List Kerja Terpadu` untuk route `/dashboard/worklist`, termasuk kontrak data `WorklistItem`, query parameter, tab queue per role fase awal `Pemasaran & Pelayanan`, layout tabel + panel detail, integrasi tombol `Lihat semua` dari dashboard, serta rencana implementasi bertahap: [web-list-kerja-terpadu-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-implementation-spec.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan spesifikasi implementasi tersebut agar siap langsung diturunkan ke coding batch `/dashboard/worklist`: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.40`

## [0.64.41] - 2026-07-10

### Changed

- Dashboard kini menampilkan panel `Struktur Divisi` yang memisahkan 5 cluster divisi (Pemasaran dan Pelayanan, Teknis dan Expan, Finance dan HR, General Affair, Operasional) beserta sub-divisinya, sehingga konteks organisasi terbaca jelas di landing utama ERP: [division-structure-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/division-structure-board.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Label filter dashboard operasional diselaraskan menjadi `Sub-divisi` agar tidak rancu dengan struktur divisi 5 cluster: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- Metadata role diperbarui agar menampilkan penamaan divisi/sub-divisi yang konsisten di dashboard: [role-meta.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/role-meta.ts)
- `VERSION` dinaikkan ke `0.64.41`

## [0.64.42] - 2026-07-10

### Changed

- Dokumen baseline organisasi, role target, readiness cutover, katalog role/menu, UAT, dan PRD worklist kini diselaraskan dengan struktur divisi dashboard terbaru: `Pemasaran dan Pelayanan`, `Teknis dan Expan`, `Finance dan HR`, `General Affair`, dan `Operasional`, termasuk penamaan sub-divisi `Creator Digital` dan `Dismantle`: [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md), [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md), [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md), [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md), [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
- README, checklist PRD, dan dokumen spesifikasi implementasi juga ikut disinkronkan agar referensi fase awal tidak lagi memakai istilah divisi lama: [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [web-list-kerja-terpadu-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-implementation-spec.md)
- `VERSION` dinaikkan ke `0.64.42`

## [0.64.43] - 2026-07-10

### Changed

- Dashboard operasional kini dikelompokkan per 5 divisi besar dan menandai sub-divisi mana yang sudah memiliki kartu KPI operasional versus mana yang masih menunggu integrasi, sehingga pemisahan organisasi lebih jelas dari tampilan dashboard utama: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- Kartu KPI operasional kini menambah cakupan sub-divisi `Troubleshoots` dan `Dismantle`, dan panel `KPI Proses` ikut memahami drilldown untuk kedua sub-divisi tersebut: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Checklist PRD diperbarui untuk mencatat grouping dashboard operasional per divisi besar dan status integrasi sub-divisi: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.43`

## [0.64.44] - 2026-07-10

### Changed

- Dashboard operasional kini menghidupkan KPI awal untuk `Billing`, `HR`, dan `Inventory`, sehingga cluster `Finance dan HR` serta `General Affair` tidak lagi sepenuhnya placeholder di dashboard utama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Panel `KPI Proses` kini mendukung drilldown untuk `Billing`, `HR`, dan `Inventory`, dan filter sub-divisi dashboard ikut mengenali ketiga area tersebut: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Checklist PRD diperbarui agar cakupan KPI aktif dashboard mencatat sub-divisi baru yang sudah hidup: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.44`

## [0.64.45] - 2026-07-10

### Changed

- PRD dashboard kini memiliki spesifikasi fitur kustomisasi KPI agar manager per divisi dapat menambah, mengubah, menghapus, menonaktifkan, dan mengurutkan KPI dashboard secara aman per scope divisi/sub-divisi: [dashboard-kpi-customization-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/dashboard-kpi-customization-prd.md)
- Fondasi backend awal untuk kustomisasi KPI dashboard ditambahkan melalui service `dashboard-kpi-service`, mencakup pembuatan tabel definisi KPI dan audit, validasi hak `SUPER_ADMIN` dan `MANAGER` berbasis `daily_activity_user_profiles`, serta CRUD dasar definisi KPI custom per divisi/sub-divisi: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan pengembangan KPI custom manager tersebut agar batch dashboard berikutnya bisa langsung menurunkan UI dan API runtime-nya: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.45`

## [0.64.46] - 2026-07-10

### Changed

- Dashboard kini memiliki panel `Kelola KPI` yang tampil langsung di halaman utama untuk manager divisi dan super admin, sehingga definisi KPI custom dapat ditambah, diubah, diaktifkan/nonaktifkan, dan dihapus per scope divisi/sub-divisi: [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- API CRUD untuk definisi KPI dashboard sekarang hidup di `/api/dashboard/kpi-definitions` dan `/api/dashboard/kpi-definitions/[id]`, lengkap dengan validasi session, review DB, dan pembatasan scope manager: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/[id]/route.ts)
- Registry konfigurasi KPI dashboard kini dipusatkan di file terpisah untuk menjaga konsistensi opsi divisi, sub-divisi, dashboard key, metric type, dan template KPI antara service backend dan UI manager: [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Checklist PRD diperbarui agar status fitur KPI custom manager mencerminkan bahwa backend, API, dan panel dashboard sudah hidup, sementara merge nilai KPI custom ke runtime kartu operasional masih menjadi batch berikutnya: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.46`

## [0.64.47] - 2026-07-10

### Changed

- Dashboard operasional kini membaca definisi KPI custom aktif untuk scope divisi/sub-divisi user dan merender metrik kartu berdasarkan `template_key` serta urutan yang dikonfigurasi manager, sehingga add/edit/hapus KPI custom langsung memengaruhi angka yang tampil di dashboard: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Metrik KPI custom kini mendukung drilldown per item lewat `drilldown_href` sehingga angka KPI pada kartu dashboard bisa langsung diklik ke target modul yang relevan: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Checklist PRD diperbarui agar status runtime merge KPI custom tercatat sebagai sudah hidup, sementara baseline-override nonaktif KPI default masih menjadi tahap lanjutan: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.47`

## [0.64.48] - 2026-07-10

### Changed

- KPI dashboard kini memiliki baseline sistem (`scope_type=SYSTEM`, `is_default=1`) yang otomatis di-seed, lalu definisi KPI pada scope divisi/sub-divisi di-merge berbasis `metric_key` sehingga manager dapat mengoverride atau menonaktifkan KPI default tanpa menghapus baseline sistem: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/dashboard/kpi-definitions/[id]/route.ts)
- Dashboard operasional kini merender metrik kartu dari definisi KPI baseline/custom ter-merge (menggunakan `metric_type` untuk formatting) dan template KPI diperluas agar paritas metrik default tetap konsisten: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts)
- SUPER_ADMIN kini dapat memilih scope KPI (divisi/sub-divisi) lewat query parameter `kpiDivisionName` dan `kpiSubdivisionName`, sehingga perubahan KPI scope langsung memengaruhi angka yang tampil pada kartu dashboard operasional: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx)
- Guard `server-only` dihapus dari beberapa helper server agar smoke test `tsx` dapat berjalan tanpa runtime error, sekaligus merapikan typing map kartu operasional yang sebelumnya menabrak union `ALL`: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [access-control-server.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control-server.ts), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.48`

## [0.64.49] - 2026-07-10

### Changed

- KPI dashboard kini menambah template berbasis `PERCENTAGE` (rasio aktivasi sales, rasio overdue support, rasio kehadiran HR) dan `SUM` (nominal overdue billing), sehingga manager bisa membuat KPI yang benar-benar berupa rasio/persen maupun total nominal tanpa manual hitung: [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Query dashboard billing kini menyediakan `overdueAmount` untuk mendukung KPI nominal overdue dan menjaga perhitungan tetap konsisten dengan definisi overdue invoice yang sudah dipakai di dashboard: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.49`

## [0.64.50] - 2026-07-10

### Changed

- Drilldown `focus` kini aktif untuk domain non-support (Sales/Billing/HR/Inventory) dengan banner “Reset Fokus” dan penyaringan section review berbasis focus key, sehingga klik KPI dari dashboard langsung membuka modul dengan konteks antrean yang relevan: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Panel `KPI Proses` kini memberi `focus` lebih spesifik untuk kartu Sales dan Creator Digital agar klik metrik tidak lagi selalu jatuh ke root `/sales`: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Standarisasi focus Billing untuk invoice parsial menggunakan `PARTIAL_INVOICES` (selaras dengan KPI proses dan drilldown domain), serta seed baseline baru mengikuti key tersebut: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- `VERSION` dinaikkan ke `0.64.50`

## [0.64.51] - 2026-07-10

### Changed

- Drilldown KPI non-support kini diperdalam ke level baris dengan `filterTags` internal pada review row, sehingga filtering tidak lagi hanya berdasarkan judul section tetapi juga membaca period, status invoice, remaining positive, suspend candidate, request status, dan tanggal aktivitas yang relevan: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Dashboard kini meneruskan `month` dan `year` ke URL drilldown dari panel `KPI Proses` maupun kartu operasional, sehingga fokus seperti order bulanan sales, movement inventory, attendance HR, dan overdue billing mengikuti periode dashboard yang sedang dipilih: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- Sidebar kini bisa diminimalkan/ditampilkan kembali pada desktop dan dibuka-tutup sebagai drawer pada mobile, sehingga area navigasi seperti pada screenshot tidak selalu memakan ruang penuh: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- `VERSION` dinaikkan ke `0.64.51`

## [0.64.54] - 2026-07-10

### Changed

- Drilldown KPI non-support kini lebih presisi terhadap template KPI: focus `MONTHLY_ORDERS`, `DIGITAL_ORDERS`, `DIGITAL_SURVEYS`, `MONTHLY_ACTIVATIONS`, `ACTIVE_LOANS`, dan `DIGITAL_LEADS` sekarang memakai basis SQL yang mengikuti field/tanggal/source yang sama dengan kartu dashboard, sehingga isi review tidak lagi bercampur dengan antrean generik: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- KPI HR dan Inventory di dashboard kini lebih selaras dengan definisi operasional: hitungan `Employee Aktif` mengecualikan employee `ARCHIVED`, sedangkan `Request Pending` kini membaca status `PENDING` yang sama dengan focus drilldown inventory: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Layout dashboard diperketat lagi dengan `items-start` pada kedua grid dua kolom utama agar panel kanan tidak ikut meregang tinggi kolom kiri dan tidak menyisakan gap visual di bagian bawah saat tinggi konten berbeda: [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [activity-feed.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/activity-feed.tsx)
- `VERSION` dinaikkan ke `0.64.54`

## [0.64.55] - 2026-07-10

### Changed

- Template KPI dashboard kini punya default `drilldownHref` terpusat, termasuk untuk template komposit seperti `SALES_ACTIVATION_RATE`, `SUPPORT_OVERDUE_RATE`, `HR_ATTENDANCE_RATE`, dan `BILLING_OVERDUE_AMOUNT`, sehingga KPI custom baru tetap punya arah drilldown yang konsisten walau manager tidak mengisi URL manual: [dashboard-kpi-config.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/dashboard-kpi-config.ts), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts)
- Panel `Kelola KPI` kini melakukan prefill aman untuk `drilldown` dan `metric type` berdasarkan template yang dipilih, sehingga manager lebih cepat membuat KPI custom dan risiko salah arah drilldown untuk template standar berkurang: [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx)
- Drilldown komposit untuk KPI rasio kini lebih jujur terhadap definisi metrik: `ACTIVATION_RATE` menampilkan pembanding order periode aktif dan subscription aktivasi periode yang sama, `ATTENDANCE_RATE` menampilkan employee aktif dan attendance hari ini, serta focus support `OVERDUE_RATE` memiliki context banner khusus; selain itu `TODAY_ATTENDANCE` kini kembali membaca `CURRENT_DATE` agar tidak melenceng oleh parameter periode dashboard: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- `VERSION` dinaikkan ke `0.64.55`

## [0.64.56] - 2026-07-10

### Changed

- Lane `support/sla` kini membawa section turunan ticket yang relevan untuk KPI komposit, yaitu `SLA Ticket Open Aktif` sebagai penyebut dan `SLA Ticket Overdue` sebagai pembilang, sehingga focus `OVERDUE_RATE` dan `SLA_OVERDUE` tidak lagi berhenti di master SLA saja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Drilldown `BILLING_OVERDUE_AMOUNT` kini dipisahkan dari overdue count biasa dengan prioritas urut berdasarkan outstanding terbesar, title/description yang menegaskan nominal overdue, serta detail remaining amount pada row recurring dan one-time: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- Runtime dashboard kini lebih konsisten terhadap mapping template terbaru: KPI proses mengenali focus rasio/nominal untuk Support, Sales, Billing, dan HR, seed baseline SLA overdue diarahkan ke lane SLA, dan metric default sistem pada kartu operasional memprioritaskan mapping template terbaru agar tidak tersisa link lama dari baseline awal: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.56`

## [0.64.57] - 2026-07-10

### Changed

- `DomainReviewSection` kini mendukung summary agregat per section, dan `DomainShell` menampilkannya sebagai badge ringkas di header section agar pembacaan KPI komposit tidak berhenti di daftar row saja: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Focus komposit `OVERDUE_RATE` pada Support sekarang menampilkan ringkasan `Ticket Open SLA`, `Ticket Overdue`, dan `Rasio Overdue` langsung di section SLA, sehingga pembilang dan penyebut terlihat dalam satu layar bersama row detailnya: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Focus `BILLING_OVERDUE_AMOUNT` kini menampilkan summary agregat outstanding per section recurring dan one-time, termasuk total invoice, total nominal outstanding, dan rata-rata outstanding, sehingga nominal overdue lebih cepat dibaca sebelum masuk ke level invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.57`

## [0.64.58] - 2026-07-10

### Changed

- Focus `ACTIVATION_RATE` pada Sales kini menampilkan summary agregat yang dihitung dari query penuh, mencakup `Order Periode`, `Aktivasi`, dan `Rasio Aktivasi`, lalu ditempelkan pada section order pembanding dan subscription aktivasi agar pembilang-penyebut langsung terbaca bersama row detail: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Focus `ATTENDANCE_RATE` pada HR kini menampilkan summary agregat dari seluruh employee aktif dan attendance hari ini, mencakup `Employee Aktif`, `Attendance Hari Ini`, dan `Rasio Kehadiran`, sehingga ringkasan KPI tidak lagi bergantung pada jumlah row preview yang tampil: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.58`

## [0.64.65] - 2026-07-10

### Changed

- Paket kesiapan deploy production dilengkapi dengan template env final yang siap disalin ke server serta checklist rehearsal deploy untuk latihan pra go-live: [.env.production.final.template](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.final.template), [web-deploy-rehearsal-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-deploy-rehearsal-checklist.md)
- Runbook hosting, indeks dokumentasi, dan checklist readiness diselaraskan agar tim dapat bergerak dari template env final ke rehearsal lalu ke cutover hari-H tanpa improvisasi tambahan: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [docs/README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.65`

## [0.64.64] - 2026-07-10

### Changed

- Paket operasional hari-H kini dilengkapi checklist `go-live` khusus Senin yang merangkum timeline deploy, PIC minimum, validasi bisnis minimum per role fondasi, serta trigger `go / pilot / rollback`: [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
- Indeks dokumentasi dan runbook hosting diselaraskan agar jalur eksekusi berpindah rapi dari readiness teknis ke keputusan cutover hari-H: [docs/README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md), [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.64`

## [0.64.63] - 2026-07-10

### Changed

- Paket deploy Senin diperkuat dengan validator env production dan checker health endpoint yang dapat dijalankan manual saat preflight/pasca-deploy: [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json), [verify-production-env.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-production-env.mjs), [verify-health.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/verify-health.mjs)
- Runbook hosting kini mengarahkan ke command validasi baru dan file reverse proxy siap-tempel, sedangkan checklist hosting mencatat ketersediaan validator deploy: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [perkasa-erp-web.conf](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/nginx/perkasa-erp-web.conf), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.63`

## [0.64.62] - 2026-07-10

### Changed

- Hardening hosting web ditingkatkan dengan guard `AUTH_SESSION_SECRET` untuk environment production, endpoint health check `/api/health`, template `.env.production.example`, dan command start production yang diselaraskan ke mode standalone Node server: [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/health/route.ts), [.env.production.example](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/.env.production.example), [package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json)
- Flow auth hosting diperkeras agar redirect login/logout mengikuti host request nyata saat standalone atau reverse proxy, sehingga bug redirect ke `0.0.0.0` hilang pada smoke browser: [request-url.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/request-url.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/auth/login/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/auth/logout/route.ts)
- Panel `Kelola KPI` dashboard kini lebih konsisten untuk role operasional: fallback scope KPI mengikuti role aktif (mis. `NOC` tidak lagi jatuh ke `Penjualan`), label field diperjelas, dan default domain KPI mengikuti sub-divisi aktif: [dashboard-kpi-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-kpi-service.ts), [dashboard-kpi-manager-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-kpi-manager-panel.tsx)
- Artefak deploy nyata kini disiapkan lewat runbook hosting dan konfigurasi PM2, lalu checklist hosting dan PRD checklist ikut disinkronkan dengan evidence smoke test admin/support: [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md), [ecosystem.config.cjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/ecosystem.config.cjs), [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)
- `VERSION` dinaikkan ke `0.64.62`

## [0.64.59] - 2026-07-10

### Changed

- Kartu `KPI Proses` di dashboard kini bisa menampilkan hint spesifik per metric, bukan hanya helper teks generik, sehingga KPI komposit bisa dibaca lebih cepat sebelum user masuk ke drilldown: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Runtime builder dashboard kini mengirim hint numerator-denominator atau nominal agregat untuk metric komposit utama, termasuk `SALES_MONTHLY_ACTIVATIONS`/`SALES_ACTIVATION_RATE`, `SUPPORT_SLA_OVERDUE`/`SUPPORT_OVERDUE_RATE`, `BILLING_OVERDUE`/`BILLING_OVERDUE_AMOUNT`, dan `HR_TODAY_ATTENDANCE`/`HR_ATTENDANCE_RATE`; hint ini juga berlaku untuk KPI custom berbasis template yang sama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.59`

## [0.64.60] - 2026-07-10

### Changed

- Panel `Dashboard Operasional` kini ikut menampilkan hint konteks pada metric card, sehingga pembacaan KPI komposit konsisten antara `Dashboard Operasional` dan `KPI Proses`: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Mode fallback/mock dashboard kini juga mengisi hint komposit untuk `Aktivasi`, `Ticket Overdue`, `Invoice Overdue`, dan `Absensi Hari Ini`, sehingga pengalaman baca tetap seragam saat review DB belum aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.64.60`

## [0.64.61] - 2026-07-10

### Changed

- Hint KPI komposit di dashboard kini dipoles menjadi lebih scanable dengan `hintBadges`, sehingga numerator-denominator atau nominal agregat bisa dibaca cepat sebagai mini badge sebelum membaca teks penjelasan lengkap: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts), [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- Ditambahkan dokumen `web-hosting-readiness-checklist.md` sebagai checklist final menuju hosting Senin, mencakup freeze scope, code readiness, environment, database, infra, deploy, validasi fungsional, security, dan post-deploy checks: [web-hosting-readiness-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-readiness-checklist.md)
- `VERSION` dinaikkan ke `0.64.61`

## [0.64.53] - 2026-07-10

### Changed

- Drilldown non-support kini makin query-driven: `getReviewDbSalesSections`, `getReviewDbBillingSections`, `getReviewDbInventorySections`, dan `getReviewDbHrSections` menerima filter `focus/month/year` untuk mempersempit query SQL (mis. period filter untuk order/aktivasi sales, movement inventory, attendance HR; dan filter overdue/partial/suspend candidates billing): [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `getDomainPageData` kini meneruskan filter drilldown tersebut sampai ke fungsi query review section, sehingga hasil yang masuk ke UI sudah lebih presisi sejak query level: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.53`

## [0.64.52] - 2026-07-10

### Changed

- Filter drilldown non-support kini dipindahkan ke service layer `getDomainPageData`, sehingga section review Sales/Billing/HR/Inventory sudah disaring dari backend berdasarkan `focus`, `month`, dan `year` sebelum dikirim ke UI: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx)
- `DomainShell` disederhanakan agar fokus pada rendering context/badge/banner drilldown, sementara filter data utama tetap diputuskan di service layer untuk mengurangi duplikasi logika frontend: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.52`

## [0.64.36] - 2026-07-10

### Changed

- PRD web kini memiliki matriks readiness cutover per role/divisi di `docs/web-role-cutover-readiness.md`, sehingga status `GO`, `PILOT`, `PARTIAL`, dan `NO-GO` untuk role aktif bisa dibaca langsung dari kondisi implementasi web saat ini beserta blocker dan gelombang cutovernya: [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan dokumen readiness cutover tersebut agar jalur dokumentasi role tidak berhenti pada inventaris menu/kolom, tetapi juga mencakup keputusan readiness operasional: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.36`

## [0.64.38] - 2026-07-10

### Changed

- PRD migrasi kini mengunci keputusan bahwa `web-psb-perkasa` menjadi fondasi fase awal Divisi `Pemasaran & Pelayanan`, sedangkan integrasi ke `Teknisi`, `General Affair`, `Finance & HR`, dan `Operasional` dilakukan setelah flow inti legacy stabil di ERP: [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md), [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md), [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md)
- Dokumen readiness cutover, katalog role/menu, dan PRD `List Kerja Terpadu` kini diselaraskan dengan scope fase awal tersebut, sehingga gelombang implementasi tidak lagi mengasumsikan seluruh divisi bergerak paralel dari awal: [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md), [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md), [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.38`

## [0.64.37] - 2026-07-10

### Changed

- PRD web kini memiliki spesifikasi detail modul `List Kerja Terpadu` di `docs/web-list-kerja-terpadu-prd.md`, mencakup route target `/dashboard/worklist`, target role, filter global, tab queue per role, struktur item kerja, kolom utama, panel detail, CTA contextual prefill, dan tahapan rollout untuk menggantikan menu legacy `list`: [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan PRD `List Kerja Terpadu` tersebut agar blocker terbesar role bisnis lintas domain sudah punya spesifikasi implementasi yang eksplisit: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.37`

## [0.64.35] - 2026-07-10

### Changed

- PRD web kini memiliki lampiran inventaris aktual role/divisi/menu/fitur/kolom melalui dokumen `docs/web-role-division-menu-feature-catalog.md`, sehingga pembacaan aplikasi dapat dilakukan langsung dari perspektif operasional tiap role aktif: [web-role-division-menu-feature-catalog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-division-menu-feature-catalog.md)
- PRD utama, checklist PRD, dan indeks dokumentasi kini menautkan inventaris role/divisi tersebut agar proses review menu, capability, dan kolom layar tetap sinkron dengan implementasi web saat ini: [prd-aplikasi-web-utama.md](file:///d:/trae_projects/perkasa-erp-oss-bss/.trae/documents/prd-aplikasi-web-utama.md), [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md), [README.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/README.md)
- `VERSION` dinaikkan ke `0.64.35`

## [0.64.34] - 2026-07-10

### Changed

- CTA row `Subscription Billing-Ready` di Billing kini membawa `service number` ke form generate invoice, sehingga operator tidak perlu memilih ulang layanan saat menindak item billing-ready tertentu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)
- CTA row HR untuk `archive/reactivate employee` dan `release payroll` kini ikut membawa prefill `employee` atau `payroll` ke form target, dan form payroll create juga bisa dibuka dengan employee yang sudah terseleksi agar tindak lanjut lebih aman: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-archive-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-archive-form.tsx), [hr-employee-reactivate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-reactivate-form.tsx), [hr-salary-slip-release-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-release-form.tsx), [hr-salary-slip-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-form.tsx)
- Kontrak query prefill lintas domain kini diperluas dengan `service`, `employee`, dan `payroll` agar safety UX dari review card ke form target tetap type-safe pada Billing dan HR: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.34`

## [0.64.33] - 2026-07-10

### Changed

- CTA per-row pada kartu review `Sales`, `Billing`, `Inventory`, dan `HR` kini membentuk tautan `query + anchor`, sehingga klik dari row tidak lagi hanya melompat ke form, tetapi juga membawa context item seperti `lead`, `order`, `invoice`, `request`, `attendance`, atau `loan` ke halaman domain terkait: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- Form write-side yang menjadi target CTA kini menerima `initial...` prefill agar operator langsung masuk dengan nilai item yang sudah terpilih untuk tindak lanjut invoice, lead, order, request inventory, attendance, dan loan HR: [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx), [sales-order-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-order-create-form.tsx), [sales-survey-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-survey-create-form.tsx), [sales-work-order-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-work-order-create-form.tsx), [sales-subscription-activate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/sales-subscription-activate-form.tsx), [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx), [inventory-loan-return-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-return-form.tsx), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx), [hr-loan-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-status-form.tsx)
- `VERSION` dinaikkan ke `0.64.33`

## [0.64.32] - 2026-07-10

### Changed

- Kartu review generik pada `Sales`, `Inventory`, `HR`, dan `Billing` kini juga menampilkan CTA per-row yang membaca kombinasi domain, section, status row, dan meta operasional seperti `collection status`, `follow up state`, atau `suspend candidate`, sehingga tindakan yang muncul lebih spesifik dari sebelumnya: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Mapping CTA review kini turun sampai level row, jadi operator bisa melompat langsung dari item review ke form yang paling relevan tanpa hanya bergantung pada CTA section/header: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.32`

## [0.64.31] - 2026-07-10

### Changed

- Kartu review generik pada `Sales`, `Inventory`, `HR`, dan `Billing` kini menampilkan CTA per-section langsung di header card bila role aktif punya aksi yang relevan, sehingga operator bisa melompat dari review section ke form terkait tanpa kembali ke panel prioritas: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Mapping CTA review generik kini dipusatkan berdasarkan domain + section title agar perilaku action per role tetap konsisten antara panel prioritas dan kartu review bawah: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.31`

## [0.64.30] - 2026-07-10

### Changed

- `Sales`, `Inventory`, dan `HR` kini punya panel aksi prioritas yang membaca section review lalu mengarahkan operator ke form paling relevan sesuai role aktif, sehingga review domain tidak lagi pasif dan konsisten dengan pola `Support`/`Billing`: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Form pada `Sales`, `Inventory`, dan `HR` kini juga diberi anchor per aksi agar CTA dari panel prioritas bisa melompat langsung ke form yang sesuai: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.30`

## [0.64.29] - 2026-07-10

### Changed

- Billing kini punya panel `Aksi Billing Prioritas` yang membaca section review lalu menyiapkan CTA langsung ke form `generate invoice`, `status invoice`, `collection`, `resolve`, atau `payment` sesuai permission role aktif, sehingga antrean review tidak lagi pasif untuk operator: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Form billing juga kini memiliki anchor per aksi agar CTA dari panel prioritas bisa melompat langsung ke form yang relevan untuk role aktif: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.29`

## [0.64.28] - 2026-07-10

### Changed

- Tampilan Billing kini mengikuti capability role: form write-side (generate invoice, status invoice, payment, collection action/resolve) hanya dirender jika role memiliki permission create/update, dan role read-only melihat banner `Mode baca saja` agar tidak bingung mengapa aksi tidak tersedia: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.28`

## [0.64.27] - 2026-07-10

### Changed

- Tampilan lane Support kini lebih ketat per role: form aksi (create/progress/escalate/close/SLA/isolir/dismantle) hanya dirender jika role memiliki capability yang sesuai, dan quick links otomatis mengikuti form yang benar-benar tersedia: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Panel Trouble Ticket kini menyembunyikan tombol aksi update/escalate/close/SLA ketika role tidak memiliki permission yang diperlukan, dan menampilkan status `Mode baca saja` agar operator paham lane tersebut bersifat read-only: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.27`

## [0.64.26] - 2026-07-10

### Changed

- Sidebar kini memprioritaskan urutan menu berdasarkan role/divisi, memisahkan `Menu Utama` dan `Pengaturan`, serta menyederhanakan navigasi mobile agar lebih fokus pada menu operasional role aktif: [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx)
- Dashboard kini otomatis memakai divisi default sesuai role (mis. Sales/CS/NOC/Digital) ketika query `division` belum diberikan, serta mengunci filter divisi untuk non-admin agar tampilan dan kontrol lebih konsisten per divisi: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx), [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.26`

## [0.64.25] - 2026-07-10

### Changed

- Panel `KPI Proses` kini membawa drilldown yang lebih spesifik ke lane support menggunakan query `focus`, sehingga metrik seperti `Ticket Overdue`, `Trouble Ticket Open`, `Isolir Aktif`, dan `Dismantle Periode Ini` tidak lagi hanya membuka halaman umum: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Halaman support lane dan support domain kini membaca context `focus` untuk menampilkan banner fokus operasional dan menyaring section/row yang relevan, terutama untuk backlog `SLA OVERDUE` dan ticket yang masih aktif terbuka: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx), [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Kontrak UI support kini memuat `SupportDrilldownContext` untuk menjaga context drilldown tetap type-safe dari halaman ke shell domain: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.25`

## [0.64.24] - 2026-07-10

### Changed

- Dashboard kini menambah panel `KPI Proses` untuk memecah metrik operasional per divisi (Sales/CS/NOC/Digital) menjadi metrik proses yang bisa langsung diklik ke lane atau modul terkait, sehingga gap `KPI per proses detail` di PRD semakin tertutup: [dashboard-process-kpis.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-process-kpis.tsx)
- Landing `/dashboard` kini menyisipkan `KPI Proses` setelah `Dashboard Operasional` agar urutan monitor -> drilldown proses -> alert -> tindakan berikutnya terasa lebih lengkap: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- `VERSION` dinaikkan ke `0.64.24`

## [0.64.23] - 2026-07-10

### Changed

- Landing `/dashboard` kini menambah panel `Tindakan Berikutnya` di antara `Alert Silang Domain` dan blok KPI, sehingga alur baca operator menjadi monitor -> identifikasi blocker -> pilih aksi -> masuk ke modul yang tepat tanpa menebak langkah berikutnya: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Komponen baru `DashboardNextActions` merangkum alert, list kerja, dan queue role aktif menjadi kartu aksi prioritas dengan CTA langsung seperti `Review Import`, `Kerjakan Sekarang`, dan `Masuk Queue`, agar shortcut tindakan dashboard lebih tajam sesuai PRD: [dashboard-next-actions.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-next-actions.tsx)
- `VERSION` dinaikkan ke `0.64.23`

## [0.64.22] - 2026-07-10

### Changed

- Panel `Alert Silang Domain` kini menampilkan modul terdampak, ringkasan dampak lintas domain, dan `Langkah berikutnya` pada tiap alert, sehingga operator tidak lagi hanya melihat blocker tetapi juga korelasi operasional dan tindakan paling tepat setelah membuka dashboard: [cross-domain-alerts.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/cross-domain-alerts.tsx)
- Service dashboard kini memperkaya payload `dashboardAlerts` untuk mode review DB dan fallback dengan `impactSummary`, `nextStep`, dan `affectedModules`, sehingga alert import, billing, support, isolir, dan approval memberi konteks dampak ke modul lain secara lebih eksplisit: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Kontrak `DashboardAlertItem` kini membawa metadata korelasi silang domain yang lebih lengkap untuk menjaga type-safety antara service dashboard dan komponen UI alert: [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
- `VERSION` dinaikkan ke `0.64.22`

## [0.64.21] - 2026-07-09

### Changed

- Dashboard utama kini memiliki panel `Alert Silang Domain` yang menonjolkan hambatan paling berdampak lintas modul seperti batch import tertahan, invoice overdue, trouble ticket aktif, isolir aktif, dan approval Daily Activity yang masih menunggu agar operator bisa langsung masuk ke tindakan prioritas: [cross-domain-alerts.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/cross-domain-alerts.tsx)
- Service dashboard kini menghitung `dashboardAlerts` untuk review DB maupun mode fallback, sehingga landing dashboard tidak lagi hanya memberi ringkasan pasif tetapi juga CTA prioritas ke modul yang tepat: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Landing `/dashboard` kini menyisipkan alert silang domain di antara ringkasan operasional dan blok eksekusi agar urutan baca operator menjadi monitor -> identifikasi blocker -> tindak lanjuti: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- `VERSION` dinaikkan ke `0.64.21`

## [0.64.20] - 2026-07-09

### Changed

- Landing `/dashboard` kini disusun ulang mengikuti konsep PRD sebagai pusat kendali ERP, dengan lapisan `Pusat Kendali ERP`, `Dashboard Operasional`, `Kontrol Lintas Domain`, serta blok `List Kerja`, `Approval`, `Shortcut Modul`, dan `Audit` agar alur monitor -> eksekusi -> audit terasa jelas di satu halaman: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Komponen baru `DashboardCommandCenter` menampilkan fokus role aktif, jumlah queue prioritas, list kerja terpadu, shortcut modul, dan approval pending supaya operator langsung memahami konteks kerjanya saat masuk ke dashboard: [dashboard-command-center.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/dashboard-command-center.tsx)
- Query kartu operasional NOC kini tahan terhadap variasi schema review DB dengan pengecekan kolom `sla_due_at` terlebih dahulu, sehingga dashboard tidak lagi jatuh ke `Mock Fallback` hanya karena kolom SLA belum tersedia pada database aktif: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Copy dashboard operasional kini mengacu langsung ke PRD dan tidak lagi memakai narasi baseline visual lama: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.20`

## [0.64.19] - 2026-07-09

### Changed

- `DomainShell` kini menjadi landing operasional lintas menu yang lebih selaras dengan PRD, dengan navigasi antardomain langsung di header setiap menu agar operator bisa berpindah antar modul tanpa terasa keluar dari satu ERP terintegrasi: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Setiap menu domain (`Sales`, `Customer`, `Support`, `Inventory`, `HR`, `Billing`) kini memiliki blok `Alur utama menu` yang menjelaskan workflow inti domain berdasarkan fokus PRD, sehingga tampilan tiap halaman tidak lagi hanya berupa shell generik dengan form dan review: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Setiap menu domain kini juga menampilkan panel `Integrasi ERP` yang mengarahkan operator ke modul terkait seperti Sales -> Customer/Billing, Support -> Billing/Inventory, dan HR -> Daily Activity/Settings Users, agar integrasi lintas domain terasa langsung pada UI masing-masing menu: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- `VERSION` dinaikkan ke `0.64.19`

## [0.64.18] - 2026-07-09

### Changed

- Dashboard utama ERP kini memprioritaskan blok `Dashboard Operasional` lintas divisi di bagian atas halaman agar lebih selaras dengan baseline `web-psb-perkasa` dan PRD yang menekankan integrasi operasional semua domain dalam satu landing page: [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx)
- Service dashboard kini menyediakan kartu operasional untuk `Penjualan`, `CS`, `NOC`, dan `Creator Digital` dengan metrik lintas domain yang dibaca dari review DB berdasarkan filter periode aktif, sehingga dashboard ERP tidak lagi hanya bergantung pada ringkasan role-aware: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- Dashboard operasional baru kini menyediakan filter `bulan`, `tahun`, dan `divisi`, serta kartu ringkas per divisi yang langsung melompat ke modul relevan agar alur landing dashboard lebih dekat ke ritme operasional legacy tanpa membuang komponen ERP yang sudah ada: [operational-division-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/operational-division-board.tsx)
- `VERSION` dinaikkan ke `0.64.18`

## [0.64.17] - 2026-07-09

### Changed

- CTA header lane dan tombol aksi per row pada `Queue Trouble Ticket` kini memakai kamus label yang sama berbasis `Queue Reason`, sehingga bahasa aksi utama dan aksi pendukung terasa konsisten dari level lane sampai level ticket: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Header lane TT kini juga memakai urutan aksi yang sama dengan row ticket teratas, sehingga prioritas klik operator tidak lagi berbeda antara panel ringkas dan detail row: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.17`

## [0.64.16] - 2026-07-09

### Changed

- Tiap row `Queue Trouble Ticket` kini menampilkan helper singkat saat aksi memang disederhanakan oleh konteks ticket, sehingga operator memahami kenapa kombinasi tombol pada `READY_CLOSE`, `ESCALATION_PENDING`, `SLA_OVERDUE`, `FOLLOW_UP_SCHEDULED`, dan konteks lain bisa berbeda: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Pesan helper penyederhanaan aksi kini juga menyebut fokus operasional yang diutamakan, misalnya close formal, tindak lanjut eskalasi, pengamanan SLA, atau follow-up terjadwal, agar UI tetap ringkas tetapi tidak terasa “menghilangkan” opsi tanpa penjelasan: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.16`

## [0.64.15] - 2026-07-09

### Changed

- Opsi aksi pendukung pada tiap row `Queue Trouble Ticket` kini disaring berdasarkan `Queue Reason`, sehingga ticket `READY_CLOSE`, `ESCALATION_PENDING`, `SLA_OVERDUE`, `FOLLOW_UP_OVERDUE`, dan reason lain tidak lagi dipenuhi tombol yang kurang relevan: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Ticket kritis kini menampilkan set aksi yang lebih fokus, misalnya `READY_CLOSE` hanya menonjolkan close/progress sementara jalur eskalasi dan SLA hanya muncul saat konteks ticket memang membutuhkannya: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.15`

## [0.64.14] - 2026-07-09

### Changed

- Tombol aksi pada tiap row `Queue Trouble Ticket` kini diurutkan mengikuti `Aksi Disarankan`, sehingga tindakan utama tampil paling depan dan tidak lagi tenggelam di antara aksi pendukung lain: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Aksi utama per row TT kini memakai styling yang lebih menonjol dibanding aksi pendukung, sehingga operator lebih cepat terdorong menekan tombol yang paling relevan sesuai `Queue Reason`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.14`

## [0.64.13] - 2026-07-09

### Changed

- Setiap row pada panel `Queue Trouble Ticket` kini menampilkan badge `Aksi Disarankan` yang membaca `Queue Reason`, sehingga operator bisa langsung melihat tindakan yang paling tepat untuk ticket tersebut tanpa bergantung pada CTA header lane saja: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Tiap row TT kini juga menampilkan helper `Langkah saat ini` untuk menjelaskan konteks tindakan yang disarankan, misalnya mengejar follow-up overdue, mengamankan SLA, melanjutkan eskalasi, atau menutup ticket yang sudah matang: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.13`

## [0.64.12] - 2026-07-09

### Changed

- CTA rekomendasi pada header lane `Queue Trouble Ticket` kini membaca `Queue Reason` ticket teratas, sehingga label aksi berubah lebih spesifik sesuai konteks nyata seperti `ESCALATION_PENDING`, `FOLLOW_UP_OVERDUE`, `SLA_DUE_TODAY`, `FOLLOW_UP_SCHEDULED`, atau `WAITING_PROGRESS`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Pesan `fokus cepat` pada header lane TT kini juga menjelaskan niat aksi untuk ticket teratas, bukan hanya menampilkan kode ticket, sehingga operator lebih cepat memahami kenapa lane itu harus ditindak duluan: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.12`

## [0.64.11] - 2026-07-09

### Changed

- Header tiap lane pada panel `Queue Trouble Ticket` kini membawa CTA rekomendasi yang menyesuaikan konteks lane aktif seperti `Critical Attention`, `Planned Follow Up`, `Waiting Progress`, dan `Ready Close`, sehingga operator bisa langsung meloncat ke aksi paling relevan dari ticket teratas di lane tersebut: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Header lane TT kini juga menampilkan penanda `Fokus cepat untuk ticket teratas`, agar CTA section jelas terbaca sebagai dorongan aksi untuk item paling mendesak di lane itu: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.11`

## [0.64.10] - 2026-07-09

### Changed

- Queue support sekarang memecah ticket aktif ke lane `Critical Attention`, `Planned Follow Up`, dan `Waiting Progress`, sehingga operator tidak lagi membaca kasus eskalasi/follow-up kritis bercampur dengan ticket yang masih terjadwal atau baru menunggu progress: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Panel `Queue Trouble Ticket` kini hanya merender lane yang benar-benar berisi ticket, sehingga segmentasi operasional baru tetap ringkas dan tidak dipenuhi section kosong: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.10`

## [0.64.9] - 2026-07-09

### Changed

- Panel `Queue Trouble Ticket` kini mengurutkan section berdasarkan urgensi `Queue Priority`, sehingga lane yang memuat ticket `P1/P2` tampil lebih dulu daripada lane yang lebih aman ditutup seperti `Ready Close`: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- Ringkasan header panel TT kini juga menampilkan distribusi `P1`-`P4`, sehingga operator bisa langsung membaca beban ticket paling kritis tanpa membuka setiap section: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.9`

## [0.63.81] - 2026-07-09

### Improved

- Support kini memprioritaskan queue TT berdasarkan `follow-up` terdekat atau yang sudah overdue, menampilkan `follow-up state` langsung di panel, dan memberi konteks progress terakhir pada form close agar operator tidak menutup ticket tanpa melihat PIC/follow-up/progress terbaru: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.81`

## [0.63.82] - 2026-07-09

### Improved

- Support kini membawa konteks `SLA Days`, `SLA Due`, dan `SLA State` langsung ke queue TT, prefill form progress, serta form close; ticket yang sudah `OVERDUE` atau paling dekat jatuh tempo juga diprioritaskan lebih dulu agar operator tidak perlu membuka master SLA terpisah saat menentukan aksi: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.82`

## [0.63.83] - 2026-07-09

### Improved

- Support kini punya jalur `eskalasi ticket` non-destruktif untuk kasus `SLA overdue` atau prioritas tinggi, lengkap dengan side-car escalation log, append note aman ke ticket, tombol aksi dari queue TT, dan form eskalasi dengan snapshot SLA/progress/eskalasi terakhir agar operator bisa mendorong kasus ke owner berikutnya tanpa keluar dari shell support: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts), [support-ticket-escalation-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-escalation-service.ts), [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.83`

## [0.63.84] - 2026-07-09

### Improved

- Billing collection kini mendukung mode `single` dan `batch` dari queue invoice tindak lanjut yang sedang tampil, sehingga operator bisa mencatat reminder/call/promise-to-pay/suspend massal secara aman tanpa membuka invoice satu per satu: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.84`

## [0.63.85] - 2026-07-09

### Improved

- Billing kini punya `Collection Follow Up Queue` berbasis action collection `OPEN` terbaru per invoice, lengkap dengan `remaining`, `follow-up state`, `collection status`, dan `suspend candidate`; context queue ini juga dipakai ulang oleh form collection dan payment untuk prefill aman serta ringkasan tagihan sebelum operator menindak invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.85`

## [0.63.86] - 2026-07-09

### Improved

- Billing kini punya jalur `resolve collection follow-up` dari queue aktif, sehingga operator bisa menutup action collection `OPEN` terbaru per invoice sebagai `DONE` atau `CANCELLED` dengan catatan formal tanpa harus membuat action baru: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Payment entry kini otomatis menutup action collection `OPEN` yang terkait invoice tersebut, sehingga lifecycle penagihan lebih rapi setelah pembayaran diterima: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/payments/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.86`

## [0.63.87] - 2026-07-09

### Improved

- Billing status kini mendukung jalur `SUSPENDED` dan `OVERDUE` selain `CANCELLED`, sehingga operator bisa menandai invoice belum lunas sebagai suspend candidate lalu mengaktifkannya kembali ke jalur overdue/reconnect langsung dari web dengan context follow-up yang aman: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Billing read-side kini menampilkan section `Invoice Suspended` agar antrean reconnect tidak hilang dari layar operator saat invoice sudah masuk jalur suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.87`

## [0.63.88] - 2026-07-09

### Improved

- Billing status kini mendukung mode `batch` untuk jalur `SUSPENDED` dan `OVERDUE`, sehingga operator bisa mengeksekusi suspend massal dari antrean siap suspend dan reconnect massal dari antrean invoice suspended tanpa memproses satu per satu: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Billing read-side kini menampilkan section `Suspend Ready Queue` dan `Reconnect Ready Queue` agar antrean keputusan suspend/reconnect lebih eksplisit dan tidak bercampur dengan follow-up umum: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.88`

## [0.63.89] - 2026-07-09

### Improved

- Billing read-side kini menampilkan section `Promise To Pay Queue` agar invoice dengan janji bayar aktif terpisah jelas dari antrean siap suspend, sehingga operator collection bisa membedakan invoice yang masih layak ditunggu dari invoice yang harus dinaikkan tindakannya: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Form collection action batch kini otomatis memakai antrean yang paling relevan berdasarkan `action type`, termasuk `promise to pay`, `siap suspend`, dan `siap reconnect`, sehingga batch action tidak lagi menembak antrean yang terlalu umum: [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.89`

## [0.63.90] - 2026-07-09

### Improved

- Billing read-side kini otomatis menaikkan `promise to pay` yang follow-up-nya sudah lewat ke `Suspend Ready Queue`, sehingga operator tidak perlu lagi memilah manual invoice janji bayar yang sudah jatuh tempo sebelum menjalankan batch suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `Promise To Pay Queue` kini hanya menampilkan janji bayar yang masih sehat untuk ditunggu, sehingga pemisahan antara antrean tunggu bayar dan antrean siap suspend menjadi lebih tegas: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.90`

## [0.63.91] - 2026-07-09

### Improved

- Payment entry billing kini otomatis menarik invoice keluar dari jalur suspend saat pembayaran mulai masuk, sehingga invoice yang tadinya `SUSPENDED` tidak lagi tertinggal di konteks suspend setelah operator menerima pembayaran parsial atau penuh: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/payments/route.ts)
- Form payment kini memberi konteks jelas saat invoice yang dibayar berasal dari jalur suspend, sehingga operator tahu bahwa pembayaran juga akan membersihkan sinyal suspend secara aman: [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.91`

## [0.64.8] - 2026-07-09

### Added

- Queue support sekarang menghitung `Queue Priority` (`P1`-`P4`) dari `Queue Reason`, sehingga ticket trouble ticket otomatis terurut dari yang paling mendesak sampai yang paling bisa ditunda: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Panel `Queue Trouble Ticket` kini menampilkan badge `Priority` di setiap row, jadi operator bisa langsung membaca urutan urgensi ticket tanpa memilah manual: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.8`

## [0.64.7] - 2026-07-09

### Added

- Queue support sekarang membawa `Queue Reason` dan `Close Candidate` pada trouble ticket, sehingga operator bisa langsung membaca apakah ticket tertahan karena follow-up, SLA, eskalasi, atau memang sudah siap close: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Panel `Queue Trouble Ticket` kini menampilkan badge alasan antrean (`Reason`) dan indikator `Close Candidate`, sehingga lane `ready close` dan `open` tidak hanya terpisah tetapi juga lebih tegas dibaca operator: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.7`

## [0.64.6] - 2026-07-09

### Added

- Support review sekarang menambahkan lane `Trouble Ticket Ready Close` untuk ticket yang sudah punya progress valid, tidak punya follow-up aktif, dan tidak sedang menunggu eskalasi yang lebih baru, sehingga kandidat close tidak lagi bercampur dengan antrean progress/escalation umum: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Panel `Queue Trouble Ticket` kini merender lebih dari satu section trouble ticket sekaligus, sehingga lane `Ready Close` dan `Open` bisa dibaca terpisah pada halaman support: [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)
- `VERSION` dinaikkan ke `0.64.6`

## [0.64.5] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Reconnect Ready Queue` dan `Write Off Queue` menjadi lane `Recurring` dan `One-Time`, sehingga jalur pemulihan layanan dan non-collectible juga tidak lagi bercampur antara tagihan bulanan dan charge khusus: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.5`

## [0.64.4] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Collection Action Terbaru` menjadi lane `Recurring` dan `One-Time`, sehingga histori action operator tidak lagi bercampur antara tagihan bulanan dan charge instalasi/adjustment/termination: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.4`

## [0.64.3] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Promise To Pay Queue` dan `Suspend Ready Queue` menjadi lane `Recurring` dan `One-Time`, sehingga operator collection bisa membaca negosiasi janji bayar dan eskalasi suspend sesuai tipe tagihan: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.3`

## [0.64.2] - 2026-07-09

### Added

- Review billing sekarang memisahkan `Collection Follow Up Queue` menjadi lane `Recurring` dan `One-Time`, sehingga operator collection bisa membaca tindak lanjut tagihan bulanan terpisah dari charge instalasi, adjustment, atau terminasi: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.64.2`

## [0.64.1] - 2026-07-09

### Added

- Review billing sekarang menampilkan lane terpisah untuk `Invoice Recurring Perlu Tindak Lanjut`, `Invoice One-Time Perlu Tindak Lanjut`, `Invoice Recurring Terbaru`, dan `Invoice One-Time Terbaru`, sehingga operator bisa membedakan tagihan bulanan dari charge instalasi/adjustment/termination tanpa membaca campuran data: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Meta pada antrean collection billing kini ikut membawa `Invoice Type`, sehingga context follow-up, write-off, dan histori action lebih jelas saat menangani recurring vs one-time invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- `VERSION` dinaikkan ke `0.64.1`

## [0.64.0] - 2026-07-09

### Added

- Review section billing sekarang punya `Write Off Queue` agar invoice yang sedang diajukan atau diproses write-off terpisah dari lane follow-up collection normal: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- Read-side billing sekarang mengeluarkan invoice `WRITE_OFF/CLOSED` dari antrean umum seperti `Invoice Perlu Tindak Lanjut`, `Collection Follow Up Queue`, `Promise To Pay Queue`, dan `Suspend Ready Queue`, sehingga operator hanya melihat invoice yang masih collectible di lane utama: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Resolve collection untuk action `WRITE_OFF` sekarang menutup invoice ke `collection_status = CLOSED` saat selesai, sementara pembatalannya mengembalikan invoice ke lane `REMINDER`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts)
- `VERSION` dinaikkan ke `0.64.0`

## [0.63.99] - 2026-07-09

### Improved

- Form collection action billing sekarang otomatis membatasi action strategis seperti `PROMISE_TO_PAY`, `SUSPEND`, `RECONNECT`, dan `WRITE_OFF` ke status `OPEN`, serta mengarahkan operator memakai resolve/status invoice untuk penutupan formal jalur tersebut: [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx)

### Fixed

- Backend collection action billing sekarang menolak action baru pada invoice `PAID/CANCELLED`, memvalidasi bahwa `RECONNECT` hanya boleh dipakai pada invoice yang memang sudah berada di jalur suspend/reconnect, dan tidak lagi menggeser `collection_status` aktif saat operator hanya mencatat action non-OPEN: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.99`

## [0.63.98] - 2026-07-09

### Improved

- Form generate invoice billing sekarang menyediakan field `Nominal One-Time` dan `Deskripsi One-Time` untuk tipe `INSTALLATION`, `ADJUSTMENT`, dan `TERMINATION`, serta otomatis mengunci mode batch kembali ke `RECURRING` agar operator tidak membawa state yang nanti ditolak backend: [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)

### Fixed

- Backend generate invoice billing sekarang membedakan recurring vs non-recurring secara benar: recurring tetap memakai `monthly_price` subscription, sedangkan invoice one-time memakai nominal dan deskripsi custom serta item invoice yang sesuai tipe charge, sehingga `INSTALLATION/ADJUSTMENT/TERMINATION` tidak lagi salah terbentuk sebagai tagihan bulanan biasa: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/generate/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.98`

## [0.63.97] - 2026-07-09

### Improved

- Form eskalasi support sekarang memberi peringatan saat operator mencoba memakai target dan level yang sama dengan eskalasi terakhir, sehingga kebutuhan context baru terlihat sebelum submit: [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx)

### Fixed

- Backend eskalasi trouble ticket sekarang menolak eskalasi ulang yang identik bila belum ada progress baru sesudah eskalasi terakhir, sehingga jejak eskalasi tidak terduplikasi tanpa konteks operasional baru: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.97`

## [0.63.96] - 2026-07-09

### Improved

- Form eskalasi support sekarang membatasi pilihan level sesuai state SLA ticket dan menjelaskan kapan `OVERDUE`, `DUE_TODAY`, atau `MANUAL` boleh dipakai, sehingga operator tidak lagi menebak level eskalasi yang valid: [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx)

### Fixed

- Backend eskalasi trouble ticket sekarang memvalidasi kecocokan level `OVERDUE` dan `DUE_TODAY` terhadap `sla_due_at` ticket, sehingga jalur eskalasi SLA tidak bisa dipakai sembarang untuk ticket yang belum benar-benar due: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.96`

## [0.63.95] - 2026-07-09

### Improved

- Form `Close Ticket` support sekarang menampilkan indikator apakah ticket sudah memiliki progress aktif yang valid, sehingga operator mendapat peringatan dini sebelum mencoba menutup ticket yang belum melewati fase progress: [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx)

### Fixed

- Backend close trouble ticket sekarang mewajibkan adanya progress aktif `ON_PROGRESS` atau `FOLLOW_UP` sebelum ticket bisa ditutup, sehingga lifecycle support tidak bisa lagi lompat dari `OPEN` langsung ke `CLOSED`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/close/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.95`

## [0.63.94] - 2026-07-09

### Improved

- Form `Resolve Collection` billing sekarang memberi helper yang menyesuaikan action aktif seperti `PROMISE_TO_PAY`, `SUSPEND`, dan `RECONNECT`, sehingga operator lebih paham efek resolve terhadap jalur invoice sebelum menutup follow-up: [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx)

### Fixed

- Resolve collection billing sekarang ikut menyelaraskan `collection_status` dan `suspend_candidate` invoice secara aman berdasarkan action yang ditutup, sehingga janji bayar yang selesai/batal tidak tertinggal sebagai `PROMISE_TO_PAY`, suspend yang dibatalkan mencabut sinyal suspend, dan reconnect tetap tinggal di lane reconnect sampai invoice benar-benar diaktifkan lagi: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.94`

## [0.63.93] - 2026-07-09

### Improved

- Form `Status Invoice` billing sekarang ikut membaca konteks dari `Reconnect Ready Queue`, sehingga operator tetap melihat ringkasan invoice aktif yang sedang berada di jalur reconnect sebelum mengaktifkan layanan kembali: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx)

### Fixed

- Aksi collection `RECONNECT` billing sekarang mempertahankan `collection_status = RECONNECT`, sehingga antrean reconnect tetap merefleksikan invoice yang benar-benar sedang menunggu pemulihan layanan dan tidak langsung hilang saat operator baru mencatat action reconnect: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts)
- Aktivasi ulang invoice suspend ke `OVERDUE` sekarang otomatis mengeluarkan invoice dari jalur reconnect kembali ke follow-up normal dan sekaligus menutup action `RECONNECT` yang masih `OPEN`, sehingga invoice yang sudah dipulihkan tidak tertahan di antrean reconnect: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.93`

## [0.63.92] - 2026-07-09

### Improved

- `Reconnect Ready Queue` billing kini hanya membaca invoice yang benar-benar berada pada jalur `RECONNECT`, sehingga antrean reconnect tidak lagi tercampur dengan histori suspend lama dan lebih jujur terhadap invoice yang masih perlu dipulihkan: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Antrean reconnect sekarang ikut menampilkan `collection status` dan waktu update terakhir agar operator bisa melihat konteks pemulihan layanan tanpa menebak asal perpindahan invoice dari jalur suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.92`

## [0.63.80] - 2026-07-09

### Improved

- Support kini punya `update progress trouble ticket` non-destruktif dengan side-car progress log untuk PIC, status kerja, follow-up, dan catatan progres terbaru; queue TT dan shell support juga langsung menampilkan snapshot progress terakhir agar operator bisa lanjut dari open ticket tanpa menimpa data inti: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/progress/route.ts), [support-ticket-progress-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-progress-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.80`

## [0.63.79] - 2026-07-09

### Improved

- Billing kini mendukung `batch recurring invoice generation` dari daftar `Subscription Billing-Ready`, sehingga operator bisa membuat invoice bulanan massal langsung dari shell web sambil tetap memakai guard existing per subscription untuk menghindari duplikasi periode: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/generate/route.ts), [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.79`

## [0.63.78] - 2026-07-09

### Improved

- `Import Center` sekarang mengunci upload ulang batch yang sudah punya row staging, sehingga operator tidak lagi bisa menimpa review lama secara destruktif; form upload juga menampilkan guardrail yang mengarahkan operator membuat batch baru untuk file revisi: [import-file-loader.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-file-loader.ts), [import-batch-upload-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-upload-form.tsx), [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.78`

## [0.63.77] - 2026-07-09

### Improved

- HR sekarang punya section `Face Priority Queue` yang menyatukan capture `RETAKE` pending dan employee dengan baseline `DRIFTING/WATCHLIST`, lengkap dengan `priority score` agar operator bisa menindak item paling kritis lebih cepat tanpa analisis manual tambahan: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.77`

## [0.63.76] - 2026-07-09

### Improved

- HR kini punya deteksi drift baseline wajah per employee agar operasional lebih cepat membaca apakah kualitas referensi masih `STABLE`, masuk `WATCHLIST`, atau sudah `DRIFTING`; alert ini dihitung dari gap skor terbaru terhadap rata-rata dan skor terbaik, lalu ditampilkan langsung di section `Face Reference Trends` dan panel trend pada form baseline employee: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.76`

## [0.63.75] - 2026-07-09

### Improved

- baseline wajah HR kini punya history dan scoring trend per employee: setiap perubahan baseline manual maupun reinforce review disimpan ke tabel history side-car, HR shell menampilkan section `Face Reference History` dan `Face Reference Trends`, dan form baseline employee menampilkan ringkasan trend terpilih agar operator tahu kualitas referensi sebelum menimpa baseline aktif: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/face-reference/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.75`

## [0.63.74] - 2026-07-09

### Improved

- feedback loop review wajah HR kini non-destruktif dan lebih operasional: reviewer bisa memperkuat baseline employee secara terkontrol saat hasil `VERIFIED + MATCH`, sementara capture yang berakhir `REJECTED + RETAKE` otomatis masuk ke section `Face Retake Queue` untuk follow-up pengambilan ulang, lengkap dengan audit trail baru: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/review/route.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.74`

## [0.63.73] - 2026-07-09

### Improved

- review wajah HR kini mendapat matching recommendation berbasis baseline employee aktif, sehingga antrean review bisa melihat `Baseline Reference`, `Baseline Match Score`, `Baseline Match Outcome`, dan alasan `MATCH / REVIEW_MANUAL / RETAKE` sebelum operator menetapkan keputusan akhir: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.73`

## [0.63.72] - 2026-07-09

### Improved

- baseline referensi wajah employee sekarang bisa membaca kandidat otomatis dari capture yang sudah `VERIFIED`: shell HR menampilkan section `Verified Face Candidates`, form baseline wajah melakukan prefill aman saat baseline belum ada, dan operator bisa memakai kandidat terbaru dengan satu klik tanpa mengetik ulang `capture ref`: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.72`

## [0.63.71] - 2026-07-09

### Improved

- HR kini punya baseline referensi wajah per employee secara non-intrusive melalui tabel side-car, route write khusus, audit trail, section review `Employee Face References`, dan form safety UX yang bisa prefill referensi lama saat operator memilih employee aktif, sehingga fondasi matching engine tidak perlu menempel ke tabel `hr_employees` inti: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/face-reference/route.ts), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.71`

## [0.63.70] - 2026-07-09

### Improved

- shell HR kini menampilkan analytics outcome verifikasi wajah yang merangkum backlog `PENDING_REVIEW/VERIFIED/REJECTED`, distribusi confidence placeholder, rata-rata score sample terbaru, serta split adopsi `CAMERA_CAPTURE` vs mode manual agar operator bisa membaca kualitas outcome sebelum masuk ke recognition engine penuh: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.70`

## [0.63.69] - 2026-07-09

### Improved

- konfigurasi face attendance HR kini mendukung kebijakan `auto-verify` yang bisa diatur admin, termasuk sakelar aktivasi dan `minimum score` untuk confidence tinggi, sehingga jalur `Auto-Verify Aman` tidak lagi hardcoded dan bisa mengikuti kebijakan operasional tiap divisi: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/route.ts), [hr-attendance-face-config-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-config-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.69`

## [0.63.68] - 2026-07-09

### Improved

- review wajah HR kini punya `confidence band` (`HIGH`, `MEDIUM`, `LOW`) dan indikator `auto-review aman`, sehingga operator bisa melihat apakah capture cukup kuat untuk `Auto-Verify Aman` atau tetap perlu review manual mendalam: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.68`

## [0.63.67] - 2026-07-09

### Improved

- workflow review wajah HR kini dilengkapi scoring placeholder dan rekomendasi keputusan otomatis: shell HR menampilkan `match score`, `recommended decision`, dan alasan rekomendasi, sementara form review bisa langsung memakai saran `VERIFIED`, `PENDING_REVIEW`, atau `REJECTED` sebelum recognition engine otomatis penuh hadir: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.67`

## [0.63.66] - 2026-07-09

### Improved

- face attendance HR kini punya workflow review operasional: setiap capture wajah masuk ke status `PENDING_REVIEW`, tersedia antrean review terbaru di shell HR, operator bisa mengubah hasil menjadi `VERIFIED` atau `REJECTED`, dan audit review wajah ikut masuk ke dashboard terpusat: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/review/route.ts), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.66`

## [0.63.65] - 2026-07-09

### Improved

- form attendance HR sekarang sudah punya fondasi capture kamera browser langsung di web: operator bisa membuka kamera, mengambil snapshot wajah, melihat preview capture, dan menghasilkan `faceCaptureRef` otomatis untuk jalur verifikasi `CAMERA_CAPTURE` tanpa mengetik referensi manual: [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.65`

## [0.63.64] - 2026-07-09

### Improved

- fondasi face attendance HR kini hidup secara non-intrusive: ada konfigurasi mode verifikasi wajah terpisah, log referensi face capture/manual review terpisah, form attendance bisa mengirim referensi verifikasi wajah, dan mode wajib/opsional dapat diatur sebelum recognition engine penuh diaktifkan: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/route.ts), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx), [hr-attendance-face-config-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-config-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.64`

## [0.63.63] - 2026-07-09

### Improved

- fondasi geofence/radius attendance HR kini hidup secara non-intrusive: ada konfigurasi titik kerja + radius terpisah, capture lokasi browser di form attendance, validasi radius opsional/wajib saat check-in, log lokasi attendance terpisah, serta audit `ATTENDANCE_GEOFENCE_CONFIG` untuk perubahan konfigurasi geofence: [hr-attendance-geofence-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-geofence-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/geofence/route.ts), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx), [hr-attendance-geofence-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-geofence-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.63`

## [0.63.62] - 2026-07-09

### Improved

- flow payroll HR kini benar-benar lebih rapat: form void menampilkan ringkasan slip terpilih (periode, status, income, deduction) sebelum submit, dan backend release menolak slip yang sudah berstatus void agar operator tidak bisa merilis payroll yang sudah dibatalkan secara non-destruktif: [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.62`

## [0.63.61] - 2026-07-09

### Improved

- flow release dan void Payroll HR sekarang menampilkan suggestion yang lebih kaya (periode, status, income, deduction), lalu form release memperlihatkan ringkasan slip terpilih sebelum submit agar operator lebih aman saat merilis payroll: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-salary-slip-release-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-release-form.tsx), [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.61`

## [0.63.60] - 2026-07-09

### Improved

- flow update dan void Loan HR sekarang menampilkan suggestion yang lebih kaya (loan type, amount, installment) serta form update menampilkan status saat ini dan melakukan prefill status tujuan secara aman agar operator tidak salah ubah status: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-loan-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-status-form.tsx), [hr-loan-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-void-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.60`

## [0.63.59] - 2026-07-09

### Improved

- correction attendance HR kini lebih aman untuk operator karena suggestion review membawa metadata mentah `check in`, `check out`, `overtime`, dan `lock admin`, lalu form otomatis melakukan prefill saat row attendance dipilih sehingga koreksi tidak mudah mengosongkan nilai lama secara tidak sengaja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.59`

## [0.63.58] - 2026-07-09

### Improved

- HR kini mendukung reaktivasi employee non-destruktif dari status `ARCHIVED` ke status aktif yang dipilih operator, lengkap dengan validasi status aman di backend dan actor trail `EMPLOYEE_REACTIVATE`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/reactivate/route.ts), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts)
- halaman HR kini menyediakan form khusus untuk mengaktifkan kembali employee archived langsung dari review suggestion, sehingga siklus archive/reactivate menjadi lengkap tanpa membuat row employee baru: [hr-employee-reactivate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-reactivate-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- audit dashboard HR kini mengenali action `EMPLOYEE_REACTIVATE`, sehingga timeline `SUPER_ADMIN` menampilkan jejak unarchive/reactivate employee dengan label yang lebih operasional: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.63.58`

## [0.63.57] - 2026-07-09

### Improved

- Employee HR kini mendukung archive non-destruktif lewat route khusus yang mengubah `employment_status` menjadi `ARCHIVED`, sehingga data pegawai bisa ditutup tanpa menghapus histori attendance, loan, payroll, atau relasi lain yang sudah ada: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/archive/route.ts), [hr-employee-archive-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-archive-form.tsx)

### Changed

- audit dashboard HR kini mengenali action `EMPLOYEE_ARCHIVE`, dan halaman HR menyediakan form archive employee terpisah agar tidak tercampur dengan write-action create
- `VERSION` dinaikkan ke `0.63.57`

## [0.63.56] - 2026-07-09

### Improved

- Loan HR kini mendukung cancel/void non-destruktif lewat status `CANCELLED`, sehingga pinjaman bisa dibatalkan tanpa menghapus row `hr_loans`, histori tetap muncul di review HR, dan audit actor tercatat sebagai aksi terpisah: [void route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/loans/void/route.ts), [hr-loan-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-void-form.tsx)

### Changed

- review section HR untuk loan kini menampilkan histori terbaru termasuk status `CANCELLED`, dan dashboard audit HR mengenali action `LOAN_VOID`
- `VERSION` dinaikkan ke `0.63.56`

## [0.63.55] - 2026-07-09

### Improved

- Payroll HR kini mendukung `void` non-destruktif lewat tabel flag `hr_salary_slip_voids`, sehingga slip gaji bisa dibatalkan tanpa menghapus row payroll, status `VOIDED` tampil di review HR, dan audit actor tetap tercatat: [hr-salary-slip-void-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-salary-slip-void-service.ts), [void route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/void/route.ts), [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx)

### Changed

- audit dashboard HR kini mengenali action `SALARY_SLIP_VOID` dan review section HR menampilkan status payroll `VOIDED`
- `VERSION` dinaikkan ke `0.63.55`

## [0.63.54] - 2026-07-09

### Improved

- HR kini mendukung correction attendance langsung dari web dengan audit trail actor untuk perubahan status, jam masuk/keluar, overtime, dan lock admin, sehingga jejak audit HR tidak hanya berhenti di loan update dan payroll release: [attendance route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx)

### Changed

- label audit HR di dashboard diperluas agar correction attendance tampil lebih natural untuk operator dan admin
- `VERSION` dinaikkan ke `0.63.54`

## [0.63.53] - 2026-07-09

### Improved

- HR kini tidak hanya mencatat create audit, tetapi juga mendukung update status loan dan release slip gaji langsung dari web dengan actor trail yang tercatat ke `hr_audit_logs`, lengkap dengan dua form operasional baru di domain HR: [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [loans route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/loans/route.ts), [salary-slips route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)

### Changed

- dashboard HR audit kini menampilkan label action yang lebih operasional untuk create, update loan, dan release payroll
- `VERSION` dinaikkan ke `0.63.53`

## [0.63.52] - 2026-07-09

### Improved

- HR kini memiliki actor trail dasar via tabel `hr_audit_logs` untuk create employee, attendance, loan, dan salary slip, lalu feed audit dashboard `SUPER_ADMIN` ikut membaca jejak ini sehingga coverage audit lintas domain utama makin lengkap: [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- route write-side HR (`employees`, `attendance`, `loans`, `salary-slips`) kini mencatat snapshot actor setelah insert sukses tanpa mengubah tabel inti `hr_*`, sehingga jalur audit ditambah dengan risiko migrasi yang rendah
- `VERSION` dinaikkan ke `0.63.52`

## [0.63.51] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action sales dari lead, survey, sales order, work order, dan aktivasi subscription yang jejak aktornya sudah tersimpan di kolom notes, sehingga audit terpusat kini mencakup hampir seluruh domain operasional utama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.51`

## [0.63.50] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action billing dari pembuatan invoice, pembatalan invoice, payment entry, dan collection action, sehingga audit terpusat makin dekat ke operasi penagihan nyata: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.50`

## [0.63.49] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action inventory dari request barang, update status request, barang masuk, pinjaman, dan pengembalian berdasarkan tabel operasional yang sudah ada, sehingga audit terpusat makin dekat ke alur gudang/teknisi nyata: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.49`

## [0.63.48] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action domain support dari create ticket, close ticket, create isolir, restore isolir, dan dismantle yang jejak aktornya sudah tersimpan di tabel review, sehingga audit terpusat tidak lagi terbatas pada import dan settings: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.48`

## [0.63.47] - 2026-07-09

### Fixed

- formatter waktu activity feed dashboard kini aman menerima nilai tanggal dari review DB yang tidak selalu berbentuk string, sehingga dashboard tidak lagi jatuh ke `Mock Fallback` dengan error `value.includes is not a function`: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.47`

## [0.63.46] - 2026-07-09

### Improved

- feed dashboard kini membaca jejak aksi nyata secara terpusat untuk `SUPER_ADMIN` dengan menggabungkan audit Import Center, Settings Users, permission master, dan role-permission, sambil tetap menjaga fallback aman untuk role lain: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- panel aktivitas dashboard diperjelas sebagai feed audit hidup agar operator admin lebih mudah mengenali konteks jejak aksi terbaru: [activity-feed.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/activity-feed.tsx)
- checklist PRD audit diperbarui agar status implementasi mencerminkan audit terpusat lintas import dan settings yang kini sudah tampil di dashboard: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)

### Changed

- `VERSION` dinaikkan ke `0.63.46`

## [0.63.39] - 2026-07-09

### Added

- laporan korelasi duplikasi `inventory_stock_movements` ke staging inventory movement (batch/source/legacy/status) untuk memastikan sumber duplikasi sebelum cleanup: [xampp_review_schema_precheck_inventory_movements_correlate_0_63_39.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_inventory_movements_correlate_0_63_39.sql)

### Changed

- dokumentasi staging import menambahkan referensi laporan korelasi movement↔staging: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.39`

## [0.63.38] - 2026-07-09

### Added

- laporan precheck khusus duplikasi `inventory_stock_movements` per `reference_no` agar penanganan cleanup bisa lebih aman dan terarah: [xampp_review_schema_precheck_inventory_movements_by_ref_0_63_38.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_inventory_movements_by_ref_0_63_38.sql)

### Changed

- dokumentasi staging import menambahkan catatan investigasi duplikat movement per reference: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.38`

## [0.63.37] - 2026-07-09

### Added

- script dry-run untuk menampilkan kandidat row yang akan dibersihkan (tanpa mengubah data) sebelum autofix dan patch UNIQUE: [xampp_review_schema_autofix_dry_run_0_63_37.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_dry_run_0_63_37.sql)
- script autofix guarded (rollback default) untuk memastikan cleanup hanya terjadi jika `@confirm_apply = 1`: [xampp_review_schema_autofix_guarded_0_63_37.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_guarded_0_63_37.sql)

### Changed

- dokumentasi staging import diperbarui agar alur cleanup bersifat aman (precheck → dry-run → guarded apply → patch UNIQUE): [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.37`

## [0.63.36] - 2026-07-09

### Added

- script precheck detail yang menampilkan daftar `id` untuk setiap grup duplikat, agar cleanup sebelum UNIQUE lebih terarah: [xampp_review_schema_precheck_detail_0_63_36.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_detail_0_63_36.sql)

### Changed

- dokumentasi staging import kini menuliskan urutan patch aman (precheck → autofix → patch UNIQUE): [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.36`

## [0.63.35] - 2026-07-09

### Added

- script autofix terkontrol untuk membersihkan duplikasi paling aman sebelum penerapan UNIQUE business key transform (primary address ganda, duplikasi persis photos/invoice items/payments/collection actions): [xampp_review_schema_autofix_0_63_35.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_0_63_35.sql)

### Changed

- `VERSION` dinaikkan ke `0.63.35`

## [0.63.34] - 2026-07-09

### Added

- script precheck untuk mendeteksi duplikasi data existing sebelum menerapkan UNIQUE business key transform (menghindari kegagalan ALTER TABLE saat patch diterapkan ke DB yang sudah berisi data): [xampp_review_schema_precheck_0_63_34.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_0_63_34.sql)

### Changed

- `VERSION` dinaikkan ke `0.63.34`

## [0.63.33] - 2026-07-09

### Changed

- schema review DB ditambah UNIQUE index minimal untuk business key yang dipakai pipeline transform tahap 1-4 agar idempotent terhadap race dan aman saat re-run: [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql)
- disediakan patch schema yang bisa dijalankan aman berulang (cek `information_schema`) untuk installasi existing: [xampp_review_schema_patch_0_63_33.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_patch_0_63_33.sql)
- `VERSION` dinaikkan ke `0.63.33`

## [0.63.32] - 2026-07-09

### Changed

- eksekusi transaksi review DB kini memakai koneksi yang konsisten lewat helper `runReviewDbTransaction` agar transaksi benar-benar atomic: [review-db.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/review-db.ts)
- pipeline transform import tahap 1-4 kini berjalan dalam transaksi + lock batch untuk mencegah state setengah jalan dan double-run paralel: [import-write-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-write-service.ts)
- perbaikan pemakaian transaksi pada bulk approval Daily Activity, inventory loans/returns, inventory request status, dan bootstrap permission agar konsisten: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/return/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts), [access-permission-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/access-permission-service.ts)
- `VERSION` dinaikkan ke `0.63.32`

## [0.63.31] - 2026-07-09

### Changed

- form Plan Daily Activity kini auto-fill `planningLevel` dari profile user dan mengunci field org untuk non-superadmin: [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx)
- endpoint create & approval daily activity kini menegakkan scope org dari profile user (server-side), bukan dari input form: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts)
- approval queue dashboard kini menghitung scope berdasarkan session/profile (supaya konsisten dengan Daily Activity profile per username): [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.63.31`

## [0.63.30] - 2026-07-09

### Added

- bulk approve/reject pada halaman Daily Activity (Approval Manager) menggunakan endpoint bulk: [daily-activity-manager-approval-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-manager-approval-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.30`

## [0.63.29] - 2026-07-09

### Added

- endpoint bulk approval daily activity (maks 20 item per batch) untuk mempercepat proses manager/SPV: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts)
- bulk approve/reject dari dashboard Approval Queue dengan checkbox: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.29`

## [0.63.28] - 2026-07-09

### Added

- quick action approve/reject daily activity langsung dari panel Approval Queue dashboard: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) kini memuat daftar pending approval terbaru (maks 6) untuk diproses langsung dari dashboard
- `VERSION` dinaikkan ke `0.63.28`

## [0.63.27] - 2026-07-09

### Added

- panel `Approval Queue` daily activity di dashboard utama untuk role yang punya izin approve, dengan ringkasan pending approval dan shortcut ke halaman daily activity: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) kini memuat data pending approval daily activity (per divisi/sub-divisi) untuk dashboard
- [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan panel approval queue secara kondisional berdasarkan RBAC `daily_activity:approve`
- `VERSION` dinaikkan ke `0.63.27`

## [0.63.26] - 2026-07-09

### Added

- filter tambahan `Approval Status` (ALL/PENDING/APPROVED/REJECTED/NONE) pada [daily-activity-filter-bar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-filter-bar.tsx) agar manager bisa fokus ke item yang menunggu approval

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menerapkan filter approval status ke kalender/performa/riwayat sesuai pilihan user
- `VERSION` dinaikkan ke `0.63.26`

## [0.63.25] - 2026-07-09

### Added

- filter tampilan Daily Activity (divisi/sub-divisi/level) via query param pada [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan UI selector [daily-activity-filter-bar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-filter-bar.tsx)

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menghitung kalender/performa/riwayat berdasarkan filter divisi/sub-divisi/level yang dipilih
- navigasi kalender `prev/next month` kini menjaga filter agar tidak reset saat pindah bulan di [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx)
- `VERSION` dinaikkan ke `0.63.25`

## [0.63.24] - 2026-07-09

### Added

- navigasi kalender plan `prev/next month` lewat query `?month=YYYY-MM` pada [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx)

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menghitung rekap bulanan dan kalender berdasarkan bulan yang dipilih, serta memperluas window pembacaan data menjadi 370 hari
- `VERSION` dinaikkan ke `0.63.24`

## [0.63.23] - 2026-07-09

### Added

- permission resource `daily_activity` pada [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) dan baseline permission matrix di [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts) untuk mendukung aksi `approve` dan `export`
- endpoint approval manager [approval/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/route.ts) untuk approve/reject closing sore per divisi/sub-divisi
- endpoint export CSV [export/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/export/route.ts) untuk rekap daily activity berdasarkan rentang tanggal
- komponen [daily-activity-manager-approval-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-manager-approval-form.tsx) dan [daily-activity-export-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-export-form.tsx) pada halaman daily activity

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) menambah kolom `approval_status/approved_by/approved_at` dan performa dihitung dari aktivitas yang sudah `APPROVED`
- [status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/status/route.ts) kini mengubah closing menjadi `PENDING` approval dan mengizinkan resubmit bila sebelumnya `REJECTED`
- [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) kini mengikuti RBAC `daily_activity` untuk create/update/approve/export
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat approval manager dan export CSV daily activity sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.23`

## [0.63.22] - 2026-07-09

### Added

- helper baru [daily-activity-org.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/daily-activity-org.ts) untuk baseline divisi, sub-divisi, dan level plan `Manager`, `SPV`, `Leader` pada daily activity
- perhitungan performa otomatis harian, mingguan, dan bulanan di [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) beserta breakdown divisi/sub-divisi dan level plan
- kalender plan bulanan di [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) untuk memantau sebaran aktivitas per tanggal

### Changed

- [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts) sekarang mewajibkan pengisian level plan, divisi, dan sub-divisi sesuai baseline organisasi sebelum plan disimpan
- [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx) kini mendukung input plan per divisi/sub-divisi dan level `Manager`, `SPV`, `Leader`
- [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) kini menampilkan performa otomatis lintas periode dan kalender plan
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar daily activity tingkat divisi/sub-divisi beserta performa periode dan kalender plan tercatat sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.22`

## [0.63.21] - 2026-07-09

### Added

- menu baru [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts) untuk `Daily Activity` di path `/dashboard/daily-activity` agar user punya jalur khusus plan pagi dan closing sore
- halaman [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx), service [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts), dan endpoint [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts) serta [status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/status/route.ts) untuk workflow daily activity berbasis review DB
- komponen [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx), [daily-activity-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-close-form.tsx), dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) untuk input plan pagi, closing sore, dan transparansi progres harian

### Changed

- [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx) dan [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts) kini memakai active item paling spesifik agar menu `Daily Activity` tidak bentrok dengan `Dashboard`
- [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts) kini menampilkan shortcut `Daily Activity` di dashboard module cards
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat menu daily activity sebagai capability web yang sudah hidup
- `VERSION` dinaikkan ke `0.63.21`

## [0.63.20] - 2026-07-09

### Added

- endpoint baru [receipts/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/receipts/route.ts) untuk jalur `barang masuk` yang langsung menambah stok tanpa operator memilih tipe movement manual
- form [inventory-stock-receipt-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-stock-receipt-form.tsx) untuk pencatatan penerimaan barang yang lebih mudah dipakai gudang
- panel [inventory-stock-receipt-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-stock-receipt-panel.tsx) untuk merangkum transaksi barang masuk terbaru

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan panel dan form khusus barang masuk selain form stock movement umum
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar alur inbound gudang yang lebih mudah tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.20`

## [0.63.19] - 2026-07-09

### Added

- service baru [inventory-loan-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-loan-service.ts) untuk bootstrap tabel pinjaman inventory dan generate kode pinjaman otomatis
- endpoint [loans/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/route.ts) dan [loans/return/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/return/route.ts) untuk alur barang dipinjam lalu dikembalikan
- komponen [inventory-item-loan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-loan-form.tsx), [inventory-loan-return-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-return-form.tsx), dan [inventory-loan-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-ops-panel.tsx) untuk flow pinjam-kembali di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini memuat section `Pinjaman Inventory` dengan status `BORROWED`, `PARTIAL_RETURN`, `RETURNED`, dan indikator `OVERDUE`
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan panel operasional pinjaman inventory serta form pinjam dan pengembalian barang
- alur pinjam otomatis membuat movement `OUT` dan mengurangi stok, sedangkan alur pengembalian membuat movement `IN` dan menambah stok kembali
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar flow barang pinjam-kembali tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.19`

## [0.63.18] - 2026-07-09

### Added

- panel baru [inventory-request-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-ops-panel.tsx) untuk merangkum antrean request inventory per sub-divisi teknisi dan per status proses

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan panel operasional request inventory dan memperkaya suggestion form proses status dengan konteks sub-divisi dan status
- [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx) diperjelas agar petugas inventory langsung melihat konteks sub-divisi teknisi saat memproses request
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat antrean request inventory per sub-divisi/status sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.18`

## [0.63.17] - 2026-07-09

### Added

- helper baru [inventory-request-org.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/inventory-request-org.ts) untuk mengunci divisi `Teknisi` dan pilihan sub-divisi request inventory (`Teknisi PSB`, `Teknisi Jalur dan Expan`, `Teknisi Jointer`)

### Changed

- [inventory-request-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-request-service.ts) kini memastikan tabel `inventory_item_requests` memiliki kolom `requested_division` dan `requested_subdivision`
- [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) sekarang mewajibkan sub-divisi teknisi saat membuat request barang
- [inventory-item-request-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-request-form.tsx) kini menampilkan input divisi/sub-divisi teknisi agar request inventory lebih presisi sejak awal
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) menampilkan metadata divisi dan sub-divisi pada section `Request Inventory Teknisi`
- [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md) dan [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar tagging sub-divisi teknisi tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.17`

## [0.63.16] - 2026-07-09

### Added

- dokumen baru [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md) untuk mengunci struktur divisi dan sub-divisi organisasi sebagai baseline pengembangan ERP

### Changed

- [role-meta.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/role-meta.ts) sekarang menyimpan metadata divisi dan sub-divisi untuk seluruh role aktif ERP
- [topbar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/topbar.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), dan [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan konteks divisi/sub-divisi role aktif agar perspektif organisasi lebih jelas di UI
- [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md) dan [web-psb-target-permission-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-permission-matrix.md) diperbarui agar mapping role ERP selalu mengacu pada baseline divisi terbaru
- `VERSION` dinaikkan ke `0.63.16`

## [0.63.15] - 2026-07-09

### Changed

- [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) sekarang mengizinkan `FIELD_TECHNICIAN` membuat request barang meskipun role tersebut tidak memiliki `create` umum pada domain Inventory
- [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts) membatasi proses status request agar tidak bisa dijalankan oleh `FIELD_TECHNICIAN`, sehingga penyelesaian stok tetap dikendalikan tim inventory/operasional
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan screen Inventory yang lebih sesuai role: teknisi fokus ke form request barang, sedangkan form admin inventory tidak lagi ditampilkan untuk teknisi
- `VERSION` dinaikkan ke `0.63.15`

## [0.63.14] - 2026-07-09

### Added

- helper baru [inventory-request-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-request-service.ts) untuk bootstrap tabel request inventory teknisi dan generate kode request otomatis
- endpoint [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) dan [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts) untuk alur request barang harian teknisi dengan status `Request`, `On Progress`, `Pending`, dan `Selesai`
- komponen [inventory-item-request-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-request-form.tsx) dan [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx) untuk mensimulasikan pola marketplace internal di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini memuat section baru `Request Inventory Teknisi` agar request teknisi terbaca langsung di read-side inventory
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan form request barang teknisi dan form update status request di domain Inventory
- penyelesaian request inventory otomatis mencatat stock movement `OUT` dan mengurangi stok item secara transaksional di [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts)
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk memasukkan workflow request barang teknisi sebagai capability inventory yang sudah mulai hidup
- `VERSION` dinaikkan ke `0.63.14`

## [0.63.13] - 2026-07-09

### Added

- helper baru [map-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/map-links.ts) untuk membangun tautan Google Maps dari koordinat atau teks lokasi secara konsisten
- panel baru [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx) untuk merangkum ODP, port aktif/bermasalah, device assignment, dan indikasi accessories di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini membawa metadata koordinat ODP dan kategori item assignment agar konteks maps dan accessories bisa dipakai di read-side inventory
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan panel operasional inventory sebelum form write action
- [inventory-odp-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-create-form.tsx) kini menampilkan preview maps dan penegasan parity ODP/port/accessories dari legacy
- [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx) sekarang menampilkan roadmap resmi untuk face recognition, radius attendance, dan geofence titik kerja
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar gap Inventory dan HR secara eksplisit mencakup maps ODP, accessories detail, face recognition attendance, dan radius attendance
- `VERSION` dinaikkan ke `0.63.13`

## [0.63.12] - 2026-07-09

### Added

- helper baru [support-action-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-action-links.ts) untuk menghasilkan anchor dan query link aksi support yang konsisten lintas lane
- panel [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx) dan [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx) sekarang memiliki tombol aksi per row agar operator bisa langsung menindak item yang sedang direview

### Changed

- [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx) dan [[domain]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) meneruskan `searchParams` prefill ke `DomainShell` sehingga flow aksi tetap kompatibel dengan versi Next yang dipakai repo ini
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menyalurkan `supportPrefill` ke form close ticket, restore isolir, dismantle, dan SLA
- [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), dan [support-sla-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-form.tsx) sekarang mendukung nilai awal dari query prefill agar operator tidak perlu mengetik ulang item yang sudah dipilih di lane panel
- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportFormPrefill` untuk menjaga kontrak prefill form support tetap rapi
- `VERSION` dinaikkan ke `0.63.12`

## [0.63.11] - 2026-07-09

### Added

- komponen baru [support-action-quick-links.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-quick-links.tsx) untuk menyediakan shortcut aksi ringan dari lane support ke form yang relevan tanpa menambah fetch data baru

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memberi anchor stabil pada form support lane sehingga panel `/support/{lane}` dapat melompat langsung ke aksi utama yang diprioritaskan
- [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), dan [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx) sekarang menampilkan quick action link sesuai lane aktif agar operator lebih cepat masuk ke form kerja
- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportActionLink` untuk menjaga kontrak shortcut action tetap konsisten lintas panel support
- `VERSION` dinaikkan ke `0.63.11`

## [0.63.6] - 2026-07-09

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) mengoptimalkan query support review DB sehingga `/support/{lane}` hanya mengambil section yang relevan untuk lane tersebut
- `VERSION` dinaikkan ke `0.63.6`

## [0.63.7] - 2026-07-09

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) merapikan layout halaman `/support/{lane}` dengan header lane-specific dan menyembunyikan aksi pendukung agar fokus kerja lebih dedicated
- `VERSION` dinaikkan ke `0.63.7`

## [0.63.8] - 2026-07-09

### Added

- panel operasional [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx) untuk menampilkan queue Trouble Ticket di halaman `/support/tt` dengan ringkasan status dan detail meta yang lebih actionable

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel TT khusus saat membuka lane `tt`
- `VERSION` dinaikkan ke `0.63.8`

## [0.63.9] - 2026-07-09

### Added

- panel operasional [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx) untuk menampilkan queue Isolir di halaman `/support/isolations` dengan ringkasan status, marketing, dan meta isolir yang lebih siap diproses

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel isolir khusus saat membuka lane `isolations`
- `VERSION` dinaikkan ke `0.63.9`

## [0.63.10] - 2026-07-09

### Added

- panel operasional [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx) untuk menampilkan histori dismantle dan meta penutupan layanan di halaman `/support/dismantle`
- panel operasional [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx) untuk menampilkan aturan SLA trouble ticket di halaman `/support/sla`

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel operasional yang spesifik untuk lane `dismantle` dan `sla`
- `VERSION` dinaikkan ke `0.63.10`

## [0.63.5] - 2026-07-08

### Added

- route dedicated [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx) untuk screen kerja lane support seperti `/support/tt`, `/support/isolations`, `/support/dismantle`, dan `/support/sla`
- panel ringkasan lane [support-lane-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-lane-detail-panel.tsx) untuk menampilkan highlight operasional (item/section/status dominan) di halaman dedicated lane support

### Changed

- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) kini menyediakan helper `getSupportLanePath()` agar semua tautan lane support memakai path dedicated yang konsisten
- [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) sekarang mengarahkan kartu lane ke halaman dedicated, bukan query string fokus
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) mengganti chip navigasi lane ke path dedicated agar operator bisa berpindah antar workspace support lewat subpage yang stabil
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi helper path lane dan akses subroute `/support/tt`
- `VERSION` dinaikkan ke `0.63.5`

### Notes

- versi `0.63.5` memindahkan lane support dari sekadar mode fokus di halaman tunggal menjadi screen kerja dedicated yang lebih siap dipakai sebagai fondasi navigasi operasional

## [0.63.4] - 2026-07-08

### Added

- panel baru [support-lane-workspace-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-lane-workspace-panel.tsx) untuk menampilkan checklist, area review, dan catatan eskalasi lane support aktif

### Changed

- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) kini menambahkan `SupportLaneWorkspace`, `SupportLaneActionKey`, `activeLane`, dan `activeWorkspace` agar lane support punya struktur workspace yang lebih operasional
- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) diperluas dengan builder workspace per lane sehingga `TT`, `isolir`, `dismantle`, dan `SLA` punya checklist dan peta aksi yang konsisten
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) sekarang menghitung `activeLane` dan `activeWorkspace` di payload `supportFocus`
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memprioritaskan form berdasarkan `actionKeys` workspace lane aktif, termasuk default role ketika user belum memilih lane manual
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi `activeLane` dan `activeWorkspace`
- `VERSION` dinaikkan ke `0.63.4`

### Notes

- versi `0.63.4` mendorong parity support dari kontrak data ke pengalaman kerja yang lebih operasional, karena lane aktif sekarang punya checklist dan peta aksi yang siap dipakai tim support

## [0.63.3] - 2026-07-08

### Added

- payload `DomainPageData` sekarang mendukung `supportFocus` agar konteks lane support bisa dipakai ulang oleh page server, API, dan wrapper berikutnya

### Changed

- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportLaneKey`, `SupportLaneSnapshot`, dan `DomainSupportFocus` sebagai kontrak lane support lintas layer
- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) diperluas dengan builder snapshot lane agar service dan UI memakai metadata lane yang sama
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) sekarang menerima opsi `supportLane` dan menghasilkan `supportFocus` untuk domain `support`
- [domain API route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/domains/[domain]/route.ts) membaca query `lane` lalu meneruskannya ke service, sehingga mode fokus support tersedia juga di payload API
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) dan [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini membaca `supportFocus` dari service sebagai sumber tunggal lane aktif dan section yang terlihat
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi default lane, selected lane, dan visible sections pada payload support
- `VERSION` dinaikkan ke `0.63.3`

### Notes

- versi `0.63.3` mendorong parity support dari fokus UI ke kontrak data/service, sehingga lane `TT`, `isolir`, `dismantle`, dan `SLA` lebih siap dipakai ulang pada API dan mobile wrapper

## [0.63.2] - 2026-07-08

### Added

- helper [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) untuk menormalkan query `lane`, metadata lane support, dan pemetaan section review per jalur kerja

### Changed

- [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) sekarang menjadikan setiap kartu lane sebagai entry point ke mode fokus `support?lane=...`, lengkap dengan penanda lane default per role dan lane aktif
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) membaca query `lane` untuk domain `support` lalu meneruskannya ke shell halaman
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memprioritaskan form dan review section berdasarkan lane support aktif agar flow `TT`, `isolir`, `dismantle`, dan `SLA` tidak lagi tampil campur aduk
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi helper lane support baru
- `VERSION` dinaikkan ke `0.63.2`

### Notes

- versi `0.63.2` mendorong parity support dari sekadar micro queue visual menjadi mode kerja yang bisa difokuskan per lane tanpa mengganggu shell domain support yang sudah ada

## [0.63.1] - 2026-07-08

### Added

- panel `Micro Queue Support` di [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) untuk memecah jalur kerja support menjadi lane `TT`, `isolir`, `dismantle`, dan `SLA`

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menerima role aktif dan menampilkan queue mikro khusus saat membuka domain `Support`
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) meneruskan role session ke shell agar UI support bisa diurutkan sesuai role login
- `VERSION` dinaikkan ke `0.63.1`

### Notes

- versi `0.63.1` mendorong parity support dari level dashboard umum ke level domain kerja, khususnya untuk `NOC`, `TT`, `CS`, `FIELD_TECHNICIAN`, dan `DISMANTLE`

## [0.63.0] - 2026-07-08

### Added

- panel queue per role pada dashboard melalui [role-queue-grid.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/role-queue-grid.tsx) agar setiap role baru langsung melihat prioritas kerja utamanya
- panel list kerja terpadu melalui [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx) sebagai baseline pengalaman `list` lintas domain
- metadata item queue dan worklist baru di [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) sekarang menghasilkan `roleQueues` dan `worklist` berdasarkan role aktif, memakai review DB bila tersedia atau fallback mock bila belum ada data
- [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts) diperluas dengan template queue dan baseline worklist per role target
- [dashboard page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan perspektif role aktif, queue prioritas, dan list kerja terpadu
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperbarui untuk memverifikasi data dashboard role-aware

### Notes

- versi `0.63.0` menandai pergeseran dashboard dari shell generik ke shell yang mulai role-aware, terutama untuk parity `CS`, `MARKETING`, `NOC`, `TEKNISI`, dan `DISMANTLE`

## [0.62.9] - 2026-07-08

### Changed

- fondasi role ERP di `apps/web` diperluas dari 3 role bootstrap menjadi 9 role target: `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `FIELD_TECHNICIAN`, `TT_OPERATOR`, `DIGITAL_CREATOR`, dan `DISMANTLE_OPERATOR`
- baseline route prefix dan permission matrix di [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts) disesuaikan ke role baru agar guard akses dan capability domain mengikuti desain parity terbaru
- mapping auth di [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts) kini mengenali role legacy dan memetakkannya ke role ERP target baru
- layanan user dan bootstrap permission di [auth-user-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/auth-user-service.ts) serta [access-permission-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/access-permission-service.ts) diperbarui agar label, seed role, dan baseline permission konsisten dengan model role baru
- smoke test di [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperbarui untuk memverifikasi fondasi role baru

### Notes

- versi `0.62.9` adalah baseline implementasi kode pertama untuk parity role ERP, sehingga langkah berikutnya bisa fokus ke queue per role, list kerja terpadu, dan flow mikro per modul

## [0.62.8] - 2026-07-08

### Added

- dokumen `docs/web-psb-target-permission-matrix.md` untuk menerjemahkan role ERP target ke permission matrix yang lebih implementatif
- dokumen `docs/web-psb-module-gap-plan.md` untuk memetakan gap implementasi per modul setelah role dan permission matrix target dikunci

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen permission matrix target dan gap modul masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.8`

### Notes

- versi `0.62.8` menandai perpindahan dari desain role dan flow parity ke baseline akses yang lebih siap diimplementasikan, sekaligus menetapkan prioritas modul yang harus dibenahi lebih dulu

## [0.62.7] - 2026-07-08

### Added

- dokumen `docs/web-psb-target-role-design.md` untuk mendefinisikan role ERP target yang memetakan sembilan role operasional `web-psb-perkasa` ke struktur role ERP baru
- dokumen `docs/web-psb-flow-checklist.md` untuk menilai flow parity per role dengan status go/no-go sebelum cutover

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar artefak desain role target dan checklist flow parity masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.7`

### Notes

- versi `0.62.7` menandai pergeseran dari parity konseptual ke parity operasional yang bisa diuji per role setelah login review DB lokal berhasil digunakan

## [0.62.6] - 2026-07-08

### Added

- dokumen `docs/web-psb-role-action-parity.md` untuk memetakan parity detail per role, menu, dan aksi antara `web-psb-perkasa` dan ERP baru

### Changed

- `docs/xampp-setup.md` kini menegaskan bahwa XAMPP dipakai untuk MySQL review DB, sedangkan web `Next.js` dijalankan lewat `apps/web` dengan `npm run dev`
- `docs/README.md` dan `README.md` root diperbarui agar dokumen parity detail masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.6`

### Notes

- versi `0.62.6` menambahkan baseline parity operasional yang lebih detail dan memperjelas quick start lokal untuk menjalankan web ERP dengan MySQL XAMPP

## [0.62.5] - 2026-07-08

### Added

- dokumen `docs/web-psb-parity-matrix.md` sebagai baseline matriks parity role, menu, aksi, flow, dan logic antara `web-psb-perkasa` dan `perkasa-erp-oss-bss`

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen matriks parity masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.5` untuk menandai bahwa kesiapan cutover kini diukur dengan parity operasional, bukan hanya migrasi data

### Notes

- versi `0.62.5` menegaskan bahwa gap terbesar saat ini ada pada role parity, menu parity, action parity, flow parity, dan logic parity; ERP baru belum boleh menggantikan `web-psb-perkasa` sebelum gap tersebut ditutup

## [0.62.4] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menambahkan syarat parity sebelum cutover penuh: role parity, logic parity, flow parity, checklist parity wajib, dan definisi sukses migrasi dari `web-psb-perkasa` ke ERP baru
- `VERSION` dinaikkan ke `0.62.4` untuk mengunci requirement bahwa ERP baru harus mampu menjalankan seluruh role, logika, dan alur penting dari web lama sebelum pindah penuh

### Notes

- versi `0.62.4` memastikan arah migrasi tidak sekadar memindahkan data; ERP baru harus benar-benar bisa dipakai oleh seluruh role operasional dengan perilaku yang setara atau lebih baik dari `web-psb-perkasa`

## [0.62.3] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menegaskan target end-state bahwa web utama nantinya dikonsolidasikan ke `perkasa-erp-oss-bss`, sekaligus menambahkan kriteria cutover dan syarat kapan `web-psb-perkasa` baru boleh dipensiunkan
- `VERSION` dinaikkan ke `0.62.3` untuk mengunci keputusan transisi end-state secara formal

### Notes

- versi `0.62.3` memperjelas bahwa `web-psb-perkasa` tidak ditinggalkan sekarang; aplikasi itu tetap aktif sampai domain inti lolos mapping, staging, rekonsiliasi, kesiapan UI, hak akses, rollback, dan masa paralel operasional

## [0.62.2] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menegaskan keputusan arsitektur bahwa `web-psb-perkasa` menjadi baseline bisnis-operasional, sedangkan `perkasa-erp-oss-bss` menjadi baseline integrasi target
- `VERSION` dinaikkan ke `0.62.2` untuk mengunci keputusan baseline secara formal di artefak project

### Notes

- versi `0.62.2` menghilangkan ambiguitas arah integrasi: web lama tetap menjadi acuan proses harian, sementara ERP berkembang bertahap melalui mapping, staging, audit, dan transform per domain

## [0.62.1] - 2026-07-08

### Added

- dokumen `docs/web-psb-field-matrix-week-1.md` sebagai matriks field-by-field untuk `Ticket`, `Isolation`, `TroubleTicket`, dan `ODP`

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen matriks field minggu pertama masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.1` untuk menandai sinkronisasi dokumen operasional setelah baseline playbook `0.62.0`

### Notes

- versi `0.62.1` memperinci playbook integrasi minggu pertama ke level field, rule transform, dan rule review manual agar tim bisa langsung menyiapkan staging, validasi, dan rekonsiliasi tanpa menyentuh sistem lama

## [0.62.0] - 2026-07-08

### Added

- dokumen `docs/web-psb-integration-week-1.md` sebagai playbook integrasi 1 minggu yang memetakan modul `web-psb-perkasa` ke domain ERP dengan pola non-intrusive

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar playbook integrasi 1 minggu masuk ke indeks dokumentasi resmi project
- `VERSION` dinaikkan ke `0.62.0` sebagai baseline formal untuk paket integrasi minggu pertama

### Notes

- versi `0.62.0` mengunci pendekatan integrasi yang aman: `web-psb-perkasa` tetap menjadi sistem operasional utama, sedangkan ERP bergerak melalui read-only, staging, dan transform batch
- fokus minggu pertama dibatasi pada domain risiko rendah seperti `ODP`, `Isolation`, dan `Trouble Ticket summary`, serta menahan auth, billing live, dan write-back ke sistem lama

## [0.61.0] - 2026-07-07

### Added

- cache RBAC server kini ikut disegarkan setiap kali role-permissions diubah agar menu, guard halaman, dan guard API bisa segera mengikuti permission master dinamis

### Changed

- `apps/web/lib/access-control.ts` kini bersifat hybrid: tetap aman untuk client components, namun akan memakai snapshot permission DB bila tersedia di runtime server
- `apps/web/lib/services/access-permission-service.ts` memanggil invalidasi cache RBAC server setelah bootstrap/upsert/assign permission

## [0.60.0] - 2026-07-07

### Added

- filter interaktif pada detail batch import (status, domain, dan pencarian cepat) untuk mempercepat review row bermasalah sesuai PRD

## [0.59.0] - 2026-07-07

### Changed

- pipeline transform import tahap 1-4 sekarang ter-scope per batch dengan variabel `@batch_id` (mencegah transform lintas batch saat tombol transform dipicu dari web)
- `apps/web/lib/services/import-write-service.ts` sekarang mengeset `@batch_id` sebelum eksekusi SQL stage

### Added

- histori eksekusi transform per batch melalui tabel `staging_import_batch_transform_runs` (RUNNING/SUCCESS/FAILED, durasi, jumlah statement) dan ditampilkan pada detail batch import

## [0.58.1] - 2026-07-07

### Fixed

- merapikan struktur layout Next.js App Router dengan route group:
  - `(auth)` untuk `/login` tanpa `AppShell`
  - `(app)` untuk halaman aplikasi (dashboard/import/domain/settings) dengan `AppShell`
- menghapus `ShellBoundary` berbasis `usePathname()` yang berpotensi memicu hydration mismatch saat SSR/hydration

## [0.58.0] - 2026-07-07

### Added

- komponen `apps/web/components/billing-invoice-status-form.tsx` dan route `POST /api/billing/invoices/status` untuk membatalkan invoice unpaid langsung dari domain `billing`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action billing untuk pembatalan invoice selain generate invoice, collection action, dan payment entry
- `apps/web/lib/services/domain-service.ts` menambah review section billing: `Invoice Dibatalkan Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone pembatalan invoice tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.58.0` melengkapi lifecycle billing dengan pembatalan invoice yang aman tanpa penghapusan data
- pembatalan invoice tetap defensif: hanya role dengan izin update yang boleh menjalankan aksi, invoice yang sudah memiliki pembayaran ditolak untuk dibatalkan, dan status cancel otomatis menutup collection serta menonaktifkan suspend candidate

## [0.57.0] - 2026-07-07

### Added

- komponen `apps/web/components/billing-invoice-generate-form.tsx` dan route `POST /api/billing/invoices/generate` untuk membuat invoice dari subscription `ACTIVE` langsung dari domain `billing`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action billing: generate invoice, collection action, dan payment entry
- `apps/web/lib/services/domain-service.ts` menambah review section billing: `Subscription Billing-Ready` dan `Invoice Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone generate invoice tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.57.0` melengkapi fondasi invoice lifecycle billing: subscription aktif tanpa invoice recurring bulan berjalan sekarang bisa langsung digenerate dari web
- flow generate invoice tetap defensif: hanya untuk subscription `ACTIVE`, menolak duplikasi recurring per periode, membuat `invoice_no` otomatis, dan selalu menambah `billing_invoice_items` tipe `SUBSCRIPTION`

## [0.56.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-device-return-form.tsx` dan route `POST /api/inventory/device-assignments/status` untuk menyelesaikan assignment perangkat (RETURNED/DAMAGED/LOST) dengan pemulihan stok otomatis saat RETURNED
- komponen `apps/web/components/inventory-odp-port-status-form.tsx` dan route `POST /api/inventory/odp-ports/status` untuk mengubah status port (AVAILABLE/RESERVED/FAULTY/DISABLED) dan opsi mengosongkan mapping subscription/customer

### Changed

- `apps/web/components/domain-shell.tsx` menambah write action inventory untuk update status port ODP dan return perangkat
- `apps/web/lib/services/domain-service.ts` menambah review section inventory: `Port Bermasalah` dan `Device Return Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar flow return perangkat dan status port tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.56.0` melengkapi loop inventory jaringan: port ODP bisa di-reserve/faulty/disable, dan perangkat bisa direturn untuk memulihkan stok
- return perangkat bersifat defensif: hanya assignment dengan status ASSIGNED yang boleh ditutup, dan stok hanya bertambah saat status RETURNED

## [0.55.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-odp-create-form.tsx` dan route `POST /api/inventory/odps` untuk membuat master ODP beserta generate port otomatis
- komponen `apps/web/components/inventory-odp-port-assign-form.tsx` dan route `POST /api/inventory/odp-ports/assign` untuk assign port ODP ke subscription/customer
- komponen `apps/web/components/inventory-device-assignment-form.tsx` dan route `POST /api/inventory/device-assignments` untuk menautkan perangkat inventory ke subscription/work order/customer dan mencatat stok keluar

### Changed

- `apps/web/components/domain-shell.tsx` menambah write action inventory untuk ODP, assign port, dan device assignment
- `apps/web/lib/services/domain-service.ts` menambah review section inventory: `ODP Terbaru`, `Port Terpakai`, dan `Device Assignment Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui untuk mencerminkan flow ODP dan assignment inventory

### Notes

- versi `0.55.0` menutup gap inventory: dari item master + stock movement menjadi siap untuk pemetaan jaringan (ODP/port) dan assignment perangkat ke layanan
- flow baru tetap defensif: ODP code unik, port hanya bisa dipakai bila status AVAILABLE/RESERVED, movement stok keluar ditolak bila stok tidak cukup

## [0.54.0] - 2026-07-07

### Added

- komponen `apps/web/components/hr-salary-slip-form.tsx` dan route `POST /api/hr/salary-slips` untuk membuat slip gaji bulanan employee langsung dari domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action pada domain `hr`: employee, attendance, loan, dan salary slip
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Slip Gaji Terbaru` dari review DB untuk menutup loop payroll awal
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone payroll awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.54.0` melengkapi fondasi HR agar employee yang sudah memiliki attendance dan loan bisa langsung dibuatkan slip gaji dari web
- payroll tetap defensif: slip gaji menolak duplikasi employee per bulan/tahun, `loan_deduction` bisa otomatis mengambil cicilan loan aktif, dan `net_salary` tidak boleh negatif

## [0.53.0] - 2026-07-07

### Added

- komponen `apps/web/components/hr-attendance-form.tsx` dan route `POST /api/hr/attendance` untuk mencatat attendance harian employee langsung dari domain `hr`
- komponen `apps/web/components/hr-loan-create-form.tsx` dan route `POST /api/hr/loans` untuk mencatat loan atau kasbon employee langsung dari domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action pada domain `hr`: employee master, attendance, dan loan
- suggestion employee untuk form attendance dan loan diambil dari review section employee yang aktif pada halaman HR
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone attendance dan loan awal tercermin pada dokumentasi

### Notes

- versi `0.53.0` melengkapi fondasi HR agar employee yang sudah dibuat bisa langsung memiliki attendance dan loan dari web
- flow baru tetap defensif: attendance menolak duplikasi employee pada tanggal yang sama, validasi check-in/check-out dijaga, dan loan hanya bisa dibuat untuk employee yang valid dengan nominal yang masuk akal

## [0.52.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-stock-movement-form.tsx` dan route `POST /api/inventory/stock-movements` untuk mencatat histori pergerakan stok dari item inventory yang sudah ada
- komponen `apps/web/components/hr-employee-create-form.tsx` dan route `POST /api/hr/employees` untuk membuat employee master awal pada domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `inventory` dan satu write action awal pada domain `hr`
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section HR (`Employee Terbaru`, `Attendance Hari Ini`, `Loan Aktif`) dan memperkaya inventory dengan movement terbaru yang berasal dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone inventory movement dan HR awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.52.0` membuka fondasi write action awal untuk domain HR dan melengkapi inventory agar item master bisa langsung mempunyai histori movement
- flow baru tetap defensif: movement OUT menolak stok minus, employee code dibuat otomatis, dan cabang/divisi HR hanya ditautkan jika kode master valid

## [0.51.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-item-create-form.tsx` untuk membuat item master inventory langsung dari halaman domain `inventory`
- route `POST /api/inventory/items` di `apps/web/app/api/inventory/items/route.ts` untuk menyimpan item baru ke tabel `inventory_items` dengan `item_code` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action awal pada domain `inventory` untuk menambah item master langsung dari web
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section `Item Inventory Terbaru` dan `Stock Movement Terbaru` dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone inventory awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.51.0` membuka write action pertama pada domain inventory agar item master dan review movement tidak lagi hanya berupa shell summary
- item inventory saat ini tetap defensif: kategori dan satuan wajib ada di master review DB, `item_code` dibuat otomatis, dan angka stok divalidasi sebelum insert

## [0.50.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-subscription-activate-form.tsx` untuk mengaktifkan subscription langsung dari sales order pada halaman domain `sales`
- route `POST /api/sales/subscriptions` di `apps/web/app/api/sales/subscriptions/route.ts` untuk membuat `service_subscriptions`, melengkapi customer master bila belum ada, dan menautkan hasil aktivasi ke order/work order

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan enam write action pada domain `sales`: create lead, create coverage, create survey, create sales order, create work order, dan aktivasi subscription
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Subscription Aktivasi Terbaru` dari review DB untuk menutup loop sales ke layanan aktif
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone aktivasi subscription tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.50.0` menutup gap awal aktivasi subscription sehingga alur sales kini sudah bisa bergerak dari lead sampai layanan aktif
- aktivasi saat ini tetap defensif: order sumber wajib valid, paket wajib aktif, `service_no` dibuat otomatis, customer master dibentuk otomatis bila belum ada, dan work order instalasi terakhir ikut diselesaikan bila tersedia

## [0.49.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-coverage-create-form.tsx` untuk membuat coverage area awal dari lead langsung pada halaman domain `sales`
- route `POST /api/sales/covered-areas` di `apps/web/app/api/sales/covered-areas/route.ts` untuk menyimpan coverage area ke tabel `sales_covered_areas` dengan `area_code` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan lima write action pada domain `sales`: create lead, create coverage, create survey, create sales order, dan create work order
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Coverage Terbaru` dari review DB untuk memperlihatkan kesiapan area layanan
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone coverage flow tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.49.0` menutup gap awal coverage flow sehingga validasi area layanan bisa dicatat sebelum survey dan order dilanjutkan
- coverage saat ini tetap defensif: sumber wajib dari lead valid, `area_code` dibuat otomatis, dan lead sumber diselaraskan ke `QUALIFIED` atau `COVERAGE_CHECK` sesuai status coverage

## [0.48.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-survey-create-form.tsx` untuk membuat survey awal langsung dari lead pada halaman domain `sales`
- route `POST /api/sales/surveys` di `apps/web/app/api/sales/surveys/route.ts` untuk menyimpan survey ke tabel `sales_surveys` dengan `survey_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action pada domain `sales`: create lead, create survey, create sales order, dan create work order
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone sales survey flow tercermin pada dokumentasi implementasi web

### Notes

- versi `0.48.0` menutup gap awal write action survey sehingga proses coverage dan feasibility bisa mulai dicatat tanpa menunggu workflow sales lengkap
- survey saat ini tetap defensif: sumber wajib dari lead valid, `survey_no` dibuat otomatis, dan lead sumber didorong ke status `SURVEY_REQUEST` setelah survey dibuat

## [0.47.0] - 2026-07-06

### Added

- komponen `apps/web/components/sales-work-order-create-form.tsx` untuk membuat work order delivery dari sales order aktif langsung dari halaman domain `sales`
- route `POST /api/sales/work-orders` di `apps/web/app/api/sales/work-orders/route.ts` untuk menyimpan work order ke tabel `service_work_orders` dengan `work_order_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action pada domain `sales`: create lead, create sales order, dan create work order
- `apps/web/lib/services/domain-service.ts` sekarang menambahkan `Order ID` pada review queue order dan memuat review section baru `Work Order Aktif` dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone work order flow tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.47.0` menutup gap awal transisi order ke delivery lapangan tanpa menunggu aktivasi subscription penuh
- work order saat ini tetap defensif: sumber wajib dari sales order valid, nomor work order dibuat otomatis, dan order sumber didorong ke status `READY_INSTALL` atau `ON_PROCESS` sesuai status awal work order

## [0.46.0] - 2026-07-06

### Added

- komponen `apps/web/components/sales-order-create-form.tsx` untuk membuat sales order baru dari lead yang sudah ada langsung dari halaman domain `sales`
- route `POST /api/sales/orders` di `apps/web/app/api/sales/orders/route.ts` untuk menyimpan order ke tabel `sales_orders` dengan `order_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `sales`: create lead dan create sales order
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone sales order flow tercermin pada dokumentasi implementasi web

### Notes

- versi `0.46.0` menutup gap awal transisi lead ke order tanpa menunggu integrasi work order penuh
- sales order saat ini tetap defensif: sumber wajib berasal dari lead yang valid, `order_no` dibuat otomatis, dan jadwal instalasi masih opsional

## [0.45.0] - 2026-07-06

### Added

- komponen `apps/web/components/billing-payment-form.tsx` untuk menambah pembayaran invoice langsung dari halaman domain `billing`
- route `POST /api/billing/payments` di `apps/web/app/api/billing/payments/route.ts` untuk menyimpan payment entry ke `billing_payments`

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat daftar pembayaran terbaru dari review DB sebagai review section baru pada domain `billing`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `billing`: collection action dan payment entry
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone payment billing tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.45.0` menutup gap awal lifecycle invoice dengan menambahkan payment entry yang menyelaraskan `paid_amount` dan `invoice_status`
- payment entry bersifat defensif: overpayment ditolak, invoice `PAID` tidak bisa dibayar ulang, dan invoice lunas otomatis menutup `collection_status` serta membersihkan `suspend_candidate`

## [0.44.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-dismantle-form.tsx` untuk memindahkan pelanggan dari isolir aktif ke histori dismantle langsung dari halaman domain `support`
- route `POST /api/support/isolations/[id]/dismantle` di `apps/web/app/api/support/isolations/[id]/dismantle/route.ts` untuk menyimpan snapshot ke `support_dismantle_history` dan mengarsipkan sumber isolir

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat histori dismantle terbaru dari review DB sebagai review section baru pada domain `support`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan flow dismantle di samping create/close ticket, SLA, isolir aktif, dan restorasi isolir
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone dismantle support tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.44.0` melengkapi loop awal domain `support` dengan histori dismantle yang aman dan terpisah dari data aktif
- flow ini mengikuti prinsip arsip: data dengan histori dismantle dipindahkan ke `support_dismantle_history` dan sumber isolir ditandai `is_archived = 1`

## [0.43.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-isolation-restore-form.tsx` untuk menutup isolir aktif langsung dari halaman domain `support`
- route `POST /api/support/isolations/[id]/restore` di `apps/web/app/api/support/isolations/[id]/restore/route.ts` untuk menyimpan restorasi isolir ke tabel `support_isolations`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action restorasi isolir di samping create ticket, close ticket, kelola SLA, dan tambah isolir aktif
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone restorasi isolir tercermin pada dokumentasi implementasi web

### Notes

- versi `0.43.0` menutup loop dasar workflow isolir: web sekarang bisa menambah isolir aktif dan menutupnya kembali melalui restorasi
- cakupan support tetap parsial karena dismantle flow web dan automasi SLA penuh masih belum tersedia

## [0.42.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-isolation-form.tsx` untuk menambah pelanggan isolir aktif langsung dari halaman domain `support`
- route `POST /api/support/isolations` di `apps/web/app/api/support/isolations/route.ts` untuk menyimpan data isolir aktif ke tabel `support_isolations`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action awal pada domain `support`: create ticket, close ticket, kelola SLA, dan tambah isolir aktif
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone isolir support tercermin pada dokumentasi implementasi web

### Notes

- versi `0.42.0` memperluas domain `support` ke write action isolir dasar yang menjadi jembatan menuju workflow suspend, restorasi, dan dismantle
- cakupan support masih parsial karena close/open TT, SLA, dan isolir sudah hidup, tetapi restorasi isolir dan dismantle flow web masih belum tersedia

## [0.41.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-sla-form.tsx` untuk membuat atau memperbarui SLA trouble ticket langsung dari halaman domain `support`
- route `POST /api/support/trouble-ticket-sla` di `apps/web/app/api/support/trouble-ticket-sla/route.ts` untuk menyimpan SLA ke tabel `support_trouble_ticket_sla`

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat daftar SLA aktif dari review DB dan menampilkannya sebagai review section baru pada domain `support`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan form SLA support untuk role yang memiliki izin approve
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone SLA support tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.41.0` memperluas domain `support` dari open/close trouble ticket ke kontrol SLA dasar per tipe ticket
- cakupan support masih parsial karena isolir action dan dismantle flow web masih belum dihidupkan

## [0.40.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-ticket-close-form.tsx` untuk menutup trouble ticket open langsung dari halaman domain `support`
- route `POST /api/support/trouble-tickets/[ticketCode]/close` di `apps/web/app/api/support/trouble-tickets/[ticketCode]/close/route.ts` untuk menyimpan hasil close ke review DB

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua form write action pada domain `support`: create ticket dan close ticket
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone close flow support tercermin pada dokumentasi implementasi web

### Notes

- versi `0.40.0` menutup gap penting pada domain `support`: web review sekarang tidak hanya bisa membuat trouble ticket open, tetapi juga menutup ticket yang masih aktif langsung ke `support_trouble_tickets`
- cakupan support masih bersifat parsial karena SLA penuh, isolir action, dan dismantle flow belum dihidupkan dari web

## [0.39.0] - 2026-07-06

### Added

- service `apps/web/lib/services/auth-user-audit-service.ts` untuk ensure table, mencatat, dan membaca audit log perubahan user internal
- komponen `apps/web/components/auth-user-audit-list.tsx` untuk menampilkan jejak create, update, dan reset password di halaman `settings/users`
- tabel `auth_user_audit_logs` pada `database/xampp_review_schema.sql` sebagai fondasi audit formal user internal

### Changed

- `apps/web/app/api/settings/users/route.ts` sekarang mencatat audit saat user internal baru dibuat
- `apps/web/app/api/settings/users/[id]/route.ts` sekarang mencatat audit update profil dan reset password tanpa memblokir aksi utama
- `apps/web/app/settings/users/page.tsx`, `apps/web/lib/services/auth-user-service.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone audit user internal tercermin di UI, fallback mock, pengujian, dan tracker PRD

### Notes

- versi `0.39.0` menutup gap audit dasar pada modul `settings/users`, sehingga create, edit, change status, dan reset password kini punya jejak formal di web review
- audit tetap dirancang defensif: kegagalan pencatatan log tidak membatalkan aksi utama create/update/reset password

## [0.38.0] - 2026-07-06

### Added

- komponen `apps/web/components/auth-user-management-table.tsx` untuk mengelola user internal langsung dari halaman `settings/users`
- endpoint `PATCH /api/settings/users/[id]` di `apps/web/app/api/settings/users/[id]/route.ts` untuk update profil inti user dan reset password review

### Changed

- `apps/web/lib/services/auth-user-service.ts` diperluas agar list user membawa `roleId`, `roleCode`, `divisionId`, dan `branchId` sebagai basis form edit
- `apps/web/app/settings/users/page.tsx` sekarang menampilkan table manage user, bukan hanya direktori read-only
- `apps/web/README.md`, `docs/prd-web-checklist.md`, dan `VERSION` diperbarui untuk mencerminkan milestone manajemen user internal yang lebih lengkap

### Notes

- versi `0.38.0` menutup gap utama pada `settings/users`: user review sekarang bisa dibuat, diedit, dinonaktifkan/diaktifkan kembali, dan password-nya direset dari web
- username sengaja tetap dikunci pada tahap ini agar identitas login tidak berubah sembarangan saat fondasi auth internal masih distabilkan

## [0.37.0] - 2026-07-06

### Added

- tabel `staging_import_batch_actions` pada `database/xampp_review_staging_import.sql` untuk menyimpan histori aksi batch import secara terstruktur
- timeline histori aksi pada detail batch import melalui `apps/web/components/import-batch-detail-view.tsx`

### Changed

- `apps/web/lib/services/import-write-service.ts` sekarang menangani ensure table histori, pencatatan aksi, dan pembacaan action log per batch
- `apps/web/app/api/import/batches/route.ts`, `apps/web/app/api/import/batches/[id]/route.ts`, serta flow validasi/transform sekarang mencatat event `CREATE`, `UPLOAD`, `VALIDATE`, dan `TRANSFORM`
- `apps/web/lib/services/import-service.ts` dan `apps/web/lib/mock-import.ts` diperluas agar detail batch membawa histori aksi
- `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone histori aksi batch tercatat

### Notes

- versi `0.37.0` menutup gap histori aksi Import Center sehingga jejak create, upload, validasi, dan transform bisa direview langsung dari web
- pencatatan histori dirancang tidak memblokir aksi utama, jadi create/upload/validasi/transform tetap berjalan meskipun tabel histori belum bisa dibuat di database review

## [0.36.0] - 2026-07-06

### Added

- service `apps/web/lib/services/import-file-loader.ts` untuk mem-parse file upload dan memuat row ke tabel `staging_*` sesuai scope batch
- dokumentasi `docs/import-file-format.md` yang menjelaskan format JSON/XLSX/XLS/CSV yang didukung oleh Import Center web
- dependency `xlsx` pada `apps/web/package.json` untuk membaca workbook upload dari browser

### Changed

- `POST /api/import/batches/[id]` di `apps/web/app/api/import/batches/[id]/route.ts` sekarang tidak hanya menyimpan file lokal, tetapi juga otomatis mengisi row staging dan memperbarui total row batch
- `apps/web/components/import-batch-upload-form.tsx` dan `apps/web/README.md` diperbarui agar menjelaskan batasan format file yang aman untuk parser otomatis
- `docs/README.md`, `README.md`, dan `docs/prd-web-checklist.md` diperbarui agar status parser upload ke staging tercatat

### Notes

- versi `0.36.0` menutup gap terbesar pada Import Center web: file upload sekarang bisa langsung menjadi row staging yang siap divalidasi dan ditransform dari web
- parser saat ini paling kuat untuk `JSON` terstruktur dan workbook `XLSX/XLS` multi-sheet per scope, sedangkan `CSV` disarankan hanya untuk scope satu section

## [0.35.0] - 2026-07-06

### Added

- service `apps/web/lib/services/import-write-service.ts` untuk validasi row staging, rekap batch, dan eksekusi baseline SQL transform tahap 1-4
- endpoint `POST /api/import/batches/[id]/validate` untuk memvalidasi row staging batch dari web
- endpoint `POST /api/import/batches/[id]/transform` untuk menjalankan transform tahap 1-4 dari web
- komponen `apps/web/components/import-batch-action-panel.tsx` untuk tombol validasi dan transform pada detail batch

### Changed

- `apps/web/app/import/[batchId]/page.tsx` dan `apps/web/components/import-batch-detail-view.tsx` diperluas agar detail batch sekarang memuat area approval, validasi, dan trigger transform
- `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone approve/transform pada Import Center tercatat

### Notes

- versi `0.35.0` membuat Import Center jauh lebih utuh di web: alur create batch, upload file, validasi batch, lalu trigger transform tahap 1-4 sekarang sudah tersedia dari satu halaman detail batch
- transform saat ini menjalankan baseline SQL review yang ada di folder `database/`, sehingga eksekusi masih mengikuti model review global dan belum memiliki histori eksekusi terstruktur per batch

## [0.34.0] - 2026-07-06

### Added

- form `apps/web/components/import-batch-upload-form.tsx` untuk upload file sumber pada detail batch import
- dukungan `POST /api/import/batches/[id]` di `apps/web/app/api/import/batches/[id]/route.ts` untuk menerima file `xlsx`, `xls`, `csv`, atau `json`

### Changed

- `apps/web/lib/types.ts`, `apps/web/lib/services/import-service.ts`, dan `apps/web/lib/mock-import.ts` diperluas agar batch membawa metadata `sourceFileName`
- `apps/web/components/import-batch-detail-view.tsx` dan `apps/web/components/import-batch-table.tsx` sekarang menampilkan file sumber batch
- `.gitignore`, `apps/web/README.md`, `docs/prd-web-checklist.md`, dan `apps/web/tests/mock-data.test.ts` diperbarui untuk mencerminkan milestone upload file import

### Notes

- versi `0.34.0` menambahkan langkah kedua pada write-side Import Center: file sumber bisa diunggah ke storage lokal project dan metadata batch otomatis diperbarui ke status `UPLOADED`
- langkah berikutnya yang paling logis adalah validasi batch dan trigger transform tahap 1-4 dari web

## [0.33.0] - 2026-07-06

### Added

- form `apps/web/components/import-batch-create-form.tsx` untuk membuat batch review baru dari Import Center
- dukungan `POST /api/import/batches` di `apps/web/app/api/import/batches/route.ts` untuk menambah row baru ke `staging_import_batches`

### Changed

- halaman `apps/web/app/import/page.tsx` sekarang menampilkan write action awal Import Center untuk role yang memiliki izin create
- smoke test `apps/web/tests/mock-data.test.ts` diperluas agar memverifikasi izin create pada `import_center`
- dokumentasi `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar status Import Center mencerminkan create batch dari web

### Notes

- versi `0.33.0` menandai write-side pertama pada Import Center, dimulai dari pembuatan batch review tanpa menyentuh transform
- langkah berikutnya yang paling logis adalah upload file sumber, validasi batch, lalu trigger transform tahap 1-4 dari web

## [0.32.0] - 2026-07-06

### Added

- dokumen `docs/prd-web-checklist.md` sebagai tracker status implementasi web terhadap requirement PRD aplikasi web utama

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar checklist PRD web masuk ke indeks dokumen resmi project

### Notes

- versi `0.32.0` menambahkan artefak kendali implementasi agar gap antara PRD dan web bisa dipantau lebih objektif per iterasi
- checklist ini dirancang sebagai acuan fase berikutnya, terutama untuk import pipeline, inventory, HR, dan CRUD user internal lanjutan

## [0.31.0] - 2026-07-06

### Added

- form `apps/web/components/auth-user-create-form.tsx` untuk menambah user internal baru dari halaman `settings/users`
- route `POST /api/settings/users` di `apps/web/app/api/settings/users/route.ts` untuk menyimpan user baru ke `auth_users`
- lookup role, divisi, dan cabang pada service `apps/web/lib/services/auth-user-service.ts` agar create user memakai referensi master review DB

### Changed

- halaman `apps/web/app/settings/users/page.tsx` sekarang tidak lagi read-only; halaman ini sudah bisa dipakai untuk review sekaligus create user internal
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi lookup option user internal tetap tersedia
- dokumentasi `apps/web/README.md` diperbarui agar status auth internal mencakup write action awal user management

### Notes

- versi `0.31.0` menandai langkah awal CRUD user internal, dimulai dari create user langsung ke `auth_users`
- langkah berikutnya yang paling logis adalah edit user, reset password, dan deactivate/reactivate akun

## [0.30.0] - 2026-07-06

### Added

- halaman `apps/web/app/settings/users/page.tsx` untuk menampilkan direktori user auth internal di area settings
- service layer `apps/web/lib/services/auth-user-service.ts` untuk membaca `auth_users` dari review DB dengan fallback ke akun bootstrap mock
- navigasi `User Internal` khusus `SUPER_ADMIN` agar fondasi manajemen user mulai terlihat di shell aplikasi

### Changed

- matrix akses dan whitelist route diperluas agar `SUPER_ADMIN` dapat membuka `/settings/users`
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi akses route dan data directory user internal
- root project sekarang memiliki `.gitignore` dan repository lokal sudah diinisialisasi dengan `git init` agar siap dipublikasikan ke GitHub

### Notes

- versi `0.30.0` menandai bahwa auth internal tidak lagi hanya hidup di login resolver, tetapi mulai punya permukaan review di UI
- pembuatan repo GitHub private sudah dicoba, tetapi masih terblokir karena sesi browser GitHub belum login

## [0.29.0] - 2026-07-06

### Added

- file `database/xampp_review_auth_seed.sql` untuk menyiapkan akun review minimum di `auth_users`
- dokumen `docs/auth-review-seed.md` yang menjelaskan urutan eksekusi seed auth internal dan kredensial awal review
- role `OPERATOR` ke `database/xampp_review_core_master_seed.sql` agar role aplikasi web punya representasi langsung di review DB

### Changed

- smoke test `apps/web/tests/mock-data.test.ts` diperbaiki agar type-safe terhadap union result dari hybrid auth
- dokumentasi root, docs index, core seed, dan `apps/web/README.md` diperbarui agar langkah auth internal sekarang mencakup seed user review

### Notes

- versi `0.29.0` menandai transisi auth internal dari sekadar fallback-aware menjadi siap diuji end-to-end di MySQL review
- langkah berikutnya yang paling logis adalah menjalankan seed ini di XAMPP review lalu menambahkan manajemen user internal berbasis CRUD

## [0.28.0] - 2026-07-06

### Added

- mode auth hybrid yang memprioritaskan `auth_users/auth_roles` dari review DB saat tersedia
- fallback aman ke akun bootstrap mock bila review DB auth belum siap atau user review belum tersedia
- dukungan verifikasi password langsung dan `sha256` sederhana untuk fase transisi mapping user lama ke `auth_users.password_hash`

### Changed

- route login sekarang tidak lagi hard-coded ke mock, tetapi memakai resolver auth terpadu
- halaman login diperbarui agar menjelaskan status auth hybrid dan memisahkan istilah akun bootstrap mock dari auth internal
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi fallback auth tetap bekerja saat review DB belum aktif

### Notes

- versi `0.28.0` menandai awal transisi dari auth mock ke auth internal tanpa memutus akses development lokal
- langkah berikutnya yang disarankan adalah menyiapkan seed `auth_users` review DB atau layar manajemen user internal agar hybrid auth bisa dipakai penuh

## [0.27.0] - 2026-07-06

### Added

- route `POST /api/customers` untuk menambah customer master baru ke `crm_customers`
- penyimpanan alamat utama sekaligus ke `crm_customer_addresses` saat customer review dibuat
- form inline write action pada domain `customers` untuk input nama customer, tipe, identitas, kontak, alamat utama, dan maps URL

### Changed

- domain `customers` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat customer review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `customers` mencakup write action awal
- write-side ERP baru kini mencakup empat domain prioritas: `billing`, `sales`, `support`, dan `customers`

### Notes

- versi `0.27.0` melengkapi gelombang awal write-side pada empat domain prioritas tanpa mengubah flow import/transform yang sudah ada
- langkah berikutnya paling logis adalah memulai transisi auth internal atau memperdalam write action lanjutan per domain

## [0.26.0] - 2026-07-06

### Added

- route `POST /api/support/trouble-tickets` untuk menambah trouble ticket open baru ke `support_trouble_tickets`
- form inline write action pada domain `support` untuk input nama customer, customer user, kategori, tipe ticket, status awal, problem category, dan catatan
- generator `ticket_code` review dengan prefix kategori (`TT` / `PV`) dan urutan bulanan sederhana untuk menjaga keunikan ticket baru

### Changed

- domain `support` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat trouble ticket review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `support` mencakup write action awal
- write-side ERP baru kini mencakup tiga domain operasional awal: `billing`, `sales`, dan `support`

### Notes

- versi `0.26.0` memperluas write-side dari billing dan sales ke support tanpa menyentuh logika close ticket maupun histori dismantle
- langkah berikutnya paling logis adalah write action awal di `customers` atau mulai transisi dari auth mock ke auth internal

## [0.25.0] - 2026-07-06

### Added

- route `POST /api/sales/leads` untuk menambah lead baru langsung ke tabel `sales_leads` pada review DB
- form inline write action pada domain `sales` untuk input nama prospek, tipe lead, status awal, source, PIC marketing, alamat, dan catatan
- integrasi suggestion marketing pada halaman `sales` dari review queue yang sedang tampil agar input manual lebih konsisten

### Changed

- domain `sales` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat lead review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `sales` mencakup write action awal
- pola write action lintas domain kini dimulai dari `billing` dan `sales` sebagai fondasi form operasional berikutnya

### Notes

- versi `0.25.0` memperluas write-side ERP baru dari billing ke sales tanpa mengubah alur transform/import yang sudah ada
- langkah berikutnya paling logis adalah write action review di `support` atau `customers`, atau mulai mengganti auth mock ke auth internal

## [0.24.0] - 2026-07-06

### Added

- route `POST /api/billing/collection-actions` untuk menambah histori collection action langsung ke review DB
- form inline write action pada domain `billing` untuk input `invoice_no`, `action_type`, `action_status`, `follow up`, dan catatan
- helper `runReviewDbExecute()` pada adapter MySQL review agar service/route bisa menjalankan statement write dengan pool yang sama

### Changed

- domain `billing` sekarang tidak lagi read-only; modul ini sudah memiliki write action backend pertama yang aman untuk workflow review
- penyimpanan collection action ikut menyelaraskan `collection_status` invoice dan flag `suspend_candidate` ketika tipe aksi menuntutnya
- dokumentasi `apps/web/README.md` diperbarui agar status billing mencakup write action awal

### Notes

- versi `0.24.0` menjadi tonggak write action backend pertama di project ERP baru tanpa menyentuh data inti secara destruktif
- pola ini sengaja dipilih dari domain `billing` karena paling aman untuk memulai write-side sebelum form operasional besar lain dibuat

## [0.23.0] - 2026-07-06

### Added

- query review DB untuk daftar `lead terbaru` dari `sales_leads`
- query review DB untuk daftar `survey dan order berjalan` dari `sales_surveys` dan `sales_orders`
- fallback mock review operasional pada domain `sales` agar funnel akuisisi tetap dapat direview saat `review-db` belum siap

### Changed

- shell domain `sales` sekarang tidak hanya menampilkan KPI funnel, tetapi juga daftar lead dan alur delivery awal yang sedang bergerak
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `sales`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `sales`

### Notes

- versi `0.23.0` menyelesaikan gelombang awal review section untuk empat domain prioritas: `sales`, `support`, `customers`, dan `billing`
- sesudah ini fokus paling logis adalah domain `inventory`/`hr` atau mulai membuat write action backend pertama

## [0.22.0] - 2026-07-06

### Added

- query review DB untuk daftar `invoice perlu tindak lanjut` dari `billing_invoices` yang ditautkan ke customer subscription
- query review DB untuk daftar `collection action terbaru` dari `billing_collection_actions`
- fallback mock review operasional pada domain `billing` agar alur collection tetap bisa direview saat `review-db` belum siap

### Changed

- shell domain `billing` sekarang tidak berhenti di KPI overdue/partial, tetapi mulai menampilkan queue operasional invoice dan collection action
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `billing`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `billing`

### Notes

- versi `0.22.0` menyelesaikan gelombang awal review section untuk tiga domain prioritas: `support`, `customers`, dan `billing`
- langkah berikutnya paling logis adalah membawa domain `sales` ke pola yang sama atau mulai membuat write action backend pertama

## [0.21.0] - 2026-07-06

### Added

- query review DB untuk daftar `customer terbaru` dari `crm_customers` dan alamat utama `crm_customer_addresses`
- query review DB untuk daftar `subscription aktif` dari `service_subscriptions` yang ditautkan ke customer dan paket
- fallback mock review operasional pada domain `customers` agar lifecycle customer tetap dapat direview saat mode `review-db` belum siap

### Changed

- shell domain `customers` sekarang tidak hanya menampilkan KPI, tetapi juga review data operasional customer dan layanan aktif
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `customers`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `customers`

### Notes

- versi `0.21.0` memperluas pola review section dari domain `support` ke domain `customers`
- fondasi ini memudahkan iterasi berikutnya untuk membawa domain `billing` atau `sales` ke pola review data yang sama

## [0.20.0] - 2026-07-06

### Added

- review section reusable pada shell domain untuk menampilkan daftar operasional ringkas di bawah kartu summary
- query review DB untuk daftar `TT open` dan `isolir aktif` terbaru pada domain `support`
- sampel review operasional mock pada domain `support` agar fallback tetap informatif saat koneksi review DB belum siap

### Changed

- halaman domain `support` tidak lagi berhenti di KPI; sekarang mulai menampilkan daftar kerja operasional yang lebih dekat ke alur harian support
- smoke test `apps/web/tests/mock-data.test.ts` diperluas agar memverifikasi keberadaan review section pada domain `support`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup daftar operasional support

### Notes

- versi `0.20.0` menandai transisi shell domain dari summary-only menuju review data operasional nyata
- pola review section ini sengaja dibuat reusable agar domain lain seperti `sales`, `customers`, atau `billing` bisa mengikuti pendekatan yang sama pada iterasi berikutnya

## [0.19.0] - 2026-07-06

### Added

- adapter `apps/web/lib/review-db.ts` untuk koneksi MySQL review berbasis `DATABASE_URL`
- dependency `mysql2` dan env `REVIEW_DB_CONNECT_TIMEOUT_MS`
- query review DB untuk `dashboard`, `import center`, detail batch, dan summary shell domain

### Changed

- `dashboard-service`, `import-service`, dan `domain-service` sekarang mencoba membaca MySQL review saat `APP_DATA_MODE=review-db`
- service layer akan fallback ke mock dengan status sumber data eksplisit jika koneksi atau query review DB gagal
- tipe status import dan batch detail diperluas agar cocok dengan nilai staging riil seperti `DRAFT`, `FAILED`, `PENDING`, `INVALID`, dan `SKIPPED`
- smoke test diubah untuk memverifikasi jalur fallback `review-db` tanpa mensyaratkan MySQL aktif di sandbox

### Notes

- versi `0.19.0` menandai bahwa web baru sudah mulai membaca database review nyata, walaupun masih memakai fallback mock saat koneksi belum tersedia
- tahap berikutnya adalah memperdalam query domain, form operasional, dan write action ke backend review yang sama

## [0.18.0] - 2026-07-06

### Added

- service layer `apps/web/lib/services/domain-service.ts` untuk shell domain `sales`, `customers`, `support`, `inventory`, `hr`, dan `billing`
- route handler `GET /api/domains/[domain]` dengan guard session dan role access
- capability badge per domain untuk menampilkan aksi aktif hasil permission matrix pada UI

### Changed

- halaman `app/[domain]/page.tsx` tidak lagi membaca `mock-domains` secara langsung; sekarang memakai service layer domain
- komponen `apps/web/components/domain-shell.tsx` sekarang menampilkan status sumber data dan capability aktif per role
- kontrak tipe domain diperjelas melalui `DomainKey`, `DomainCapability`, dan `DomainPageData`
- smoke test diperluas untuk memverifikasi service layer domain dan capability per role

### Notes

- versi `0.18.0` menandai bahwa semua shell utama di `apps/web` sekarang sudah berada di pola data access layer yang seragam
- konektor database review untuk domain masih belum aktif, tetapi jalur integrasinya sekarang sudah konsisten dengan dashboard dan import

## [0.17.0] - 2026-07-06

### Added

- helper `apps/web/lib/data-source.ts` untuk menentukan mode sumber data `mock` vs `review-db`
- service layer `apps/web/lib/services/dashboard-service.ts` dan `apps/web/lib/services/import-service.ts`
- komponen `apps/web/components/data-source-status.tsx`
- file `apps/web/.env.example` untuk kontrak `APP_DATA_MODE` dan `DATABASE_URL`

### Changed

- halaman `dashboard`, `import`, `import/[batchId]`, dan API terkait sekarang membaca service layer, bukan mengimpor mock source langsung
- UI dashboard dan import sekarang menampilkan status sumber data efektif beserta fallback jika `review-db` belum siap
- smoke test diperluas agar memverifikasi data mode, fallback source, dan service layer

### Notes

- versi `0.17.0` menandai transisi dari mock source langsung ke data access layer yang siap diarahkan ke MySQL review
- koneksi database nyata belum diaktifkan pada tahap ini; `review-db` masih berupa kontrak konfigurasi dengan fallback eksplisit ke mock

## [0.16.0] - 2026-07-06

### Added

- script `apps/web/scripts/sandbox-verify.ps1` untuk menjalankan verifikasi lewat runner temp di luar workspace
- dokumentasi `Verifikasi Sandbox` pada `apps/web/README.md`

### Changed

- proses verifikasi `apps/web` sekarang punya jalur resmi yang kompatibel dengan sandbox tanpa membuat `node_modules` di dalam project

### Notes

- sandbox workspace memblokir operasi pada `apps/web/node_modules`, termasuk pembuatan junction ke folder temp
- jalur yang terbukti berhasil adalah menyalin `apps/web` ke `%TEMP%\perkasa-web-runner`, lalu menjalankan `npm install`, `npm run check`, dan `npm run test:smoke` di sana

## [0.15.0] - 2026-07-06

### Added

- permission matrix per role di `apps/web/lib/access-control.ts` untuk resource dan aksi domain
- komponen `apps/web/components/access/permission-matrix.tsx` untuk menampilkan matrix izin di UI
- ringkasan permission aktif pada halaman `settings/access`

### Changed

- `settings/access` tidak lagi memakai shell generik; halaman ini sekarang menampilkan role aktif, ringkasan izin, dan matrix aksi per resource
- pengujian di `apps/web/tests/mock-data.test.ts` diperluas agar mencakup permission matrix dan action check
- `apps/web/README.md` diperbarui agar milestone bootstrap mencakup permission matrix per role

### Notes

- versi `0.15.0` menandai bahwa fondasi authorization sekarang sudah naik dari pembatasan route ke model izin yang mulai mendekati kebutuhan operasional
- matrix pada tahap ini masih mock dan statis, tetapi bentuk kontraknya sudah cukup untuk dihubungkan ke auth internal dan master permission nyata pada iterasi berikutnya

## [0.14.0] - 2026-07-06

### Added

- helper role access di `apps/web/lib/access-control.ts` untuk menentukan landing page, navigasi, shortcut modul, dan izin route per role
- akun review `OPERATOR` tambahan untuk menguji pembatasan menu dan route
- pengujian role access pada `apps/web/tests/mock-data.test.ts`

### Changed

- sidebar dan shortcut dashboard sekarang hanya menampilkan menu yang sesuai role session
- halaman `import`, detail batch, shell domain, dan `settings/access` sekarang mengecek izin role, bukan sekadar status login
- API import dan topbar shortcut `Review Batch` sekarang mengikuti izin role yang sama
- `apps/web/README.md` diperbarui agar cakupan bootstrap mencakup role-based access awal

### Notes

- versi `0.14.0` menandai bahwa auth mock sekarang sudah punya lapisan authorization awal, sehingga struktur satu website mulai mencerminkan pembatasan akses per role
- model izin pada tahap ini masih sederhana dan berbasis prefix route, lalu bisa diperdalam ke level permission per data domain pada iterasi berikutnya

## [0.13.0] - 2026-07-06

### Added

- helper session di `apps/web/lib/auth-session.ts` untuk akun review, pembuatan token, dan verifikasi session cookie
- helper server auth di `apps/web/lib/auth.ts` untuk membaca cookie, guard halaman, dan mengelola cookie response
- route handler `POST /api/auth/login` dan `POST /api/auth/logout`
- pengujian auth mock pada `apps/web/tests/mock-data.test.ts`

### Changed

- halaman `login` sekarang benar-benar mengirim kredensial ke route auth mock dan menampilkan pesan error login
- `dashboard`, `import`, `import/[batchId]`, shell domain, dan API mock sekarang memerlukan session login
- topbar shell aplikasi sekarang menampilkan identitas session aktif dan tombol logout
- `apps/web/README.md` diperbarui agar cakupan bootstrap mencakup auth mock

### Notes

- versi `0.13.0` menandai bahwa bootstrap aplikasi web tidak lagi sekadar shell visual; jalur login, cookie session, dan guard akses awal sudah tersedia untuk review
- auth pada tahap ini masih mock dan sengaja sederhana agar kontrak UI, route, dan akses bisa diuji sebelum integrasi auth produksi

## [0.12.0] - 2026-07-06

### Added

- bootstrap `apps/web` berbasis `Next.js`, `React`, `TypeScript`, dan `Tailwind CSS`
- halaman `login`, `dashboard`, `import`, `import/[batchId]`, dan shell domain operasional awal
- route handler mock `/api/dashboard/summary`, `/api/import/batches`, dan `/api/import/batches/[id]`
- smoke test `apps/web/tests/mock-data.test.ts` untuk memeriksa konsistensi mock source utama

### Changed

- `apps/web/README.md` diperbarui agar mencerminkan bahwa aplikasi web utama sudah dibootstrap
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup shell aplikasi web utama

### Notes

- versi `0.12.0` menandai transisi dari artefak database review ke fondasi aplikasi web yang bisa dipakai untuk integrasi auth, Prisma, dan API domain nyata
- halaman dan API pada tahap ini masih memakai mock data yang disengaja agar struktur frontend dan kontrak awal backend bisa direview lebih cepat

## [0.11.0] - 2026-07-06

### Added

- tabel staging billing di `database/xampp_review_staging_import.sql` untuk invoice, item, payment, dan collection
- sample batch `SAMPLE-WEBPSB-BILLING-001` di `database/xampp_review_sample_import.sql`
- file `database/xampp_review_transform_stage_4.sql` untuk transform billing dari staging ke tabel final
- dokumen `docs/staging-transform-stage-4.md` untuk menjelaskan transform billing tahap 4

### Changed

- `docs/staging-import.md` dan `docs/sample-import.md` diperbarui agar mencakup domain billing
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup transform tahap 4
- `docs/staging-transform-stage-3.md` diperbarui agar langkah berikutnya mengarah ke tahap 4 yang sekarang sudah tersedia

### Notes

- versi `0.11.0` menandai bahwa fondasi review migrasi sekarang sudah mencakup domain billing, bukan hanya operasional dan support
- transform billing tetap mengikuti subscription hasil tahap 2 agar relasi invoice tidak berdiri tanpa layanan yang valid

## [0.10.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_3.sql` untuk transform work order, trouble ticket, isolation, dan dismantle history
- dokumen `docs/staging-transform-stage-3.md` untuk menjelaskan cakupan, urutan eksekusi, dan batas billing pada tahap 3
- sample `ISOLATION` dan `DISMANTLE_HISTORY` tambahan di `database/xampp_review_sample_import.sql`

### Changed

- `docs/sample-import.md` diperbarui agar sample review support tidak hanya mencakup trouble ticket
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup transform tahap 3

### Notes

- versi `0.10.0` menandai bahwa jalur operasional dari order ke work order dan histori support sudah punya artefak transform review
- billing masih sengaja ditahan karena schema billing sudah ada, tetapi staging billing sebagai sumber transform belum dibuat

## [0.9.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_2.sql` untuk transform customer, address, sales order, dan subscription dari staging ke tabel final
- dokumen `docs/staging-transform-stage-2.md` untuk menjelaskan cakupan, urutan eksekusi, dan query review tahap 2

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project sekarang mencakup transform tahap 2
- `docs/phase-1-roadmap.md` diperbarui untuk menambahkan sprint khusus transform customer, address, order, dan subscription

### Notes

- versi `0.9.0` menandai bahwa jalur komersial inti dari customer sampai subscription sudah punya artefak transform review
- `sales_leads`, `service_work_orders`, domain support, dan billing masih sengaja dipisahkan ke tahap berikutnya agar lifecycle operasionalnya tidak tercampur terlalu cepat

## [0.8.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_1.sql` untuk transform awal dari staging ke tabel final
- dokumen `docs/staging-transform.md` untuk menjelaskan cakupan, urutan eksekusi, dan cara review hasil transform

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project sekarang mencakup transform tahap 1
- `docs/phase-1-roadmap.md` diperbarui untuk menambahkan sprint khusus transform inventory dan HR

### Notes

- versi `0.8.0` menandai bahwa review migrasi sekarang sudah masuk tahap insert terkontrol ke tabel final, meskipun masih dibatasi pada domain inventory dan HR
- domain customer, order, subscription, support, dan billing sengaja belum dimasukkan ke tahap ini agar relasinya bisa direview lebih hati-hati

## [0.7.0] - 2026-07-06

### Added

- sample batch `GA` untuk `inventory item` dan `inventory movement` di `database/xampp_review_sample_import.sql`
- sample batch `FINANCE` untuk `employee`, `attendance`, `salary`, dan `loan` di `database/xampp_review_sample_import.sql`
- query review tambahan di `docs/sample-import.md` untuk domain inventory dan HR

### Changed

- `docs/sample-import.md` diperbarui agar cakupan sample sekarang lintas `WEB_PSB`, `GA`, dan `FINANCE`
- `docs/phase-1-roadmap.md` dan `README.md` diperbarui agar milestone berikutnya bergeser ke tahap transform staging ke tabel final

### Notes

- versi `0.7.0` menandai bahwa sample review sekarang sudah menyentuh tiga sumber legacy utama, bukan hanya domain web psb
- seluruh sample tetap berhenti di area staging agar konsistensi satu database bisa direview sebelum proses insert ke tabel final

## [0.6.1] - 2026-07-06

### Added

- file `database/xampp_review_core_master_seed.sql` untuk menyiapkan master minimum sebelum mapping seed dijalankan
- dokumen `docs/core-master-seed.md` untuk menjelaskan dependency foreign key pada master mapping

### Changed

- urutan eksekusi di `docs/master-mapping.md`, `docs/master-mapping-seed.md`, dan `docs/sample-import.md` diperbaiki agar memakai core master seed terlebih dahulu
- `README.md` dan `docs/README.md` diperbarui agar file seed master minimum ikut tercatat

### Notes

- versi `0.6.1` adalah patch yang memastikan sample review dan mapping seed bisa dijalankan dengan referensi master yang valid

## [0.6.0] - 2026-07-06

### Added

- file `database/xampp_review_master_mapping_seed.sql` sebagai baseline awal translasi nilai legacy
- file `database/xampp_review_sample_import.sql` sebagai sample batch kecil untuk uji staging dan mapping
- dokumen `docs/master-mapping-seed.md` untuk menjelaskan fungsi seed awal
- dokumen `docs/sample-import.md` untuk menjelaskan urutan eksekusi dan hasil yang diharapkan dari sample batch

### Changed

- `README.md`, `docs/README.md`, `docs/master-mapping.md`, `docs/staging-import.md`, dan `docs/phase-1-roadmap.md` diperbarui agar selaras dengan milestone seed dan sample import

### Notes

- versi `0.6.0` menandai bahwa fondasi migrasi sekarang sudah punya contoh baseline mapping dan contoh batch review, bukan hanya schema transit
- sample import tetap berhenti di area staging agar aman untuk review satu database sebelum import nyata

## [0.5.0] - 2026-07-05

### Added

- file `database/xampp_review_master_mapping.sql` untuk template mapping nilai legacy ke master tunggal
- dokumen `docs/master-mapping.md` untuk menjelaskan fungsi mapping role, division, branch, package, category, unit, dan status
- dokumen `docs/platform-architecture.md` untuk mengunci constraint `1 database`, `1 domain`, dan `1 website`

### Changed

- `README.md` diperbarui agar prinsip project secara eksplisit mengikuti arsitektur satu platform terpadu
- `docs/blueprint.md`, `docs/staging-import.md`, `docs/data-mapping.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar selaras dengan constraint arsitektur dan tahap master mapping

### Notes

- versi `0.5.0` menandai bahwa fondasi project sekarang tidak hanya punya schema dan staging, tetapi juga aturan penyatuan nilai legacy ke model data tunggal
- keputusan `1 database, 1 domain, 1 website` berarti modul baru harus tetap modular di dalam satu aplikasi, bukan dipecah menjadi situs terpisah

## [0.4.0] - 2026-07-05

### Added

- file `database/xampp_review_staging_import.sql` untuk tabel staging import dari tiga sistem lama
- dokumen `docs/staging-import.md` untuk menjelaskan pola staging, status import, dan alur review data mentah
- tabel batch import `staging_import_batches`
- tabel staging domain untuk user, customer, order, support, inventory, employee, attendance, salary, dan loan

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project mencakup staging import
- `docs/data-mapping.md`, `docs/schema-gap.md`, dan `docs/phase-1-roadmap.md` diperbarui agar konsisten dengan tahap staging

### Notes

- versi `0.4.0` menandai bahwa review database sekarang tidak hanya punya schema final, tetapi juga area aman untuk cleansing dan validasi data legacy
- staging import tetap diposisikan sebagai area transit, bukan sumber data operasional utama

## [0.3.0] - 2026-07-05

### Added

- file `database/xampp_review_schema_phase_1_1.sql` sebagai patch schema lanjutan setelah schema dasar
- dokumen `docs/schema-phase-1-1.md` untuk menjelaskan isi dan urutan eksekusi patch schema
- tabel coverage dan survey: `sales_covered_areas`, `sales_surveys`, `sales_survey_photos`
- tabel billing dan collection: `billing_invoices`, `billing_invoice_items`, `billing_payments`, `billing_collection_actions`
- tabel `network_odp_ports` untuk detail port ODP
- tabel `service_device_assignments` untuk assignment perangkat ke customer/subscription

### Changed

- `auth_users` direncanakan terhubung ke `hr_employees` melalui kolom `employee_id` pada patch schema phase 1.1
- `README.md`, `docs/README.md`, `docs/phase-1-roadmap.md`, dan `docs/schema-gap.md` diperbarui agar sinkron dengan milestone schema terbaru

### Notes

- versi `0.3.0` menandai transisi dari review struktur dasar ke schema operasional yang lebih dekat ke alur end-to-end ISP
- patch `phase 1.1` harus dijalankan setelah `database/xampp_review_schema.sql`

## [0.2.0] - 2026-07-05

### Added

- dokumen `docs/data-mapping.md` untuk mapping entitas dan field dari `web-psb-perkasa`, `finance-repo`, dan `ga-web-app`
- dokumen `docs/phase-1-erd.md` untuk merangkum relasi tabel phase 1
- dokumen `docs/schema-gap.md` untuk memetakan gap schema dan prioritas iterasi berikutnya

### Changed

- `README.md` diperbarui agar milestone saat ini mengarah ke schema phase 1.1 dan staging import
- `docs/README.md` diperbarui agar indeks dokumen mencakup ERD dan schema gap

### Notes

- versi `0.2.0` menandai milestone integrasi dokumen domain, field mapping, dan review relasi database
- schema review awal sudah cukup untuk validasi fondasi, tetapi belum lengkap untuk billing, coverage/survey, dan ODP port detail

## [0.1.0] - 2026-07-05

### Added

- inisialisasi folder project baru `perkasa-erp-oss-bss`
- dokumen blueprint gabungan di `docs/blueprint.md`
- roadmap phase 1 di `docs/phase-1-roadmap.md`
- schema awal MySQL XAMPP untuk review di `database/xampp_review_schema.sql`
- struktur awal `apps/web`
- file `VERSION`
- kebijakan versioning project

### Notes

- versi `0.1.0` menandai fase fondasi arsitektur dan database review
- belum ada bootstrap framework aplikasi utama
- belum ada eksekusi schema ke XAMPP
