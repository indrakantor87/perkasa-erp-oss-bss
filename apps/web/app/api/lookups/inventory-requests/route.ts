import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type InventoryRequestRow = {
  id: number
  requestCode: string | null
  requestType: string | null
  requestStatus: string | null
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
    const rows = await runReviewDbQuery<InventoryRequestRow>(
      `
        SELECT
          id AS id,
          request_code AS requestCode,
          request_type AS requestType,
          request_status AS requestStatus
        FROM inventory_item_requests
        ORDER BY id DESC
        LIMIT 200
      `,
    )

    return Response.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        code: String(row.requestCode ?? '').trim(),
        title: String(row.requestType ?? '').trim() || 'Inventory Request',
        subtitle: String(row.requestStatus ?? '').trim() || null,
      })),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

