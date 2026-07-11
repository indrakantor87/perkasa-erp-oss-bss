# Hybrid Migration Playbook

## Tujuan

Dokumen ini menjadi keputusan kerja resmi untuk mempercepat pembangunan `perkasa-erp-oss-bss` dengan memanfaatkan tiga sistem production yang sudah hidup:

- `Web PSB`
- `Web Finance`
- `Web GA`

Tujuan utamanya bukan memindahkan tiga aplikasi lama apa adanya ke satu repo baru, tetapi:

1. mengambil `data nyata` dari production agar parity tidak menebak-nebak
2. mengambil `logic, query, dan UI kerja` dari repo lama agar parity operasional lebih cepat
3. tetap menjaga target akhir project ini sebagai `1 database`, `1 domain`, `1 website`
4. mengarahkan hasil akhirnya ke model `ERP + OSS + BSS`, bukan tiga web lama yang ditempel longgar

## Keputusan Inti

Jawaban untuk pertanyaan "ambil database saja atau copy repo saja?" adalah:

- `database saja` tidak cukup
- `repo saja` tidak cukup
- model yang paling tepat adalah `hybrid`

Artinya:

1. `database production` dipakai sebagai sumber data nyata
2. `repo production` dipakai sebagai sumber logika dan bentuk UI operasional
3. `perkasa-erp-oss-bss` tetap menjadi target integrasi akhir

## Peran Tiap Sumber

### 1. Database Production

Database dari Coolify atau production dipakai untuk:

- membaca schema nyata yang benar-benar dipakai operator
- melihat relasi dan field yang hidup di lapangan
- memahami isi data, nilai status, dan edge case real
- memvalidasi apakah query dan flow parity benar
- mengisi review DB atau staging agar ERP baru bisa membaca data nyata

Database production **bukan** dipakai untuk:

- menjadi database final jangka panjang ERP baru tanpa normalisasi
- langsung dijadikan write target utama web baru
- mempertahankan pemisahan database per web sebagai arsitektur akhir

### 2. Repo Production Lama

Repo GitHub atau source code masing-masing web dipakai untuk:

- membaca query yang benar-benar dipakai halaman
- mengambil logic bisnis yang sudah teruji user
- copy bentuk tabel, filter, aksi per baris, import/export, dan bulk action
- memahami ownership operasional yang berjalan di lapangan

Repo production **bukan** dipakai untuk:

- di-merge mentah ke repo ERP baru
- dijadikan fondasi auth, routing, dan architecture akhir
- mempertahankan app boundary lama sebagai target final

### 3. Repo ERP Baru

`perkasa-erp-oss-bss` tetap menjadi:

- aplikasi target akhir
- rumah untuk auth bersama
- rumah untuk role dan capability bersama
- rumah untuk route/menu bersama
- rumah untuk integrasi lintas domain ERP, OSS, dan BSS

## Prinsip Arsitektur yang Tidak Boleh Dilanggar

Keputusan hybrid ini harus tetap tunduk pada [platform-architecture.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/platform-architecture.md):

1. `1 database`
2. `1 domain`
3. `1 website`

Artinya hybrid migration hanya dipakai untuk `mempercepat parity`, bukan untuk membangun tiga aplikasi lama versi baru.

## Model Kerja Hybrid

Model kerja yang disarankan:

```text
Legacy Production DB
-> sumber data nyata
-> schema nyata
-> edge case nyata

Legacy Production Repo
-> sumber logic
-> sumber query
-> sumber UI tabel dan workflow

ERP New Repo
-> target implementasi final
-> normalisasi role dan ownership
-> integrasi lintas domain ERP / OSS / BSS
```

## Kenapa Model Ini Paling Tepat

### Jika hanya ambil database

Kita memang mendapat:

- tabel
- field
- data nyata

Tetapi kita tetap kehilangan:

- query operasional
- aturan filter halaman
- action logic
- alur kerja detail per role

### Jika hanya copy repo

Kita memang mendapat:

- UI
- flow
- logic

Tetapi kita tetap berisiko:

- tidak cocok dengan data production saat ini
- salah memahami status dan edge case real
- copy query yang ternyata sudah bergeser dari data production

### Jika hybrid

Kita mendapat:

- data yang valid
- logic yang valid
- workflow yang familiar
- arah integrasi yang tetap sesuai ERP baru

## Urutan Kerja Yang Disarankan

### Gelombang 1: `Web PSB`

Alasan prioritas:

- dampak paling besar ke parity operasional yang sedang dikejar
- paling banyak menu kerja harian yang sudah dijadikan baseline
- sudah menjadi referensi utama tabel dan workflow current batch

Fokus:

- `PSB Ticket List`
- `Marketing Activities`
- `Monitoring Isolir`
- `Dismantle`
- `Trouble Ticket`
- `ODP / Port`

Output minimum:

1. schema dan data production PSB dipahami
2. query dan flow per menu dipetakan
3. workspace ERP baru meniru ritme kerja legacy
4. ownership ERP baru diterapkan di atas flow lama

### Gelombang 2: `Web Finance`

Fokus:

- invoice
- payment
- collection
- decision Billing
- write-off / reconnect / suspend candidate

Output minimum:

1. domain Billing membaca data production nyata
2. jalur Billing ke Isolir / Restore / Dismantle sinkron
3. logic keputusan collection tidak perlu ditebak lagi

### Gelombang 3: `Web GA`

Fokus:

- inventory
- request flow
- master asset
- legal / office / store support domain bila ada

Output minimum:

1. domain GA dan Inventory membaca struktur nyata
2. action flow GA berpindah ke capability ERP baru
3. dashboard lintas divisi bisa membaca stok dan proses GA dengan model tunggal

## Deliverable Per Sistem Lama

Untuk setiap web legacy, kumpulkan 3 kelompok artefak:

### A. Artefak Data

- database name
- daftar tabel
- relasi penting
- nilai enum/status yang dipakai nyata
- contoh row aktif dan histori
- query laporan yang paling sering dipakai

### B. Artefak Logic

- file service
- file page/view utama
- query builder / raw SQL
- helper permission
- helper import/export
- helper bulk action

### C. Artefak Workflow

- urutan kerja operator
- siapa owner utama
- siapa supervisor
- kapan data berpindah lane
- kapan flow dianggap selesai
- kapan kasus harus pindah ke domain lain

## Cara Eksekusi Hybrid

### Langkah 1: Clone Semua Repo Lama

Siapkan source lokal untuk:

- `web-psb-perkasa`
- `web-finance`
- `web-ga`

Fungsi utama:

- audit logic
- audit UI
- audit permission
- copy flow yang terbukti dipakai user

### Langkah 2: Ambil Schema Database Production

Minimal yang harus diambil:

1. daftar tabel
2. kolom
3. index
4. foreign key bila ada
5. contoh data

Lebih baik lagi jika tersedia:

1. full schema dump
2. sample data dump
3. snapshot data production yang sudah disanitasi

### Langkah 3: Import ke Review / Staging

Database production jangan langsung dijadikan write target ERP baru.

Gunakan:

- review DB
- staging import
- mapping master
- transform ke tabel final tunggal

Rujukan:

- [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- [staging-transform.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-transform.md)
- [data-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/data-mapping.md)

### Langkah 4: Porting Selektif ke ERP Baru

Yang dicopy dari repo lama:

- layout tabel
- filter bar
- quick summary
- query logic
- bulk actions
- workflow CTA

Yang **tidak** dicopy mentah:

- struktur auth lama
- route lama yang bertentangan dengan menu ERP baru
- role lama tanpa normalisasi
- model data yang bertentangan dengan constraint `1 database`

### Langkah 5: Terapkan Ownership ERP Baru

Contoh:

- `Restore` isolir tetap dibaca milik `Billing`
- `Terminate / Dismantle` tetap dibaca milik `CS & Admin CS`
- `TT / SLA` tetap dibaca milik `NOC & Troubleshoots`

Jadi:

- `UI/flow` boleh meniru legacy
- `ownership` tetap mengikuti desain ERP baru

## Aturan Porting

Setiap modul yang dipindah ke ERP baru harus mengikuti aturan:

1. `copy workflow`, bukan `copy arsitektur mentah`
2. `copy page rhythm`, bukan `copy app boundary lama`
3. `copy query logic`, tapi normalisasi ke service layer ERP
4. `copy role intent`, tapi map ke capability ERP
5. `copy data meaning`, tapi transform ke schema tunggal

## Risk Guard

### Jangan lakukan ini

1. langsung write ke database production legacy dari web ERP baru
2. merge mentah tiga repo ke satu codebase tanpa pemetaan domain
3. mempertahankan tiga auth system
4. mempertahankan tiga set role/master sebagai target akhir
5. mempertahankan tiga database terpisah sebagai model utama platform final

### Lakukan ini

1. gunakan production DB sebagai referensi data dan staging source
2. gunakan repo lama sebagai referensi logic/UI
3. satukan hasilnya di domain ERP baru
4. normalisasi role, division, status, branch, dan master lain
5. buktikan parity per menu sebelum cutover penuh

## Matriks Keputusan Cepat

| Kebutuhan | Ambil DB | Ambil Repo | Keterangan |
|---|---|---|---|
| memahami tabel nyata | ya | tidak wajib | schema dan sample row lebih penting |
| memahami query halaman | tidak cukup | ya | source logic ada di code |
| memahami status dan edge case lapangan | ya | bantu | DB memberi bukti paling nyata |
| copy UI tabel operasional | tidak | ya | repo jadi referensi utama |
| menyatukan ke ERP/OSS/BSS | bantu | bantu | target akhir tetap repo ERP baru |
| percepatan parity | ya | ya | hybrid paling cepat |

## Urutan Implementasi yang Disarankan

1. tarik schema `Web PSB`
2. audit repo `Web PSB`
3. selesaikan parity menu PSB prioritas tinggi
4. tarik schema `Web Finance`
5. audit repo `Web Finance`
6. satukan logic Billing ke flow support dan customer service
7. tarik schema `Web GA`
8. audit repo `Web GA`
9. satukan Inventory / GA ke capability ERP baru

## Definition of Done per Gelombang

Setiap gelombang dianggap selesai jika:

1. schema source sudah dipetakan ke staging/final
2. query logic utama sudah dipahami
3. halaman kerja utama sudah punya parity operasional
4. ownership ERP baru sudah diterapkan
5. role tidak perlu kembali ke web lama untuk flow utama

## Dokumen Terkait

- [platform-architecture.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/platform-architecture.md)
- [data-mapping.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/data-mapping.md)
- [web-psb-parity-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-parity-matrix.md)
- [web-psb-module-gap-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-module-gap-plan.md)
- [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)

## Keputusan Kerja Saat Ini

Mulai batch berikutnya, pendekatan resmi project ini adalah:

1. `hybrid migration`
2. `copy-first untuk workflow dan UI`
3. `data-first untuk schema dan edge case`
4. `ERP-first untuk ownership, auth, permission, dan integrasi lintas domain`

## Next Step Operasional

Langkah paling tepat setelah dokumen ini:

1. inventaris koneksi dan schema production `Web PSB`
2. clone atau sinkronkan repo `Web Finance` dan `Web GA` bila belum tersedia lokal
3. buat matriks `source table -> staging -> final table -> ERP module`
4. lanjutkan parity menu dengan prioritas `PSB -> Finance -> GA`
