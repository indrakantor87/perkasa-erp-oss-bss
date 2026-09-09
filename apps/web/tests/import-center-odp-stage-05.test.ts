import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preflightOdpOnlyImportBatch, retryImportBatch, TRANSFORM_STAGE_ORDER } from '../lib/services/import-write-service'

async function readStage5Sql() {
  const url = new URL('../../../database/xampp_review_transform_stage_5.sql', import.meta.url)
  return readFile(fileURLToPath(url), 'utf8')
}

async function readDockerfile() {
  const url = new URL('../../../Dockerfile', import.meta.url)
  return readFile(fileURLToPath(url), 'utf8')
}

async function readDockerignore() {
  const url = new URL('../../../.dockerignore', import.meta.url)
  return readFile(fileURLToPath(url), 'utf8')
}

async function readTransformRouteSource() {
  const url = new URL('../app/api/import/batches/[id]/transform/route.ts', import.meta.url)
  return readFile(fileURLToPath(url), 'utf8')
}

function splitSqlStatements(sql: string) {
  const cleaned = sql
    .split(/\r?\n/)
    .map((line) => (line.trimStart().startsWith('--') ? '' : line))
    .join('\n')

  return cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !/^USE\s+/i.test(statement))
}

function createMockPool(params: {
  batchRow: { id: number; batchCode: string; importScope: string; status: string; note: string | null }
  counts: Record<string, number>
  throwOnTable?: string
}) {
  return {
    query: async (sql: string): Promise<[unknown[], unknown]> => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim()

      if (normalized.includes('FROM staging_import_batches')) {
        return [[params.batchRow], {}]
      }

      const match = normalized.match(/\bFROM\s+([a-zA-Z0-9_]+)/i)
      if (match) {
        const table = match[1]
        if (params.throwOnTable && table === params.throwOnTable) {
          throw new Error('SIMULATED_QUERY_ERROR')
        }
        if (Object.prototype.hasOwnProperty.call(params.counts, table)) {
          return [[{ total: params.counts[table] }], {}]
        }
      }

      return [[{ total: 0 }], {}]
    },
  }
}

describe('Import Center Stage 05 (ODP) integration', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.__perkasaReviewDbPool
    ;(globalThis as unknown as { __perkasaImportWriteServiceHooks?: unknown }).__perkasaImportWriteServiceHooks =
      undefined
  })

  it('stage order includes 05', () => {
    assert.ok(TRANSFORM_STAGE_ORDER.includes('05'))
  })

  it('stage 05 SQL invariants', async () => {
    const sql = await readStage5Sql()
    const upper = sql.toUpperCase()
    const statements = splitSqlStatements(sql)

    assert.ok(sql.includes('@batch_id'), 'Stage 05 must be batch-scoped via @batch_id.')
    assert.ok(!sql.includes('SAMPLE-WEBPSB-ODP-001'), 'Stage 05 must not use hardcoded sample batch code.')

    assert.ok(upper.includes('INSERT INTO NETWORK_ODP'), 'Stage 05 must write network_odp.')
    assert.ok(upper.includes('UPDATE STAGING_LEGACY_NETWORK_ODP_RECORDS'), 'Stage 05 must update staging target_odp_id.')
    assert.ok(upper.includes('INSERT INTO NETWORK_ODP_PORTS'), 'Stage 05 must write network_odp_ports.')

    assert.ok(upper.includes("PORT_STATUS"), 'Stage 05 must use port_status column.')
    assert.ok(upper.includes("'AVAILABLE'"), 'Stage 05 must bootstrap AVAILABLE ports.')
    assert.ok(upper.includes('PORT_NO < 512'), 'Stage 05 must cap recursive sequence to 512.')

    assert.ok(!/\bDROP\b/i.test(sql), 'Stage 05 must not contain DROP.')
    assert.ok(!/\bTRUNCATE\b/i.test(sql), 'Stage 05 must not contain TRUNCATE.')
    assert.ok(!/\bDELETE\b/i.test(sql), 'Stage 05 must not contain DELETE.')

    assert.equal(statements.length, 3, 'Stage 05 must contain exactly 3 statements (INSERT header, UPDATE staging link, INSERT ports).')
  })

  it('runtime packaging contract: Dockerfile copies stage SQL to /app/apps/web/database', async () => {
    const dockerfile = await readDockerfile()
    assert.ok(
      dockerfile.includes('COPY database/xampp_review_transform_stage_*.sql /app/database/'),
      'Dockerfile must copy stage SQL files from build context into builder stage.',
    )
    assert.ok(
      dockerfile.includes('COPY --from=builder /app/database/ /app/apps/web/database/'),
      'Dockerfile must copy stage SQL files into final runtime path /app/apps/web/database/.',
    )
    for (const n of [1, 2, 3, 4, 5]) {
      assert.ok(
        dockerfile.includes(`/app/apps/web/database/xampp_review_transform_stage_${n}.sql`),
        `Dockerfile runner verification must check stage_${String(n).padStart(2, '0')} exists.`,
      )
    }
  })

  it('runtime packaging contract: .dockerignore must include stage SQL files', async () => {
    const dockerignore = await readDockerignore()
    assert.ok(dockerignore.includes('database/*'), 'dockerignore must ignore database/* by default.')
    assert.ok(
      dockerignore.includes('!database/xampp_review_transform_stage_*.sql'),
      'dockerignore must re-include xampp_review_transform_stage_*.sql.',
    )
  })

  it('stage 05 SQL supports existing ODP code: resolves target_odp_id even if INSERT is skipped', async () => {
    const sql = await readStage5Sql()
    const statements = splitSqlStatements(sql)
    const insertOdp = statements[0] ?? ''
    const updateStaging = statements[1] ?? ''

    assert.ok(/INSERT\s+INTO\s+network_odp\b/i.test(insertOdp))
    assert.ok(/NOT\s+EXISTS\s*\(/i.test(insertOdp), 'Header insert must be idempotent via NOT EXISTS.')

    assert.ok(/UPDATE\s+staging_legacy_network_odp_records\b/i.test(updateStaging))
    assert.ok(/JOIN\s+network_odp\b/i.test(updateStaging), 'Staging linkback must JOIN to network_odp (works even if ODP pre-exists).')
    assert.ok(/so\.batch_id\s*=\s*@batch_id/i.test(updateStaging), 'Staging update must be batch-scoped.')
    assert.ok(/so\.target_odp_id\s+IS\s+NULL/i.test(updateStaging), 'Staging update must be retry-safe (only set when NULL).')
  })

  it('stage 05 SQL ports bootstrap targets only ODP linked by this batch and is idempotent', async () => {
    const sql = await readStage5Sql()
    const statements = splitSqlStatements(sql)
    const insertPorts = statements[2] ?? ''

    assert.ok(/INSERT\s+INTO\s+network_odp_ports\b/i.test(insertPorts))
    assert.ok(/FROM\s*\(\s*SELECT\s+DISTINCT\s+target_odp_id\b/i.test(insertPorts), 'Ports must originate from staging-linked target_odp_id set for this batch.')
    assert.ok(/WHERE\s+batch_id\s*=\s*@batch_id/i.test(insertPorts), 'Ports bootstrap must be batch-scoped at staging linkage step.')
    assert.ok(/LEFT\s+JOIN\s+network_odp_ports\b/i.test(insertPorts))
    assert.ok(/WHERE\s+p\.id\s+IS\s+NULL/i.test(insertPorts), 'Ports insert must be idempotent (skip existing).')
  })

  it('route enforces preflight before transform for stage 05 only (static order proof)', async () => {
    const src = await readTransformRouteSource()
    const idxPreflight = src.indexOf('await preflightOdpOnlyImportBatch')
    const idxTransform = src.indexOf('await transformImportBatch')

    assert.ok(idxPreflight > 0, 'Route must call preflight for stage 05.')
    assert.ok(idxTransform > 0, 'Route must call transformImportBatch.')
    assert.ok(idxPreflight < idxTransform, 'Preflight must happen before transformImportBatch.')

    assert.ok(src.includes("if (stage === '05')"), 'Preflight must be conditional for stage 05.')
  })

  it('ODP-only preflight allows INVENTORY + odp>0 + all non-ODP=0', async () => {
    const counts: Record<string, number> = {
      staging_legacy_network_odp_records: 2,
      staging_legacy_inventory_item_records: 0,
      staging_legacy_inventory_movement_records: 0,
      staging_legacy_user_records: 0,
      staging_legacy_employee_records: 0,
      staging_legacy_attendance_records: 0,
      staging_legacy_salary_records: 0,
      staging_legacy_loan_records: 0,
      staging_legacy_customer_records: 0,
      staging_legacy_order_records: 0,
      staging_legacy_support_records: 0,
      staging_legacy_billing_invoice_records: 0,
      staging_legacy_billing_item_records: 0,
      staging_legacy_billing_payment_records: 0,
      staging_legacy_billing_collection_records: 0,
    }
    const pool = createMockPool({
      batchRow: { id: 10, batchCode: 'BATCH-ODP-001', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      counts,
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    const result = await preflightOdpOnlyImportBatch('10')
    assert.equal(result.batchPk, 10)
    assert.equal(result.odpRows, 2)
    assert.deepEqual(result.nonOdpCounts, {})
  })

  it('ODP-only preflight blocks non-INVENTORY scope', async () => {
    const pool = createMockPool({
      batchRow: { id: 11, batchCode: 'BATCH-HR-001', importScope: 'HR', status: 'VALIDATED', note: null },
      counts: { staging_legacy_network_odp_records: 2 },
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    await assert.rejects(() => preflightOdpOnlyImportBatch('11'))
  })

  it('ODP-only preflight blocks zero ODP rows', async () => {
    const pool = createMockPool({
      batchRow: { id: 12, batchCode: 'BATCH-ODP-EMPTY', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      counts: { staging_legacy_network_odp_records: 0 },
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    await assert.rejects(() => preflightOdpOnlyImportBatch('12'))
  })

  it('ODP-only preflight blocks mixed batch with other staging rows', async () => {
    const counts: Record<string, number> = {
      staging_legacy_network_odp_records: 2,
      staging_legacy_order_records: 1,
    }
    const pool = createMockPool({
      batchRow: { id: 13, batchCode: 'BATCH-MIXED', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      counts,
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    await assert.rejects(
      () => preflightOdpOnlyImportBatch('13'),
      (err: Error) => String(err.message).includes('Non-ODP staging rows terdeteksi'),
    )
  })

  it('ODP-only preflight blocks if any count query errors (fail-closed)', async () => {
    const counts: Record<string, number> = {
      staging_legacy_network_odp_records: 2,
      staging_legacy_order_records: 0,
      staging_legacy_support_records: 0,
    }
    const pool = createMockPool({
      batchRow: { id: 14, batchCode: 'BATCH-ODP-ERR', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      counts,
      throwOnTable: 'staging_legacy_support_records',
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    await assert.rejects(
      () => preflightOdpOnlyImportBatch('14'),
      (err: Error) => String(err.message).includes('query gagal'),
    )
  })

  it('retry stage 01–04 does not call ODP-only preflight', async () => {
    const calls: string[] = []
    ;(globalThis as unknown as { __perkasaImportWriteServiceHooks?: unknown }).__perkasaImportWriteServiceHooks =
      {
        preflightOdpOnlyImportBatch: async () => {
          calls.push('preflight')
        },
        transformImportBatch: async () => {
          calls.push('transform')
          return {
            batchId: 10,
            batchCode: 'BATCH-ODP-001',
            stage: '04',
            executedStatements: 0,
            status: 'VALIDATED',
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
            importedRows: 0,
            skippedRows: 0,
            duplicateRows: 0,
          }
        },
      }

    const pool = createRetryMockPool({
      batchRow: { id: 10, batchCode: 'BATCH-ODP-001', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      failedStage: null,
      counts: {
        staging_legacy_network_odp_records: { total: 1, VALID: 1 },
      },
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    const result = await retryImportBatch('10', 'Tester', '04')
    assert.equal(result.mode, 'transform')
    assert.deepEqual(calls, ['transform'])
  })

  it('retry stage 05 calls ODP-only preflight before transform', async () => {
    const calls: string[] = []
    ;(globalThis as unknown as { __perkasaImportWriteServiceHooks?: unknown }).__perkasaImportWriteServiceHooks =
      {
        preflightOdpOnlyImportBatch: async () => {
          calls.push('preflight')
        },
        transformImportBatch: async () => {
          calls.push('transform')
          return {
            batchId: 10,
            batchCode: 'BATCH-ODP-001',
            stage: '05',
            executedStatements: 0,
            status: 'VALIDATED',
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
            importedRows: 0,
            skippedRows: 0,
            duplicateRows: 0,
          }
        },
      }

    const pool = createRetryMockPool({
      batchRow: { id: 10, batchCode: 'BATCH-ODP-001', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      failedStage: '05',
      counts: {
        staging_legacy_network_odp_records: { total: 1, VALID: 1 },
      },
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    const result = await retryImportBatch('10', 'Tester')
    assert.equal(result.mode, 'transform')
    assert.deepEqual(calls, ['preflight', 'transform'])
  })

  it('retry stage 05 blocks when preflight fails', async () => {
    const calls: string[] = []
    ;(globalThis as unknown as { __perkasaImportWriteServiceHooks?: unknown }).__perkasaImportWriteServiceHooks =
      {
        preflightOdpOnlyImportBatch: async () => {
          calls.push('preflight')
          throw new Error('BLOCKED_PREFLIGHT')
        },
        transformImportBatch: async () => {
          calls.push('transform')
          return {}
        },
      }

    const pool = createRetryMockPool({
      batchRow: { id: 10, batchCode: 'BATCH-ODP-001', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      failedStage: '05',
      counts: {
        staging_legacy_network_odp_records: { total: 1, VALID: 1 },
      },
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    await assert.rejects(
      () => retryImportBatch('10', 'Tester'),
      (err: Error) => String(err.message).includes('BLOCKED_PREFLIGHT'),
    )
    assert.deepEqual(calls, ['preflight'])
  })

  it('retry stage 05 blocks on preflight query error (fail-closed)', async () => {
    const calls: string[] = []
    ;(globalThis as unknown as { __perkasaImportWriteServiceHooks?: unknown }).__perkasaImportWriteServiceHooks =
      {
        transformImportBatch: async () => {
          calls.push('transform')
          return {}
        },
      }

    const pool = createRetryMockPool({
      batchRow: { id: 10, batchCode: 'BATCH-ODP-001', importScope: 'INVENTORY', status: 'VALIDATED', note: null },
      failedStage: '05',
      counts: {
        staging_legacy_network_odp_records: { total: 1, VALID: 1 },
      },
      throwOnTable: 'staging_legacy_support_records',
    })
    // @ts-expect-error test hook
    globalThis.__perkasaReviewDbPool = Promise.resolve(pool)

    await assert.rejects(
      () => retryImportBatch('10', 'Tester'),
      (err: Error) => String(err.message).includes('query gagal'),
    )
    assert.deepEqual(calls, [])
  })
})

function createRetryMockPool(params: {
  batchRow: { id: number; batchCode: string; importScope: string; status: string; note: string | null }
  failedStage: string | null
  counts: Record<string, { total: number; VALID?: number; INVALID?: number; IMPORTED?: number; SKIPPED?: number; duplicate?: number }>
  throwOnTable?: string
}) {
  return {
    query: async (sql: string, values?: unknown[]): Promise<[unknown[], unknown]> => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim()

      if (normalized.includes('FROM staging_import_batches')) {
        return [[params.batchRow], {}]
      }

      if (normalized.includes('FROM staging_import_batch_transform_runs')) {
        if (normalized.includes("run_status = 'RUNNING'")) {
          return [[{ runningCount: 0 }], {}]
        }
        if (normalized.includes("run_status = 'FAILED'")) {
          return [[{ stage: params.failedStage }], {}]
        }
        return [[{ total: 0 }], {}]
      }

      const match = normalized.match(/\bFROM\s+([a-zA-Z0-9_]+)/i)
      const table = match?.[1]
      if (table && params.throwOnTable && table === params.throwOnTable) {
        throw new Error('SIMULATED_QUERY_ERROR')
      }

      if (table && Object.prototype.hasOwnProperty.call(params.counts, table)) {
        const meta = params.counts[table]
        if (normalized.includes('COUNT(DISTINCT')) {
          return [[{ total: meta.duplicate ?? 0 }], {}]
        }
        if (normalized.includes('COUNT(*) AS total')) {
          const status = typeof values?.[1] === 'string' ? String(values?.[1]) : null
          if (!status) {
            return [[{ total: meta.total }], {}]
          }
          return [[{ total: (meta as Record<string, number | undefined>)[status] ?? 0 }], {}]
        }
      }

      if (/^(CREATE|ALTER|INSERT|UPDATE|DELETE)\b/i.test(normalized)) {
        return [[{ affectedRows: 1, insertId: 1 }], {}]
      }

      return [[{ total: 0 }], {}]
    },
  }
}
