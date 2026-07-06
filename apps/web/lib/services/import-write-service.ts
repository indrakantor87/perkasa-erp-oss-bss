import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import type { ImportBatchAction } from '@/lib/types'

type BatchLookup = {
  id: number
  batchCode: string
  status: string
  note: string | null
}

type ExecuteResult = {
  affectedRows?: number
}

type CountRow = {
  total: number
}

type ImportBatchActionRow = {
  id: number
  actionType: string
  actionStatus: string
  actorName: string | null
  detailText: string | null
  createdAt: string
}

type BatchSummary = {
  totalRows: number
  validRows: number
  invalidRows: number
  importedRows: number
  skippedRows: number
  duplicateRows: number
}

type ValidationResult = BatchSummary & {
  batchId: number
  batchCode: string
  status: 'VALIDATED'
}

type TransformStage = '01' | '02' | '03' | '04'

type TransformResult = BatchSummary & {
  batchId: number
  batchCode: string
  stage: TransformStage
  executedStatements: number
  status: 'VALIDATED' | 'IMPORTED'
}

type ValidationRule = {
  tableName: string
  validCondition: string
  invalidMessage: string
  validMessage: string
}

const validationRules: ValidationRule[] = [
  {
    tableName: 'staging_legacy_user_records',
    validCondition:
      "NULLIF(TRIM(full_name), '') IS NOT NULL AND NULLIF(TRIM(username), '') IS NOT NULL AND NULLIF(TRIM(mapped_role_code), '') IS NOT NULL AND NULLIF(TRIM(mapped_division_code), '') IS NOT NULL",
    invalidMessage: 'Validasi web: user wajib punya nama, username, mapping role, dan mapping divisi.',
    validMessage: 'Validasi web: user siap ditransform ke auth master.',
  },
  {
    tableName: 'staging_legacy_customer_records',
    validCondition:
      "NULLIF(TRIM(customer_name), '') IS NOT NULL",
    invalidMessage: 'Validasi web: customer wajib punya nama dan normalized key.',
    validMessage: 'Validasi web: customer siap ditransform ke customer master.',
  },
  {
    tableName: 'staging_legacy_order_records',
    validCondition:
      "NULLIF(TRIM(legacy_customer_id), '') IS NOT NULL AND NULLIF(TRIM(mapped_package_code), '') IS NOT NULL",
    invalidMessage: 'Validasi web: order wajib punya legacy customer, package mapping, dan normalized key.',
    validMessage: 'Validasi web: order siap ditransform ke sales order dan subscription.',
  },
  {
    tableName: 'staging_legacy_support_records',
    validCondition:
      "NULLIF(TRIM(support_type), '') IS NOT NULL AND NULLIF(TRIM(legacy_id), '') IS NOT NULL",
    invalidMessage: 'Validasi web: support wajib punya tipe support, legacy id, dan normalized key.',
    validMessage: 'Validasi web: support siap ditransform ke domain support.',
  },
  {
    tableName: 'staging_legacy_billing_invoice_records',
    validCondition:
      "NULLIF(TRIM(legacy_customer_id), '') IS NOT NULL AND NULLIF(TRIM(invoice_no), '') IS NOT NULL",
    invalidMessage: 'Validasi web: invoice wajib punya legacy customer, nomor invoice, dan normalized key.',
    validMessage: 'Validasi web: invoice staging siap ditransform ke billing.',
  },
  {
    tableName: 'staging_legacy_billing_item_records',
    validCondition:
      "NULLIF(TRIM(legacy_invoice_id), '') IS NOT NULL AND NULLIF(TRIM(description), '') IS NOT NULL",
    invalidMessage: 'Validasi web: item invoice wajib punya legacy invoice, deskripsi, dan normalized key.',
    validMessage: 'Validasi web: item invoice siap ditransform.',
  },
  {
    tableName: 'staging_legacy_billing_payment_records',
    validCondition:
      "NULLIF(TRIM(legacy_invoice_id), '') IS NOT NULL AND amount IS NOT NULL",
    invalidMessage: 'Validasi web: payment wajib punya legacy invoice, amount, dan normalized key.',
    validMessage: 'Validasi web: payment siap ditransform.',
  },
  {
    tableName: 'staging_legacy_billing_collection_records',
    validCondition:
      "NULLIF(TRIM(legacy_invoice_id), '') IS NOT NULL AND NULLIF(TRIM(action_type), '') IS NOT NULL",
    invalidMessage: 'Validasi web: collection action wajib punya legacy invoice, action type, dan normalized key.',
    validMessage: 'Validasi web: collection action siap ditransform.',
  },
  {
    tableName: 'staging_legacy_inventory_item_records',
    validCondition:
      "NULLIF(TRIM(item_name), '') IS NOT NULL AND NULLIF(TRIM(mapped_category_code), '') IS NOT NULL AND NULLIF(TRIM(mapped_unit_code), '') IS NOT NULL",
    invalidMessage: 'Validasi web: inventory item wajib punya nama, mapping kategori, mapping satuan, dan normalized key.',
    validMessage: 'Validasi web: inventory item siap ditransform.',
  },
  {
    tableName: 'staging_legacy_inventory_movement_records',
    validCondition:
      "NULLIF(TRIM(legacy_item_id), '') IS NOT NULL AND qty IS NOT NULL",
    invalidMessage: 'Validasi web: stock movement wajib punya legacy item, qty, dan normalized key.',
    validMessage: 'Validasi web: stock movement siap ditransform.',
  },
  {
    tableName: 'staging_legacy_employee_records',
    validCondition:
      "NULLIF(TRIM(full_name), '') IS NOT NULL AND NULLIF(TRIM(mapped_division_code), '') IS NOT NULL",
    invalidMessage: 'Validasi web: employee wajib punya nama, mapping divisi, dan normalized key.',
    validMessage: 'Validasi web: employee siap ditransform.',
  },
  {
    tableName: 'staging_legacy_attendance_records',
    validCondition:
      "NULLIF(TRIM(legacy_employee_id), '') IS NOT NULL AND attendance_date IS NOT NULL",
    invalidMessage: 'Validasi web: attendance wajib punya legacy employee, tanggal, dan normalized key.',
    validMessage: 'Validasi web: attendance siap ditransform.',
  },
  {
    tableName: 'staging_legacy_salary_records',
    validCondition:
      "NULLIF(TRIM(legacy_employee_id), '') IS NOT NULL AND payroll_month IS NOT NULL AND payroll_year IS NOT NULL",
    invalidMessage: 'Validasi web: salary wajib punya legacy employee, bulan, tahun, dan normalized key.',
    validMessage: 'Validasi web: salary siap ditransform.',
  },
  {
    tableName: 'staging_legacy_loan_records',
    validCondition:
      "NULLIF(TRIM(legacy_employee_id), '') IS NOT NULL AND amount IS NOT NULL",
    invalidMessage: 'Validasi web: loan wajib punya legacy employee, amount, dan normalized key.',
    validMessage: 'Validasi web: loan siap ditransform.',
  },
]

const transformStageFiles: Record<TransformStage, string> = {
  '01': 'xampp_review_transform_stage_1.sql',
  '02': 'xampp_review_transform_stage_2.sql',
  '03': 'xampp_review_transform_stage_3.sql',
  '04': 'xampp_review_transform_stage_4.sql',
}

let importBatchActionTableEnsured = false

function formatActionTime() {
  return new Date().toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export async function ensureImportBatchActionTable() {
  if (importBatchActionTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS staging_import_batch_actions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      batch_id BIGINT UNSIGNED NOT NULL,
      action_type ENUM('CREATE','UPLOAD','VALIDATE','TRANSFORM') NOT NULL,
      action_status ENUM('SUCCESS','FAILED','INFO') NOT NULL DEFAULT 'INFO',
      actor_name VARCHAR(150) NULL,
      detail_text TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_staging_import_batch_actions_batch (batch_id),
      CONSTRAINT fk_staging_import_batch_actions_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id)
    )
  `)

  importBatchActionTableEnsured = true
}

export async function recordImportBatchAction(params: {
  batchId: number
  actionType: ImportBatchAction['actionType']
  status: ImportBatchAction['status']
  actor: string
  detail: string
}) {
  await ensureImportBatchActionTable()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO staging_import_batch_actions (
        batch_id,
        action_type,
        action_status,
        actor_name,
        detail_text
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [params.batchId, params.actionType, params.status, params.actor, params.detail]
  )
}

function normalizeActionType(value: string): ImportBatchAction['actionType'] {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'UPLOAD' || normalized === 'VALIDATE' || normalized === 'TRANSFORM') {
    return normalized
  }

  return 'CREATE'
}

function normalizeActionStatus(value: string): ImportBatchAction['status'] {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'FAILED' || normalized === 'INFO') {
    return normalized
  }

  return 'SUCCESS'
}

export async function getImportBatchActions(batchId: number): Promise<ImportBatchAction[]> {
  await ensureImportBatchActionTable()

  const rows = await runReviewDbQuery<ImportBatchActionRow>(
    `
      SELECT
        id,
        action_type AS actionType,
        action_status AS actionStatus,
        actor_name AS actorName,
        detail_text AS detailText,
        created_at AS createdAt
      FROM staging_import_batch_actions
      WHERE batch_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    `,
    [batchId]
  )

  return rows.map((row) => ({
    id: `action-${row.id}`,
    actionType: normalizeActionType(row.actionType),
    status: normalizeActionStatus(row.actionStatus),
    actor: row.actorName?.trim() || 'System Review',
    detail: row.detailText?.trim() || 'Aksi batch tercatat di histori.',
    happenedAt: String(row.createdAt),
  }))
}

async function appendBatchNote(batchId: number, currentNote: string | null, nextLine: string) {
  const merged = [currentNote?.trim(), nextLine.trim()].filter(Boolean).join('\n')
  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE staging_import_batches
      SET notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [merged || null, batchId]
  )
}

export async function getImportBatchLookup(batchId: string) {
  const [row] = await runReviewDbQuery<BatchLookup>(
    `
      SELECT
        id,
        batch_code AS batchCode,
        import_status AS status,
        notes AS note
      FROM staging_import_batches
      WHERE LOWER(batch_code) = LOWER(?)
        OR CAST(id AS CHAR) = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [batchId, batchId]
  )

  return row ?? null
}

async function countTableRows(tableName: string, batchId: number, status?: string) {
  const [row] = await runReviewDbQuery<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM ${tableName}
      WHERE batch_id = ?
      ${status ? 'AND import_status = ?' : ''}
    `,
    status ? [batchId, status] : [batchId]
  )

  return Number(row?.total ?? 0)
}

async function countTableDuplicates(tableName: string, batchId: number) {
  const [row] = await runReviewDbQuery<CountRow>(
    `
      SELECT GREATEST(COUNT(*) - COUNT(DISTINCT NULLIF(TRIM(normalized_key), '')), 0) AS total
      FROM ${tableName}
      WHERE batch_id = ?
        AND NULLIF(TRIM(normalized_key), '') IS NOT NULL
    `,
    [batchId]
  )

  return Number(row?.total ?? 0)
}

export async function getImportBatchSummary(batchId: number): Promise<BatchSummary> {
  let totalRows = 0
  let validRows = 0
  let invalidRows = 0
  let importedRows = 0
  let skippedRows = 0
  let duplicateRows = 0

  for (const rule of validationRules) {
    totalRows += await countTableRows(rule.tableName, batchId)
    validRows += await countTableRows(rule.tableName, batchId, 'VALID')
    invalidRows += await countTableRows(rule.tableName, batchId, 'INVALID')
    importedRows += await countTableRows(rule.tableName, batchId, 'IMPORTED')
    skippedRows += await countTableRows(rule.tableName, batchId, 'SKIPPED')
    duplicateRows += await countTableDuplicates(rule.tableName, batchId)
  }

  return {
    totalRows,
    validRows,
    invalidRows,
    importedRows,
    skippedRows,
    duplicateRows,
  }
}

async function applyValidationRule(rule: ValidationRule, batchId: number) {
  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE ${rule.tableName}
      SET import_status = 'INVALID',
          validation_notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE batch_id = ?
        AND import_status NOT IN ('IMPORTED', 'SKIPPED')
        AND (
          NULLIF(TRIM(normalized_key), '') IS NULL
          OR NOT (${rule.validCondition})
        )
    `,
    [rule.invalidMessage, batchId]
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE ${rule.tableName}
      SET import_status = 'VALID',
          validation_notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE batch_id = ?
        AND import_status NOT IN ('IMPORTED', 'SKIPPED')
        AND NULLIF(TRIM(normalized_key), '') IS NOT NULL
        AND (${rule.validCondition})
    `,
    [rule.validMessage, batchId]
  )
}

export async function validateImportBatch(batchId: string, actor: string): Promise<ValidationResult> {
  const batch = await getImportBatchLookup(batchId)
  if (!batch) {
    throw new Error('Batch tidak ditemukan.')
  }

  const beforeSummary = await getImportBatchSummary(batch.id)
  if (beforeSummary.totalRows === 0) {
    throw new Error('Batch ini belum memiliki row staging untuk divalidasi.')
  }

  for (const rule of validationRules) {
    await applyValidationRule(rule, batch.id)
  }

  const summary = await getImportBatchSummary(batch.id)
  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE staging_import_batches
      SET total_rows = ?,
          valid_rows = ?,
          invalid_rows = ?,
          duplicate_rows = ?,
          import_status = 'VALIDATED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [summary.totalRows, summary.validRows, summary.invalidRows, summary.duplicateRows, batch.id]
  )

  await appendBatchNote(
    batch.id,
    batch.note,
    `[${formatActionTime()}] Validasi web oleh ${actor}: ${summary.validRows} valid, ${summary.invalidRows} invalid, ${summary.duplicateRows} duplikat dari ${summary.totalRows} row.`
  )
  try {
    await recordImportBatchAction({
      batchId: batch.id,
      actionType: 'VALIDATE',
      status: 'SUCCESS',
      actor,
      detail: `Validasi batch selesai dengan ${summary.validRows} valid, ${summary.invalidRows} invalid, dan ${summary.duplicateRows} duplikat.`,
    })
  } catch {
    // Histori aksi tidak boleh memblokir validasi utama.
  }

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    status: 'VALIDATED',
    ...summary,
  }
}

function parseSqlStatements(content: string) {
  const cleaned = content
    .split(/\r?\n/)
    .map((line) => (line.trimStart().startsWith('--') ? '' : line))
    .join('\n')

  return cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !/^USE\s+/i.test(statement))
}

async function executeTransformSqlUpTo(stage: TransformStage) {
  const stageOrder = (['01', '02', '03', '04'] as TransformStage[]).slice(
    0,
    ['01', '02', '03', '04'].indexOf(stage) + 1
  )
  let executedStatements = 0

  for (const currentStage of stageOrder) {
    const filePath = path.join(
      process.cwd(),
      '..',
      '..',
      'database',
      transformStageFiles[currentStage]
    )
    const content = await readFile(filePath, 'utf8')
    const statements = parseSqlStatements(content)

    for (const statement of statements) {
      await runReviewDbExecute<ExecuteResult>(statement)
      executedStatements += 1
    }
  }

  return executedStatements
}

export async function transformImportBatch(
  batchId: string,
  stage: TransformStage,
  actor: string
): Promise<TransformResult> {
  const batch = await getImportBatchLookup(batchId)
  if (!batch) {
    throw new Error('Batch tidak ditemukan.')
  }

  const summary = await getImportBatchSummary(batch.id)
  if (summary.totalRows === 0) {
    throw new Error('Batch ini belum memiliki row staging untuk ditransform.')
  }
  if (batch.status !== 'VALIDATED' && batch.status !== 'IMPORTED') {
    throw new Error('Batch harus divalidasi dulu sebelum transform dijalankan.')
  }

  const executedStatements = await executeTransformSqlUpTo(stage)
  const afterSummary = await getImportBatchSummary(batch.id)
  const nextStatus =
    afterSummary.importedRows > 0 &&
    afterSummary.importedRows + afterSummary.invalidRows + afterSummary.skippedRows >= afterSummary.totalRows
      ? 'IMPORTED'
      : 'VALIDATED'

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE staging_import_batches
      SET total_rows = ?,
          valid_rows = ?,
          invalid_rows = ?,
          duplicate_rows = ?,
          import_status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      afterSummary.totalRows,
      afterSummary.validRows,
      afterSummary.invalidRows,
      afterSummary.duplicateRows,
      nextStatus,
      batch.id,
    ]
  )

  await appendBatchNote(
    batch.id,
    batch.note,
    `[${formatActionTime()}] Transform tahap ${stage} dipicu dari web oleh ${actor}. SQL baseline review dijalankan dan batch kini memiliki ${afterSummary.importedRows} row imported.`
  )
  try {
    await recordImportBatchAction({
      batchId: batch.id,
      actionType: 'TRANSFORM',
      status: 'SUCCESS',
      actor,
      detail: `Transform tahap ${stage} dijalankan. ${executedStatements} statement SQL diproses dan ${afterSummary.importedRows} row kini berstatus imported.`,
    })
  } catch {
    // Histori aksi tidak boleh memblokir transform utama.
  }

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    stage,
    executedStatements,
    status: nextStatus,
    ...afterSummary,
  }
}

export function getImportWriteErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return getReviewDbErrorDetail(error)
}
