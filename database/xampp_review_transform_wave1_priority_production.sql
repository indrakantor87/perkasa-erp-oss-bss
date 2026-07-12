-- Jalankan file ini setelah loader Wave 1 Priority production selesai dieksekusi.

USE erp_isp_review;

SET @priority_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-PRIORITY-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Rapikan nilai name dan color.
UPDATE staging_legacy_priority_records sp
SET sp.priority_name = TRIM(sp.priority_name),
    sp.badge_color = TRIM(sp.badge_color),
    sp.updated_at = CURRENT_TIMESTAMP
WHERE sp.batch_id = @priority_batch_id
  AND sp.import_status IN ('MAPPED', 'VALID');

-- 2) Tandai invalid bila name atau color kosong.
UPDATE staging_legacy_priority_records sp
SET sp.import_status = 'INVALID',
    sp.validation_notes = TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(sp.validation_notes, ''),
        CASE
          WHEN NULLIF(TRIM(sp.priority_name), '') IS NULL THEN 'priority_name kosong pada staging Priority production.'
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(TRIM(sp.badge_color), '') IS NULL THEN 'badge_color kosong pada staging Priority production.'
          ELSE NULL
        END
      )
    ),
    sp.updated_at = CURRENT_TIMESTAMP
WHERE sp.batch_id = @priority_batch_id
  AND sp.import_status IN ('MAPPED', 'VALID')
  AND (
    NULLIF(TRIM(sp.priority_name), '') IS NULL
    OR NULLIF(TRIM(sp.badge_color), '') IS NULL
  );

-- 3) Insert master priority secara idempotent.
INSERT INTO master_priorities (
  priority_name,
  badge_color
)
SELECT
  src.priority_name,
  src.badge_color
FROM (
  SELECT
    TRIM(sp.priority_name) AS priority_name,
    TRIM(sp.badge_color) AS badge_color,
    MIN(sp.id) AS seed_id
  FROM staging_legacy_priority_records sp
  WHERE sp.batch_id = @priority_batch_id
    AND sp.import_status IN ('MAPPED', 'VALID')
  GROUP BY TRIM(sp.priority_name), TRIM(sp.badge_color)
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM master_priorities mp
  WHERE mp.priority_name = src.priority_name
);

-- 4) Sinkronkan warna bila nama prioritas sudah ada tetapi warna source berubah.
UPDATE master_priorities mp
JOIN (
  SELECT
    TRIM(sp.priority_name) AS priority_name,
    TRIM(sp.badge_color) AS badge_color,
    MIN(sp.id) AS seed_id
  FROM staging_legacy_priority_records sp
  WHERE sp.batch_id = @priority_batch_id
    AND sp.import_status IN ('MAPPED', 'VALID')
  GROUP BY TRIM(sp.priority_name), TRIM(sp.badge_color)
) src
  ON mp.priority_name = src.priority_name
SET mp.badge_color = src.badge_color,
    mp.updated_at = CURRENT_TIMESTAMP
WHERE mp.badge_color <> src.badge_color;

-- 5) Link row staging ke final.
UPDATE staging_legacy_priority_records sp
JOIN master_priorities mp
  ON mp.priority_name = TRIM(sp.priority_name)
SET sp.target_priority_id = mp.id,
    sp.import_status = 'IMPORTED',
    sp.imported_at = COALESCE(sp.imported_at, CURRENT_TIMESTAMP),
    sp.updated_at = CURRENT_TIMESTAMP
WHERE sp.batch_id = @priority_batch_id
  AND sp.import_status IN ('MAPPED', 'VALID');
