import { NextResponse } from 'next/server'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

export const runtime = 'nodejs'

function isAuthSecretConfigured() {
  return Boolean(process.env.AUTH_SESSION_SECRET?.trim())
}

async function getReviewDbHealth() {
  try {
    const [row] = await runReviewDbQuery<{ ping: number }>('SELECT 1 AS ping', [])
    const reachable = Boolean(row?.ping)
    if (!reachable) {
      return {
        reachable: false,
        ready: false,
        requiredColumns: [],
        missingColumns: [],
        warnings: ['Review DB ping tidak mengembalikan hasil yang valid.'],
      }
    }

    const requiredColumns = [
      { table: 'support_isolations', column: 'status' },
      { table: 'support_trouble_tickets', column: 'ticket_code' },
      { table: 'service_subscriptions', column: 'id' },
    ]

    const availability = await Promise.all(
      requiredColumns.map((item) => hasReviewDbColumn(item.table, item.column)),
    )
    const missingColumns = requiredColumns
      .filter((_, index) => !availability[index])
      .map((item) => `${item.table}.${item.column}`)

    return {
      reachable: true,
      ready: missingColumns.length === 0,
      requiredColumns: requiredColumns.map((item) => `${item.table}.${item.column}`),
      missingColumns,
      warnings: [],
    }
  } catch (error) {
    return {
      reachable: false,
      ready: false,
      requiredColumns: [],
      missingColumns: [],
      warnings: [],
      error: getReviewDbErrorDetail(error),
    }
  }
}

export async function GET() {
  const dataSource = getDataSourceSnapshot()
  const authReady = isAuthSecretConfigured()
  const shouldCheckReviewDb = dataSource.effectiveMode === 'review-db' && !dataSource.isFallback
  const reviewDb = shouldCheckReviewDb ? await getReviewDbHealth() : null
  const isOk = !shouldCheckReviewDb || Boolean(reviewDb?.ready)

  return NextResponse.json(
    {
      ok: isOk,
      app: 'perkasa-erp-oss-bss-web',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      auth: {
        sessionSecretConfigured: authReady,
      },
      dataSource: {
        configuredMode: dataSource.configuredMode,
        effectiveMode: dataSource.effectiveMode,
        isFallback: dataSource.isFallback,
        label: dataSource.label,
      },
      reviewDb,
    },
    {
      status: isOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
