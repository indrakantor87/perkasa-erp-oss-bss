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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function formatProbe(details) {
  if (!details) return '`-`'

  const extras = []
  if (details.location) extras.push(`location: ${details.location}`)
  if (details.contentType) extras.push(`content-type: ${details.contentType}`)
  if (details.error) extras.push(`error: ${details.error}`)

  const summary = [`status: ${details.status || '-'}`]
  if (extras.length > 0) {
    summary.push(...extras)
  }

  return `\`${summary.join('; ')}\``
}

function formatOutputBlock(value) {
  const text = String(value ?? '').trim()
  if (!text) {
    return '`(kosong)`'
  }

  return `\n\`\`\`text\n${text}\n\`\`\``
}

function labelStatus(check) {
  if (!check) return 'skipped'
  return check.status || (check.ok ? 'pass' : 'fail')
}

function buildMarkdown(summary, sourcePath) {
  const pm2 = summary.checks?.pm2 ?? null
  const health = summary.checks?.health ?? null
  const localhostLogin = summary.checks?.localhostLogin ?? null
  const domainLogin = summary.checks?.domainLogin ?? null

  const lines = [
    '# Ringkasan Runtime Server',
    '',
    'Dokumen ini dihasilkan dari output `npm run verify:server-runtime` dan siap ditempel ke evidence rehearsal / hari-H.',
    '',
    '## Metadata',
    '',
    '| Item | Isi |',
    '|---|---|',
    `| timestamp | \`${summary.timestamp || '-'}\` |`,
    `| app PM2 | \`${summary.pm2App || '-'}\` |`,
    `| health URL | \`${summary.healthUrl || '-'}\` |`,
    `| domain | \`${summary.domain || '-'}\` |`,
    `| sumber JSON | \`${sourcePath}\` |`,
    '',
    '## Ringkasan Status',
    '',
    '| Check | Status | Catatan |',
    '|---|---|---|',
    `| PM2 | \`${labelStatus(pm2)}\` | ${pm2?.skipped ? '`dilewati`' : '`lihat output PM2`'} |`,
    `| health | \`${labelStatus(health)}\` | ${health?.skipped ? '`dilewati`' : '`lihat output verify-health`'} |`,
    `| localhost /login | \`${labelStatus(localhostLogin)}\` | ${localhostLogin?.skipped ? '`dilewati`' : formatProbe(localhostLogin.details)} |`,
    `| domain /login | \`${labelStatus(domainLogin)}\` | ${domainLogin?.skipped ? '`dilewati`' : formatProbe(domainLogin.details)} |`,
    '',
    '## Detail Teknis',
    '',
    '### PM2',
    '',
    `- Status: \`${labelStatus(pm2)}\``,
    `- Output:${formatOutputBlock(pm2?.output)}`,
    '',
    '### Health',
    '',
    `- Status: \`${labelStatus(health)}\``,
    `- Output:${formatOutputBlock(health?.output)}`,
    '',
    '### Probe Login',
    '',
    `- Localhost: ${localhostLogin?.skipped ? '`dilewati`' : formatProbe(localhostLogin.details)}`,
    `- Domain: ${domainLogin?.skipped ? '`dilewati`' : formatProbe(domainLogin.details)}`,
    '',
    '## Tindak Lanjut',
    '',
    '1. Tempel ringkasan ini ke `docs/web-go-live-evidence-template.md` atau lampirkan sebagai evidence runtime server.',
    '2. Jika ada status `fail`, perbaiki blocker sebelum screenshot browser dan sign-off PIC dilakukan.',
    '3. Simpan file JSON sumber dan report markdown bersama bukti hari-H untuk audit rollback.',
    '',
  ]

  return `${lines.join('\n')}\n`
}

function main() {
  const args = process.argv.slice(2)
  const inputArg = pickArgValue(args, '--input') || 'docs/web-server-runtime-check.json'
  const outputArg = pickArgValue(args, '--output') || 'docs/web-server-runtime-report.md'
  const inputPath = path.resolve(process.cwd(), inputArg)
  const outputPath = path.resolve(process.cwd(), outputArg)

  if (!fs.existsSync(inputPath)) {
    throw new Error(`File input tidak ditemukan: ${inputPath}`)
  }

  const summary = readJson(inputPath)
  const markdown = buildMarkdown(summary, inputArg)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, markdown)
  console.log(`Report runtime ditulis ke ${outputPath}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
