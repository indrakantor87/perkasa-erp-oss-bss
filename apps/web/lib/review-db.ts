export type ReviewDbPool = {
  query: (sql: string, values?: unknown[]) => Promise<[unknown[], unknown]>
  getConnection: () => Promise<ReviewDbConnection>
}

export type ReviewDbConnection = {
  query: (sql: string, values?: unknown[]) => Promise<[unknown[], unknown]>
  beginTransaction: () => Promise<void>
  commit: () => Promise<void>
  rollback: () => Promise<void>
  release: () => void
}

declare global {
  var __perkasaReviewDbPool: Promise<ReviewDbPool> | undefined
}

const reviewDbColumnCache = new Map<string, boolean>()
const reviewDbTableCache = new Map<string, boolean>()

export function invalidateReviewDbColumnCache(tableName?: string, columnName?: string) {
  if (!tableName) {
    reviewDbColumnCache.clear()
    reviewDbTableCache.clear()
    return
  }

  const normalizedTable = tableName.toLowerCase()
  if (columnName) {
    reviewDbColumnCache.delete(`${normalizedTable}.${columnName.toLowerCase()}`)
    return
  }

  for (const key of reviewDbColumnCache.keys()) {
    if (key.startsWith(`${normalizedTable}.`)) {
      reviewDbColumnCache.delete(key)
    }
  }
}

export function invalidateReviewDbTableCache(tableName?: string) {
  if (!tableName) {
    reviewDbTableCache.clear()
    return
  }
  reviewDbTableCache.delete(tableName.toLowerCase())
}

type DatabaseConfig = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function getDatabaseConfig(): DatabaseConfig | null {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    return null
  }

  try {
    const parsed = new URL(databaseUrl)
    const config: DatabaseConfig = {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    }
    if (!config.database || !config.host) {
      return null
    }
    if (!Number.isFinite(config.port) || config.port <= 0 || config.port > 65535) {
      config.port = 3306
    }
    return config
  } catch {
    return null
  }
}

type DisabledReviewDbPool = {
  __perkasaDisabled: true
}

function createDisabledPool(): ReviewDbPool {
  const disabled: DisabledReviewDbPool = { __perkasaDisabled: true }
  return disabled as unknown as ReviewDbPool
}

function isDisabledPool(pool: ReviewDbPool): pool is ReviewDbPool & DisabledReviewDbPool {
  return (pool as unknown as DisabledReviewDbPool)?.__perkasaDisabled === true
}

export function isReviewDbConfigured(): boolean {
  return getDatabaseConfig() !== null
}

async function createPool(): Promise<ReviewDbPool> {
  const config = getDatabaseConfig()
  if (!config) {
    return createDisabledPool()
  }

  try {
    const mysql = await import('mysql2/promise')
    return mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 4,
      queueLimit: 0,
      connectTimeout: Number(process.env.REVIEW_DB_CONNECT_TIMEOUT_MS ?? 1500),
    }) as unknown as ReviewDbPool
  } catch {
    return createDisabledPool()
  }
}

async function getPool() {
  globalThis.__perkasaReviewDbPool ??= createPool()
  return globalThis.__perkasaReviewDbPool
}

export async function runReviewDbQuery<T>(sql: string, values: unknown[] = []) {
  const pool = await getPool()
  if (isDisabledPool(pool)) {
    return [] as T[]
  }
  try {
    const [rows] = await pool.query(sql, values)
    return rows as T[]
  } catch (error) {
    if (typeof window === 'undefined') {
      return [] as T[]
    }
    throw error
  }
}

export type SqlExecuteResult = {
  affectedRows: number
  insertId: number
  changedRows: number
  error: string | null
  errorCode: number | null
  errorSqlState?: string | null
}

function extractSqlErrorInfo(error: unknown): { message: string; code: number | null; sqlState: string | null } {
  let message = 'UNKNOWN_ERROR'
  let code: number | null = null
  let sqlState: string | null = null
  if (error instanceof Error) {
    message = error.message.trim() || message
    const anyErr = error as unknown as { code?: string | number; errno?: number; sqlState?: string }
    if (typeof anyErr.code === 'number') {
      code = anyErr.code
    } else if (typeof anyErr.code === 'string') {
      const numeric = parseInt(anyErr.code.replace(/\D/g, ''), 10)
      code = Number.isFinite(numeric) && numeric > 0 ? numeric : anyErr.errno && Number.isFinite(anyErr.errno) ? anyErr.errno : null
    } else if (typeof anyErr.errno === 'number') {
      code = anyErr.errno
    }
    if (typeof anyErr.sqlState === 'string') {
      sqlState = anyErr.sqlState || null
    }
  }
  return { message, code, sqlState }
}

export async function runReviewDbQueryWithError<T>(
  sql: string,
  values: unknown[] = [],
): Promise<{ rows: T[]; error: string | null; errorCode: number | null; errorSqlState?: string | null; disabled: boolean }> {
  const pool = await getPool()
  if (isDisabledPool(pool)) {
    return { rows: [] as T[], error: 'REVIEW_DB_NOT_CONFIGURED', errorCode: null, errorSqlState: null, disabled: true }
  }
  try {
    const [rows] = await pool.query(sql, values)
    return { rows: rows as T[], error: null, errorCode: null, errorSqlState: null, disabled: false }
  } catch (error) {
    if (typeof window === 'undefined') {
      const info = extractSqlErrorInfo(error)
      return { rows: [] as T[], error: info.message || 'UNKNOWN_ERROR', errorCode: info.code, errorSqlState: info.sqlState, disabled: false }
    }
    throw error
  }
}

export async function runReviewDbExecute<T>(sql: string, values: unknown[] = []) {
  const pool = await getPool()
  if (isDisabledPool(pool)) {
    return { affectedRows: 0, insertId: 0, changedRows: 0, error: 'REVIEW_DB_NOT_CONFIGURED', errorCode: null, errorSqlState: null } as unknown as T
  }
  try {
    const [result] = await pool.query(sql, values)
    return Object.assign({}, result as object, { error: null, errorCode: null, errorSqlState: null }) as T
  } catch (error) {
    if (typeof window === 'undefined') {
      const info = extractSqlErrorInfo(error)
      // Preserve actual SQL error instead of silent 0 affectedRows.
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' || (typeof process !== 'undefined' && process.env?.DEBUG_REVIEW_DB === '1')) {
        try {
          console.error('[REVIEW_DB_SQL_ERROR]', {
            errorCode: info.code,
            errorSqlState: info.sqlState,
            message: info.message,
            sql: sql.substring(0, 200),
          })
        } catch {}
      }
      return { affectedRows: 0, insertId: 0, changedRows: 0, error: info.message || 'UNKNOWN_ERROR', errorCode: info.code, errorSqlState: info.sqlState } as unknown as T
    }
    throw error
  }
}

export async function hasReviewDbColumn(tableName: string, columnName: string) {
  const cacheKey = `${tableName}.${columnName}`.toLowerCase()
  if (reviewDbColumnCache.has(cacheKey)) {
    return reviewDbColumnCache.get(cacheKey) ?? false
  }

  try {
    const rows = await runReviewDbQuery<{ total: number }>(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND column_name = ?
      `,
      [tableName, columnName],
    )

    const exists = Number(rows[0]?.total ?? 0) > 0
    reviewDbColumnCache.set(cacheKey, exists)
    return exists
  } catch {
    reviewDbColumnCache.set(cacheKey, false)
    return false
  }
}

export async function hasReviewDbTable(tableName: string) {
  const cacheKey = tableName.toLowerCase()
  if (reviewDbTableCache.has(cacheKey)) {
    return reviewDbTableCache.get(cacheKey) ?? false
  }

  try {
    const rows = await runReviewDbQuery<{ total: number }>(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = ?
      `,
      [tableName],
    )

    const exists = Number(rows[0]?.total ?? 0) > 0
    reviewDbTableCache.set(cacheKey, exists)
    return exists
  } catch {
    reviewDbTableCache.set(cacheKey, false)
    return false
  }
}

export async function runReviewDbTransaction<T>(handler: (connection: ReviewDbConnection) => Promise<T>) {
  const pool = await getPool()
  if (isDisabledPool(pool)) {
    throw new Error('Mode review DB belum tersedia pada environment saat ini.')
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await handler(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => null)
    throw error
  } finally {
    connection.release()
  }
}

export async function addColumnIfMissing(
  tableName: string,
  columnName: string,
  columnDefinition: string,
  afterColumnName?: string,
) {
  const exists = await hasReviewDbColumn(tableName, columnName)
  if (exists) {
    return
  }

  const afterClause = afterColumnName?.trim()
    ? ` AFTER ${afterColumnName}`
    : ''

  await runReviewDbExecute(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}${afterClause}`,
  )

  invalidateReviewDbColumnCache(tableName, columnName)
}

export function getReviewDbErrorDetail(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `Review DB belum bisa dibaca. ${error.message.trim()}`
  }

  return 'Review DB belum bisa dibaca. Service layer kembali memakai mock data.'
}
