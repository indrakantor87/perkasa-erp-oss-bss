const target = process.argv[2] || 'http://127.0.0.1:3000/api/health'

async function main() {
  const response = await fetch(target, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Health check gagal dengan status ${response.status}`)
  }

  const payload = await response.json()

  if (!payload?.ok) {
    throw new Error('Payload health check tidak menandai `ok=true`.')
  }

  const effectiveMode = payload?.dataSource?.effectiveMode
  const isFallback = Boolean(payload?.dataSource?.isFallback)
  const env = String(payload?.env ?? '').trim().toLowerCase()
  const auth = payload?.auth
  const deployment = payload?.deployment
  const reviewDb = payload?.reviewDb
  if (effectiveMode === 'review-db' && !isFallback) {
    if (!reviewDb?.ready) {
      const details = reviewDb?.missingColumns?.length ? `Missing: ${reviewDb.missingColumns.join(', ')}` : ''
      throw new Error(`Review DB belum ready. ${details}`.trim())
    }
  }

  if (env === 'production') {
    if (!auth?.sessionSecretConfigured) {
      throw new Error('Health production belum ready: AUTH_SESSION_SECRET belum terkonfigurasi.')
    }
    if (effectiveMode !== 'review-db' || isFallback) {
      throw new Error('Health production belum ready: data source harus review-db non-fallback.')
    }
    if (!deployment?.ready) {
      const warnings = Array.isArray(deployment?.warnings) ? deployment.warnings.join(' | ') : ''
      throw new Error(`Health production belum ready. ${warnings}`.trim())
    }
  }

  console.log(`Health check sukses: ${target}`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
