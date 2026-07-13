# Template Bukti Backup dan Rollback

## Tujuan

Dokumen ini dipakai untuk mencatat bukti backup sebelum cutover dan bukti rollback
jika deploy production harus dibatalkan. Template ini dibuat agar PIC deploy dan
PIC database memiliki artefak yang sama saat menyimpan nama file backup, commit
aktif, commit rollback, hasil restore-check, dan keputusan akhir.

Dokumen ini melengkapi:

1. [web-go-live-cutover-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-cutover-checklist.md)
2. [web-hosting-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-hosting-runbook.md)
3. [web-server-side-command-sheet.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-server-side-command-sheet.md)

## Metadata

| Item | Isi |
|---|---|
| tanggal | `................` |
| server / host | `................` |
| environment | `rehearsal / production` |
| domain | `................` |
| PIC deploy | `................` |
| PIC database | `................` |
| commit kandidat deploy | `................` |
| commit rollback | `................` |
| alasan rollback bila dipakai | `................` |

## Bukti Backup Sebelum Cutover

| Item | Hasil |
|---|---|
| path backup DB | `................` |
| nama file backup DB | `................` |
| ukuran file backup DB | `................` |
| timestamp backup DB | `................` |
| command backup DB | `................` |
| command verifikasi backup | `................` |
| hash / checksum backup bila ada | `................` |
| path backup env | `................` |
| nama file backup env | `................` |
| timestamp backup env | `................` |
| command backup env | `................` |
| hasil verifikasi file backup | `pass / fail` |

## Checklist Backup

- [ ] backup DB berhasil dibuat
- [ ] file backup DB dapat ditemukan di lokasi yang disepakati
- [ ] backup env production berhasil dibuat
- [ ] file backup env tidak tercampur dengan repo
- [ ] nama file dan timestamp dicatat
- [ ] PIC database menyatakan backup siap dipakai bila rollback diperlukan

## Bukti Rollback

Isi bagian ini hanya bila rollback dijalankan atau diuji saat rehearsal.

| Item | Hasil |
|---|---|
| trigger rollback | `................` |
| waktu mulai rollback | `................` |
| waktu selesai rollback | `................` |
| commit yang dilepas | `................` |
| commit yang dipakai ulang | `................` |
| command checkout / restore | `................` |
| command build ulang | `................` |
| command restart PM2 | `................` |
| hasil health setelah rollback | `pass / fail` |
| hasil login minimum setelah rollback | `pass / fail` |
| bukti service lama / stabil kembali | `................` |

## Checklist Rollback

- [ ] commit rollback sesuai catatan hari-H
- [ ] build ulang setelah rollback selesai
- [ ] PM2 kembali `online`
- [ ] `verify:health` kembali `pass`
- [ ] login admin minimum kembali normal
- [ ] PIC deploy dan PIC database menyetujui status pasca-rollback

## Artefak Pendukung

| Artefak | Lokasi / Catatan |
|---|---|
| output backup DB | `................` |
| output backup env | `................` |
| output `git log -1 --oneline` | `................` |
| output `verify:health` pasca-deploy | `................` |
| output `verify:health` pasca-rollback | `................` |
| screenshot browser pasca-rollback | `................` |

## Keputusan Akhir

| Opsi | Dipilih | Alasan |
|---|---|---|
| lanjut `GO` | `ya / tidak` | `................` |
| `PILOT TERBATAS` | `ya / tidak` | `................` |
| `ROLLBACK` | `ya / tidak` | `................` |

## Sign-Off

| Peran | Nama | Status | Catatan |
|---|---|---|---|
| PIC Deploy | `................` | `setuju / tunda / tolak` | `................` |
| PIC Database | `................` | `setuju / tunda / tolak` | `................` |
| PIC Keputusan | `................` | `setuju / tunda / tolak` | `................` |
