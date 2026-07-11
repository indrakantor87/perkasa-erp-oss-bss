# Hybrid Wave 1A Execution Checklist

## Tujuan

Checklist ini dipakai setelah sample dan transform `Wave 1A` dijalankan pada review DB, supaya hasilnya bisa diaudit cepat tanpa membaca output terminal secara acak.

Referensi:

- Runner: [run-review-wave1a.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a.ps1)
- Runbook: [hybrid-wave-1-psb-wave-1a-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-runbook.md)
- Query review siap pakai: [xampp_review_wave_1a_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_review_queries.sql)

## Metadata Eksekusi

- Tanggal:
- Operator:
- Mesin:
- DB target:
- Mode runner: `Full` / `Wave1AOnly`
- Lokasi `mysql.exe`:

## Checklist Pra-Eksekusi

- [ ] MySQL atau MariaDB review DB aktif
- [ ] Database target `erp_isp_review` tersedia
- [ ] Sample dasar `TT-001` dan `ISO-001` sudah pernah dibootstrap jika memakai mode `Wave1AOnly`
- [ ] File `xampp_review_sample_import_wave_1a.sql` sudah ada di repo
- [ ] File transform `wave_1a_support_extension` dan `wave_1a_network_odp` sudah ada di repo

## Checklist Eksekusi

- [ ] Runner atau urutan SQL manual berhasil dijalankan tanpa error fatal
- [ ] Batch `SAMPLE-WEBPSB-SUPPORT-EXT-001` terbentuk
- [ ] Batch `SAMPLE-WEBPSB-ODP-001` terbentuk
- [ ] Query review `xampp_review_wave_1a_review_queries.sql` berhasil dijalankan

## Hasil Support Extension

### Batch

- [ ] `SAMPLE-WEBPSB-SUPPORT-EXT-001` muncul di `staging_import_batches`
- [ ] `import_scope = PSB_SUPPORT_EXT`
- [ ] `total_rows = 4`
- [ ] `valid_rows = 4`

### Staging

- [ ] Row `DISMANTLE_QUEUE` ada
- [ ] Row `TROUBLE_TICKET_PHOTO` ada
- [ ] Row `TROUBLE_TICKET_SLA` ada
- [ ] Row `TROUBLE_TICKET_MASTER` ada

### Final

- [ ] `DISMANTLE_QUEUE` mendapatkan `target_isolation_id`
- [ ] `DISMANTLE_QUEUE` mendapatkan `target_dismantle_queue_id`
- [ ] `TROUBLE_TICKET_PHOTO` mendapatkan `target_trouble_ticket_id`
- [ ] `TROUBLE_TICKET_SLA` mendapatkan `target_trouble_ticket_sla_id`
- [ ] `support_dismantle_queue` berisi row baru sample
- [ ] `support_trouble_ticket_photos` berisi row baru sample
- [ ] `support_trouble_ticket_sla` berisi row baru sample

### Expected Pending

- [ ] `TROUBLE_TICKET_MASTER` tetap tertahan di staging
- [ ] `validation_notes` untuk `TROUBLE_TICKET_MASTER` menjelaskan bahwa tabel final config support masih menunggu

## Hasil ODP Header

### Batch

- [ ] `SAMPLE-WEBPSB-ODP-001` muncul di `staging_import_batches`
- [ ] `import_scope = PSB_ODP_HEADER`
- [ ] `total_rows = 1`
- [ ] `valid_rows = 1`

### Staging

- [ ] Row `staging_legacy_network_odp_records` ada
- [ ] `odp_code = TRKL/07 - 16`
- [ ] `target_odp_id` terisi setelah transform

### Final

- [ ] `network_odp` berisi row baru untuk sample `TRKL/07 - 16`
- [ ] `total_ports = 8`
- [ ] `active_ports = 0`

## Tabel Ringkas Hasil

| Area | Check | Status | Catatan |
|---|---|---|---|
| Support | Batch support extension muncul | `PASS / FAIL / BLOCKED` | |
| Support | Queue dismantle final terisi | `PASS / FAIL / BLOCKED` | |
| Support | Photo TT final terisi | `PASS / FAIL / BLOCKED` | |
| Support | SLA TT final terisi | `PASS / FAIL / BLOCKED` | |
| Support | Master support config tetap pending | `PASS / FAIL / BLOCKED` | |
| ODP | Batch ODP header muncul | `PASS / FAIL / BLOCKED` | |
| ODP | `target_odp_id` terisi | `PASS / FAIL / BLOCKED` | |
| ODP | `network_odp` final terisi | `PASS / FAIL / BLOCKED` | |

## Evidence Yang Sebaiknya Disimpan

- Screenshot terminal atau phpMyAdmin setelah runner selesai
- Hasil query dari `xampp_review_wave_1a_review_queries.sql`
- Jika gagal, pesan error SQL lengkap
- Jika partial, sebutkan tabel mana yang berhasil dan mana yang kosong

## Keputusan Setelah Checklist

- `GO` jika semua row sample utama berhasil masuk ke tabel final yang ditargetkan
- `PARTIAL` jika support berhasil tetapi ODP gagal, atau sebaliknya
- `BLOCKED` jika batch dasar tidak muncul atau parent `TT-001` / `ISO-001` tidak bisa di-resolve

## Catatan Temuan

- Temuan 1:
- Temuan 2:
- Temuan 3:
