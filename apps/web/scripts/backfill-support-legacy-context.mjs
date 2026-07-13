import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { fileURLToPath } from 'node:url'

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

  return {
    apply,
    envPath,
    databaseUrl,
    target,
  }
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

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_ISOLATION_PACK_PATH = path.resolve(
  SCRIPT_DIR,
  '..',
  '..',
  '..',
  'production-data',
  'web-psb-wave1a-support',
  'isolation.production.json',
)
const DEFAULT_DISMANTLE_QUEUE_PACK_PATH = path.resolve(
  SCRIPT_DIR,
  '..',
  '..',
  '..',
  'production-data',
  'web-psb-wave1a-support',
  'dismantle-tickets.production.json',
)
const LEGACY_ISOLATION_REASON_PREFIX = '[Review Isolir] Legacy Sanitizer'
const LEGACY_TRANSFER_NOTE_PREFIX = '[Transferred to dismantle queue] Legacy Sanitizer'

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

function buildSupportPackMatchKey(customerName, openedAt) {
  const normalizedName = normalizeText(customerName)
  const normalizedOpenedAt = normalizeText(openedAt)
  if (!normalizedName || !normalizedOpenedAt) return ''
  return `${normalizedName}__${normalizedOpenedAt}`
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

function extractIsolationReasonSummary(reason) {
  const normalized = normalizeText(reason)
  if (!normalized) return ''

  const legacyReviewPrefix = normalized.match(/^\[Review Isolir\]\s+.+?\s-\s+(.+)$/i)
  const extracted = legacyReviewPrefix?.[1] ? legacyReviewPrefix[1] : normalized
  const firstSegment = extracted
    .split(' | ')[0]
    ?.split(/\s+Ref:\s+/i)[0]
    ?.trim() || extracted

  if (firstSegment) {
    return truncateText(firstSegment, 140)
  }

  return truncateText(extracted, 140)
}

function buildIsolationReason(row) {
  const identifier = normalizeText(row.serviceNo) || normalizeText(row.customerCode) || `Isolation ID ${row.id}`
  const routeLabel = Number(row.hasDismantleQueue ?? 0) > 0 ? 'jalur dismantle legacy' : 'jalur isolir aktif legacy'
  const facts = compactFacts([
    `Ref: ${identifier}`,
    row.radboxName ? `Radbox: ${row.radboxName}` : '',
    row.marketingName ? `Marketing: ${row.marketingName}` : '',
    row.isolationDate ? `Tanggal Isolir: ${formatDateOnly(row.isolationDate)}` : '',
    `Konteks: ${routeLabel}`,
  ])

  return `[Review Isolir] Legacy Sanitizer (system) - Alasan isolir historis belum tercatat; backfill dari data lama. ${facts.join(' | ')}`
}

function buildIsolationReasonFromPack(packRow, fallbackRow) {
  const reasonSummary = truncateText(packRow.reason || packRow.closeNote, 140)
  const identifier =
    normalizeText(fallbackRow.serviceNo) ||
    normalizeText(fallbackRow.customerCode) ||
    normalizeText(packRow.ticketDismantle) ||
    `Isolation ID ${fallbackRow.id}`
  const facts = compactFacts([
    `Ref: ${identifier}`,
    fallbackRow.radboxName ? `Radbox: ${fallbackRow.radboxName}` : packRow.radboox ? `Radbox: ${packRow.radboox}` : '',
    fallbackRow.marketingName ? `Marketing: ${fallbackRow.marketingName}` : packRow.marketing ? `Marketing: ${packRow.marketing}` : '',
    packRow.ticketDismantle ? `Ticket Dismantle: ${packRow.ticketDismantle}` : '',
    fallbackRow.isolationDate ? `Tanggal Isolir: ${formatDateOnly(fallbackRow.isolationDate)}` : '',
  ])

  return `[Review Isolir] Production Recovery - ${reasonSummary}${facts.length ? ` | ${facts.join(' | ')}` : ''}`
}

function buildTransferNote(row, derivedIsolationReason) {
  const identifier = normalizeText(row.serviceNo) || normalizeText(row.customerCode) || `Isolation ID ${row.isolationId}`
  const reasonSummary =
    extractIsolationReasonSummary(row.isolationReason) ||
    extractIsolationReasonSummary(derivedIsolationReason) ||
    'Alasan isolir historis belum tercatat'
  const facts = compactFacts([
    `Reason: ${reasonSummary}`,
    `Ref: ${identifier}`,
    row.radboxName ? `Radbox: ${row.radboxName}` : '',
    row.marketingName ? `Marketing: ${row.marketingName}` : '',
    row.transferredAt ? `Transferred: ${formatDateOnly(row.transferredAt)}` : '',
  ])

  return `[Transferred to dismantle queue] Legacy Sanitizer (system) - Backfill dari data lama | ${facts.join(' | ')}`
}

function buildTransferNoteFromPack(packRow, fallbackRow) {
  const facts = compactFacts([
    packRow.fieldNote ? truncateText(packRow.fieldNote, 140) : '',
    packRow.reason ? `Reason: ${truncateText(packRow.reason, 120)}` : '',
    normalizeText(fallbackRow.serviceNo) || normalizeText(fallbackRow.customerCode)
      ? `Ref: ${normalizeText(fallbackRow.serviceNo) || normalizeText(fallbackRow.customerCode)}`
      : '',
    fallbackRow.radboxName ? `Radbox: ${fallbackRow.radboxName}` : packRow.radboox ? `Radbox: ${packRow.radboox}` : '',
    fallbackRow.marketingName ? `Marketing: ${fallbackRow.marketingName}` : packRow.marketing ? `Marketing: ${packRow.marketing}` : '',
    packRow.ticketNumber ? `Legacy Ticket: ${packRow.ticketNumber}` : '',
    fallbackRow.transferredAt ? `Transferred: ${formatDateOnly(fallbackRow.transferredAt)}` : '',
  ])

  return facts.join(' | ')
}

function loadJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return []
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return Array.isArray(parsed) ? parsed : []
}

function buildIsolationPackMap() {
  const rows = loadJsonArray(DEFAULT_ISOLATION_PACK_PATH)
  const map = new Map()
  const ambiguousKeys = new Set()
  let duplicateKeys = 0

  for (const row of rows) {
    const key = buildSupportPackMatchKey(row.customerName, formatPackSecondKey(row.isolationDate))
    if (!key) continue
    if (ambiguousKeys.has(key)) continue
    if (map.has(key)) {
      map.delete(key)
      ambiguousKeys.add(key)
      duplicateKeys += 1
      continue
    }
    map.set(key, {
      customerName: normalizeText(row.customerName),
      isolationDate: formatPackSecondKey(row.isolationDate),
      reason: normalizeText(row.reason),
      closeNote: normalizeText(row.closeNote),
      ticketDismantle: normalizeText(row.ticketDismantle),
      marketing: normalizeText(row.marketing),
      radboox: normalizeText(row.radboox),
    })
  }

  return {
    filePath: DEFAULT_ISOLATION_PACK_PATH,
    totalRows: rows.length,
    withReason: rows.filter((row) => normalizeText(row.reason)).length,
    withCloseNote: rows.filter((row) => normalizeText(row.closeNote)).length,
    map,
    duplicateKeys,
    ambiguousKeys: ambiguousKeys.size,
  }
}

function buildDismantleQueuePackMap() {
  const rows = loadJsonArray(DEFAULT_DISMANTLE_QUEUE_PACK_PATH)
  const map = new Map()
  const ambiguousKeys = new Set()
  let duplicateKeys = 0

  for (const row of rows) {
    const key = buildSupportPackMatchKey(row.customerName, formatPackSecondKey(row.isolationDate))
    if (!key) continue
    if (ambiguousKeys.has(key)) continue
    if (map.has(key)) {
      map.delete(key)
      ambiguousKeys.add(key)
      duplicateKeys += 1
      continue
    }
    map.set(key, {
      customerName: normalizeText(row.customerName),
      isolationDate: formatPackSecondKey(row.isolationDate),
      reason: normalizeText(row.reason),
      fieldNote: normalizeText(row.fieldNote),
      ticketNumber: normalizeText(row.ticketNumber),
      marketing: normalizeText(row.marketing),
      radboox: normalizeText(row.radboox),
      sourceIsolationId: normalizeText(row.sourceIsolationId),
    })
  }

  return {
    filePath: DEFAULT_DISMANTLE_QUEUE_PACK_PATH,
    totalRows: rows.length,
    withReason: rows.filter((row) => normalizeText(row.reason)).length,
    withFieldNote: rows.filter((row) => normalizeText(row.fieldNote)).length,
    map,
    duplicateKeys,
    ambiguousKeys: ambiguousKeys.size,
  }
}

async function ensureRequiredColumns(connection) {
  const [rows] = await connection.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND (
        (table_name = 'support_isolations' AND column_name IN ('id', 'status', 'reason', 'subscription_id', 'radbox_name', 'marketing_name', 'isolation_date'))
        OR (table_name = 'support_dismantle_queue' AND column_name IN ('id', 'isolation_id', 'transfer_note', 'transferred_at'))
        OR (table_name = 'service_subscriptions' AND column_name IN ('id', 'service_no', 'customer_id'))
        OR (table_name = 'crm_customers' AND column_name IN ('id', 'customer_code'))
      )
  `)

  const found = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
  const required = [
    'support_isolations.id',
    'support_isolations.status',
    'support_isolations.reason',
    'support_dismantle_queue.id',
    'support_dismantle_queue.isolation_id',
    'support_dismantle_queue.transfer_note',
  ]

  const missing = required.filter((item) => !found.has(item))
  if (missing.length > 0) {
    throw new Error(`Kolom wajib backfill tidak lengkap: ${missing.join(', ')}`)
  }
}

async function loadIsolationBackfillCandidates(connection) {
  const [rows] = await connection.query(`
    SELECT
      si.id,
      si.customer_name AS customerName,
      si.reason,
      si.radbox_name AS radboxName,
      si.marketing_name AS marketingName,
      si.isolation_date AS isolationDate,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode,
      CASE WHEN dq.id IS NULL THEN 0 ELSE 1 END AS hasDismantleQueue
    FROM support_isolations si
    LEFT JOIN service_subscriptions ss
      ON ss.id = si.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    LEFT JOIN support_dismantle_queue dq
      ON dq.isolation_id = si.id
    WHERE si.status = 'OPEN'
      AND (si.reason IS NULL OR TRIM(si.reason) = '')
    ORDER BY si.isolation_date DESC, si.id DESC
  `)

  return rows.map((row) => ({
    ...row,
    nextReason: buildIsolationReason(row),
  }))
}

async function loadIsolationEnrichmentCandidates(connection, isolationPackMap) {
  const [rows] = await connection.query(`
    SELECT
      si.id,
      si.customer_name AS customerName,
      si.reason,
      si.radbox_name AS radboxName,
      si.marketing_name AS marketingName,
      si.isolation_date AS isolationDate,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode,
      CASE WHEN dq.id IS NULL THEN 0 ELSE 1 END AS hasDismantleQueue
    FROM support_isolations si
    LEFT JOIN service_subscriptions ss
      ON ss.id = si.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    LEFT JOIN support_dismantle_queue dq
      ON dq.isolation_id = si.id
    WHERE si.status = 'OPEN'
      AND si.reason LIKE '[Review Isolir] Legacy Sanitizer%'
    ORDER BY si.isolation_date DESC, si.id DESC
  `)

  return rows
    .map((row) => {
      const packKey = buildSupportPackMatchKey(row.customerName, formatLocalSecondKey(row.isolationDate))
      const packRow = isolationPackMap.get(packKey)
      const packReason = normalizeText(packRow?.reason) || normalizeText(packRow?.closeNote)

      return {
        ...row,
        packKey,
        packRow,
        nextReason: packReason ? buildIsolationReasonFromPack(packRow, row) : '',
        willEnrich: Boolean(packReason),
      }
    })
    .filter((row) => row.willEnrich)
}

async function loadDismantleQueueBackfillCandidates(connection, isolationReasonMap) {
  const [rows] = await connection.query(`
    SELECT
      dq.id,
      dq.isolation_id AS isolationId,
      dq.transfer_note AS transferNote,
      dq.transferred_at AS transferredAt,
      si.customer_name AS customerName,
      si.reason AS isolationReason,
      si.radbox_name AS radboxName,
      si.marketing_name AS marketingName,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode
    FROM support_dismantle_queue dq
    INNER JOIN support_isolations si
      ON si.id = dq.isolation_id
    LEFT JOIN service_subscriptions ss
      ON ss.id = si.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE dq.transfer_note IS NULL OR TRIM(dq.transfer_note) = ''
    ORDER BY dq.transferred_at DESC, dq.id DESC
  `)

  return rows.map((row) => ({
    ...row,
    nextTransferNote: buildTransferNote(row, isolationReasonMap.get(Number(row.isolationId)) || ''),
  }))
}

async function loadDismantleQueueEnrichmentCandidates(connection, dismantleQueuePackMap) {
  const [rows] = await connection.query(`
    SELECT
      dq.id,
      dq.isolation_id AS isolationId,
      dq.transfer_note AS transferNote,
      dq.transferred_at AS transferredAt,
      si.customer_name AS customerName,
      si.isolation_date AS isolationDate,
      si.reason AS isolationReason,
      si.radbox_name AS radboxName,
      si.marketing_name AS marketingName,
      ss.service_no AS serviceNo,
      c.customer_code AS customerCode
    FROM support_dismantle_queue dq
    INNER JOIN support_isolations si
      ON si.id = dq.isolation_id
    LEFT JOIN service_subscriptions ss
      ON ss.id = si.subscription_id
    LEFT JOIN crm_customers c
      ON c.id = ss.customer_id
    WHERE dq.transfer_note LIKE '[Transferred to dismantle queue] Legacy Sanitizer%'
    ORDER BY dq.transferred_at DESC, dq.id DESC
  `)

  return rows
    .map((row) => {
      const packKey = buildSupportPackMatchKey(row.customerName, formatLocalSecondKey(row.isolationDate))
      const packRow = dismantleQueuePackMap.get(packKey)
      const canEnrich = Boolean(normalizeText(packRow?.reason) || normalizeText(packRow?.fieldNote))

      return {
        ...row,
        packKey,
        packRow,
        nextTransferNote: canEnrich ? buildTransferNoteFromPack(packRow, row) : '',
        willEnrich: canEnrich,
      }
    })
    .filter((row) => row.willEnrich)
}

async function fetchRemainingCounts(connection) {
  const [isoRows] = await connection.query(`
    SELECT COUNT(*) AS total
    FROM support_isolations
    WHERE status = 'OPEN'
      AND (reason IS NULL OR TRIM(reason) = '')
  `)
  const [queueRows] = await connection.query(`
    SELECT COUNT(*) AS total
    FROM support_dismantle_queue
    WHERE transfer_note IS NULL OR TRIM(transfer_note) = ''
  `)

  return {
    missingIsolationReason: Number(isoRows[0]?.total ?? 0),
    missingTransferNote: Number(queueRows[0]?.total ?? 0),
  }
}

function printPreview(label, rows, pickFields) {
  const preview = rows.slice(0, 5).map((row) => pickFields(row))
  console.log(`\n${label}: ${rows.length}`)
  console.log(JSON.stringify(preview, null, 2))
}

async function applyBackfill(connection, isolationRows, queueRows) {
  await connection.beginTransaction()

  try {
    for (const row of isolationRows) {
      await connection.query(
        `
          UPDATE support_isolations
          SET reason = ?
          WHERE id = ?
            AND (reason IS NULL OR TRIM(reason) = '')
        `,
        [row.nextReason, row.id],
      )
    }

    for (const row of queueRows) {
      await connection.query(
        `
          UPDATE support_dismantle_queue
          SET transfer_note = ?
          WHERE id = ?
            AND (transfer_note IS NULL OR TRIM(transfer_note) = '')
        `,
        [row.nextTransferNote, row.id],
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

async function applyEnrichment(connection, isolationRows, queueRows) {
  await connection.beginTransaction()

  try {
    for (const row of isolationRows) {
      await connection.query(
        `
          UPDATE support_isolations
          SET reason = ?
          WHERE id = ?
            AND reason LIKE '[Review Isolir] Legacy Sanitizer%'
        `,
        [row.nextReason, row.id],
      )
    }

    for (const row of queueRows) {
      await connection.query(
        `
          UPDATE support_dismantle_queue
          SET transfer_note = ?
          WHERE id = ?
            AND transfer_note LIKE '[Transferred to dismantle queue] Legacy Sanitizer%'
        `,
        [row.nextTransferNote, row.id],
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
    const isolationPack = buildIsolationPackMap()
    const dismantleQueuePack = buildDismantleQueuePackMap()

    const before = await fetchRemainingCounts(connection)
    const isolationRows = await loadIsolationBackfillCandidates(connection)
    const isolationReasonMap = new Map(isolationRows.map((row) => [Number(row.id), row.nextReason]))
    const queueRows = await loadDismantleQueueBackfillCandidates(connection, isolationReasonMap)
    const isolationEnrichmentRows = await loadIsolationEnrichmentCandidates(connection, isolationPack.map)
    const queueEnrichmentRows = await loadDismantleQueueEnrichmentCandidates(connection, dismantleQueuePack.map)
    const isolationLegacyCandidateCount = await connection
      .query(`
        SELECT COUNT(*) AS total
        FROM support_isolations
        WHERE status = 'OPEN'
          AND reason LIKE '[Review Isolir] Legacy Sanitizer%'
      `)
      .then(([rows]) => Number(rows[0]?.total ?? 0))
    const queueLegacyCandidateCount = await connection
      .query(`
        SELECT COUNT(*) AS total
        FROM support_dismantle_queue
        WHERE transfer_note LIKE '[Transferred to dismantle queue] Legacy Sanitizer%'
      `)
      .then(([rows]) => Number(rows[0]?.total ?? 0))

    console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}`)
    console.log(`Env source: ${options.envPath}`)
    console.log(`Target DB: ${JSON.stringify(options.target)}`)
    console.log(`Sebelum backfill: ${JSON.stringify(before)}`)
    console.log(
      `Cakupan isolation pack: ${JSON.stringify({
        filePath: isolationPack.filePath,
        totalRows: isolationPack.totalRows,
        withReason: isolationPack.withReason,
        withCloseNote: isolationPack.withCloseNote,
        duplicateKeys: isolationPack.duplicateKeys,
        ambiguousKeys: isolationPack.ambiguousKeys,
      })}`,
    )
    console.log(
      `Cakupan dismantle queue pack: ${JSON.stringify({
        filePath: dismantleQueuePack.filePath,
        totalRows: dismantleQueuePack.totalRows,
        withReason: dismantleQueuePack.withReason,
        withFieldNote: dismantleQueuePack.withFieldNote,
        duplicateKeys: dismantleQueuePack.duplicateKeys,
        ambiguousKeys: dismantleQueuePack.ambiguousKeys,
      })}`,
    )
    console.log(
      `Cakupan legacy candidate aktif: ${JSON.stringify({
        openIsolationLegacyRows: isolationLegacyCandidateCount,
        dismantleQueueLegacyRows: queueLegacyCandidateCount,
        enrichableIsolationRows: isolationEnrichmentRows.length,
        enrichableDismantleQueueRows: queueEnrichmentRows.length,
      })}`,
    )

    printPreview('Preview support_isolations.reason', isolationRows, (row) => ({
      id: row.id,
      customerName: row.customerName,
      currentReason: normalizeText(row.reason) || null,
      nextReason: row.nextReason,
    }))
    printPreview('Preview support_dismantle_queue.transfer_note', queueRows, (row) => ({
      id: row.id,
      isolationId: row.isolationId,
      currentTransferNote: normalizeText(row.transferNote) || null,
      nextTransferNote: row.nextTransferNote,
    }))
    printPreview('Preview enrichment support_isolations.reason', isolationEnrichmentRows, (row) => ({
      id: row.id,
      customerName: row.customerName,
      packKey: row.packKey,
      currentReason: normalizeText(row.reason) || null,
      nextReason: row.nextReason,
    }))
    printPreview('Preview enrichment support_dismantle_queue.transfer_note', queueEnrichmentRows, (row) => ({
      id: row.id,
      customerName: row.customerName,
      packKey: row.packKey,
      currentTransferNote: normalizeText(row.transferNote) || null,
      nextTransferNote: row.nextTransferNote,
    }))

    if (!options.apply) {
      console.log('\nDry-run selesai. Jalankan ulang dengan `--apply` untuk menulis perubahan.')
      return
    }

    await applyBackfill(connection, isolationRows, queueRows)
    await applyEnrichment(connection, isolationEnrichmentRows, queueEnrichmentRows)
    const after = await fetchRemainingCounts(connection)

    console.log('\nBackfill selesai.')
    console.log(JSON.stringify({
      updatedIsolationReason: isolationRows.length,
      updatedTransferNote: queueRows.length,
      enrichedIsolationReason: isolationEnrichmentRows.length,
      enrichedTransferNote: queueEnrichmentRows.length,
      after,
    }, null, 2))
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
