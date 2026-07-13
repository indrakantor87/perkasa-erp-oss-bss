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

function readJsonIfExists(filePath) {
  if (!filePath) return null
  const resolvedPath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(resolvedPath)) return null

  return {
    sourcePath: filePath,
    data: JSON.parse(fs.readFileSync(resolvedPath, 'utf8')),
  }
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
    const stdout = String(error?.stdout ?? '').trim()
    const stderr = String(error?.stderr ?? error?.message ?? '').trim()
    return {
      ok: false,
      stdout,
      stderr,
      code: Number(error?.status ?? 1),
    }
  }
}

async function probeLogin(url) {
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

function formatCodeBlock(text) {
  const value = String(text ?? '').trim()
  if (!value) {
    return '`(kosong)`'
  }

  return `\n\`\`\`text\n${value}\n\`\`\``
}

function toPassFail(ok) {
  return ok ? 'pass' : 'fail'
}

function labelCheckStatus(check) {
  if (!check) return 'skipped'
  return check.status || (check.ok ? 'pass' : 'fail')
}

function pickEvidenceSource(args, key, defaults) {
  const explicit = pickArgValue(args, key)
  if (explicit) return explicit

  for (const candidate of defaults) {
    const resolved = path.resolve(process.cwd(), candidate)
    if (fs.existsSync(resolved)) {
      return candidate
    }
  }

  return ''
}

async function main() {
  const args = process.argv.slice(2)
  const type = pickArgValue(args, '--type') || 'rehearsal'
  const server = pickArgValue(args, '--server') || 'localhost'
  const domain = pickArgValue(args, '--domain')
  const healthUrl = pickArgValue(args, '--health-url') || 'http://127.0.0.1:3000/api/health'
  const rollbackCommit = pickArgValue(args, '--rollback-commit') || '................'
  const outputArg = pickArgValue(args, '--output') || 'docs/web-go-live-evidence-generated.md'
  const pm2App = pickArgValue(args, '--pm2-app') || 'perkasa-erp-web'
  const reverseProxyJsonArg = pickEvidenceSource(args, '--reverse-proxy-json', ['docs/web-reverse-proxy-check.json'])
  const runtimeJsonArg = pickEvidenceSource(args, '--runtime-json', ['docs/web-server-runtime-check.json'])
  const skipHealth = hasArg(args, '--skip-health')
  const skipLocalLogin = hasArg(args, '--skip-local-login')
  const skipDomainLogin = hasArg(args, '--skip-domain-login') || !domain

  const outputPath = path.resolve(process.cwd(), outputArg)
  const gitStatus = runCommand('git', ['status', '--short'])
  const gitLog = runCommand('git', ['log', '-1', '--oneline'])
  const gitBranch = runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  const pm2Status = runCommand('pm2', ['status', pm2App, '--no-color'])

  let health = {
    ok: false,
    stdout: '',
    stderr: 'dilewati',
    code: -1,
  }
  if (!skipHealth) {
    health = runCommand(process.execPath, ['./scripts/verify-health.mjs', healthUrl])
  }

  const localhostLogin = skipLocalLogin ? null : await probeLogin('http://127.0.0.1:3000/login')
  const domainLogin = skipDomainLogin ? null : await probeLogin(`https://${domain}/login`)
  const reverseProxyEvidence = readJsonIfExists(reverseProxyJsonArg)
  const runtimeEvidence = readJsonIfExists(runtimeJsonArg)

  const workingTreeClean = gitStatus.ok && !gitStatus.stdout
  const pm2Online =
    pm2Status.ok && new RegExp(`\\b${pm2App}\\b`, 'i').test(pm2Status.stdout) && /\bonline\b/i.test(pm2Status.stdout)
  const reverseProxyChecks = reverseProxyEvidence?.data?.checks ?? null
  const reverseProxyPass = reverseProxyChecks
    ? Object.values(reverseProxyChecks).every((check) => check?.status === 'skipped' || check?.ok)
    : false
  const reverseProxyNote = reverseProxyChecks
    ? [
        `config ${labelCheckStatus(reverseProxyChecks.configFile)}`,
        `server_name ${labelCheckStatus(reverseProxyChecks.serverName)}`,
        `proxy_pass ${labelCheckStatus(reverseProxyChecks.proxyPass)}`,
        `headers ${labelCheckStatus(reverseProxyChecks.forwardedHeaders)}`,
        `syntax ${labelCheckStatus(reverseProxyChecks.syntaxTest)}`,
        `reload ${labelCheckStatus(reverseProxyChecks.reload)}`,
      ].join(', ')
    : 'belum ada output JSON reverse proxy'
  const runtimeChecks = runtimeEvidence?.data?.checks ?? null
  const runtimePass = runtimeChecks
    ? Object.values(runtimeChecks).every((check) => check?.status === 'skipped' || check?.ok)
    : false
  const runtimeNote = runtimeChecks
    ? [
        `PM2 ${labelCheckStatus(runtimeChecks.pm2)}`,
        `health ${labelCheckStatus(runtimeChecks.health)}`,
        `localhost ${labelCheckStatus(runtimeChecks.localhostLogin)}`,
        `domain ${labelCheckStatus(runtimeChecks.domainLogin)}`,
      ].join(', ')
    : 'belum ada output JSON runtime'

  const lines = [
    '# Bukti Eksekusi Go-Live',
    '',
    'Dokumen ini dihasilkan otomatis oleh `npm run collect:go-live-evidence` sebagai snapshot teknis awal.',
    '',
    '## Metadata Eksekusi',
    '',
    '| Item | Isi |',
    '|---|---|',
    `| tanggal | \`${new Date().toISOString().slice(0, 10)}\` |`,
    `| tipe kegiatan | \`${type}\` |`,
    `| server / host | \`${server}\` |`,
    `| domain | \`${domain || '-'}\` |`,
    `| commit deploy | \`${gitLog.stdout || 'gagal dibaca'}\` |`,
    `| rollback commit | \`${rollbackCommit}\` |`,
    '',
    '## Ringkasan Status',
    '',
    '| Area | Status | Catatan Singkat |',
    '|---|---|---|',
    `| kandidat rilis | \`${workingTreeClean ? 'pass' : 'fail'}\` | working tree ${workingTreeClean ? 'bersih' : 'tidak bersih'} |`,
    `| PM2 | \`${pm2Status.ok ? (pm2Online ? 'pass' : 'partial') : 'fail'}\` | ${pm2Status.ok ? `app \`${pm2App}\` ${pm2Online ? 'terbaca online' : 'belum terbaca online'}` : 'pm2 belum tersedia / command gagal'} |`,
    `| reverse proxy | \`${reverseProxyEvidence ? (reverseProxyPass ? 'pass' : 'fail') : 'skipped'}\` | ${reverseProxyNote} |`,
    `| health check | \`${skipHealth ? 'skipped' : toPassFail(health.ok)}\` | ${skipHealth ? 'dilewati sesuai argumen' : health.ok ? 'verify-health lulus' : 'verify-health gagal'} |`,
    `| runtime JSON | \`${runtimeEvidence ? (runtimePass ? 'pass' : 'fail') : 'skipped'}\` | ${runtimeNote} |`,
    `| localhost /login | \`${localhostLogin ? toPassFail(localhostLogin.ok) : 'skipped'}\` | ${
      localhostLogin ? `status ${localhostLogin.status || '-'} ${localhostLogin.location ? `(location: ${localhostLogin.location})` : ''}`.trim() : 'dilewati sesuai argumen'
    } |`,
    `| domain /login | \`${domainLogin ? toPassFail(domainLogin.ok) : 'skipped'}\` | ${
      domainLogin ? `status ${domainLogin.status || '-'} ${domainLogin.location ? `(location: ${domainLogin.location})` : ''}`.trim() : 'dilewati atau domain belum diisi'
    } |`,
    '',
    '## Bukti Teknis',
    '',
    '### 1. Kandidat Rilis',
    '',
    '| Item | Hasil |',
    '|---|---|',
    `| \`git status --short\` | ${workingTreeClean ? '`(bersih)`' : formatCodeBlock(gitStatus.stdout)} |`,
    `| \`git log -1 --oneline\` | ${gitLog.stdout ? `\`${gitLog.stdout}\`` : '`gagal`'} |`,
    `| branch aktif | ${gitBranch.stdout ? `\`${gitBranch.stdout}\`` : '`gagal`'} |`,
    `| working tree bersih | \`${workingTreeClean ? 'ya' : 'tidak'}\` |`,
    '',
    '### 2. PM2',
    '',
    `- Status app \`${pm2App}\`: \`${pm2Status.ok ? (pm2Online ? 'online' : 'belum online') : 'command gagal / belum tersedia'}\``,
    `- Output PM2:${formatCodeBlock(pm2Status.ok ? pm2Status.stdout : pm2Status.stderr)}`,
    '',
    '### 3. Reverse Proxy',
    '',
    `- Sumber JSON: \`${reverseProxyEvidence?.sourcePath || '-'}\``,
    `- Status ringkas: \`${reverseProxyEvidence ? (reverseProxyPass ? 'pass' : 'fail') : 'skipped'}\``,
    `- Ringkasan: \`${reverseProxyNote}\``,
    `- Output JSON:${formatCodeBlock(reverseProxyEvidence ? JSON.stringify(reverseProxyEvidence.data, null, 2) : 'belum ada output JSON reverse proxy')}`,
    '',
    '### 4. Health Check',
    '',
    `- Target health: \`${healthUrl}\``,
    `- Hasil verify-health: \`${skipHealth ? 'skipped' : toPassFail(health.ok)}\``,
    `- Output verify-health:${formatCodeBlock(skipHealth ? 'dilewati sesuai argumen' : health.ok ? health.stdout : `${health.stdout}\n${health.stderr}`.trim())}`,
    '',
    '### 5. Runtime Evidence',
    '',
    `- Sumber JSON: \`${runtimeEvidence?.sourcePath || '-'}\``,
    `- Status ringkas: \`${runtimeEvidence ? (runtimePass ? 'pass' : 'fail') : 'skipped'}\``,
    `- Ringkasan: \`${runtimeNote}\``,
    `- Output JSON:${formatCodeBlock(runtimeEvidence ? JSON.stringify(runtimeEvidence.data, null, 2) : 'belum ada output JSON runtime')}`,
    '',
    '### 6. Probe Login',
    '',
    `- Localhost \`/login\`: ${
      localhostLogin
        ? `\`${toPassFail(localhostLogin.ok)}\` (status: ${localhostLogin.status || '-'}, content-type: ${localhostLogin.contentType || '-'})`
        : '`skipped`'
    }`,
    `- Domain \`/login\`: ${
      domainLogin
        ? `\`${toPassFail(domainLogin.ok)}\` (status: ${domainLogin.status || '-'}, content-type: ${domainLogin.contentType || '-'})`
        : '`skipped`'
    }`,
    '',
    '## Tindak Lanjut Manual',
    '',
    '1. Jalankan `verify:reverse-proxy` dan `verify:server-runtime` lebih dulu agar evidence otomatis ini dapat menyerap output JSON keduanya.',
    '2. Lengkapi screenshot browser dan sign-off PIC di `docs/web-go-live-evidence-template.md` atau duplikasi file hasil ini sesuai konteks rehearsal / hari-H.',
    '3. Simpan keputusan akhir `GO / PILOT TERBATAS / ROLLBACK` setelah validasi bisnis lintas role selesai.',
    '',
  ]

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`)
  console.log(`Evidence go-live ditulis ke ${outputPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
