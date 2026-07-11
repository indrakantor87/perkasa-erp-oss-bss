-- Jalankan file ini setelah loader dan transform Wave 1 User production selesai dieksekusi.

USE erp_isp_review;

SET @user_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-USER-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT
  'user_production_batch_exists' AS check_name,
  CASE
    WHEN @user_batch_id IS NOT NULL THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch User production harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'user_production_no_invalid_rows' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_user_records
      WHERE batch_id = @user_batch_id
        AND import_status = 'INVALID'
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch User production tidak boleh menyisakan row INVALID' AS detail_text;

SELECT
  'user_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_user_records
      WHERE batch_id = @user_batch_id
        AND import_status = 'IMPORTED'
        AND target_user_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_user_records
      WHERE batch_id = @user_batch_id
        AND import_status <> 'INVALID'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row User production yang valid harus linked ke auth_users final' AS detail_text;

SELECT
  'user_final_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM auth_users au
      JOIN staging_legacy_user_records su
        ON su.target_user_id = au.id
      WHERE su.batch_id = @user_batch_id
        AND su.import_status = 'IMPORTED'
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_user_records
      WHERE batch_id = @user_batch_id
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah auth_users final harus sama dengan jumlah row User production yang berhasil diimpor' AS detail_text;
