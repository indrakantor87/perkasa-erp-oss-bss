-- Jalankan file ini setelah loader Wave 1A TroubleTicketPhoto production selesai dieksekusi.
-- Transform ini mengasumsikan batch `PROD-WEBPSB-SUPPORT-CORE-001` sudah pernah berhasil
-- mengimpor TroubleTicket production ke review DB yang sama.

USE erp_isp_review;

SET @tt_photo_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTPHOTO-001'
  ORDER BY id DESC
  LIMIT 1
);

SET @support_core_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-SUPPORT-CORE-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Resolve parent TroubleTicket final dari batch support core production.
UPDATE staging_legacy_support_records photo
JOIN staging_legacy_support_records tt_src
  ON tt_src.batch_id = @support_core_batch_id
  AND tt_src.source_system = photo.source_system
  AND tt_src.support_type = 'TROUBLE_TICKET'
  AND tt_src.legacy_id = photo.legacy_parent_id
  AND tt_src.target_trouble_ticket_id IS NOT NULL
SET photo.target_trouble_ticket_id = tt_src.target_trouble_ticket_id,
    photo.updated_at = CURRENT_TIMESTAMP
WHERE photo.batch_id = @tt_photo_batch_id
  AND photo.support_type = 'TROUBLE_TICKET_PHOTO'
  AND photo.import_status IN ('MAPPED', 'VALID')
  AND photo.target_trouble_ticket_id IS NULL;

-- 2) Insert evidence photo bila parent berhasil ditemukan.
INSERT INTO support_trouble_ticket_photos (
  trouble_ticket_id,
  photo_path
)
SELECT
  photo.target_trouble_ticket_id,
  COALESCE(
    NULLIF(
      TRIM(
        CASE
          WHEN JSON_VALID(photo.raw_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.raw_payload, '$.filePath'))
          ELSE NULL
        END
      ),
      ''
    ),
    NULLIF(
      TRIM(
        CASE
          WHEN JSON_VALID(photo.photo_list_text) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.photo_list_text, '$[0]'))
          ELSE photo.photo_list_text
        END
      ),
      ''
    )
  ) AS photo_path
FROM staging_legacy_support_records photo
WHERE photo.batch_id = @tt_photo_batch_id
  AND photo.support_type = 'TROUBLE_TICKET_PHOTO'
  AND photo.import_status IN ('MAPPED', 'VALID')
  AND photo.target_trouble_ticket_id IS NOT NULL
  AND COALESCE(
    NULLIF(
      TRIM(
        CASE
          WHEN JSON_VALID(photo.raw_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.raw_payload, '$.filePath'))
          ELSE NULL
        END
      ),
      ''
    ),
    NULLIF(
      TRIM(
        CASE
          WHEN JSON_VALID(photo.photo_list_text) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.photo_list_text, '$[0]'))
          ELSE photo.photo_list_text
        END
      ),
      ''
    )
  ) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_ticket_photos final_photo
    WHERE final_photo.trouble_ticket_id = photo.target_trouble_ticket_id
      AND final_photo.photo_path = COALESCE(
        NULLIF(
          TRIM(
            CASE
              WHEN JSON_VALID(photo.raw_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.raw_payload, '$.filePath'))
              ELSE NULL
            END
          ),
          ''
        ),
        NULLIF(
          TRIM(
            CASE
              WHEN JSON_VALID(photo.photo_list_text) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.photo_list_text, '$[0]'))
              ELSE photo.photo_list_text
            END
          ),
          ''
        )
      )
  );

-- 3) Tandai row berhasil bila final photo sudah ada.
UPDATE staging_legacy_support_records photo
SET photo.import_status = 'IMPORTED',
    photo.imported_at = COALESCE(photo.imported_at, CURRENT_TIMESTAMP),
    photo.updated_at = CURRENT_TIMESTAMP
WHERE photo.batch_id = @tt_photo_batch_id
  AND photo.support_type = 'TROUBLE_TICKET_PHOTO'
  AND photo.import_status IN ('MAPPED', 'VALID')
  AND photo.target_trouble_ticket_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM support_trouble_ticket_photos final_photo
    WHERE final_photo.trouble_ticket_id = photo.target_trouble_ticket_id
      AND final_photo.photo_path = COALESCE(
        NULLIF(
          TRIM(
            CASE
              WHEN JSON_VALID(photo.raw_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.raw_payload, '$.filePath'))
              ELSE NULL
            END
          ),
          ''
        ),
        NULLIF(
          TRIM(
            CASE
              WHEN JSON_VALID(photo.photo_list_text) THEN JSON_UNQUOTE(JSON_EXTRACT(photo.photo_list_text, '$[0]'))
              ELSE photo.photo_list_text
            END
          ),
          ''
        )
      )
  );

-- 4) Tandai invalid bila parent TroubleTicket production tidak ditemukan.
UPDATE staging_legacy_support_records photo
SET photo.import_status = 'INVALID',
    photo.validation_notes = TRIM(CONCAT_WS(' | ', NULLIF(photo.validation_notes, ''), 'Parent TroubleTicket production belum ditemukan di batch PROD-WEBPSB-SUPPORT-CORE-001.')),
    photo.updated_at = CURRENT_TIMESTAMP
WHERE photo.batch_id = @tt_photo_batch_id
  AND photo.support_type = 'TROUBLE_TICKET_PHOTO'
  AND photo.import_status IN ('MAPPED', 'VALID')
  AND photo.target_trouble_ticket_id IS NULL;
