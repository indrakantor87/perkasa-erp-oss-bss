USE erp_isp_review;

SET @db_name = DATABASE();

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'crm_customer_addresses'
  AND column_name = 'primary_customer_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE crm_customer_addresses ADD COLUMN primary_customer_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN is_primary = 1 THEN customer_id ELSE NULL END) STORED",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'crm_customer_addresses'
  AND index_name = 'uq_crm_customer_addresses_primary';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE crm_customer_addresses ADD UNIQUE KEY uq_crm_customer_addresses_primary (primary_customer_id)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND index_name = 'uq_inventory_stock_movements_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD UNIQUE KEY uq_inventory_stock_movements_bk (item_id, reference_no, movement_type, qty)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'support_trouble_ticket_photos'
  AND index_name = 'uq_support_trouble_ticket_photos_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE support_trouble_ticket_photos ADD UNIQUE KEY uq_support_trouble_ticket_photos_bk (trouble_ticket_id, photo_path)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'support_isolations'
  AND index_name = 'uq_support_isolations_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE support_isolations ADD UNIQUE KEY uq_support_isolations_bk (customer_name, isolation_date)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'support_dismantle_history'
  AND index_name = 'uq_support_dismantle_history_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE support_dismantle_history ADD UNIQUE KEY uq_support_dismantle_history_bk (customer_name, closed_at)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'hr_loans'
  AND index_name = 'uq_hr_loans_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE hr_loans ADD UNIQUE KEY uq_hr_loans_bk (employee_id, loan_date, amount, loan_type)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'billing_invoice_items'
  AND index_name = 'uq_billing_invoice_items_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE billing_invoice_items ADD UNIQUE KEY uq_billing_invoice_items_bk (invoice_id, description, line_total)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'billing_payments'
  AND column_name = 'payment_no_norm';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE billing_payments ADD COLUMN payment_no_norm VARCHAR(50) GENERATED ALWAYS AS (IFNULL(payment_no,'')) STORED",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'billing_payments'
  AND index_name = 'uq_billing_payments_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE billing_payments ADD UNIQUE KEY uq_billing_payments_bk (invoice_id, payment_no_norm, amount)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'billing_collection_actions'
  AND index_name = 'uq_billing_collection_actions_bk';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE billing_collection_actions ADD UNIQUE KEY uq_billing_collection_actions_bk (invoice_id, action_at, action_type)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
