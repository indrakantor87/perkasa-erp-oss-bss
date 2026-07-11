-- Jalankan file ini setelah `xampp_review_transform_stage_3.sql`.
-- Transform extension wave 1A ini fokus pada source support tambahan dari production Web PSB:
-- 1. DismantleTickets -> support_dismantle_queue
-- 2. TroubleTicketPhoto -> support_trouble_ticket_photos
-- 3. TroubleTicketSla -> support_trouble_ticket_sla
-- 4. TroubleTicketMaster tetap ditahan di staging sampai tabel final config support tersedia.

USE erp_isp_review;

SET @support_ext_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'SAMPLE-WEBPSB-SUPPORT-EXT-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Hubungkan staging dismantle queue ke isolation final melalui legacy parent.
UPDATE staging_legacy_support_records ss
JOIN staging_legacy_support_records iso_src
  ON iso_src.source_system = ss.source_system
  AND iso_src.support_type = 'ISOLATION'
  AND iso_src.legacy_id = ss.legacy_parent_id
  AND iso_src.target_isolation_id IS NOT NULL
SET ss.target_isolation_id = iso_src.target_isolation_id,
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'DISMANTLE_QUEUE'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.target_isolation_id IS NULL
  AND ss.import_status IN ('MAPPED', 'VALID');

-- 2) Fallback pencarian isolation bila source legacy parent tidak match, pakai customer + opened_at.
UPDATE staging_legacy_support_records ss
JOIN support_isolations iso
  ON iso.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
  AND (
    iso.isolation_date = ss.opened_at
    OR iso.restoration_date = ss.opened_at
  )
SET ss.target_isolation_id = iso.id,
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'DISMANTLE_QUEUE'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.target_isolation_id IS NULL
  AND ss.import_status IN ('MAPPED', 'VALID');

-- 3) Transform DismantleTickets ke queue aktif.
INSERT INTO support_dismantle_queue (
  isolation_id,
  transfer_note,
  transferred_by_username,
  transferred_at,
  reopened_note
)
SELECT
  ss.target_isolation_id,
  NULLIF(
    TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(TRIM(ss.note_text), ''),
        CASE
          WHEN NULLIF(TRIM(ss.reason_text), '') IS NOT NULL
            AND NULLIF(TRIM(ss.reason_text), '') <> NULLIF(TRIM(ss.note_text), '')
          THEN CONCAT('Reason: ', TRIM(ss.reason_text))
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(TRIM(ss.legacy_reference_code), '') IS NOT NULL
          THEN CONCAT('Legacy Ticket: ', TRIM(ss.legacy_reference_code))
          ELSE NULL
        END
      )
    ),
    ''
  ),
  COALESCE(NULLIF(TRIM(ss.actor_name), ''), 'legacy-import'),
  COALESCE(ss.opened_at, CURRENT_TIMESTAMP),
  NULL
FROM staging_legacy_support_records ss
WHERE ss.support_type = 'DISMANTLE_QUEUE'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_dismantle_queue_id IS NULL
  AND ss.target_isolation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_dismantle_queue dq
    WHERE dq.isolation_id = ss.target_isolation_id
  );

UPDATE staging_legacy_support_records ss
JOIN support_dismantle_queue dq
  ON dq.isolation_id = ss.target_isolation_id
SET ss.target_dismantle_queue_id = dq.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'DISMANTLE_QUEUE'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_dismantle_queue_id IS NULL
  AND ss.target_isolation_id IS NOT NULL;

-- 4) Hubungkan photo detail ke trouble ticket final melalui legacy parent.
UPDATE staging_legacy_support_records ss
JOIN staging_legacy_support_records tt_src
  ON tt_src.source_system = ss.source_system
  AND tt_src.support_type = 'TROUBLE_TICKET'
  AND tt_src.legacy_id = ss.legacy_parent_id
  AND tt_src.target_trouble_ticket_id IS NOT NULL
SET ss.target_trouble_ticket_id = tt_src.target_trouble_ticket_id,
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'TROUBLE_TICKET_PHOTO'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.target_trouble_ticket_id IS NULL
  AND ss.import_status IN ('MAPPED', 'VALID');

-- 5) Transform TroubleTicketPhoto detail ke evidence final tanpa bergantung penuh pada closePhotos[].
INSERT INTO support_trouble_ticket_photos (
  trouble_ticket_id,
  photo_path
)
SELECT
  ss.target_trouble_ticket_id,
  COALESCE(
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
  ) AS photo_path
FROM staging_legacy_support_records ss
WHERE ss.support_type = 'TROUBLE_TICKET_PHOTO'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_id IS NOT NULL
  AND COALESCE(
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
  ) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_ticket_photos p
    WHERE p.trouble_ticket_id = ss.target_trouble_ticket_id
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

UPDATE staging_legacy_support_records ss
SET ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'TROUBLE_TICKET_PHOTO'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM support_trouble_ticket_photos p
    WHERE p.trouble_ticket_id = ss.target_trouble_ticket_id
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

-- 6) Transform TroubleTicketSla ke final SLA master.
INSERT INTO support_trouble_ticket_sla (
  trouble_type,
  duration_days
)
SELECT
  COALESCE(NULLIF(TRIM(ss.trouble_type), ''), 'GENERAL'),
  COALESCE(
    CAST(
      CASE
        WHEN JSON_VALID(ss.raw_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.durationDays'))
        ELSE NULL
      END AS UNSIGNED
    ),
    1
  )
FROM staging_legacy_support_records ss
WHERE ss.support_type = 'TROUBLE_TICKET_SLA'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_sla_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_ticket_sla sla
    WHERE sla.trouble_type = COALESCE(NULLIF(TRIM(ss.trouble_type), ''), 'GENERAL')
  );

UPDATE staging_legacy_support_records ss
JOIN support_trouble_ticket_sla sla
  ON sla.trouble_type = COALESCE(NULLIF(TRIM(ss.trouble_type), ''), 'GENERAL')
SET ss.target_trouble_ticket_sla_id = sla.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'TROUBLE_TICKET_SLA'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_sla_id IS NULL;

-- 7) TroubleTicketMaster ditahan dulu karena tabel final config support belum tersedia.
UPDATE staging_legacy_support_records ss
SET ss.validation_notes = TRIM(CONCAT_WS(' | ', NULLIF(ss.validation_notes, ''), 'Menunggu tabel final master support config.')),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.batch_id = @support_ext_batch_id
  AND ss.import_status IN ('MAPPED', 'VALID');
