import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

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

function runCommand(command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })

    return {
      ok: true,
      stdout: String(stdout ?? '').trim(),
      stderr: '',
      code: 0,
    }
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout ?? '').trim(),
      stderr: String(error?.stderr ?? error?.message ?? '').trim(),
      code: Number(error?.status ?? 1),
    }
  }
}

async function probePage(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      location: response.headers.get('location') || '',
      contentType: response.headers.get('content-type') || '',
      error: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      location: '',
      contentType: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function buildProbeSummary(label, probe) {
  if (!probe) {
    return `${label}: skipped`
  }

  return `${label}: ${probe.ok ? 'pass' : 'fail'} (status=${probe.status || '-'}${
    probe.location ? `, location=${probe.location}` : ''
  }${probe.error ? `, error=${probe.error}` : ''})`
}

async function main() {
  const args = process.argv.slice(2)
  const pm2App = pickArgValue(args, '--pm2-app') || 'perkasa-erp-web'
  const healthUrl = pickArgValue(args, '--health-url') || 'http://127.0.0.1:3000/api/health'
  const localLoginUrl = pickArgValue(args, '--local-login-url') || 'http://127.0.0.1:3000/login'
  const domain = pickArgValue(args, '--domain')
  const outputArg = pickArgValue(args, '--output')
  const skipPm2 = hasArg(args, '--skip-pm2')
  const skipHealth = hasArg(args, '--skip-health')
  const skipLocalLogin = hasArg(args, '--skip-local-login')
  const skipDomainLogin = hasArg(args, '--skip-domain-login') || !domain

  const summary = {
    timestamp: new Date().toISOString(),
    pm2App,
    healthUrl,
    domain: domain || '',
    checks: {
      pm2: {
        skipped: skipPm2,
        ok: false,
        status: 'skipped',
        output: '',
      },
      health: {
        skipped: skipHealth,
        ok: false,
        status: 'skipped',
        output: '',
      },
      localhostLogin: {
        skipped: skipLocalLogin,
        ok: false,
        status: 'skipped',
        details: null,
      },
      domainLogin: {
        skipped: skipDomainLogin,
        ok: false,
        status: 'skipped',
        details: null,
      },
    },
  }

  if (!skipPm2) {
    const pm2 = runCommand('pm2', ['status', pm2App, '--no-color'])
    const isOnline = pm2.ok && new RegExp(`\\b${pm2App}\\b`, 'i').test(pm2.stdout) && /\bonline\b/i.test(pm2.stdout)
    summary.checks.pm2 = {
      skipped: false,
      ok: isOnline,
      status: isOnline ? 'pass' : 'fail',
      output: pm2.ok ? pm2.stdout : `${pm2.stdout}\n${pm2.stderr}`.trim(),
    }
  }

  if (!skipHealth) {
    const health = runCommand(process.execPath, ['./scripts/verify-health.mjs', healthUrl])
    summary.checks.health = {
      skipped: false,
      ok: health.ok,
      status: health.ok ? 'pass' : 'fail',
      output: health.ok ? health.stdout : `${health.stdout}\n${health.stderr}`.trim(),
    }
  }

  if (!skipLocalLogin) {
    const localhostLogin = await probePage(localLoginUrl)
    summary.checks.localhostLogin = {
      skipped: false,
      ok: localhostLogin.ok,
      status: localhostLogin.ok ? 'pass' : 'fail',
      details: localhostLogin,
    }
  }

  if (!skipDomainLogin) {
    const domainLogin = await probePage(`https://${domain}/login`)
    summary.checks.domainLogin = {
      skipped: false,
      ok: domainLogin.ok,
      status: domainLogin.ok ? 'pass' : 'fail',
      details: domainLogin,
    }
  }

  if (outputArg) {
    const outputPath = path.resolve(process.cwd(), outputArg)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`)
  }

  console.log(`PM2: ${summary.checks.pm2.status}`)
  console.log(`Health: ${summary.checks.health.status}`)
  console.log(buildProbeSummary('Localhost /login', summary.checks.localhostLogin.details))
  console.log(buildProbeSummary('Domain /login', summary.checks.domainLogin.details))
  console.log(JSON.stringify(summary, null, 2))

  const blockingFailures = Object.values(summary.checks).some((check) => !check.skipped && !check.ok)
  if (blockingFailures) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
