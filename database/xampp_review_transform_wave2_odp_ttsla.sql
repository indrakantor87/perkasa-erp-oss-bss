-- Jalankan file ini setelah loader JSON production `Wave 2` dimuat ke staging review DB.
-- Transform ini khusus untuk batch production `psb_odp` dan `TroubleTicketSla` dari `Web PSB`.

USE erp_isp_review;

SET @odp_header_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-ODP-001'
  ORDER BY id DESC
  LIMIT 1
);

SET @support_ttsla_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTSLA-001'
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
  dedup.odp_code,
  COALESCE(dedup.odp_name, dedup.odp_code),
  dedup.location_text,
  dedup.latitude,
  dedup.longitude,
  dedup.total_ports,
  dedup.active_ports
FROM (
  SELECT
    COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0'))) AS odp_code,
    MAX(COALESCE(NULLIF(TRIM(so.odp_name), ''), COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('Legacy ODP ', so.id)))) AS odp_name,
    MAX(NULLIF(TRIM(so.location_text), '')) AS location_text,
    MAX(so.latitude) AS latitude,
    MAX(so.longitude) AS longitude,
    MAX(GREATEST(COALESCE(so.total_ports, 0), 0)) AS total_ports,
    LEAST(
      MAX(GREATEST(COALESCE(so.active_ports, 0), 0)),
      MAX(GREATEST(COALESCE(so.total_ports, 0), 0))
    ) AS active_ports
  FROM staging_legacy_network_odp_records so
  WHERE so.batch_id = @odp_header_batch_id
    AND so.import_status IN ('MAPPED', 'VALID')
    AND so.target_odp_id IS NULL
  GROUP BY COALESCE(NULLIF(TRIM(so.odp_code), ''), CONCAT('ODP-', LPAD(so.id, 6, '0')))
) dedup
WHERE NOT EXISTS (
    SELECT 1
    FROM network_odp no
    WHERE no.code = dedup.odp_code
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

INSERT INTO support_trouble_ticket_sla (
  trouble_type,
  duration_days
)
SELECT
  COALESCE(NULLIF(TRIM(ss.trouble_type), ''), CONCAT('Legacy Trouble Type ', ss.id)),
  GREATEST(
    COALESCE(
      NULLIF(
        REGEXP_REPLACE(
          JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.durationDays')),
          '[^0-9]',
          ''
        ),
        ''
      ) + 0,
      1
    ),
    1
  )
FROM staging_legacy_support_records ss
WHERE ss.batch_id = @support_ttsla_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_SLA'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_sla_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_ticket_sla sla
    WHERE sla.trouble_type = COALESCE(NULLIF(TRIM(ss.trouble_type), ''), CONCAT('Legacy Trouble Type ', ss.id))
  );

UPDATE staging_legacy_support_records ss
JOIN support_trouble_ticket_sla sla
  ON sla.trouble_type = COALESCE(NULLIF(TRIM(ss.trouble_type), ''), CONCAT('Legacy Trouble Type ', ss.id))
SET ss.target_trouble_ticket_sla_id = sla.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @support_ttsla_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_SLA'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_sla_id IS NULL;
