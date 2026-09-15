#!/usr/bin/env tsx

import {
  ensureSalesTeamMembershipTable,
  SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME,
  SALES_TEAM_MEMBERSHIP_PROVISION_META,
} from '@/lib/services/sales-team-membership-service'
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

const EXPECTED_ENGINE = SALES_TEAM_MEMBERSHIP_PROVISION_META.engine
const EXPECTED_CHARSET = SALES_TEAM_MEMBERSHIP_PROVISION_META.charset
const EXPECTED_COLLATION = SALES_TEAM_MEMBERSHIP_PROVISION_META.collation

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
      [SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME],
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
  const expectedColumns = SALES_TEAM_MEMBERSHIP_PROVISION_META.expectedColumns
  const drifts: string[] = []
  try {
    const rows = await runReviewDbQuery<{ column_name: string; is_nullable: string; column_type: string }>(
      `SELECT column_name, is_nullable, column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position`,
      [SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME],
    )
    if (rows.length === 0) {
      return drifts
    }
    const presentCols = new Set(rows.map((r) => String(r.column_name ?? '').toLowerCase()))
    for (const exp of expectedColumns) {
      if (!presentCols.has(exp.toLowerCase())) {
        drifts.push(`MISSING_COLUMN:${exp}`)
      }
    }
    if (!includeStructural) {
      return drifts
    }

    try {
      const tInfo = await runReviewDbQuery<{ engine: string; table_collation: string }>(
        `SELECT ENGINE, TABLE_COLLATION AS table_collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        [SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME],
      )
      const info = tInfo[0]
      if (info) {
        const engine = String(info.engine ?? '').trim().toLowerCase()
        if (engine && engine !== EXPECTED_ENGINE.toLowerCase()) {
          drifts.push(`ENGINE_MISMATCH expected=${EXPECTED_ENGINE} actual=${info.engine}`)
        }
        const collation = String(info.table_collation ?? '').trim().toLowerCase()
        if (collation && collation !== EXPECTED_COLLATION.toLowerCase()) {
          drifts.push(`COLLATION_MISMATCH expected=${EXPECTED_COLLATION} actual=${info.table_collation}`)
        }
      }
    } catch {
      drifts.push('ENGINE_COLLATION_PROBE_FAILED')
    }

    try {
      const idxRows = await runReviewDbQuery<{ index_name: string }>(
        `SELECT DISTINCT INDEX_NAME AS index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ?`,
        [SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME],
      )
      const idxSet = new Set(idxRows.map((r) => String(r.index_name ?? '').trim()))
      for (const exp of SALES_TEAM_MEMBERSHIP_PROVISION_META.expectedIndexes) {
        if (!idxSet.has(exp)) drifts.push(`MISSING_INDEX:${exp}`)
      }
    } catch {
      drifts.push('INDEX_PROBE_FAILED')
    }

    try {
      const fkRows = await runReviewDbQuery<{ constraint_name: string }>(
        `SELECT DISTINCT CONSTRAINT_NAME AS constraint_name FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = ? AND CONSTRAINT_NAME LIKE 'fk_stm_%' ESCAPE ''`,
        [SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME],
      )
      const fkSet = new Set(fkRows.map((r) => String(r.constraint_name ?? '').trim()))
      for (const exp of SALES_TEAM_MEMBERSHIP_PROVISION_META.expectedFk) {
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
    PROVISIONING_TARGET: 'sales_team_membership_schema',
    TARGET_HOST: '(unresolved)',
    TARGET_PORT: '(unresolved)',
    DATABASE: '(redacted-unconfigured)',
    TABLE: SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME,
    BEFORE_STATE: 'UNKNOWN',
    ACTION: dryRun ? 'DRY_RUN_VERIFY' : 'APPLY_PROVISIONING',
    AFTER_STATE: '',
    RESULT: 'PENDING',
    ERROR: '',
  }

  try {
    if (!isReviewDbConfigured()) {
      result.RESULT = 'ERROR'
      result.ERROR = 'REVIEW_DB_NOT_CONFIGURED: DATABASE_URL is missing or invalid. Phase 2 membership tests will use pure logic tests for validation layer without DB.'
      console.log(maskSensitive(result))
      return 0
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
      } else if (String(confirmTableRaw).trim() !== SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME) {
        issues.push(`TABLE_MISMATCH expected=${confirmTableRaw} required=${SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME}`)
      }
      if (!confirmScopeBool) {
        issues.push('MISSING_CONFIRM_SCOPE_BOOLEAN')
      }
      if (issues.length > 0) {
        result.RESULT = 'CONFIRMATION_REQUIRED'
        result.ERROR =
          'APPLY mode requires exact value-bound confirmations: --confirm-host=RESOLVED_HOST --confirm-database=RESOLVED_DATABASE --confirm-table=' +
          SALES_TEAM_MEMBERSHIP_TABLE_CANONICAL_NAME +
          ' --confirm-scope. Issues: ' +
          issues.join(' | ')
        result.AFTER_STATE = result.BEFORE_STATE
        console.log(maskSensitive(result))
        return 4
      }

      await ensureSalesTeamMembershipTable()
    }

    if (!apply) {
      const drifts = beforeExists ? await probeSchemaDrift(true) : []
      if (beforeExists && drifts.length > 0) {
        result.RESULT = 'DRIFT_DETECTED'
        result.ERROR = drifts.join(' | ')
      } else if (beforeExists) {
        result.RESULT = 'OK_NO_CHANGE'
      } else {
        result.RESULT = 'OK_TABLE_ABSENT_DRY_RUN'
      }
      result.AFTER_STATE = (await probeTableExists()) ? 'TABLE_EXISTS' : 'TABLE_ABSENT'
      console.log(maskSensitive(result))
      return 0
    }

    const afterExists = await probeTableExists()
    if (!afterExists) {
      result.RESULT = 'ERROR'
      result.ERROR = 'TABLE_STILL_ABSENT_AFTER_APPLY'
      result.AFTER_STATE = 'TABLE_ABSENT'
      console.log(maskSensitive(result))
      return 5
    }
    const driftsAfter = await probeSchemaDrift(true)
    if (driftsAfter.length > 0) {
      result.RESULT = 'APPLIED_WITH_STRUCTURAL_DRIFTS'
      result.ERROR = driftsAfter.join(' | ')
    } else {
      result.RESULT = 'APPLIED_OK'
    }
    result.AFTER_STATE = 'TABLE_EXISTS'
    console.log(maskSensitive(result))
    return 0
  } catch (err) {
    result.RESULT = 'FATAL'
    result.ERROR = String((err as Error)?.message || String(err) || 'UNKNOWN_EXCEPTION')
    try {
      result.AFTER_STATE = (await probeTableExists()) ? 'TABLE_EXISTS' : 'TABLE_ABSENT'
    } catch {
      result.AFTER_STATE = result.BEFORE_STATE
    }
    console.log(maskSensitive(result))
    return 3
  }
}

void main().then((exitcode) => {
  process.exitCode = exitcode
})
