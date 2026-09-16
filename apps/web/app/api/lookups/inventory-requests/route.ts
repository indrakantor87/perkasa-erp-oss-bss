import { getSession } from '@/lib/auth'
import { canPerformAction } from '@/lib/access-control-server'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

type InventoryRequestRow = {
  id: number
  requestCode: string | null
  requestType: string | null
  requestStatus: string | null
}

function resolveBranchScope(session: {
  role?: unknown
  branchId?: unknown
  branchIds?: unknown[]
}) {
  const roleUp = (session.role ?? '').toString().trim().toUpperCase()
  if (roleUp === 'OWNER' || roleUp === 'SUPER_ADMIN') {
    return { global: true, branchIds: [] as number[] }
  }
  const fromArray = Array.isArray(session.branchIds)
    ? session.branchIds.filter((n) => Number.isInteger(n) && (n as number) > 0).map((n) => Number(n))
    : []
  const fromSingle = Number.isInteger(session.branchId as number) && (session.branchId as number) > 0
    ? [session.branchId as number]
    : []
  const merged = Array.from(new Set([...fromArray, ...fromSingle]))
  return { global: false, branchIds: merged }
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ items: [] })
  }

  try {
    const hasRequestBranchId = await hasReviewDbColumn('inventory_item_requests', 'branch_id')
    const scope = resolveBranchScope(session)
    const values: unknown[] = []
    const whereClauses: string[] = []
    if (hasRequestBranchId && !scope.global) {
      if (scope.branchIds.length === 0) {
        whereClauses.push('1 = 0')
      } else {
        const placeholders = scope.branchIds.map(() => '?').join(', ')
        whereClauses.push(`branch_id IN (${placeholders})`)
        values.push(...scope.branchIds)
      }
    }
    const whereClause = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''
    const rows = await runReviewDbQuery<InventoryRequestRow>(
      `
        SELECT
          id AS id,
          request_code AS requestCode,
          request_type AS requestType,
          request_status AS requestStatus
        FROM inventory_item_requests${whereClause}
        ORDER BY id DESC
        LIMIT 200
      `,
      values,
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

