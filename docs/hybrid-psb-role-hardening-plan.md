# Hybrid PSB Role Hardening Plan

Dokumen ini menerjemahkan checklist hardening menjadi rencana kerja operasional per role. Tujuannya agar tim tidak hanya tahu apa yang harus dicek, tetapi juga urutan bukti yang harus dikumpulkan supaya setiap role bisa naik status dari `PARTIAL` atau `PILOT` menuju siap cutover.

Dokumen ini melengkapi:

1. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
2. [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
3. [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)

## Prinsip Kerja

1. mulai dari role fondasi yang paling dekat ke `PILOT`
2. kumpulkan bukti kerja harian nyata, bukan hanya screenshot menu
3. setiap role harus lulus tiga hal:
   - login dan scope data benar
   - queue kerja benar-benar terisi dan relevan
   - write-side utama bisa diselesaikan tanpa kembali ke web lama
4. role non-fondasi tidak boleh mencuri fokus sebelum `Pemasaran dan Pelayanan` stabil

## Target Role Fase Ini

Urutan prioritas hardening:

1. `SUPER_ADMIN`
2. `NOC_OPERATOR`
3. `TT_OPERATOR`
4. `DISMANTLE_OPERATOR`
5. `SALES_MARKETING`
6. `CS_OPERATOR`
7. `CS_ADMIN`

## Bukti Minimum Per Role

### `SUPER_ADMIN`

Target:

- memastikan health lintas domain, import, settings, dan audit tidak macet

Bukti yang harus dikumpulkan:

- login berhasil
- dashboard admin terbuka tanpa blank state yang salah
- dapat membuka `daily activity`, `import center`, `settings`, dan domain utama
- dapat membaca hasil migration terbaru tanpa anomali jelas
- dapat menjadi operator kontrol saat role lain diuji

Kriteria lulus:

- tidak ada blocker lintas domain
- tidak ada halaman kontrol inti yang gagal terbuka
- dapat dipakai sebagai role validasi saat pilot

### `NOC_OPERATOR`

Target:

- membuktikan bahwa queue teknis dan inventory sudah cukup kuat untuk pilot awal

Bukti yang harus dikumpulkan:

- login berhasil dengan scope `NOC`
- dashboard menampilkan queue teknis yang relevan
- menu `support` dan `inventory` terbuka
- data TT teknis, ODP, dan port dapat dibaca
- update teknis dasar tidak memunculkan scope role yang salah

Kriteria lulus:

- queue teknis tidak kosong total tanpa sebab
- data ODP/port relevan terhadap kasus aktif
- role tidak melihat action lintas domain yang tidak perlu

### `TT_OPERATOR`

Target:

- membuktikan lane `Trouble Ticket` bisa dipakai sebagai workspace mikro-role yang stabil

Bukti yang harus dikumpulkan:

- login berhasil
- lane TT terbuka dengan data nyata
- filter, status, dan CTA dasar terbaca
- update/close TT dasar berjalan normal
- role tidak melihat action supervisor atau inventory yang salah

Kriteria lulus:

- satu siklus baca -> tindak -> tutup TT bisa selesai
- queue TT tetap konsisten setelah data production dimuat
- guard action mikro-role tidak bocor

### `DISMANTLE_OPERATOR`

Target:

- membuktikan queue dismantle aktif, histori, dan reopen benar-benar usable

Bukti yang harus dikumpulkan:

- login berhasil
- queue dismantle aktif tampil
- histori dismantle bisa dibaca
- action reopen dan close dasar bisa diuji manual
- role tidak melihat action TT atau approval supervisor yang tidak relevan

Kriteria lulus:

- queue aktif dan histori saling konsisten
- reopen tidak merusak state queue
- role bisa menyelesaikan flow dasar tanpa bantuan role lain

### `SALES_MARKETING`

Target:

- membuktikan workspace marketing bisa dipakai untuk ritme kerja lead sampai order awal

Bukti yang harus dikumpulkan:

- login berhasil
- `sales` dan `customers` terbuka
- `List Kerja` marketing menampilkan queue yang relevan
- data lead, coverage, customer, dan order awal terbaca
- menu teknis tidak muncul sebagai jalur utama

Kriteria lulus:

- lead dan customer bisa ditelusuri dari workspace utama
- queue marketing tidak sekadar placeholder
- user tidak perlu kembali ke web lama untuk baca alur dasar

### `CS_OPERATOR`

Target:

- membuktikan operator CS bisa melakukan triage lintas domain dari workspace tunggal

Bukti yang harus dikumpulkan:

- login berhasil
- `sales`, `customers`, `support`, dan `inventory` terbuka
- `List Kerja` CS menampilkan queue lintas domain
- perpindahan dari customer ke support/inventory berjalan
- flow baca kasus dan handoff bisa selesai tanpa bingung konteks

Kriteria lulus:

- satu kasus customer dapat ditelusuri lintas domain
- `List Kerja` benar-benar menjadi workspace utama
- tidak ada blocker besar pada perpindahan antar modul

### `CS_ADMIN`

Target:

- membuktikan dashboard supervisor dan queue keputusan berisiko tinggi benar-benar siap dipakai

Bukti yang harus dikumpulkan:

- login berhasil
- dashboard supervisor terbuka
- queue `Perlu Koreksi`, `Transfer atau Restore`, dan `Queue Risiko Tinggi` tampil
- approval dasar, koreksi, dan handoff supervisor bisa dibaca dan diputuskan
- audit trail minimum masih terbaca

Kriteria lulus:

- queue supervisor tidak kosong total tanpa sebab
- keputusan restore/transfer bisa ditelusuri
- role tidak kehilangan konteks saat berpindah antar kasus berisiko

## Urutan Eksekusi Lapangan

### Langkah 1. Validasi Teknis Role

Untuk setiap role:

1. login
2. cek dashboard utama
3. cek menu yang boleh terlihat
4. cek menu yang seharusnya tidak terlihat

### Langkah 2. Validasi Queue Kerja

Untuk setiap role:

1. buka queue utama
2. pastikan ada data nyata
3. pastikan label, status, dan CTA relevan
4. pastikan tidak ada queue asing yang membingungkan

### Langkah 3. Validasi Write-Side Dasar

Fokus pada aksi minimum:

1. `TT_OPERATOR` -> update/close TT
2. `NOC_OPERATOR` -> update teknis ODP/port yang aman
3. `DISMANTLE_OPERATOR` -> close/reopen dismantle
4. `CS_OPERATOR` -> triage dan handoff lintas domain
5. `CS_ADMIN` -> approval/koreksi/transfer-restore

### Langkah 4. Catat Temuan

Semua temuan harus jatuh ke salah satu bucket:

1. blocker cutover
2. aman untuk pilot
3. backlog pasca-go-live

## Urutan Naik Status

### Naik ke `PILOT`

Role boleh naik ke `PILOT` bila:

1. login dan scope data benar
2. queue utama terbaca dengan data nyata
3. minimal satu write-side inti lulus
4. tidak ada blocker kritis yang memaksa kembali ke web lama

### Naik ke `GO`

Role boleh naik ke `GO` bila:

1. sudah lulus `PILOT`
2. UAT ulang tidak menemukan blocker kritis
3. queue dan write-side stabil minimal pada dua putaran uji
4. owner bisnis menyetujui role tersebut untuk cutover penuh

## Target Keluaran

Dokumen ini dianggap selesai dijalankan jika menghasilkan:

1. daftar status terbaru per role: `GO`, `PILOT`, `PARTIAL`, `NO-GO`
2. daftar blocker yang benar-benar tersisa
3. daftar role yang aman masuk gelombang pilot
4. daftar role yang harus ditahan sampai pasca-go-live awal
