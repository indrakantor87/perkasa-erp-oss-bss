USE erp_isp_review;

SET SESSION group_concat_max_len = 20000;

SELECT 'inventory_stock_movements' AS tableName,
       item_id AS itemId,
       COALESCE(reference_no, '') AS referenceNo,
       movement_type AS movementType,
       qty,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM inventory_stock_movements
GROUP BY item_id, COALESCE(reference_no, ''), movement_type, qty
HAVING COUNT(*) > 1;

SELECT 'crm_customer_addresses_primary' AS tableName,
       customer_id AS customerId,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM crm_customer_addresses
WHERE is_primary = 1
GROUP BY customer_id
HAVING COUNT(*) > 1;

SELECT 'support_trouble_ticket_photos' AS tableName,
       trouble_ticket_id AS troubleTicketId,
       photo_path AS photoPath,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM support_trouble_ticket_photos
GROUP BY trouble_ticket_id, photo_path
HAVING COUNT(*) > 1;

SELECT 'support_isolations' AS tableName,
       customer_name AS customerName,
       isolation_date AS isolationDate,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM support_isolations
GROUP BY customer_name, isolation_date
HAVING COUNT(*) > 1;

SELECT 'support_dismantle_history' AS tableName,
       customer_name AS customerName,
       closed_at AS closedAt,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM support_dismantle_history
GROUP BY customer_name, closed_at
HAVING COUNT(*) > 1;

SELECT 'hr_loans' AS tableName,
       employee_id AS employeeId,
       loan_date AS loanDate,
       amount,
       loan_type AS loanType,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM hr_loans
GROUP BY employee_id, loan_date, amount, loan_type
HAVING COUNT(*) > 1;

SELECT 'billing_invoice_items' AS tableName,
       invoice_id AS invoiceId,
       description,
       line_total AS lineTotal,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM billing_invoice_items
GROUP BY invoice_id, description, line_total
HAVING COUNT(*) > 1;

SELECT 'billing_payments' AS tableName,
       invoice_id AS invoiceId,
       IFNULL(payment_no, '') AS paymentNoNorm,
       amount,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM billing_payments
GROUP BY invoice_id, IFNULL(payment_no, ''), amount
HAVING COUNT(*) > 1;

SELECT 'billing_collection_actions' AS tableName,
       invoice_id AS invoiceId,
       action_at AS actionAt,
       action_type AS actionType,
       COUNT(*) AS duplicateCount,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS ids
FROM billing_collection_actions
GROUP BY invoice_id, action_at, action_type
HAVING COUNT(*) > 1;
