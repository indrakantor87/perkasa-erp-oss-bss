# PRD Aplikasi Web Utama Perkasa ERP OSS BSS

## 1. Gambaran Produk

Aplikasi ini adalah website utama tunggal untuk operasional ISP yang menyatukan penjualan, customer, support, inventory, HR, billing, dan dashboard ke dalam satu shell aplikasi.

- Produk ini menyelesaikan masalah fragmentasi tiga aplikasi lama dengan target akhir `1 database`, `1 domain`, dan `1 website`
- Nilai utamanya adalah kontrol operasional lintas divisi yang konsisten di desktop, mobile web, dan Android wrapper

## 2. Fitur Inti

### 2.1 Peran Pengguna

| Peran | Metode Akses | Hak Akses Inti |
|------|--------------|----------------|
| Super Admin | Login internal | Akses penuh lintas modul, pengaturan sistem, mapping import, dashboard global |
| Admin Divisi | Login internal | Mengakses modul operasional sesuai divisi dan dashboard terkait |
| Operator | Login internal | Menjalankan pekerjaan harian per modul tanpa akses konfigurasi global |

### 2.2 Modul Fitur

1. **Halaman Login**: autentikasi tunggal, branding platform, akses satu pintu
2. **Dashboard Utama**: ringkasan KPI lintas domain, shortcut modul, status operasional harian
3. **Pusat Import & Review Data**: upload batch, review staging, mapping, validasi, transform per tahap
4. **Modul Operasional**: Penjualan, Customer, Support, Inventory, HR, Billing, Dashboard
5. **Halaman Detail Batch**: detail row staging, target id, status import, catatan validasi

### 2.3 Rincian Halaman

| Nama Halaman | Nama Modul | Deskripsi Fitur |
|-------------|------------|-----------------|
| Login | Form autentikasi | Login username/password, status akses, tombol masuk, pesan error yang jelas |
| Dashboard Utama | Ringkasan platform | KPI customer, order, TT, isolir, inventory, attendance, billing, shortcut modul |
| Dashboard Utama | Navigasi aplikasi | Sidebar domain, topbar context, pencarian cepat modul |
| Pusat Import | Daftar batch | Daftar batch import, sumber sistem, scope, status, jumlah valid/invalid |
| Pusat Import | Pipeline transform | Tombol eksekusi tahap 1-4, indikator dependency, histori eksekusi |
| Detail Batch | Tabel staging | Row staging, normalized key, status, validation notes, target id |
| Detail Batch | Filter dan review | Filter per domain, per status, per source, cari row bermasalah |
| Penjualan | Shell modul | Entry lead, coverage, order, survey, status order |
| Customer | Shell modul | Master customer, address, subscription, histori layanan |
| Support | Shell modul | Trouble ticket, isolir, dismantle history, SLA ringkas |
| Inventory | Shell modul | Item, stock movement, ODP/port, device assignment |
| HR | Shell modul | Employee, attendance, salary slip, loan |
| Billing | Shell modul | Invoice, payment, collection action, overdue status |

## 3. Proses Inti

User masuk ke satu website, melihat dashboard utama, lalu memilih modul atau pusat import. Untuk migrasi, admin menjalankan alur `batch -> staging -> mapping -> transform tahap 1-4 -> review hasil`. Untuk operasional harian, user mengakses domain sesuai permission dari shell aplikasi yang sama.

```mermaid
flowchart TD
    A["User Login"] --> B["Dashboard Utama"]
    B --> C["Pusat Import"]
    B --> D["Modul Operasional"]
    C --> E["Review Batch"]
    E --> F["Validasi Staging"]
    F --> G["Transform Tahap 1-4"]
    G --> H["Review Tabel Final"]
    D --> I["Penjualan"]
    D --> J["Customer"]
    D --> K["Support"]
    D --> L["Inventory"]
    D --> M["HR"]
    D --> N["Billing"]
```

## 4. Desain Antarmuka

### 4.1 Gaya Desain

- Warna utama: slate gelap, abu netral, putih bersih, aksen biru dingin
- Gaya tombol: solid, rounded medium, kontras tinggi, hover tegas
- Font: display tegas untuk heading dan sans modern yang bersih untuk konten
- Layout: desktop-first dengan sidebar tetap, topbar utilitarian, card summary yang rapi
- Gaya ikon: outline tegas, profesional, tanpa ornamen berlebihan

### 4.2 Gambaran Desain Halaman

| Nama Halaman | Nama Modul | Elemen UI |
|-------------|------------|-----------|
| Login | Branding | panel kiri dengan identitas platform, panel kanan untuk form login |
| Dashboard Utama | KPI cards | card summary ringkas, grid modular, warna aksen per domain |
| Dashboard Utama | Navigasi | sidebar domain dengan label jelas dan state aktif kuat |
| Pusat Import | Batch table | tabel data padat, filter sticky, badge status, action bar |
| Detail Batch | Review rows | tabel lebar, drawer detail row, panel validation notes |
| Modul Operasional | Shell konten | header domain, toolbar filter, area konten modular |

### 4.3 Responsivitas

- pendekatan `desktop-first`
- sidebar berubah menjadi drawer di mobile
- tabel review memakai mode card/stacked row untuk layar sempit
- semua action utama harus aman disentuh di mobile web dan Android wrapper
