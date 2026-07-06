# Perkasa ERP OSS BSS

Project ini adalah fondasi untuk sistem baru yang akan menggabungkan:

- `web-psb-perkasa`
- `finance-repo`
- `ga-web-app`

Target sistem:

- ERP operasional ISP
- OSS/BSS untuk FTTH dan Dedicated Corporate
- inventory dan kontrol material
- HR, attendance, payroll, dan internal control
- dashboard lintas divisi

## Struktur Awal

- `docs/blueprint.md`
- `docs/phase-1-roadmap.md`
- `docs/data-mapping.md`
- `docs/phase-1-erd.md`
- `docs/platform-architecture.md`
- `docs/schema-phase-1-1.md`
- `docs/staging-import.md`
- `docs/master-mapping.md`
- `docs/core-master-seed.md`
- `docs/auth-review-seed.md`
- `docs/master-mapping-seed.md`
- `docs/sample-import.md`
- `docs/staging-transform.md`
- `docs/staging-transform-stage-2.md`
- `docs/staging-transform-stage-3.md`
- `docs/staging-transform-stage-4.md`
- `docs/schema-gap.md`
- `docs/versioning.md`
- `VERSION`
- `CHANGELOG.md`
- `database/xampp_review_schema.sql`
- `database/xampp_review_schema_phase_1_1.sql`
- `database/xampp_review_staging_import.sql`
- `database/xampp_review_master_mapping.sql`
- `database/xampp_review_core_master_seed.sql`
- `database/xampp_review_auth_seed.sql`
- `database/xampp_review_master_mapping_seed.sql`
- `database/xampp_review_sample_import.sql`
- `database/xampp_review_transform_stage_1.sql`
- `database/xampp_review_transform_stage_2.sql`
- `database/xampp_review_transform_stage_3.sql`
- `database/xampp_review_transform_stage_4.sql`
- `apps/web/README.md`
- `.trae/documents/prd-aplikasi-web-utama.md`
- `.trae/documents/arsitektur-teknis-aplikasi-web-utama.md`

## Prinsip Awal

1. domain digabung berdasarkan proses bisnis, bukan berdasarkan menu aplikasi lama
2. database review memakai MySQL XAMPP
3. target akhir adalah satu database, satu domain, dan satu website
4. histori dan data aktif dipisahkan
5. role akses dan domain data tidak dicampur
6. mobile web dan Android tetap jadi target operasional

## Langkah Berikutnya

1. review blueprint
2. review schema database XAMPP
3. review patch schema phase 1.1
4. review staging import dari sistem lama
5. review template master mapping untuk model data tunggal
6. review seed master mapping dan sample import
7. review transform tahap 1 untuk inventory dan HR
8. review transform tahap 2 untuk customer, order, dan subscription
9. review transform tahap 3 untuk work order dan support
10. review transform tahap 4 untuk billing
11. bootstrap aplikasi web baru
12. hubungkan shell web ke auth, Prisma, dan API domain nyata
13. seed `auth_users` review agar login internal bisa diuji tanpa fallback mock

## Versioning

Project ini memakai:

- `Semantic Versioning`
- changelog format `Keep a Changelog`

Versi aktif saat ini ada di file `VERSION`.
