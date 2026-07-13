import { execFileSync } from 'node:child_process'
import path from 'node:path'

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

function appendArg(target, key, value) {
  if (value === '') return
  target.push(key, value)
}

function appendFlag(target, enabled, flag) {
  if (enabled) {
    target.push(flag)
  }
}

function buildOutputPath(outputDir, defaultName, explicitPath, stamp) {
  if (explicitPath) return explicitPath
  const stampedName = stamp ? defaultName.replace(/(\.[^.]+)$/, `.${stamp}$1`) : defaultName
  return path.posix.join(outputDir, stampedName)
}

function runNodeScript(scriptPath, scriptArgs) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...scriptArgs], {
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

function printStepResult(label, result) {
  console.log(`\n=== ${label} ===`)
  console.log(`status: ${result.ok ? 'pass' : 'fail'} (exit=${result.code})`)
  if (result.stdout) {
    console.log(result.stdout)
  }
  if (result.stderr) {
    console.log(result.stderr)
  }
}

async function main() {
  const args = process.argv.slice(2)

  const type = pickArgValue(args, '--type') || 'rehearsal'
  const server = pickArgValue(args, '--server') || 'localhost'
  const domain = pickArgValue(args, '--domain')
  const rollbackCommit = pickArgValue(args, '--rollback-commit') || '................'
  const pm2App = pickArgValue(args, '--pm2-app') || 'perkasa-erp-web'
  const healthUrl = pickArgValue(args, '--health-url') || 'http://127.0.0.1:3000/api/health'

  const reverseProxyConfig = pickArgValue(args, '--reverse-proxy-config') || 'docs/nginx/perkasa-erp-web.conf'
  const reverseProxyServerName = pickArgValue(args, '--reverse-proxy-server-name') || domain
  const reverseProxyUpstream = pickArgValue(args, '--reverse-proxy-upstream') || 'http://127.0.0.1:3000'
  const reverseProxyTestCommand = pickArgValue(args, '--reverse-proxy-test-command') || 'nginx -t'
  const reverseProxyReloadCommand = pickArgValue(args, '--reverse-proxy-reload-command')
  const outputDir = pickArgValue(args, '--output-dir') || 'docs'
  const stamp = pickArgValue(args, '--stamp')
  const reverseProxyOutput = buildOutputPath(
    outputDir,
    'web-reverse-proxy-check.json',
    pickArgValue(args, '--reverse-proxy-output'),
    stamp
  )

  const runtimeOutput = buildOutputPath(
    outputDir,
    'web-server-runtime-check.json',
    pickArgValue(args, '--runtime-output'),
    stamp
  )
  const runtimeReportOutput = buildOutputPath(
    outputDir,
    'web-server-runtime-report.md',
    pickArgValue(args, '--runtime-report-output'),
    stamp
  )
  const evidenceOutput = buildOutputPath(
    outputDir,
    'web-go-live-evidence-generated.md',
    pickArgValue(args, '--evidence-output'),
    stamp
  )

  const skipSyntaxTest = hasArg(args, '--skip-syntax-test')
  const skipReload = hasArg(args, '--skip-reload')
  const skipPm2 = hasArg(args, '--skip-pm2')
  const skipHealth = hasArg(args, '--skip-health')
  const skipLocalLogin = hasArg(args, '--skip-local-login')
  const skipDomainLogin = hasArg(args, '--skip-domain-login')

  const reverseProxyArgs = []
  appendArg(reverseProxyArgs, '--config', reverseProxyConfig)
  appendArg(reverseProxyArgs, '--server-name', reverseProxyServerName)
  appendArg(reverseProxyArgs, '--expected-upstream', reverseProxyUpstream)
  appendArg(reverseProxyArgs, '--test-command', reverseProxyTestCommand)
  appendArg(reverseProxyArgs, '--reload-command', reverseProxyReloadCommand)
  appendArg(reverseProxyArgs, '--output', reverseProxyOutput)
  appendFlag(reverseProxyArgs, skipSyntaxTest, '--skip-syntax-test')
  appendFlag(reverseProxyArgs, skipReload, '--skip-reload')

  const runtimeArgs = []
  appendArg(runtimeArgs, '--pm2-app', pm2App)
  appendArg(runtimeArgs, '--health-url', healthUrl)
  appendArg(runtimeArgs, '--domain', domain)
  appendArg(runtimeArgs, '--output', runtimeOutput)
  appendFlag(runtimeArgs, skipPm2, '--skip-pm2')
  appendFlag(runtimeArgs, skipHealth, '--skip-health')
  appendFlag(runtimeArgs, skipLocalLogin, '--skip-local-login')
  appendFlag(runtimeArgs, skipDomainLogin, '--skip-domain-login')

  const runtimeReportArgs = ['--input', runtimeOutput, '--output', runtimeReportOutput]

  const evidenceArgs = []
  appendArg(evidenceArgs, '--type', type)
  appendArg(evidenceArgs, '--server', server)
  appendArg(evidenceArgs, '--domain', domain)
  appendArg(evidenceArgs, '--health-url', healthUrl)
  appendArg(evidenceArgs, '--rollback-commit', rollbackCommit)
  appendArg(evidenceArgs, '--pm2-app', pm2App)
  appendArg(evidenceArgs, '--reverse-proxy-json', reverseProxyOutput)
  appendArg(evidenceArgs, '--runtime-json', runtimeOutput)
  appendArg(evidenceArgs, '--output', evidenceOutput)
  appendFlag(evidenceArgs, skipPm2, '--skip-pm2')
  appendFlag(evidenceArgs, skipHealth, '--skip-health')
  appendFlag(evidenceArgs, skipLocalLogin, '--skip-local-login')
  appendFlag(evidenceArgs, skipDomainLogin, '--skip-domain-login')

  const reverseProxyResult = runNodeScript('./scripts/verify-reverse-proxy.mjs', reverseProxyArgs)
  printStepResult('verify:reverse-proxy', reverseProxyResult)

  const runtimeResult = runNodeScript('./scripts/verify-server-runtime.mjs', runtimeArgs)
  printStepResult('verify:server-runtime', runtimeResult)

  const runtimeReportResult = runNodeScript('./scripts/render-server-runtime-report.mjs', runtimeReportArgs)
  printStepResult('render:server-runtime-report', runtimeReportResult)

  const evidenceResult = runNodeScript('./scripts/collect-go-live-evidence.mjs', evidenceArgs)
  printStepResult('collect:go-live-evidence', evidenceResult)

  console.log('\n=== output files ===')
  console.log(`reverse proxy json: ${reverseProxyOutput}`)
  console.log(`runtime json: ${runtimeOutput}`)
  console.log(`runtime report: ${runtimeReportOutput}`)
  console.log(`evidence markdown: ${evidenceOutput}`)

  if (!reverseProxyResult.ok || !runtimeResult.ok || !runtimeReportResult.ok || !evidenceResult.ok) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
