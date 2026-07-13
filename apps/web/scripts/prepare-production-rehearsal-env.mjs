import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

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

function resolveOptions() {
  const args = process.argv.slice(2)
  const sourceArg = pickArgValue(args, '--source') || '.env'
  const targetArg = pickArgValue(args, '--target') || '.env.rehearsal.local'
  const portArg = pickArgValue(args, '--port') || '3011'
  const sessionSecretArg = pickArgValue(args, '--session-secret')

  const sourcePath = path.resolve(process.cwd(), sourceArg)
  const targetPath = path.resolve(process.cwd(), targetArg)

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`File source env tidak ditemukan: ${sourcePath}`)
  }

  const port = Number.parseInt(portArg, 10)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Port rehearsal tidak valid: ${portArg}`)
  }

  return {
    sourcePath,
    targetPath,
    port,
    sessionSecret: sessionSecretArg || randomBytes(32).toString('hex'),
  }
}

function main() {
  const options = resolveOptions()
  const sourceEnv = parseEnvFile(options.sourcePath)

  const databaseUrl = String(sourceEnv.DATABASE_URL ?? '').trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum tersedia pada source env.')
  }

  const reviewTimeout = String(sourceEnv.REVIEW_DB_CONNECT_TIMEOUT_MS ?? '3000').trim() || '3000'

  const lines = [
    '# File rehearsal production lokal. Jangan commit file ini.',
    `# Dibuat otomatis dari ${path.basename(options.sourcePath)}.`,
    'APP_DATA_MODE=review-db',
    `AUTH_SESSION_SECRET=${options.sessionSecret}`,
    `DATABASE_URL=${databaseUrl}`,
    `REVIEW_DB_CONNECT_TIMEOUT_MS=${reviewTimeout}`,
    `PORT=${options.port}`,
    'BOOTSTRAP_MOCK_AUTH_CREDENTIALS=',
  ]

  fs.writeFileSync(options.targetPath, `${lines.join('\n')}\n`)

  console.log(`Source env: ${options.sourcePath}`)
  console.log(`Target rehearsal env: ${options.targetPath}`)
  console.log(`Port rehearsal: ${options.port}`)
  console.log('AUTH_SESSION_SECRET: [generated]')
}

main()
