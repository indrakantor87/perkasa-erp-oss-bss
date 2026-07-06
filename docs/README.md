# Docs Index

## Dokumen Utama

- `blueprint.md`  
  Arah besar modul, domain, dan workflow sistem baru.

- `phase-1-roadmap.md`  
  Urutan implementasi phase 1 dan output minimum review.

- `data-mapping.md`  
  Mapping field dan entitas dari tiga aplikasi lama ke schema baru.

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
  Contoh batch kecil untuk menguji staging dan mapping sebelum import nyata.

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

## Dokumen Aplikasi Web

- `.trae/documents/prd-aplikasi-web-utama.md`  
  Kebutuhan produk untuk shell aplikasi web utama.

- `.trae/documents/arsitektur-teknis-aplikasi-web-utama.md`  
  Arah teknis bootstrap aplikasi web, route utama, dan API dasar.
