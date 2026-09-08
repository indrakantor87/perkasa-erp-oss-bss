import mysql from 'mysql2/promise'

const MIGRATION_ID = 'phase-1.1-odp-2026-09-08'
const PORT_STATUS_ENUM = ['AVAILABLE', 'USED', 'RESERVED', 'FAULTY', 'DISABLED'] as const

type Mode = 'precheck' | 'apply' | 'postcheck'

type MigrationResult =
  | { outcome: 'PASS'; classification: 'READY' | 'ALREADY_MIGRATED' }
  | { outcome: 'FAIL'; classification: 'BLOCKED'; reason: string }

type ColumnInfo = {
  column_name: string
  column_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
}

type TableInfo = {
  table_name: string
  engine: string | null
}

type TableCount = {
  total: number
}

type IncomingFkInfo = {
  constraint_name: string
  table_name: string
  column_name: string
  referenced_table_name: string
  referenced_column_name: string
}

type ConstraintInfo = {
  constraint_name: string
  constraint_type: string
}

type ServiceAssignmentColumnExpectation = {
  column: string
  type: string
  nullable: 'YES' | 'NO'
}

export function parseMode(argv: string[]): Mode | null {
  const raw = argv.find((item) => item.startsWith('--mode='))
  if (!raw) return null
  const mode = raw.replace(/^--mode=/, '').trim()
  if (mode === 'precheck' || mode === 'apply' || mode === 'postcheck') return mode
  return null
}

export function getMigrationId() {
  return MIGRATION_ID
}

export function getPortStatusEnumValues() {
  return [...PORT_STATUS_ENUM]
}

function normalizeType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isIso8601(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  const parsed = Date.parse(trimmed)
  return Number.isFinite(parsed)
}

function logLine(message: string) {
  process.stdout.write(`${message}\n`)
}

function fail(reason: string): MigrationResult {
  return { outcome: 'FAIL', classification: 'BLOCKED', reason }
}

function pass(classification: 'READY' | 'ALREADY_MIGRATED'): MigrationResult {
  return { outcome: 'PASS', classification }
}

function getDatabaseUrl(): string | null {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    const db = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
    if (!db) return null
    if (!parsed.hostname) return null
    if (!parsed.username) return null
    return raw
  } catch {
    return null
  }
}

async function createPool() {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL missing or invalid.')
  }
  return mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
    connectTimeout: 5000,
  })
}

async function querySingleRow<T extends object>(pool: mysql.Pool, sql: string, values: unknown[] = []) {
  const [rows] = await pool.query(sql, values)
  const list = rows as T[]
  return list[0] ?? null
}

async function queryRows<T extends object>(pool: mysql.Pool, sql: string, values: unknown[] = []) {
  const [rows] = await pool.query(sql, values)
  return rows as T[]
}

async function execute(pool: mysql.Pool, sql: string) {
  await pool.query(sql)
}

async function getMysqlVersion(pool: mysql.Pool) {
  const row = await querySingleRow<{ mysql_version: string }>(pool, 'SELECT VERSION() AS mysql_version')
  return row?.mysql_version?.trim() ?? ''
}

async function getCurrentDatabase(pool: mysql.Pool) {
  const row = await querySingleRow<{ current_database: string | null }>(
    pool,
    'SELECT DATABASE() AS current_database',
  )
  return row?.current_database?.trim() ?? ''
}

async function tableExists(pool: mysql.Pool, tableName: string) {
  const row = await querySingleRow<{ total: number }>(
    pool,
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [tableName],
  )
  return Number(row?.total ?? 0) > 0
}

async function getTableEngine(pool: mysql.Pool, tableName: string) {
  const row = await querySingleRow<TableInfo>(
    pool,
    `
      SELECT table_name, engine
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [tableName],
  )
  return row?.engine ?? null
}

async function getTableCount(pool: mysql.Pool, tableName: string) {
  const row = await querySingleRow<TableCount>(pool, `SELECT COUNT(*) AS total FROM ${tableName}`)
  return Number(row?.total ?? 0)
}

async function getColumn(pool: mysql.Pool, tableName: string, columnName: string) {
  const row = await querySingleRow<ColumnInfo>(
    pool,
    `
      SELECT column_name, column_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [tableName, columnName],
  )
  return row
}

async function incomingFkToTable(pool: mysql.Pool, tableName: string) {
  const rows = await queryRows<IncomingFkInfo>(
    pool,
    `
      SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
        AND referenced_table_name = ?
    `,
    [tableName],
  )
  return rows
}

async function hasIndex(pool: mysql.Pool, tableName: string, indexName: string) {
  const row = await querySingleRow<{ total: number }>(
    pool,
    `
      SELECT COUNT(*) AS total
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
    `,
    [tableName, indexName],
  )
  return Number(row?.total ?? 0) > 0
}

async function getConstraints(pool: mysql.Pool, tableName: string) {
  return queryRows<ConstraintInfo>(
    pool,
    `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [tableName],
  )
}

async function getOutgoingFks(pool: mysql.Pool, tableName: string) {
  const rows = await queryRows<IncomingFkInfo>(
    pool,
    `
      SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND referenced_table_name IS NOT NULL
      ORDER BY constraint_name, column_name
    `,
    [tableName],
  )
  return rows
}

function isPortStatusEnumType(type: string) {
  const normalized = normalizeType(type)
  const target = `enum('${PORT_STATUS_ENUM.join("','")}')`
  return normalized === target
}

function isLegacyStatusEnumType(type: string) {
  const normalized = normalizeType(type)
  return normalized === "enum('available','used','blocked')" || normalized === "enum('AVAILABLE','USED','BLOCKED')".toLowerCase()
}

function isBigintUnsigned(type: string) {
  return normalizeType(type) === 'bigint unsigned'
}

function isInt(type: string) {
  const normalized = normalizeType(type)
  return normalized === 'int' || normalized === 'int unsigned'
}

function isVarchar30(type: string) {
  return normalizeType(type) === 'varchar(30)'
}

function equalsDefaultAvailable(value: string | null) {
  if (value === null) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'available' || normalized === "'available'" || normalized === "available'"
}

function expectServiceAssignmentColumns(): ServiceAssignmentColumnExpectation[] {
  return [
    { column: 'id', type: 'bigint unsigned', nullable: 'NO' },
    { column: 'subscription_id', type: 'bigint unsigned', nullable: 'YES' },
    { column: 'work_order_id', type: 'bigint unsigned', nullable: 'YES' },
    { column: 'inventory_item_id', type: 'bigint unsigned', nullable: 'NO' },
    { column: 'customer_id', type: 'bigint unsigned', nullable: 'YES' },
    { column: 'assignment_status', type: "enum('assigned','returned','damaged','lost')", nullable: 'NO' },
    { column: 'assigned_at', type: 'datetime', nullable: 'NO' },
    { column: 'returned_at', type: 'datetime', nullable: 'YES' },
    { column: 'created_at', type: 'datetime', nullable: 'NO' },
    { column: 'updated_at', type: 'datetime', nullable: 'NO' },
  ]
}

function normalizeAssignmentStatusEnum(type: string) {
  return normalizeType(type) === "enum('assigned','returned','damaged','lost')"
}

async function verifyServiceDeviceAssignmentsCanonical(pool: mysql.Pool): Promise<MigrationResult> {
  const exists = await tableExists(pool, 'service_device_assignments')
  if (!exists) {
    return pass('READY')
  }

  const engine = await getTableEngine(pool, 'service_device_assignments')
  if (!engine || engine.trim().toLowerCase() !== 'innodb') {
    return fail('service_device_assignments engine mismatch (expected InnoDB).')
  }

  for (const expected of expectServiceAssignmentColumns()) {
    const col = await getColumn(pool, 'service_device_assignments', expected.column)
    if (!col) {
      return fail(`service_device_assignments missing required column ${expected.column}.`)
    }
    if (expected.column === 'assignment_status') {
      if (!normalizeAssignmentStatusEnum(col.column_type)) {
        return fail('service_device_assignments.assignment_status enum mismatch.')
      }
    } else if (expected.column === 'assigned_at' || expected.column === 'returned_at' || expected.column === 'created_at' || expected.column === 'updated_at') {
      if (normalizeType(col.column_type) !== expected.type) {
        return fail(`service_device_assignments.${expected.column} type mismatch.`)
      }
    } else if (!isBigintUnsigned(col.column_type)) {
      return fail(`service_device_assignments.${expected.column} type mismatch (expected BIGINT UNSIGNED).`)
    }

    if (col.is_nullable !== expected.nullable) {
      return fail(`service_device_assignments.${expected.column} nullability mismatch.`)
    }
  }

  const constraints = await getConstraints(pool, 'service_device_assignments')
  const hasPrimary = constraints.some((item) => item.constraint_type.toUpperCase() === 'PRIMARY KEY')
  if (!hasPrimary) {
    return fail('service_device_assignments PRIMARY KEY missing.')
  }

  const fks = await getOutgoingFks(pool, 'service_device_assignments')
  const required = [
    { column: 'subscription_id', refTable: 'service_subscriptions', refColumn: 'id' },
    { column: 'work_order_id', refTable: 'service_work_orders', refColumn: 'id' },
    { column: 'inventory_item_id', refTable: 'inventory_items', refColumn: 'id' },
    { column: 'customer_id', refTable: 'crm_customers', refColumn: 'id' },
  ]
  for (const req of required) {
    const match = fks.some(
      (item) =>
        item.column_name === req.column &&
        item.referenced_table_name === req.refTable &&
        item.referenced_column_name === req.refColumn,
    )
    if (!match) {
      return fail(`service_device_assignments FK missing: ${req.column} -> ${req.refTable}.${req.refColumn}.`)
    }
  }

  return pass('READY')
}

async function precheck(pool: mysql.Pool): Promise<MigrationResult> {
  logLine(`PHASE_1_1`)
  logLine(`MIGRATION_ID=${MIGRATION_ID}`)
  logLine(`PREFLIGHT_START=${new Date().toISOString()}`)

  const mysqlVersion = await getMysqlVersion(pool)
  const currentDatabase = await getCurrentDatabase(pool)
  logLine(`MYSQL_VERSION=${mysqlVersion || 'UNKNOWN'}`)
  logLine(`DATABASE=${currentDatabase || 'UNKNOWN'}`)

  if (currentDatabase !== 'default') {
    return fail(`P0 FAIL: database must be default (got ${currentDatabase || 'UNKNOWN'}).`)
  }
  logLine('P0 PASS')

  const hasOdp = await tableExists(pool, 'network_odp')
  const hasPorts = await tableExists(pool, 'network_odp_ports')
  if (!hasOdp || !hasPorts) {
    return fail('P0 FAIL: required tables network_odp/network_odp_ports missing.')
  }

  const odpRows = await getTableCount(pool, 'network_odp')
  const portRows = await getTableCount(pool, 'network_odp_ports')
  logLine(`network_odp.rows=${odpRows}`)
  logLine(`network_odp_ports.rows=${portRows}`)
  if (odpRows !== 0 || portRows !== 0) {
    return fail('P1 FAIL: network_odp and network_odp_ports must be empty for fast-path migration.')
  }
  logLine('P1 PASS')

  const portNo = await getColumn(pool, 'network_odp_ports', 'port_no')
  const legacyStatus = await getColumn(pool, 'network_odp_ports', 'status')
  const portStatus = await getColumn(pool, 'network_odp_ports', 'port_status')

  if (!portNo) {
    return fail('P2 FAIL: network_odp_ports.port_no missing.')
  }

  const portNoType = normalizeType(portNo.column_type)
  const portNoNullable = portNo.is_nullable
  const portNoIsVarchar = isVarchar30(portNoType)
  const portNoIsInt = isInt(portNoType)

  if (!portNoIsVarchar && !portNoIsInt) {
    return fail(`P2 FAIL: network_odp_ports.port_no unexpected type (${portNo.column_type}).`)
  }
  if (portNoNullable !== 'NO') {
    return fail('P2 FAIL: network_odp_ports.port_no must be NOT NULL.')
  }

  if (!legacyStatus) {
    return fail('P2 FAIL: network_odp_ports.status missing. Unexpected intermediate state.')
  }
  if (!isLegacyStatusEnumType(legacyStatus.column_type)) {
    return fail(`P2 FAIL: network_odp_ports.status unexpected enum/type (${legacyStatus.column_type}).`)
  }

  if (portStatus) {
    if (!isPortStatusEnumType(portStatus.column_type)) {
      return fail('P2 FAIL: network_odp_ports.port_status enum mismatch.')
    }
    if (portStatus.is_nullable !== 'NO') {
      return fail('P2 FAIL: network_odp_ports.port_status must be NOT NULL.')
    }
    if (!equalsDefaultAvailable(portStatus.column_default)) {
      return fail('P2 FAIL: network_odp_ports.port_status default mismatch (expected AVAILABLE).')
    }
  }

  logLine('P2 PASS')

  const incoming = await incomingFkToTable(pool, 'network_odp_ports')
  if (incoming.length > 0) {
    return fail('P3 FAIL: incoming FK referencing network_odp_ports detected.')
  }
  logLine('P3 PASS')

  const parentTables = ['service_subscriptions', 'service_work_orders', 'inventory_items', 'crm_customers'] as const
  for (const table of parentTables) {
    const exists = await tableExists(pool, table)
    if (!exists) {
      return fail(`P4 FAIL: required parent table missing: ${table}.`)
    }
    const engine = await getTableEngine(pool, table)
    if (!engine || engine.trim().toLowerCase() !== 'innodb') {
      return fail(`P4 FAIL: ${table} engine mismatch (expected InnoDB).`)
    }
    const idColumn = await getColumn(pool, table, 'id')
    if (!idColumn) {
      return fail(`P4 FAIL: ${table}.id missing.`)
    }
    if (!isBigintUnsigned(idColumn.column_type) || idColumn.is_nullable !== 'NO') {
      return fail(`P4 FAIL: ${table}.id must be BIGINT UNSIGNED NOT NULL.`)
    }
  }
  logLine('P4 PASS')

  const serviceAssignmentsCheck = await verifyServiceDeviceAssignmentsCanonical(pool)
  if (serviceAssignmentsCheck.outcome === 'FAIL') {
    return fail(`P5 FAIL: ${serviceAssignmentsCheck.reason}`)
  }
  logLine('P5 PASS')

  const alreadyMigrated = portNoIsInt && Boolean(portStatus) && (await tableExists(pool, 'service_device_assignments'))
  if (alreadyMigrated) {
    return pass('ALREADY_MIGRATED')
  }
  return pass('READY')
}

async function verifyPortStatus(pool: mysql.Pool): Promise<MigrationResult> {
  const col = await getColumn(pool, 'network_odp_ports', 'port_status')
  if (!col) return fail('VERIFY FAIL: port_status missing after DDL.')
  if (!isPortStatusEnumType(col.column_type)) return fail('VERIFY FAIL: port_status enum mismatch after DDL.')
  if (col.is_nullable !== 'NO') return fail('VERIFY FAIL: port_status nullability mismatch after DDL.')
  if (!equalsDefaultAvailable(col.column_default)) return fail('VERIFY FAIL: port_status default mismatch after DDL.')
  return pass('READY')
}

async function verifyPortNoInt(pool: mysql.Pool): Promise<MigrationResult> {
  const col = await getColumn(pool, 'network_odp_ports', 'port_no')
  if (!col) return fail('VERIFY FAIL: port_no missing after DDL.')
  if (!isInt(col.column_type)) return fail(`VERIFY FAIL: port_no type mismatch after DDL (${col.column_type}).`)
  if (col.is_nullable !== 'NO') return fail('VERIFY FAIL: port_no must be NOT NULL after DDL.')
  return pass('READY')
}

async function verifyServiceAssignments(pool: mysql.Pool): Promise<MigrationResult> {
  const res = await verifyServiceDeviceAssignmentsCanonical(pool)
  if (res.outcome === 'FAIL') return res
  const exists = await tableExists(pool, 'service_device_assignments')
  if (!exists) return fail('VERIFY FAIL: service_device_assignments missing after DDL.')
  return pass('READY')
}

async function applyMigration(pool: mysql.Pool): Promise<MigrationResult> {
  const gate = await precheck(pool)
  if (gate.outcome === 'FAIL') return gate
  if (gate.classification === 'ALREADY_MIGRATED') {
    logLine('ALREADY_MIGRATED')
    logLine('MIGRATION PASS')
    return gate
  }

  const portStatus = await getColumn(pool, 'network_odp_ports', 'port_status')
  if (!portStatus) {
    logLine('DDL STEP 1: ADD port_status')
    await execute(
      pool,
      `ALTER TABLE network_odp_ports ADD COLUMN port_status ENUM('${PORT_STATUS_ENUM.join(
        "','",
      )}') NOT NULL DEFAULT 'AVAILABLE'`,
    )
    const v = await verifyPortStatus(pool)
    if (v.outcome === 'FAIL') return v
    logLine('VERIFY 1 PASS')
  } else {
    const v = await verifyPortStatus(pool)
    if (v.outcome === 'FAIL') return v
    logLine('STEP 1 SKIP (already present)')
  }

  const portNo = await getColumn(pool, 'network_odp_ports', 'port_no')
  if (!portNo) return fail('Unexpected state: port_no missing before step 2.')
  if (!isInt(portNo.column_type)) {
    logLine('DDL STEP 2: MODIFY port_no INT NOT NULL')
    await execute(pool, `ALTER TABLE network_odp_ports MODIFY COLUMN port_no INT NOT NULL`)
    const v = await verifyPortNoInt(pool)
    if (v.outcome === 'FAIL') return v
    logLine('VERIFY 2 PASS')
  } else {
    const v = await verifyPortNoInt(pool)
    if (v.outcome === 'FAIL') return v
    logLine('STEP 2 SKIP (already INT)')
  }

  const indexName = 'idx_network_odp_ports_port_status'
  const indexExists = await hasIndex(pool, 'network_odp_ports', indexName)
  if (!indexExists) {
    logLine('DDL STEP 3: CREATE INDEX idx_network_odp_ports_port_status')
    await execute(pool, `CREATE INDEX ${indexName} ON network_odp_ports(port_status)`)
    const ok = await hasIndex(pool, 'network_odp_ports', indexName)
    if (!ok) return fail('VERIFY FAIL: port_status index missing after create.')
    logLine('VERIFY 3 PASS')
  } else {
    logLine('STEP 3 SKIP (index exists)')
  }

  const assignmentsExists = await tableExists(pool, 'service_device_assignments')
  if (!assignmentsExists) {
    logLine('DDL STEP 4: CREATE TABLE service_device_assignments')
    await execute(
      pool,
      `
      CREATE TABLE service_device_assignments (
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
      ) ENGINE=InnoDB
    `,
    )
    const v = await verifyServiceAssignments(pool)
    if (v.outcome === 'FAIL') return v
    logLine('VERIFY 4 PASS')
  } else {
    const v = await verifyServiceAssignments(pool)
    if (v.outcome === 'FAIL') return v
    logLine('STEP 4 SKIP (already present)')
  }

  logLine('MIGRATION PASS')
  return pass('READY')
}

async function postcheck(pool: mysql.Pool): Promise<MigrationResult> {
  const gate = await precheck(pool)
  if (gate.outcome === 'FAIL') return gate

  const portStatus = await verifyPortStatus(pool)
  if (portStatus.outcome === 'FAIL') return portStatus

  const portNo = await verifyPortNoInt(pool)
  if (portNo.outcome === 'FAIL') return portNo

  const svc = await verifyServiceAssignments(pool)
  if (svc.outcome === 'FAIL') return svc

  logLine('POSTCHECK PASS')
  logLine('MIGRATION PASS')
  return pass('ALREADY_MIGRATED')
}

export function validateBackupEvidence(params: {
  backupIdentifier: string
  backupTimestampUtc: string
  backupLocation: string
  backupChecksumSha256: string
  confirmBackupDurable: string
}) {
  if (!params.backupIdentifier.trim()) return { ok: false as const, reason: 'backup_identifier empty' }
  if (!isIso8601(params.backupTimestampUtc)) return { ok: false as const, reason: 'backup_timestamp_utc invalid' }
  if (!params.backupLocation.trim()) return { ok: false as const, reason: 'backup_location empty' }
  if (params.backupLocation.includes('/tmp/')) {
    return { ok: false as const, reason: 'backup_location points to /tmp or non-durable artifact' }
  }
  if (!/^[0-9a-fA-F]{64}$/.test(params.backupChecksumSha256.trim())) {
    return { ok: false as const, reason: 'backup_checksum_sha256 invalid' }
  }
  if (params.confirmBackupDurable !== 'YES_DURABLE_OFFHOST_CONFIRMED') {
    return { ok: false as const, reason: 'confirm_backup_durable mismatch' }
  }
  return { ok: true as const }
}

async function main() {
  const mode = parseMode(process.argv.slice(2))
  if (!mode) {
    logLine(`PHASE_1_1`)
    logLine(`MIGRATION_ID=${MIGRATION_ID}`)
    logLine('ERROR=INVALID_MODE')
    logLine('Expected: --mode=precheck | --mode=apply | --mode=postcheck')
    process.exit(2)
  }

  logLine(`PHASE_1_1`)
  logLine(`MIGRATION_ID=${MIGRATION_ID}`)
  logLine(`MODE=${mode}`)

  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    logLine('ERROR=DATABASE_URL_MISSING_OR_INVALID')
    process.exit(3)
  }

  const pool = await createPool()
  try {
    const result =
      mode === 'precheck' ? await precheck(pool) : mode === 'apply' ? await applyMigration(pool) : await postcheck(pool)
    if (result.outcome === 'FAIL') {
      logLine(`RESULT=FAIL`)
      logLine(`REASON=${result.reason}`)
      process.exit(10)
    }
    logLine(`RESULT=PASS`)
    logLine(`CLASSIFICATION=${result.classification}`)
    process.exit(0)
  } finally {
    await pool.end().catch(() => null)
  }
}

if (require.main === module) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message.trim() : 'UNKNOWN_ERROR'
    logLine(`PHASE_1_1`)
    logLine(`MIGRATION_ID=${MIGRATION_ID}`)
    logLine(`ERROR=${message || 'UNKNOWN_ERROR'}`)
    process.exit(1)
  })
}
