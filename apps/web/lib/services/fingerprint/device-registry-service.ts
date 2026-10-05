import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import {
  runReviewDbExecute,
  runReviewDbQuery,
  addColumnIfMissing,
  invalidateReviewDbColumnCache,
  hasReviewDbColumn,
  type SqlExecuteResult,
} from '@/lib/review-db'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { MockFingerprintConnector } from './mock-connector'
import {
  ConnectionStatus,
  EnrollmentStatus,
  FingerprintDeviceInfo,
  FingerprintMachineConnector,
  FpMachineCreateInput,
  FpMachineRow,
  FpMachineUpdateInput,
  FpMappingCreateInput,
  FpMappingRow,
  FpMappingUpdateInput,
  FpSyncRunRow,
  RawFingerprintEvent,
  SyncMode,
  SyncRunFinalStatus,
  SyncRunSummary,
} from './types'
import { processRawEventsToDailyAttendance } from '@/lib/services/attendance-processing-engine'

export const MASKED_AUTH_CONFIG = '••••••••••••'

const ENCRYPTION_ALGO = 'aes-256-cbc'
const FP_ENCRYPTION_ERROR_NOCONFIG = 'FP_ENCRYPTION_NOT_CONFIGURED'
const LEGACY_IV_HEX = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

let tablesEnsured = false

function resolveEncryptionKey(): string {
  const envKey = process.env.FINGERPRINT_DEVICE_CONFIG_ENCRYPTION_KEY?.trim()
  if (!envKey) {
    throw new Error(FP_ENCRYPTION_ERROR_NOCONFIG)
  }
  const isHex64 = envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)
  if (isHex64) {
    return envKey
  }
  try {
    normalizeEncryptionKeyTo32Bytes(envKey)
    return envKey
  } catch {
    throw new Error(FP_ENCRYPTION_ERROR_NOCONFIG)
  }
}

function normalizeEncryptionKeyTo32Bytes(key: string): Buffer {
  const hash = createHash('sha256').update(key, 'utf-8').digest()
  return hash.subarray(0, 32)
}

export function encryptAuthConfig(authConfig: unknown): string {
  const serialized = JSON.stringify(authConfig ?? null)
  let key: Buffer
  try {
    key = normalizeEncryptionKeyTo32Bytes(resolveEncryptionKey())
  } catch {
    throw new Error(FP_ENCRYPTION_ERROR_NOCONFIG)
  }
  const iv = randomBytes(16)
  const cipher = createCipheriv(ENCRYPTION_ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(serialized, 'utf-8'), cipher.final()])
  const ivHex = iv.toString('hex')
  return `AES:${ivHex}:${ciphertext.toString('base64')}`
}

export function decryptAuthConfig(ciphertext: string): unknown {
  if (!ciphertext) {
    return null
  }
  if (!ciphertext.startsWith('AES:')) {
    return null
  }
  let key: Buffer
  try {
    key = normalizeEncryptionKeyTo32Bytes(resolveEncryptionKey())
  } catch {
    throw new Error(FP_ENCRYPTION_ERROR_NOCONFIG)
  }
  const newFormat = ciphertext.match(/^AES:([0-9a-fA-F]{32}):(.+)$/)
  let ivHex: string
  let payloadB64: string
  if (newFormat) {
    ivHex = newFormat[1]
    payloadB64 = newFormat[2]
  } else {
    const legacyPayload = ciphertext.slice(4)
    if (legacyPayload.includes(':')) {
      return null
    }
    ivHex = LEGACY_IV_HEX
    payloadB64 = legacyPayload
  }
  try {
    const iv = Buffer.from(ivHex, 'hex').subarray(0, 16)
    const decipher = createDecipheriv(ENCRYPTION_ALGO, key, iv)
    const raw = Buffer.concat([
      decipher.update(Buffer.from(payloadB64, 'base64')),
      decipher.final(),
    ]).toString('utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function computeDedupHash(
  machineId: number,
  machineUserId: string,
  eventTimestamp: Date,
  eventTypeRaw: string | undefined,
): string {
  const source = `${machineId}|${machineUserId}|${eventTimestamp.toISOString()}|${eventTypeRaw ?? ''}`
  return createHash('sha256').update(source, 'utf-8').digest('hex')
}

export function maskMachineAuth<T extends { authConfigEncrypted: string }>(
  row: T,
): Omit<T, 'authConfigEncrypted'> & { authConfigEncrypted: string } {
  return {
    ...row,
    authConfigEncrypted: MASKED_AUTH_CONFIG,
  }
}

export function validateFingerprintEncryptionConfiguredOrThrow(): void {
  try {
    resolveEncryptionKey()
  } catch {
    throw new Error(
      'Konfigurasi enkripsi perangkat fingerprint tidak tersedia. Hubungi administrator untuk mengatur FINGERPRINT_DEVICE_CONFIG_ENCRYPTION_KEY environment variable.',
    )
  }
}

async function ensureHrFpMachinesHybridAlign() {
  const tableName = 'hr_fp_machines'
  const alterErrors: string[] = []
  if (!(await hasReviewDbColumn(tableName, 'ip'))) {
    await addColumnIfMissing(tableName, 'ip', 'ip VARCHAR(64) NOT NULL DEFAULT \'__legacy_missing__\'', 'id')
  }
  if (!(await hasReviewDbColumn(tableName, 'display_name'))) {
    await addColumnIfMissing(tableName, 'display_name', 'display_name VARCHAR(120) NULL', 'machine_name')
  }
  if (!(await hasReviewDbColumn(tableName, 'model'))) {
    await addColumnIfMissing(tableName, 'model', 'model VARCHAR(100) NULL DEFAULT \'__legacy_missing__\'', 'machine_model')
  }
  if (!(await hasReviewDbColumn(tableName, 'ip_address'))) {
    await addColumnIfMissing(tableName, 'ip_address', 'ip_address VARCHAR(45) NOT NULL DEFAULT \'__current_missing__\'', 'display_name')
  }
  if (!(await hasReviewDbColumn(tableName, 'machine_name'))) {
    await addColumnIfMissing(tableName, 'machine_name', 'machine_name VARCHAR(120) NOT NULL DEFAULT \'__current_missing__\'', 'ip')
  }
  if (!(await hasReviewDbColumn(tableName, 'machine_model'))) {
    await addColumnIfMissing(tableName, 'machine_model', 'machine_model VARCHAR(100) NOT NULL DEFAULT \'__current_missing__\'', 'display_name')
  }
  await addColumnIfMissing(tableName, 'active', 'active TINYINT(1) NOT NULL DEFAULT 1', 'branch_id')
  await addColumnIfMissing(tableName, 'location', 'location TEXT NULL', 'model')
  await addColumnIfMissing(tableName, 'branch_id', 'branch_id BIGINT UNSIGNED NULL', 'location')
  await addColumnIfMissing(tableName, 'sync_method', 'sync_method VARCHAR(60) NULL', 'last_sync_at')
  await addColumnIfMissing(tableName, 'notes', 'notes TEXT NULL', 'auth_config_encrypted')
  await addColumnIfMissing(tableName, 'created_by_user_id', 'created_by_user_id BIGINT UNSIGNED NULL', 'updated_at')
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD UNIQUE INDEX IF NOT EXISTS uq_fp_machines_ip_port_current (ip, port)`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD UNIQUE INDEX IF NOT EXISTS uq_fp_machines_ip_port (ip_address, port)`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS idx_hr_fp_machines_ip (ip)`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS idx_hr_fp_machines_status (last_connection_status)`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE ${tableName} MODIFY COLUMN last_connection_status ENUM('UNKNOWN','ONLINE','OFFLINE','SYNC_ERROR','AUTH_FAILED') NOT NULL DEFAULT 'OFFLINE'`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE hr_fp_sync_runs MODIFY COLUMN sync_mode ENUM('MANUAL','SCHEDULED','RETRY') NOT NULL DEFAULT 'MANUAL'`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE hr_fp_employee_mappings MODIFY COLUMN machine_user_id VARCHAR(64) NOT NULL`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE hr_fp_employee_mappings ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER revoked_at`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE hr_fp_employee_mappings ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT UNSIGNED NULL AFTER notes`,
    )
  } catch {}
  try {
    await runReviewDbExecute<ExecuteResult>(
      `ALTER TABLE hr_fp_raw_events MODIFY COLUMN machine_user_id VARCHAR(64) NOT NULL`,
    )
  } catch {}

  async function execAlter(sqlWithAfter: string, sqlWithoutAfter: string, colKey: string) {
    let r = (await runReviewDbExecute<ExecuteResult & { error?: string | null }>(sqlWithAfter))
    if (r?.error) {
      r = (await runReviewDbExecute<ExecuteResult & { error?: string | null }>(sqlWithoutAfter))
    }
    if (r?.error) {
      alterErrors.push(`${colKey}: ${r.error}`)
    }
  }
  void runReviewDbExecute

  try {
    if (!(await hasReviewDbColumn(tableName, 'event_timestamp_original'))) {
      await execAlter(
        `ALTER TABLE hr_fp_raw_events ADD COLUMN event_timestamp_original DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER employee_id`,
        `ALTER TABLE hr_fp_raw_events ADD COLUMN event_timestamp_original DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        'event_timestamp_original',
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    alterErrors.push(`event_timestamp_original: ${msg}`)
  }
  try {
    if (!(await hasReviewDbColumn(tableName, 'event_timestamp_normalized'))) {
      await execAlter(
        `ALTER TABLE hr_fp_raw_events ADD COLUMN event_timestamp_normalized DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE hr_fp_raw_events ADD COLUMN event_timestamp_normalized DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        'event_timestamp_normalized',
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    alterErrors.push(`event_timestamp_normalized: ${msg}`)
  }
  try {
    if (!(await hasReviewDbColumn(tableName, 'event_mode'))) {
      await execAlter(
        `ALTER TABLE hr_fp_raw_events ADD COLUMN event_mode ENUM('IN','OUT','UNDEFINED') NOT NULL DEFAULT 'UNDEFINED' AFTER event_type_raw`,
        `ALTER TABLE hr_fp_raw_events ADD COLUMN event_mode ENUM('IN','OUT','UNDEFINED') NOT NULL DEFAULT 'UNDEFINED'`,
        'event_mode',
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    alterErrors.push(`event_mode: ${msg}`)
  }
  try {
    if (!(await hasReviewDbColumn(tableName, 'raw_payload_json'))) {
      await execAlter(
        `ALTER TABLE hr_fp_raw_events ADD COLUMN raw_payload_json TEXT NULL AFTER is_processed`,
        `ALTER TABLE hr_fp_raw_events ADD COLUMN raw_payload_json TEXT NULL`,
        'raw_payload_json',
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    alterErrors.push(`raw_payload_json: ${msg}`)
  }
  try {
    if (!(await hasReviewDbColumn(tableName, 'received_at'))) {
      await execAlter(
        `ALTER TABLE hr_fp_raw_events ADD COLUMN received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE hr_fp_raw_events ADD COLUMN received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        'received_at',
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    alterErrors.push(`received_at: ${msg}`)
  }
  try {
    if (!(await hasReviewDbColumn(tableName, 'processing_notes'))) {
      await execAlter(
        `ALTER TABLE hr_fp_raw_events ADD COLUMN processing_notes TEXT NULL`,
        `ALTER TABLE hr_fp_raw_events ADD COLUMN processing_notes TEXT NULL`,
        'processing_notes',
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    alterErrors.push(`processing_notes: ${msg}`)
  }
  if (alterErrors.length > 0) {
    throw new Error(
      `hr_fp_raw_events hybrid align ALTER TABLE failures (${alterErrors.length}): ` + alterErrors.join(' ; '),
    )
  }
  invalidateReviewDbColumnCache(tableName)
  invalidateReviewDbColumnCache('hr_fp_sync_runs')
  invalidateReviewDbColumnCache('hr_fp_employee_mappings')
  invalidateReviewDbColumnCache('hr_fp_raw_events')
}

export async function ensureFingerprintTables() {
  if (tablesEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_machines (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ip VARCHAR(64) NOT NULL DEFAULT '__legacy_missing__',
      machine_name VARCHAR(120) NOT NULL DEFAULT '__current_missing__',
      display_name VARCHAR(120) NULL,
      ip_address VARCHAR(45) NOT NULL DEFAULT '__current_missing__',
      port INT UNSIGNED NULL,
      machine_model VARCHAR(100) NOT NULL DEFAULT '__current_missing__',
      model VARCHAR(80) NOT NULL DEFAULT '__legacy_missing__',
      location TEXT NULL,
      branch_id BIGINT UNSIGNED NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      device_timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
      auth_config_encrypted TEXT NULL,
      last_sync_at DATETIME NULL,
      sync_method VARCHAR(60) NULL,
      last_connection_status ENUM('UNKNOWN','ONLINE','OFFLINE','SYNC_ERROR','AUTH_FAILED') NOT NULL DEFAULT 'OFFLINE',
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by_user_id BIGINT UNSIGNED NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_fp_machines_ip_port_current (ip, port),
      UNIQUE KEY uq_fp_machines_ip_port (ip_address, port),
      KEY idx_hr_fp_machines_ip (ip),
      KEY idx_hr_fp_machines_status (last_connection_status)
    )
  `)

  await ensureHrFpMachinesHybridAlign()

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_employee_mappings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      machine_id BIGINT UNSIGNED NOT NULL,
      machine_user_id VARCHAR(64) NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      enrollment_status ENUM('ENROLLED','PENDING','REVOKED') NOT NULL DEFAULT 'ENROLLED',
      enrolled_at DATETIME NULL,
      revoked_at DATETIME NULL,
      notes TEXT NULL,
      created_by_user_id BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_hr_fp_mapping_machine_user (machine_id, machine_user_id),
      KEY idx_hr_fp_mapping_employee (employee_id),
      KEY idx_hr_fp_mapping_enrollment (enrollment_status),
      CONSTRAINT fk_fp_map_machine FOREIGN KEY (machine_id) REFERENCES hr_fp_machines(id),
      CONSTRAINT fk_fp_map_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_sync_runs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      machine_id BIGINT UNSIGNED NOT NULL,
      actor_user_id BIGINT UNSIGNED NULL,
      sync_mode ENUM('MANUAL','SCHEDULED','RETRY') NOT NULL DEFAULT 'MANUAL',
      started_at DATETIME NOT NULL,
      finished_at DATETIME NULL,
      duration_ms BIGINT UNSIGNED NULL,
      total_records_fetched INT UNSIGNED NOT NULL DEFAULT 0,
      total_new_valid INT UNSIGNED NOT NULL DEFAULT 0,
      total_duplicates_skipped INT UNSIGNED NOT NULL DEFAULT 0,
      total_unmapped INT UNSIGNED NOT NULL DEFAULT 0,
      total_failed_parse INT UNSIGNED NOT NULL DEFAULT 0,
      final_status ENUM('SUCCESS','PARTIAL','FAILED') NOT NULL DEFAULT 'SUCCESS',
      error_summary TEXT NULL,
      PRIMARY KEY (id),
      CONSTRAINT fk_sync_run_machine FOREIGN KEY (machine_id) REFERENCES hr_fp_machines(id),
      KEY idx_hr_fp_sync_runs_machine (machine_id, started_at DESC),
      KEY idx_hr_fp_sync_runs_status (final_status),
      KEY idx_sync_run_machine_time (machine_id, started_at DESC)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_raw_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sync_run_id BIGINT UNSIGNED NULL,
      machine_id BIGINT UNSIGNED NOT NULL,
      machine_user_id VARCHAR(64) NOT NULL,
      employee_id BIGINT UNSIGNED NULL,
      event_timestamp_original DATETIME NOT NULL,
      event_timestamp_normalized DATETIME NOT NULL,
      event_type_raw VARCHAR(64) NULL,
      event_mode ENUM('IN','OUT','UNDEFINED') NOT NULL DEFAULT 'UNDEFINED',
      verify_score INT NULL,
      deduplication_hash CHAR(64) NOT NULL,
      is_unmapped TINYINT(1) NOT NULL DEFAULT 0,
      is_processed TINYINT(1) NOT NULL DEFAULT 0,
      raw_payload_json TEXT NULL,
      received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processing_notes TEXT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_hr_fp_raw_dedup (deduplication_hash),
      CONSTRAINT fk_raw_machine FOREIGN KEY (machine_id) REFERENCES hr_fp_machines(id),
      CONSTRAINT fk_raw_sync FOREIGN KEY (sync_run_id) REFERENCES hr_fp_sync_runs(id),
      CONSTRAINT fk_raw_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
      KEY idx_raw_time_norm (event_timestamp_normalized),
      KEY idx_hr_fp_raw_machine_ts (machine_id, event_timestamp_normalized DESC),
      KEY idx_hr_fp_raw_employee (employee_id),
      KEY idx_hr_fp_raw_unmapped (is_unmapped)
    )
  `)

  tablesEnsured = true
}

function toSqlDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function mapRowToMachine(row: Record<string, unknown>): FpMachineRow {
  return {
    id: Number(row.id),
    ip: String(row.ip ?? row.ip_address ?? ''),
    port: row.port === null || row.port === undefined ? null : Number(row.port),
    model: String(row.model ?? row.machine_model ?? ''),
    deviceTimezone: String(row.device_timezone ?? 'Asia/Jakarta'),
    authConfigEncrypted: String(row.auth_config_encrypted ?? ''),
    displayName: (
      row.display_name !== null && row.display_name !== undefined
        ? String(row.display_name)
        : (row.machine_name !== null && row.machine_name !== undefined ? String(row.machine_name) : '')
    ),
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
    lastConnectionStatus: (String(row.last_connection_status ?? 'OFFLINE') as ConnectionStatus),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapRowToMapping(row: Record<string, unknown>): FpMappingRow {
  return {
    id: Number(row.id),
    machineId: Number(row.machine_id),
    machineUserId: String(row.machine_user_id ?? ''),
    employeeId: Number(row.employee_id),
    employeeCode: row.employee_code === null || row.employee_code === undefined ? null : String(row.employee_code),
    fullName: row.full_name === null || row.full_name === undefined ? null : String(row.full_name),
    enrollmentStatus: (String(row.enrollment_status ?? 'ENROLLED') as EnrollmentStatus),
    enrolledAt: row.enrolled_at ? String(row.enrolled_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapRowToSyncRun(row: Record<string, unknown>): FpSyncRunRow {
  return {
    id: Number(row.id),
    machineId: Number(row.machine_id),
    actorUserId: row.actor_user_id === null || row.actor_user_id === undefined ? null : Number(row.actor_user_id),
    syncMode: (String(row.sync_mode ?? 'MANUAL') as SyncMode),
    startedAt: String(row.started_at ?? ''),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    durationMs: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms),
    totalRecordsFetched: Number(row.total_records_fetched ?? 0),
    totalNewValid: Number(row.total_new_valid ?? 0),
    totalDuplicatesSkipped: Number(row.total_duplicates_skipped ?? 0),
    totalUnmapped: Number(row.total_unmapped ?? 0),
    totalFailedParse: Number(row.total_failed_parse ?? 0),
    finalStatus: (String(row.final_status ?? 'SUCCESS') as SyncRunFinalStatus),
    errorSummary: row.error_summary === null || row.error_summary === undefined ? null : String(row.error_summary),
  }
}

export async function listDevices(): Promise<
  Array<Omit<FpMachineRow, 'authConfigEncrypted'> & { authConfigEncrypted: string }>
> {
  await ensureFingerprintTables()
  const rows = await runReviewDbQuery<Record<string, unknown>>(`
    SELECT
      id,
      ip,
      port,
      model,
      device_timezone,
      auth_config_encrypted,
      display_name,
      last_sync_at,
      last_connection_status,
      created_at,
      updated_at
    FROM hr_fp_machines
    ORDER BY id DESC
  `)
  return rows.map((r) => maskMachineAuth(mapRowToMachine(r)))
}

export async function getDevice(
  id: number,
): Promise<
  | (Omit<FpMachineRow, 'authConfigEncrypted'> & { authConfigEncrypted: string })
  | null
> {
  await ensureFingerprintTables()
  const rows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT
        id,
        ip,
        port,
        model,
        device_timezone,
        auth_config_encrypted,
        display_name,
        last_sync_at,
        last_connection_status,
        created_at,
        updated_at
      FROM hr_fp_machines
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )
  if (rows.length === 0) {
    return null
  }
  return maskMachineAuth(mapRowToMachine(rows[0]))
}

async function getDeviceRawUnmasked(id: number): Promise<FpMachineRow | null> {
  await ensureFingerprintTables()
  const rows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT
        id,
        ip,
        port,
        model,
        device_timezone,
        auth_config_encrypted,
        display_name,
        last_sync_at,
        last_connection_status,
        created_at,
        updated_at
      FROM hr_fp_machines
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )
  if (rows.length === 0) {
    return null
  }
  return mapRowToMachine(rows[0])
}

export async function createDevice(input: FpMachineCreateInput): Promise<{
  id: number
  masked: Omit<FpMachineRow, 'authConfigEncrypted'> & { authConfigEncrypted: string }
}> {
  validateFingerprintEncryptionConfiguredOrThrow()
  await ensureFingerprintTables()
  const ip = String(input.ip ?? '').trim()
  const model = String(input.model ?? '').trim()
  const deviceTimezone = String(input.deviceTimezone ?? 'Asia/Jakarta').trim() || 'Asia/Jakarta'
  const displayName = input.displayName ? String(input.displayName).trim() : null
  const port = input.port !== undefined && input.port !== null ? Number(input.port) : null
  const authConfigEncrypted = encryptAuthConfig(input.authConfig ?? null)

  if (!ip || !model) {
    throw new Error('VALIDATION_ERROR')
  }

  const dupCheck = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT id
      FROM hr_fp_machines
      WHERE (ip = ? OR ip_address = ?)
        AND (port <=> ?)
      LIMIT 1
    `,
    [ip, ip, port],
  )
  if (dupCheck.length > 0) {
    const err = new Error('DEVICE_DUPLICATE_IP_PORT') as Error & { code?: string }
    err.code = 'DEVICE_DUPLICATE_IP_PORT'
    throw err
  }

  const legacyMachineName = displayName ?? ip
  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_fp_machines (
        ip,
        ip_address,
        port,
        model,
        machine_model,
        machine_name,
        device_timezone,
        auth_config_encrypted,
        display_name,
        last_connection_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OFFLINE')
    `,
    [ip, ip, port, model, model, legacyMachineName, deviceTimezone, authConfigEncrypted, displayName],
  )

  const id = Number(result.insertId ?? 0)
  const device = await getDevice(id)
  return { id, masked: device! }
}

export async function updateDevice(
  id: number,
  input: FpMachineUpdateInput,
): Promise<
  (Omit<FpMachineRow, 'authConfigEncrypted'> & { authConfigEncrypted: string }) | null
> {
  if (Object.prototype.hasOwnProperty.call(input, 'authConfig')) {
    validateFingerprintEncryptionConfiguredOrThrow()
  }
  await ensureFingerprintTables()
  const existing = await getDeviceRawUnmasked(id)
  if (!existing) {
    return null
  }

  const ip = input.ip !== undefined ? String(input.ip).trim() : existing.ip
  const port = input.port !== undefined ? (input.port === null ? null : Number(input.port)) : existing.port
  const model = input.model !== undefined ? String(input.model).trim() : existing.model
  const deviceTimezone = input.deviceTimezone !== undefined
    ? (String(input.deviceTimezone).trim() || existing.deviceTimezone)
    : existing.deviceTimezone
  const displayName = input.displayName !== undefined
    ? (String(input.displayName).trim() || null)
    : (existing.displayName || null)

  let authConfigEncrypted = existing.authConfigEncrypted
  if (Object.prototype.hasOwnProperty.call(input, 'authConfig')) {
    authConfigEncrypted = encryptAuthConfig(input.authConfig ?? null)
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_fp_machines
      SET
        ip = ?,
        ip_address = ?,
        port = ?,
        model = ?,
        machine_model = ?,
        device_timezone = ?,
        auth_config_encrypted = ?,
        display_name = ?,
        machine_name = COALESCE(?, machine_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [ip, ip, port, model, model, deviceTimezone, authConfigEncrypted, displayName, displayName, id],
  )

  return getDevice(id)
}

export async function deleteDevice(id: number): Promise<boolean> {
  await ensureFingerprintTables()
  const result = await runReviewDbExecute<ExecuteResult>(
    `DELETE FROM hr_fp_machines WHERE id = ?`,
    [id],
  )
  return Number(result.affectedRows ?? 0) > 0
}

async function updateMachineConnectionStatus(id: number, status: ConnectionStatus) {
  await runReviewDbExecute<ExecuteResult>(
    `UPDATE hr_fp_machines SET last_connection_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, id],
  )
}

export function resolveConnectorForMachine(
  machine: FpMachineRow,
): FingerprintMachineConnector {
  const snapshot = getDataSourceSnapshot()
  const model = (machine.model || '').trim().toUpperCase()
  const effectiveIp = machine.ip
  const effectivePort = machine.port ?? undefined
  const authConfig = decryptAuthConfig(machine.authConfigEncrypted)
  const connectorConfig: FingerprintMachineConnector['machineConfig'] = {
    id: machine.id,
    ip: effectiveIp,
    port: effectivePort,
    model: machine.model,
    authConfig,
    deviceTimezone: machine.deviceTimezone || 'Asia/Jakarta',
  }

  const isMockEnv = snapshot.effectiveMode === 'review-db' || snapshot.configuredMode === 'review-db'
  const isMockModel = model.startsWith('MOCK')

  if (isMockModel || isMockEnv) {
    return new MockFingerprintConnector(connectorConfig)
  }

  return new MockFingerprintConnector(connectorConfig)
}

export async function testDeviceConnection(machineId: number): Promise<{
  ok: boolean
  info?: FingerprintDeviceInfo
  errorMessage?: string
}> {
  validateFingerprintEncryptionConfiguredOrThrow()
  await ensureFingerprintTables()
  const machine = await getDeviceRawUnmasked(machineId)
  if (!machine) {
    return { ok: false, errorMessage: 'MACHINE_NOT_FOUND' }
  }

  const connector = resolveConnectorForMachine(machine)
  const result = await connector.testConnection()

  if (result.ok) {
    await updateMachineConnectionStatus(machineId, 'ONLINE')
  } else if (result.errorMessage === 'AUTH_FAILED') {
    await updateMachineConnectionStatus(machineId, 'AUTH_FAILED')
  } else if (result.errorMessage === 'TIMEOUT') {
    await updateMachineConnectionStatus(machineId, 'OFFLINE')
  } else {
    await updateMachineConnectionStatus(machineId, 'SYNC_ERROR')
  }

  return result
}

async function updateLastSyncAt(machineId: number) {
  await runReviewDbExecute<ExecuteResult>(
    `UPDATE hr_fp_machines SET last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [machineId],
  )
}

function toUtcFromDeviceLocal(local: Date, deviceTz: string): Date {
  const tz = (deviceTz || 'Asia/Jakarta').trim().toUpperCase()
  let offsetMs = 7 * 60 * 60 * 1000
  if (tz === 'ASIA/MAKASSAR' || tz === 'ASIA/JAYAPURA') {
    offsetMs = 9 * 60 * 60 * 1000
  } else if (tz === 'UTC' || tz === 'ETC/UTC') {
    offsetMs = 0
  } else if (tz.startsWith('ASIA/')) {
    offsetMs = 7 * 60 * 60 * 1000
  }
  const utcMs = local.getTime() - offsetMs
  return new Date(utcMs)
}

export async function syncNow(
  machineId: number,
  actorUserId: number | null,
  syncMode: SyncMode = 'MANUAL',
  backfillDays?: number,
): Promise<SyncRunSummary> {
  validateFingerprintEncryptionConfiguredOrThrow()
  await ensureFingerprintTables()

  const startedAt = new Date()
  const startedAtSql = toSqlDateTime(startedAt)

  const requiredRawCols = [
    'event_timestamp_original',
    'event_timestamp_normalized',
    'event_mode',
    'raw_payload_json',
    'received_at',
    'processing_notes',
  ] as const
  const missingCols: string[] = []
  for (const col of requiredRawCols) {
    if (!(await hasReviewDbColumn('hr_fp_raw_events', col))) {
      missingCols.push(col)
    }
  }

  const machine = await getDeviceRawUnmasked(machineId)
  if (!machine) {
    throw new Error('MACHINE_NOT_FOUND')
  }

  const insertRunResult = await runReviewDbExecute<SqlExecuteResult & ExecuteResult>(
    `
      INSERT INTO hr_fp_sync_runs (
        machine_id,
        actor_user_id,
        sync_mode,
        started_at,
        total_records_fetched,
        total_new_valid,
        total_duplicates_skipped,
        total_unmapped,
        total_failed_parse,
        final_status,
        error_summary
      )
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)
    `,
    [
      machineId,
      actorUserId,
      syncMode,
      startedAtSql,
      missingCols.length > 0 ? 'FAILED' : 'SUCCESS',
      missingCols.length > 0 ? `SCHEMA_MISMATCH Missing hr_fp_raw_events columns: ${missingCols.join(', ')}. Jalankan migration hr_fp_raw_events additive 6 required columns terlebih dahulu.` : null,
    ],
  )
  const runId = Number(insertRunResult.insertId ?? 0)

  if (missingCols.length > 0 || insertRunResult.error !== null) {
    const msg =
      missingCols.length > 0
        ? `SCHEMA_MISMATCH Missing hr_fp_raw_events columns: ${missingCols.join(', ')}. Jalankan migration hr_fp_raw_events additive 6 required columns terlebih dahulu.`
        : `SYNC_PRECONDITION_FAILED: ${insertRunResult.errorCode != null ? `[SQL_ERROR:${insertRunResult.errorCode}] ` : ''}${insertRunResult.error || 'unknown precondition error'}`
    const now = new Date()
    const durationMs = Math.max(1, now.getTime() - startedAt.getTime())
    const finishedAtSql = toSqlDateTime(now)
    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_fp_sync_runs
        SET
          finished_at = ?,
          duration_ms = ?,
          final_status = ?,
          error_summary = ?
        WHERE id = ?
      `,
      [finishedAtSql, durationMs, 'FAILED', msg, runId],
    )
    await updateMachineConnectionStatus(machineId, 'SYNC_ERROR')
    return {
      id: runId,
      machineId,
      actorUserId,
      syncMode,
      startedAt: startedAtSql,
      finishedAt: finishedAtSql,
      durationMs,
      totalRecordsFetched: 0,
      totalNewValid: 0,
      totalDuplicatesSkipped: 0,
      totalUnmapped: 0,
      totalFailedParse: 0,
      finalStatus: 'FAILED',
      errorSummary: msg,
      cursorAdvanced: false,
    }
  }

  const cursorSinceRaw = machine.lastSyncAt
  const cursorSince: Date | null = backfillDays && Number.isFinite(backfillDays) && backfillDays > 0
    ? new Date(Date.now() - backfillDays * 86400000)
    : cursorSinceRaw
      ? new Date(cursorSinceRaw)
      : null

  let finalStatus: SyncRunFinalStatus = 'SUCCESS'
  let totalRecordsFetched = 0
  let totalNewValid = 0
  let totalDuplicatesSkipped = 0
  let totalUnmapped = 0
  let totalFailedParse = 0
  let errorSummary: string | null = null
  let cursorAdvanced = false

  const connector = resolveConnectorForMachine(machine)

  try {
    await connector.connect()
  } catch (connectError) {
    const msg = connectError instanceof Error ? connectError.message : 'CONNECT_FAILED'
    finalStatus = 'FAILED'
    errorSummary = msg
    const now = new Date()
    const durationMs = now.getTime() - startedAt.getTime()

    if (msg === 'AUTH_FAILED') {
      await updateMachineConnectionStatus(machineId, 'AUTH_FAILED')
    } else if (msg === 'TIMEOUT') {
      await updateMachineConnectionStatus(machineId, 'OFFLINE')
    } else {
      await updateMachineConnectionStatus(machineId, 'SYNC_ERROR')
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_fp_sync_runs
        SET
          finished_at = ?,
          duration_ms = ?,
          final_status = ?,
          error_summary = ?
        WHERE id = ?
      `,
      [toSqlDateTime(now), durationMs, 'FAILED', errorSummary, runId],
    )

    return {
      id: runId,
      machineId,
      actorUserId,
      syncMode,
      startedAt: startedAtSql,
      finishedAt: toSqlDateTime(now),
      durationMs,
      totalRecordsFetched,
      totalNewValid,
      totalDuplicatesSkipped,
      totalUnmapped,
      totalFailedParse,
      finalStatus: 'FAILED',
      errorSummary,
      cursorAdvanced: false,
    }
  }

  try {
    let rawEvents: RawFingerprintEvent[] = []
    try {
      rawEvents = await connector.pullAttendanceEvents(cursorSince)
    } catch (pullError) {
      const err = pullError as Error & { events?: RawFingerprintEvent[]; malformedCount?: number }
      if (err.events && Array.isArray(err.events)) {
        rawEvents = err.events
        totalFailedParse += err.malformedCount ?? 0
      } else {
        throw pullError
      }
    }

    totalRecordsFetched = rawEvents.length

    const existingMappings = await runReviewDbQuery<Record<string, unknown>>(
      `
        SELECT machine_user_id, employee_id
        FROM hr_fp_employee_mappings
        WHERE machine_id = ?
          AND enrollment_status = 'ENROLLED'
      `,
      [machineId],
    )

    const employeeMapByMachineUser = new Map<string, number>()
    for (const m of existingMappings) {
      employeeMapByMachineUser.set(
        String(m.machine_user_id ?? ''),
        Number(m.employee_id),
      )
    }

    for (const ev of rawEvents) {
      const tsLocal = ev.eventTimestampLocal
      const tsValid = tsLocal && Number.isFinite(tsLocal.getTime())
      const userValid = Boolean(String(ev.machineUserId ?? '').trim())
      if (!tsValid || !userValid) {
        totalFailedParse += 1
        continue
      }

      const dedupHash = computeDedupHash(
        machineId,
        ev.machineUserId,
        tsLocal,
        ev.eventTypeRaw,
      )

      const employeeId = employeeMapByMachineUser.get(String(ev.machineUserId)) ?? null
      const isUnmapped = employeeId === null ? 1 : 0
      if (isUnmapped === 1) {
        totalUnmapped += 1
      }

      const tsLocalSql = toSqlDateTime(tsLocal)
      const tsUtc = toUtcFromDeviceLocal(tsLocal, machine.deviceTimezone)
      const tsUtcSql = toSqlDateTime(tsUtc)
      const rawPayloadSerialized = ev.rawPayload ? JSON.stringify(ev.rawPayload) : null

      const checkExisting = await runReviewDbQuery<{ id: number }>(
        `SELECT id FROM hr_fp_raw_events WHERE deduplication_hash = ? LIMIT 1`,
        [dedupHash],
      )

      if (checkExisting.length > 0) {
        totalDuplicatesSkipped += 1
        const dupOkMsg =
          `[DUP_OK] Duplicate existing dedup hash id=${String(checkExisting[0]?.id ?? '')} machine_user_id=${String(ev.machineUserId ?? '')} ts_local=${tsLocalSql}`
        if (errorSummary === null) {
          errorSummary = dupOkMsg
        } else if (errorSummary.length < 8000) {
          errorSummary = errorSummary + ' | ' + dupOkMsg
        }
        await runReviewDbExecute<SqlExecuteResult & ExecuteResult>(
          `UPDATE hr_fp_raw_events SET is_processed = is_processed WHERE id = ?`,
          [checkExisting[0].id],
        )
        continue
      }

      const insertRaw = await runReviewDbExecute<SqlExecuteResult & ExecuteResult>(
        `
          INSERT INTO hr_fp_raw_events (
            machine_id,
            machine_user_id,
            employee_id,
            event_timestamp_original,
            event_timestamp_normalized,
            event_type_raw,
            verify_score,
            deduplication_hash,
            is_unmapped,
            is_processed,
            raw_payload_json,
            sync_run_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `,
        [
          machineId,
          ev.machineUserId,
          employeeId,
          tsLocalSql,
          tsUtcSql,
          ev.eventTypeRaw ?? null,
          ev.verifyScore ?? null,
          dedupHash,
          isUnmapped,
          rawPayloadSerialized,
          runId,
        ],
      )

      const rowsAffected = Number(insertRaw.affectedRows ?? 0)
      if (rowsAffected > 0) {
        totalNewValid += 1
      } else if (rowsAffected === 0 && checkExisting.length === 0) {
        totalFailedParse += 1
        let errMsg: string
        if (insertRaw.error !== null || insertRaw.errorCode !== null || insertRaw.errorSqlState != null) {
          const prefix = `[SQL_ERROR${insertRaw.errorCode != null ? `:${String(insertRaw.errorCode)}` : ''}]`
          errMsg =
            `${prefix} ${insertRaw.error || 'SQL_FAILURE unknown'} ` +
            `[machine_user_id=${String(ev.machineUserId ?? '')}, ts_local=${tsLocalSql}, ts_utc=${tsUtcSql}]`
        } else {
          errMsg =
            'INSERT hr_fp_raw_events affectedRows=0 not duplicate ' +
            `[machine_user_id=${String(ev.machineUserId ?? '')}, ts_local=${tsLocalSql}, ts_utc=${tsUtcSql}]`
        }
        if (errorSummary === null) {
          errorSummary = errMsg
        } else if (errorSummary.length < 8000) {
          errorSummary = errorSummary + ' | ' + errMsg
        }
      }
    }

    try {
      const genResult = await processRawEventsToDailyAttendance({
        employeeId: undefined,
        startDate: undefined,
        endDate: undefined,
      })
      if (genResult && typeof genResult.totalProcessed === 'number') {
        if (genResult.totalInserted > 0 || genResult.totalUpdated > 0) {
          // Counter propagated: raw event flagged is_processed handled inside engine itself by transaction; counters here for audit visibility only
        }
      }
    } catch (genError) {
      const msg =
        genError instanceof Error
          ? `ATTENDANCE_GENERATOR_ERROR: ${genError.message}`
          : `ATTENDANCE_GENERATOR_ERROR`
      totalFailedParse += 1
      if (errorSummary === null) {
        errorSummary = msg
      } else if (errorSummary.length < 8000) {
        errorSummary = errorSummary + ' | ' + msg
      }
    }

    await connector.disconnect().catch(() => null)

    const totalFetchedForRatio = Math.max(1, totalRecordsFetched)
    const unmappedPct = totalUnmapped / totalFetchedForRatio

    if (totalFailedParse > 0 || unmappedPct > 0.05) {
      finalStatus = 'PARTIAL'
    }

    if (finalStatus === 'PARTIAL') {
      await updateMachineConnectionStatus(machineId, 'SYNC_ERROR')
    } else {
      await updateMachineConnectionStatus(machineId, 'ONLINE')
    }

    await updateLastSyncAt(machineId)
    cursorAdvanced = true
  } catch (error) {
    finalStatus = 'FAILED'
    errorSummary = error instanceof Error ? error.message : 'SYNC_RUNTIME_ERROR'
    await updateMachineConnectionStatus(machineId, 'SYNC_ERROR')
  } finally {
    await connector.disconnect().catch(() => null)
  }

  const finishedAt = new Date()
  const durationMs = finishedAt.getTime() - startedAt.getTime()

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_fp_sync_runs
      SET
        finished_at = ?,
        duration_ms = ?,
        total_records_fetched = ?,
        total_new_valid = ?,
        total_duplicates_skipped = ?,
        total_unmapped = ?,
        total_failed_parse = ?,
        final_status = ?,
        error_summary = ?
      WHERE id = ?
    `,
    [
      toSqlDateTime(finishedAt),
      durationMs,
      totalRecordsFetched,
      totalNewValid,
      totalDuplicatesSkipped,
      totalUnmapped,
      totalFailedParse,
      finalStatus,
      errorSummary,
      runId,
    ],
  )

  return {
    id: runId,
    machineId,
    actorUserId,
    syncMode,
    startedAt: startedAtSql,
    finishedAt: toSqlDateTime(finishedAt),
    durationMs,
    totalRecordsFetched,
    totalNewValid,
    totalDuplicatesSkipped,
    totalUnmapped,
    totalFailedParse,
    finalStatus,
    errorSummary,
    cursorAdvanced,
  }
}

export async function listDeviceSyncRuns(
  machineId: number,
  limit = 50,
): Promise<FpSyncRunRow[]> {
  await ensureFingerprintTables()
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 500))
  const rows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT
        id,
        machine_id,
        actor_user_id,
        sync_mode,
        started_at,
        finished_at,
        duration_ms,
        total_records_fetched,
        total_new_valid,
        total_duplicates_skipped,
        total_unmapped,
        total_failed_parse,
        final_status,
        error_summary
      FROM hr_fp_sync_runs
      WHERE machine_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [machineId, safeLimit],
  )
  return rows.map(mapRowToSyncRun)
}

export async function listMappings(machineId?: number): Promise<FpMappingRow[]> {
  await ensureFingerprintTables()
  const sql = machineId
    ? `
        SELECT
          fm.id,
          fm.machine_id,
          fm.machine_user_id,
          fm.employee_id,
          he.employee_code,
          he.full_name,
          fm.enrollment_status,
          fm.enrolled_at,
          fm.revoked_at,
          fm.created_at,
          fm.updated_at
        FROM hr_fp_employee_mappings fm
        LEFT JOIN hr_employees he
          ON he.id = fm.employee_id
        WHERE fm.machine_id = ?
        ORDER BY fm.id DESC
      `
    : `
        SELECT
          fm.id,
          fm.machine_id,
          fm.machine_user_id,
          fm.employee_id,
          he.employee_code,
          he.full_name,
          fm.enrollment_status,
          fm.enrolled_at,
          fm.revoked_at,
          fm.created_at,
          fm.updated_at
        FROM hr_fp_employee_mappings fm
        LEFT JOIN hr_employees he
          ON he.id = fm.employee_id
        ORDER BY fm.id DESC
      `
  const params = machineId ? [machineId] : []
  const rows = await runReviewDbQuery<Record<string, unknown>>(sql, params)
  return rows.map(mapRowToMapping)
}

export async function autoRevokeResignedEmployeeMappings(): Promise<number> {
  await ensureFingerprintTables()
  const updated = await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_fp_employee_mappings fm
      JOIN hr_employees he
        ON he.id = fm.employee_id
      SET fm.enrollment_status = 'REVOKED',
          fm.revoked_at = COALESCE(fm.revoked_at, CURRENT_TIMESTAMP),
          fm.updated_at = CURRENT_TIMESTAMP
      WHERE fm.enrollment_status = 'ENROLLED'
        AND UPPER(COALESCE(he.employment_status, 'ACTIVE')) IN ('RESIGN','RESIGNED','NONAKTIF','INACTIVE','KELUAR')
    `,
  )
  return Number(updated.affectedRows ?? 0)
}

export async function createMapping(
  input: FpMappingCreateInput,
): Promise<{ mapping: FpMappingRow; created: boolean; conflict?: boolean }> {
  await ensureFingerprintTables()

  const machineId = Number(input.machineId)
  const machineUserId = String(input.machineUserId ?? '').trim()
  const employeeId = Number(input.employeeId)
  const enrollmentStatus: EnrollmentStatus = (
    input.enrollmentStatus ?? 'ENROLLED'
  ) as EnrollmentStatus

  if (!machineId || !machineUserId || !employeeId) {
    throw new Error('VALIDATION_ERROR')
  }

  await autoRevokeResignedEmployeeMappings()

  const empCheck = await runReviewDbQuery<Record<string, unknown>>(
    `SELECT id, employment_status, full_name, employee_code FROM hr_employees WHERE id = ? LIMIT 1`,
    [employeeId],
  )
  if (empCheck.length === 0) {
    throw new Error('EMPLOYEE_NOT_FOUND')
  }
  const empStatus = String(empCheck[0].employment_status ?? 'ACTIVE').toUpperCase()
  if (['RESIGN','RESIGNED','NONAKTIF','INACTIVE','KELUAR'].includes(empStatus)) {
    throw new Error('EMPLOYEE_RESIGNED_CANNOT_MAP')
  }

  const deviceCheck = await runReviewDbQuery<Record<string, unknown>>(
    `SELECT id, active FROM hr_fp_machines WHERE id = ? LIMIT 1`,
    [machineId],
  )
  if (deviceCheck.length === 0) {
    throw new Error('DEVICE_NOT_FOUND')
  }
  const devActive = Number(deviceCheck[0].active ?? 0)
  if (devActive !== 1) {
    throw new Error('DEVICE_NOT_ACTIVE')
  }

  const existingCheck = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT id, enrollment_status
      FROM hr_fp_employee_mappings
      WHERE machine_id = ?
        AND machine_user_id = ?
      LIMIT 1
    `,
    [machineId, machineUserId],
  )

  if (existingCheck.length > 0) {
    const existing = existingCheck[0]
    const existingStatus = String(existing.enrollment_status ?? '')
    if (existingStatus !== 'REVOKED') {
      return {
        mapping: mapRowToMapping({
          ...existing,
          machine_id: machineId,
          machine_user_id: machineUserId,
          employee_id: employeeId,
        }),
        created: false,
        conflict: true,
      }
    }
    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_fp_employee_mappings
        SET
          employee_id = ?,
          enrollment_status = ?,
          enrolled_at = COALESCE(enrolled_at, CURRENT_TIMESTAMP),
          revoked_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [employeeId, enrollmentStatus, Number(existing.id)],
    )
    const rows = await runReviewDbQuery<Record<string, unknown>>(
      `
        SELECT
          fm.id,
          fm.machine_id,
          fm.machine_user_id,
          fm.employee_id,
          he.employee_code,
          he.full_name,
          fm.enrollment_status,
          fm.enrolled_at,
          fm.revoked_at,
          fm.created_at,
          fm.updated_at
        FROM hr_fp_employee_mappings fm
        LEFT JOIN hr_employees he
          ON he.id = fm.employee_id
        WHERE fm.id = ?
        LIMIT 1
      `,
      [Number(existing.id)],
    )
    return { mapping: mapRowToMapping(rows[0]), created: true }
  }

  const inserted = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_fp_employee_mappings (
        machine_id,
        machine_user_id,
        employee_id,
        enrollment_status,
        enrolled_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [machineId, machineUserId, employeeId, enrollmentStatus],
  )

  const newId = Number(inserted.insertId ?? 0)
  const rows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT
        fm.id,
        fm.machine_id,
        fm.machine_user_id,
        fm.employee_id,
        he.employee_code,
        he.full_name,
        fm.enrollment_status,
        fm.enrolled_at,
        fm.revoked_at,
        fm.created_at,
        fm.updated_at
      FROM hr_fp_employee_mappings fm
      LEFT JOIN hr_employees he
        ON he.id = fm.employee_id
      WHERE fm.id = ?
      LIMIT 1
    `,
    [newId],
  )

  return { mapping: mapRowToMapping(rows[0]), created: true }
}

export async function updateMapping(
  id: number,
  input: FpMappingUpdateInput,
): Promise<{ mapping: FpMappingRow | null; updated: boolean; conflict?: boolean }> {
  await ensureFingerprintTables()

  const safeId = Number(id)
  if (!safeId || safeId <= 0) {
    throw new Error('VALIDATION_ERROR')
  }

  const currentRows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT id, machine_id, machine_user_id, employee_id, enrollment_status
      FROM hr_fp_employee_mappings
      WHERE id = ?
      LIMIT 1
    `,
    [safeId],
  )
  if (currentRows.length === 0) {
    return { mapping: null, updated: false }
  }
  const current = currentRows[0]
  const currentMachineId = Number(current.machine_id)

  let nextMachineUserId = String(input.machineUserId ?? current.machine_user_id ?? '').trim()
  let nextEmployeeId = Number.isFinite(Number(input.employeeId))
    ? Number(input.employeeId)
    : Number(current.employee_id)
  const enrollmentStatusRaw = String(input.enrollmentStatus ?? current.enrollment_status ?? 'ENROLLED')
    .trim()
    .toUpperCase()
  const nextEnrollmentStatus: EnrollmentStatus =
    enrollmentStatusRaw === 'PENDING' || enrollmentStatusRaw === 'REVOKED'
      ? enrollmentStatusRaw
      : 'ENROLLED'

  if (!nextMachineUserId || !nextEmployeeId) {
    throw new Error('VALIDATION_ERROR')
  }

  if (nextEmployeeId !== Number(current.employee_id)) {
    const empCheck = await runReviewDbQuery<Record<string, unknown>>(
      `SELECT id, employment_status, full_name, employee_code FROM hr_employees WHERE id = ? LIMIT 1`,
      [nextEmployeeId],
    )
    if (empCheck.length === 0) {
      throw new Error('EMPLOYEE_NOT_FOUND')
    }
    const empStatus = String(empCheck[0].employment_status ?? 'ACTIVE').toUpperCase()
    if (['RESIGN','RESIGNED','NONAKTIF','INACTIVE','KELUAR'].includes(empStatus)) {
      throw new Error('EMPLOYEE_RESIGNED_CANNOT_MAP')
    }
  }

  const deviceCheck = await runReviewDbQuery<Record<string, unknown>>(
    `SELECT id, active FROM hr_fp_machines WHERE id = ? LIMIT 1`,
    [currentMachineId],
  )
  if (deviceCheck.length === 0) {
    throw new Error('DEVICE_NOT_FOUND')
  }
  if (Number(deviceCheck[0].active ?? 0) !== 1) {
    throw new Error('DEVICE_NOT_ACTIVE')
  }

  if (
    nextMachineUserId !== String(current.machine_user_id ?? '') ||
    currentMachineId !== Number(current.machine_id)
  ) {
    const duplicateCheck = await runReviewDbQuery<Record<string, unknown>>(
      `
        SELECT id, enrollment_status
        FROM hr_fp_employee_mappings
        WHERE machine_id = ?
          AND machine_user_id = ?
          AND id <> ?
        LIMIT 1
      `,
      [currentMachineId, nextMachineUserId, safeId],
    )
    if (duplicateCheck.length > 0) {
      const dupStatus = String(duplicateCheck[0].enrollment_status ?? 'ENROLLED').toUpperCase()
      if (dupStatus !== 'REVOKED') {
        return {
          mapping: mapRowToMapping({
            ...current,
            machine_id: currentMachineId,
            machine_user_id: nextMachineUserId,
            employee_id: nextEmployeeId,
          }),
          updated: false,
          conflict: true,
        }
      }
    }
  }

  const revokedAtSql =
    nextEnrollmentStatus === 'REVOKED'
      ? 'COALESCE(revoked_at, CURRENT_TIMESTAMP)'
      : 'NULL'
  const enrolledAtSql =
    nextEnrollmentStatus !== 'REVOKED'
      ? 'COALESCE(enrolled_at, CURRENT_TIMESTAMP)'
      : 'enrolled_at'

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_fp_employee_mappings
      SET
        machine_user_id = ?,
        employee_id = ?,
        enrollment_status = ?,
        enrolled_at = ${enrolledAtSql},
        revoked_at = ${revokedAtSql},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [nextMachineUserId, nextEmployeeId, nextEnrollmentStatus, safeId],
  )

  const rows = await runReviewDbQuery<Record<string, unknown>>(
    `
      SELECT
        fm.id,
        fm.machine_id,
        fm.machine_user_id,
        fm.employee_id,
        he.employee_code,
        he.full_name,
        fm.enrollment_status,
        fm.enrolled_at,
        fm.revoked_at,
        fm.created_at,
        fm.updated_at
      FROM hr_fp_employee_mappings fm
      LEFT JOIN hr_employees he
        ON he.id = fm.employee_id
      WHERE fm.id = ?
      LIMIT 1
    `,
    [safeId],
  )
  return { mapping: rows[0] ? mapRowToMapping(rows[0]) : null, updated: true }
}

export async function deleteMapping(id: number): Promise<{ deleted: boolean; softRevoked?: boolean }> {
  await ensureFingerprintTables()
  const safeId = Number(id)
  if (!safeId || safeId <= 0) {
    throw new Error('VALIDATION_ERROR')
  }

  const current = await runReviewDbQuery<Record<string, unknown>>(
    `SELECT id, enrollment_status FROM hr_fp_employee_mappings WHERE id = ? LIMIT 1`,
    [safeId],
  )
  if (current.length === 0) {
    return { deleted: false }
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_fp_employee_mappings
      SET
        enrollment_status = 'REVOKED',
        revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [safeId],
  )
  return { deleted: true, softRevoked: true }
}
