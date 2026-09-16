import { getSession } from '@/lib/auth'
import { canPerformAction } from '@/lib/access-control-server'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

type TechnicianRow = {
  id: number
  username: string
  fullName: string
  roleCode: string
  roleName: string
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

function hasTechnicianLookupAccess(role: unknown) {
  const roleUp = (role ?? '').toString().trim().toUpperCase()
  if (canPerformAction(roleUp as never, 'support', 'view')) return true
  if (canPerformAction(roleUp as never, 'inventory', 'view')) return true
  if (canPerformAction(roleUp as never, 'sales', 'view')) return true
  return false
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!hasTechnicianLookupAccess(session.role)) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ items: [] })
  }

  try {
    const hasUserBranchId = await hasReviewDbColumn('auth_users', 'branch_id')
    const scope = resolveBranchScope(session)
    const values: unknown[] = []
    const whereClauses: string[] = [
      `au.status = 'ACTIVE'`,
      `(UPPER(ar.code) LIKE 'TEKNISI%' OR UPPER(ar.name) LIKE '%TEKNISI%')`,
    ]
    if (hasUserBranchId && !scope.global) {
      if (scope.branchIds.length === 0) {
        whereClauses.push('1 = 0')
      } else {
        const placeholders = scope.branchIds.map(() => '?').join(', ')
        whereClauses.push(`au.branch_id IN (${placeholders})`)
        values.push(...scope.branchIds)
      }
    }
    const whereClause = ` WHERE ${whereClauses.join(' AND ')}`
    const rows = await runReviewDbQuery<TechnicianRow>(
      `
        SELECT
          au.id AS id,
          au.username AS username,
          au.full_name AS fullName,
          ar.code AS roleCode,
          ar.name AS roleName
        FROM auth_users au
        INNER JOIN auth_roles ar
          ON ar.id = au.role_id${whereClause}
        ORDER BY au.full_name ASC
      `,
      values,
    )

    return Response.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        username: String(row.username ?? '').trim(),
        fullName: String(row.fullName ?? '').trim(),
        roleCode: String(row.roleCode ?? '').trim(),
        roleName: String(row.roleName ?? '').trim(),
      })),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

