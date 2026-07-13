import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const NODE_BIN = process.execPath
const IS_WINDOWS = process.platform === 'win32'
const COMSPEC = process.env.ComSpec || 'cmd.exe'

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

function resolveRuntimeOptions() {
  const args = process.argv.slice(2)
  const envArg = args.find((value) => !value.startsWith('--')) || '.env'
  const envPath = path.resolve(process.cwd(), envArg)
  const portArg = pickArgValue(args, '--port')

  if (!fs.existsSync(envPath)) {
    throw new Error(`File env tidak ditemukan: ${envPath}`)
  }

  const envFile = parseEnvFile(envPath)
  const port = Number.parseInt(portArg || String(envFile.PORT ?? '3011'), 10)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Port rehearsal tidak valid: ${portArg || envFile.PORT || '(kosong)'}`)
  }

  return { envPath, envFile, port }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
      ...options,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command gagal (${code ?? 'unknown'}): ${command} ${args.join(' ')}`))
    })
  })
}

function runNpmCommand(args, options = {}) {
  if (!IS_WINDOWS) {
    return runCommand('npm', args, options)
  }

  return runCommand(COMSPEC, ['/d', '/s', '/c', `npm ${args.join(' ')}`], options)
}

async function waitForHealth(url, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      })
      if (response.ok) {
        return
      }
    } catch {
      // Server mungkin masih booting.
    }
    await wait(1_000)
  }

  throw new Error(`Server rehearsal tidak ready dalam ${timeoutMs} ms: ${url}`)
}

async function main() {
  const { envPath, envFile, port } = resolveRuntimeOptions()
  const healthUrl = `http://127.0.0.1:${port}/api/health`

  console.log(`Rehearsal production memakai env: ${envPath}`)
  console.log(`Port rehearsal: ${port}`)

  await runCommand(NODE_BIN, ['./scripts/verify-production-env.mjs', envPath])
  await runNpmCommand(['run', 'check'])
  await runNpmCommand(['run', 'test:smoke'])
  await runNpmCommand(['run', 'build'], {
    env: {
      ...process.env,
      CI: '1',
    },
  })

  const server = spawn(NODE_BIN, ['.next/standalone/server.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...envFile,
      NODE_ENV: 'production',
      PORT: String(port),
    },
  })

  let stopping = false
  const stopServer = () => {
    if (stopping) return
    stopping = true
    if (!server.killed) {
      server.kill()
    }
  }

  process.on('SIGINT', stopServer)
  process.on('SIGTERM', stopServer)

  try {
    await waitForHealth(healthUrl)
    await runCommand(NODE_BIN, ['./scripts/verify-health.mjs', healthUrl])
    console.log('\nRehearsal production selesai dengan status PASS.')
  } finally {
    stopServer()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
