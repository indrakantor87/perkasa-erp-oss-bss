import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

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
      { message: 'Query attendance HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const rows = await runReviewDbQuery<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM hr_fp_raw_events
        WHERE is_unmapped = 1
          AND created_at >= NOW() - INTERVAL 30 DAY
      `,
      [],
    )

    const count = Number(rows[0]?.count) || 0

    return Response.json({
      count,
      last_updated_at: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
