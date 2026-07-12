# Hybrid PSB Go-Live Timeline

Dokumen ini menerjemahkan readiness, hardening, dan cutover menjadi urutan kerja praktis sampai `pilot` lalu `go-live bertahap`. Timeline ini diasumsikan berjalan setelah batch migration inti `Web PSB` sudah `PASS` dan artefak cutover sudah tersedia.

Dokumen ini melengkapi:

1. [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
2. [hybrid-psb-role-hardening-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-role-hardening-plan.md)
3. [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
4. [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)

## Prinsip Timeline

1. fokus awal tetap `Pemasaran dan Pelayanan`
2. cutover dilakukan bertahap, dimulai dari role teknis yang paling siap
3. bila satu minggu menghasilkan blocker kritis, minggu berikutnya dipakai untuk patch, bukan memaksa maju
4. target akhir timeline ini adalah `pilot terbatas`, bukan sekaligus memindahkan semua divisi

## Ringkasan Fase

| Fase | Durasi | Fokus | Output Minimum |
|---|---|---|---|
| Fase 1 | Minggu 1 | hardening role teknis dan validasi data final | `SUPER_ADMIN`, `NOC_OPERATOR`, `TT_OPERATOR` stabil |
| Fase 2 | Minggu 2 | hardening role handoff dan supervisor | `DISMANTLE_OPERATOR`, `CS_OPERATOR`, `CS_ADMIN` punya bukti UAT |
| Fase 3 | Minggu 3 | pilot terbatas dan pengamatan | keputusan `GO / PILOT TERBATAS / ROLLBACK` untuk role fondasi |
| Fase 4 | Minggu 4 | stabilisasi pasca-pilot | backlog prioritas dan jadwal ekspansi role berikutnya |

## Minggu 1: Stabilkan Fondasi Teknis

### Sasaran

- memastikan batch production yang sudah lulus benar-benar terbaca di workspace web
- menyiapkan `SUPER_ADMIN`, `NOC_OPERATOR`, dan `TT_OPERATOR` untuk pilot awal

### Hari 1

- baca ulang:
  - [hybrid-psb-production-readiness-2026-07-11.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-readiness-2026-07-11.md)
  - [hybrid-psb-production-hardening-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-hardening-checklist.md)
  - [hybrid-psb-production-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-psb-production-cutover-checklist.md)
- pastikan batch data yang menjadi pegangan sudah dibekukan
- siapkan akun validasi semua role fondasi

### Hari 2

- uji `SUPER_ADMIN`
- validasi dashboard, settings, import center, dan domain utama
- cek bahwa hasil migration terbaru terbaca tanpa anomali besar

### Hari 3

- uji `NOC_OPERATOR`
- validasi queue teknis, inventory, ODP, dan port
- catat apakah ada queue kosong, scope salah, atau CTA yang bocor

### Hari 4

- uji `TT_OPERATOR`
- validasi lane TT, CTA update/close, dan guard mikro-role
- simpan bukti screenshot lane dan hasil tindakan dasar

### Hari 5

- rekap temuan Minggu 1
- kelompokkan:
  - blocker kritis
  - aman untuk pilot
  - backlog pasca-go-live
- jika `NOC_OPERATOR` dan `TT_OPERATOR` belum stabil, tahan maju ke Minggu 2 sampai blocker inti ditutup

## Minggu 2: Stabilkan Handoff dan Supervisi

### Sasaran

- memastikan alur operator lintas domain dan keputusan supervisor berfungsi
- menyiapkan `DISMANTLE_OPERATOR`, `CS_OPERATOR`, dan `CS_ADMIN`

### Hari 1

- uji `DISMANTLE_OPERATOR`
- validasi queue aktif, histori, close, dan reopen
- catat setiap mismatch state queue

### Hari 2

- uji `CS_OPERATOR`
- validasi `List Kerja` lintas sales/customers/support/inventory
- telusuri minimal satu kasus customer dari awal sampai handoff

### Hari 3

- uji `CS_ADMIN`
- validasi dashboard supervisor
- uji pembacaan queue `Perlu Koreksi`, `Transfer atau Restore`, dan `Queue Risiko Tinggi`

### Hari 4

- ulangi write-side berisiko:
  - restore isolir
  - transfer ke dismantle
  - reopen dismantle
  - update TT teknis
  - update port/ODP

### Hari 5

- rekap hasil Minggu 2
- putuskan status masing-masing role:
  - `siap pilot`
  - `butuh patch kecil`
  - `tahan`

## Minggu 3: Pilot Terbatas

### Sasaran

- menjalankan pilot untuk role yang paling stabil tanpa membuka semua divisi sekaligus

### Scope Pilot yang Direkomendasikan

1. `SUPER_ADMIN`
2. `NOC_OPERATOR`
3. `TT_OPERATOR`
4. `DISMANTLE_OPERATOR` bila Minggu 2 lulus
5. `CS_OPERATOR` dan `CS_ADMIN` bila tidak ada blocker kritis

### Hari 1

- freeze commit kandidat release
- freeze commit rollback
- siapkan backup DB dan env

### Hari 2

- jalankan validasi teknis:
  - `npm run verify:production-env -- .env`
  - `npm run check`
  - `npm run test:smoke`
  - `npm run build`
  - `npm run verify:health -- http://127.0.0.1:3000/api/health`

### Hari 3

- deploy kandidat pilot
- validasi login role fondasi
- validasi data minimum:
  - user final
  - queue TT/isolation/dismantle
  - priority final
  - TT master final
  - WhatsApp template default

### Hari 4

- jalankan pilot terbatas oleh operator inti
- kumpulkan screenshot, catatan error, dan backlog

### Hari 5

- ambil keputusan:
  - `GO`
  - `PILOT TERBATAS LANJUT`
  - `ROLLBACK`

## Minggu 4: Stabilisasi Pasca-Pilot

### Bila Keputusan `GO` atau `PILOT TERBATAS LANJUT`

- rapikan backlog prioritas
- tentukan patch H+1 dan H+3
- perluas penggunaan role yang sudah stabil
- jadwalkan evaluasi ekspansi role lain

### Bila Keputusan `ROLLBACK`

- kembalikan ke commit rollback
- rekap akar masalah
- patch blocker inti
- ulangi Minggu 2 atau Minggu 3 sesuai sumber masalah

## Target Waktu Realistis

### Skenario Cepat

Jika blocker tersisa minor:

1. Minggu 1-2 untuk hardening
2. Minggu 3 untuk pilot terbatas
3. Minggu 4 untuk stabilisasi awal

Makna:

- siap operasional bertahap dalam sekitar `3-4 minggu`

### Skenario Aman

Jika masih ada gap UAT atau write-side:

1. Minggu 1-3 untuk hardening dan patch
2. Minggu 4 untuk pilot
3. Minggu 5-6 untuk stabilisasi

Makna:

- siap production bertahap dalam sekitar `5-6 minggu`

## Kapan Role Lain Menyusul

Setelah fase fondasi stabil:

1. `SALES_MARKETING` naik penuh bila ritme queue marketing dan order awal sudah terbukti
2. `DIGITAL_CREATOR` baru masuk setelah suite creator benar-benar hidup
3. `FIELD_TECHNICIAN` dan divisi `Teknis dan Expan` mengikuti setelah fondasi `Pemasaran dan Pelayanan` aman

## Output yang Harus Ada di Akhir Timeline

1. status role terbaru pada [web-role-cutover-readiness.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-role-cutover-readiness.md)
2. backlog hasil pilot
3. keputusan `GO / PILOT TERBATAS / ROLLBACK`
4. commit kandidat release dan commit rollback yang jelas
5. jadwal ekspansi role/divisi setelah pilot awal
