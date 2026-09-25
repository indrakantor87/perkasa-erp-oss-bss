import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { MockFingerprintConnector } from './mock-connector'
import type {
  ConnectionStatus,
  EnrollmentStatus,
  FingerprintDeviceInfo,
  FingerprintMachineConnector,
  FpMachineCreateInput,
  FpMachineRow,
  FpMachineUpdateInput,
  FpMappingCreateInput,
  FpMappingRow,
  FpSyncRunRow,
  RawFingerprintEvent,
  SyncMode,
  SyncRunFinalStatus,
  SyncRunSummary,
} from './types'

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

export async function ensureFingerprintTables() {
  if (tablesEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_machines (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ip VARCHAR(64) NOT NULL,
      port INT UNSIGNED NULL,
      model VARCHAR(80) NOT NULL,
      device_timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
      auth_config_encrypted TEXT NULL,
      display_name VARCHAR(120) NULL,
      last_sync_at DATETIME NULL,
      last_connection_status ENUM('ONLINE','OFFLINE','AUTH_FAILED','SYNC_ERROR') NOT NULL DEFAULT 'OFFLINE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_hr_fp_machines_ip (ip),
      KEY idx_hr_fp_machines_status (last_connection_status)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_employee_mappings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      machine_id BIGINT UNSIGNED NOT NULL,
      machine_user_id VARCHAR(64) NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      enrollment_status ENUM('ENROLLED','PENDING','REVOKED') NOT NULL DEFAULT 'ENROLLED',
      enrolled_at DATETIME NULL,
      revoked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_hr_fp_mapping_machine_user (machine_id, machine_user_id),
      KEY idx_hr_fp_mapping_employee (employee_id),
      KEY idx_hr_fp_mapping_enrollment (enrollment_status)
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
      KEY idx_hr_fp_sync_runs_machine (machine_id, started_at DESC),
      KEY idx_hr_fp_sync_runs_status (final_status)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_fp_raw_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      machine_id BIGINT UNSIGNED NOT NULL,
      machine_user_id VARCHAR(64) NOT NULL,
      employee_id BIGINT UNSIGNED NULL,
      event_timestamp_local DATETIME NOT NULL,
      event_timestamp_utc DATETIME NOT NULL,
      event_type_raw VARCHAR(64) NULL,
      verify_score INT NULL,
      deduplication_hash CHAR(64) NOT NULL,
      is_unmapped TINYINT(1) NOT NULL DEFAULT 0,
      is_processed TINYINT(1) NOT NULL DEFAULT 0,
      raw_payload JSON NULL,
      sync_run_id BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_hr_fp_raw_dedup (deduplication_hash),
      KEY idx_hr_fp_raw_machine_ts (machine_id, event_timestamp_local DESC),
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
    ip: String(row.ip ?? ''),
    port: row.port === null || row.port === undefined ? null : Number(row.port),
    model: String(row.model ?? ''),
    deviceTimezone: String(row.device_timezone ?? 'Asia/Jakarta'),
    authConfigEncrypted: String(row.auth_config_encrypted ?? ''),
    displayName: row.display_name === null || row.display_name === undefined ? '' : String(row.display_name),
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

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_fp_machines (
        ip,
        port,
        model,
        device_timezone,
        auth_config_encrypted,
        display_name,
        last_connection_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'OFFLINE')
    `,
    [ip, port, model, deviceTimezone, authConfigEncrypted, displayName],
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
        port = ?,
        model = ?,
        device_timezone = ?,
        auth_config_encrypted = ?,
        display_name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [ip, port, model, deviceTimezone, authConfigEncrypted, displayName, id],
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
): Promise<SyncRunSummary> {
  validateFingerprintEncryptionConfiguredOrThrow()
  await ensureFingerprintTables()

  const startedAt = new Date()
  const startedAtSql = toSqlDateTime(startedAt)

  const machine = await getDeviceRawUnmasked(machineId)
  if (!machine) {
    throw new Error('MACHINE_NOT_FOUND')
  }

  const insertRunResult = await runReviewDbExecute<ExecuteResult>(
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
        final_status
      )
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 'SUCCESS')
    `,
    [machineId, actorUserId, syncMode, startedAtSql],
  )
  const runId = Number(insertRunResult.insertId ?? 0)

  const cursorSinceRaw = machine.lastSyncAt
  const cursorSince: Date | null = cursorSinceRaw ? new Date(cursorSinceRaw) : null

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
        await runReviewDbExecute<ExecuteResult>(
          `UPDATE hr_fp_raw_events SET is_processed = is_processed WHERE id = ?`,
          [checkExisting[0].id],
        )
        continue
      }

      const insertRaw = await runReviewDbExecute<ExecuteResult>(
        `
          INSERT INTO hr_fp_raw_events (
            machine_id,
            machine_user_id,
            employee_id,
            event_timestamp_local,
            event_timestamp_utc,
            event_type_raw,
            verify_score,
            deduplication_hash,
            is_unmapped,
            is_processed,
            raw_payload,
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

      if (Number(insertRaw.affectedRows ?? 0) > 0) {
        totalNewValid += 1
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
