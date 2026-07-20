# Versioning Guide

## Tujuan

Dokumen ini menjadi aturan versioning dan changelog untuk project `perkasa-erp-oss-bss` agar rapi sejak fase awal.

## Skema Versi

Project memakai `Semantic Versioning`:

```text
MAJOR.MINOR.PATCH
```

Contoh:

- `0.1.0`
- `0.2.0`
- `0.2.1`
- `1.0.0`

## Aturan Fase Awal

Selama sistem masih tahap fondasi dan belum stabil production, gunakan seri `0.x.y`.

Artinya:

- `0.MINOR.0` untuk penambahan besar pada blueprint, schema, atau modul utama
- `0.MINOR.PATCH` untuk perbaikan terbatas, sinkronisasi dokumen, atau koreksi schema

## Kapan Naik Versi

### Naik PATCH

Naik `PATCH` jika perubahan bersifat kecil dan tidak mengubah arah sistem, misalnya:

- perbaikan schema
- koreksi relasi tabel
- sinkronisasi dokumentasi
- perbaikan query atau bug kecil

Contoh:

- `0.1.0 -> 0.1.1`

### Naik MINOR

Naik `MINOR` jika ada penambahan domain atau milestone penting, misalnya:

- field mapping selesai
- ERD phase 1 selesai
- bootstrap app selesai
- modul auth selesai
- modul customer/order selesai

Contoh:

- `0.1.0 -> 0.2.0`

### Naik MAJOR

Naik `MAJOR` jika sistem sudah mencapai baseline stabil dan siap menjadi fondasi resmi production atau terjadi perubahan besar yang mematahkan struktur sebelumnya.

Contoh:

- `0.9.0 -> 1.0.0`

## File yang Wajib Dijaga

### `VERSION`

Berisi satu baris versi aktif project.

Contoh:

```text
0.1.0
```

### `CHANGELOG.md`

Berisi riwayat perubahan penting project.

Format yang dipakai:

- bagian `Unreleased`
- bagian versi rilis
- kategori seperti `Added`, `Changed`, `Fixed`, `Removed`

## Aturan Penulisan Changelog

### `Added`

Untuk modul, dokumen, tabel, atau flow baru.

### `Changed`

Untuk perubahan perilaku, struktur, atau keputusan desain yang mengganti pendekatan lama.

### `Fixed`

Untuk perbaikan bug, mismatch data, atau error schema.

### `Removed`

Untuk penghapusan modul, field, atau pendekatan yang tidak lagi dipakai.

## Pola Kerja yang Disarankan

Setiap kali ada perubahan berarti:

1. update file `VERSION`
2. pindahkan item yang relevan dari `Unreleased` ke versi baru di `CHANGELOG.md`
3. tambahkan ringkasan perubahan
4. baru commit

## Baseline Saat Ini

- versi aktif: `0.66.46`
- status: fondasi review database, write-side domain inti, lifecycle inventory lintas NOC-teknisi, workspace CS supervisor, barcode audit end-to-end, popup aksi cepat lintas tabel operasional, optimasi runtime berisiko rendah, baseline backlog teknis final lintas divisi, spesifikasi teknis awal `List PSB`, spesifikasi teknis awal `List Dismantle`, implementasi kode `List PSB` fase 1, write-side dasar `List PSB`, transfer `List PSB` ke ticket operasional PSB, perbaikan boundary client/server untuk domain `List PSB`, penambahan cross-link dari `List PSB` ke queue/detail work order, implementasi `List Dismantle` fase 1 lengkap dengan route, akses, workspace, transisi review dasar, transfer ke work order operasional, hardening Docker build/runtime untuk deploy production, sinkronisasi sumber nyata `support_dismantle_queue -> List Dismantle`, backlink histori inventory berbasis `support_dismantle_history` dan `inventory_stock_movements`, serta penyimpanan referensi `item_code` return langsung saat close dismantle agar histori barang untuk kasus multi-device tidak lagi hanya bergantung pada lookup movement work order.
