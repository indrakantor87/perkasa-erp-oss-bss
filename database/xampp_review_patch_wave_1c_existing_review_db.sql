-- Jalankan file ini pada review DB yang sudah ada sebelum sample/import `Wave 1C`.
-- File ini aman untuk re-run karena seluruh tabel memakai IF NOT EXISTS.

USE erp_isp_review;

CREATE TABLE IF NOT EXISTS sales_marketing_activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  activity_date DATETIME NOT NULL,
  marketing_name VARCHAR(120) NOT NULL,
  activity_type VARCHAR(150) NOT NULL,
  notes TEXT NULL,
  source_system ENUM('WEB_PSB','FINANCE','GA') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_marketing_activities_source_legacy (source_system, legacy_id),
  KEY idx_sales_marketing_activities_branch_date (branch_id, activity_date),
  CONSTRAINT fk_sales_marketing_activities_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id)
);

CREATE TABLE IF NOT EXISTS sales_marketing_activity_areas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  activity_id BIGINT UNSIGNED NOT NULL,
  covered_area_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_marketing_activity_areas_pair (activity_id, covered_area_id),
  KEY idx_sales_marketing_activity_areas_sort (activity_id, sort_order),
  CONSTRAINT fk_sales_marketing_activity_areas_activity FOREIGN KEY (activity_id) REFERENCES sales_marketing_activities(id),
  CONSTRAINT fk_sales_marketing_activity_areas_covered_area FOREIGN KEY (covered_area_id) REFERENCES sales_covered_areas(id)
);

CREATE TABLE IF NOT EXISTS staging_legacy_sales_coverage_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  branch_code VARCHAR(30) NULL,
  area_code VARCHAR(50) NULL,
  area_name VARCHAR(150) NULL,
  coverage_status VARCHAR(50) NULL,
  village VARCHAR(120) NULL,
  district VARCHAR(120) NULL,
  city VARCHAR(120) NULL,
  province VARCHAR(120) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  notes TEXT NULL,
  raw_payload LONGTEXT NULL,
  normalized_key VARCHAR(180) NULL,
  target_covered_area_id BIGINT UNSIGNED NULL,
  import_status ENUM('PENDING','MAPPED','VALID','INVALID','IMPORTED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  validation_notes TEXT NULL,
  imported_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staging_legacy_sales_coverage_batch (batch_id),
  CONSTRAINT fk_staging_legacy_sales_coverage_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id),
  CONSTRAINT fk_staging_legacy_sales_coverage_target FOREIGN KEY (target_covered_area_id) REFERENCES sales_covered_areas(id)
);

CREATE TABLE IF NOT EXISTS staging_legacy_marketing_activity_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  branch_code VARCHAR(30) NULL,
  activity_date DATETIME NULL,
  marketing_name VARCHAR(120) NULL,
  activity_type VARCHAR(150) NULL,
  notes TEXT NULL,
  raw_payload LONGTEXT NULL,
  normalized_key VARCHAR(180) NULL,
  target_activity_id BIGINT UNSIGNED NULL,
  import_status ENUM('PENDING','MAPPED','VALID','INVALID','IMPORTED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  validation_notes TEXT NULL,
  imported_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staging_legacy_marketing_activity_batch (batch_id),
  CONSTRAINT fk_staging_legacy_marketing_activity_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id),
  CONSTRAINT fk_staging_legacy_marketing_activity_target FOREIGN KEY (target_activity_id) REFERENCES sales_marketing_activities(id)
);

CREATE TABLE IF NOT EXISTS staging_legacy_marketing_activity_area_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_activity_id VARCHAR(100) NULL,
  legacy_area_id VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 1,
  raw_payload LONGTEXT NULL,
  normalized_key VARCHAR(180) NULL,
  target_activity_id BIGINT UNSIGNED NULL,
  target_covered_area_id BIGINT UNSIGNED NULL,
  import_status ENUM('PENDING','MAPPED','VALID','INVALID','IMPORTED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  validation_notes TEXT NULL,
  imported_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staging_legacy_marketing_activity_area_batch (batch_id),
  CONSTRAINT fk_staging_legacy_marketing_activity_area_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id),
  CONSTRAINT fk_staging_legacy_marketing_activity_area_target_activity FOREIGN KEY (target_activity_id) REFERENCES sales_marketing_activities(id),
  CONSTRAINT fk_staging_legacy_marketing_activity_area_target_area FOREIGN KEY (target_covered_area_id) REFERENCES sales_covered_areas(id)
);
