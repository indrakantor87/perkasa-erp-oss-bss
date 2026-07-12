-- Jalankan file ini setelah loader Wave 1A TroubleTicketMaster production selesai dieksekusi.

USE erp_isp_review;

SET @tt_master_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-TTMASTER-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Rapikan nilai kind dan value mengikuti normalisasi legacy.
UPDATE staging_legacy_support_records ss
SET ss.trouble_type = UPPER(TRIM(ss.trouble_type)),
    ss.note_text = UPPER(TRIM(ss.note_text)),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status IN ('MAPPED', 'VALID');

-- 2) Tandai invalid bila kind/value tidak memenuhi whitelist adapter.
UPDATE staging_legacy_support_records ss
SET ss.import_status = 'INVALID',
    ss.validation_notes = TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(ss.validation_notes, ''),
        CASE
          WHEN NULLIF(TRIM(ss.trouble_type), '') IS NULL THEN 'kind kosong pada staging TroubleTicketMaster production.'
          WHEN TRIM(ss.trouble_type) NOT IN ('PROBLEM_CATEGORY', 'RESOLUTION_ACTION', 'ONT') THEN CONCAT('kind ', TRIM(ss.trouble_type), ' belum didukung oleh adapter TroubleTicketMaster production.')
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(TRIM(ss.note_text), '') IS NULL THEN 'value kosong pada staging TroubleTicketMaster production.'
          ELSE NULL
        END
      )
    ),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND (
    NULLIF(TRIM(ss.trouble_type), '') IS NULL
    OR TRIM(ss.trouble_type) NOT IN ('PROBLEM_CATEGORY', 'RESOLUTION_ACTION', 'ONT')
    OR NULLIF(TRIM(ss.note_text), '') IS NULL
  );

-- 3) Insert katalog final TroubleTicketMaster secara idempotent.
INSERT INTO support_trouble_ticket_masters (
  kind,
  master_value
)
SELECT DISTINCT
  TRIM(ss.trouble_type),
  TRIM(ss.note_text)
FROM staging_legacy_support_records ss
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND NULLIF(TRIM(ss.trouble_type), '') IS NOT NULL
  AND NULLIF(TRIM(ss.note_text), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_ticket_masters final_master
    WHERE final_master.kind = TRIM(ss.trouble_type)
      AND final_master.master_value = TRIM(ss.note_text)
  );

-- 4) Link seluruh row staging valid ke katalog final.
UPDATE staging_legacy_support_records ss
JOIN support_trouble_ticket_masters final_master
  ON final_master.kind = TRIM(ss.trouble_type)
  AND final_master.master_value = TRIM(ss.note_text)
SET ss.target_trouble_ticket_master_id = final_master.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @tt_master_batch_id
  AND ss.support_type = 'TROUBLE_TICKET_MASTER'
  AND ss.import_status IN ('MAPPED', 'VALID');
