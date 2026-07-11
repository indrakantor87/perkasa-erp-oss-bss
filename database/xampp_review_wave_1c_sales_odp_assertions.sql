-- Jalankan file ini setelah sample, transform, dan bootstrap Wave 1C selesai dieksekusi.
-- File ini bersifat read-only dan merangkum status PASS / BLOCKED untuk check utama.

USE erp_isp_review;

SELECT
  'coverage_batch_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-COVERAGE-001'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch coverage harus terbentuk' AS detail_text;

SELECT
  'marketing_batch_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch marketing activity harus terbentuk' AS detail_text;

SELECT
  'coverage_rows_imported' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_sales_coverage_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'SAMPLE-WEBPSB-COVERAGE-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_covered_area_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Dua row staging coverage harus terhubung ke sales_covered_areas final' AS detail_text;

SELECT
  'marketing_activity_imported' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_marketing_activity_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND legacy_id = 'MA-001'
        AND target_activity_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Row marketing activity MA-001 harus terhubung ke final table' AS detail_text;

SELECT
  'marketing_activity_area_rows_imported' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_marketing_activity_area_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_activity_id IS NOT NULL
        AND target_covered_area_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Dua relasi area marketing activity harus masuk ke final table' AS detail_text;

SELECT
  'final_covered_area_count_2' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_covered_areas
      WHERE area_code IN ('PSB-AREA-000001', 'PSB-AREA-000002')
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final covered areas harus berisi dua area sample Wave 1C' AS detail_text;

SELECT
  'final_marketing_activity_exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM sales_marketing_activities
      WHERE source_system = 'WEB_PSB'
        AND legacy_id = 'MA-001'
        AND marketing_name = 'Anne'
        AND activity_type = 'Door to Door'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final marketing activity MA-001 harus terbentuk' AS detail_text;

SELECT
  'final_marketing_activity_area_count_2' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_marketing_activity_areas maa
      JOIN sales_marketing_activities ma
        ON ma.id = maa.activity_id
      WHERE ma.source_system = 'WEB_PSB'
        AND ma.legacy_id = 'MA-001'
    ) = 2 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final sales_marketing_activity_areas harus berisi dua relasi area untuk MA-001' AS detail_text;

SELECT
  'final_odp_port_count_matches_header' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM network_odp o
      LEFT JOIN network_odp_ports p
        ON p.odp_id = o.id
      WHERE o.code = 'TRKL/07 - 16'
      GROUP BY o.id, o.total_ports
      HAVING COUNT(p.id) = o.total_ports
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah row network_odp_ports harus sama dengan total_ports header ODP sample' AS detail_text;

SELECT
  'final_odp_ports_all_available' AS check_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM network_odp_ports p
      JOIN network_odp o
        ON o.id = p.odp_id
      WHERE o.code = 'TRKL/07 - 16'
        AND p.port_status <> 'AVAILABLE'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Bootstrap ODP ports sample harus menghasilkan seluruh slot awal berstatus AVAILABLE' AS detail_text;
