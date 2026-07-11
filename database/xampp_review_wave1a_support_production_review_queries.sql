-- Jalankan file ini setelah loader dan transform Wave 1A support production selesai dieksekusi.
-- File ini bersifat read-only dan dipakai untuk melihat ringkasan staging dan final table.

USE erp_isp_review;

SET @support_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-SUPPORT-CORE-001'
  ORDER BY id DESC
  LIMIT 1
);

SELECT 'Batch Wave 1A Support Production' AS review_section;
SELECT batch_code, import_scope, import_status, total_rows, valid_rows, invalid_rows, duplicate_rows
FROM staging_import_batches
WHERE id = @support_batch_id;

SELECT 'Staging Support Production Summary' AS review_section;
SELECT
  support_type,
  COUNT(*) AS total_rows,
  SUM(import_status = 'IMPORTED') AS imported_rows,
  SUM(import_status = 'INVALID') AS invalid_rows,
  SUM(target_subscription_id IS NOT NULL) AS linked_subscription_rows,
  SUM(target_trouble_ticket_id IS NOT NULL) AS linked_trouble_ticket_rows,
  SUM(target_isolation_id IS NOT NULL) AS linked_isolation_rows,
  SUM(target_dismantle_queue_id IS NOT NULL) AS linked_dismantle_queue_rows,
  SUM(target_dismantle_history_id IS NOT NULL) AS linked_dismantle_history_rows
FROM staging_legacy_support_records
WHERE batch_id = @support_batch_id
GROUP BY support_type
ORDER BY support_type;

SELECT 'Pending Support Production Rows' AS review_section;
SELECT
  support_type,
  legacy_id,
  legacy_parent_id,
  legacy_reference_code,
  customer_name,
  support_status,
  import_status,
  validation_notes
FROM staging_legacy_support_records
WHERE batch_id = @support_batch_id
  AND import_status <> 'IMPORTED'
ORDER BY support_type, id
LIMIT 30;

SELECT 'Final Trouble Ticket Production Summary' AS review_section;
SELECT
  category,
  status,
  COUNT(*) AS total_rows
FROM support_trouble_tickets
WHERE id IN (
  SELECT target_trouble_ticket_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'TROUBLE_TICKET'
    AND target_trouble_ticket_id IS NOT NULL
)
GROUP BY category, status
ORDER BY category, status;

SELECT 'Final Trouble Ticket Production Sample' AS review_section;
SELECT
  tt.id,
  tt.ticket_code,
  tt.customer_name,
  tt.category,
  tt.type,
  tt.status,
  tt.problem_category,
  tt.resolution_action,
  tt.opened_at,
  tt.closed_at
FROM support_trouble_tickets tt
WHERE tt.id IN (
  SELECT target_trouble_ticket_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'TROUBLE_TICKET'
    AND target_trouble_ticket_id IS NOT NULL
)
ORDER BY tt.id DESC
LIMIT 15;

SELECT 'Final Isolation Production Summary' AS review_section;
SELECT
  status,
  COUNT(*) AS total_rows,
  SUM(subscription_id IS NOT NULL) AS linked_subscription_rows,
  SUM(is_archived = 1) AS archived_rows
FROM support_isolations
WHERE id IN (
  SELECT target_isolation_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'ISOLATION'
    AND target_isolation_id IS NOT NULL
)
GROUP BY status
ORDER BY status;

SELECT 'Final Isolation Production Sample' AS review_section;
SELECT
  si.id,
  si.subscription_id,
  si.customer_name,
  si.customer_phone,
  si.marketing_name,
  si.radbox_name,
  si.isolation_date,
  si.status,
  si.restoration_date
FROM support_isolations si
WHERE si.id IN (
  SELECT target_isolation_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'ISOLATION'
    AND target_isolation_id IS NOT NULL
)
ORDER BY si.id DESC
LIMIT 15;

SELECT 'Final Dismantle Queue Production Summary' AS review_section;
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT isolation_id) AS distinct_isolation_rows
FROM support_dismantle_queue
WHERE id IN (
  SELECT target_dismantle_queue_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'DISMANTLE_QUEUE'
    AND target_dismantle_queue_id IS NOT NULL
);

SELECT 'Final Dismantle Queue Production Sample' AS review_section;
SELECT
  dq.id,
  dq.isolation_id,
  si.customer_name,
  dq.transfer_note,
  dq.transferred_by_username,
  dq.transferred_at
FROM support_dismantle_queue dq
LEFT JOIN support_isolations si
  ON si.id = dq.isolation_id
WHERE dq.id IN (
  SELECT target_dismantle_queue_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'DISMANTLE_QUEUE'
    AND target_dismantle_queue_id IS NOT NULL
)
ORDER BY dq.id DESC
LIMIT 15;

SELECT 'Final Dismantle History Production Summary' AS review_section;
SELECT
  COUNT(*) AS total_rows,
  SUM(isolation_id IS NOT NULL) AS linked_isolation_rows,
  SUM(isolation_id IS NULL) AS legacy_fallback_rows
FROM support_dismantle_history
WHERE id IN (
  SELECT target_dismantle_history_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'DISMANTLE_HISTORY'
    AND target_dismantle_history_id IS NOT NULL
);

SELECT 'Final Dismantle History Production Sample' AS review_section;
SELECT
  dh.id,
  dh.isolation_id,
  dh.customer_name,
  dh.customer_phone,
  dh.marketing_name,
  dh.closed_at,
  dh.close_note
FROM support_dismantle_history dh
WHERE dh.id IN (
  SELECT target_dismantle_history_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'DISMANTLE_HISTORY'
    AND target_dismantle_history_id IS NOT NULL
)
ORDER BY dh.id DESC
LIMIT 15;
