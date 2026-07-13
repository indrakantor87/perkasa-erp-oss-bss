# Auth Review Seed

## Tujuan

Dokumen ini menjelaskan seed user minimum untuk `auth_users` agar mode auth internal di web baru bisa diuji langsung pada review DB.

File SQL yang dipakai:

- `database/xampp_review_auth_seed.sql`

## Kenapa Diperlukan

Mode login hybrid di `apps/web` sekarang memprioritaskan:

1. `auth_users`
2. `auth_roles`

saat `APP_DATA_MODE=review-db` aktif dan koneksi database tersedia.

Tanpa seed user awal, jalur login review DB tidak akan punya akun nyata walaupun schema dan role master sudah siap.

## Akun Minimum yang Disiapkan

Seed ini menyiapkan tiga akun review dasar:

1. `admin.perkasa`
2. `cs.review`
3. `support.ops`

Tujuannya agar tiga role aplikasi bisa langsung diuji:

1. `SUPER_ADMIN`
2. `ADMIN_DIVISI`
3. `OPERATOR`

## Pola Password

Password disimpan sebagai `sha256:<hash>` agar tetap kompatibel dengan helper transisi auth pada `apps/web/lib/auth-session.ts`.

Tentukan sendiri password review awal di lingkungan seed Anda, lalu catat hanya pada password vault/operator note yang aman. Repo ini tidak lagi mendokumentasikan password plaintext.

Contoh langkah aman:

1. pilih password kuat yang berbeda untuk tiap akun
2. ubah nilai hash pada `database/xampp_review_auth_seed.sql` sesuai password yang dipilih
3. simpan pasangan username/password hanya pada catatan operasional internal yang tidak ikut ter-commit

## Urutan Eksekusi yang Benar

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_auth_seed.sql`
7. `database/xampp_review_master_mapping_seed.sql`
8. `database/xampp_review_sample_import.sql`

## Catatan Implementasi

- role `OPERATOR` ditambahkan ke core master seed agar role aplikasi web punya representasi langsung di review DB
- akun `support.ops` memakai division `NOC` dan role `OPERATOR` supaya jalur pembatasan akses operator bisa direview
- akun `admin.perkasa` sengaja dipertahankan konsisten secara username dengan akun bootstrap mock agar transisi ke review DB lebih mulus saat user mulai mengetes mode nyata
- bila perlu review lokal tanpa review DB, aktifkan `ALLOW_BOOTSTRAP_MOCK_AUTH=1` dan isi `BOOTSTRAP_MOCK_AUTH_CREDENTIALS` pada `.env.local` atau environment shell lokal; jangan commit password bootstrap ke repo
