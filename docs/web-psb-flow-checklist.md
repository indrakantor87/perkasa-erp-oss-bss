# Checklist Flow Parity Per Role

## Tujuan

Dokumen ini menjadi checklist operasional untuk memvalidasi apakah ERP baru sudah cukup setara dengan `web-psb-perkasa` dari sudut pandang pengguna harian.

Fokus dokumen ini:

1. flow per role
2. langkah minimum yang harus bisa dijalankan
3. bukti lulus parity per flow
4. status go/no-go untuk cutover

Dokumen ini melengkapi:

1. [web-psb-parity-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-parity-matrix.md)
2. [web-psb-role-action-parity.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-role-action-parity.md)
3. [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md)

## Catatan Fase Saat Ini

Dokumen ini tetap menjadi baseline parity global lintas role.

Untuk fase implementasi aktif yang berpusat pada Divisi `Pemasaran & Pelayanan`, gunakan dokumen yang lebih
operasional:

1. [web-pemasaran-pelayanan-uat-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-pemasaran-pelayanan-uat-checklist.md)

## Cara Pakai

Setiap role harus diuji langsung di ERP baru.

Status penilaian:

1. `pass` jika flow selesai tanpa pindah ke web lama
2. `partial` jika flow hanya sebagian
3. `fail` jika flow belum ada atau tidak usable

## Checklist Global Semua Role

Semua role wajib lolos:

1. bisa login
2. hanya melihat menu yang memang berhak
3. tidak melihat menu di luar scope
4. data tampil sesuai perspektif divisi
5. aksi tersimpan dan tercermin di list/detail
6. tidak muncul kebutuhan kembali ke `web-psb-perkasa`

## 1. `SUPER_ADMIN`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login admin | berhasil masuk | sesi aktif |
| lihat dashboard lintas domain | semua kartu dan ringkasan tampil | dashboard terbuka |
| akses settings akses | role dan permission dapat dibuka | halaman akses terbuka |
| akses user internal | create/edit/reset dapat diuji | data audit tercatat |
| akses import center | batch dapat dilihat dan dijalankan sesuai izin | histori aksi muncul |
| audit domain | dapat membuka sales/customers/support/inventory/hr/billing | seluruh domain bisa diakses |

### Status cutover

`SUPER_ADMIN` boleh dipindah penuh jika semua flow di atas `pass`.

## 2. `SALES_MARKETING`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login marketing | berhasil masuk | sesi aktif |
| input prospek/ticket awal | data baru berhasil dibuat | row baru muncul |
| lihat list kerja marketing | daftar kerja tampil sesuai perspektif | list tampil benar |
| update aktivitas marketing | activity dapat dibuat/diubah | histori activity tersimpan |
| lihat monitoring isolir/dismantle/ODP | hanya monitoring sesuai scope | akses baca tersedia |

### Catatan gap

1. modul `marketing-activities` harus ada
2. list kerja marketing harus dipisah dari queue CS/NOC

## 3. `CS_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login CS | berhasil masuk | sesi aktif |
| input ticket/lead operasional | create berjalan | row baru muncul |
| buka list kerja CS | queue lintas domain tampil | list terpadu tersedia |
| tambah/edit isolir | create/update berhasil | data support berubah |
| proses dismantle dasar | flow transfer atau update dismantle berjalan | histori tercatat |
| kelola ODP dasar | aksi yang diizinkan berjalan | data inventory berubah |
| buat/update TT dasar | create/update berjalan | TT tersimpan |

### Catatan gap

1. perlu `list kerja terpadu`
2. perlu pemetaan aksi antara sales, support, dan inventory

## 4. `CS_ADMIN`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login admin CS | berhasil masuk | sesi aktif |
| semua flow `CS_OPERATOR` | seluruh flow operator lolos | hasil uji lengkap |
| approve/koreksi operasi CS | aksi admin berjalan | audit atau histori tersimpan |
| restore/transfer data support | alur restore/transfer berhasil | data dan status berubah sesuai aturan |

### Catatan gap

1. ERP perlu hak approval lebih tinggi dari `CS_OPERATOR`
2. aksi koreksi harus terekam audit

## 5. `NOC_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login NOC | berhasil masuk | sesi aktif |
| buka queue TT teknis | daftar TT teknis tampil | halaman support sesuai |
| update progres TT | status dan note teknis tersimpan | histori TT berubah |
| kelola ODP operasional | update ODP/port berjalan | data inventory berubah |
| lihat data relevan tanpa akses sales berlebih | hanya domain teknis tampil | menu sesuai |

### Catatan gap

1. pembatasan harus beda dari `FIELD_TECHNICIAN`
2. fokus pada monitoring dan koordinasi teknis

## 6. `FIELD_TECHNICIAN`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login teknisi | berhasil masuk | sesi aktif |
| lihat queue pekerjaan lapangan | hanya pekerjaan lapangan tampil | queue sesuai |
| update hasil kunjungan | status, note, atau hasil kerja tersimpan | histori berubah |
| update status ODP/perangkat sesuai scope | aksi lapangan berjalan | data inventory terkait berubah |

### Catatan gap

1. harus ada pembeda dari NOC
2. fokus pada eksekusi lapangan, bukan monitoring global

## 7. `TT_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login TT operator | berhasil masuk | sesi aktif |
| lihat hanya domain TT | menu hanya fokus TT | menu sesuai |
| update dan close TT | proses TT selesai | status TT berubah |
| tidak bisa akses domain lain | domain lain tertutup | guard bekerja |

### Catatan gap

1. perlu role mikro support yang benar-benar sempit

## 8. `DIGITAL_CREATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login creator digital | berhasil masuk | sesi aktif |
| buka content calendar | halaman tersedia | modul tampil |
| buat/update campaign | campaign dapat dikelola | data tersimpan |
| lihat/kelola digital leads | leads digital tampil dan bisa diolah | data tersimpan |
| lihat analytics | dashboard analytics tersedia | data tampil |

### Catatan gap

1. sebagian besar domain ini belum ada
2. role ini belum siap cutover sampai modul parity selesai

## 9. `DISMANTLE_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login dismantle | berhasil masuk | sesi aktif |
| buka queue dismantle | hanya dismantle yang relevan tampil | queue sesuai |
| update hasil dismantle | status, note lapangan, dan hasil tersimpan | histori tercatat |
| tidak bisa mengakses flow support lain di luar scope | guard role berjalan | menu sesuai |

### Catatan gap

1. perlu queue khusus dismantle
2. perlu hak akses sangat sempit

## Aturan Go/No-Go Cutover

Satu role dinyatakan `go` jika:

1. seluruh flow wajib `pass`
2. tidak ada flow kritis yang `fail`
3. menu dan data sesuai perspektif role
4. pengguna tidak perlu kembali ke web lama

Satu role dinyatakan `no-go` jika:

1. ada flow kritis yang `partial` atau `fail`
2. hak akses terlalu longgar atau terlalu sempit
3. data atau list kerja tidak sesuai kebutuhan harian

## Rekomendasi Urutan Uji

Urutan yang disarankan:

1. `SUPER_ADMIN`
2. `NOC_OPERATOR`
3. `FIELD_TECHNICIAN`
4. `TT_OPERATOR`
5. `CS_OPERATOR`
6. `CS_ADMIN`
7. `SALES_MARKETING`
8. `DISMANTLE_OPERATOR`
9. `DIGITAL_CREATOR`

Alasan urutan ini:

1. role teknis support dan inventory paling dekat dengan kondisi ERP saat ini
2. role sales dan CS butuh flow terpadu yang lebih besar
3. role creator digital paling banyak gap

## Versioning

Dokumen ini dirilis pada:

- `0.62.7` untuk baseline checklist flow parity per role
