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
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
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

async function callJson({ baseUrl, cookie, routePath, method, payload }) {
  const response = await fetch(new URL(routePath, baseUrl), {
    method,
    headers: {
      cookie,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
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

async function createDbConnection(config) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  })
}

async function getActivityByTitle(connection, username, taskTitle) {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        activity_code AS activityCode,
        planned_username AS plannedUsername,
        planned_by AS plannedBy,
        division_name AS divisionName,
        subdivision_name AS subdivisionName,
        task_title AS taskTitle,
        execution_status AS executionStatus,
        approval_status AS approvalStatus,
        approval_notes AS approvalNotes,
        close_notes AS closeNotes,
        pending_reason AS pendingReason,
        follow_up_action AS followUpAction
      FROM daily_activity_items
      WHERE planned_username = ?
        AND task_title = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [username, taskTitle]
  )

  return Array.isArray(rows) ? rows[0] ?? null : null
}

function buildTodayIsoDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

async function main() {
  const args = process.argv.slice(2)
  const apply = hasArg(args, '--apply')
  const username = pickArgValue(args, '--username')
  const password = pickArgValue(args, '--password')
  const baseUrl = pickArgValue(args, '--base-url') || 'http://127.0.0.1:3000'
  const confirmDb = pickArgValue(args, '--confirm-db')
  const confirmHost = pickArgValue(args, '--confirm-host')
  const evidenceArg = pickArgValue(args, '--evidence-file')
  const prefix = pickArgValue(args, '--title-prefix') || 'Supervisor Proof'

  if (!username) {
    throw new Error('Parameter --username wajib diisi.')
  }
  if (!password) {
    throw new Error('Parameter --password wajib diisi.')
  }

  const { envPath, env } = readEnvSource(args)
  const dbConfig = getDatabaseConfig(env)
  requireApplyConfirmation({ apply, confirmDb, confirmHost, dbConfig })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const today = buildTodayIsoDate()
  const pendingTitle = `${prefix} Pending ${timestamp}`
  const rejectedTitle = `${prefix} Rejected ${timestamp}`

  const evidence = {
    envPath,
    target: {
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
      baseUrl,
    },
    apply,
    actor: username,
    pendingTitle,
    rejectedTitle,
    pendingItem: {
      created: null,
      closed: null,
      final: null,
    },
    rejectedItem: {
      created: null,
      closed: null,
      rejected: null,
      final: null,
    },
    timestamp: new Date().toISOString(),
  }

  const connection = await createDbConnection(dbConfig)
  try {
    if (!apply) {
      console.log(JSON.stringify(evidence, null, 2))
      return
    }

    const cookie = await login(baseUrl, username, password)

    evidence.pendingItem.created = await callJson({
      baseUrl,
      cookie,
      routePath: '/api/daily-activities',
      method: 'POST',
      payload: {
        activityDate: today,
        planningLevel: 'SPV',
        divisionName: 'CS',
        subdivisionName: 'Admin CS',
        taskTitle: pendingTitle,
        taskDetail: 'Proof lokal queue approval supervisor CS.',
        successMetric: 'Queue approval supervisor terisi satu item yang bisa dibaca.',
        priorityLevel: 'HIGH',
      },
    })

    evidence.rejectedItem.created = await callJson({
      baseUrl,
      cookie,
      routePath: '/api/daily-activities',
      method: 'POST',
      payload: {
        activityDate: today,
        planningLevel: 'SPV',
        divisionName: 'CS',
        subdivisionName: 'Admin CS',
        taskTitle: rejectedTitle,
        taskDetail: 'Proof lokal queue koreksi supervisor CS.',
        successMetric: 'Queue koreksi supervisor terisi satu item yang bisa dibaca.',
        priorityLevel: 'MEDIUM',
      },
    })

    const pendingRow = await getActivityByTitle(connection, username, pendingTitle)
    const rejectedRow = await getActivityByTitle(connection, username, rejectedTitle)

    if (!pendingRow || !rejectedRow) {
      throw new Error('Daily activity proof tidak ditemukan setelah create.')
    }

    evidence.pendingItem.closed = await callJson({
      baseUrl,
      cookie,
      routePath: '/api/daily-activities/status',
      method: 'PATCH',
      payload: {
        activityId: pendingRow.id,
        executionStatus: 'PENDING',
        pendingReason: 'Menunggu validasi supervisor untuk bukti lokal.',
        followUpAction: 'Review lalu approve agar queue approval tervalidasi.',
      },
    })

    evidence.rejectedItem.closed = await callJson({
      baseUrl,
      cookie,
      routePath: '/api/daily-activities/status',
      method: 'PATCH',
      payload: {
        activityId: rejectedRow.id,
        executionStatus: 'DONE',
        closeNotes: 'Aktivitas selesai dan siap direview supervisor untuk proof lokal.',
      },
    })

    evidence.rejectedItem.rejected = await callJson({
      baseUrl,
      cookie,
      routePath: '/api/daily-activities/approval',
      method: 'PATCH',
      payload: {
        activityId: rejectedRow.id,
        decision: 'REJECTED',
        approvalNotes: 'Perlu perjelas hasil eksekusi sebelum disetujui supervisor.',
      },
    })

    evidence.pendingItem.final = await getActivityByTitle(connection, username, pendingTitle)
    evidence.rejectedItem.final = await getActivityByTitle(connection, username, rejectedTitle)

    if (evidenceArg) {
      const evidencePath = path.resolve(process.cwd(), evidenceArg)
      fs.mkdirSync(path.dirname(evidencePath), { recursive: true })
      fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2))
    }

    console.log(JSON.stringify(evidence, null, 2))
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(`[prove-cs-admin-supervisor-flow] ${error.message}`)
  process.exitCode = 1
})
