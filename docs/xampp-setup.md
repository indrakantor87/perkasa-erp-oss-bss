# Setup XAMPP (Review DB)

Dokumen ini berfungsi sebagai panduan praktis untuk menyiapkan **MySQL XAMPP** sebagai **review database** untuk proyek `perkasa-erp-oss-bss`, supaya aplikasi web bisa dijalankan dengan data nyata (bukan fallback mock).

## Penting

Pada proyek ini, **XAMPP dipakai untuk MySQL**, bukan untuk menjalankan aplikasi web `Next.js`.

Artinya:

1. start MySQL dari XAMPP
2. siapkan database review di MySQL XAMPP
3. jalankan web dari folder `apps/web` memakai `npm run dev`
4. buka web di browser melalui `http://localhost:3000`

Jadi jangan menaruh project `apps/web` ke `htdocs` dan jangan berharap route `Next.js` dijalankan langsung oleh Apache PHP bawaan XAMPP.

## Prasyarat

- XAMPP (MySQL berjalan).
- Database kosong untuk review, misalnya `perkasa_review`.
- Akses import SQL: via **phpMyAdmin** atau **mysql CLI**.

## 1) Buat database

Buat database `perkasa_review` dengan charset `utf8mb4`.

Jika memakai phpMyAdmin:

- Databases → Create database → `perkasa_review`
- Collation: `utf8mb4_general_ci` (atau `utf8mb4_unicode_ci`)

## 2) Import schema + seed (urutan wajib)

Gunakan urutan ini agar foreign key, master seed, dan contoh staging siap untuk direview:

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_auth_seed.sql`
7. `database/xampp_review_master_mapping_seed.sql`
8. `database/xampp_review_sample_import.sql`

Jika ingin langsung menguji extension `Wave 1A Web PSB` setelah bootstrap dasar:

9. `database/xampp_review_transform_stage_2.sql`
10. `database/xampp_review_transform_stage_3.sql`
11. `database/xampp_review_sample_import_wave_1a.sql`
12. `database/xampp_review_transform_wave_1a_support_extension.sql`
13. `database/xampp_review_transform_wave_1a_network_odp.sql`

Runbook cepat:

- [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md)

Referensi detail (seed auth): [auth-review-seed.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/auth-review-seed.md)

### Catatan import

- File-file di atas memakai pola `CREATE TABLE IF NOT EXISTS` / `INSERT ...` sehingga aman di-run ulang saat iterasi (selama tidak mengubah constraint yang konflik).
- Jika MySQL menolak import karena constraint, pastikan database benar-benar kosong atau drop schema lalu import ulang dari awal.

## 3) Konfigurasi env aplikasi web

Edit `apps/web/.env` (atau duplikasi dari `.env.example`) dan pastikan mode review DB aktif:

```ini
APP_DATA_MODE=review-db
DATABASE_URL=mysql://root:@127.0.0.1:3306/perkasa_review
REVIEW_DB_CONNECT_TIMEOUT_MS=1500
```

Jika database review lokal Anda memakai nama lain, sesuaikan nilainya. Contoh yang juga valid:

```ini
APP_DATA_MODE=review-db
DATABASE_URL=mysql://root:@127.0.0.1:3306/erp_isp_review
REVIEW_DB_CONNECT_TIMEOUT_MS=1500
```

Jika root punya password:

```ini
DATABASE_URL=mysql://root:password@127.0.0.1:3306/perkasa_review
```

## 4) Jalankan web dan verifikasi koneksi

Jalankan:

```bash
cd apps/web
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Quick Start Paling Cepat

Jika Anda hanya ingin menampilkan web lokal secepat mungkin:

1. buka XAMPP lalu start `MySQL`
2. pastikan `apps/web/.env` berisi:

```ini
APP_DATA_MODE=review-db
DATABASE_URL=mysql://root:@127.0.0.1:3306/erp_isp_review
REVIEW_DB_CONNECT_TIMEOUT_MS=1500
```

3. buka terminal di `d:\trae_projects\perkasa-erp-oss-bss\apps\web`
4. jalankan:

```bash
npm install
npm run dev
```

5. buka:

```text
http://localhost:3000
```

Jika MySQL XAMPP belum siap atau database belum terimport, web tetap bisa terbuka tetapi sebagian halaman bisa fallback atau belum menampilkan data review yang diharapkan.

Checklist verifikasi:

- Di halaman dashboard, panel status data source menunjukkan:
  - `effectiveMode: review-db`
  - `isFallback: false`
- Login pakai akun review DB (dari seed) dengan password yang Anda tetapkan sendiri saat menyiapkan `database/xampp_review_auth_seed.sql`.
- Jangan menuliskan password review plaintext ke repo; simpan hanya di password vault/catatan operasional internal yang aman.

Jika mode masih `mock` dan `isFallback: true`:

- Pastikan MySQL XAMPP benar-benar running.
- Pastikan `DATABASE_URL` benar (host/port/dbname).
- Cek akses user MySQL dan password.
- Jika memang butuh review lokal tanpa review DB, aktifkan `ALLOW_BOOTSTRAP_MOCK_AUTH=1` dan isi `BOOTSTRAP_MOCK_AUTH_CREDENTIALS` di `.env.local` secara lokal saja.

## 5) Bootstrap permission master (Settings Access)

Saat `review-db` aktif, buka:

- `/settings/access`

Lalu jalankan bootstrap permission master dari baseline (tombol bootstrap di halaman).

Hasil yang diharapkan:

- Tabel permission master (`auth_roles`, `auth_permissions`, `auth_role_permissions`) tersedia di review DB.
- Perubahan role-permissions akan meng-invalidate cache RBAC sehingga menu/guard mengikuti update tanpa restart.

## 6) Validasi sample import (opsional)

Seed `database/xampp_review_sample_import.sql` menyiapkan contoh batch dan row staging.

Langkah cek:

- Buka `/import`
- Buka salah satu batch sample
- Jalankan validate / transform untuk memastikan pipeline bekerja di review DB
