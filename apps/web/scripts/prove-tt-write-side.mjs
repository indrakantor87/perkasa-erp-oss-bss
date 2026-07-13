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

async function hasTable(connection, tableName) {
  const [rows] = await connection.query('SHOW TABLES LIKE ?', [tableName])
  return Array.isArray(rows) && rows.length > 0
}

function normalizeTicketCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function buildFlowConfig(flow) {
  const flowMap = {
    progress: {
      routePath: (ticketCode) => `/api/support/trouble-tickets/${encodeURIComponent(ticketCode)}/progress`,
      requiredRoleHint: 'support update',
      payload: (options) => ({
        progressStatus: options.progressStatus,
        ownerName: options.ownerName,
        progressNotes: options.progressNotes,
        followUpAt: options.followUpAt || '',
      }),
      requirePayload: (options) => {
        if (!options.progressStatus) throw new Error('Mode --apply flow progress membutuhkan --progress-status.')
        if (!options.ownerName) throw new Error('Mode --apply flow progress membutuhkan --owner-name.')
        if (!options.progressNotes) throw new Error('Mode --apply flow progress membutuhkan --progress-notes.')
      },
      discoverSql: `
        SELECT
          ticket_code AS ticketCode,
          customer_name AS customerName,
          status,
          closed_at AS closedAt,
          updated_at AS updatedAt
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CLOSE')
        ORDER BY updated_at DESC
        LIMIT 10
      `,
    },
    escalate: {
      routePath: (ticketCode) => `/api/support/trouble-tickets/${encodeURIComponent(ticketCode)}/escalate`,
      requiredRoleHint: 'support update',
      payload: (options) => ({
        escalationTarget: options.escalationTarget,
        escalationLevel: options.escalationLevel,
        escalationReason: options.escalationReason,
      }),
      requirePayload: (options) => {
        if (!options.escalationTarget) throw new Error('Mode --apply flow escalate membutuhkan --escalation-target.')
        if (!options.escalationLevel) throw new Error('Mode --apply flow escalate membutuhkan --escalation-level.')
        if (!options.escalationReason) throw new Error('Mode --apply flow escalate membutuhkan --escalation-reason.')
      },
      discoverSql: `
        SELECT
          ticket_code AS ticketCode,
          customer_name AS customerName,
          type AS ticketType,
          status,
          closed_at AS closedAt,
          opened_at AS openedAt
        FROM support_trouble_tickets
        WHERE closed_at IS NULL
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') NOT IN ('CLOSED', 'CLOSE')
        ORDER BY opened_at DESC
        LIMIT 10
      `,
    },
    close: {
      routePath: (ticketCode) => `/api/support/trouble-tickets/${encodeURIComponent(ticketCode)}/close`,
      requiredRoleHint: 'support update',
      payload: (options) => ({
        resolutionAction: options.resolutionAction,
        closeNotes: options.closeNotes,
      }),
      requirePayload: (options) => {
        if (!options.resolutionAction) throw new Error('Mode --apply flow close membutuhkan --resolution-action.')
        if (!options.closeNotes) throw new Error('Mode --apply flow close membutuhkan --close-notes.')
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
  const config = buildFlowConfig(flow)
  if (flow === 'close') {
    const hasProgressLogs = await hasTable(connection, 'support_trouble_ticket_progress_logs')
    if (!hasProgressLogs) {
      const [rows] = await connection.query(
        `
          SELECT
            ticket_code AS ticketCode,
            customer_name AS customerName,
            status,
            closed_at AS closedAt,
            updated_at AS updatedAt
          FROM support_trouble_tickets
          WHERE closed_at IS NULL
            AND COALESCE(UPPER(TRIM(status)), 'OPEN') IN ('ON_PROGRESS', 'FOLLOW_UP')
          ORDER BY updated_at DESC
          LIMIT 10
        `,
      )
      return rows
    }

    const [rows] = await connection.query(
      `
        SELECT
          stt.ticket_code AS ticketCode,
          stt.customer_name AS customerName,
          stt.status,
          stt.closed_at AS closedAt,
          stt.updated_at AS updatedAt,
          pl.progress_status AS latestProgressStatus
        FROM support_trouble_tickets stt
        LEFT JOIN (
          SELECT p1.trouble_ticket_id, p1.progress_status
          FROM support_trouble_ticket_progress_logs p1
          INNER JOIN (
            SELECT trouble_ticket_id, MAX(id) AS max_id
            FROM support_trouble_ticket_progress_logs
            GROUP BY trouble_ticket_id
          ) p2
            ON p2.trouble_ticket_id = p1.trouble_ticket_id
            AND p2.max_id = p1.id
        ) pl
          ON pl.trouble_ticket_id = stt.id
        WHERE stt.closed_at IS NULL
          AND COALESCE(UPPER(TRIM(stt.status)), 'OPEN') NOT IN ('CLOSED', 'CLOSE')
          AND COALESCE(UPPER(TRIM(pl.progress_status)), UPPER(TRIM(stt.status)), '') IN ('ON_PROGRESS', 'FOLLOW_UP')
        ORDER BY stt.updated_at DESC
        LIMIT 10
      `,
    )
    return rows
  }

  const [rows] = await connection.query(config.discoverSql)
  return rows
}

async function getTicketSnapshot(connection, ticketCode) {
  const normalizedTicketCode = normalizeTicketCode(ticketCode)
  const hasProgressLogs = await hasTable(connection, 'support_trouble_ticket_progress_logs')
  const hasEscalationLogs = await hasTable(connection, 'support_trouble_ticket_escalation_logs')

  const [ticketRows] = await connection.query(
    `
      SELECT
        id,
        ticket_code AS ticketCode,
        customer_name AS customerName,
        type AS ticketType,
        status,
        notes,
        resolution_action AS resolutionAction,
        close_notes AS closeNotes,
        opened_at AS openedAt,
        closed_at AS closedAt,
        updated_at AS updatedAt
      FROM support_trouble_tickets
      WHERE UPPER(ticket_code) = ?
      LIMIT 1
    `,
    [normalizedTicketCode],
  )

  const ticket = Array.isArray(ticketRows) ? ticketRows[0] : null
  if (!ticket) {
    return []
  }

  const snapshot = { ...ticket }

  if (hasProgressLogs) {
    const [progressRows] = await connection.query(
      `
        SELECT
          progress_status AS progressStatus,
          owner_name AS ownerName,
          progress_notes AS progressNotes,
          follow_up_at AS followUpAt,
          updated_by AS updatedBy,
          updated_at AS updatedAt
        FROM support_trouble_ticket_progress_logs
        WHERE trouble_ticket_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [ticket.id],
    )
    snapshot.latestProgressLog = Array.isArray(progressRows) ? (progressRows[0] ?? null) : null
  } else {
    snapshot.latestProgressLog = null
  }

  if (hasEscalationLogs) {
    const [escalationRows] = await connection.query(
      `
        SELECT
          escalation_target AS escalationTarget,
          escalation_level AS escalationLevel,
          escalation_reason AS escalationReason,
          escalated_by AS escalatedBy,
          escalated_at AS escalatedAt
        FROM support_trouble_ticket_escalation_logs
        WHERE trouble_ticket_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [ticket.id],
    )
    snapshot.latestEscalationLog = Array.isArray(escalationRows) ? (escalationRows[0] ?? null) : null
  } else {
    snapshot.latestEscalationLog = null
  }

  return [snapshot]
}

function resolveOptions() {
  const args = process.argv.slice(2)
  const { envPath, env } = readEnvSource(args)
  const flow = pickArgValue(args, '--flow')
  const ticketCode = pickArgValue(args, '--ticket') || pickArgValue(args, '--ticket-code')
  const username =
    pickArgValue(args, '--username') ||
    String(env.PROOF_USERNAME ?? process.env.PROOF_USERNAME ?? '').trim()
  const password =
    pickArgValue(args, '--password') ||
    String(env.PROOF_PASSWORD ?? process.env.PROOF_PASSWORD ?? '').trim()
  const evidenceFile = pickArgValue(args, '--evidence-file')
  const baseUrl = pickArgValue(args, '--base-url') || 'http://127.0.0.1:3000'
  const discover = hasArg(args, '--discover')
  const apply = hasArg(args, '--apply')
  const confirmDb = pickArgValue(args, '--confirm-db')
  const confirmHost = pickArgValue(args, '--confirm-host')
  const progressStatus = pickArgValue(args, '--progress-status')
  const ownerName = pickArgValue(args, '--owner-name')
  const progressNotes = pickArgValue(args, '--progress-notes')
  const followUpAt = pickArgValue(args, '--follow-up-at')
  const escalationTarget = pickArgValue(args, '--escalation-target')
  const escalationLevel = pickArgValue(args, '--escalation-level')
  const escalationReason = pickArgValue(args, '--escalation-reason')
  const resolutionAction = pickArgValue(args, '--resolution-action')
  const closeNotes = pickArgValue(args, '--close-notes')

  return {
    envPath,
    env,
    flow,
    ticketCode,
    username,
    password,
    evidenceFile,
    baseUrl,
    discover,
    apply,
    confirmDb,
    confirmHost,
    progressStatus,
    ownerName,
    progressNotes,
    followUpAt,
    escalationTarget,
    escalationLevel,
    escalationReason,
    resolutionAction,
    closeNotes,
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

    if (!options.flow || !options.ticketCode) {
      throw new Error('Mode proof membutuhkan --flow dan --ticket.')
    }

    const ticketCode = normalizeTicketCode(options.ticketCode)
    const flowConfig = buildFlowConfig(options.flow)
    const beforeRows = await getTicketSnapshot(connection, ticketCode)

    if (!Array.isArray(beforeRows) || beforeRows.length === 0) {
      throw new Error(`Snapshot awal tidak ditemukan untuk trouble ticket ${ticketCode}.`)
    }

    const proof = {
      flow: options.flow,
      ticketCode,
      baseUrl: options.baseUrl,
      target: {
        database: dbConfig.database,
        host: dbConfig.host,
        port: dbConfig.port,
      },
      requiredRoleHint: flowConfig.requiredRoleHint,
      before: beforeRows,
      apply: options.apply,
      route: flowConfig.routePath(ticketCode),
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
      throw new Error('Mode --apply wajib disertai credential login. Isi --username/--password atau set PROOF_USERNAME/PROOF_PASSWORD pada env.')
    }

    flowConfig.requirePayload(options)

    const cookie = await login(options.baseUrl, options.username, options.password)
    const response = await callFlow({
      baseUrl: options.baseUrl,
      cookie,
      routePath: flowConfig.routePath(ticketCode),
      payload: flowConfig.payload(options),
    })

    proof.response = response
    proof.after = await getTicketSnapshot(connection, ticketCode)

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
