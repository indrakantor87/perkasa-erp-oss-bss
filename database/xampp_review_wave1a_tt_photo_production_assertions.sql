-- Jalankan file ini setelah loader dan transform Wave 1A TroubleTicketPhoto production selesai dieksekusi.

USE erp_isp_review;

SET @tt_photo_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTPHOTO-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT
  'tt_photo_production_batch_exists' AS check_name,
  CASE
    WHEN @tt_photo_batch_id IS NOT NULL THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch TroubleTicketPhoto production harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'tt_photo_production_no_invalid_rows' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_photo_batch_id
        AND support_type = 'TROUBLE_TICKET_PHOTO'
        AND import_status = 'INVALID'
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch TroubleTicketPhoto production tidak boleh menyisakan row INVALID' AS detail_text;

SELECT
  'tt_photo_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_photo_batch_id
        AND support_type = 'TROUBLE_TICKET_PHOTO'
        AND import_status = 'IMPORTED'
        AND target_trouble_ticket_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_photo_batch_id
        AND support_type = 'TROUBLE_TICKET_PHOTO'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row TroubleTicketPhoto production harus linked ke support_trouble_tickets final' AS detail_text;

SELECT
  'tt_photo_final_count_matches_staging' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_support_records ss
      JOIN support_trouble_ticket_photos p
        ON p.trouble_ticket_id = ss.target_trouble_ticket_id
       AND p.photo_path = COALESCE(
         NULLIF(
           TRIM(
             CASE
               WHEN JSON_VALID(ss.raw_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.filePath'))
               ELSE NULL
             END
           ),
           ''
         ),
         NULLIF(
           TRIM(
             CASE
               WHEN JSON_VALID(ss.photo_list_text) THEN JSON_UNQUOTE(JSON_EXTRACT(ss.photo_list_text, '$[0]'))
               ELSE ss.photo_list_text
             END
           ),
           ''
         )
       )
      WHERE ss.batch_id = @tt_photo_batch_id
        AND ss.support_type = 'TROUBLE_TICKET_PHOTO'
        AND ss.import_status = 'IMPORTED'
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_support_records
      WHERE batch_id = @tt_photo_batch_id
        AND support_type = 'TROUBLE_TICKET_PHOTO'
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah linkage final TroubleTicketPhoto harus sama dengan jumlah row staging imported' AS detail_text;
