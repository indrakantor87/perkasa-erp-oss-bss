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
  b.id,
  b.batch_code,
  b.import_scope,
  b.import_status,
  b.total_rows,
  b.valid_rows,
  b.invalid_rows,
  b.duplicate_rows,
  b.source_file_name,
  b.created_at,
  b.updated_at
FROM staging_import_batches b
WHERE b.id = @tt_master_batch_id;

SELECT
  COALESCE(NULLIF(TRIM(ss.trouble_type), ''), '(blank)') AS legacy_kind,
  ss.import_status,
  COUNT(*) AS total_rows
FROM staging_legacy_support_records ss
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
GROUP BY COALESCE(NULLIF(TRIM(ss.trouble_type), ''), '(blank)'), ss.import_status
ORDER BY legacy_kind, ss.import_status;

SELECT
  final_master.kind,
  COUNT(*) AS linked_staging_rows,
  COUNT(DISTINCT final_master.id) AS distinct_final_rows,
  MIN(final_master.master_value) AS sample_first_value,
  MAX(final_master.master_value) AS sample_last_value
FROM staging_legacy_support_records ss
JOIN support_trouble_ticket_masters final_master
  ON final_master.id = ss.target_trouble_ticket_master_id
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status = 'IMPORTED'
GROUP BY final_master.kind
ORDER BY final_master.kind;

SELECT
  final_master.kind,
  final_master.master_value,
  COUNT(*) AS linked_rows
FROM staging_legacy_support_records ss
JOIN support_trouble_ticket_masters final_master
  ON final_master.id = ss.target_trouble_ticket_master_id
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status = 'IMPORTED'
GROUP BY final_master.kind, final_master.master_value
ORDER BY final_master.kind, final_master.master_value
LIMIT 50;

SELECT
  ss.legacy_id,
  ss.legacy_reference_code,
  ss.trouble_type,
  ss.note_text,
  ss.import_status,
  ss.validation_notes
FROM staging_legacy_support_records ss
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status = 'INVALID'
ORDER BY ss.id
LIMIT 20;
