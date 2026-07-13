import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'

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

function hasArg(args, key) {
  return args.includes(key) || args.some((value) => value.startsWith(`${key}=`))
}

function readEnvSource(args) {
  const envArg = pickArgValue(args, '--env') || '.env'
  const envPath = path.resolve(process.cwd(), envArg)
  if (!fs.existsSync(envPath)) {
    throw new Error(`File env tidak ditemukan: ${envPath}`)
  }

  return {
    envPath,
    env: parseEnvFile(envPath),
  }
}

function getDatabaseConfig(env) {
  const databaseUrl = String(env.DATABASE_URL ?? '').trim()
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

function buildFlowConfig(flow) {
  const flowMap = {
    restore: {
      routePath: (id) => `/api/support/isolations/${id}/restore`,
      payloadKey: 'closeNote',
      requiredRoleHint: 'support update',
      discoverySql: `
        SELECT
          id,
          customer_name AS customerName,
          status,
          restoration_date AS restorationDate,
          close_note AS closeNote,
          updated_at AS updatedAt
        FROM support_isolations
        WHERE COALESCE(UPPER(TRIM(status)), 'OPEN') <> 'CLOSED'
          AND restoration_date IS NULL
        ORDER BY updated_at DESC
        LIMIT 10
      `,
      beforeSnapshotSql: `
        SELECT
          id,
          customer_name AS customerName,
          status,
          restoration_date AS restorationDate,
          close_note AS closeNote,
          updated_at AS updatedAt
        FROM support_isolations
        WHERE id = ?
        LIMIT 1
      `,
      afterSnapshotSql: `
        SELECT
          id,
          customer_name AS customerName,
          status,
          restoration_date AS restorationDate,
          close_note AS closeNote,
          updated_at AS updatedAt
        FROM support_isolations
        WHERE id = ?
        LIMIT 1
      `,
      afterSnapshotValues: (id) => [id],
    },
    transfer: {
      routePath: (id) => `/api/support/isolations/${id}/dismantle`,
      payloadKey: 'transferNote',
      requiredRoleHint: 'CS_ADMIN approver atau DISMANTLE_OPERATOR',
      discoverySql: `
        SELECT
          si.id,
          si.customer_name AS customerName,
          si.status,
          si.archived_at AS archivedAt,
          si.close_note AS closeNote,
          si.updated_at AS updatedAt
        FROM support_isolations si
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = si.id
        WHERE si.archived_at IS NULL
          AND COALESCE(UPPER(TRIM(si.status)), 'OPEN') <> 'CLOSED'
          AND dq.id IS NULL
        ORDER BY si.updated_at DESC
        LIMIT 10
      `,
      beforeSnapshotSql: `
        SELECT
          si.id,
          si.customer_name AS customerName,
          si.status,
          si.archived_at AS archivedAt,
          si.close_note AS closeNote,
          dq.id AS queueId,
          dq.transfer_note AS transferNote,
          dq.transferred_by_username AS transferredByUsername,
          dq.transferred_at AS transferredAt
        FROM support_isolations si
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = si.id
        WHERE si.id = ?
        LIMIT 1
      `,
      afterSnapshotSql: `
        SELECT
          si.id,
          si.customer_name AS customerName,
          si.status,
          si.archived_at AS archivedAt,
          si.close_note AS closeNote,
          dq.id AS queueId,
          dq.transfer_note AS transferNote,
          dq.transferred_by_username AS transferredByUsername,
          dq.transferred_at AS transferredAt
        FROM support_isolations si
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = si.id
        WHERE si.id = ?
        LIMIT 1
      `,
      afterSnapshotValues: (id) => [id],
    },
    reopen: {
      routePath: (id) => `/api/support/dismantle-history/${id}/reopen`,
      payloadKey: 'reopenNote',
      requiredRoleHint: 'CS_ADMIN approver atau DISMANTLE_OPERATOR',
      discoverySql: `
        SELECT
          dh.id AS historyId,
          dh.isolation_id AS isolationId,
          dh.customer_name AS customerName,
          si.status,
          si.archived_at AS archivedAt,
          si.restoration_date AS restorationDate,
          dh.closed_at AS closedAt
        FROM support_dismantle_history dh
        INNER JOIN support_isolations si
          ON si.id = dh.isolation_id
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = dh.isolation_id
        WHERE dq.id IS NULL
        ORDER BY dh.closed_at DESC, dh.id DESC
        LIMIT 10
      `,
      beforeSnapshotSql: `
        SELECT
          dh.id AS historyId,
          dh.isolation_id AS isolationId,
          dh.customer_name AS customerName,
          dh.closed_at AS closedAt,
          dh.close_note AS historyCloseNote,
          si.status,
          si.archived_at AS archivedAt,
          si.restoration_date AS restorationDate,
          dq.id AS queueId,
          dq.transfer_note AS transferNote,
          dq.reopened_note AS reopenedNote
        FROM support_dismantle_history dh
        INNER JOIN support_isolations si
          ON si.id = dh.isolation_id
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = dh.isolation_id
        WHERE dh.id = ?
        LIMIT 1
      `,
      afterSnapshotSql: `
        SELECT
          dh.id AS historyId,
          si.id AS isolationId,
          si.customer_name AS customerName,
          dh.closed_at AS closedAt,
          dh.close_note AS historyCloseNote,
          si.status,
          si.archived_at AS archivedAt,
          si.restoration_date AS restorationDate,
          dq.id AS queueId,
          dq.transfer_note AS transferNote,
          dq.reopened_note AS reopenedNote
        FROM support_isolations si
        LEFT JOIN support_dismantle_history dh
          ON dh.isolation_id = si.id
        LEFT JOIN support_dismantle_queue dq
          ON dq.isolation_id = si.id
        WHERE si.id = ?
        ORDER BY dh.id DESC
        LIMIT 1
      `,
      afterSnapshotValues: (_, beforeRows) => [beforeRows[0]?.isolationId ?? 0],
    },
  }

  const config = flowMap[flow]
  if (!config) {
    throw new Error(`Flow tidak dikenal: ${flow}`)
  }

  return config
}

async function createDbConnection(config) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  })
}

function requireApplyConfirmation({ apply, confirmDb, confirmHost, dbConfig }) {
  if (!apply) {
    return
  }

  if (!confirmDb && !confirmHost) {
    throw new Error('Mode --apply wajib disertai --confirm-db atau --confirm-host.')
  }

  if (confirmDb && confirmDb !== dbConfig.database) {
    throw new Error(`Konfirmasi DB tidak cocok. Diharapkan ${dbConfig.database}, diterima ${confirmDb}.`)
  }

  if (confirmHost && confirmHost !== dbConfig.host) {
    throw new Error(`Konfirmasi host tidak cocok. Diharapkan ${dbConfig.host}, diterima ${confirmHost}.`)
  }
}

async function login(baseUrl, username, password) {
  const formData = new URLSearchParams({
    username,
    password,
  })

  const response = await fetch(new URL('/api/auth/login', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    redirect: 'manual',
  })

  const cookie = response.headers.get('set-cookie')
  if (!cookie) {
    const location = response.headers.get('location')
    throw new Error(`Login gagal. Tidak ada session cookie. Location: ${location || '-'}`)
  }

  return cookie.split(';')[0]
}

async function callFlow({ baseUrl, cookie, routePath, payload }) {
  const response = await fetch(new URL(routePath, baseUrl), {
    method: 'POST',
    headers: {
      cookie,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
  }
}

async function discoverCandidates(connection, flow) {
  const flowConfig = buildFlowConfig(flow)
  const [rows] = await connection.query(flowConfig.discoverySql)
  return rows
}

function resolveOptions() {
  const args = process.argv.slice(2)
  const { envPath, env } = readEnvSource(args)
  const flow = pickArgValue(args, '--flow')
  const id = pickArgValue(args, '--id')
  const note = pickArgValue(args, '--note')
  const username = pickArgValue(args, '--username')
  const password = pickArgValue(args, '--password')
  const evidenceFile = pickArgValue(args, '--evidence-file')
  const baseUrl = pickArgValue(args, '--base-url') || 'http://127.0.0.1:3000'
  const discover = hasArg(args, '--discover')
  const apply = hasArg(args, '--apply')
  const confirmDb = pickArgValue(args, '--confirm-db')
  const confirmHost = pickArgValue(args, '--confirm-host')

  return {
    envPath,
    env,
    flow,
    id,
    note,
    username,
    password,
    evidenceFile,
    baseUrl,
    discover,
    apply,
    confirmDb,
    confirmHost,
  }
}

async function main() {
  const options = resolveOptions()
  const dbConfig = getDatabaseConfig(options.env)

  console.log(`Env source: ${options.envPath}`)
  console.log(`Target DB: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`)

  const connection = await createDbConnection(dbConfig)
  try {
    if (options.discover) {
      if (!options.flow) {
        throw new Error('Mode --discover wajib disertai --flow.')
      }
      const rows = await discoverCandidates(connection, options.flow)
      console.log(JSON.stringify({ flow: options.flow, candidates: rows }, null, 2))
      return
    }

    if (!options.flow || !options.id) {
      throw new Error('Mode proof membutuhkan --flow dan --id.')
    }

    const flowConfig = buildFlowConfig(options.flow)
    const [beforeRows] = await connection.query(flowConfig.beforeSnapshotSql, [options.id])

    if (!Array.isArray(beforeRows) || beforeRows.length === 0) {
      throw new Error(`Snapshot awal tidak ditemukan untuk flow ${options.flow} dengan id ${options.id}.`)
    }

    const proof = {
      flow: options.flow,
      id: options.id,
      baseUrl: options.baseUrl,
      target: {
        database: dbConfig.database,
        host: dbConfig.host,
        port: dbConfig.port,
      },
      requiredRoleHint: flowConfig.requiredRoleHint,
      before: beforeRows,
      apply: options.apply,
      route: flowConfig.routePath(options.id),
      payload: {
        [flowConfig.payloadKey]: options.note || '',
      },
      after: null,
      response: null,
    }

    if (!options.apply) {
      console.log(JSON.stringify(proof, null, 2))
      return
    }

    requireApplyConfirmation({
      apply: options.apply,
      confirmDb: options.confirmDb,
      confirmHost: options.confirmHost,
      dbConfig,
    })

    if (!options.note || !options.username || !options.password) {
      throw new Error('Mode --apply wajib disertai --note, --username, dan --password.')
    }

    const cookie = await login(options.baseUrl, options.username, options.password)
    const response = await callFlow({
      baseUrl: options.baseUrl,
      cookie,
      routePath: flowConfig.routePath(options.id),
      payload: {
        [flowConfig.payloadKey]: options.note,
      },
    })

    proof.response = response

    const afterValues = flowConfig.afterSnapshotValues(options.id, beforeRows)
    const [afterRows] = await connection.query(flowConfig.afterSnapshotSql, afterValues)
    proof.after = afterRows

    if (options.evidenceFile) {
      const evidencePath = path.resolve(process.cwd(), options.evidenceFile)
      fs.mkdirSync(path.dirname(evidencePath), { recursive: true })
      fs.writeFileSync(evidencePath, JSON.stringify(proof, null, 2))
      console.log(`Evidence ditulis ke ${evidencePath}`)
    }

    console.log(JSON.stringify(proof, null, 2))
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
