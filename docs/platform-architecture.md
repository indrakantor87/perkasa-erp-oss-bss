# Platform Architecture

## Constraint Utama

Catatan penting project ini:

- `1 database`
- `1 domain`
- `1 website`

Ini bukan multi-app terpisah yang nanti disatukan longgar. Target akhirnya adalah satu platform operasional terpadu.

## Arti Praktisnya

### 1. Satu Database

Semua domain utama masuk ke satu model data bersama:

- sales
- customer
- support
- inventory
- HR
- billing

Konsekuensinya:

- tidak ada database terpisah per divisi
- tidak ada sinkronisasi antar database sebagai pola utama
- relasi lintas domain harus native lewat foreign key atau code master yang sama

### 2. Satu Domain

Akses user nantinya diarahkan ke satu domain utama aplikasi.

Konsekuensinya:

- auth cukup satu pintu
- session dan role cukup satu sistem
- navigasi lintas modul tidak berpindah domain
- reporting lintas divisi tidak bergantung pada integrasi antar situs

### 3. Satu Website

Semua modul berjalan di satu aplikasi web utama dengan shell UI yang sama.

Konsekuensinya:

- dashboard, menu, auth, dan profile berada di satu frontend
- modul dipisah secara domain dan permission, bukan sebagai website berbeda
- mobile web dan Android wrapper nantinya cukup mengarah ke satu aplikasi utama

## Batasan Desain

Karena targetnya satu platform, maka:

1. jangan membuat schema yang menganggap tiap sistem lama akan tetap hidup sendiri
2. jangan membuat role, division, branch, dan package master ganda
3. jangan membuat route atau modul yang mengharuskan domain terpisah per divisi
4. jangan membuat pipeline import yang mempertahankan istilah legacy tanpa normalisasi

## Bentuk Arsitektur yang Disarankan

Model yang paling cocok untuk fase ini adalah:

```text
1 web application
-> modular per domain
-> 1 shared auth
-> 1 shared database
-> 1 shared design system
```

Bukan:

```text
3 website berbeda
-> saling sinkron data
-> auth terpisah
-> dashboard disatukan belakangan
```

## Dampak ke Migrasi

Migrasi dari tiga aplikasi lama harus diperlakukan sebagai:

- sumber data legacy
- bukan fondasi arsitektur baru

Karena itu kita pakai:

1. staging import
2. master mapping
3. tabel final tunggal

## Dampak ke Bootstrap Aplikasi

Saat aplikasi web baru dibootstrap nanti, struktur yang tepat adalah:

- satu project web utama
- satu app shell
- modul dipisah per domain bisnis
- akses dibatasi lewat role/permission

Contoh menu:

- Penjualan
- Customer
- Support
- Inventory
- HR
- Billing
- Dashboard

Semua tetap berada di satu website yang sama.

## Keputusan Teknis yang Diturunkan dari Constraint Ini

1. `master mapping` wajib ada agar nilai legacy tidak pecah
2. `staging import` wajib ada agar data kotor tidak masuk ke core schema
3. `shared master tables` seperti role, division, branch, package, unit, category harus menjadi referensi bersama
4. `dashboard` harus membaca definisi backend yang sama, bukan summary terpisah per modul

## Ringkasan

Constraint `1 database, 1 domain, 1 website` berarti project ini harus dibangun sebagai platform tunggal yang modular, bukan kumpulan aplikasi lama yang ditempel jadi satu.
