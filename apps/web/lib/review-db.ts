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

export function invalidateReviewDbColumnCache(tableName?: string, columnName?: string) {
  if (!tableName) {
    reviewDbColumnCache.clear()
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

export async function runReviewDbExecute<T>(sql: string, values: unknown[] = []) {
  const pool = await getPool()
  if (isDisabledPool(pool)) {
    return { affectedRows: 0, insertId: 0, changedRows: 0 } as unknown as T
  }
  try {
    const [result] = await pool.query(sql, values)
    return result as T
  } catch (error) {
    if (typeof window === 'undefined') {
      return { affectedRows: 0, insertId: 0, changedRows: 0 } as unknown as T
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
