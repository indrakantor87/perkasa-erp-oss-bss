USE erp_isp_review;

SET @db_name = DATABASE();

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'trouble_ticket_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN trouble_ticket_id BIGINT UNSIGNED NULL AFTER subscription_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'branch_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER trouble_ticket_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'job_category';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN job_category VARCHAR(50) NULL AFTER work_type",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'priority';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM' AFTER status",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'source_type';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN source_type ENUM('SALES_ORDER','TROUBLE_TICKET','MANUAL') NULL AFTER priority",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'current_pic_user_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN current_pic_user_id BIGINT UNSIGNED NULL AFTER technician_name",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'scheduled_by_user_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN scheduled_by_user_id BIGINT UNSIGNED NULL AFTER current_pic_user_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'closed_by_user_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN closed_by_user_id BIGINT UNSIGNED NULL AFTER scheduled_by_user_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'sla_due_at';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN sla_due_at DATETIME NULL AFTER scheduled_at",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'address';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN address TEXT NULL AFTER notes",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'latitude';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN latitude DECIMAL(10,7) NULL AFTER address",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND column_name = 'longitude';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND index_name = 'idx_service_work_orders_ticket';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD KEY idx_service_work_orders_ticket (trouble_ticket_id)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.STATISTICS
WHERE table_schema = @db_name
  AND table_name = 'service_work_orders'
  AND index_name = 'idx_service_work_orders_branch_status';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE service_work_orders ADD KEY idx_service_work_orders_branch_status (branch_id, status)",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS service_work_order_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id BIGINT UNSIGNED NOT NULL,
  assigned_user_id BIGINT UNSIGNED NOT NULL,
  assignment_role VARCHAR(50) NOT NULL DEFAULT 'TECHNICIAN',
  assignment_status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  released_at DATETIME NULL,
  notes TEXT NULL,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_swo_assignments_wo (work_order_id),
  KEY idx_swo_assignments_user (assigned_user_id),
  KEY idx_swo_assignments_status (assignment_status),
  CONSTRAINT fk_swo_assignments_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id),
  CONSTRAINT fk_swo_assignments_user FOREIGN KEY (assigned_user_id) REFERENCES auth_users(id)
);

CREATE TABLE IF NOT EXISTS service_work_order_status_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(50) NULL,
  to_status VARCHAR(50) NOT NULL,
  reason_code VARCHAR(50) NULL,
  reason_notes TEXT NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_swo_status_logs_wo (work_order_id),
  KEY idx_swo_status_logs_status (to_status),
  CONSTRAINT fk_swo_status_logs_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id)
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  parent_location_id BIGINT UNSIGNED NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  location_code VARCHAR(50) NOT NULL,
  location_name VARCHAR(150) NOT NULL,
  location_type ENUM('WAREHOUSE','BRANCH','TECHNICIAN','VEHICLE','SITE','CUSTOMER_PREMISES','TRANSIT') NOT NULL,
  vehicle_identifier VARCHAR(100) NULL,
  address TEXT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_locations_code (location_code),
  KEY idx_inventory_locations_branch (branch_id),
  KEY idx_inventory_locations_parent (parent_location_id),
  KEY idx_inventory_locations_user (assigned_user_id),
  KEY idx_inventory_locations_type (location_type),
  CONSTRAINT fk_inventory_locations_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id),
  CONSTRAINT fk_inventory_locations_parent FOREIGN KEY (parent_location_id) REFERENCES inventory_locations(id),
  CONSTRAINT fk_inventory_locations_user FOREIGN KEY (assigned_user_id) REFERENCES auth_users(id)
);

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'trouble_ticket_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN trouble_ticket_id BIGINT UNSIGNED NULL AFTER work_order_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'request_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN request_id BIGINT UNSIGNED NULL AFTER trouble_ticket_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'from_location_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN from_location_id BIGINT UNSIGNED NULL AFTER request_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'to_location_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN to_location_id BIGINT UNSIGNED NULL AFTER from_location_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'technician_user_id';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN technician_user_id BIGINT UNSIGNED NULL AFTER to_location_id",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'reference_type';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN reference_type ENUM('WORK_ORDER','TROUBLE_TICKET','REQUEST','MANUAL','PURCHASE_RECEIPT') NULL AFTER movement_type",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = 0;
SELECT COUNT(*) INTO @exists
FROM information_schema.COLUMNS
WHERE table_schema = @db_name
  AND table_name = 'inventory_stock_movements'
  AND column_name = 'movement_status';
SET @sql = IF(
  @exists = 0,
  "ALTER TABLE inventory_stock_movements ADD COLUMN movement_status ENUM('POSTED','CANCELED') NOT NULL DEFAULT 'POSTED' AFTER reference_type",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS inventory_item_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_code VARCHAR(40) NOT NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  work_order_id BIGINT UNSIGNED NULL,
  trouble_ticket_id BIGINT UNSIGNED NULL,
  requested_by_user_id BIGINT UNSIGNED NULL,
  processed_by_user_id BIGINT UNSIGNED NULL,
  request_qty INT UNSIGNED NOT NULL DEFAULT 1,
  request_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  request_status VARCHAR(30) NOT NULL DEFAULT 'REQUEST',
  requested_division VARCHAR(120) NULL,
  requested_subdivision VARCHAR(150) NULL,
  requested_for VARCHAR(150) NULL,
  request_notes TEXT NULL,
  pending_reason TEXT NULL,
  requested_by VARCHAR(120) NOT NULL,
  processed_by VARCHAR(120) NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_item_requests_code (request_code),
  KEY idx_inventory_item_requests_status (request_status),
  KEY idx_inventory_item_requests_item (inventory_item_id),
  KEY idx_inventory_item_requests_wo (work_order_id),
  KEY idx_inventory_item_requests_ticket (trouble_ticket_id),
  CONSTRAINT fk_inventory_item_requests_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_inventory_item_requests_wo FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id),
  CONSTRAINT fk_inventory_item_requests_ticket FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id),
  CONSTRAINT fk_inventory_item_requests_req_user FOREIGN KEY (requested_by_user_id) REFERENCES auth_users(id),
  CONSTRAINT fk_inventory_item_requests_proc_user FOREIGN KEY (processed_by_user_id) REFERENCES auth_users(id)
);

