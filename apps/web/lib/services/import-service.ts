import { getDataSourceSnapshot, getFallbackDataSourceSnapshot } from '@/lib/data-source'
import { getBatchDetail, getImportBatch, importBatches, transformStages } from '@/lib/mock-import'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { getImportBatchActions } from '@/lib/services/import-write-service'
import type { BatchDetail, BatchRow, ImportBatch } from '@/lib/types'

type ImportBatchRow = {
  id: number
  batchCode: string
  sourceSystem: 'WEB_PSB' | 'FINANCE' | 'GA'
  scope: string
  sourceFileName: string | null
  status: string
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  note: string | null
}

type ImportDetailRow = {
  id: string
  legacyId: string | null
  normalizedKey: string | null
  status: string
  targetId: string | null
  note: string | null
}

function normalizeBatchStatus(value: string | null | undefined): ImportBatch['status'] {
  const normalized = String(value ?? '').trim().toUpperCase()

  switch (normalized) {
    case 'UPLOADED':
    case 'MAPPED':
    case 'VALIDATED':
    case 'IMPORTED':
    case 'FAILED':
      return normalized
    default:
      return 'DRAFT'
  }
}

function normalizeRowStatus(value: string | null | undefined): BatchRow['status'] {
  const normalized = String(value ?? '').trim().toUpperCase()

  switch (normalized) {
    case 'MAPPED':
    case 'VALID':
    case 'INVALID':
    case 'IMPORTED':
    case 'SKIPPED':
      return normalized
    default:
      return 'PENDING'
  }
}

function prettifyScope(scope: string) {
  return scope.replace(/_/g, ' ')
}

function toBatchId(batchCode: string) {
  return batchCode.trim().toLowerCase()
}

function mapImportBatch(row: ImportBatchRow): ImportBatch {
  return {
    id: toBatchId(row.batchCode),
    batchCode: row.batchCode,
    sourceSystem: row.sourceSystem,
    scope: row.scope,
    sourceFileName: row.sourceFileName?.trim() || null,
    status: normalizeBatchStatus(row.status),
    totalRows: Number(row.totalRows ?? 0),
    validRows: Number(row.validRows ?? 0),
    invalidRows: Number(row.invalidRows ?? 0),
    duplicateRows: Number(row.duplicateRows ?? 0),
    note: row.note?.trim() || `Batch ${row.batchCode} dari ${row.sourceSystem} untuk scope ${prettifyScope(row.scope)}.`,
  }
}

function mapBatchRows(rows: ImportDetailRow[]): BatchRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    legacyId: row.legacyId?.trim() || '-',
    normalizedKey: row.normalizedKey?.trim() || '-',
    status: normalizeRowStatus(row.status),
    targetId: row.targetId?.trim() || '-',
    note: row.note?.trim() || 'Row staging siap direview.',
  }))
}

async function getReviewDbImportBatches() {
  const rows = await runReviewDbQuery<ImportBatchRow>(`
    SELECT
      id,
      batch_code AS batchCode,
      source_system AS sourceSystem,
      import_scope AS scope,
      source_file_name AS sourceFileName,
      import_status AS status,
      total_rows AS totalRows,
      valid_rows AS validRows,
      invalid_rows AS invalidRows,
      duplicate_rows AS duplicateRows,
      notes AS note
    FROM staging_import_batches
    ORDER BY updated_at DESC, id DESC
    LIMIT 20
  `)

  return rows.map(mapImportBatch)
}

async function getReviewDbImportBatchRecord(batchId: string) {
  const [row] = await runReviewDbQuery<ImportBatchRow>(`
    SELECT
      id,
      batch_code AS batchCode,
      source_system AS sourceSystem,
      import_scope AS scope,
      source_file_name AS sourceFileName,
      import_status AS status,
      total_rows AS totalRows,
      valid_rows AS validRows,
      invalid_rows AS invalidRows,
      duplicate_rows AS duplicateRows,
      notes AS note
    FROM staging_import_batches
    WHERE LOWER(batch_code) = LOWER(?)
      OR CAST(id AS CHAR) = ?
    ORDER BY id DESC
    LIMIT 1
  `, [batchId, batchId])

  return row ? mapImportBatch(row) : null
}

async function getReviewDbBatchRows(batchPk: number) {
  return runReviewDbQuery<ImportDetailRow>(`
    SELECT *
    FROM (
      SELECT
        CONCAT('user-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_user_id IS NULL THEN '-'
          ELSE CONCAT('auth_users:', target_user_id)
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_user_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('customer-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_customer_id IS NULL THEN '-'
          ELSE CONCAT('crm_customers:', target_customer_id)
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_customer_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('order-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_order_id IS NOT NULL THEN CONCAT('sales_orders:', target_order_id)
          WHEN target_subscription_id IS NOT NULL THEN CONCAT('service_subscriptions:', target_subscription_id)
          WHEN target_work_order_id IS NOT NULL THEN CONCAT('service_work_orders:', target_work_order_id)
          WHEN target_customer_id IS NOT NULL THEN CONCAT('crm_customers:', target_customer_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_order_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('support-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_trouble_ticket_id IS NOT NULL THEN CONCAT('support_trouble_tickets:', target_trouble_ticket_id)
          WHEN target_isolation_id IS NOT NULL THEN CONCAT('support_isolations:', target_isolation_id)
          WHEN target_dismantle_history_id IS NOT NULL THEN CONCAT('support_dismantle_history:', target_dismantle_history_id)
          WHEN target_subscription_id IS NOT NULL THEN CONCAT('service_subscriptions:', target_subscription_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_support_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('billing-invoice-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_invoice_id IS NOT NULL THEN CONCAT('billing_invoices:', target_invoice_id)
          WHEN target_subscription_id IS NOT NULL THEN CONCAT('service_subscriptions:', target_subscription_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_billing_invoice_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('billing-item-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_item_id IS NOT NULL THEN CONCAT('billing_invoice_items:', target_item_id)
          WHEN target_invoice_id IS NOT NULL THEN CONCAT('billing_invoices:', target_invoice_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_billing_item_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('billing-payment-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_payment_id IS NOT NULL THEN CONCAT('billing_payments:', target_payment_id)
          WHEN target_invoice_id IS NOT NULL THEN CONCAT('billing_invoices:', target_invoice_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_billing_payment_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('billing-collection-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_collection_action_id IS NOT NULL THEN CONCAT('billing_collection_actions:', target_collection_action_id)
          WHEN target_invoice_id IS NOT NULL THEN CONCAT('billing_invoices:', target_invoice_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_billing_collection_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('inventory-item-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_item_id IS NULL THEN '-'
          ELSE CONCAT('inventory_items:', target_item_id)
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_inventory_item_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('inventory-movement-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_movement_id IS NOT NULL THEN CONCAT('inventory_stock_movements:', target_movement_id)
          WHEN target_work_order_id IS NOT NULL THEN CONCAT('service_work_orders:', target_work_order_id)
          WHEN target_item_id IS NOT NULL THEN CONCAT('inventory_items:', target_item_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_inventory_movement_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('employee-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_employee_id IS NULL THEN '-'
          ELSE CONCAT('hr_employees:', target_employee_id)
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_employee_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('attendance-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_attendance_id IS NOT NULL THEN CONCAT('hr_attendance:', target_attendance_id)
          WHEN target_employee_id IS NOT NULL THEN CONCAT('hr_employees:', target_employee_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_attendance_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('salary-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_salary_slip_id IS NOT NULL THEN CONCAT('hr_salary_slips:', target_salary_slip_id)
          WHEN target_employee_id IS NOT NULL THEN CONCAT('hr_employees:', target_employee_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_salary_records
      WHERE batch_id = ?

      UNION ALL

      SELECT
        CONCAT('loan-', id) AS id,
        legacy_id AS legacyId,
        normalized_key AS normalizedKey,
        import_status AS status,
        CASE
          WHEN target_loan_id IS NOT NULL THEN CONCAT('hr_loans:', target_loan_id)
          WHEN target_employee_id IS NOT NULL THEN CONCAT('hr_employees:', target_employee_id)
          ELSE '-'
        END AS targetId,
        validation_notes AS note,
        created_at
      FROM staging_legacy_loan_records
      WHERE batch_id = ?
    ) detail_rows
    ORDER BY created_at DESC, id DESC
    LIMIT 40
  `, Array(14).fill(batchPk))
}

export async function getImportOverview() {
  const source = getDataSourceSnapshot()

  if (source.effectiveMode !== 'review-db') {
    return {
      source,
      overview: {
        items: importBatches,
        stages: transformStages,
        totalRows: importBatches.reduce((total, item) => total + item.totalRows, 0),
        importedBatches: importBatches.filter((item) => item.status === 'IMPORTED').length,
      },
    }
  }

  try {
    const items = await getReviewDbImportBatches()

    return {
      source,
      overview: {
        items,
        stages: transformStages,
        totalRows: items.reduce((total, item) => total + item.totalRows, 0),
        importedBatches: items.filter((item) => item.status === 'IMPORTED').length,
      },
    }
  } catch (error) {
    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      overview: {
        items: importBatches,
        stages: transformStages,
        totalRows: importBatches.reduce((total, item) => total + item.totalRows, 0),
        importedBatches: importBatches.filter((item) => item.status === 'IMPORTED').length,
      },
    }
  }
}

export async function getImportBatchDetail(batchId: string) {
  const source = getDataSourceSnapshot()

  if (source.effectiveMode !== 'review-db') {
    const batch = getImportBatch(batchId)
    const detail = getBatchDetail(batchId)

    return {
      source,
      batch,
      detail,
    }
  }

  try {
    const batch = await getReviewDbImportBatchRecord(batchId)

    if (!batch) {
      return {
        source,
        batch: null,
        detail: null,
      }
    }

    const numericBatchRows = await runReviewDbQuery<{ id: number }>(`
      SELECT id
      FROM staging_import_batches
      WHERE LOWER(batch_code) = LOWER(?)
        OR CAST(id AS CHAR) = ?
      ORDER BY id DESC
      LIMIT 1
    `, [batchId, batchId])

    const batchPk = numericBatchRows[0]?.id
    const rows = batchPk ? mapBatchRows(await getReviewDbBatchRows(batchPk)) : []
    const actions = batchPk
      ? await getImportBatchActions(batchPk).catch(() => [])
      : []

    const detail: BatchDetail = {
      id: batch.id,
      title: `Batch ${batch.batchCode}`,
      sourceSystem: batch.sourceSystem,
      scope: batch.scope,
      status: batch.status,
      summary: batch.note,
      actions,
      rows,
    }

    return {
      source,
      batch,
      detail,
    }
  } catch (error) {
    const batch = getImportBatch(batchId)
    const detail = getBatchDetail(batchId)

    return {
      source: getFallbackDataSourceSnapshot(getReviewDbErrorDetail(error)),
      batch,
      detail,
    }
  }
}
