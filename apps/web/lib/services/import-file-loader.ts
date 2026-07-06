import type { ImportBatch } from '@/lib/types'
import { runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

type ImportSectionKey =
  | 'users'
  | 'customers'
  | 'orders'
  | 'support'
  | 'invoices'
  | 'items'
  | 'payments'
  | 'collections'
  | 'movements'
  | 'employees'
  | 'attendance'
  | 'salaries'
  | 'loans'

type BatchContext = {
  id: number
  batchCode: string
  sourceSystem: ImportBatch['sourceSystem']
  scope: string
}

type ImportSectionDefinition = {
  key: ImportSectionKey
  aliases: string[]
  clearTable: string
  insertRows: (batch: BatchContext, rows: Record<string, unknown>[]) => Promise<number>
}

type ScopeDefinition = {
  scope: string
  sections: ImportSectionDefinition[]
}

type LoadImportFileResult = {
  insertedRows: number
  sectionsLoaded: string[]
  parserType: 'json' | 'workbook'
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getValue(record: Record<string, unknown>, aliases: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (aliases.some((alias) => normalizeKey(alias) === normalizeKey(key))) {
      return value
    }
  }

  return null
}

function toText(value: unknown) {
  if (value == null) return null
  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const normalized = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/,(?=\d{1,2}$)/, '.')
    .replace(/,/g, '')
    .trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toInteger(value: unknown) {
  const parsed = toNumber(value)
  return parsed == null ? null : Math.trunc(parsed)
}

function toBooleanInt(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value === 'boolean') return value ? 1 : 0

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'aktif', 'active'].includes(normalized)) return 1
  if (['0', 'false', 'no', 'n', 'nonaktif', 'inactive'].includes(normalized)) return 0

  return null
}

function toJsonText(value: unknown, fallback: Record<string, unknown>) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return JSON.stringify(fallback)
}

function buildNormalizedKey(record: Record<string, unknown>, fields: string[]) {
  const parts = fields.map((field) => toText(getValue(record, [field]))).filter(Boolean)
  return parts.length ? parts.join('|').toLowerCase() : null
}

async function insertUserRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0

  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_user_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_role,
          legacy_division,
          full_name,
          username,
          email,
          phone,
          employee_legacy_id,
          raw_payload,
          normalized_key,
          mapped_role_code,
          mapped_division_code,
          import_status,
          validation_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['source_system', 'sourceSystem'])) || batch.sourceSystem,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_role', 'legacyRole'])),
        toText(getValue(row, ['legacy_division', 'legacyDivision'])),
        toText(getValue(row, ['full_name', 'fullName'])),
        toText(getValue(row, ['username'])),
        toText(getValue(row, ['email'])),
        toText(getValue(row, ['phone'])),
        toText(getValue(row, ['employee_legacy_id', 'employeeLegacyId'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['username', 'email', 'legacy_id']),
        toText(getValue(row, ['mapped_role_code', 'mappedRoleCode'])),
        toText(getValue(row, ['mapped_division_code', 'mappedDivisionCode'])),
      ]
    )
    inserted += 1
  }

  return inserted
}

async function insertCustomerRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0

  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_customer_records (
          batch_id,
          source_system,
          legacy_id,
          customer_name,
          customer_type,
          phone,
          email,
          identity_no,
          address_text,
          maps_url,
          latitude,
          longitude,
          marketing_name,
          branch_code,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        'WEB_PSB',
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['customer_name', 'customerName'])),
        toText(getValue(row, ['customer_type', 'customerType'])),
        toText(getValue(row, ['phone'])),
        toText(getValue(row, ['email'])),
        toText(getValue(row, ['identity_no', 'identityNo'])),
        toText(getValue(row, ['address_text', 'addressText'])),
        toText(getValue(row, ['maps_url', 'mapsUrl'])),
        toNumber(getValue(row, ['latitude'])),
        toNumber(getValue(row, ['longitude'])),
        toText(getValue(row, ['marketing_name', 'marketingName'])),
        toText(getValue(row, ['branch_code', 'branchCode'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['customer_name', 'phone', 'legacy_id']),
      ]
    )
    inserted += 1
  }

  return inserted
}

async function insertOrderRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0

  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_order_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_customer_id,
          legacy_package_name,
          order_no,
          order_type,
          order_status,
          request_date,
          scheduled_installation_at,
          installed_date,
          marketing_name,
          teknisi_name,
          location_map,
          notes,
          raw_payload,
          normalized_key,
          mapped_package_code,
          import_status,
          validation_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        'WEB_PSB',
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_customer_id', 'legacyCustomerId'])),
        toText(getValue(row, ['legacy_package_name', 'legacyPackageName'])),
        toText(getValue(row, ['order_no', 'orderNo'])),
        toText(getValue(row, ['order_type', 'orderType'])),
        toText(getValue(row, ['order_status', 'orderStatus'])),
        toText(getValue(row, ['request_date', 'requestDate'])),
        toText(getValue(row, ['scheduled_installation_at', 'scheduledInstallationAt'])),
        toText(getValue(row, ['installed_date', 'installedDate'])),
        toText(getValue(row, ['marketing_name', 'marketingName'])),
        toText(getValue(row, ['teknisi_name', 'teknisiName'])),
        toText(getValue(row, ['location_map', 'locationMap'])),
        toText(getValue(row, ['notes'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['order_no', 'legacy_id']),
        toText(getValue(row, ['mapped_package_code', 'mappedPackageCode'])),
      ]
    )
    inserted += 1
  }

  return inserted
}

async function insertSupportRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0

  for (const row of rows) {
    const photoList = getValue(row, ['photo_list_text', 'photoListText', 'photo_list'])
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_support_records (
          batch_id,
          source_system,
          support_type,
          legacy_id,
          legacy_customer_id,
          ticket_code,
          customer_name,
          customer_user,
          category,
          trouble_type,
          support_status,
          opened_at,
          closed_at,
          reason_text,
          problem_category,
          resolution_action,
          photo_list_text,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        'WEB_PSB',
        toText(getValue(row, ['support_type', 'supportType'])),
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_customer_id', 'legacyCustomerId'])),
        toText(getValue(row, ['ticket_code', 'ticketCode'])),
        toText(getValue(row, ['customer_name', 'customerName'])),
        toText(getValue(row, ['customer_user', 'customerUser'])),
        toText(getValue(row, ['category'])),
        toText(getValue(row, ['trouble_type', 'troubleType'])),
        toText(getValue(row, ['support_status', 'supportStatus'])),
        toText(getValue(row, ['opened_at', 'openedAt'])),
        toText(getValue(row, ['closed_at', 'closedAt'])),
        toText(getValue(row, ['reason_text', 'reasonText'])),
        toText(getValue(row, ['problem_category', 'problemCategory'])),
        toText(getValue(row, ['resolution_action', 'resolutionAction'])),
        typeof photoList === 'string' ? photoList : JSON.stringify(photoList ?? []),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['ticket_code', 'legacy_id', 'support_type']),
      ]
    )
    inserted += 1
  }

  return inserted
}

async function insertBillingInvoiceRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_billing_invoice_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_customer_id,
          legacy_subscription_ref,
          invoice_no,
          invoice_type,
          billing_month,
          billing_year,
          period_start,
          period_end,
          issue_date,
          due_date,
          subtotal,
          penalty_amount,
          discount_amount,
          total_amount,
          paid_amount,
          invoice_status,
          collection_status,
          suspend_candidate,
          notes,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'WEB_PSB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_customer_id', 'legacyCustomerId'])),
        toText(getValue(row, ['legacy_subscription_ref', 'legacySubscriptionRef'])),
        toText(getValue(row, ['invoice_no', 'invoiceNo'])),
        toText(getValue(row, ['invoice_type', 'invoiceType'])),
        toInteger(getValue(row, ['billing_month', 'billingMonth'])),
        toInteger(getValue(row, ['billing_year', 'billingYear'])),
        toText(getValue(row, ['period_start', 'periodStart'])),
        toText(getValue(row, ['period_end', 'periodEnd'])),
        toText(getValue(row, ['issue_date', 'issueDate'])),
        toText(getValue(row, ['due_date', 'dueDate'])),
        toNumber(getValue(row, ['subtotal'])),
        toNumber(getValue(row, ['penalty_amount', 'penaltyAmount'])),
        toNumber(getValue(row, ['discount_amount', 'discountAmount'])),
        toNumber(getValue(row, ['total_amount', 'totalAmount'])),
        toNumber(getValue(row, ['paid_amount', 'paidAmount'])),
        toText(getValue(row, ['invoice_status', 'invoiceStatus'])),
        toText(getValue(row, ['collection_status', 'collectionStatus'])),
        toBooleanInt(getValue(row, ['suspend_candidate', 'suspendCandidate'])),
        toText(getValue(row, ['notes'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['invoice_no', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertBillingItemRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_billing_item_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_invoice_id,
          item_type,
          description,
          qty,
          unit_price,
          line_total,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'WEB_PSB', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_invoice_id', 'legacyInvoiceId'])),
        toText(getValue(row, ['item_type', 'itemType'])),
        toText(getValue(row, ['description'])),
        toNumber(getValue(row, ['qty'])),
        toNumber(getValue(row, ['unit_price', 'unitPrice'])),
        toNumber(getValue(row, ['line_total', 'lineTotal'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['legacy_invoice_id', 'description', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertBillingPaymentRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_billing_payment_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_invoice_id,
          payment_no,
          payment_date,
          amount,
          payment_method,
          reference_no,
          received_by_legacy_user,
          notes,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'WEB_PSB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_invoice_id', 'legacyInvoiceId'])),
        toText(getValue(row, ['payment_no', 'paymentNo'])),
        toText(getValue(row, ['payment_date', 'paymentDate'])),
        toNumber(getValue(row, ['amount'])),
        toText(getValue(row, ['payment_method', 'paymentMethod'])),
        toText(getValue(row, ['reference_no', 'referenceNo'])),
        toText(getValue(row, ['received_by_legacy_user', 'receivedByLegacyUser'])),
        toText(getValue(row, ['notes'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['payment_no', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertBillingCollectionRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_billing_collection_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_invoice_id,
          action_type,
          action_status,
          action_at,
          due_follow_up_at,
          handled_by_legacy_user,
          notes,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'WEB_PSB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_invoice_id', 'legacyInvoiceId'])),
        toText(getValue(row, ['action_type', 'actionType'])),
        toText(getValue(row, ['action_status', 'actionStatus'])),
        toText(getValue(row, ['action_at', 'actionAt'])),
        toText(getValue(row, ['due_follow_up_at', 'dueFollowUpAt'])),
        toText(getValue(row, ['handled_by_legacy_user', 'handledByLegacyUser'])),
        toText(getValue(row, ['notes'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['legacy_invoice_id', 'action_type', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertInventoryItemRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_inventory_item_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_category_id,
          legacy_unit_id,
          item_code,
          item_name,
          barcode,
          default_price,
          minimum_stock,
          current_stock,
          status_text,
          photo_path,
          raw_payload,
          normalized_key,
          mapped_category_code,
          mapped_unit_code,
          import_status,
          validation_notes
        )
        VALUES (?, 'GA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_category_id', 'legacyCategoryId'])),
        toText(getValue(row, ['legacy_unit_id', 'legacyUnitId'])),
        toText(getValue(row, ['item_code', 'itemCode'])),
        toText(getValue(row, ['item_name', 'itemName'])),
        toText(getValue(row, ['barcode'])),
        toNumber(getValue(row, ['default_price', 'defaultPrice'])),
        toInteger(getValue(row, ['minimum_stock', 'minimumStock'])),
        toInteger(getValue(row, ['current_stock', 'currentStock'])),
        toText(getValue(row, ['status_text', 'statusText'])),
        toText(getValue(row, ['photo_path', 'photoPath'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['item_code', 'item_name', 'legacy_id']),
        toText(getValue(row, ['mapped_category_code', 'mappedCategoryCode'])),
        toText(getValue(row, ['mapped_unit_code', 'mappedUnitCode'])),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertInventoryMovementRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_inventory_movement_records (
          batch_id,
          source_system,
          movement_source,
          legacy_id,
          legacy_item_id,
          reference_no,
          movement_type,
          qty,
          unit_price,
          movement_at,
          assignee_name,
          notes,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'GA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['movement_source', 'movementSource'])) || 'ADJUSTMENT',
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_item_id', 'legacyItemId'])),
        toText(getValue(row, ['reference_no', 'referenceNo'])),
        toText(getValue(row, ['movement_type', 'movementType'])),
        toInteger(getValue(row, ['qty'])),
        toNumber(getValue(row, ['unit_price', 'unitPrice'])),
        toText(getValue(row, ['movement_at', 'movementAt'])),
        toText(getValue(row, ['assignee_name', 'assigneeName'])),
        toText(getValue(row, ['notes'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['reference_no', 'legacy_item_id', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertEmployeeRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_employee_records (
          batch_id,
          source_system,
          legacy_id,
          employee_code,
          full_name,
          department_text,
          position_name,
          employment_status,
          join_date,
          base_salary,
          phone,
          whatsapp,
          raw_payload,
          normalized_key,
          mapped_division_code,
          import_status,
          validation_notes
        )
        VALUES (?, 'FINANCE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['employee_code', 'employeeCode'])),
        toText(getValue(row, ['full_name', 'fullName'])),
        toText(getValue(row, ['department_text', 'departmentText'])),
        toText(getValue(row, ['position_name', 'positionName'])),
        toText(getValue(row, ['employment_status', 'employmentStatus'])),
        toText(getValue(row, ['join_date', 'joinDate'])),
        toNumber(getValue(row, ['base_salary', 'baseSalary'])),
        toText(getValue(row, ['phone'])),
        toText(getValue(row, ['whatsapp'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['employee_code', 'full_name', 'legacy_id']),
        toText(getValue(row, ['mapped_division_code', 'mappedDivisionCode'])),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertAttendanceRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_attendance_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_employee_id,
          attendance_date,
          check_in,
          check_out,
          attendance_status,
          overtime_hours,
          locked_by_admin,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'FINANCE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_employee_id', 'legacyEmployeeId'])),
        toText(getValue(row, ['attendance_date', 'attendanceDate'])),
        toText(getValue(row, ['check_in', 'checkIn'])),
        toText(getValue(row, ['check_out', 'checkOut'])),
        toText(getValue(row, ['attendance_status', 'attendanceStatus'])),
        toNumber(getValue(row, ['overtime_hours', 'overtimeHours'])),
        toBooleanInt(getValue(row, ['locked_by_admin', 'lockedByAdmin'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['legacy_employee_id', 'attendance_date', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertSalaryRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_salary_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_employee_id,
          payroll_month,
          payroll_year,
          base_salary,
          attendance_allowance,
          overtime_amount,
          performance_bonus,
          position_allowance,
          loan_deduction,
          total_income,
          total_deduction,
          net_salary,
          released_at,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'FINANCE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_employee_id', 'legacyEmployeeId'])),
        toInteger(getValue(row, ['payroll_month', 'payrollMonth'])),
        toInteger(getValue(row, ['payroll_year', 'payrollYear'])),
        toNumber(getValue(row, ['base_salary', 'baseSalary'])),
        toNumber(getValue(row, ['attendance_allowance', 'attendanceAllowance'])),
        toNumber(getValue(row, ['overtime_amount', 'overtimeAmount'])),
        toNumber(getValue(row, ['performance_bonus', 'performanceBonus'])),
        toNumber(getValue(row, ['position_allowance', 'positionAllowance'])),
        toNumber(getValue(row, ['loan_deduction', 'loanDeduction'])),
        toNumber(getValue(row, ['total_income', 'totalIncome'])),
        toNumber(getValue(row, ['total_deduction', 'totalDeduction'])),
        toNumber(getValue(row, ['net_salary', 'netSalary'])),
        toText(getValue(row, ['released_at', 'releasedAt'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['legacy_employee_id', 'payroll_month', 'payroll_year', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

async function insertLoanRows(batch: BatchContext, rows: Record<string, unknown>[]) {
  let inserted = 0
  for (const row of rows) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO staging_legacy_loan_records (
          batch_id,
          source_system,
          legacy_id,
          legacy_employee_id,
          loan_type,
          amount,
          monthly_installment,
          loan_date,
          loan_status,
          description,
          raw_payload,
          normalized_key,
          import_status,
          validation_notes
        )
        VALUES (?, 'FINANCE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `,
      [
        batch.id,
        toText(getValue(row, ['legacy_id', 'legacyId'])),
        toText(getValue(row, ['legacy_employee_id', 'legacyEmployeeId'])),
        toText(getValue(row, ['loan_type', 'loanType'])),
        toNumber(getValue(row, ['amount'])),
        toNumber(getValue(row, ['monthly_installment', 'monthlyInstallment'])),
        toText(getValue(row, ['loan_date', 'loanDate'])),
        toText(getValue(row, ['loan_status', 'loanStatus'])),
        toText(getValue(row, ['description'])),
        toJsonText(getValue(row, ['raw_payload', 'rawPayload']), row),
        toText(getValue(row, ['normalized_key', 'normalizedKey'])) ||
          buildNormalizedKey(row, ['legacy_employee_id', 'loan_date', 'legacy_id']),
      ]
    )
    inserted += 1
  }
  return inserted
}

const scopeDefinitions: Record<string, ScopeDefinition> = {
  USER_AND_ORDER_SAMPLE: {
    scope: 'USER_AND_ORDER_SAMPLE',
    sections: [
      { key: 'users', aliases: ['users', 'user', 'auth_users'], clearTable: 'staging_legacy_user_records', insertRows: insertUserRows },
      { key: 'customers', aliases: ['customers', 'customer'], clearTable: 'staging_legacy_customer_records', insertRows: insertCustomerRows },
      { key: 'orders', aliases: ['orders', 'order'], clearTable: 'staging_legacy_order_records', insertRows: insertOrderRows },
      { key: 'support', aliases: ['support', 'support_records', 'trouble_tickets'], clearTable: 'staging_legacy_support_records', insertRows: insertSupportRows },
    ],
  },
  BILLING_SAMPLE: {
    scope: 'BILLING_SAMPLE',
    sections: [
      { key: 'invoices', aliases: ['invoices', 'billing_invoices'], clearTable: 'staging_legacy_billing_invoice_records', insertRows: insertBillingInvoiceRows },
      { key: 'items', aliases: ['items', 'billing_items', 'invoice_items'], clearTable: 'staging_legacy_billing_item_records', insertRows: insertBillingItemRows },
      { key: 'payments', aliases: ['payments', 'billing_payments'], clearTable: 'staging_legacy_billing_payment_records', insertRows: insertBillingPaymentRows },
      { key: 'collections', aliases: ['collections', 'billing_collections', 'collection_actions'], clearTable: 'staging_legacy_billing_collection_records', insertRows: insertBillingCollectionRows },
    ],
  },
  INVENTORY_SAMPLE: {
    scope: 'INVENTORY_SAMPLE',
    sections: [
      { key: 'items', aliases: ['items', 'inventory_items'], clearTable: 'staging_legacy_inventory_item_records', insertRows: insertInventoryItemRows },
      { key: 'movements', aliases: ['movements', 'inventory_movements', 'stock_movements'], clearTable: 'staging_legacy_inventory_movement_records', insertRows: insertInventoryMovementRows },
    ],
  },
  HR_SAMPLE: {
    scope: 'HR_SAMPLE',
    sections: [
      { key: 'employees', aliases: ['employees', 'employee'], clearTable: 'staging_legacy_employee_records', insertRows: insertEmployeeRows },
      { key: 'attendance', aliases: ['attendance', 'attendances'], clearTable: 'staging_legacy_attendance_records', insertRows: insertAttendanceRows },
      { key: 'salaries', aliases: ['salaries', 'salary', 'salary_slips'], clearTable: 'staging_legacy_salary_records', insertRows: insertSalaryRows },
      { key: 'loans', aliases: ['loans', 'loan'], clearTable: 'staging_legacy_loan_records', insertRows: insertLoanRows },
    ],
  },
  CUSTOMER_REVIEW: {
    scope: 'CUSTOMER_REVIEW',
    sections: [
      { key: 'customers', aliases: ['customers', 'customer'], clearTable: 'staging_legacy_customer_records', insertRows: insertCustomerRows },
    ],
  },
  SUPPORT_REVIEW: {
    scope: 'SUPPORT_REVIEW',
    sections: [
      { key: 'support', aliases: ['support', 'support_records', 'trouble_tickets'], clearTable: 'staging_legacy_support_records', insertRows: insertSupportRows },
    ],
  },
}

async function readWorkbookSections(
  buffer: Buffer,
  definition: ScopeDefinition
): Promise<Partial<Record<ImportSectionKey, Record<string, unknown>[]>>> {
  const xlsx = await import('xlsx')
  const workbook = xlsx.read(buffer, { type: 'buffer' })
  const sheetMap = new Map(
    workbook.SheetNames.map((name) => [normalizeKey(name), name])
  )
  const result: Partial<Record<ImportSectionKey, Record<string, unknown>[]>> = {}

  for (const section of definition.sections) {
    const matchedSheet = section.aliases
      .map((alias) => sheetMap.get(normalizeKey(alias)))
      .find(Boolean)

    if (!matchedSheet) continue

    const sheet = workbook.Sheets[matchedSheet]
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
      blankrows: false,
    })

    if (rows.length > 0) {
      result[section.key] = rows
    }
  }

  return result
}

function readJsonSections(
  buffer: Buffer,
  definition: ScopeDefinition
): Partial<Record<ImportSectionKey, Record<string, unknown>[]>> {
  const parsed = JSON.parse(buffer.toString('utf8')) as
    | Record<string, unknown>
    | Record<string, unknown>[]

  if (Array.isArray(parsed)) {
    if (definition.sections.length !== 1) {
      throw new Error(
        `Format JSON array hanya didukung untuk scope satu section. Gunakan object dengan key section untuk scope ${definition.scope}.`
      )
    }

    return {
      [definition.sections[0].key]: parsed as Record<string, unknown>[],
    }
  }

  const result: Partial<Record<ImportSectionKey, Record<string, unknown>[]>> = {}

  for (const section of definition.sections) {
    const entry = Object.entries(parsed).find(([key]) =>
      section.aliases.some((alias) => normalizeKey(alias) === normalizeKey(key))
    )

    if (!entry) continue
    const rows = entry[1]
    if (Array.isArray(rows)) {
      result[section.key] = rows as Record<string, unknown>[]
    }
  }

  return result
}

async function deleteExistingBatchRows(batchId: number, definition: ScopeDefinition) {
  for (const section of definition.sections) {
    await runReviewDbExecute<ExecuteResult>(
      `DELETE FROM ${section.clearTable} WHERE batch_id = ?`,
      [batchId]
    )
  }
}

export async function loadImportFileToStaging(
  batch: BatchContext,
  fileBuffer: Buffer,
  extension: string
): Promise<LoadImportFileResult> {
  const definition = scopeDefinitions[batch.scope]
  if (!definition) {
    throw new Error(`Scope ${batch.scope} belum didukung untuk parser staging otomatis.`)
  }

  if (extension === '.csv' && definition.sections.length > 1) {
    throw new Error(
      `Scope ${batch.scope} memerlukan file JSON atau workbook XLSX/XLS multi-sheet karena memuat lebih dari satu section staging.`
    )
  }

  const parsedSections =
    extension === '.json'
      ? readJsonSections(fileBuffer, definition)
      : await readWorkbookSections(fileBuffer, definition)

  const availableSections = definition.sections.filter((section) => {
    const rows = parsedSections[section.key]
    return Array.isArray(rows) && rows.length > 0
  })

  if (availableSections.length === 0) {
    throw new Error(
      `Tidak ada section yang cocok untuk scope ${batch.scope}. Periksa key JSON atau nama sheet workbook.`
    )
  }

  await deleteExistingBatchRows(batch.id, definition)

  let insertedRows = 0
  const sectionsLoaded: string[] = []

  for (const section of availableSections) {
    const rows = parsedSections[section.key] ?? []
    const inserted = await section.insertRows(batch, rows)
    insertedRows += inserted
    sectionsLoaded.push(section.key)
  }

  return {
    insertedRows,
    sectionsLoaded,
    parserType: extension === '.json' ? 'json' : 'workbook',
  }
}
