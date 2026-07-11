-- Jalankan file ini setelah staging ODP header `Web PSB` dimuat ke `staging_legacy_network_odp_records`.
-- Script ini memindahkan header ODP ke tabel final `network_odp`.

USE erp_isp_review;

SET @odp_header_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-ODP-001'
  ORDER BY id DESC
  LIMIT 1
);

INSERT INTO network_odp (
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
  COALESCE(
    NULLIF(TRIM(so.odp_name), ''),
    NULLIF(TRIM(so.odp_code), ''),
    CONCAT('Legacy ODP ', LPAD(so.id, 6, '0'))
  ),
  NULLIF(
    TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(TRIM(so.location_text), ''),
        CASE
          WHEN NULLIF(TRIM(so.region_name), '') IS NOT NULL THEN CONCAT('Region: ', TRIM(so.region_name))
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(TRIM(so.pole_status), '') IS NOT NULL THEN CONCAT('Pole: ', TRIM(so.pole_status))
          ELSE NULL
        END,
        CASE
          WHEN COALESCE(so.is_active, 1) = 0 THEN 'Inactive'
          ELSE NULL
        END
      )
    ),
    ''
  ),
  so.latitude,
  so.longitude,
  GREATEST(COALESCE(so.total_ports, 0), 0),
  LEAST(
    GREATEST(COALESCE(so.active_ports, 0), 0),
    GREATEST(COALESCE(so.total_ports, 0), 0)
  )
FROM staging_legacy_network_odp_records so
WHERE so.batch_id = @odp_header_batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_odp_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM network_odp no
    WHERE no.code = COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0')))
  );

UPDATE staging_legacy_network_odp_records so
JOIN network_odp no
  ON no.code = COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0')))
SET so.target_odp_id = no.id,
    so.import_status = 'IMPORTED',
    so.imported_at = COALESCE(so.imported_at, CURRENT_TIMESTAMP),
    so.updated_at = CURRENT_TIMESTAMP
WHERE so.batch_id = @odp_header_batch_id
  AND so.import_status IN ('MAPPED', 'VALID')
  AND so.target_odp_id IS NULL;
