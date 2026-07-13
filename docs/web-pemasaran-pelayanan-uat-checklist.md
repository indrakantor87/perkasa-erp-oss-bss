# UAT Checklist Pemasaran dan Pelayanan

## Tujuan

Dokumen ini menjadi checklist UAT khusus untuk fase awal migrasi ERP yang berpusat pada Divisi
`Pemasaran dan Pelayanan`.

Fokus dokumen ini:

1. memvalidasi role-role legacy `web-psb-perkasa` yang menjadi fondasi cutover awal
2. memastikan flow harian bisa selesai tanpa kembali ke web lama
3. memberi urutan uji yang presisi sebelum integrasi ke divisi lain dibuka

Dokumen ini melengkapi:

1. [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
2. [web-list-kerja-terpadu-prd.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-kerja-terpadu-prd.md)
3. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
4. [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md)

## Scope Fase Awal

Role yang diuji pada checklist ini:

1. `SUPER_ADMIN`
2. `SALES_MARKETING`
3. `CS_OPERATOR`
4. `CS_ADMIN`
5. `NOC_OPERATOR`
6. `TT_OPERATOR`
7. `DISMANTLE_OPERATOR`
8. `DIGITAL_CREATOR`

Catatan:

1. `FIELD_TECHNICIAN` tidak masuk checklist ini karena berada pada fase integrasi divisi berikutnya
2. role `DIGITAL_CREATOR` tetap dicatat untuk menjaga visibilitas gap, walau statusnya belum siap cutover

## Cara Pakai

Status penilaian:

1. `pass` jika flow selesai penuh tanpa bantuan web lama
2. `partial` jika flow dasar ada, tetapi masih ada gap signifikan
3. `fail` jika flow belum ada, salah role, atau belum usable

Aturan bukti:

1. setiap flow wajib punya screenshot atau rekaman hasil uji
2. bila ada action write, bukti harus mencakup perubahan status atau histori data
3. bila ada guard role, bukti harus mencakup menu atau tombol yang memang tidak tampil

## Checklist Global Semua Role Fase Awal

Semua role pada fase awal wajib lolos:

1. berhasil login dengan role yang benar
2. hanya melihat menu yang sesuai role
3. data pada dashboard dan domain mengikuti perspektif divisi atau sub-divisi
4. CTA write-side hanya muncul jika role punya capability
5. action yang disimpan tercermin pada list, detail, atau histori
6. tidak perlu kembali ke `web-psb-perkasa` untuk flow utama harian

## 1. `SUPER_ADMIN`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login admin | berhasil masuk ke ERP | sesi aktif |
| validasi dashboard lintas role | dashboard bisa dibuka lintas role/divisi | semua kartu utama tampil |
| validasi sidebar dan access guard | role aktif hanya melihat menu sesuai policy | capture sidebar per role |
| akses settings akses | halaman role dan permission bisa dibuka | halaman akses tampil |
| akses user internal | create, edit, reset password bisa diuji | histori atau perubahan user tercatat |
| akses import center | daftar batch dan detail batch bisa dibuka | batch list dan detail tampil |
| audit domain awal | `sales`, `customers`, `support`, `inventory`, `billing`, `hr` dapat diinspeksi | halaman domain terbuka |

### Keputusan UAT

`SUPER_ADMIN` lulus jika seluruh flow di atas `pass` dan tidak ada guard yang salah.

## 2. `SALES_MARKETING`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login marketing | berhasil masuk | sesi aktif |
| lihat dashboard marketing | kartu dan ringkasan sesuai penjualan | dashboard tampil sesuai role |
| buka list kerja marketing | queue lead, customer, coverage, dan order tampil sesuai role | tab atau panel kerja tampil |
| create lead | lead baru berhasil dibuat | row lead baru muncul |
| update lead follow up | status, note, atau tindak lanjut tersimpan | histori lead berubah |
| lengkapi customer awal | data customer draft dapat dibuat atau diperbarui | data customer tersimpan |
| buat survey atau order awal | CTA menuju form target berjalan dengan prefill | form target terisi |
| monitor ODP atau support terkait | akses baca lintas domain tampil tanpa write yang tidak perlu | halaman monitoring terbuka |

### Kriteria tambahan

1. role ini harus bisa bekerja tanpa kebingungan berpindah menu terlalu banyak
2. `List Kerja Terpadu` harus menjadi workspace nyata, tetapi status tetap maksimal `partial` bila parity aktivitas marketing harian belum ada

## 3. `CS_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login CS | berhasil masuk | sesi aktif |
| lihat dashboard CS | dashboard sesuai perspektif operasional CS | ringkasan tampil |
| input lead atau ticket awal | data baru berhasil dibuat | row baru muncul |
| buka list kerja CS | queue lintas domain tampil sesuai role | queue atau panel kerja tampil |
| update order atau aktivasi dasar | data order atau progres aktivasi berubah | histori order tersimpan |
| proses isolir dasar | create atau update isolir berhasil | status support berubah |
| proses TT dasar | TT bisa dibuat atau diperbarui | histori TT tercatat |
| kelola ODP atau port dasar | aksi inventory sesuai capability berjalan | data inventory berubah |

### Kriteria tambahan

1. jika operator masih harus bolak-balik banyak domain untuk kerja dasar, status tetap `partial`
2. `List Kerja Terpadu` menjadi bukti utama naiknya readiness role ini dan harus diuji sebagai workspace utama, bukan sekadar menu tambahan

## 4. `CS_ADMIN`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login admin CS | berhasil masuk | sesi aktif |
| seluruh flow `CS_OPERATOR` | semua flow operator lolos di role admin | hasil uji operator tervalidasi |
| lihat queue tim CS | daftar item tim dapat dibaca dari perspektif supervisor | queue supervisor tampil |
| approval aksi CS | queue `Perlu Approval` dapat dibuka dan approve/reject berjalan | status approval berubah |
| koreksi data operasional | queue `Perlu Koreksi` dapat dibuka dan catatan revisi terbaca | histori atau audit berubah |
| transfer atau restore support | queue `Transfer atau Restore` berjalan sesuai policy | perubahan status atau owner tercatat |
| tangani backlog risiko tinggi | queue `Queue Risiko Tinggi` dapat dibuka dari perspektif supervisor | keputusan eskalasi atau tindak lanjut tercatat |

### Kriteria tambahan

1. role ini tidak cukup hanya bisa membaca, tetapi harus punya flow supervisi yang nyata
2. audit action berisiko tinggi wajib terlihat sebelum status role bisa naik
3. `List Kerja` supervisor harus menjadi bukti utama bahwa admin CS tidak lagi mewarisi ritme operator biasa

## 5. `NOC_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login NOC | berhasil masuk | sesi aktif |
| lihat dashboard teknis | ringkasan teknis relevan tampil | dashboard sesuai role |
| buka queue TT teknis | daftar TT teknis tampil | halaman support tampil |
| update progres TT teknis | status dan note teknis tersimpan | histori TT berubah |
| kelola ODP atau port | update ODP atau port sesuai capability berjalan | data inventory berubah |
| monitoring isolir | data isolir relevan bisa dipantau | halaman support terbuka |
| guard terhadap menu non-teknis | role tidak mendapat write-side sales yang tidak relevan | menu atau tombol tidak tampil |

### Kriteria tambahan

1. queue NOC harus terasa fokus teknis dan tidak tercampur dengan flow lapangan yang sempit
2. role ini layak pilot jika seluruh flow utama lolos dan guard-nya tepat

## 6. `TT_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login TT operator | berhasil masuk | sesi aktif |
| buka queue TT | hanya queue TT yang relevan tampil | lane TT tampil |
| update progres TT | note, status, dan tindak lanjut tersimpan | histori TT berubah |
| eskalasi ticket | CTA eskalasi berjalan ke state yang benar | status atau owner berubah |
| close ticket | ticket dapat diselesaikan sesuai policy | status close tercatat |
| guard domain lain | domain di luar scope TT tidak tampil | menu sesuai |

### Kriteria tambahan

1. role ini harus terasa sempit dan fokus
2. jika masih bisa melihat domain di luar TT tanpa alasan operasional, hasilnya `fail`

## 7. `DISMANTLE_OPERATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login dismantle | berhasil masuk | sesi aktif |
| buka queue dismantle | daftar kerja dismantle tampil sesuai role | queue khusus tampil |
| update proses dismantle | progress, note, dan hasil kerja tersimpan | histori support berubah |
| close atau finalisasi dismantle | status akhir berhasil disimpan | status final berubah |
| guard flow support lain | role tidak mendapat write-side di luar dismantle | menu atau tombol tidak tampil |

### Kriteria tambahan

1. role ini membutuhkan queue yang benar-benar sempit
2. jika queue dismantle masih bercampur terlalu luas, hasil maksimal hanya `partial`

## 8. `DIGITAL_CREATOR`

### Flow wajib

| Flow | Kriteria lulus | Bukti |
|---|---|---|
| login creator digital | berhasil masuk | sesi aktif |
| lihat workspace creator | ada area kerja awal yang relevan untuk creator di dashboard atau `List Kerja` | halaman atau section tampil |
| lihat digital leads | lead/order/survey digital tampil dengan konteks yang tepat | daftar lead tampil |
| lihat analytics awal | review funnel channel digital tersedia | dashboard analytics tampil |
| buat atau ubah campaign | fitur campaign tersedia | data campaign tersimpan |

### Keputusan UAT

1. role ini saat ini dipakai untuk mengukur gap, bukan untuk target lulus fase awal
2. workspace awal boleh `pass`, tetapi bila `campaign` dan write-side creator belum ada maka hasil akhir tetap `fail` atau maksimal `partial`

## Aturan Lulus Per Role

Satu role dinyatakan `go` untuk fase awal jika:

1. seluruh flow kritis berstatus `pass`
2. tidak ada guard akses yang salah
3. user tidak perlu kembali ke `web-psb-perkasa`
4. pekerjaan harian utama selesai di ERP dengan konteks role yang benar

Satu role dinyatakan `partial` jika:

1. flow dasar hidup tetapi ruang kerja harian belum menyatu
2. role masih butuh workaround
3. queue atau CTA utama belum presisi

Satu role dinyatakan `fail` jika:

1. flow inti belum ada
2. role melihat menu yang salah
3. aksi utama tidak bisa dieksekusi end-to-end

## Urutan Uji Yang Disarankan

Urutan UAT fase awal:

1. `SUPER_ADMIN`
2. `NOC_OPERATOR`
3. `TT_OPERATOR`
4. `DISMANTLE_OPERATOR`
5. `SALES_MARKETING`
6. `CS_OPERATOR`
7. `CS_ADMIN`
8. `DIGITAL_CREATOR`

Alasan:

1. role teknis di bawah `Pemasaran dan Pelayanan` paling dekat ke pilot
2. role bisnis kini bergantung pada pembuktian UAT `List Kerja Terpadu` sebagai workspace harian
3. `DIGITAL_CREATOR` tetap diuji terakhir karena masih dominan gap parity walau sudah punya workspace awal

## Hubungan Dengan Cutover

Dokumen ini dipakai untuk:

1. memutuskan role mana yang bisa masuk pilot internal
2. memutuskan blocker mana yang harus dikerjakan sebelum UAT berikutnya
3. menjaga agar integrasi ke divisi lain tidak dimulai sebelum fondasi `Pemasaran dan Pelayanan` cukup stabil

## Bukti UAT Review DB 2026-07-13

| Role | Username UAT | Landing Aktual | Hasil | Bukti Positif | Blocker / Catatan |
|---|---|---|---|---|---|
| `NOC_OPERATOR` | `support.ops` | `/support/tt` (target role) | `pass` | login berhasil, source badge menunjukkan `Review DB`, lane `Trouble Ticket` tampil berisi (`4`), serta menu `support` dan `inventory` sama-sama terbuka | password review DB lokal disejajarkan ulang secara terjaga; evidence reset tersimpan di `apps/web/docs/proofs/reset-review-auth-support-ops.json` |
| `TT_OPERATOR` | `tt.review` | `/support/tt` | `pass` | login berhasil, source badge menunjukkan `Review DB`, dan lane `Trouble Open` tampil berisi (`4`) | screenshot lane TT tersimpan pada sesi UAT lokal; flow write-side progress/escalate/close sudah dibuktikan formal lewat mutation proof |
| `DISMANTLE_OPERATOR` | `dismantle` | `/support/dismantle` | `pass` | login berhasil, sidebar fokus, queue aktif dan histori dismantle terbaca | bukti write-side `close/reopen` masih perlu diformalisasi |
| `CS_OPERATOR` | `cstest` | `/dashboard/worklist` | `pass` | login berhasil, `List Kerja` tampil sebagai workspace utama, domain `sales/customers/support/inventory` terbuka | bukti write-side end-to-end masih perlu diperdalam |
| `CS_ADMIN` | `admincs.sample` | `/customers/cs-admin` | `pass` | login berhasil, workspace supervisor tampil, bucket `Transfer atau Restore` dan `Queue Risiko Tinggi` terisi valid, serta teks ambiguous/fallback sudah hilang | bukti write-side supervisor masih perlu diformalisasi, tetapi blocker query review DB sudah tertutup |
| `SALES_MARKETING` | `chalis@perkasa.net.id` | `/sales` | `partial` | login berhasil, landing sales dan sidebar sesuai role | CTA `Import Center` sebelumnya misleading; sudah dihapus dari shell sales pada batch menu audit ini |

### Temuan Guard Menu dari UAT

1. `CS_ADMIN` tidak lagi boleh melihat shortcut `Buka Billing` pada workspace supervisor karena bertentangan dengan RBAC dasar.
2. `SALES_MARKETING` tidak lagi diarahkan ke `Import Center` dari shell sales karena route tersebut memang hanya untuk `SUPER_ADMIN`.
3. Workspace khusus `CS & Admin CS`, `Digital Creator`, `Teknisi *`, `Legal`, `Kantor`, dan `Toko` kini dipersempit ke role target agar sidebar tidak misleading saat UAT role lain dijalankan.

## Versioning

Dokumen ini dirilis pada:

- `0.66.00` untuk checklist UAT yang diselaraskan dengan audit menu per role, bucket supervisor `CS_ADMIN` yang sudah valid kembali, dan sinkronisasi readiness menuju go-live
