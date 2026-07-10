import { NextResponse } from 'next/server'
import { getDataSourceSnapshot } from '@/lib/data-source'

export const runtime = 'nodejs'

function isAuthSecretConfigured() {
  return Boolean(process.env.AUTH_SESSION_SECRET?.trim())
}

export async function GET() {
  const dataSource = getDataSourceSnapshot()

  return NextResponse.json(
    {
      ok: true,
      app: 'perkasa-erp-oss-bss-web',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      auth: {
        sessionSecretConfigured: isAuthSecretConfigured(),
      },
      dataSource: {
        configuredMode: dataSource.configuredMode,
        effectiveMode: dataSource.effectiveMode,
        isFallback: dataSource.isFallback,
        label: dataSource.label,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
