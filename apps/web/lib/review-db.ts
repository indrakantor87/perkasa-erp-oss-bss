type ReviewDbPool = {
  query: (sql: string, values?: unknown[]) => Promise<[unknown[], unknown]>
  getConnection: () => Promise<ReviewDbConnection>
}

type ReviewDbConnection = {
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

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum diisi.')
  }

  const parsed = new URL(databaseUrl)

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  }
}

async function createPool(): Promise<ReviewDbPool> {
  const mysql = await import('mysql2/promise')
  const config = getDatabaseConfig()

  return mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
    connectTimeout: Number(process.env.REVIEW_DB_CONNECT_TIMEOUT_MS ?? 1500),
  }) as unknown as ReviewDbPool
}

async function getPool() {
  globalThis.__perkasaReviewDbPool ??= createPool()
  return globalThis.__perkasaReviewDbPool
}

export async function runReviewDbQuery<T>(sql: string, values: unknown[] = []) {
  const pool = await getPool()
  const [rows] = await pool.query(sql, values)
  return rows as T[]
}

export async function runReviewDbExecute<T>(sql: string, values: unknown[] = []) {
  const pool = await getPool()
  const [result] = await pool.query(sql, values)
  return result as T
}

export async function hasReviewDbColumn(tableName: string, columnName: string) {
  const cacheKey = `${tableName}.${columnName}`.toLowerCase()
  if (reviewDbColumnCache.has(cacheKey)) {
    return reviewDbColumnCache.get(cacheKey) ?? false
  }

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
}

export async function runReviewDbTransaction<T>(handler: (connection: ReviewDbConnection) => Promise<T>) {
  const pool = await getPool()
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
