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

async function main() {
  const args = process.argv.slice(2)
  const type = pickArgValue(args, '--type') || 'rehearsal'
  const server = pickArgValue(args, '--server') || 'localhost'
  const domain = pickArgValue(args, '--domain')
  const healthUrl = pickArgValue(args, '--health-url') || 'http://127.0.0.1:3000/api/health'
  const rollbackCommit = pickArgValue(args, '--rollback-commit') || '................'
  const outputArg = pickArgValue(args, '--output') || 'docs/web-go-live-evidence-generated.md'
  const pm2App = pickArgValue(args, '--pm2-app') || 'perkasa-erp-web'
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

  const workingTreeClean = gitStatus.ok && !gitStatus.stdout
  const pm2Online =
    pm2Status.ok && new RegExp(`\\b${pm2App}\\b`, 'i').test(pm2Status.stdout) && /\bonline\b/i.test(pm2Status.stdout)

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
    `| health check | \`${skipHealth ? 'skipped' : toPassFail(health.ok)}\` | ${skipHealth ? 'dilewati sesuai argumen' : health.ok ? 'verify-health lulus' : 'verify-health gagal'} |`,
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
    '### 3. Health Check',
    '',
    `- Target health: \`${healthUrl}\``,
    `- Hasil verify-health: \`${skipHealth ? 'skipped' : toPassFail(health.ok)}\``,
    `- Output verify-health:${formatCodeBlock(skipHealth ? 'dilewati sesuai argumen' : health.ok ? health.stdout : `${health.stdout}\n${health.stderr}`.trim())}`,
    '',
    '### 4. Probe Login',
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
    '1. Lengkapi screenshot browser dan sign-off PIC di `docs/web-go-live-evidence-template.md` atau duplikasi file hasil ini sesuai konteks rehearsal / hari-H.',
    '2. Catat hasil `nginx -t`, reload Nginx, dan bukti domain final bila command dijalankan di server produksi.',
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
