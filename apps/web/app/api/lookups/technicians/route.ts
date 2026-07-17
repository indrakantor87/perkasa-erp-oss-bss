import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type TechnicianRow = {
  id: number
  username: string
  fullName: string
  roleCode: string
  roleName: string
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
          ON ar.id = au.role_id
        WHERE au.status = 'ACTIVE'
          AND (
            UPPER(ar.code) LIKE 'TEKNISI%'
            OR UPPER(ar.name) LIKE '%TEKNISI%'
          )
        ORDER BY au.full_name ASC
      `,
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

