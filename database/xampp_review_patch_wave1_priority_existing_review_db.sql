-- Jalankan file ini pada review DB yang sudah pernah dibangun sebelum adapter
-- Priority production ditambahkan.
-- Script ini dipisah agar tidak perlu menyentuh schema dasar yang sedang dipakai
-- batch lain.

USE erp_isp_review;

CREATE TABLE IF NOT EXISTS master_priorities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  priority_name VARCHAR(150) NOT NULL,
  badge_color VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_priorities_name (priority_name)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staging_legacy_priority_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  priority_name VARCHAR(150) NULL,
  badge_color VARCHAR(120) NULL,
  raw_payload LONGTEXT NULL,
  normalized_key VARCHAR(180) NULL,
  target_priority_id BIGINT UNSIGNED NULL,
  import_status ENUM('PENDING','MAPPED','VALID','INVALID','IMPORTED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  validation_notes TEXT NULL,
  imported_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staging_legacy_priority_batch (batch_id),
  KEY idx_staging_legacy_priority_target (target_priority_id),
  CONSTRAINT fk_staging_legacy_priority_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id),
  CONSTRAINT fk_staging_legacy_priority_target FOREIGN KEY (target_priority_id) REFERENCES master_priorities(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
