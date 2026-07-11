USE erp_isp_review;

SELECT 'Batch Wave 2 Production' AS review_section;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code IN (
  'PROD-WEBPSB-COVERAGE-001',
  'PROD-WEBPSB-MARKETING-001',
  'PROD-WEBPSB-ODP-001',
  'PROD-WEBPSB-TTSLA-001'
)
ORDER BY batch_code;

SELECT 'Staging Coverage Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(target_covered_area_id IS NOT NULL) AS linked_rows
FROM staging_legacy_sales_coverage_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-COVERAGE-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Staging Marketing Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(target_activity_id IS NOT NULL) AS linked_rows
FROM staging_legacy_marketing_activity_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Staging Marketing Area Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(target_activity_id IS NOT NULL AND target_covered_area_id IS NOT NULL) AS linked_rows
FROM staging_legacy_marketing_activity_area_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Staging ODP Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(target_odp_id IS NOT NULL) AS linked_rows
FROM staging_legacy_network_odp_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-ODP-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Staging TT SLA Production Summary' AS review_section;
SELECT COUNT(*) AS total_rows,
       SUM(import_status = 'IMPORTED') AS imported_rows,
       SUM(target_trouble_ticket_sla_id IS NOT NULL) AS linked_rows
FROM staging_legacy_support_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTSLA-001'
  ORDER BY id DESC
  LIMIT 1
)
  AND support_type = 'TROUBLE_TICKET_SLA';

SELECT 'Final Covered Areas Production Sample' AS review_section;
SELECT id, area_code, area_name, coverage_status, city, province
FROM sales_covered_areas
WHERE area_code LIKE 'PSB-PROD-AREA-%'
ORDER BY id
LIMIT 10;

SELECT 'Final Marketing Activities Production Sample' AS review_section;
SELECT id, activity_date, marketing_name, activity_type, source_system, legacy_id
FROM sales_marketing_activities
WHERE source_system = 'WEB_PSB'
  AND legacy_id LIKE 'PROD-MA-%'
ORDER BY id
LIMIT 10;

SELECT 'Final Marketing Activity Area Summary' AS review_section;
SELECT COUNT(*) AS total_rows
FROM sales_marketing_activity_areas maa
JOIN sales_marketing_activities ma
  ON ma.id = maa.activity_id
WHERE ma.source_system = 'WEB_PSB'
  AND ma.legacy_id LIKE 'PROD-MA-%';

SELECT 'Final ODP Production Summary' AS review_section;
SELECT COUNT(*) AS total_odp_rows,
       SUM(total_ports) AS total_ports_sum,
       SUM(active_ports) AS active_ports_sum
FROM network_odp
WHERE code IN (
  SELECT odp_code
  FROM staging_legacy_network_odp_records
  WHERE batch_id = (
    SELECT id
    FROM staging_import_batches
    WHERE batch_code = 'PROD-WEBPSB-ODP-001'
    ORDER BY id DESC
    LIMIT 1
  )
);

SELECT 'Final ODP Port Bootstrap Summary' AS review_section;
SELECT COUNT(*) AS total_port_rows
FROM network_odp_ports p
JOIN network_odp o
  ON o.id = p.odp_id
WHERE o.code IN (
  SELECT odp_code
  FROM staging_legacy_network_odp_records
  WHERE batch_id = (
    SELECT id
    FROM staging_import_batches
    WHERE batch_code = 'PROD-WEBPSB-ODP-001'
    ORDER BY id DESC
    LIMIT 1
  )
);

SELECT 'Final TT SLA Production Rows' AS review_section;
SELECT id, trouble_type, duration_days
FROM support_trouble_ticket_sla
WHERE trouble_type IN (
  SELECT trouble_type
  FROM staging_legacy_support_records
  WHERE batch_id = (
    SELECT id
    FROM staging_import_batches
    WHERE batch_code = 'PROD-WEBPSB-TTSLA-001'
    ORDER BY id DESC
    LIMIT 1
  )
    AND support_type = 'TROUBLE_TICKET_SLA'
)
ORDER BY id;
