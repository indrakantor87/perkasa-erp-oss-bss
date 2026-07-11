# Hybrid Wave 1A Runbook

## Tujuan

Runbook ini dipakai untuk menjalankan sample dan transform `Wave 1A` `Web PSB` pada review DB `erp_isp_review` tanpa perlu merangkai urutan file SQL secara manual.

Fokusnya:

1. `DismantleTickets` -> `support_dismantle_queue`
2. `TroubleTicketPhoto` -> `support_trouble_ticket_photos`
3. `TroubleTicketSla` -> `support_trouble_ticket_sla`
4. `psb_odp` -> `network_odp`

## Prasyarat

- MySQL atau MariaDB review DB sudah aktif.
- Database target tersedia, default: `erp_isp_review`.
- Jika ingin memakai runner PowerShell, `mysql.exe` harus tersedia:
  - di `PATH`, atau
  - diberikan lewat parameter `-MysqlPath`

Runner:

- [run-review-wave1a.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1a.ps1)
- Query review: [xampp_review_wave_1a_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_review_queries.sql)
- Assertion query: [xampp_review_wave_1a_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1a_assertions.sql)
- Checklist hasil: [hybrid-wave-1-psb-wave-1a-execution-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-execution-checklist.md)
- Template laporan hasil: [hybrid-wave-1-psb-wave-1a-result-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1-psb-wave-1a-result-template.md)

## Pilihan Eksekusi

### Opsi 1: Runner PowerShell

Dipakai jika Anda punya akses ke `mysql.exe`.

Mode cepat:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a.ps1 -Mode Wave1AOnly
```

Mode penuh dari bootstrap review DB:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a.ps1 -Mode Full
```

Jika `mysql.exe` tidak ada di `PATH`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a.ps1 `
  -Mode Full `
  -MysqlPath "C:\xampp\mysql\bin\mysql.exe"
```

Jika root memakai password:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a.ps1 `
  -Mode Full `
  -MysqlPath "C:\xampp\mysql\bin\mysql.exe" `
  -Password "password-anda"
```

### Opsi 2: phpMyAdmin atau mysql CLI Manual

Urutan file:

1. `database/xampp_review_schema.sql`
2. `database/xampp_review_schema_phase_1_1.sql`
3. `database/xampp_review_staging_import.sql`
4. `database/xampp_review_master_mapping.sql`
5. `database/xampp_review_core_master_seed.sql`
6. `database/xampp_review_auth_seed.sql`
7. `database/xampp_review_master_mapping_seed.sql`
8. `database/xampp_review_sample_import.sql`
9. `database/xampp_review_transform_stage_2.sql`
10. `database/xampp_review_transform_stage_3.sql`
11. `database/xampp_review_sample_import_wave_1a.sql`
12. `database/xampp_review_transform_wave_1a_support_extension.sql`
13. `database/xampp_review_transform_wave_1a_network_odp.sql`

Jika review DB dasar sudah pernah dibangun sebelumnya, cukup jalankan:

1. `database/xampp_review_sample_import_wave_1a.sql`
2. `database/xampp_review_transform_wave_1a_support_extension.sql`
3. `database/xampp_review_transform_wave_1a_network_odp.sql`

## Query Review

### Batch Support Extension

```sql
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001';
```

```sql
SELECT support_type, legacy_id, legacy_parent_id, target_isolation_id, target_trouble_ticket_id, target_dismantle_queue_id, target_trouble_ticket_sla_id, import_status
FROM staging_legacy_support_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
)
ORDER BY id;
```

### Final Support Tables

```sql
SELECT id, isolation_id, transfer_note, transferred_by_username, transferred_at
FROM support_dismantle_queue
ORDER BY id DESC
LIMIT 5;
```

```sql
SELECT id, trouble_ticket_id, photo_path
FROM support_trouble_ticket_photos
ORDER BY id DESC
LIMIT 5;
```

```sql
SELECT id, trouble_type, duration_days
FROM support_trouble_ticket_sla
ORDER BY id DESC
LIMIT 10;
```

### Batch ODP Header

```sql
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001';
```

```sql
SELECT legacy_id, odp_code, total_ports, active_ports, target_odp_id, import_status
FROM staging_legacy_network_odp_records
WHERE batch_id = (
  SELECT id FROM staging_import_batches WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001'
)
ORDER BY id;
```

### Final ODP Table

```sql
SELECT id, code, name, total_ports, active_ports
FROM network_odp
ORDER BY id DESC
LIMIT 10;
```

## Hasil Yang Diharapkan

- batch `SAMPLE-WEBPSB-SUPPORT-EXT-001` berstatus `MAPPED` atau `IMPORTED`
- row `DISMANTLE_QUEUE` berhasil mendapatkan `target_isolation_id` dan `target_dismantle_queue_id`
- row `TROUBLE_TICKET_PHOTO` berhasil mendapatkan `target_trouble_ticket_id`
- row `TROUBLE_TICKET_SLA` berhasil mendapatkan `target_trouble_ticket_sla_id`
- row `TROUBLE_TICKET_MASTER` tetap tertahan di staging dengan catatan menunggu tabel final config support
- batch `SAMPLE-WEBPSB-ODP-001` menghasilkan row baru di `network_odp`

## Catatan

- `Wave1AOnly` mengasumsikan bootstrap review DB dasar sudah pernah dijalankan.
- Jika hasil final kosong, cek dulu apakah transform tahap 2 dan tahap 3 dasar sudah pernah dijalankan untuk sample base `TT-001` dan `ISO-001`.
- Jika ingin paling aman, gunakan mode `Full` pada runner PowerShell.
