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
  const reviewDb = payload?.reviewDb
  if (effectiveMode === 'review-db' && !isFallback) {
    if (!reviewDb?.ready) {
      const details = reviewDb?.missingColumns?.length ? `Missing: ${reviewDb.missingColumns.join(', ')}` : ''
      throw new Error(`Review DB belum ready. ${details}`.trim())
    }
  }

  console.log(`Health check sukses: ${target}`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
