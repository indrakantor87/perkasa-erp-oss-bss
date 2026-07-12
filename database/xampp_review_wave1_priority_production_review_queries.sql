-- Jalankan file ini setelah loader dan transform Wave 1 Priority production selesai dieksekusi.

USE erp_isp_review;

SET @priority_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-PRIORITY-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT
  b.id,
  b.batch_code,
  b.import_scope,
  b.import_status,
  b.total_rows,
  b.valid_rows,
  b.invalid_rows,
  b.duplicate_rows,
  b.source_file_name,
  b.created_at,
  b.updated_at
FROM staging_import_batches b
WHERE b.id = @priority_batch_id;

SELECT
  COALESCE(NULLIF(TRIM(sp.badge_color), ''), '(blank)') AS badge_color,
  sp.import_status,
  COUNT(*) AS total_rows
FROM staging_legacy_priority_records sp
WHERE sp.batch_id = @priority_batch_id
GROUP BY COALESCE(NULLIF(TRIM(sp.badge_color), ''), '(blank)'), sp.import_status
ORDER BY badge_color, sp.import_status;

SELECT
  mp.priority_name,
  mp.badge_color,
  COUNT(*) AS linked_rows
FROM staging_legacy_priority_records sp
JOIN master_priorities mp
  ON mp.id = sp.target_priority_id
WHERE sp.batch_id = @priority_batch_id
  AND sp.import_status = 'IMPORTED'
GROUP BY mp.priority_name, mp.badge_color
ORDER BY mp.priority_name;

SELECT
  sp.legacy_id,
  sp.priority_name,
  sp.badge_color,
  sp.import_status,
  sp.validation_notes
FROM staging_legacy_priority_records sp
WHERE sp.batch_id = @priority_batch_id
  AND sp.import_status = 'INVALID'
ORDER BY sp.id
LIMIT 20;
