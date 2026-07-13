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

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName],
  )
  return Array.isArray(rows) && rows.length > 0
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? '').trim() || '0', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

function buildFlowConfig(flow) {
  const flowMap = {
    assign: {
      routePath: () => '/api/inventory/odp-ports/assign',
      requiredRoleHint: 'inventory update',
      payload: (options) => ({
        odpCode: options.odpCode,
        portNo: options.portNo,
        serviceNo: options.serviceNo || '',
        customerCode: options.customerCode || '',
        notes: options.notes || '',
      }),
      requirePayload: (options) => {
        if (!options.odpCode) throw new Error('Mode --apply flow assign membutuhkan --odp.')
        if (!options.portNo) throw new Error('Mode --apply flow assign membutuhkan --port.')
      },
      discoverSql: null,
    },
    status: {
      routePath: () => '/api/inventory/odp-ports/status',
      requiredRoleHint: 'inventory update',
      payload: (options) => ({
        odpCode: options.odpCode,
        portNo: options.portNo,
        portStatus: options.portStatus,
        clearMapping: options.clearMapping,
        notes: options.notes || '',
      }),
      requirePayload: (options) => {
        if (!options.odpCode) throw new Error('Mode --apply flow status membutuhkan --odp.')
        if (!options.portNo) throw new Error('Mode --apply flow status membutuhkan --port.')
        if (!options.portStatus) throw new Error('Mode --apply flow status membutuhkan --port-status.')
      },
      discoverSql: null,
    },
  }

  const config = flowMap[flow]
  if (!config) {
    throw new Error(`Flow tidak dikenal: ${flow}`)
  }

  return config
}

async function discoverCandidates(connection, flow) {
  const hasPortStatus = await hasColumn(connection, 'network_odp_ports', 'port_status')
  const portStatusExpression = hasPortStatus ? 'port_status' : "'AVAILABLE'"

  if (flow === 'assign') {
    const [rows] = await connection.query(
      `
        SELECT
          o.code AS odpCode,
          p.port_no AS portNo,
          ${portStatusExpression} AS portStatus,
          p.subscription_id AS subscriptionId,
          p.customer_id AS customerId,
          p.updated_at AS updatedAt
        FROM network_odp_ports p
        INNER JOIN network_odp o
          ON o.id = p.odp_id
        WHERE (${portStatusExpression} IN ('AVAILABLE', 'RESERVED') OR ${portStatusExpression} IS NULL)
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT 15
      `,
    )
    return rows
  }

  const [rows] = await connection.query(
    `
      SELECT
        o.code AS odpCode,
        p.port_no AS portNo,
        ${portStatusExpression} AS portStatus,
        p.subscription_id AS subscriptionId,
        p.customer_id AS customerId,
        p.updated_at AS updatedAt
      FROM network_odp_ports p
      INNER JOIN network_odp o
        ON o.id = p.odp_id
      WHERE (${portStatusExpression} IS NOT NULL)
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT 15
    `,
  )
  return rows
}

async function getPortSnapshot(connection, odpCode, portNo) {
  const normalizedOdpCode = normalizeText(odpCode).toUpperCase()
  const portNoParsed = normalizePositiveInt(portNo)
  if (!normalizedOdpCode || !portNoParsed) return []

  const hasPortStatus = await hasColumn(connection, 'network_odp_ports', 'port_status')
  const portStatusExpression = hasPortStatus ? 'p.port_status' : "'AVAILABLE'"

  const [rows] = await connection.query(
    `
      SELECT
        o.id AS odpId,
        o.code AS odpCode,
        o.active_ports AS activePorts,
        p.id AS portId,
        p.port_no AS portNo,
        ${portStatusExpression} AS portStatus,
        p.subscription_id AS subscriptionId,
        p.customer_id AS customerId,
        p.installed_at AS installedAt,
        p.notes AS notes,
        p.updated_at AS portUpdatedAt,
        o.updated_at AS odpUpdatedAt
      FROM network_odp o
      INNER JOIN network_odp_ports p
        ON p.odp_id = o.id
      WHERE UPPER(o.code) = ?
        AND p.port_no = ?
      LIMIT 1
    `,
    [normalizedOdpCode, portNoParsed],
  )

  return Array.isArray(rows) ? rows : []
}

function resolveOptions() {
  const args = process.argv.slice(2)
  const { envPath, env } = readEnvSource(args)
  const flow = pickArgValue(args, '--flow')
  const username = pickArgValue(args, '--username')
  const password = pickArgValue(args, '--password')
  const evidenceFile = pickArgValue(args, '--evidence-file')
  const baseUrl = pickArgValue(args, '--base-url') || 'http://127.0.0.1:3000'
  const discover = hasArg(args, '--discover')
  const apply = hasArg(args, '--apply')
  const confirmDb = pickArgValue(args, '--confirm-db')
  const confirmHost = pickArgValue(args, '--confirm-host')
  const odpCode = pickArgValue(args, '--odp')
  const portNo = normalizePositiveInt(pickArgValue(args, '--port'))
  const serviceNo = pickArgValue(args, '--service-no')
  const customerCode = pickArgValue(args, '--customer-code')
  const portStatus = normalizeStatus(pickArgValue(args, '--port-status'))
  const clearMapping = hasArg(args, '--clear-mapping')
  const notes = pickArgValue(args, '--notes')

  return {
    envPath,
    env,
    flow,
    username,
    password,
    evidenceFile,
    baseUrl,
    discover,
    apply,
    confirmDb,
    confirmHost,
    odpCode,
    portNo,
    serviceNo,
    customerCode,
    portStatus,
    clearMapping,
    notes,
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

    if (!options.flow) {
      throw new Error('Mode proof membutuhkan --flow.')
    }

    const flowConfig = buildFlowConfig(options.flow)
    const beforeRows = await getPortSnapshot(connection, options.odpCode, options.portNo)

    if (!Array.isArray(beforeRows) || beforeRows.length === 0) {
      throw new Error('Snapshot awal tidak ditemukan. Pastikan --odp dan --port valid.')
    }

    const proof = {
      flow: options.flow,
      baseUrl: options.baseUrl,
      target: {
        database: dbConfig.database,
        host: dbConfig.host,
        port: dbConfig.port,
      },
      requiredRoleHint: flowConfig.requiredRoleHint,
      before: beforeRows,
      apply: options.apply,
      route: flowConfig.routePath(),
      payload: flowConfig.payload(options),
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

    if (!options.username || !options.password) {
      throw new Error('Mode --apply wajib disertai --username dan --password.')
    }

    flowConfig.requirePayload(options)

    const cookie = await login(options.baseUrl, options.username, options.password)
    const response = await callFlow({
      baseUrl: options.baseUrl,
      cookie,
      routePath: flowConfig.routePath(),
      payload: flowConfig.payload(options),
    })

    proof.response = response
    proof.after = await getPortSnapshot(connection, options.odpCode, options.portNo)

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

