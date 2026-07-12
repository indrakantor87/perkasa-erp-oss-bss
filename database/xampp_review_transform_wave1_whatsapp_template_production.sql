-- Jalankan file ini setelah loader Wave 1 WhatsappTemplate production selesai dieksekusi.

USE erp_isp_review;

SET @whatsapp_template_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-WATPL-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Rapikan nama dan konten.
UPDATE staging_legacy_whatsapp_template_records sw
SET sw.template_name = TRIM(sw.template_name),
    sw.template_content = TRIM(sw.template_content),
    sw.updated_at = CURRENT_TIMESTAMP
WHERE sw.batch_id = @whatsapp_template_batch_id
  AND sw.import_status IN ('MAPPED', 'VALID');

-- 2) Tandai invalid bila nama atau konten kosong.
UPDATE staging_legacy_whatsapp_template_records sw
SET sw.import_status = 'INVALID',
    sw.validation_notes = TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(sw.validation_notes, ''),
        CASE
          WHEN NULLIF(TRIM(sw.template_name), '') IS NULL THEN 'template_name kosong pada staging WhatsappTemplate production.'
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(TRIM(sw.template_content), '') IS NULL THEN 'template_content kosong pada staging WhatsappTemplate production.'
          ELSE NULL
        END
      )
    ),
    sw.updated_at = CURRENT_TIMESTAMP
WHERE sw.batch_id = @whatsapp_template_batch_id
  AND sw.import_status IN ('MAPPED', 'VALID')
  AND (
    NULLIF(TRIM(sw.template_name), '') IS NULL
    OR NULLIF(TRIM(sw.template_content), '') IS NULL
  );

-- 3) Insert template helper secara idempotent.
INSERT INTO helper_whatsapp_templates (
  template_name,
  template_content,
  is_default
)
SELECT
  src.template_name,
  src.template_content,
  0
FROM (
  SELECT
    TRIM(sw.template_name) AS template_name,
    TRIM(sw.template_content) AS template_content
  FROM staging_legacy_whatsapp_template_records sw
  WHERE sw.batch_id = @whatsapp_template_batch_id
    AND sw.import_status IN ('MAPPED', 'VALID')
  GROUP BY TRIM(sw.template_name), TRIM(sw.template_content)
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM helper_whatsapp_templates ht
  WHERE ht.template_name = src.template_name
);

-- 4) Sinkronkan isi template bila nama yang sama sudah ada.
UPDATE helper_whatsapp_templates ht
JOIN (
  SELECT
    TRIM(sw.template_name) AS template_name,
    TRIM(sw.template_content) AS template_content
  FROM staging_legacy_whatsapp_template_records sw
  WHERE sw.batch_id = @whatsapp_template_batch_id
    AND sw.import_status IN ('MAPPED', 'VALID')
  GROUP BY TRIM(sw.template_name), TRIM(sw.template_content)
) src
  ON ht.template_name = src.template_name
SET ht.template_content = src.template_content,
    ht.updated_at = CURRENT_TIMESTAMP
WHERE ht.template_content <> src.template_content;

-- 5) Reset default final bila batch ini punya template default.
SET @has_default_template = (
  SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
  FROM staging_legacy_whatsapp_template_records sw
  WHERE sw.batch_id = @whatsapp_template_batch_id
    AND sw.import_status IN ('MAPPED', 'VALID')
    AND sw.is_default = 1
);

UPDATE helper_whatsapp_templates
SET is_default = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE @has_default_template = 1
  AND is_default <> 0;

SET @default_template_name = (
  SELECT TRIM(sw.template_name)
  FROM staging_legacy_whatsapp_template_records sw
  WHERE sw.batch_id = @whatsapp_template_batch_id
    AND sw.import_status IN ('MAPPED', 'VALID')
    AND sw.is_default = 1
  ORDER BY sw.id ASC
  LIMIT 1
);

UPDATE helper_whatsapp_templates
SET is_default = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE @has_default_template = 1
  AND template_name = @default_template_name;

-- 6) Link row staging ke final.
UPDATE staging_legacy_whatsapp_template_records sw
JOIN helper_whatsapp_templates ht
  ON ht.template_name = TRIM(sw.template_name)
SET sw.target_template_id = ht.id,
    sw.import_status = 'IMPORTED',
    sw.imported_at = COALESCE(sw.imported_at, CURRENT_TIMESTAMP),
    sw.updated_at = CURRENT_TIMESTAMP
WHERE sw.batch_id = @whatsapp_template_batch_id
  AND sw.import_status IN ('MAPPED', 'VALID');
