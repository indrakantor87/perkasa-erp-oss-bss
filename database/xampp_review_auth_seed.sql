-- Jalankan file ini setelah `xampp_review_core_master_seed.sql`
-- Seed ini menyiapkan user review minimum agar auth internal bisa diuji end-to-end di web baru.

USE erp_isp_review;

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
  (SELECT id FROM org_branches WHERE code = 'PATI' LIMIT 1),
  NULL,
  (SELECT id FROM auth_roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
  'Super Admin Perkasa',
  'admin.perkasa',
  'admin.perkasa@perkasa.local',
  'sha256:07a2028abeb1c00b797fe96d3bf0edb759fa32421e30683fa2885a4e376ac4d2',
  '081200000001',
  'ACTIVE'
UNION ALL
SELECT
  (SELECT id FROM org_branches WHERE code = 'PATI' LIMIT 1),
  (SELECT id FROM org_divisions WHERE code = 'CS' LIMIT 1),
  (SELECT id FROM auth_roles WHERE code = 'ADMIN_CS' LIMIT 1),
  'Admin CS Review',
  'cs.review',
  'cs.review@perkasa.local',
  'sha256:cb311cd417c54e871f0f4ce1fd00e6869990734152cd302885812c5695796a1a',
  '081200000002',
  'ACTIVE'
UNION ALL
SELECT
  (SELECT id FROM org_branches WHERE code = 'PATI' LIMIT 1),
  (SELECT id FROM org_divisions WHERE code = 'NOC' LIMIT 1),
  (SELECT id FROM auth_roles WHERE code = 'OPERATOR' LIMIT 1),
  'Operator Support',
  'support.ops',
  'support.ops@perkasa.local',
  'sha256:39425dd8b7bed86b73cd928c89303023ef4080385130ce65b867a47ea3f5e669',
  '081200000003',
  'ACTIVE'
ON DUPLICATE KEY UPDATE
  branch_id = VALUES(branch_id),
  division_id = VALUES(division_id),
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  phone = VALUES(phone),
  status = VALUES(status);
