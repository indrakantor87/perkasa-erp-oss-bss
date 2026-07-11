-- Jalankan file ini setelah `xampp_review_master_mapping.sql`
-- Seed ini adalah baseline awal untuk review dan masih boleh disesuaikan saat ditemukan nilai legacy baru.

USE erp_isp_review;

INSERT INTO mapping_legacy_roles (source_system, legacy_role_value, target_role_code, notes)
VALUES
  ('WEB_PSB', 'ADMIN', 'ADMIN', 'normalisasi role admin umum'),
  ('WEB_PSB', 'SUPERADMIN', 'SUPER_ADMIN', 'normalisasi role legacy tingkat tertinggi'),
  ('WEB_PSB', 'ADMIN_CS', 'ADMIN_CS', 'role CS operasional'),
  ('WEB_PSB', 'admin_cs', 'ADMIN_CS', 'variasi lowercase dari ADMIN_CS'),
  ('WEB_PSB', 'NOC', 'NOC', 'role teknis NOC'),
  ('WEB_PSB', 'SALES', 'SALES', 'role penjualan'),
  ('WEB_PSB', 'MARKETING', 'SALES', 'marketing diarahkan ke domain sales'),
  ('WEB_PSB', 'HR', 'HR_GA', 'HR lama diarahkan ke HR_GA'),
  ('FINANCE', 'ADMIN', 'ADMIN', 'admin finance umum'),
  ('FINANCE', 'HR', 'HR_GA', 'HR finance diarahkan ke HR_GA'),
  ('FINANCE', 'GA', 'HR_GA', 'GA disatukan ke domain HR_GA'),
  ('FINANCE', 'FINANCE', 'FINANCE', 'role finance utama'),
  ('GA', 'admin', 'ADMIN', 'admin aplikasi GA'),
  ('GA', 'operator', 'WAREHOUSE', 'operator GA diarahkan ke warehouse')
ON DUPLICATE KEY UPDATE
  target_role_code = VALUES(target_role_code),
  notes = VALUES(notes),
  is_active = 1;

INSERT INTO mapping_legacy_divisions (source_system, legacy_division_value, target_division_code, notes)
VALUES
  ('WEB_PSB', 'CS', 'CS', 'kode divisi langsung'),
  ('WEB_PSB', 'Customer Service', 'CS', 'label panjang divisi CS'),
  ('WEB_PSB', 'ADM CS', 'CS', 'admin CS tetap masuk CS'),
  ('WEB_PSB', 'NOC', 'NOC', 'kode divisi langsung'),
  ('WEB_PSB', 'Penjualan', 'PENJUALAN', 'normalisasi nama divisi sales'),
  ('WEB_PSB', 'Sales', 'PENJUALAN', 'variasi bahasa Inggris'),
  ('WEB_PSB', 'Marketing', 'PENJUALAN', 'marketing masuk domain penjualan'),
  ('WEB_PSB', 'Creator Digital', 'CREATOR_DIGITAL', 'creator digital terpisah'),
  ('FINANCE', 'HR', 'HR_GA', 'HR disatukan ke HR_GA'),
  ('FINANCE', 'GA', 'HR_GA', 'GA disatukan ke HR_GA'),
  ('FINANCE', 'HR & GA', 'HR_GA', 'label gabungan'),
  ('FINANCE', 'Finance', 'FINANCE', 'divisi finance utama'),
  ('GA', 'Gudang', 'WAREHOUSE', 'gudang ke warehouse'),
  ('GA', 'Warehouse', 'WAREHOUSE', 'label Inggris')
ON DUPLICATE KEY UPDATE
  target_division_code = VALUES(target_division_code),
  notes = VALUES(notes),
  is_active = 1;

INSERT INTO mapping_legacy_branches (source_system, legacy_branch_value, target_branch_code, notes)
VALUES
  ('WEB_PSB', 'PATI', 'PATI', 'cabang utama pati'),
  ('WEB_PSB', 'Pati', 'PATI', 'variasi kapitalisasi'),
  ('FINANCE', 'PATI', 'PATI', 'cabang finance pati'),
  ('GA', 'PATI', 'PATI', 'cabang GA pati')
ON DUPLICATE KEY UPDATE
  target_branch_code = VALUES(target_branch_code),
  notes = VALUES(notes),
  is_active = 1;

INSERT INTO mapping_legacy_packages (source_system, legacy_package_name, target_package_code, target_service_type, notes)
VALUES
  ('WEB_PSB', 'Home 10 Mbps', 'HOME-10M', 'HOME', 'baseline paket home 10 Mbps'),
  ('WEB_PSB', 'HOME BASIC', 'HOME-10M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 10 Mbps'),
  ('WEB_PSB', 'Home Basic', 'HOME-10M', 'HOME', 'varian kapitalisasi paket legacy production Web PSB'),
  ('WEB_PSB', 'HOME LITE', 'HOME-10M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 10 Mbps'),
  ('WEB_PSB', 'Home Lite', 'HOME-10M', 'HOME', 'varian kapitalisasi paket legacy production Web PSB'),
  ('WEB_PSB', 'PROMO HOME LITE', 'HOME-10M', 'HOME', 'promo package production dipetakan sementara ke Home 10 Mbps'),
  ('WEB_PSB', 'HOME LITE ( BUNDLING 4BULAN + FREE 1BULAN)', 'HOME-10M', 'HOME', 'bundling package production dipetakan sementara ke Home 10 Mbps'),
  ('WEB_PSB', 'HOME LITE 1 THN', 'HOME-10M', 'HOME', 'package production dipetakan sementara ke Home 10 Mbps'),
  ('WEB_PSB', 'HOME MINI', 'HOME-10M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 10 Mbps'),
  ('WEB_PSB', 'HOME_MINI (PROMO 4+1)', 'HOME-10M', 'HOME', 'promo package production dipetakan sementara ke Home 10 Mbps'),
  ('WEB_PSB', 'HOME SMALL', 'HOME-10M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 10 Mbps'),
  ('WEB_PSB', 'Home Small', 'HOME-10M', 'HOME', 'varian kapitalisasi paket legacy production Web PSB'),
  ('WEB_PSB', 'Home 20 Mbps', 'HOME-20M', 'HOME', 'baseline paket home 20 Mbps'),
  ('WEB_PSB', 'HOME STREAM', 'HOME-20M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 20 Mbps'),
  ('WEB_PSB', 'Home Stream', 'HOME-20M', 'HOME', 'varian kapitalisasi paket legacy production Web PSB'),
  ('WEB_PSB', 'HOME ENTERTAIN', 'HOME-20M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 20 Mbps'),
  ('WEB_PSB', 'Home Entertain', 'HOME-20M', 'HOME', 'varian kapitalisasi paket legacy production Web PSB'),
  ('WEB_PSB', 'Home 30 Mbps', 'HOME-30M', 'HOME', 'baseline paket home 30 Mbps'),
  ('WEB_PSB', 'HOME ADVAN', 'HOME-30M', 'HOME', 'paket legacy production Web PSB diasumsikan setara Home 30 Mbps'),
  ('WEB_PSB', 'Dedicated 1:1', 'DEDICATED-1-1', 'DEDICATED', 'contoh layanan dedicated'),
  ('WEB_PSB', 'DEDICATED', 'DEDICATED-1-1', 'DEDICATED', 'paket dedicated production dipetakan ke dedicated baseline'),
  ('WEB_PSB', 'Reseller Basic', 'RESELLER-BASIC', 'RESELLER', 'contoh layanan reseller')
ON DUPLICATE KEY UPDATE
  target_package_code = VALUES(target_package_code),
  target_service_type = VALUES(target_service_type),
  notes = VALUES(notes),
  is_active = 1;

INSERT INTO mapping_legacy_inventory_categories (source_system, legacy_category_value, target_category_code, notes)
VALUES
  ('GA', 'Router', 'ROUTER', 'kategori perangkat router'),
  ('GA', 'ONU', 'ONU', 'kategori perangkat ONU'),
  ('GA', 'Kabel', 'KABEL', 'kategori kabel'),
  ('GA', 'Aksesoris', 'AKSESORIS', 'kategori aksesoris')
ON DUPLICATE KEY UPDATE
  target_category_code = VALUES(target_category_code),
  notes = VALUES(notes),
  is_active = 1;

INSERT INTO mapping_legacy_inventory_units (source_system, legacy_unit_value, target_unit_code, notes)
VALUES
  ('GA', 'pcs', 'PCS', 'satuan pieces lowercase'),
  ('GA', 'PCS', 'PCS', 'satuan pieces uppercase'),
  ('GA', 'unit', 'UNIT', 'satuan unit lowercase'),
  ('GA', 'UNIT', 'UNIT', 'satuan unit uppercase'),
  ('GA', 'meter', 'METER', 'satuan panjang'),
  ('GA', 'Meter', 'METER', 'variasi kapitalisasi meter')
ON DUPLICATE KEY UPDATE
  target_unit_code = VALUES(target_unit_code),
  notes = VALUES(notes),
  is_active = 1;

INSERT INTO mapping_legacy_status_values (source_system, domain_name, legacy_status_value, target_status_value, notes)
VALUES
  ('WEB_PSB', 'SUPPORT', 'OPEN', 'OPEN', 'status open support'),
  ('WEB_PSB', 'SUPPORT', 'CLOSE', 'CLOSED', 'normalisasi close lama'),
  ('WEB_PSB', 'SUPPORT', 'CLOSED', 'CLOSED', 'status closed support'),
  ('WEB_PSB', 'SUPPORT', 'Selesai', 'CLOSED', 'normalisasi bahasa Indonesia'),
  ('WEB_PSB', 'ORDER', 'NEW', 'REGISTERED', 'lead/order baru'),
  ('WEB_PSB', 'ORDER', 'REGISTERED', 'REGISTERED', 'status order standar'),
  ('WEB_PSB', 'ORDER', 'INSTALLED', 'INSTALLED', 'status instalasi selesai'),
  ('WEB_PSB', 'ORDER', 'ACTIVE', 'ACTIVE', 'status layanan aktif'),
  ('FINANCE', 'EMPLOYEE', 'ACTIVE', 'ACTIVE', 'pegawai aktif'),
  ('FINANCE', 'EMPLOYEE', 'INACTIVE', 'INACTIVE', 'pegawai nonaktif'),
  ('FINANCE', 'ATTENDANCE', 'PRESENT', 'PRESENT', 'hadir'),
  ('FINANCE', 'ATTENDANCE', 'SICK', 'SICK', 'sakit'),
  ('FINANCE', 'ATTENDANCE', 'PERMIT', 'PERMIT', 'izin'),
  ('FINANCE', 'ATTENDANCE', 'ALPHA', 'ALPHA', 'tanpa keterangan'),
  ('GA', 'INVENTORY', 'aktif', 'ACTIVE', 'status aktif lowercase'),
  ('GA', 'INVENTORY', 'nonaktif', 'INACTIVE', 'status nonaktif lowercase'),
  ('GA', 'MOVEMENT', 'IN', 'IN', 'barang masuk'),
  ('GA', 'MOVEMENT', 'OUT', 'OUT', 'barang keluar')
ON DUPLICATE KEY UPDATE
  target_status_value = VALUES(target_status_value),
  notes = VALUES(notes),
  is_active = 1;
