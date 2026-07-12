-- Jalankan file ini setelah loader dan transform Wave 1 WhatsappTemplate production selesai dieksekusi.

USE erp_isp_review;

SET @whatsapp_template_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-WATPL-001'
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
WHERE b.id = @whatsapp_template_batch_id;

SELECT
  CASE
    WHEN sw.is_default = 1 THEN 'DEFAULT'
    ELSE 'NON_DEFAULT'
  END AS default_flag,
  sw.import_status,
  COUNT(*) AS total_rows
FROM staging_legacy_whatsapp_template_records sw
WHERE sw.batch_id = @whatsapp_template_batch_id
GROUP BY CASE WHEN sw.is_default = 1 THEN 'DEFAULT' ELSE 'NON_DEFAULT' END, sw.import_status
ORDER BY default_flag, sw.import_status;

SELECT
  ht.template_name,
  ht.is_default,
  COUNT(*) AS linked_rows
FROM staging_legacy_whatsapp_template_records sw
JOIN helper_whatsapp_templates ht
  ON ht.id = sw.target_template_id
WHERE sw.batch_id = @whatsapp_template_batch_id
  AND sw.import_status = 'IMPORTED'
GROUP BY ht.template_name, ht.is_default
ORDER BY ht.is_default DESC, ht.template_name;

SELECT
  sw.legacy_id,
  sw.template_name,
  sw.import_status,
  sw.validation_notes
FROM staging_legacy_whatsapp_template_records sw
WHERE sw.batch_id = @whatsapp_template_batch_id
  AND sw.import_status = 'INVALID'
ORDER BY sw.id
LIMIT 20;
