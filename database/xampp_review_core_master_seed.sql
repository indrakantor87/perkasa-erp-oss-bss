-- Jalankan file ini setelah `xampp_review_schema.sql` dan `xampp_review_schema_phase_1_1.sql`
-- Seed ini menyiapkan master minimum agar mapping seed dan sample import bisa dijalankan dengan foreign key yang valid.

USE erp_isp_review;

INSERT INTO org_branches (code, name, address, phone)
VALUES
  ('PATI', 'Cabang Pati', NULL, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  address = VALUES(address),
  phone = VALUES(phone);

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

INSERT INTO sales_packages (code, name, service_type, speed_label, price, status)
VALUES
  ('HOME-10M', 'Home 10 Mbps', 'HOME', '10 Mbps', 0, 'ACTIVE'),
  ('HOME-20M', 'Home 20 Mbps', 'HOME', '20 Mbps', 0, 'ACTIVE'),
  ('HOME-30M', 'Home 30 Mbps', 'HOME', '30 Mbps', 0, 'ACTIVE'),
  ('DEDICATED-1-1', 'Dedicated 1:1', 'DEDICATED', 'Custom', 0, 'ACTIVE'),
  ('RESELLER-BASIC', 'Reseller Basic', 'RESELLER', NULL, 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  service_type = VALUES(service_type),
  speed_label = VALUES(speed_label),
  price = VALUES(price),
  status = VALUES(status);

INSERT INTO inventory_categories (code, name)
VALUES
  ('ROUTER', 'Router'),
  ('ONU', 'ONU'),
  ('KABEL', 'Kabel'),
  ('AKSESORIS', 'Aksesoris')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO inventory_units (code, name)
VALUES
  ('PCS', 'PCS'),
  ('UNIT', 'UNIT'),
  ('METER', 'METER')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);
