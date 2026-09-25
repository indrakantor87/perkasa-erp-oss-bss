import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type FpDeviceSummary = {
  total_active: number
  online_count: number
  offline_count: number
  unknown_count: number
}

export async function GET(_request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.isFallback) {
    return Response.json(
      { message: 'Query fingerprint device HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const rows = await runReviewDbQuery<{
      total_active: number
      online_count: number
      offline_count: number
      unknown_count: number
    }>(
      `
        SELECT
          COUNT(*) AS total_active,
          SUM(CASE WHEN UPPER(last_connection_status) = 'ONLINE' THEN 1 ELSE 0 END) AS online_count,
          SUM(CASE WHEN UPPER(last_connection_status) IN ('OFFLINE', 'AUTH_FAILED', 'SYNC_ERROR') THEN 1 ELSE 0 END) AS offline_count,
          SUM(CASE WHEN UPPER(last_connection_status) = 'UNKNOWN' OR last_connection_status IS NULL OR UPPER(last_connection_status) NOT IN ('ONLINE', 'OFFLINE', 'AUTH_FAILED', 'SYNC_ERROR') THEN 1 ELSE 0 END) AS unknown_count
        FROM hr_fp_machines
      `,
      [],
    )

    const row = rows[0]
    const summary: FpDeviceSummary = {
      total_active: Number(row?.total_active) || 0,
      online_count: Number(row?.online_count) || 0,
      offline_count: Number(row?.offline_count) || 0,
      unknown_count: Number(row?.unknown_count) || 0,
    }

    return Response.json(summary)
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
