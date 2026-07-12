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
  'priority_production_batch_exists' AS check_name,
  CASE
    WHEN @priority_batch_id IS NOT NULL THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch Priority production harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'priority_production_no_invalid_rows' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_priority_records
      WHERE batch_id = @priority_batch_id
        AND import_status = 'INVALID'
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch Priority production tidak boleh menyisakan row INVALID' AS detail_text;

SELECT
  'priority_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_priority_records
      WHERE batch_id = @priority_batch_id
        AND import_status = 'IMPORTED'
        AND target_priority_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_priority_records
      WHERE batch_id = @priority_batch_id
        AND import_status <> 'INVALID'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row Priority production yang valid harus linked ke master_priorities final' AS detail_text;

SELECT
  'priority_final_count_matches_staging_linkage' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_priority_records sp
      JOIN master_priorities mp
        ON mp.id = sp.target_priority_id
       AND mp.priority_name = TRIM(sp.priority_name)
      WHERE sp.batch_id = @priority_batch_id
        AND sp.import_status = 'IMPORTED'
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_priority_records
      WHERE batch_id = @priority_batch_id
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah linkage final Priority harus sama dengan jumlah row staging imported' AS detail_text;
