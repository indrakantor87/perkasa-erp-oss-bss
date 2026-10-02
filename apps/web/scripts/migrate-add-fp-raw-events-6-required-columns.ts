import mysql from 'mysql2/promise'

const MIGRATION_ID = 'fp-raw-events-6-additive-cols-2026-10-02'
const REQUIRED_COLS: Array<{
  column: string
  addDdl: string
  description: string
}> = [
  {
    column: 'event_timestamp_original',
    addDdl:
      'ALTER TABLE hr_fp_raw_events ADD COLUMN IF NOT EXISTS event_timestamp_original DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER employee_id',
    description: 'Original local timestamp preserved from device clock',
  },
  {
    column: 'event_timestamp_normalized',
    addDdl:
      'ALTER TABLE hr_fp_raw_events ADD COLUMN IF NOT EXISTS event_timestamp_normalized DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER event_timestamp_original',
    description: 'Normalized UTC equivalent timestamp for indexing',
  },
  {
    column: 'event_mode',
    addDdl:
      "ALTER TABLE hr_fp_raw_events ADD COLUMN IF NOT EXISTS event_mode ENUM('IN','OUT','UNDEFINED') NOT NULL DEFAULT 'UNDEFINED' AFTER event_type_raw",
    description: 'IN/OUT classification reserved future engine heuristics',
  },
  {
    column: 'raw_payload_json',
    addDdl: 'ALTER TABLE hr_fp_raw_events ADD COLUMN IF NOT EXISTS raw_payload_json TEXT NULL AFTER is_processed',
    description: 'Serialized JSON raw payload from device for audit',
  },
  {
    column: 'received_at',
    addDdl:
      'ALTER TABLE hr_fp_raw_events ADD COLUMN IF NOT EXISTS received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER raw_payload_json',
    description: 'Server insert time audit',
  },
  {
    column: 'processing_notes',
    addDdl: 'ALTER TABLE hr_fp_raw_events ADD COLUMN IF NOT EXISTS processing_notes TEXT NULL AFTER received_at',
    description: 'Per-event processing notes / errors',
  },
]

type Mode = 'precheck' | 'apply' | 'postcheck'
type MigrationResult =
  | { outcome: 'PASS'; classification: 'READY' | 'ALREADY_MIGRATED' }
  | { outcome: 'FAIL'; classification: 'BLOCKED'; reason: string }

function logLine(message: string) {
  process.stdout.write(`${message}\n`)
}
function fail(reason: string): MigrationResult {
  return { outcome: 'FAIL', classification: 'BLOCKED', reason }
}
function pass(classification: 'READY' | 'ALREADY_MIGRATED'): MigrationResult {
  return { outcome: 'PASS', classification }
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
function getDatabaseUrl(): string | null {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) return null
  try {
    new URL(raw)
    return raw
  } catch {
    return null
  }
}

async function columnExists(conn: mysql.PoolConnection | mysql.Connection, table: string, colName: string): Promise<boolean> {
  const [rows] = await conn.query<Array<{ total: number }>>(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
  `,
    [table, colName],
  )
  return Number(rows[0]?.total ?? 0) > 0
}

export async function runMigration(mode: Mode): Promise<MigrationResult> {
  const dbUrl = getDatabaseUrl()
  if (!dbUrl) return fail('DATABASE_URL not configured')
  let conn: mysql.PoolConnection | mysql.Connection | null = null
  try {
    conn = await mysql.createConnection(dbUrl)
    await conn.query('SELECT 1 AS ok')

    if (mode === 'precheck') {
      const missing: string[] = []
      for (const c of REQUIRED_COLS) {
        if (!(await columnExists(conn, 'hr_fp_raw_events', c.column))) {
          missing.push(c.column)
        }
      }
      if (missing.length === 0) {
        return pass('ALREADY_MIGRATED')
      }
      logLine(`[precheck] Missing columns: ${missing.join(', ')}. Ready to apply additive migration.`)
      return pass('READY')
    }

    if (mode === 'apply') {
      let applied = 0
      let skipped = 0
      const errors: string[] = []
      for (const c of REQUIRED_COLS) {
        if (await columnExists(conn, 'hr_fp_raw_events', c.column)) {
          skipped += 1
          continue
        }
        try {
          await conn.query(c.addDdl)
          applied += 1
          logLine(`[apply] ADD COLUMN ${c.column}: OK (${c.description})`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`${c.column}: ${msg}`)
        }
      }
      const idxAdds = [
        'ALTER TABLE hr_fp_raw_events ADD INDEX IF NOT EXISTS idx_raw_time_original (event_timestamp_original)',
        'ALTER TABLE hr_fp_raw_events ADD INDEX IF NOT EXISTS idx_raw_sync_run (sync_run_id)',
      ]
      for (const idxSql of idxAdds) {
        try {
          await conn.query(idxSql)
          logLine(`[apply] ADD INDEX: OK`)
        } catch (err) {
          // Ignore index if exists / not supported dialect
          const msg = err instanceof Error ? err.message : String(err)
          logLine(`[apply] ADD INDEX skipped: ${msg}`)
        }
      }
      if (errors.length > 0) {
        return fail(`Migration PARTIAL failure applied=${applied} skipped=${skipped} errors=${errors.length}: ` + errors.join(' ; '))
      }
      logLine(`[apply] Migration ${MIGRATION_ID} success: applied=${applied} skipped=${skipped}`)
      return pass(applied === 0 ? 'ALREADY_MIGRATED' : 'READY')
    }

    // postcheck
    const missing: string[] = []
    for (const c of REQUIRED_COLS) {
      if (!(await columnExists(conn, 'hr_fp_raw_events', c.column))) {
        missing.push(c.column)
      }
    }
    if (missing.length > 0) {
      return fail(`[postcheck] Missing columns after apply: ${missing.join(', ')}`)
    }
    logLine(`[postcheck] All 6 required columns present: ${REQUIRED_COLS.map((c) => c.column).join(', ')}`)
    return pass('READY')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return fail(`Migration unexpected error: ${msg}`)
  } finally {
    if (conn) {
      try {
        await conn.end()
      } catch {}
    }
  }
}

if (require.main === module) {
  const mode = parseMode(process.argv)
  if (!mode) {
    logLine(`Usage: tsx migrate-add-fp-raw-events-6-required-columns.ts --mode=precheck|apply|postcheck`)
    process.exit(1)
  }
  ;(async () => {
    const result = await runMigration(mode)
    if (result.outcome === 'PASS') {
      logLine(`[${mode}] PASS: ${result.classification}`)
      process.exit(0)
    } else {
      logLine(`[${mode}] FAIL BLOCKED: ${result.reason}`)
      process.exit(2)
    }
  })().catch((err) => {
    logLine(`FATAL: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(3)
  })
}
