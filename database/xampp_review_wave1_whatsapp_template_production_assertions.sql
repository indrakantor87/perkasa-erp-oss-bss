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
  'whatsapp_template_production_batch_exists' AS check_name,
  CASE
    WHEN @whatsapp_template_batch_id IS NOT NULL THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch WhatsappTemplate production harus terbentuk di staging_import_batches' AS detail_text;

SELECT
  'whatsapp_template_no_invalid_rows' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_whatsapp_template_records
      WHERE batch_id = @whatsapp_template_batch_id
        AND import_status = 'INVALID'
    ) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Batch WhatsappTemplate production tidak boleh menyisakan row INVALID' AS detail_text;

SELECT
  'whatsapp_template_rows_all_linked' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_whatsapp_template_records
      WHERE batch_id = @whatsapp_template_batch_id
        AND import_status = 'IMPORTED'
        AND target_template_id IS NOT NULL
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_whatsapp_template_records
      WHERE batch_id = @whatsapp_template_batch_id
        AND import_status <> 'INVALID'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Semua row WhatsappTemplate production yang valid harus linked ke helper_whatsapp_templates final' AS detail_text;

SELECT
  'whatsapp_template_final_count_matches_staging_linkage' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM staging_legacy_whatsapp_template_records sw
      JOIN helper_whatsapp_templates ht
        ON ht.id = sw.target_template_id
       AND ht.template_name = TRIM(sw.template_name)
      WHERE sw.batch_id = @whatsapp_template_batch_id
        AND sw.import_status = 'IMPORTED'
    ) = (
      SELECT COUNT(*)
      FROM staging_legacy_whatsapp_template_records
      WHERE batch_id = @whatsapp_template_batch_id
        AND import_status = 'IMPORTED'
    ) THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Jumlah linkage final WhatsappTemplate harus sama dengan jumlah row staging imported' AS detail_text;

SELECT
  'whatsapp_template_max_one_default' AS check_name,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM helper_whatsapp_templates
      WHERE is_default = 1
    ) <= 1 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  'Helper WhatsappTemplate final tidak boleh memiliki lebih dari satu template default aktif' AS detail_text;
