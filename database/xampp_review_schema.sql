CREATE DATABASE IF NOT EXISTS erp_isp_review
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE erp_isp_review;

CREATE TABLE IF NOT EXISTS org_branches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  address TEXT NULL,
  phone VARCHAR(30) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_org_branches_code (code)
);

CREATE TABLE IF NOT EXISTS org_divisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_org_divisions_code (code)
);

CREATE TABLE IF NOT EXISTS auth_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_roles_code (code)
);

CREATE TABLE IF NOT EXISTS auth_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_permissions_code (code)
);

CREATE TABLE IF NOT EXISTS auth_role_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_role_permissions (role_id, permission_id),
  CONSTRAINT fk_auth_role_permissions_role FOREIGN KEY (role_id) REFERENCES auth_roles(id),
  CONSTRAINT fk_auth_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES auth_permissions(id)
);

CREATE TABLE IF NOT EXISTS auth_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  division_id BIGINT UNSIGNED NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(150) NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_users_username (username),
  UNIQUE KEY uq_auth_users_email (email),
  CONSTRAINT fk_auth_users_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id),
  CONSTRAINT fk_auth_users_division FOREIGN KEY (division_id) REFERENCES org_divisions(id),
  CONSTRAINT fk_auth_users_role FOREIGN KEY (role_id) REFERENCES auth_roles(id)
);

CREATE TABLE IF NOT EXISTS crm_customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_code VARCHAR(50) NOT NULL,
  customer_type ENUM('HOME','CORPORATE','RESELLER') NOT NULL DEFAULT 'HOME',
  full_name VARCHAR(150) NOT NULL,
  identity_no VARCHAR(50) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  branch_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_customers_code (customer_code),
  CONSTRAINT fk_crm_customers_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id)
);

CREATE TABLE IF NOT EXISTS crm_customer_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  maps_url TEXT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_crm_customer_addresses_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id)
);

CREATE TABLE IF NOT EXISTS sales_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  service_type ENUM('HOME','DEDICATED','RESELLER') NOT NULL DEFAULT 'HOME',
  speed_label VARCHAR(80) NULL,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_packages_code (code)
);

CREATE TABLE IF NOT EXISTS sales_leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  source VARCHAR(80) NULL,
  lead_type ENUM('HOME','CORPORATE','RESELLER') NOT NULL DEFAULT 'HOME',
  customer_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  marketing_name VARCHAR(120) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sales_leads_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id)
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  package_id BIGINT UNSIGNED NULL,
  order_no VARCHAR(50) NOT NULL,
  order_type ENUM('NEW_INSTALL','UPGRADE','DOWNGRADE','RELOCATION','TERMINATION') NOT NULL DEFAULT 'NEW_INSTALL',
  status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
  request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_installation_at DATETIME NULL,
  marketing_name VARCHAR(120) NULL,
  teknisi_name VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_orders_order_no (order_no),
  CONSTRAINT fk_sales_orders_lead FOREIGN KEY (lead_id) REFERENCES sales_leads(id),
  CONSTRAINT fk_sales_orders_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id),
  CONSTRAINT fk_sales_orders_package FOREIGN KEY (package_id) REFERENCES sales_packages(id)
);

CREATE TABLE IF NOT EXISTS service_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  package_id BIGINT UNSIGNED NOT NULL,
  service_no VARCHAR(50) NOT NULL,
  status ENUM('PENDING','ACTIVE','SUSPENDED','TERMINATED') NOT NULL DEFAULT 'PENDING',
  activated_at DATETIME NULL,
  terminated_at DATETIME NULL,
  monthly_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_subscriptions_service_no (service_no),
  CONSTRAINT fk_service_subscriptions_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id),
  CONSTRAINT fk_service_subscriptions_order FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  CONSTRAINT fk_service_subscriptions_package FOREIGN KEY (package_id) REFERENCES sales_packages(id)
);

CREATE TABLE IF NOT EXISTS service_work_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sales_order_id BIGINT UNSIGNED NULL,
  subscription_id BIGINT UNSIGNED NULL,
  work_order_no VARCHAR(50) NOT NULL,
  work_type ENUM('INSTALLATION','REPAIR','DISMANTLE','RELOCATION') NOT NULL DEFAULT 'INSTALLATION',
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  technician_name VARCHAR(120) NULL,
  scheduled_at DATETIME NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_work_orders_no (work_order_no),
  CONSTRAINT fk_service_work_orders_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
  CONSTRAINT fk_service_work_orders_subscription FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id)
);

CREATE TABLE IF NOT EXISTS inventory_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_categories_code (code)
);

CREATE TABLE IF NOT EXISTS inventory_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_units_code (code)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NULL,
  unit_id BIGINT UNSIGNED NULL,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  barcode VARCHAR(50) NULL,
  default_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  minimum_stock INT NOT NULL DEFAULT 0,
  current_stock INT NOT NULL DEFAULT 0,
  photo_path VARCHAR(255) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_items_code (item_code),
  CONSTRAINT fk_inventory_items_category FOREIGN KEY (category_id) REFERENCES inventory_categories(id),
  CONSTRAINT fk_inventory_items_unit FOREIGN KEY (unit_id) REFERENCES inventory_units(id)
);

CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  work_order_id BIGINT UNSIGNED NULL,
  movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
  reference_no VARCHAR(50) NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  movement_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_inventory_stock_movements_item FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_inventory_stock_movements_work_order FOREIGN KEY (work_order_id) REFERENCES service_work_orders(id)
);

CREATE TABLE IF NOT EXISTS network_odp (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  location_text TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  total_ports INT NOT NULL DEFAULT 0,
  active_ports INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_network_odp_code (code)
);

CREATE TABLE IF NOT EXISTS support_trouble_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT UNSIGNED NULL,
  ticket_code VARCHAR(50) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_user VARCHAR(150) NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'TT',
  type VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  problem_category VARCHAR(120) NULL,
  resolution_action VARCHAR(120) NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  notes TEXT NULL,
  close_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_support_trouble_tickets_code (ticket_code),
  CONSTRAINT fk_support_trouble_tickets_subscription FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id)
);

CREATE TABLE IF NOT EXISTS support_trouble_ticket_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  trouble_ticket_id BIGINT UNSIGNED NOT NULL,
  photo_path VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_support_trouble_ticket_photos_ticket FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id)
);

CREATE TABLE IF NOT EXISTS support_trouble_ticket_sla (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  trouble_type VARCHAR(100) NOT NULL,
  duration_days INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_support_trouble_ticket_sla_type (trouble_type)
);

CREATE TABLE IF NOT EXISTS support_isolations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_address TEXT NULL,
  customer_phone VARCHAR(30) NULL,
  marketing_name VARCHAR(120) NULL,
  radbox_name VARCHAR(120) NULL,
  package_price DECIMAL(15,2) NULL,
  isolation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT NULL,
  status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  restoration_date DATETIME NULL,
  close_note TEXT NULL,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_support_isolations_subscription FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id)
);

CREATE TABLE IF NOT EXISTS support_dismantle_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  isolation_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_address TEXT NULL,
  customer_phone VARCHAR(30) NULL,
  marketing_name VARCHAR(120) NULL,
  radbox_name VARCHAR(120) NULL,
  closed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  close_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_support_dismantle_history_isolation FOREIGN KEY (isolation_id) REFERENCES support_isolations(id)
);

CREATE TABLE IF NOT EXISTS hr_employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id BIGINT UNSIGNED NULL,
  division_id BIGINT UNSIGNED NULL,
  employee_code VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  position_name VARCHAR(120) NULL,
  employment_status VARCHAR(50) NOT NULL DEFAULT 'KARYAWAN',
  join_date DATE NULL,
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  phone VARCHAR(30) NULL,
  whatsapp VARCHAR(30) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hr_employees_code (employee_code),
  CONSTRAINT fk_hr_employees_branch FOREIGN KEY (branch_id) REFERENCES org_branches(id),
  CONSTRAINT fk_hr_employees_division FOREIGN KEY (division_id) REFERENCES org_divisions(id)
);

CREATE TABLE IF NOT EXISTS hr_attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in DATETIME NULL,
  check_out DATETIME NULL,
  status ENUM('PRESENT','SICK','PERMIT','ALPHA') NOT NULL DEFAULT 'PRESENT',
  overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  locked_by_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hr_attendance_employee_date (employee_id, attendance_date),
  CONSTRAINT fk_hr_attendance_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS hr_salary_slips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  payroll_month TINYINT UNSIGNED NOT NULL,
  payroll_year SMALLINT UNSIGNED NOT NULL,
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  attendance_allowance DECIMAL(15,2) NOT NULL DEFAULT 0,
  overtime_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  performance_bonus DECIMAL(15,2) NOT NULL DEFAULT 0,
  position_allowance DECIMAL(15,2) NOT NULL DEFAULT 0,
  loan_deduction DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_income DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_deduction DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  released_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hr_salary_slips_period_employee (employee_id, payroll_month, payroll_year),
  CONSTRAINT fk_hr_salary_slips_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS hr_loans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  loan_type VARCHAR(50) NOT NULL DEFAULT 'KASBON',
  amount DECIMAL(15,2) NOT NULL,
  monthly_installment DECIMAL(15,2) NOT NULL DEFAULT 0,
  description TEXT NULL,
  loan_date DATE NOT NULL,
  status ENUM('PENDING','ACTIVE','REJECTED','PAID') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_hr_loans_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);
