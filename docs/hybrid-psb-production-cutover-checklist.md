# Hybrid PSB Production Cutover Checklist

Dokumen ini menerjemahkan hasil migration production `Web PSB` yang sudah lulus menjadi checklist eksekusi cutover bertahap. Fokusnya adalah memastikan data final, login role, workspace operator, dan keputusan `go / pilot / rollback` memakai dasar yang sama.

Dokumen ini melengkapi:

1. [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
2. [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
3. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)

## Prinsip Cutover

1. cutover dilakukan bertahap, bukan sekaligus semua divisi
2. data migration harus dibekukan pada batch yang sudah punya bukti `PASS`
3. keputusan `GO` tidak boleh hanya melihat build/deploy, tetapi juga queue operator nyata
4. rollback harus bisa dilakukan cepat tanpa improvisasi

## Basis Data Produksi yang Menjadi Pegangan

Cutover hybrid hanya boleh lanjut bila hasil minimum berikut sudah tercatat:

| Area | Batch / Bukti | Hasil Minimum |
|---|---|---|
| customer-order-service | `PROD-WEBPSB-TICKET-001` | split customer, address, order, subscription, work order siap |
| support core | `PROD-WEBPSB-SUPPORT-CORE-001` | TT, isolation, dismantle queue, dismantle history linked |
| support photo | `PROD-WEBPSB-TTPHOTO-001` | photo TT linked, known exception terdokumentasi |
| auth user | `PROD-WEBPSB-USER-001` | user, role, division siap dipakai login review/operasional |
| support master | `PROD-WEBPSB-TTMASTER-001` | katalog support final siap untuk dropdown/logic |
| priority | `PROD-WEBPSB-PRIORITY-001` | badge priority final konsisten |
| whatsapp helper | `PROD-WEBPSB-WATPL-001` | helper template final dan default aktif siap |

## T-3 Sampai T-1

- [ ] freeze scope migration dan web ditetapkan
- [ ] commit kandidat release terakhir sudah tercatat
- [ ] commit rollback stabil sudah tercatat
- [ ] dokumen readiness, hardening, dan cutover sudah dibaca ulang
- [ ] backup database target dan backup file env sudah disiapkan
- [ ] akun validasi untuk `SUPER_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`, `SALES_MARKETING`, `CS_OPERATOR`, dan `CS_ADMIN` dipastikan aktif
- [ ] PIC deploy, PIC DB, PIC validasi support, PIC validasi sales/CS, dan PIC keputusan sudah ditunjuk

## Freeze Batch Migration

Sebelum hari-H, tetapkan bahwa batch data yang dipakai adalah:

- `PROD-WEBPSB-TICKET-001`
- `PROD-WEBPSB-SUPPORT-CORE-001`
- `PROD-WEBPSB-TTPHOTO-001`
- `PROD-WEBPSB-USER-001`
- `PROD-WEBPSB-TTMASTER-001`
- `PROD-WEBPSB-PRIORITY-001`
- `PROD-WEBPSB-WATPL-001`

Catatan:

- jangan ganti mapping role/division, priority, master support, atau whatsapp template mendekati hari-H tanpa review ulang
- jika ada re-run batch, update dokumen readiness dulu sebelum lanjut

## Checklist Hari-H

### 1. Validasi Teknis Awal

- [ ] env production final terpasang
- [ ] `npm run verify:production-env -- .env`
- [ ] `npm run check`
- [ ] `npm run test:smoke`
- [ ] `npm run build`
- [ ] PM2 atau process manager aktif `online`
- [ ] reverse proxy aktif
- [ ] `npm run verify:health -- http://127.0.0.1:3000/api/health`

### 2. Validasi Data Minimum

- [ ] login `SUPER_ADMIN` berhasil
- [ ] user hasil `PROD-WEBPSB-USER-001` terbaca sesuai role/division
- [ ] queue TT, isolation, dan dismantle tidak kosong total tanpa sebab
- [ ] priority label dan warna tampil sesuai data final
- [ ] dropdown/problem/resolution/ONT memakai katalog hasil `TTMASTER`
- [ ] helper template WhatsApp terbaca dan hanya satu default aktif

### 3. Validasi Role Fondasi

#### `NOC_OPERATOR`

- [ ] login berhasil
- [ ] dashboard `NOC` memakai scope yang benar
- [ ] menu support dan inventory terbuka
- [ ] queue teknis terbaca
  Catatan: akun seed `support.ops` ada di review DB, tetapi UAT browser lokal 2026-07-13 masih tertahan `invalid_credentials`.

#### `TT_OPERATOR`

- [x] login berhasil
- [x] lane TT tampil dengan data nyata
- [x] action TT dasar tersedia sesuai role

#### `DISMANTLE_OPERATOR`

- [ ] login berhasil
- [ ] queue dismantle aktif tampil
- [ ] histori dan reopen dapat dibaca
- [ ] role tidak melihat aksi asing

#### `SALES_MARKETING`

- [ ] login berhasil
- [ ] `sales` dan `customers` terbuka
- [ ] workspace marketing membaca customer/order/coverage yang relevan
- [ ] tidak melihat menu teknis yang tidak relevan

#### `CS_OPERATOR`

- [ ] login berhasil
- [ ] `sales`, `customers`, `support`, dan `inventory` terbuka
- [ ] `List Kerja` operator menampilkan queue lintas domain
- [ ] perpindahan lintas domain berjalan normal

#### `CS_ADMIN`

- [ ] login berhasil
- [ ] dashboard supervisor terbuka
- [ ] queue approval/koreksi/transfer-restore tampil
- [ ] backlog risiko tinggi dapat dibaca

## Keputusan Cutover

### `GO`

Pilih `GO` bila:

1. validasi teknis lulus seluruhnya
2. data minimum terbaca normal
3. `NOC_OPERATOR` dan `TT_OPERATOR` lulus
4. `CS_OPERATOR` dan `CS_ADMIN` minimal tidak punya blocker kritis
5. tidak ada error kritis login, session, health, atau queue inti

### `PILOT TERBATAS`

Pilih `PILOT TERBATAS` bila:

1. deploy dan health stabil
2. role teknis support lulus
3. role sales/CS masih memiliki gap yang dapat ditahan sambil dipantau
4. rollback tetap siap bila pilot gagal

### `ROLLBACK`

Pilih `ROLLBACK` bila salah satu terjadi:

1. login atau session role fondasi tidak stabil
2. queue inti hilang atau kosong total tanpa sebab
3. data hasil migration tidak terbaca di workspace utama
4. health check gagal pasca-deploy
5. role melihat aksi/menu yang jelas berisiko dan salah

## Trigger Rollback Cepat

Rollback harus langsung dijalankan jika muncul:

- blank page/crash pada login atau dashboard awal
- queue support utama hilang setelah deploy
- role mendapat scope divisi yang salah
- helper master penting tidak terbaca
- data user final membuat login role utama tidak bisa dipakai

## Bukti Minimum yang Harus Disimpan

1. screenshot login `SUPER_ADMIN`
2. screenshot dashboard `NOC`
3. screenshot lane TT
4. screenshot queue dismantle
5. screenshot workspace `SALES_MARKETING`
6. screenshot workspace `CS_OPERATOR`
7. screenshot dashboard supervisor `CS_ADMIN`
8. output `/api/health`
9. catatan keputusan `GO / PILOT / ROLLBACK`

## Pasca-Keputusan

Jika `GO` atau `PILOT TERBATAS` dipilih:

- [ ] umumkan scope role/divisi yang aktif
- [ ] catat backlog pasca-go-live
- [ ] pantau error log dan feedback operator
- [ ] jadwalkan evaluasi H+1

Jika `ROLLBACK` dipilih:

- [ ] kembalikan aplikasi ke commit rollback
- [ ] pastikan service lama tetap dapat dipakai
- [ ] catat akar masalah, dampak, dan kebutuhan patch
- [ ] jangan ulang cutover tanpa pembaruan dokumen readiness dan hardening
