USE erp_isp_review;

SET @confirm_apply = 0;

START TRANSACTION;

UPDATE crm_customer_addresses a
JOIN (
  SELECT customer_id, MIN(id) AS keep_id
  FROM crm_customer_addresses
  WHERE is_primary = 1
  GROUP BY customer_id
  HAVING COUNT(*) > 1
) d
  ON d.customer_id = a.customer_id
SET a.is_primary = CASE WHEN a.id = d.keep_id THEN 1 ELSE 0 END
WHERE a.is_primary = 1;

DELETE t
FROM support_trouble_ticket_photos t
JOIN (
  SELECT MIN(id) AS keep_id, trouble_ticket_id, photo_path
  FROM support_trouble_ticket_photos
  GROUP BY trouble_ticket_id, photo_path
  HAVING COUNT(*) > 1
) d
  ON d.trouble_ticket_id = t.trouble_ticket_id
 AND d.photo_path = t.photo_path
 AND t.id <> d.keep_id;

DELETE i
FROM billing_invoice_items i
JOIN (
  SELECT MIN(id) AS keep_id, invoice_id, description, line_total
  FROM billing_invoice_items
  GROUP BY invoice_id, description, line_total
  HAVING COUNT(*) > 1
) d
  ON d.invoice_id = i.invoice_id
 AND d.description = i.description
 AND d.line_total = i.line_total
 AND i.id <> d.keep_id;

DELETE p
FROM billing_payments p
JOIN (
  SELECT MIN(id) AS keep_id, invoice_id, IFNULL(payment_no, '') AS payment_no_norm, amount
  FROM billing_payments
  GROUP BY invoice_id, IFNULL(payment_no, ''), amount
  HAVING COUNT(*) > 1
) d
  ON d.invoice_id = p.invoice_id
 AND d.payment_no_norm = IFNULL(p.payment_no, '')
 AND d.amount = p.amount
 AND p.id <> d.keep_id;

DELETE a
FROM billing_collection_actions a
JOIN (
  SELECT MIN(id) AS keep_id, invoice_id, action_at, action_type
  FROM billing_collection_actions
  GROUP BY invoice_id, action_at, action_type
  HAVING COUNT(*) > 1
) d
  ON d.invoice_id = a.invoice_id
 AND d.action_at = a.action_at
 AND d.action_type = a.action_type
 AND a.id <> d.keep_id;

SET @sql = IF(@confirm_apply = 1, 'COMMIT', 'ROLLBACK');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT IF(@confirm_apply = 1, 'AUTOFIX APPLIED (COMMIT)', 'AUTOFIX SKIPPED (ROLLBACK)') AS result;
