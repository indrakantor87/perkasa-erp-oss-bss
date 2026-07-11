-- Jalankan file ini setelah loader dan transform Wave 1A support production selesai dieksekusi.
-- File ini bersifat read-only dan merangkum status PASS / BLOCKED untuk check utama.

USE erp_isp_review;

SET @support_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-SUPPORT-CORE-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT
  'support_production_batch_exists' AS check_name,
  CASE
    WHEN @support_batch_id IS NOT NULL THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch production support inti harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'support_production_no_invalid_rows' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND import_status = 'INVALID'
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch support production tidak boleh menyisakan row INVALID' AS detail_text;

SELECT
  'support_trouble_ticket_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'TROUBLE_TICKET'
        AND import_status = 'IMPORTED'
        AND target_trouble_ticket_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'TROUBLE_TICKET'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row TroubleTicket production harus linked ke support_trouble_tickets final' AS detail_text;

SELECT
  'support_isolation_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'ISOLATION'
        AND import_status = 'IMPORTED'
        AND target_isolation_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'ISOLATION'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row Isolation production harus linked ke support_isolations final' AS detail_text;

SELECT
  'support_dismantle_queue_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'DISMANTLE_QUEUE'
        AND import_status = 'IMPORTED'
        AND target_isolation_id IS NOT NULL
        AND target_dismantle_queue_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'DISMANTLE_QUEUE'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row DismantleTickets production harus linked ke isolation dan support_dismantle_queue final' AS detail_text;

SELECT
  'support_dismantle_history_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'DISMANTLE_HISTORY'
        AND import_status = 'IMPORTED'
        AND target_dismantle_history_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'DISMANTLE_HISTORY'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row DismantleHistory production harus linked ke support_dismantle_history final' AS detail_text;

SELECT
  'support_final_trouble_ticket_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM support_trouble_tickets tt
      WHERE tt.id IN (
        SELECT target_trouble_ticket_id
        FROM staging_legacy_support_records
        WHERE batch_id = @support_batch_id
          AND support_type = 'TROUBLE_TICKET'
          AND target_trouble_ticket_id IS NOT NULL
      )
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'TROUBLE_TICKET'
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah support_trouble_tickets final harus sama dengan jumlah row TroubleTicket production yang berhasil diimpor' AS detail_text;

SELECT
  'support_final_isolation_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM support_isolations si
      WHERE si.id IN (
        SELECT target_isolation_id
        FROM staging_legacy_support_records
        WHERE batch_id = @support_batch_id
          AND support_type = 'ISOLATION'
          AND target_isolation_id IS NOT NULL
      )
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'ISOLATION'
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah support_isolations final harus sama dengan jumlah row Isolation production yang berhasil diimpor' AS detail_text;

SELECT
  'support_final_dismantle_queue_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM support_dismantle_queue dq
      WHERE dq.id IN (
        SELECT target_dismantle_queue_id
        FROM staging_legacy_support_records
        WHERE batch_id = @support_batch_id
          AND support_type = 'DISMANTLE_QUEUE'
          AND target_dismantle_queue_id IS NOT NULL
      )
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'DISMANTLE_QUEUE'
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah support_dismantle_queue final harus sama dengan jumlah row DismantleTickets production yang berhasil diimpor' AS detail_text;

SELECT
  'support_final_dismantle_history_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM support_dismantle_history dh
      WHERE dh.id IN (
        SELECT target_dismantle_history_id
        FROM staging_legacy_support_records
        WHERE batch_id = @support_batch_id
          AND support_type = 'DISMANTLE_HISTORY'
          AND target_dismantle_history_id IS NOT NULL
      )
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @support_batch_id
        AND support_type = 'DISMANTLE_HISTORY'
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah support_dismantle_history final harus sama dengan jumlah row DismantleHistory production yang berhasil diimpor' AS detail_text;
