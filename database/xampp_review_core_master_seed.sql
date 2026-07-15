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
  ('PEMASARAN_PELAYANAN', 'Pemasaran dan Pelayanan'),
  ('FINANCE_HR', 'Finance & HR'),
  ('GENERAL_AFFAIR', 'General Affair'),
  ('TEKNIS_EKSPAN', 'Teknis & Ekspan'),
  ('OPERASIONAL', 'Operasional'),
  ('CS_ADMIN', 'CS & Admin CS (Legacy)'),
  ('NOC_TROUBLESHOOTS', 'NOC & Troubleshoots (Legacy)'),
  ('HR_GA', 'HR & GA (Legacy)'),
  ('WAREHOUSE', 'Warehouse (Legacy)')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO auth_roles (code, name)
VALUES
  ('OWNER', 'Owner'),
  ('SUPER_ADMIN', 'Super Admin'),
  ('ADMIN', 'Admin'),
  ('FINANCE', 'Finance'),
  ('HR', 'HR'),
  ('GA', 'GA'),
  ('PENJUALAN', 'Penjualan'),
  ('CS', 'Customer Service'),
  ('NOC', 'NOC'),
  ('TROUBLESHOOTS', 'Troubleshoots'),
  ('CREATOR_DIGITAL', 'Creator Digital'),
  ('DISMANTLE', 'Dismantle'),
  ('TEKNISI_PSB', 'Teknisi PSB'),
  ('ADMIN_CS', 'Admin CS (Legacy)'),
  ('MARKETING', 'Marketing (Legacy)'),
  ('SALES', 'Sales (Legacy)'),
  ('OPERATOR', 'Operator (Legacy)'),
  ('HR_GA', 'HR & GA (Legacy)'),
  ('WAREHOUSE', 'Warehouse (Legacy)')
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
