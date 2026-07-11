# Hybrid Wave 1 PSB Production DB Checklist

## Tujuan

Dokumen ini menjadi checklist operasional untuk mengakses database production `Web PSB` yang berada di `Coolify`, dengan tujuan:

1. menarik schema nyata
2. menginventaris tabel dan relasi aktif
3. menyiapkan dump read-only untuk staging ERP
4. menjaga agar tidak ada write balik ke sistem production

## Konteks Teknis

Berdasarkan repo legacy `web-psb-perkasa`:

- provider database: `postgresql`
- env koneksi: `DATABASE_URL` atau `DIRECT_URL`
- client yang dipakai: `pg` / Prisma

Referensi:

- [schema.prisma](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/prisma/schema.prisma)
- [setup_remote_db.ts](file:///c:/Users/user/Documents/trae_projects/WEB%20PSB%20PERKASA/web-psb-perkasa/scripts/setup_remote_db.ts)

## Akses Minimum yang Dibutuhkan

Supaya saya bisa lanjut menarik schema/tabel production, salah satu dari opsi berikut harus tersedia:

### Opsi A: Connection String Read-Only

Berikan salah satu:

- `DATABASE_URL`
- `DIRECT_URL`

Format umum:

```text
postgresql://username:password@host:port/database?sslmode=require
```

Catatan:

- paling ideal jika user database memang `read-only`
- cukup untuk inventaris tabel, kolom, index, dan row sample

### Opsi B: Detail Host Terpisah

Jika tidak ingin memberi connection string penuh, minimal kirim:

- host
- port
- database name
- username
- password
- kebutuhan SSL (`require` / `disable`)

### Opsi C: Dump Schema / Dump Read-Only

Jika akses langsung dari mesin ini tidak memungkinkan, yang bisa Anda sediakan:

- dump schema SQL
- hasil `pg_dump --schema-only`
- hasil daftar tabel + kolom
- atau full dump yang sudah disanitasi

Ini cukup untuk lanjut ke:

- inventaris tabel nyata
- pencocokan model legacy vs tabel production
- penyiapan batch staging

## Keluaran Minimum yang Perlu Diambil

Begitu akses tersedia, output minimum yang harus diambil dari DB production PSB adalah:

### 1. Daftar Tabel

Target:

- semua tabel `public`
- terutama tabel yang terkait:
  - `User`
  - `Ticket`
  - `Isolation`
  - `TroubleTicket`
  - `DismantleTickets`
  - `DismantleHistory`
  - `TroubleTicketSla`
  - `psb_odp`
  - domain marketing / digital bila ada

### 2. Struktur Kolom

Untuk setiap tabel prioritas, ambil:

- nama kolom
- tipe data
- nullability
- default value
- primary key
- foreign key
- index unik penting

### 3. Row Sample

Ambil sample aman untuk:

- 5-20 row per tabel inti
- tanpa perlu semua data penuh di awal

Tujuannya:

- validasi nilai status nyata
- validasi nama kolom yang mungkin beda dari model Prisma
- validasi edge case data production

## Query Inventaris yang Perlu Dijalankan

Jika akses SQL langsung tersedia, query minimum yang dibutuhkan:

### Daftar tabel

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Daftar kolom tabel tertentu

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Primary key dan foreign key

```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
```

## Tabel Prioritas Gelombang 1

Urutan prioritas untuk audit production:

1. `User`
2. `Ticket`
3. `Isolation`
4. `TroubleTicket`
5. `DismantleTickets`
6. `DismantleHistory`
7. `TroubleTicketSla`
8. `psb_odp`

Tabel sekunder:

1. `Priority`
2. `Package`
3. `WhatsappTemplate`
4. `CoveredArea`
5. `MarketingActivity`
6. `DigitalLead`
7. `Campaign`
8. `ContentCalendar`
9. `ContentAnalytics`
10. `SecurityLogs`

## Aturan Keamanan

Saat menarik DB production dari Coolify, aturan ini wajib diikuti:

1. gunakan akses `read-only` bila memungkinkan
2. jangan jalankan `CREATE`, `UPDATE`, `DELETE`, `ALTER`, atau `DROP`
3. jangan menulis balik hasil audit ke DB production
4. jangan ubah secret env production di repo
5. simpan hasil audit ke docs atau file kerja lokal ERP, bukan ke repo legacy

## Output Setelah Akses Tersedia

Begitu akses tersedia, saya akan menghasilkan:

1. checklist `nama tabel nyata production -> model repo legacy`
2. daftar mismatch schema production vs Prisma model
3. daftar tabel yang siap masuk staging
4. daftar tabel yang perlu patch schema ERP
5. prioritas dump/import batch pertama

## Next Step

Langkah paling natural setelah checklist ini:

1. pilih salah satu akses:
   - connection string
   - host/port/user/pass
   - dump schema
2. jalankan inventaris tabel production `Web PSB`
3. cocokkan hasilnya ke [hybrid-wave-1-psb-table-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-table-matrix.md)
4. siapkan batch staging pertama untuk:
   - user
   - customer/order
   - support
   - ODP
