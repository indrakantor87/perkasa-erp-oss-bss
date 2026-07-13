import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { fileURLToPath } from 'node:url'

const NOTE_PREFIXES = {
  actor: 'Closed By: ',
  fieldPic: 'Field PIC: ',
  deviceStatus: 'Device Status: ',
  pickupStatus: 'Pickup Status: ',
  closeOutcome: 'Close Outcome: ',
  billingDisposition: 'Billing Disposition: ',
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_PRODUCTION_PACK_PATH = path.resolve(
  SCRIPT_DIR,
  '..',
  '..',
  '..',
  'production-data',
  'web-psb-wave1a-support',
  'dismantle-history.production.json',
)

function pickArgValue(args, key) {
  const withEquals = args.find((value) => value.startsWith(`${key}=`))
  if (withEquals) {
    return withEquals.slice(`${key}=`.length).trim()
  }

  const index = args.findIndex((value) => value === key)
  if (index === -1) return ''
  const next = args[index + 1]
  if (!next || next.startsWith('--')) return ''
  return next.trim()
}

function parseDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    const databaseName = decodeURIComponent(parsed.pathname || '').replace(/^\//, '')
    return {
      ok: true,
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : null,
      databaseName,
      username: decodeURIComponent(parsed.username || ''),
    }
  } catch (error) {
    return {
      ok: false,
      error: String(error),
    }
  }
}

function parseEnvFile(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    env[key] = value
  }

  return env
}

function resolveRuntimeOptions() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const confirmDbName = pickArgValue(args, '--confirm-db')
  const confirmHost = pickArgValue(args, '--confirm-host')
  const envArg = args.find((value) => !value.startsWith('--'))
  const envPath = path.resolve(process.cwd(), envArg || '.env')

  if (!fs.existsSync(envPath)) {
    throw new Error(`File env tidak ditemukan: ${envPath}`)
  }

  const env = parseEnvFile(envPath)
  const databaseUrl = String(env.DATABASE_URL ?? process.env.DATABASE_URL ?? '').trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum diisi.')
  }

  const target = parseDatabaseUrl(databaseUrl)
  if (apply) {
    if (!confirmDbName && !confirmHost) {
      throw new Error(
        'Mode --apply membutuhkan konfirmasi target DB. Gunakan `--confirm-db <nama_db>` atau `--confirm-host <host>`.',
      )
    }

    if (target.ok) {
      if (confirmDbName && confirmDbName !== target.databaseName) {
        throw new Error(
          `Konfirmasi DB tidak cocok. Target: ${target.databaseName || '(unknown)'}. Input: ${confirmDbName}.`,
        )
      }
      if (confirmHost && confirmHost !== target.host) {
        throw new Error(`Konfirmasi host tidak cocok. Target: ${target.host || '(unknown)'}. Input: ${confirmHost}.`)
      }
    }
  }

  return { apply, envPath, databaseUrl, target }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function compactFacts(items) {
  return items.map((item) => normalizeText(item)).filter(Boolean)
}

function truncateText(value, maxLength = 180) {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3).trim()}...`
}

function formatLocalSecondKey(value) {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')
  const second = String(parsed.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatPackSecondKey(value) {
  const raw = normalizeText(value)
  if (!raw) return ''
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/)
  if (match?.[1] && match?.[2]) {
    return `${match[1]} ${match[2]}`
  }
  return formatLocalSecondKey(raw)
}

function formatDateOnly(value) {
  const raw = normalizeText(value)
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return raw
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function extractReasonSummary(reason) {
  const normalized = normalizeText(reason)
  if (!normalized) return ''

  const reviewMatch = normalized.match(/^\[Review Isolir\]\s+.+?\s-\s+(.+)$/i)
  const extracted = reviewMatch?.[1] ? reviewMatch[1] : normalized
  const firstSegment = extracted
    .split(' | ')[0]
    ?.split(/\s+Ref:\s+/i)[0]
    ?.trim() || extracted

  return truncateText(firstSegment, 140)
}

function extractCloseSummary(closeNote) {
  const normalized = normalizeText(closeNote)
  if (!normalized) return ''

  const firstLine = normalized.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || normalized
  const webCloseMatch = firstLine.match(/^\[Dismantled via web\]\s+(.+)$/i)
  if (webCloseMatch?.[1]) {
    return truncateText(webCloseMatch[1], 160)
  }

  const restoredMatch = firstLine.match(/^\[[^\]]+\]\s+(.+)$/)
  if (restoredMatch?.[1]) {
    return truncateText(restoredMatch[1], 160)
  }

  return truncateText(firstLine, 160)
}

function buildHistoryCloseNote(row) {
  const identifier =
    normalizeText(row.serviceNo) || normalizeText(row.customerCode) || `Isolation ID ${row.isolationId || row.id}`
  const summary =
    extractCloseSummary(row.isolationCloseNote) ||
    extractReasonSummary(row.isolationReason) ||
    'Catatan penutupan historis belum tercatat; backfill dari data lama.'

  const summaryLine = `[Dismantled legacy backfill] ${summary} | Ref: ${identifier}${
    row.closedAt ? ` | Closed: ${formatDateOnly(row.closedAt)}` : ''
  }`

  return [
    summaryLine,
    `${NOTE_PREFIXES.actor}Legacy Sanitizer (system)`,
    `${NOTE_PREFIXES.fieldPic}Data historis belum tercatat`,
    `${NOTE_PREFIXES.deviceStatus}Data historis belum tercatat`,
    `${NOTE_PREFIXES.pickupStatus}Data historis belum tercatat`,
    `${NOTE_PREFIXES.closeOutcome}Histori dismantle lama disanitasi`,
    `${NOTE_PREFIXES.billingDisposition}Perlu review manual`,
  ].join('\n')
}

function loadProductionPackSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      filePath,
    }
  }

  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const normalizedRows = Array.isArray(rows) ? rows : []
  const rowsWithRadboox = normalizedRows
    .filter((row) => normalizeText(row.radboox))
    .map((row) => ({
      id: row.id,
      sourceIsolationId: row.sourceIsolationId,
      customerName: row.customerName,
      radboox: row.radboox,
      marketing: row.marketing,
      reason: row.reason,
      closeNote: row.closeNote,
      ticketDismantle: row.ticketDismantle,
      closedAt: row.closedAt,
      closedBy: row.closedBy,
    }))

  const noteRows = normalizedRows
    .filter((row) => normalizeText(row.closeNote) || normalizeText(row.reason))
    .map((row) => ({
      id: row.id,
      customerName: row.customerName,
      closedAt: row.closedAt,
      note: normalizeText(row.closeNote) || normalizeText(row.reason),
    }))

  return {
    exists: true,
    filePath,
    totalRows: normalizedRows.length,
    withRadboox: rowsWithRadboox.length,
    emptyRadboox: normalizedRows.length - rowsWithRadboox.length,
    withReason: normalizedRows.filter((row) => normalizeText(row.reason)).length,
    withCloseNote: normalizedRows.filter((row) => normalizeText(row.closeNote)).length,
    withSourceIsolationId: normalizedRows.filter((row) => normalizeText(row.sourceIsolationId)).length,
    rowsWithRadboox,
    noteRows,
  }
}

function buildProductionPackNoteMap(summary) {
  const map = new Map()
  const ambiguousKeys = new Set()
  let duplicateKeys = 0
  if (summary?.exists) {
    for (const row of summary.noteRows ?? []) {
      const customerName = normalizeText(row.customerName)
      const closedAtKey = formatPackSecondKey(row.closedAt)
      if (!customerName || !closedAtKey) continue
      const key = `${customerName}__${closedAtKey}`
      if (ambiguousKeys.has(key)) continue
      if (map.has(key)) {
        map.delete(key)
        ambiguousKeys.add(key)
        duplicateKeys += 1
        continue
      }
      map.set(key, row.note)
    }
  }

  return {
    map,
    duplicateKeys,
    ambiguousKeys: ambiguousKeys.size,
  }
}

function parseClosedBySuffix(closeNote) {
  const normalized = normalizeText(closeNote)
  if (!normalized) return ''
  const index = normalized.toUpperCase().indexOf('CLOSED BY:')
  if (index === -1) return ''
  return normalized.slice(index).trim()
}

function extractPrimaryCloseNoteText(closeNote) {
  const normalized = normalizeText(closeNote)
  if (!normalized) return ''
  const closedByIndex = normalized.toUpperCase().indexOf('CLOSED BY:')
  if (closedByIndex === -1) return normalized
  const head = normalized.slice(0, closedByIndex).trim()
  return head.replace(/[|]+$/g, '').trim()
}

async function ensureRequiredColumns(connection) {
  const [rows] = await connection.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND (
        (table_name = 'support_dismantle_history' AND column_name IN ('id', 'isolation_id', 'radbox_name', 'close_note', 'closed_at'))
        OR (table_name = 'support_isolations' AND column_name IN ('id', 'radbox_name', 'close_note', 'reason', 'subscription_id'))
        OR (table_name = 'service_subscriptions' AND column_name IN ('id', 'service_no', 'customer_id'))
        OR (table_name = 'crm_customers' AND column_name IN ('id', 'customer_code'))
      )
  `)

  const found = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
  const required = [
    'support_dismantle_history.id',
    'support_dismantle_history.radbox_name',
    'support_dismantle_history.close_note',
  ]

  const missing = required.filter((item) => !found.has(item))
  if (missing.length > 0) {
    throw new Error(`Kolom wajib history backfill tidak lengkap: ${missing.join(', ')}`)
  }
}

async function getOptionalSchema(connection) {
  const [rows] = await connection.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'staging_legacy_support_records'
      AND column_name IN ('support_type', 'target_dismantle_history_id', 'radbox_name')
  `)

  const found = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))

  return {
    hasStagingSupportType: found.has('staging_legacy_support_records.support_type'),
    hasStagingTargetDismantleHistoryId: found.has('staging_legacy_support_records.target_dismantle_history_id'),
    hasStagingRadboxName: found.has('staging_legacy_support_records.radbox_name'),
  }
}

async function fetchCounts(connection) {
  const [rows] = await connection.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN radbox_name IS NULL OR TRIM(radbox_name) = '' THEN 1 ELSE 0 END) AS emptyRadbox,
      SUM(CASE WHEN close_note IS NULL OR TRIM(close_note) = '' THEN 1 ELSE 0 END) AS emptyCloseNote,
      SUM(CASE WHEN close_note LIKE '[Dismantled via web]%' THEN 1 ELSE 0 END) AS modernCloseNote
    FROM support_dismantle_history
  `)

  return {
    total: Number(rows[0]?.total ?? 0),
    emptyRadbox: Number(rows[0]?.emptyRadbox ?? 0),
    emptyCloseNote: Number(rows[0]?.emptyCloseNote ?? 0),
    modernCloseNote: Number(rows[0]?.modernCloseNote ?? 0),
  }
}

async function loadCandidates(connection, optionalSchema) {
  const canJoinStaging =
    optionalSchema.hasStagingSupportType &&
    optionalSchema.hasStagingTargetDismantleHistoryId &&
    optionalSchema.hasStagingRadboxName

  const stagingRadboxExpression = canJoinStaging ? 'sl.radbox_name' : 'NULL'
  const stagingJoin = canJoinStaging
    ? `
    LEFT JOIN staging_legacy_support_records sl
      ON sl.target_dismantle_history_id = dh.id
     AND sl.support_type = 'DISMANTLE_HISTORY'`
    : ''

  const [rows] = await connection.query(`
    SELECT
      dh.id,
      dh.isolation_id AS isolationId,
      dh.customer_name AS customerName,
      dh.radbox_name AS historyRadboxName,
      dh.close_note AS historyCloseNote,
      dh.closed_at AS closedAt,
      si.radbox_name AS isolationRadboxName,
      si.close_note AS isolationCloseNote,
      si.reason AS isolationReason,
      ${stagingRadboxExpression} AS stagingRadboxName,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode
    FROM support_dismantle_history dh
    LEFT JOIN support_isolations si
      ON si.id = dh.isolation_id
    ${stagingJoin}
    LEFT JOIN service_subscriptions ss
      ON ss.id = si.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE (dh.radbox_name IS NULL OR TRIM(dh.radbox_name) = '')
       OR (dh.close_note IS NULL OR TRIM(dh.close_note) = '')
    ORDER BY dh.closed_at DESC, dh.id DESC
  `)

  return rows.map((row) => {
    const isolationRadboxName = normalizeText(row.isolationRadboxName)
    const stagingRadboxName = normalizeText(row.stagingRadboxName)
    const nextRadboxName =
      normalizeText(row.historyRadboxName) || isolationRadboxName || stagingRadboxName || ''
    const nextCloseNote = normalizeText(row.historyCloseNote) || buildHistoryCloseNote(row)

    return {
      ...row,
      nextRadboxName,
      nextCloseNote,
      radboxSource: isolationRadboxName ? 'support_isolations' : stagingRadboxName ? 'staging_legacy_support_records' : '',
      willUpdateRadbox: !normalizeText(row.historyRadboxName) && Boolean(nextRadboxName),
      willUpdateCloseNote: !normalizeText(row.historyCloseNote) && Boolean(nextCloseNote),
    }
  })
}

async function loadCloseNoteEnrichmentCandidates(connection) {
  const [rows] = await connection.query(`
    SELECT
      dh.id,
      dh.customer_name AS customerName,
      dh.closed_at AS closedAt,
      dh.close_note AS historyCloseNote,
      dh.radbox_name AS historyRadboxName
    FROM support_dismantle_history dh
    WHERE dh.close_note LIKE 'Closed By:%'
    ORDER BY dh.closed_at DESC, dh.id DESC
  `)

  return rows
}

function printPreview(label, rows, pickFields) {
  const preview = rows.slice(0, 5).map((row) => pickFields(row))
  console.log(`\n${label}: ${rows.length}`)
  console.log(JSON.stringify(preview, null, 2))
}

async function applyBackfill(connection, candidates) {
  await connection.beginTransaction()

  try {
    for (const row of candidates) {
      const assignments = []
      const values = []

      if (row.willUpdateRadbox) {
        assignments.push('radbox_name = ?')
        values.push(row.nextRadboxName)
      }
      if (row.willUpdateCloseNote) {
        assignments.push('close_note = ?')
        values.push(row.nextCloseNote)
      }

      if (!assignments.length) {
        continue
      }

      values.push(row.id)

      await connection.query(
        `
          UPDATE support_dismantle_history
          SET ${assignments.join(', ')}
          WHERE id = ?
        `,
        values,
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

async function main() {
  const options = resolveRuntimeOptions()
  const connection = await mysql.createConnection(options.databaseUrl)

  try {
    await ensureRequiredColumns(connection)
    const optionalSchema = await getOptionalSchema(connection)
    const productionPackSummary = loadProductionPackSummary(DEFAULT_PRODUCTION_PACK_PATH)
    const productionPackNoteMap = buildProductionPackNoteMap(productionPackSummary)

    const before = await fetchCounts(connection)
    const candidates = await loadCandidates(connection, optionalSchema)
    const noteCandidates = await loadCloseNoteEnrichmentCandidates(connection)

    const enrichedNoteCandidates = noteCandidates
      .map((row) => {
        const customerName = normalizeText(row.customerName)
        const closedAtKey = formatLocalSecondKey(row.closedAt)
        const key = customerName && closedAtKey ? `${customerName}__${closedAtKey}` : ''
        const packNote = key ? normalizeText(productionPackNoteMap.map.get(key)) : ''
        const currentCloseNote = normalizeText(row.historyCloseNote)
        const currentPrimary = extractPrimaryCloseNoteText(currentCloseNote)
        const closedBySuffix = parseClosedBySuffix(currentCloseNote) || currentCloseNote
        const shouldEnrich = Boolean(packNote) && !currentPrimary && Boolean(closedBySuffix)

        return {
          ...row,
          packNote,
          enrichedCloseNote: shouldEnrich ? `${packNote} | ${closedBySuffix}` : '',
          willEnrichCloseNote: shouldEnrich,
        }
      })
      .filter((row) => row.willEnrichCloseNote)

    const radboxCandidates = candidates.filter((row) => row.willUpdateRadbox)
    const closeNoteCandidates = candidates.filter((row) => row.willUpdateCloseNote)
    const radboxCoverage = {
      missingHistoryRadboxRows: candidates.filter((row) => !normalizeText(row.historyRadboxName)).length,
      withIsolationRadbox: candidates.filter((row) => !normalizeText(row.historyRadboxName) && normalizeText(row.isolationRadboxName)).length,
      withStagingRadbox: candidates.filter((row) => !normalizeText(row.historyRadboxName) && !normalizeText(row.isolationRadboxName) && normalizeText(row.stagingRadboxName)).length,
      stillNoSource: candidates.filter((row) => !normalizeText(row.historyRadboxName) && !normalizeText(row.isolationRadboxName) && !normalizeText(row.stagingRadboxName)).length,
    }

    console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}`)
    console.log(`Env source: ${options.envPath}`)
    console.log(`Target DB: ${JSON.stringify(options.target)}`)
    console.log(`Sebelum backfill: ${JSON.stringify(before)}`)
    console.log(`Cakupan sumber radbox: ${JSON.stringify(radboxCoverage)}`)
    if (productionPackSummary.exists) {
      console.log(
        `Cakupan production pack: ${JSON.stringify({
          filePath: productionPackSummary.filePath,
          totalRows: productionPackSummary.totalRows,
          withRadboox: productionPackSummary.withRadboox,
          emptyRadboox: productionPackSummary.emptyRadboox,
          withReason: productionPackSummary.withReason,
          withCloseNote: productionPackSummary.withCloseNote,
          withSourceIsolationId: productionPackSummary.withSourceIsolationId,
        })}`,
      )
      printPreview('Preview production pack radboox', productionPackSummary.rowsWithRadboox, (row) => row)
    } else {
      console.log(`Production pack tidak ditemukan: ${productionPackSummary.filePath}`)
    }
    console.log(
      `Cakupan production pack note map: ${JSON.stringify({
        totalNotes: productionPackNoteMap.map.size,
        duplicateKeys: productionPackNoteMap.duplicateKeys,
        ambiguousKeys: productionPackNoteMap.ambiguousKeys,
        enrichmentCandidates: enrichedNoteCandidates.length,
      })}`,
    )

    printPreview('Preview radbox history', radboxCandidates, (row) => ({
      id: row.id,
      customerName: row.customerName,
      currentRadbox: normalizeText(row.historyRadboxName) || null,
      nextRadbox: row.nextRadboxName || null,
      isolationRadbox: normalizeText(row.isolationRadboxName) || null,
      stagingRadbox: normalizeText(row.stagingRadboxName) || null,
      source: row.radboxSource || null,
    }))

    printPreview('Preview close_note history', closeNoteCandidates, (row) => ({
      id: row.id,
      customerName: row.customerName,
      currentCloseNote: normalizeText(row.historyCloseNote) || null,
      nextCloseNote: row.nextCloseNote,
    }))

    printPreview('Preview enrichment close_note history', enrichedNoteCandidates, (row) => ({
      id: row.id,
      customerName: row.customerName,
      closedAtKey: formatLocalSecondKey(row.closedAt),
      currentCloseNote: normalizeText(row.historyCloseNote) || null,
      packNote: row.packNote || null,
      enrichedCloseNote: row.enrichedCloseNote || null,
    }))

    if (!options.apply) {
      console.log('\nDry-run selesai. Jalankan ulang dengan `--apply` untuk menulis perubahan.')
      return
    }

    const mergedCandidates = [
      ...candidates,
      ...enrichedNoteCandidates.map((row) => ({
        id: row.id,
        willUpdateRadbox: false,
        willUpdateCloseNote: true,
        nextCloseNote: row.enrichedCloseNote,
        nextRadboxName: '',
      })),
    ]

    await applyBackfill(connection, mergedCandidates)
    const after = await fetchCounts(connection)

    console.log('\nBackfill selesai.')
    console.log(
      JSON.stringify(
        {
          updatedRadbox: radboxCandidates.length,
          updatedCloseNote: closeNoteCandidates.length + enrichedNoteCandidates.length,
          updatedCloseNoteFromProductionPack: enrichedNoteCandidates.length,
          after,
        },
        null,
        2,
      ),
    )
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
