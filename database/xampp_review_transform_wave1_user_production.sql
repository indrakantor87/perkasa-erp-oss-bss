-- Jalankan file ini setelah loader Wave 1 User production selesai dieksekusi.
-- Transform ini menormalkan role/division legacy Web PSB ke auth master ERP.

USE erp_isp_review;

SET @user_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-USER-001'
  ORDER BY id DESC
  LIMIT 1
);

INSERT INTO org_divisions (code, name)
VALUES
  ('PENJUALAN', 'Penjualan'),
  ('CS', 'Customer Service'),
  ('CS_ADMIN', 'CS & Admin CS'),
  ('NOC', 'NOC'),
  ('NOC_TROUBLESHOOTS', 'NOC & Troubleshoots'),
  ('CREATOR_DIGITAL', 'Creator Digital'),
  ('HR_GA', 'HR & GA'),
  ('FINANCE', 'Finance'),
  ('WAREHOUSE', 'Warehouse')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO auth_roles (code, name)
VALUES
  ('SUPER_ADMIN', 'Super Admin'),
  ('OPERATOR', 'Operator'),
  ('ADMIN', 'Admin'),
  ('CS', 'Customer Service'),
  ('ADMIN_CS', 'Admin CS'),
  ('NOC', 'NOC'),
  ('TROUBLESHOOTS', 'Troubleshoots'),
  ('MARKETING', 'Marketing'),
  ('CREATOR_DIGITAL', 'Creator Digital'),
  ('DISMANTLE', 'Dismantle'),
  ('SALES', 'Sales'),
  ('HR_GA', 'HR & GA'),
  ('FINANCE', 'Finance'),
  ('WAREHOUSE', 'Warehouse')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- 1) Normalisasi awal role/division dan validasi minimum source.
UPDATE staging_legacy_user_records su
SET su.normalized_key = LOWER(NULLIF(TRIM(su.username), '')),
    su.mapped_role_code = CASE UPPER(TRIM(COALESCE(su.legacy_role, '')))
      WHEN 'ADMIN' THEN 'ADMIN'
      WHEN 'MARKETING' THEN 'MARKETING'
      WHEN 'CS' THEN 'CS'
      WHEN 'NOC' THEN 'NOC'
      WHEN 'TROUBLESHOOTS' THEN 'TROUBLESHOOTS'
      WHEN 'CREATOR_DIGITAL' THEN 'CREATOR_DIGITAL'
      WHEN 'DISMANTLE' THEN 'DISMANTLE'
      ELSE NULL
    END,
    su.mapped_division_code = CASE
      WHEN UPPER(TRIM(COALESCE(su.legacy_division, ''))) = 'PENJUALAN' THEN 'PENJUALAN'
      WHEN UPPER(TRIM(COALESCE(su.legacy_division, ''))) IN ('CS_ADMIN', 'ADMIN CS', 'ADM CS') THEN 'CS_ADMIN'
      WHEN UPPER(TRIM(COALESCE(su.legacy_division, ''))) IN ('NOC_TROUBLESHOOTS', 'NOC & TROUBLESHOOTS', 'NOC_TROUBLESHOOTS') THEN 'NOC_TROUBLESHOOTS'
      WHEN UPPER(TRIM(COALESCE(su.legacy_division, ''))) = 'CREATOR_DIGITAL' THEN 'CREATOR_DIGITAL'
      WHEN NULLIF(TRIM(COALESCE(su.legacy_division, '')), '') IS NULL THEN CASE UPPER(TRIM(COALESCE(su.legacy_role, '')))
        WHEN 'MARKETING' THEN 'PENJUALAN'
        WHEN 'CS' THEN 'CS_ADMIN'
        WHEN 'DISMANTLE' THEN 'CS_ADMIN'
        WHEN 'NOC' THEN 'NOC_TROUBLESHOOTS'
        WHEN 'TROUBLESHOOTS' THEN 'NOC_TROUBLESHOOTS'
        WHEN 'CREATOR_DIGITAL' THEN 'CREATOR_DIGITAL'
        ELSE NULL
      END
      ELSE NULL
    END,
    su.validation_notes = NULL,
    su.import_status = CASE
      WHEN NULLIF(TRIM(su.username), '') IS NULL THEN 'INVALID'
      WHEN CASE UPPER(TRIM(COALESCE(su.legacy_role, '')))
        WHEN 'ADMIN' THEN 'ADMIN'
        WHEN 'MARKETING' THEN 'MARKETING'
        WHEN 'CS' THEN 'CS'
        WHEN 'NOC' THEN 'NOC'
        WHEN 'TROUBLESHOOTS' THEN 'TROUBLESHOOTS'
        WHEN 'CREATOR_DIGITAL' THEN 'CREATOR_DIGITAL'
        WHEN 'DISMANTLE' THEN 'DISMANTLE'
        ELSE NULL
      END IS NULL THEN 'INVALID'
      ELSE 'MAPPED'
    END,
    su.updated_at = CURRENT_TIMESTAMP
WHERE su.batch_id = @user_batch_id;

UPDATE staging_legacy_user_records su
SET su.validation_notes = TRIM(CONCAT_WS(' | ', NULLIF(su.validation_notes, ''), 'Username kosong pada source User production.')),
    su.updated_at = CURRENT_TIMESTAMP
WHERE su.batch_id = @user_batch_id
  AND NULLIF(TRIM(su.username), '') IS NULL;

UPDATE staging_legacy_user_records su
SET su.validation_notes = TRIM(CONCAT_WS(' | ', NULLIF(su.validation_notes, ''), CONCAT('Role legacy tidak dikenali: ', COALESCE(NULLIF(TRIM(su.legacy_role), ''), '(blank)')))),
    su.updated_at = CURRENT_TIMESTAMP
WHERE su.batch_id = @user_batch_id
  AND su.import_status = 'INVALID'
  AND su.mapped_role_code IS NULL;

UPDATE staging_legacy_user_records su
SET su.validation_notes = TRIM(CONCAT_WS(' | ', NULLIF(su.validation_notes, ''), 'Division source kosong; division final dibiarkan NULL karena role ADMIN tidak bisa dipastikan lane operasionalnya.')),
    su.updated_at = CURRENT_TIMESTAMP
WHERE su.batch_id = @user_batch_id
  AND su.import_status = 'MAPPED'
  AND su.mapped_role_code = 'ADMIN'
  AND su.mapped_division_code IS NULL;

-- 2) Tandai duplikat username dalam batch, sisakan row pertama saja.
UPDATE staging_legacy_user_records su
JOIN (
  SELECT normalized_key, MIN(id) AS keeper_id, COUNT(*) AS total_rows
  FROM staging_legacy_user_records
  WHERE batch_id = @user_batch_id
    AND import_status = 'MAPPED'
    AND normalized_key IS NOT NULL
  GROUP BY normalized_key
  HAVING COUNT(*) > 1
) dup
  ON dup.normalized_key = su.normalized_key
SET su.import_status = CASE
      WHEN su.id = dup.keeper_id THEN su.import_status
      ELSE 'INVALID'
    END,
    su.validation_notes = CASE
      WHEN su.id = dup.keeper_id THEN su.validation_notes
      ELSE TRIM(CONCAT_WS(' | ', NULLIF(su.validation_notes, ''), 'Duplikat username dalam batch User production.'))
    END,
    su.updated_at = CURRENT_TIMESTAMP
WHERE su.batch_id = @user_batch_id;

-- 3) Import user yang sudah termapping ke auth_users.
INSERT INTO auth_users (
  branch_id,
  division_id,
  role_id,
  full_name,
  username,
  email,
  password_hash,
  phone,
  status
)
SELECT
  NULL,
  od.id,
  ar.id,
  COALESCE(NULLIF(TRIM(su.full_name), ''), CONCAT('Legacy User ', su.id)),
  LOWER(TRIM(su.username)),
  CASE
    WHEN NULLIF(LOWER(TRIM(COALESCE(su.email, ''))), '') IS NULL THEN NULL
    WHEN EXISTS (
      SELECT 1
      FROM auth_users au
      WHERE LOWER(COALESCE(au.email, '')) = LOWER(TRIM(su.email))
        AND LOWER(au.username) <> LOWER(TRIM(su.username))
    ) THEN NULL
    WHEN EXISTS (
      SELECT 1
      FROM staging_legacy_user_records su_dup
      WHERE su_dup.batch_id = @user_batch_id
        AND su_dup.id <> su.id
        AND LOWER(COALESCE(su_dup.email, '')) = LOWER(TRIM(su.email))
    ) THEN NULL
    ELSE LOWER(TRIM(su.email))
  END,
  CONCAT('sha256:', SHA2(CONCAT('legacy-import|', LOWER(TRIM(su.username))), 256)),
  NULLIF(TRIM(su.phone), ''),
  'ACTIVE'
FROM staging_legacy_user_records su
JOIN auth_roles ar
  ON ar.code = su.mapped_role_code
LEFT JOIN org_divisions od
  ON od.code = su.mapped_division_code
WHERE su.batch_id = @user_batch_id
  AND su.import_status = 'MAPPED'
  AND su.target_user_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth_users au
    WHERE LOWER(au.username) = LOWER(TRIM(su.username))
  );

UPDATE staging_legacy_user_records su
JOIN auth_users au
  ON LOWER(au.username) = LOWER(TRIM(su.username))
SET su.target_user_id = au.id,
    su.import_status = 'IMPORTED',
    su.imported_at = COALESCE(su.imported_at, CURRENT_TIMESTAMP),
    su.updated_at = CURRENT_TIMESTAMP
WHERE su.batch_id = @user_batch_id
  AND su.import_status = 'MAPPED'
  AND su.target_user_id IS NULL;

INSERT INTO auth_user_audit_logs (
  auth_user_id,
  action_type,
  actor_name,
  target_username,
  detail_text
)
SELECT
  su.target_user_id,
  'CREATE',
  'Import Pipeline',
  au.username,
  CONCAT(
    'Legacy user production ',
    COALESCE(NULLIF(TRIM(su.legacy_id), ''), CONCAT('#', su.id)),
    ' berhasil dihubungkan ke auth master.'
  )
FROM staging_legacy_user_records su
JOIN auth_users au
  ON au.id = su.target_user_id
WHERE su.batch_id = @user_batch_id
  AND su.import_status = 'IMPORTED'
  AND su.target_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth_user_audit_logs log
    WHERE log.auth_user_id = su.target_user_id
      AND log.action_type = 'CREATE'
      AND log.target_username = au.username
      AND log.detail_text = CONCAT(
        'Legacy user production ',
        COALESCE(NULLIF(TRIM(su.legacy_id), ''), CONCAT('#', su.id)),
        ' berhasil dihubungkan ke auth master.'
      )
  );

UPDATE staging_import_batches b
SET b.total_rows = (
      SELECT COUNT(*)
      FROM staging_legacy_user_records su
      WHERE su.batch_id = @user_batch_id
    ),
    b.valid_rows = (
      SELECT COUNT(*)
      FROM staging_legacy_user_records su
      WHERE su.batch_id = @user_batch_id
        AND su.import_status = 'IMPORTED'
    ),
    b.invalid_rows = (
      SELECT COUNT(*)
      FROM staging_legacy_user_records su
      WHERE su.batch_id = @user_batch_id
        AND su.import_status = 'INVALID'
    ),
    b.duplicate_rows = (
      SELECT COUNT(*)
      FROM staging_legacy_user_records su
      WHERE su.batch_id = @user_batch_id
        AND COALESCE(su.validation_notes, '') LIKE '%Duplikat username dalam batch User production.%'
    ),
    b.import_status = CASE
      WHEN (
        SELECT COUNT(*)
        FROM staging_legacy_user_records su
        WHERE su.batch_id = @user_batch_id
          AND su.import_status IN ('PENDING', 'MAPPED', 'VALID')
      ) = 0 THEN 'IMPORTED'
      ELSE 'MAPPED'
    END,
    b.notes = 'Wave 1 User production Web PSB dipetakan ke auth_roles, org_divisions, dan auth_users.',
    b.updated_at = CURRENT_TIMESTAMP
WHERE b.id = @user_batch_id;
