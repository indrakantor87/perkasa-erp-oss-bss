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

- versi aktif: `0.63.47`
- status: fondasi review database, transform tahap 1-4, bootstrap web utama, write-side domain utama, penguatan RBAC server, playbook integrasi 1 minggu non-intrusive, matriks field operasional minggu pertama, keputusan formal bahwa `web-psb-perkasa` menjadi baseline bisnis-operasional, target end-state satu web di ERP dengan cutover bertahap, requirement parity penuh sebelum web lama bisa ditinggalkan, baseline matriks parity role-menu-aksi-flow-logic, detail parity operasional per role-menu-aksi, desain role ERP target, checklist flow parity per role, permission matrix target, gap implementasi per modul, baseline implementasi kode untuk 9 role ERP target, dashboard role-aware dengan queue per role dan list kerja terpadu awal, kontrak data `supportFocus` di service/API, workspace lane aktif dengan checklist dan peta aksi, subpage dedicated `/support/[lane]` untuk flow `TT`, `isolir`, `dismantle`, dan `SLA`, optimasi query review DB agar halaman lane hanya mengambil section yang relevan, perapihan layout halaman lane agar header dan aksi utama lebih fokus, panel operasional dedicated untuk `/support/tt`, `/support/isolations`, `/support/dismantle`, dan `/support/sla`, shortcut aksi cepat per lane yang melompat langsung ke form support terkait, flow prefill dari panel ke form support sehingga operator bisa menindak row TT dan isolir tanpa mengetik ulang data pilihan, panel operasional inventory untuk ODP/maps/port/accessories, penegasan roadmap attendance wajah + radius sebagai target ERP berikutnya, workflow request barang teknisi dengan status proses dan pengurangan stok otomatis saat request selesai, pemisahan hak akses agar teknisi bisa submit request barang tanpa membuka write action inventory admin, baseline divisi/sub-divisi organisasi yang kini ditautkan ke metadata role aktif dan dokumentasi desain role ERP, tagging sub-divisi teknisi pada request inventory agar proses gudang dan pelacakan kebutuhan harian lebih terarah, panel antrean request inventory per sub-divisi/status untuk membantu prioritisasi proses gudang, alur barang pinjam-kembali yang memisahkan stok habis pakai dari stok alat yang wajib kembali ke gudang, jalur barang masuk khusus yang lebih mudah dipakai gudang tanpa memilih tipe movement secara manual, menu `Daily Activity` untuk plan pagi dan closing sore per aktivitas dengan status selesai atau pending yang transparan, penguatan daily activity ke level divisi/sub-divisi dan `Manager`/`SPV`/`Leader` dengan performa harian-mingguan-bulanan dan kalender plan bulanan, approval manager dan export CSV untuk rekap terstruktur, Daily Activity profile per username (via Settings Users) untuk auto-fill & scope approval yang konsisten, feed audit dashboard terpusat untuk Import Center, Settings Users, dan Settings Access, serta formatter waktu dashboard yang kini tahan terhadap variasi tipe tanggal dari driver review DB
