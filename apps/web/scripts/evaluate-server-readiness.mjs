import fs from 'node:fs'
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

function buildOutputPath(outputDir, defaultName, explicitPath, stamp) {
  if (explicitPath) return explicitPath
  const stampedName = stamp ? defaultName.replace(/(\.[^.]+)$/, `.${stamp}$1`) : defaultName
  return path.posix.join(outputDir, stampedName)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function resolveArtifact(baseDir, defaultName, explicitPath, stamp) {
  const relativePath = buildOutputPath(baseDir, defaultName, explicitPath, stamp)
  const absolutePath = path.resolve(process.cwd(), relativePath)
  const exists = fs.existsSync(absolutePath)
  return { relativePath, absolutePath, exists }
}

function checkLabel(check) {
  if (!check) return 'missing'
  return check.status || (check.ok ? 'pass' : 'fail')
}

function everyCheckPass(checks) {
  return Object.values(checks).every((check) => check?.status === 'pass')
}

function anyCheckFail(checks, names) {
  return names.some((name) => {
    const check = checks?.[name]
    return check && check.status !== 'skipped' && !check.ok
  })
}

function anyCheckSkipped(checks, names) {
  return names.some((name) => checks?.[name]?.status === 'skipped')
}

function summarizeReverseProxy(checks) {
  if (!checks) return 'artefak reverse proxy belum ada'
  return [
    `config ${checkLabel(checks.configFile)}`,
    `server_name ${checkLabel(checks.serverName)}`,
    `proxy_pass ${checkLabel(checks.proxyPass)}`,
    `headers ${checkLabel(checks.forwardedHeaders)}`,
    `syntax ${checkLabel(checks.syntaxTest)}`,
    `reload ${checkLabel(checks.reload)}`,
  ].join(', ')
}

function summarizeRuntime(checks) {
  if (!checks) return 'artefak runtime belum ada'
  return [
    `PM2 ${checkLabel(checks.pm2)}`,
    `health ${checkLabel(checks.health)}`,
    `localhost ${checkLabel(checks.localhostLogin)}`,
    `domain ${checkLabel(checks.domainLogin)}`,
  ].join(', ')
}

function buildDecision(summary) {
  const reasons = []
  const warnings = []

  if (!summary.artifacts.reverseProxyJson.exists) reasons.push('JSON reverse proxy belum tersedia')
  if (!summary.artifacts.runtimeJson.exists) reasons.push('JSON runtime belum tersedia')
  if (!summary.artifacts.runtimeReport.exists) warnings.push('report markdown runtime belum tersedia')
  if (!summary.artifacts.evidenceMarkdown.exists) warnings.push('evidence markdown belum tersedia')

  const reverseProxyChecks = summary.reverseProxy?.checks ?? null
  const runtimeChecks = summary.runtime?.checks ?? null

  if (reverseProxyChecks) {
    if (anyCheckFail(reverseProxyChecks, ['configFile', 'serverName', 'proxyPass', 'forwardedHeaders', 'syntaxTest', 'reload'])) {
      reasons.push('reverse proxy memiliki check gagal')
    }
    if (anyCheckSkipped(reverseProxyChecks, ['syntaxTest', 'reload'])) {
      warnings.push('syntax test atau reload reverse proxy masih dilewati')
    }
  }

  if (runtimeChecks) {
    if (anyCheckFail(runtimeChecks, ['pm2', 'health', 'localhostLogin', 'domainLogin'])) {
      reasons.push('runtime server memiliki check gagal')
    }
    if (anyCheckSkipped(runtimeChecks, ['pm2', 'health', 'localhostLogin', 'domainLogin'])) {
      warnings.push('masih ada check runtime yang dilewati')
    }
  }

  const allArtifactsReady = Object.values(summary.artifacts).every((artifact) => artifact.exists)
  const reverseProxyReady = reverseProxyChecks ? everyCheckPass(reverseProxyChecks) : false
  const runtimeReady = runtimeChecks ? everyCheckPass(runtimeChecks) : false

  let decision = 'partial'
  if (reasons.length > 0) {
    decision = 'rollback-recommended'
  } else if (allArtifactsReady && reverseProxyReady && runtimeReady && warnings.length === 0) {
    decision = 'ready'
  }

  return { decision, reasons, warnings }
}

function buildMarkdown(summary) {
  const lines = [
    '# Keputusan Teknis Server',
    '',
    'Dokumen ini dihasilkan dari `npm run evaluate:server-readiness` untuk membantu PIC deploy membaca status teknis sebelum sign-off bisnis.',
    '',
    '## Metadata',
    '',
    '| Item | Isi |',
    '|---|---|',
    `| timestamp evaluasi | \`${summary.timestamp}\` |`,
    `| direktori artefak | \`${summary.proofDir}\` |`,
    `| stamp | \`${summary.stamp || '-'}\` |`,
    `| keputusan teknis | \`${summary.decision.decision}\` |`,
    '',
    '## Ringkasan Artefak',
    '',
    '| Artefak | Status | Path |',
    '|---|---|---|',
    `| reverse proxy JSON | \`${summary.artifacts.reverseProxyJson.exists ? 'ada' : 'tidak ada'}\` | \`${summary.artifacts.reverseProxyJson.relativePath}\` |`,
    `| runtime JSON | \`${summary.artifacts.runtimeJson.exists ? 'ada' : 'tidak ada'}\` | \`${summary.artifacts.runtimeJson.relativePath}\` |`,
    `| runtime report | \`${summary.artifacts.runtimeReport.exists ? 'ada' : 'tidak ada'}\` | \`${summary.artifacts.runtimeReport.relativePath}\` |`,
    `| evidence markdown | \`${summary.artifacts.evidenceMarkdown.exists ? 'ada' : 'tidak ada'}\` | \`${summary.artifacts.evidenceMarkdown.relativePath}\` |`,
    '',
    '## Ringkasan Teknis',
    '',
    '| Area | Status | Catatan |',
    '|---|---|---|',
    `| reverse proxy | \`${summary.reverseProxy ? (everyCheckPass(summary.reverseProxy.checks) ? 'pass' : 'partial/fail') : 'missing'}\` | ${summarizeReverseProxy(summary.reverseProxy?.checks)} |`,
    `| runtime | \`${summary.runtime ? (everyCheckPass(summary.runtime.checks) ? 'pass' : 'partial/fail') : 'missing'}\` | ${summarizeRuntime(summary.runtime?.checks)} |`,
    '',
    '## Alasan Keputusan',
    '',
  ]

  if (summary.decision.reasons.length === 0) {
    lines.push('- Tidak ada kegagalan kritis yang terdeteksi.')
  } else {
    for (const reason of summary.decision.reasons) {
      lines.push(`- ${reason}`)
    }
  }

  lines.push('', '## Warning')

  if (summary.decision.warnings.length === 0) {
    lines.push('- Tidak ada warning tambahan.')
  } else {
    for (const warning of summary.decision.warnings) {
      lines.push(`- ${warning}`)
    }
  }

  lines.push(
    '',
    '## Tindak Lanjut',
    '',
    '1. Jika hasil `ready`, lanjutkan screenshot browser dan sign-off PIC.',
    '2. Jika hasil `partial`, lengkapi artefak yang masih hilang atau check yang masih dilewati.',
    '3. Jika hasil `rollback-recommended`, tahan `GO` dan jalankan investigasi / rollback sesuai runbook.',
    ''
  )

  return `${lines.join('\n')}\n`
}

function main() {
  const args = process.argv.slice(2)
  const proofDir = pickArgValue(args, '--proof-dir') || 'docs/go-live'
  const stamp = pickArgValue(args, '--stamp')

  const reverseProxyJson = resolveArtifact(proofDir, 'web-reverse-proxy-check.json', pickArgValue(args, '--reverse-proxy-json'), stamp)
  const runtimeJson = resolveArtifact(proofDir, 'web-server-runtime-check.json', pickArgValue(args, '--runtime-json'), stamp)
  const runtimeReport = resolveArtifact(proofDir, 'web-server-runtime-report.md', pickArgValue(args, '--runtime-report'), stamp)
  const evidenceMarkdown = resolveArtifact(proofDir, 'web-go-live-evidence-generated.md', pickArgValue(args, '--evidence-markdown'), stamp)

  const outputJson = buildOutputPath(proofDir, 'web-server-technical-decision.json', pickArgValue(args, '--output-json'), stamp)
  const outputMarkdown = buildOutputPath(proofDir, 'web-server-technical-decision.md', pickArgValue(args, '--output-markdown'), stamp)
  const outputJsonPath = path.resolve(process.cwd(), outputJson)
  const outputMarkdownPath = path.resolve(process.cwd(), outputMarkdown)

  const summary = {
    timestamp: new Date().toISOString(),
    proofDir,
    stamp,
    artifacts: {
      reverseProxyJson,
      runtimeJson,
      runtimeReport,
      evidenceMarkdown,
    },
    reverseProxy: reverseProxyJson.exists ? readJson(reverseProxyJson.absolutePath) : null,
    runtime: runtimeJson.exists ? readJson(runtimeJson.absolutePath) : null,
    decision: {
      decision: 'partial',
      reasons: [],
      warnings: [],
    },
  }

  summary.decision = buildDecision(summary)
  const markdown = buildMarkdown(summary)

  fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true })
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`)
  fs.writeFileSync(outputMarkdownPath, markdown)

  console.log(`Keputusan teknis: ${summary.decision.decision}`)
  console.log(`Output JSON: ${outputJson}`)
  console.log(`Output markdown: ${outputMarkdown}`)
  console.log(JSON.stringify(summary.decision, null, 2))

  if (summary.decision.decision === 'rollback-recommended') {
    process.exitCode = 1
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
