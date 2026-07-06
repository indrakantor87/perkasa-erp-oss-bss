type ReviewDbPool = {
  query: (sql: string, values?: unknown[]) => Promise<[unknown[], unknown]>
}

declare global {
  var __perkasaReviewDbPool: Promise<ReviewDbPool> | undefined
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
  })
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

export function getReviewDbErrorDetail(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `Review DB belum bisa dibaca. ${error.message.trim()}`
  }

  return 'Review DB belum bisa dibaca. Service layer kembali memakai mock data.'
}
