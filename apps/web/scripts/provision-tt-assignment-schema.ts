#!/usr/bin/env tsx

import {
  ensureServiceTroubleTicketAssignmentTable,
  TT_ASSIGNMENT_TABLE_CANONICAL_NAME,
} from '@/lib/services/field-ops-service'
import { runReviewDbQuery, isReviewDbConfigured } from '@/lib/review-db'

type ProvisioningResult = {
  PROVISIONING_TARGET: string
  TARGET_HOST: string
  TARGET_PORT: string
  DATABASE: string
  TABLE: string
  BEFORE_STATE: string
  ACTION: string
  AFTER_STATE: string
  RESULT: string
  ERROR: string
}

const EXPECTED_INDEX_NAMES = [
  'PRIMARY',
  'idx_stta_ticket',
  'idx_stta_user',
  'idx_stta_status',
  'idx_stta_ticket_primary',
]

const EXPECTED_FK_NAMES = [
  'fk_stta_ticket',
  'fk_stta_assigned_user',
  'fk_stta_assigned_by',
  'fk_stta_accepted_by',
  'fk_stta_released_by',
]

const EXPECTED_ENGINE = 'InnoDB'
const EXPECTED_CHARSET = 'utf8mb4'
const EXPECTED_COLLATION = 'utf8mb4_unicode_ci'

function pickArgValue(args: string[], key: string): string {
  const withEquals = args.find((v) => v.startsWith(`${key}=`))
  if (withEquals) return withEquals.slice(`${key}=`.length).trim()
  const idx = args.findIndex((v) => v === key)
  if (idx === -1) return ''
  const next = args[idx + 1]
  if (!next || next.startsWith('--')) return ''
  return next.trim()
}

function hasArg(args: string[], key: string): boolean {
  return args.includes(key) || args.some((v) => v.startsWith(`${key}=`))
}

function maskStringSecretSubstrings(input: string): string {
  return String(input ?? '')
    .replace(/(password[\s"' :=]*[^\s,;"']+)/gi, (match) => match.slice(0, 8) + '***')
    .replace(/mysql:\/\/[^\/\s]+:[^\/\s]+@/g, 'mysql://***:***@')
    .replace(/DATABASE_URL[^=&\s]*/gi, (m) => m.slice(0, 12) + '***')
    .replace(/(secret[\s"' :=]*[^\s,;"']+)/gi, (match) => match.slice(0, 6) + '***')
    .replace(/(bearer\s+)[^\s,;"']+/gi, '$1***')
    .replace(/(token[\s"' :=]*[^\s,;"']+)/gi, (match) => match.slice(0, 5) + '***')
    .slice(0, 8000)
}

function maskSensitive(obj: ProvisioningResult): string {
  const safe: ProvisioningResult = {
    PROVISIONING_TARGET: maskStringSecretSubstrings(obj.PROVISIONING_TARGET),
    TARGET_HOST: maskStringSecretSubstrings(obj.TARGET_HOST),
    TARGET_PORT: maskStringSecretSubstrings(obj.TARGET_PORT),
    DATABASE: maskStringSecretSubstrings(obj.DATABASE),
    TABLE: maskStringSecretSubstrings(obj.TABLE),
    BEFORE_STATE: maskStringSecretSubstrings(obj.BEFORE_STATE),
    ACTION: maskStringSecretSubstrings(obj.ACTION),
    AFTER_STATE: maskStringSecretSubstrings(obj.AFTER_STATE),
    RESULT: maskStringSecretSubstrings(obj.RESULT),
    ERROR: maskStringSecretSubstrings(obj.ERROR),
  }
  const raw = JSON.stringify(safe, null, 2)
  return raw
    .replace(/("password"\s*:\s*"[^"]*")/g, '$1"***"')
    .replace(/DATABASE_URL\s*=\s*[^&\s"]+/g, 'DATABASE_URL=***')
}

async function probeTableExists(): Promise<boolean> {
  try {
    const rows = await runReviewDbQuery<{ cnt: number | bigint }>(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [TT_ASSIGNMENT_TABLE_CANONICAL_NAME],
    )
    return Number(rows[0]?.cnt ?? 0) > 0
  } catch {
    return false
  }
}

async function probeConnectionHostPort(): Promise<{ host: string; port: string; database: string }> {
  let host = 'unresolved'
  let port = 'unresolved'
  let database = 'unresolved'
  try {
    const vars = await runReviewDbQuery<{ Variable_name: string; Value: string }>(
      `SHOW VARIABLES WHERE Variable_name IN ('hostname','port')`,
      [],
    )
    for (const row of vars) {
      const name = String(row.Variable_name ?? '').toLowerCase()
      if (name === 'hostname') host = String(row.Value ?? 'unresolved')
      if (name === 'port') port = String(row.Value ?? 'unresolved')
    }
  } catch {
    host = host + '_probe_failed'
  }
  try {
    const dbRows = await runReviewDbQuery<{ db: string }>(`SELECT DATABASE() AS db`, [])
    database = String(dbRows[0]?.db ?? 'NULL_SELECT_DATABASE_returned_empty')
  } catch {
    database = 'database_probe_failed'
  }
  return { host, port, database }
}

async function probeSchemaDrift(includeStructural: boolean): Promise<string[]> {
  const expectedColumns: Array<{ name: string; nullable: boolean; type: string }> = [
    { name: 'id', nullable: false, type: 'bigint unsigned' },
    { name: 'trouble_ticket_id', nullable: false, type: 'bigint unsigned' },
    { name: 'assigned_user_id', nullable: false, type: 'bigint unsigned' },
    { name: 'assignment_role', nullable: false, type: 'varchar(50)' },
    { name: 'assignment_status', nullable: false, type: 'varchar(50)' },
    { name: 'is_primary', nullable: false, type: 'tinyint(1)' },
    { name: 'assigned_at', nullable: false, type: 'datetime' },
    { name: 'accepted_at', nullable: true, type: 'datetime' },
    { name: 'released_at', nullable: true, type: 'datetime' },
    { name: 'released_reason', nullable: true, type: 'varchar(64)' },
    { name: 'notes', nullable: true, type: 'text' },
    { name: 'assigned_by_user_id', nullable: true, type: 'bigint unsigned' },
    { name: 'accepted_by_user_id', nullable: true, type: 'bigint unsigned' },
    { name: 'released_by_user_id', nullable: true, type: 'bigint unsigned' },
    { name: 'created_at', nullable: false, type: 'datetime' },
    { name: 'updated_at', nullable: false, type: 'datetime' },
  ]
  const drifts: string[] = []
  try {
    const rows = await runReviewDbQuery<{ column_name: string; is_nullable: string; column_type: string }>(
      `SELECT column_name, is_nullable, column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position`,
      [TT_ASSIGNMENT_TABLE_CANONICAL_NAME],
    )
    if (rows.length === 0) {
      return drifts
    }
    for (const exp of expectedColumns) {
      const actual = rows.find((r) => r.column_name.toLowerCase() === exp.name.toLowerCase())
      if (!actual) {
        drifts.push(`MISSING_COLUMN:${exp.name}`)
        continue
      }
      const actualNullable = actual.is_nullable === 'YES'
      if (actualNullable !== exp.nullable) {
        drifts.push(`NULLABILITY_MISMATCH:${exp.name} expected_nullable=${exp.nullable} actual=${actualNullable}`)
      }
      const actType = actual.column_type.toLowerCase()
      const expType = exp.type.toLowerCase()
      if (
        actType !== expType &&
        !(expType === 'text' && actType.startsWith('text')) &&
        !(expType.startsWith('bigint') && actType.startsWith('bigint')) &&
        !(expType.startsWith('varchar') && actType.startsWith('varchar'))
      ) {
        drifts.push(`TYPE_MISMATCH:${exp.name} expected=${expType} actual=${actType}`)
      }
    }
    if (rows.length !== expectedColumns.length) {
      drifts.push(`COLUMN_COUNT expected=${expectedColumns.length} actual=${rows.length}`)
    }

    if (!includeStructural) {
      return drifts
    }

    try {
      const tInfo = await runReviewDbQuery<{ engine: string; table_collation: string }>(
        `SELECT ENGINE, TABLE_COLLATION AS table_collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        [TT_ASSIGNMENT_TABLE_CANONICAL_NAME],
      )
      const info = tInfo[0]
      if (!info) {
        drifts.push('TABLE_INFO_PROBE_FAILED')
      }
      if (info) {
        const engine = String(info.engine ?? '').trim().toLowerCase()
        if (engine !== EXPECTED_ENGINE.toLowerCase()) {
        drifts.push(`ENGINE_MISMATCH expected=${EXPECTED_ENGINE} actual=${info.engine}`)
      }
      const collation = String(info.table_collation ?? '').trim().toLowerCase()
      if (collation !== EXPECTED_COLLATION.toLowerCase()) {
        drifts.push(`COLLATION_MISMATCH expected=${EXPECTED_COLLATION} actual=${info.table_collation}`)
      }
      const charsetFromColl = collation.split('_')[0] ?? ''
      if (charsetFromColl !== EXPECTED_CHARSET.toLowerCase()) {
        drifts.push(`CHARSET_FROM_COLLATION expected=${EXPECTED_CHARSET} actual=${charsetFromColl}`)
      }
    }
    } catch {
      drifts.push('ENGINE_COLLATION_PROBE_FAILED')
    }

    try {
      const idxRows = await runReviewDbQuery<{ index_name: string; non_unique: number|string }>(
        `SELECT DISTINCT INDEX_NAME AS index_name, NON_UNIQUE AS non_unique FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ?`,
        [TT_ASSIGNMENT_TABLE_CANONICAL_NAME],
      )
      const idxSet = new Set(idxRows.map((r) => String(r.index_name ?? '').trim()))
      for (const exp of EXPECTED_INDEX_NAMES) {
        if (!idxSet.has(exp)) drifts.push(`MISSING_INDEX:${exp}`)
      }
      for (const actual of idxSet) {
        if (!EXPECTED_INDEX_NAMES.includes(actual)) drifts.push(`EXTRA_INDEX:${actual}`)
      }
    } catch {
      drifts.push('INDEX_PROBE_FAILED')
    }

    try {
      const fkRows = await runReviewDbQuery<{ constraint_name: string }>(
        `SELECT DISTINCT CONSTRAINT_NAME AS constraint_name FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = ? AND CONSTRAINT_NAME LIKE 'fk_stta_%' ESCAPE ''`,
        [TT_ASSIGNMENT_TABLE_CANONICAL_NAME],
      )
      const fkSet = new Set(fkRows.map((r) => String(r.constraint_name ?? '').trim()))
      for (const exp of EXPECTED_FK_NAMES) {
        if (!fkSet.has(exp)) drifts.push(`MISSING_FK:${exp}`)
      }
    } catch {
      drifts.push('FK_PROBE_FAILED')
    }
  } catch {
    drifts.push('SCHEMA_PROBE_FAILED')
  }
  return drifts
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const apply = hasArg(args, '--apply')
  const confirmDbRaw = pickArgValue(args, '--confirm-database')
  const confirmHostRaw = pickArgValue(args, '--confirm-host')
  const confirmTableRaw = pickArgValue(args, '--confirm-table')
  const confirmScopeBool = hasArg(args, '--confirm-scope')
  const dryRun = !apply

  const result: ProvisioningResult = {
    PROVISIONING_TARGET: 'tt_assignment_schema',
    TARGET_HOST: '(unresolved)',
    TARGET_PORT: '(unresolved)',
    DATABASE: '(redacted-unconfigured)',
    TABLE: TT_ASSIGNMENT_TABLE_CANONICAL_NAME,
    BEFORE_STATE: 'UNKNOWN',
    ACTION: dryRun ? 'DRY_RUN_VERIFY' : 'APPLY_PROVISIONING',
    AFTER_STATE: '',
    RESULT: 'PENDING',
    ERROR: '',
  }

  try {
    if (!isReviewDbConfigured()) {
      result.RESULT = 'ERROR'
      result.ERROR = 'REVIEW_DB_NOT_CONFIGURED: DATABASE_URL is missing or invalid.'
      console.log(maskSensitive(result))
      return 2
    }

    const identity = await probeConnectionHostPort()
    result.TARGET_HOST = identity.host
    result.TARGET_PORT = identity.port
    const resolvedDatabase = identity.database
    const resolvedHost = identity.host

    result.DATABASE = resolvedDatabase ? `configured_db:${resolvedDatabase.length}chars` : 'configured_unreachable'

    const beforeExists = await probeTableExists()
    result.BEFORE_STATE = beforeExists ? 'TABLE_EXISTS' : 'TABLE_ABSENT'

    if (!dryRun) {
      const issues: string[] = []
      if (!confirmHostRaw || confirmHostRaw.trim() === '') {
        issues.push('MISSING_CONFIRM_HOST_VALUE')
      } else if (String(confirmHostRaw).trim().toLowerCase() !== String(resolvedHost).trim().toLowerCase()) {
        issues.push(`HOST_MISMATCH expected=${confirmHostRaw} resolved=${resolvedHost}`)
      }
      if (!confirmDbRaw || confirmDbRaw.trim() === '') {
        issues.push('MISSING_CONFIRM_DATABASE_VALUE')
      } else if (String(confirmDbRaw).trim().toLowerCase() !== String(resolvedDatabase).trim().toLowerCase()) {
        issues.push(`DATABASE_MISMATCH expected=${confirmDbRaw} resolved=${resolvedDatabase}`)
      }
      if (!confirmTableRaw || confirmTableRaw.trim() === '') {
        issues.push('MISSING_CONFIRM_TABLE_VALUE')
      } else if (String(confirmTableRaw).trim() !== TT_ASSIGNMENT_TABLE_CANONICAL_NAME) {
        issues.push(`TABLE_MISMATCH expected=${confirmTableRaw} required=${TT_ASSIGNMENT_TABLE_CANONICAL_NAME}`)
      }
      if (!confirmScopeBool) {
        issues.push('MISSING_CONFIRM_SCOPE_BOOLEAN')
      }
      if (issues.length > 0) {
        result.RESULT = 'CONFIRMATION_REQUIRED'
        result.ERROR =
          'APPLY mode requires exact value-bound confirmations: --confirm-host=RESOLVED_HOST --confirm-database=RESOLVED_DATABASE --confirm-table=service_trouble_ticket_assignments --confirm-scope. Issues: ' +
          issues.join(' | ')
        result.AFTER_STATE = result.BEFORE_STATE
        console.log(maskSensitive(result))
        return 4
      }
    }

    if (!apply) {
      const drifts = beforeExists ? await probeSchemaDrift(true) : []
      if (beforeExists && drifts.length > 0) {
        result.RESULT = 'DRIFT_DETECTED'
        result.ERROR = drifts.join(' | ')
      } else if (beforeExists) {
        result.RESULT = 'DRY_RUN_OK_SCHEMA_MATCHED'
      } else {
        result.RESULT = 'DRY_RUN_OK_SCHEMA_ABSENT'
      }
      result.AFTER_STATE = result.BEFORE_STATE
      console.log(maskSensitive(result))
      return drifts.length > 0 ? 3 : 0
    }

    const driftsBefore = beforeExists ? await probeSchemaDrift(true) : []

    if (beforeExists && driftsBefore.length > 0) {
      result.RESULT = 'CONFLICT_DETECTED_STOPPED'
      result.ERROR =
        'Target table exists with schema drift; automatic repair is not authorized. Resolve drift manually before re-running. Drifts: ' +
        driftsBefore.join(' | ')
      result.AFTER_STATE = result.BEFORE_STATE
      console.log(maskSensitive(result))
      return 5
    }

    await ensureServiceTroubleTicketAssignmentTable()

    const postIdentity = await probeConnectionHostPort()
    if (
      postIdentity.database.toLowerCase() !== resolvedDatabase.toLowerCase() ||
      postIdentity.host.toLowerCase() !== resolvedHost.toLowerCase()
    ) {
      result.RESULT = 'POST_PROVISION_VERIFICATION_FAILED'
      result.ERROR =
        'Identity recheck failed after provisioning. Database/host context mismatch. preDB=' +
        resolvedDatabase +
        ' postDB=' +
        postIdentity.database +
        ' preHost=' +
        resolvedHost +
        ' postHost=' +
        postIdentity.host
      result.AFTER_STATE = result.BEFORE_STATE
      console.log(maskSensitive(result))
      return 6
    }

    const afterExists = await probeTableExists()
    result.AFTER_STATE = afterExists ? 'TABLE_EXISTS' : 'TABLE_ABSENT'
    if (!afterExists) {
      result.RESULT = 'POST_PROVISION_VERIFICATION_FAILED'
      result.ERROR = 'Table still absent after provisioning attempt.'
      console.log(maskSensitive(result))
      return 6
    }

    const structuralDrifts = await probeSchemaDrift(true)
    if (structuralDrifts.length > 0) {
      result.RESULT = 'POST_PROVISION_VERIFICATION_FAILED'
      result.ERROR = 'Post-provision structural verification failed: ' + structuralDrifts.join(' | ')
      console.log(maskSensitive(result))
      return 6
    }

    result.RESULT = 'PROVISIONED_OK'
    console.log(maskSensitive(result))
    return 0
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    result.RESULT = 'FATAL'
    result.ERROR = msg
    console.log(maskSensitive(result))
    return 1
  }
}

void main().then((code) => {
  process.exit(code)
})
