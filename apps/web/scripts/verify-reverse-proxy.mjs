import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

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

function runShellCommand(command) {
  try {
    const stdout = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return {
      ok: true,
      code: 0,
      stdout: String(stdout ?? '').trim(),
      stderr: '',
    }
  } catch (error) {
    return {
      ok: false,
      code: Number(error?.status ?? 1),
      stdout: String(error?.stdout ?? '').trim(),
      stderr: String(error?.stderr ?? error?.message ?? '').trim(),
    }
  }
}

function extractDirectiveValue(configText, directive) {
  const match = configText.match(new RegExp(`(^|\\n)\\s*${directive}\\s+([^;]+);`, 'i'))
  return match ? match[2].trim() : ''
}

function normalizeServerNames(value) {
  return value
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function hasProxyHeader(configText, headerName, headerValuePattern = '.+') {
  const pattern = new RegExp(
    `proxy_set_header\\s+${headerName.replace(/[$]/g, '\\$&')}\\s+${headerValuePattern};`,
    'i'
  )
  return pattern.test(configText)
}

function asCheck(ok, status, details) {
  return { ok, status, details }
}

async function main() {
  const args = process.argv.slice(2)
  const configArg = pickArgValue(args, '--config') || 'docs/nginx/perkasa-erp-web.conf'
  const expectedServerName = pickArgValue(args, '--server-name')
  const expectedUpstream = pickArgValue(args, '--expected-upstream') || 'http://127.0.0.1:3000'
  const testCommand = pickArgValue(args, '--test-command') || 'nginx -t'
  const reloadCommand = pickArgValue(args, '--reload-command')
  const outputArg = pickArgValue(args, '--output')
  const skipSyntaxTest = hasArg(args, '--skip-syntax-test')
  const skipReload = hasArg(args, '--skip-reload') || !reloadCommand

  const configPath = path.resolve(process.cwd(), configArg)
  const configExists = fs.existsSync(configPath)
  const configText = configExists ? fs.readFileSync(configPath, 'utf8') : ''
  const configuredServerNames = normalizeServerNames(extractDirectiveValue(configText, 'server_name'))
  const configuredUpstream = extractDirectiveValue(configText, 'proxy_pass')

  const summary = {
    timestamp: new Date().toISOString(),
    configPath,
    expectedServerName,
    expectedUpstream,
    checks: {
      configFile: asCheck(configExists, configExists ? 'pass' : 'fail', configExists ? 'file ditemukan' : 'file tidak ditemukan'),
      serverName: asCheck(false, 'fail', ''),
      proxyPass: asCheck(false, 'fail', ''),
      forwardedHeaders: asCheck(false, 'fail', ''),
      syntaxTest: asCheck(false, skipSyntaxTest ? 'skipped' : 'fail', ''),
      reload: asCheck(false, skipReload ? 'skipped' : 'fail', ''),
    },
  }

  const serverNameOk = configExists
    && configuredServerNames.length > 0
    && (!expectedServerName || configuredServerNames.includes(expectedServerName))
  summary.checks.serverName = asCheck(
    serverNameOk,
    serverNameOk ? 'pass' : 'fail',
    configuredServerNames.length > 0
      ? `server_name: ${configuredServerNames.join(', ')}`
      : 'directive server_name tidak ditemukan'
  )

  const proxyPassOk = configExists && configuredUpstream === expectedUpstream
  summary.checks.proxyPass = asCheck(
    proxyPassOk,
    proxyPassOk ? 'pass' : 'fail',
    configuredUpstream
      ? `proxy_pass: ${configuredUpstream}`
      : 'directive proxy_pass tidak ditemukan'
  )

  const requiredHeaders = [
    hasProxyHeader(configText, 'Host', '\\$host'),
    hasProxyHeader(configText, 'X-Forwarded-Host', '\\$host'),
    hasProxyHeader(configText, 'X-Forwarded-Proto', '\\$scheme'),
    hasProxyHeader(configText, 'X-Forwarded-For', '\\$proxy_add_x_forwarded_for'),
    hasProxyHeader(configText, 'Upgrade', '\\$http_upgrade'),
    hasProxyHeader(configText, 'Connection', '"upgrade"'),
  ]
  const forwardedHeadersOk = configExists && requiredHeaders.every(Boolean)
  summary.checks.forwardedHeaders = asCheck(
    forwardedHeadersOk,
    forwardedHeadersOk ? 'pass' : 'fail',
    forwardedHeadersOk
      ? 'header proxy inti tersedia'
      : 'ada header proxy inti yang belum ditemukan'
  )

  if (!skipSyntaxTest) {
    const syntaxTest = runShellCommand(testCommand)
    summary.checks.syntaxTest = asCheck(
      syntaxTest.ok,
      syntaxTest.ok ? 'pass' : 'fail',
      syntaxTest.ok ? syntaxTest.stdout : `${syntaxTest.stdout}\n${syntaxTest.stderr}`.trim()
    )
  }

  if (!skipReload) {
    const reload = runShellCommand(reloadCommand)
    summary.checks.reload = asCheck(
      reload.ok,
      reload.ok ? 'pass' : 'fail',
      reload.ok ? reload.stdout : `${reload.stdout}\n${reload.stderr}`.trim()
    )
  }

  if (outputArg) {
    const outputPath = path.resolve(process.cwd(), outputArg)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`)
  }

  console.log(`Config file: ${summary.checks.configFile.status}`)
  console.log(`Server name: ${summary.checks.serverName.status}`)
  console.log(`Proxy pass: ${summary.checks.proxyPass.status}`)
  console.log(`Forwarded headers: ${summary.checks.forwardedHeaders.status}`)
  console.log(`Nginx syntax test: ${summary.checks.syntaxTest.status}`)
  console.log(`Nginx reload: ${summary.checks.reload.status}`)
  console.log(JSON.stringify(summary, null, 2))

  const blockingFailures = Object.values(summary.checks).some(
    (check) => check.status !== 'skipped' && !check.ok
  )
  if (blockingFailures) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
