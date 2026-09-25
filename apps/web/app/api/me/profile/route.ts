import { getSession } from '@/lib/auth'
import { runReviewDbQuery } from '@/lib/review-db'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type ProfileRow = {
  id: number
  full_name: string
  employee_code: string
  email: string | null
  phone: string | null
  join_date: string | null
  employment_status: string
  team_name: string | null
  position_name: string | null
  division_name: string | null
  branch_name: string | null
  is_active: number
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'KARYAWAN' && session.role !== 'HR' && session.role !== 'SUPER_ADMIN' && session.role !== 'OWNER' && session.role !== 'ADMIN') {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const rows = await runReviewDbQuery<ProfileRow>(
      `
        SELECT e.id,
               e.full_name,
               e.employee_code,
               COALESCE(e.email_corporate, e.whatsapp, e.phone) AS email,
               e.phone,
               e.join_date,
               e.employment_status,
               t.name AS team_name,
               p.name AS position_name,
               d.name AS division_name,
               b.name AS branch_name,
               e.status AS is_active
        FROM hr_employees e
        LEFT JOIN org_teams t ON t.id = e.team_id
        LEFT JOIN org_positions p ON p.id = e.position_id
        LEFT JOIN org_divisions d ON d.id = e.division_id
        LEFT JOIN org_branches b ON b.id = e.branch_id
        WHERE e.id = ?
        LIMIT 1
      `,
      [me.id],
    )
    const profile = rows[0] ?? { id: me.id, full_name: me.full_name, employee_code: me.employee_code, is_active: me.is_active }
    return Response.json({ data: profile, linked: true })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : 'Gagal memuat profile.'
    return Response.json({ message }, { status })
  }
}
