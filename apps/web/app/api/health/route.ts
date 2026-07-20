import { NextResponse } from 'next/server'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

export const runtime = 'nodejs'

function isAuthSecretConfigured() {
  return Boolean(process.env.AUTH_SESSION_SECRET?.trim())
}

function isProductionEnv() {
  return (process.env.NODE_ENV ?? 'development') === 'production'
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
  const env = process.env.NODE_ENV ?? 'development'
  const productionEnv = isProductionEnv()
  const shouldCheckReviewDb = dataSource.effectiveMode === 'review-db' && !dataSource.isFallback
  const reviewDb = shouldCheckReviewDb ? await getReviewDbHealth() : null
  const authRequired = productionEnv
  const authOk = !authRequired || authReady
  const dataSourceRequired = productionEnv
  const dataSourceOk = !dataSourceRequired || (dataSource.effectiveMode === 'review-db' && !dataSource.isFallback)
  const reviewDbRequired = productionEnv && dataSourceOk
  const reviewDbReachable = !reviewDbRequired || Boolean(reviewDb?.reachable)
  const reviewDbSchemaReady = !reviewDbRequired || Boolean(reviewDb?.ready)
  const warnings: string[] = []

  if (!authReady) {
    warnings.push(
      productionEnv
        ? 'AUTH_SESSION_SECRET belum terisi. Health production harus gagal sampai session secret siap.'
        : 'AUTH_SESSION_SECRET belum terisi. Development masih diizinkan memakai fallback secret.',
    )
  }

  if (dataSource.effectiveMode !== 'review-db' || dataSource.isFallback) {
    warnings.push(
      productionEnv
        ? 'Data source masih mock/fallback. Hosting production harus memakai review-db non-fallback.'
        : 'Data source masih mock/fallback. Ini aman untuk dev, tetapi tidak valid untuk cutover production.',
    )
  }

  if (reviewDbRequired && reviewDb?.reachable && !reviewDb?.ready) {
    warnings.push(
      `Review DB sudah terjangkau, tetapi schema baseline belum lengkap: ${reviewDb.missingColumns.join(', ') || 'cek migration review DB.'}`,
    )
  }

  if (reviewDbRequired && !reviewDb?.reachable) {
    warnings.push('Review DB belum terjangkau dari aplikasi. Cek DATABASE_URL, kredensial, dan status resource MySQL.')
  }

  const isOk = authOk && dataSourceOk && reviewDbReachable

  return NextResponse.json(
    {
      ok: isOk,
      app: 'perkasa-erp-oss-bss-web',
      env,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      auth: {
        sessionSecretConfigured: authReady,
        required: authRequired,
        ready: authOk,
      },
      dataSource: {
        configuredMode: dataSource.configuredMode,
        effectiveMode: dataSource.effectiveMode,
        isFallback: dataSource.isFallback,
        label: dataSource.label,
        required: dataSourceRequired,
        ready: dataSourceOk,
      },
      deployment: {
        env,
        authReady: authOk,
        dataSourceReady: dataSourceOk,
        reviewDbReachable,
        reviewDbSchemaReady,
        reviewDbReady: reviewDbSchemaReady,
        ready: isOk,
        warnings,
      },
      reviewDb,
    },
    {
      // Keep the container liveness green for hosting platforms; strict readiness
      // is still exposed through `ok` and `deployment.ready` in the payload.
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
