-- Jalankan file ini pada review DB yang sudah pernah dibangun sebelum adapter
-- WhatsappTemplate production ditambahkan.
-- Script dipisah agar tidak menyentuh schema dasar yang sedang dipakai batch lain.

USE erp_isp_review;

CREATE TABLE IF NOT EXISTS helper_whatsapp_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_name VARCHAR(180) NOT NULL,
  template_content TEXT NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_helper_whatsapp_templates_name (template_name),
  KEY idx_helper_whatsapp_templates_default (is_default)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staging_legacy_whatsapp_template_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  template_name VARCHAR(180) NULL,
  template_content TEXT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  raw_payload LONGTEXT NULL,
  normalized_key VARCHAR(220) NULL,
  target_template_id BIGINT UNSIGNED NULL,
  import_status ENUM('PENDING','MAPPED','VALID','INVALID','IMPORTED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  validation_notes TEXT NULL,
  imported_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staging_legacy_whatsapp_template_batch (batch_id),
  KEY idx_staging_legacy_whatsapp_template_target (target_template_id),
  CONSTRAINT fk_staging_legacy_whatsapp_template_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id),
  CONSTRAINT fk_staging_legacy_whatsapp_template_target FOREIGN KEY (target_template_id) REFERENCES helper_whatsapp_templates(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
