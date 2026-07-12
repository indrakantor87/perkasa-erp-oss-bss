-- Jalankan file ini setelah `xampp_review_schema.sql`
-- Ditujukan untuk database review yang berasal dari schema dasar, bukan untuk re-run berulang tanpa penyesuaian.

USE erp_isp_review;

ALTER TABLE auth_users
  ADD COLUMN employee_id BIGINT UNSIGNED NULL AFTER role_id,
  ADD KEY idx_auth_users_employee_id (employee_id),
  ADD CONSTRAINT fk_auth_users_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id);

CREATE TABLE IF NOT EXISTS sales_covered_areas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  area_code VARCHAR(50) NOT NULL,
  area_name VARCHAR(150) NOT NULL,
  village VARCHAR(120) NULL,
  district VARCHAR(120) NULL,
  city VARCHAR(120) NULL,
  province VARCHAR(120) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  coverage_status ENUM('PLANNED','AVAILABLE','LIMITED','UNAVAILABLE') NOT NULL DEFAULT 'PLANNED',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_covered_areas_code (area_code),
  CONSTRAINT fk_sales_covered_areas_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id)
);

CREATE TABLE IF NOT EXISTS sales_marketing_activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  activity_date DATETIME NOT NULL,
  marketing_name VARCHAR(120) NOT NULL,
  activity_type VARCHAR(150) NOT NULL,
  notes TEXT NULL,
  source_system ENUM('WEB_PSB','FINANCE','GA') NOT NULL DEFAULT 'WEB_PSB',
  legacy_id VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_marketing_activities_source_legacy (source_system, legacy_id),
  KEY idx_sales_marketing_activities_branch_date (branch_id, activity_date),
  CONSTRAINT fk_sales_marketing_activities_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id)
);

CREATE TABLE IF NOT EXISTS sales_marketing_activity_areas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  activity_id BIGINT UNSIGNED NOT NULL,
  covered_area_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_marketing_activity_areas_pair (activity_id, covered_area_id),
  KEY idx_sales_marketing_activity_areas_sort (activity_id, sort_order),
  CONSTRAINT fk_sales_marketing_activity_areas_activity FOREIGN KEY (activity_id) REFERENCES sales_marketing_activities(id),
  CONSTRAINT fk_sales_marketing_activity_areas_covered_area FOREIGN KEY (covered_area_id) REFERENCES sales_covered_areas(id)
);

CREATE TABLE IF NOT EXISTS sales_surveys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  covered_area_id BIGINT UNSIGNED NULL,
  survey_no VARCHAR(50) NOT NULL,
  survey_type ENUM('HOME','DEDICATED','RESELLER') NOT NULL DEFAULT 'HOME',
  survey_status ENUM('REQUESTED','SCHEDULED','ON_PROGRESS','DONE','CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  feasibility_status ENUM('PENDING','FEASIBLE','NOT_FEASIBLE','NEED_REVIEW') NOT NULL DEFAULT 'PENDING',
  requested_by_user_id BIGINT UNSIGNED NULL,
  assigned_employee_id BIGINT UNSIGNED NULL,
  scheduled_at DATETIME NULL,
  surveyed_at DATETIME NULL,
  site_address TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  technical_notes TEXT NULL,
  customer_request_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_surveys_no (survey_no),
  CONSTRAINT fk_sales_surveys_lead FOREIGN KEY (lead_id) REFERENCES sales_leads(id),
  CONSTRAINT fk_sales_surveys_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id),
  CONSTRAINT fk_sales_surveys_covered_area FOREIGN KEY (covered_area_id) REFERENCES sales_covered_areas(id),
  CONSTRAINT fk_sales_surveys_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES auth_users(id),
  CONSTRAINT fk_sales_surveys_assigned_employee FOREIGN KEY (assigned_employee_id) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS sales_survey_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  survey_id BIGINT UNSIGNED NOT NULL,
  photo_path VARCHAR(255) NOT NULL,
  photo_type ENUM('LOCATION','ODP','INDOOR','OUTDOOR','OTHER') NOT NULL DEFAULT 'OTHER',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sales_survey_photos_survey FOREIGN KEY (survey_id) REFERENCES sales_surveys(id)
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT UNSIGNED NOT NULL,
  invoice_no VARCHAR(50) NOT NULL,
  invoice_type ENUM('INSTALLATION','RECURRING','ADJUSTMENT','TERMINATION') NOT NULL DEFAULT 'RECURRING',
  billing_month TINYINT UNSIGNED NULL,
  billing_year SMALLINT UNSIGNED NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  invoice_status ENUM('DRAFT','ISSUED','PARTIAL','PAID','OVERDUE','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  collection_status ENUM('NORMAL','REMINDER','PROMISE_TO_PAY','SUSPEND','FIELD_VISIT','CLOSED') NOT NULL DEFAULT 'NORMAL',
  suspend_candidate TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_invoices_no (invoice_no),
  KEY idx_billing_invoices_subscription_period (subscription_id, billing_year, billing_month),
  CONSTRAINT fk_billing_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id)
);

CREATE TABLE IF NOT EXISTS billing_invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  item_type ENUM('SUBSCRIPTION','INSTALLATION','DEVICE','PENALTY','DISCOUNT','OTHER') NOT NULL DEFAULT 'SUBSCRIPTION',
  description VARCHAR(255) NOT NULL,
  qty DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_invoice_items_bk (invoice_id, description, line_total),
  CONSTRAINT fk_billing_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id)
);

CREATE TABLE IF NOT EXISTS billing_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  payment_no VARCHAR(50) NULL,
  payment_no_norm VARCHAR(50)
    GENERATED ALWAYS AS (IFNULL(payment_no,'')) STORED,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method ENUM('CASH','TRANSFER','EWALLET','VA','OTHER') NOT NULL DEFAULT 'TRANSFER',
  reference_no VARCHAR(100) NULL,
  received_by_user_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_payments_no (payment_no),
  UNIQUE KEY uq_billing_payments_bk (invoice_id, payment_no_norm, amount),
  CONSTRAINT fk_billing_payments_invoice FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id),
  CONSTRAINT fk_billing_payments_received_by FOREIGN KEY (received_by_user_id) REFERENCES auth_users(id)
);

CREATE TABLE IF NOT EXISTS billing_collection_actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  action_type ENUM('REMINDER','CALL','VISIT','PROMISE_TO_PAY','SUSPEND','RECONNECT','WRITE_OFF') NOT NULL DEFAULT 'REMINDER',
  action_status ENUM('OPEN','DONE','CANCELLED') NOT NULL DEFAULT 'OPEN',
  action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_follow_up_at DATETIME NULL,
  handled_by_user_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_collection_actions_bk (invoice_id, action_at, action_type),
  CONSTRAINT fk_billing_collection_actions_invoice FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id),
  CONSTRAINT fk_billing_collection_actions_handled_by FOREIGN KEY (handled_by_user_id) REFERENCES auth_users(id)
);

CREATE TABLE IF NOT EXISTS network_odp_ports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  odp_id BIGINT UNSIGNED NOT NULL,
  port_no INT NOT NULL,
  port_status ENUM('AVAILABLE','USED','RESERVED','FAULTY','DISABLED') NOT NULL DEFAULT 'AVAILABLE',
  splitter_slot VARCHAR(50) NULL,
  core_label VARCHAR(50) NULL,
  subscription_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  installed_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_network_odp_ports_odp_port (odp_id, port_no),
  CONSTRAINT fk_network_odp_ports_odp FOREIGN KEY (odp_id) REFERENCES network_odp(id),
  CONSTRAINT fk_network_odp_ports_subscription FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id),
  CONSTRAINT fk_network_odp_ports_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id)
);

CREATE TABLE IF NOT EXISTS service_device_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT UNSIGNED NULL,
  work_order_id BIGINT UNSIGNED NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  serial_number VARCHAR(100) NULL,
  mac_address VARCHAR(100) NULL,
  assignment_status ENUM('ASSIGNED','RETURNED','DAMAGED','LOST') NOT NULL DEFAULT 'ASSIGNED',
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  returned_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_service_device_assignments_subscription FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id),
  CONSTRAINT fk_service_device_assignments_work_order FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id),
  CONSTRAINT fk_service_device_assignments_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_service_device_assignments_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id)
);
