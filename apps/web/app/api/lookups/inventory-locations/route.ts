import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureInventoryLocationsTable } from '@/lib/services/inventory-location-service'

type InventoryLocationRow = {
  id: number
  locationCode: string | null
  locationName: string | null
  locationType: string | null
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
    await ensureInventoryLocationsTable()

    const rows = await runReviewDbQuery<InventoryLocationRow>(
      `
        SELECT
          id AS id,
          location_code AS locationCode,
          location_name AS locationName,
          location_type AS locationType
        FROM inventory_locations
        ORDER BY location_type ASC, location_name ASC
        LIMIT 300
      `,
    )

    return Response.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        code: String(row.locationCode ?? '').trim(),
        title: String(row.locationName ?? '').trim() || 'Inventory Location',
        subtitle: String(row.locationType ?? '').trim() || null,
      })),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
