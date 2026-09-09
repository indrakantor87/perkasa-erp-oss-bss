import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  getReviewDbErrorDetail,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbQueryWithError,
  runReviewDbTransaction,
} from '@/lib/review-db'
import type { ImportBatchAction, ImportBatchTransformRun } from '@/lib/types'

declare global {
  var __perkasaImportWriteServiceHooks:
    | {
        preflightOdpOnlyImportBatch?: (batchId: string) => Promise<unknown>
        transformImportBatch?: (
          batchId: string,
          stage: TransformStage,
          actor: string
        ) => Promise<unknown>
      }
    | undefined
}

type BatchLookup = {
  id: number
  batchCode: string
  importScope: string
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

type ImportBatchTransformRunRow = {
  id: number
  stage: string
  runStatus: string
  actorName: string | null
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  executedStatements: number | null
  errorText: string | null
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

export const TRANSFORM_STAGE_ORDER = ['01', '02', '03', '04', '05'] as const

export type TransformStage = (typeof TRANSFORM_STAGE_ORDER)[number]

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
  {
    tableName: 'staging_legacy_sales_coverage_records',
    validCondition:
      "NULLIF(TRIM(area_name), '') IS NOT NULL",
    invalidMessage: 'Validasi web: coverage area wajib punya nama area coverage dan normalized key.',
    validMessage: 'Validasi web: sales coverage area siap ditransform.',
  },
  {
    tableName: 'staging_legacy_marketing_activity_records',
    validCondition:
      "NULLIF(TRIM(marketing_name), '') IS NOT NULL AND activity_date IS NOT NULL",
    invalidMessage: 'Validasi web: marketing activity wajib punya nama kegiatan dan tanggal.',
    validMessage: 'Validasi web: marketing activity siap ditransform.',
  },
  {
    tableName: 'staging_legacy_network_odp_records',
    validCondition:
      "NULLIF(TRIM(odp_code), '') IS NOT NULL",
    invalidMessage: 'Validasi web: network ODP wajib punya kode ODP dan normalized key.',
    validMessage: 'Validasi web: network ODP siap ditransform.',
  },
]

const transformStageFiles: Record<TransformStage, string> = {
  '01': 'xampp_review_transform_stage_1.sql',
  '02': 'xampp_review_transform_stage_2.sql',
  '03': 'xampp_review_transform_stage_3.sql',
  '04': 'xampp_review_transform_stage_4.sql',
  '05': 'xampp_review_transform_stage_5.sql',
}

let importBatchActionTableEnsured = false
let importBatchTransformRunTableEnsured = false

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

export async function ensureImportBatchTransformRunTable() {
  if (importBatchTransformRunTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS staging_import_batch_transform_runs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      batch_id BIGINT UNSIGNED NOT NULL,
      stage ENUM('01','02','03','04','05') NOT NULL,
      run_status ENUM('RUNNING','SUCCESS','FAILED') NOT NULL DEFAULT 'RUNNING',
      actor_name VARCHAR(150) NULL,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME NULL,
      duration_ms INT NULL,
      executed_statements INT NULL,
      error_text TEXT NULL,
      PRIMARY KEY (id),
      KEY idx_staging_import_batch_transform_runs_batch (batch_id),
      CONSTRAINT fk_staging_import_batch_transform_runs_batch FOREIGN KEY (batch_id) REFERENCES staging_import_batches(id)
    )
  `)

  const [row] = await runReviewDbQuery<{ columnType: string | null }>(
    `
      SELECT column_type AS columnType
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'staging_import_batch_transform_runs'
        AND column_name = 'stage'
      LIMIT 1
    `,
  )
  const currentType = String(row?.columnType ?? '')
  if (currentType && !currentType.includes("'05'")) {
    await runReviewDbExecute<ExecuteResult>(
      `
        ALTER TABLE staging_import_batch_transform_runs
        MODIFY COLUMN stage ENUM('01','02','03','04','05') NOT NULL
      `,
    )
  }

  importBatchTransformRunTableEnsured = true
}

async function startImportBatchTransformRun(params: { batchId: number; stage: TransformStage; actor: string }) {
  await ensureImportBatchTransformRunTable()
  const result = await runReviewDbExecute<{ insertId?: number }>(
    `
      INSERT INTO staging_import_batch_transform_runs (
        batch_id,
        stage,
        run_status,
        actor_name
      )
      VALUES (?, ?, 'RUNNING', ?)
    `,
    [params.batchId, params.stage, params.actor],
  )

  return Number(result.insertId ?? 0)
}

async function finishImportBatchTransformRun(params: {
  runId: number
  status: 'SUCCESS' | 'FAILED'
  durationMs: number
  executedStatements: number
  errorText: string
}) {
  await ensureImportBatchTransformRunTable()
  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE staging_import_batch_transform_runs
      SET run_status = ?,
          finished_at = CURRENT_TIMESTAMP,
          duration_ms = ?,
          executed_statements = ?,
          error_text = ?
      WHERE id = ?
    `,
    [params.status, params.durationMs, params.executedStatements, params.errorText || null, params.runId],
  )
}

function normalizeRunStatus(value: string): ImportBatchTransformRun['status'] {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'SUCCESS' || normalized === 'FAILED') {
    return normalized
  }
  return 'RUNNING'
}

export async function getImportBatchTransformRuns(batchId: number): Promise<ImportBatchTransformRun[]> {
  await ensureImportBatchTransformRunTable()

  const rows = await runReviewDbQuery<ImportBatchTransformRunRow>(
    `
      SELECT
        id,
        stage,
        run_status AS runStatus,
        actor_name AS actorName,
        started_at AS startedAt,
        finished_at AS finishedAt,
        duration_ms AS durationMs,
        executed_statements AS executedStatements,
        error_text AS errorText
      FROM staging_import_batch_transform_runs
      WHERE batch_id = ?
      ORDER BY started_at DESC, id DESC
      LIMIT 20
    `,
    [batchId],
  )

  return rows.map((row) => ({
    id: `run-${row.id}`,
    stage: (row.stage?.trim() as TransformStage) || '01',
    status: normalizeRunStatus(row.runStatus),
    actor: row.actorName?.trim() || 'System Review',
    startedAt: String(row.startedAt),
    finishedAt: row.finishedAt ? String(row.finishedAt) : '-',
    durationMs: Number(row.durationMs ?? 0),
    executedStatements: Number(row.executedStatements ?? 0),
    error: row.errorText?.trim() || '',
  }))
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
  if (
    normalized === 'UPLOAD' ||
    normalized === 'VALIDATE' ||
    normalized === 'TRANSFORM' ||
    normalized === 'RETRY' ||
    normalized === 'DELETE'
  ) {
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
        import_scope AS importScope,
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

type OdpOnlyPreflightResult = {
  batchPk: number
  batchCode: string
  odpRows: number
  nonOdpCounts: Record<string, number>
}

const ODP_ONLY_REQUIRED_SCOPE = 'INVENTORY'
const ODP_ONLY_TABLE = 'staging_legacy_network_odp_records'
const ODP_ONLY_NON_ODP_TABLES = [
  'staging_legacy_inventory_item_records',
  'staging_legacy_inventory_movement_records',
  'staging_legacy_user_records',
  'staging_legacy_employee_records',
  'staging_legacy_attendance_records',
  'staging_legacy_salary_records',
  'staging_legacy_loan_records',
  'staging_legacy_customer_records',
  'staging_legacy_order_records',
  'staging_legacy_support_records',
  'staging_legacy_billing_invoice_records',
  'staging_legacy_billing_item_records',
  'staging_legacy_billing_payment_records',
  'staging_legacy_billing_collection_records',
] as const

async function countBatchRowsStrict(tableName: string, batchId: number) {
  const { rows, error, disabled } = await runReviewDbQueryWithError<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM ${tableName}
      WHERE batch_id = ?
      LIMIT 1
    `,
    [batchId],
  )

  if (disabled) {
    throw new Error('Transform batch hanya aktif saat review DB benar-benar tersedia.')
  }
  if (error) {
    throw new Error(`Tidak bisa verifikasi ODP-only batch karena query gagal pada ${tableName}.`)
  }

  return Number(rows[0]?.total ?? 0)
}

export async function preflightOdpOnlyImportBatch(batchId: string): Promise<OdpOnlyPreflightResult> {
  const batch = await getImportBatchLookup(batchId)
  if (!batch) {
    throw new Error('Batch tidak ditemukan.')
  }

  const scope = batch.importScope?.trim().toUpperCase()
  if (scope !== ODP_ONLY_REQUIRED_SCOPE) {
    throw new Error('Stage 05 membutuhkan batch INVENTORY khusus ODP-only.')
  }

  const odpRows = await countBatchRowsStrict(ODP_ONLY_TABLE, batch.id)
  if (odpRows <= 0) {
    throw new Error('Stage 05 membutuhkan batch INVENTORY dengan staging ODP > 0.')
  }

  const nonOdpCounts: Record<string, number> = {}
  for (const tableName of ODP_ONLY_NON_ODP_TABLES) {
    const total = await countBatchRowsStrict(tableName, batch.id)
    if (total > 0) {
      nonOdpCounts[tableName] = total
    }
  }

  if (Object.keys(nonOdpCounts).length > 0) {
    const detail = Object.entries(nonOdpCounts)
      .map(([table, total]) => `${table}=${total}`)
      .join(', ')
    throw new Error(
      `Stage 05 membutuhkan batch INVENTORY ODP-only; stage 01–04 bersifat cumulative. Non-ODP staging rows terdeteksi: ${detail}`,
    )
  }

  return {
    batchPk: batch.id,
    batchCode: batch.batchCode,
    odpRows,
    nonOdpCounts,
  }
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

function bindBatchIdToStatement(statement: string, batchPk: number) {
  return statement.replace(/@batch_id\b/g, String(batchPk))
}

async function executeTransformSqlUpTo(
  connection: { query: (sql: string, values?: unknown[]) => Promise<[unknown[], unknown]> },
  batchPk: number,
  stage: TransformStage,
) {
  const stageOrder = TRANSFORM_STAGE_ORDER.slice(0, TRANSFORM_STAGE_ORDER.indexOf(stage) + 1)
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
      await connection.query(bindBatchIdToStatement(statement, batchPk))
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

  const startTimestamp = Date.now()
  const runId = await startImportBatchTransformRun({ batchId: batch.id, stage, actor })
  let executedStatements = 0

  try {
    executedStatements = await runReviewDbTransaction(async (connection) => {
      await ensureImportBatchTransformRunTable()
      await connection.query(
        `
          SELECT id
          FROM staging_import_batches
          WHERE id = ?
          FOR UPDATE
        `,
        [batch.id],
      )

      const [runningRows] = await connection.query(
        `
          SELECT COUNT(*) AS total
          FROM staging_import_batch_transform_runs
          WHERE batch_id = ?
            AND run_status = 'RUNNING'
            AND id <> ?
          LIMIT 1
        `,
        [batch.id, runId],
      )
      const runningCount = Number((runningRows as { total?: number }[] | undefined)?.[0]?.total ?? 0)
      if (runningCount > 0) {
        throw new Error('Transform batch sedang berjalan. Tunggu proses sebelumnya selesai.')
      }

      return executeTransformSqlUpTo(connection, batch.id, stage)
    })
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
      `[${formatActionTime()}] Transform tahap ${stage} dipicu dari web oleh ${actor}. SQL transform berjalan untuk batch ini dan batch kini memiliki ${afterSummary.importedRows} row imported.`
    )

    const durationMs = Date.now() - startTimestamp
    if (runId > 0) {
      await finishImportBatchTransformRun({
        runId,
        status: 'SUCCESS',
        durationMs,
        executedStatements,
        errorText: '',
      })
    }

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
  } catch (error) {
    const durationMs = Date.now() - startTimestamp
    if (runId > 0) {
      await finishImportBatchTransformRun({
        runId,
        status: 'FAILED',
        durationMs,
        executedStatements,
        errorText: getImportWriteErrorMessage(error),
      }).catch(() => null)
    }

    try {
      await recordImportBatchAction({
        batchId: batch.id,
        actionType: 'TRANSFORM',
        status: 'FAILED',
        actor,
        detail: `Transform tahap ${stage} gagal: ${getImportWriteErrorMessage(error)}`,
      })
    } catch {
      // Histori aksi tidak boleh memblokir transform utama.
    }

    throw error
  }
}

export function getImportWriteErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return getReviewDbErrorDetail(error)
}

export type DeleteImportBatchResult = {
  batchId: number
  batchCode: string
  deletedLegacyRows: number
  deletedTransformRuns: number
  deletedActions: number
  deletedBatch: number
  reason: string
  actor: string
  deletedAt: string
}

export type RetryImportBatchResult =
  | ({ mode: 'validate' } & ValidationResult)
  | ({ mode: 'transform' } & TransformResult)

function formatActionTimeRetry() {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export async function deleteImportBatch(batchId: string | number | bigint, actorName: string): Promise<DeleteImportBatchResult> {
  const numericBatchId = Number(batchId)
  if (!Number.isFinite(numericBatchId) || numericBatchId <= 0) {
    throw new Error('Batch ID tidak valid untuk pembersihan.')
  }

  const preBatch = await getImportBatchLookup(String(batchId))
  if (!preBatch) {
    throw new Error('Batch tidak ditemukan.')
  }
  if (preBatch.status === 'IMPORTED') {
    throw new Error('Batch berhasil diimport tidak dapat dihapus langsung (butuh approval bisnis terpisah).')
  }

  const runningRows = await runReviewDbQuery<{ runningCount?: number }>(
    `SELECT COUNT(*) AS runningCount FROM staging_import_batch_transform_runs WHERE batch_id = ? AND run_status = 'RUNNING' LIMIT 1`,
    [numericBatchId]
  )
  const running = Number((runningRows as unknown as { runningCount?: number }[] | undefined)?.[0]?.runningCount ?? 0)
  if (running > 0) {
    throw new Error('Batch sedang menjalankan transform, tidak dapat dihapus. Tunggu proses selesai.')
  }

  let deletedLegacyRows = 0
  let deletedTransformRuns = 0
  let deletedActions = 0
  let deletedBatch = 0

  await runReviewDbTransaction(async (connection) => {
    const [lockRows] = await connection.query(
      `SELECT id, batch_code AS batchCode, import_status AS status FROM staging_import_batches WHERE id = ? FOR UPDATE`,
      [numericBatchId]
    )
    const lockedBatch = ((lockRows as unknown[])?.[0] as { batchCode?: string; status?: string } | undefined)
    if (!lockedBatch || !lockedBatch.batchCode) {
      throw new Error('Batch tidak ditemukan untuk dikunci (batch ID tidak sesuai).')
    }
    if (lockedBatch.status === 'IMPORTED') {
      throw new Error('Batch berhasil diimport tidak dapat dihapus langsung (butuh approval bisnis terpisah).')
    }

    const legacyTableNames = validationRules.map((rule) => rule.tableName)
    const [schemaRows] = await connection.query(
      `SELECT table_name AS tn FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND table_name IN (${legacyTableNames.map(() => '?').join(', ')})`,
      legacyTableNames
    )
    const rowsArr = Array.isArray(schemaRows) ? (schemaRows as unknown[]) : [schemaRows]
    const existingTables = new Set(
      rowsArr
        .map((row) => (row as { tn?: string | null | undefined } | undefined)?.tn)
        .filter((tn): tn is string => typeof tn === 'string' && legacyTableNames.includes(tn))
    )

    for (const rule of validationRules) {
      if (!existingTables.has(rule.tableName)) continue
      const [delResult] = await connection.query(
        `DELETE FROM \`${rule.tableName}\` WHERE batch_id = ?`,
        [numericBatchId]
      )
      deletedLegacyRows += Number((delResult as { affectedRows?: number } | undefined)?.affectedRows ?? 0)
    }

    const [delRuns] = await connection.query(
      `DELETE FROM staging_import_batch_transform_runs WHERE batch_id = ?`,
      [numericBatchId]
    )
    deletedTransformRuns = Number((delRuns as { affectedRows?: number } | undefined)?.affectedRows ?? 0)

    const [delActions] = await connection.query(
      `DELETE FROM staging_import_batch_actions WHERE batch_id = ?`,
      [numericBatchId]
    )
    deletedActions = Number((delActions as { affectedRows?: number } | undefined)?.affectedRows ?? 0)

    const [delBatch] = await connection.query(
      `DELETE FROM staging_import_batches WHERE id = ?`,
      [numericBatchId]
    )
    deletedBatch = Number((delBatch as { affectedRows?: number } | undefined)?.affectedRows ?? 0)
  })

  const finalBatch = await getImportBatchLookup(String(batchId))
  const batchCode = preBatch.batchCode
  const reason =
    finalBatch === null
      ? `Batch ${batchCode} dibersihkan permanen dari staging area oleh ${actorName}. Data bisnis final TIDAK terhapus.`
      : `Batch ${batchCode} diproses pembersihan (batch record masih ada; cek child records).`

  void recordImportBatchAction({
    batchId: numericBatchId,
    actionType: 'DELETE',
    status: 'INFO',
    actor: actorName,
    detail: reason,
  }).catch(() => null)

  return {
    batchId: numericBatchId,
    batchCode,
    deletedLegacyRows,
    deletedTransformRuns,
    deletedActions,
    deletedBatch,
    reason,
    actor: actorName,
    deletedAt: formatActionTimeRetry(),
  }
}

export async function retryImportBatch(
  batchId: string,
  actor: string,
  stageOverride?: TransformStage
): Promise<RetryImportBatchResult> {
  const batch = await getImportBatchLookup(batchId)
  if (!batch) {
    throw new Error('Batch tidak ditemukan.')
  }
  if (batch.status === 'IMPORTED') {
    throw new Error('Batch sudah IMPORTED. Retry hanya untuk batch yang belum final.')
  }
  const runningRows = await runReviewDbQuery<{ runningCount?: number }>(
    `SELECT COUNT(*) AS runningCount FROM staging_import_batch_transform_runs WHERE batch_id = ? AND run_status = 'RUNNING' LIMIT 1`,
    [batch.id]
  )
  const running = Number((runningRows as unknown as { runningCount?: number }[] | undefined)?.[0]?.runningCount ?? 0)
  if (running > 0) {
    throw new Error('Batch sedang menjalankan transform lain. Tunggu proses selesai.')
  }

  const summary = await getImportBatchSummary(batch.id)
  const needsValidateFirst =
    (summary.totalRows > 0 && summary.validRows === 0 && summary.invalidRows === 0) ||
    batch.status === 'DRAFT' ||
    batch.status === 'UPLOADED' ||
    batch.status === 'MAPPED'

  if (needsValidateFirst && !stageOverride) {
    try {
      await recordImportBatchAction({
        batchId: batch.id,
        actionType: 'RETRY',
        status: 'SUCCESS',
        actor,
        detail: `Retry auto dimulai: validasi ulang batch ${batch.batchCode} karena status ${batch.status} atau row valid belum ditentukan.`,
      })
    } catch {
      // Histori aksi tidak boleh memblokir retry utama
    }
    const validate = await validateImportBatch(batchId, actor)
    return { mode: 'validate', ...validate }
  }

  let targetStage: TransformStage
  if (stageOverride) {
    targetStage = stageOverride
  } else {
    const lastFailed = await runReviewDbQuery<{ stage?: string }>(
      `SELECT stage FROM staging_import_batch_transform_runs WHERE batch_id = ? AND run_status = 'FAILED' ORDER BY id DESC LIMIT 1`,
      [batch.id]
    )
    const failedStage = (lastFailed as unknown as { stage?: string }[] | undefined)?.[0]?.stage
    targetStage =
      failedStage && (TRANSFORM_STAGE_ORDER as readonly string[]).includes(failedStage)
        ? (failedStage as TransformStage)
        : '01'
  }

  try {
    await recordImportBatchAction({
      batchId: batch.id,
      actionType: 'RETRY',
      status: 'SUCCESS',
      actor,
      detail: `Retry transform tahap ${targetStage} untuk batch ${batch.batchCode} (retry actor: ${actor}).`,
    })
  } catch {
    // Histori aksi tidak boleh memblokir retry utama
  }

  const hooks = globalThis.__perkasaImportWriteServiceHooks
  const preflight = hooks?.preflightOdpOnlyImportBatch ?? preflightOdpOnlyImportBatch
  const transformFn = hooks?.transformImportBatch ?? transformImportBatch

  if (targetStage === '05') {
    await preflight(batchId)
  }

  const transform = (await transformFn(batchId, targetStage, actor)) as TransformResult
  return { mode: 'transform', ...transform }
}
