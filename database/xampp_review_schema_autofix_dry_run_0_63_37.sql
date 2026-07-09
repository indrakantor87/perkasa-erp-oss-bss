USE erp_isp_review;

SET SESSION group_concat_max_len = 20000;

SELECT 'crm_customer_addresses_primary_update' AS actionName,
       customer_id AS customerId,
       MIN(id) AS keepId,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS affectedIds,
       COUNT(*) AS duplicateCount
FROM crm_customer_addresses
WHERE is_primary = 1
GROUP BY customer_id
HAVING COUNT(*) > 1;

SELECT 'support_trouble_ticket_photos_delete' AS actionName,
       trouble_ticket_id AS troubleTicketId,
       photo_path AS photoPath,
       MIN(id) AS keepId,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS affectedIds,
       COUNT(*) AS duplicateCount
FROM support_trouble_ticket_photos
GROUP BY trouble_ticket_id, photo_path
HAVING COUNT(*) > 1;

SELECT 'billing_invoice_items_delete' AS actionName,
       invoice_id AS invoiceId,
       description,
       line_total AS lineTotal,
       MIN(id) AS keepId,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS affectedIds,
       COUNT(*) AS duplicateCount
FROM billing_invoice_items
GROUP BY invoice_id, description, line_total
HAVING COUNT(*) > 1;

SELECT 'billing_payments_delete' AS actionName,
       invoice_id AS invoiceId,
       IFNULL(payment_no, '') AS paymentNoNorm,
       amount,
       MIN(id) AS keepId,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS affectedIds,
       COUNT(*) AS duplicateCount
FROM billing_payments
GROUP BY invoice_id, IFNULL(payment_no, ''), amount
HAVING COUNT(*) > 1;

SELECT 'billing_collection_actions_delete' AS actionName,
       invoice_id AS invoiceId,
       action_at AS actionAt,
       action_type AS actionType,
       MIN(id) AS keepId,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS affectedIds,
       COUNT(*) AS duplicateCount
FROM billing_collection_actions
GROUP BY invoice_id, action_at, action_type
HAVING COUNT(*) > 1;
