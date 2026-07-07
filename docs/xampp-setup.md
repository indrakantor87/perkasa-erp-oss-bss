# Setup XAMPP (Review DB)

Dokumen ini berfungsi sebagai panduan praktis untuk menyiapkan **MySQL XAMPP** sebagai **review database** untuk proyek `perkasa-erp-oss-bss`, supaya aplikasi web bisa dijalankan dengan data nyata (bukan fallback mock).

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

Checklist verifikasi:

- Di halaman dashboard, panel status data source menunjukkan:
  - `effectiveMode: review-db`
  - `isFallback: false`
- Login pakai akun review DB (dari seed):
  - `admin.perkasa / Perkasa123!`
  - `cs.review / CsReview123!`
  - `support.ops / SupportOps123!`

Jika mode masih `mock` dan `isFallback: true`:

- Pastikan MySQL XAMPP benar-benar running.
- Pastikan `DATABASE_URL` benar (host/port/dbname).
- Cek akses user MySQL dan password.

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

