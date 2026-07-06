-- Jalankan file ini setelah schema review, patch phase 1.1, dan staging import.
-- Tabel ini dipakai untuk menyatukan nilai legacy dari tiga sistem lama ke master tunggal project baru.

USE erp_isp_review;

CREATE TABLE IF NOT EXISTS mapping_legacy_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('WEB_PSB','FINANCE','GA') NOT NULL,
  legacy_role_value VARCHAR(100) NOT NULL,
  target_role_code VARCHAR(50) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_roles (source_system, legacy_role_value),
  CONSTRAINT fk_mapping_legacy_roles_target FOREIGN KEY (target_role_code) REFERENCES auth_roles(code)
);

CREATE TABLE IF NOT EXISTS mapping_legacy_divisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('WEB_PSB','FINANCE','GA') NOT NULL,
  legacy_division_value VARCHAR(120) NOT NULL,
  target_division_code VARCHAR(30) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_divisions (source_system, legacy_division_value),
  CONSTRAINT fk_mapping_legacy_divisions_target FOREIGN KEY (target_division_code) REFERENCES org_divisions(code)
);

CREATE TABLE IF NOT EXISTS mapping_legacy_branches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('WEB_PSB','FINANCE','GA') NOT NULL,
  legacy_branch_value VARCHAR(120) NOT NULL,
  target_branch_code VARCHAR(30) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_branches (source_system, legacy_branch_value),
  CONSTRAINT fk_mapping_legacy_branches_target FOREIGN KEY (target_branch_code) REFERENCES org_branches(code)
);

CREATE TABLE IF NOT EXISTS mapping_legacy_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_package_name VARCHAR(150) NOT NULL,
  target_package_code VARCHAR(50) NOT NULL,
  target_service_type ENUM('HOME','DEDICATED','RESELLER') NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_packages (source_system, legacy_package_name),
  CONSTRAINT fk_mapping_legacy_packages_target FOREIGN KEY (target_package_code) REFERENCES sales_packages(code)
);

CREATE TABLE IF NOT EXISTS mapping_legacy_inventory_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('GA') NOT NULL DEFAULT 'GA',
  legacy_category_value VARCHAR(120) NOT NULL,
  target_category_code VARCHAR(50) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_inventory_categories (source_system, legacy_category_value),
  CONSTRAINT fk_mapping_legacy_inventory_categories_target FOREIGN KEY (target_category_code) REFERENCES inventory_categories(code)
);

CREATE TABLE IF NOT EXISTS mapping_legacy_inventory_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('GA') NOT NULL DEFAULT 'GA',
  legacy_unit_value VARCHAR(80) NOT NULL,
  target_unit_code VARCHAR(30) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_inventory_units (source_system, legacy_unit_value),
  CONSTRAINT fk_mapping_legacy_inventory_units_target FOREIGN KEY (target_unit_code) REFERENCES inventory_units(code)
);

CREATE TABLE IF NOT EXISTS mapping_legacy_status_values (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_system ENUM('WEB_PSB','FINANCE','GA') NOT NULL,
  domain_name VARCHAR(50) NOT NULL,
  legacy_status_value VARCHAR(100) NOT NULL,
  target_status_value VARCHAR(100) NOT NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mapping_legacy_status_values (source_system, domain_name, legacy_status_value)
);
