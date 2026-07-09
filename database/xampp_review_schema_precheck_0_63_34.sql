USE erp_isp_review;

SELECT 'inventory_stock_movements' AS tableName,
       item_id AS k1,
       COALESCE(reference_no, '') AS k2,
       movement_type AS k3,
       qty AS k4,
       COUNT(*) AS duplicateCount
FROM inventory_stock_movements
GROUP BY item_id, COALESCE(reference_no, ''), movement_type, qty
HAVING COUNT(*) > 1;

SELECT 'crm_customer_addresses_primary' AS tableName,
       customer_id AS k1,
       COUNT(*) AS duplicateCount
FROM crm_customer_addresses
WHERE is_primary = 1
GROUP BY customer_id
HAVING COUNT(*) > 1;

SELECT 'support_trouble_ticket_photos' AS tableName,
       trouble_ticket_id AS k1,
       photo_path AS k2,
       COUNT(*) AS duplicateCount
FROM support_trouble_ticket_photos
GROUP BY trouble_ticket_id, photo_path
HAVING COUNT(*) > 1;

SELECT 'support_isolations' AS tableName,
       customer_name AS k1,
       isolation_date AS k2,
       COUNT(*) AS duplicateCount
FROM support_isolations
GROUP BY customer_name, isolation_date
HAVING COUNT(*) > 1;

SELECT 'support_dismantle_history' AS tableName,
       customer_name AS k1,
       closed_at AS k2,
       COUNT(*) AS duplicateCount
FROM support_dismantle_history
GROUP BY customer_name, closed_at
HAVING COUNT(*) > 1;

SELECT 'hr_loans' AS tableName,
       employee_id AS k1,
       loan_date AS k2,
       amount AS k3,
       loan_type AS k4,
       COUNT(*) AS duplicateCount
FROM hr_loans
GROUP BY employee_id, loan_date, amount, loan_type
HAVING COUNT(*) > 1;

SELECT 'billing_invoice_items' AS tableName,
       invoice_id AS k1,
       description AS k2,
       line_total AS k3,
       COUNT(*) AS duplicateCount
FROM billing_invoice_items
GROUP BY invoice_id, description, line_total
HAVING COUNT(*) > 1;

SELECT 'billing_payments' AS tableName,
       invoice_id AS k1,
       IFNULL(payment_no, '') AS k2,
       amount AS k3,
       COUNT(*) AS duplicateCount
FROM billing_payments
GROUP BY invoice_id, IFNULL(payment_no, ''), amount
HAVING COUNT(*) > 1;

SELECT 'billing_collection_actions' AS tableName,
       invoice_id AS k1,
       action_at AS k2,
       action_type AS k3,
       COUNT(*) AS duplicateCount
FROM billing_collection_actions
GROUP BY invoice_id, action_at, action_type
HAVING COUNT(*) > 1;
