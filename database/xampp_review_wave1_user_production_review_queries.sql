-- Jalankan file ini setelah loader dan transform Wave 1 User production selesai dieksekusi.

USE erp_isp_review;

SET @user_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-USER-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Batch Wave 1 User Production' AS review_section;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows
FROM staging_import_batches
WHERE id = @user_batch_id;

SELECT 'Staging User Production Summary' AS review_section;
SELECT
  COALESCE(NULLIF(TRIM(legacy_role), ''), '(blank)') AS legacy_role,
  COALESCE(NULLIF(TRIM(legacy_division), ''), '(blank)') AS legacy_division,
  COALESCE(mapped_role_code, '(null)') AS mapped_role_code,
  COALESCE(mapped_division_code, '(null)') AS mapped_division_code,
  import_status,
  COUNT(*) AS total_rows
FROM staging_legacy_user_records
WHERE batch_id = @user_batch_id
GROUP BY
  COALESCE(NULLIF(TRIM(legacy_role), ''), '(blank)'),
  COALESCE(NULLIF(TRIM(legacy_division), ''), '(blank)'),
  COALESCE(mapped_role_code, '(null)'),
  COALESCE(mapped_division_code, '(null)'),
  import_status
ORDER BY total_rows DESC, legacy_role, legacy_division;

SELECT 'Pending User Production Rows' AS review_section;
SELECT
  legacy_id,
  legacy_role,
  legacy_division,
  username,
  mapped_role_code,
  mapped_division_code,
  import_status,
  validation_notes
FROM staging_legacy_user_records
WHERE batch_id = @user_batch_id
  AND import_status <> 'IMPORTED'
ORDER BY id
LIMIT 50;

SELECT 'Final User Production Summary' AS review_section;
SELECT
  COUNT(*) AS total_rows,
  SUM(ar.code = 'ADMIN') AS admin_rows,
  SUM(ar.code = 'MARKETING') AS marketing_rows,
  SUM(ar.code = 'CS') AS cs_rows,
  SUM(ar.code = 'NOC') AS noc_rows,
  SUM(ar.code = 'TROUBLESHOOTS') AS troubleshoots_rows,
  SUM(ar.code = 'CREATOR_DIGITAL') AS creator_rows,
  SUM(ar.code = 'DISMANTLE') AS dismantle_rows
FROM auth_users au
JOIN auth_roles ar
  ON ar.id = au.role_id
WHERE au.id IN (
  SELECT target_user_id
  FROM staging_legacy_user_records
  WHERE batch_id = @user_batch_id
    AND import_status = 'IMPORTED'
    AND target_user_id IS NOT NULL
);

SELECT 'Final User Production Sample' AS review_section;
SELECT
  au.id,
  au.username,
  au.full_name,
  ar.code AS role_code,
  od.code AS division_code,
  au.status
FROM auth_users au
JOIN auth_roles ar
  ON ar.id = au.role_id
LEFT JOIN org_divisions od
  ON od.id = au.division_id
WHERE au.id IN (
  SELECT target_user_id
  FROM staging_legacy_user_records
  WHERE batch_id = @user_batch_id
    AND import_status = 'IMPORTED'
    AND target_user_id IS NOT NULL
)
ORDER BY au.id DESC
LIMIT 30;
