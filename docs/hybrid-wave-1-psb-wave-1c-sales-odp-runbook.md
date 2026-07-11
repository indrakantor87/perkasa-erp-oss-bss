# Hybrid Wave 1 PSB Wave 1C Sales ODP Runbook

## Tujuan

Runbook ini dipakai untuk menguji batch `Wave 1C`, yaitu dua jalur yang sebelumnya masih berada pada area `schema-new`:

- `CoveredArea` dan `MarketingActivity` legacy
- bootstrap native `network_odp_ports`

Scope runbook ini hanya untuk review DB lokal, bukan import production penuh.

## File yang Dipakai

- patch existing review DB: [xampp_review_patch_wave_1c_existing_review_db.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_patch_wave_1c_existing_review_db.sql)
- sample coverage dan marketing activity: [xampp_review_sample_import_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_sample_import_wave_1c_sales.sql)
- transform sales `Wave 1C`: [xampp_review_transform_wave_1c_sales.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_wave_1c_sales.sql)
- bootstrap native ODP ports: [xampp_review_bootstrap_wave_1c_odp_ports.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_bootstrap_wave_1c_odp_ports.sql)
- review query: [xampp_review_wave_1c_sales_odp_review_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_review_queries.sql)
- assertion query: [xampp_review_wave_1c_sales_odp_assertions.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave_1c_sales_odp_assertions.sql)
- runner Windows: [run-review-wave1c-sales-odp.ps1](file:///d:/trae_projects/perkasa-erp-oss-bss/scripts/run-review-wave1c-sales-odp.ps1)

## Prasyarat

1. review DB `erp_isp_review` sudah ada
2. `Wave 1A` sudah pernah dijalankan agar `network_odp` punya minimal satu header ODP sample
3. `mysql.exe` tersedia dan path-nya diketahui
4. review DB boleh merupakan DB lama; runner akan menjalankan patch kompatibilitas `Wave 1C` lebih dulu

## Mode Eksekusi

### Mode Paling Aman untuk DB Review yang Sudah Ada

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1c-sales-odp.ps1 -Mode Wave1CSalesOdpOnly -MysqlPath "D:\xampp\mysql\bin\mysql.exe"
```

Jika MySQL memakai password:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1c-sales-odp.ps1 -Mode Wave1CSalesOdpOnly -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -Password "PASSWORD_ANDA"
```

### Mode Bootstrap Penuh

Gunakan hanya jika review DB baru atau kosong:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1c-sales-odp.ps1 -Mode Full -MysqlPath "D:\xampp\mysql\bin\mysql.exe"
```

## Urutan SQL Manual

Jika tidak memakai runner, jalankan urutan ini:

1. `database/xampp_review_patch_wave_1c_existing_review_db.sql`
2. `database/xampp_review_sample_import_wave_1c_sales.sql`
3. `database/xampp_review_transform_wave_1c_sales.sql`
4. `database/xampp_review_bootstrap_wave_1c_odp_ports.sql`
5. `database/xampp_review_wave_1c_sales_odp_review_queries.sql`
6. `database/xampp_review_wave_1c_sales_odp_assertions.sql`

## Hasil yang Diharapkan

### Coverage

- batch `SAMPLE-WEBPSB-COVERAGE-001` ada
- 2 row staging coverage masuk status `IMPORTED`
- final `sales_covered_areas` menerima:
  - `PSB-AREA-000001`
  - `PSB-AREA-000002`

### Marketing Activity

- batch `SAMPLE-WEBPSB-MARKETING-001` ada
- 1 row staging activity masuk status `IMPORTED`
- 2 row staging relasi area activity masuk status `IMPORTED`
- final `sales_marketing_activities` menerima row `legacy_id = MA-001`
- final `sales_marketing_activity_areas` menerima 2 relasi area

### ODP Ports

- untuk ODP `TRKL/07 - 16`, jumlah row `network_odp_ports` harus sama dengan `total_ports`
- seluruh port sample awal berada pada status `AVAILABLE`
- kolom `notes` menjelaskan bahwa bootstrap hanya memakai aggregate occupancy, bukan bukti port-by-port

## Catatan

- `Wave 1C` sengaja memisahkan `coverage/activity` dari `Ticket`, karena struktur finalnya berbeda dan sebagian memang `schema-new`
- bootstrap `network_odp_ports` memilih jalur aman: tidak menebak port mana yang `USED`
- jika nanti user ingin occupancy awal divisualkan, sebaiknya dilakukan di level header ODP atau catatan audit, bukan dengan menandai port tertentu secara palsu

## Next Step

Setelah runbook ini lulus, langkah paling natural adalah:

1. jalankan assertion query `Wave 1C`
2. lanjut ke batch import produksi kecil untuk coverage/activity bila sample sudah stabil
3. sinkronkan hasil ke rencana `Wave 2 production mini-batch`
