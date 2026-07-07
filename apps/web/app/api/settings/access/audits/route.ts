import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { getRecentAuthPermissionAudits } from '@/lib/services/auth-permission-audit-service'
import { getRecentAuthRolePermissionAudits } from '@/lib/services/auth-role-permission-audit-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'access_settings', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Audit permission belum tersedia di mode ini.' }, { status: 503 })
  }

  try {
    const [permissionAudits, rolePermissionAudits] = await Promise.all([
      getRecentAuthPermissionAudits(12).catch(() => []),
      getRecentAuthRolePermissionAudits(12).catch(() => []),
    ])
    return Response.json({ permissionAudits, rolePermissionAudits })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

