-- Jalankan file ini pada review DB yang sudah pernah dibangun sebelum patch schema Wave 1A diterapkan.
-- Script ini menjaga kompatibilitas database review lama agar sample dan transform Wave 1A bisa dijalankan.

USE erp_isp_review;

ALTER TABLE staging_legacy_support_records
  MODIFY COLUMN support_type ENUM('TROUBLE_TICKET','ISOLATION','DISMANTLE_HISTORY','DISMANTLE_QUEUE','TROUBLE_TICKET_PHOTO','TROUBLE_TICKET_SLA','TROUBLE_TICKET_MASTER') NOT NULL;

ALTER TABLE staging_legacy_support_records
  ADD COLUMN IF NOT EXISTS legacy_parent_id VARCHAR(100) NULL AFTER legacy_customer_id,
  ADD COLUMN IF NOT EXISTS legacy_reference_code VARCHAR(100) NULL AFTER legacy_parent_id,
  ADD COLUMN IF NOT EXISTS customer_address TEXT NULL AFTER customer_name,
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30) NULL AFTER customer_address,
  ADD COLUMN IF NOT EXISTS marketing_name VARCHAR(120) NULL AFTER customer_user,
  ADD COLUMN IF NOT EXISTS radbox_name VARCHAR(120) NULL AFTER marketing_name,
  ADD COLUMN IF NOT EXISTS note_text TEXT NULL AFTER reason_text,
  ADD COLUMN IF NOT EXISTS actor_name VARCHAR(150) NULL AFTER note_text,
  ADD COLUMN IF NOT EXISTS target_dismantle_queue_id BIGINT UNSIGNED NULL AFTER target_dismantle_history_id,
  ADD COLUMN IF NOT EXISTS target_trouble_ticket_sla_id BIGINT UNSIGNED NULL AFTER target_dismantle_queue_id;

CREATE TABLE IF NOT EXISTS staging_legacy_network_odp_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_system ENUM('WEB_PSB') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  odp_code VARCHAR(50) NULL,
  odp_name VARCHAR(150) NULL,
  region_name VARCHAR(120) NULL,
  location_text TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  total_ports INT NULL,
  active_ports INT NULL,
  pole_status VARCHAR(80) NULL,
  is_active TINYINT(1) NULL,
  raw_payload LONGTEXT NULL,
  normalized_key VARCHAR(180) NULL,
  target_odp_id BIGINT UNSIGNED NULL,
  import_status ENUM('PENDING','MAPPED','VALID','INVALID','IMPORTED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  validation_notes TEXT NULL,
  imported_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staging_legacy_network_odp_batch (batch_id),
  KEY idx_staging_legacy_network_odp_target (target_odp_id),
  CONSTRAINT fk_staging_legacy_network_odp_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id),
  CONSTRAINT fk_staging_legacy_network_odp_target FOREIGN KEY (target_odp_id) REFERENCES network_odp(id)
);
