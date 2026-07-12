-- Jalankan file ini setelah loader dan transform Wave 1A TroubleTicketMaster production selesai dieksekusi.

USE erp_isp_review;

SET @tt_master_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTMASTER-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT
  'tt_master_production_batch_exists' AS check_name,
  CASE
    WHEN @tt_master_batch_id IS NOT NULL THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch TroubleTicketMaster production harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'tt_master_production_no_invalid_rows' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_master_batch_id
        AND support_type = 'TROUBLE_TICKET_MASTER'
        AND import_status = 'INVALID'
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch TroubleTicketMaster production tidak boleh menyisakan row INVALID di luar whitelist kind adapter' AS detail_text;

SELECT
  'tt_master_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_master_batch_id
        AND support_type = 'TROUBLE_TICKET_MASTER'
        AND import_status = 'IMPORTED'
        AND target_trouble_ticket_master_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_master_batch_id
        AND support_type = 'TROUBLE_TICKET_MASTER'
        AND import_status <> 'INVALID'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row TroubleTicketMaster production yang valid harus linked ke support_trouble_ticket_masters final' AS detail_text;

SELECT
  'tt_master_final_count_matches_staging_linkage' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records ss
      JOIN support_trouble_ticket_masters final_master
        ON final_master.id = ss.target_trouble_ticket_master_id
       AND final_master.kind = TRIM(ss.trouble_type)
       AND final_master.master_value = TRIM(ss.note_text)
      WHERE ss.batch_id = @tt_master_batch_id
        AND ss.support_type = 'TROUBLE_TICKET_MASTER'
        AND ss.import_status = 'IMPORTED'
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_master_batch_id
        AND support_type = 'TROUBLE_TICKET_MASTER'
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah linkage final TroubleTicketMaster harus sama dengan jumlah row staging imported' AS detail_text;
