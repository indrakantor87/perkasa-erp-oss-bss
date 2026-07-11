USE erp_isp_review;

SELECT batch_code, import_scope, import_status, total_rows, valid_rows
FROM staging_import_batches
WHERE batch_code IN ('SAMPLE-WEBPSB-COVERAGE-001', 'SAMPLE-WEBPSB-MARKETING-001')
ORDER BY batch_code;

SELECT legacy_id, area_code, area_name, target_covered_area_id, import_status
FROM staging_legacy_sales_coverage_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-COVERAGE-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;

SELECT legacy_id, marketing_name, activity_type, target_activity_id, import_status
FROM staging_legacy_marketing_activity_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;

SELECT legacy_activity_id, legacy_area_id, sort_order, target_activity_id, target_covered_area_id, import_status
FROM staging_legacy_marketing_activity_area_records
WHERE batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-MARKETING-001'
  ORDER BY id DESC
  LIMIT 1
)
ORDER BY id;

SELECT id, area_code, area_name, coverage_status, city, province
FROM sales_covered_areas
WHERE area_code IN ('PSB-AREA-000001', 'PSB-AREA-000002')
ORDER BY id;

SELECT id, activity_date, marketing_name, activity_type, source_system, legacy_id
FROM sales_marketing_activities
WHERE source_system = 'WEB_PSB'
  AND legacy_id = 'MA-001'
ORDER BY id;

SELECT maa.id, maa.activity_id, maa.covered_area_id, maa.sort_order
FROM sales_marketing_activity_areas maa
JOIN sales_marketing_activities ma
  ON ma.id = maa.activity_id
WHERE ma.source_system = 'WEB_PSB'
  AND ma.legacy_id = 'MA-001'
ORDER BY maa.sort_order;

SELECT o.id, o.code, o.name, o.total_ports, COUNT(p.id) AS generated_ports
FROM network_odp o
LEFT JOIN network_odp_ports p
  ON p.odp_id = o.id
WHERE o.code = 'TRKL/07 - 16'
GROUP BY o.id, o.code, o.name, o.total_ports;

SELECT p.id, p.odp_id, p.port_no, p.port_status, p.notes
FROM network_odp_ports p
JOIN network_odp o
  ON o.id = p.odp_id
WHERE o.code = 'TRKL/07 - 16'
ORDER BY p.port_no
LIMIT 8;
