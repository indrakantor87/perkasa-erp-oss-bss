import fs from 'node:fs'
import path from 'node:path'

const requiredKeys = [
  'APP_DATA_MODE',
  'AUTH_SESSION_SECRET',
  'DATABASE_URL',
]

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

function readEnvSource() {
  const target = process.argv[2]
  if (!target) {
    return { source: 'process.env', env: process.env }
  }

  const resolved = path.resolve(process.cwd(), target)
  if (!fs.existsSync(resolved)) {
    throw new Error(`File env tidak ditemukan: ${resolved}`)
  }

  return {
    source: resolved,
    env: parseEnvFile(resolved),
  }
}

function isPlaceholderSecret(secret) {
  const value = String(secret ?? '').trim().toLowerCase()
  return (
    value === '' ||
    value === 'replace-with-long-random-secret' ||
    value.includes('dev-secret') ||
    value.includes('example')
  )
}

function main() {
  const { source, env } = readEnvSource()
  const errors = []
  const warnings = []

  for (const key of requiredKeys) {
    if (!String(env[key] ?? '').trim()) {
      errors.push(`Variabel wajib belum diisi: ${key}`)
    }
  }

  if (String(env.APP_DATA_MODE ?? '').trim() !== 'review-db') {
    errors.push('APP_DATA_MODE wajib bernilai `review-db` untuk hosting production.')
  }

  if (isPlaceholderSecret(env.AUTH_SESSION_SECRET)) {
    errors.push('AUTH_SESSION_SECRET masih kosong atau memakai placeholder/development secret.')
  }

  const timeout = Number.parseInt(String(env.REVIEW_DB_CONNECT_TIMEOUT_MS ?? '3000'), 10)
  if (!Number.isFinite(timeout) || timeout < 1000) {
    warnings.push('REVIEW_DB_CONNECT_TIMEOUT_MS sebaiknya minimal 1000 ms.')
  }

  if (!String(env.PORT ?? '').trim()) {
    warnings.push('PORT belum diisi. Pastikan process manager atau reverse proxy sudah menentukannya.')
  }

  console.log(`Memeriksa env source: ${source}`)

  if (warnings.length > 0) {
    console.log('\nPeringatan:')
    for (const warning of warnings) {
      console.log(`- ${warning}`)
    }
  }

  if (errors.length > 0) {
    console.error('\nGagal validasi env production:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  console.log('\nEnv production valid untuk baseline hosting.')
}

main()
