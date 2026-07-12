-- Jalankan file ini pada review DB yang sudah pernah dibangun sebelum adapter
-- TroubleTicketMaster production ditambahkan.
-- Script ini sengaja dipisah agar tidak perlu menyentuh schema dasar yang sedang
-- dipakai batch lain.

USE erp_isp_review;

ALTER TABLE staging_legacy_support_records
  ADD COLUMN IF NOT EXISTS target_trouble_ticket_master_id BIGINT UNSIGNED NULL AFTER target_trouble_ticket_sla_id;

CREATE TABLE IF NOT EXISTS support_trouble_ticket_masters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind VARCHAR(50) NOT NULL,
  master_value VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_support_trouble_ticket_masters_kind_value (kind, master_value),
  KEY idx_support_trouble_ticket_masters_kind (kind)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
