-- Jalankan file ini setelah loader dan transform Wave 1A TroubleTicketPhoto production selesai dieksekusi.

USE erp_isp_review;

SET @tt_photo_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTPHOTO-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Batch Wave 1A TT Photo Production' AS review_section;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows
FROM staging_import_batches
WHERE id = @tt_photo_batch_id;

SELECT 'Staging TT Photo Production Summary' AS review_section;
SELECT
  support_type,
  COUNT(*) AS total_rows,
  SUM(import_status = 'IMPORTED') AS imported_rows,
  SUM(import_status = 'INVALID') AS invalid_rows,
  SUM(target_trouble_ticket_id IS NOT NULL) AS linked_trouble_ticket_rows
FROM staging_legacy_support_records
WHERE batch_id = @tt_photo_batch_id
GROUP BY support_type
ORDER BY support_type;

SELECT 'Pending TT Photo Production Rows' AS review_section;
SELECT
  legacy_id,
  legacy_parent_id,
  legacy_reference_code,
  ticket_code,
  import_status,
  validation_notes
FROM staging_legacy_support_records
WHERE batch_id = @tt_photo_batch_id
  AND import_status <> 'IMPORTED'
ORDER BY id
LIMIT 30;

SELECT 'Final TT Photo Production Summary' AS review_section;
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT trouble_ticket_id) AS distinct_ticket_rows
FROM support_trouble_ticket_photos
WHERE id IN (
  SELECT p.id
  FROM support_trouble_ticket_photos p
  JOIN staging_legacy_support_records ss
    ON ss.target_trouble_ticket_id = p.trouble_ticket_id
  WHERE ss.batch_id = @tt_photo_batch_id
    AND ss.support_type = 'TROUBLE_TICKET_PHOTO'
    AND ss.import_status = 'IMPORTED'
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
);

SELECT 'Final TT Photo Production Sample' AS review_section;
SELECT
  p.id,
  p.trouble_ticket_id,
  tt.ticket_code,
  tt.customer_name,
  p.photo_path
FROM support_trouble_ticket_photos p
JOIN support_trouble_tickets tt
  ON tt.id = p.trouble_ticket_id
WHERE p.id IN (
  SELECT p2.id
  FROM support_trouble_ticket_photos p2
  JOIN staging_legacy_support_records ss
    ON ss.target_trouble_ticket_id = p2.trouble_ticket_id
  WHERE ss.batch_id = @tt_photo_batch_id
    AND ss.support_type = 'TROUBLE_TICKET_PHOTO'
    AND ss.import_status = 'IMPORTED'
    AND p2.photo_path = COALESCE(
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
)
ORDER BY p.id DESC
LIMIT 20;
