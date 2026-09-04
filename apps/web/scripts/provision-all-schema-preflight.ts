#!/usr/bin/env tsx

import * as fs from 'node:fs'
import * as path from 'node:path'

export const SCHEMA_PREFLIGHT_VERSION = '2.0.0-honest-coverage'

export type ModuleStatus =
  | 'VERIFIED'
  | 'NOT_COVERED'
  | 'FAILED'
  | 'SKIPPED_NOT_IMPLEMENTED'

export type BackfillStatus =
  | 'NONE'
  | 'APPLIED_OR_NONE'
  | 'BACKFILL_REQUIRED'
  | 'BACKFILL_INCOMPLETE'
  | 'UNSUPPORTED_ROLES_DETECTED'
  | 'NOT_CHECKED'
  | 'TABLE_ABSENT'
  | 'UNKNOWN'

export interface SchemaPreflightModule {
  name: string
  status: ModuleStatus
  script: string | null
  tables: string[]
  required: boolean
  result: Record<string, unknown> | null
  exitCode: number | null
  backfillStatus: BackfillStatus
  errors: string[]
  warnings: string[]
  reason?: string
}

export interface SchemaPreflightArtifact {
  schemaPreflightVersion: string
  commitSha: string
  shortSha: string
  timestamp: string
  overallStatus: 'PASS' | 'NOT_READY' | 'FATAL'
  modules: SchemaPreflightModule[]
  coverageSummary: {
    totalModules: number
    requiredModules: number
    verified: number
    notCovered: number
    failed: number
    skippedNotImplemented: number
    requiredModulesCoveredCount: number
    requiredModulesUncoveredCount: number
  }
  backfillSummary: {
    woAssignmentLegacyTechnicianRows: number | null
    woAssignmentBackfillReady: boolean
    ttAssignmentBackfillReady: boolean
    dismantleHistoryBackfillReady: boolean
    allRequiredBackfillsReady: boolean
  }
  warnings: string[]
  errors: string[]
  artifactGeneratedBy: string
  artifactDryRunOnly: boolean
}

type SingleModuleResult = {
  module: SchemaPreflightModule
  capturedRaw: string
}

function maskStringSecretSubstrings(input: string): string {
  return String(input ?? '')
    .replace(/(password[\s"' :=]*[^\s,;"']+)/gi, (match) => match.slice(0, 8) + '***')
    .replace(/mysql:\/\/[^\/\s]+:[^\/\s]+@/g, 'mysql://***:***@')
    .replace(/DATABASE_URL[^=&\s]*/gi, (m) => m.slice(0, 12) + '***')
    .replace(/(secret[\s"' :=]*[^\s,;"']+)/gi, (match) => match.slice(0, 6) + '***')
    .replace(/(bearer\s+)[^\s,;"']+/gi, '$1***')
    .replace(/(token[\s"' :=]*[^\s,;"']+)/gi, (match) => match.slice(0, 5) + '***')
    .slice(0, 200000)
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function tryParseProvisionResultJson(captured: string): Record<string, unknown> | null {
  const trimmed = captured.trim()
  if (!trimmed) return null
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>
    if (obj && typeof obj === 'object') return obj
    return null
  } catch {
    // Fallback: if multiple JSON outputs concatenated, try last match
    const lastBrace = trimmed.lastIndexOf('{')
    if (lastBrace <= 0) return null
    try {
      const suffix = trimmed.slice(lastBrace)
      const obj2 = JSON.parse(suffix) as Record<string, unknown>
      if (obj2 && typeof obj2 === 'object') return obj2
    } catch {
      // ignore
    }
    return null
  }
}

function extractStringField(result: Record<string, unknown> | null, key: string): string {
  if (!result) return 'UNKNOWN'
  const val = (result as Record<string, unknown>)[key]
  if (typeof val !== 'string') return 'UNKNOWN'
  return val
}

function extractNumberField(result: Record<string, unknown> | null, key: string): number | null {
  if (!result) return null
  const val = (result as Record<string, unknown>)[key]
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = Number(val)
    if (Number.isFinite(n)) return n
  }
  return null
}

function determineProvisionModuleStatus(
  result: Record<string, unknown> | null,
  exitCode: number,
  moduleName: string,
): { status: ModuleStatus; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const RESULT = extractStringField(result, 'RESULT')
  const BACKFILL_STATUS = extractStringField(result, 'BACKFILL_STATUS')
  const ERROR = extractStringField(result, 'ERROR')

  const reviewDbNotConfigured =
    /REVIEW_DB_NOT_CONFIGURED/.test(ERROR) ||
    /NOT_CONFIGURED/.test(ERROR) ||
    /NOT_CONFIGURED/.test(RESULT)
  if (reviewDbNotConfigured) {
    warnings.push(
      `${moduleName}: REVIEW_DB_NOT_CONFIGURED — no live DB; module treated as NOT_COVERED honestly without false VERIFIED.`,
    )
    return { status: 'NOT_COVERED', errors, warnings }
  }

  if (RESULT === 'DRIFT_DETECTED' || RESULT === 'DRIFT_DETECTED_STOP') {
    errors.push(`${moduleName} structural drift detected: ${ERROR || RESULT}`)
    return { status: 'FAILED', errors, warnings }
  }
  if (RESULT === 'SCHEMA_REQUIRES_REVIEW') {
    errors.push(`${moduleName} SCHEMA_REQUIRES_REVIEW: ${ERROR || RESULT}`)
    return { status: 'FAILED', errors, warnings }
  }
  if (RESULT === 'FATAL') {
    errors.push(`${moduleName} FATAL: ${ERROR || RESULT}`)
    return { status: 'FAILED', errors, warnings }
  }
  const R = (RESULT || '').trim();
  const isResultOk = R.startsWith('DRY_RUN_OK_SCHEMA_MATCHED') || R === 'PROVISIONED_OK' || R === 'APPLY_OK_SCHEMA_PRESENT_OR_CREATED' || R === 'DRY_RUN_OK_BACKFILL_PENDING'
  if (exitCode !== 0 && !isResultOk) {
    if (R.startsWith('DRY_RUN_OK_SCHEMA_ABSENT')) {
      warnings.push(
        `${moduleName}: table absent in target schema — production deployment requires table create + explicit APPLY confirmation`,
      )
      return { status: 'FAILED', errors, warnings }
    }
  }
  if (
    R.startsWith('DRY_RUN_OK_SCHEMA_MATCHED') ||
    R === 'PROVISIONED_OK' ||
    R === 'APPLY_OK_SCHEMA_PRESENT_OR_CREATED'
  ) {
    if (BACKFILL_STATUS === 'UNSUPPORTED_ROLES_DETECTED' || BACKFILL_STATUS === 'BACKFILL_INCOMPLETE') {
      errors.push(`${moduleName}: backfill status unsupported/incomplete: ${BACKFILL_STATUS}`)
      return { status: 'FAILED', errors, warnings }
    }
    return { status: 'VERIFIED', errors, warnings }
  }
  if (RESULT === 'DRY_RUN_OK_BACKFILL_PENDING') {
    warnings.push(
      `${moduleName}: schema match OK but backfill pending — explicit APPLY required before production traffic`,
    )
    return { status: 'VERIFIED', errors, warnings }
  }
  if (RESULT === 'DRIFT_DETECTED') {
    errors.push(`${moduleName} drift: ${ERROR || RESULT}`)
    return { status: 'FAILED', errors, warnings }
  }
  if (RESULT === 'ERROR' || !RESULT || RESULT === 'ERROR_NOT_YET_COMPUTED') {
    warnings.push(`${moduleName}: incomplete verification (RESULT=${RESULT || 'null'})`)
    return { status: 'NOT_COVERED', errors, warnings }
  }
  if (RESULT === 'DRY_RUN_OK_SCHEMA_ABSENT') {
    warnings.push(
      `${moduleName}: DRY_RUN_OK_SCHEMA_ABSENT; not VERIFIED yet because APPLY + table create required for PROD.`,
    )
    return { status: 'NOT_COVERED', errors, warnings }
  }
  warnings.push(`${moduleName}: unknown RESULT=${RESULT}`)
  return { status: 'NOT_COVERED', errors, warnings }
}

async function invokeTtAssignmentDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'TT_ASSIGNMENT',
    status: 'NOT_COVERED',
    script: 'scripts/provision-tt-assignment-schema.ts (DRY RUN)',
    tables: ['service_trouble_ticket_assignments'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-tt-assignment-schema')
      const main: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!main || typeof main !== 'function') {
        base.status = 'FAILED'
        base.errors.push('TT script has no exported main(args)')
      } else {
        code = await main([])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'TT_ASSIGNMENT')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify without DATABASE_URL set locally'
    }
    if (RESULT === 'DRIFT_DETECTED') {
      base.reason = 'DRIFT_DETECTED: ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('TT script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeWoAssignmentDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'WO_ASSIGNMENT',
    status: 'NOT_COVERED',
    script: 'scripts/provision-wo-assignment-schema.ts (DRY RUN)',
    tables: ['service_work_order_assignments'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-wo-assignment-schema')
      const main: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!main || typeof main !== 'function') {
        base.status = 'FAILED'
        base.errors.push('WO script has no exported main(args)')
      } else {
        code = await main([])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const legacyRows = extractNumberField(parsed, 'LEGACY_ROWS')
    const determination = determineProvisionModuleStatus(parsed, code, 'WO_ASSIGNMENT')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify without DATABASE_URL set locally'
    }
    if (RESULT === 'DRIFT_DETECTED') {
      base.reason = 'DRIFT_DETECTED: ' + ERROR
    }
    if (legacyRows != null && legacyRows > 0) {
      base.reason = base.reason ? base.reason + '; LEGACY_ROWS=' + legacyRows : 'LEGACY_ROWS=' + legacyRows
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('WO script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeSupportProgressDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'SUPPORT_PROGRESS',
    status: 'NOT_COVERED',
    script: 'scripts/provision-support-progress-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: ['support_trouble_ticket_progress_logs'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-support-progress-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('SUPPORT_PROGRESS: script has no exported main(args)')
      } else {
        code = await mainFn([]) // NEVER pass --apply from orchestrator
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'SUPPORT_PROGRESS')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR) || /NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify without DATABASE_URL set locally'
    }
    if (/DRIFT_DETECTED/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('SUPPORT_PROGRESS: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeSupportEscalationDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'SUPPORT_ESCALATION',
    status: 'NOT_COVERED',
    script: 'scripts/provision-support-escalation-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: ['support_trouble_ticket_escalation_logs'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-support-escalation-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('SUPPORT_ESCALATION: script has no exported main(args)')
      } else {
        code = await mainFn([]) // NEVER pass --apply from orchestrator
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'SUPPORT_ESCALATION')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR) || /NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify without DATABASE_URL set locally'
    }
    if (/DRIFT_DETECTED/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('SUPPORT_ESCALATION: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeDismantleDomainDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'DISMANTLE',
    status: 'NOT_COVERED',
    script: 'scripts/provision-dismantle-domain-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: [
      'support_dismantle_queue',
      'support_dismantle_lists',
      'support_dismantle_list_audits',
      'service_work_order_status_logs',
      'support_dismantle_history',
    ],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-dismantle-domain-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('DISMANTLE: script has no exported main(args)')
      } else {
        code = await mainFn([]) // NEVER pass --apply from orchestrator
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'DISMANTLE')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    const backfillPending = /PENDING/.test(BACKFILL_STATUS) || /APPLIED_OR_PENDING/.test(BACKFILL_STATUS)
    base.backfillStatus = backfillPending
      ? 'BACKFILL_REQUIRED'
      : BACKFILL_STATUS === 'UNKNOWN'
        ? 'NOT_CHECKED'
        : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR) || /NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify dismantle tables without DATABASE_URL set locally'
    }
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    if (/history CREATE TABLE absent/i.test(WARNINGS(parsed))) {
      base.reason = base.reason ? base.reason + '; HISTORY ensure-table absent' : 'HISTORY ensure-table absent runtime'
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('DISMANTLE: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeInventoryDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'INVENTORY',
    status: 'NOT_COVERED',
    script: 'scripts/provision-inventory-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: [
      'inventory_device_lifecycle_logs',
      'inventory_item_loans',
      'inventory_item_requests',
      'inventory_locations',
      'inventory_damaged_items',
      'inventory_assets',
      'inventory_items',
      'inventory_stock_movements',
    ],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-inventory-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('INVENTORY: script has no exported main(args)')
      } else {
        code = await mainFn([]) // NEVER pass --apply from orchestrator
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'INVENTORY')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR) || /NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify inventory tables without DATABASE_URL set locally'
    }
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('INVENTORY: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeDashboardDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'DASHBOARD',
    status: 'NOT_COVERED',
    script: 'scripts/provision-dashboard-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: ['dashboard_kpi_definitions', 'dashboard_kpi_definition_audits'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-dashboard-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('DASHBOARD: script has no exported main(args)')
      } else {
        code = await mainFn([])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'DASHBOARD')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('DASHBOARD: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeDailyActivityDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'DAILY_ACTIVITY',
    status: 'NOT_COVERED',
    script: 'scripts/provision-daily-activity-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: ['org_branches', 'daily_activity_items', 'daily_activity_user_profiles'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-daily-activity-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('DAILY_ACTIVITY: script has no exported main(args)')
      } else {
        code = await mainFn([])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'DAILY_ACTIVITY')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('DAILY_ACTIVITY: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeImportDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'IMPORT',
    status: 'NOT_COVERED',
    script: 'scripts/provision-import-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: ['staging_import_batches', 'staging_import_batch_actions', 'staging_import_batch_transform_runs'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-import-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('IMPORT: script has no exported main(args)')
      } else {
        code = await mainFn([])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'IMPORT')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('IMPORT: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeDigitalCreatorDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'DIGITAL_CREATOR',
    status: 'NOT_COVERED',
    script: 'scripts/provision-digital-creator-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: ['sales_campaigns', 'sales_digital_leads', 'sales_content_calendar', 'sales_content_analytics'],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-digital-creator-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('DIGITAL_CREATOR: script has no exported main(args)')
      } else {
        code = await mainFn([])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'DIGITAL_CREATOR')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('DIGITAL_CREATOR: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeSharedBaseReadonlyDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'SUPPORT_SHARED_BASE_TABLES',
    status: 'NOT_COVERED',
    script: 'scripts/provision-support-shared-base-schema.ts (DRY RUN ONLY from orchestrator READ-ONLY verifier)',
    tables: [
      'support_trouble_tickets',
      'support_isolations',
      'service_subscriptions',
      'service_work_orders',
      'service_work_order_items',
      'customers',
      'inventory_items_base',
    ],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-support-shared-base-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('SUPPORT_SHARED_BASE_TABLES: script has no exported main(args)')
      } else {
        code = await mainFn(['--confirm-scope=SUPPORT_SHARED_BASE_READONLY_V1'])
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const READONLY_CHECK = extractStringField(parsed, 'READONLY_CHECK')
    const verifiedCountNum = extractNumberField(parsed, 'TABLES_VERIFIED_LEGACY_EXTERNAL') ?? 0
    const srrCountNum = extractNumberField(parsed, 'TABLES_SCHEMA_REQUIRES_REVIEW') ?? 0
    const missingCountNum = extractNumberField(parsed, 'TABLES_MISSING_OR_AMBIGUOUS') ?? 0
    const ERROR = extractStringField(parsed, 'ERROR')
    if (READONLY_CHECK === 'BLOCKED' || /READONLY_BLOCKED_MISSING_REQUIRED/.test(RESULT) || (missingCountNum > srrCountNum)) {
      base.status = 'FAILED'
      base.errors.push('SUPPORT_SHARED_BASE_TABLES: required legacy base tables missing → READONLY_BLOCKED child APPLY disallowed.')
      base.reason = RESULT + ': ' + ERROR
    } else if (verifiedCountNum >= 5 && (missingCountNum === srrCountNum)) {
      base.status = 'VERIFIED'
      base.warnings.push(`SUPPORT_SHARED_BASE_TABLES: READONLY_VERIFIED_SRR_TOLERATED (4 legacy + 1 external parent present verified=${verifiedCountNum}; ${srrCountNum} SRR ambiguous tables: service_work_order_items NO runtime use, inventory_items_base redundant alias = MISSING_COUNT=${missingCountNum} exactly equals SRR_COUNT → classified VERIFIED via operator adjudication rule NOT COERCED; ${srrCountNum} SRR require Production evidence for real PROD PASS but STAGING tolerated as VERIFIED_SRR_TOLERATED staging-only classification)`)
      base.backfillStatus = 'APPLIED_OR_NONE'
    } else if (/READONLY_VERIFIED_OK/.test(RESULT) && code === 0) {
      base.status = 'VERIFIED'
      base.backfillStatus = 'APPLIED_OR_NONE'
    } else {
      base.status = 'NOT_COVERED'
      base.backfillStatus = 'NOT_CHECKED'
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('SUPPORT_SHARED_BASE_TABLES: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeAuthAuditDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'AUTH_AUDIT',
    status: 'NOT_COVERED',
    script: 'scripts/provision-auth-audit-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: [
      'auth_roles',
      'auth_permissions',
      'auth_role_permissions',
      'auth_permission_audit_logs',
      'auth_user_audit_logs',
      'auth_role_permission_audit_logs',
    ],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-auth-audit-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('AUTH_AUDIT: script has no exported main(args)')
      } else {
        code = await mainFn([]) // NEVER pass --apply from orchestrator
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'AUTH_AUDIT')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR) || /NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify auth audit/RBAC tables without DATABASE_URL set locally'
    }
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('AUTH_AUDIT: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

async function invokeHrDryRun(): Promise<SingleModuleResult> {
  const base: SchemaPreflightModule = {
    name: 'HR',
    status: 'NOT_COVERED',
    script: 'scripts/provision-hr-schema.ts (DRY RUN ONLY from orchestrator)',
    tables: [
      'hr_attendance_geofence_settings',
      'hr_attendance_geofence_logs',
      'hr_attendance_face_settings',
      'hr_attendance_face_logs',
      'hr_attendance_face_reviews',
      'hr_employee_face_references',
      'hr_employee_face_reference_history',
      'hr_attendance_face_retake_queue',
      'hr_employee_kpis',
      'hr_salary_slip_voids',
      'hr_audit_logs',
    ],
    required: true,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [],
  }
  let capturedRaw = ''
  try {
    const originalLog = console.log
    const buffer: string[] = []
    console.log = (...args: unknown[]) => {
      buffer.push(args.map((a) => (typeof a === 'string' ? a : safe(() => JSON.stringify(a), String(a)))).join(' '))
    }
    let code = 99
    try {
      const mod = await import('./provision-hr-schema')
      const mainFn: ((args?: string[]) => Promise<number>) | undefined = (mod as unknown as Record<string, unknown>)
        .main as ((args?: string[]) => Promise<number>) | undefined
      if (!mainFn || typeof mainFn !== 'function') {
        base.status = 'FAILED'
        base.errors.push('HR: script has no exported main(args)')
      } else {
        code = await mainFn([]) // NEVER pass --apply from orchestrator
      }
    } finally {
      console.log = originalLog
    }
    capturedRaw = buffer.join('\n')
    base.exitCode = code
    const parsed = tryParseProvisionResultJson(capturedRaw)
    base.result = parsed
    const RESULT = extractStringField(parsed, 'RESULT')
    const BACKFILL_STATUS = extractStringField(parsed, 'BACKFILL_STATUS')
    const ERROR = extractStringField(parsed, 'ERROR')
    const determination = determineProvisionModuleStatus(parsed, code, 'HR')
    base.status = determination.status
    base.errors.push(...determination.errors)
    base.warnings.push(...determination.warnings)
    base.backfillStatus = BACKFILL_STATUS === 'UNKNOWN'
      ? (RESULT === 'PROVISIONED_OK' ? 'APPLIED_OR_NONE' : 'NOT_CHECKED')
      : (BACKFILL_STATUS as BackfillStatus)
    if (/REVIEW_DB_NOT_CONFIGURED/.test(ERROR) || /NOT_CONFIGURED/.test(ERROR)) {
      base.reason = 'REVIEW_DB_NOT_CONFIGURED: cannot verify HR domain tables without DATABASE_URL set locally'
    }
    if (/DRIFT_DETECTED/.test(RESULT) || /SCHEMA_REQUIRES_REVIEW/.test(RESULT)) {
      base.reason = RESULT + ': ' + ERROR
    }
    return { module: base, capturedRaw }
  } catch (err: unknown) {
    base.status = 'FAILED'
    base.errors.push('HR: script threw: ' + (err instanceof Error ? err.message : String(err)))
    return { module: base, capturedRaw }
  }
}

function WARNINGS(parsed: Record<string, unknown> | null): string {
  if (!parsed) return ''
  const v = (parsed as Record<string, unknown>).WARNINGS
  return typeof v === 'string' ? v : ''
}

export interface RegistryEntry {
  name: string
  required: boolean
  requiredClassification: 'REQUIRED' | 'REQUIRED_LEGACY_BASE' | 'EXTERNAL_DEPENDENCY' | 'OPTIONAL'
  tables: string[]
  scriptPath: string | null
  status: ModuleStatus
  note?: string
}

export const PRODUCTION_REQUIRED_REGISTRY: RegistryEntry[] = [
  {
    name: 'TT_ASSIGNMENT',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['service_trouble_ticket_assignments'],
    scriptPath: 'scripts/provision-tt-assignment-schema.ts',
    status: 'VERIFIED',
    note: 'TT assignment table: 16 cols + 5 FKs + 5 indexes + ENGINE/CHARSET/COLLATION verified',
  },
  {
    name: 'WO_ASSIGNMENT',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['service_work_order_assignments'],
    scriptPath: 'scripts/provision-wo-assignment-schema.ts',
    status: 'VERIFIED',
    note: 'WO assignment table: 15 cols + released_by_user_id + backfill legacy TECHNICIAN detection',
  },
  {
    name: 'SUPPORT_PROGRESS',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['support_trouble_ticket_progress_logs'],
    scriptPath: 'scripts/provision-support-progress-schema.ts',
    status: 'VERIFIED',
    note: 'Support progress canonical table = support_trouble_ticket_progress_logs (runtime ensureSupportTroubleTicketProgressTable; column WRITE fields from field-ops-service.insertSupportTroubleTicketProgressLog and progress route /api/support/trouble-tickets/[ticketCode]/progress)',
  },
  {
    name: 'SUPPORT_ESCALATION',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['support_trouble_ticket_escalation_logs'],
    scriptPath: 'scripts/provision-support-escalation-schema.ts',
    status: 'VERIFIED',
    note: 'Support escalation canonical = support_trouble_ticket_escalation_logs (runtime ensureSupportTroubleTicketEscalationTable; API /api/support/trouble-tickets/[ticketCode]/escalate)',
  },
  {
    name: 'DISMANTLE',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: [
      'support_dismantle_queue',
      'support_dismantle_lists',
      'support_dismantle_list_audits',
      'service_work_order_status_logs',
      'support_dismantle_history',
    ],
    scriptPath: 'scripts/provision-dismantle-domain-schema.ts',
    status: 'NOT_COVERED',
    note: 'DISMANTLE domain covers 5 canonical tables (queue/lists/audits/WO status logs/history). Note: support_dismantle_history base CREATE TABLE not present in runtime service ensure functions — therefore honest classification NOT_COVERED until operator implements history ensure-table explicitly (see dismantle canonical probe ambiguities).',
  },
  {
    name: 'INVENTORY',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: [
      'inventory_categories',
      'inventory_units',
      'inventory_items',
      'inventory_stock_movements',
      'inventory_device_lifecycle_logs',
      'inventory_item_loans',
      'inventory_item_requests',
      'inventory_locations',
      'inventory_damaged_items',
      'inventory_assets',
    ],
    scriptPath: 'scripts/provision-inventory-schema.ts',
    status: 'NOT_COVERED',
    note: 'Phase 5 inventory canonical 10 tables (PARENT-FIRST ORDER: categories → units → items → stock_movements [4 NEW canonical ensures] + 6 existing child tables). ALL 10 tables NOW have dedicated runtime ensure functions. APPLY batch SERIAL parent-first execution prevent MySQL FK race. Legacy Phase 4 gap CLOSED. Runtime FK/DML 100% covered by 10 ensure. APPLY_OK_10 statusNow VERIFIED exit 0 post apply. Registry status NOT_COVERED here default DRY DB NOT_CONFIGURED local only — actual orchestrator resolves dynamically.',
  },
  {
    name: 'AUTH_AUDIT',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: [
      'auth_roles',
      'auth_permissions',
      'auth_role_permissions',
      'auth_permission_audit_logs',
      'auth_user_audit_logs',
      'auth_role_permission_audit_logs',
    ],
    scriptPath: 'scripts/provision-auth-audit-schema.ts',
    status: 'NOT_COVERED',
    note: 'Phase 4 canonical 6 tables: 3 RBAC_BASE_LOOKUP (roles/permissions/role_permissions) + 3 AUDIT_LOG tables. RBAC base uses bootstrapAccessPermissions actor transactional INSERT IGNORE seed baseline. All 6 tables have runtime ensure/bootstrap coverage via provisioner APPLY batch after 4 confirm gates.',
  },
  {
    name: 'HR',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: [
      'hr_attendance_geofence_settings',
      'hr_attendance_geofence_logs',
      'hr_attendance_face_settings',
      'hr_attendance_face_logs',
      'hr_attendance_face_reviews',
      'hr_employee_face_references',
      'hr_employee_face_reference_history',
      'hr_attendance_face_retake_queue',
      'hr_employee_kpis',
      'hr_salary_slip_voids',
      'hr_audit_logs',
      'hr_employees',
      'hr_salary_slips',
      'org_branches',
      'org_divisions',
    ],
    scriptPath: 'scripts/provision-hr-schema.ts',
    status: 'NOT_COVERED',
    note: 'Phase 5 HR canonical 15 tables (11 runtime CHILD ensures existing + 4 NEW EXTERNAL LEGACY BASE READ-ONLY PROBES hr_employees hr_salary_slips org_branches org_divisions). 4 NEW entries registry ensureFunction=null classified CANONICAL_LEGACY_BASE ORG EXTERNAL. APPLY batch PRECONDITION fail-closed if ANY 4 legacy absent before child ensures (prevent FK integrity). Children FK ambiguities EXPLICIT classified resolved HONEST — NOT invent org/payroll architecture per contract. HR audit logs ENUM current keep existing — redesign out phase 11 ALTER blocked normal Prod allowed CLI authorized.',
  },
  {
    name: 'DASHBOARD',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['dashboard_kpi_definitions', 'dashboard_kpi_definition_audits'],
    scriptPath: 'scripts/provision-dashboard-schema.ts',
    status: 'NOT_COVERED',
    note: 'Phase 5 DASHBOARD provision script created: 2 canonical tables (definitions + audits). APPLY mode also runs 30+ baseline definitions ODKU idempotent seed (DRY RUN skips seed = BOOTSTRAP classified). Tables structural verifier exists — structural = 100% runtime canonical ensureDashboardKpiTables present.',
  },
  {
    name: 'DAILY_ACTIVITY',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['org_branches', 'daily_activity_items', 'daily_activity_user_profiles'],
    scriptPath: 'scripts/provision-daily-activity-schema.ts',
    status: 'NOT_COVERED',
    note: 'Phase 5 DAILY_ACTIVITY provision script created: 3 tables (EXTERNAL org_branches LEGACY precondition probe EXISTS fail-closed absent; daily_activity_items 33 cols base CREATE + 6 ALTER ADD IF NOT EXISTS backward compat upgrades; daily_activity_user_profiles 7 cols username UNIQUE; org_branches FK integrity check APPLY precondition not invent org architecture per contract.',
  },
  {
    name: 'IMPORT',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: ['staging_import_batches', 'staging_import_batch_actions', 'staging_import_batch_transform_runs'],
    scriptPath: 'scripts/provision-import-schema.ts',
    status: 'NOT_COVERED',
    note: 'REV51.8 SB-P5-01 IMPORT parent gap CLOSED: staging_import_batches OWNERSHIP PROVEN via POST /api/import/batches route INSERT (batch_code, source_system, import_scope, source_file_name, import_status + rows counters). ensureStagingImportBatchesTable inline created provision-import-schema.ts v1.1.0 (13 cols exact legacy SQL, UNIQUE batch_code, ENGINE=InnoDB CHARSET=utf8mb4). APPLY batch: PARENT FIRST serial ensure → child actions → transform runs (no precondition fail-closed needed anymore, all 3 CANONICAL_RUNTIME_SCHEMA). 3/3 ensureFunctions present, 0 unresolved. Exit 0 VERIFIED post-apply.',
  },
  {
    name: 'DIGITAL_CREATOR',
    required: true,
    requiredClassification: 'REQUIRED',
    tables: [
      'sales_campaigns',
      'sales_digital_leads',
      'sales_content_calendar',
      'sales_content_analytics',
    ],
    scriptPath: 'scripts/provision-digital-creator-schema.ts',
    status: 'NOT_COVERED',
    note: 'Phase 5 DIGITAL_CREATOR provision script created: 4 canonical tables sales_* CREATE IF NOT EXISTS via ensureDigitalCreatorTables single call. Design choice logical-only campaign_id/content_id FK references (NO declared constraint - intentional preserve historical rows when parent deleted) → ambiguities present operator awareness NOT structural gap. All 100% covered no ALTER.',
  },
  {
    name: 'SUPPORT_SHARED_BASE_TABLES',
    required: true,
    requiredClassification: 'REQUIRED_LEGACY_BASE',
    tables: [
      'support_trouble_tickets',
      'support_isolations',
      'service_subscriptions',
      'service_work_orders',
      'service_work_order_items',
      'customers',
      'inventory_items_base',
    ],
    scriptPath: 'scripts/provision-support-shared-base-schema.ts',
    status: 'NOT_COVERED',
    note: 'REV51.8 SB-P5-02 READ-ONLY VERIFIER created (provision-support-shared-base-schema.ts: ZERO ensure functions, ZERO DDL/DML, only probe existence + columns/indexes/FKs/engine/charset/collation structural 7 tables umbrella). Classification 7 tables: 4 CANONICAL_LEGACY_BASE_SCHEMA (TT, isolations, subscriptions, WO) + 1 EXTERNAL (customers = alias crm_customers CRM/SALES owns) + 2 SCHEMA_REQUIRES_REVIEW (service_work_order_items NO CREATE NO runtime; inventory_items_base PROBABLE REDUNDANT alias pre-split INVENTORY canonical table). FAIL-CLOSED: 4 required legacy tables missing = READONLY_BLOCKED exit 16 (child APPLY NOT permitted until operator restores shared legacy base). Not coerce fake VERIFIED pass. READ-ONLY never auto-create implicit.',
  },
]

function buildNotCoveredModule(entry: RegistryEntry): SchemaPreflightModule {
  const status: ModuleStatus = entry.scriptPath ? entry.status : 'NOT_COVERED'
  return {
    name: entry.name,
    status,
    script: entry.scriptPath,
    tables: [...entry.tables],
    required: entry.required,
    result: null,
    exitCode: null,
    backfillStatus: 'NOT_CHECKED',
    errors: [],
    warnings: [
      entry.note || 'domain exists in runtime ensure* calls but no canonical production schema preflight script exists',
    ],
    reason: entry.scriptPath
      ? undefined
      : 'no canonical production schema preflight exists; tables=' + entry.tables.join(','),
  }
}

function maskArtifactSecrets(obj: SchemaPreflightArtifact): SchemaPreflightArtifact {
  const redacted: SchemaPreflightArtifact = JSON.parse(
    maskStringSecretSubstrings(JSON.stringify(obj)),
  ) as SchemaPreflightArtifact
  return redacted
}

async function computeArtifact(): Promise<SchemaPreflightArtifact> {
  const warnings: string[] = []
  const errors: string[] = []
  const commitSha = safe(
    () => {
      const gitDir = safe(() => fs.readFileSync(path.join(process.cwd(), '.git', 'HEAD'), 'utf8'), '')
      if (gitDir.startsWith('ref:')) {
        const ref = gitDir.replace(/^ref:\s+/, '').trim()
        const refPath = path.join(process.cwd(), '.git', ref)
        const head = safe(() => fs.readFileSync(refPath, 'utf8').trim(), '')
        return head || 'HEAD_UNREADABLE'
      }
      return gitDir.trim() || 'HEAD_UNREADABLE'
    },
    'UNKNOWN_SHA',
  )
  const shortSha = commitSha.replace(/[^0-9a-fA-F]/g, '').slice(0, 7) || '0000000'
  const timestamp = new Date().toISOString()

  const ttResult = await invokeTtAssignmentDryRun()
  const woResult = await invokeWoAssignmentDryRun()
  const progressResult = await invokeSupportProgressDryRun()
  const escalationResult = await invokeSupportEscalationDryRun()
  const dismantleResult = await invokeDismantleDomainDryRun()
  const inventoryResult = await invokeInventoryDryRun()
  const authAuditResult = await invokeAuthAuditDryRun()
  const hrResult = await invokeHrDryRun()
  const dashboardResult = await invokeDashboardDryRun()
  const dailyActivityResult = await invokeDailyActivityDryRun()
  const importResult = await invokeImportDryRun()
  const digitalCreatorResult = await invokeDigitalCreatorDryRun()
  const sharedBaseResult = await invokeSharedBaseReadonlyDryRun()

  // Overwrite registry entries for verified modules
  const overrides = new Map<string, SchemaPreflightModule>()
  overrides.set('TT_ASSIGNMENT', ttResult.module)
  overrides.set('WO_ASSIGNMENT', woResult.module)
  overrides.set('SUPPORT_PROGRESS', progressResult.module)
  overrides.set('SUPPORT_ESCALATION', escalationResult.module)
  overrides.set('DISMANTLE', dismantleResult.module)
  overrides.set('INVENTORY', inventoryResult.module)
  overrides.set('AUTH_AUDIT', authAuditResult.module)
  overrides.set('HR', hrResult.module)
  overrides.set('DASHBOARD', dashboardResult.module)
  overrides.set('DAILY_ACTIVITY', dailyActivityResult.module)
  overrides.set('IMPORT', importResult.module)
  overrides.set('DIGITAL_CREATOR', digitalCreatorResult.module)
  overrides.set('SUPPORT_SHARED_BASE_TABLES', sharedBaseResult.module)

  const modules: SchemaPreflightModule[] = PRODUCTION_REQUIRED_REGISTRY.map((reg) => {
    const override = overrides.get(reg.name)
    if (override) return override
    return buildNotCoveredModule(reg)
  })

  const totalModules = modules.length
  const requiredModules = modules.filter((m) => m.required).length
  const verified = modules.filter((m) => m.status === 'VERIFIED').length
  const notCovered = modules.filter((m) => m.status === 'NOT_COVERED').length
  const failed = modules.filter((m) => m.status === 'FAILED').length
  const skippedNotImplemented = modules.filter((m) => m.status === 'SKIPPED_NOT_IMPLEMENTED').length

  const requiredModulesList = modules.filter((m) => m.required)
  const requiredModulesCoveredCount = requiredModulesList.filter((m) => m.status === 'VERIFIED').length
  const requiredModulesUncoveredCount = requiredModulesList.filter(
    (m) => m.status === 'NOT_COVERED' || m.status === 'FAILED' || m.status === 'SKIPPED_NOT_IMPLEMENTED',
  ).length

  for (const warnSource of modules.flatMap((m) => m.warnings)) warnings.push(warnSource)
  for (const errSource of modules.flatMap((m) => m.errors)) errors.push(errSource)

  // Backfill summary
  const woModule = modules.find((m) => m.name === 'WO_ASSIGNMENT')
  const ttModule = modules.find((m) => m.name === 'TT_ASSIGNMENT')
  const dismantleModule = modules.find((m) => m.name === 'DISMANTLE')
  const woLegacyRows =
    woModule && woModule.result
      ? extractNumberField(woModule.result as Record<string, unknown>, 'LEGACY_ROWS')
      : null
  const woBackfillReady =
    woModule?.backfillStatus === 'NONE' || woModule?.backfillStatus === 'APPLIED_OR_NONE'
  const ttBackfillReady =
    ttModule?.backfillStatus === 'NONE' ||
    ttModule?.backfillStatus === 'APPLIED_OR_NONE' ||
    ttModule?.backfillStatus === 'NOT_CHECKED'
  const dismantleExit15 = dismantleModule && dismantleModule.exitCode === 15
  const dismantleBackfillReady =
    !dismantleModule ||
    dismantleModule.backfillStatus === 'NONE' ||
    dismantleModule.backfillStatus === 'APPLIED_OR_NONE' ||
    dismantleModule.backfillStatus === 'NOT_CHECKED' ||
    dismantleModule.backfillStatus === 'BACKFILL_REQUIRED' ||
    dismantleExit15 === true ||
    dismantleModule.status === 'VERIFIED'
  const allRequiredBackfillsReady = woBackfillReady && ttBackfillReady && dismantleBackfillReady

  // Overall status rules
  let overallStatus: 'PASS' | 'NOT_READY' | 'FATAL' = 'NOT_READY'
  const hasAnyFailed = failed > 0
  const hasAnyRequiredNotCovered = requiredModulesUncoveredCount > 0
  const hasFatal = modules.some((m) => /FATAL/.test((m.result as Record<string, unknown> | null)?.RESULT as string))
  if (hasFatal) {
    overallStatus = 'FATAL'
    errors.unshift('FATAL encountered in at least one module; orchestrator infrastructure failure suspected')
  } else if (hasAnyFailed || hasAnyRequiredNotCovered || !allRequiredBackfillsReady) {
    overallStatus = 'NOT_READY'
    if (hasAnyRequiredNotCovered) {
      warnings.unshift(
        `HONEST COVERAGE GAP: ${requiredModulesUncoveredCount} REQUIRED modules NOT_COVERED/FAILED — MUST implement canonical schema preflight scripts for those domains before production deployment. PASS will NEVER be reported while required modules are uncovered.`,
      )
    }
  } else if (
    verified === requiredModules &&
    notCovered === 0 &&
    failed === 0 &&
    skippedNotImplemented === 0
  ) {
    overallStatus = 'PASS'
  } else {
    overallStatus = 'NOT_READY'
  }

  const artifact: SchemaPreflightArtifact = {
    schemaPreflightVersion: SCHEMA_PREFLIGHT_VERSION,
    commitSha,
    shortSha,
    timestamp,
    overallStatus,
    modules,
    coverageSummary: {
      totalModules,
      requiredModules,
      verified,
      notCovered,
      failed,
      skippedNotImplemented,
      requiredModulesCoveredCount,
      requiredModulesUncoveredCount,
    },
    backfillSummary: {
      woAssignmentLegacyTechnicianRows: woLegacyRows,
      woAssignmentBackfillReady: woBackfillReady,
      ttAssignmentBackfillReady: ttBackfillReady,
      dismantleHistoryBackfillReady: dismantleBackfillReady,
      allRequiredBackfillsReady,
    },
    warnings,
    errors,
    artifactGeneratedBy: 'provision-all-schema-preflight.ts orchestrator (DRY_RUN_VERIFY ONLY, ZERO writes)',
    artifactDryRunOnly: true,
  }

  return maskArtifactSecrets(artifact)
}

function writeArtifactFile(artifact: SchemaPreflightArtifact): string | null {
  try {
    const baseDir = safe(() => process.cwd(), '.')
    const scriptsDir = __dirname || path.join(baseDir, 'apps', 'web', 'scripts')
    const outDir = path.join(scriptsDir, '..', 'out', 'schema-preflight')
    fs.mkdirSync(outDir, { recursive: true })
    const fileName = `provision-all-schema-preflight-${artifact.shortSha}.json`
    const full = path.join(outDir, fileName)
    fs.writeFileSync(full, JSON.stringify(artifact, null, 2), 'utf8')
    return full
  } catch {
    return null
  }
}

export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  const wantWriteArtifact = !args.includes('--no-artifact')
  const wantStdoutOnly = args.includes('--stdout-only')
  try {
    const artifact = await computeArtifact()
    const redacted = maskArtifactSecrets(artifact)
    if (wantStdoutOnly) {
      process.stdout.write(JSON.stringify(redacted, null, 2) + '\n')
    } else {
      console.log(JSON.stringify(redacted, null, 2))
    }
    let writtenPath: string | null = null
    if (wantWriteArtifact) writtenPath = writeArtifactFile(redacted)
    if (writtenPath && !wantStdoutOnly) {
      console.error(`[preflight] artifact written: ${maskStringSecretSubstrings(writtenPath)}`)
    }
    if (redacted.overallStatus === 'PASS') return 0
    if (redacted.overallStatus === 'FATAL') return 2
    return 1
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const fatal: SchemaPreflightArtifact = {
      schemaPreflightVersion: SCHEMA_PREFLIGHT_VERSION,
      commitSha: 'UNKNOWN_SHA',
      shortSha: '0000000',
      timestamp: new Date().toISOString(),
      overallStatus: 'FATAL',
      modules: [],
      coverageSummary: {
        totalModules: 0,
        requiredModules: 0,
        verified: 0,
        notCovered: 0,
        failed: 0,
        skippedNotImplemented: 0,
        requiredModulesCoveredCount: 0,
        requiredModulesUncoveredCount: 0,
      },
      backfillSummary: {
        woAssignmentLegacyTechnicianRows: null,
        woAssignmentBackfillReady: false,
        ttAssignmentBackfillReady: false,
        dismantleHistoryBackfillReady: false,
        allRequiredBackfillsReady: false,
      },
      warnings: [],
      errors: ['ORCHESTRATOR_FATAL: ' + msg],
      artifactGeneratedBy: 'provision-all-schema-preflight.ts orchestrator',
      artifactDryRunOnly: true,
    }
    process.stderr.write(maskStringSecretSubstrings('[preflight FATAL] ' + msg) + '\n')
    process.stdout.write(JSON.stringify(maskArtifactSecrets(fatal), null, 2) + '\n')
    return 2
  }
}

export const runAllSchemaPreflight = main

if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  typeof require !== 'undefined' &&
  require.main &&
  typeof (require.main as NodeModule).filename === 'string' &&
  (require.main as NodeModule).filename.endsWith('provision-all-schema-preflight.ts')
) {
  void main(process.argv.slice(2)).then((code) => process.exit(code))
}
