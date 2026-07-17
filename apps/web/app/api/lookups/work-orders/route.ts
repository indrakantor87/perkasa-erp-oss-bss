import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

type WorkOrderRow = {
  id: number
  workOrderNo: string | null
  jobCategory: string | null
  status: string | null
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ items: [] })
  }

  try {
    const hasJobCategory = await hasReviewDbColumn('service_work_orders', 'job_category')
    const rows = await runReviewDbQuery<WorkOrderRow>(
      `
        SELECT
          id AS id,
          work_order_no AS workOrderNo,
          ${hasJobCategory ? 'job_category' : 'NULL'} AS jobCategory,
          status AS status
        FROM service_work_orders
        ORDER BY id DESC
        LIMIT 200
      `,
    )

    return Response.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        code: String(row.workOrderNo ?? '').trim(),
        title: String(row.jobCategory ?? '').trim() || 'Work Order',
        subtitle: String(row.status ?? '').trim() || null,
      })),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

