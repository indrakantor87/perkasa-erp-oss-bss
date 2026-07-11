-- Jalankan file ini setelah loader, transform, dan bootstrap Wave 2 production mini-batch selesai dieksekusi.
-- File ini bersifat read-only dan merangkum status PASS / BLOCKED untuk check utama.

USE erp_isp_review;

SELECT
  'production_batches_exist' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_import_batches
      WHERE batch_code IN (
        'PROD-WEBPSB-COVERAGE-001',
        'PROD-WEBPSB-MARKETING-001',
        'PROD-WEBPSB-ODP-001',
        'PROD-WEBPSB-TTSLA-001'
      )
    ) = 4 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Empat batch production Wave 2 harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'coverage_batch_row_count_65' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'PROD-WEBPSB-COVERAGE-001'
        AND total_rows = 65
        AND valid_rows = 65
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch coverage production harus memiliki total_rows=65 dan valid_rows=65' AS detail_text;

SELECT
  'marketing_batch_row_count_528' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'PROD-WEBPSB-MARKETING-001'
        AND total_rows = 528
        AND valid_rows = 528
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch marketing production harus memiliki total_rows=528 dan valid_rows=528' AS detail_text;

SELECT
  'odp_batch_row_count_7879' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'PROD-WEBPSB-ODP-001'
        AND total_rows = 7879
        AND valid_rows = 7879
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch ODP production harus memiliki total_rows=7879 dan valid_rows=7879' AS detail_text;

SELECT
  'ttsla_batch_row_count_4' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM staging_import_batches
      WHERE batch_code = 'PROD-WEBPSB-TTSLA-001'
        AND total_rows = 4
        AND valid_rows = 4
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch TT SLA production harus memiliki total_rows=4 dan valid_rows=4' AS detail_text;

SELECT
  'coverage_rows_imported_65' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_sales_coverage_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-COVERAGE-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_covered_area_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 65 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row staging coverage production harus terhubung ke final covered area' AS detail_text;

SELECT
  'marketing_rows_imported_528' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_marketing_activity_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-MARKETING-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_activity_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 528 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row staging marketing production harus terhubung ke final marketing activity' AS detail_text;

SELECT
  'marketing_area_rows_imported_474' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_marketing_activity_area_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-MARKETING-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_activity_id IS NOT NULL
        AND target_covered_area_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 474 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua relasi area marketing production harus terhubung ke final table' AS detail_text;

SELECT
  'odp_rows_imported_7879' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_network_odp_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-ODP-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND target_odp_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 7879 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row staging ODP production harus terhubung ke final network_odp' AS detail_text;

SELECT
  'ttsla_rows_imported_4' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = (
        SELECT id
        FROM staging_import_batches
        WHERE batch_code = 'PROD-WEBPSB-TTSLA-001'
        ORDER BY id DESC
        LIMIT 1
      )
        AND support_type = 'TROUBLE_TICKET_SLA'
        AND target_trouble_ticket_sla_id IS NOT NULL
        AND import_status = 'IMPORTED'
    ) = 4 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row staging TT SLA production harus terhubung ke final support_trouble_ticket_sla' AS detail_text;

SELECT
  'final_covered_area_count_65' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_covered_areas
      WHERE area_code LIKE 'PSB-PROD-AREA-%'
    ) = 65 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final sales_covered_areas harus berisi 65 area production Wave 2' AS detail_text;

SELECT
  'final_marketing_activity_count_528' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_marketing_activities
      WHERE source_system = 'WEB_PSB'
        AND legacy_id LIKE 'PROD-MA-%'
    ) = 528 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final sales_marketing_activities harus berisi 528 activity production Wave 2' AS detail_text;

SELECT
  'final_marketing_activity_area_count_474' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM sales_marketing_activity_areas maa
      JOIN sales_marketing_activities ma
        ON ma.id = maa.activity_id
      WHERE ma.source_system = 'WEB_PSB'
        AND ma.legacy_id LIKE 'PROD-MA-%'
    ) = 474 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final sales_marketing_activity_areas harus berisi 474 relasi area production Wave 2' AS detail_text;

SELECT
  'final_odp_header_count_846' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM network_odp
      WHERE code IN (
        SELECT DISTINCT COALESCE(NULLIF(TRIM(odp_code), ''), CONCAT('ODP-', LPAD(id, 6, '0')))
        FROM staging_legacy_network_odp_records
        WHERE batch_id = (
          SELECT id
          FROM staging_import_batches
          WHERE batch_code = 'PROD-WEBPSB-ODP-001'
          ORDER BY id DESC
          LIMIT 1
        )
      )
    ) = 846 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final network_odp harus berisi 846 header unik hasil deduplikasi production Wave 2' AS detail_text;

SELECT
  'final_odp_port_sum_6768' AS check_name,
  CASE
    WHEN (
      SELECT COALESCE(SUM(total_ports), 0)
      FROM network_odp
      WHERE code IN (
        SELECT DISTINCT COALESCE(NULLIF(TRIM(odp_code), ''), CONCAT('ODP-', LPAD(id, 6, '0')))
        FROM staging_legacy_network_odp_records
        WHERE batch_id = (
          SELECT id
          FROM staging_import_batches
          WHERE batch_code = 'PROD-WEBPSB-ODP-001'
          ORDER BY id DESC
          LIMIT 1
        )
      )
    ) = 6768 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Akumulasi total_ports final ODP production harus berjumlah 6768' AS detail_text;

SELECT
  'final_odp_active_port_sum_2312' AS check_name,
  CASE
    WHEN (
      SELECT COALESCE(SUM(active_ports), 0)
      FROM network_odp
      WHERE code IN (
        SELECT DISTINCT COALESCE(NULLIF(TRIM(odp_code), ''), CONCAT('ODP-', LPAD(id, 6, '0')))
        FROM staging_legacy_network_odp_records
        WHERE batch_id = (
          SELECT id
          FROM staging_import_batches
          WHERE batch_code = 'PROD-WEBPSB-ODP-001'
          ORDER BY id DESC
          LIMIT 1
        )
      )
    ) = 2312 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Akumulasi active_ports final ODP production harus berjumlah 2312' AS detail_text;

SELECT
  'final_odp_port_bootstrap_count_6768' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM network_odp_ports p
      JOIN network_odp o
        ON o.id = p.odp_id
      WHERE o.code IN (
        SELECT DISTINCT COALESCE(NULLIF(TRIM(odp_code), ''), CONCAT('ODP-', LPAD(id, 6, '0')))
        FROM staging_legacy_network_odp_records
        WHERE batch_id = (
          SELECT id
          FROM staging_import_batches
          WHERE batch_code = 'PROD-WEBPSB-ODP-001'
          ORDER BY id DESC
          LIMIT 1
        )
      )
    ) = 6768 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah row network_odp_ports untuk batch ODP production harus berjumlah 6768' AS detail_text;

SELECT
  'ttsla_type_set_complete' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM support_trouble_ticket_sla
      WHERE trouble_type IN ('EMERGENCY', 'MAJOR', 'MINOR', 'PREVENTIVE')
    ) = 4 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Final support_trouble_ticket_sla harus berisi empat tipe production utama' AS detail_text;
