import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const MODULE_PATH = '@/lib/review-db'

describe('REV51.6 Production Runtime DDL Guard', () => {
  const originalEnv = process.env
  let capturedSql: string[] = []
  let originalAddColumnFn: unknown
  let originalRunFn: unknown

  beforeEach(() => {
    process.env = { ...originalEnv }
    capturedSql = []
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  async function importFresh() {
    const resolved = new URL(MODULE_PATH, import.meta.url)
    return import(resolved.toString() + '?t=' + Date.now())
  }

  it('NODE_ENV!=production preserves lazy DDL path (addColumnIfMissing does not throw for missing)', async () => {
    process.env.NODE_ENV = 'development'
    const mod = await importFresh()
    let calledAlter = false
    const pool = {
      query: async (sql: string): Promise<[unknown[], unknown]> => {
        capturedSql.push(String(sql))
        const upper = String(sql).trim().toUpperCase()
        if (upper.startsWith('SELECT COUNT(*)') && upper.includes('INFORMATION_SCHEMA.COLUMNS')) {
          return [[{ total: 0 }], {}]
        }
        if (upper.startsWith('ALTER TABLE')) {
          calledAlter = true
          return [{ affectedRows: 0, insertId: 0, changedRows: 0 }, {}]
        }
        return [[], {}]
      },
    }
    // @ts-expect-error globalThis write for test
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)
    try {
      await mod.addColumnIfMissing('tbl', 'col', 'col INT NULL', 'after')
      assert.ok(calledAlter, 'dev environment must still run ALTER TABLE for lazy provisioning')
    } finally {
      // @ts-expect-error cleanup
      delete globalThis.__perkasaReviewDbPool
    }
  })

  it('NODE_ENV=production throw PRODUCTION_SCHEMA_NOT_READY before ALTER in addColumnIfMissing', async () => {
    process.env.NODE_ENV = 'production'
    const mod = await importFresh()
    const pool = {
      query: async (sql: string): Promise<[unknown[], unknown]> => {
        capturedSql.push(String(sql))
        const upper = String(sql).trim().toUpperCase()
        if (upper.startsWith('SELECT COUNT(*)') && upper.includes('INFORMATION_SCHEMA.COLUMNS')) {
          return [[{ total: 0 }], {}]
        }
        return [[], {}]
      },
    }
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)
    try {
      await assert.rejects(
        () => mod.addColumnIfMissing('service_work_order_assignments', 'released_by_user_id', 'released_by_user_id BIGINT UNSIGNED NULL', 'accepted_by_user_id'),
        (err: Error & { code?: string }) => {
          assert.equal(err?.code, 'PRODUCTION_SCHEMA_NOT_READY')
          assert.match(String(err?.message ?? ''), /Runtime schema provisioning is blocked in production/)
          return true
        },
      )
      assert.ok(!capturedSql.some((s) => s.trim().toUpperCase().startsWith('ALTER TABLE')), 'ALTER must not be executed in production')
    } finally {
      // @ts-expect-error cleanup
      delete globalThis.__perkasaReviewDbPool
    }
  })

  it('NODE_ENV=production runReviewDbExecute blocks CREATE TABLE/ALTER TABLE/DROP/TRUNCATE DDL with PRODUCTION_SCHEMA_NOT_READY', async () => {
    process.env.NODE_ENV = 'production'
    const mod = await importFresh()
    const pool = { query: async (sql: string): Promise<[unknown[], unknown]> => { capturedSql.push(sql); return [[], {}] } }
    // @ts-expect-error global test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)
    try {
      await assert.rejects(
        () => mod.runReviewDbExecute('CREATE TABLE IF NOT EXISTS foo (id INT)'),
        (err: Error & { code?: string }) => err?.code === 'PRODUCTION_SCHEMA_NOT_READY',
      )
      await assert.rejects(
        () => mod.runReviewDbExecute('ALTER TABLE foo ADD COLUMN bar INT NULL'),
        (err: Error & { code?: string }) => err?.code === 'PRODUCTION_SCHEMA_NOT_READY',
      )
      await assert.rejects(
        () => mod.runReviewDbExecute('DROP TABLE foo'),
        (err: Error & { code?: string }) => err?.code === 'PRODUCTION_SCHEMA_NOT_READY',
      )
    } finally {
      // @ts-expect-error cleanup
      delete globalThis.__perkasaReviewDbPool
    }
  })

  it('NODE_ENV=production runReviewDbExecute still allows non-DDL business INSERT/UPDATE/SELECT', async () => {
    process.env.NODE_ENV = 'production'
    const mod = await importFresh()
    let queriesRun = 0
    const pool = {
      query: async (sql: string): Promise<[unknown[], unknown]> => {
        capturedSql.push(sql)
        queriesRun += 1
        return [{ affectedRows: 1, insertId: 42, changedRows: 1 }, {}] as unknown as [unknown[], unknown]
      },
    }
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)
    try {
      const r1 = await mod.runReviewDbExecute('INSERT INTO auth_users(username) VALUES (?)', ['operator'])
      assert.ok(r1, 'insert allowed')
      const r2 = await mod.runReviewDbExecute('UPDATE auth_users SET display_name=? WHERE id=?', ['a', 1])
      assert.ok(r2, 'update allowed')
      const r3 = await mod.runReviewDbQuery('SELECT 1 AS ping', [])
      assert.ok(Array.isArray(r3), 'select allowed')
      assert.equal(queriesRun, 3, 'all three non-DDL queries executed')
    } finally {
      // @ts-expect-error cleanup
      delete globalThis.__perkasaReviewDbPool
    }
  })

  it('isReviewDbProductionRuntime becomes false ONLY when explicit authorizeSchemaProvisionForThisProcess called', async () => {
    process.env.NODE_ENV = 'production'
    process.env.PERKASA_ERP_EXPLICIT_SCHEMA_PROVISION_CLI_AUTHORIZED = ''
    const mod = await importFresh()
    assert.equal(mod.isReviewDbProductionRuntime(), true, 'default blocked')
    mod.authorizeSchemaProvisionForThisProcess()
    assert.equal(mod.isReviewDbProductionRuntime(), false, 'authorized allowed for CLI APPLY')
  })
})
