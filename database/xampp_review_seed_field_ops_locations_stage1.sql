USE erp_isp_review;

START TRANSACTION;

INSERT INTO inventory_locations (
  branch_id,
  parent_location_id,
  assigned_user_id,
  location_code,
  location_name,
  location_type,
  vehicle_identifier,
  address,
  status
)
SELECT
  b.id,
  NULL,
  NULL,
  CONCAT('WH-', UPPER(b.code)),
  CONCAT('Gudang ', b.name),
  'WAREHOUSE',
  NULL,
  b.address,
  'ACTIVE'
FROM org_branches b
LEFT JOIN inventory_locations l
  ON l.location_code = CONCAT('WH-', UPPER(b.code))
WHERE l.id IS NULL;

INSERT INTO inventory_locations (
  branch_id,
  parent_location_id,
  assigned_user_id,
  location_code,
  location_name,
  location_type,
  vehicle_identifier,
  address,
  status
)
SELECT
  au.branch_id,
  wh.id,
  au.id,
  CONCAT('TECH-', au.id),
  CONCAT('Teknisi - ', au.full_name),
  'TECHNICIAN',
  NULL,
  NULL,
  'ACTIVE'
FROM auth_users au
INNER JOIN auth_roles ar
  ON ar.id = au.role_id
LEFT JOIN inventory_locations wh
  ON wh.location_code = CONCAT('WH-', UPPER((SELECT b.code FROM org_branches b WHERE b.id = au.branch_id LIMIT 1)))
LEFT JOIN inventory_locations l
  ON l.location_code = CONCAT('TECH-', au.id)
WHERE au.status = 'ACTIVE'
  AND (
    UPPER(ar.code) LIKE 'TEKNISI%'
    OR UPPER(ar.name) LIKE '%TEKNISI%'
  )
  AND l.id IS NULL;

COMMIT;

