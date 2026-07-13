import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
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

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

function resolvePassword({ passwordArg, passwordEnvKey, env }) {
  if (passwordArg) {
    return passwordArg
  }

  if (passwordEnvKey) {
    return String(env[passwordEnvKey] ?? process.env[passwordEnvKey] ?? '').trim()
  }

  return ''
}

async function main() {
  const args = process.argv.slice(2)
  const apply = hasArg(args, '--apply')
  const username = pickArgValue(args, '--username').toLowerCase()
  const passwordArg = pickArgValue(args, '--password')
  const passwordEnvKey = pickArgValue(args, '--password-env-key')
  const confirmDb = pickArgValue(args, '--confirm-db')
  const confirmHost = pickArgValue(args, '--confirm-host')
  const evidenceArg = pickArgValue(args, '--evidence-file')

  if (!username) {
    throw new Error('Parameter --username wajib diisi.')
  }

  const { envPath, env } = readEnvSource(args)
  const dbConfig = getDatabaseConfig(env)
  const password = resolvePassword({ passwordArg, passwordEnvKey, env })

  if (!password) {
    throw new Error('Parameter --password atau --password-env-key wajib diisi.')
  }

  requireApplyConfirmation({ apply, confirmDb, confirmHost, dbConfig })

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  })

  try {
    const [beforeRows] = await connection.query(
      `
        SELECT
          au.id,
          au.username,
          au.full_name AS fullName,
          au.status,
          ar.code AS roleCode
        FROM auth_users au
        JOIN auth_roles ar
          ON ar.id = au.role_id
        WHERE LOWER(au.username) = ?
        LIMIT 1
      `,
      [username]
    )

    const before = Array.isArray(beforeRows) ? beforeRows[0] ?? null : null
    if (!before) {
      throw new Error(`User review DB tidak ditemukan: ${username}`)
    }

    const evidence = {
      envPath,
      database: dbConfig.database,
      host: dbConfig.host,
      apply,
      username,
      passwordSource: passwordArg ? 'cli' : passwordEnvKey ? `env:${passwordEnvKey}` : 'unknown',
      roleCode: before.roleCode,
      before: {
        id: before.id,
        username: before.username,
        fullName: before.fullName,
        status: before.status,
      },
      after: null,
      passwordHash: '[redacted]',
      timestamp: new Date().toISOString(),
    }

    if (apply) {
      await connection.execute(
        `
          UPDATE auth_users
          SET password_hash = ?,
              updated_at = NOW()
          WHERE id = ?
        `,
        [hashPassword(password), before.id]
      )

      const [afterRows] = await connection.query(
        `
          SELECT
            au.id,
            au.username,
            au.full_name AS fullName,
            au.status,
            ar.code AS roleCode
          FROM auth_users au
          JOIN auth_roles ar
            ON ar.id = au.role_id
          WHERE au.id = ?
          LIMIT 1
        `,
        [before.id]
      )

      evidence.after = Array.isArray(afterRows) ? afterRows[0] ?? null : null
    }

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
  console.error(`[reset-review-auth-password] ${error.message}`)
  process.exitCode = 1
})
