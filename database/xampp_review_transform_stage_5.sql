INSERT IGNORE INTO network_odp (
  code,
  name,
  location_text,
  latitude,
  longitude,
  total_ports,
  active_ports
)
SELECT
  COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0'))),
  COALESCE(NULLIF(TRIM(so.odp_name), ''), NULLIF(TRIM(so.odp_code), ''), CONCAT('Legacy ODP ', so.id)),
  NULLIF(
    TRIM(
      CONCAT(
        COALESCE(NULLIF(TRIM(so.location_text), ''), ''),
        CASE WHEN NULLIF(TRIM(so.region_name), '') IS NOT NULL THEN CONCAT(' | Region: ', TRIM(so.region_name)) ELSE '' END,
        CASE WHEN NULLIF(TRIM(so.pole_status), '') IS NOT NULL THEN CONCAT(' | Pole: ', TRIM(so.pole_status)) ELSE '' END,
        CASE WHEN COALESCE(so.is_active, 1) = 0 THEN ' | Inactive' ELSE '' END
      )
    ),
    ''
  ),
  so.latitude,
  so.longitude,
  GREATEST(COALESCE(so.total_ports, 0), 0),
  LEAST(GREATEST(COALESCE(so.active_ports, 0), 0), GREATEST(COALESCE(so.total_ports, 0), 0))
FROM staging_legacy_network_odp_records so
WHERE so.batch_id = @batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_odp_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM network_odp o
    WHERE o.code = COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0')))
  );

UPDATE staging_legacy_network_odp_records so
JOIN network_odp o
  ON o.code = COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0')))
SET so.target_odp_id = o.id,
    so.import_status = 'IMPORTED',
    so.imported_at = COALESCE(so.imported_at, CURRENT_TIMESTAMP),
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.batch_id = @batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_odp_id IS NULL;

INSERT INTO network_odp_ports (
  odp_id,
  port_no,
  status
)
SELECT
  o.id,
  seq.port_no,
  'AVAILABLE'
FROM (
  SELECT DISTINCT target_odp_id AS odp_id
  FROM staging_legacy_network_odp_records
  WHERE batch_id = @batch_id
    AND target_odp_id IS NOT NULL
) linked
JOIN network_odp o
  ON o.id = linked.odp_id
JOIN (
  SELECT ones.n + 10*tens.n + 100*hundreds.n AS port_no
  FROM (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
    SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ) ones
  CROSS JOIN (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
    SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ) tens
  CROSS JOIN (
    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  ) hundreds
  WHERE ones.n + 10*tens.n + 100*hundreds.n BETWEEN 1 AND 512
) seq
  ON seq.port_no <= o.total_ports
LEFT JOIN network_odp_ports p
  ON p.odp_id = o.id
  AND p.port_no = seq.port_no
WHERE p.id IS NULL;
